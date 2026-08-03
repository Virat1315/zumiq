/* ZUMIQ — Business Units page */
(function () {
  "use strict";
  const Z = window.ZQ;
  const state = { bu: "ALL", region: "ALL", days: 60 };

  function selectedTxns() {
    let start = Z.dstr(90 - state.days);
    let rows = Z.filterRange(Z.data.transactions, "txn_date", start, Z.dstr(89));
    if (state.bu !== "ALL") rows = rows.filter(r => r.bu_code === state.bu);
    if (state.region !== "ALL") rows = rows.filter(r => r.region_name === state.region);
    return rows;
  }
  function rev(rows) { return rows.filter(r => r.status === "POSTED" && r.amount_usd > 0 && r.txn_type !== "REFUND" && r.txn_type !== "CHARGEBACK"); }

  function render() {
    const rows = selectedTxns();
    const r = rev(rows);
    const gmv = Z.sum(r, "amount_usd");
    const posted = rows.filter(x => x.status === "POSTED");
    const active = new Set(posted.map(x => x.customer_id)).size;
    const aov = posted.length ? gmv / posted.length : 0;
    const margin = gmv ? 100 * r.reduce((a, x) => a + x.amount_usd * x.margin_pct, 0) / gmv : 0;

    document.getElementById("content").innerHTML = `
      <div class="kpis" id="kpis"></div>
      <div class="card full">
        <h3>GMV trend — daily</h3>
        <div class="sub">${state.bu === "ALL" ? "All business units" : Z.BUS.find(b => b.code === state.bu).name} · ${state.region === "ALL" ? "all regions" : state.region} · last ${state.days} days</div>
        <div class="chart-wrap" id="gmvChart"></div>
      </div>
      <div class="grid3">
        <div class="card"><h3>Category mix</h3><div class="sub">GMV by product category</div><div class="chart-wrap short" id="catChart"></div></div>
        <div class="card"><h3>Channel mix</h3><div class="sub">GMV by channel</div><div class="chart-wrap short" id="chanChart"></div></div>
        <div class="card"><h3>Region mix</h3><div class="sub">GMV by region</div><div class="chart-wrap short" id="regChart"></div></div>
      </div>
      <div class="card full">
        <h3>Business unit breakdown</h3>
        <div class="sub">${state.region === "ALL" ? "All regions" : state.region} · last ${state.days} days</div>
        <div class="table-wrap" id="buTable"></div>
      </div>`;

    const kpis = [
      { label: "GMV", value: Z.money(gmv), delta: state.days + " day window", cls: "flat" },
      { label: "Active Customers", value: Z.compact(active), delta: "≥1 posted txn", cls: "flat" },
      { label: "Avg Order Value", value: Z.money(aov), delta: "per posted txn", cls: "flat" },
      { label: "Gross Margin", value: Z.pct(margin), delta: "point-in-time", cls: "flat" }
    ];
    const kpiEl = document.getElementById("kpis");
    kpis.forEach(k => kpiEl.appendChild(Z.kpi(`<div class="label">${k.label}</div><div class="value">${k.value}</div><div class="delta ${k.cls}">${k.delta}</div>`)));

    const start = Z.dstr(90 - state.days);
    const series = Z.dailySeries(r, "txn_date", "amount_usd", start, Z.dstr(89));
    Z.chartLine("#gmvChart", series, { color: "#6366f1" });

    Z.chartBars("#catChart", Z.groupSum(r, x => x.product_category, "amount_usd").map(x => ({ label: x.key, value: x.value })).slice(0, 6));
    Z.chartBars("#chanChart", Z.groupSum(r, x => x.channel, "amount_usd").map(x => ({ label: x.key, value: x.value })).slice(0, 6),
      { palette: ["#34d399", "#22d3ee", "#fbbf24", "#f87171", "#a78bfa", "#6366f1"] });
    const legs = Z.chartDonut("#regChart", Z.groupSum(r, x => x.region_name, "amount_usd").map(x => ({ label: x.key, value: x.value })), { centerLabel: "GMV" });
    if (legs) document.querySelector("#regChart").insertAdjacentHTML("afterend", `<div style="display:flex;flex-wrap:wrap;gap:8px 14px;font-size:11.5px;color:var(--muted);margin-top:10px">${legs.join("")}</div>`);

    /* BU breakdown table */
    const buRows = Z.BUS.map(bu => {
      const bx = state.region === "ALL" ? r : r.filter(x => x.region_name === state.region);
      const buRowsX = bx.filter(x => x.bu_code === bu.code);
      const bg = Z.sum(buRowsX, "amount_usd");
      const bp = posted.filter(x => x.bu_code === bu.code);
      return { ...bu, gmv: bg, orders: buRowsX.length, active: new Set(bp.map(x => x.customer_id)).size, aov: buRowsX.length ? bg / buRowsX.length : 0, margin: bg ? 100 * buRowsX.reduce((a, x) => a + x.amount_usd * x.margin_pct, 0) / bg : 0 };
    });
    document.getElementById("buTable").innerHTML = `<table>
      <thead><tr><th>Code</th><th>Business Unit</th><th>Segment</th><th>Owner</th><th class="num">GMV</th><th class="num">Orders</th><th class="num">Active Cust.</th><th class="num">AOV</th><th class="num">Margin</th><th class="num">Share</th></tr></thead>
      <tbody>${buRows.map(b => `<tr>
        <td>${b.code}</td><td>${b.name}</td><td>${b.seg}</td><td>${b.owner}</td>
        <td class="num">${Z.money(b.gmv)}</td><td class="num">${b.orders}</td><td class="num">${Z.compact(b.active)}</td>
        <td class="num">${Z.money(b.aov)}</td><td class="num">${Z.pct(b.margin)}</td><td class="num">${Z.pct(100 * b.gmv / (gmv || 1), 1)}</td></tr>`).join("")}</tbody></table>`;
  }

  function renderFilters() {
    document.getElementById("filters").innerHTML = `
      <div class="filters">
        <div class="filter"><label>Business Unit</label>
          <select onchange="ZQ_PAGE_filter()" id="f-bu">
            <option value="ALL">All</option>
            ${Z.BUS.map(b => `<option value="${b.code}" ${state.bu === b.code ? "selected" : ""}>${b.name}</option>`).join("")}
          </select></div>
        <div class="filter"><label>Region</label>
          <select onchange="ZQ_PAGE_filter()" id="f-region">
            <option value="ALL">All</option>
            ${Z.REGIONS.map(r => `<option value="${r.name}" ${state.region === r.name ? "selected" : ""}>${r.name}</option>`).join("")}
          </select></div>
        <div class="filter"><label>Window</label>
          <select onchange="ZQ_PAGE_filter()" id="f-days">
            <option value="90" ${state.days === 90 ? "selected" : ""}>90 days</option>
            <option value="60" ${state.days === 60 ? "selected" : ""}>60 days</option>
            <option value="30" ${state.days === 30 ? "selected" : ""}>30 days</option>
          </select></div>
      </div>`;
  }

  function init() {
    Z.setPage("business", "Business Units", "Revenue, margin and customer health by business unit — powered by the certified semantic layer.");
    renderFilters();
    render();
  }

  window.ZQ_PAGE_filter = function () {
    state.bu = document.getElementById("f-bu").value;
    state.region = document.getElementById("f-region").value;
    state.days = +document.getElementById("f-days").value;
    render();
  };
  document.addEventListener("DOMContentLoaded", init);
})();
