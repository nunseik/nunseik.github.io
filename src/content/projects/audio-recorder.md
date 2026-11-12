---
title: Audio Recorder
tagline: Record meetings and therapy sessions, transcribe them offline, turn them into notes
kind: flagship
order: 5
started: 2026-09
status: local
stack: [Swift, Core Audio, whisper.cpp, Whisper large-v3-turbo, Silero VAD, zsh]
note: Fork of JoanClaverol/audio-recorder. The recorder and transcription engine are his work; the workflow on top is mine.
---

I wanted a record of what was said in meetings and in my own therapy sessions, without sending a single second of audio to the cloud.

## The tool

Joan Claverol's [audio-recorder](https://github.com/JoanClaverol/audio-recorder) captures **system audio and microphone as separate tracks** using macOS's native Core Audio process tap (no virtual audio driver), then transcribes both in parallel with **whisper.cpp** (large-v3-turbo, quantized, Metal on Apple Silicon), using **Silero VAD** to skip silence.

## What I added

- Two one-word entry points from the terminal: one for **English calls**, one for **Portuguese sessions**, each forcing the right language so short clips don't get misdetected
- Corrected the docs where the language and storage claims didn't match reality

## How I use it

The transcript is the raw material. Afterwards I hand it to Claude or Codex to draft **meeting minutes**, action items or, for therapy, my own private notes on what we talked about and what I want to bring up next time. The recording and the transcript stay on my machine.
