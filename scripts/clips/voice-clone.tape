# Voice Clone: a real run of clonar.py, then the loudness envelopes of the reference and the clone.
# Run via scripts/clips/voice-clone.sh (it speeds up the model-loading wait).
Output "public/shots/voice-clone/raw.mp4"
Set Shell zsh
Set FontFamily "Menlo"
Set FontSize 16
Set Width 1080
Set Height 400
Set Padding 26
Set Theme { "name":"portfolio","background":"#0e110f","foreground":"#cfd6c8","cursor":"#e5a94a","selection":"#2b3a2e","black":"#151a16","red":"#e0705f","green":"#93c47d","yellow":"#e5a94a","blue":"#7fb0cf","magenta":"#b39ddb","cyan":"#7fb0cf","white":"#cfd6c8","brightBlack":"#838e7f","brightRed":"#e0705f","brightGreen":"#93c47d","brightYellow":"#e5a94a","brightBlue":"#7fb0cf","brightMagenta":"#b39ddb","brightCyan":"#7fb0cf","brightWhite":"#ffffff" }
Set TypingSpeed 22ms
Hide
Type "cd ~/workspace/voice-clone && export TRANSFORMERS_VERBOSITY=error HF_HUB_DISABLE_PROGRESS_BARS=1 PYTHONWARNINGS=ignore PATH=$PWD/.venv/bin:$PATH && compare() { python3 -I ~/workspace/my-portfolio/scripts/clips/wavebars.py reference=$1 clone=$2 } && export PROMPT='%F{green}fabio@nunseik%f %F{blue}~/voice-clone%f $ ' && clear" Enter
Sleep 500ms
Show
Sleep 700ms
Type "python clonar.py 'Esta frase nunca foi gravada. Foi sintetizada offline, num MacBook.' --saida output/demo.wav"
Sleep 400ms Enter
Wait+Screen@90s /Áudio salvo/
Sleep 1200ms
Type "compare audio/referencia.wav output/demo.wav" Sleep 300ms Enter
Sleep 6000ms
