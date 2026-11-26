#!/bin/sh
# Records pi-agent.tape against a fresh clone of the private nunseik/pi-agent repo (needs gh auth). Run from the repo root.
set -e
CLIP_DIR=$(mktemp -d); export CLIP_DIR
gh repo clone nunseik/pi-agent "$CLIP_DIR" -- -q
mkdir -p public/shots/pi-agent
vhs scripts/clips/pi-agent.tape
ffmpeg -loglevel error -y -sseof -0.5 -i public/shots/pi-agent/report.mp4 -frames:v 1 -vf scale=1200:-2 -q:v 3 public/shots/pi-agent/report.jpg
rm -rf "$CLIP_DIR"
ls -la public/shots/pi-agent/
