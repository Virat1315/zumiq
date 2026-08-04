// Enterprise-wide search across datasets, columns, KPIs, incidents, glossary,
// pipelines, products, DQ rules and dashboards.

import { DATASETS, getKpis, INCIDENTS, GLOSSARY, PRODUCTS, DQ_RULES } from "./enterprise";
import { seedData } from "./core";

export interface SearchResult {
  type: string;
  title: string;
  subtitle: string;
  href: string;
  snippet?: string;
  score: number;
}

function scoreMatch(text: string, q: string): number {
  const low = text.toLowerCase();
  const ql = q.toLowerCase();
  if (low === ql) return 100;
  if (low.startsWith(ql)) return 80;
  if (low.includes(ql)) return 60;
  const words = ql.split(/\s+/).filter(Boolean);
  const hits = words.filter((w) => low.includes(w)).length;
  return words.length ? (hits / words.length) * 45 : 0;
}

export function searchAll(q: string, limit = 40): SearchResult[] {
  const query = q.trim();
  if (!query) return [];
  const out: SearchResult[] = [];
  const push = (r: SearchResult) => {
    if (r.score > 0) out.push(r);
  };

  DATASETS.forEach((d) => {
    const s = Math.max(
      scoreMatch(d.name, query),
      scoreMatch(d.description, query),
      scoreMatch(d.domain, query),
      scoreMatch(d.owner, query)
    );
    push({ type: "dataset", title: d.name, subtitle: `${d.layer} · ${d.domain} · owner ${d.owner}`, href: `/catalog?d=${d.id}`, snippet: d.description, score: s });
    d.columns.forEach((c) => {
      const cs = Math.max(scoreMatch(c.name, query), scoreMatch(c.meaning, query));
      push({ type: "column", title: c.name, subtitle: `${d.name}`, href: `/catalog?d=${d.id}#col-${c.name}`, snippet: c.meaning, score: cs * 0.9 });
    });
  });

  getKpis().forEach((k) => {
    const s = Math.max(scoreMatch(k.name, query), scoreMatch(k.metric, query), scoreMatch(k.dataset, query));
    push({ type: "kpi", title: k.name, subtitle: `${k.aggregation}(${k.metric}) · ${k.timeWindow}`, href: "/kpis", snippet: k.sql, score: s });
  });

  INCIDENTS.forEach((i) => {
    const s = Math.max(scoreMatch(i.title, query), scoreMatch(i.rootCause, query), scoreMatch(i.id, query), scoreMatch(i.businessImpact, query));
    push({ type: "incident", title: i.id + " · " + i.title, subtitle: `${i.severity} · ${i.status}`, href: "/incidents", snippet: i.businessImpact, score: s });
  });

  GLOSSARY.forEach((g) => {
    const s = Math.max(scoreMatch(g.term, query), scoreMatch(g.definition, query), scoreMatch(g.synonyms.join(" "), query));
    push({ type: "glossary", title: g.term, subtitle: "Certified metric", href: "/governance#glossary", snippet: g.definition, score: s });
  });

  PRODUCTS.forEach((p) => {
    const s = Math.max(scoreMatch(p.name, query), scoreMatch(p.description, query), scoreMatch(p.domain, query));
    push({ type: "product", title: p.name, subtitle: `Marketplace · ${p.domain}`, href: "/marketplace", snippet: p.description, score: s });
  });

  DQ_RULES.forEach((r) => {
    const s = Math.max(scoreMatch(r.name, query), scoreMatch(r.dataset, query), scoreMatch(r.type, query));
    push({ type: "rule", title: r.name, subtitle: `${r.type} · ${r.dataset}`, href: "/quality", snippet: r.params + " (" + r.threshold + ")", score: s });
  });

  const d = seedData();
  const pipeNames = Array.from(new Set(d.pipelines.map((p) => p.pipeline)));
  pipeNames.forEach((p) => {
    const s = scoreMatch(p, query);
    push({ type: "pipeline", title: p, subtitle: "Pipeline", href: "/pipelines?p=" + encodeURIComponent(p), snippet: "Batch / streaming load", score: s });
  });

  const dashboards = [
    { name: "Executive Overview", url: "/", desc: "Platform health, KPIs, alerts, incidents" },
    { name: "Cloud Cost", url: "/cost", desc: "Query cost, storage, optimization" },
    { name: "Data Quality", url: "/quality", desc: "DQ engine, rules, scores" },
    { name: "Incident Center", url: "/incidents", desc: "Incidents, SLAs, root cause" },
  ];
  dashboards.forEach((db) => {
    const s = Math.max(scoreMatch(db.name, query), scoreMatch(db.desc, query));
    push({ type: "dashboard", title: db.name, subtitle: "Dashboard", href: db.url, snippet: db.desc, score: s });
  });

  return out.filter((r) => r.score > 0).sort((a, b) => b.score - a.score).slice(0, limit);
}
