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
  - { src: /shots/sentinel/01-mapa.jpg, alt: 'Map of central São Paulo covered in colour-coded crime markers' }
  - { src: /shots/sentinel/05-assistente.jpg, alt: 'Sentinel assistant panel giving a critical-risk analysis of the current location' }
  - { src: /shots/sentinel/04-sentinel.jpg, alt: 'Map with Sentinel active, showing a critical risk pill at the bottom' }
  - { src: /shots/sentinel/06-dynamic-island.jpg, alt: 'iPhone Dynamic Island showing a red risk gauge from Sentinel' }
  - { src: /shots/sentinel/08-live-activity.jpg, alt: 'Lock screen Live Activity with the current risk level' }
---

The most complex thing I have built. It started as a weekend question: *where exactly do phones get stolen in São Paulo?* It grew into a data pipeline, a web map, a native-feeling mobile app and a conversational assistant, all fed by public police data.

## The problem

São Paulo's public safety office (SSP-SP) publishes every police report, but as giant spreadsheets that nobody can read. Part of the export is actually UTF-16 tab-separated text with an `.xls` extension, coordinates use commas as decimal separators, and a big chunk of the rows has no coordinates at all.

## What I built

```
  SSP-SP exports ──► Python ETL ──► PostgreSQL + PostGIS ──► Go API ──┬─► web map (MapLibre)
  (xls/xlsx, RSS)    geocoding        grid + zone stats       sqlc    ├─► Flutter app (iOS/Android)
                     + cache          news events                     └─► Sentinel assistant
                                                                            │
                                         e5 embedding sidecar ◄─────────────┘
```

- **ETL + geocoding:** a 5-step fallback (full address → normalised → no district → street → district) against OpenStreetMap's Nominatim, with a persistent cache in Postgres. About 82% of the records end up with precise coordinates.
- **Go backend:** GeoJSON and stats endpoints, pre-aggregated risk grids and zone stats, the whole web frontend compiled into a single binary with `go:embed`. It runs on a **free-tier VM with 1 GB of RAM**.
- **Mobile app (Sentinel):** monitors risk in the background as you move. It detects whether you are still, walking or driving and adapts GPS frequency to save battery. On iPhone the current risk shows up in the **Dynamic Island** and as a **Live Activity** on the lock screen. Location never leaves the device.
- **News ingestion:** RSS feeds are classified by crime type, matched to a city, deduplicated into events and turned into indexable city pages for SEO.

## The assistant

You can ask Sentinel things like *"is it safe to park here tonight?"* or *"and what about phones?"* in plain Portuguese.

Under the hood it is a custom NLU pipeline rather than a chatbot wrapper. Questions are routed to intents with **local multilingual-e5 embeddings** served by a small Python sidecar, classifying by nearest centroid with no external API. Then dedicated resolvers handle addresses, neighbourhoods, districts, time of day, comparisons and follow-up questions that depend on the previous answer. Each part has its own lab CLI (`nlulab`, `classifylab`, `scorelab`) so I can replay a saved corpus before and after every change.

## How I work on it with AI

This project is also where I learned to treat AI agents as a team that needs process:

- **`mapa-ops` MCP server** (Go, 14 tools): deploy, health checks, logs, ETL status, grid refreshes, read-only SQL. Agents operate production through typed tools instead of improvised SSH, and anything that writes asks for confirmation first.
- **Project memory** (`memoryctl`): a CLI that stores decisions, blockers and findings, with semantic search over them using the same e5 embeddings, so each agent session loads only the context relevant to its task.
- **Review gate:** risky changes (ETL, SQL, migrations, assistant routing) must pass a logic review by Codex, falling back to a Claude reviewer agent, before they can be committed.
- **`/ux-review` skill:** drives the local app as a real person on iPhone/WebKit, Android and desktop, and reports friction by severity.
