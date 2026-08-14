export function validateGigaChatKey(key: string): boolean {
  try {
    const decoded = atob(key.trim());
    const parts = decoded.split(":");
    return parts.length === 2 && parts[0].length > 0 && parts[1].length > 0;
  } catch {
    return false;
  }
}
