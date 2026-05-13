import os
from fastapi import APIRouter, HTTPException, UploadFile, File
from services.text_splitter import split_text
from schemas.users import *
from services.ai_services import *



router = APIRouter(prefix="/users", tags=["users"])


ALLOWED_EXTENSIONS = {".txt"}


@router.get("/hello")
def hello():
    return {"msg": "users router is running"}

@router.post("/ask")
def ask_question(data: QuestionData):
    try:
        answer = ask_ai(data.question)
        return {"msg": answer}
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"大模型调用失败：{str(e)}"
        )

@router.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    os.makedirs("uploads", exist_ok = True)

    _, ext = os.path.splitext(file.filename)
    ext = ext.lower()

    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"不支持的类型：{ext},只允许上传 txt 文件"
        )
    
    content = await file.read()

    try:
        text = content.decode("utf-8")
    except UnicodeDecodeError:
        raise HTTPException(
            status_code=400,
            detail= "这个文件不是utf-8编码，暂时无法读取"
        )
    
    File_path = os.path.join("uploads", file.filename)

    with open(File_path, "wb") as f:
        f.write(content)
    
    return {
        "msg": f"上传成功:{file.filename}",
        "filename": file.filename,
        "text": text
    }


@router.get("/files")
def file_list():
    os.makedirs("uploads", exist_ok= True)
    files = os.listdir("uploads")
    return {"files": files}


@router.post("/summarize")
def summarize_t(data: SummaryData):    
    if not data.text.strip():
        raise HTTPException(
            status_code=400,
            detail="没有可总结的文本内容"
        )
    
    if len(data.text) > 12000:
        raise  HTTPException(
            status_code=400,
            detail="文本太长"
        )
    
    try:
        summary = summarize_text(data.text)

        return{"summary": summary}
    
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"文档总结失败: {str(e)}"
        )
    
@router.post("/doc-ask")
def ask_doc(data: DocQuestionData):
    if not data.text.strip():
        raise HTTPException(
            status_code=400,
            detail="请先上传 txt 文件"
        )
    
    if not data.question.strip():
        raise HTTPException(
            status_code=400,
            detail="请输入问题"
        )
    
    if len(data.text) > 12000:
        raise HTTPException(
            status_code=400,
            detail="文档太长，当前版本只支持短文本问答，后面会学习文本切分和 RAG"
        )
    
    try:
        answer = ask_document(
            text = data.text, 
            question = data.question
        )

        return{"answer": answer}
    
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"文档问答失败：{str(e)}"
        )
    

@router.post("/chunks")
def create_chunks(data: ChunkData):
    if not data.text.strip():
        raise HTTPException(
            status_code=400,
            detail="没有可切分的文本内容"
        )

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

    chunks = split_text(
        text=data.text,
        chunk_size=data.chunk_size,
        overlap=data.overlap
    )

    return {
        "chunk_count": len(chunks),
        "chunks": chunks
    }


@router.post("/similarity")
def compare_similarity(data: SimilarityData):
    if not data.text1.strip():
        raise HTTPException(
            status_code=400,
            detail="text1 不能为空"
        )
    
    if not data.text2.strip():
        raise HTTPException(
            status_code=400,
            detail="text2 不能为空"
        )
    
    try:
        embedding1 = get_embedding(data.text1)
        embedding2 = get_embedding(data.text2)

        score = cosine_similarity(embedding1, embedding2)
        return {
            "similarity": score,
            "embedding_dimension": len(embedding1),
            "text1_preview": data.text1[:50],
            "text2_preview": data.text2[:50]
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"相似度计算失败：{str(e)}"
        )

        
