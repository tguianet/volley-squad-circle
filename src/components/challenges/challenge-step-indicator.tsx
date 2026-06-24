import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  step: number;
};

export function ChallengeStepIndicator({ step }: Props) {
  return (
    <div className="mb-6 flex items-center gap-1 sm:gap-2">
      {[1, 2, 3, 4, 5].map((n) => (
        <div key={n} className="flex flex-1 items-center gap-1 sm:gap-2">
          <div
            className={cn(
              "size-8 sm:size-9 shrink-0 rounded-full grid place-items-center text-sm font-bold transition-all shadow-sm",
              step > n
                ? "bg-primary text-primary-foreground"
                : step === n
                  ? "bg-primary text-primary-foreground ring-4 ring-primary/20"
                  : "bg-muted text-muted-foreground",
            )}
          >
            {step > n ? <Check className="size-4" strokeWidth={3} /> : n}
          </div>
          {n < 5 && (
            <div
              className={cn(
                "h-1 flex-1 rounded-full transition-colors",
                step > n ? "bg-primary" : "bg-muted",
              )}
            />
          )}
        </div>
      ))}
    </div>
  );
}
