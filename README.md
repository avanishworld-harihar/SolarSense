# Sol.52 Next.js migration

Next.js App Router app. Product notes live in [`docs/SOL52_MASTER_PLAN.md`](docs/SOL52_MASTER_PLAN.md). Static assets belong in `public/`.

## Stack

- Next.js App Router + TypeScript
- Tailwind CSS
- Lucide icons
- Supabase (refactored to `lib/supabase.ts`)
- Gemini OCR (refactored to `lib/gemini.ts` + `app/api/analyze-bill`)

## Folder Structure

```txt
sol.52/
├─ app/                 # App Router pages, layouts, API routes
├─ components/
├─ lib/
├─ public/              # Static assets (favicon, PWA icons, `sol52-logo.png`)
├─ docs/                # Product / planning docs
├─ .env.example
├─ next.config.ts
├─ package.json
├─ postcss.config.mjs
├─ tailwind.config.ts
└─ tsconfig.json
```

## Run

1. Copy `.env.example` to `.env.local`
2. Install dependencies: `npm install`
3. Start dev server: `npm run dev`

## Notes

- **Brand logo:** `public/sol52-logo.png` (served as `/sol52-logo.png`, transparent). Tagline: *Solar Intelligence. Total Support.* Header uses `components/brand-logo.tsx`. Regenerate from JPEG via `node scripts/sol52-logo-knockout.mjs` if needed.
- Color system aligns with Sol.52 brand blues / teal / gold accents.
- UX is mobile-first with high contrast and large touch targets for field installers.
- Existing logic (bill OCR, savings and payback calculations, proposal workflow direction) is preserved and structured for scalable Next.js growth.
