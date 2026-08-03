/* ZUMIQ - Data Quality page */
(function () {
  "use strict";
  const Z = window.ZQ;
  const PRODUCTS = ["Enterprise P&L", "Customer 360", "Operations Health", "Support SLA", "Platform Health", "Data Quality"];
  let sel = "Customer 360";

  function latest(rows) { return rows.filter(r => r.score_date === "2026-07-14"); }
  function productRows(name) { return Z.data.dqHealth.filter(r => r.data_product === name); }

  function render() {
    const rows = Z.data.dqHealth;
    const today = latest(rows);
    const ent = Z.avg(today.map(r => r.dq_score));
    const checksRun = Z.sum(today, "checks_run");
    const checksFailed = Z.sum(today, "checks_failed");
    const runRate = 100 * checksFailed / checksRun;

    const selRows = productRows(sel);
    const selToday = selRows[selRows.length - 1];
    const sel30 = selRows.filter(r => r.score_date >= "2026-06-15" && r.score_date <= "2026-06-16");
    const dims = selToday ? Object.entries(selToday.dimensions) : [];

    document.getElementById("content").innerHTML = `
      <div class="kpis" id="kpis"></div>
      <div class="grid2">
        <div class="card"><h3>DQ score by data product - today</h3><div class="sub">2026-07-14 · rows-weighted checks across 7 dimensions</div><div class="chart-wrap short" id="scoreChart"></div></div>
        <div class="card"><h3>Dimension scores - ${sel}</h3><div class="sub">Completeness, uniqueness, validity, timeliness, integrity, freshness, volume</div><div class="chart-wrap short" id="dimChart"></div></div>
      </div>
      <div class="card full">
        <h3>Score trend - ${sel}</h3>
        <div class="sub">Last 90 days · note the Jul 13 dip from the EMEA null spike (scenario S14)</div>
        <div class="chart-wrap" id="trendChart"></div>
      </div>
      <div class="grid2">
        <div class="card full">
          <h3>Certified assets & governance</h3>
          <div class="sub">Semantic layer coverage across certified tables</div>
          <div class="table-wrap" id="certTable"></div>
        </div>
        <div class="card"><h3>Certified metrics glossary</h3><div class="sub">Single source of truth - one definition per metric</div><div class="gloss" id="glossary"></div></div>
      </div>`;

    const kpis = [
      { label: "Enterprise DQ Score", value: Z.pct(ent), delta: "6 products, rows-weighted", cls: ent < 97 ? "bad" : "good" },
      { label: "Checks Run (today)", value: Z.compact(checksRun), delta: "across certified tables", cls: "flat" },
      { label: "Failed Checks", value: Z.compact(checksFailed), delta: Z.pct(runRate) + " failure rate", cls: runRate > 2 ? "bad" : "good" },
      { label: "Certified Coverage", value: "68%", delta: "T1 certified vs total T1", cls: "flat" },
      { label: "Checks Automated", value: "132", delta: "cross 8 certified tables", cls: "flat" },
      { label: "Rules in Production", value: "14", delta: "anomaly + freshness + volume", cls: "flat" }
    ];
    const kpiEl = document.getElementById("kpis");
    kpis.forEach(k => kpiEl.appendChild(Z.kpi(`<div class="label">${k.label}</div><div class="value">${k.value}</div><div class="delta ${k.cls}">${k.delta}</div>`)));

    /* score by product today */
    Z.chartBars("#scoreChart", today.map(r => ({ label: r.data_product, value: r.dq_score })), { palette: ["#34d399", "#22d3ee", "#6366f1", "#fbbf24", "#f87171", "#a78bfa"] });

    /* dimension scores */
    Z.chartBars("#dimChart", dims.map(([k, v]) => ({ label: k, value: v })), { palette: ["#22d3ee", "#34d399", "#6366f1", "#fbbf24", "#f87171", "#a78bfa", "#2dd4bf"] });

    /* trend */
    Z.chartLine("#trendChart", selRows.map(r => ({ date: r.score_date, value: r.dq_score })), { color: "#34d399" });

    /* certified table coverage (static representation) */
    const cert = [
      { t: "core_layer.dim_customer", domain: "Customer", status: "CERTIFIED", rules: 24, owner: "R. Kapoor" },
      { t: "core_layer.dim_product", domain: "Product", status: "CERTIFIED", rules: 18, owner: "E. Chen" },
      { t: "core_layer.fct_transactions", domain: "Revenue", status: "CERTIFIED", rules: 31, owner: "Finance" },
      { t: "core_layer.fct_support_cases", domain: "CX", status: "CERTIFIED", rules: 16, owner: "CX Ops" },
      { t: "core_layer.fct_operations_events", domain: "Platform", status: "CERTIFIED", rules: 22, owner: "Platform" },
      { t: "gold_layer.kpi_executive_daily", domain: "Executive", status: "CERTIFIED", rules: 12, owner: "Data PM" },
      { t: "analytics_layer.attribution_model", domain: "Marketing", status: "IN REVIEW", rules: 9, owner: "Marketing" }
    ];
    document.getElementById("certTable").innerHTML = `<table>
      <thead><tr><th>Table</th><th>Domain</th><th>Status</th><th class="num">Rules</th><th>Owner</th></tr></thead>
      <tbody>${cert.map(c => `<tr>
        <td style="font-family:Consolas,monospace;font-size:11.5px">${c.t}</td><td>${c.domain}</td>
        <td><span class="badge ${c.status === "CERTIFIED" ? "green" : "amber"}">${c.status}</span></td>
        <td class="num">${c.rules}</td><td>${c.owner}</td></tr>`).join("")}</tbody></table>`;

    document.getElementById("glossary").innerHTML = Z.GLOSSARY.slice(0, 9).map(g =>
      `<div style="padding:8px 0;border-bottom:1px solid #1a2440">
        <b style="color:var(--accent)">${g.term}</b> <span style="color:var(--muted)">· ${g.owner}</span>
        <div>${g.def}</div><code>${g.formula}</code></div>`).join("");
  }

  function init() {
    Z.setPage("quality", "Data Quality", "Enterprise DQ engine - automated checks, anomalies and certified metrics.",
      `<span class="chip">Product <select onchange="ZQ_PAGE_filter()" id="f-prod">
        ${PRODUCTS.map(p => `<option value="${p}" ${p === sel ? "selected" : ""}>${p}</option>`).join("")}
      </select></span>`);
    render();
  }

  window.ZQ_PAGE_filter = function () {
    sel = document.getElementById("f-prod").value;
    render();
  };
  document.addEventListener("DOMContentLoaded", init);
})();
