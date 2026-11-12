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
---

It started as a personal experiment: can a computer tell a Brazilian learner *which word* they mispronounced in Spanish, and why? That experiment grew into a platform for Spanish teachers, a sort of Duolingo for schools, where the teacher stays in charge.

## Pronunciation, word by word

A student reads a text aloud. The pipeline then:

1. cleans the audio and trims silence (**Silero VAD**)
2. transcribes it with **Whisper**
3. force-aligns every phoneme against the expected text
4. compares each one with a native reference read by **Qwen3-TTS** or **Piper**, generated once, validated by Whisper and regenerated automatically if it fails
5. measures intonation, volume and fluency with **Praat** (via parselmouth)

The report shows the full text with each word clickable. Red means strong acoustic evidence of a problem, yellow means "please review", and green only means *no problem detected*. The model only proposes hypotheses: the teacher has the final word and can annotate every alert.

## The platform

- Classes, assignments and deadlines
- **Anki-style flashcards**, a reading game, a free-speech mode (beta) and light gamification
- Magic-link login, encrypted daily backups with a tested restore, automated deploys to a small VPS

## Teachers bring their own AI

The part I am proudest of: teachers can connect *their* AI assistant (Claude, ChatGPT, …) to Habla Mucho through an **MCP server I wrote** (stateless streamable HTTP). They ask it to create a lesson journey, and it reads the format guide, validates the content with the same validator as the UI and saves it as a **draft**.

Guardrails I designed in from day one:

- each personal token can only touch that teacher's own journeys, with per-day and per-hour rate limits
- the AI can never publish anything or reach students. A human reviews every draft on screen first

There is also an internal **ops plugin** (MCP server + skill) that lets my coding agents deploy, check health and roll back through structured tools.
