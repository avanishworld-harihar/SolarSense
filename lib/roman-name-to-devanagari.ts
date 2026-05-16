/**
 * Best-effort Roman (bill / Latin) → Devanagari for customer-facing Hindi UI.
 * Uses ITRANS + Sanscript plus a small dictionary and light heuristics for
 * common North / Central Indian name spellings.
 */
import Sanscript from "sanscript";
import { withHonorific } from "@/lib/proposal-deck-helpers";

const ROMAN_TO_ITRANS: Record<string, string> = {
  bihari: "bihArI",
  lal: "lAla",
  soni: "sonI",
  kumar: "kumAra",
  sharma: "sharmA",
  verma: "vermA",
  gupta: "guptA",
  singh: "siMha",
  patel: "pate_la",
  reddy: "reDDI",
  yadav: "yAdava",
  mishra: "mishrA",
  pandey: "pAMqeya",
  jain: "jaina",
  agarwal: "agaravAla",
  saxena: "saxenA",
  tiwari: "tivArI",
  dubey: "dube",
  chauhan: "cauhAna",
  tomar: "tomAra",
  solanki: "solaMki",
  prasad: "prasAda",
  sinha: "sinhA",
  mehta: "mehtA",
  kapoor: "kapUra",
  malhotra: "malhotrA",
  arora: "arorA",
  bajpai: "bAjapeI",
  tripathi: "tripathI",
  dwivedi: "dvivedI",
  nigam: "nigama",
  khan: "khAna",
  ansari: "ansArI",
  begum: "beguma",
  sheikh: "sheKa",
  ahmed: "ahameda",
  ali: "alI",
  hassan: "hasana",
  hussain: "husseMna",
  fatima: "phAtimA",
  zara: "zArA",
  noor: "nUra",
  ayesha: "ayeshA",
  imran: "imrAna",
  mohammad: "mohammada",
  salim: "salima",
  rashid: "rashida",
  farhan: "farahAna",
  aditi: "aditi",
  neha: "nehA",
  kavita: "kavitA",
  manoj: "manoja",
  rajesh: "rAjesha",
  suresh: "suresha",
  mahesh: "mAhesha",
  naresh: "nAresha",
  pankaj: "paMkaja",
  vijay: "vijaya",
  vinod: "vinoda",
  ashok: "ashoka",
  kailash: "kailAsha",
  gopal: "gopAla",
  mukesh: "mukesha",
  rakesh: "rAkesha",
  sanjay: "saMjaya",
  amit: "amita",
  arun: "aruNa",
  deepak: "dIpaka",
  nitesh: "nItesha",
  rohit: "rohita",
  varun: "varuNa",
  akash: "AkAsha",
  ankit: "aMkita",
  ram: "rAma",
  sham: "shAma",
  shyam: "shyAma",
  krishna: "kRiShNa",
  ravi: "ravI",
  anil: "anila",
  sunita: "sunitA",
  priya: "priyA",
  devi: "devI",
  rani: "rANI",
  shanti: "shAnti",
  om: "om",
  laxmi: "lakShmI",
  lakshmi: "lakShmI",
  sita: "sItA",
  geeta: "gItA",
  gita: "gItA",
  babu: "bAbu",
  lalit: "lalita",
  nath: "nAtha"
};

function stripTrailingJi(name: string): { base: string; honorJi: boolean } {
  const t = name.trim();
  const honorJi = /\s*जी\s*$/u.test(t);
  const base = t.replace(/\s*जी\s*$/u, "").trim();
  return { base, honorJi };
}

function romanTokenToItrans(token: string): string {
  const w = token.toLowerCase().replace(/[^a-z]/g, "");
  if (!w) return token;
  if (ROMAN_TO_ITRANS[w]) return ROMAN_TO_ITRANS[w];
  if (w.length >= 5 && w.endsWith("hari")) return `${w.slice(0, -4)}hArI`;
  if (w.length >= 4 && w.endsWith("devi")) return `${w.slice(0, -4)}devI`;
  if (w.length >= 4 && w.endsWith("bai")) return w;
  if (w.length >= 4 && w.endsWith("i") && !w.endsWith("ii") && !/[aeiou]i$/.test(w)) return `${w.slice(0, -1)}I`;
  if (!/[aeiou]$/i.test(w)) return `${w}a`;
  return w;
}

/** True if string has a Devanagari letter. */
export function hasDevanagari(s: string): boolean {
  return /[\u0900-\u097F]/.test(s);
}

/**
 * Transliterate a Latin-script personal name to Devanagari (no honorific).
 */
export function romanPersonalNameToDevanagari(raw: string): string {
  const base = raw.trim();
  if (!base || hasDevanagari(base)) return base;
  if (!/[A-Za-z]/.test(base)) return base;
  const itrans = base.split(/\s+/).map(romanTokenToItrans).join(" ");
  try {
    const out = Sanscript.t(itrans, "itrans", "devanagari").replace(/\u094d(?=\s|$)/g, "");
    return hasDevanagari(out) ? out : base;
  } catch {
    return base;
  }
}

/**
 * `honoredName` from deck (often "NAME जी"); Hindi UI shows Devanagari + जी.
 */
export function hindiHonoredDisplayName(honoredName: string): string {
  const { base, honorJi } = stripTrailingJi(honoredName);
  if (!base) return honoredName;
  if (hasDevanagari(base)) return honorJi ? withHonorific(base) : base;
  const dev = romanPersonalNameToDevanagari(base);
  if (dev === base && !hasDevanagari(dev)) return honoredName;
  return honorJi ? withHonorific(dev) : dev;
}
