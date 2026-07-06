import os
from contextlib import contextmanager
from pathlib import Path

from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import declarative_base, scoped_session, sessionmaker


def _database_url():
    return os.environ.get("DATABASE_URL", "sqlite:///instance/querycrafter.db")


def _engine_kwargs(database_url):
    if database_url.startswith("sqlite"):
        return {"connect_args": {"check_same_thread": False}}
    return {}


DATABASE_URL = _database_url()
engine = create_engine(DATABASE_URL, future=True, **_engine_kwargs(DATABASE_URL))
SessionLocal = scoped_session(
    sessionmaker(bind=engine, autoflush=False, autocommit=False, expire_on_commit=False)
)
Base = declarative_base()


def init_db():
    if DATABASE_URL.startswith("sqlite:///"):
        db_path = DATABASE_URL.replace("sqlite:///", "", 1)
        Path(db_path).parent.mkdir(parents=True, exist_ok=True)

    from models import Base as ModelsBase  # noqa: WPS433

    ModelsBase.metadata.create_all(bind=engine)

    inspector = inspect(engine)
    if "conversations" in inspector.get_table_names():
        columns = {column["name"] for column in inspector.get_columns("conversations")}
        if "api_config_id" not in columns:
            with engine.begin() as connection:
                connection.execute(text("ALTER TABLE conversations ADD COLUMN api_config_id VARCHAR(36)"))
                connection.execute(text("CREATE INDEX IF NOT EXISTS idx_conversations_api_config_id ON conversations(api_config_id)"))


@contextmanager
def get_db():
    db = SessionLocal()
    try:
        yield db
        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()
