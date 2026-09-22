# Local ChatBot

A production-quality, provider-agnostic AI chat web app (ChatGPT/Claude-like) that runs fully on your machine. Single-owner auth, JSON database, streaming responses, web search, deep thinking, attachments, and rich markdown.

## Features

- **Any OpenAI-compatible provider** — OpenAI, OpenRouter, Groq, DeepSeek, Ollama, LM Studio, and more
- **Streaming chat** with stop, regenerate, continue, edit, and delete
- **Web search mode** — DuckDuckGo results injected into the prompt; source list under the reply
- **Deep thinking mode** — reasoning system prompt + collapsible “Thought process” UI
- **Attachments** — images, PDF, text/markdown (20MB cap), base64 upload
- **Rich markdown** — GFM, syntax highlight, KaTeX math, Mermaid diagrams
- **Chats** — create, rename, delete, group, search, import/export (MD / JSON / TXT)
- **Settings** — AI provider, account (password change requires current password), appearance, chat display
- **Single-owner auth** — default `admin` / `admin123`; session cookie; no public registration
- **Pure black dark theme** by default (no light flash on load)
- **Virtualized message list** for long conversations
- **API keys never leave the server** — browser only talks to the local API

## Stack

| Layer    | Tech |
|----------|------|
| Frontend | Vite, React 18, TypeScript, Tailwind CSS 4 |
| Backend  | Express (local API only) |
| Storage  | JSON files under `database/` (no SQL/NoSQL) |

## Requirements

- Node.js 18+ (tested on Node 24)
- An OpenAI-compatible API key or local endpoint

## Quick start

```bash
npm install
npm run dev
```

- App: http://localhost:5173  
- API: http://127.0.0.1:3001  

Log in with the default credentials, then open **Settings → AI** and set:

1. **API Base URL** (e.g. `https://api.openai.com/v1`)
2. **API Key**
3. **Model** (e.g. `gpt-4o-mini`)

Use **Test connection** before chatting.

### Production build

```bash
npm run build
npm start
```

### Typecheck

```bash
npm run typecheck
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | API + Vite together |
| `npm run dev:server` | Express only |
| `npm run dev:client` | Vite only |
| `npm run build` | Typecheck + production bundle |
| `npm start` | Run production server |
| `npm run typecheck` | TypeScript project check |

## Project layout

```
├── server/          # Express API, auth, AI proxy, web search, JSON DB
├── shared/          # Shared TypeScript types & defaults
├── src/             # React app (contexts, chat UI, settings, markdown)
├── database/        # Auto-created: config, chats, attachments, sessions
└── index.html       # Entry + dark-theme pre-paint script
```

## Modes

### Search

Toggle the **globe** icon in the composer. On send, the server queries DuckDuckGo, injects results into the model prompt, and returns a **Sources** list under the assistant message.

### Deep thinking

Toggle the **brain** icon. The server prepends a careful-reasoning system prompt; if the model streams `reasoning_content`, it appears in a collapsible **Thought process** block.

Both defaults can be set under **Settings → Chat**.

## Security notes

- Change the default password after first login (**Settings → Account**).
- Password changes require the current password (timing-safe compare).
- `GET /api/config` never returns the password or API key (only `hasApiKey`).
- AI calls are proxied server-side so keys stay out of the browser.
- Bind API to `127.0.0.1` if you do not need LAN access.

## Data

Everything lives under `database/`:

- `config.json` — settings and credentials  
- `chats/*.json` — conversations  
- `attachments/` — uploaded files  
- `sessions.json` — login sessions  

Delete files you no longer need; the app recreates structure on start.

## License

[MIT](LICENSE)

## Security

See [SECURITY.md](SECURITY.md) for reporting vulnerabilities and hardening notes. Change the default password after first login.
