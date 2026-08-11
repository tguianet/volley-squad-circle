export type AsyncQueryPhase = "loading" | "error" | "empty" | "content";

export type AsyncQueryPhaseInput = {
  isLoading: boolean;
  isError: boolean;
  isEmpty: boolean;
};

export function resolveAsyncQueryPhase(input: AsyncQueryPhaseInput): AsyncQueryPhase {
  if (input.isLoading) return "loading";
  if (input.isError) return "error";
  if (input.isEmpty) return "empty";
  return "content";
}
