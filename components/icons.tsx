import {
  LayoutGrid, Target, ShieldCheck, Upload, Workflow, Siren, Bell, Database,
  TerminalSquare, Store, CreditCard, Scale, Sparkles, SlidersHorizontal, BarChart3,
  type LucideIcon,
} from "lucide-react";

const NAV_ICONS: Record<string, LucideIcon> = {
  layout: LayoutGrid,
  target: Target,
  shield: ShieldCheck,
  upload: Upload,
  workflow: Workflow,
  alert: Siren,
  bell: Bell,
  database: Database,
  terminal: TerminalSquare,
  store: Store,
  credit: CreditCard,
  scale: Scale,
  sparkles: Sparkles,
  sliders: SlidersHorizontal,
  chart: BarChart3,
};

export function navIcon(name: string): LucideIcon {
  return NAV_ICONS[name] || LayoutGrid;
}
