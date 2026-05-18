def split_text(text: str, chunk_size: int = 500, overlap: int = 100) -> list[str]:
    """
    把长文本切成多个 chunk。

    chunk_size：每个文本块的最大字符数
    overlap：相邻文本块之间重叠的字符数
    """
    if not text or not text.strip():
        return []

    if chunk_size <= 0:
        raise ValueError("chunk_size 必须大于 0")

    if overlap < 0:
        raise ValueError("overlap 不能小于 0")

    if overlap >= chunk_size:
        raise ValueError("overlap 必须小于 chunk_size，否则会死循环")

    chunks = []
    start = 0
    text_length = len(text)

    while start < text_length:
        end = start + chunk_size
        chunk = text[start:end]

        if chunk.strip():
            chunks.append(chunk.strip())

        if end >= text_length:
            break

        start = end - overlap

    return chunks
