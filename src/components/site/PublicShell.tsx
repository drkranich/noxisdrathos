import type { ReactNode } from "react";
import { SiteHeader, SiteFooter } from "./SiteHeader";
import { AnnouncementBar } from "./AnnouncementBar";

export function PublicShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <AnnouncementBar />
      <SiteHeader />
      <main className="flex-1 pt-24">{children}</main>
      <SiteFooter />
    </div>
  );
}

export function PageHeader({
  eyebrow,
  title,
  lead,
}: {
  eyebrow: string;
  title: string;
  lead?: string;
}) {
  return (
    <section className="mx-auto max-w-[1400px] px-6 md:px-10 pt-16 pb-20">
      <p className="font-mono text-[10px] uppercase tracking-[0.32em] text-muted-foreground">
        <span className="neon-dot mr-2 inline-block align-middle" />
        {eyebrow}
      </p>
      <h1 className="font-display mt-6 text-5xl md:text-7xl leading-[0.95] text-balance max-w-4xl">
        {title}
      </h1>
      {lead ? (
        <p className="mt-8 max-w-2xl text-base md:text-lg text-muted-foreground leading-relaxed">
          {lead}
        </p>
      ) : null}
    </section>
  );
}
