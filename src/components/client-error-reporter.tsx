import { useEffect } from "react";
import { reportLovableError } from "@/lib/lovable-error-reporting";

export function ClientErrorReporter() {
  useEffect(() => {
    const onError = (event: ErrorEvent) => {
      reportLovableError(event.error ?? new Error(event.message), {
        boundary: "window_error",
      });
    };
    const onUnhandledRejection = (event: PromiseRejectionEvent) => {
      reportLovableError(event.reason, { boundary: "unhandled_rejection" });
    };

    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onUnhandledRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onUnhandledRejection);
    };
  }, []);

  return null;
}
