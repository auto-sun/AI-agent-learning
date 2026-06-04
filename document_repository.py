from database import get_connection


def create_document(title: str, content: str, chunk_count: int = 0, status: str = "pending"):
    connection = get_connection()

    try:
        with connection.cursor() as cursor:
            sql = """
            INSERT INTO documents (title, content, chunk_count, status)
            VALUES (%s, %s, %s, %s);
            """

            cursor.execute(sql, (title, content, chunk_count, status))
            connection.commit()

            return cursor.lastrowid

    except Exception:
        connection.rollback()
        raise

    finally:
        connection.close()