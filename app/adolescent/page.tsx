import { Suspense } from "react";
import { AdolescentPrototype } from "./AdolescentPrototype";
import { ErrorBoundary } from "@/app/components/ErrorBoundary";

export default function AdolescentPage() {
  return (
    <ErrorBoundary>
      <Suspense fallback={null}>
        <AdolescentPrototype />
      </Suspense>
    </ErrorBoundary>
  );
}
