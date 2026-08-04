import { requireAccess } from "@/lib/auth";
import { INCIDENTS } from "@/lib/data/enterprise";
import { IncidentList } from "@/components/incident-list";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";

export default async function IncidentsPage() {
  const user = await requireAccess("incidents");
  const open = INCIDENTS.filter((i) => i.status === "OPEN" || i.status === "INVESTIGATING").length;
  const p1 = INCIDENTS.filter((i) => i.severity === "P1").length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Incident Center"
        description="Auto-detected anomalies, SLAs, root causes and resolution timelines across the platform."
      />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { label: "Total incidents", value: INCIDENTS.length, tone: "text-foreground" },
          { label: "Open / investigating", value: open, tone: open ? "text-destructive" : "text-success" },
          { label: "P1 severity", value: p1, tone: p1 ? "text-destructive" : "text-foreground" },
          { label: "SLA met", value: `${Math.round((INCIDENTS.filter((i) => i.slaMet).length / INCIDENTS.length) * 100)}%`, tone: "text-success" },
        ].map((s) => (
          <Card key={s.label} className="p-4">
            <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{s.label}</div>
            <div className={`mt-1 text-2xl font-semibold tabular ${s.tone}`}>{s.value}</div>
          </Card>
        ))}
      </div>
      <IncidentList initial={INCIDENTS} />
    </div>
  );
}
