/* ZUMIQ — Cloud Cost page */
(function () {
  "use strict";
  const Z = window.ZQ;

  function render() {
    const rows = Z.data.queryCost;
    const total = Z.sum(rows, "cost_usd");
    const tb = Z.sum(rows, "gb_processed") / 1024;
    const costPerTb = tb ? total / tb : 0;
    const cached = rows.filter(r => r.cache_hit).length;
    const cacheRate = rows.length ? 100 * cached / rows.length : 0;

    /* runaway window Jul 8-14 */
    const runaway = rows.filter(r => r.user_email === "analyst@zumiq.io" && r.job_date >= "2026-07-08");
    const runawayCost = Z.sum(runaway, "cost_usd");

    document.getElementById("content").innerHTML = `
      <div class="kpis" id="kpis"></div>
      <div class="card full">
        <h3>Daily query cost</h3>
        <div class="sub">BigQuery slots + scan cost · note the runaway analyst spike from Jul 8 (scenario S05)</div>
        <div class="chart-wrap" id="costChart"></div>
      </div>
      <div class="grid3">
        <div class="card"><h3>Cost by team</h3><div class="sub">90 days</div><div class="chart-wrap short" id="teamChart"></div></div>
        <div class="card"><h3>Cost by dataset layer</h3><div class="sub">90 days</div><div class="chart-wrap short" id="dsChart"></div></div>
        <div class="card"><h3>Runaway analyst — what happened</h3>
          <div class="sub">$41k/day vs $14k baseline</div>
          <div style="font-size:12.5px;color:var(--muted);margin-top:6px">
            <p>One <b style="color:var(--text)">analyst@zumiq.io</b> Tableau extract scanned the full
            <code>fct_transactions</code> table every 30 minutes.</p>
            <p style="margin-top:8px">→ <b style="color:var(--red)">${Z.money(runawayCost)}</b> of ${Z.money(total)} total cost
            came from this single user in 7 days.</p>
            <p style="margin-top:8px">Fix: cache-aware dashboards, <code>LIMIT</code> previews, and a FinOps
            spend alert at $30k/day.</p>
          </div></div>
      </div>
      <div class="card full">
        <h3>Top cost drivers</h3>
        <div class="sub">By user · 90 days · runaway flagged</div>
        <div class="table-wrap" id="userTable"></div>
      </div>`;

    const kpis = [
      { label: "Total Query Cost", value: Z.money(total), delta: "90 days, scan + slots", cls: "flat" },
      { label: "Cost per TB", value: "$" + Z.fmt(costPerTb, 4), delta: "$6.25 per GB scanned", cls: "flat" },
      { label: "Cache Hit Rate", value: Z.pct(cacheRate), delta: "dashboard queries", cls: cacheRate < 20 ? "bad" : "good" },
      { label: "Runaway Cost (7d)", value: Z.money(runawayCost), delta: Z.pct(100 * runawayCost / (total || 1), 1) + " of total", cls: "bad" },
      { label: "Queries (90d)", value: Z.compact(rows.length), delta: "incl. dashboard refreshes", cls: "flat" },
      { label: "Avg Daily Cost", value: Z.money(total / 90), delta: "baseline ≈ $14k/day", cls: "flat" }
    ];
    const kpiEl = document.getElementById("kpis");
    kpis.forEach(k => kpiEl.appendChild(Z.kpi(`<div class="label">${k.label}</div><div class="value">${k.value}</div><div class="delta ${k.cls}">${k.delta}</div>`)));

    Z.chartLine("#costChart", Z.dailySeries(rows, "job_date", "cost_usd", Z.dstr(0), Z.dstr(89)), { color: "#fbbf24" });

    Z.chartBars("#teamChart", Z.groupSum(rows, r => r.team, "cost_usd").map(x => ({ label: x.key, value: x.value })).slice(0, 8),
      { palette: ["#22d3ee", "#6366f1", "#34d399", "#fbbf24", "#f87171", "#a78bfa", "#2dd4bf", "#f472b6"] });

    const legs = Z.chartDonut("#dsChart", Z.groupSum(rows, r => r.dataset, "cost_usd").map(x => ({ label: x.key, value: x.value })), { centerLabel: "$" + Z.compact(total) });
    if (legs) document.querySelector("#dsChart").insertAdjacentHTML("afterend", `<div style="display:flex;flex-wrap:wrap;gap:8px 14px;font-size:11.5px;color:var(--muted);margin-top:10px">${legs.join("")}</div>`);

    const users = Z.groupSum(rows, r => r.user_email, "cost_usd");
    const tbUser = Z.groupSum(rows, r => r.user_email, "gb_processed");
    const tbMap = new Map(tbUser.map(x => [x.key, x.value]));
    const qUser = Z.groupCount(rows, r => r.user_email);
    const qMap = new Map(qUser.map(x => [x.key, x.value]));
    document.getElementById("userTable").innerHTML = `<table>
      <thead><tr><th>User</th><th>Team</th><th class="num">Queries</th><th class="num">GB scanned</th><th class="num">Cost</th><th class="num">Share</th><th>Flag</th></tr></thead>
      <tbody>${users.slice(0, 12).map(x => {
        const runaway2 = x.key === "analyst@zumiq.io";
        const team = rows.find(r => r.user_email === x.key).team;
        return `<tr>
          <td>${x.key}${runaway2 ? " <span class='badge red'>RUNAWAY</span>" : ""}</td>
          <td>${team}</td><td class="num">${qMap.get(x.key) || 0}</td>
          <td class="num">${Z.compact((tbMap.get(x.key) || 0))}</td>
          <td class="num"><b>${Z.money(x.value)}</b></td>
          <td class="num">${Z.pct(100 * x.value / (total || 1), 1)}</td>
          <td>${runaway2 ? "<span class='badge red'>full_scan_extract</span>" : "<span class='badge gray'>normal</span>"}</td></tr>`;
      }).join("")}</tbody></table>`;
  }

  function init() {
    Z.setPage("cost", "Cloud Cost", "BigQuery FinOps — spend, efficiency and runaway detection.");
    render();
  }

  document.addEventListener("DOMContentLoaded", init);
})();
