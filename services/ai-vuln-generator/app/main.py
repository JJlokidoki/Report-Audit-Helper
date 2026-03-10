from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware

from app.routers import generate, summary

app = FastAPI(title="AI Vuln Generator", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def auth_stub(request: Request, call_next) -> Response:
    return await call_next(request)


app.include_router(generate.router)
app.include_router(summary.router)
