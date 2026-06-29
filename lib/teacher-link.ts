import { withLang, type AppLang } from "@/lib/app-i18n";

const TEACHER_CODE_PATTERN = /^[A-Za-zА-Яа-я]\d{6,}$/;

export interface TeacherLinkContext {
  teacherIdFromUrl?: string;
  teacherCodeFromUrl?: string;
}

export function resolveTeacherLinkContext(rawTeacherParam?: string | null): TeacherLinkContext {
  const value = rawTeacherParam?.trim();
  if (!value) {
    return {};
  }

  if (TEACHER_CODE_PATTERN.test(value)) {
    return { teacherCodeFromUrl: value };
  }

  return { teacherIdFromUrl: value };
}

export function buildAdolescentPrototypeHref(childId: string, lang: AppLang): string {
  return withLang(`/adolescent?childId=${encodeURIComponent(childId)}`, lang);
}
