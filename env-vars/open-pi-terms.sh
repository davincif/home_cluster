#!/usr/bin/env bash
set -euo pipefail

# Env files (adjust as needed)
SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)"

ENV_FISH="${SCRIPT_DIR}/barriers.env.fish"
ENV_BASH="${SCRIPT_DIR}/barriers.env.bash"
ENV_ZSH="${SCRIPT_DIR}/barriers.env.zsh"


SHELL_PATH="${SHELL:-/bin/bash}"
SHELL_NAME="$(basename "$SHELL_PATH")"

case "$SHELL_NAME" in
  fish)
    SHELL_BIN="fish"
    ENV_FILE="$ENV_FISH"
    SOURCE_CMD="source $ENV_FILE"
    ;;
  bash)
    SHELL_BIN="bash"
    ENV_FILE="$ENV_BASH"
    SOURCE_CMD="source $ENV_FILE"
    ;;
  zsh)
    SHELL_BIN="zsh"
    ENV_FILE="$ENV_ZSH"
    SOURCE_CMD="source $ENV_FILE"
    ;;
  *)
    echo "Unsupported shell: $SHELL_NAME"
    echo "Supported shells: fish, bash, zsh"
    exit 1
    ;;
esac

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Env file not found: $ENV_FILE"
  exit 1
fi

# Builds the command each terminal will run
# -i: interactive (keeps a prompt after SSH exits)
# -c: run commands
mk_cmd() {
  local target_var="$1"
  # We use "eval echo \$$target_var" to resolve $PI01_eth etc after sourcing,
  # and perform a simple sanity check.
  cat <<EOF
$SOURCE_CMD
ip=\$(eval echo \$$target_var)
if [[ -z "\$ip" || "\$ip" == "\$$target_var" ]]; then
  echo "Variable $target_var is not defined after sourcing. Check the env file."
  exec ${SHELL_BIN}
fi
echo "Connecting to \$ip ($target_var)..."
exec ssh "\$ip"
EOF
}

CMD1="$(mk_cmd "PI01_eth")"
CMD2="$(mk_cmd "PI02_eth")"
CMD3="$(mk_cmd "PI03_eth")"
CMD4="$(mk_cmd "PI04_eth")"

open_with_gnome_terminal() {
  gnome-terminal \
    --tab --title="PI01" -- "$SHELL_BIN" -ic "$CMD1" \
    --tab --title="PI02" -- "$SHELL_BIN" -ic "$CMD2" \
    --tab --title="PI03" -- "$SHELL_BIN" -ic "$CMD3" \
    --tab --title="PI04" -- "$SHELL_BIN" -ic "$CMD4"
}

open_with_konsole() {
  # Opens one window with 4 tabs
  konsole \
    --new-tab -p tabtitle="PI01" -e "$SHELL_BIN" -ic "$CMD1" \
    --new-tab -p tabtitle="PI02" -e "$SHELL_BIN" -ic "$CMD2" \
    --new-tab -p tabtitle="PI03" -e "$SHELL_BIN" -ic "$CMD3" \
    --new-tab -p tabtitle="PI04" -e "$SHELL_BIN" -ic "$CMD4" &
}

open_with_xterm() {
  xterm -T "PI01" -e "$SHELL_BIN" -ic "$CMD1" &
  xterm -T "PI02" -e "$SHELL_BIN" -ic "$CMD2" &
  xterm -T "PI03" -e "$SHELL_BIN" -ic "$CMD3" &
  xterm -T "PI04" -e "$SHELL_BIN" -ic "$CMD4" &
}

if command -v gnome-terminal >/dev/null 2>&1; then
  open_with_gnome_terminal
elif command -v konsole >/dev/null 2>&1; then
  open_with_konsole
elif command -v xterm >/dev/null 2>&1; then
  open_with_xterm
else
  echo "No supported terminal emulator found (gnome-terminal/konsole/xterm)."
  echo "Install one of them, or tell me what you use (kitty, alacritty, wezterm, etc.) and I'll adapt it."
  exit 1
fi
