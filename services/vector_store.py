import math
from services.embedding_service import EmbeddingService
from services.text_splitter import split_text
from datetime import datetime
from services.hash_service import calculate_text_hash

MAX_CHUNK_COUNT = 120


class VectorStore:
    def __init__(self):
        self.embedding_service = EmbeddingService()
        self.chunks: list[dict] = []
        self.next_chunk_id = 1
        self.source_hashes: dict[str, dict] = {}
        self.chunk_hashes: set[str] = set()

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

    def add_text(
        self,
        text: str,
        chunk_size: int = 500,
        overlap: int = 100,
        source_name: str = "手动输入文本",
        source_type: str = "manual",
        allow_duplicate: bool = False,
) -> dict:
        """
            把文本切分、向量化，并加入知识库。

            第 17 课新增：
            1. 使用 source_hash 判断整篇文本是否重复
            2. 使用 chunk_hash 判断单个 chunk 是否重复
            3. 重复内容不再生成 embedding，避免浪费
        """
        clean_text = text.strip()

        if not clean_text:
            return {
                "message": "没有可添加文本",
                "chunk_count": 0,
                "text_length": 0,
                "total_chunks": len(self.chunks),
                "duplicate": False,
            }

        clean_source_name = source_name.strip() if source_name else "未命名来源"

        # 1. 计算整篇文本 hash
        source_hash = calculate_text_hash(clean_text)

        # 2. 如果整篇文本以前加入过，并且不允许重复添加，就直接跳过
        if source_hash in self.source_hashes and not allow_duplicate:
            old_source = self.source_hashes[source_hash]

            return {
                "message": "内容重复，已跳过添加",
                "chunk_count": 0,
                "text_length": len(clean_text),
                "total_chunks": len(self.chunks),
                "duplicate": True,
                "source_hash": source_hash,
                "duplicated_source_name": old_source.get("source_name", "未知来源"),
                "duplicated_source_type": old_source.get("source_type", "unknown"),
                "duplicated_created_at": old_source.get("created_at", ""),
            }

        # 3. 文本切分
        chunks = split_text(
            text=clean_text,
            chunk_size=chunk_size,
            overlap=overlap,
        )

        if not chunks:
            return {
                "message": "没有可添加文本",
                "chunk_count": 0,
                "text_length": len(clean_text),
                "total_chunks": len(self.chunks),
                "duplicate": False,
                "source_hash": source_hash,
            }

        if len(chunks) > MAX_CHUNK_COUNT:
            raise ValueError(
                f"文本太长，切分后有 {len(chunks)} 个 chunk，当前学习版最多支持 {MAX_CHUNK_COUNT} 个。"
                "请先换短一点的文本，或者分多次添加。"
            )

        # 4. 对每个 chunk 也做 hash，过滤重复 chunk
        new_chunk_items = []
        skipped_duplicate_chunks = 0

        for index, chunk in enumerate(chunks):
            chunk_hash = calculate_text_hash(chunk)

            if chunk_hash in self.chunk_hashes and not allow_duplicate:
                skipped_duplicate_chunks += 1
                continue

            new_chunk_items.append({
                "content": chunk,
                "chunk_index": index,
                "chunk_hash": chunk_hash,
            })

        # 5. 如果所有 chunk 都重复，就不调用 embedding
        if not new_chunk_items:
            self.source_hashes[source_hash] = {
                "source_name": clean_source_name,
                "source_type": source_type,
                "created_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            }

            return {
                "message": "所有 chunk 都已存在，已跳过添加",
                "chunk_count": 0,
                "text_length": len(clean_text),
                "total_chunks": len(self.chunks),
                "duplicate": True,
                "source_hash": source_hash,
                "skipped_duplicate_chunks": skipped_duplicate_chunks,
            }

        # 6. 只给新的 chunk 生成 embedding
        new_chunk_texts = [
            item["content"]
            for item in new_chunk_items
        ]

        embeddings = self.embedding_service.embed_texts(new_chunk_texts)

        if len(embeddings) != len(new_chunk_items):
            raise RuntimeError("embedding 生成数量和 chunk 数量不一致")

        created_at = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        added_chunk_ids = []

        # 7. 保存新的 chunk
        for item, embedding in zip(new_chunk_items, embeddings):
            chunk_id = self.next_chunk_id

            self.chunks.append({
                "chunk_id": chunk_id,
                "content": item["content"],
                "embedding": embedding,

                # 来源元数据
                "source_name": clean_source_name,
                "source_type": source_type,
                "chunk_index": item["chunk_index"],
                "created_at": created_at,

                # 第 17 课新增：hash 元数据
                "source_hash": source_hash,
                "chunk_hash": item["chunk_hash"],
            })

            self.chunk_hashes.add(item["chunk_hash"])
            added_chunk_ids.append(chunk_id)
            self.next_chunk_id += 1

        # 8. 记录整篇文本 hash
        self.source_hashes[source_hash] = {
            "source_name": clean_source_name,
            "source_type": source_type,
            "created_at": created_at,
        }

        return {
            "message": "添加成功",
            "chunk_count": len(new_chunk_items),
            "original_chunk_count": len(chunks),
            "skipped_duplicate_chunks": skipped_duplicate_chunks,
            "text_length": len(clean_text),
            "total_chunks": len(self.chunks),
            "duplicate": False,

            "source_name": clean_source_name,
            "source_type": source_type,
            "source_hash": source_hash,
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
