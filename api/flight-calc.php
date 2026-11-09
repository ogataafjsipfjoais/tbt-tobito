<?php
/**
 * TBT Tobito - Flight Dynamics Calculation REST API Endpoint
 * 
 * Provides server-side high precision aerodynamics and human-powered flight
 * simulation for external scripts, tools, and clients.
 * 
 * Authentication:
 *   Requires X-API-KEY header, Authorization: Bearer <key>, or api_key parameter.
 */

declare(strict_types=1);

// Set JSON headers and CORS
header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, X-API-KEY, Authorization');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

$startTime = microtime(true);

// Load Auth module
require_once __DIR__ . '/../includes/auth.php';

// 1. Authenticate Request
$providedKey = tbt_extract_request_api_key();

// If JSON body has api_key, parse it as fallback
$rawInput = file_get_contents('php://input');
$requestData = [];
if (!empty($rawInput)) {
    $parsedJson = json_decode($rawInput, true);
    if (is_array($parsedJson)) {
        $requestData = $parsedJson;
        if (empty($providedKey) && !empty($requestData['api_key'])) {
            $providedKey = (string)$requestData['api_key'];
        }
    }
}
// Also merge $_POST and $_GET
$requestData = array_merge($_GET, $_POST, $requestData);

if (!tbt_verify_api_key($providedKey)) {
    http_response_code(401);
    echo json_encode([
        'status' => 'error',
        'error_code' => 'UNAUTHORIZED',
        'message' => 'Invalid or missing API key. Provide via X-API-KEY header, Authorization: Bearer, or api_key parameter.',
    ], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    exit;
}

// 2. Parse & Validate Flight Simulation Parameters
$mode = (string)($requestData['mode'] ?? 'full_simulation');
$mass = (float)($requestData['mass'] ?? 138.0); // 機体+タンデム搭乗員総重量 (kg)
$wingArea = (float)($requestData['wing_area'] ?? 25.5); // 主翼面積 (m^2)
$wingspan = (float)($requestData['wingspan'] ?? 36.0); // 全幅 (m)
$pilotPower = (float)($requestData['pilot_power'] ?? 420.0); // ペダリング出力最大値 (W)
$cadenceRPM = (float)($requestData['cadence_rpm'] ?? 82.0); // ケイデンス (RPM)
$pilotStamina = (float)($requestData['pilot_stamina'] ?? 100.0); // 初期スタミナ (%)
$staminaDrain = (float)($requestData['stamina_drain_factor'] ?? 1.0); // スタミナ消費倍率
$launchHeight = (float)($requestData['launch_height'] ?? 10.0); // プラットフォーム高さ (m)
$slopeAngleDeg = (float)($requestData['slope_angle_deg'] ?? 2.8); // スロープ角 (deg)
$windSpeed = (float)($requestData['wind_speed'] ?? 2.0); // 風速 (m/s)
$windDirDeg = (float)($requestData['wind_direction_deg'] ?? 45.0); // 風向 (deg)
$targetPitchDeg = (float)($requestData['target_pitch_deg'] ?? 1.2); // 巡航目標ピッチ角 (deg)
$dt = max(0.01, min(0.1, (float)($requestData['dt'] ?? 0.05))); // 刻み幅 (s)
$maxDuration = max(1.0, min(600.0, (float)($requestData['sim_duration_sec'] ?? 180.0))); // 最大時間 (s)
$includeTrajectory = filter_var($requestData['include_trajectory'] ?? true, FILTER_VALIDATE_BOOLEAN);
$sampleInterval = max(0.05, (float)($requestData['trajectory_sample_interval'] ?? 0.5)); // サンプリング間隔 (s)

// Aerodynamic constants
$rho = 1.225; // 空気密度 kg/m^3
$g = 9.806;   // 重力加速度 m/s^2
$aspectRatio = ($wingspan * $wingspan) / $wingArea; // アスペクト比 約50.8
$slopeAngleRad = deg2rad($slopeAngleDeg);
$targetPitchRad = deg2rad($targetPitchDeg);

// 3. Launch Runway Run Simulation (Platform Phase)
// プラットフォーム長さ 10m、2.8度傾斜
$platformLength = 10.0;
$runwayZ = -$platformLength;
$runwayY = $launchHeight + sin($slopeAngleRad) * $platformLength;
$runwayVz = 2.0; // 初期助走速度 (m/s)
$runwayTime = 0.0;

while ($runwayZ < 0 && $runwayTime < 10.0) {
    // スロープ重力加速 + ペダリング推力 + サポーター押し出し加速 - 転がり抵抗
    $thrust = ($pilotPower * 0.95) / max($runwayVz, 1.8);
    $thrustAcc = $thrust / $mass;
    $slopeGravAcc = $g * sin($slopeAngleRad);
    $runnerAcc = max(0.0, 1.8 - 0.25 * $runwayVz); // ランナー押し出し
    $rollingResistance = 0.04 * $g;
    
    $acc = $thrustAcc * 1.35 + $slopeGravAcc + $runnerAcc - $rollingResistance;
    $runwayVz += $acc * $dt;
    $runwayZ  += $runwayVz * $dt;
    $runwayY  -= sin($slopeAngleRad) * ($runwayVz * $dt);
    $runwayTime += $dt;
}

$takeoffSpeed = max(6.8, $runwayVz); // テイクオフ初速 (m/s)

// 4. Free Flight Simulation Phase
$posX = 0.0;
$posY = $launchHeight;
$posZ = 0.0;

$velX = 0.0;
$velY = 0.15; // わずかな踏み切り上昇
$velZ = $takeoffSpeed;

$pitch = -$slopeAngleRad * 0.5; // 初期ピッチ
$roll = 0.0;
$yaw = 0.0;

$simTime = 0.0;
$steps = 0;
$maxAltitude = $posY;
$maxAirSpeed = $takeoffSpeed;
$groundEffectDistance = 0.0;
$totalEnergyJoules = 0.0;
$isBroken = false;
$breakReason = null;
$breakReasonJa = null;
$landingReason = 'water_touch';
$landingReasonJa = '琵琶湖水面へ無事着水';

$trajectory = [];
$lastSampleTime = -$sampleInterval;

while ($simTime < $maxDuration) {
    $steps++;
    $simTime += $dt;

    // 現在の対気速度 V
    $airSpeed = sqrt($velX * $velX + $velY * $velY + $velZ * $velZ);
    $maxAirSpeed = max($maxAirSpeed, $airSpeed);
    $maxAltitude = max($maxAltitude, $posY);

    // 飛行経路傾斜角
    $flightPathPitch = atan2($velY, max(0.1, sqrt($velX * $velX + $velZ * $velZ)));
    $angleOfAttack = $pitch - $flightPathPitch;

    // 自律ピッチ制御（目標ピッチ角へ緩やかに収束）
    $pitchRate = ($targetPitchRad - $pitch) * 1.5;
    $pitch += $pitchRate * $dt;
    $pitch = max(-0.40, min(0.42, $pitch));

    // ペダリング推力とスタミナ消費
    if ($pilotStamina > 0) {
        $drainRate = ($cadenceRPM / 80.0) * 1.4 * $staminaDrain * $dt;
        $pilotStamina = max(0.0, $pilotStamina - $drainRate);
        $currentPower = ($cadenceRPM / 80.0) * $pilotPower * ($pilotStamina / 100.0);
    } else {
        $currentPower = 0.0;
    }
    $totalEnergyJoules += $currentPower * $dt;

    // プロペラ推力
    $thrust = ($currentPower * 0.92) / max($airSpeed, 3.2);

    // 地面効果 (WIG効果): 水面高度 3.8m 以下で誘導抗力低減
    $h = max(0.2, $posY);
    $groundEffectRatio = (16.0 * pow($h / 30.0, 2)) / (1.0 + 16.0 * pow($h / 30.0, 2));
    $groundEffectFactor = min(1.0, 0.28 + 0.72 * $groundEffectRatio);
    if ($h <= 3.8) {
        $groundEffectDistance += $airSpeed * $dt;
    }

    // 動圧
    $q = 0.5 * $rho * $airSpeed * $airSpeed;

    // 揚力 & 抗力
    $stallAoA = 0.24; // 約13.8度
    if ($angleOfAttack > $stallAoA || $airSpeed < 5.6) {
        // 失速モード
        $lift = $q * $wingArea * 0.18;
        $drag = $q * $wingArea * 0.32;
        $pitch -= 0.50 * $dt; // ノーズダイブ
        $velY -= 1.5 * $dt;
    } else {
        // 正常滑空モード (DAE-21高揚力翼型)
        $cL = max(0.12, 0.46 + 6.0 * $angleOfAttack);
        $lift = $q * $wingArea * $cL;
        $cD0 = 0.019;
        $cDi = ($cL * $cL) / (M_PI * 0.88 * $aspectRatio) * $groundEffectFactor;
        $drag = $q * $wingArea * ($cD0 + $cDi);
    }

    // 機首方向ベクトル
    $cosP = cos($pitch);
    $sinP = sin($pitch);
    $cosY = cos($yaw);
    $sinY = sin($yaw);
    $fwdX = $sinY * $cosP;
    $fwdY = $sinP;
    $fwdZ = $cosY * $cosP;

    // 加速度
    $thrustAccX = ($fwdX * $thrust) / $mass;
    $thrustAccY = ($fwdY * $thrust) / $mass;
    $thrustAccZ = ($fwdZ * $thrust) / $mass;

    $dragAccX = -($velX / max($airSpeed, 1.0)) * ($drag / $mass);
    $dragAccY = -($velY / max($airSpeed, 1.0)) * ($drag / $mass);
    $dragAccZ = -($velZ / max($airSpeed, 1.0)) * ($drag / $mass);

    $liftAccX = 0.0;
    $liftAccY = $lift / $mass;
    $liftAccZ = 0.0;

    // G-Force 計算と過大G破損判定
    $gForce = max(0.1, $liftAccY / $g);
    if ($gForce >= 3.0 && $airSpeed >= 8.0) {
        $isBroken = true;
        $breakReason = 'over_g_breakup';
        $breakReasonJa = '過大荷重（許容3.0G超過）による主翼スパー折損破断';
        $landingReason = 'over_g_breakup';
        $landingReasonJa = $breakReasonJa;
        break;
    }

    // 速度更新
    $velX += ($thrustAccX + $dragAccX + $liftAccX) * $dt;
    $velY += ($thrustAccY + $dragAccY + $liftAccY - $g) * $dt;
    $velZ += ($thrustAccZ + $dragAccZ + $liftAccZ) * $dt;

    // 風力ベクトル影響 (微小ドリフト)
    $windRad = deg2rad($windDirDeg);
    $windVx = sin($windRad) * $windSpeed;
    $windVz = cos($windRad) * $windSpeed;
    $velX += ($windVx - $velX) * 0.015 * $dt;
    $velZ += ($windVz - $velZ) * 0.005 * $dt;

    // 位置更新
    $posX += $velX * $dt;
    $posY += $velY * $dt;
    $posZ += $velZ * $dt;

    // 軌道記録
    if ($includeTrajectory && ($simTime - $lastSampleTime >= $sampleInterval)) {
        $trajectory[] = [
            'time_s' => round($simTime, 2),
            'pos_x_m' => round($posX, 2),
            'altitude_m' => round($posY, 2),
            'distance_m' => round(sqrt($posX * $posX + $posZ * $posZ), 2),
            'airspeed_ms' => round($airSpeed, 2),
            'airspeed_kmh' => round($airSpeed * 3.6, 1),
            'pitch_deg' => round(rad2deg($pitch), 2),
            'power_watts' => round($currentPower, 1),
            'stamina_percent' => round($pilotStamina, 1),
            'g_force' => round($gForce, 2),
            'ground_effect' => ($posY <= 3.8),
        ];
        $lastSampleTime = $simTime;
    }

    // 水面着水判定 (高度 <= 0.35m)
    if ($posY <= 0.35) {
        $posY = 0.0;
        if ($angleOfAttack > $stallAoA) {
            $landingReason = 'stall_dive';
            $landingReasonJa = '失速による水面ダイブ着水';
        } else {
            $landingReason = 'water_touch';
            $landingReasonJa = '規定高度低下によるスムーズな着水';
        }
        break;
    }
}

// タイムリミット判定
if ($simTime >= $maxDuration && $posY > 0.35) {
    $landingReason = 'time_limit';
    $landingReasonJa = 'シミュレーション制限時間到達（継続飛行中）';
}

// 公式ルール総直線飛距離
$finalDistance = sqrt($posX * $posX + $posZ * $posZ);
$finalAirspeedMs = sqrt($velX * $velX + $velY * $velY + $velZ * $velZ);

// 最終ポイントも軌道に追加
if ($includeTrajectory) {
    $trajectory[] = [
        'time_s' => round($simTime, 2),
        'pos_x_m' => round($posX, 2),
        'altitude_m' => round(max(0.0, $posY), 2),
        'distance_m' => round($finalDistance, 2),
        'airspeed_ms' => round($finalAirspeedMs, 2),
        'airspeed_kmh' => round($finalAirspeedMs * 3.6, 1),
        'pitch_deg' => round(rad2deg($pitch), 2),
        'power_watts' => 0.0,
        'stamina_percent' => round($pilotStamina, 1),
        'g_force' => 1.0,
        'ground_effect' => ($posY <= 3.8),
    ];
}

// 平均滑空比
$altDrop = max(0.1, $launchHeight - max(0.0, $posY));
$avgGlideRatio = $altDrop > 0 ? ($finalDistance / $altDrop) : 0.0;

$calcDurationMs = round((microtime(true) - $startTime) * 1000, 2);

// 5. Build Response
$response = [
    'status' => 'success',
    'summary' => [
        'flight_distance_m' => round($finalDistance, 2),
        'flight_time_s' => round($simTime, 2),
        'max_altitude_m' => round($maxAltitude, 2),
        'takeoff_speed_kmh' => round($takeoffSpeed * 3.6, 2),
        'max_airspeed_kmh' => round($maxAirSpeed * 3.6, 2),
        'landing_airspeed_ms' => round($finalAirspeedMs, 2),
        'landing_airspeed_kmh' => round($finalAirspeedMs * 3.6, 2),
        'landing_reason' => $landingReason,
        'landing_reason_ja' => $landingReasonJa,
        'ground_effect_distance_m' => round($groundEffectDistance, 2),
        'ground_effect_ratio_percent' => $finalDistance > 0 ? round(($groundEffectDistance / $finalDistance) * 100, 1) : 0.0,
        'average_glide_ratio' => round($avgGlideRatio, 2),
        'total_energy_burned_kj' => round($totalEnergyJoules / 1000.0, 2),
        'final_pilot_stamina_percent' => round($pilotStamina, 1),
        'is_broken' => $isBroken,
        'break_reason' => $breakReason,
        'break_reason_ja' => $breakReasonJa,
    ],
    'parameters' => [
        'mass_kg' => $mass,
        'wing_area_m2' => $wingArea,
        'wingspan_m' => $wingspan,
        'pilot_power_w' => $pilotPower,
        'cadence_rpm' => $cadenceRPM,
        'launch_height_m' => $launchHeight,
        'slope_angle_deg' => $slopeAngleDeg,
        'wind_speed_ms' => $windSpeed,
        'wind_direction_deg' => $windDirDeg,
        'target_pitch_deg' => $targetPitchDeg,
        'dt_s' => $dt,
    ],
    'meta' => [
        'api_version' => '1.0.0',
        'engine' => 'TBT-AeroDynamics-Core-v1',
        'aircraft_spec' => 'DAE-21 High-Lift Airfoil / Tandem 2-Seater',
        'server_timestamp' => date('c'),
        'calc_time_ms' => $calcDurationMs,
        'steps_computed' => $steps,
    ],
];

if ($includeTrajectory) {
    $response['trajectory'] = $trajectory;
    $response['trajectory_points_count'] = count($trajectory);
}

echo json_encode($response, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
