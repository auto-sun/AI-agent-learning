from datetime import datetime

import chromadb

from services.embedding_service import EmbeddingService
from services.hash_service import calculate_text_hash
from services.text_splitter import split_text


MAX_CHUNK_COUNT = 120
CHROMA_DB_PATH = "chroma_db"
CHROMA_COLLECTION_NAME = "agri_rag_chunks"


class ChromaVectorStore:
    def __init__(self):
        self.embedding_service = EmbeddingService()

        # PersistentClient 会把 Chroma 数据保存到本地磁盘
        self.client = chromadb.PersistentClient(path=CHROMA_DB_PATH)

        # 我们自己已经有 embedding_service，所以这里不让 Chroma 自动生成 embedding
        # 这样可以继续使用你 .env 里配置的 embedding 模型
        self.collection = self._get_or_create_collection()

    def _get_or_create_collection(self):
        """
        创建或获取 Chroma collection。

        这里使用 cosine 空间，尽量保持和你前面手写余弦相似度的逻辑一致。
        """
        try:
            return self.client.get_or_create_collection(
                name=CHROMA_COLLECTION_NAME,
                embedding_function=None,
                configuration={
                    "hnsw": {
                        "space": "cosine"
                    }
                }
            )
        except TypeError:
            # 兼容部分旧版本 chromadb
            return self.client.get_or_create_collection(
                name=CHROMA_COLLECTION_NAME,
                embedding_function=None,
                metadata={
                    "hnsw:space": "cosine"
                }
            )

    def _exists_by_metadata(self, key: str, value: str) -> bool:
        """
        根据 metadata 判断某条记录是否已经存在。

        例如：
        source_hash 是否存在
        chunk_hash 是否存在
        """
        result = self.collection.get(
            where={
                key: value
            },
            limit=1,
            include=[
                "metadatas"
            ]
        )

        return len(result.get("ids", [])) > 0

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
        把文本切分、向量化，并存入 Chroma。

        和内存版 vector_store 的区别：
        1. chunk 不再存到 self.chunks
        2. chunk、embedding、metadata 都存到 Chroma collection
        3. 程序重启后数据不会丢
        """
        clean_text = text.strip()

        if not clean_text:
            return {
                "message": "没有可添加文本",
                "chunk_count": 0,
                "text_length": 0,
                "total_chunks": self.collection.count(),
                "duplicate": False,
            }

        clean_source_name = source_name.strip() if source_name else "未命名来源"

        source_hash = calculate_text_hash(clean_text)

        # 1. 整篇文档去重
        if not allow_duplicate and self._exists_by_metadata("source_hash", source_hash):
            return {
                "message": "内容重复，已跳过添加",
                "chunk_count": 0,
                "text_length": len(clean_text),
                "total_chunks": self.collection.count(),
                "duplicate": True,
                "source_hash": source_hash,
                "source_name": clean_source_name,
                "source_type": source_type,
            }

        # 2. 文本切分
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
                "total_chunks": self.collection.count(),
                "duplicate": False,
                "source_hash": source_hash,
            }

        if len(chunks) > MAX_CHUNK_COUNT:
            raise ValueError(
                f"文本太长，切分后有 {len(chunks)} 个 chunk，"
                f"当前学习版最多支持 {MAX_CHUNK_COUNT} 个。"
                "请先换短一点的文本，或者分多次添加。"
            )

        # 3. chunk 级别去重
        new_chunk_items = []
        skipped_duplicate_chunks = 0

        for index, chunk in enumerate(chunks):
            chunk_hash = calculate_text_hash(chunk)

            if not allow_duplicate and self._exists_by_metadata("chunk_hash", chunk_hash):
                skipped_duplicate_chunks += 1
                continue

            # Chroma 的 id 必须是字符串
            # 这里用 chunk_hash 当前缀，保证同样内容不会生成重复 id
            chunk_id = f"{source_hash[:12]}-{index}"

            new_chunk_items.append({
                "id": chunk_id,
                "content": chunk,
                "chunk_index": index,
                "chunk_hash": chunk_hash,
            })

        if not new_chunk_items:
            return {
                "message": "所有 chunk 都已存在，已跳过添加",
                "chunk_count": 0,
                "original_chunk_count": len(chunks),
                "skipped_duplicate_chunks": skipped_duplicate_chunks,
                "text_length": len(clean_text),
                "total_chunks": self.collection.count(),
                "duplicate": True,
                "source_hash": source_hash,
                "source_name": clean_source_name,
                "source_type": source_type,
            }

        # 4. 只给新的 chunk 生成 embedding
        new_chunk_texts = [
            item["content"]
            for item in new_chunk_items
        ]

        embeddings = self.embedding_service.embed_texts(new_chunk_texts)

        if len(embeddings) != len(new_chunk_items):
            raise RuntimeError("embedding 生成数量和 chunk 数量不一致")

        created_at = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        ids = []
        documents = []
        metadatas = []

        for item in new_chunk_items:
            ids.append(item["id"])
            documents.append(item["content"])
            metadatas.append({
                "chunk_id": item["id"],
                "source_name": clean_source_name,
                "source_type": source_type,
                "chunk_index": item["chunk_index"],
                "created_at": created_at,
                "source_hash": source_hash,
                "chunk_hash": item["chunk_hash"],
            })

        # 5. 写入 Chroma
        self.collection.upsert(
            ids=ids,
            documents=documents,
            embeddings=embeddings,
            metadatas=metadatas,
        )

        return {
            "message": "添加成功",
            "chunk_count": len(new_chunk_items),
            "original_chunk_count": len(chunks),
            "skipped_duplicate_chunks": skipped_duplicate_chunks,
            "text_length": len(clean_text),
            "total_chunks": self.collection.count(),
            "duplicate": False,
            "source_name": clean_source_name,
            "source_type": source_type,
            "source_hash": source_hash,
            "added_chunk_ids": ids,
        }

    def search(self, query: str, top_k: int = 3) -> list[dict]:
        """
        在 Chroma 中检索最相关的文本块。
        """
        if self.collection.count() == 0:
            return []

        query_embedding = self.embedding_service.embed_text(query)

        result = self.collection.query(
            query_embeddings=[
                query_embedding
            ],
            n_results=top_k,
            include=[
                "documents",
                "metadatas",
                "distances"
            ]
        )

        ids_list = result.get("ids", [[]])[0]
        documents_list = result.get("documents", [[]])[0]
        metadatas_list = result.get("metadatas", [[]])[0]
        distances_list = result.get("distances", [[]])[0]

        results = []

        for item_id, document, metadata, distance in zip(
            ids_list,
            documents_list,
            metadatas_list,
            distances_list,
        ):
            # Chroma cosine distance 通常是：distance = 1 - cosine_similarity
            # 所以这里转回你之前熟悉的 score
            score = 1 - distance

            results.append({
                "chunk_id": metadata.get("chunk_id", item_id),
                "content": document,
                "score": score,

                "source_name": metadata.get("source_name", "未知来源"),
                "source_type": metadata.get("source_type", "unknown"),
                "chunk_index": metadata.get("chunk_index", -1),
                "created_at": metadata.get("created_at", ""),

                "source_hash": metadata.get("source_hash", ""),
                "chunk_hash": metadata.get("chunk_hash", ""),
            })

        return results

    def count(self) -> int:
        """
        返回当前 Chroma collection 中的 chunk 数量。
        """
        return self.collection.count()


