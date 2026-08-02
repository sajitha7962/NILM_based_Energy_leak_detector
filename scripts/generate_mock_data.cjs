const fs = require('fs');
const path = require('path');

// ──────────────────────────────────────────────────────────
// UK-DALE House 1 — dynamically extracted appliance channels
// ──────────────────────────────────────────────────────────
const APPLIANCES = [
  { id: 'meter_5',  name: 'Fridge',           basePower: 80,  maxPower: 160,  alwaysOn: true  },
  { id: 'meter_6',  name: 'Washing Machine',  basePower: 0,   maxPower: 2200, alwaysOn: false },
  { id: 'meter_7',  name: 'Dishwasher',       basePower: 0,   maxPower: 2000, alwaysOn: false },
  { id: 'meter_8',  name: 'Television',       basePower: 3,   maxPower: 80,   alwaysOn: false },
  { id: 'meter_9',  name: 'Microwave',        basePower: 0,   maxPower: 1200, alwaysOn: false },
  { id: 'meter_10', name: 'Toaster',          basePower: 0,   maxPower: 800,  alwaysOn: false },
  { id: 'meter_11', name: 'Hi-Fi System',     basePower: 5,   maxPower: 25,   alwaysOn: false },
  { id: 'meter_12', name: 'Kettle',           basePower: 0,   maxPower: 2500, alwaysOn: false },
];

// Fridge compressor cycling model (on 40 min / off 20 min → 6-second ticks)
function fridgePower(tick) {
  const cycle = tick % 600; // 600 ticks = 1 hour
  return cycle < 400
    ? 100 + Math.random() * 30   // compressor ON
    : 3 + Math.random() * 2;     // compressor OFF (standby)
}

// TV: on roughly from 18:00–23:00 each day
function tvPower(hourOfDay) {
  return hourOfDay >= 18 && hourOfDay < 23
    ? 65 + Math.random() * 15
    : 3;                          // standby phantom load
}

function generateLiveSample(numRecords = 1000) {
  const records = [];
  // Starting at 2013-04-18 09:00 UTC  (UK-DALE House 1 period)
  let currentMs = new Date('2013-04-18T09:00:00Z').getTime();
  const INTERVAL_MS = 6000; // 6-second native sampling

  for (let i = 0; i < numRecords; i++) {
    const ts = new Date(currentMs);
    const hourOfDay = ts.getUTCHours();
    let aggregate = 0;
    const appliances = [];

    APPLIANCES.forEach(app => {
      let power = 0;

      switch (app.name) {
        case 'Fridge':
          power = fridgePower(i);
          break;
        case 'Television':
          power = tvPower(hourOfDay);
          break;
        case 'Hi-Fi System':
          power = app.basePower + Math.random() * 2; // always-on standby
          break;
        case 'Kettle':
          // Two kettle events: morning and afternoon
          if ((i > 60 && i < 75) || (i > 540 && i < 555))
            power = app.maxPower + (Math.random() * 100 - 50);
          break;
        case 'Washing Machine':
          // One wash cycle: records 200-280
          if (i >= 200 && i < 280) {
            const phase = (i - 200) % 40;
            power = phase < 10 ? 2100 + Math.random() * 100  // heat
                  : phase < 30 ? 300 + Math.random() * 50    // wash
                  : 500 + Math.random() * 100;               // spin
          }
          break;
        case 'Dishwasher':
          if (i >= 700 && i < 780)
            power = 1800 + Math.random() * 200;
          break;
        case 'Microwave':
          if ((i > 300 && i < 310) || (i > 600 && i < 608))
            power = 1100 + Math.random() * 100;
          break;
        case 'Toaster':
          if (i > 80 && i < 88)
            power = 750 + Math.random() * 50;
          break;
      }

      power = Math.max(0, Math.round(power));
      aggregate += power;

      appliances.push({ id: app.id, name: app.name, powerWatts: power });
    });

    // Unknown / unmetered loads
    aggregate += Math.round(40 + Math.random() * 30);

    records.push({
      timestamp: ts.toISOString(),
      dataSource: 'UK-DALE',
      aggregatePowerWatts: aggregate,
      appliances,
    });

    currentMs += INTERVAL_MS;
  }
  return records;
}

function generateHistoricalSample(days = 30) {
  const records = [];
  let currentMs = new Date('2013-03-19T00:00:00Z').getTime();
  const HOUR_MS = 3_600_000;

  for (let h = 0; h < days * 24; h++) {
    const ts = new Date(currentMs);
    const hourOfDay = ts.getUTCHours();
    let aggregateKwh = 0;
    const appliances = [];

    APPLIANCES.forEach(app => {
      let kwh = 0;
      switch (app.name) {
        case 'Fridge':       kwh = 0.05 + Math.random() * 0.02; break;
        case 'Television':   kwh = (hourOfDay >= 18 && hourOfDay < 23) ? 0.07 + Math.random() * 0.01 : 0.003; break;
        case 'Hi-Fi System': kwh = 0.005; break;
        case 'Washing Machine': kwh = (h % 48 === 10) ? 1.2 : 0; break;
        case 'Dishwasher':   kwh = (h % 24 === 20) ? 1.0 : 0; break;
        case 'Kettle':       kwh = (hourOfDay === 7 || hourOfDay === 15) ? 0.1 : 0; break;
        case 'Microwave':    kwh = (hourOfDay === 12 || hourOfDay === 19) ? 0.08 : 0; break;
        case 'Toaster':      kwh = (hourOfDay === 7) ? 0.06 : 0; break;
      }
      kwh = Number(kwh.toFixed(4));
      aggregateKwh += kwh;
      appliances.push({ id: app.id, name: app.name, energyKwh: kwh });
    });

    aggregateKwh += 0.03; // unmetered base load

    records.push({
      timestamp: ts.toISOString(),
      dataSource: 'UK-DALE',
      aggregateEnergyKwh: Number(aggregateKwh.toFixed(4)),
      appliances,
    });

    currentMs += HOUR_MS;
  }
  return records;
}

// ── Write files ──
const dataDir = path.join(__dirname, '../public/data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

console.log('Generating ukdale_live_sample.json  (1000 records @ 6 s)...');
fs.writeFileSync(
  path.join(dataDir, 'ukdale_live_sample.json'),
  JSON.stringify(generateLiveSample(1000), null, 2)
);

console.log('Generating ukdale_historical_sample.json  (30 days, hourly)...');
fs.writeFileSync(
  path.join(dataDir, 'ukdale_historical_sample.json'),
  JSON.stringify(generateHistoricalSample(30), null, 2)
);

console.log('Done ✓');
