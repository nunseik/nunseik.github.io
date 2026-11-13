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

Spreadsheets never stuck for me. A bot I can text in five seconds did.

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

- **Logging:** commands like `/add 150 BRL expense mercado`, or just free text such as *"spent R$50 on groceries"*, which gets parsed automatically. It also handles transfers, recurring bills, budgets with progress bars, ETF holdings and splitting a shared credit card.
- **Dashboard:** a read-only Telegram Mini App (balances, spending by category, monthly summary). The web server runs *inside* the bot process and is exposed through a Cloudflare quick tunnel: no open ports, no domain, no extra service. The dashboard link refreshes itself and only works for my Telegram user.
- **Monthly check-ups with AI:** an MCP server runs over SSH, so Claude or Codex can query the live database (balances, summaries, budget status) and do the heavier analysis with me: trends, anomalies, "where did March go?".
- **Deploys:** push to `main` → GitHub Actions → systemd restart.

## Why I like it

It is deliberately small and DIY: one SQLite file, one process, a free VM and a tunnel. I have used it every day since June 2026.
