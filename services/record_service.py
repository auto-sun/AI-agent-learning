import json

from sqlalchemy.orm import Session

from services.db_models import DocumentRecord, QARecord

def create_document_record(
        db: Session,
        *,
        filename: str | None = None,
        source_name: str,
        source_type: str,
        file_type: str | None = None,
        file_suffix: str | None = None,
        parsed_text_length: int | None = None,
        result: dict,
) -> DocumentRecord:
    record = DocumentRecord(
        filename=filename,
        source_name=source_name,
        source_type=source_type,
        file_type=file_type,
        file_suffix=file_suffix,
        source_hash=result.get("source_hash"),

        text_length=result.get("text_length", 0),
        parsed_text_length=parsed_text_length,

        chunk_count=result.get("chunk_count", 0),
        original_chunk_count=result.get("original_chunk_count"),
        skipped_duplicate_chunks=result.get("skipped_duplicate_chunks", 0),
        total_chunks_after_add=result.get("total_chunks", 0),

        duplicate=result.get("duplicate", False),
        message=result.get("message"),
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record

def create_qa_record(
        db: Session,
        *,
        question: str,
        answer: str,
        references: list[dict],
        is_answerable: bool,
        max_score: float,
        score_threshold: float,
        top_k: int,
) -> QARecord:
    record = QARecord(
        question=question,
        answer=answer,
        is_answerable=is_answerable,
        max_score=max_score,
        score_threshold=score_threshold,
        top_k=top_k,
        reference_count=len(references),
        references_json=json.dumps(references, ensure_ascii=False),
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record
