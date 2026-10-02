import type { ReactNode } from "react";
import { ClubBrand } from "@/components/ClubBrand";

export function FormShell({ kicker, title, children }: { kicker: string; title: string; children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <header className="stripe-bg bg-pitch text-pitch-foreground">
        <div className="mx-auto max-w-xl px-5 pb-8 pt-6">
          <ClubBrand compact className="text-pitch-foreground" />
          <p className="mt-6 font-display text-sm uppercase tracking-widest text-accent">{kicker}</p>
          <h1 className="font-display text-4xl font-bold uppercase leading-none">{title}</h1>
        </div>
      </header>
      <main className="mx-auto max-w-xl px-5 py-6">{children}</main>
    </div>
  );
}

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-5 rounded-lg border border-border bg-card p-5">
      <h2 className="border-b border-border pb-2 font-display text-sm font-semibold uppercase tracking-widest text-muted-foreground">{title}</h2>
      {children}
    </section>
  );
}
