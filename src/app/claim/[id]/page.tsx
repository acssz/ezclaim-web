import { Suspense } from "react";
import ClientPage from "./ClientPage";

export function generateStaticParams() {
  return [];
}

export default function Page() {
  return (
    <Suspense fallback={null}>
      <ClientPage />
    </Suspense>
  );
}
