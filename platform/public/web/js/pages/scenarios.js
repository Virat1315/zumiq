/* ZUMIQ - Scenarios & Incidents page */
(function () {
  "use strict";
  const Z = window.ZQ;
  const state = { domain: "ALL", sev: "ALL" };
  const DOMAINS = Array.from(new Set(Z.SCENARIOS.map(s => s.domain))).sort();

  function render() {
    const list = Z.SCENARIOS.filter(s =>
      (state.domain === "ALL" || s.domain === state.domain) &&
      (state.sev === "ALL" || s.sev === state.sev));
    const p1 = Z.SCENARIOS.filter(s => s.sev === "P1").length;

    document.getElementById("content").innerHTML = `
      <div class="kpis" id="kpis"></div>
      <div class="card full">
        <h3>Incident & scenario playbooks</h3>
        <div class="sub">Each card maps to a full write-up in <code style="font-size:11.5px">docs/scenarios/</code> - detection rule, root cause, fix, and post-mortem.</div>
        <div class="scenario-grid" id="grid"></div>
      </div>`;

    const kpis = [
      { label: "Scenario Playbooks", value: Z.SCENARIOS.length, delta: "documented incidents", cls: "flat" },
      { label: "P1 / Critical", value: p1, delta: "executive-level incidents", cls: "bad" },
      { label: "Domains Covered", value: DOMAINS.length, delta: "governance → cost → DQ", cls: "flat" },
      { label: "Detection Rules", value: "14", delta: "anomaly + freshness + volume", cls: "flat" }
    ];
    const kpiEl = document.getElementById("kpis");
    kpis.forEach(k => kpiEl.appendChild(Z.kpi(`<div class="label">${k.label}</div><div class="value">${k.value}</div><div class="delta ${k.cls}">${k.delta}</div>`)));

    document.getElementById("grid").innerHTML = list.map(s => `
      <div class="scenario">
        <div class="top">
          <h4>${s.id} · ${s.title}</h4>
        </div>
        <div style="display:flex;gap:6px;margin-bottom:8px">
          <span class="badge ${s.sev === "P1" ? "red" : "amber"}">${s.sev}</span>
          <span class="badge blue">${s.domain}</span>
        </div>
        <p>${s.summary}</p>
        <a href="https://github.com/Virat1315/zumiq/blob/main/docs/scenarios/${s.doc}" target="_blank" rel="noopener">Read the playbook →</a>
      </div>`).join("") || `<p style="color:var(--muted)">No scenarios match the current filter.</p>`;
  }

  function renderFilters() {
    document.getElementById("filters").innerHTML = `
      <div class="filters">
        <div class="filter"><label>Domain</label>
          <select onchange="ZQ_PAGE_filter()" id="f-domain">
            <option value="ALL">All domains</option>
            ${DOMAINS.map(d => `<option value="${d}" ${state.domain === d ? "selected" : ""}>${d}</option>`).join("")}
          </select></div>
        <div class="filter"><label>Severity</label>
          <select onchange="ZQ_PAGE_filter()" id="f-sev">
            <option value="ALL">All</option>
            <option value="P1" ${state.sev === "P1" ? "selected" : ""}>P1</option>
            <option value="P2" ${state.sev === "P2" ? "selected" : ""}>P2</option>
          </select></div>
      </div>`;
  }

  function init() {
    Z.setPage("scenarios", "Scenarios & Incidents", "22 documented incident playbooks that drove the ZUMIQ platform design.");
    renderFilters();
    render();
  }

  window.ZQ_PAGE_filter = function () {
    state.domain = document.getElementById("f-domain").value;
    state.sev = document.getElementById("f-sev").value;
    render();
  };
  document.addEventListener("DOMContentLoaded", init);
})();
