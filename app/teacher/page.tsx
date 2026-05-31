import { Suspense } from "react";
import { TeacherDashboard } from "./TeacherDashboard";
import { ErrorBoundary } from "@/app/components/ErrorBoundary";

export default function TeacherPage() {
  return (
    <ErrorBoundary>
      <Suspense fallback={null}>
        <TeacherDashboard />
      </Suspense>
    </ErrorBoundary>
  );
}
