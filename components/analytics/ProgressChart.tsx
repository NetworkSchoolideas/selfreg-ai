"use client";

interface ProgressStats {
  totalSessions: number;
  completedSessions: number;
  averageScore?: number;
  lastActivity?: string;
}

interface ProgressChartProps {
  data: ProgressStats[];
  title?: string;
}

export default function ProgressChart({ data, title = "Прогресс учеников" }: ProgressChartProps) {
  if (!data || data.length === 0) {
    return (
      <div style={{
        padding: 24,
        background: "white",
        borderRadius: 12,
        boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
      }}>
        <h3 style={{ fontSize: 18, marginBottom: 16 }}>{title}</h3>
        <div style={{ textAlign: "center", padding: 40, color: "#6b7280" }}>
          Нет данных для отображения
        </div>
      </div>
    );
  }

  const maxSessions = Math.max(...data.map(d => d.totalSessions), 1);

  return (
    <div style={{
      padding: 24,
      background: "white",
      borderRadius: 12,
      boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
    }}>
      <h3 style={{ fontSize: 18, marginBottom: 24 }}>{title}</h3>

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {data.slice(0, 10).map((item, index) => {
          const progressPercent = (item.completedSessions / item.totalSessions) * 100;
          const colors = [
            "#4f46e5", "#10b981", "#f59e0b", "#ef4444",
            "#8b5cf6", "#ec4899", "#06b6d4", "#84cc16",
            "#f97316", "#0ea5e9"
          ];
          const color = colors[index % colors.length];

          return (
            <div key={index} style={{
              padding: 16,
              background: "#f9fafb",
              borderRadius: 8,
              border: "1px solid #e5e7eb",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <div style={{ fontSize: 14, fontWeight: 500, color: "#374151" }}>
                  Ученик {index + 1}
                </div>
                <div style={{ fontSize: 12, color: "#6b7280" }}>
                  {item.completedSessions}/{item.totalSessions} сессий
                </div>
              </div>

              <div style={{
                height: 8,
                background: "#e5e7eb",
                borderRadius: 4,
                overflow: "hidden",
                marginBottom: 8,
              }}>
                <div style={{
                  width: `${progressPercent}%`,
                  height: "100%",
                  background: color,
                  borderRadius: 4,
                  transition: "width 0.3s ease",
                }} />
              </div>

              <div style={{ display: "flex", gap: 16, fontSize: 12, color: "#6b7280" }}>
                {item.averageScore !== undefined && (
                  <div>
                    <span style={{ color: "#10b981", fontWeight: 600 }}>
                      {item.averageScore.toFixed(1)}
                    </span>
                    {" "}средний балл
                  </div>
                )}
                {item.lastActivity && (
                  <div>
                    Последняя активность:{" "}
                    {new Date(item.lastActivity).toLocaleDateString("ru-RU")}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {data.length > 10 && (
        <div style={{
          marginTop: 16,
          textAlign: "center",
          padding: 12,
          background: "#f3f4f6",
          borderRadius: 8,
          color: "#6b7280",
          fontSize: 14,
        }}>
          Показано 10 из {data.length} учеников
        </div>
      )}
    </div>
  );
}