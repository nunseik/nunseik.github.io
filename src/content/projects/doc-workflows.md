---
title: AI document workflows
tagline: Translating a journal issue to Spanish and rebuilding exams, with scripts doing the checking
kind: automation
order: 11
started: 2026-10
status: done
stack: [Python, OOXML, Ruby, RTF, Swift, Claude Code, Codex]
---

Small, real jobs where AI did the heavy lifting and scripts kept it honest.

## Journal translation, PT → ES

Ten academic articles translated to Spanish as Word files, keeping their tables editable, their figures and their citations intact.

- the model translated structured text, then Python scripts **regenerated each DOCX straight from OOXML**, so the layout stayed faithful
- a shared glossary kept terminology consistent across articles
- a verification script checked the whole batch, and every editorial decision went into per-article notes, compiled into a single paged PDF for human review
- problems in the originals were documented, never silently "fixed"

## Exam formatter

Rebuilt a Spanish exam and its answer key from a messy original into clean, consistent DOCX/RTF files, plus a reorganised answer-key version for quick grading.
