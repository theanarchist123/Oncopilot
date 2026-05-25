"""api/routes/cases.py"""
from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import BaseModel
from typing import Optional, Any
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from models.result import Result

from core.database import get_db
from api.deps import get_current_user
from models.user import User
from schemas import CaseCreate, CaseUpdate, CaseOut, PaginatedResponse, SuccessResponse
from services.case_service import (
    list_cases, get_case, create_case, update_case,
    soft_delete_case, get_case_history
)

router = APIRouter(prefix="/api/cases", tags=["cases"])


@router.get("/", response_model=PaginatedResponse)
async def list_my_cases(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    sort: str = Query("created_at"),
    order: str = Query("desc"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    cases, total = await list_cases(db, current_user.id, page, limit, sort, order)
    return PaginatedResponse(
        data=[CaseOut.model_validate(c) for c in cases],
        total=total, page=page, limit=limit
    )


@router.post("/", response_model=SuccessResponse, status_code=201)
async def new_case(
    body: CaseCreate,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    case = await create_case(db, current_user.id, body, request.client.host)
    await db.commit()
    full_case = await get_case(db, case.id, current_user.id)
    return SuccessResponse(data=CaseOut.model_validate(full_case), message="Case created")


@router.get("/{case_id}", response_model=SuccessResponse)
async def get_one(
    case_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    case = await get_case(db, case_id, current_user.id)
    if not case:
        raise HTTPException(404, "Case not found")
    return SuccessResponse(data=CaseOut.model_validate(case))


@router.patch("/{case_id}", response_model=SuccessResponse)
async def update_one(
    case_id: uuid.UUID,
    body: CaseUpdate,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    case = await get_case(db, case_id, current_user.id)
    if not case:
        raise HTTPException(404, "Case not found")
    case = await update_case(db, case, body, current_user.id, request.client.host)
    await db.commit()
    full_case = await get_case(db, case.id, current_user.id)
    return SuccessResponse(data=CaseOut.model_validate(full_case), message="Case updated")


@router.delete("/{case_id}", response_model=SuccessResponse)
async def delete_one(
    case_id: uuid.UUID,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    case = await get_case(db, case_id, current_user.id)
    if not case:
        raise HTTPException(404, "Case not found")
    await soft_delete_case(db, case, current_user.id, request.client.host)
    await db.commit()
    return SuccessResponse(message="Case deleted")


@router.get("/{case_id}/history", response_model=SuccessResponse)
async def case_history(
    case_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    case = await get_case(db, case_id, current_user.id)
    if not case:
        raise HTTPException(404, "Case not found")
    versions = await get_case_history(db, case_id)
    return SuccessResponse(data=[{
        "subtype_confidence": v.subtype_confidence, "created_at": v.created_at,
    } for v in versions])


class FinalizeCaseRequest(BaseModel):
    decision: str  # 'accept', 'modify', 'override'
    final_treatment_plan: dict[str, Any]
    override_reason: Optional[str] = None

@router.post("/{case_id}/finalize", response_model=SuccessResponse)
async def finalize_case(
    case_id: uuid.UUID,
    body: FinalizeCaseRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    case = await get_case(db, case_id, current_user.id)
    if not case:
        raise HTTPException(404, "Case not found")
        
    # Get latest result
    q = select(Result).where(Result.case_id == case_id, Result.is_simulation == False).order_by(Result.version.desc())
    result = (await db.execute(q)).scalars().first()
    if not result:
        raise HTTPException(400, "No analysis result found for this case")
        
    result.doctor_decision = body.decision
    result.final_treatment_plan = body.final_treatment_plan
    result.override_reason = body.override_reason
    
    case.status = "treatment_decided"
    
    await db.commit()
    return SuccessResponse(message="Treatment plan finalized successfully")
