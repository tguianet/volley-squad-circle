import { describe, expect, it } from "vitest";
import {
  isSafeNotificationLink,
  isValidCommentContent,
  normalizeCommentContent,
} from "@/lib/feed-validation";

describe("normalizeCommentContent", () => {
  it("rejeita vazio ou somente espacos", () => {
    expect(normalizeCommentContent("")).toBeNull();
    expect(normalizeCommentContent("   ")).toBeNull();
  });

  it("aceita conteudo valido", () => {
    expect(normalizeCommentContent("  Boa partida!  ")).toBe("Boa partida!");
  });

  it("limita tamanho maximo", () => {
    const long = "a".repeat(1005);
    expect(normalizeCommentContent(long)?.length).toBe(1000);
  });
});

describe("isValidCommentContent", () => {
  it("valida conteudo util", () => {
    expect(isValidCommentContent("Legal")).toBe(true);
    expect(isValidCommentContent("   ")).toBe(false);
  });
});

describe("isSafeNotificationLink", () => {
  it("aceita rotas internas", () => {
    expect(isSafeNotificationLink("/")).toBe(true);
    expect(isSafeNotificationLink("/notificacoes")).toBe(true);
    expect(isSafeNotificationLink("/perfil/joao")).toBe(true);
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
    expect(isSafeNotificationLink("a".repeat(501))).toBe(false);
  });
});
