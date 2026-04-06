"""Server-Sent Events formatting helpers."""

from __future__ import annotations

import json


def format_chunk(text: str) -> bytes:
    """Wrap a text chunk as an SSE 'chunk' event (JSON-encoded to preserve newlines)."""
    return f"event: chunk\ndata: {json.dumps(text, ensure_ascii=False)}\n\n".encode()


def format_done(fields: dict) -> bytes:
    """Wrap parsed fields as an SSE 'done' event (JSON payload)."""
    return f"event: done\ndata: {json.dumps(fields, ensure_ascii=False)}\n\n".encode()


def format_error(msg: str) -> bytes:
    """Wrap an error message as an SSE 'error' event."""
    return f"event: error\ndata: {msg}\n\n".encode()
