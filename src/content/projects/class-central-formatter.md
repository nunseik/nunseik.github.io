---
title: Class Central toolkit
tagline: The private toolkit I built to do my content job at Class Central faster
kind: automation
order: 10
started: 2026-05
status: done
stack: [HTML, JavaScript, Node.js, Playwright, Claude Code skills, MCP]
repo: https://github.com/nunseik/wysiwyg-wp-editor
note: Built for my own use. It was the last thing I worked on before leaving.
---

At Class Central I wrote and maintained *Best Courses Guides*: long articles comparing online courses on a topic. Formatting them for WordPress by hand was slow and error-prone, so I automated the boring parts.

- **Live preview without WordPress:** a static page that loads the production stylesheet from the CDN, so what I see locally is what readers see.
- **Pattern library:** slot-based HTML snippets with an index that an AI agent reads to pick the right pattern for each section and fill its `{{SLOTS}}`.
- **Two Claude Code skills:**
  - `format-bcg` turns a raw draft into paste-ready HTML: house section order, picks table built from live catalog data through the Class Central MCP, then a mechanical QA pass.
  - `bcg-refresh` revives an old guide: re-checks every course, adds or removes picks, rebuilds the table and stops before publishing.
- **Banner Studio:** a tiny design tool for the 1024×512 hero banners. One HTML template, two drivers: a live-preview studio and a headless-Chrome CLI exporter, so the preview and the PNG are always identical.
