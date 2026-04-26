# Sol.52 — Complete Master Plan
**Version:** 2.0 | **Date:** April 2026  
**Owner:** Avanish Gupta | Harihar Solar | Satna, MP | 9993322267  
**Vision:** Solar ka Zomato — App → Platform → Data → Marketplace → Finance

---

## 1. BRAND STRUCTURE

| Type | Name |
|------|------|
| Company | Harihar Solar |
| App | Sol.52 |
| Platform | Sol.52 Network |
| Installer Program | Sol.52 Partner |
| Data Platform | Sol.52 Data |
| Finance | Sol.52 Finance |
| Marketplace | Sol.52 Market |

**Logo (canonical):** File `public/sol52-logo.png` → URL `/sol52-logo.png` (transparent; app header, proposal HTML/PDF, fallbacks). **Tagline:** *Solar Intelligence. Total Support.*  
**Palette (reference):** Navy `#0D2C54`, gold dot `#FFB81C`, teal `#00A88F`, tagline gray ~`#A9A9A9`.

---

## 2. TECH STACK

```
Frontend:   React.js / Next.js (converting from HTML)
Database:   Supabase (PostgreSQL) — ALREADY SETUP
AI:         Gemini 1.5 Flash API
Hosting:    Vercel (upgrading from GitHub Pages)
PWA:        manifest.json + service-worker.js
Auth:       OTP via WhatsApp/SMS (no password)
```

### Supabase & API keys (ALREADY LIVE)
```
Supabase project + Gemini keys live in .env.local only (see .env.example for variable names).
Never paste keys into this document or commit them to git.
Tables: 42 tables created ✅
```

---

## 3. APP NAVIGATION STRUCTURE (World Class)

### Bottom Navigation — 5 Tabs ONLY:
```
1. 🏠 Dashboard    → Business overview
2. 👥 Customers    → CRM
3. 📁 Projects     → Solar projects
4. 📄 Proposal     → Proposal generator
5. ⚙️ More/Settings → Settings
```

**RULES:**
- Settings NEVER on home screen
- No duplicate menu items
- Max 5 bottom tabs

---

## 4. SCREEN DESIGNS

### 4.1 Dashboard Screen
```
Cards to show:
- Total Leads
- Proposals Sent
- Orders
- Installed kW
- Revenue
- Pending Payments

Below cards:
- Recent Customers list
- Recent Projects list

Quick Action Buttons:
- Add Customer
- New Proposal
- Upload Bill
- Create Project
- Generate Report
```

### 4.2 Customer Screen (CRM)
```
List view:
- Name | City | DISCOM | Monthly Bill | Status

Customer Profile Tabs:
1. Info
2. Bills
3. Proposals
4. Projects
5. Documents
6. Notes
```

### 4.3 Bill Analysis Screen
```
After bill upload show:
- Monthly Units (bar chart)
- Annual Units
- Avg Bill
- Avg Unit Cost
- Recommended Solar Size

Charts:
- Bar chart → Monthly units
- Pie chart → Bill components (Energy/Fixed/Duty/Fuel)
- Line chart → Electricity cost increase over years
```

### 4.4 Solar Recommendation Screen
```
Show:
- Recommended Solar Size
- Panels Required
- Roof Area needed
- Annual Generation
- Self Consumption
- Export Units
- Annual Savings
- Payback Period

BIG HIGHLIGHT NUMBER:
"You Save ₹45,000 per year" ← Psychological design
```

### 4.5 Proposal Generator Flow
```
Step 1: Select Customer
Step 2: Upload Bill
Step 3: Annual Units (auto from bill)
Step 4: Solar Size (auto calculated)
Step 5: System Cost
Step 6: Savings
Step 7: Payback
Step 8: Generate Proposal
Step 9: Download PDF / PPT
```

---

## 5. PPT PROPOSAL — 15 SLIDES (World Class)

### Story Flow (Sales Psychology):
```
Slide 1  → COVER (Customer name big, key numbers)
Slide 2  → बिजली Problem (bar chart, yearly bill)
Slide 3  → Bill Analysis (month table, tariff)
Slide 4  → छुपी सच्चाई (Summer trap, Fixed charges)
Slide 5  → Solar Solution (system specs)
Slide 6  → Generation vs Consumption (chart)
Slide 7  → Investment + Subsidy breakdown
Slide 8  → Savings (step by step)
Slide 9  → Payback Timeline (visual)
Slide 10 → 25 Year Profit (chart)
Slide 11 → Electricity↑ vs Solar→ (price comparison)
Slide 12 → Environmental Impact (trees, CO₂)
Slide 13 → System Components + Warranty
Slide 14 → Installation Process (timeline)
Slide 15 → Why Choose Us + Contact + Dhanyavaad
```

### PPT Design Rules:
```
- White background
- Green (#3DB54A) + Blue (#1E73BE) color theme
- Big numbers (customer sees these first)
- Use icons everywhere
- Use charts/graphs
- NO long paragraphs
- Highlight: Savings, Payback, Profit
- Card layout
- Consistent Montserrat font
- Installer = STAR (big branding)
- Sol.52 = tiny footer only
- Customer name throughout
```

### PPT Psychology Flow:
```
Aap itna bill de rahe ho
→ Bill mein hidden charges hain
→ Solar solution hai
→ Solar cost itni
→ Saving itni
→ Payback itna
→ Profit itna
→ Install solar karo!
```

### Strong Features (NEVER REMOVE):
```
✅ Month-wise bill analysis
✅ Tariff slab display
✅ Fixed charge breakdown
✅ Duty breakdown
✅ Fuel charge display
✅ Yearly bill total
✅ Avg monthly bill
✅ After solar bill
✅ Solar generation explanation
✅ Step-by-step calculation
✅ Payback period
✅ 25 year profit
✅ Summer bill trap insight
✅ Fixed charge reality
✅ Slab split analysis
✅ Solar saving %
✅ Investment breakdown
✅ Subsidy details
✅ Net cost
✅ Company page
```

### Missing Slides to Add:
```
- Electricity bill trend graph
- Solar generation vs consumption chart
- Payback timeline graphic
- Electricity price increase vs solar
- Environmental impact
- Roof area / layout
- System components visuals
- Installation timeline
- Project process
- Warranty chart
- EMI vs saving comparison
```

---

## 6. DATABASE — 42 TABLES (Already in Supabase)

### Core Data Tables:
```
states          → 12 states seeded
discoms         → 37 DISCOMs seeded
tariff_slabs    → Verified tariff data
fixed_charges   → 4 charge types
other_charges   → Duty, fuel etc
export_rates    → 12 states
subsidy         → PM Surya Ghar rules
solar_cost      → 8 system sizes
```

### Business Tables:
```
users               → Installer profiles
subscription_plans  → 4 plans seeded
projects            → Solar projects
bills               → Electricity bills
calculations        → Saved calculations
reports             → Generated reports
bill_uploads        → Bill scan history
```

### CRM Tables:
```
quotation_items     → Item-wise costing
inventory           → Material stock
team_members        → Installer team
project_documents   → Files/docs
project_timeline    → Photo timeline
```

### App Memory Tables:
```
app_roadmap     → V1-V6 roadmap
app_decisions   → Key decisions log
app_memory      → Important facts
```

---

## 7. VERIFIED TARIFF DATA

### MPPKVVCL (MP) — 24 bills verified ✅
```
Slabs: 0-50=₹4.45 | 51-150=₹5.41 | 151-300=₹6.43 | 301+=₹6.98
Fixed: ≤50u→₹76 | ≤150u→₹129 | else ceil(u/15)×₹28
Duty: 8% on (energy+fixed)
Fuel: ₹0.024/unit
Min bill: ₹75
```

### MSEDCL (Maharashtra) ✅
```
Fixed: ₹130/month flat
Tax: ₹1.47/unit (NOT percentage)
```

### DGVCL (Gujarat) ✅
```
Billing: BIMONTHLY
Fixed: ₹30/month
Vidyut Shulk: 15% on total
```

### BSES Yamuna (Delhi) ✅
```
Fixed: ₹125/kW
PPAC: 7.93%
Surcharge: 8% + Pension: 7%
```

---

## 8. KEY BUSINESS RULES

### Subsidy Rules:
```
PM Surya Ghar = Domestic ONLY
Commercial/Industrial = ZERO subsidy
Agriculture = PM KUSUM only

Subsidy amounts:
≤2kW: ₹30,000/kW
2-3kW: ₹18,000/kW (for extra)
>3kW: ₹78,000 max total
```

### Solar Sizing Rules:
```
MP:        100% of annual consumption (no oversizing — min bill trap)
Gujarat:   120% (bimonthly, export good)
Rajasthan: 130% (cash export payment ₹3.26/unit)
UP:        110%
Others:    110%

Panel Formula: CEIL(kW × 1000 / panel_watt) — DYNAMIC
```

### Login System:
```
OTP via WhatsApp/SMS
No password
30-day session
```

---

## 9. SUBSCRIPTION PLANS

| Plan | Price | Features |
|------|-------|----------|
| Trial | FREE 30 days | Full Pro access |
| Free | ₹0 | 10 proposals/month, watermark |
| Pro | ₹299/month | Unlimited |
| Business | ₹999/month | 3 users, white label |

### Monetization Timeline:
```
Month 1-6:   FREE (build users)
Month 7-12:  30-day trial → ₹299/month
Year 2:      ₹499 Pro / ₹999 Business
```

---

## 10. VERSION ROADMAP

```
V1.0 (Now):     Core — Bill scan, Calculate, PPT proposal
V1.5 (Month 2): Dashboard, CRM basic, Notifications
V2.0 (Month 3): Full CRM, Project tracking, Photo timeline
V3.0 (Month 5): Costing, Quotation, Inventory
V4.0 (Month 8): Complete ERP, Analytics
V5.0 (Year 2):  Platform — Installer network, Lead marketplace
V6.0 (Year 3):  Ecosystem — Finance, Market, Data
```

---

## 11. LANGUAGES

```
6 languages:
1. Hindi/Hinglish (default)
2. English
3. Gujarati
4. Kannada
5. Tamil
6. Telugu

Rule:
Technical words = English always (Solar, kW, DISCOM, Net Metering)
Actions = Hindi (Upload karo, Calculate karo, Save karo)
```

---

## 12. PPT BRANDING RULES

```
Installer company = BIG (star of the show)
Customer name = Throughout all slides
Sol.52 = Tiny footer only
Business plan version = Zero Sol.52 branding
```

---

## 13. IMPORTANT DESIGN DECISIONS

```
1. kW selection: From bill upload (auto) — NEVER manual in settings
2. API key: Hardcoded (Gemini) — not visible to installer
3. Guide: Bottom sheet modal — NOT a nav tab
4. Settings: Never on home screen
5. EMI calculator: Real bank rates (SBI, PNB, HDFC)
6. Tariff updates: Self-learning — installer reports → admin approves
7. PPT live sync: "Outdated flag" approach (not auto-regen)
8. Agreement clauses: Modular — AMC default OFF
```

---

## 14. COMPETITOR ANALYSIS

### Global:
```
OpenSolar, Aurora Solar, HelioScope, SolarGraf
→ English only, expensive, not India-specific
```

### India:
```
Solar Ladder, SolarTrade, Aha Solar, Sunbase CRM
→ Generic, no verified tariff data, no Hindi
```

### Sol.52 Advantage:
```
✅ India-first (Hindi + 5 languages)
✅ Verified bill data (37 DISCOMs)
✅ AI bill scanner (Gemini)
✅ DISCOM-specific guidance
✅ Self-learning tariff system
✅ Installer branding (not Sol.52)
✅ Offline capable (PWA)
✅ Free to start
```

---

## 15. SOLAR BUSINESS INSIGHT

```
"Solar business mein paisa:
 Installation mein nahi
 Data + Platform + Financing + Marketplace mein hota hai"

Platform companies = Most powerful:
Uber, Zomato, Amazon model

Sol.52 path:
Installer Tool → Platform → Data → Finance → Marketplace
```

---

*Document End — Sol.52 Master Plan v2.0*
*Keep this file updated with every major decision*
