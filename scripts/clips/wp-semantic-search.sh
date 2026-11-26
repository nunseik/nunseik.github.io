#!/bin/sh
# Records wp-semantic-search.tape against a temp copy of ~/workspace/wp-semantic-search, then plays the
# index-build wait 12x faster. Needs CLIP_VENV: a venv with its requirements.txt and the e5 model cached.
# Run from the repo root.
set -e
: "${CLIP_VENV:?set CLIP_VENV to a venv with wp-semantic-search requirements}"
CLIP_DIR=$(mktemp -d); export CLIP_DIR CLIP_VENV
cp -R ~/workspace/wp-semantic-search/. "$CLIP_DIR"/
mkdir -p public/shots/wp-semantic-search
vhs scripts/clips/wp-semantic-search.tape
raw=public/shots/wp-semantic-search/raw.mp4; out=public/shots/wp-semantic-search/eval
d=$(ffprobe -v error -show_entries format=duration -of csv=p=0 $raw)
a=3.2; b=$(echo "$d - 6.5" | bc)   # typing ends ~3 s in; the tape holds the result 5 s, plus slack
VF="[0]trim=0:$a,setpts=PTS-STARTPTS[x];[0]trim=$a:$b,setpts=(PTS-STARTPTS)/12[y];[0]trim=$b,setpts=PTS-STARTPTS[z];[x][y][z]concat=n=3,fps=24,scale=960:-2:flags=lanczos"
ffmpeg -loglevel error -y -i $raw -filter_complex "$VF" -an -c:v libx264 -preset slow -crf 26 -pix_fmt yuv420p -movflags +faststart $out.mp4
ffmpeg -loglevel error -y -i $raw -filter_complex "$VF" -an -c:v libvpx-vp9 -b:v 0 -crf 38 -row-mt 1 $out.webm
ffmpeg -loglevel error -y -sseof -0.5 -i $out.mp4 -frames:v 1 -q:v 3 $out.jpg
rm -rf "$CLIP_DIR" $raw
ls -la $out.*
