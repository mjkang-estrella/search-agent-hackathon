import { Suspense } from "react";
import { RunLayout } from "@/components/run-layout";

// Route params are read on the client, so the boundary lets the shell stream in after prerendering.
export default function Layout({ children }: LayoutProps<"/r/[runId]">) {
  return (
    <Suspense>
      <RunLayout>{children}</RunLayout>
    </Suspense>
  );
}
