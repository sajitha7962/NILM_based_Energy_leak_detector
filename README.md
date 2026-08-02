# EnergyGuard

**"See the waste. Find the cause. Save the money."**

This is the Phase 1 Real Dataset Prototype for the EnergyGuard system. It validates the complete product pipeline, UI, and anomaly detection logic using a ground-truth replay engine powered by a sample of the UK-DALE dataset.

## Architecture Evolution Roadmap

Our system is designed with a strictly modular `EnergyDataSource` to allow seamless transitions through the project phases without rewriting the frontend.

### Phase 1: Real Dataset Prototype (Current)
- **Source:** Local JSON extracted from UK-DALE dataset.
- **Engine:** Ground-Truth NILM Replay Engine.
- **Goal:** Validate the UI, Cost Engine, and Anomaly Detection logic using real appliance power signatures.

### Phase 2: Prototype NILM Validation (Next Step)
- **Source:** Real-time aggregate mains signal (simulated or real).
- **Engine:** Trained AI NILM Model (e.g., Seq2Point, CNN).
- **Goal:** Replace the ground-truth replay engine with the AI model. The model will predict appliance loads from the aggregate signal, allowing us to calculate accuracy against the ground truth.

### Phase 3: Hardware Integration
- **Source:** CT Clamp Sensor → ESP32 → Wi-Fi.
- **Engine:** Trained AI NILM Model.
- **Goal:** Full commercial deployment. Real-time aggregate power is streamed from the ESP32 to the NILM Model, feeding the EnergyGuard dashboard.

---

## Running the Prototype

1. `npm install`
2. `npm run dev`
3. Click the **Play** button in the top right of the dashboard to start the Live Simulation.
