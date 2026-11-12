---
title: Voice Clone
tagline: Local voice cloning from an 8-second clip, on a MacBook
kind: experiment
order: 22
started: 2026-10
status: local
stack: [Python, Qwen3-TTS, MLX, FFmpeg]
---

How little audio does it take to clone a voice, fully offline? This experiment uses **Qwen3-TTS** through Apple's **MLX** on Apple Silicon, with an 8-second WhatsApp voice note as the reference. One command synthesises any sentence in that voice and exports an MP3.

It also became a building block: the same TTS family now generates the native reference audio in [Habla Mucho](/projects/habla-mucho/).
