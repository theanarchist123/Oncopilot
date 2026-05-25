from fastapi import APIRouter
from engine.biomarker_config import SUBTYPE_RULES, PROTOCOLS, CONTRAINDICATIONS

router = APIRouter(prefix="/api/engine", tags=["engine"])

@router.get("/rules")
async def get_engine_rules():
    return {
        "subtypes": SUBTYPE_RULES,
        "protocols": PROTOCOLS,
        "contraindications": CONTRAINDICATIONS
    }
