from pathlib import Path
from fastapi import UploadFile
from services.document_parser import SUPPORTED_EXTENSIONS

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

def list_supported_files() -> list[str]:
    """
    列出 uploads 目录下支持解析的文件。
    """
    ensure_upload_dir()

    files = []

    for file_path in UPLOAD_DIR.iterdir():
        if file_path.is_file() and file_path.suffix.lower() in SUPPORTED_EXTENSIONS:
            files.append(file_path.name)

    return files

def get_upload_file_path(filename: str) -> Path:
    """
    获取 uploads 目录下的安全文件路径。
    """
    ensure_upload_dir()

    if not is_safe_filename(filename):
        raise ValueError("文件名不合法")

    file_path = UPLOAD_DIR / filename

    if not file_path.exists():
        raise FileNotFoundError("文件不存在")

    if not file_path.is_file():
        raise ValueError("目标不是文件")

    if file_path.suffix.lower() not in SUPPORTED_EXTENSIONS:
        supported = "、".join(sorted(SUPPORTED_EXTENSIONS))
        raise ValueError(f"当前只支持读取这些文件类型：{supported}")

    return file_path


async def save_upload_file(file: UploadFile) -> str:
    """
    保存上传的可解析文件到 uploads 目录。
    返回保存后的文件名。
    """
    ensure_upload_dir()

    if not file.filename:
        raise ValueError("文件名不能为空")

    filename = file.filename

    if not is_safe_filename(filename):
        raise ValueError("文件名不合法")

    suffix = Path(filename).suffix.lower()

    if suffix not in SUPPORTED_EXTENSIONS:
        supported = "、".join(sorted(SUPPORTED_EXTENSIONS))
        raise ValueError(f"当前只支持上传这些文件类型：{supported}")

    file_path = UPLOAD_DIR / filename

    content = await file.read()

    file_path.write_bytes(content)

    return filename
