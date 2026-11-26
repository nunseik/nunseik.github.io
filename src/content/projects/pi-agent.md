---
title: Local coding agent
tagline: How far can an agentic coding loop go on a 16 GB MacBook Air, with small models and no cloud?
kind: experiment
order: 15
started: 2026-06
status: local
stack: [TypeScript, Node.js, Pi, Ollama, Gemma 4, Qwen, shell]
stats:
  - { label: benchmark runs passed, value: 38/42 }
  - { label: model loaded, value: ~7 GB }
  - { label: decode speed, value: 46 tok/s }
shots:
  - { src: /shots/pi-agent/report.jpg, video: /shots/pi-agent/report, size: [1200, 434], alt: 'The benchmark report rebuilt from the 805 saved runs: pass rate, phantom tool calls and memory per model (the e2b row adds up every experiment and setting), then prefill and decode speed' }
---

A fun week of experiments in June 2026: run an agentic coding workflow (read, edit, run the tests, fix) with the [Pi](https://github.com/badlogic/pi-mono) agent framework and local Ollama models on an M3 MacBook Air. That machine has 16 GB shared between the OS, the weights and the KV cache, and only about 10–11 GB of it is usable before macOS memory pressure kicks in. It was a lot harder to get working than I expected.

## The benchmark

I wrote a harness so I could compare changes with numbers instead of impressions. It has 14 graded tasks, each with a fixture workspace and a deterministic `verify.sh`. They range from "read a file" through "fix the bug and rerun the test" to multi-file renames and a bug that lives in a different file from its symptom. Each run records:

- pass/fail, wall time, turns, and tool calls by name
- **phantom tool calls**, where the model prints the tool-call JSON as text instead of making the call (the classic small-model failure)
- peak memory and the macOS memory-pressure level
- prefill and decode tokens/s, measured against Ollama's native API because the OpenAI-compatible endpoint reports no token usage

## What I found

- **Smaller won.** Gemma 4 e2b (a mixture-of-experts model) beat the bigger e4b as an agent: about 46 vs. 25 tokens/s, 7 vs. 11 GB loaded, and more tasks passed.
- **The 131k context window is a trap.** Allocating it pushes every model to 10–11 GB. Capping the context at 16k keeps an agent session near 3 GB.
- **Qwen2.5-coder 3B can't drive the agent at all:** nearly every run ended in phantom tool calls. It's still fine for one-shot code review.
- **Temperature 1.0 looked like a capability problem but was just variance.** At 0.2, the flaky refactor task passed every time.

## Fixing it with extensions, not a bigger model

Most failures came from the agent loop, not from the model's reasoning. The model's thinking usually found the right fix, and then it failed to turn that fix into an edit. So I wrote Pi extensions (TypeScript hooks into the loop) and a few prompt rules:

- a reminder appended to every `read` result saying a task is only done once it calls `write()`. This cured the "read the file and stop" phantom.
- indentation normalization on edits, and a syntax check after each write
- a system-prompt rule to grep for leftover call sites after a rename

With those and temperature 0.2, the 2B model passed **38 of 42 runs**.

## The honest part

The ceiling is real. For an existing file, the small model needs an explicit prompt, or a plan-then-act prompt where it describes the fix in one turn and applies it in the next. Open-ended "fix this" requests on real code stall or go wrong. One task, adding functions to a module full of similar code, failed every time. Extensions make the tooling reliable, but they can't close that gap. A bigger local model would, and this laptop can't hold one.
