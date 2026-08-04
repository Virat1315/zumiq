import { requireAccess } from "@/lib/auth";
import { GovernanceCenter } from "@/components/governance-center";
import { PageHeader } from "@/components/page-header";

export default async function GovernancePage() {
  const user = await requireAccess("governance");
  return (
    <div>
      <PageHeader
        title="Governance Center"
        description="Policies, retention, classification, the certified metric glossary, and a full audit trail of platform actions."
      />
      <GovernanceCenter />
    </div>
  );
}
