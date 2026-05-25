import httpx
import logging
import urllib.parse
from models.clinical_data import ClinicalData
from models.result import Result

logger = logging.getLogger(__name__)

CLINICAL_TRIALS_API = "https://clinicaltrials.gov/api/v2/studies"

async def fetch_matched_trials(subtype: str, clinical_data: ClinicalData) -> list[dict]:
    """
    Fetches real, recruiting clinical trials from ClinicalTrials.gov 
    matched to the patient's specific subtype and biomarkers.
    """
    
    # 1. Base condition
    params = {
        "query.cond": "Breast Cancer",
        "filter.overallStatus": "RECRUITING",
        "fields": "NCTId,BriefTitle,OverallStatus,Phase,ConditionsModule,ArmsInterventionsModule",
        "pageSize": 5, # We just want the top 5 matches
        "sort": "LastUpdatePostDate:desc"
    }
    
    # 2. Build search terms based on subtype and biomarkers
    terms = []
    if subtype == "Triple-Negative":
        terms.append("Triple Negative")
    elif subtype == "HER2-Enriched":
        terms.append("HER2 Positive")
    elif "Luminal" in subtype:
        terms.append("ER Positive")
        
    if clinical_data:
        if str(clinical_data.pdl1_status).lower() in ("positive", "yes", "+"):
            terms.append("Pembrolizumab")
        if str(clinical_data.brca1_status).lower() in ("positive", "yes") or str(clinical_data.brca2_status).lower() in ("positive", "yes"):
            terms.append("Olaparib")
        if str(clinical_data.pik3ca_status).lower() in ("positive", "yes", "mutation"):
            terms.append("Alpelisib")
            
    if terms:
        # ClinicalTrials.gov query.term accepts space-separated words (acts as AND)
        # Using OR explicitly can sometimes break the v2 simple parser, 
        # but just passing the terms will search for them.
        params["query.term"] = " ".join(terms)

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(CLINICAL_TRIALS_API, params=params)
            response.raise_for_status()
            data = response.json()
            
            trials = []
            for study in data.get("studies", []):
                protocol = study.get("protocolSection", {})
                ident = protocol.get("identificationModule", {})
                status_mod = protocol.get("statusModule", {})
                design = protocol.get("designModule", {})
                arms_mod = protocol.get("armsInterventionsModule", {})
                
                # Format interventions beautifully
                intervention_list = []
                for intr in arms_mod.get("interventions", []):
                    name = intr.get("name", "")
                    if name and name not in intervention_list:
                        intervention_list.append(name)

                trials.append({
                    "nct_id": ident.get("nctId", "Unknown"),
                    "title": ident.get("briefTitle", "No title"),
                    "status": status_mod.get("overallStatus", "Unknown"),
                    "phases": design.get("phases", []),
                    "interventions": intervention_list[:3] # Limit to 3 to keep UI clean
                })
                
            return trials

    except Exception as e:
        logger.error(f"Error fetching clinical trials: {e}")
        return []

