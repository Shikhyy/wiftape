/**
 * Jurisdictions where Robinhood's Stock Token products may not be offered.
 * Source: https://docs.robinhood.com/rhj/restricted-jurisdictions (read 10 Nov 2026; the page says
 * the list "may be subject to change", so re-check it before you deploy).
 *
 * - United States / US persons: not allowed.
 * - Canada, United Kingdom, Switzerland: offering is restricted.
 * - The rest are listed as Prohibited Investors jurisdictions.
 */
export const RESTRICTED_COUNTRIES: Record<string, string> = {
  US: "United States",
  CA: "Canada",
  GB: "United Kingdom",
  CH: "Switzerland",
  CU: "Cuba",
  BY: "Belarus",
  IR: "Iran",
  KP: "North Korea",
  RU: "Russia",
  SY: "Syria",
  UA: "Ukraine",
  SS: "South Sudan",
  SD: "Sudan",
  MM: "Myanmar",
  VE: "Venezuela",
};

export function isRestricted(code?: string | null): boolean {
  return Boolean(code) && (code as string).toUpperCase() in RESTRICTED_COUNTRIES;
}

/** localStorage key for the "I am eligible" confirmation. Bump the suffix if the wording changes. */
export const ELIGIBILITY_KEY = "wiftape_eligibility_v1";
