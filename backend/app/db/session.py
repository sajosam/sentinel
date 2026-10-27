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


def init_db():
    Base.metadata.create_all(bind=engine)
    if settings.DATABASE_URL.startswith("sqlite"):
        from sqlalchemy import text
        with engine.connect() as conn:
            table_check = conn.execute(
                text("SELECT name FROM sqlite_master WHERE type='table' AND name='attack_paths'")
            ).fetchone()
            if table_check:
                cols_info = conn.execute(text("PRAGMA table_info(attack_paths)")).fetchall()
                existing_cols = {row[1] for row in cols_info}
                new_cols = [
                    ("entry_point", "TEXT"),
                    ("vulnerable_component", "TEXT"),
                    ("possible_impact", "TEXT"),
                    ("supporting_evidence", "TEXT"),
                    ("confidence", "TEXT"),
                    ("recommended_next_check", "TEXT"),
                ]
                for col_name, col_type in new_cols:
                    if col_name not in existing_cols:
                        conn.execute(text(f"ALTER TABLE attack_paths ADD COLUMN {col_name} {col_type}"))
                conn.commit()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
