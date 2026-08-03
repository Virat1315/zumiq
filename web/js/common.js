/* ZUMIQ — shared utilities, nav shell, chart helpers */
(function () {
  "use strict";
  /* `group` only affects how the sidebar is labelled — the list, ids, hrefs
     and order are unchanged, so every page module still resolves the same. */
  const NAV = [
    { id: "executive", href: "index.html", label: "Executive Overview", icon: "◉", group: "Analyse" },
    { id: "business", href: "business.html", label: "Business Units", icon: "▤", group: "Analyse" },
    { id: "quality", href: "quality.html", label: "Data Quality", icon: "✚", group: "Operate" },
    { id: "cost", href: "cost.html", label: "Cloud Cost", icon: "◈", group: "Operate" },
    { id: "scenarios", href: "scenarios.html", label: "Scenarios", icon: "⚠", group: "Operate" },
    { id: "playground", href: "playground.html", label: "SQL Playground", icon: "⌘", group: "Build" },
    { id: "architecture", href: "architecture.html", label: "Architecture", icon: "⌥", group: "Build" }
  ];

  function renderNav(active) {
    const el = document.getElementById("nav");
    if (!el) return;

    let html = "", lastGroup = null;
    for (const n of NAV) {
      if (n.group !== lastGroup) {
        html += `<div class="nav-group">${n.group}</div>`;
        lastGroup = n.group;
      }
      html += `<a href="${n.href}" class="${n.id === active ? "active" : ""}"` +
              `${n.id === active ? ' aria-current="page"' : ""}>` +
              `<span class="ico" aria-hidden="true">${n.icon}</span>${n.label}</a>`;
    }
    el.innerHTML = html;

    buildTourLaunch(active);
    buildMobileBar(active);

    const foot = document.querySelector(".side-foot");
    if (foot) foot.innerHTML += `<br><a href="https://github.com/Virat1315/zumiq" target="_blank" rel="noopener" style="color:var(--accent);text-decoration:none">Source on GitHub ↗</a>`;
  }

  /* ---------- tour launcher ---------- */
  /* Sits directly under the nav. Only rendered when tour.js is loaded and has
     steps for this page, so a page without a tour never shows a dead button. */
  function buildTourLaunch(active) {
    const nav = document.getElementById("nav");
    if (!nav || !window.ZQTour || !window.ZQTour.has(active)) return;
    if (document.querySelector(".tour-launch")) return;

    const btn = document.createElement("button");
    btn.className = "tour-launch";
    btn.type = "button";
    btn.innerHTML = `<span aria-hidden="true">◎</span> Take the tour`;
    btn.addEventListener("click", () => {
      closeDrawer();
      window.ZQTour.start(active);
    });
    nav.insertAdjacentElement("afterend", btn);

    // First-ever visit: start it automatically. Afterwards just pulse once so
    // the button is discoverable without hijacking the page again.
    if (!window.ZQTour.seen()) {
      setTimeout(() => window.ZQTour.start(active), 700);
    } else {
      btn.classList.add("nudge");
      setTimeout(() => btn.classList.remove("nudge"), 8000);
    }
  }

  /* ---------- mobile drawer ---------- */
  function closeDrawer() {
    const sb = document.querySelector(".sidebar");
    const sc = document.querySelector(".scrim");
    if (sb) sb.classList.remove("open");
    if (sc) sc.classList.remove("show");
    const h = document.querySelector(".hamburger");
    if (h) h.setAttribute("aria-expanded", "false");
  }

  function buildMobileBar(active) {
    if (document.querySelector(".mobile-bar")) return;
    const app = document.querySelector(".app");
    if (!app) return;

    const current = NAV.find(n => n.id === active);

    const bar = document.createElement("div");
    bar.className = "mobile-bar";
    bar.innerHTML =
      `<button class="hamburger" type="button" aria-label="Open navigation" aria-expanded="false">☰</button>` +
      `<div><div class="mb-title">ZUMIQ</div>` +
      `<div class="mb-sub">${current ? current.label : "Enterprise Data Platform"}</div></div>`;
    document.body.insertBefore(bar, app);

    const scrim = document.createElement("div");
    scrim.className = "scrim";
    document.body.appendChild(scrim);

    const sb = document.querySelector(".sidebar");
    bar.querySelector(".hamburger").addEventListener("click", (e) => {
      const open = sb.classList.toggle("open");
      scrim.classList.toggle("show", open);
      e.currentTarget.setAttribute("aria-expanded", String(open));
    });
    scrim.addEventListener("click", closeDrawer);
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeDrawer(); });
  }

  /* ---------- formatting ---------- */
  function fmt(n, digits) {
    if (n === null || n === undefined || isNaN(n)) return "—";
    const d = digits === undefined ? (Math.abs(n) < 10 ? 2 : 0) : digits;
    return Number(n).toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });
  }
  function money(n) { return "$" + fmt(n, 2); }
  function compact(n) {
    if (n === null || n === undefined) return "—";
    const a = Math.abs(n);
    if (a >= 1e9) return (n / 1e9).toFixed(2) + "B";
    if (a >= 1e6) return (n / 1e6).toFixed(2) + "M";
    if (a >= 1e3) return (n / 1e3).toFixed(1) + "K";
    return Number(n).toFixed(0);
  }
  function pct(n, digits) { return Number(n).toFixed(digits === undefined ? 1 : digits) + "%"; }
  function dateLabel(d) {
    const [y, m, dd] = d.split("-");
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return months[+m - 1] + " " + (+dd) + (dd === "01" ? " " + y : "");
  }

  /* ---------- data helpers ---------- */
  function range(dStart, dEnd) {
    const out = [];
    const ms = 86400000;
    let cur = new Date(dStart + "T00:00:00Z").getTime();
    const end = new Date(dEnd + "T00:00:00Z").getTime();
    while (cur <= end) { out.push(new Date(cur).toISOString().slice(0, 10)); cur += ms; }
    return out;
  }
  function sum(rows, key) { return rows.reduce((a, r) => a + (r[key] || 0), 0); }
  function groupSum(rows, keyFn, valKey) {
    const m = new Map();
    for (const r of rows) {
      const k = keyFn(r);
      m.set(k, (m.get(k) || 0) + (r[valKey] || 0));
    }
    return Array.from(m, ([k, v]) => ({ key: k, value: v })).sort((a, b) => b.value - a.value);
  }
  function groupCount(rows, keyFn) {
    const m = new Map();
    for (const r of rows) { const k = keyFn(r); m.set(k, (m.get(k) || 0) + 1); }
    return Array.from(m, ([k, v]) => ({ key: k, value: v }));
  }
  function filterRange(rows, dateKey, start, end) {
    return rows.filter(r => r[dateKey] >= start && r[dateKey] <= end);
  }
  function dailySeries(rows, dateKey, valKey, start, end) {
    const m = new Map();
    for (const r of rows) m.set(r[dateKey], (m.get(r[dateKey]) || 0) + (r[valKey] || 0));
    return range(start, end).map(d => ({ date: d, value: m.get(d) || 0 }));
  }
  function avg(arr) { return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0; }

  /* ---------- DOM ---------- */
  function el(html) { const t = document.createElement("template"); t.innerHTML = html.trim(); return t.content.firstChild; }
  function kpi(html) { const c = document.createElement("div"); c.className = "kpi"; c.innerHTML = html; return c; }
  function mount(targetId, node) { document.getElementById(targetId).appendChild(node); }

  /* ---------- page shell (sidebar + topbar) ---------- */
  function setPage(active, title, subtitle, chipsHtml) {
    renderNav(active);
    const tb = document.getElementById("topbar");
    if (!tb) return;
    tb.innerHTML =
      `<div class="page-title"><h1>${title}</h1><p>${subtitle || ""}</p></div>` +
      (chipsHtml ? `<div class="chips">${chipsHtml}</div>` : "");
  }

  /* ---------- tiny SVG charts (no external libs) ---------- */
  const SVGNS = "http://www.w3.org/2000/svg";
  function svgEl(name, attrs) {
    const n = document.createElementNS(SVGNS, name);
    for (const k in attrs) n.setAttribute(k, attrs[k]);
    return n;
  }
  function chartContainer(selector) {
    const host = document.querySelector(selector);
    if (!host) return null;
    host.innerHTML = "";
    const svg = svgEl("svg", { viewBox: "0 0 720 300", preserveAspectRatio: "none" });
    svg.style.width = "100%"; svg.style.height = "100%";
    host.appendChild(svg);
    return svg;
  }
  function chartLine(selector, series, opts) {
    const svg = chartContainer(selector);
    if (!svg) return;
    opts = opts || {};
    const W = 720, H = 300, pad = { l: 54, r: 14, t: 14, b: 30 };
    const color = opts.color || "#22d3ee";
    const values = series.map(s => s.value);
    const min = Math.min(0, ...values), max = Math.max(...values);
    const x = i => pad.l + (W - pad.l - pad.r) * (i / Math.max(1, series.length - 1));
    const y = v => pad.t + (H - pad.t - pad.b) * (1 - (v - min) / (max - min || 1));
    const path = series.map((s, i) => (i ? "L" : "M") + x(i).toFixed(1) + " " + y(s.value).toFixed(1)).join(" ");
    svg.appendChild(svgEl("path", { d: path, fill: "none", stroke: color, "stroke-width": 2, "stroke-linejoin": "round" }));
    const area = path.replace(/^M/, "M") + " L" + x(series.length - 1) + " " + (H - pad.b) + " L" + x(0) + " " + (H - pad.b) + " Z";
    svg.appendChild(svgEl("path", { d: area, fill: color, opacity: 0.12 }));
    const ticks = 4;
    for (let t = 0; t <= ticks; t++) {
      const v = min + (max - min) * t / ticks;
      const yy = y(v);
      svg.appendChild(svgEl("line", { x1: pad.l, y1: yy, x2: W - pad.r, y2: yy, stroke: "#22304f", "stroke-width": 1 }));
      const tx = svgEl("text", { x: pad.l - 8, y: yy + 4, fill: "#8fa3c4", "font-size": 11, "text-anchor": "end" });
      tx.textContent = compact(v);
      svg.appendChild(tx);
    }
    const last = series[series.length - 1];
    if (last && opts.lastLabel !== false) {
      const vx = svgEl("text", { x: x(series.length - 1), y: y(last.value) - 10, fill: color, "font-size": 12, "text-anchor": "end", "font-weight": 600 });
      vx.textContent = compact(last.value);
      svg.appendChild(vx);
    }
  }
  function chartBars(selector, items, opts) {
    const svg = chartContainer(selector);
    if (!svg) return;
    opts = opts || {};
    const W = 720, H = 300, pad = { l: 54, r: 14, t: 14, b: 26 };
    const palette = opts.palette || ["#22d3ee", "#6366f1", "#34d399", "#fbbf24", "#f87171", "#a78bfa", "#2dd4bf"];
    const max = Math.max(...items.map(i => i.value), 1);
    const bw = (W - pad.l - pad.r) / items.length;
    items.forEach((it, i) => {
      const h = Math.max(2, (H - pad.t - pad.b) * (it.value / max));
      const x = pad.l + bw * i + bw * 0.12;
      const w = bw * 0.76;
      svg.appendChild(svgEl("rect", { x: x, y: H - pad.b - h, width: w, height: h, rx: 3, fill: palette[i % palette.length] }));
      const lbl = svgEl("text", { x: x + w / 2, y: H - 10, fill: "#8fa3c4", "font-size": 10.5, "text-anchor": "middle" });
      lbl.textContent = (it.label || "").length > 9 ? it.label.slice(0, 8) + "…" : it.label;
      svg.appendChild(lbl);
    });
  }
  function chartDonut(selector, items, opts) {
    const svg = chartContainer(selector);
    if (!svg) return;
    opts = opts || {};
    const palette = opts.palette || ["#22d3ee", "#6366f1", "#34d399", "#fbbf24", "#f87171", "#a78bfa", "#2dd4bf"];
    const total = items.reduce((a, i) => a + i.value, 0) || 1;
    const cx = 150, cy = 150, r = 95, ir = 58;
    let a = -Math.PI / 2;
    const legs = [];
    items.forEach((it, i) => {
      const frac = it.value / total;
      const a2 = a + frac * Math.PI * 2;
      const large = (a2 - a) > Math.PI ? 1 : 0;
      const x1 = cx + r * Math.cos(a), y1 = cy + r * Math.sin(a);
      const x2 = cx + r * Math.cos(a2), y2 = cy + r * Math.sin(a2);
      const ix1 = cx + ir * Math.cos(a2), iy1 = cy + ir * Math.sin(a2);
      const ix2 = cx + ir * Math.cos(a), iy2 = cy + ir * Math.sin(a);
      const d = `M${x1},${y1} A${r},${r} 0 ${large} 1 ${x2},${y2} L${ix1},${iy1} A${ir},${ir} 0 ${large} 0 ${ix2},${iy2} Z`;
      svg.appendChild(svgEl("path", { d, fill: palette[i % palette.length] }));
      legs.push(`<span class="badge" style="background:rgba(255,255,255,0.06);color:#c7d4ea">${it.label}</span> <b>${pct(100 * it.value / total, 0)}</b>`);
      a = a2;
    });
    const center = svgEl("text", { x: cx, y: cy - 4, fill: "#e6edf7", "font-size": 18, "text-anchor": "middle", "font-weight": 700 });
    center.textContent = compact(total);
    svg.appendChild(center);
    const sub = svgEl("text", { x: cx, y: cy + 16, fill: "#8fa3c4", "font-size": 11, "text-anchor": "middle" });
    sub.textContent = (opts.centerLabel || "total");
    svg.appendChild(sub);
    return legs;
  }

  window.ZQ = Object.assign(window.ZQ || {}, {
    NAV, renderNav, setPage, fmt, money, compact, pct, dateLabel, range, sum,
    groupSum, groupCount, filterRange, dailySeries, avg, el, kpi, mount,
    chartLine, chartBars, chartDonut
  });
})();
