import * as React from "react";
import { TrendingDown, TrendingUp, Minus, type LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Sparkline } from "@/components/ui/charts";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: string;
  icon: LucideIcon;
  delta?: number;
  deltaSuffix?: string;
  deltaGood?: boolean;
  spark?: number[];
  sparkColor?: string;
  hint?: string;
  className?: string;
}

export function StatCard({ label, value, icon: Icon, delta, deltaSuffix = "%", deltaGood, spark, sparkColor = "#34d399", hint, className }: StatCardProps) {
  const dir = delta === undefined ? 0 : delta > 0 ? 1 : delta < 0 ? -1 : 0;
  return (
    <Card className={cn("relative overflow-hidden p-4", className)}>
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-primary/0 via-primary/60 to-primary/0" />
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            <Icon className="h-3.5 w-3.5 text-primary" />
            {label}
          </div>
          <div className="mt-1.5 truncate text-2xl font-semibold tracking-tight tabular">{value}</div>
          {delta !== undefined && dir !== 0 ? (
            <div className={cn("mt-1 flex items-center gap-1 text-xs font-medium", deltaGood === undefined ? "text-muted-foreground" : deltaGood ? "text-success" : "text-destructive")}>
              {dir > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              {Math.abs(delta).toFixed(1)}{deltaSuffix}
              <span className="text-muted-foreground">{hint ?? "vs prior"}</span>
            </div>
          ) : hint ? (
            <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
              <Minus className="h-3 w-3" /> {hint}
            </div>
          ) : null}
        </div>
        {spark && spark.length > 0 ? (
          <Sparkline data={spark} color={sparkColor} width={110} height={40} />
        ) : null}
      </div>
    </Card>
  );
}
