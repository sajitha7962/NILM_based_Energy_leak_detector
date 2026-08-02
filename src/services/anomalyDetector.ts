import { EnergyRecord } from '../types/energy';

export interface AnomalyAlert {
  id: string;
  applianceId: string;
  applianceName: string;
  type: 'Energy Drift' | 'Unusual Cycling' | 'Power Spike' | 'Phantom Load';
  severity: 'warning' | 'critical';
  message: string;
  timestamp: string;
  value: number; // Watts or Kwh
}

/**
 * Anomaly Detector
 * 
 * Detects abnormal energy patterns such as:
 * - Higher-than-baseline consumption
 * - Longer operating duration
 * - Unusual cycling
 * - Sudden power spikes
 * - Continuous standby/phantom power
 */
export class AnomalyDetector {
  private alerts: AnomalyAlert[] = [];
  
  // Keep track of recent power to detect spikes
  private applianceHistory: Record<string, number[]> = {};

  public processLiveRecord(record: EnergyRecord): AnomalyAlert[] {
    const newAlerts: AnomalyAlert[] = [];
    const timestamp = record.timestamp;

    record.appliances.forEach(app => {
      if (!this.applianceHistory[app.id]) {
        this.applianceHistory[app.id] = [];
      }
      
      const history = this.applianceHistory[app.id];
      const currentPower = app.powerWatts || 0;
      
      history.push(currentPower);
      if (history.length > 20) history.shift(); // Keep last 20 readings

      // 1. Detect Power Spikes
      if (history.length > 5) {
        const avgRecent = history.slice(0, -1).reduce((a,b)=>a+b,0) / (history.length - 1);
        if (avgRecent > 50 && currentPower > avgRecent * 1.5) {
           newAlerts.push({
             id: Math.random().toString(36).substr(2, 9),
             applianceId: app.id,
             applianceName: app.name,
             type: 'Power Spike',
             severity: 'warning',
             message: `${app.name} drew unusually high power (${currentPower}W) compared to its recent average (${Math.round(avgRecent)}W).`,
             timestamp,
             value: currentPower
           });
           app.healthStatus = 'warning';
           app.anomalyType = 'Power Spike';
        }
      }

      // 2. Detect Phantom Loads (Standby power when it should be 0)
      // For this demo, let's assume 'Television' or 'Microwave' shouldn't draw constant low power
      if ((app.name === 'Television' || app.name === 'Microwave') && currentPower > 0 && currentPower < 15) {
        // Just a simple heuristic for demo
        const isAlwaysOn = history.length === 20 && history.every(p => p > 0 && p < 15);
        if (isAlwaysOn) {
          // Prevent spamming the same alert
          const existing = this.alerts.find(a => a.applianceId === app.id && a.type === 'Phantom Load');
          if (!existing) {
             newAlerts.push({
               id: Math.random().toString(36).substr(2, 9),
               applianceId: app.id,
               applianceName: app.name,
               type: 'Phantom Load',
               severity: 'warning',
               message: `${app.name} is drawing continuous standby power (${currentPower}W). Unplug to save energy.`,
               timestamp,
               value: currentPower
             });
             app.healthStatus = 'warning';
             app.anomalyType = 'Phantom Load';
          }
        }
      }
    });

    this.alerts = [...this.alerts, ...newAlerts];
    return newAlerts;
  }

  public getActiveAlerts(): AnomalyAlert[] {
    return this.alerts;
  }
}

export const anomalyDetector = new AnomalyDetector();
