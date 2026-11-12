---
title: thermal-bench-macos
tagline: I modded my MacBook Air's cooling, then wrote a benchmark to prove it worked
kind: experiment
order: 12
started: 2026-07
status: done
stack: [Shell, Python, Swift, macmon]
repo: https://github.com/nunseik/thermal-bench-macos
stats:
  - { label: sustained SoC power, value: +34% }
  - { label: sustained clock, value: +34% }
  - { label: sudo required, value: none }
---

The M3 MacBook Air has no fan, so under sustained load it throttles. The classic DIY fix is to **bridge the internal cooling shield to the aluminium bottom case**, so the whole chassis works as a heat spreader. I did the mod, and then wanted numbers instead of vibes.

## The benchmark

- drives CPU and GPU together to thermal steady state (15-minute soaks)
- logs **power (W), temperature (°C), clock (MHz) and throughput (GFLOP/s)** over time, all without `sudo` (telemetry from `macmon`)
- runs repeated campaigns and compares baseline vs. modded runs in a report

## Result

On the charger, the modded Air sustained about **+34% power and +34% clock** in a clean cold-start comparison, and the *worst* modded run still beat the *best* baseline run, on AC and on battery.

## The honest part

I later found a bug: the cooldown between runs waited on core temperature, which drops within a second, while the chassis was still heat-soaked. Some repeats started warm. I fixed the cooldown and kept the original results with a written caveat explaining what it does and doesn't change. The conclusion holds, and the error bars were overstated.
