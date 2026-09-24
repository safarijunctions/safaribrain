// ISO 3166-1 alpha-2 -> display name, for the countries this platform
// actually operates in (§1.7 "country is config, not a rebuild" — this
// list only needs to cover safari markets, not the whole world). Falls
// back to the raw code for anything not listed rather than guessing.
const COUNTRY_NAMES: Record<string, string> = {
  TZ: "Tanzania",
  KE: "Kenya",
  UG: "Uganda",
  RW: "Rwanda",
  BW: "Botswana",
  NA: "Namibia",
  ZA: "South Africa",
  ZM: "Zambia",
  ZW: "Zimbabwe",
  ET: "Ethiopia",
  MZ: "Mozambique",
  MW: "Malawi",
  MG: "Madagascar",
};

export function countryName(code: string): string {
  return COUNTRY_NAMES[code] ?? code;
}
