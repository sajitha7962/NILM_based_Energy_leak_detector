import { EnergyDataSource, EnergyRecord, DataSourceControls } from '../types/energy';

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

  public getLiveControls(onData: (record: EnergyRecord) => void): DataSourceControls {
    this.onDataCallback = onData;
    const self = this;

    const start = async () => {
      await self.dataReady;
      if (self._isPlaying || self.liveData.length === 0) return;
      self._isPlaying = true;
      self.timer = setInterval(() => {
        if (self.currentIndex < self.liveData.length) {
          self.onDataCallback?.(self.liveData[self.currentIndex]);
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
        self.onDataCallback?.(self.liveData[0]);
      }
    };

    const getNextRecord = async (): Promise<EnergyRecord | null> => {
      await self.dataReady;
      if (self.currentIndex < self.liveData.length) {
        return self.liveData[self.currentIndex++];
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
      self.eventSource = new EventSource('http://localhost:8000/api/stream');
      
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
