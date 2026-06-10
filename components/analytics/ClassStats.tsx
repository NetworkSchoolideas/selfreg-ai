"use client";

interface ClassDistribution {
  className: string;
  count: number;
}

interface ClassStatsProps {
  data: ClassDistribution[];
  title?: string;
}

export default function ClassStats({ data, title = "Распределение по классам" }: ClassStatsProps) {
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

  const maxCount = Math.max(...data.map(d => d.count));

  return (
    <div style={{
      padding: 24,
      background: "white",
      borderRadius: 12,
      boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
    }}>
      <h3 style={{ fontSize: 18, marginBottom: 24 }}>{title}</h3>

      <div style={{ display: "flex", alignItems: "flex-end", gap: 16, height: 200, paddingTop: 20 }}>
        {data.map((item, index) => {
          const heightPercent = (item.count / maxCount) * 100;
          const colors = [
            "#4f46e5", "#10b981", "#f59e0b", "#ef4444",
            "#8b5cf6", "#ec4899", "#06b6d4", "#84cc16"
          ];
          const color = colors[index % colors.length];

          return (
            <div key={item.className} style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              minHeight: 0,
            }}>
              <div style={{
                fontSize: 12,
                fontWeight: 600,
                marginBottom: 8,
                color: "#374151",
              }}>
                {item.count}
              </div>
              <div style={{
                width: "100%",
                height: `${heightPercent}%`,
                minHeight: 20,
                background: color,
                borderRadius: "8px 8px 0 0",
                transition: "height 0.3s ease",
              }} />
              <div style={{
                marginTop: 8,
                fontSize: 12,
                color: "#6b7280",
                textAlign: "center",
                wordBreak: "break-word",
              }}>
                {item.className}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}