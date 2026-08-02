import { EnergyRecord } from '../types/energy';
import { costCalculator } from './costCalculator';

export interface Insight {
  id: string;
  message: string;
  type: 'info' | 'saving' | 'warning';
}

export class InsightGenerator {
  
  public generateInsights(liveRecord: EnergyRecord, historicalData: EnergyRecord[]): Insight[] {
    const insights: Insight[] = [];
    
    // Insight 1: Active large loads
    const highConsumers = liveRecord.appliances.filter(app => (app.powerWatts || 0) > 1000);
    if (highConsumers.length > 0) {
      insights.push({
        id: 'high-load',
        type: 'info',
        message: `${highConsumers.length} high-power device(s) currently active (e.g., ${highConsumers[0].name}).`
      });
    }

    // Insight 2: Standby loads
    const standbyCount = liveRecord.appliances.filter(app => (app.powerWatts || 0) > 0 && (app.powerWatts || 0) < 15).length;
    if (standbyCount > 0) {
      insights.push({
        id: 'standby-load',
        type: 'saving',
        message: `${standbyCount} device(s) are drawing standby power. Unplugging them could save money.`
      });
    }

    // Insight 3: Historical dominant appliance
    if (historicalData.length > 0) {
       const analysis = costCalculator.analyzeHistoricalCosts(historicalData);
       let topApp = { name: 'None', kwh: 0 };
       
       for (const key in analysis.applianceCosts) {
         if (analysis.applianceCosts[key].kwh > topApp.kwh) {
           topApp = analysis.applianceCosts[key];
         }
       }

       if (topApp.kwh > 0 && analysis.totalEnergyKwh > 0) {
         const percentage = Math.round((topApp.kwh / analysis.totalEnergyKwh) * 100);
         insights.push({
           id: 'historical-top',
           type: 'info',
           message: `Your ${topApp.name} consumed ${percentage}% of this month's electricity.`
         });
       }
    }

    return insights;
  }
}

export const insightGenerator = new InsightGenerator();
