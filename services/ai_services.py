import os

from dotenv import load_dotenv
from openai import OpenAI
import math


load_dotenv()


def create_openai_client(api_key: str | None, base_url: str | None = None) -> OpenAI:
    if not api_key:
        raise RuntimeError("API key 没有配置，请检查环境变量")
    
    kwargs = {"api_key": api_key}

    if base_url:
        kwargs["base_url"] = base_url

    return OpenAI(**kwargs)

embedding_client = create_openai_client(
    api_key=os.getenv("EMBEDDING_API_KEY"),
    base_url=os.getenv("EMBEDDING_BASE_URL")
)


deepseek_client = create_openai_client(
    api_key=os.getenv("DEEPSEEK_API_KEY"),
    base_url=os.getenv("DEEPSEEK_BASE_URL")
)



DEEPSEEK_MODEL = os.getenv("DEEPSEEK_MODEL")
EMBEDDING_MODEL = os.getenv("EMBEDDING_MODEL")




SYSTEM_PROMPT = """
你是一名 AI 应用开发学习助手。

用户是一名普通二本大三学生，正在学习 Python、FastAPI、前端联调和大模型应用开发。

回答要求：
1. 用通俗易懂的中文解释。
2. 先给结论，再分步骤说明。
3. 遇到代码问题，给出简单可运行示例。
4. 不要堆太多术语。
5. 不确定的地方要明确说明，不要编造。
"""


SUMMARY_PROMPT = """
你是一名文档总结助手。

请总结用户提供的 txt 文档内容。

要求：
1. 只根据用户提供的文本总结，不要编造。
2. 先给 1 句话总体概括。
3. 再列出 3 到 5 个要点。
4. 最后给出“适合后续提问的方向”。
5. 如果文本内容太少，请说明“文本内容不足，无法充分总结”。

输出格式：
总体概括：
要点：
1.
2.
3.
后续可提问方向：
"""


DOC_QA_PROMPT = """
你是一个严谨的文档问答助手。

请只根据用户提供的【文档内容】回答【用户问题】。

回答要求：
1. 只能使用文档中出现的信息。
2. 如果文档中没有答案，请回答“文档中未提及”。
3. 不要使用文档以外的知识进行补充。
4. 回答要简洁清楚。
5. 如果能找到依据，请简要说明依据来自文档的哪部分内容。

输出格式：
答案：
依据：
"""


def ask_ai(question: str) -> str:
    """
    普通 AI 问答
    """
    response = deepseek_client.chat.completions.create(
            model=DEEPSEEK_MODEL,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": question},
            ],
            temperature=0.3,
            max_tokens=800,
        )
    return response.choices[0].message.content


def summarize_text(text: str) -> str:
    """
    总结文档内容
    """
    user_input = f"""
请总结下面这份文档：

【文档内容】
{text}
"""

    completion = deepseek_client.chat.completions.create(
            model=DEEPSEEK_MODEL,
            messages=[
                {"role": "system", "content": SUMMARY_PROMPT},
                {"role": "user", "content": user_input}
            ],
            temperature=0.2,
            max_tokens=1000,
        )

    return completion.choices[0].message.content

    


def ask_document(text: str, question: str) -> str:
    """
    根据文档内容回答问题
    """
    user_input = f"""
【文档内容】
{text}

【用户问题】
{question}
"""

    completion = deepseek_client.chat.completions.create(
            model=DEEPSEEK_MODEL,
            messages=[
                {"role": "system", "content": DOC_QA_PROMPT},
                {"role": "user", "content": user_input},
            ],
            temperature=0.2,
            max_tokens=800,
        )
    return completion.choices[0].message.content


def get_embedding(text: str) -> list[float]:
    text = text.strip().replace("\n", " ")

    if not text:
        raise ValueError("文本不能为空")

    response = embedding_client.embeddings.create(
        model=EMBEDDING_MODEL,
        input=text
    )

    return response.data[0].embedding




def cosine_similarity(vector1: list[float], vector2: list[float]) -> float:
    if len(vector1) != len(vector2):
        raise ValueError(
            f"两个向量长度不一致：vector1={len(vector1)}, vector2={len(vector2)}"
        )
    if not vector1 or not vector2:
        raise ValueError("向量不能为空")
    
    dot_product = sum(a * b for a, b in zip(vector1, vector2))
    norm1 = math.sqrt(sum(a * a for a in vector1))
    norm2 = math.sqrt(sum(b * b for b in vector2))

    if norm1 == 0 or norm2 == 0:
        return 0.0

    return dot_product / (norm1 * norm2)


def build_chunk_embeddings(chunks: list[str]) -> list[dict]:
    items = []

    for index, chunk in enumerate(chunks):
        clean_chunk = chunk.strip()

        if not clean_chunk:
            continue

        embedding = get_embedding(clean_chunk)

        items.append({
            "index": index,
            "text": clean_chunk,
            "embedding": embedding
        })

    return items

