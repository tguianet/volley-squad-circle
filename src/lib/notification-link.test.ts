import { describe, expect, it } from "vitest";
import { isSafeNotificationLink } from "@/lib/notification-link";

describe("isSafeNotificationLink", () => {
  it("aceita rotas internas", () => {
    expect(isSafeNotificationLink("/")).toBe(true);
    expect(isSafeNotificationLink("/notificacoes")).toBe(true);
    expect(isSafeNotificationLink(null)).toBe(true);
  });

  it("rejeita links externos ou protocol-relative", () => {
    expect(isSafeNotificationLink("https://evil.test")).toBe(false);
    expect(isSafeNotificationLink("//evil.test")).toBe(false);
    expect(isSafeNotificationLink("javascript:alert(1)")).toBe(false);
  });

  it("rejeita barra invertida, controle e valores malformados", () => {
    expect(isSafeNotificationLink("/\\evil")).toBe(false);
    expect(isSafeNotificationLink("/path\nbreak")).toBe(false);
    expect(isSafeNotificationLink("/path with spaces")).toBe(false);
    expect(isSafeNotificationLink(`/${"a".repeat(500)}`)).toBe(false);
  });
});
