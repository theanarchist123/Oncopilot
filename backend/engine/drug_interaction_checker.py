"""
engine/drug_interaction_checker.py
Detects drug-drug interactions (DDIs) between the proposed cancer protocol
and the patient's existing medications.
"""
from __future__ import annotations

def check_interactions(patient_meds: str, protocols: list[dict]) -> list[dict]:
    alerts = []
    if not patient_meds:
        return alerts

    patient_meds_lower = patient_meds.lower()
    
    # Pre-parse patient meds to quickly check for substrings
    # E.g., if "fluoxetine" in patient_meds_lower
    
    # 1. Tamoxifen + Fluoxetine/Paroxetine
    has_strong_cyp2d6 = "fluoxetine" in patient_meds_lower or "paroxetine" in patient_meds_lower or "bupropion" in patient_meds_lower
    if has_strong_cyp2d6:
        has_tamoxifen = any("tamoxifen" in str(p.get("drug_names", "")).lower() for p in protocols)
        if has_tamoxifen:
            cyp_drug = "Fluoxetine" if "fluoxetine" in patient_meds_lower else ("Paroxetine" if "paroxetine" in patient_meds_lower else "Bupropion")
            alerts.append({
                "severity": "MAJOR",
                "alert_type": "DDI",
                "trigger": f"{cyp_drug} ←→ Tamoxifen",
                "affected_treatment": "Tamoxifen",
                "recommended_action": f"{cyp_drug} is a strong CYP2D6 inhibitor that reduces Tamoxifen's active form (endoxifen) by up to 65%, significantly reducing treatment effect. ⚡ Recommended: Switch to Venlafaxine (weak CYP2D6 inhibitor) for hot flash/depression management."
            })

    # 2. Capecitabine + Warfarin
    has_warfarin = "warfarin" in patient_meds_lower or "coumadin" in patient_meds_lower
    if has_warfarin:
        has_capecitabine = any("capecitabine" in str(p.get("drug_names", "")).lower() for p in protocols)
        if has_capecitabine:
            alerts.append({
                "severity": "MAJOR",
                "alert_type": "DDI",
                "trigger": "Warfarin ←→ Capecitabine",
                "affected_treatment": "Capecitabine",
                "recommended_action": "Increased GI bleeding risk. Capecitabine significantly increases Warfarin levels (INR elevation). ⚡ Recommended: Switch to LMWH (Low Molecular Weight Heparin) or DOAC if appropriate, or monitor INR twice weekly."
            })

    # 3. Aspirin + Capecitabine (Moderate)
    has_aspirin = "aspirin" in patient_meds_lower or "asa" in patient_meds_lower
    if has_aspirin:
        has_capecitabine = any("capecitabine" in str(p.get("drug_names", "")).lower() for p in protocols)
        if has_capecitabine:
            alerts.append({
                "severity": "MODERATE",
                "alert_type": "DDI",
                "trigger": "Aspirin ←→ Capecitabine",
                "affected_treatment": "Capecitabine",
                "recommended_action": "Increased GI bleeding risk. Monitor closely."
            })

    # 4. CDK4/6i + Strong CYP3A4 Inducers/Inhibitors
    cyp3a4_inducers = ["rifampin", "phenytoin", "carbamazepine", "st john", "st. john"]
    has_inducer = next((m for m in cyp3a4_inducers if m in patient_meds_lower), None)
    if has_inducer:
        has_cdk46i = any(drug in str(p.get("drug_names", "")).lower() for drug in ["palbociclib", "ribociclib", "abemaciclib"] for p in protocols)
        if has_cdk46i:
            alerts.append({
                "severity": "MAJOR",
                "alert_type": "DDI",
                "trigger": f"{has_inducer.capitalize()} ←→ CDK4/6 Inhibitor",
                "affected_treatment": "CDK4/6 Inhibitor",
                "recommended_action": f"{has_inducer.capitalize()} is a strong CYP3A4 inducer which significantly decreases CDK4/6 inhibitor levels, leading to loss of efficacy. ⚡ Recommended: Avoid concomitant use. Consider alternative non-enzyme-inducing agent."
            })

    return alerts
