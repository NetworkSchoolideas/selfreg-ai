import type { ChildProfile } from "@/types/session";

export function getChildDisplayName(child: ChildProfile, fallback = "Student"): string {
  const trimmedName = child.name?.trim();
  if (trimmedName) {
    return trimmedName;
  }

  return child.id || fallback;
}

export function getChildTechnicalLabel(child: ChildProfile): string {
  return child.id;
}

export function childMatchesQuery(child: ChildProfile, query: string): boolean {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) {
    return true;
  }

  return [
    child.id,
    child.name,
    child.realData?.fio,
    child.realData?.klass,
  ]
    .filter((value): value is string => Boolean(value))
    .some((value) => value.toLowerCase().includes(normalizedQuery));
}
