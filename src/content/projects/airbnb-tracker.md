---
title: Airbnb Tracker
tagline: Daily snapshots of listing calendars and prices to estimate bookings
kind: experiment
order: 21
started: 2026-11
status: local
stack: [Python, Playwright, SQLite, uv]
---

A proof of concept: if you snapshot a listing's availability calendar every day, the diff tells you when nights got booked, how far ahead, and roughly at what price. It even shows who uses fixed pricing and who uses dynamic pricing.

The trick is to not scrape HTML at all. A headless Chromium opens each listing page, the site fires its own internal calendar and quote requests, and the script **captures those responses** and stores them in SQLite. It runs on my laptop: no server, no proxy, no paid service.
