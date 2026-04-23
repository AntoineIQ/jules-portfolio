"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

const visitedPaths = new Set<string>();

export function useHasVisitedCurrentPath() {
  const pathname = usePathname();
  const [hasVisited, setHasVisited] = useState(
    () => typeof window !== "undefined" && visitedPaths.has(pathname),
  );

  useEffect(() => {
    setHasVisited(visitedPaths.has(pathname));
    visitedPaths.add(pathname);
  }, [pathname]);

  return hasVisited;
}
