"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import ClassStats from "@/components/analytics/ClassStats";
import ProgressChart from "@/components/analytics/ProgressChart";

interface Child {
  id: string;
  name: string;
  className: string;
  createdAt: string;
  lastSessionDate?: string;
  totalSessions: number;
}

function getInitialTeacherId(): string | null {
  if (typeof window === "undefined") return null;
  const params = new URLSearchParams(window.location.search);
  return params.get("teacherId") ?? sessionStorage.getItem("teacher_id");
}

export default function TeacherDashboardPage() {
  const router = useRouter();
  const [children, setChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const teacherId = useState<string | null>(getInitialTeacherId)[0];

  useEffect(() => {
    if (teacherId) {
      sessionStorage.setItem("teacher_id", teacherId);
    }
  }, [teacherId]);

  useEffect(() => {
    if (!teacherId) return;

    const loadChildren = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/children?teacherId=${teacherId}`);
        const data = await response.json();
        
        if (data.ok) {
          setChildren(data.children || []);
        } else {
          setError(data.error || "Failed to load children");
        }
      } catch (err) {
        console.error("Failed to connect to server:", err);
        setError("Failed to connect to server");
      } finally {
        setLoading(false);
      }
    };

    loadChildren();
  }, [teacherId]);

  if (!teacherId) {
    return (
      <div style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#f3f4f6",
        padding: 20,
      }}>
        <div style={{
          background: "white",
          padding: 32,
          borderRadius: 12,
          boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
          textAlign: "center",
        }}>
          <h2 style={{ fontSize: 20, marginBottom: 16 }}>Teacher ID not found</h2>
          <p style={{ color: "#6b7280", marginBottom: 24 }}>
            Please register as a teacher first.
          </p>
          <Link
            href="/teacher/register"
            style={{
              padding: "12px 24px",
              background: "#4f46e5",
              color: "white",
              borderRadius: 8,
              textDecoration: "none",
              fontWeight: 500,
            }}
          >
            Register as Teacher
          </Link>
        </div>
      </div>
    );
  }

  const totalStudents = children.length;
  const totalSessions = children.reduce((sum, child) => sum + (child.totalSessions || 0), 0);
  const classes = [...new Set(children.map(c => c.className))];

  // Prepare analytics data
  const classDistribution = classes.map(className => ({
    className,
    count: children.filter(c => c.className === className).length,
  }));

  const progressData = children.map(child => ({
    totalSessions: child.totalSessions || 0,
    completedSessions: child.totalSessions || 0,
    lastActivity: child.lastSessionDate || child.createdAt,
  }));

  return (
    <div style={{ minHeight: "100vh", background: "#f3f4f6", padding: 20 }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <header style={{ marginBottom: 32 }}>
          <h1 style={{ fontSize: 28, marginBottom: 8 }}>Teacher Dashboard</h1>
          <p style={{ color: "#6b7280" }}>Manage students and view analytics</p>
        </header>

        <Link href="/teacher" style={{ padding: "12px 24px", background: "#4f46e5", color: "white", borderRadius: 8, textDecoration: "none", fontWeight: 500, display: "inline-block", marginBottom: 32 }}>
          Back
        </Link>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20, marginBottom: 32 }}>
          <div style={{ background: "white", padding: 24, borderRadius: 12, boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
            <div style={{ fontSize: 14, color: "#6b7280", marginBottom: 8 }}>Total Students</div>
            <div style={{ fontSize: 36, fontWeight: "bold" }}>{totalStudents}</div>
          </div>
          <div style={{ background: "white", padding: 24, borderRadius: 12, boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
            <div style={{ fontSize: 14, color: "#6b7280", marginBottom: 8 }}>Total Sessions</div>
            <div style={{ fontSize: 36, fontWeight: "bold" }}>{totalSessions}</div>
          </div>
          <div style={{ background: "white", padding: 24, borderRadius: 12, boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
            <div style={{ fontSize: 14, color: "#6b7280", marginBottom: 8 }}>Classes</div>
            <div style={{ fontSize: 36, fontWeight: "bold" }}>{classes.length}</div>
          </div>
        </div>

        <div style={{ display: "grid", gap: 24, marginBottom: 32 }}>
          <ClassStats data={classDistribution} />
          <ProgressChart data={progressData} />
        </div>

        <div style={{ background: "white", borderRadius: 12, boxShadow: "0 1px 3px rgba(0,0,0,0.1)", padding: 24 }}>
          <h2 style={{ fontSize: 20, marginBottom: 16 }}>Students List</h2>

          {loading && <div style={{ textAlign: "center", padding: 40, color: "#6b7280" }}>Loading...</div>}

          {error && <div style={{ padding: 16, background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, color: "#dc2626" }}>{error}</div>}

          {!loading && !error && children.length === 0 && <div style={{ textAlign: "center", padding: 40, color: "#6b7280" }}>No students registered yet</div>}

          {!loading && !error && children.length > 0 && (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "2px solid #e5e7eb" }}>
                  <th style={{ textAlign: "left", padding: 12, fontWeight: 600 }}>Name</th>
                  <th style={{ textAlign: "left", padding: 12, fontWeight: 600 }}>Class</th>
                  <th style={{ textAlign: "left", padding: 12, fontWeight: 600 }}>Sessions</th>
                  <th style={{ textAlign: "left", padding: 12, fontWeight: 600 }}>Last Session</th>
                  <th style={{ textAlign: "left", padding: 12, fontWeight: 600 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {children.map((child) => (
                  <tr key={child.id} style={{ borderBottom: "1px solid #e5e7eb" }}>
                    <td style={{ padding: 12 }}>{child.name}</td>
                    <td style={{ padding: 12 }}>{child.className}</td>
                    <td style={{ padding: 12 }}>{child.totalSessions}</td>
                    <td style={{ padding: 12 }}>{child.lastSessionDate || "-"}</td>
                    <td style={{ padding: 12 }}>
                      <Link href={`/teacher/dashboard/child?childId=${child.id}`} style={{ color: "#4f46e5", textDecoration: "none", fontWeight: 500 }}>
                        View Details
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}