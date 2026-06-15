import { Suspense } from "react";
import { SettingsScreen } from "./SettingsScreen";
import { ErrorBoundary } from "@/app/components/ErrorBoundary";

export default function SettingsPage() {
  return (
    <ErrorBoundary>
      <Suspense fallback={null}>
        <SettingsScreen />
      </Suspense>
    </ErrorBoundary>
  );
}
