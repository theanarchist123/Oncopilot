TCGA BREAST CANCER (BRCA) PATHOLOGY REPORTS — extracted for OnCopilot testing
================================================================================

SOURCE: tatonetti-lab/tcga-path-reports (GitHub, MIT License)
         "TCGA-Reports: A Machine-Readable Pathology Report Resource for
         Benchmarking Text-Based AI Models" (Kefeli & Tatonetti)
         https://github.com/tatonetti-lab/tcga-path-reports

NOTE on the S3 link you originally asked for:
The S3 website (tatonettilab-resources.s3-website-us-west-1.amazonaws.com)
only hosts the RAW INPUT IMAGES and AWS Textract OCR-output files used to
BUILD this dataset — not something you need. The file you actually want is
TCGA_Reports.csv, which is on GitHub (reachable, unlike the S3 site, which
is blocked/unreachable from my environment too — not just yours).

WHAT'S IN THIS FOLDER:
- TCGA_BRCA_Pathology_Reports_1034.csv
    1,034 breast cancer pathology reports, filtered from the full 9,523-report
    corpus (32 cancer types) using the official TCGA patient-to-cancer-type
    mapping (project_id = BRCA). Columns: patient_filename, text.
    Avg length ~4,000 characters/report (range: 138–26,162 chars).

- sample_reports_txt/ (10 individual .txt files)
    A small hand-pickable starter set, one plain-text file per patient,
    for quick manual upload/testing without touching the CSV.

IMPORTANT CAVEATS BEFORE YOU USE THESE FOR YOUR DEMO:
1. These are REAL (de-identified) TCGA patient reports — free for research/
   academic use under TCGA's open-access policy and this repo's MIT license.
   Fine for a capstone demo; just don't claim they're synthetic.
2. They are GENERAL surgical pathology/diagnosis reports — format varies a
   lot report-to-report (TCGA sourced these from dozens of different
   hospitals over many years). Many will NOT have a clean IHC panel
   (ER/PR/HER2/Ki-67) in a separate section the way a modern single-hospital
   report does — some only have histologic diagnosis, grade, and staging.
   Good for testing OCR/NLP robustness on real messy text; not guaranteed
   to be good for testing complete biomarker auto-fill. Spot-check a few
   before you demo live.
3. Known OCR artifacts in the source text (e.g. "Is" instead of "is",
   stray periods) — this is exactly the kind of real-world noise your
   OCR+LLM extraction pipeline should be robust to, so it's a legitimate
   stress test, just don't be surprised by it.

- TCGA_BRCA_with_biomarkers_527.csv
    Curated subset: 527 of the 1,034 BRCA reports that actually mention
    ER/PR/HER2/Ki-67-type keywords (ranked by how many of 8 biomarker
    keywords each report contains). Start here instead of the full 1,034.

- best_biomarker_reports_txt/ (top 15 individually, ranked)
    The 15 highest-scoring reports as .txt files, filename tagged with
    its keyword-match score (e.g. TCGA-A2-A1G4_score8.txt = 8/8 matched).
    Best starting point for manual spot-check / upload testing.

RECOMMENDATION FOR TOMORROW'S DEMO:
Real TCGA reports are authentic but noisy (OCR artifacts, inconsistent
formatting, gross-description-heavy) — good for proving robustness, risky
for a live "watch it work perfectly" demo. Use a clean synthetic report
(ask Claude to generate one) for the actual live demo, and have 2-3 of
these real TCGA reports on hand as a "look, it even handles messy real
hospital data" backup/bonus point if asked.
