from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import RedirectResponse
from routers.users import router as users_router
from routers import rag
import os

app = FastAPI()

app.include_router(users_router)
app.include_router(rag.router)

app.mount("/static", StaticFiles(directory="static"), name="static")

os.makedirs("uploads", exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

@app.get("/")
def index():
    return RedirectResponse(url="/static/index.html")