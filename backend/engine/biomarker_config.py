SUBTYPE_RULES = {
    "Luminal A": {
        "ER": "Positive",
        "HER2": "Negative",
        "Ki-67": "< 20%"
    },
    "Luminal B (HER2-)": {
        "ER": "Positive",
        "HER2": "Negative",
        "Ki-67": ">= 20%"
    },
    "Luminal B (HER2+)": {
        "ER/PR": "Positive",
        "HER2": "Positive"
    },
    "HER2-Enriched": {
        "ER/PR": "Negative",
        "HER2": "Positive"
    },
    "Triple-Negative": {
        "ER": "Negative",
        "PR": "Negative",
        "HER2": "Negative"
    }
}

PROTOCOLS = [
    {
        "name": "Endocrine Therapy (Tamoxifen)",
        "clinical_notes": "First-line hormone therapy for pre-menopausal women.",
        "conditions": [
            {"field": "ER", "op": "==", "value": "Positive"},
            {"field": "Menopausal Status", "op": "==", "value": "Pre"}
        ]
    },
    {
        "name": "Endocrine Therapy (Aromatase Inhibitor)",
        "clinical_notes": "First-line hormone therapy for post-menopausal women.",
        "conditions": [
            {"field": "ER", "op": "==", "value": "Positive"},
            {"field": "Menopausal Status", "op": "==", "value": "Post"}
        ]
    },
    {
        "name": "Anti-HER2 Therapy (Trastuzumab)",
        "clinical_notes": "Targeted therapy for HER2+ cases.",
        "conditions": [
            {"field": "HER2", "op": "==", "value": "Positive"}
        ]
    },
    {
        "name": "Chemotherapy (Anthracycline/Taxane)",
        "clinical_notes": "Standard neoadjuvant/adjuvant chemotherapy.",
        "conditions": [
            {"field": "Tumour Size", "op": ">", "value": "2cm"},
            {"field": "Grade", "op": ">=", "value": "2"}
        ]
    }
]

CONTRAINDICATIONS = [
    {
        "type": "Drug-Drug Interaction",
        "condition": {"field": "Medications", "op": "contains", "value": "Fluoxetine"},
        "recommendation": "Avoid Tamoxifen. Switch to Venlafaxine or use Aromatase Inhibitor if post-menopausal."
    },
    {
        "type": "Cardiac Risk",
        "condition": {"field": "LVEF", "op": "<", "value": "50%"},
        "recommendation": "Avoid Trastuzumab/Anthracyclines due to cardiotoxicity risk."
    }
]
