"""
core/migrate.py — Auto-migration for missing columns.

Vercel serverless + Supabase: there's no Alembic migration pipeline,
so this module checks for missing columns and adds them on startup.
Every statement is idempotent (ADD COLUMN IF NOT EXISTS).
"""
import logging
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncEngine

logger = logging.getLogger(__name__)

# Each entry: (table, column, column_definition)
# These are ALL the columns that might be missing from the Supabase DB
# because they were added to the Python models after initial table creation.
REQUIRED_COLUMNS = [
    # results table — added for doctor finalization & validation
    ("results", "validation_alerts", "JSONB"),
    ("results", "final_treatment_plan", "JSONB"),
    ("results", "doctor_decision", "VARCHAR(50)"),
    ("results", "override_reason", "TEXT"),
    ("results", "is_simulation", "BOOLEAN DEFAULT FALSE"),

    # cases table — tags should be varchar array
    # (we already fixed the model, but ensure column exists)
    ("cases", "tags", "VARCHAR(255)[]"),
    ("cases", "is_deleted", "BOOLEAN DEFAULT FALSE"),

    # clinical_data table — extra biomarker columns
    ("clinical_data", "pdl1_status", "VARCHAR(50)"),
    ("clinical_data", "pik3ca_status", "VARCHAR(50)"),
    ("clinical_data", "tp53_status", "VARCHAR(50)"),
    ("clinical_data", "cyclin_d1", "VARCHAR(50)"),
    ("clinical_data", "top2a", "VARCHAR(50)"),
    ("clinical_data", "bcl2", "VARCHAR(50)"),
    ("clinical_data", "pam50", "VARCHAR(100)"),
    ("clinical_data", "allergies", "TEXT"),
    ("clinical_data", "histological_type", "VARCHAR(255)"),
]


async def run_auto_migration(engine: AsyncEngine) -> None:
    """Add any missing columns to the database. Safe to run on every startup."""
    async with engine.begin() as conn:
        for table, column, col_type in REQUIRED_COLUMNS:
            stmt = text(
                f"ALTER TABLE {table} ADD COLUMN IF NOT EXISTS {column} {col_type}"
            )
            try:
                await conn.execute(stmt)
                logger.info(f"Ensured column {table}.{column} exists")
            except Exception as e:
                # Log but don't crash — column might already exist with a
                # slightly different type, which is fine.
                logger.warning(f"Migration for {table}.{column}: {e}")

    # Also ensure the tables themselves exist (for fresh DBs)
    from core.database import Base
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    logger.info("Auto-migration complete")
