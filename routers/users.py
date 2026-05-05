from fastapi import APIRouter, HTTPException, UploadFile, File
from models import UserData, UpdateUserData, QuestionData
from database import users_db
import os

router = APIRouter(prefix="/users", tags=["users"])


ALLOWED_EXTENSIONS = {".txt"}


@router.get("/hello")
def hello():
    return {"msg": "users router is running"}

@router.post("/ask")
def ask_question(data: QuestionData):
    return {"msg": f"你发送的问题是：{data.question}"}

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