import { TrackerShell } from "@/components/tracker/tracker-shell";

export default function TrackerLayout({ children }: { children: React.ReactNode }) {
  return <TrackerShell>{children}</TrackerShell>;
}
