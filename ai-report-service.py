#!/usr/bin/env python3
"""
backend.py – FastAPI + Ollama Gemma‑3‑27B‑IT (vision)

• `/generate` → ready Markdown
• `/generate/stream` → token stream

Run: `LOGLEVEL=DEBUG python -m uvicorn backend:app --reload`  

"""
from __future__ import annotations

# ───────── stdlib ─────────
import base64, datetime, functools, gc, html, inspect, json, logging, mimetypes, os, re, textwrap, time, urllib.parse
from typing import Any, Callable, Dict, List, Optional
from uuid import uuid4
import subprocess, tempfile

# ───────── 3‑rd party ─────────
import ollama           # pip install --upgrade ollama>=0.5
import psutil
from fastapi import FastAPI, HTTPException, Request, Response
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel
from tinydb import TinyDB, Query

# ───────── config ─────────

'''
SYSTEM_PROMPT = textwrap.dedent("""\
Ты — аналитик, который пишет отчеты об уязвимостях в рамках пентестов. Ты пишешь отчет для Заказчика. Твой коллега, пентестер, предоставляет тебе информацию о найденных уязвимостях.
Тебе необходимо грамотно, техническим языком описать уязвимость, основываясь на тексте и изображениях, которые он тебе прислал.
Всегда вставляй скриншот в нужном месте в тексте, после описания действия, которое показано на скриншоте, например: 
Отчет имеет следующую структуру: ![alt](screenshotN.png).
## Название уязвимости

| **Параметр**          | **Значение**                                                                                    |
| :-------------------- | :---------------------------------------------------------------------------------------------- |
| **Уровень опасности** | Критический (использовать цвет текста #8C0F0F) / Высокий (использовать цвет текста #FF0000) / Средний (использовать цвет текста #FF9900) / Низкий (использовать цвет текста #42C76A) |
| **CVSS**              | 0-3.9 Низкий уровень опасности, 4.0-6.9 Средний уровень опасности, 7.0-8.9 Высокий уровень опасности, 9.0-10 Критический уровень опасности |
| **CVSS-вектор**       | CVSS:4.0/AV:N/AC:L/AT:N/PR:N/UI:N/VC:N/VI:N/VA:L/SC:N/SI:N/SA:N                                 |

### Описание \n
Несколько предложений об уязвимости.

### Доказательство эксплуатации (шаги для повторения)\n
Начни с фразы: «Для эксплуатации данной уязвимости необходимо выполнить следующие действия». Все шаги для повторения описывай как обезличенные, например "отправить", "проанализировать", а не "отправьте" или "проанализируйте".
На основе присланных скриншотов и текста опиши процесс эксплуатации уязвимости. Вставляй ссылку на присланные скриншоты в нужном месте в тексте.
Внимательно следи за тем, чтобы количество скриншотов в отчете совпадало с количеством скриншотов, которые тебе прислали. Сначала опиши действия, а затем вставь скриншот и обязательно добавляй к скриншотам подпись в формате "*Рисунок 1. Пример пользовательского запроса, демонстрирующий утечку информации*". Подпись формируй на основе информации на скриншоте.


### Рекомендации по устранению
Приведите здесь 2-3 самых важных рекомендации для заказчика. Используй нумерованный список.\n\n

""")
'''
SYSTEM_PROMPT = textwrap.dedent("""\
Ты — аналитик, который пишет отчеты об уязвимостях в рамках пентестов. Ты пишешь отчет для Заказчика. Твой коллега, пентестер, предоставляет тебе информацию о найденных уязвимостях.
Тебе необходимо грамотно, техническим языком описать уязвимость, основываясь на тексте и изображениях, которые он тебе прислал.
Вставляй скриншоты в текст сразу после описания действия, которое они иллюстрируют. Используй формат: `![**Подпись-описание**](media/imageN.png){width="..." height="..."}`. Все подписи описательные и начинаются с `*Скриншот N.*`. 
Отчет имеет следующую структуру:
## Название уязвимости (на английском)

| **Параметр**          | **Значение**                                                                                    |
| :-------------------- | :---------------------------------------------------------------------------------------------- |
| **Уровень опасности** | Критический (использовать цвет текста #8C0F0F) / Высокий (использовать цвет текста #FF0000) / Средний (использовать цвет текста #FF9900) / Низкий (использовать цвет текста #42C76A) |
| **CVSS**              | 0-3.9 Низкий уровень опасности, 4.0-6.9 Средний уровень опасности, 7.0-8.9 Высокий уровень опасности, 9.0-10 Критический уровень опасности |
| **CVSS-вектор**       | CVSS:4.0/AV:N/AC:L/AT:N/PR:N/UI:N/VC:N/VI:N/VA:L/SC:N/SI:N/SA:N                                 |

### Описание \n
Ясное техническое описание уязвимости. Объясни, ЧТО сломано, ГДЕ (домен, эндпоинт, параметр) и КАКОЙ механизм безопасности (CORS, авторизация, валидация) нарушен.

### Шаги для повторения\n
Начни с фразы: «Для эксплуатации данной уязвимости необходимо выполнить следующие действия». Все шаги для повторения описывай как обезличенные, например "отправить", "проанализировать", а не "отправьте" или "проанализируйте".
На основе присланных скриншотов и текста опиши процесс эксплуатации уязвимости. Вставляй ссылку на присланные скриншоты в нужном месте в тексте.
Внимательно следи за тем, чтобы количество скриншотов в отчете совпадало с количеством скриншотов, которые тебе прислали. Сначала опиши действия, а затем вставь скриншот и обязательно добавляй к скриншотам подпись в формате "*Рисунок 1. Пример пользовательского запроса, демонстрирующий утечку информации*". Подпись формируй на основе информации на скриншоте.
При необходимости добавляй необязательную техническую сноску. Добавляй, только если нужно уточнить ключевой нюанс (например, "Запрос был аутентифицированным, что позволило получить доступ к данным пользователя.


### Рекомендации по устранению
Приведите здесь 2-3 самых важных, конкретных и исполнимых рекомендаций для заказчика. Начинай с глагола в неопределенной форме: "избегать", "реализовать", "проверить", "ограничить". Используй нумерованный список.\n\n

""")



# NEW: prompt focused on Kill-chain description
KILLCHAIN_PROMPT = textwrap.dedent("""\
Ты и я пишем сценарий атак для отчета о пентесте. Я дам тебе описание киллчейна в виде последовательности действий в неформальном языке, а ты адаптируешь его для отчета.
Отчет должен быть написан грамотным техническим языком, избегая сленговых выражений, в формате markdown.
Ссылки на скриншоты в формате markdown должны быть оставлены как есть, без изменений. При этом ты должен сразу под скриншотом написать:
Screenshot: здесь краткое описание.
Я оставил подсказки для краткого описания под каждым скриншотом.
Начни описание с заголовка
## Описание
затем краткое резюме атаки, какие сервисы были скомпрометированы
затем описание шагов для повторения
кроме этого, ничего описывать не нужно
""")




OLLAMA_HOST  = os.getenv("OLLAMA_HOST", "http://localhost:11434")
#OLLAMA_HOST  = os.getenv("OLLAMA_HOST", "http://localhost:1234")
#OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "qwen2.5vl:72b-Q4_K_M")
#OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "qwen2.5vl:32b-q8_0")
#OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "qwen2.5vl:7b-q8_0")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "gemma3:27b-it-qat")
#OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "qwen3:30b-a3b-thinking-2507-q4_K_M")
TEMP, NUM_PREDICT = 0.10, 2048
PROBE_ROUTES = False

# ───────── logging ─────────
logging.basicConfig(level=os.getenv("LOGLEVEL", "INFO").upper(),
                    format="%(asctime)s [%(levelname)-8s] %(name)s: %(message)s")
log, dbg = logging.getLogger("api"), logging.getLogger("debug")
mem = lambda: f"RAM={psutil.Process(os.getpid()).memory_info().rss/2**30:.2f} GB"


def probe(tag:str)->Callable[[Callable],Callable]:
    def wrap(fn:Callable)->Callable:
        @functools.wraps(fn)
        def inner(*a,**kw):
            t0=time.perf_counter(); dbg.debug("▶ %s | %s", tag, mem())
            try: return fn(*a,**kw)
            finally: dbg.debug("⏹ %s | %.2fs | %s", tag,time.perf_counter()-t0, mem())
        inner.__signature__=inspect.signature(fn)
        return inner
    return wrap

# ───────── init ─────────
client = ollama.Client(host=OLLAMA_HOST)
app = FastAPI(title="VulnReport API (Ollama)")
db  = TinyDB("reports.json"); TBL, Q = db.table("reports"), Query()

@app.middleware("http")
async def access(req:Request, nxt):
    t0=time.perf_counter(); resp:Response = await nxt(req)
    log.info("%s %s → %d %.1f ms", req.method, req.url.path, resp.status_code,(time.perf_counter()-t0)*1000)
    return resp

@app.exception_handler(RequestValidationError)
async def ve(_, exc):
    dbg.error("422 %s", exc.errors()); return JSONResponse(status_code=422, content={"detail": exc.errors()})

# ───────── models ─────────
class GenerateRequest(BaseModel):
    history:List[Dict[str,str]]=[]; images:List[str]=[]; filenames:List[str]=[]
class GenerateResponse(BaseModel):
    markdown:str; raw:str
class SavedReport(BaseModel):
    project:str="default"; markdown:str; images:List[str]; filenames:List[str]; history:List[Any]
class WSTGRequest(BaseModel):
    vulnerabilities_markdown: str
    base_table_markdown: Optional[str] = None
class WSTGResponse(BaseModel):
    table_markdown: str
class ResultsSummaryRequest(BaseModel):
    vulnerabilities_markdown: str
class ResultsSummaryResponse(BaseModel):
    summary_markdown: str
class HTMLReportRequest(BaseModel):
    vulnerabilities_markdown: str
    template_path: Optional[str] = None
    results_summary: Optional[str] = None
    system_name: Optional[str] = None
    system_url: Optional[str] = None
    system_segment: Optional[str] = None
    test_period: Optional[str] = None
    executor: Optional[str] = None
    ke_code: Optional[str] = None
    system_details: Optional[str] = None
class HTMLReportResponse(BaseModel):
    html: str

# ───────── helpers ─────────

def to_data(p:str,n:str)->str:
    mime=mimetypes.guess_type(n)[0] or "image/png"
    return f"data:{mime};base64,{base64.b64encode(open(p,'rb').read()).decode()}"

def _lookup(u:str,m:Dict[str,str]):
    return m.get(u) or m.get(os.path.basename(urllib.parse.urlparse(u).path))

def inline(md:str,m:Dict[str,str],order:List[str])->str:
    unused=iter(m[k] for k in order)
    md=re.sub(r'(!\[[^\]]*]\()([^)]*)(\))',lambda x:f"{x.group(1)}{_lookup(x.group(2),m) or next(unused,x.group(2))}{x.group(3)}",md)
    md=re.sub(r'(!\[\[)([^\]]+)(]])',lambda x:f"{x.group(1)}{m.get(x.group(2)) or next(unused,x.group(2))}{x.group(3)}",md)
    return re.sub(r'Скриншот\s+(\d+):\s*(.+)',lambda x:f"![{x.group(2).strip()}]({m[order[int(x.group(1))-1]]})" if x.group(1).isdigit() and 1<=int(x.group(1))<=len(order) else x.group(0),md)

# ───────── LLM wrappers ─────────

def build_messages(req:GenerateRequest,imgs:List[bytes],prompt:str=SYSTEM_PROMPT):
    msgs=[{"role":"system","content":prompt}]
    if req.history:
        hist=[m.copy() for m in req.history]
        for m in hist:
            if m.get("role")=="user" and imgs: m["images"]=imgs; break
        msgs+=hist
    else:
        msgs.append({"role":"user","content":"(empty draft)","images":imgs or None})
    return msgs

def ollama_chat(msgs):
    resp=client.chat(model=OLLAMA_MODEL,messages=msgs,stream=False,options={"temperature":TEMP,"num_predict":NUM_PREDICT,"num_ctx":14096})
    return resp["message"]["content"].strip()

def ollama_stream(msgs):
    for c in client.chat(model=OLLAMA_MODEL,messages=msgs,stream=True,options={"temperature":TEMP,"num_predict":NUM_PREDICT,"num_ctx":14096}):
        tok=c["message"]["content"]
        if tok: yield tok.encode()



# ───────── core ─────────

def _generate_logic(req:GenerateRequest):
    imgs=[open(p,'rb').read() for p in req.images]
    msgs=build_messages(req,imgs)
    try: raw=ollama_chat(msgs)
    except Exception as e:
        log.exception("LLM fail"); raise HTTPException(500,str(e))
    md=inline(raw,{n:to_data(p,n) for n,p in zip(req.filenames,req.images)},req.filenames)
    return {"markdown":md,"raw":raw}

# ───────── endpoints ─────────
@app.post("/generate",response_model=GenerateResponse)
def gen(req:GenerateRequest):
    fn=_generate_logic if not PROBE_ROUTES else probe("gen")(_generate_logic)
    return fn(req)

@app.post("/generate/stream")
async def gen_stream(req:GenerateRequest):
    imgs=[open(p,'rb').read() for p in req.images]
    msgs=build_messages(req,imgs)
    async def streamer():
        try:
            for t in ollama_stream(msgs): yield t
        except Exception as e:
            yield f"\n[ERROR] {e}".encode()
    return StreamingResponse(streamer(),media_type="text/plain")

@app.post("/generate/killchain/stream")
async def gen_killchain_stream(req:GenerateRequest):
    imgs=[open(p,'rb').read() for p in req.images]
    msgs=build_messages(req,imgs,KILLCHAIN_PROMPT)
    async def streamer():
        try:
            for t in ollama_stream(msgs): yield t
        except Exception as e:
            yield f"\n[ERROR] {e}".encode()
    return StreamingResponse(streamer(),media_type="text/plain")

@app.post("/reports/save")
def save(rep:SavedReport):
    doc=rep.dict()|{"id":uuid4().hex,"ts":time.time()}
    TBL.insert(doc); return {"ok":True,"id":doc["id"]}

@app.get("/reports/{project}")
@app.get("/reports/{project}/{vid}")
def reports(project:str,vid:Optional[str]=None):
    if vid:
        doc=TBL.get((Q.project==project)&(Q.id==vid))
        if not doc: raise HTTPException(404)
        return doc
    return TBL.search(Q.project==project)

# ───────── WSTG generator ─────────
@app.post("/wstg", response_model=WSTGResponse)
def gen_wstg(req: WSTGRequest):
    """Generate a WSTG checklist table based on vulnerabilities described in section 3.

    If base_table_markdown provided, the model will update statuses/notes; otherwise it will
    generate a concise table with relevant WSTG IDs and short notes.
    """
    base = req.base_table_markdown or ""
    prompt = textwrap.dedent(f"""
    Ты — эксперт по методике OWASP WSTG. На входе — раздел 3 отчёта (описание найденных уязвимостей) в Markdown.
    Твоя задача — подготовить таблицу WSTG в Markdown.

    Правила:
    - В первую колонку помести идентификатор WSTG (например, WSTG-INPV-05), во вторую — краткое название из методики.
    - В третью колонку — цель проверки (в одном-двух предложениях).
    - В четвёртую колонку — статус/заметка применительно к нашему тесту: «Выполнено», «Обнаружено (ссылка на раздел/уязвимость)» и краткое пояснение.
    - Сопоставляй обнаруженные уязвимости с релевантными пунктами WSTG и отмечай их как «Обнаружено».
    - Если у тебя есть базовая таблица ниже, обнови только статусы/заметки, сохраняя структуру и порядок.
    - Выводи только Markdown-таблицу без пояснительного текста до/после.

    Ниже — уязвимости:
    ---
    {req.vulnerabilities_markdown}
    ---

    Базовая таблица (может быть пустой):
    ---
    {base}
    ---
    """)

    msgs = [
        {"role": "system", "content": "Ты генерируешь только Markdown-таблицу WSTG по найденным уязвимостям."},
        {"role": "user", "content": prompt},
    ]
    try:
        out = ollama_chat(msgs)
    except Exception as e:
        log.exception("LLM fail (WSTG)")
        raise HTTPException(500, str(e))
    return {"table_markdown": out.strip()}

# ───────── Results summary generator ─────────
@app.post("/results/summary", response_model=ResultsSummaryResponse)
def gen_results_summary(req: ResultsSummaryRequest):
    """Create a brief list of detected deficiencies based on Section 3 (Markdown)."""
    prompt = textwrap.dedent(f"""
    На основе раздела 3 (описания найденных уязвимостей) составь краткий раздел "Результаты тестирования" русским деловым языком.
    Формат вывода:
    В ходе тестирования Исполнителем были обнаружены следующие недостатки:\n
    - краткий пункт №1
    - краткий пункт №2
    3-7 буллетов, без вводных и заключений, без разметки заголовков.

    Уязвимости:
    ---
    {req.vulnerabilities_markdown}
    ---
    """)
    msgs=[{"role":"system","content":"Ты составляешь краткий маркированный список недостатков по найденным уязвимостям."},{"role":"user","content":prompt}]
    try:
        out = ollama_chat(msgs)
    except Exception as e:
        log.exception("LLM fail (results summary)")
        raise HTTPException(500, str(e))
    return {"summary_markdown": out.strip()}

# ───────── PDF export (Markdown→HTML→PDF) ─────────
def _wrap_with_pdf_styles(content_html: str, footer: str, *, inline: bool = False) -> str:
    """Ensure HTML contains base structure and print styles."""
    footer_safe = (footer or "").replace("\\", "\\\\").replace("'", "\\'")
    style = f"""
    <style>
      @page {{
        size: A4;
        margin: 18mm 16mm 20mm 16mm;
        @bottom-center {{
          content: '{footer_safe}';
          font-size: 10pt;
          color: #666;
        }}
      }}
      body {{
        font-family: -apple-system, Segoe UI, Roboto, Arial, sans-serif;
        font-size: 12pt;
        color: #111;
        background: #fff;
      }}
      .no-print {{ display: none !important; }}
      .a4-container {{
        width: 210mm;
        min-height: 297mm;
        margin: 0 auto 12mm auto;
        page-break-after: always;
        page-break-inside: avoid;
        background: #fff;
      }}
      .a4-container:last-child {{ page-break-after: auto; }}
    </style>
    """
    if "<html" in content_html.lower():
        # Inject styles into existing document
        if "</head>" in content_html.lower():
            return re.sub("</head>", f"{style}</head>", content_html, count=1, flags=re.IGNORECASE)
        return f"<html><head>{style}</head>{content_html.split('<body',1)[-1]}"
    if inline:
        return f"<div class='pdf-fragment'>{content_html}</div>"
    return f"<html><head>{style}</head><body>{content_html}</body></html>"


@app.post("/export/pdf")
def export_pdf(body: Dict[str, Any]):
    """Convert Markdown or ready HTML to PDF. When HTML (template) provided the central
    report block is preserved exactly as in template.html."""
    try:
        from weasyprint import HTML  # pylint: disable=import-outside-toplevel
    except Exception:
        raise HTTPException(501, "PDF export requires weasyprint: pip install weasyprint")

    html_input = body.get("html")
    footer = body.get("footer") or ""
    title = body.get("title") or ""
    logo = body.get("logo_data_uri") or ""

    if html_input:
        html = _wrap_with_pdf_styles(html_input, footer)
    else:
        md = body.get("markdown", "")
    # Minimal Markdown→HTML using <pre> fallback if no renderer available
    try:
        import markdown as mdlib  # pylint: disable=import-outside-toplevel
        html_body = mdlib.markdown(md, extensions=["toc", "fenced_code", "tables", "sane_lists"])
    except Exception:
        html_body = f"<pre>{md}</pre>"

    header_block = f"""
    <div class=hdr>
      {'<img class=logo src="'+logo+'" />' if logo else ''}
      <div class=team>{title}</div>
    </div>
    """
    html = _wrap_with_pdf_styles(f"""
    <html><head><meta charset=utf-8></head><body>
    {header_block}
    {html_body}
    </body></html>
    """, footer)

    pdf = HTML(string=html, base_url=os.getcwd()).write_pdf()
    return Response(content=pdf, media_type="application/pdf", headers={"Content-Disposition":"attachment; filename=report.pdf"})

# ───────── PDF export using DOCX template via Pandoc + LibreOffice ─────────
@app.post("/export/pdf_from_docx")
def export_pdf_from_docx(body: Dict[str, Any]):
    """Render Markdown to DOCX using a reference template.docx, then convert to PDF via LibreOffice.

    Requires installed binaries: pandoc, soffice (LibreOffice).
    Body: {"markdown": str, "reference_docx": str|null}
    """
    md = body.get("markdown") or ""
    ref = body.get("reference_docx") or os.path.abspath("template.docx")
    if not os.path.isfile(ref):
        raise HTTPException(404, f"reference_docx not found: {ref}")
    try:
        with tempfile.TemporaryDirectory() as td:
            md_path = os.path.join(td, "report.md")
            docx_path = os.path.join(td, "report.docx")
            pdf_path = os.path.join(td, "report.pdf")
            open(md_path, "w", encoding="utf-8").write(md)
            # 1) Markdown -> DOCX with styles from template
            cmd1 = ["pandoc", md_path, "-f", "markdown", "-t", "docx", "--reference-doc", ref, "-o", docx_path]
            r1 = subprocess.run(cmd1, capture_output=True, text=True)
            if r1.returncode != 0:
                raise HTTPException(500, f"pandoc failed: {r1.stderr or r1.stdout}")
            # 2) DOCX -> PDF via LibreOffice headless
            cmd2 = ["soffice", "--headless", "--convert-to", "pdf", "--outdir", td, docx_path]
            r2 = subprocess.run(cmd2, capture_output=True, text=True)
            if r2.returncode != 0 or not os.path.isfile(pdf_path):
                raise HTTPException(500, f"LibreOffice failed: {r2.stderr or r2.stdout}")
            data = open(pdf_path, "rb").read()
            return Response(content=data, media_type="application/pdf", headers={"Content-Disposition":"attachment; filename=report.pdf"})
    except HTTPException:
        raise
    except FileNotFoundError as e:
        missing = "pandoc" if "pandoc" in str(e) else "LibreOffice (soffice)"
        raise HTTPException(501, f"Missing dependency: {missing}")
    except Exception as e:
        raise HTTPException(500, str(e))

# ───────── DOCX export using reference template (for inspection) ─────────
@app.post("/export/docx_from_template")
def export_docx_from_template(body: Dict[str, Any]):
    """Return a DOCX built from Markdown using reference template.docx (no PDF conversion).

    Body: {"markdown": str, "reference_docx": str|null}
    """
    md = body.get("markdown") or ""
    ref = body.get("reference_docx") or os.path.abspath("template.docx")
    if not os.path.isfile(ref):
        raise HTTPException(404, f"reference_docx not found: {ref}")
    try:
        with tempfile.TemporaryDirectory() as td:
            md_path = os.path.join(td, "report.md")
            docx_path = os.path.join(td, "report.docx")
            open(md_path, "w", encoding="utf-8").write(md)
            cmd = ["pandoc", md_path, "-f", "markdown", "-t", "docx", "--reference-doc", ref, "-o", docx_path]
            r = subprocess.run(cmd, capture_output=True, text=True)
            if r.returncode != 0:
                raise HTTPException(500, f"pandoc failed: {r.stderr or r.stdout}")
            data = open(docx_path, "rb").read()
            return Response(content=data, media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document", headers={"Content-Disposition":"attachment; filename=report.docx"})
    except HTTPException:
        raise
    except FileNotFoundError:
        raise HTTPException(501, "Missing dependency: pandoc")
    except Exception as e:
        raise HTTPException(500, str(e))

# ───────── HTML report generator (Markdown → HTML template) ─────────
def _parse_vulnerability_section(md_text: str) -> List[Dict[str, Any]]:
    """Parse markdown section 3 to extract vulnerability data.
    
    Returns a list of dictionaries with keys: title, description, severity, cvss, cvss_vector, steps, recommendations
    """
    vulnerabilities = []
    
    # Split by vulnerability headers (## Title)
    vuln_pattern = re.compile(r'^##\s+(.+)$', re.MULTILINE)
    matches = list(vuln_pattern.finditer(md_text))
    
    for idx, match in enumerate(matches):
        vuln_title = match.group(1).strip()
        start = match.end()
        end = matches[idx + 1].start() if idx + 1 < len(matches) else len(md_text)
        section = md_text[start:end]
        
        vuln_data = {
            "title": vuln_title,
            "description": "",
            "severity": "",
            "cvss": "",
            "cvss_vector": "",
            "steps": "",
            "recommendations": ""
        }
        
        # Extract description (### Описание)
        desc_match = re.search(r'###\s*Описание\s*\n(.*?)(?=\n###|\n\|\s*\*\*|$)', section, re.DOTALL)
        if desc_match:
            desc_text = desc_match.group(1).strip()
            # Remove markdown images but keep the text content
            vuln_data["description"] = desc_text
        
        # Extract severity from table - look for table row with Уровень опасности
        # Pattern: | **Уровень опасности** | value |
        severity_table_match = re.search(r'\*\*Уровень опасности\*\*\s*\|\s*([^|\n]+)', section)
        if severity_table_match:
            severity_text = severity_table_match.group(1).strip()
            # Extract severity from badge or plain text
            severity_badge_match = re.search(r'!\[([A-ZА-Я]+)\]|Severity-([A-Za-z]+)|([А-Яа-я]+)', severity_text, re.IGNORECASE)
            if severity_badge_match:
                vuln_data["severity"] = (severity_badge_match.group(1) or severity_badge_match.group(2) or severity_badge_match.group(3) or "").strip()
            else:
                # Try to extract from plain text (Критичный, Высокий, Средний, Низкий)
                severity_plain = re.search(r'(Критичный|Высокий|Средний|Низкий|Critical|High|Medium|Low)', severity_text, re.IGNORECASE)
                if severity_plain:
                    vuln_data["severity"] = severity_plain.group(1).strip()
        
        # Extract CVSS score from table
        cvss_match = re.search(r'\*\*CVSS\*\*\s*\|\s*([\d.]+)', section)
        if cvss_match:
            vuln_data["cvss"] = cvss_match.group(1).strip()
        
        # Extract CVSS vector from table (may span multiple lines)
        cvss_vector_match = re.search(r'\*\*CVSS-вектор\*\*\s*\|\s*(CVSS:[\d.]+/[^|\n]+)', section, re.DOTALL)
        if cvss_vector_match:
            cvss_vector = cvss_vector_match.group(1).strip()
            # Clean up any extra whitespace or newlines
            cvss_vector = re.sub(r'\s+', '', cvss_vector.replace('\n', ''))
            vuln_data["cvss_vector"] = cvss_vector
        
        # Extract steps (### Шаги для повторения or ### Шаги воспроизведения)
        steps_match = re.search(r'###\s*Шаги (?:для повторения|воспроизведения)\s*\n(.*?)(?=\n###|\n\*\*|$)', section, re.DOTALL)
        if steps_match:
            steps_text = steps_match.group(1).strip()
            vuln_data["steps"] = steps_text
        
        # Extract recommendations (### Рекомендации)
        rec_match = re.search(r'###\s*Рекомендации\s*\n(.*?)(?=\n###|\n##|$)', section, re.DOTALL)
        if rec_match:
            vuln_data["recommendations"] = rec_match.group(1).strip()
        
        vulnerabilities.append(vuln_data)
    
    return vulnerabilities

def _clean_markdown_text(text: str) -> str:
    """Clean markdown text by removing images and formatting, but preserve line breaks."""
    if not text:
        return ""
    # Remove markdown images
    text = re.sub(r'!\[.*?\]\([^)]+\)', '', text)
    # Remove figure captions
    text = re.sub(r'\*Рисунок\s+\d+\.[^\*]+\*', '', text)
    # Remove markdown formatting but keep content
    text = re.sub(r'\*\*(.*?)\*\*', r'\1', text)  # Bold
    text = re.sub(r'\*(.*?)\*', r'\1', text)  # Italic
    # Remove markdown list markers but keep content
    text = re.sub(r'^\d+\.\s+', '', text, flags=re.MULTILINE)  # Numbered lists
    text = re.sub(r'^[-*+]\s+', '', text, flags=re.MULTILINE)  # Bullet lists
    return text.strip()

WSTG_LIBRARY: Dict[str, Dict[str, str]] = {
    "WSTG-INPV-05": {
        "name": "Тестирование SQL-инъекций (SQLi)",
        "goal": "Найти точки инъекции SQL и оценить воздействие.",
    },
    "WSTG-INPV-01": {
        "name": "Тестирование отражённых XSS",
        "goal": "Определить переменные, отражающиеся в ответах, и проверить XSS.",
    },
    "WSTG-INPV-02": {
        "name": "Тестирование хранимых XSS",
        "goal": "Выявить хранимые входные данные и проверить XSS.",
    },
    "WSTG-INPV-12": {
        "name": "Тестирование инъекции команд ОС",
        "goal": "Определить точки инъекций команд и оценить их последствия.",
    },
    "WSTG-INPV-11.1": {
        "name": "Тестирование включения файлов (LFI/RFI)",
        "goal": "Найти точки включения файлов и оценить воздействие.",
    },
    "WSTG-INPV-19": {
        "name": "Тестирование SSRF",
        "goal": "Найти точки SSRF и оценить возможность эксплуатации.",
    },
    "WSTG-INPV-07": {
        "name": "Тестирование XML-инъекций",
        "goal": "Определить точки входа и оценить типы атак на XML.",
    },
    "WSTG-INPV-09": {
        "name": "Тестирование Xpath-инъекций",
        "goal": "Найти точки Xpath-инъекции и оценить последствия.",
    },
    "WSTG-SESS-05": {
        "name": "Тестирование CSRF",
        "goal": "Определить, можно ли инициировать запросы от имени пользователя.",
    },
    "WSTG-CLNT-07": {
        "name": "Тестирование CORS",
        "goal": "Проверить конфигурацию CORS на безопасность.",
    },
}

WSTG_KEYWORD_MAP: List[Dict[str, Any]] = [
    {
        "id": "WSTG-INPV-05",
        "keywords": ["sql injection", "sql-инъек", "sqli", "postgresql"],
    },
    {
        "id": "WSTG-INPV-01",
        "keywords": ["reflected xss", "xss", "межсайтов", "dom xss"],
    },
    {
        "id": "WSTG-INPV-02",
        "keywords": ["stored xss", "persistent xss", "храним", "dom xss"],
    },
    {
        "id": "WSTG-INPV-12",
        "keywords": ["command injection", "командн", "os command", "rce", "code execution"],
    },
    {
        "id": "WSTG-INPV-11.1",
        "keywords": ["file inclusion", "lfi", "rfi", "directory traversal", "path traversal"],
    },
    {
        "id": "WSTG-INPV-19",
        "keywords": ["ssrf", "server-side request"],
    },
    {
        "id": "WSTG-INPV-07",
        "keywords": ["xml injection", "xxe", "xml external entity"],
    },
    {
        "id": "WSTG-INPV-09",
        "keywords": ["xpath", "xpath injection"],
    },
    {
        "id": "WSTG-SESS-05",
        "keywords": ["csrf", "cross-site request forgery", "подделк", "межсайтовых запросов"],
    },
    {
        "id": "WSTG-CLNT-07",
        "keywords": ["cors", "cross origin resource sharing"],
    },
]

def _format_vuln_label_html(number: Optional[str], title: Optional[str]) -> str:
    prefix = f"{number} " if number else ""
    title = title or ""

    def _escape_segment(segment: str) -> str:
        return html.escape(segment, quote=False)

    parts = re.split(r"(`[^`]*`)", title)
    formatted = []
    for part in parts:
        if part.startswith("`") and part.endswith("`"):
            formatted.append(f"<code>{_escape_segment(part[1:-1])}</code>")
        else:
            formatted.append(_escape_segment(part))
    return _escape_segment(prefix).strip() + (" " if prefix and title else "") + "".join(formatted)

def _build_wstg_overrides(vulnerabilities: List[Dict[str, Any]]) -> Dict[str, Dict[str, Any]]:
    """Create WSTG result overrides for vulnerabilities list."""
    overrides: Dict[str, Dict[str, Any]] = {}
    if not vulnerabilities:
        return overrides

    for vuln in vulnerabilities:
        source_text = " ".join(
            filter(
                None,
                [
                    vuln.get("title", ""),
                    vuln.get("description", ""),
                    vuln.get("steps", ""),
                    vuln.get("recommendations", ""),
                ],
            )
        ).lower()
        if not source_text:
            continue
        matched_ids: set[str] = set()
        for item in WSTG_KEYWORD_MAP:
            if any(keyword in source_text for keyword in item["keywords"]):
                matched_ids.add(item["id"])
        for wstg_id in matched_ids:
            if wstg_id not in WSTG_LIBRARY:
                continue
            entry = overrides.setdefault(
                wstg_id,
                {
                    "id": wstg_id,
                    "links": [],
                    "name": WSTG_LIBRARY[wstg_id]["name"],
                    "goal": WSTG_LIBRARY[wstg_id]["goal"],
                },
            )
            entry["links"].append(
                {
                    "anchor_id": vuln.get("anchor_id"),
                    "label_html": _format_vuln_label_html(vuln.get("number"), vuln.get("title")),
                }
            )

    for wstg_id, entry in overrides.items():
        links_html = ", ".join(
            f'<a href="#{link["anchor_id"]}">{link["label_html"]}</a>'
            for link in entry["links"]
            if link.get("anchor_id")
        )
        entry["result_html"] = f"Обнаружено: {links_html}" if links_html else "Обнаружено."
    return overrides

def _extract_month_year(period_text: Optional[str]) -> str:
    """Extract month/year in MM/YYYY format from arbitrary text."""
    if not period_text:
        return ""

    patterns = [
        r'(\d{1,2})[./-](\d{4})',
        r'(\d{1,2})[./-](\d{2})',
        r'(\w+)\s+(\d{4})',
        r'(\d{4})[./-](\d{1,2})',
    ]

    month_names = {
        'январь': '01', 'февраль': '02', 'март': '03', 'апрель': '04',
        'май': '05', 'июнь': '06', 'июль': '07', 'август': '08',
        'сентябрь': '09', 'октябрь': '10', 'ноябрь': '11', 'декабрь': '12',
        'january': '01', 'february': '02', 'march': '03', 'april': '04',
        'may': '05', 'june': '06', 'july': '07', 'august': '08',
        'september': '09', 'october': '10', 'november': '11', 'december': '12'
    }

    for pattern in patterns:
        match = re.search(pattern, period_text, re.IGNORECASE)
        if not match:
            continue
        if pattern == r'(\w+)\s+(\d{4})':
            month_text = match.group(1).lower()
            year = match.group(2)
            if month_text in month_names:
                return f"{month_names[month_text]}/{year}"
        elif pattern == r'(\d{4})[./-](\d{1,2})':
            year = match.group(1)
            month = match.group(2).zfill(2)
            return f"{month}/{year}"
        else:
            month = match.group(1).zfill(2)
            year = match.group(2)
            if len(year) == 2:
                year = f"20{year}"
            return f"{month}/{year}"

    now = datetime.datetime.now()
    return now.strftime("%m/%Y")

def _add_heading_ids(html: str, custom_ids: Optional[Dict[str, List[str]]] = None) -> str:
    """Ensure that h2/h3 headings have unique id attributes for TOC generation."""
    if not html:
        return html

    pattern = re.compile(r'<h([23])([^>]*)>(.*?)</h\1>', re.IGNORECASE | re.DOTALL)
    existing_ids = set(re.findall(r'id="([^"]+)"', html))
    counters = {"2": 1, "3": 1}
    custom_iters: Dict[str, Any] = {}
    if custom_ids:
        for level, ids in custom_ids.items():
            custom_iters[level] = iter(ids)

    def _next_id(level: str) -> str:
        if level in custom_iters:
            try:
                candidate = next(custom_iters[level])
                if candidate and candidate not in existing_ids:
                    existing_ids.add(candidate)
                    return candidate
            except StopIteration:
                pass
        idx = counters[level]
        counters[level] += 1
        candidate = f"section-{level}-{idx}"
        while candidate in existing_ids:
            idx += 1
            candidate = f"section-{level}-{idx}"
        existing_ids.add(candidate)
        return candidate

    def _repl(match: re.Match) -> str:
        attrs = match.group(2) or ""
        if "id=" in attrs.lower():
            return match.group(0)
        level = match.group(1)
        new_id = _next_id(level)
        spacer = " " if attrs else " "
        return f'<h{level}{attrs}{spacer}id="{new_id}">{match.group(3)}</h{level}>'

    return pattern.sub(_repl, html)

def _generate_vulnerability_table_html(vuln: Dict[str, Any], index: int) -> str:
    """Generate HTML table for a single vulnerability."""
    # Escape HTML special characters but preserve newlines for textarea
    def escape_html_for_input(text: str) -> str:
        if not text:
            return ""
        # For input/textarea, we need to escape quotes and ampersands, but preserve newlines
        return (text.replace("&", "&amp;")
                   .replace("<", "&lt;")
                   .replace(">", "&gt;")
                   .replace('"', "&quot;"))
    
    title = escape_html_for_input(vuln.get("title", ""))
    severity = escape_html_for_input(vuln.get("severity", ""))
    cvss_vector = escape_html_for_input(vuln.get("cvss_vector", ""))
    
    # Clean and prepare text fields
    description = _clean_markdown_text(vuln.get("description", ""))
    description = escape_html_for_input(description)
    
    steps = _clean_markdown_text(vuln.get("steps", ""))
    steps = escape_html_for_input(steps)
    
    recommendations = _clean_markdown_text(vuln.get("recommendations", ""))
    recommendations = escape_html_for_input(recommendations)
    
    # Determine margin-top class
    mt_class = "mt-6" if index > 0 else "mt-4"
    
    html = f'''            <h3 class="font-semibold {mt_class} mb-3" id="section-3-{index + 1}">3.{index + 1} {title}</h3>
            <table class="table-auto border-collapse mt-2 w-full mb-4">
              <tbody>
                <tr class="border border-black">
                  <td class="border border-black px-3 py-1 w-1/3 font-medium">Название уязвимости</td>
                  <td class="border border-black px-3 py-1 editable-cell" contenteditable="true"><input type="text" class="editable-cell" value="{title}" style="width: 100%; border: none; outline: none;"></td>
                </tr>
                <tr class="border border-black">
                  <td class="border border-black px-3 py-1 font-medium">Уровень критичности</td>
                  <td class="border border-black px-3 py-1 editable-cell" contenteditable="true"><input type="text" class="editable-cell" value="{severity}" style="width: 100%; border: none; outline: none;"></td>
                </tr>
                <tr class="border border-black">
                  <td class="border border-black px-3 py-1 font-medium">CVSS v4.0</td>
                  <td class="border border-black px-3 py-1 editable-cell" contenteditable="true"><input type="text" class="editable-cell" value="{cvss_vector}" style="width: 100%; border: none; outline: none;"></td>
                </tr>
                <tr class="border border-black">
                  <td class="border border-black px-3 py-1 font-medium">Описание</td>
                  <td class="border border-black px-3 py-1 editable-cell" contenteditable="true"><textarea class="editable-cell" style="width: 100%; min-height: 80px; border: none; outline: none; resize: none; overflow: hidden; white-space: pre-wrap;" oninput="this.style.height = 'auto'; this.style.height = (this.scrollHeight) + 'px';">{description}</textarea></td>
                </tr>
                <tr class="border border-black">
                  <td class="border border-black px-3 py-1 font-medium">Шаги воспроизведения</td>
                  <td class="border border-black px-3 py-1 editable-cell" contenteditable="true"><textarea class="editable-cell" style="width: 100%; min-height: 80px; border: none; outline: none; resize: none; overflow: hidden; white-space: pre-wrap;" oninput="this.style.height = 'auto'; this.style.height = (this.scrollHeight) + 'px';">{steps}</textarea></td>
                </tr>
                <tr class="border border-black">
                  <td class="border border-black px-3 py-1 font-medium">Рекомендации</td>
                  <td class="border border-black px-3 py-1 editable-cell" contenteditable="true"><textarea class="editable-cell" style="width: 100%; min-height: 80px; border: none; outline: none; resize: none; overflow: hidden; white-space: pre-wrap;" oninput="this.style.height = 'auto'; this.style.height = (this.scrollHeight) + 'px';">{recommendations}</textarea></td>
                </tr>
              </tbody>
            </table>
'''
    return html

@app.post("/export/html", response_model=HTMLReportResponse)
def export_html_report(body: HTMLReportRequest):
    """Generate HTML report from Markdown section 3 and HTML template.
    
    Body: {"vulnerabilities_markdown": str, "template_path": str|null}
    """
    md = body.vulnerabilities_markdown or ""
    template_path = body.template_path or os.path.abspath("template.html")
    
    if not os.path.isfile(template_path):
        raise HTTPException(404, f"Template not found: {template_path}")
    
    try:
        # Read template
        with open(template_path, "r", encoding="utf-8") as f:
            html_template = f.read()
        html_output = html_template
        
        meta = {
            "sys_name": body.system_name or "",
            "sys_url": body.system_url or "",
            "sys_segment": body.system_segment or "",
            "test_period": body.test_period or "",
            "executor": body.executor or "",
            "ke_code": body.ke_code or "",
            "system_details": body.system_details or "",
            "report_date": _extract_month_year(body.test_period),
            "section3_html": "",
        }

        parsed_vulns = _parse_vulnerability_section(md)
        vuln_meta: List[Dict[str, Any]] = []
        for idx, vuln in enumerate(parsed_vulns, start=1):
            entry = vuln.copy()
            entry["anchor_id"] = f"vuln-{idx}"
            entry["number"] = f"3.{idx}"
            vuln_meta.append(entry)
        
        try:
            import markdown as mdlib  # pylint: disable=import-outside-toplevel
            section3_html = mdlib.markdown(
                md,
                extensions=["extra", "sane_lists", "tables", "fenced_code"],
            )
        except Exception:
            section3_html = f"<pre>{md}</pre>"
        custom_ids = {"2": [v["anchor_id"] for v in vuln_meta]} if vuln_meta else None
        section3_html = _add_heading_ids(section3_html, custom_ids=custom_ids)
        meta["section3_html"] = section3_html
        meta["vulnerabilities"] = [
            {
                "title": v.get("title", ""),
                "anchor_id": v.get("anchor_id"),
                "number": v.get("number"),
            }
            for v in vuln_meta
        ]
        wstg_overrides = _build_wstg_overrides(vuln_meta)
        meta["wstg_overrides"] = {
            k: {"result_html": v.get("result_html", "")} for k, v in wstg_overrides.items()
        }
        meta_json = json.dumps(meta, ensure_ascii=False)
        if "window.REPORT_META = {};" in html_output:
            html_output = html_output.replace(
                "window.REPORT_META = {};",
                f"window.REPORT_META = {meta_json};",
                1,
            )
        
        preview_pattern = re.compile(
            r'(<div[^>]*id="section3-preview"[^>]*>)(.*?)(</div>)',
            re.DOTALL
        )
        if preview_pattern.search(html_output):
            html_output = preview_pattern.sub(
                lambda m: f"{m.group(1)}{section3_html}{m.group(3)}",
                html_output,
                count=1
            )
        
        # Update section 2 (Результаты тестирования) if results_summary is provided
        if body.results_summary:
            # Parse results summary to extract deficiencies
            deficiencies = []
            for line in body.results_summary.split('\n'):
                line = line.strip()
                if line.startswith('-') or line.startswith('*'):
                    # Remove list marker and clean
                    deficiency = re.sub(r'^[-*]\s+', '', line).strip()
                    if deficiency:
                        # Escape HTML
                        deficiency = (deficiency.replace("&", "&amp;")
                                     .replace("<", "&lt;")
                                     .replace(">", "&gt;")
                                     .replace('"', "&quot;"))
                        deficiencies.append(deficiency)
            
            if deficiencies:
                # Generate HTML for deficiencies list
                deficiencies_html = '\n'.join([
                    f'              <li class="editable-cell" contenteditable="true" style="padding: 2px 4px; margin-bottom: 4px;">{deficiency}</li>'
                    for deficiency in deficiencies
                ])
                
                # Replace deficiencies list in section 2
                deficiencies_pattern = re.compile(
                    r'(<ul[^>]*id="deficiencies-list"[^>]*>)(.*?)(</ul>)',
                    re.DOTALL
                )
                html_output = deficiencies_pattern.sub(
                    r'\1\n' + deficiencies_html + r'\n            \3',
                    html_output
                )
        
        # Update system name if provided
        if body.system_name:
            # Replace system name placeholder in section 2
            # Find the system name span in section 2 (after "анализа защищенности")
            system_name_escaped = (body.system_name.replace("&", "&amp;")
                                  .replace("<", "&lt;")
                                  .replace(">", "&gt;")
                                  .replace('"', "&quot;"))
            section2_pattern = re.compile(
                r'(По результатам проведения анализа защищенности «)(<span[^>]*class="editable-cell"[^>]*contenteditable="true"[^>]*>)([^<]*)(</span>)(», исполнителем были обнаружены:)',
                re.DOTALL
            )
            html_output = section2_pattern.sub(
                r'\1\2' + system_name_escaped + r'\4\5',
                html_output
            )
        
        return {"html": html_output}
        
    except HTTPException:
        raise
    except Exception as e:
        log.exception("HTML generation error")
        raise HTTPException(500, f"HTML generation failed: {str(e)}")

# ───────── shutdown ─────────
@app.on_event("shutdown")
def _cleanup(): gc.collect()