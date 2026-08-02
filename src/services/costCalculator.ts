import { EnergyRecord } from '../types/energy';

export class CostCalculator {
  // Configured Electricity Tariff: ₹8.50 per kWh
  private readonly TARIFF_PER_KWH = 8.50;

  /**
   * Calculates the estimated cost for a given energy usage in kWh.
   */
  public calculateCost(energyKwh: number): number {
    return energyKwh * this.TARIFF_PER_KWH;
  }

  /**
   * Extrapolates current power (Watts) to an estimated monthly cost
   * assuming it runs 24/7 (useful for always-on appliances like Fridge).
   */
  public extrapolateMonthlyCostFromWatts(watts: number): number {
    const kw = watts / 1000;
    const kwhPerMonth = kw * 24 * 30;
    return this.calculateCost(kwhPerMonth);
  }

  /**
   * Processes historical data to calculate total monthly cost and per-appliance cost.
   */
  public analyzeHistoricalCosts(historicalData: EnergyRecord[]) {
    let totalEnergyKwh = 0;
    const applianceCosts: Record<string, {name: string, kwh: number, cost: number}> = {};

    historicalData.forEach(record => {
      totalEnergyKwh += (record.aggregateEnergyKwh || 0);

      record.appliances.forEach(app => {
        if (!applianceCosts[app.id]) {
          applianceCosts[app.id] = { name: app.name, kwh: 0, cost: 0 };
        }
        if (app.energyKwh) {
          applianceCosts[app.id].kwh += app.energyKwh;
        }
      });
    });

    // Calculate Costs
    const totalCost = this.calculateCost(totalEnergyKwh);
    
    for (const key in applianceCosts) {
      applianceCosts[key].cost = this.calculateCost(applianceCosts[key].kwh);
    }

    return {
      totalEnergyKwh,
      totalCost,
      applianceCosts
    };
  }
}

export const costCalculator = new CostCalculator();
