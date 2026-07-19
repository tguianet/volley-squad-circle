// Guarded PWA registration. Never registers in dev, iframe, or Lovable
// preview hosts. Supports ?sw=off kill switch.

const SW_URL = "/sw.js";

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

export function registerPwa() {
  if (typeof window === "undefined") return;
  if (!("serviceWorker" in navigator)) return;

  if (isPreviewOrDev()) {
    void unregisterMatching();
    return;
  }

  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register(SW_URL, { scope: "/" })
      .then((registration) => {
        // Auto-update: check on load and every hour.
        registration.update().catch(() => {});
        setInterval(() => registration.update().catch(() => {}), 60 * 60 * 1000);

        registration.addEventListener("updatefound", () => {
          const nw = registration.installing;
          if (!nw) return;
          nw.addEventListener("statechange", () => {
            if (nw.state === "installed" && navigator.serviceWorker.controller) {
              nw.postMessage("SKIP_WAITING");
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
  });
}
