"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { trackPage } from "../utils/analytics";

export default function RouteEffects() {
  const pathname = usePathname();

  useEffect(() => {
    window.scrollTo(0, 0);
    trackPage(pathname);
  }, [pathname]);

  return null;
}
