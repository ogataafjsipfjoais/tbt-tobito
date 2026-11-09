#!/usr/bin/env python3
"""
TBT Tobito - Flight Dynamics Calculation API Python Client
Demonstrates calling the server-side aerodynamics calculation API using only standard libraries.

Usage:
    python scripts/test_calc_client.py
"""

import json
import urllib.request
import urllib.error
import sys
import os

def load_api_key_from_config(config_path):
    if not os.path.exists(config_path):
        return None
    with open(config_path, "r", encoding="utf-8") as f:
        content = f.read()
    # Simple extraction of 'api_key' => '...'
    import re
    match = re.search(r"['\"]api_key['\"]\s*=>\s*['\"]([^'\"]+)['\"]", content)
    if match:
        return match.group(1)
    return None

def main():
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    config_path = os.path.join(base_dir, "config.secret.php")
    
    api_key = os.environ.get("TBT_API_KEY") or load_api_key_from_config(config_path)
    
    if not api_key:
        print("[ERROR] Secret API key not found. Run 'php scripts/generate_api_key.php' first.")
        sys.exit(1)

    print("==================================================================")
    print(" 🕊️  TBT TOBITO - SERVER-SIDE FLIGHT DYNAMICS SIMULATOR CLIENT")
    print("==================================================================")
    print(f"Loaded Secret API Key: {api_key[:12]}...{api_key[-6:]}")

    # Request payload with simulation parameters
    payload = {
        "pilot_power": 460.0,       # High-power tandem pedaling (Watts)
        "cadence_rpm": 88.0,        # Cadence (RPM)
        "pilot_stamina": 100.0,     # Initial stamina (%)
        "target_pitch_deg": 1.2,    # Optimal pitch angle for L/D ratio
        "wind_speed": 1.8,          # Lake Biwa gentle tail-cross wind (m/s)
        "wind_direction_deg": 30.0,
        "sim_duration_sec": 180.0,
        "include_trajectory": True,
        "trajectory_sample_interval": 1.0,
    }

    url = "http://127.0.0.1:8088/api/flight-calc.php"

    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=data,
        headers={
            "Content-Type": "application/json",
            "X-API-KEY": api_key,
            "User-Agent": "TBT-Tobito-PythonClient/1.0",
        },
        method="POST"
    )

    try:
        with urllib.request.urlopen(req, timeout=10) as response:
            res_body = response.read().decode("utf-8")
            res_json = json.loads(res_body)

            print("\n[SUCCESS] Server Calculation Completed!")
            print(f"Engine: {res_json['meta']['engine']} (computed in {res_json['meta']['calc_time_ms']} ms)")
            print("\n--- SIMULATION SUMMARY ---")
            summary = res_json.get("summary", {})
            print(f"  * Flight Distance    : {summary.get('flight_distance_m')} m")
            print(f"  * Flight Duration    : {summary.get('flight_time_s')} s")
            print(f"  * Takeoff Speed      : {summary.get('takeoff_speed_kmh')} km/h")
            print(f"  * Max Airspeed       : {summary.get('max_airspeed_kmh')} km/h")
            print(f"  * Max Altitude       : {summary.get('max_altitude_m')} m")
            print(f"  * Ground Effect Dist : {summary.get('ground_effect_distance_m')} m ({summary.get('ground_effect_ratio_percent')}%)")
            print(f"  * Average Glide Ratio: {summary.get('average_glide_ratio')} (L/D)")
            print(f"  * Energy Consumed    : {summary.get('total_energy_burned_kj')} kJ")
            print(f"  * Landing Reason     : {summary.get('landing_reason_ja')} ({summary.get('landing_reason')})")

            traj = res_json.get("trajectory", [])
            print(f"\n--- TRAJECTORY POINTS ({len(traj)} samples recorded) ---")
            for pt in traj[:5]:
                print(f"  t={pt['time_s']:>5.1f}s | Alt={pt['altitude_m']:>4.1f}m | Dist={pt['distance_m']:>6.1f}m | V={pt['airspeed_kmh']:>4.1f}km/h | Power={pt['power_watts']:>4.0f}W")
            if len(traj) > 6:
                print("  ...")
                last_pt = traj[-1]
                print(f"  t={last_pt['time_s']:>5.1f}s | Alt={last_pt['altitude_m']:>4.1f}m | Dist={last_pt['distance_m']:>6.1f}m | V={last_pt['airspeed_kmh']:>4.1f}km/h | Power={last_pt['power_watts']:>4.0f}W")

    except urllib.error.HTTPError as e:
        print(f"\n[HTTP ERROR {e.code}]: {e.reason}")
        print(e.read().decode("utf-8"))
    except urllib.error.URLError as e:
        print(f"\n[CONNECTION ERROR]: {e.reason}")
        print("Note: If the local PHP server is not running on port 8088, you can test directly via php CLI or start the server.")

if __name__ == "__main__":
    main()
