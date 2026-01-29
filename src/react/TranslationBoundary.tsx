import { type ReactNode, Suspense } from "react";

interface TranslationBoundaryProps {
  fallback?: ReactNode;
  children: ReactNode;
}

export function TranslationBoundary({
  fallback,
  children,
}: TranslationBoundaryProps) {
  return (
    <Suspense fallback={fallback ?? null}>
      {children}
    </Suspense>
  );
}
