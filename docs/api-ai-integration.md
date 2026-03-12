# AI Vuln Generator — Интеграция внешних сервисов

Сервис работает на порту **8004**. Аутентификация не требуется (заглушка).

## Генерация описания уязвимости

### Синхронный режим

```http
POST /api/ai/generate
Content-Type: application/json
```

**Тело запроса:**

```json
{
  "history": [
    { "role": "user", "content": "SQL-инъекция в параметре id. POST /api/users. Payload: ' OR 1=1--" }
  ],
  "images": ["data:image/png;base64,iVBORw0KGgo..."],
  "filenames": ["screenshot.png"]
}
```

| Поле | Тип | Описание |
|------|-----|----------|
| `history` | `[{role, content}]` | История диалога. `role`: `user` / `assistant` |
| `images` | `string[]` | Скриншоты в формате base64 data URL (`data:image/...;base64,...`) |
| `filenames` | `string[]` | Имена файлов скриншотов (соответствуют `images` по индексу) |

**Ответ:**

```json
{
  "markdown": "## SQL Injection\n\n| **Параметр** | ...",
  "raw": "## SQL Injection\n\n..."
}
```

### Потоковый режим

```http
POST /api/ai/generate/stream
Content-Type: application/json
```

Тело запроса аналогично синхронному. Ответ: `text/plain` с токенами по мере генерации (chunked transfer encoding).

**Пример (Python):**

```python
import httpx

with httpx.stream("POST", "http://localhost:8004/api/ai/generate/stream", json={
    "history": [{"role": "user", "content": "XSS в поле поиска"}]
}) as resp:
    for chunk in resp.iter_text():
        print(chunk, end="", flush=True)
```

**Пример (JavaScript/fetch):**

```javascript
const resp = await fetch("http://localhost:8004/api/ai/generate/stream", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ history: [{ role: "user", content: "XSS в поле поиска" }] }),
});
const reader = resp.body.getReader();
const decoder = new TextDecoder();
while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  console.log(decoder.decode(value));
}
```

### Kill-chain сценарий (потоковый)

```http
POST /api/ai/generate/killchain/stream
```

Тело запроса аналогично `/generate/stream`. Промпт оптимизирован для описания цепочки атаки.

---

## Генерация сводки результатов

```http
POST /api/ai/results/summary
Content-Type: application/json
```

```json
{
  "vulnerabilities_markdown": "## SQL Injection\n...\n## XSS\n..."
}
```

**Ответ:**

```json
{
  "summary_markdown": "В ходе тестирования Исполнителем были обнаружены следующие недостатки:\n\n- SQL-инъекция в форме авторизации\n- Отражённый XSS в поисковой строке"
}
```

---

## Структура ответа AI (генерация уязвимости)

Ответ генерируется в формате Markdown по шаблону:

```markdown
## Название уязвимости (на английском)

| **Параметр**          | **Значение**   |
| :-------------------- | :------------- |
| **Уровень опасности** | Критический / Высокий / Средний / Низкий |
| **CVSS**              | 9.1            |
| **CVSS-вектор**       | CVSS:4.0/AV:N/AC:L/... |

### Описание
...

### Шаги для повторения
Для эксплуатации данной уязвимости необходимо выполнить следующие действия...

### Рекомендации по устранению
1. ...
2. ...
```

---

## Конфигурация провайдера LLM

| Переменная | По умолчанию | Описание |
|-----------|-------------|----------|
| `LLM_PROVIDER` | `ollama` | `ollama` / `openai` / `custom` |
| `LLM_MODEL` | `gemma3:27b-it-qat` | Имя модели |
| `LLM_BASE_URL` | `http://localhost:11434` | URL API (для openai/custom — базовый URL совместимого API) |
| `LLM_API_KEY` | — | API-ключ (пусто для Ollama) |
| `LLM_TEMPERATURE` | `0.1` | Температура генерации |
| `LLM_MAX_TOKENS` | `2048` | Максимум токенов |

**Пример запуска с OpenAI-совместимым API:**

```bash
LLM_PROVIDER=openai \
LLM_MODEL=gpt-4o \
LLM_BASE_URL=https://api.openai.com/v1 \
LLM_API_KEY=sk-... \
uvicorn app.main:app --port 8004
```

**Пример с локальным LM Studio:**

```bash
LLM_PROVIDER=openai \
LLM_MODEL=local-model \
LLM_BASE_URL=http://localhost:1234/v1 \
LLM_API_KEY=lm-studio \
uvicorn app.main:app --port 8004
```
