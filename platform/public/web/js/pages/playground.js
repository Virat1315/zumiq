/* ZUMIQ - SQL Playground: browser-side mini SQL engine over seeded datasets */
(function () {
  "use strict";
  const Z = window.ZQ;

  const TABLES = {
    transactions: Z.playground.transactions,
    products: Z.playground.products,
    regions: Z.playground.regions,
    customers: Z.playground.customers,
    dq_health: Z.playground.dq_health,
    query_cost: Z.playground.query_cost,
    pipelines: Z.playground.pipelines
  };

  const SAMPLE_QUERIES = [
    ["GMV by region", "SELECT region_name, ROUND(SUM(amount_usd), 2) AS gmv FROM transactions WHERE status='POSTED' AND amount_usd > 0 GROUP BY region_name ORDER BY gmv DESC LIMIT 10"],
    ["Top categories by GMV & customers", "SELECT product_category, ROUND(SUM(amount_usd), 2) AS gmv, COUNT(DISTINCT customer_id) AS customers FROM transactions WHERE txn_date >= '2026-06-01' AND status='POSTED' GROUP BY product_category ORDER BY gmv DESC"],
    ["Channel performance", "SELECT channel, COUNT(*) AS txns, ROUND(AVG(amount_usd), 2) AS avg_amount FROM transactions WHERE status='POSTED' GROUP BY channel ORDER BY txns DESC"],
    ["Refund exposure by channel", "SELECT channel, ROUND(ABS(SUM(amount_usd)), 2) AS refunds FROM transactions WHERE txn_type='REFUND' GROUP BY channel ORDER BY refunds DESC LIMIT 5"],
    ["DQ score - latest day", "SELECT data_product, dq_score FROM dq_health WHERE score_date='2026-07-14' ORDER BY dq_score ASC"],
    ["Customer mix by tier", "SELECT tier, COUNT(*) AS customers FROM customers GROUP BY tier ORDER BY customers DESC"],
    ["Top cost users this month", "SELECT user_email, ROUND(SUM(cost_usd), 2) AS spend FROM query_cost WHERE job_date >= '2026-07-01' GROUP BY user_email ORDER BY spend DESC LIMIT 5"],
    ["Pipeline runs & status", "SELECT pipeline, status, COUNT(*) AS runs FROM pipelines WHERE run_date >= '2026-07-01' GROUP BY pipeline, status ORDER BY pipeline"],
    ["GMV trend - 10 day snapshot", "SELECT txn_date, ROUND(SUM(amount_usd), 2) AS gmv FROM transactions WHERE txn_date BETWEEN '2026-07-05' AND '2026-07-14' AND status='POSTED' GROUP BY txn_date ORDER BY txn_date"]
  ];

  /* ============ tokenizer ============ */
  function tokenize(sql) {
    sql = sql.replace(/--[^\n]*/g, " ").replace(/\/\*[\s\S]*?\*\//g, " ");
    const tokens = [];
    const re = /'(?:[^']|'')*'|"(?:[^"]|"")*"|[A-Za-z_][A-Za-z0-9_]*|\d+\.\d+|\d+|>=|<=|<>|!=|[()*,\-+;=<>]|\s+/g;
    let m;
    while ((m = re.exec(sql)) !== null) {
      const t = m[0];
      if (/^\s+$/.test(t)) continue;
      tokens.push(t);
    }
    return tokens;
  }
  function isWord(t) { return t && /^[A-Za-z_][A-Za-z0-9_]*$/.test(t) && !t.startsWith("'") && !t.startsWith('"'); }
  function num(t) { return /^\d/.test(t) ? parseFloat(t) : NaN; }
  const KEYWORDS = new Set(["SELECT", "DISTINCT", "FROM", "WHERE", "GROUP", "BY", "HAVING", "ORDER", "ASC", "DESC", "LIMIT", "AS", "AND", "OR", "NOT", "IN", "LIKE", "BETWEEN", "IS", "NULL", "COUNT", "SUM", "AVG", "MIN", "MAX", "ROUND", "LOWER", "UPPER", "TRUE", "FALSE"]);

  /* ============ parser ============ */
  function parseExpr(tokens, i) {
    return parseOr(tokens, i);
  }
  function parseOr(tokens, i) {
    let r = parseAnd(tokens, i);
    while (r.i < tokens.length && tokens[r.i].toUpperCase() === "OR") {
      const right = parseAnd(tokens, r.i + 1);
      r = { node: { kind: "bin", op: "OR", left: r.node, right: right.node }, i: right.i };
    }
    return r;
  }
  function parseAnd(tokens, i) {
    let r = parseNot(tokens, i);
    while (r.i < tokens.length && tokens[r.i].toUpperCase() === "AND") {
      const right = parseNot(tokens, r.i + 1);
      r = { node: { kind: "bin", op: "AND", left: r.node, right: right.node }, i: right.i };
    }
    return r;
  }
  function parseNot(tokens, i) {
    if (tokens[i] && tokens[i].toUpperCase() === "NOT") {
      const r = parseNot(tokens, i + 1);
      return { node: { kind: "not", expr: r.node }, i: r.i };
    }
    return parseCmp(tokens, i);
  }
  function parseCmp(tokens, i) {
    let r = parsePrimary(tokens, i);
    if (r.i >= tokens.length) return r;
    let negate = false, op = null;
    const up = tokens[r.i].toUpperCase();
    if (up === "=" || up === "!=" || up === "<>" || up === ">" || up === "<" || up === ">=" || up === "<=") { op = tokens[r.i]; r.i++; }
    else if (up === "LIKE") { op = "LIKE"; r.i++; }
    else if (up === "IN") { op = "IN"; r.i++; }
    else if (up === "IS") {
      r.i++;
      if (tokens[r.i] && tokens[r.i].toUpperCase() === "NOT") { negate = true; r.i++; }
      if (tokens[r.i] && tokens[r.i].toUpperCase() === "NULL") { return { node: { kind: "isnull", expr: r.node, negate: negate }, i: r.i + 1 }; }
      throw new Error("IS must be followed by NULL");
    }
    else if (up === "BETWEEN") {
      r.i++;
      const lo = parsePrimary(tokens, r.i);
      const hi = parsePrimary(tokens, lo.i + (tokens[lo.i] && tokens[lo.i].toUpperCase() === "AND" ? 1 : 0));
      return { node: { kind: "between", expr: r.node, lo: lo.node, hi: hi.node, negate: false }, i: hi.i };
    }
    else return r;

    if (op === "IN") {
      if (tokens[r.i] !== "(") throw new Error("IN expects ( list )");
      r.i++;
      const list = [];
      while (tokens[r.i] !== ")") {
        const e = parsePrimary(tokens, r.i);
        list.push(e.node);
        r.i = e.i;
        if (tokens[r.i] === ",") r.i++;
      }
      return { node: { kind: "in", expr: r.node, list, negate: negate }, i: r.i + 1 };
    }
    const right = parsePrimary(tokens, r.i);
    return { node: { kind: "bin", op, left: r.node, right: right.node }, i: right.i };
  }
  function parsePrimary(tokens, i) {
    const t = tokens[i];
    if (t === undefined) throw new Error("Unexpected end of expression");
    const up = t.toUpperCase();
    if (t === "(") {
      const inner = parseExpr(tokens, i + 1);
      if (tokens[inner.i] !== ")") throw new Error("Missing )");
      return { node: inner.node, i: inner.i + 1 };
    }
    if (t === "*") return { node: { kind: "star" }, i: i + 1 };
    if (t[0] === "'" || t[0] === '"') {
      return { node: { kind: "lit", value: t.slice(1, -1).replace(/''/g, "'") }, i: i + 1 };
    }
    const n = num(t);
    if (!isNaN(n)) return { node: { kind: "lit", value: n }, i: i + 1 };
    if (up === "TRUE") return { node: { kind: "lit", value: true }, i: i + 1 };
    if (up === "FALSE") return { node: { kind: "lit", value: false }, i: i + 1 };
    if (up === "NULL") return { node: { kind: "lit", value: null }, i: i + 1 };
    if (isWord(t)) {
      const next = tokens[i + 1];
      const isFn = next === "(" && ["COUNT", "SUM", "AVG", "MIN", "MAX", "ROUND", "ABS", "LOWER", "UPPER"].includes(up);
      if (isFn) {
        const args = [];
        let j = i + 2;
        let distinct = false;
        if (tokens[j] && tokens[j].toUpperCase() === "DISTINCT") { distinct = true; j++; }
        while (tokens[j] !== ")") {
          const e = parseExpr(tokens, j);
          args.push(e.node);
          j = e.i;
          if (tokens[j] === ",") j++;
        }
        return { node: { kind: "fn", fn: up, distinct, args }, i: j + 1 };
      }
      // column, maybe qualified table.col
      let name = t.toLowerCase();
      let j = i + 1;
      if (tokens[j] === ".") {
        const col = tokens[j + 1];
        return { node: { kind: "col", table: name, name: col.toLowerCase() }, i: j + 2 };
      }
      return { node: { kind: "col", name }, i: i + 1 };
    }
    throw new Error("Unexpected token: " + t);
  }
  function parseColumnList(tokens, i, stopWords) {
    const cols = [];
    while (i < tokens.length) {
      const e = parseExpr(tokens, i);
      i = e.i;
      let alias = null;
      if (tokens[i] && tokens[i].toUpperCase() === "AS") { alias = tokens[i + 1]; i += 2; }
      else if (tokens[i] && isWord(tokens[i]) && !KEYWORDS.has(tokens[i].toUpperCase())) { alias = tokens[i]; i++; }
      cols.push({ expr: e.node, alias: alias ? alias.toLowerCase() : null });
      if (tokens[i] === ",") { i++; continue; }
      break;
    }
    return { cols, i };
  }
  function parseSelect(sql) {
    const tokens = tokenize(sql).filter(t => t !== ";");
    let i = 0;
    if (!tokens[i] || tokens[i].toUpperCase() !== "SELECT") throw new Error("Only SELECT queries are supported in the sandbox");
    i++;
    let distinct = false;
    if (tokens[i] && tokens[i].toUpperCase() === "DISTINCT") { distinct = true; i++; }
    const sel = parseColumnList(tokens, i, ["FROM"]);
    i = sel.i;
    if (!tokens[i] || tokens[i].toUpperCase() !== "FROM") throw new Error("Expected FROM");
    i++;
    if (!tokens[i]) throw new Error("Missing table name");
    const from = tokens[i].toLowerCase(); i++;
    let where = null;
    if (tokens[i] && tokens[i].toUpperCase() === "WHERE") { const w = parseExpr(tokens, i + 1); where = w.node; i = w.i; }
    let groupBy = [];
    if (tokens[i] && tokens[i].toUpperCase() === "GROUP") {
      if (tokens[i + 1] && tokens[i + 1].toUpperCase() === "BY") {
        i += 2;
        const gl = parseColumnList(tokens, i);
        groupBy = gl.cols;
        i = gl.i;
      }
    }
    if (tokens[i] && tokens[i].toUpperCase() === "HAVING") throw new Error("HAVING is not supported in the sandbox");
    let orderBy = [];
    if (tokens[i] && tokens[i].toUpperCase() === "ORDER") {
      if (tokens[i + 1] && tokens[i + 1].toUpperCase() === "BY") {
        i += 2;
        while (i < tokens.length) {
          const e = parseExpr(tokens, i);
          i = e.i;
          let desc = false;
          if (tokens[i] && tokens[i].toUpperCase() === "DESC") { desc = true; i++; }
          else if (tokens[i] && tokens[i].toUpperCase() === "ASC") { i++; }
          orderBy.push({ expr: e.node, desc });
          if (tokens[i] === ",") { i++; continue; }
          break;
        }
      }
    }
    let limit = null;
    if (tokens[i] && tokens[i].toUpperCase() === "LIMIT") {
      limit = parseInt(tokens[i + 1], 10);
      if (isNaN(limit)) throw new Error("LIMIT expects a number");
      i += 2;
    }
    if (tokens[i]) throw new Error("Unexpected token after query: " + tokens[i]);
    return { columns: sel.cols, from, where, groupBy, orderBy, limit, distinct };
  }

  /* ============ evaluation ============ */
  const AGG = { SUM: 1, COUNT: 1, AVG: 1, MIN: 1, MAX: 1 };
  function resolveCol(row, col) {
    if (col.table && col.table !== row._table) return undefined;
    const k = col.name;
    if (row._data && Object.prototype.hasOwnProperty.call(row._data, k)) return row._data[k];
    if (Object.prototype.hasOwnProperty.call(row, k)) return row[k];
    const low = Object.keys(row).find(ck => ck.toLowerCase() === k);
    return low !== undefined ? row[low] : undefined;
  }
  function evalExpr(node, row, aggCtx) {
    switch (node.kind) {
      case "lit": return node.value;
      case "col": return resolveCol(row, node);
      case "fn": {
        if (AGG[node.fn]) {
          if (!aggCtx) throw new Error(node.fn + " requires GROUP BY context or is nested incorrectly");
          return aggCtx(node.fn, node.args[0], node.distinct);
        }
        const vals = node.args.map(a => evalExpr(a, row, aggCtx));
        if (node.fn === "ROUND") return Math.round(vals[0] * Math.pow(10, vals[1] || 0)) / Math.pow(10, vals[1] || 0);
        if (node.fn === "ABS") return Math.abs(vals[0]);
        if (node.fn === "LOWER") return String(vals[0]).toLowerCase();
        if (node.fn === "UPPER") return String(vals[0]).toUpperCase();
        throw new Error("Unknown function " + node.fn);
      }
      case "bin": {
        if (node.op === "AND") return !!evalExpr(node.left, row, aggCtx) && !!evalExpr(node.right, row, aggCtx);
        if (node.op === "OR") return !!evalExpr(node.left, row, aggCtx) || !!evalExpr(node.right, row, aggCtx);
        if (node.op === "LIKE") { return like(evalExpr(node.left, row, aggCtx), evalExpr(node.right, row, aggCtx)); }
        const l = evalExpr(node.left, row, aggCtx), r = evalExpr(node.right, row, aggCtx);
        switch (node.op) {
          case "=": return l == r; case "!=": case "<>": return l != r;
          case ">": return l > r; case "<": return l < r;
          case ">=": return l >= r; case "<=": return l <= r;
        }
        throw new Error("Unknown operator " + node.op);
      }
      case "not": return !evalExpr(node.expr, row, aggCtx);
      case "in": {
        const v = evalExpr(node.expr, row, aggCtx);
        const hit = node.list.some(x => v == evalExpr(x, row, aggCtx));
        return node.negate ? !hit : hit;
      }
      case "between": {
        const v = evalExpr(node.expr, row, aggCtx);
        return v >= evalExpr(node.lo, row, aggCtx) && v <= evalExpr(node.hi, row, aggCtx);
      }
      case "isnull": {
        const v = evalExpr(node.expr, row, aggCtx);
        return node.negate ? v !== null && v !== undefined : v === null || v === undefined;
      }
    }
    throw new Error("Bad expression");
  }
  function like(val, pat) {
    const re = new RegExp("^" + String(pat).replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/%/g, ".*").replace(/_/g, ".") + "$", "i");
    return re.test(String(val));
  }
  function exprLabel(node) {
    if (node.kind === "col") return node.name;
    if (node.kind === "fn") return node.fn + "(" + node.args.map(exprLabel).join(", ") + ")";
    if (node.kind === "lit") return String(node.value);
    return "expr";
  }
  function containsAgg(node) {
    if (node.kind === "fn" && AGG[node.fn]) return true;
    if (node.args) return node.args.some(containsAgg);
    if (node.left && containsAgg(node.left)) return true;
    if (node.right && containsAgg(node.right)) return true;
    if (node.expr) return containsAgg(node.expr);
    if (node.list) return node.list.some(containsAgg);
    if (node.lo && containsAgg(node.lo)) return true;
    if (node.hi && containsAgg(node.hi)) return true;
    return false;
  }

  function run(sql) {
    const q = parseSelect(sql);
    const rows = TABLES[q.from];
    if (!rows) throw new Error("Unknown table: " + q.from + " (available: " + Object.keys(TABLES).join(", ") + ")");
    const t0 = Date.now();

    if (q.columns.some(c => c.expr.kind === "star")) {
      const allCols = Object.keys(rows[0] || {}).filter(k => !k.startsWith("_"));
      const expanded = [];
      q.columns.forEach(c => {
        if (c.expr.kind === "star") allCols.forEach(k => expanded.push({ expr: { kind: "col", name: k }, alias: null }));
        else expanded.push(c);
      });
      q.columns = expanded;
    }

    const implicitGroup = q.groupBy.length === 0 && q.columns.some(c => containsAgg(c.expr));
    if (implicitGroup) {
      const filtered = rows.filter(r => !q.where || evalExpr(q.where, Object.assign(r, { _table: q.from }), null));
      const groups = [filtered];
      const headers = q.columns.map(c => c.alias || exprLabel(c.expr));
      const outRows = groups.map(grp => {
        const aggFn = (fn, arg, distinct) => {
          const st = { sum: 0, cnt: 0, cntD: new Set(), min: Infinity, max: -Infinity, started: false };
          for (const rr of grp) {
            const av = arg && arg.kind === "star" ? 1 : evalExpr(arg, rr, null);
            st.started = true;
            if (av === 1 && arg && arg.kind === "star") { if (fn === "COUNT") { distinct ? st.cntD.add(1) : st.cnt++; } continue; }
            if (av === null || av === undefined) continue;
            if (fn === "COUNT") { if (distinct) st.cntD.add(String(av)); else st.cnt++; }
            else { st.sum += av; st.cnt++; if (av < st.min) st.min = av; if (av > st.max) st.max = av; }
          }
          switch (fn) {
            case "COUNT": return distinct ? st.cntD.size : st.cnt;
            case "SUM": return st.sum; case "AVG": return st.cnt ? st.sum / st.cnt : null;
            case "MIN": return st.started ? st.min : null; case "MAX": return st.started ? st.max : null;
          }
          return null;
        };
        return q.columns.map(c => containsAgg(c.expr) ? evalExpr(c.expr, grp[0], aggFn) : evalExpr(c.expr, grp[0], null));
      });
      const ms = Date.now() - t0;
      return { headers, rows: outRows, scanned: filtered.length, ms };
    }

    const filtered = rows.filter(r => !q.where || evalExpr(q.where, Object.assign(r, { _table: q.from }), null));

    let outRows, headers;
    if (q.groupBy.length) {
      const groups = new Map();
      for (const r of filtered) {
        const ctx = Object.assign(r, { _table: q.from });
        const key = q.groupBy.map(g => String(evalExpr(g.expr, ctx, null))).join("¦");
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push(ctx);
      }
      headers = q.columns.map(c => c.alias || exprLabel(c.expr));
      const extraKeys = q.groupBy.filter(g => !headers.includes(exprLabel(g.expr)));
      const extraLabels = extraKeys.map(g => exprLabel(g.expr));
      headers = extraLabels.concat(headers);

      outRows = [];
      for (const grp of groups.values()) {
        const aggFn = (fn, arg, distinct) => {
          const st = { sum: 0, cnt: 0, cntD: new Set(), min: Infinity, max: -Infinity, started: false };
          for (const rr of grp) {
            const av = arg && arg.kind === "star" ? 1 : evalExpr(arg, rr, null);
            st.started = true;
            if (av === 1 && arg && arg.kind === "star") { if (fn === "COUNT") { distinct ? st.cntD.add(1) : st.cnt++; } continue; }
            if (av === null || av === undefined) continue;
            if (fn === "COUNT") { if (distinct) st.cntD.add(String(av)); else st.cnt++; }
            else { st.sum += av; st.cnt++; if (av < st.min) st.min = av; if (av > st.max) st.max = av; }
          }
          switch (fn) {
            case "COUNT": return distinct ? st.cntD.size : st.cnt;
            case "SUM": return st.sum; case "AVG": return st.cnt ? st.sum / st.cnt : null;
            case "MIN": return st.started ? st.min : null; case "MAX": return st.started ? st.max : null;
          }
          return null;
        };
        const vals = [];
        extraKeys.forEach(g => vals.push(evalExpr(g.expr, grp[0], null)));
        q.columns.forEach(c => vals.push(containsAgg(c.expr) ? evalExpr(c.expr, grp[0], aggFn) : evalExpr(c.expr, grp[0], null)));
        outRows.push(vals);
      }
    } else {
      headers = q.columns.map(c => c.alias || exprLabel(c.expr));
      outRows = filtered.map(r => {
        const ctx = Object.assign(r, { _table: q.from });
        return q.columns.map(c => evalExpr(c.expr, ctx, null));
      });
    }

    if (q.orderBy.length) {
      outRows.sort((a, b) => {
        for (const ob of q.orderBy) {
          const lbl = exprLabel(ob.expr);
          const idx = headers.indexOf(lbl);
          if (idx < 0) continue;
          const va = a[idx], vb = b[idx];
          if (va === vb || (va === undefined && vb === undefined)) continue;
          if (va === undefined || va === null) return 1;
          if (vb === undefined || vb === null) return -1;
          const cmp = va < vb ? -1 : va > vb ? 1 : 0;
          return ob.desc ? -cmp : cmp;
        }
        return 0;
      });
    }
    if (q.distinct) {
      const seen = new Set();
      outRows = outRows.filter(o => { const k = JSON.stringify(o); if (seen.has(k)) return false; seen.add(k); return true; });
    }
    const limit = q.limit === null ? 100 : q.limit;
    outRows = outRows.slice(0, Math.min(limit, 200));

    const ms = Date.now() - t0;
    return { headers, rows: outRows, scanned: filtered.length, ms };
  }

  /* ============ UI ============ */
  function render() {
    document.getElementById("content").innerHTML = `
      <div class="card full">
        <h3>Run a query</h3>
        <div class="sub">Browser sandbox - SELECT only, no warehouse cost. Pick a template or write your own.</div>
        <div class="sqlbox">
          <div class="qbar">
            <select id="q-samples" onchange="ZQ_PAGE_loadSample()"></select>
            <button onclick="ZQ_PAGE_run()">Run (▶)</button>
          </div>
          <textarea id="q-text" spellcheck="false"></textarea>
        </div>
      </div>
      <div class="card full">
        <h3>Results</h3>
        <div class="sub">Scanned rows, elapsed time and output</div>
        <div class="result-meta" id="q-meta"></div>
        <div class="table-wrap" id="q-result" style="margin-top:8px"></div>
        <div id="q-error"></div>
      </div>`;
    const sel = document.getElementById("q-samples");
    sel.innerHTML = SAMPLE_QUERIES.map((s, i) => `<option value="${i}">${s[0]}</option>`).join("");
    loadSample(0);
  }
  function loadSample(i) {
    document.getElementById("q-text").value = SAMPLE_QUERIES[i][1];
  }
  function runUI() {
    const sql = document.getElementById("q-text").value.trim();
    const errEl = document.getElementById("q-error");
    const resEl = document.getElementById("q-result");
    const metaEl = document.getElementById("q-meta");
    errEl.innerHTML = ""; metaEl.innerHTML = "";
    try {
      const out = run(sql);
      metaEl.innerHTML = `Scanned <b>${out.scanned.toLocaleString()}</b> rows in <b>${out.ms}ms</b> · returned <b>${out.rows.length}</b> rows`;
      if (!out.rows.length) { resEl.innerHTML = `<p style="color:var(--muted)">No rows returned.</p>`; return; }
      resEl.innerHTML = `<table><thead><tr>${out.headers.map(h => `<th>${h}</th>`).join("")}</tr></thead>
        <tbody>${out.rows.slice(0, 100).map(r => `<tr>${r.map(v => `<td>${v === null ? "<span style='color:var(--muted)'>NULL</span>" : typeof v === "number" ? Z.fmt(v, 2) : String(v)}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
    } catch (e) {
      errEl.innerHTML = `<div class="error-box">SQL error: ${e.message}</div>`;
    }
  }

  window.ZQ_PAGE_run = runUI;
  window.ZQ_PAGE_loadSample = function () { loadSample(+document.getElementById("q-samples").value); };
  window.ZQ_SQL = { run, TABLES, parseSelect };

  function init() {
    Z.setPage("playground", "SQL Playground", "Run certified BigQuery patterns against seeded demo tables - right here in your browser.");
    render();
  }
  document.addEventListener("DOMContentLoaded", init);
})();
