# Teacher's AI assistant building a lesson journey through the Habla Mucho MCP server (scripted replay,
# see mcp-replay.sh). Run from the repo root: vhs scripts/clips/mcp.tape
Output public/shots/habla-mucho/mcp.webm
Output public/shots/habla-mucho/mcp.mp4
Set Shell zsh
Set FontFamily "Menlo"
Set FontSize 15
Set Width 960
Set Height 540
Set Padding 26
Set Theme { "name":"portfolio","background":"#0e110f","foreground":"#cfd6c8","cursor":"#e5a94a","selection":"#2b3a2e","black":"#151a16","red":"#e0705f","green":"#93c47d","yellow":"#e5a94a","blue":"#7fb0cf","magenta":"#b39ddb","cyan":"#7fb0cf","white":"#cfd6c8","brightBlack":"#838e7f","brightRed":"#e0705f","brightGreen":"#93c47d","brightYellow":"#e5a94a","brightBlue":"#7fb0cf","brightMagenta":"#b39ddb","brightCyan":"#7fb0cf","brightWhite":"#ffffff" }
Set TypingSpeed 28ms
Hide
Type "export PROMPT=$'%F{yellow}›%f ' && clear" Enter
Show
Sleep 500ms
Type "Crie uma jornada A1 sobre se apresentar numa feira de estágios e salve como rascunho."
Sleep 600ms
Hide
Type " # " 
Show
Hide
Enter
Type "clear; printf '\033[38;2;229;169;74m›\033[0m Crie uma jornada A1 sobre se apresentar numa feira de estágios e salve\n  como rascunho.\n\n'; scripts/clips/mcp-replay.sh" Enter
Show
Sleep 11s
