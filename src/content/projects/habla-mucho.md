---
title: Habla Mucho
tagline: Spanish pronunciation feedback + a classroom platform where teachers' own AI can build lessons
kind: flagship
order: 2
started: 2026-10
status: beta
stack: [Python, FastAPI, PostgreSQL, React, wavesurfer.js, Whisper, Qwen3-TTS, Piper, Praat/parselmouth, Silero VAD, MCP]
stats:
  - { label: commits in ~5 weeks, value: '360+' }
  - { label: lines of code, value: ~77k }
  - { label: custom MCP servers, value: '2' }
links:
  - { label: app.hablamucho.com.br, href: 'https://app.hablamucho.com.br' }
note: Currently open to invited teachers.
shots:
  - { src: /shots/habla-mucho/flashcards.jpg, video: /shots/habla-mucho/flashcards, alt: 'Student on a phone: Anki-style flashcards with spaced repetition (again, hard 1 day, easy 4 days)' }
  - { src: /shots/habla-mucho/lab.jpg, video: /shots/habla-mucho/lab, size: [960, 600], alt: 'Speech lab: waveform, words, phonemes and pitch in sync; selecting the flagged word shows what was heard' }
  - { src: /shots/habla-mucho/game.jpg, video: /shots/habla-mucho/game, size: [720, 600], alt: 'Reading game: hold to record, then each word comes back coloured by how it sounded' }
  - { src: /shots/habla-mucho/connect-ai.jpg, video: /shots/habla-mucho/connect-ai, size: [960, 600], alt: 'Teacher profile, "Connect AI": a personal token plus the one-line setup for Claude Code or Codex' }
  - { src: /shots/habla-mucho/mcp.jpg, video: /shots/habla-mucho/mcp, size: [960, 540], alt: 'The teacher''s AI building a lesson journey over MCP: reads the guide, fixes a validation error, saves a draft (replay of a real run)' }
  - { src: /shots/habla-mucho/ai-draft.jpg, video: /shots/habla-mucho/ai-draft, size: [960, 600], alt: 'The draft appears marked "Via IA"; the teacher reviews it and previews it as a student before anything is published' }
  - { src: /shots/habla-mucho/home.jpg, size: [960, 540], alt: 'Home page: practise Spanish out loud, for students and teachers' }
---

A pronunciation experiment that became a classroom platform for Spanish teachers: Duolingo for schools, with the teacher in charge.

## Pronunciation, word by word
A student reads aloud. The pipeline cleans the audio (**Silero VAD**), transcribes it (**Whisper**), aligns every phoneme and compares it with a native reference (**Qwen3-TTS** / **Piper**). **Praat** measures intonation and fluency.

- **Red:** strong evidence of a problem. **Yellow:** please review. **Green:** nothing detected.
- The model only suggests. The teacher has the final word on every alert.

## The platform
- Classes, assignments and deadlines
- **Anki-style flashcards**, a reading game, free speech (beta), light gamification
- Magic-link login, encrypted daily backups with tested restores, automated deploys

## Teachers bring their own AI
What I'm proudest of: teachers connect *their* AI (Claude, ChatGPT…) through an **MCP server I wrote**. It reads the format guide, checks the lesson with the same validator as the UI and saves a **draft**.

- Each token reaches only that teacher's journeys, with hourly and daily limits.
- The AI can't publish or reach students. A person reviews every draft first.

An internal **ops plugin** (MCP + skill) lets my coding agents deploy, check health and roll back.
