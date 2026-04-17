import { Suspense } from "react";

import { TrackerHome } from "@/components/tracker/tracker-home";

export default function TrackerPage() {
  return (
    <Suspense fallback={<div className="paper-panel h-[520px] animate-pulse rounded-[32px] border border-line bg-paper/60" />}>
      <TrackerHome />
    </Suspense>
  );
}
