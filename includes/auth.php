<?php
/**
 * TBT Tobito - Secure API Authentication & Key Management Module
 * 
 * Provides automated secure key generation, non-public secret file storage,
 * and timing-attack safe verification.
 */

define('TBT_AUTH_MODULE_LOADED', true);

/**
 * Returns the secret config file path.
 */
function tbt_get_secret_file_path(): string {
    return dirname(__DIR__) . '/config.secret.php';
}

/**
 * Returns the .env file path.
 */
function tbt_get_env_file_path(): string {
    return dirname(__DIR__) . '/.env';
}

/**
 * Generate a cryptographically secure API key.
 * Format: tbt_live_<48 hex chars>
 */
function tbt_create_secure_key_string(): string {
    return 'tbt_live_' . bin2hex(random_bytes(24));
}

/**
 * Load or initialize the secret API key.
 * If not exists, generates a new one and stores into config.secret.php safely.
 */
function tbt_get_or_create_api_key(): string {
    // 1. Check system environment variables first
    $envKey = getenv('TBT_API_KEY');
    if (!empty($envKey)) {
        return trim($envKey);
    }
    if (isset($_ENV['TBT_API_KEY']) && !empty($_ENV['TBT_API_KEY'])) {
        return trim($_ENV['TBT_API_KEY']);
    }

    // 2. Check .env file if present
    $envFile = tbt_get_env_file_path();
    if (file_exists($envFile)) {
        $lines = file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
        foreach ($lines as $line) {
            $line = trim($line);
            if (strpos($line, '#') === 0) continue;
            if (strpos($line, 'TBT_API_KEY=') === 0) {
                $val = trim(substr($line, strlen('TBT_API_KEY=')));
                $val = trim($val, "\"'");
                if (!empty($val)) {
                    return $val;
                }
            }
        }
    }

    // 3. Check config.secret.php
    $secretFile = tbt_get_secret_file_path();
    if (file_exists($secretFile)) {
        $secretData = include $secretFile;
        if (is_array($secretData) && !empty($secretData['api_key'])) {
            return (string)$secretData['api_key'];
        }
    }

    // 4. Automatically generate a new secret API key
    $newKey = tbt_create_secure_key_string();
    tbt_save_api_key($newKey);
    return $newKey;
}

/**
 * Save an API key into config.secret.php.
 */
function tbt_save_api_key(string $apiKey): bool {
    $secretFile = tbt_get_secret_file_path();
    $content = "<?php\n"
             . "// TBT Tobito - Non-public secret configuration file\n"
             . "// DO NOT COMMIT TO PUBLIC REPOSITORIES\n"
             . "if (!defined('TBT_AUTH_MODULE_LOADED')) {\n"
             . "    http_response_code(403);\n"
             . "    exit('Forbidden');\n"
             . "}\n\n"
             . "return [\n"
             . "    'api_key' => " . var_export($apiKey, true) . ",\n"
             . "    'created_at' => " . var_export(date('Y-m-d H:i:s'), true) . ",\n"
             . "    'app_name' => 'Team Birdman Trial - Tobito Flight Calc API',\n"
             . "];\n";

    $written = @file_put_contents($secretFile, $content, LOCK_EX);
    if ($written !== false) {
        @chmod($secretFile, 0600);
        return true;
    }
    return false;
}

/**
 * Extract provided API key from headers, body or query params.
 */
function tbt_extract_request_api_key(): ?string {
    // 1. Header: X-API-KEY
    if (isset($_SERVER['HTTP_X_API_KEY']) && !empty($_SERVER['HTTP_X_API_KEY'])) {
        return trim($_SERVER['HTTP_X_API_KEY']);
    }

    // 2. Header: Authorization: Bearer <key>
    if (isset($_SERVER['HTTP_AUTHORIZATION']) && !empty($_SERVER['HTTP_AUTHORIZATION'])) {
        if (preg_match('/Bearer\s+(.+)$/i', trim($_SERVER['HTTP_AUTHORIZATION']), $matches)) {
            return trim($matches[1]);
        }
    }

    // 3. Apache request headers fallback
    if (function_exists('apache_request_headers')) {
        $headers = apache_request_headers();
        foreach ($headers as $k => $v) {
            if (strcasecmp($k, 'X-API-KEY') === 0 && !empty($v)) {
                return trim($v);
            }
            if (strcasecmp($k, 'Authorization') === 0 && !empty($v)) {
                if (preg_match('/Bearer\s+(.+)$/i', trim($v), $matches)) {
                    return trim($matches[1]);
                }
            }
        }
    }

    // 4. POST body (json or form)
    if (isset($_POST['api_key']) && !empty($_POST['api_key'])) {
        return trim((string)$_POST['api_key']);
    }

    // 5. GET query parameter (convenient for testing)
    if (isset($_GET['api_key']) && !empty($_GET['api_key'])) {
        return trim((string)$_GET['api_key']);
    }

    return null;
}

/**
 * Verify provided API key against stored valid key.
 * Uses timing-attack safe hash_equals.
 */
function tbt_verify_api_key(?string $providedKey): bool {
    if (empty($providedKey)) {
        return false;
    }
    $validKey = tbt_get_or_create_api_key();
    return hash_equals($validKey, $providedKey);
}
