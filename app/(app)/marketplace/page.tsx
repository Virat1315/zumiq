import { requireAccess } from "@/lib/auth";
import { PRODUCTS } from "@/lib/data/enterprise";
import { MarketplaceGrid } from "@/components/marketplace-grid";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";

export default async function MarketplacePage() {
  const user = await requireAccess("marketplace");
  const certified = PRODUCTS.filter((p) => p.certified).length;
  return (
    <div className="space-y-6">
      <PageHeader
        title="Marketplace"
        description="Discover and request certified data products owned by domain teams. Access is gated and audited."
      />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { label: "Data products", value: PRODUCTS.length, tone: "text-foreground" },
          { label: "Certified", value: certified, tone: "text-success" },
          { label: "Open access", value: PRODUCTS.filter((p) => p.access === "OPEN").length, tone: "text-primary" },
          { label: "Require approval", value: PRODUCTS.filter((p) => p.access !== "OPEN").length, tone: "text-warning" },
        ].map((s) => (
          <Card key={s.label} className="p-4">
            <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{s.label}</div>
            <div className={`mt-1 text-2xl font-semibold tabular ${s.tone}`}>{s.value}</div>
          </Card>
        ))}
      </div>
      <MarketplaceGrid />
    </div>
  );
}
