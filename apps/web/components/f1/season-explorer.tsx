"use client";

import dynamic from "next/dynamic";
import { SeasonMatrixFallback } from "@/components/f1/season-matrix-fallback";
import type { SeasonPayload } from "@/lib/f1-types";

const LandscapeClient = dynamic(
  () => import("@/components/f1/season-landscape.client").then((module) => module.SeasonLandscapeClient),
  {
    ssr: false,
  },
);

export function SeasonExplorer({ data, target }: { data: SeasonPayload; target: string }) {
  return (
    <>
      <div className="hidden md:block">
        <LandscapeClient data={data} target={target} />
      </div>
      <div className="md:hidden">
        <SeasonMatrixFallback data={data} target={target} />
      </div>
    </>
  );
}
