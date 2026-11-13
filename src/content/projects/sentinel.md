---
title: Mapa de Crimes / Sentinel
tagline: Crime map + real-time safety app for São Paulo, with a Portuguese-speaking assistant
kind: flagship
order: 1
started: 2026-03
status: live
stack: [Go, PostgreSQL, PostGIS, sqlc, Python, Flutter, Dart, Swift, Kotlin, MapLibre GL, Caddy, multilingual-e5, MCP]
stats:
  - { label: police reports indexed, value: 1.8M+ }
  - { label: commits since March, value: '1,000+' }
  - { label: lines of code, value: ~63k }
  - { label: Go test files, value: '149' }
links:
  - { label: mapadecrimes.ia.br, href: 'https://mapadecrimes.ia.br' }
shots:
  - { src: /shots/sentinel/web-map.jpg, video: /shots/sentinel/web-map, alt: 'Web map: switching between reports, risk grid and heat map, then searching an address' }
  - { src: /shots/sentinel/01-mapa.jpg, alt: 'Map of central São Paulo covered in colour-coded crime markers' }
  - { src: /shots/sentinel/05-assistente.jpg, alt: 'Sentinel assistant panel giving a critical-risk analysis of the current location' }
  - { src: /shots/sentinel/04-sentinel.jpg, alt: 'Map with Sentinel active, showing a critical risk pill at the bottom' }
  - { src: /shots/sentinel/06-dynamic-island.jpg, alt: 'iPhone Dynamic Island showing a red risk gauge from Sentinel' }
  - { src: /shots/sentinel/08-live-activity.jpg, alt: 'Lock screen Live Activity with the current risk level' }
---

The most complex thing I've built: public police data → a crime map, a mobile safety app and an assistant that speaks Portuguese.

## The problem
SSP-SP publishes every police report as huge spreadsheets: UTF-16 text named `.xls`, comma decimals, many rows with no coordinates.

## What I built

```
  SSP-SP exports ──► Python ETL ──► PostgreSQL + PostGIS ──► Go API ──┬─► web map (MapLibre)
  (xls/xlsx, RSS)    geocoding        grid + zone stats       sqlc    ├─► Flutter app (iOS/Android)
                     + cache          news events                     └─► Sentinel assistant
                                                                            │
                                         e5 embedding sidecar ◄─────────────┘
```

- **ETL:** 5-step geocoding fallback with a Postgres cache. 82% of reports get precise coordinates.
- **Go backend:** one binary with the web map built in, on a free 1 GB VM.
- **Sentinel app:** tracks risk as you move, with GPS tuned to save battery. Risk shows in the Dynamic Island and the lock screen. Location stays on the phone.
- **News:** RSS classified by crime and city, turned into indexable city pages.

## The assistant
Ask *"is it safe to park here tonight?"* in plain Portuguese. It runs on its own NLU, not a chatbot wrapper: local e5 embeddings choose the intent, then resolvers handle places, times and follow-ups. Lab CLIs replay a saved corpus before and after each change.

## How I work on it with AI
- **`mapa-ops` MCP** (14 tools): agents deploy, read logs and query production through typed tools. Writes ask first.
- **[`memoryctl`](/tools/memoryctl/):** shared project memory. It's what made building this solo possible. 799 items in 7 months.
- **Review gate:** risky changes need a Codex logic review before commit.
- **`/ux-review`:** an agent uses the app as a real person on iPhone, Android and desktop.
