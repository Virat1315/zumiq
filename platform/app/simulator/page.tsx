import { data } from "@/lib/data";
import { Simulator } from "@/components/simulator";
import { PageTitle } from "@/components/ui";

export const metadata = {
  title: "Scenario Simulator | ZUMIQ",
};

export default async function SimulatorPage() {
  const model = await data.getImpactModel();

  return (
    <>
      <PageTitle
        title="Scenario Simulator"
        sub="Ask what an operating change is worth before committing to it. Move a driver away from its measured baseline and the platform reports the annualised revenue, cost, operational and customer effect, with every assumption on screen."
      />
      <Simulator model={model} />
    </>
  );
}
