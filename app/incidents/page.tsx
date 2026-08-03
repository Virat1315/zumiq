import { data } from "@/lib/data";
import { IncidentList } from "@/components/incident-list";
import { PageTitle, Stat } from "@/components/ui";
import { moneyCompact } from "@/lib/format";
import type { Severity } from "@/lib/data/types";

export const metadata = {
  title: "Incident Center | ZUMIQ",
};

export default async function IncidentsPage({
  searchParams,
}: {
  searchParams: Promise<{ severity?: string }>;
}) {
  const [incidents, { severity }] = await Promise.all([
    data.listIncidents(),
    searchParams,
  ]);

  // The home page links here with ?severity=P1 for triage.
  const initialSeverity: Severity | "All" =
    severity === "P1" || severity === "P2" || severity === "P3" ? severity : "All";

  const open = incidents.filter((i) => i.status !== "Resolved");
  const p1 = incidents.filter((i) => i.severity === "P1");
  const exposure = open.reduce((a, i) => a + (i.businessImpactUsd ?? 0), 0);

  // Detection coverage is the metric that says whether the platform is doing
  // its job: an incident a human noticed first is one the rules missed.
  const machineDetected = incidents.filter((i) => !i.detectedBy.startsWith("Human")).length;
  const coverage = (machineDetected / incidents.length) * 100;

  return (
    <>
      <PageTitle
        title="Incident Center"
        sub="Every data incident with an owner, an audit trail, a root cause and the KPIs it moved. Incidents are raised by detection rules where possible, and by people where the rules did not catch it."
      />

      <div className="mb-6 grid grid-cols-2 gap-3.5 lg:grid-cols-4">
        <Stat label="Total Incidents" value={String(incidents.length)} delta="all time" tone="flat" />
        <Stat label="Currently Open" value={String(open.length)} delta={`${open.filter((i) => i.severity === "P1").length} at P1`} tone={open.length > 0 ? "bad" : "good"} />
        <Stat label="P1 Rate" value={`${Math.round((p1.length / incidents.length) * 100)}%`} delta={`${p1.length} of ${incidents.length} incidents`} tone="flat" />
        <Stat label="Detection Coverage" value={`${Math.round(coverage)}%`} delta="raised by a rule, not a person" tone={coverage >= 70 ? "good" : "bad"} />
      </div>

      {exposure > 0 && (
        <p className="mb-5 rounded-xl border border-[rgba(248,113,113,0.34)] border-l-[3px] border-l-[var(--color-bad)] bg-[rgba(248,113,113,0.1)] px-4 py-3 text-[12.5px] text-[#fca5a5]">
          <b>{moneyCompact(exposure)}</b> of quantified financial exposure is still unresolved across {open.length} open
          incidents. Unquantified incidents are excluded rather than estimated.
        </p>
      )}

      <IncidentList incidents={incidents} initialSeverity={initialSeverity} />
    </>
  );
}
