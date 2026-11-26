---
title: World Cup Players
tagline: Every World Cup player's stats since 1970, scraped into Postgres and served by an API with keys and rate limits
kind: experiment
order: 14
started: 2026-06
status: done
stack: [Python, Postgres, FastAPI, pydantic, pytest, React 19, TypeScript, Vite]
repo: https://github.com/nunseik/world-cup-players
stats:
  - { label: tournaments, value: 1970–2026 }
  - { label: commits in 2 days, value: '35' }
  - { label: test files, value: '11' }
---

A data pipeline plus an API, built over two days in June 2026, while the World Cup was on.

## Data

- A headless Python scraper collects tournament totals per player (minutes, goals, assists, cards and fouls) from FBref and cross-checks them against ESPN's leaderboards.
- Results go into Postgres, one row per player per World Cup. Every stat is nullable, because older tournaments never recorded minutes or fouls.
- During the 2026 tournament, the data refreshed automatically every 6 hours.

## API

A read-only FastAPI service with paginated endpoints for tournaments, scorer and assist leaderboards, player search (accent- and case-insensitive), career totals, teams by confederation, and filterable, sortable stats.

- **API keys:** you sign up with an email, and the key is shown once. Only its SHA-256 hash is stored.
- **Tiered rate limits:** 60 requests/min on the free tier, 600 on premium. Over the limit you get `429` + `Retry-After`, and every response carries `X-RateLimit-*` headers.
- **Tests:** 11 test files cover the parsers (against saved HTML fixtures), the endpoints, key handling, signup and the rate limiter.

On top of the API sits a React "sticker album" frontend, and deploy scripts set it all up on a self-hosted VM.
