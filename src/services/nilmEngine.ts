import { EnergyRecord, ApplianceData } from '../types/energy';

const CONFIDENCE_THRESHOLD = 0.65;
const WINDOW_SIZE = 5; // Simulating a sliding window of 5 records

export class CnnNilmEngine {
  private windowBuffer: EnergyRecord[] = [];

  public processRecord(rawRecord: EnergyRecord): EnergyRecord {
    // 1. Sliding Window Generation
    this.windowBuffer.push(rawRecord);
    if (this.windowBuffer.length > WINDOW_SIZE) {
      this.windowBuffer.shift(); // keep size
    }

    // 3. 1D CNN Classification & Temporal Smoothing (Simulated using ground truth with variance)
    const processedRecord: EnergyRecord = JSON.parse(JSON.stringify(rawRecord));
    
    processedRecord.appliances = processedRecord.appliances.map((app: ApplianceData) => {
      const isRunning = (app.powerWatts || 0) > 0;
      
      // Simulate CNN Confidence based on signal complexity
      let cnnConfidence = 0;
      if (isRunning) {
        // Realistic confidence between 0.55 and 0.98
        cnnConfidence = 0.55 + (Math.random() * 0.43); 
        
        // 4. Temporal Smoothing (If window has consistent running state, boost confidence)
        const runCount = this.windowBuffer.filter(r => 
          r.appliances.find(a => a.id === app.id && (a.powerWatts || 0) > 0)
        ).length;
        
        if (runCount === WINDOW_SIZE) cnnConfidence += 0.1; 
      } else {
        cnnConfidence = 0.95 + (Math.random() * 0.04);
      }

      cnnConfidence = Math.min(cnnConfidence, 0.99); // Cap at 0.99

      // 5. Confidence Threshold (Rule Engine)
      const finalApp: ApplianceData = {
        ...app,
        confidence: cnnConfidence
      };

      if (isRunning && cnnConfidence < CONFIDENCE_THRESHOLD) {
        finalApp.name = 'Unknown Appliance';
      }

      return finalApp;
    });

    return processedRecord;
  }
}

export const nilmEngine = new CnnNilmEngine();
