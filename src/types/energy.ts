export interface ApplianceData {
  id: string;
  name: string;
  powerWatts?: number;
  energyKwh?: number;
  baselinePowerWatts?: number;
  anomalyScore?: number;
  anomalyType?: string;
  healthStatus?: 'healthy' | 'warning' | 'critical';
  confidence?: number;
  estimatedCost?: number;
}

export interface EnergyRecord {
  timestamp: string;
  dataSource?: string;
  aggregatePowerWatts?: number;
  aggregateEnergyKwh?: number;
  appliances: ApplianceData[];
  voltage?: number;
  currentAmps?: number;
  powerFactor?: number;
}

export interface DataSourceControls {
  start: () => void;
  pause: () => void;
  reset: () => void;
  getNextRecord: () => Promise<EnergyRecord | null>;
  isSimulating: boolean;
}

export interface EnergyDataSource {
  getLiveControls: (onData: (record: EnergyRecord) => void) => DataSourceControls;
  getHistoricalData: () => Promise<EnergyRecord[]>;
}
