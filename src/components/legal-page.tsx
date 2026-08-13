import { Link } from "@tanstack/react-router";
import { ArrowLeft, Waves } from "lucide-react";
import type { ReactNode } from "react";

export function LegalPage({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <div className="min-h-svh bg-background">
      <header className="border-b border-border/60 bg-card">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4">
          <Link to="/" className="flex items-center gap-2" aria-label="Ir para o PlayBeach">
            <span className="flex size-9 items-center justify-center rounded-xl gradient-beach">
              <Waves className="size-5 text-white" aria-hidden="true" />
            </span>
            <span className="font-display text-xl">PlayBeach</span>
          </Link>
          <Link
            to="/"
            className="inline-flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm font-semibold text-primary hover:bg-primary/10"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            Voltar
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8 sm:py-12">
        <header className="mb-8 border-b border-border/60 pb-6">
          <h1 className="text-3xl sm:text-4xl">{title}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{description}</p>
          <p className="mt-3 text-xs text-muted-foreground">Atualizado em 13 de agosto de 2026.</p>
        </header>
        <article className="space-y-7 text-sm leading-7 text-foreground/85">{children}</article>
      </main>
    </div>
  );
}

export function LegalSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="text-xl text-foreground">{title}</h2>
      {children}
    </section>
  );
}
