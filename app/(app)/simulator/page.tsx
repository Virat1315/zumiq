import { requireAccess } from "@/lib/auth";
import { ScenarioSimulator } from "@/components/scenario-simulator";
import { PageHeader } from "@/components/page-header";

export default async function SimulatorPage() {
  const user = await requireAccess("simulator");
  return (
    <div>
      <PageHeader
        title="Scenario Simulator"
        description="What-if modeling on operating levers - project revenue, cost, SLA, churn and utilization before you commit."
      />
      <ScenarioSimulator />
    </div>
  );
}
