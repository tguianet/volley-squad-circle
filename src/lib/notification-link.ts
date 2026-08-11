export const MAX_NOTIFICATION_LINK_LENGTH = 500;

const INTERNAL_NOTIFICATION_LINK_PATTERN = /^\/[A-Za-z0-9/_.$-]*$/;

function hasControlCharacters(value: string): boolean {
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code <= 0x1f || code === 0x7f) return true;
  }
  return false;
}

export function isSafeNotificationLink(url: string | null | undefined): boolean {
  if (!url) return true;
  if (url.length > MAX_NOTIFICATION_LINK_LENGTH) return false;
  if (!url.startsWith("/")) return false;
  if (url.startsWith("//")) return false;
  if (/^[a-z]+:/i.test(url)) return false;
  if (/\\/.test(url)) return false;
  if (hasControlCharacters(url)) return false;
  return INTERNAL_NOTIFICATION_LINK_PATTERN.test(url);
}
