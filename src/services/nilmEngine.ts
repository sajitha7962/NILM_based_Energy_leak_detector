import { EnergyRecord } from '../types/energy';

/**
 * Ground-Truth NILM Replay Engine
 * 
 * In Phase 1, we are validating the complete EnergyGuard product pipeline 
 * using real UK-DALE ground-truth data. This engine simply passes through 
 * the known appliance data from the dataset.
 * 
 * The next phase (Phase 2) will replace this ground-truth replay engine 
 * with a trained NILM model that predicts appliances from the aggregate signal.
 */
export class GroundTruthNilmReplayEngine {
  
  /**
   * Processes an incoming raw energy record.
   * Currently, it returns the ground-truth appliance data exactly as it is in the dataset.
   * It also calculates a mock "confidence" score to simulate AI output.
   */
  public processRecord(rawRecord: EnergyRecord): EnergyRecord {
    // Clone to avoid mutating original source data
    const processedRecord: EnergyRecord = JSON.parse(JSON.stringify(rawRecord));
    
    // Simulate AI model processing time and assign confidence scores
    processedRecord.appliances = processedRecord.appliances.map(app => {
      // If the appliance is drawing power, the "model" is highly confident
      // If it's 0, it's very confident it's off.
      const isRunning = (app.powerWatts || 0) > 0;
      
      return {
        ...app,
        confidence: isRunning ? 0.85 + (Math.random() * 0.14) : 0.99
      };
    });

    return processedRecord;
  }
}

export const nilmEngine = new GroundTruthNilmReplayEngine();
