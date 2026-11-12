---
title: Voo Livro
tagline: Books set free in public places, each copy with its own QR code and logbook
kind: flagship
order: 4
started: 2026-11
status: wip
stack: [Next.js 16, React 19, TypeScript, Tailwind 4, Supabase, PostgreSQL RLS, Google OAuth, ZXing]
links:
  - { label: voo-livro.vercel.app, href: 'https://voo-livro.vercel.app' }
note: Early prototype, open to approved testers.
---

A bit like Goodreads, but for physical copies that travel. Someone "sets a book free" on a bench or in a café. Whoever finds it scans the QR code inside, reads it, writes in that copy's logbook and lets it go again. Everyone who held the book can follow its flight.

## What's in place

- **Per-copy identity:** every physical copy gets a short code and a QR label. Scanning happens right in the mobile browser (ZXing), no app install needed.
- **Logbook** per copy, public pages for each book and copy, release / found / read flows.
- **The shelf:** your profile is a piece of furniture that grows niches as you take part (released, found, read, moments), plus a surprise box and "in common with you" discovery.
- **Security first:** Postgres **row-level security** for everything, with permission tests that spin up a throwaway Postgres, apply every migration and check what each role can and cannot see.

## Status

Very early. Built solo in **one day** in November 2026, as a working prototype. The core flows are live for testers and the next step is real-world testing with phones and cameras.
