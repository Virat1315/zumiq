# ZUMIQ - Metadata Catalog & Data Product Registry

> What the platform knows about itself. Every table, every column, every
> owner, every SLA, every dependency. This is what turns "some tables in
> BigQuery" into a governed data platform.

## 1. What We Track (and why)

| Metadata | Table | Why it matters |
|---|---|---|
| Table catalog | `metadata.table_catalog` | Ownership, SLAs, classification, certification |
| Column catalog | `metadata.column_catalog` | Sensitivity (PII/PCI/PHI), descriptions, DQ coverage |
| Lineage | `metadata.lineage_edges` | Impact analysis, restatement safety |
| Glossary | `metadata.business_glossary` | One definition per metric (kills KPI disputes) |
| Refresh schedule | `table_catalog.refresh_schedule` | Freshness SLAs & alerting |
| Version history | `table_catalog.version` | Change tracking on certified products |

## 2. Data Product Definition (the product contract)

A **data product** is a certified, owned, documented dataset with a service
level. It is described by:

```
Data Product   = { core tables
                 , owner team + data owner + steward
                 , refresh schedule (cron)
                 , SLA (max data age in hours)
                 , DQ floor (minimum score)
                 , classification (INTERNAL/CONFIDENTIAL/RESTRICTED)
                 , criticality (T1/T2/T3)
                 , glossary binding (metric definitions it implements)
                 , version + changelog
                 , consumers (known teams) }

Example - "Enterprise P&L":
  owner: Finance Data · SLA 7:30 ET · DQ floor 95
  tables: fct_transactions, dim_product, dim_business_unit, dim_region
  glossary: GMV, Net Revenue, Gross Margin, Net Margin Rate
  classification: CONFIDENTIAL · criticality: T1
```

## 3. How Metadata Stays Current (automation, not manual)

1. **Metadata agent** scans `INFORMATION_SCHEMA` nightly (tables, columns, types).
2. **Diff** detects new/unregistered tables → raises `SCHEMA` alert.
3. **Enrichment** overlays human-authored ownership/SLA/classification.
4. **Sensitivity auto-classification** via regex + glossary (PII/PCI/PHI).
5. **Lineage parser** extracts column edges from view DDL and pipelines.

## 4. Classification & Sensitivity Framework

| Class | Meaning | Access | Examples |
|---|---|---|---|
| PUBLIC | Open to all employees | Any authenticated user | dim_date, region |
| INTERNAL | Standard internal data | All BU teams on request | most fact tables |
| CONFIDENTIAL | Executive/business sensitive | Need-to-know + approval | P&L, GMV by BU, compensation |
| RESTRICTED | Regulated/PII | Minimal + audit + DLP | email, phone, PAN, account number |

**PII/PCI/PHI flags** are auto-detected and can be overridden by stewards.
RESTRICTED data is masked at the semantic layer and excluded from extracts.

## 5. Glossary Governance - the anti-KPI-war mechanism

Every metric used in an executive dashboard must be a **CERTIFIED** glossary
term with an explicit formula. Process:

1. Request a new term (anyone) → `status = DRAFT`.
2. Owner team writes the definition + canonical SQL.
3. Analytics Engineering + Finance review → `CERTIFIED`.
4. Dashboards must reference the certified formula (semantic layer view).
5. Change → new version; dashboards updated; deprecation notices sent.

### Sample Glossary Entries

| Term | Definition | Formula (canonical) | Owner |
|---|---|---|---|
| GMV | Gross merchandise value of posted, non-reversed transactions | `SUM(amount_usd) WHERE status='POSTED' AND is_reversal=FALSE` | Finance |
| Net Revenue | GMV minus refunds and chargebacks | `GMV − refunds − chargebacks` | Finance |
| Active Customer | Customer with ≥1 posted transaction in the window | `COUNT(DISTINCT customer_key)` | Growth |
| SLA Attainment | % cases resolved by SLA due time | `100 × resolved≤due / total` | CX Ops |
| Data Freshness | Age of newest partition vs SLA | `hours since last successful load` | Platform |
| Enterprise DQ Score | Rows-weighted DQ score across certified tables | see DQ engine | Data Quality |

## 6. Versioning & Change Management

- Certified products are versioned (`v1.0.0`, `v1.1.0`, `v2.0.0`).
- Breaking changes require a deprecation notice ≥ 2 sprints before migration.
- `metadata.table_catalog.version` + glossary `effective_from/to` support
  "as-of" reporting - a dashboard is always bound to a versioned definition.
- Schema drift on a T1 table pages the owning team (alert severity HIGH).

## 7. Lineage: Impact Analysis in Practice

When a source field changes (e.g., OMS stops sending `discount_pct`):

1. Query `metadata.lineage_edges` for `source = oms_orders` columns.
2. Walk downstream edges to find `fct_transactions` → semantic views → dashboards.
3. The platform team knows exactly which dashboards break before it happens.
4. Because lineage is column-level, the blast radius is precise.

```sql
-- "Who is affected if oms_orders.amount changes?"
WITH RECURSIVE down AS (
  SELECT source_table, source_column, target_table, target_column, 0 AS depth
  FROM `zumiq-prod.metadata.lineage_edges`
  WHERE source_table = 'zumiq-prod.raw_layer.oms_orders_raw'
    AND source_column = 'amount'
  UNION ALL
  SELECT e.source_table, e.source_column, e.target_table, e.target_column, down.depth + 1
  FROM down
  JOIN `zumiq-prod.metadata.lineage_edges` e
    ON e.source_table = down.target_table AND e.source_column = down.target_column
)
SELECT * FROM down;
```
