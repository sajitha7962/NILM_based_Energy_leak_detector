import json
import os
import random
import pandas as pd
from datetime import datetime, timedelta

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(BASE_DIR, 'public', 'data')
SYNTHETIC_DIR = os.path.join(DATA_DIR, 'synthetic')
COMBINED_DIR = os.path.join(DATA_DIR, 'combined')

os.makedirs(SYNTHETIC_DIR, exist_ok=True)
os.makedirs(COMBINED_DIR, exist_ok=True)

def generate_led_bulb_data(num_samples=1000):
    data = []
    ts = datetime(2026, 1, 1, 10, 0, 0)
    for _ in range(num_samples):
        # 80% chance of being ON
        is_on = random.random() < 0.8
        
        if is_on:
            voltage = 230.0 + random.uniform(-1.5, 1.5)
            current = 0.040 + random.uniform(-0.002, 0.002)
            power = voltage * current
            energy = power / 3600000  # kWh for one second (approx)
            status = 'ON'
        else:
            voltage = 230.0 + random.uniform(-1.5, 1.5)
            current = 0.0 + random.uniform(0.0, 0.001)
            power = voltage * current
            energy = power / 3600000
            status = 'OFF'
            
        data.append({
            'timestamp': ts.strftime('%Y-%m-%d %H:%M:%S'),
            'voltage': round(voltage, 1),
            'current': round(current, 3),
            'power': round(power, 1),
            'energy': round(energy, 7),
            'status': status,
            'appliance': 'LED_Bulb',
            'source': 'synthetic'
        })
        ts += timedelta(seconds=1)
        
    df = pd.DataFrame(data)
    df.to_csv(os.path.join(SYNTHETIC_DIR, 'led_bulb.csv'), index=False)
    return df

def generate_ukdale_csv():
    # Load UK-DALE live sample
    ukdale_path = os.path.join(DATA_DIR, 'ukdale_live_sample.json')
    if not os.path.exists(ukdale_path):
        print(f"File not found: {ukdale_path}")
        return pd.DataFrame()
        
    with open(ukdale_path, 'r') as f:
        live_data = json.load(f)
        
    data = []
    for record in live_data:
        ts = record['timestamp']
        # Extract each active appliance as a separate sample for training
        for app in record.get('appliances', []):
            power = app.get('powerWatts', 0)
            if power > 0:
                # Synthesize voltage and current since UK-DALE JSON only has power
                voltage = 230.0 + random.uniform(-2.0, 2.0)
                current = power / voltage
                energy = power / 3600000
                data.append({
                    'timestamp': ts.replace('T', ' ').split('+')[0],
                    'voltage': round(voltage, 1),
                    'current': round(current, 3),
                    'power': round(power, 1),
                    'energy': round(energy, 7),
                    'status': 'ON',
                    'appliance': app['name'],
                    'source': 'ukdale'
                })
                
    df = pd.DataFrame(data)
    # Add some OFF/Unknown states for negative class
    off_data = []
    ts = datetime(2013, 4, 18, 9, 0, 0)
    for _ in range(500):
        voltage = 230.0 + random.uniform(-2.0, 2.0)
        current = random.uniform(0.0, 0.005)
        power = voltage * current
        energy = power / 3600000
        off_data.append({
            'timestamp': ts.strftime('%Y-%m-%d %H:%M:%S'),
            'voltage': round(voltage, 1),
            'current': round(current, 3),
            'power': round(power, 1),
            'energy': round(energy, 7),
            'status': 'OFF',
            'appliance': 'Unknown',
            'source': 'ukdale'
        })
        ts += timedelta(seconds=1)
        
    df_off = pd.DataFrame(off_data)
    return pd.concat([df, df_off], ignore_index=True)

if __name__ == '__main__':
    print("Generating synthetic LED bulb data...")
    led_df = generate_led_bulb_data(1500)
    print(f"Generated {len(led_df)} LED_Bulb samples.")
    
    print("Extracting UK-DALE data...")
    ukdale_df = generate_ukdale_csv()
    print(f"Extracted {len(ukdale_df)} UK-DALE samples.")
    
    print("Combining datasets...")
    combined_df = pd.concat([ukdale_df, led_df], ignore_index=True)
    
    out_path = os.path.join(COMBINED_DIR, 'energyguard_combined.csv')
    combined_df.to_csv(out_path, index=False)
    print(f"Saved combined dataset to {out_path} ({len(combined_df)} total samples)")
