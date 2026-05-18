from fastapi import APIRouter, HTTPException
from schemas.rag import AddTextRequest, AskRequest
from services.ai_services import ask_ai
from services.vector_store import VectorStore

router = APIRouter(prefix="/rag", tags=["RAG"])

vector_store = VectorStore()


@router.post("/add-text")
def add_text(data: AddTextRequest):
    try:
        result = vector_store.add_text(
            text=data.text,
            chunk_size=data.chunk_size,
            overlap=data.overlap,
        )

        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"添加知识库失败：{str(e)}")


@router.post("/ask")
def ask(data: AskRequest):
    try:
        search_results = vector_store.search(
            query=data.question,
            top_k=data.top_k,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"检索知识库失败：{str(e)}")

    if not search_results:
        return {
            "answer": "当前知识库为空，请先添加知识文本。",
            "references": [],
        }

    context = "\n\n".join([
        f"资料片段 {index + 1}：\n{item['content']}"
        for index, item in enumerate(search_results)
    ])

    prompt = f"""
你是一个严谨的知识库问答助手。

你必须优先根据下面的资料片段回答问题。
如果资料片段中没有答案，请明确说：根据当前资料无法确定。
不要编造资料中没有的信息。

用户问题：
{data.question}

资料片段：
{context}

请基于以上资料回答用户问题。
"""

    answer = ask_ai(prompt)

    return {
        "answer": answer,
        "references": search_results,
    }
