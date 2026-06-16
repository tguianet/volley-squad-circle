/** Path stored in DB for private Supabase Storage buckets (not a public URL). */
export function isStoragePath(value: string | null | undefined): value is string {
  if (!value) return false;
  const trimmed = value.trim();
  if (!trimmed || trimmed === "null" || trimmed === "undefined") return false;
  return !/^https?:\/\//i.test(trimmed);
}

export function normalizeProfileHandle(value: string): string {
  try {
    return decodeURIComponent(value).trim();
  } catch {
    return value.trim();
  }
}

export function isMissingRpcError(message: string): boolean {
  return (
    message.includes("Could not find the function") ||
    message.includes("function public.") ||
    message.includes("does not exist")
  );
}
