from fastapi import APIRouter, HTTPException, UploadFile, File
from models import UserData, UpdateUserData, QuestionData
from database import users_db
from dotenv import load_dotenv
from openai import OpenAI
import os

router = APIRouter(prefix="/users", tags=["users"])

load_dotenv()
key = "OPENAI_API_KEY"
api_key = os.getenv(key)
base_url = os.getenv("OPENAI_BASE_URL")
model = os.getenv("OPENAI_MODEL")

if not api_key:
    raise RuntimeError(f"{key} 没有配置，请检查 .env 文件")

client = OpenAI(api_key=api_key, base_url=base_url)

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

ALLOWED_EXTENSIONS = {".txt"}


@router.get("/hello")
def hello():
    return {"msg": "users router is running"}

@router.post("/ask")
def ask_question(data: QuestionData):
    try:
        response = client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": data.question},
            ],
            temperature=0.3,
            max_tokens=800,
        )
        answer = response.choices[0].message.content

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

    

@router.post("/users")
def create_user(user: UserData):
    for old_user in users_db:
        if old_user["username"] == user.username:
            raise HTTPException(status_code=400, detail="username already exists")

    users_db.append(user.model_dump())
    return {
        "msg": "user created",
        "new_user": user.model_dump(),
        "total_users": len(users_db)
    }


@router.get("/users")
def get_user():
    return {
        "users": users_db,
        "total_users": len(users_db)
    }


@router.get("/users/{username}")
def get_user_by_name(username: str):
    for user in users_db:
        if user["username"] == username:
            return {"user": user}
    raise HTTPException(status_code=404, detail="user not found")


@router.put("/users/{username}")
def update_user(username: str, new_data: UpdateUserData):
    for user in users_db:
        if user["username"] == username:
            user["age"] = new_data.age
            user["email"] = new_data.email
            return {
                "msg": "user updated",
                "user": user
            }
    raise HTTPException(status_code=404, detail="user not found")


@router.delete("/users/{username}")
def delete_user(username: str):
    for i, user in enumerate(users_db):
        if user["username"] == username:
            deleted_user = users_db.pop(i)
            return {
                "msg": "user deleted",
                "deleted_user": deleted_user,
                "total_users": len(users_db)
            }
    raise HTTPException(status_code=404, detail="user not found")
