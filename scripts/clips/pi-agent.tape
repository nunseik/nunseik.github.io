# pi-agent: the benchmark report, rebuilt from the saved results (805 agentic runs + throughput) in a temp clone.
# Pi and Ollama are no longer installed, so this replays recorded data, not a live agent. Run via scripts/clips/pi-agent.sh.
Output "public/shots/pi-agent/report.webm"
Output "public/shots/pi-agent/report.mp4"
Set Shell zsh
Set FontFamily "Menlo"
Set FontSize 14
Set Width 1440
Set Height 520
Set Padding 26
Set Theme { "name":"portfolio","background":"#0e110f","foreground":"#cfd6c8","cursor":"#e5a94a","selection":"#2b3a2e","black":"#151a16","red":"#e0705f","green":"#93c47d","yellow":"#e5a94a","blue":"#7fb0cf","magenta":"#b39ddb","cyan":"#7fb0cf","white":"#cfd6c8","brightBlack":"#838e7f","brightRed":"#e0705f","brightGreen":"#93c47d","brightYellow":"#e5a94a","brightBlue":"#7fb0cf","brightMagenta":"#b39ddb","brightCyan":"#7fb0cf","brightWhite":"#ffffff" }
Set TypingSpeed 35ms
Hide
Type `cd $CLIP_DIR && export PROMPT='%F{green}fabio@nunseik%f %F{blue}~/pi-agent%f $ ' && clear` Enter
Sleep 500ms
Show
Sleep 600ms
Type "wc -l results/agentic.jsonl" Sleep 300ms Enter
Sleep 1500ms
Type `node bench/report.mjs | grep '^|' | grep -v -- --- | column -t -s '|'` Sleep 300ms Enter
Sleep 9000ms
