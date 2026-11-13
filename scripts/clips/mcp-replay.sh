#!/bin/sh
# Scripted replay of a teacher's AI session against the Habla Mucho MCP server, for the portfolio clip
# (mcp.tape). Tool names and responses are copied from a real run on the local platform (2026-11-12).
g='\033[38;2;147;196;125m'; a='\033[38;2;229;169;74m'; d='\033[38;2;131;142;127m'; r='\033[38;2;224;112;95m'
b='\033[38;2;127;176;207m'; f='\033[38;2;207;214;200m'; B='\033[1m'; n='\033[0m'
p() { printf "%b\n" "$1"; sleep "${2:-0.35}"; }
call() { p "  ${g}●${n} ${B}habla-mucho${n} ${d}·${n} ${b}$1${n}" 0.9; }
sleep 0.4
call 'guia_formato'
p "    ${d}└ Como escrever uma jornada: o resultado é um rascunho; nada chega a${n}"
p "    ${d}  alunos sem o professor revisar e salvar uma versão.${n}" 0.7
call 'validar_jornada'
p "    ${r}└ ✗ steps[3].title: Campo obrigatório.${n}" 1.0
call 'validar_jornada'
p "    ${g}└ ✓ válida · 6 etapas${n}" 0.7
call 'criar_rascunho_jornada'
p "    ${d}└ rascunho · revisão 1 · 6 etapas${n}"
p "    ${d}  127.0.0.1:8770/#jornadas/adb3e7dc…${n}" 0.9
p ""
p "  ${f}Pronto: ${B}Mi primera presentación profesional${n}${f} (A1, 6 etapas) está em${n}" 0.1
p "  ${f}Jornadas como ${a}rascunho${f}. Confira o gabarito e a prévia como aluno antes de${n}" 0.1
p "  ${f}salvar a versão; nada foi enviado aos alunos.${n}" 0.1
