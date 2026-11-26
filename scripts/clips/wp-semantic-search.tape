# wp-semantic-search: the real retrieval eval (fresh index from the 100-article snapshot, 45 questions, top 5).
# Runs in a temp copy with a venv that has requirements.txt and the cached models. Run via scripts/clips/wp-semantic-search.sh.
Output "public/shots/wp-semantic-search/raw.mp4"
Set Shell zsh
Set FontFamily "Menlo"
Set FontSize 15
Set Width 1080
Set Height 640
Set Padding 26
Set Theme { "name":"portfolio","background":"#0e110f","foreground":"#cfd6c8","cursor":"#e5a94a","selection":"#2b3a2e","black":"#151a16","red":"#e0705f","green":"#93c47d","yellow":"#e5a94a","blue":"#7fb0cf","magenta":"#b39ddb","cyan":"#7fb0cf","white":"#cfd6c8","brightBlack":"#838e7f","brightRed":"#e0705f","brightGreen":"#93c47d","brightYellow":"#e5a94a","brightBlue":"#7fb0cf","brightMagenta":"#b39ddb","brightCyan":"#7fb0cf","brightWhite":"#ffffff" }
Set TypingSpeed 35ms
Hide
Type `cd $CLIP_DIR && export HF_HUB_OFFLINE=1 TRANSFORMERS_VERBOSITY=error HF_HUB_DISABLE_PROGRESS_BARS=1 PYTHONWARNINGS=ignore TOKENIZERS_PARALLELISM=false PATH=$CLIP_VENV/bin:$PATH && python() { command python "$@" 2>/dev/null } && export PROMPT='%F{green}fabio@nunseik%f %F{blue}~/wp-semantic-search%f $ ' && clear` Enter
Sleep 500ms
Show
Sleep 600ms
Type "python eval/run_eval.py --min-recall 0.93" Sleep 400ms Enter
Wait+Line@300s /wp-semantic-search \$/
Sleep 5000ms
