import math
from services.embedding_service import EmbeddingService
from services.text_splitter import split_text
from datetime import datetime


MAX_CHUNK_COUNT = 120


class VectorStore:
    def __init__(self):
        self.embedding_service = EmbeddingService()
        self.chunks: list[dict] = []
        self.next_chunk_id = 1

    def cosine_similarity(self, vec1: list[float], vec2: list[float]) -> float:
        if len(vec1) != len(vec2):
            raise ValueError("两个向量长度不一致")

        dot_product = 0.0
        norm1 = 0.0
        norm2 = 0.0

        for a, b in zip(vec1, vec2):
            dot_product += a * b
            norm1 += a * a
            norm2 += b * b

        if norm1 == 0 or norm2 == 0:
            return 0.0

        similarity = dot_product / (math.sqrt(norm1) * math.sqrt(norm2))

        return max(min(similarity, 1.0), -1.0)

    def add_text(self, text: str, chunk_size: int = 500, overlap: int = 100, source_name: str = "手动输入文本", source_type: str = "manual") -> dict:
        
        clean_source_name = source_name.strip() if source_name else "未命名来源"

        chunks = split_text(
            text=text,
            chunk_size=chunk_size,
            overlap=overlap,
        )

        if not chunks:
            return {
                "message": "没有可添加文本",
                "chunk_count": 0,
                "total_chunks": len(self.chunks),
                "source_name": clean_source_name,
                "source_type": source_type,
            }

        if len(chunks) > MAX_CHUNK_COUNT:
            raise ValueError(
                f"文本太长，切分后有 {len(chunks)} 个 chunk，当前学习版最多支持 {MAX_CHUNK_COUNT} 个。"
                "请先换短一点的文本，或者分多次添加。"
            )

        embeddings = self.embedding_service.embed_texts(chunks)

        if len(embeddings) != len(chunks):
            raise RuntimeError("embedding 生成数量和 chunk 数量不一致")

        created_at = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        added_chunk_ids = []
        for index,(chunk, embedding) in enumerate(zip(chunks, embeddings)):
            self.chunks.append({
                "chunk_id": self.next_chunk_id,
                "content": chunk,
                "embedding": embedding,
                "source_name": clean_source_name,
                "source_type": source_type,
                "chunk_index": index,
                "created_at": created_at,
            })
            added_chunk_ids.append(self.next_chunk_id)
            self.next_chunk_id += 1

        return {
            "message": "添加成功",
            "chunk_count": len(chunks),
            "text_length": len(text),
            "total_chunks": len(self.chunks),
            "source_name": clean_source_name,
            "source_type": source_type,
            "added_chunk_ids": added_chunk_ids,
        }

    def search(self, query: str, top_k: int = 3) -> list[dict]:
        """根据查询文本在知识库中搜索最相关的k个文本块。"""
        if not self.chunks:
            return []

        query_embedding = self.embedding_service.embed_text(query)

        results = []

        for chunk in self.chunks:
            score = self.cosine_similarity(
                query_embedding,
                chunk["embedding"],
            )

            results.append({
                "chunk_id": chunk["chunk_id"],
                "content": chunk["content"],
                "score": score,
                "source_name": chunk.get("source_name", "未知来源"),
                "source_type": chunk.get("source_type", "unknown"),
                "chunk_index": chunk.get("chunk_index", -1),
                "created_at": chunk.get("created_at", ""),
            })

        results.sort(key=lambda x: x["score"], reverse=True)
        return results[:top_k]
