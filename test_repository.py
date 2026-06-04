from document_repository import create_document
from mysql_test import list_documents


document_id = create_document(
    title="通过 repository 创建的文档",
    content="这是通过封装函数写入 MySQL 的内容。",
    chunk_count=0,
    status="pending"
)

print("添加成功，新文档 id:", document_id)

documents = list_documents()
for doc in documents:
    print(doc)