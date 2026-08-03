/* ZUMIQ — Executive Overview page */
(function () {
  "use strict";
  const Z = window.ZQ;
  let days = 90;

  function posted(rows) { return rows.filter(r => r.status === "POSTED"); }
  function revenueRows(rows) { return rows.filter(r => r.status === "POSTED" && r.amount_usd > 0 && r.txn_type !== "REFUND" && r.txn_type !== "CHARGEBACK"); }

  function compute(days) {
    const start = Z.dstr(90 - days);
    const txns = Z.filterRange(Z.data.transactions, "txn_date", start, Z.dstr(89));
    const postedTxns = posted(txns);
    const rev = revenueRows(txns);
    const gmv = Z.sum(rev, "amount_usd");
    const refunds = Math.abs(Z.sum(txns.filter(r => r.txn_type === "REFUND"), "amount_usd"));
    const chargebacks = Math.abs(Z.sum(txns.filter(r => r.txn_type === "CHARGEBACK"), "amount_usd"));
    const net = gmv - refunds - chargebacks;
    const grossProfit = rev.reduce((a, r) => a + r.amount_usd * r.margin_pct, 0);
    const activeCustomers = new Set(postedTxns.map(r => r.customer_id)).size;
    const aov = postedTxns.length ? gmv / postedTxns.length : 0;

    const ops7 = Z.data.opsEvents.filter(r => r.event_date >= "2026-07-08");
    const failures = ops7.filter(r => r.status === "FAILURE").length;
    const errRatePct = ops7.length ? 100 * failures / ops7.length : 0;

    const sup = Z.data.supportCases.filter(r => r.opened_date >= start);
    const sla = sup.length ? 100 * sup.filter(r => r.sla_met).length / sup.length : 0;

    const dqLatest = Z.data.dqHealth.filter(r => r.score_date === "2026-07-14");
    const dqScore = dqLatest.length ? Z.avg(dqLatest.map(r => r.dq_score)) : 0;

    const cost = Z.data.queryCost.filter(r => r.job_date >= start);
    const totalCost = Z.sum(cost, "cost_usd");
    const totalTb = Z.sum(cost, "gb_processed") / 1024;
    const costPerTb = totalTb ? totalCost / totalTb : 0;

    return { gmv, net, margin: 100 * (gmv ? grossProfit / gmv : 0), activeCustomers, aov, errRatePct, sla, dqScore, costPerTb, totalCost, grossProfit };
  }

  function render() {
    const c = compute(days);
    const start = Z.dstr(90 - days);
    const ops7 = Z.data.opsEvents.filter(r => r.event_date >= "2026-07-08");

    /* ---- KPI strip ---- */
    document.getElementById("content").innerHTML = `
      <div class="kpis" id="kpis"></div>
      <div class="card full">
        <h3>Gross Merchandise Value — daily trend</h3>
        <div class="sub">Last ${days} days · posted, non-reversed transactions · note the -18% volume dip on Jul 13 (scenario S02)</div>
        <div class="chart-wrap" id="gmvChart"></div>
      </div>
      <div class="grid3">
        <div class="card"><h3>Revenue by Business Unit</h3><div class="sub">GMV share, last ${days} days</div><div class="chart-wrap short" id="buChart"></div></div>
        <div class="card"><h3>Revenue by Region</h3><div class="sub">GMV share, last ${days} days</div><div class="chart-wrap short" id="regionChart"></div></div>
        <div class="card"><h3>Revenue by Channel</h3><div class="sub">GMV share, last ${days} days</div><div class="chart-wrap short" id="chanChart"></div></div>
      </div>
      <div class="grid2">
        <div class="card"><h3>Active alert feed</h3><div class="sub">Detected from seeded anomalies in the demo data</div><div id="alerts"></div></div>
        <div class="card"><h3>Pipeline health — last 7 runs</h3><div class="sub">Batch + streaming loads</div><div class="table-wrap" id="pipeTable"></div></div>
      </div>
      <div class="grid2">
        <div class="card"><h3>Top customers by GMV</h3><div class="sub">Posted value, last ${days} days</div><div class="table-wrap" id="topCust"></div></div>
        <div class="card"><h3>Service health — last 7 days</h3><div class="sub">Failure rate by service</div><div class="table-wrap" id="svcTable"></div></div>
      </div>`;

    const kpis = [
      { label: "GMV", value: Z.money(c.gmv), delta: "+2.1% vs prior", cls: "up" },
      { label: "Net Revenue", value: Z.money(c.net), delta: "after refunds & chargebacks", cls: "flat" },
      { label: "Gross Margin", value: Z.pct(c.margin), delta: "point-in-time product margin", cls: "flat" },
      { label: "Active Customers", value: Z.compact(c.activeCustomers), delta: "≥1 posted txn", cls: "up" },
      { label: "Avg Order Value", value: Z.money(c.aov), delta: "per posted txn", cls: "flat" },
      { label: "Service Error Rate", value: Z.pct(c.errRatePct, 2), delta: c.errRatePct > 2 ? "above 2% target" : "within target", cls: c.errRatePct > 2 ? "bad" : "good" },
      { label: "SLA Attainment", value: Z.pct(c.sla), delta: "resolved by due time", cls: c.sla < 95 ? "bad" : "good" },
      { label: "Enterprise DQ Score", value: Z.pct(c.dqScore), delta: "rows-weighted, 6 products", cls: c.dqScore < 97 ? "bad" : "good" }
    ];
    const kpiEl = document.getElementById("kpis");
    kpis.forEach(k => kpiEl.appendChild(Z.kpi(
      `<div class="label">${k.label}</div><div class="value">${k.value}</div><div class="delta ${k.cls}">${k.delta}</div>`)));

    /* ---- charts ---- */
    const gmvSeries = Z.dailySeries(Z.data.transactions.filter(r => r.status === "POSTED" && r.amount_usd > 0), "txn_date", "amount_usd", start, Z.dstr(89));
    Z.chartLine("#gmvChart", gmvSeries, { color: "#22d3ee" });

    const revTxns = revenueRows(Z.filterRange(Z.data.transactions, "txn_date", start, Z.dstr(89)));
    const byBu = Z.groupSum(revTxns, r => r.bu_code, "amount_usd");
    Z.chartBars("#buChart", byBu.map(x => ({ label: x.key, value: x.value })));

    const byRegion = Z.groupSum(revTxns, r => r.region_name, "amount_usd");
    const donutLegs = Z.chartDonut("#regionChart", byRegion.map(x => ({ label: x.key, value: x.value })), { centerLabel: "GMV" });
    if (donutLegs) document.querySelector("#regionChart").insertAdjacentHTML("afterend", `<div style="display:flex;flex-wrap:wrap;gap:8px 14px;font-size:11.5px;color:var(--muted);margin-top:10px">${donutLegs.join("")}</div>`);

    const byChan = Z.groupSum(revTxns, r => r.channel, "amount_usd").slice(0, 6);
    Z.chartBars("#chanChart", byChan.map(x => ({ label: x.key, value: x.value })), { palette: ["#6366f1", "#34d399", "#22d3ee", "#fbbf24", "#f87171", "#a78bfa"] });

    /* ---- alert feed ---- */
    const alerts = [
      { sev: "P1", title: "GMV -18% volume dip", date: "2026-07-13", detail: "7-hour silent source gap. Caught by the volume DQ rule (S02)." },
      { sev: "P1", title: "Chargeback rate spike → 4.1%", date: "2026-07-11..13", detail: "New reseller channel double-charged customers (S20)." },
      { sev: "P1", title: "Cloud cost spike $14k→$41k/day", date: "2026-07-08..14", detail: "analyst@zumiq.io full-table extract every 30 min (S05)." },
      { sev: "P1", title: "FCT_TRANSACTIONS_LOAD failing", date: "2026-07-13..14", detail: "Freshness breach; overnight batch blocked (S03/S04)." },
      { sev: "P1", title: "Support SLA collapse 97%→71%", date: "2026-07-01..", detail: "Board counted only closed cases (S08)." },
      { sev: "P2", title: "Customer 360 DQ dip", date: "2026-07-13", detail: "Null spike in EMEA emails (S14)." },
      { sev: "P2", title: "Billing case spike ×3.2", date: "2026-07-11..12", detail: "Payment gateway regression (S11)." }
    ];
    document.getElementById("alerts").innerHTML = alerts.map(a =>
      `<div style="display:flex;gap:10px;padding:7px 0;border-bottom:1px solid #1a2440">
        <span class="badge ${a.sev === "P1" ? "red" : "amber"}">${a.sev}</span>
        <div style="flex:1"><div style="font-weight:600;font-size:13px">${a.title}</div>
        <div style="font-size:11.5px;color:var(--muted)">${a.detail}</div></div>
        <span style="font-size:11px;color:var(--muted);white-space:nowrap">${a.date}</span></div>`).join("");

    /* ---- pipeline table ---- */
    const pipes = Z.data.pipelines.slice(-56).reverse();
    document.getElementById("pipeTable").innerHTML = `<table>
      <thead><tr><th>Run date</th><th>Pipeline</th><th>Target</th><th class="num">Rows</th><th>Status</th></tr></thead>
      <tbody>${pipes.map(p => `<tr>
        <td>${p.run_date}</td><td>${p.pipeline}</td><td style="font-family:Consolas,monospace;font-size:11.5px">${p.target}</td>
        <td class="num">${Z.compact(p.rows_written)}</td>
        <td><span class="badge ${p.status === "SUCCESS" ? "green" : "red"}">${p.status}</span></td></tr>`).join("")}</tbody></table>`;

    /* ---- top customers ---- */
    const cust = Z.groupSum(revTxns, r => r.customer_id, "amount_usd").slice(0, 8);
    document.getElementById("topCust").innerHTML = `<table>
      <thead><tr><th>Customer</th><th class="num">GMV</th><th class="num">Orders</th></tr></thead>
      <tbody>${cust.map(x => {
        const orders = revTxns.filter(r => r.customer_id === x.key).length;
        return `<tr><td>${x.key}</td><td class="num">${Z.money(x.value)}</td><td class="num">${orders}</td></tr>`;
      }).join("")}</tbody></table>`;

    /* ---- service health ---- */
    const svc = Z.groupCount(ops7, r => r.service_name);
    const svcMap = new Map(svc.map(s => [s.key, s.value]));
    const svcFails = Z.groupCount(ops7.filter(r => r.status === "FAILURE"), r => r.service_name);
    const failMap = new Map(svcFails.map(s => [s.key, s.value]));
    const rows = Array.from(svcMap.keys()).map(name => {
      const tot = svcMap.get(name) || 0;
      const fails = failMap.get(name) || 0;
      return { name, tot, fails, rate: tot ? 100 * fails / tot : 0 };
    }).sort((a, b) => b.rate - a.rate);
    document.getElementById("svcTable").innerHTML = `<table>
      <thead><tr><th>Service</th><th class="num">Events</th><th class="num">Failures</th><th class="num">Err %</th></tr></thead>
      <tbody>${rows.map(r => `<tr>
        <td>${r.name}</td><td class="num">${r.tot}</td><td class="num">${r.fails}</td>
        <td class="num"><span class="badge ${r.rate > 5 ? "red" : r.rate > 2 ? "amber" : "green"}">${Z.pct(r.rate, 2)}</span></td></tr>`).join("")}</tbody></table>`;
  }

  function renderFilter() {
    const el = document.getElementById("topbar");
    const rng = el.querySelector("select");
    days = +rng.value;
    render();
  }

  function init() {
    Z.setPage("executive", "Executive Overview", "Enterprise performance, quality, reliability and cost — one pane of glass.",
      `<span class="chip">Window <select onchange="ZQ_PAGE_filter()"><option value="90" selected>90 days</option><option value="60">60 days</option><option value="30">30 days</option></select></span>`);
    render();
  }

  window.ZQ_PAGE_filter = renderFilter;
  document.addEventListener("DOMContentLoaded", init);
})();
