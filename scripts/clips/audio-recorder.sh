#!/bin/sh
# Builds a fictional two-track call (system.wav = the other side, mic.wav = me) with macOS voices, records
# audio-recorder.tape transcribing it for real, plays the Whisper wait 4x faster, then removes the demo session.
set -e
sess=~/Recordings/audio-recorder/2026-11-12T15-00-00; tmp=$(mktemp -d)
mkdir -p "$sess"
say -v Daniel   -o $tmp/s1.aiff "Thanks for joining. Quick update: the beta goes out to testers on Monday."
say -v Samantha -o $tmp/m1.aiff "Great. I'll send the onboarding email on Friday and update the FAQ."
say -v Daniel   -o $tmp/s2.aiff "Perfect. Can you also check the sign-up form on Android?"
say -v Samantha -o $tmp/m2.aiff "Sure. I'll test it tomorrow morning and report back."
mix() { ffmpeg -loglevel error -y -i $1 -i $2 -filter_complex "[0]adelay=$3:all=1[a];[1]adelay=$4:all=1[b];[a][b]amix=inputs=2:normalize=0,apad=whole_dur=19,aresample=16000" -ac 1 -c:a pcm_s16le $5; }
mix $tmp/s1.aiff $tmp/s2.aiff 500 11000 "$sess/system.wav"
mix $tmp/m1.aiff $tmp/m2.aiff 5800 15200 "$sess/mic.wav"
vhs scripts/clips/audio-recorder.tape
raw=public/shots/audio-recorder/raw.mp4; out=public/shots/audio-recorder/transcribe
d=$(ffprobe -v error -show_entries format=duration -of csv=p=0 $raw)
a=8; b=$(echo "$d - 9.5" | bc)   # the transcribe command is typed by ~8 s; the tail after "Transcript written" is ~8.5 s
VF="[0]trim=0:$a,setpts=PTS-STARTPTS[x];[0]trim=$a:$b,setpts=(PTS-STARTPTS)/4[y];[0]trim=$b,setpts=PTS-STARTPTS[z];[x][y][z]concat=n=3,fps=24,scale=960:-2:flags=lanczos"
ffmpeg -loglevel error -y -i $raw -filter_complex "$VF" -an -c:v libx264 -preset slow -crf 26 -pix_fmt yuv420p -movflags +faststart $out.mp4
ffmpeg -loglevel error -y -i $raw -filter_complex "$VF" -an -c:v libvpx-vp9 -b:v 0 -crf 38 -row-mt 1 $out.webm
ffmpeg -loglevel error -y -sseof -0.5 -i $out.mp4 -frames:v 1 -q:v 3 $out.jpg
rm -rf "$sess" $tmp $raw
ls -la $out.*
