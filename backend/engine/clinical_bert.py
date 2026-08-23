"""
engine/clinical_bert.py

ClinicalBERT embedding layer for OnCopilot.
Uses emilyalsentzer/Bio_ClinicalBERT (MIMIC-III trained) to:
  1. Encode a patient's clinical profile into a 768-dim embedding
  2. Compare that embedding against pre-encoded subtype prototype texts
     via cosine similarity to produce per-subtype similarity scores
  3. Fuse BERT similarity with the rule engine's confidence score

The model is loaded lazily on first call and cached for the process lifetime.
Falls back gracefully if transformers/torch are not installed.
"""
from __future__ import annotations

import os
import logging
from typing import TYPE_CHECKING

import numpy as np

logger = logging.getLogger(__name__)

# ─── Model config ───────────────────────────────────────────────────────────────
_MODEL_NAME = os.getenv("CLINICALBERT_MODEL", "emilyalsentzer/Bio_ClinicalBERT")
_BERT_WEIGHT = float(os.getenv("CLINICALBERT_WEIGHT", "0.30"))

# Primary: HuggingFace Inference API — just an HTTP call, no local PyTorch needed.
# Get a free token at https://huggingface.co/settings/tokens and set HF_API_TOKEN.
_HF_API_TOKEN = os.getenv("HF_API_TOKEN", "")
_HF_API_URL = f"https://api-inference.huggingface.co/pipeline/feature-extraction/{_MODEL_NAME}"

# ─── Lazy-loaded globals ───────────────────────────────────────────────────────────────
_tokenizer = None
_model = None
_prototype_embeddings: dict[str, np.ndarray] = {}
_bert_available: bool | None = None  # None = not yet tested


# ─── Subtype prototype texts ───────────────────────────────────────────────────
# Representative clinical note snippets for each breast cancer subtype.
# These are used as reference vectors; patient similarity is scored against them.
_SUBTYPE_PROTOTYPES: dict[str, str] = {
    "Luminal A": (
        "Estrogen receptor positive, progesterone receptor positive, HER2 negative breast carcinoma. "
        "Ki-67 proliferation index is low at 8%. Grade 1 invasive ductal carcinoma. "
        "Hormone receptor strongly positive. Low proliferating phenotype. "
        "Excellent prognosis with endocrine therapy alone. No HER2 amplification on FISH. "
        "Tumour is well differentiated with low mitotic activity."
    ),
    "Luminal B (HER2-)": (
        "Estrogen receptor positive, progesterone receptor positive, HER2 negative breast carcinoma. "
        "Ki-67 proliferation index is elevated at 28%. Grade 2 to 3 invasive ductal carcinoma. "
        "High proliferative activity despite hormone receptor positivity. "
        "Requires chemotherapy in addition to endocrine therapy due to high Ki-67. "
        "OncotypeDX recurrence score above 25 indicating chemotherapy benefit."
    ),
    "Luminal B (HER2+)": (
        "Estrogen receptor positive, HER2 positive breast carcinoma. "
        "HER2 overexpressed 3+ by IHC confirmed by FISH amplification. "
        "Ki-67 elevated. Hormone receptor positive with concurrent HER2 amplification. "
        "Dual targeting with anti-HER2 therapy and endocrine therapy required. "
        "Trastuzumab and pertuzumab with chemotherapy followed by endocrine therapy."
    ),
    "HER2-Enriched": (
        "Estrogen receptor negative, progesterone receptor negative, HER2 positive breast carcinoma. "
        "HER2 3+ by IHC and FISH confirmed amplification. Triple negative for hormone receptors. "
        "High-grade invasive ductal carcinoma. Aggressive HER2-driven biology. "
        "Neoadjuvant TCHP regimen with trastuzumab and pertuzumab. "
        "No hormone receptor expression. Purely HER2-enriched subtype."
    ),
    "Triple-Negative": (
        "Estrogen receptor negative, progesterone receptor negative, HER2 negative breast carcinoma. "
        "Triple-negative breast cancer. High grade, high Ki-67. BRCA mutation detected. "
        "PD-L1 expression positive. High tumour infiltrating lymphocytes. "
        "Neoadjuvant chemotherapy with pembrolizumab indicated. "
        "PARP inhibitor eligibility due to germline BRCA1 mutation."
    ),
}


# ─── Model loading ───────────────────────────────────────────────────────────────

def _encode_via_hf_api(text: str) -> np.ndarray | None:
    """
    Call HuggingFace Inference API to get a 768-dim embedding.
    No local model weights needed — just an HTTP call.
    """
    if not _HF_API_TOKEN:
        return None
    try:
        import httpx
        headers = {"Authorization": f"Bearer {_HF_API_TOKEN}"}
        payload = {"inputs": text, "options": {"wait_for_model": True}}
        with httpx.Client(timeout=30.0) as client:
            response = client.post(_HF_API_URL, headers=headers, json=payload)
        if response.status_code != 200:
            logger.warning(f"[ClinicalBERT HF API] status {response.status_code}: {response.text[:200]}")
            return None
        arr = np.array(response.json(), dtype=np.float32)
        if arr.ndim == 3:
            arr = arr[0]          # drop batch dim
        if arr.ndim == 2:
            arr = arr.mean(axis=0)  # mean-pool tokens
        return arr
    except Exception as exc:
        logger.warning(f"[ClinicalBERT HF API] call failed: {exc}")
        return None


def _load_model() -> bool:
    """
    Attempt to load ClinicalBERT tokenizer and model.
    Returns True on success, False if transformers/torch not available.
    Caches result in module-level globals.
    """
    global _tokenizer, _model, _bert_available

    if _bert_available is not None:
        return _bert_available

    try:
        from transformers import AutoTokenizer, AutoModel
        import torch  # noqa: F401 — just verify torch is present

        logger.info(f"[ClinicalBERT] Loading {_MODEL_NAME} …")
        _tokenizer = AutoTokenizer.from_pretrained(_MODEL_NAME)
        _model = AutoModel.from_pretrained(_MODEL_NAME)
        _model.eval()  # inference mode
        logger.info("[ClinicalBERT] Model loaded successfully.")
        _bert_available = True
    except Exception as exc:
        logger.warning(
            f"[ClinicalBERT] Could not load model ({exc}). "
            "ClinicalBERT scoring will be skipped — install transformers & torch."
        )
        _bert_available = False

    return _bert_available


def _mean_pool(token_embeddings: "torch.Tensor", attention_mask: "torch.Tensor") -> np.ndarray:
    """Mean-pool token embeddings weighted by attention mask → sentence vector."""
    import torch

    mask_expanded = attention_mask.unsqueeze(-1).expand(token_embeddings.size()).float()
    sum_embeddings = torch.sum(token_embeddings * mask_expanded, dim=1)
    sum_mask = torch.clamp(mask_expanded.sum(dim=1), min=1e-9)
    pooled = (sum_embeddings / sum_mask).squeeze(0)
    return pooled.detach().numpy()


def encode(text: str) -> np.ndarray | None:
    """
    Encode a clinical text string into a 768-dim embedding vector.
    Tries HuggingFace Inference API first (no memory overhead),
    then falls back to local transformers+torch.
    Returns None if neither backend is available.
    """
    # Primary: HF hosted API
    if _HF_API_TOKEN:
        vec = _encode_via_hf_api(text)
        if vec is not None:
            return vec

    # Fallback: local model (requires transformers + torch installed)
    if not _load_model():
        return None

    import torch

    inputs = _tokenizer(
        text,
        return_tensors="pt",
        truncation=True,
        max_length=512,
        padding=True,
    )
    with torch.no_grad():
        outputs = _model(**inputs)

    return _mean_pool(outputs.last_hidden_state, inputs["attention_mask"])


def _cosine_similarity(a: np.ndarray, b: np.ndarray) -> float:
    """Cosine similarity between two 1-D vectors."""
    norm_a = np.linalg.norm(a)
    norm_b = np.linalg.norm(b)
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return float(np.dot(a, b) / (norm_a * norm_b))


def _get_prototype_embeddings() -> dict[str, np.ndarray]:
    """Encode subtype prototypes once and cache them."""
    global _prototype_embeddings

    if _prototype_embeddings:
        return _prototype_embeddings

    for subtype, text in _SUBTYPE_PROTOTYPES.items():
        emb = encode(text)
        if emb is not None:
            _prototype_embeddings[subtype] = emb

    return _prototype_embeddings


# ─── Public API ───────────────────────────────────────────────────────────────

def build_clinical_text(clinical) -> str:
    """
    Construct a free-text clinical summary from a ClinicalInput dataclass.
    This is the text that gets embedded and compared against subtype prototypes.
    """
    parts = [
        f"Estrogen receptor {clinical.er_status}.",
        f"Progesterone receptor {clinical.pr_status}.",
        f"HER2 status {clinical.her2_status}.",
    ]

    if clinical.ki67_percent is not None:
        parts.append(f"Ki-67 proliferation index {clinical.ki67_percent} percent.")

    if clinical.grade:
        grade_words = {1: "Grade 1 well differentiated", 2: "Grade 2 moderately differentiated", 3: "Grade 3 poorly differentiated"}
        parts.append(f"{grade_words.get(clinical.grade, f'Grade {clinical.grade}')} carcinoma.")

    if clinical.stage:
        parts.append(f"Clinical stage {clinical.stage}.")

    if clinical.brca1_status and clinical.brca1_status.lower() not in ("unknown", "negative", ""):
        parts.append(f"BRCA1 mutation {clinical.brca1_status}.")
    if clinical.brca2_status and clinical.brca2_status.lower() not in ("unknown", "negative", ""):
        parts.append(f"BRCA2 mutation {clinical.brca2_status}.")

    if clinical.pdl1_status and clinical.pdl1_status.lower() not in ("unknown", ""):
        parts.append(f"PD-L1 expression {clinical.pdl1_status}.")

    if clinical.tils_percent is not None:
        parts.append(f"Tumour infiltrating lymphocytes {clinical.tils_percent} percent.")

    if clinical.lymph_nodes_involved:
        parts.append("Lymph nodes involved.")
    else:
        parts.append("Lymph nodes negative.")

    if clinical.menopausal_status and clinical.menopausal_status.lower() not in ("unknown", ""):
        parts.append(f"Patient is {clinical.menopausal_status}.")

    return " ".join(parts)


def score_against_subtypes(clinical_text: str) -> dict[str, float]:
    """
    Encode the clinical text and compute cosine similarity against each
    subtype prototype embedding.

    Returns:
        dict mapping subtype name → similarity score in [0, 1].
        Returns an empty dict if ClinicalBERT is unavailable.
    """
    patient_emb = encode(clinical_text)
    if patient_emb is None:
        return {}

    prototypes = _get_prototype_embeddings()
    if not prototypes:
        return {}

    scores = {}
    for subtype, proto_emb in prototypes.items():
        sim = _cosine_similarity(patient_emb, proto_emb)
        # Cosine similarity in clinical text space tends to be high (0.85+);
        # rescale to [0, 1] using min-max relative to the set for better spread.
        scores[subtype] = round(float(sim), 4)

    return scores


def fuse_confidence(
    rule_confidence: float,
    bert_scores: dict[str, float],
    predicted_subtype: str,
) -> tuple[float, float]:
    """
    Fuse rule-based confidence with ClinicalBERT similarity.

    Args:
        rule_confidence: Confidence from the deterministic rule engine (0–1).
        bert_scores: Per-subtype cosine similarity scores from ClinicalBERT.
        predicted_subtype: The subtype predicted by the rule engine.

    Returns:
        (fused_confidence, bert_contribution) where:
          - fused_confidence is the blended score (0–1)
          - bert_contribution is the BERT similarity for the predicted subtype
    """
    if not bert_scores:
        # ClinicalBERT unavailable — return rule confidence unchanged
        return round(rule_confidence, 3), 0.0

    bert_sim = bert_scores.get(predicted_subtype, 0.0)

    # Normalise BERT similarity: cosine in BERT space clusters near 0.85–0.99.
    # We rescale so the top subtype scores ~1.0 and bottom scores ~0.0.
    all_sims = list(bert_scores.values())
    sim_min = min(all_sims)
    sim_max = max(all_sims)
    if sim_max - sim_min > 0.001:
        bert_normalised = (bert_sim - sim_min) / (sim_max - sim_min)
    else:
        bert_normalised = 1.0  # all subtypes equally similar → no signal

    fused = (1 - _BERT_WEIGHT) * rule_confidence + _BERT_WEIGHT * bert_normalised
    return round(float(fused), 3), round(float(bert_sim), 4)
