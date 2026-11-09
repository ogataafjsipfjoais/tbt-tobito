<?php
/**
 * TBT Tobito - Secret API Key Generator & Manager CLI
 *
 * Usage:
 *   php scripts/generate_api_key.php            # View current key & test command
 *   php scripts/generate_api_key.php --rotate   # Generate & replace with a new key
 *   php scripts/generate_api_key.php --env      # Export in .env format
 */

require_once __DIR__ . '/../includes/auth.php';

$isRotate = in_array('--rotate', $argv ?? []);
$isEnv = in_array('--env', $argv ?? []);

if ($isRotate) {
    $newKey = tbt_create_secure_key_string();
    tbt_save_api_key($newKey);
    echo "=====================================================\n";
    echo " [TBT TOBITO] API KEY ROTATED SUCCESSFULLY\n";
    echo "=====================================================\n";
    echo "New Secret API Key: " . $newKey . "\n";
    echo "Saved to: " . tbt_get_secret_file_path() . "\n";
    exit(0);
}

$currentKey = tbt_get_or_create_api_key();

if ($isEnv) {
    echo "TBT_API_KEY=\"{$currentKey}\"\n";
    exit(0);
}

echo "=====================================================\n";
echo " 🕊️  TBT TOBITO - SECRET FLIGHT CALCULATION API KEY\n";
echo "=====================================================\n";
echo "Current Secret API Key:\n";
echo "  " . $currentKey . "\n\n";
echo "Config File Location:\n";
echo "  " . tbt_get_secret_file_path() . "\n\n";
echo "Sample curl Request:\n";
echo "  curl -X POST http://127.0.0.1:8088/api/flight-calc.php \\\n";
echo "    -H \"Content-Type: application/json\" \\\n";
echo "    -H \"X-API-KEY: {$currentKey}\" \\\n";
echo "    -d '{\"pilot_power\": 420, \"cadence_rpm\": 85, \"sim_duration_sec\": 60}'\n";
echo "=====================================================\n";
