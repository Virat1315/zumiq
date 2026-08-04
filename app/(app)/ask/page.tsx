import { requireAccess } from "@/lib/auth";
import { ExecutiveAsk } from "@/components/executive-ask";
import { PageHeader } from "@/components/page-header";

export default async function AskPage() {
  const user = await requireAccess("ask");
  return (
    <div>
      <PageHeader
        title="Executive Ask"
        description="Get a live, cited answer to any business question - KPI values, root causes and recommended actions in one shot."
      />
      <ExecutiveAsk />
    </div>
  );
}
