#!/usr/bin/env bash
# ================================================================
# deploy.sh — Script de Deploy Automático – Planeja Concurso
# ================================================================
# Uso:
#   ./deploy.sh          → incrementa patch (1.2.0 → 1.2.1)
#   ./deploy.sh minor    → incrementa minor (1.2.0 → 1.3.0)
#   ./deploy.sh major    → incrementa major (1.2.0 → 2.0.0)
#   ./deploy.sh 2.5.0    → define versão exata
# ================================================================

set -e
BASE_DIR="$(cd "$(dirname "$0")" && pwd)"
SW_FILE="$BASE_DIR/sw.js"
HTML_FILE="$BASE_DIR/index.html"

# ── Cores ───────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; BOLD='\033[1m'; RESET='\033[0m'

echo -e "${BOLD}${BLUE}╔══════════════════════════════════════╗${RESET}"
echo -e "${BOLD}${BLUE}║   Planeja Concurso — Deploy Script   ║${RESET}"
echo -e "${BOLD}${BLUE}╚══════════════════════════════════════╝${RESET}"
echo ""

# ── Lê a versão atual do sw.js ──────────────────────────────────
CURRENT=$(grep -oE "SW_VERSION = '[0-9]+\.[0-9]+\.[0-9]+'" "$SW_FILE" | grep -oE "[0-9]+\.[0-9]+\.[0-9]+")
if [ -z "$CURRENT" ]; then
  echo -e "${RED}❌ Não foi possível encontrar SW_VERSION em sw.js${RESET}"
  exit 1
fi

echo -e "${YELLOW}Versão atual: ${BOLD}v$CURRENT${RESET}"

# ── Calcula a nova versão ────────────────────────────────────────
MODE=${1:-patch}

if [[ "$MODE" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  NEW="$MODE"
else
  IFS='.' read -r MAJOR MINOR PATCH <<< "$CURRENT"
  case "$MODE" in
    major) NEW="$((MAJOR+1)).0.0" ;;
    minor) NEW="$MAJOR.$((MINOR+1)).0" ;;
    patch) NEW="$MAJOR.$MINOR.$((PATCH+1))" ;;
    *)
      echo -e "${RED}❌ Modo inválido: $MODE (use patch|minor|major ou x.y.z)${RESET}"
      exit 1
      ;;
  esac
fi

echo -e "${GREEN}Nova versão:  ${BOLD}v$NEW${RESET}"
echo ""

# ── Confirma antes de prosseguir ────────────────────────────────
read -p "$(echo -e ${BOLD}Confirmar deploy v$NEW? [s/N]: ${RESET})" CONFIRM
CONFIRM="$(echo "$CONFIRM" | tr '[:upper:]' '[:lower:]')"
if [[ "$CONFIRM" != "s" && "$CONFIRM" != "sim" && "$CONFIRM" != "y" && "$CONFIRM" != "yes" ]]; then
  echo -e "${YELLOW}⚠️  Deploy cancelado.${RESET}"
  exit 0
fi

echo ""
echo -e "${BOLD}🔧 Atualizando versões...${RESET}"

# ── Atualiza sw.js ───────────────────────────────────────────────
if sed -i.bak "s/SW_VERSION = '$CURRENT'/SW_VERSION = '$NEW'/" "$SW_FILE" && \
   grep -q "SW_VERSION = '$NEW'" "$SW_FILE"; then
  echo -e "  ${GREEN}✅ sw.js${RESET}        SW_VERSION = '$NEW'"
  rm -f "$SW_FILE.bak"
else
  echo -e "  ${RED}❌ Falha ao atualizar sw.js${RESET}"
  mv "$SW_FILE.bak" "$SW_FILE" 2>/dev/null
  exit 1
fi

# ── Atualiza index.html ─────────────────────────────────────────
if sed -i.bak "s/APP_VERSION = '$CURRENT'/APP_VERSION = '$NEW'/" "$HTML_FILE" && \
   grep -q "APP_VERSION = '$NEW'" "$HTML_FILE"; then
  echo -e "  ${GREEN}✅ index.html${RESET}   APP_VERSION = '$NEW'"
  rm -f "$HTML_FILE.bak"
else
  echo -e "  ${RED}❌ Falha ao atualizar index.html — revertendo sw.js${RESET}"
  sed -i '' "s/SW_VERSION = '$NEW'/SW_VERSION = '$CURRENT'/" "$SW_FILE"
  mv "$HTML_FILE.bak" "$HTML_FILE" 2>/dev/null
  exit 1
fi

echo ""
echo -e "${BOLD}📦 Commitando no Git...${RESET}"

cd "$BASE_DIR"

# Verifica se é um repositório git
if ! git rev-parse --git-dir > /dev/null 2>&1; then
  echo -e "  ${YELLOW}⚠️  Não é um repositório git — pulando commit.${RESET}"
else
  git add .
  git commit -m "🚀 release: v$NEW — $(date '+%Y-%m-%d %H:%M')"
  echo -e "  ${GREEN}✅ Commit criado: 🚀 release: v$NEW${RESET}"

  # Verifica se existe remote configurado
  if git remote get-url origin > /dev/null 2>&1; then
    echo ""
    echo -e "${BOLD}☁️  Enviando para o repositório...${RESET}"
    BRANCH=$(git rev-parse --abbrev-ref HEAD)
    if git push origin "$BRANCH"; then
      echo -e "  ${GREEN}✅ Push concluído → branch: $BRANCH${RESET}"
    else
      echo -e "  ${RED}❌ Falha ao enviar para o repositório.${RESET}"
      echo -e "  ${YELLOW}💡 Dica: O repositório remoto pode ter alterações novas.${RESET}"
      echo -e "  ${YELLOW}   Tente rodar: git pull --rebase origin $BRANCH && git push origin $BRANCH${RESET}"
    fi
  else
    echo -e "  ${YELLOW}⚠️  Sem remote configurado — apenas commit local.${RESET}"
  fi
fi

# ── Resumo Final ────────────────────────────────────────────────
echo ""
echo -e "${BOLD}${GREEN}╔══════════════════════════════════════════╗${RESET}"
echo -e "${BOLD}${GREEN}║  ✅ Deploy v$NEW concluído com sucesso!  ${RESET}${BOLD}${GREEN}║${RESET}"
echo -e "${BOLD}${GREEN}╚══════════════════════════════════════════╝${RESET}"
echo ""
echo -e "  ${BOLD}O que acontece agora:${RESET}"
echo -e "  • O Service Worker v$NEW será instalado em todos os browsers"
echo -e "  • Usuários com PWA instalado verão o banner de atualização"
echo -e "  • Ao clicar em 'Atualizar agora', o app recarrega na v$NEW"
echo ""
echo -e "  ${YELLOW}⚠️  Se usar Firebase Hosting, execute:${RESET}"
echo -e "  ${BOLD}firebase deploy --only hosting${RESET}"
echo ""
