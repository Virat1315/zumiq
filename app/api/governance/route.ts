import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { POLICIES, RETENTION, CLASSIFICATIONS, PII_TAGS, GLOSSARY, getAuditLog } from "@/lib/data/enterprise";

export async function GET() {
  return NextResponse.json({
    policies: POLICIES,
    retention: RETENTION,
    classifications: CLASSIFICATIONS,
    piiTags: PII_TAGS,
    glossary: GLOSSARY,
    audit: getAuditLog(),
  });
}
