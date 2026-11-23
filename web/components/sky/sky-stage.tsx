"use client";

import { lazy, Suspense, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import type { Sky } from "@/lib/sky";

// Loaded only after hydration: WebGL has nothing to render on the server, and a server bailout
// (next/dynamic with ssr: false) inside a streamed Suspense boundary breaks React's streaming in dev.
const Constellation = lazy(() => import("@/components/sky/constellation"));
const noop = () => () => {};

function Loading() {
  return (
    <div className="grid h-full w-full place-items-center">
      <span className="text-sm text-night-muted">Memuat langit kohort...</span>
    </div>
  );
}

function ClientSky(props: React.ComponentProps<typeof Constellation>) {
  const mounted = useSyncExternalStore(noop, () => true, () => false);
  if (!mounted) return <Loading />;
  return (
    <Suspense fallback={<Loading />}>
      <Constellation {...props} />
    </Suspense>
  );
}

/** Landing hero: the demo cohort sky, drifting with the pointer, labels as plain text. */
export function HeroSky({ sky, wide }: { sky: Sky; wide: boolean }) {
  return <ClientSky sky={sky} wide={wide} drift />;
}

/** X-Ray panel: each constellation label opens the worklist filtered to that archetype. */
export function XRaySky({ sky }: { sky: Sky }) {
  const router = useRouter();
  return <ClientSky sky={sky} wide={false} onCluster={(a) => router.push(`/prioritas?archetype=${a}`)} />;
}
