import type { AppLang } from "@/lib/app-i18n";
import type { ChildProfile, Session } from "@/types/session";

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

export function getStudentDashboardMetrics(profile: ChildProfile): StudentDashboardMetrics {
  const completedSessions = profile.sessions.filter((session) => session.status === "completed" || Boolean(session.finalNote?.trim()));
  const inProgressSessions = profile.sessions.filter(
    (session) => session.status === "in_progress" || (!session.finalNote?.trim() && (session.records?.length ?? 0) > 0),
  );
  const latestSession = [...profile.sessions].sort((left, right) => {
    return new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime();
  })[0] ?? null;

  return {
    completedSessions,
    inProgressSessions,
    totalSessions: completedSessions.length + inProgressSessions.length,
    latestSession,
  };
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
