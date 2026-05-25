"""
engine/risk_scores.py
Calculates prognostic risk scores: NPI (Nottingham Prognostic Index) and CTS5 (Clinical Treatment Score post-5 years)
"""
from __future__ import annotations
from dataclasses import dataclass

@dataclass
class RiskScoreResult:
    score: float
    category: str

def calculate_npi(size_cm: float, nodes: int, grade: int) -> RiskScoreResult | None:
    if size_cm is None or grade is None or nodes is None:
        return None
    
    # Node Status mapping for NPI
    if nodes == 0:
        node_status = 1
    elif 1 <= nodes <= 3:
        node_status = 2
    else:
        node_status = 3

    npi = (0.2 * size_cm) + node_status + grade
    
    category = "Poor"
    if npi < 3.4:
        category = "Good"
    elif npi <= 5.4:
        category = "Moderate"
        
    return RiskScoreResult(score=round(npi, 2), category=category)

def calculate_cts5(size_cm: float, nodes: int, grade: int, age: int) -> RiskScoreResult | None:
    if size_cm is None or grade is None or nodes is None or age is None:
        return None
        
    cts5 = (0.4 * nodes) + (0.3 * grade) + (0.2 * size_cm) - (0.1 * age)
    
    category = "High Risk"
    if cts5 < 3.14:
        category = "Low Risk"
    elif cts5 <= 3.86:
        category = "Intermediate Risk"
        
    return RiskScoreResult(score=round(cts5, 2), category=category)

def calculate_all_scores(size_cm: float, nodes: int, grade: int, age: int) -> dict:
    npi = calculate_npi(size_cm, nodes, grade)
    cts5 = calculate_cts5(size_cm, nodes, grade, age)
    
    return {
        "npi": {"score": npi.score, "category": npi.category} if npi else None,
        "cts5": {"score": cts5.score, "category": cts5.category} if cts5 else None,
    }
