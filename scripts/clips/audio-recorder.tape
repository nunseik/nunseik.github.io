# Audio Recorder: the one-word alias, then a real local transcription of a two-track demo call
# (macOS `say` voices, built by audio-recorder.sh). Run via scripts/clips/audio-recorder.sh.
Output "public/shots/audio-recorder/raw.mp4"
Set Shell zsh
Set FontFamily "Menlo"
Set FontSize 16
Set Width 1080
Set Height 420
Set Padding 26
Set Theme { "name":"portfolio","background":"#0e110f","foreground":"#cfd6c8","cursor":"#e5a94a","selection":"#2b3a2e","black":"#151a16","red":"#e0705f","green":"#93c47d","yellow":"#e5a94a","blue":"#7fb0cf","magenta":"#b39ddb","cyan":"#7fb0cf","white":"#cfd6c8","brightBlack":"#838e7f","brightRed":"#e0705f","brightGreen":"#93c47d","brightYellow":"#e5a94a","brightBlue":"#7fb0cf","brightMagenta":"#b39ddb","brightCyan":"#7fb0cf","brightWhite":"#ffffff" }
Set TypingSpeed 30ms
Hide
Type "source ~/.zshrc 2>/dev/null; alias audio-recorder=~/workspace/audio-recorder/bin/audio-recorder; cd ~/Recordings/audio-recorder/2026-11-12T15-00-00 && export PROMPT='%F{green}fabio@nunseik%f %F{blue}%1~%f $ ' && clear" Enter
Sleep 800ms
Show
Sleep 600ms
Type "alias audio-recorder-en" Sleep 300ms Enter
Sleep 1500ms
Type "ls" Sleep 200ms Enter
Sleep 1000ms
Type "audio-recorder transcribe . -l en" Sleep 300ms Enter
Wait+Screen@60s /Transcript written/
Sleep 1000ms
Type "cat transcript.txt" Sleep 200ms Enter
Sleep 6000ms
