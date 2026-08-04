// Scenario Simulator - a sensitivity model over certified KPIs.
// Inputs are slider deltas (0-100); outputs are estimated business impacts.

export interface SimInputs {
  approvalRate: number; // % 90-99
  processingTime: number; // minutes 0-45 (lower is better)
  repeatCalls: number; // % of cases 2-20 (lower is better)
  customerSatisfaction: number; // CSAT 3.0-5.0
  transactionVolume: number; // daily txns delta -20..+20 %
}

export interface SimImpact {
  revenueImpact: number; // $ / month
  operationalImpact: string;
  costImpact: number; // $ / month
  customerImpact: string;
  slaProjection: number; // %
  churnProjection: number; // %
  utilization: number; // %
}

const BASELINE = {
  monthlyGmv: 2790000,
  monthlyCases: 4560,
  avgCaseCost: 9.5,
  avgCustomerValue: 210,
  baseSla: 94.8,
  baseCsat: 4.12,
  repeatCalls: 11,
};

export function runSimulation(inputs: SimInputs): SimImpact {
  // Revenue impact from volume + satisfaction (retention)
  const volumeRevenue = BASELINE.monthlyGmv * (inputs.transactionVolume / 100);
  const churnReduction = Math.max(0, (inputs.customerSatisfaction - 4.0) * 0.9) + Math.max(0, (11 - inputs.repeatCalls)) * 0.12;
  const retentionRevenue = BASELINE.monthlyGmv * (churnReduction / 100);

  // Operational cost from repeat calls + processing time
  const repeatDelta = Math.max(0, 11 - inputs.repeatCalls);
  const opsSaving = repeatDelta * 0.045 * BASELINE.monthlyCases * BASELINE.avgCaseCost;
  const timeSaving = Math.max(0, 24 - inputs.processingTime) * 0.6 * BASELINE.monthlyCases * BASELINE.avgCaseCost * 0.05;

  // SLA projection from approval rate + processing time
  const slaBoost = (inputs.approvalRate - 92) * 0.55 + Math.max(0, 24 - inputs.processingTime) * 0.08;
  const slaProjection = Math.min(99, BASELINE.baseSla + slaBoost);

  const revenueImpact = Math.round(volumeRevenue + retentionRevenue);
  const costImpact = Math.round(-(opsSaving + timeSaving) * 0.5);

  const churnProjection = Math.max(0.5, 3.1 - churnReduction);
  const utilization = Math.min(98, Math.round(100 * (0.72 + inputs.approvalRate / 300 + inputs.transactionVolume / 400)));

  return {
    revenueImpact,
    operationalImpact: `${Math.round(repeatDelta * 4.5)}% fewer repeat cases, avg case handle time ${Math.max(4, Math.round(inputs.processingTime))} min`,
    costImpact,
    customerImpact: `CSAT ${inputs.customerSatisfaction.toFixed(1)} → projected NPS +${Math.round((inputs.customerSatisfaction - 3.8) * 18)} pts`,
    slaProjection,
    churnProjection,
    utilization,
  };
}

export function defaultInputs(): SimInputs {
  return { approvalRate: 94, processingTime: 24, repeatCalls: 11, customerSatisfaction: 4.1, transactionVolume: 4 };
}
