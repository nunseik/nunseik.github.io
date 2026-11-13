# AI document workflows: the shared PT→ES glossary, then the batch check over the ten translated DOCX files.
# Runs in a temp copy (verificar_lote.py rewrites its JSON report). Run via scripts/clips/doc-workflows.sh.
Output "public/shots/doc-workflows/verify.webm"
Output "public/shots/doc-workflows/verify.mp4"
Set Shell zsh
Set FontFamily "Menlo"
Set FontSize 15
Set Width 1080
Set Height 640
Set Padding 26
Set Theme { "name":"portfolio","background":"#0e110f","foreground":"#cfd6c8","cursor":"#e5a94a","selection":"#2b3a2e","black":"#151a16","red":"#e0705f","green":"#93c47d","yellow":"#e5a94a","blue":"#7fb0cf","magenta":"#b39ddb","cyan":"#7fb0cf","white":"#cfd6c8","brightBlack":"#838e7f","brightRed":"#e0705f","brightGreen":"#93c47d","brightYellow":"#e5a94a","brightBlue":"#7fb0cf","brightMagenta":"#b39ddb","brightCyan":"#7fb0cf","brightWhite":"#ffffff" }
Set TypingSpeed 35ms
Hide
Type "cd $CLIP_DIR && export PROMPT='%F{green}fabio@nunseik%f %F{blue}~/translate-articles%f $ ' && clear" Enter
Sleep 500ms
Show
Sleep 600ms
Type "sed -n 3,16p revisao/GLOSSARIO.md" Sleep 300ms Enter
Sleep 2500ms
Type "python3 scripts/verificar_lote.py" Sleep 300ms Enter
Wait+Screen@30s /LOTE:/
Sleep 4000ms
