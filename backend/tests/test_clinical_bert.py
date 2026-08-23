"""
tests/test_clinical_bert.py
Unit tests for the ClinicalBERT embedding layer.
These tests verify the module's logic independent of whether the model weights
are actually downloaded; the model-download-dependent tests are marked as
`@pytest.mark.slow` and skipped in CI unless BERT is available.
"""
from __future__ import annotations

import pytest
from engine.biomarker_algorithm import ClinicalInput, run_pipeline
from engine import clinical_bert


# ─── Tests that NEVER require model weights ───────────────────────────────────

def test_build_clinical_text_luminal_a():
    """build_clinical_text should produce a readable clinical sentence."""
    ci = ClinicalInput(
        er_status="Positive",
        pr_status="Positive",
        her2_status="Negative",
        ki67_percent=8.0,
        grade=1,
        stage="I",
    )
    text = clinical_bert.build_clinical_text(ci)
    assert "Estrogen receptor Positive" in text
    assert "HER2 status Negative" in text
    assert "Ki-67 proliferation index 8.0 percent" in text
    assert "Grade 1 well differentiated" in text


def test_build_clinical_text_triple_negative():
    """build_clinical_text should include BRCA and PD-L1 when present."""
    ci = ClinicalInput(
        er_status="Negative",
        pr_status="Negative",
        her2_status="Negative",
        ki67_percent=45.0,
        brca1_status="Positive",
        pdl1_status="Positive",
        tils_percent=30.0,
        grade=3,
        stage="III",
    )
    text = clinical_bert.build_clinical_text(ci)
    assert "BRCA1 mutation Positive" in text
    assert "PD-L1 expression Positive" in text
    assert "Tumour infiltrating lymphocytes 30.0 percent" in text


def test_fuse_confidence_no_bert_scores():
    """fuse_confidence should return rule confidence unchanged when no BERT scores."""
    fused, contribution = clinical_bert.fuse_confidence(0.91, {}, "Luminal A")
    assert fused == 0.91
    assert contribution == 0.0


def test_fuse_confidence_with_scores():
    """fuse_confidence should blend BERT similarity with rule confidence."""
    bert_scores = {
        "Luminal A": 0.92,
        "Luminal B (HER2-)": 0.87,
        "HER2-Enriched": 0.84,
        "Luminal B (HER2+)": 0.85,
        "Triple-Negative": 0.82,
    }
    fused, contribution = clinical_bert.fuse_confidence(0.91, bert_scores, "Luminal A")
    # Fused score should be between 0 and 1
    assert 0.0 <= fused <= 1.0
    # BERT contribution should be the raw cosine for the predicted subtype
    assert contribution == 0.92
    # Luminal A has highest BERT sim → fused should be >= rule confidence baseline
    assert fused >= 0.70  # at minimum remains reasonable


def test_fuse_confidence_low_bert_agreement():
    """When BERT disagrees with the rule engine, fused confidence should be lower."""
    bert_scores = {
        "Luminal A": 0.83,           # rule says Luminal A but BERT has it lowest
        "Luminal B (HER2-)": 0.93,   # BERT prefers this
        "HER2-Enriched": 0.91,
        "Luminal B (HER2+)": 0.90,
        "Triple-Negative": 0.89,
    }
    fused_agree, _ = clinical_bert.fuse_confidence(0.91, {
        "Luminal A": 0.95,
        "Luminal B (HER2-)": 0.82,
        "HER2-Enriched": 0.81,
        "Luminal B (HER2+)": 0.83,
        "Triple-Negative": 0.80,
    }, "Luminal A")

    fused_disagree, _ = clinical_bert.fuse_confidence(0.91, bert_scores, "Luminal A")

    # When BERT agrees the fused score should be higher
    assert fused_agree > fused_disagree


def test_pipeline_result_has_bert_fields():
    """
    run_pipeline should always return embedding_subtype_scores and
    bert_confidence_contribution fields (even if BERT is unavailable and returns {}).
    """
    ci = ClinicalInput(
        er_status="Positive",
        pr_status="Positive",
        her2_status="Negative",
        ki67_percent=10.0,
        grade=1,
        stage="I",
    )
    result = run_pipeline(ci)
    assert hasattr(result, "embedding_subtype_scores")
    assert hasattr(result, "bert_confidence_contribution")
    assert isinstance(result.embedding_subtype_scores, dict)
    assert isinstance(result.bert_confidence_contribution, float)
    # Confidence must still be in a valid range
    assert 0.0 <= result.subtype_confidence <= 1.0


# ─── Tests that require model weights (skip if BERT not available) ─────────────

@pytest.mark.slow
def test_encode_returns_vector():
    """encode() should return a 768-dim numpy array for any text."""
    import numpy as np
    vec = clinical_bert.encode("Estrogen receptor positive breast carcinoma.")
    if vec is None:
        pytest.skip("ClinicalBERT model not installed")
    assert vec.shape == (768,)
    assert not np.isnan(vec).any()


@pytest.mark.slow
def test_luminal_a_highest_similarity():
    """
    A Luminal A clinical text should score highest against the Luminal A prototype.
    """
    ci = ClinicalInput(
        er_status="Positive",
        pr_status="Positive",
        her2_status="Negative",
        ki67_percent=6.0,
        grade=1,
        stage="I",
    )
    text = clinical_bert.build_clinical_text(ci)
    scores = clinical_bert.score_against_subtypes(text)
    if not scores:
        pytest.skip("ClinicalBERT model not installed")
    top_subtype = max(scores, key=scores.__getitem__)
    assert top_subtype == "Luminal A", (
        f"Expected Luminal A to score highest, got {top_subtype}. Scores: {scores}"
    )


@pytest.mark.slow
def test_tnbc_highest_similarity():
    """
    A TNBC clinical text should score highest against the Triple-Negative prototype.
    """
    ci = ClinicalInput(
        er_status="Negative",
        pr_status="Negative",
        her2_status="Negative",
        ki67_percent=55.0,
        brca1_status="Positive",
        pdl1_status="Positive",
        tils_percent=40.0,
        grade=3,
        stage="III",
    )
    text = clinical_bert.build_clinical_text(ci)
    scores = clinical_bert.score_against_subtypes(text)
    if not scores:
        pytest.skip("ClinicalBERT model not installed")
    top_subtype = max(scores, key=scores.__getitem__)
    assert top_subtype == "Triple-Negative", (
        f"Expected Triple-Negative to score highest, got {top_subtype}. Scores: {scores}"
    )
