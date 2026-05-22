# Chroma Restart Persistence Test

This file checks whether the RAG knowledge base remains after creating a new ChromaVectorStore instance.
The expected result is that Chroma keeps the uploaded chunk on disk until the collection is cleared.
