from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
import uuid

from core.database import get_db
from models.case import Case
from models.result import Result

router = APIRouter(prefix="/api/patient", tags=["patient"])

@router.get("/my-plan/{case_id}")
async def get_patient_plan(
    case_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    # Get the case and its latest result
    q = select(Case).options(
        selectinload(Case.results)
    ).where(Case.id == case_id)
    
    case = (await db.execute(q)).scalars().first()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
        
    if case.status not in ["treatment_decided", "ongoing", "follow_up"]:
        raise HTTPException(status_code=400, detail="Treatment plan is not finalized yet.")
        
    latest_result = None
    for res in sorted(case.results, key=lambda r: r.version, reverse=True):
        if not res.is_simulation and res.doctor_decision:
            latest_result = res
            break
            
    if not latest_result:
        raise HTTPException(status_code=400, detail="No finalized treatment plan found.")
        
    # Format a simplified, patient-friendly response
    return {
        "success": True,
        "data": {
            "patient_name": case.patient_name,
            "patient_age": case.patient_age,
            "diagnosis_summary": "Breast Cancer",
            "subtype": latest_result.molecular_subtype,
            "treatment_plan": latest_result.final_treatment_plan,
            "doctor_notes": latest_result.override_reason,
            "prognosis": "Good", # This could be extracted from AI reasoning
            "status": case.status
        }
    }
