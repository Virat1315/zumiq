/* ==========================================================================
   ZUMIQ — guided tour
   --------------------------------------------------------------------------
   A dependency-free coachmark walkthrough: a spotlight ring around the thing
   being explained, plus a small box with Back / Next.

   Each page declares its own steps below, keyed by the page id used in
   common.js NAV. A step with no `el`, or whose `el` is not on the page,
   still shows — it just renders as a centred card. That matters because the
   page modules build their DOM at runtime, so a selector can legitimately be
   missing (e.g. a table that has no rows in the current filter window).
   ========================================================================== */

(function () {
  "use strict";

  var SEEN_KEY = "zumiq.tour.seen.v1";

  /* ---------------------------------------------------------------- steps */

  var STEPS = {
    executive: [
      { el: ".sidebar .nav", side: "right",
        title: "Everything lives here",
        body: "Seven views over the same warehouse — business performance, data quality, cost, and the SQL behind them. You can come back to this tour any time from the button below the nav." },
      { el: "#kpis", side: "bottom",
        title: "The health of the business, up top",
        body: "Eight enterprise KPIs for the selected window. Green and red markers flag the ones that are outside target, so you can see what needs attention without reading every number." },
      { el: ".chips", side: "bottom",
        title: "Change the window",
        body: "Switch between 90, 60 and 30 days. Every KPI, chart and table on the page recalculates from the same underlying transactions — nothing is pre-baked." },
      { el: "#gmvChart", side: "top",
        title: "Trends, drawn from raw rows",
        body: "This is daily GMV over the window. The dip on Jul 13 is a deliberately seeded incident — the demo data contains real anomalies so the quality and scenario pages have something true to detect." },
      { el: "#alerts", side: "top",
        title: "What the platform caught",
        body: "Each alert traces back to a seeded scenario (S02, S05, S20…). The Scenarios page walks through how each one was detected and resolved." }
    ],

    business: [
      { el: "#kpis", side: "bottom",
        title: "Per-unit performance",
        body: "The same transaction facts, sliced by business unit — revenue, margin and order mix side by side." },
      { el: ".filters", side: "bottom",
        title: "Slice it your way",
        body: "Filter by business unit, by region, or narrow the window to 60 or 30 days. Every chart and the breakdown table recalculate together, so the comparison always stays consistent." }
    ],

    quality: [
      { el: "#kpis", side: "bottom",
        title: "Data quality, scored",
        body: "A rows-weighted score across six data products. Completeness, validity, uniqueness and freshness each contribute, so one failing dimension cannot hide behind the others." },
      { el: ".card", side: "top",
        title: "Rules, not vibes",
        body: "Scores break down per data product, then per dimension, with a trend line so you can tell a new dip from a standing problem. The rules producing them live in bigquery/quality/seed_rules.sql." }
    ],

    cost: [
      { el: "#kpis", side: "bottom",
        title: "What the warehouse costs",
        body: "Spend, bytes scanned and cost per TB. BigQuery bills on bytes read, so cost-per-TB is the number that tells you whether queries are getting more or less efficient." },
      { el: ".card", side: "top",
        title: "Find the expensive queries",
        body: "Daily spend first, then the same money split by team and by dataset layer. The Jul 8–14 spike gets its own breakdown — a single analyst running a full-table extract every 30 minutes." }
    ],

    playground: [
      { el: ".engine-note", side: "bottom",
        title: "This SQL really runs",
        body: "A small query engine executes in your browser against the demo dataset. No server, no BigQuery bill — but real parsing, real results." },
      { el: ".qbar", side: "bottom",
        title: "Start from a worked example",
        body: "Pick any saved query — window functions, CTEs, JSON handling, cost optimisation. It loads into the editor so you can read it before you run it." },
      { el: ".sqlbox textarea", side: "top",
        title: "Then change it",
        body: "Edit anything and run it again. Unsupported syntax comes back as a clear error rather than silently returning nothing." }
    ],

    scenarios: [
      { el: ".scenario-grid", side: "top",
        title: "22 incidents, start to finish",
        body: "Each card is a real failure mode — a P&L mismatch, a schema drift, an alert-fatigue spiral. Open one to see the symptom, the investigation, the root cause and the fix." },
      { el: ".filters", side: "bottom",
        title: "Narrow it down",
        body: "Filter by domain — governance, cost, quality — or by severity. P1s are the ones that reached a customer or a board deck, and they are the most useful place to start." }
    ],

    architecture: [
      { el: ".arch", side: "top",
        title: "How the platform fits together",
        body: "Ingestion through to semantic layer, top to bottom. Each band names the actual services and the tables it writes." },
      { el: ".cross", side: "top",
        title: "The concerns that cut across",
        body: "Governance, quality, metadata and cost control are not a layer — they apply at every stage, which is why they sit apart from the stack." }
    ]
  };

  /* ------------------------------------------------------------- machinery */

  var steps = [], idx = 0, spot = null, box = null, active = false;

  function make(tag, cls) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    return n;
  }

  function targetOf(step) {
    if (!step.el) return null;
    var node;
    try { node = document.querySelector(step.el); } catch (e) { return null; }
    if (!node) return null;

    // An element can be present but not on screen — the clearest case is the
    // sidebar, which is translated off-canvas below the mobile breakpoint.
    // Anchoring to it would park the spotlight outside the viewport, so treat
    // it as unanchored and let the step render as a centred card instead.
    var r = node.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) return null;
    if (r.right < 1 || r.left > window.innerWidth - 1) return null;
    return node;
  }

  /* Position the spotlight ring and the step box around the current target. */
  function place() {
    var step = steps[idx];
    var t = targetOf(step);

    if (!t) {
      // No anchor — centre the card and hide the ring off-screen.
      spot.style.opacity = "0";
      spot.style.width = spot.style.height = "0px";
      spot.style.top = "-9999px";
      spot.style.left = "-9999px";
      box.setAttribute("data-arrow", "none");
      box.style.top = Math.max(16, (window.innerHeight - box.offsetHeight) / 2) + "px";
      box.style.left = Math.max(16, (window.innerWidth - box.offsetWidth) / 2) + "px";
      return;
    }

    spot.style.opacity = "1";
    var r = t.getBoundingClientRect();
    var pad = 8;
    var top = r.top - pad, left = r.left - pad;
    var w = r.width + pad * 2, h = r.height + pad * 2;

    spot.style.top = top + "px";
    spot.style.left = left + "px";
    spot.style.width = w + "px";
    spot.style.height = h + "px";

    // Decide which side of the target the box sits on, then keep it on screen.
    var bw = box.offsetWidth, bh = box.offsetHeight, gap = 16;
    var side = step.side || "bottom";
    var bTop, bLeft, arrow;

    function fitsBelow()  { return top + h + gap + bh < window.innerHeight - 8; }
    function fitsAbove()  { return top - gap - bh > 8; }
    function fitsRight()  { return left + w + gap + bw < window.innerWidth - 8; }

    if (side === "right" && !fitsRight()) side = "bottom";
    if (side === "bottom" && !fitsBelow()) side = fitsAbove() ? "top" : "bottom";
    if (side === "top" && !fitsAbove()) side = fitsBelow() ? "bottom" : "top";

    if (side === "right") {
      bTop = top; bLeft = left + w + gap; arrow = "left";
    } else if (side === "top") {
      bTop = top - gap - bh; bLeft = left; arrow = "bottom";
    } else {
      bTop = top + h + gap; bLeft = left; arrow = "top";
    }

    bLeft = Math.min(Math.max(12, bLeft), window.innerWidth - bw - 12);
    bTop = Math.min(Math.max(12, bTop), window.innerHeight - bh - 12);

    box.setAttribute("data-arrow", arrow);
    box.style.top = bTop + "px";
    box.style.left = bLeft + "px";
  }

  function render() {
    var step = steps[idx];
    var dots = steps.map(function (_, i) {
      return '<span class="t-dot' + (i === idx ? " on" : "") + '"></span>';
    }).join("");

    box.innerHTML =
      '<div class="t-step">Step ' + (idx + 1) + ' of ' + steps.length + '</div>' +
      '<h4></h4><p></p>' +
      '<div class="t-foot">' +
        '<div class="t-dots">' + dots + '</div>' +
        '<div class="t-btns">' +
          (idx === 0
            ? '<button class="tour-skip" data-act="end">Skip</button>'
            : '<button class="ghost" data-act="back">Back</button>') +
          '<button data-act="next">' + (idx === steps.length - 1 ? "Done" : "Next") + '</button>' +
        '</div>' +
      '</div>';

    // Set copy as text, never as HTML — step content is data, not markup.
    box.querySelector("h4").textContent = step.title;
    box.querySelector("p").textContent = step.body;

    var t = targetOf(step);
    if (t && t.scrollIntoView) {
      t.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
      // Let the smooth scroll settle before measuring.
      setTimeout(place, 320);
    }
    place();

    var next = box.querySelector('[data-act="next"]');
    if (next) next.focus();
  }

  function go(n) {
    if (n < 0 || n >= steps.length) return end();
    idx = n;
    render();
  }

  function onKey(e) {
    if (!active) return;
    if (e.key === "Escape") { e.preventDefault(); end(); }
    else if (e.key === "ArrowRight") { e.preventDefault(); go(idx + 1); }
    else if (e.key === "ArrowLeft" && idx > 0) { e.preventDefault(); go(idx - 1); }
  }

  function onClick(e) {
    var b = e.target.closest ? e.target.closest("[data-act]") : null;
    if (!b) return;
    var act = b.getAttribute("data-act");
    if (act === "next") go(idx + 1);
    else if (act === "back") go(idx - 1);
    else end();
  }

  function start(pageId) {
    if (active) return;
    steps = STEPS[pageId] || [];
    if (!steps.length) return;

    idx = 0;
    active = true;
    try { localStorage.setItem(SEEN_KEY, "1"); } catch (e) {}

    spot = make("div", "tour-spot");
    box = make("div", "tour-box");
    box.setAttribute("role", "dialog");
    box.setAttribute("aria-modal", "true");
    box.setAttribute("aria-label", "Product tour");
    document.body.appendChild(spot);
    document.body.appendChild(box);

    box.addEventListener("click", onClick);
    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);

    render();
  }

  function end() {
    if (!active) return;
    active = false;
    document.removeEventListener("keydown", onKey);
    window.removeEventListener("resize", place);
    window.removeEventListener("scroll", place, true);
    if (spot && spot.parentNode) spot.parentNode.removeChild(spot);
    if (box && box.parentNode) box.parentNode.removeChild(box);
    spot = box = null;

    var launch = document.querySelector(".tour-launch");
    if (launch) launch.focus();
  }

  function seen() {
    try { return localStorage.getItem(SEEN_KEY) === "1"; } catch (e) { return true; }
  }

  window.ZQTour = { start: start, end: end, seen: seen, has: function (id) { return !!STEPS[id]; } };
})();
