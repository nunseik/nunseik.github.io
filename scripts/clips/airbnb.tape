# airbnb-tracker: pricing profile from the daily snapshots. Run from the repo root: vhs scripts/clips/airbnb.tape
Output public/shots/airbnb-tracker/report.webm
Output public/shots/airbnb-tracker/report.mp4
Set Shell zsh
Set FontFamily "Menlo"
Set FontSize 14
Set Width 1240
Set Height 560
Set Padding 24
Set Theme { "name":"portfolio","background":"#0e110f","foreground":"#cfd6c8","cursor":"#e5a94a","selection":"#2b3a2e","black":"#151a16","red":"#e0705f","green":"#93c47d","yellow":"#e5a94a","blue":"#7fb0cf","magenta":"#b39ddb","cyan":"#7fb0cf","white":"#cfd6c8","brightBlack":"#838e7f","brightRed":"#e0705f","brightGreen":"#93c47d","brightYellow":"#e5a94a","brightBlue":"#7fb0cf","brightMagenta":"#b39ddb","brightCyan":"#7fb0cf","brightWhite":"#ffffff" }
Set TypingSpeed 45ms
Hide
Type "cd ~/workspace/airbnb-tracker && export PROMPT='%F{green}fabio@nunseik%f %F{blue}~/airbnb-tracker%f $ ' && clear" Enter
Show
Sleep 600ms
Type "uv run python -m airbnb_tracker report" Sleep 300ms Enter
Sleep 4s
