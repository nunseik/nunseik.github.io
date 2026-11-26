---
title: wp-semantic-search
tagline: Ask a WordPress news site questions in plain Portuguese, with answers that cite their sources
kind: experiment
order: 13
started: 2025-04
status: local
stack: [Python, Sentence Transformers, multilingual-e5, FAISS, Claude API, Ollama, OpenAI, GitHub Actions]
repo: https://github.com/nunseik/wp-semantic-search
links:
  - { label: retrieval eval in CI, href: 'https://github.com/nunseik/wp-semantic-search/actions/workflows/eval.yml' }
stats:
  - { label: recall@5 (multilingual-e5), value: '0.989' }
  - { label: recall@5 (English MiniLM), value: '0.700' }
  - { label: eval questions, value: '45' }
shots:
  - { src: /shots/wp-semantic-search/eval.jpg, video: /shots/wp-semantic-search/eval, size: [960, 568], alt: 'A real run of the retrieval eval: it builds a fresh index from the 100-article snapshot, checks the 45 questions (one partial miss), and passes with recall@5 0.989. The index build is sped up 12x' }
---

A RAG command-line tool for WordPress sites. I built it in April 2025, and in November 2026 I came back to fix what I'd skipped the first time: chunking, citations and a way to measure retrieval.

## Pipeline

- **Ingestion:** pulls posts from any WordPress site's REST API and strips the HTML. Later runs only add new posts (it tracks the last ID), and `--refresh` rebuilds from scratch.
- **Chunking:** paragraphs are packed into chunks of up to 120 words, and long paragraphs are split into windows with a 20-word overlap. Each chunk is embedded together with its article title.
- **Retrieval:** chunk embeddings go into FAISS, and each article is ranked by its best-matching chunk.
- **Generation:** you choose the backend with `--model`:
  - Ollama (llama3.2), fully offline
  - OpenAI gpt-4o-mini, which writes Instagram captions
  - Claude, with the API's native citations: each retrieved article goes in as a document, and the `[n]` markers in the answer come from the citations the API returns, matched to a numbered source list

## The eval

I wanted a number, not a feeling. The eval is a fixed snapshot of 100 articles from a Brazilian city's news site (Itanhaém, June to August 2025) and 45 questions I wrote the way residents would ask them, each paired with the article(s) that answer it. It builds a fresh index and checks the top 5 results.

| model | recall@5 | hit@5 | MRR |
|---|---|---|---|
| all-MiniLM-L6-v2 (the original) | 0.700 | 0.733 | 0.610 |
| intfloat/multilingual-e5-base (now the default) | 0.989 | 1.000 | 0.978 |

The site is in Portuguese and MiniLM is an English model. It finds articles that share words with the question but misses paraphrases: "camelô" vs. "ambulantes", or "doar roupas de frio" vs. "Campanha do Agasalho". GitHub Actions runs the eval for both models on every push and pull request, and the build fails if recall@5 drops below its baseline.

## A bug the upgrade found

The index was built with normalized embeddings, but queries weren't normalized, so the "cosine" scores weren't cosine at all. It's a one-line fix, and the kind of bug you only notice once you're measuring retrieval.

## The honest part

The eval set is small and I wrote it myself. It measures retrieval only, not answer quality. The tool is still a CLI and has never been deployed.
