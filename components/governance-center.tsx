"use client";

import * as React from "react";
import { Search, FileText, Trash2, ShieldAlert, KeyRound, BadgeCheck, Lock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { POLICIES, RETENTION, CLASSIFICATIONS, PII_TAGS, GLOSSARY, getAuditLog } from "@/lib/data/enterprise";
import { timeAgo } from "@/lib/utils";

const CATEGORY_ICON: Record<string, React.ReactNode> = {
  RETENTION: <Trash2 className="h-3.5 w-3.5" />,
  CLASSIFICATION: <ShieldAlert className="h-3.5 w-3.5" />,
  PII: <KeyRound className="h-3.5 w-3.5" />,
  ACCESS: <Lock className="h-3.5 w-3.5" />,
  CERTIFICATION: <BadgeCheck className="h-3.5 w-3.5" />,
  DELETION: <Trash2 className="h-3.5 w-3.5" />,
};

const CLASS_COLOR: Record<string, "success" | "secondary" | "warning" | "destructive"> = {
  success: "success",
  default: "secondary",
  warning: "warning",
  destructive: "destructive",
};

const TABS = [
  { id: "policies", label: "Policies" },
  { id: "retention", label: "Retention" },
  { id: "classification", label: "Classification" },
  { id: "glossary", label: "Glossary" },
  { id: "audit", label: "Audit log" },
];

export function GovernanceCenter() {
  const [tab, setTab] = React.useState("policies");
  const [glossaryQuery, setGlossaryQuery] = React.useState("");
  const audit = getAuditLog();

  const glossary = GLOSSARY.filter((g) => !glossaryQuery || (g.term + g.definition + g.synonyms.join(" ")).toLowerCase().includes(glossaryQuery.toLowerCase()));

  return (
    <div className="space-y-4">
      <Tabs tabs={TABS} active={tab} onChange={setTab} />

      {tab === "policies" ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {POLICIES.map((p) => (
            <Card key={p.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">{CATEGORY_ICON[p.category]}</span>
                    <div>
                      <div className="text-sm font-semibold">{p.title}</div>
                      <div className="font-mono text-[10px] text-muted-foreground">{p.id} · {p.category}</div>
                    </div>
                  </div>
                  <Badge variant={p.status === "ACTIVE" ? "success" : "warning"}>{p.status}</Badge>
                </div>
                <p className="mt-3 text-xs text-muted-foreground">{p.summary}</p>
                <div className="mt-3 border-t border-border/60 pt-2 text-[11px] text-muted-foreground">
                  Owner {p.owner} · reviewed {p.lastReviewed}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : null}

      {tab === "retention" ? (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Layer</TableHead>
                  <TableHead>Hot tier</TableHead>
                  <TableHead>Cold tier</TableHead>
                  <TableHead>Expire after</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {RETENTION.map((r) => (
                  <TableRow key={r.layer}>
                    <TableCell className="font-mono text-xs font-semibold">{r.layer}</TableCell>
                    <TableCell className="text-xs">{r.hot}</TableCell>
                    <TableCell className="text-xs">{r.cold}</TableCell>
                    <TableCell className="text-xs">{r.expireAfter}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{r.notes}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : null}

      {tab === "classification" ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Card>
            <CardContent className="p-4">
              <div className="text-sm font-semibold">Classification labels</div>
              <div className="mt-3 flex flex-col gap-2">
                {CLASSIFICATIONS.map((c) => (
                  <div key={c.label} className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2.5">
                    <div>
                      <Badge variant={CLASS_COLOR[c.color]}>{c.label}</Badge>
                      <div className="mt-1 text-xs text-muted-foreground">{c.description}</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-sm font-semibold">PII tags in use</div>
              <p className="mt-1 text-xs text-muted-foreground">Columns carrying these tags are masked by default for non-owners and access is gated via IAM.</p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {PII_TAGS.map((t) => (
                  <Badge key={t} variant="destructive"><KeyRound className="h-3 w-3" /> {t}</Badge>
                ))}
              </div>
              <div className="mt-4 rounded-lg border border-border/60 bg-muted/30 px-3 py-2.5 text-xs text-muted-foreground">
                <FileText className="mb-1 h-4 w-4 text-primary" />
                Policy POL-02 (PII handling) requires every PII column to be tagged at registration. Coverage is enforced by the catalog.
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {tab === "glossary" ? (
        <Card>
          <CardContent className="p-4">
            <div className="mb-3 relative max-w-sm">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input value={glossaryQuery} onChange={(e) => setGlossaryQuery(e.target.value)} placeholder="Search certified terms…" className="pl-8 text-xs" />
            </div>
            <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
              {glossary.map((g) => (
                <div key={g.term} className="rounded-lg border border-border/60 px-3 py-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-xs font-semibold">{g.term}</span>
                    <div className="flex items-center gap-1.5">
                      {g.synonyms.slice(0, 2).map((s) => <Badge key={s} variant="outline">{s}</Badge>)}
                      {g.certified ? <Badge variant="success">certified</Badge> : null}
                    </div>
                  </div>
                  <p className="mt-1.5 text-xs text-muted-foreground">{g.definition}</p>
                  <div className="mt-1.5 font-mono text-[10.5px] text-muted-foreground/80">{g.formula}</div>
                  <div className="mt-1 text-[10px] text-muted-foreground/60">Owner · {g.owner}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : null}

      {tab === "audit" ? (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Actor</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Resource</TableHead>
                  <TableHead>Details</TableHead>
                  <TableHead>IP</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {audit.slice(0, 24).map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-mono text-[11px]">{a.id}</TableCell>
                    <TableCell className="text-xs">{a.at.slice(0, 16).replace("T", " ")}</TableCell>
                    <TableCell className="font-mono text-[11px]">{a.actor}</TableCell>
                    <TableCell className="text-xs">{a.action}</TableCell>
                    <TableCell className="font-mono text-[11px]">{a.resource}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{a.details}</TableCell>
                    <TableCell className="font-mono text-[11px] text-muted-foreground">{a.ip}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
