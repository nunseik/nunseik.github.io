#!/bin/sh
# Records doc-workflows.tape against a temp copy of ~/workspace/translate-articles, so nothing there changes.
set -e
CLIP_DIR=$(mktemp -d); export CLIP_DIR
cp -R ~/workspace/translate-articles/. "$CLIP_DIR"/
vhs scripts/clips/doc-workflows.tape
ffmpeg -loglevel error -y -sseof -0.5 -i public/shots/doc-workflows/verify.mp4 -frames:v 1 -vf scale=960:-2 -q:v 3 public/shots/doc-workflows/verify.jpg
rm -rf "$CLIP_DIR"
ls -la public/shots/doc-workflows/
