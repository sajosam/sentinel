from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from app.config import settings

# SQLite connection args for thread safety
connect_args = {"check_same_thread": False} if settings.DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(
    settings.DATABASE_URL,
    echo=False,
    connect_args=connect_args
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


# Columns added after the first release; SQLite create_all() does not alter existing tables
ADDED_COLUMNS = {
    "attack_paths": [
        ("entry_point", "TEXT"),
        ("vulnerable_component", "TEXT"),
        ("possible_impact", "TEXT"),
        ("supporting_evidence", "TEXT"),
        ("confidence", "TEXT"),
        ("recommended_next_check", "TEXT"),
    ],
    "remediation_runs": [
        ("patched_content", "TEXT"),
        ("generated_by", "VARCHAR(128)"),
        ("baseline_test_failures", "JSON"),
    ],
    "findings": [
        ("origin_commit", "VARCHAR(40)"),
        ("origin_author", "VARCHAR(255)"),
        ("origin_date", "VARCHAR(32)"),
        ("origin_subject", "TEXT"),
        ("origin_ai_authored", "BOOLEAN"),
        ("origin_ai_agent", "VARCHAR(128)"),
    ],
}


def init_db():
    Base.metadata.create_all(bind=engine)
    if settings.DATABASE_URL.startswith("sqlite"):
        from sqlalchemy import text
        with engine.connect() as conn:
            for table_name, new_cols in ADDED_COLUMNS.items():
                table_check = conn.execute(
                    text("SELECT name FROM sqlite_master WHERE type='table' AND name=:name"),
                    {"name": table_name}
                ).fetchone()
                if not table_check:
                    continue
                cols_info = conn.execute(text(f"PRAGMA table_info({table_name})")).fetchall()
                existing_cols = {row[1] for row in cols_info}
                for col_name, col_type in new_cols:
                    if col_name not in existing_cols:
                        conn.execute(text(f"ALTER TABLE {table_name} ADD COLUMN {col_name} {col_type}"))
            conn.commit()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
