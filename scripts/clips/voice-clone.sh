#!/bin/sh
# Records voice-clone.tape, then plays the model-loading wait 12x faster. Run from the repo root.
set -e

vhs scripts/clips/voice-clone.tape
raw=public/shots/voice-clone/raw.mp4; out=public/shots/voice-clone/clone
d=$(ffprobe -v error -show_entries format=duration -of csv=p=0 $raw)
a=4.5; b=$(echo "$d - 11.5" | bc)   # typing ends ~4.5 s in; the tape tail after "Áudio salvo" is ~8 s, plus slack
VF="[0]trim=0:$a,setpts=PTS-STARTPTS[x];[0]trim=$a:$b,setpts=(PTS-STARTPTS)/12[y];[0]trim=$b,setpts=PTS-STARTPTS[z];[x][y][z]concat=n=3,fps=24,scale=960:-2:flags=lanczos"
ffmpeg -loglevel error -y -i $raw -filter_complex "$VF" -an -c:v libx264 -preset slow -crf 26 -pix_fmt yuv420p -movflags +faststart $out.mp4
ffmpeg -loglevel error -y -i $raw -filter_complex "$VF" -an -c:v libvpx-vp9 -b:v 0 -crf 38 -row-mt 1 $out.webm
ffmpeg -loglevel error -y -sseof -0.5 -i $out.mp4 -frames:v 1 -q:v 3 $out.jpg
rm -f ~/workspace/voice-clone/output/demo.wav $raw
ls -la $out.*
