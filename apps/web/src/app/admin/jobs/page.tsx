"use client";

import { Suspense } from "react";
import AdminJobsPageInner from "./jobs-inner";

export default function AdminJobsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-300">
          Loading jobs…
        </div>
      }
    >
      <AdminJobsPageInner />
    </Suspense>
  );
}
