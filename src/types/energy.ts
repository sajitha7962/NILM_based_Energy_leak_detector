export interface ApplianceData {
  id: string;
  name: string;
  powerWatts?: number;
  energyKwh?: number;
  baselinePowerWatts?: number;
  anomalyScore?: number;
  isolationForestScore?: number;
  isAnomaly?: boolean;
  anomalyReason?: string;
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
  isolationForestScore?: number;
  isAnomaly?: boolean;
  anomalyReason?: string;
  appliances: ApplianceData[];
  voltage?: number;
  current?: number;
  power?: number;
  energy?: number;
  connectionState?: 'connected' | 'disconnected' | 'warming_up';
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
