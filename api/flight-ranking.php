<?php
declare(strict_types=1);
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');
date_default_timezone_set('Asia/Tokyo');
function respond(int $status, array $data): never {
    http_response_code($status);
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR);
    exit;
}
const GUARD = "<?php http_response_code(404); exit; ?>\n";
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
if (!in_array($method, ['GET', 'POST'], true)) { header('Allow: GET, POST'); respond(405, ['error' => 'method']); }
$input = null;
if ($method === 'POST') {
    if (($_SERVER['HTTP_X_TBT_RANKING'] ?? '') !== '1' || !str_starts_with($_SERVER['CONTENT_TYPE'] ?? '', 'application/json')) respond(415, ['error' => 'json_required']);
    try { $input = json_decode(file_get_contents('php://input', false, null, 0, 4097), true, 16, JSON_THROW_ON_ERROR); }
    catch (Throwable $error) { respond(400, ['error' => 'invalid_json']); }
    if (!is_array($input) || !is_string($input['id'] ?? null) || !preg_match('/^[a-zA-Z0-9_-]{1,100}$/D', $input['id']) ||
        !is_string($input['token'] ?? null) || !preg_match('/^[a-zA-Z0-9_-]{16,128}$/D', $input['token']) ||
        !is_string($input['name'] ?? null) || trim($input['name']) === '' ||
        !is_numeric($input['distance'] ?? null) || !is_int($input['distance']) || $input['distance'] < 0 || $input['distance'] > 100000 ||
        !is_int($input['timeSec'] ?? null) || $input['timeSec'] < 0 || $input['timeSec'] > 86400) respond(422, ['error' => 'invalid_record']);
}
$directory = getenv('TBT_RANKING_DATA_DIR') ?: __DIR__ . '/../data';
$lock = null;
$temporary = null;
try {
    if (!is_dir($directory) && !mkdir($directory, 0750, true)) throw new RuntimeException('mkdir');
    $lock = fopen($directory . '/.flight-ranking.lock', 'c');
    if (!$lock || !flock($lock, LOCK_EX)) throw new RuntimeException('lock');
    $file = $directory . '/flight-ranking-store.php';
    $records = [];
    if (is_file($file)) {
        $raw = file_get_contents($file);
        if (!str_starts_with($raw, GUARD)) throw new RuntimeException('storage_format');
        $records = json_decode(substr($raw, strlen(GUARD)), true, 32, JSON_THROW_ON_ERROR);
        if (!is_array($records)) throw new RuntimeException('storage_format');
    } elseif (is_file($directory . '/ranking.json')) {
        $legacy = json_decode(file_get_contents($directory . '/ranking.json'), true, 32, JSON_THROW_ON_ERROR);
        $seeds = [['TBT歴代最長記録 (2022)', 18450, '2022.07.24'], ['彦根港ターン成功 (2018)', 12100, '2018.07.29'], ['竹生島アプローチ (2015)', 8640, '2015.07.26'], ['プラットホーム南風 (2019)', 4820, '2019.07.28'], ['新風テストフライト', 1520, '2024.06.12']];
        foreach (is_array($legacy) ? $legacy : [] as $old) {
            if (!is_array($old) || !is_string($old['name'] ?? null) || !is_numeric($old['distance'] ?? null) || $old['distance'] < 0 || $old['distance'] > 100000) continue;
            if (array_filter($seeds, fn($seed) => $seed === [$old['name'], $old['distance'], $old['date'] ?? ''])) continue;
            $parts = explode(':', is_string($old['time'] ?? null) ? $old['time'] : '00:00');
            $seconds = min(86400, max(0, (int)($parts[0] ?? 0) * 60 + (int)($parts[1] ?? 0)));
            $records[] = ['id' => 'legacy-' . hash('sha256', json_encode($old)), 'name' => mb_substr($old['name'], 0, 20), 'distance' => (int)$old['distance'], 'timeSec' => $seconds,
                'date' => is_string($old['date'] ?? null) && preg_match('/^\d{4}\.\d{2}\.\d{2}$/D', $old['date']) ? $old['date'] : date('Y.m.d'), 'owner' => hash('sha256', 'legacy-import'), 'created' => 0];
        }
    }
    if ($input !== null) {
        $owner = hash('sha256', $input['token']);
        $index = null;
        foreach ($records as $i => $record) if ($record['id'] === $input['id']) { $index = $i; break; }
        if ($index !== null && !hash_equals($records[$index]['owner'], $owner)) { flock($lock, LOCK_UN); fclose($lock); respond(409, ['error' => 'record_owner']); }
        if ($index !== null && ($records[$index]['distance'] !== $input['distance'] || $records[$index]['timeSec'] !== $input['timeSec'])) { flock($lock, LOCK_UN); fclose($lock); respond(409, ['error' => 'immutable_score']); }
        if ($index === null && count(array_filter($records, fn($record) => $record['owner'] === $owner && $record['created'] > time() - 3600)) >= 60) { flock($lock, LOCK_UN); fclose($lock); respond(429, ['error' => 'rate_limit']); }
        $record = ['id' => $input['id'], 'name' => mb_substr(trim(preg_replace('/[\x00-\x1f\x7f]/u', '', $input['name'])), 0, 20),
            'distance' => $input['distance'], 'timeSec' => $input['timeSec'], 'date' => $index === null ? date('Y.m.d') : $records[$index]['date'],
            'owner' => $owner, 'created' => $index === null ? time() : $records[$index]['created']];
        if ($index === null) $records[] = $record; else $records[$index] = $record;
        usort($records, fn($a, $b) => ($b['distance'] <=> $a['distance']) ?: ($a['timeSec'] <=> $b['timeSec']) ?: ($a['created'] <=> $b['created']));
        $records = array_slice($records, 0, 1000);
        $temporary = $directory . '/.flight-ranking-' . bin2hex(random_bytes(12)) . '.php';
        $contents = GUARD . json_encode($records, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR);
        if (file_put_contents($temporary, $contents) !== strlen($contents) || !rename($temporary, $file)) throw new RuntimeException('write');
    }
    usort($records, fn($a, $b) => ($b['distance'] <=> $a['distance']) ?: ($a['timeSec'] <=> $b['timeSec']));
    $public = array_map(fn($record) => array_intersect_key($record, array_flip(['id', 'name', 'distance', 'timeSec', 'date'])), array_slice($records, 0, 10));
    flock($lock, LOCK_UN); fclose($lock);
    respond(200, ['records' => $public, 'acceptedId' => $input['id'] ?? null]);
} catch (Throwable $error) {
    if ($temporary && is_file($temporary)) unlink($temporary);
    if (is_resource($lock)) { flock($lock, LOCK_UN); fclose($lock); }
    error_log('[TBT ranking] ' . $error->getMessage());
    respond(503, ['error' => 'storage_unavailable']);
}
