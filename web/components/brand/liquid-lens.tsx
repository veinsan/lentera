"use client";

import { useEffect } from "react";

// Displacement map: red pulls inward at the left and right rims, green at the top and bottom, neutral grey inside.
const MAP = `data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" preserveAspectRatio="none">
<defs>
<linearGradient id="x"><stop offset="0" stop-color="#ff0000"/><stop offset=".22" stop-color="#800000"/><stop offset=".78" stop-color="#800000"/><stop offset="1" stop-color="#000000"/></linearGradient>
<linearGradient id="y" x2="0" y2="1"><stop offset="0" stop-color="#00ff00"/><stop offset=".3" stop-color="#008000"/><stop offset=".7" stop-color="#008000"/><stop offset="1" stop-color="#000000"/></linearGradient>
</defs>
<rect width="100" height="100" fill="url(#x)"/><rect width="100" height="100" fill="url(#y)" style="mix-blend-mode:screen"/>
</svg>`,
)}`;

/**
 * Liquid glass refraction for small controls. Only Chromium renders SVG filters inside backdrop-filter,
 * so the lens turns on there (data-lens="on") and every other browser keeps the frosted glass.
 */
export function LiquidLens() {
  useEffect(() => {
    const chromium = (navigator as Navigator & { userAgentData?: { brands: { brand: string }[] } }).userAgentData?.brands.some(
      (b) => b.brand === "Chromium",
    );
    if (chromium && !matchMedia("(prefers-reduced-transparency: reduce)").matches) document.documentElement.dataset.lens = "on";
  }, []);

  return (
    <svg aria-hidden width="0" height="0" className="pointer-events-none absolute">
      <filter id="liquid-lens" x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
        <feImage href={MAP} x="0" y="0" width="100%" height="100%" preserveAspectRatio="none" result="map" />
        <feDisplacementMap in="SourceGraphic" in2="map" scale="22" xChannelSelector="R" yChannelSelector="G" />
      </filter>
    </svg>
  );
}
