/* ZUMIQ — Architecture page */
(function () {
  "use strict";
  const Z = window.ZQ;

  function render() {
    document.getElementById("content").innerHTML = `
      <div class="kpis" id="kpis"></div>
      <div class="card full">
        <h3>Reference architecture</h3>
        <div class="sub">Medallion layers on BigQuery + dbt orchestration + governance and observability planes</div>
        <div class="arch">
          <div class="layer"><div class="lbl">Consumption</div><div class="desc">Tableau certified datasources, executive dashboards, self-serve SQL, data API</div></div>
          <div class="arrow">▼</div>
          <div class="layer"><div class="lbl">Gold / Marts</div><div class="desc">kpi_executive_daily · cost_daily_summary · revenue marts — certified, row-level security</div></div>
          <div class="arrow">▼</div>
          <div class="layer"><div class="lbl">Analytics</div><div class="desc">Attribution, LTV, churn models · dbt DAG with test coverage · point-in-time semantics</div></div>
          <div class="arrow">▼</div>
          <div class="layer"><div class="lbl">Core</div><div class="desc">SCD2 dims (customer, product) · fct_transactions · fct_operations_events · fct_support_cases</div></div>
          <div class="arrow">▼</div>
          <div class="layer"><div class="lbl">Raw</div><div class="desc">Landing zone, immutable snapshots, late-arriving data buffered for as-of joins</div></div>
          <div class="arrow">▼</div>
          <div class="layer"><div class="lbl">Ingestion</div><div class="desc">OMS, ERP, gateway streams, CRM CDC, vendor files · streaming + batch with idempotent retries</div></div>
          <div class="arrow flip">▼</div>
          <div class="cross">
            <div class="box"><b>Governance</b>Data catalog · lineage · certified semantic layer</div>
            <div class="box"><b>DQ Engine</b>7-dimension checks · anomaly + freshness alerts</div>
            <div class="box"><b>Observability</b>Pipeline health · SLA · lineage impact analysis</div>
            <div class="box"><b>FinOps</b>Cost per query / TB · runaway detection · alerts</div>
          </div>
        </div>
      </div>
      <div class="grid2">
        <div class="card"><h3>Pipeline health — last 7 days</h3><div class="sub">8 core pipelines, 56 runs</div><div class="table-wrap" id="pipeTable"></div></div>
        <div class="card"><h3>Certified data assets</h3><div class="sub">Catalog tables with DQ rules and lineage</div><div class="table-wrap" id="assetTable"></div></div>
      </div>`;

    const kpis = [
      { label: "Layers", value: "6", delta: "medallion + governance", cls: "flat" },
      { label: "Core Pipelines", value: "8", delta: "SCD2, loads, streaming", cls: "flat" },
      { label: "Certified Tables", value: "8", delta: "T1 with DQ rules", cls: "flat" },
      { label: "DQ Checks", value: "132", delta: "across 7 dimensions", cls: "flat" }
    ];
    const kpiEl = document.getElementById("kpis");
    kpis.forEach(k => kpiEl.appendChild(Z.kpi(`<div class="label">${k.label}</div><div class="value">${k.value}</div><div class="delta ${k.cls}">${k.delta}</div>`)));

    const pipes = Z.data.pipelines.filter(p => p.run_date >= "2026-07-08").reverse();
    document.getElementById("pipeTable").innerHTML = `<table>
      <thead><tr><th>Run date</th><th>Pipeline</th><th class="num">Rows</th><th>DQ</th><th>Status</th></tr></thead>
      <tbody>${pipes.map(p => `<tr>
        <td>${p.run_date}</td><td style="font-family:Consolas,monospace;font-size:11.5px">${p.pipeline}</td>
        <td class="num">${Z.compact(p.rows_written)}</td>
        <td>${p.dq_passed ? "<span class='badge green'>PASS</span>" : "<span class='badge red'>FAIL</span>"}</td>
        <td><span class="badge ${p.status === "SUCCESS" ? "green" : "red"}">${p.status}</span></td></tr>`).join("")}</tbody></table>`;

    const assets = [
      { t: "raw_layer.transactions_landing", type: "RAW", rules: "-", note: "immutable snapshot" },
      { t: "core_layer.dim_customer", type: "SCD2", rules: 24, note: "certified" },
      { t: "core_layer.dim_product", type: "SCD2", rules: 18, note: "certified" },
      { t: "core_layer.fct_transactions", type: "FACT", rules: 31, note: "certified" },
      { t: "core_layer.fct_operations_events", type: "FACT", rules: 22, note: "certified" },
      { t: "core_layer.fct_support_cases", type: "FACT", rules: 16, note: "certified" },
      { t: "analytics_layer.attribution_model", type: "MART", rules: 9, note: "in review" },
      { t: "gold_layer.kpi_executive_daily", type: "MART", rules: 12, note: "certified" },
      { t: "governance.dq_health_daily", type: "MART", rules: 8, note: "DQ engine output" }
    ];
    document.getElementById("assetTable").innerHTML = `<table>
      <thead><tr><th>Asset</th><th>Type</th><th class="num">Rules</th><th>Status</th></tr></thead>
      <tbody>${assets.map(a => `<tr>
        <td style="font-family:Consolas,monospace;font-size:11.5px">${a.t}</td><td>${a.type}</td>
        <td class="num">${a.rules}</td>
        <td><span class="badge ${a.note === "certified" ? "green" : a.note === "in review" ? "amber" : "gray"}">${a.note}</span></td></tr>`).join("")}</tbody></table>`;
  }

  function init() {
    Z.setPage("architecture", "Architecture", "How ZUMIQ turns raw operational data into certified, governed, cost-aware analytics.");
    render();
  }

  document.addEventListener("DOMContentLoaded", init);
})();
