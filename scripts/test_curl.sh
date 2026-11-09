#!/bin/bash
# TBT Tobito - Flight Calculation API curl Test Runner
set -e

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
KEY=$(php -r "require '$DIR/includes/auth.php'; echo tbt_get_or_create_api_key();")

echo "=========================================="
echo " 🕊️  Testing Flight Calc API via curl"
echo " API Key: ${KEY:0:12}...${KEY: -6}"
echo "=========================================="

# Direct PHP CGI invocation test (independent of web server port)
php -r "
\$_SERVER['REQUEST_METHOD'] = 'POST';
\$_SERVER['HTTP_X_API_KEY'] = '$KEY';
\$_POST = [
    'pilot_power' => 440,
    'cadence_rpm' => 84,
    'target_pitch_deg' => 1.4,
    'include_trajectory' => 'false'
];
include '$DIR/api/flight-calc.php';
"
