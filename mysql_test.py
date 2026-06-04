from database import get_connection

def list_documents():
    connection = get_connection()

    try:
        with connection.cursor() as cursor:
                sql = """
                SELECT id, title, chunk_count, status, created_at
                FROM documents
                WHERE is_deleted = 0
                ORDER BY created_at DESC;
                """

                cursor.execute(sql)
                return cursor.fetchall()

    finally:
        connection.close()




if __name__ == "__main__":
    documents = list_documents()
    for document in documents:
        print(document)