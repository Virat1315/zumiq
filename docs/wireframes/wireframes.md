# ZUMIQ - Wireframes

> ASCII wireframes for the platform's key surfaces. These are product-design
> artifacts: they show layout, hierarchy, and the decision each screen enables.

## 1. Executive Overview (Tableau / morning brief)

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│ ZUMIQ  Executive Overview                    [BU: All ▾] [Region: All ▾] [▸ Share]│
├─────────────────────────────────────────────────────────────────────────────────┤
│  GMV (today)     Net Revenue    Gross Margin    Active Cust    DQ Score         │
│  $11.6M  ▼18%    $10.1M        31.2%           1.24M          98.2  ✓          │
│  [vs 28d avg]    [vs prev]     [vs plan]       [vs prev]      [floor 95]        │
├───────────────────────────────┬─────────────────────────────────────────────────┤
│ GMV trend                     │ Freshness & Cost rail                          │
│  ╭──╮     ╭──╮   ╭──╮        │ ┌─────────────────────────────────────────────┐ │
│ ╭╯  ╰──╮  ╰─╮ ╰─╮ ╰╮        │ │ T1 tables fresh by 07:30 ET   [✓ 100%]      │ │
│ ████████████████████ █ 28d-avg│ │ Last load: 07:15  (16 min ago)              │ │
│ ██ bu A ██ bu B ██ bu C       │ │ Cost today: $12.3k   Budget: $18k  [✓]      │ │
│ (click bu → P&L drill)        │ │ Alerts open: 3 [HIGH:1]   MTTR: 2.1h        │ │
└───────────────────────────────┴─────────────────────────────────────────────┘
```

## 2. Business Unit P&L (drill-down)

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│ ZUMIQ  P&L - Retail (RTL)              [Region ▾] [Channel ▾] [MoM ▾]           │
├─────────────────────────────────────────────────────────────────────────────────┤
│ Net Revenue      Gross Margin      Refund Rate    Chargebacks    AOV            │
│ $41.2M  ▲6%      $12.9M  31.2%     2.1%           0.4%           $94.10         │
├─────────────────────────────────────────────────────────────────────────────────┤
│ Margin by category                      │ Net Revenue vs plan                   │
│ Electronics ████████░░ 42%              │  ┌─────────────┐                      │
│ Apparel     ██████░░░░ 28%              │  │ ██ plan     │                      │
│ Home        ████░░░░░░ 18%              │  │ ██ actual   │  (variance flagged)  │
└─────────────────────────────────────────┴─────────────────────────────────────┘
```

## 3. Data Quality Portal (governance)

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│ ZUMIQ  Data Quality                 Enterprise DQ Score: 98.2  [Floor 95 ✓]     │
├─────────────────────────────────────┬───────────────────────────────────────────┤
│ By dimension                        │ By data product                          │
│ COMPLETENESS   ██████████ 99.4      │ Enterprise P&L      98.9  [✓]            │
│ UNIQUENESS     ██████████ 100.0     │ Customer 360        97.4  [✓]            │
│ VALIDITY       █████████░ 98.7      │ Operations Health   99.1  [✓]            │
│ TIMELINESS     █████████░ 98.2      │ Support SLA         98.0  [✓]            │
│ INTEGRITY      ██████████ 100.0     │ Platform Health     99.6  [✓]            │
│ FRESHNESS      █████████░ 97.8      │ (row = drill to rules & RCA)             │
├─────────────────────────────────────┴───────────────────────────────────────────┤
│ Open failures today: 4   [Q: show failure samples]   [Q: show recommendations] │
└─────────────────────────────────────────────────────────────────────────────────┘
```

## 4. Data Product Catalog (self-serve, analyst view)

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│ ZUMIQ  Catalog          [Search: "revenue"]          [Certified only ▾]        │
├─────────────────────────────────────────────────────────────────────────────────┤
│ ◉ Enterprise P&L        owner: Finance Data · SLA 07:30 ET · DQ 98.9 [CERTIFIED]│
│   ▶ tables · ▶ glossary · ▶ lineage · ▶ example SQL · [Request access]         │
│ ◉ Customer 360          owner: CX Analytics · SLA 08:00 ET · DQ 97.4 [CERTIFIED]│
│   ▶ tables · ▶ glossary · ▶ lineage · ▶ example SQL · [Request access]         │
│ ○ v_customer_segment_old (unowned · stale · quarantined)                       │
└─────────────────────────────────────────────────────────────────────────────────┘
```

## 5. Incident / Alert Console (platform on-call)

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│ ZUMIQ  Alerts                              Open: 3  [Ack SLA 30 min]            │
├─────────────────────────────────────────────────────────────────────────────────┤
│ [HIGH] DQ score drop - Customer 360    21 min ago   [View RCA] [Ack] [Link lin.]│
│        message: DQ 89.4 < 95 · dimension: COMPLETENESS · 12k rows null email    │
│ [HIGH] Freshness breach - fct_transactions 2h ago   [Runbook] [Ack]            │
│ [MED]  Cost spike - analyst@… 3h ago                [Top queries] [Ack]        │
│ ─────────────────────────────────────────────────────────────────────────────── │
│ Related: pipeline run r-8821 FAILED · target core_layer.fct_transactions       │
└─────────────────────────────────────────────────────────────────────────────────┘
```

## 6. Mobile Executive Brief (Tableau Mobile)

```
┌───────────────────────────────┐
│ ZUMIQ  ●  Mon 07:30           │
│                               │
│ GMV today   $11.6M  ▼18%      │
│ DQ          98.2  ✓           │
│ Fresh       07:15  ✓          │
│ Cost        $12.3k  ✓         │
│                               │
│ [▾ Yesterday]  [BU drill]     │
│ One number. Everywhere.       │
└───────────────────────────────┘
```

## 7. Wireframe-to-Spec Mapping

| Wireframe | Product surface | Data source | Primary decision |
|---|---|---|---|
| 1 Executive Overview | Tableau dashboard | `v_executive_overview` | What to intervene on today |
| 2 BU P&L | Tableau dashboard | `v_executive_daily` | Margin/cost actions |
| 3 DQ Portal | ZUMIQ Portal | `dq_health_daily` | Which product to fix |
| 4 Catalog | ZUMIQ Portal | `metadata.table_catalog` | Which table to trust/use |
| 5 Alert Console | ops console | `ops.alert_history` | What to fix now |
| 6 Mobile Brief | Tableau Mobile | `v_executive_overview` | Morning awareness |
