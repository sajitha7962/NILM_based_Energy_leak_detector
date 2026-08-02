import { EnergyDataSource, EnergyRecord, DataSourceControls } from '../types/energy';

/**
 * UKDaleSampleSource — Phase 1 Data Source
 *
 * Loads pre-processed UK-DALE JSON from /public/data/ and replays it
 * chronologically to simulate a real-time energy monitoring stream.
 *
 * This class is a singleton. It holds a single timer / index so that
 * both Layout (play/pause buttons) and App (data callback) share the
 * same playback state.
 */
export class UKDaleSampleSource implements EnergyDataSource {
  private liveData: EnergyRecord[] = [];
  private historicalData: EnergyRecord[] = [];
  private currentIndex = 0;
  private timer: ReturnType<typeof setInterval> | null = null;
  private _isPlaying = false;
  private dataReady: Promise<void>;

  // The single registered callback for live data
  private onDataCallback: ((record: EnergyRecord) => void) | null = null;

  // Interval between emitting simulated records (ms)
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
      console.log(
        `[EnergyDataSource] Loaded ${this.liveData.length} live records, ` +
        `${this.historicalData.length} historical records`
      );
    } catch (error) {
      console.error('[EnergyDataSource] Failed to load UK-DALE data:', error);
    }
  }

  // ------ Historical API ------

  public async getHistoricalData(): Promise<EnergyRecord[]> {
    await this.dataReady;
    return this.historicalData;
  }

  // ------ Live Playback API ------

  /**
   * Register the live-data callback and return playback controls.
   *
   * Because this is a singleton, calling getLiveControls a second time
   * simply *replaces* the callback — it does NOT create a second timer.
   * This means Layout.tsx and App.tsx can both call this safely.
   */
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
          self.currentIndex = 0; // loop for continuous demo
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
      start,
      pause,
      reset,
      getNextRecord,
      get isSimulating() {
        return self._isPlaying;
      },
    };
  }
}

// Export a singleton — shared across the entire app
export const dataSource = new UKDaleSampleSource();
