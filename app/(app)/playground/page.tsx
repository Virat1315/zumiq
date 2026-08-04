import { requireAccess } from "@/lib/auth";
import { QueryPlayground } from "@/components/query-playground";
import { PageHeader } from "@/components/page-header";

export default async function PlaygroundPage() {
  const user = await requireAccess("playground");
  return (
    <div>
      <PageHeader
        title="Query Playground"
        description="Write governed SQL against the demo warehouse. Metered scans, generated SQL from specs, and CSV export."
      />
      <QueryPlayground />
    </div>
  );
}
