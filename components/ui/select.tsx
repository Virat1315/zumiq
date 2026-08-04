"use client";

import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SelectOption {
  value: string;
  label: string;
  group?: string;
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  options: SelectOption[];
  placeholder?: string;
}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, options, placeholder, value, ...props }, ref) => {
    const groups = Array.from(new Set(options.map((o) => o.group).filter(Boolean)));
    return (
      <div className="relative">
        <select
          ref={ref}
          value={value}
          className={cn(
            "flex h-9 w-full appearance-none rounded-md border border-input bg-background px-3 pr-8 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
            !value && "text-muted-foreground",
            className
          )}
          {...props}
        >
          {placeholder ? <option value="" disabled>{placeholder}</option> : null}
          {groups.length === 0
            ? options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)
            : groups.map((g) => (
                <optgroup key={g} label={g}>
                  {options.filter((o) => o.group === g).map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </optgroup>
              ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      </div>
    );
  }
);
Select.displayName = "Select";

export { Select };
