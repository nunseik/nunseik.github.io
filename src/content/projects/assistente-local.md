---
title: Assistente Local
tagline: A Portuguese voice assistant in the macOS menu bar, powered by a local Codex session
kind: experiment
order: 20
started: 2026-09
status: local
stack: [Swift, SwiftUI, Apple Speech, AVSpeechSynthesizer, Codex app-server]
---

A menu-bar app I talk to in Portuguese. It listens with on-device speech recognition, answers with the system voice and uses a local **Codex app-server** process as its brain.

- *"I want a short crime series on Max"* → Codex turns the sentence into a structured intent → the browser opens a clean search for that, without the filler words.
- *"Where can I watch X?"* → a live web search limited to what's available in Brazil, opening the title directly in a streaming service I already subscribe to.
- A **Codex mode** for asking questions about a project in my workspace. It starts read-only and offline, and refuses edits or commands.

No audio is ever recorded. Next on the list: a global push-to-talk key and local Whisper as a fallback.
