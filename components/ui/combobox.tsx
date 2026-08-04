"use client";

import * as React from "react";
import { Check, ChevronsUpDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";

export interface ComboboxOption {
  value: string;
  label: string;
  meta?: string;
}

interface ComboboxProps {
  options: ComboboxOption[];
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  emptyText?: string;
  className?: string;
}

export function Combobox({ options, value, onChange, placeholder = "Select…", emptyText = "No matches", className }: ComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const selected = options.find((o) => o.value === value);

  const filtered = options.filter((o) => o.label.toLowerCase().includes(query.toLowerCase()));

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" aria-expanded={open} className={cn("w-full justify-between font-normal", className)}>
          <span className={cn("truncate", !selected && "text-muted-foreground")}>{selected ? selected.label : placeholder}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <div className="flex items-center gap-2 border-b border-border px-3">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search…"
            className="h-9 border-0 bg-transparent shadow-none focus-visible:ring-0"
          />
        </div>
        <ScrollArea className="max-h-60">
          <div className="p-1">
            {filtered.length === 0 ? (
              <div className="px-2 py-4 text-center text-sm text-muted-foreground">{emptyText}</div>
            ) : (
              filtered.map((o) => (
                <button
                  key={o.value}
                  onClick={() => {
                    onChange(o.value);
                    setOpen(false);
                    setQuery("");
                  }}
                  className={cn(
                    "flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-muted",
                    value === o.value && "bg-muted"
                  )}
                >
                  <span className="flex min-w-0 flex-col items-start">
                    <span className="truncate">{o.label}</span>
                    {o.meta ? <span className="truncate text-[11px] text-muted-foreground">{o.meta}</span> : null}
                  </span>
                  {value === o.value ? <Check className="h-4 w-4 shrink-0 text-primary" /> : null}
                </button>
              ))
            )}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
