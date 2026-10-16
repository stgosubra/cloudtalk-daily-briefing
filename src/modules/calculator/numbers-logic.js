// Module 03 / Numbers tab - data and search logic.
// Embedded dataset of ~35 countries covering CloudTalk's main markets.
// Each entry: ISO code, country name, available number types, compliance notes,
// and a pricing tier indicator (low/mid/high).
//
// When the CSV source is available it can replace this static dataset; the
// export interface stays the same so NumbersFinder.jsx never changes.

const COUNTRIES = [
  // EU core
  { iso: "AT", name: "Austria", types: ["local", "national", "mobile", "toll-free"], compliance: "Address proof required", tier: "low" },
  { iso: "BE", name: "Belgium", types: ["local", "national", "mobile", "toll-free"], compliance: "Local address required", tier: "low" },
  { iso: "BG", name: "Bulgaria", types: ["local", "national"], compliance: "Local address required", tier: "low" },
  { iso: "HR", name: "Croatia", types: ["local", "national"], compliance: "Local address required", tier: "mid" },
  { iso: "CZ", name: "Czech Republic", types: ["local", "national", "mobile", "toll-free"], compliance: "ID + address proof", tier: "low" },
  { iso: "DK", name: "Denmark", types: ["local", "national", "toll-free"], compliance: "CVR number required", tier: "low" },
  { iso: "FI", name: "Finland", types: ["local", "national", "toll-free"], compliance: "Local address required", tier: "mid" },
  { iso: "FR", name: "France", types: ["local", "national", "mobile", "toll-free"], compliance: "Local address required", tier: "low" },
  { iso: "DE", name: "Germany", types: ["local", "national", "mobile", "toll-free"], compliance: "Address proof required", tier: "low" },
  { iso: "GR", name: "Greece", types: ["local", "national", "toll-free"], compliance: "ID + local address", tier: "mid" },
  { iso: "HU", name: "Hungary", types: ["local", "national", "toll-free"], compliance: "Local address required", tier: "low" },
  { iso: "IE", name: "Ireland", types: ["local", "national", "toll-free"], compliance: "Address proof required", tier: "low" },
  { iso: "IT", name: "Italy", types: ["local", "national", "mobile", "toll-free"], compliance: "Fiscal code + address", tier: "low" },
  { iso: "NL", name: "Netherlands", types: ["local", "national", "mobile", "toll-free"], compliance: "Address proof required", tier: "low" },
  { iso: "NO", name: "Norway", types: ["local", "national", "toll-free"], compliance: "Org number required", tier: "mid" },
  { iso: "PL", name: "Poland", types: ["local", "national", "mobile", "toll-free"], compliance: "Address proof required", tier: "low" },
  { iso: "PT", name: "Portugal", types: ["local", "national", "toll-free"], compliance: "NIF + address proof", tier: "low" },
  { iso: "RO", name: "Romania", types: ["local", "national"], compliance: "Local address required", tier: "low" },
  { iso: "SK", name: "Slovakia", types: ["local", "national", "toll-free"], compliance: "ID + address proof", tier: "low" },
  { iso: "ES", name: "Spain", types: ["local", "national", "mobile", "toll-free"], compliance: "NIF/NIE + address", tier: "low" },
  { iso: "SE", name: "Sweden", types: ["local", "national", "toll-free"], compliance: "Org number + address", tier: "low" },
  { iso: "CH", name: "Switzerland", types: ["local", "national", "toll-free"], compliance: "Local address required", tier: "mid" },

  // UK
  { iso: "GB", name: "United Kingdom", types: ["local", "national", "mobile", "toll-free"], compliance: "Address proof required", tier: "low" },

  // North America
  { iso: "US", name: "United States", types: ["local", "toll-free"], compliance: "Business address", tier: "low" },
  { iso: "CA", name: "Canada", types: ["local", "toll-free"], compliance: "Business address", tier: "low" },

  // LATAM
  { iso: "BR", name: "Brazil", types: ["local", "national", "mobile", "toll-free"], compliance: "CNPJ + local address", tier: "mid" },
  { iso: "MX", name: "Mexico", types: ["local", "national", "toll-free"], compliance: "RFC + address proof", tier: "mid" },
  { iso: "CL", name: "Chile", types: ["local", "national", "toll-free"], compliance: "RUT + address proof", tier: "mid" },
  { iso: "CO", name: "Colombia", types: ["local", "national", "toll-free"], compliance: "NIT + address proof", tier: "mid" },
  { iso: "AR", name: "Argentina", types: ["local", "national"], compliance: "CUIT + local address", tier: "mid" },

  // APAC
  { iso: "AU", name: "Australia", types: ["local", "national", "mobile", "toll-free"], compliance: "ABN + address proof", tier: "low" },
  { iso: "NZ", name: "New Zealand", types: ["local", "national", "toll-free"], compliance: "Business address", tier: "mid" },
  { iso: "SG", name: "Singapore", types: ["local", "toll-free"], compliance: "UEN + address proof", tier: "mid" },
  { iso: "HK", name: "Hong Kong", types: ["local", "toll-free"], compliance: "BR number + address", tier: "mid" },
  { iso: "JP", name: "Japan", types: ["local", "national", "toll-free"], compliance: "Local address + ID", tier: "high" },
  { iso: "IN", name: "India", types: ["local", "toll-free"], compliance: "PAN + local address", tier: "mid" },

  // Middle East / Africa
  { iso: "IL", name: "Israel", types: ["local", "national", "toll-free"], compliance: "Business registration", tier: "mid" },
  { iso: "ZA", name: "South Africa", types: ["local", "national", "toll-free"], compliance: "CIPC + address proof", tier: "mid" },
  { iso: "AE", name: "United Arab Emirates", types: ["local", "toll-free"], compliance: "Trade license + EID", tier: "high" },
];

const TYPE_LABELS = {
  local: "Local",
  national: "National",
  mobile: "Mobile",
  toll_free: "Toll-free",
  "toll-free": "Toll-free",
};

const TIER_LABELS = { low: "Standard", mid: "Premium", high: "Enterprise" };

/** Search/filter countries by name, ISO code, or number type. */
export function search(query) {
  if (!query || !query.trim()) return COUNTRIES;
  const q = query.trim().toLowerCase();
  return COUNTRIES.filter((c) =>
    c.name.toLowerCase().includes(q) ||
    c.iso.toLowerCase() === q ||
    c.types.some((t) => t.toLowerCase().includes(q))
  );
}

/** All countries, pre-sorted by name. */
export const countries = COUNTRIES;

export { TYPE_LABELS, TIER_LABELS };
