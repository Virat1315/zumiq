import { requireAccess } from "@/lib/auth";
import { CatalogExplorer } from "@/components/catalog-explorer";
import { PageHeader } from "@/components/page-header";

export default async function CatalogPage() {
  const user = await requireAccess("catalog");
  return (
    <div>
      <PageHeader
        title="Metadata Explorer"
        description="Browse the enterprise data catalog - every table, column, classification and PII tag, with lineage and certified coverage."
      />
      <CatalogExplorer />
    </div>
  );
}
