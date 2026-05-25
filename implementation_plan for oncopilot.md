# 🩺 OnCopilot — Final Implementation Plan + Presentation Design

> **Ground Rule:** Every feature has two sections — **What to Build** (technical) and **How to Present It** (UI/UX design). Because in a TCS interview, the *impression* of the demo matters as much as the code behind it.

---

## 📐 Design System (Existing — Keep Consistent)

The codebase already uses a premium dark-mode design system:
- **Primary accent:** `#0891B2` (cyan-600)
- **Background:** Slate-900 to Slate-950
- **Animations:** Framer Motion (already installed)
- **Typography:** Font-mono for clinical data, sans-serif for UI
- **Pattern:** Glassmorphism cards with colored glows per subtype

All new features must match this existing aesthetic.

---
---

## 🔴 Phase 1: Doctor Feedback & Finalization Loop

### What to Build

**Backend:**
- `POST /api/cases/{case_id}/finalize-treatment` — Accepts `{decision: "approved" | "modified" | "overridden", final_plan: {...}, override_reason: string}`
- Add `doctor_decision`, `final_treatment_plan`, `override_reason` fields to the `Result` model

**Frontend:**
- New `<ClinicalVerdictPanel>` component in the Results page
- Status badge changes on the Case list once finalized

---

### 🎨 How to Present It

**The "Clinical Verdict Panel"** — placed at the very bottom of the Results page, below all recommendations. It must feel like a deliberate, final action — not just another card.

**Visual Design:**

```
┌─────────────────────────────────────────────────────────┐
│  🩺  CLINICAL VERDICT                   [PENDING REVIEW] │
│  ─────────────────────────────────────────────────────  │
│                                                         │
│  Review the AI-generated pathways above and record      │
│  your clinical decision for this case.                  │
│                                                         │
│  ┌─────────────┐  ┌──────────────────┐  ┌───────────┐  │
│  │  ✅ APPROVE  │  │  ✏️  MODIFY       │  │ ❌ OVERRIDE│  │
│  │  Primary    │  │  Primary Path     │  │  Enter    │  │
│  │  Pathway    │  │  (edit fields)    │  │  Reason   │  │
│  └─────────────┘  └──────────────────┘  └───────────┘  │
└─────────────────────────────────────────────────────────┘
```

**Micro-interactions:**
1. **On "Approve":** A green wave animation sweeps across the panel. A "clinical stamp" SVG (circular seal with a checkmark) drops in with a spring animation. The case status badge in the sidebar instantly turns green: `● FINALIZED`.
2. **On "Override":** A warning-red modal slides up from the bottom asking for a mandatory override reason. Cannot submit without a reason (clinically responsible).
3. **On "Modify":** The top treatment pathway card enters edit mode — drug names become inline-editable text fields. A "Save Modified Plan" button appears with amber color.
4. **After any action:** The entire panel transitions to a "locked" read-only state showing:
   ```
   ✅ Finalized by Dr. [Name] · 25 May 2025, 10:34 AM
   Decision: Approved Primary Pathway
   ```
   with a subtle locked-lock icon.

**Color Scheme:**
- Approve → Emerald-500 (`#10b981`) glow + border
- Modify → Amber-500 (`#f59e0b`) glow + border
- Override → Rose-500 (`#f43f5e`) glow + border

---
---

## 🔴 Phase 2: Patient Portal

### What to Build

**Backend:**
- Ensure `PATIENT` role exists in RBAC
- New endpoint: `GET /api/patient/my-plan` — Returns only the patient's own finalized treatment plan (no sensitive clinical metrics)

**Frontend:**
- New route: `/patient-dashboard/page.tsx`
- Completely separate visual theme
- Simplified language — no medical jargon

---

### 🎨 How to Present It

The patient portal must feel like a **completely different app** — warm, reassuring, human. Not clinical and data-dense like the doctor's view.

**Visual Theme:** Switch from cold cyan to a **warm gradient** — soft violet-to-rose (`#7C3AED` → `#EC4899`). Still dark mode but warmer.

**Layout — "Your Treatment Journey" page:**

```
┌─────────────────────────────────────────────────────────┐
│  Good morning, [Patient Name] 👋                        │
│  Your oncologist has reviewed your case.                │
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │  🔬 Your Cancer Type                             │   │
│  │  Luminal A Breast Cancer                         │   │
│  │  This is a hormone-sensitive form of breast      │   │
│  │  cancer that responds well to hormone therapy.   │   │
│  │  [What does this mean? ▼]                        │   │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
│  YOUR TREATMENT PLAN                                    │
│  ━━━━━━━━━━━━━━━━━━━                                    │
│  Stage 1: Hormone Therapy  ●━━━━━━━━○━━━━━━━○           │
│  Stage 2: Follow-up Scans                               │
│  Stage 3: Review (6 months)                             │
│                                                         │
│  ┌───────────────────────────────────────────────┐      │
│  │  💊 Your Prescribed Treatment               │      │
│  │  Tamoxifen 20mg · Once daily                │      │
│  │  Duration: 5 years                          │      │
│  └───────────────────────────────────────────────┘      │
└─────────────────────────────────────────────────────────┘
```

**Key Presentation Features:**
1. **"What does this mean?" expandable tooltips** on every medical term. Clicking expands a plain-English explanation in a soft warm card.
2. **Treatment Timeline** — A horizontal progress line (like a stepper/progress bar) showing treatment stages. The current stage pulses with a soft glow animation.
3. **No numbers like "confidence: 0.94"** — Replace with reassuring language: *"Your oncologist has reviewed and approved this plan."*
4. **Safety Alerts simplified:** Instead of "LVEF contraindication detected," show: *"⚠️ Your doctor noted a heart health consideration. Your treatment has been adjusted accordingly."*
5. **Warm color palette:** Use `bg-gradient-to-br from-slate-900 via-purple-950/30 to-rose-950/20` for the background instead of the cold slate.

---
---

## 🟡 Phase 3: Clinical Validation Alerts (Missing Data Flags)

### What to Build

**Backend:**
- Add `validation_alerts` array to `PipelineResult`
- Check for missing fields before pipeline runs: Ki-67, Tumour Size, Lymph Node Count, HER2 Status

**Frontend:**
- New `<DataCompletenessPanel>` component shown before results

---

### 🎨 How to Present It

Don't show a boring yellow banner. Show a **"Case Completeness"** panel at the top of the Analysis form — before results are generated.

**Visual Design — "Data Completeness Radar":**

A circular completeness indicator (like a pie/donut) showing which clinical fields are filled vs missing:

```
┌────────────────────────────────────────────────┐
│  📋 CLINICAL DATA COMPLETENESS         87%     │
│  ─────────────────────────────────────────     │
│                                                │
│     ✅ ER Status          ✅ Tumour Size        │
│     ✅ PR Status          ✅ Lymph Nodes        │
│     ✅ HER2 Status        ⚠️  Ki-67 (MISSING)  │
│     ✅ Stage              ✅ ECOG Score        │
│                                                │
│  ⚠️  Ki-67 is missing. The system will default │
│  to a conservative classification. Results     │
│  may be less precise. [Enter Ki-67 →]          │
└────────────────────────────────────────────────┘
```

**Micro-interactions:**
1. Each field shows a ✅ (green) or ⚠️ (amber pulsing dot) status pill.
2. The **percentage** at top-right counts up with a number animation when the form loads.
3. Missing fields have an orange glow — clicking them jumps focus to that field in the input form.
4. When all fields are filled, the panel turns fully green with a brief "✅ Complete Data — Analysis Ready" confirmation before the Analyze button becomes active.

---
---

## 🟡 Phase 4: Drug-Drug Interaction (DDI) Checker

### What to Build

**Backend:**
- New `backend/engine/drug_interaction_checker.py` with a static interaction matrix
- Key interactions: Tamoxifen + Fluoxetine/Paroxetine (MAJOR), Warfarin + Capecitabine (MAJOR), CDK4/6i + CYP3A4 inducers (MAJOR)
- Integrate into `contraindication_checker.py` as a separate check step

**Frontend:**
- New `<DrugInteractionPanel>` in the Results page — separate from Safety Alerts

---

### 🎨 How to Present It

The DDI panel is separated from the existing "Safety Alerts" panel and given its own distinct visual identity. It should feel like a **pharmaceutical warning label** — authoritative and clear.

**Visual Design:**

```
┌────────────────────────────────────────────────────────┐
│  💊 DRUG INTERACTION CHECK              2 FLAGS FOUND  │
│  ─────────────────────────────────────────────────     │
│                                                        │
│  ┌────────────────────────────────────────────────┐    │
│  │  🔴  MAJOR INTERACTION                         │    │
│  │  Fluoxetine  ←→  Tamoxifen                     │    │
│  │  ─────────────────────────────────────────     │    │
│  │  Fluoxetine is a CYP2D6 inhibitor that reduces │    │
│  │  Tamoxifen's active form (endoxifen) by up to  │    │
│  │  65%, significantly reducing treatment effect. │    │
│  │                                                │    │
│  │  ⚡ Recommended: Switch to Venlafaxine (weak   │    │
│  │     CYP2D6 inhibitor) for hot flash management │    │
│  └────────────────────────────────────────────────┘    │
│                                                        │
│  ┌────────────────────────────────────────────────┐    │
│  │  🟠  MODERATE INTERACTION                      │    │
│  │  Aspirin  ←→  Capecitabine                     │    │
│  │  Increased GI bleeding risk. Monitor closely.  │    │
│  └────────────────────────────────────────────────┘    │
│                                                        │
│  ⚠️  Consult a clinical pharmacist for full review.    │
└────────────────────────────────────────────────────────┘
```

**Micro-interactions:**
1. Each interaction card slides in with a staggered animation (0ms, 100ms, 200ms delay).
2. **Color coding by severity:**
   - MAJOR → `rose-500` left border glow + red dot icon
   - MODERATE → `amber-500` left border + orange triangle
   - MINOR → `slate-500` + grey info circle
3. The interaction pair (`Fluoxetine ←→ Tamoxifen`) is shown as a visual "clash" — two pill icons facing each other with a lightning bolt `⚡` between them.
4. Clicking the card expands to show the full pharmacological explanation and the recommended alternative.

---
---

## 🟢 Phase 5: NPI & CTS5 Prognostic Risk Scores

### What to Build

**Backend:**
- New `backend/engine/risk_scores.py`
- `calculate_npi(tumour_size_cm, grade, lymph_nodes) → {score, band, color}`
- `calculate_cts5(tumour_size, lymph_nodes, grade, age) → {risk_percent, category}` (ER+ only)

**Frontend:**
- New `<PrognosticRiskPanel>` in Results page (below Hero, above Treatment Paths)

---

### 🎨 How to Present It

This is where you show **real clinical intelligence** — not just treatment recommendations but prognostic scoring. Make it look like a premium clinical dashboard widget.

**Visual Design — "Prognostic Summary" panel:**

```
┌────────────────────────────────────────────────────────┐
│  📊 PROGNOSTIC RISK ASSESSMENT                         │
│  ─────────────────────────────────────────────────     │
│                                                        │
│  ┌──────────────────┐    ┌───────────────────────┐     │
│  │  NPI SCORE       │    │  CTS5 LATE RECURRENCE │     │
│  │                  │    │  (ER+ only, yrs 5-10) │     │
│  │     3.6          │    │         8.4%          │     │
│  │  ▓▓▓▓▓░░░░░      │    │  ████████░░  Low-Int. │     │
│  │  MODERATE I      │    │                       │     │
│  │                  │    │  Discuss extended     │     │
│  │  Intermediate    │    │  endocrine therapy.   │     │
│  │  prognosis band  │    │                       │     │
│  └──────────────────┘    └───────────────────────┘     │
│                                                        │
│  NPI Bands: ●Excellent ●Good ●Moderate ●Poor           │
└────────────────────────────────────────────────────────┘
```

**Micro-interactions:**
1. **NPI Score dial/gauge:** An animated arc gauge (like a speedometer) fills in from left-to-right when the page loads. The needle settles on the score with a slight spring bounce. The band color changes the entire gauge fill (green=Excellent, teal=Good, amber=Moderate, red=Poor).
2. **CTS5 bar:** A horizontal progress bar that fills in with a count-up animation for the percentage. Color shifts from green → amber → red based on risk level.
3. **Hover tooltip:** Hovering over the NPI score shows a breakdown: *"0.2 × 2.5cm + Grade 2 + 1 node = 3.6"* — making the calculation transparent.
4. CTS5 section only renders if `subtype === "Luminal A" || "Luminal B"` and `er_status === "Positive"` — otherwise shows *"Not applicable for this subtype."*

---
---

## 🟢 Phase 6: Core Engine Fixes (With Visual Impact)

### Ki-67 Fix (14% → 20%) & Confidence Scores

These are backend fixes, but they directly change what the UI displays. The existing `ConfidenceRing` component will now show NCCN-calibrated values instead of fabricated ones.

### 🎨 How to Present It

**Update the existing Confidence Ring tooltip:**
- Add a small info icon `ⓘ` next to the confidence ring
- Hovering shows: *"Confidence based on NCCN Evidence Category 1 (uniform expert consensus across Phase III trials). Higher confidence indicates stronger guideline support, not outcome guarantee."*
- This single tooltip transforms a magic number into a defensible metric

**Update the Ki-67 display in the Classification Logic panel:**
- If Ki-67 is in the borderline zone (15–25%), add an amber indicator: *"⚠️ Borderline Ki-67 — genomic assay (OncotypeDX/MammaPrint) recommended for confirmation"*
- This shows the system is clinically nuanced, not just binary

### Disable Ollama LLM — Rebrand the Panel

Currently the UI shows `"AI Clinical Rationale · Ollama LLM"` badge. After removing the LLM call:
- Rename the card from **"AI Clinical Rationale"** to **"Guideline-Based Rationale"**
- Change the badge from `"Ollama LLM"` to `"NCCN/ESMO Rules-Based"`
- Change the `Brain` icon to a `BookOpen` or `Microscope` icon
- This is more honest AND more impressive — *"100% deterministic, zero hallucination risk"* is a stronger claim in oncology than *"AI-generated"*

---
---

## 🔵 Phase 7: Engine Transparency Page

### What to Build

- New page: `/dashboard/engine/page.tsx`
- Shows the 5-stage pipeline visually
- Lists all clinical guidelines referenced
- Shows the unit test results (count + pass/fail)

---

### 🎨 How to Present It

This page is your **"show your work"** page — the one you navigate to in the interview when asked "how does the engine work?"

**Visual Design — "Clinical Intelligence Engine" page:**

```
┌────────────────────────────────────────────────────────┐
│  ⚙️  ONCOPLIOT ENGINE  v2.0                             │
│  Clinical Decision Engine · Rule-Based · Auditable     │
│                                                        │
│  PROCESSING PIPELINE                                   │
│  ─────────────────────────────────────────────────     │
│                                                        │
│  [Stage 1]──▶[Stage 2]──▶[Stage 3]──▶[Stage 4]──▶[Stage 5]
│  Subtype    Genomic     Immune      Treatment   Safety  │
│  Classify   Risk        Flags       Pathways    Check   │
│                                                        │
│  Hover any stage to see the exact rules that fire      │
│                                                        │
│  GUIDELINES REFERENCED                                 │
│  ─────────────────────────────────────────────────     │
│  ● NCCN Breast Cancer Guidelines 2024                  │
│  ● ESMO Early Breast Cancer Guidelines 2023            │
│  ● St. Gallen Consensus 2023 (Ki-67 threshold)         │
│  ● TAILORx Trial 2018 (OncotypeDX postmenopausal)      │
│  ● RxPONDER Trial 2021 (OncotypeDX premenopausal)      │
│  ● monarchE Trial (Abemaciclib node-positive HR+)      │
│  ● KEYNOTE-522 (Pembrolizumab for TNBC)                │
│                                                        │
│  VALIDATION                                            │
│  ─────────────────────────────────────────────────     │
│  ✅ 30+ Unit Tests · All Passing                        │
│  ✅ 5 Subtypes · Independently Validated               │
│  ✅ 6 Contraindication Rules · Tested                  │
└────────────────────────────────────────────────────────┘
```

**Micro-interactions:**
1. The **5-stage pipeline** is a horizontal flow diagram where each stage is a clickable node. Clicking a node slides open a panel below showing the actual rules for that stage (e.g., "Stage 1 fires if ER > 1% AND PR > 1% AND HER2 negative AND Ki-67 < 20%").
2. **Guidelines list** — Each reference has a small external link icon that opens the actual NCCN/ESMO URL.
3. **"Live Demo" button** — Allows entering biomarker values and watching the pipeline animate step-by-step, highlighting which rule fires at each stage.

---
---

## Complete Feature-Presentation Matrix

| Feature | Visual Centrepiece | Animation | Color Identity |
|---------|-------------------|-----------|---------------|
| **Doctor Finalization** | Clinical Verdict Panel with 3 action buttons | Spring stamp animation on approval | Green/Amber/Red per decision |
| **Patient Portal** | "Treatment Journey" timeline stepper | Warm gradient entrance animation | Violet-to-rose warm palette |
| **Data Completeness** | Field completeness % with per-field status pills | Count-up percentage animation | Amber pulsing for missing fields |
| **DDI Checker** | Drug clash visualization (`Pill ←⚡→ Pill`) | Staggered card entrance | Rose=MAJOR, Amber=MODERATE |
| **NPI Score** | Animated arc gauge / speedometer | Spring needle settle | Gradient green→amber→red |
| **CTS5 Risk** | Animated horizontal risk bar | Fill count-up animation | Risk-level adaptive color |
| **Engine Transparency** | Interactive 5-stage pipeline flow | Node click-to-expand | Cyan accent (#0891B2) |
| **Confidence Ring** | Existing ring + info tooltip | Already animated | Green/Amber/Red |
| **Guideline Rationale** | Renamed card from "AI" to "Rules-Based" | None needed | Blue book icon |

---

## Implementation Order (Fastest to Most Impactful Demo Path)

```
Day 1:  Phase 6 (Engine fixes — backend only, high credibility)
Day 2:  Phase 3 (DDI checker backend) + Phase 5 (risk scores backend)
Day 3:  Phase 3 UI (Data completeness) + Phase 4 UI (DDI panel) + Phase 5 UI (NPI/CTS5)
Day 4:  Phase 1 (Doctor finalization — backend + UI)
Day 5:  Phase 2 (Patient portal) + Phase 7 (Engine transparency page)
```

By end of Day 3, the core results page is interview-ready. Phases 1, 2, and 7 are the demo showpieces.
