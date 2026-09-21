import os
import json
import asyncio
import pandas as pd
import numpy as np
import joblib
from fastapi import FastAPI, Request, BackgroundTasks, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, field_validator
from sse_starlette.sse import EventSourceResponse
from typing import Optional
from datetime import datetime

app = FastAPI(title="EnergyGuard AI API")

# Enable CORS for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(BASE_DIR, 'model.pkl')
INFO_PATH = os.path.join(BASE_DIR, 'model_info.json')

# Load model
if os.path.exists(MODEL_PATH):
    model = joblib.load(MODEL_PATH)
else:
    model = None
    print("Warning: model.pkl not found!")

# A queue to hold live predictions for SSE
prediction_queues = []

# Buffer for rolling features
sensor_buffer = []

class SensorReading(BaseModel):
    voltage: float
    current: float
    power: float
    energy: float
    timestamp: str
    source: str
    
    @field_validator('voltage', 'current', 'power', 'energy')
    @classmethod
    def check_non_negative(cls, v):
        if v < 0:
            raise ValueError('Value cannot be negative')
        if not np.isfinite(v):
            raise ValueError('Value must be finite')
        return v
        
    @field_validator('timestamp')
    @classmethod
    def check_timestamp(cls, v):
        if not v or v.strip() == '':
            # Auto-fill with server time if ESP32 sends empty
            return datetime.utcnow().isoformat() + 'Z'
        try:
            datetime.fromisoformat(v.replace('Z', '+00:00'))
        except ValueError:
            raise ValueError('timestamp must be in valid ISO 8601 format')
        return v


def extract_live_features(buffer):
    """
    Extract features matching exact training pipeline:
    mean_power, std_power, min_power, max_power, power_change, current_change
    using a 5-sample window.
    """
    if len(buffer) < 2:
        return None
        
    df = pd.DataFrame(buffer)
    latest = df.iloc[-1]
    
    # Calculate stats over the buffer (up to 5 samples)
    mean_power = df['power'].mean()
    std_power = df['power'].std() if len(df) > 1 else 0.0
    min_power = df['power'].min()
    max_power = df['power'].max()
    
    # Changes (difference between latest and previous)
    power_change = latest['power'] - df.iloc[-2]['power']
    current_change = latest['current'] - df.iloc[-2]['current']
    
    # Ensure feature columns exactly match training:
    features = pd.DataFrame([{
        'voltage': latest['voltage'],
        'current': latest['current'],
        'power': latest['power'],
        'energy': latest['energy'],
        'mean_power': mean_power,
        'std_power': std_power,
        'min_power': min_power,
        'max_power': max_power,
        'power_change': power_change,
        'current_change': current_change
    }])
    
    return features


@app.post("/api/sensor")
async def receive_sensor_data(reading: SensorReading):
    global sensor_buffer
    data = reading.model_dump()
    sensor_buffer.append(data)
    
    # Keep only the last 5 readings for the rolling window
    if len(sensor_buffer) > 5:
        sensor_buffer = sensor_buffer[-5:]
        
    prediction = "Unknown"
    confidence = 0.0
    status = "ok"
    
    if len(sensor_buffer) < 5:
        status = "warming_up"
        
    if model is not None and len(sensor_buffer) >= 2:
        features = extract_live_features(sensor_buffer)
        if features is not None:
            pred = model.predict(features)[0]
            probs = model.predict_proba(features)[0]
            conf = max(probs)
            prediction = pred
            confidence = float(conf)
            
    # Format the payload for the React frontend (matching EnergyRecord)
    payload = {
        "timestamp": reading.timestamp,
        "dataSource": reading.source,
        "aggregatePowerWatts": reading.power,
        "voltage": reading.voltage,
        "current": reading.current,
        "energy": reading.energy,
        "appliances": []
    }
    
    if prediction not in ["Unknown", "OFF"] and reading.power > 0.5:
        app_id = f"{reading.source.lower()}_{prediction.lower().replace(' ', '_')}"
        payload["appliances"].append({
            "id": app_id,
            "name": prediction,
            "powerWatts": reading.power,
            "confidence": confidence
        })
    
    # Push to all SSE clients
    for q in prediction_queues:
        await q.put(payload)
        
    return {
        "status": status,
        "prediction": prediction,
        "confidence": confidence,
        "voltage": reading.voltage,
        "current": reading.current,
        "power": reading.power,
        "energy": reading.energy,
        "timestamp": reading.timestamp,
        "source": reading.source
    }

@app.get("/api/stream")
async def stream(request: Request):
    q = asyncio.Queue()
    prediction_queues.append(q)
    
    async def event_generator():
        try:
            while True:
                # If client closes connection, exit
                if await request.is_disconnected():
                    break
                data = await q.get()
                yield {
                    "event": "message",
                    "data": json.dumps(data)
                }
        except asyncio.CancelledError:
            pass
        finally:
            if q in prediction_queues:
                prediction_queues.remove(q)
            
    return EventSourceResponse(event_generator())

@app.get("/api/health")
def get_health():
    model_info = {}
    if os.path.exists(INFO_PATH):
        try:
            with open(INFO_PATH, 'r') as f:
                model_info = json.load(f)
        except Exception:
            pass
            
    return {
        "status": "ok",
        "model_loaded": model is not None,
        "model_version": model_info.get("last_trained", "unknown"),
        "connected_clients": len(prediction_queues),
        "buffer_size": len(sensor_buffer)
    }

@app.get("/api/model_status")
def get_model_status():
    if os.path.exists(INFO_PATH):
        with open(INFO_PATH, 'r') as f:
            return json.load(f)
    return {"error": "Model info not found"}

if __name__ == '__main__':
    import uvicorn
    uvicorn.run("server:app", host="0.0.0.0", port=8000, reload=True)
