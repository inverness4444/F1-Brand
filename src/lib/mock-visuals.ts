import type { ProductColor, ProductType } from "@/lib/types";

const colorHexMap: Record<ProductColor, string> = {
  Black: "#111111",
  White: "#f9f8f4",
  Navy: "#162540",
  Grey: "#9ea3aa",
  Red: "#d8382e",
  Orange: "#eb6d2f",
  Green: "#16614b",
  Blue: "#1c4fb4",
  Yellow: "#d6b224",
  Silver: "#cfd4da",
  Beige: "#d7c8b7",
  Pink: "#d66597",
};

function svgDataUri(svg: string) {
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function garmentMarkup(type: ProductType, primary: string, secondary: string, tertiary: string) {
  switch (type) {
    case "Hoodie":
      return `
        <path d="M171 90c14-13 25-20 41-20 17 0 30 8 43 22l19 25-18 15-10-13v155H110V119l-10 13-18-15 18-25c11-15 26-22 43-22 15 0 27 7 40 20Z" fill="${primary}" />
        <path d="M144 95c9-12 18-18 28-18 12 0 20 5 30 18l-14 15h-30l-14-15Z" fill="${secondary}" opacity="0.82" />
        <path d="M150 177h52l9 36h-70l9-36Z" fill="${tertiary}" opacity="0.18" />
      `;
    case "Jacket":
      return `
        <path d="M125 74h110l24 46v151H101V120l24-46Z" fill="${primary}" />
        <path d="M177 74h6v197h-6Z" fill="${secondary}" />
        <path d="M135 98h90v18h-90Z" fill="${secondary}" opacity="0.24" />
        <rect x="118" y="126" width="22" height="52" rx="7" fill="${secondary}" opacity="0.18" />
        <rect x="214" y="126" width="22" height="52" rx="7" fill="${secondary}" opacity="0.18" />
      `;
    case "Polo":
      return `
        <path d="M112 82h136l20 42v149H92V124l20-42Z" fill="${primary}" />
        <path d="M148 82h84l-25 31h-34l-25-31Z" fill="${secondary}" />
        <path d="M177 113h6v46h-6Z" fill="${secondary}" opacity="0.55" />
        <rect x="118" y="134" width="124" height="10" rx="5" fill="${tertiary}" opacity="0.25" />
      `;
    case "Longsleeve":
      return `
        <path d="M116 88h132l25 39-23 17-15-20v147H129V124l-16 20-22-17 25-39Z" fill="${primary}" />
        <rect x="138" y="115" width="88" height="18" rx="8" fill="${secondary}" opacity="0.32" />
      `;
    case "Pants":
      return `
        <path d="M126 64h108l14 84-28 128h-33l-11-95-11 95h-33L104 148l22-84Z" fill="${primary}" />
        <rect x="120" y="64" width="120" height="16" rx="8" fill="${secondary}" opacity="0.4" />
        <path d="M162 156h36" stroke="${tertiary}" stroke-width="8" stroke-linecap="round" opacity="0.35" />
      `;
    case "Scarf":
      return `
        <path d="M142 66c0-19 16-35 38-35s38 16 38 35v28c0 22-16 38-38 38s-38-16-38-38V66Z" fill="${primary}" />
        <path d="M150 118h25l-18 166h-30l23-166Z" fill="${secondary}" />
        <path d="M185 118h25l22 166h-30l-17-166Z" fill="${primary}" opacity="0.94" />
        <path d="M154 228h51" stroke="${tertiary}" stroke-width="10" stroke-linecap="round" opacity="0.32" />
      `;
    case "Lego":
      return `
        <rect x="110" y="100" width="140" height="132" rx="20" fill="${primary}" />
        <rect x="110" y="150" width="140" height="82" rx="18" fill="${secondary}" opacity="0.92" />
        <circle cx="138" cy="126" r="12" fill="${tertiary}" opacity="0.85" />
        <circle cx="178" cy="126" r="12" fill="${tertiary}" opacity="0.85" />
        <circle cx="218" cy="126" r="12" fill="${tertiary}" opacity="0.85" />
        <rect x="130" y="176" width="100" height="12" rx="6" fill="${primary}" opacity="0.35" />
      `;
    case "Cap":
      return `
        <path d="M176 96c39 0 74 22 74 53H102c0-31 35-53 74-53Z" fill="${primary}" />
        <path d="M250 149c-13 31-53 51-98 51h-42c8-16 37-51 140-51Z" fill="${secondary}" opacity="0.88" />
        <path d="M116 149h134" stroke="${tertiary}" stroke-width="8" stroke-linecap="round" opacity="0.25" />
      `;
    case "Accessory":
      return `
        <rect x="102" y="108" width="148" height="112" rx="20" fill="${primary}" />
        <path d="M129 108c5-22 24-37 47-37s42 15 47 37" stroke="${secondary}" stroke-width="14" stroke-linecap="round" fill="none" />
        <rect x="122" y="146" width="108" height="12" rx="6" fill="${tertiary}" opacity="0.28" />
      `;
    case "T-shirt":
    default:
      return `
        <path d="M116 83h132l29 44-24 16-18-22v151H129V121l-18 22-24-16 29-44Z" fill="${primary}" />
        <path d="M148 83h68l-18 24h-32l-18-24Z" fill="${secondary}" />
        <rect x="132" y="147" width="100" height="10" rx="5" fill="${tertiary}" opacity="0.24" />
      `;
  }
}

export function createProductMockup(
  type: ProductType,
  palette: string[],
  variant = 0,
) {
  const primary = palette[0] ?? "#111111";
  const secondary = palette[1] ?? "#d7c8b7";
  const tertiary = palette[2] ?? "#ece7df";
  const ambient = variant % 2 === 0 ? "#f3f3f1" : "#f7f7f5";
  const markup = garmentMarkup(type, primary, secondary, tertiary);

  return svgDataUri(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 420">
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#faf9f6" />
          <stop offset="100%" stop-color="${ambient}" />
        </linearGradient>
        <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="18" stdDeviation="18" flood-color="#101010" flood-opacity="0.12" />
        </filter>
      </defs>
      <rect width="360" height="420" fill="url(#bg)" />
      <rect x="32" y="26" width="296" height="368" rx="28" fill="#f6f6f4" stroke="#e8e6e1" />
      <rect x="55" y="48" width="250" height="324" rx="22" fill="#fcfcfa" />
      <path d="M73 62h74" stroke="${secondary}" stroke-width="8" stroke-linecap="round" opacity="0.12" />
      <circle cx="${variant % 2 === 0 ? 92 : 270}" cy="88" r="34" fill="${tertiary}" opacity="0.12" />
      <circle cx="${variant % 2 === 0 ? 272 : 104}" cy="304" r="52" fill="${secondary}" opacity="0.08" />
      <g filter="url(#shadow)">${markup}</g>
      <rect x="97" y="328" width="166" height="6" rx="3" fill="#dbd8d1" />
      <rect x="114" y="345" width="132" height="6" rx="3" fill="#ebe9e3" />
    </svg>
  `);
}

export function resolvePalette(colors: ProductColor[]) {
  return colors.map((color) => colorHexMap[color]);
}
