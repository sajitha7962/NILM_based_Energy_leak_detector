import { EnergyDataSource, EnergyRecord, DataSourceControls } from '../types/energy';

// Track the latest ESP32 hardware reading across both modes
export interface Esp32HardwareState {
  powerWatts: number;
  voltage: number;
  current: number;
  energyKwh: number;
  isAnomaly: boolean;
  isolationForestScore: number;
  anomalyReason?: string;
  lastUpdated: number;
  isOn: boolean;
  isConnected: boolean;
}

export let latestEsp32HardwareState: Esp32HardwareState = {
  powerWatts: 0,
  voltage: 230.0,
  current: 0.0,
  energyKwh: 0.0,
  isAnomaly: false,
  isolationForestScore: 0.05,
  lastUpdated: 0,
  isOn: false,
  isConnected: false,
};

export function updateEsp32HardwareReading(data: any) {
  const power = typeof data.power === 'number' 
    ? data.power 
    : (typeof data.aggregatePowerWatts === 'number' ? data.aggregatePowerWatts : 0);
  const voltage = typeof data.voltage === 'number' ? data.voltage : 229.5;
  const current = typeof data.current === 'number' ? data.current : 0;
  const energy = typeof data.energy === 'number' ? data.energy : 0;

  latestEsp32HardwareState = {
    powerWatts: Math.round(power * 100) / 100,
    voltage: Math.round(voltage * 10) / 10,
    current: Math.round(current * 10000) / 10000,
    energyKwh: energy,
    isAnomaly: !!data.isAnomaly,
    isolationForestScore: typeof data.isolationForestScore === 'number' ? data.isolationForestScore : 0.05,
    anomalyReason: data.anomalyReason,
    lastUpdated: Date.now(),
    isOn: power > 0.5,
    isConnected: true,
  };
}

// Background poller to keep ESP32 state fresh even in Dataset Mode
let pollInterval: ReturnType<typeof setInterval> | null = null;
function startHardwareBackgroundPoller() {
  if (pollInterval || typeof window === 'undefined') return;
  const apiBase = window.location.port === '5173' ? 'http://localhost:8000' : '';

  const poll = async () => {
    try {
      const res = await fetch(`${apiBase}/api/sensor/latest`);
      if (res.ok) {
        const json = await res.json();
        if (json.has_data && json.reading) {
          updateEsp32HardwareReading(json.reading);
        }
      }
    } catch {
      // Backend not yet reachable or silent fallback
    }
  };

  poll();
  pollInterval = setInterval(poll, 2000);
}

export class UKDaleSampleSource implements EnergyDataSource {
  private liveData: EnergyRecord[] = [];
  private historicalData: EnergyRecord[] = [];
  private currentIndex = 0;
  private timer: ReturnType<typeof setInterval> | null = null;
  private _isPlaying = false;
  private dataReady: Promise<void>;

  private onDataCallback: ((record: EnergyRecord) => void) | null = null;
  private readonly SIMULATION_INTERVAL = 2500;

  constructor() {
    this.dataReady = this.loadData();
    startHardwareBackgroundPoller();
  }

  private async loadData(): Promise<void> {
    try {
      const [liveRes, histRes] = await Promise.all([
        fetch('/data/ukdale_live_sample.json'),
        fetch('/data/ukdale_historical_sample.json'),
      ]);
      this.liveData = await liveRes.json();
      this.historicalData = await histRes.json();
    } catch (error) {
      console.error('[UKDaleSampleSource] Failed to load data:', error);
    }
  }

  public async getHistoricalData(): Promise<EnergyRecord[]> {
    await this.dataReady;
    return this.historicalData;
  }

  private getMergedRecord(baseRecord: EnergyRecord): EnergyRecord {
    const record: EnergyRecord = JSON.parse(JSON.stringify(baseRecord));
    const hw = latestEsp32HardwareState;

    // Is the hardware active or recently updated?
    const isRecent = hw.isConnected && (Date.now() - hw.lastUpdated < 60000);
    const bulbWatts = isRecent ? hw.powerWatts : 0.0;
    const bulbIsOn = bulbWatts > 0.5;

    // Create live appliance item representing the physical Halonix LED bulb
    const bulbAppliance = {
      id: 'esp32_live_bulb',
      name: 'Halonix 9W LED Bulb',
      powerWatts: bulbWatts,
      baselinePowerWatts: 9,
      confidence: bulbIsOn ? 0.98 : 0.95,
      isLiveHardware: true,
      source: 'ESP32 Live Hardware',
      isAnomaly: isRecent ? hw.isAnomaly : false,
      isolationForestScore: isRecent ? hw.isolationForestScore : 0.05,
      anomalyReason: isRecent ? hw.anomalyReason : undefined,
      healthStatus: (isRecent && hw.isAnomaly) ? 'critical' as const : 'healthy' as const,
    };

    // Prepend the live bulb appliance so it is prominent alongside UK-DALE appliances
    record.appliances = [bulbAppliance, ...record.appliances];

    // Merge live bulb power into the house's aggregate power
    record.aggregatePowerWatts = Math.round(((record.aggregatePowerWatts ?? 0) + bulbWatts) * 10) / 10;

    // Add hardware electrical context
    if (bulbIsOn) {
      record.voltage = hw.voltage;
      record.current = hw.current;
    }

    return record;
  }

  public getLiveControls(onData: (record: EnergyRecord) => void): DataSourceControls {
    this.onDataCallback = onData;
    const self = this;

    const start = async () => {
      await self.dataReady;
      if (self._isPlaying || self.liveData.length === 0) return;
      self._isPlaying = true;
      self.timer = setInterval(() => {
        if (self.currentIndex < self.liveData.length) {
          const raw = self.liveData[self.currentIndex];
          self.onDataCallback?.(self.getMergedRecord(raw));
          self.currentIndex++;
        } else {
          self.currentIndex = 0;
        }
      }, self.SIMULATION_INTERVAL);
    };

    const pause = () => {
      self._isPlaying = false;
      if (self.timer) {
        clearInterval(self.timer);
        self.timer = null;
      }
    };

    const reset = () => {
      pause();
      self.currentIndex = 0;
      if (self.liveData.length > 0) {
        self.onDataCallback?.(self.getMergedRecord(self.liveData[0]));
      }
    };

    const getNextRecord = async (): Promise<EnergyRecord | null> => {
      await self.dataReady;
      if (self.currentIndex < self.liveData.length) {
        return self.getMergedRecord(self.liveData[self.currentIndex++]);
      }
      return null;
    };

    return {
      start, pause, reset, getNextRecord,
      get isSimulating() { return self._isPlaying; },
    };
  }
}

export class ESP32LiveSource implements EnergyDataSource {
  private eventSource: EventSource | null = null;
  private onDataCallback: ((record: EnergyRecord) => void) | null = null;
  private _isPlaying = false;

  public async getHistoricalData(): Promise<EnergyRecord[]> {
    return []; // No historical data for live ESP32 yet
  }

  public getLiveControls(onData: (record: EnergyRecord) => void): DataSourceControls {
    this.onDataCallback = onData;
    const self = this;

    const start = () => {
      if (self._isPlaying) return;
      self._isPlaying = true;
      const apiBase = (typeof window !== 'undefined' && window.location.port === '5173')
        ? 'http://localhost:8000'
        : '';
      self.eventSource = new EventSource(`${apiBase}/api/stream`);
      
      self.eventSource.onopen = () => {
        // Send a dummy record to establish connected state if needed
        self.onDataCallback?.({
          timestamp: new Date().toISOString(),
          appliances: [],
          connectionState: 'connected'
        });
      };

      self.eventSource.onmessage = (event) => {
        try {
          const record: EnergyRecord = JSON.parse(event.data);
          record.connectionState = 'connected';
          updateEsp32HardwareReading(record);
          self.onDataCallback?.(record);
        } catch (e) {
          console.error('[ESP32LiveSource] Parse error:', e);
        }
      };
      
      self.eventSource.onerror = (e) => {
        console.error('[ESP32LiveSource] SSE error:', e);
        self.onDataCallback?.({
          timestamp: new Date().toISOString(),
          appliances: [],
          connectionState: 'disconnected'
        });
        self.eventSource?.close();
        self._isPlaying = false;
      };
    };

    const pause = () => {
      self._isPlaying = false;
      if (self.eventSource) {
        self.eventSource.close();
        self.eventSource = null;
      }
      self.onDataCallback?.({
        timestamp: new Date().toISOString(),
        appliances: [],
        connectionState: 'disconnected'
      });
    };

    const reset = () => {
      pause();
    };

    const getNextRecord = async (): Promise<EnergyRecord | null> => null;

    return {
      start, pause, reset, getNextRecord,
      get isSimulating() { return self._isPlaying; },
    };
  }
}

class DataSourceManager {
  private ukdale = new UKDaleSampleSource();
  private esp32 = new ESP32LiveSource();
  
  public mode: 'ukdale' | 'esp32' = 'ukdale';
  private currentControls: DataSourceControls | null = null;
  private onDataCallback: ((record: EnergyRecord) => void) | null = null;

  public setMode(newMode: 'ukdale' | 'esp32') {
    if (this.mode === newMode) return;
    
    const wasPlaying = this.currentControls?.isSimulating;
    if (this.currentControls) {
      this.currentControls.pause();
    }
    
    this.mode = newMode;
    
    if (this.onDataCallback) {
      this.currentControls = this.getActiveSource().getLiveControls(this.onDataCallback);
      if (wasPlaying) {
        this.currentControls.start();
      }
    }
  }

  private getActiveSource(): EnergyDataSource {
    return this.mode === 'esp32' ? this.esp32 : this.ukdale;
  }

  public async getHistoricalData(): Promise<EnergyRecord[]> {
    return this.ukdale.getHistoricalData(); // Use UKDale historical for analysis tab
  }

  public getLiveControls(onData: (record: EnergyRecord) => void): DataSourceControls {
    this.onDataCallback = onData;
    this.currentControls = this.getActiveSource().getLiveControls(onData);
    
    const self = this;
    return {
      start: () => self.currentControls?.start(),
      pause: () => self.currentControls?.pause(),
      reset: () => self.currentControls?.reset(),
      getNextRecord: () => self.currentControls?.getNextRecord() ?? Promise.resolve(null),
      get isSimulating() { return self.currentControls?.isSimulating ?? false; },
    };
  }
}

export const dataSource = new DataSourceManager();
