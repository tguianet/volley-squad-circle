// Guarded PWA registration. Never registers in dev, iframe, or Lovable
// preview hosts. Supports ?sw=off kill switch.

const SW_URL = "/sw.js";
export const PWA_UPDATE_AVAILABLE_EVENT = "pwa:update-available";

function isPreviewOrDev(): boolean {
  if (typeof window === "undefined") return true;
  if (import.meta.env && !import.meta.env.PROD) return true;
  try {
    if (window.self !== window.top) return true;
  } catch {
    return true;
  }
  const host = window.location.hostname;
  const previewHosts = [
    host.startsWith("id-preview--"),
    host.startsWith("preview--"),
    host === "lovableproject.com",
    host.endsWith(".lovableproject.com"),
    host === "lovableproject-dev.com",
    host.endsWith(".lovableproject-dev.com"),
    host === "beta.lovable.dev",
    host.endsWith(".beta.lovable.dev"),
  ];
  if (previewHosts.some(Boolean)) return true;
  if (new URL(window.location.href).searchParams.get("sw") === "off") return true;
  return false;
}

function notifyUpdateAvailable(): void {
  window.dispatchEvent(new Event(PWA_UPDATE_AVAILABLE_EVENT));
}

async function unregisterMatching() {
  if (!("serviceWorker" in navigator)) return;
  const regs = await navigator.serviceWorker.getRegistrations();
  await Promise.all(
    regs
      .filter((r) => {
        const url = r.active?.scriptURL || r.installing?.scriptURL || r.waiting?.scriptURL || "";
        return url.endsWith(SW_URL);
      })
      .map((r) => r.unregister()),
  );
}

export async function applyPwaUpdate(): Promise<boolean> {
  if (!("serviceWorker" in navigator)) return false;

  const registration = await navigator.serviceWorker.getRegistration("/");
  if (!registration?.waiting) return false;

  registration.waiting.postMessage("SKIP_WAITING");
  return true;
}

export function registerPwa() {
  if (typeof window === "undefined") return;
  if (!("serviceWorker" in navigator)) return;

  if (isPreviewOrDev()) {
    void unregisterMatching();
    return;
  }

  const startRegistration = () => {
    navigator.serviceWorker
      .register(SW_URL, { scope: "/", updateViaCache: "none" })
      .then((registration) => {
        registration.update().catch(() => {});
        setInterval(() => registration.update().catch(() => {}), 60 * 60 * 1000);

        if (registration.waiting && navigator.serviceWorker.controller) {
          notifyUpdateAvailable();
        }

        registration.addEventListener("updatefound", () => {
          const nextWorker = registration.installing;
          if (!nextWorker) return;

          nextWorker.addEventListener("statechange", () => {
            if (nextWorker.state === "installed" && navigator.serviceWorker.controller) {
              notifyUpdateAvailable();
            }
          });
        });
      })
      .catch(() => {});

    let refreshing = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    });
  };

  // Hydration may finish after the load event, especially on iOS. In that
  // case, waiting for another load event would leave the PWA unregistered.
  if (document.readyState === "complete") {
    startRegistration();
  } else {
    window.addEventListener("load", startRegistration, { once: true });
  }
}
