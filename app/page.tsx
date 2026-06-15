import { Suspense } from "react";
import { HomeClient } from "./HomeClient";
import { ErrorBoundary } from "@/app/components/ErrorBoundary";

export default function HomePage() {
  return (
    <ErrorBoundary>
      <Suspense fallback={null}>
        <HomeClient />
      </Suspense>
    </ErrorBoundary>
  );
}
