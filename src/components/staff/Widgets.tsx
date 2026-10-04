import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function Panel({ title, action, children, className }: { title: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cn("rounded-lg border border-border bg-card p-4", className)}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="font-display text-sm font-semibold uppercase tracking-widest text-muted-foreground">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export function Kpi({ label, value, sub, tone, className }: { label: string; value: ReactNode; sub?: string | undefined; tone?: "ok" | "warn" | "bad" | undefined; className?: string | undefined }) {
  return (
    <div className={cn("rounded-lg border border-border bg-card p-4", className)}>
      <div className="font-display text-xs uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className={cn("mt-1 font-display text-4xl font-bold leading-none",
        tone === "ok" && "text-success", tone === "warn" && "text-warning", tone === "bad" && "text-destructive")}>{value}</div>
      {sub && <div className="mt-1 text-xs text-muted-foreground">{sub}</div>}
    </div>
  );
}

export function RangeSelect({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <Select value={String(value)} onValueChange={(v) => onChange(Number(v))}>
      <SelectTrigger className="w-36 bg-card"><SelectValue /></SelectTrigger>
      <SelectContent>
        {[7, 14, 28, 56].map((d) => <SelectItem key={d} value={String(d)}>Últimos {d} días</SelectItem>)}
      </SelectContent>
    </Select>
  );
}

export function StatusPill({ status, children }: { status: "ok" | "high" | "low" | "none" | "bad" | "warn"; children: ReactNode }) {
  return (
    <span className={cn("inline-flex rounded-full px-2 py-0.5 text-xs font-semibold",
      status === "ok" && "bg-success/15 text-success",
      (status === "high" || status === "bad") && "bg-destructive/15 text-destructive",
      (status === "low" || status === "warn") && "bg-warning/20 text-foreground",
      status === "none" && "bg-muted text-muted-foreground")}>{children}</span>
  );
}

export const chartTooltipStyle = {
  background: "var(--card)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  fontSize: 12,
};
