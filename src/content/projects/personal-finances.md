---
title: Personal Finances
tagline: Telegram bot + MCP server + tiny dashboard. My money, on a free server, queried by AI
kind: flagship
order: 3
started: 2026-06
status: live
stack: [TypeScript, Node.js, SQLite, Telegram Bot API, Telegram Mini Apps, MCP, Cloudflare Tunnel, GitHub Actions, systemd]
stats:
  - { label: monthly cost, value: R$0 }
  - { label: MCP tools, value: '11' }
  - { label: commits, value: '52' }
note: Personal tool, in daily use. The clip is a real session on my phone, so every amount, balance and holding is blurred.
shots:
  - { src: /shots/personal-finances/bot.jpg, video: /shots/personal-finances/bot, size: [480, 1000], alt: 'Logging an expense by chat, the bot confirming it, /recent, then the Telegram Mini App dashboard (values blurred)' }
---

Finance apps keep what you feed them and don't let it back out. I wanted to own my data, so I built my own system: my database, my rules, export anything. I've used it every day since June 2026.

## How it works

```
  me (Telegram) ──► bot (systemd, free VPS) ──► SQLite
                        │
                        └─► tiny web server on 127.0.0.1
                               ▲
              Cloudflare quick tunnel (outbound only)
                               ▲
                  Telegram Mini App dashboard

  Claude / Codex ──► MCP server ──(SSH)──► same SQLite, live
```

- **Logging:** `/add 150 BRL expense mercado`, or free text like *"spent R$50 on groceries"*. Also transfers, recurring bills, budgets, ETFs and a shared card split.
- **Dashboard:** a read-only Telegram Mini App, served from inside the bot through a Cloudflare tunnel. No open ports, and only my account can open it.
- **AI check-ups:** an MCP server over SSH lets Claude or Codex query the live data for trends and "where did March go?".
- **Deploys:** push to `main` → GitHub Actions → systemd restart.

## Why I built it
- **My data, my file:** everything lives in one SQLite database I control. I can export it, query it or move it anywhere.
- **No lock-in:** no app deciding what I can see or download.
- **Small and DIY:** one process, a free VM and a tunnel. Texting a bot takes five seconds, so I actually keep using it.
