import os
from dotenv import load_dotenv
from openai import OpenAI

load_dotenv()

EMBEDDING_BATCH_SIZE = 10


class EmbeddingService:
    def __init__(self):
        api_key = os.getenv("EMBEDDING_API_KEY")
        base_url = os.getenv("EMBEDDING_BASE_URL")
        model = os.getenv("EMBEDDING_MODEL")

        if not api_key:
            raise RuntimeError("EMBEDDING_API_KEY 没有配置，请检查 .env 文件")

        if not model:
            raise RuntimeError("EMBEDDING_MODEL 没有配置，请检查 .env 文件")

        self.client = OpenAI(
            api_key=api_key,
            base_url=base_url,
        )
        self.model = model

    def embed_text(self, text: str) -> list[float]:
        """
        把单段文本转成embedding向量
        """
        if not text or not text.strip():
            raise ValueError("文本不能为空")

        response = self.client.embeddings.create(
            input=text,
            model=self.model,
        )
        return response.data[0].embedding

    def embed_texts(self, texts: list[str]) -> list[list[float]]:
        clean_texts = [text for text in texts if text and text.strip()]
        if not clean_texts:
            return []

        embeddings = []
        for start in range(0, len(clean_texts), EMBEDDING_BATCH_SIZE):
            batch = clean_texts[start:start + EMBEDDING_BATCH_SIZE]
            response = self.client.embeddings.create(
                input=batch,
                model=self.model
            )
            embeddings.extend(item.embedding for item in response.data)

        return embeddings
