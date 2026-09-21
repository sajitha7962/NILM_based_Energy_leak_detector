import pytest
import pandas as pd
import numpy as np
import json
import os
import sys
from fastapi.testclient import TestClient

# Add backend to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from server import app, SensorReading, extract_live_features
from train_model import extract_features as train_extract_features

client = TestClient(app)

def test_sensor_reading_validation():
    # Valid
    reading = SensorReading(
        voltage=230.1,
        current=0.041,
        power=9.2,
        energy=0.00001,
        timestamp="2026-09-19T21:30:10Z",
        source="ESP32"
    )
    assert reading.voltage == 230.1
    
    # Invalid (negative voltage)
    with pytest.raises(ValueError):
        SensorReading(
            voltage=-230.1,
            current=0.041,
            power=9.2,
            energy=0.00001,
            timestamp="2026-09-19T21:30:10Z",
            source="ESP32"
        )
        
    # Invalid (NaN power)
    with pytest.raises(ValueError):
        SensorReading(
            voltage=230.1,
            current=0.041,
            power=float('nan'),
            energy=0.00001,
            timestamp="2026-09-19T21:30:10Z",
            source="ESP32"
        )
        
    # Invalid (bad timestamp)
    with pytest.raises(ValueError):
        SensorReading(
            voltage=230.1,
            current=0.041,
            power=9.2,
            energy=0.00001,
            timestamp="not-a-timestamp",
            source="ESP32"
        )

def test_feature_extraction_consistency():
    # Create mock buffer of 5 samples
    buffer = [
        {'voltage': 230, 'current': 0.04, 'power': 9.2, 'energy': 0.00001},
        {'voltage': 230, 'current': 0.04, 'power': 9.2, 'energy': 0.00001},
        {'voltage': 230, 'current': 0.04, 'power': 9.3, 'energy': 0.00001},
        {'voltage': 230, 'current': 0.04, 'power': 9.2, 'energy': 0.00001},
        {'voltage': 230, 'current': 0.04, 'power': 9.2, 'energy': 0.00001},
    ]
    
    # Server extraction
    server_features = extract_live_features(buffer)
    
    # Train extraction
    df = pd.DataFrame(buffer)
    # Add dummy timestamp since train extracts needs it for sorting
    df['timestamp'] = pd.date_range('2026-01-01', periods=5)
    train_features = train_extract_features(df)
    
    # Extract last row of training features for comparison
    last_train_feat = train_features.iloc[-1]
    
    # Assert they are close
    assert np.isclose(server_features.iloc[0]['mean_power'], last_train_feat['mean_power'])
    assert np.isclose(server_features.iloc[0]['std_power'], last_train_feat['std_power'])
    assert np.isclose(server_features.iloc[0]['power_change'], last_train_feat['power_change'])

def test_api_sensor_endpoint():
    # Send one reading (warming up)
    response = client.post("/api/sensor", json={
        "voltage": 230.1,
        "current": 0.041,
        "power": 9.2,
        "energy": 0.00001,
        "timestamp": "2026-09-19T21:30:10Z",
        "source": "ESP32"
    })
    
    assert response.status_code == 200
    assert response.json()["status"] == "warming_up"
    
    # Send 4 more to fill buffer
    for i in range(4):
        resp = client.post("/api/sensor", json={
            "voltage": 230.1,
            "current": 0.041,
            "power": 9.2,
            "energy": 0.00001,
            "timestamp": f"2026-09-19T21:30:1{i}Z",
            "source": "ESP32"
        })
        
    assert resp.status_code == 200
    assert resp.json()["status"] == "ok"
    
    # We don't assert exactly "LED_Bulb" here in case the model isn't trained yet or random weights differ slightly,
    # but we assert it returns a prediction string and confidence float.
    assert "prediction" in resp.json()
    assert isinstance(resp.json()["confidence"], float)

def test_health_endpoint():
    resp = client.get("/api/health")
    assert resp.status_code == 200
    assert resp.json()["status"] == "ok"
    assert "model_loaded" in resp.json()
