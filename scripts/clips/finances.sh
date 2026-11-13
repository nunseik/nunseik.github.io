#!/bin/sh
# finances.sh SRC.mp4 -> public/shots/personal-finances/bot.{webm,mp4,jpg}
# Fabio's own screen recording (Telegram bot + Mini App, 480x1040). Real data, so: the /recent list and the whole
# dashboard are blurred (the chat blur includes the translucent header and composer, which shows text scrolling under it) (amounts, balances, holdings, merchants unreadable; layout and donut still visible).
# Cuts: 8.5–21 s (typing /add, confirmation, typing /recent) at 1.5x, 21–24 s blurred list, 0.8 s of loading,
# 27 s–end blurred dashboard. Status bar cropped.
set -e
src=$1; out=public/shots/personal-finances/bot
BL="boxblur=6:2"
VF="[0]split[a][b];[b]crop=480:578:0:0,$BL[cb];[a][cb]overlay=0:0:enable='between(t,20.9,24.1)'[c];\
[c]split[d][e];[e]crop=480:944:0:96,$BL[db];[d][db]overlay=0:96:enable='gte(t,26.9)',crop=480:1000:0:40[v];\
[v]split=4[v1][v2][v3][v4];\
[v1]trim=8.5:21,setpts=(PTS-STARTPTS)/1.5[s1];[v2]trim=21:24,setpts=PTS-STARTPTS[s2];\
[v3]trim=25.6:26.4,setpts=PTS-STARTPTS[s3];[v4]trim=27,setpts=PTS-STARTPTS[s4];\
[s1][s2][s3][s4]concat=n=4,fps=24"
ffmpeg -loglevel error -y -i "$src" -filter_complex "$VF" -an -c:v libx264 -preset slow -crf 26 -pix_fmt yuv420p -movflags +faststart $out.mp4
ffmpeg -loglevel error -y -i "$src" -filter_complex "$VF" -an -c:v libvpx-vp9 -b:v 0 -crf 38 -row-mt 1 $out.webm
ffmpeg -loglevel error -y -ss 5.5 -i $out.mp4 -frames:v 1 -q:v 3 $out.jpg
ls -la $out.*
