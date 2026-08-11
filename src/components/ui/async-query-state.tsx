import type { ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { resolveAsyncQueryPhase } from "@/lib/async-query-phase";

export type AsyncQueryStateProps = {
  isLoading: boolean;
  isError: boolean;
  isEmpty: boolean;
  emptyLabel: string;
  errorLabel: string;
  loadingLabel?: string;
  onRetry?: () => void;
  retryLabel?: string;
  devContext?: string;
  devError?: unknown;
  children: ReactNode;
};

export function AsyncQueryState({
  isLoading,
  isError,
  isEmpty,
  emptyLabel,
  errorLabel,
  loadingLabel = "Carregando…",
  onRetry,
  retryLabel = "Tentar novamente",
  devContext,
  devError,
  children,
}: AsyncQueryStateProps) {
  const phase = resolveAsyncQueryPhase({ isLoading, isError, isEmpty });

  if (phase === "loading") {
    return (
      <div className="flex justify-center py-8" role="status" aria-live="polite">
        <Loader2 className="size-5 animate-spin text-muted-foreground" aria-hidden />
        <span className="sr-only">{loadingLabel}</span>
      </div>
    );
  }

  if (phase === "error") {
    if (import.meta.env.DEV && devError !== undefined) {
      console.error(devContext ? `[${devContext}]` : "[AsyncQueryState]", devError);
    }
    return (
      <div className="text-center py-4 space-y-3" role="alert">
        <p className="text-sm text-muted-foreground">{errorLabel}</p>
        {onRetry ? (
          <Button type="button" size="sm" variant="outline" onClick={onRetry}>
            {retryLabel}
          </Button>
        ) : null}
      </div>
    );
  }

  if (phase === "empty") {
    return <p className="text-sm text-muted-foreground text-center py-4">{emptyLabel}</p>;
  }

  return <>{children}</>;
}
