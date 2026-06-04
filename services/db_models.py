from sqlalchemy import Boolean, Column, DateTime,Float, Integer, String, Text, func
from services.database import Base

class DocumentRecord(Base):
    __tablename__ = "documents"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    filename = Column(String(255), nullable=True)
    source_name = Column(String(255), nullable=False)
    source_type = Column(String(50),nullable=False)
    file_type = Column(String(50), nullable=True)
    file_suffix = Column(String(20), nullable=True) 
    source_hash = Column(String(64), nullable=True, index=True)

    text_length = Column(Integer, nullable=True)
    parsed_text_length = Column(Integer, nullable=True)
    chunk_count = Column(Integer, default=0)
    orginal_chunk_count = Column(Integer, nullable=True)
    skipped_duplicate_counts = Column(Integer, default=0)
    total_chunks_after_add = Column(Integer, default=0)
    duplicate = Column(Boolean, default=False)
    message = Column(String(255), nullable=True)
    created_at = Column(DateTime, server_default=func.now())



class QARecord(Base):
    __tablename__ = "qa_records"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    question = Column(Text, nullable=False)
    answer = Column(Text, nullable=False)

    is_answerable = Column(Boolean, default=True)

    max_score = Column(Float, default=0)
    score_threshold = Column(Float, default=0.55)
    top_k = Column(Integer, default=3)

    reference_count = Column(Integer, default=0)
    references_json = Column(Text, nullable=True)

    created_at = Column(DateTime, server_default=func.now())