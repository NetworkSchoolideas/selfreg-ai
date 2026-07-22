import type { AppLang } from "@/lib/app-i18n";
import { isAnswerRecord } from "@/lib/session-helpers";
import type { ChildProfile, Session, SessionStatus } from "@/types/session";

const ABANDONED_AFTER_DAYS = 30;

export interface StudentDashboardMetrics {
  completedSessions: Session[];
  inProgressSessions: Session[];
  totalSessions: number;
  latestSession: Session | null;
}

export interface StudentDashboardStatus {
  tone: "neutral" | "progress" | "active";
  title: string;
  description: string;
}

export interface LatestCompletedSessionNextAction {
  session: Session;
  action: string;
}

export function isSessionArchivedForStudent(session: Session): boolean {
  return Boolean(session.studentArchivedAt);
}

/**
 * Sessions explicitly hidden by the learner and stale unfinished attempts are
 * both omitted from the learner's dashboard. The latter remains a derived
 * view: it does not mutate the session, delete it, or affect teacher access.
 */
export function isSessionHiddenFromStudentDashboard(session: Session, now = new Date()): boolean {
  return isSessionArchivedForStudent(session) || getEffectiveSessionStatus(session, now) === "abandoned";
}

export function isSessionAbandoned(session: Session, now = new Date()): boolean {
  if (session.status === "completed" || Boolean(session.finalNote?.trim())) {
    return false;
  }

  const updatedAt = new Date(session.updatedAt).getTime();
  if (!Number.isFinite(updatedAt)) {
    return false;
  }

  const ageMs = now.getTime() - updatedAt;
  return ageMs >= ABANDONED_AFTER_DAYS * 24 * 60 * 60 * 1000;
}

export function getEffectiveSessionStatus(session: Session, now = new Date()): SessionStatus {
  if (session.status === "completed" || Boolean(session.finalNote?.trim())) {
    return "completed";
  }

  if (session.status === "abandoned" || isSessionAbandoned(session, now)) {
    return "abandoned";
  }

  if ((session.records?.length ?? 0) === 0 || session.status === "draft") {
    return "draft";
  }

  return "in_progress";
}

export function getStudentDashboardMetrics(profile: ChildProfile, now = new Date()): StudentDashboardMetrics {
  const visibleSessions = profile.sessions.filter((session) => !isSessionHiddenFromStudentDashboard(session, now));
  const completedSessions = visibleSessions.filter((session) => getEffectiveSessionStatus(session, now) === "completed");
  const inProgressSessions = visibleSessions.filter(
    (session) => getEffectiveSessionStatus(session, now) === "in_progress",
  );
  const latestSession = [...visibleSessions].sort((left, right) => {
    return new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime();
  })[0] ?? null;

  return {
    completedSessions,
    inProgressSessions,
    totalSessions: visibleSessions.length,
    latestSession,
  };
}

/**
 * Returns the learner's own adjustment from their newest completed session.
 *
 * The dashboard does not generate or reinterpret an action here: it only
 * surfaces the saved answer from stage 5 (adjustment), and keeps content from
 * another dashboard language out of the current view.
 */
export function getLatestCompletedSessionNextAction(
  profile: ChildProfile,
  lang: AppLang,
): LatestCompletedSessionNextAction | null {
  const completedSessions = profile.sessions
    .filter((session) => !isSessionHiddenFromStudentDashboard(session))
    .filter((session) => getEffectiveSessionStatus(session) === "completed")
    .filter((session) => !session.lang || session.lang === lang)
    .sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime());

  for (const session of completedSessions) {
    const adjustment = [...session.records]
      .reverse()
      .find((record) => record.stageId === "5" && isAnswerRecord(record) && record.answer.trim());

    if (adjustment) {
      return {
        session,
        action: adjustment.answer.trim(),
      };
    }
  }

  return null;
}

/**
 * Returns the newest active session that can be resumed from the current
 * dashboard language. A session without an id cannot be resumed safely, so it
 * remains available in history without becoming the top-level resume action.
 */
export function getLatestResumableStudentSession(
  profile: ChildProfile,
  lang: AppLang,
  now = new Date(),
): Session | null {
  return profile.sessions
    .filter((session) => Boolean(session.sessionId))
    .filter((session) => !isSessionHiddenFromStudentDashboard(session, now))
    .filter((session) => getEffectiveSessionStatus(session, now) === "in_progress")
    .filter((session) => !session.lang || session.lang === lang)
    .sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime())[0] ?? null;
}

export function getStudentDashboardStatus(profile: ChildProfile, metrics: StudentDashboardMetrics, lang: AppLang): StudentDashboardStatus {
  if (metrics.inProgressSessions.length > 0) {
    return lang === "en"
      ? {
          tone: "active",
          title: "Session in progress",
          description: `You have ${metrics.inProgressSessions.length} unfinished session${metrics.inProgressSessions.length > 1 ? "s" : ""}. Continue the current work so the result is saved in your history.`,
        }
      : {
          tone: "active",
          title: "Сессия в процессе",
          description: `У вас ${metrics.inProgressSessions.length} незавершенн${metrics.inProgressSessions.length > 1 ? "ых сессии" : "ая сессия"}. Продолжите работу, чтобы результат сохранился в истории.`,
        };
  }

  if (metrics.completedSessions.length > 0) {
    return lang === "en"
      ? {
          tone: "progress",
          title: "Progress saved",
          description: "Completed sessions are available in your history. You can start a new cycle when you are ready for the next situation.",
        }
      : {
          tone: "progress",
          title: "Прогресс сохранен",
          description: "Завершенные сессии уже доступны в истории. Когда появится новая ситуация, можно начать следующий цикл.",
        };
  }

  return lang === "en"
    ? {
        tone: "neutral",
        title: "Ready for the first session",
        description: profile.teacherId
          ? "Your profile is already linked to a teacher. Start the first session and the results will appear here automatically."
          : "Start the first session to create your learning history and keep the results in one place.",
      }
    : {
        tone: "neutral",
        title: "Готово к первой сессии",
        description: profile.teacherId
          ? "Ваш профиль уже привязан к педагогу. Начните первую сессию, и результаты появятся здесь автоматически."
          : "Начните первую сессию, чтобы появилась история прохождения и сохранились результаты.",
      };
}
