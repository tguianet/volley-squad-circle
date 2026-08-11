import { describe, expect, it } from "vitest";
import { resolveAsyncQueryPhase } from "@/lib/async-query-phase";

describe("resolveAsyncQueryPhase", () => {
  it("prioriza carregamento", () => {
    expect(resolveAsyncQueryPhase({ isLoading: true, isError: true, isEmpty: true })).toBe(
      "loading",
    );
  });

  it("expoe erro antes de vazio", () => {
    expect(resolveAsyncQueryPhase({ isLoading: false, isError: true, isEmpty: true })).toBe(
      "error",
    );
  });

  it("mostra vazio somente apos sucesso sem dados", () => {
    expect(resolveAsyncQueryPhase({ isLoading: false, isError: false, isEmpty: true })).toBe(
      "empty",
    );
  });

  it("mostra conteudo quando ha dados", () => {
    expect(resolveAsyncQueryPhase({ isLoading: false, isError: false, isEmpty: false })).toBe(
      "content",
    );
  });
});

describe("retry apos erro", () => {
  it("permite nova tentativa quando fase deixa de ser erro", () => {
    const failed = resolveAsyncQueryPhase({
      isLoading: false,
      isError: true,
      isEmpty: true,
    });
    const retrying = resolveAsyncQueryPhase({
      isLoading: true,
      isError: false,
      isEmpty: true,
    });
    const success = resolveAsyncQueryPhase({
      isLoading: false,
      isError: false,
      isEmpty: false,
    });

    expect(failed).toBe("error");
    expect(retrying).toBe("loading");
    expect(success).toBe("content");
  });
});
