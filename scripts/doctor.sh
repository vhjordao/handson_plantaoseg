#!/bin/sh
# Confere o ambiente local do PlantãoSeguro. Uso: make doctor (ou sh scripts/doctor.sh)
# Sai com código 1 se faltar algo obrigatório.

faltando=0

ok()   { printf '  [ok]       %s\n' "$1"; }
erro() { printf '  [FALTA]    %s\n             -> %s\n' "$1" "$2"; faltando=1; }
aviso() { printf '  [opcional] %s\n             -> %s\n' "$1" "$2"; }

echo "PlantãoSeguro: verificação do ambiente"

if docker compose version >/dev/null 2>&1; then
  ok "Docker Compose ($(docker compose version --short 2>/dev/null))"
else
  erro "Docker Compose" "instale o Docker Desktop (https://docs.docker.com/desktop/)"
fi

if command -v node >/dev/null 2>&1 && command -v npm >/dev/null 2>&1; then
  ok "Node $(node --version) e npm $(npm --version)"
else
  erro "Node e npm" "instale o Node LTS (https://nodejs.org/)"
fi

# Python 3.12+ com pip funcionando (o atalho da Microsoft Store não conta).
py_ok=""
for cand in "python" "python3" "py -3.12"; do
  if $cand -c "import sys; sys.exit(0 if sys.version_info >= (3, 12) else 1)" >/dev/null 2>&1 \
     && $cand -m pip --version >/dev/null 2>&1; then
    py_ok="$cand"
    break
  fi
done
if [ -n "$py_ok" ]; then
  ok "Python: $py_ok ($($py_ok --version 2>&1)); use make PYTHON=\"$py_ok\" test se não for 'python'"
else
  erro "Python 3.12+ com pip" "instale em https://www.python.org/downloads/ (marque 'Add to PATH'); o atalho da Microsoft Store e o C:\\Python312 sem pip não servem"
fi

if command -v supabase >/dev/null 2>&1; then
  ok "Supabase CLI $(supabase --version 2>/dev/null)"
else
  erro "Supabase CLI" "https://supabase.com/docs/guides/local-development/cli/getting-started"
fi

if command -v make >/dev/null 2>&1; then
  ok "make $(make --version 2>/dev/null | head -n 1)"
else
  erro "make" "no Windows: choco install make (como administrador) ou scoop install make"
fi

if command -v gh >/dev/null 2>&1; then
  ok "GitHub CLI $(gh --version | head -n 1)"
else
  erro "GitHub CLI (gh)" "https://cli.github.com/"
fi

command -v ffmpeg >/dev/null 2>&1 && ok "ffmpeg" \
  || aviso "ffmpeg" "só para transcrever o vídeo da aula (opcional)"

[ -f .env ] && ok ".env presente" \
  || aviso ".env" "rode make up (ou cp .env.example .env) e preencha as chaves"

echo
if [ "$faltando" -eq 0 ]; then
  echo "Tudo certo."
else
  echo "Há itens obrigatórios faltando (veja [FALTA])."
  exit 1
fi
