import os
from dotenv import load_dotenv
from sqlalchemy import create_engine, inspect, text
from sqlalchemy.exc import OperationalError
from sqlalchemy.orm import declarative_base, sessionmaker

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL 没有配置，请检查 .env 文件")


engine = create_engine(
    DATABASE_URL,
    echo=False,
    pool_pre_ping=True,
    pool_recycle=3600,
)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
)


Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    from services import db_models

    Base.metadata.create_all(bind=engine)
    ensure_document_soft_delete_columns()


def ensure_document_soft_delete_columns():
    inspector = inspect(engine)

    if "documents" not in inspector.get_table_names():
        return

    column_names = {
        column["name"]
        for column in inspector.get_columns("documents")
    }

    statements = []

    if "is_deleted" not in column_names:
        if engine.dialect.name == "mysql":
            statements.append(
                "ALTER TABLE documents ADD COLUMN is_deleted TINYINT(1) NOT NULL DEFAULT 0"
            )
        else:
            statements.append(
                "ALTER TABLE documents ADD COLUMN is_deleted BOOLEAN NOT NULL DEFAULT 0"
            )

    if "deleted_at" not in column_names:
        statements.append(
            "ALTER TABLE documents ADD COLUMN deleted_at DATETIME NULL"
        )

    if not statements:
        return

    with engine.begin() as connection:
        for statement in statements:
            try:
                connection.execute(text(statement))
            except OperationalError as e:
                error_code = e.orig.args[0] if getattr(e.orig, "args", None) else None
                error_message = str(e.orig).lower()

                if error_code == 1060 or "duplicate column" in error_message:
                    continue

                raise
