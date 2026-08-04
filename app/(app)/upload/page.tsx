import { requireAccess } from "@/lib/auth";
import { CsvUpload } from "@/components/csv-upload";
import { PageHeader } from "@/components/page-header";

export default async function UploadPage() {
  const user = await requireAccess("upload");
  return (
    <div>
      <PageHeader
        title="CSV Upload"
        description="Validate spreadsheets against registered schemas and business rules before they reach the warehouse. Loads are gated by the DQ engine."
      />
      <CsvUpload />
    </div>
  );
}
