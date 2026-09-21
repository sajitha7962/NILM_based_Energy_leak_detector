/*
 * =============================================================
 *  EnergyGuard AI — ESP32 Real-Hardware Firmware
 *  For: ESP32 DevKit V1 + SCT-013-000 + ZMPT101B
 * =============================================================
 *
 *  This firmware reads REAL calibrated sensor data from:
 *    - ZMPT101B (AC voltage transformer) via ADC
 *    - SCT-013-000 (current transformer) via ADC
 *
 *  It calculates RMS voltage, RMS current, real power,
 *  and cumulative energy (kWh), then POSTs these REAL
 *  measurements to the EnergyGuard FastAPI backend.
 *
 *  NO values are hard-coded or fabricated.
 *  All readings come from actual sensor hardware.
 *
 *  Dependencies (install via Arduino Library Manager):
 *    - EmonLib (by OpenEnergyMonitor)
 *    - WiFi (built into ESP32 Arduino core)
 *    - HTTPClient (built into ESP32 Arduino core)
 *
 *  Board: ESP32 Dev Module (or ESP32 DevKit V1)
 *  Upload Speed: 115200
 * =============================================================
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include "EmonLib.h"

// =============================================================
//  USER CONFIGURATION — EDIT THESE FOR YOUR SETUP
// =============================================================

// ------- Wi-Fi Credentials -------
const char* WIFI_SSID     = "YOUR_WIFI_SSID";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";

// ------- FastAPI Server -------
// Set this to your laptop/PC's LOCAL IP address on the same Wi-Fi network.
// Find it with: ipconfig (Windows) or ifconfig / ip addr (Linux/Mac)
// Example: "http://192.168.1.100:8000/api/sensor"
const char* API_URL = "http://YOUR_LAPTOP_IP:8000/api/sensor";

// ------- Sensor Pins (ADC1 only — ADC2 conflicts with Wi-Fi) -------
const int VOLTAGE_PIN = 34;   // ZMPT101B signal output → GPIO34
const int CURRENT_PIN = 35;   // SCT-013-000 signal output → GPIO35

// ------- Calibration Constants -------
// These MUST be tuned for your specific hardware setup.
// See CALIBRATION_GUIDE.md for the procedure.
//
// VOLTAGE_CAL: Adjusts raw ADC reading to match real AC voltage.
//   Formula: New_CAL = (Multimeter_Vrms / ESP32_Vrms) * Current_CAL
//   Typical range for ZMPT101B: 100 – 500 depending on module variant
const float VOLTAGE_CAL = 234.26;

// CURRENT_CAL: Adjusts raw ADC reading to match real AC current.
//   For SCT-013-000 (100A:50mA) with 33Ω burden resistor:
//     Theoretical = (100 / 0.05) / 33 ≈ 60.6
//   Formula: New_CAL = (Multimeter_Irms / ESP32_Irms) * Current_CAL
const float CURRENT_CAL = 30.0;

// PHASE_SHIFT: Compensates for phase difference between V and I sensors.
//   Default 1.7 works for most setups. Adjust if power factor seems wrong.
const float PHASE_SHIFT = 1.7;

// ------- Noise Floor Thresholds -------
// Below these thresholds, readings are treated as zero (sensor noise).
// A 9W LED bulb draws ~0.040A. Set current floor below that.
const float CURRENT_NOISE_FLOOR = 0.01;  // Amps — readings below this → 0
const float POWER_NOISE_FLOOR   = 1.0;   // Watts — readings below this → 0

// ------- Timing -------
const unsigned long POST_INTERVAL_MS = 2000;  // Send data every 2 seconds
const unsigned long WIFI_RETRY_MS    = 5000;  // Retry Wi-Fi every 5 seconds

// =============================================================
//  GLOBALS (do not edit)
// =============================================================
EnergyMonitor emon;
unsigned long lastPostTime = 0;
double cumulativeEnergyKwh = 0.0;
unsigned long lastEnergyCalcTime = 0;
unsigned long bootTime = 0;

// =============================================================
//  SETUP
// =============================================================
void setup() {
  Serial.begin(115200);
  delay(500);

  Serial.println();
  Serial.println("===================================");
  Serial.println("  EnergyGuard AI — ESP32 Firmware");
  Serial.println("  Real Hardware Sensor Mode");
  Serial.println("===================================");
  Serial.println();

  // ---- Connect to Wi-Fi ----
  connectWiFi();

  // ---- Initialize EmonLib sensors ----
  emon.voltage(VOLTAGE_PIN, VOLTAGE_CAL, PHASE_SHIFT);
  emon.current(CURRENT_PIN, CURRENT_CAL);

  Serial.println("[SENSORS] ZMPT101B on GPIO" + String(VOLTAGE_PIN));
  Serial.println("[SENSORS] SCT-013  on GPIO" + String(CURRENT_PIN));
  Serial.println("[SENSORS] VOLTAGE_CAL = " + String(VOLTAGE_CAL));
  Serial.println("[SENSORS] CURRENT_CAL = " + String(CURRENT_CAL));
  Serial.println("[SENSORS] Initialization complete.");
  Serial.println();

  lastEnergyCalcTime = millis();
  bootTime = millis();
}

// =============================================================
//  MAIN LOOP
// =============================================================
void loop() {
  // ---- Ensure Wi-Fi is connected ----
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("[WIFI] Connection lost. Reconnecting...");
    connectWiFi();
  }

  // ---- Read REAL sensor data via EmonLib ----
  // calcVI(crossings, timeout_ms)
  //   crossings: number of half-wavelengths to sample (20 = ~200ms at 50Hz)
  //   timeout: maximum wait time in ms
  emon.calcVI(20, 2000);

  // ---- Extract REAL measured values ----
  float voltage = emon.Vrms;
  float current = emon.Irms;
  float power   = emon.realPower;

  // ---- Apply noise floor (do NOT fabricate values) ----
  if (current < CURRENT_NOISE_FLOOR) {
    current = 0.0;
  }
  if (power < POWER_NOISE_FLOOR) {
    power = 0.0;
  }

  // ---- Accumulate energy (kWh) ----
  unsigned long now = millis();
  if (lastEnergyCalcTime > 0) {
    double hoursPassed = (now - lastEnergyCalcTime) / 3600000.0;
    if (power > 0) {
      cumulativeEnergyKwh += (power * hoursPassed) / 1000.0;
    }
  }
  lastEnergyCalcTime = now;

  // ---- Print to Serial Monitor for debugging ----
  Serial.println("------ LIVE SENSOR READING ------");
  Serial.print("  Voltage:  "); Serial.print(voltage, 2); Serial.println(" V");
  Serial.print("  Current:  "); Serial.print(current, 4); Serial.println(" A");
  Serial.print("  Power:    "); Serial.print(power, 2);   Serial.println(" W");
  Serial.print("  Energy:   "); Serial.print(cumulativeEnergyKwh, 7); Serial.println(" kWh");
  Serial.println("---------------------------------");

  // ---- POST to FastAPI at configured interval ----
  if (now - lastPostTime >= POST_INTERVAL_MS) {
    lastPostTime = now;
    postSensorData(voltage, current, power, cumulativeEnergyKwh);
  }
}

// =============================================================
//  Wi-Fi Connection (with retry)
// =============================================================
void connectWiFi() {
  WiFi.disconnect(true);
  delay(100);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  Serial.print("[WIFI] Connecting to: ");
  Serial.println(WIFI_SSID);

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    Serial.print(".");
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println();
    Serial.println("[WIFI] Connected!");
    Serial.print("[WIFI] IP Address: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println();
    Serial.println("[WIFI] Failed to connect. Will retry in loop.");
  }
}

// =============================================================
//  HTTP POST to FastAPI /api/sensor
// =============================================================
void postSensorData(float voltage, float current, float power, double energy) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("[HTTP] Skipping POST — Wi-Fi not connected.");
    return;
  }

  HTTPClient http;
  http.begin(API_URL);
  http.addHeader("Content-Type", "application/json");
  http.setTimeout(5000);  // 5 second timeout

  // ---- Build ISO 8601 timestamp from uptime ----
  // (For production, use NTP. This provides a valid parseable timestamp.)
  unsigned long uptimeSec = (millis() - bootTime) / 1000;
  unsigned long hours   = uptimeSec / 3600;
  unsigned long minutes = (uptimeSec % 3600) / 60;
  unsigned long seconds = uptimeSec % 60;

  char timestamp[30];
  snprintf(timestamp, sizeof(timestamp),
           "2026-01-01T%02lu:%02lu:%02lu",
           hours, minutes, seconds);

  // ---- Construct JSON payload ----
  // All values come from REAL sensor measurements.
  // No hard-coded demonstration values.
  String json = "{";
  json += "\"voltage\":" + String(voltage, 2) + ",";
  json += "\"current\":" + String(current, 4) + ",";
  json += "\"power\":" + String(power, 2) + ",";
  json += "\"energy\":" + String(energy, 7) + ",";
  json += "\"timestamp\":\"" + String(timestamp) + "\",";
  json += "\"source\":\"ESP32\"";
  json += "}";

  Serial.print("[HTTP] POST → ");
  Serial.println(API_URL);
  Serial.print("[HTTP] Payload: ");
  Serial.println(json);

  int httpCode = http.POST(json);

  if (httpCode > 0) {
    Serial.print("[HTTP] Response Code: ");
    Serial.println(httpCode);
    String response = http.getString();
    Serial.print("[HTTP] Response: ");
    Serial.println(response);
  } else {
    Serial.print("[HTTP] POST FAILED. Error: ");
    Serial.println(http.errorToString(httpCode));
    Serial.println("[HTTP] Check: Is the backend running? Is the IP correct?");
  }

  http.end();
  Serial.println();
}
