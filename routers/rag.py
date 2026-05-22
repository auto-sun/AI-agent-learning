from fastapi import APIRouter, HTTPException,UploadFile, File
from schemas.rag import *
from services.ai_services import ask_ai
from services.vector_store import VectorStore
from services.file_service import get_upload_file_path, list_supported_files, save_upload_file
from services.document_parser import extract_text_from_file, SUPPORTED_EXTENSIONS
router = APIRouter(prefix="/rag", tags=["RAG"])

vector_store = VectorStore()


def add_uploaded_file_to_vector_store(
    filename: str,
    chunk_size: int,
    overlap: int,
    source_name: str,
    source_type: str,
    allow_duplicate: bool,
) -> dict:
    file_path = get_upload_file_path(filename)
    parsed_file = extract_text_from_file(str(file_path))
    text = parsed_file["text"]

    result = vector_store.add_text(
        text=text,
        chunk_size=chunk_size,
        overlap=overlap,
        source_name=source_name,
        source_type=source_type,
        allow_duplicate=allow_duplicate,
    )

    return {
        "filename": filename,
        "file_type": parsed_file["file_type"],
        "file_suffix": parsed_file["file_suffix"],
        "parsed_text_length": parsed_file["text_length"],
        **result,
    }


@router.post("/add-text")
def add_text(data: AddTextRequest):
    try:
        result = vector_store.add_text(
            text=data.text,
            chunk_size=data.chunk_size,
            overlap=data.overlap,
            source_name=data.source_name,
            source_type="manual",
            allow_duplicate=data.allow_duplicate,
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
            "max_score": None,
            "score_threshold": data.score_threshold,
            "is_answerable": False,
        }

    max_score = search_results[0]["score"]
    if max_score < data.score_threshold:
        return {
            "answer": "根据当前资料无法确定。",
            "references": [],
            "max_score": max_score,
            "score_threshold": data.score_threshold,
            "is_answerable": False,
        }

    context = "\n\n".join([
        (
            f"资料片段 {index + 1}：\n"
            f"source_name：{item.get('source_name', '未知来源')}\n"
            f"source_type：{item.get('source_type', 'unknown')}\n"
            f"chunk_id：{item['chunk_id']}\n"
            f"chunk_index：{item.get('chunk_index', -1)}\n"
            f"score：{item['score']:.4f}\n"
            f"content：{item['content']}"
        )
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
        "max_score": max_score,
        "score_threshold": data.score_threshold,
        "is_answerable": True,
    }

@router.post("/search")
def search(data: SearchRequest):
    results = vector_store.search(
        query=data.query,
        top_k=data.top_k,
    )

    return {
        "query": data.query,
        "results": results,
    }

@router.get("/files")
def get_files():
    files = list_supported_files()

    return {
        "files": files,
        "file_count": len(files),
        "supported_extensions": sorted(SUPPORTED_EXTENSIONS),
    }

@router.post("/add-file")
def add_file(data: AddFileRequest):
    if data.chunk_size <= 0:
        raise HTTPException(
            status_code=400,
            detail="chunk_size 必须大于 0"
        )

    if data.overlap < 0:
        raise HTTPException(
            status_code=400,
            detail="overlap 不能小于 0"
        )

    if data.overlap >= data.chunk_size:
        raise HTTPException(
            status_code=400,
            detail="overlap 必须小于 chunk_size"
        )

    try:
        return add_uploaded_file_to_vector_store(
            filename=data.filename,
            chunk_size=data.chunk_size,
            overlap=data.overlap,
            source_name=data.source_name or data.filename,
            source_type="file",
            allow_duplicate=data.allow_duplicate,
        )
    except FileNotFoundError:
        raise HTTPException(
            status_code=404,
            detail="文件不存在"
        )
    except ValueError as e:
        raise HTTPException(
            status_code=400,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"文件解析或添加失败：{str(e)}"
        )



@router.post("/upload-and-add")
async def upload_and_add(
    file: UploadFile = File(...),
    chunk_size: int = 500,
    overlap: int = 100,
    allow_duplicate: bool = False,
):
    if chunk_size <= 0:
        raise HTTPException(
            status_code=400,
            detail="chunk_size 必须大于 0"
        )

    if overlap < 0:
        raise HTTPException(
            status_code=400,
            detail="overlap 不能小于 0"
        )

    if overlap >= chunk_size:
        raise HTTPException(
            status_code=400,
            detail="overlap 必须小于 chunk_size"
        )

    try:
        filename = await save_upload_file(file)
        return add_uploaded_file_to_vector_store(
            filename=filename,
            chunk_size=chunk_size,
            overlap=overlap,
            source_name=filename,
            source_type="upload_file",
            allow_duplicate=allow_duplicate,
        )
    except ValueError as e:
        raise HTTPException(
            status_code=400,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"文件上传、解析或添加失败：{str(e)}"
        )
