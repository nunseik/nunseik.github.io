#!/bin/sh
# encode.sh FRAMEDIR OUTBASE WIDTH [SPEED]  ->  OUTBASE.webm, OUTBASE.mp4 (Safari fallback), OUTBASE.jpg (poster)
# env: CROP=w:h:x:y in frame pixels, DUR=max seconds, POSTER=seconds into the clip for the still
set -e
d=$1; o=$2; w=$3; sp=${4:-1}
VF="setpts=PTS/$sp,fps=24${CROP:+,crop=$CROP},scale=$w:-2:flags=lanczos"
T=${DUR:+-t $DUR}
ffmpeg -loglevel error -y -f concat -safe 0 -i "$d/list.txt" -vf "$VF" $T -an -c:v libx264 -preset slow -crf 26 -pix_fmt yuv420p -movflags +faststart "$o.mp4"
ffmpeg -loglevel error -y -f concat -safe 0 -i "$d/list.txt" -vf "$VF" $T -an -c:v libvpx-vp9 -b:v 0 -crf 38 -row-mt 1 "$o.webm"
ffmpeg -loglevel error -y -ss "${POSTER:-0}" -i "$o.mp4" -frames:v 1 -q:v 3 "$o.jpg"
ls -la "$o".*
