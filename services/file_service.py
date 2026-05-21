from pathlib import Path
from fastapi import UploadFile

UPLOAD_DIR = Path("uploads")

def ensure_upload_dir() -> None:
    """
    确保 uploads 文件夹存在。
    """
    UPLOAD_DIR.mkdir(exist_ok=True)


def is_safe_filename(filename: str) -> bool:
    """
    检查文件名是否安全。

    防止用户传入：
    ../../xxx
    C:\\xxx\\xxx
    /root/xxx
    """
    if not filename:
        return False

    if "/" in filename or "\\" in filename:
        return False

    if ".." in filename:
        return False

    return True

def list_txt_files() -> list[str]:
    """
    列出 uploads 目录下的 txt 文件。
    """
    ensure_upload_dir()

    files = []

    for file_path in UPLOAD_DIR.iterdir():
        if file_path.is_file() and file_path.suffix.lower() == ".txt":
            files.append(file_path.name)

    return files

def read_txt_file(filename: str) -> str:
    """
    读取 uploads 目录下的 txt 文件内容。
    """
    ensure_upload_dir()

    if not is_safe_filename(filename):
        raise ValueError("文件名不合法")

    file_path = UPLOAD_DIR / filename

    if not file_path.exists():
        raise FileNotFoundError("文件不存在")

    if not file_path.is_file():
        raise ValueError("目标不是文件")

    if file_path.suffix.lower() != ".txt":
        raise ValueError("当前只支持读取 .txt 文件")

    try:
        return file_path.read_text(encoding="utf-8")
    except UnicodeDecodeError:
        return file_path.read_text(encoding="gbk")
    


async def save_upload_file(file: UploadFile) -> str:
    """
    保存上传的 txt 文件到 uploads 目录。
    返回保存后的文件名。
    """
    ensure_upload_dir()

    if not file.filename:
        raise ValueError("文件名不能为空")

    filename = file.filename

    if not is_safe_filename(filename):
        raise ValueError("文件名不合法")

    if not filename.lower().endswith(".txt"):
        raise ValueError("当前只支持上传 .txt 文件")

    file_path = UPLOAD_DIR / filename

    content = await file.read()

    file_path.write_bytes(content)

    return filename