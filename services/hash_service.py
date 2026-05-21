import hashlib

def calculate_text_hash(text) -> str:
    """
    计算文本的 sha256 hash。

    作用：
    1. 判断整篇文档是否重复
    2. 判断单个 chunk 是否重复
    """
    normalized_text = text.strip()

    return hashlib.sha256(
        normalized_text.encode("utf-8")
    ).hexdigest()