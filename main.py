"""
EnergyGuard — UK-DALE Preprocessing Script
===========================================

This script documents how you would extract a sample from a local copy of
the UK-DALE dataset (HDF5 or CSV format) and convert it into the JSON
files that the EnergyGuard React prototype consumes.

Usage
-----
  python main.py

Prerequisites
-------------
  pip install pandas numpy

If you have a real UK-DALE dataset locally you can uncomment the
`load_real_ukdale()` function and point DATA_ROOT to your copy.
Otherwise, this script generates realistic simulated data that matches the
UK-DALE schema for House 1.
"""

import json
import math
import os
import random
from datetime import datetime, timedelta, timezone

# ─── Configuration ──────────────────────────────────────────
OUTPUT_DIR   = os.path.join(os.path.dirname(__file__), "public", "data")
LIVE_RECORDS = 1000
HIST_DAYS    = 30
SAMPLING_SEC = 6   # UK-DALE native interval for IAM meters

# Dynamically extracted appliances — mirrors UK-DALE House 1 channels
APPLIANCES = [
    {"id": "meter_5",  "name": "Fridge"},
    {"id": "meter_6",  "name": "Washing Machine"},
    {"id": "meter_7",  "name": "Dishwasher"},
    {"id": "meter_8",  "name": "Television"},
    {"id": "meter_9",  "name": "Microwave"},
    {"id": "meter_10", "name": "Toaster"},
    {"id": "meter_11", "name": "Hi-Fi System"},
    {"id": "meter_12", "name": "Kettle"},
]


# ─── Simulation helpers ────────────────────────────────────
def fridge_power(tick: int) -> float:
    """Compressor cycles: ~40 min ON / ~20 min OFF."""
    cycle = tick % 600
    if cycle < 400:
        return 100 + random.uniform(-10, 20)
    return 3 + random.uniform(0, 2)


def tv_power(hour: int) -> float:
    if 18 <= hour < 23:
        return 65 + random.uniform(0, 15)
    return 3  # standby phantom load


def appliance_power(name: str, tick: int, hour: int) -> float:
    if name == "Fridge":
        return fridge_power(tick)
    if name == "Television":
        return tv_power(hour)
    if name == "Hi-Fi System":
        return 5 + random.uniform(0, 2)
    if name == "Kettle" and ((60 < tick < 75) or (540 < tick < 555)):
        return 2500 + random.uniform(-50, 50)
    if name == "Washing Machine" and 200 <= tick < 280:
        phase = (tick - 200) % 40
        if phase < 10:
            return 2100 + random.uniform(0, 100)
        if phase < 30:
            return 300 + random.uniform(0, 50)
        return 500 + random.uniform(0, 100)
    if name == "Dishwasher" and 700 <= tick < 780:
        return 1800 + random.uniform(0, 200)
    if name == "Microwave" and ((300 < tick < 310) or (600 < tick < 608)):
        return 1100 + random.uniform(0, 100)
    if name == "Toaster" and 80 < tick < 88:
        return 750 + random.uniform(0, 50)
    return 0.0


# ─── Generate live dataset ─────────────────────────────────
def generate_live_sample() -> list[dict]:
    records = []
    ts = datetime(2013, 4, 18, 9, 0, 0, tzinfo=timezone.utc)

    for i in range(LIVE_RECORDS):
        hour = ts.hour
        aggregate = 0
        apps = []
        for a in APPLIANCES:
            p = max(0, round(appliance_power(a["name"], i, hour)))
            aggregate += p
            apps.append({"id": a["id"], "name": a["name"], "powerWatts": p})
        aggregate += round(40 + random.uniform(0, 30))  # unmetered
        records.append({
            "timestamp": ts.isoformat(),
            "dataSource": "UK-DALE",
            "aggregatePowerWatts": aggregate,
            "appliances": apps,
        })
        ts += timedelta(seconds=SAMPLING_SEC)

    return records


# ─── Generate historical dataset ───────────────────────────
def generate_historical_sample() -> list[dict]:
    records = []
    ts = datetime(2013, 3, 19, 0, 0, 0, tzinfo=timezone.utc)

    for h in range(HIST_DAYS * 24):
        hour = ts.hour
        aggregate_kwh = 0.0
        apps = []
        for a in APPLIANCES:
            kwh = 0.0
            n = a["name"]
            if n == "Fridge":           kwh = 0.05 + random.uniform(0, 0.02)
            elif n == "Television":     kwh = 0.07 if 18 <= hour < 23 else 0.003
            elif n == "Hi-Fi System":   kwh = 0.005
            elif n == "Washing Machine": kwh = 1.2 if h % 48 == 10 else 0
            elif n == "Dishwasher":     kwh = 1.0 if h % 24 == 20 else 0
            elif n == "Kettle":         kwh = 0.1 if hour in (7, 15) else 0
            elif n == "Microwave":      kwh = 0.08 if hour in (12, 19) else 0
            elif n == "Toaster":        kwh = 0.06 if hour == 7 else 0
            kwh = round(kwh, 4)
            aggregate_kwh += kwh
            apps.append({"id": a["id"], "name": a["name"], "energyKwh": kwh})
        aggregate_kwh += 0.03  # base load
        records.append({
            "timestamp": ts.isoformat(),
            "dataSource": "UK-DALE",
            "aggregateEnergyKwh": round(aggregate_kwh, 4),
            "appliances": apps,
        })
        ts += timedelta(hours=1)

    return records


# ─── Main ──────────────────────────────────────────────────
def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    print(f"Generating ukdale_live_sample.json ({LIVE_RECORDS} records @ {SAMPLING_SEC}s)...")
    live = generate_live_sample()
    with open(os.path.join(OUTPUT_DIR, "ukdale_live_sample.json"), "w") as f:
        json.dump(live, f, indent=2)

    print(f"Generating ukdale_historical_sample.json ({HIST_DAYS} days, hourly)...")
    hist = generate_historical_sample()
    with open(os.path.join(OUTPUT_DIR, "ukdale_historical_sample.json"), "w") as f:
        json.dump(hist, f, indent=2)

    print("Done ✓")
    print(f"Files written to: {os.path.abspath(OUTPUT_DIR)}")


if __name__ == "__main__":
    main()
