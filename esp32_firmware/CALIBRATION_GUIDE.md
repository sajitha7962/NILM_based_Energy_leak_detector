# EnergyGuard Hardware Calibration Guide

> [!CAUTION]
> **HIGH VOLTAGE WARNING**
> You will be working with mains AC voltage (230V). Always ensure connections are secure, use insulated tools, and NEVER touch exposed wires while the circuit is live. 

## Hardware Components

| Component | Purpose |
|-----------|---------|
| ESP32 DevKit V1 | Microcontroller with Wi-Fi |
| ZMPT101B | AC voltage transformer (connected to mains) |
| SCT-013-000 | Split-core current transformer (100A:50mA) |
| Burden resistor (33Ω) | Required if using SCT-013-000 (not the SCT-013-030 which has built-in) |

## Wiring

```
ZMPT101B:
  VCC → ESP32 3.3V
  GND → ESP32 GND
  OUT → ESP32 GPIO34 (ADC1)

SCT-013-000:
  One lead → ESP32 GPIO35 (ADC1)
  Other lead → ESP32 GND
  (with burden resistor + bias circuit — see OpenEnergyMonitor docs)
```

> **Important:** Use ADC1 pins only (GPIO 32–39). ADC2 pins do not work when Wi-Fi is active.

## 1. Voltage Calibration (ZMPT101B)

### Procedure:
1. Upload the firmware with Serial debug output enabled.
2. Measure your actual wall AC voltage with a reliable multimeter (e.g., 229.5V).
3. Read the `Vrms` value from the ESP32 Serial Monitor.
4. Adjust the `VOLTAGE_CAL` constant:
   ```
   New VOLTAGE_CAL = (Multimeter Vrms / ESP32 Vrms) × Current VOLTAGE_CAL
   ```
5. Optionally fine-tune using the ZMPT101B onboard trimpot.

## 2. Current Calibration (SCT-013-000)

### Procedure:
1. Clamp the SCT-013 around **only ONE** wire (Live or Neutral). If clamped around the whole cable, the fields cancel and you read 0A.
2. Turn on a known load (e.g., 9W LED bulb → ~0.040A at 230V).
3. Read the `Irms` value from the ESP32 Serial Monitor.
4. Adjust the `CURRENT_CAL` constant:
   ```
   New CURRENT_CAL = (Actual Current / ESP32 Current) × Current CURRENT_CAL
   ```

For SCT-013-000 with 33Ω burden: theoretical starting value ≈ 60.6

## 3. Noise Floor

Sensor ADCs will produce small non-zero readings even with no load connected. The firmware includes configurable noise floors:

```cpp
const float CURRENT_NOISE_FLOOR = 0.01;  // Below this → 0 A
const float POWER_NOISE_FLOOR   = 1.0;   // Below this → 0 W
```

Adjust these if your sensors have different noise characteristics.

## 4. Final Verification

Once calibrated, run the ESP32 with your Halonix Astron Plus 9W LED bulb:
- You should see approximately **~230V** and **~0.040A** and **~9W** in the Serial Monitor.
- When the bulb is OFF, current and power should drop to **0**.
- Open the React dashboard in **ESP32 LIVE** mode to verify the live ML predictions.
