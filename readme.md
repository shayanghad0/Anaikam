# Anaikam — AI Chat Application

A production-ready, full-stack AI chat application with a modern chat interface.

## Site Name

**Anaikam**

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Backend | Node.js · Express.js · TypeScript |
| Frontend | React · Vite · TypeScript |
| Database | JSON files (auto-created on first startup) |

**Not used:** MongoDB, MySQL, SQLite, PostgreSQL, Redis, IndexedDB, LocalStorage, SessionStorage. All persistence is server-side JSON.

---

## Project Structure

```
/client
  /components
  /pages
  /hooks
  /services
  /types
  /utils

/server
  /routes
  /controllers
  /middlewares

/shared

/database
  users.json
  sessions.json
  settings.json
  models.json
  chats.json
  messages.json
  system-prompts.json
  themes.json
  logs.json
```

All database files are created automatically on first startup.

---

## Features

### Authentication
- Login / Logout / Register
- Forgot Password (admin reset)
- Session-based authentication
- bcrypt password hashing
- Roles: Admin, User

### Chat
- Streaming responses with stop/continue/retry
- Edit user messages, delete messages
- Copy message & copy code
- Markdown rendering with syntax highlighting
- Tables, LaTeX math, Mermaid diagrams
- Image URL rendering
- Typing animation & thinking indicator
- Conversation title auto-generation & rename
- Pinned & archived conversations
- Unlimited conversations with search
- Message timestamps

### Model Providers
Supports any OpenAI-compatible API:
- OpenAI · OpenRouter · DeepSeek · Anthropic-compatible
- Google Gemini-compatible · Ollama · LM Studio · vLLM · LiteLLM

Configurable per-user: API URL, API Token, Model, Custom Headers

### Multi-Model
Switch between configured models inside a chat (GPT, Claude, Gemini, DeepSeek, Qwen, Llama, Mistral, etc.)

### System Prompts
Unlimited custom system prompts with:
- Prompt library (translator, programmer, teacher, medical, law, business, writing assistant…)
- Favorites, import/export, duplicate, categories

### Personas
Create AI personas with name, avatar, description, system prompt, temperature, creativity, preferred model, and categories.

### Settings (all configurable from UI)
Display name, profile picture, theme, language, timezone, font size, message width, send-with-enter, streaming, animations, markdown, code highlighting, temperature, top-p, max tokens, timeout, export format, auto-title, default system prompt.

### Search
Search conversations, messages, prompt library, and personas.

### Export
Export conversations as Markdown, PDF, HTML, JSON, or TXT. Import previous conversations.

### UI Design
- Modern Dark Mode & Light Mode
- Responsive layout with sidebar
- Top navigation, glassmorphism effects
- Smooth spring-physics animations
- Mobile support

### Profile
Avatar, username, display name, bio, theme, password, email, language.

### Admin Panel
Dashboard, user management, model management, logs, settings, announcements, statistics, API configuration, registration toggle.

---

## Security

- bcrypt password hashing
- Rate limiting
- Helmet.js
- CORS protection
- Input validation (Zod)
- XSS protection
- CSRF protection where applicable
- Path validation
- Secure session handling

---

## Code Quality

- Strict TypeScript (no `any`)
- Clean Architecture
- SOLID principles
- Modular, reusable components
- No duplicated code

---

## Getting Started

```bash
npm install
npm run dev
```

On first startup the app auto-creates:
- `/database` folder with all JSON files
- Default admin account
- Default settings and model configuration

---

## Core Design Principle

This is **only an AI Chat application**. It does not contain:
- Terminal, file explorer, project workspace
- Git integration, code execution, shell commands
- Agent tools, file editing, coding assistant features
- Browser filesystem access

The frontend stores no data permanently — everything comes from the backend JSON database.
