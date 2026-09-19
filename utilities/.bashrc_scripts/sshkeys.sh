#!/usr/bin/env bash
# sshkeys.bash
#
# Manages loading SSH keys into the ssh-agent.
#
# Usage:
#   sshkeys load all                 -> recursively load everything under ~/.ssh
#   sshkeys load yubikey             -> load everything under ~/.ssh/yubikey (both subfolders)
#   sshkeys load yubikey --ssh       -> load only ~/.ssh/yubikey/homelab_ssh
#   sshkeys load yubikey --service   -> load only ~/.ssh/yubikey/homelab_services
#   sshkeys clear                    -> remove all keys from the ssh-agent (ssh-add -D)
#   sshkeys show                     -> show all currently loaded keys
#   sshkeys help | -h | --help       -> show this help
#
# Source it from your .bashrc:
#   source ~/.config/shell/sshkeys.bash

# ---------------------------------------------------------------------------
# Help
# ---------------------------------------------------------------------------
_sshkeys_help() {
    cat <<'EOF'
sshkeys - load and manage SSH keys in the ssh-agent

USAGE
  sshkeys load all                  Recursively load all keys under ~/.ssh
  sshkeys load yubikey              Load all keys under ~/.ssh/yubikey
  sshkeys load yubikey --ssh        Load only ~/.ssh/yubikey/homelab_ssh
  sshkeys load yubikey --service    Load only ~/.ssh/yubikey/homelab_services
  sshkeys clear                     Remove all keys currently loaded in the ssh-agent
  sshkeys show                      Show all currently loaded keys
  sshkeys help | -h | --help        Show this message

EXAMPLES
  sshkeys load all
  sshkeys load yubikey --service
  sshkeys clear
  sshkeys show

NOTES
  - The --ssh and --service flags are mutually exclusive and only apply to 'yubikey'.
  - Only files that look like private keys (PEM/OPENSSH header) are considered;
    .pub files and other unrelated files are skipped.
  - Hidden directories (starting with '.') are ignored during load.
EOF
}

# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

# Checks whether a file looks like a private key by inspecting its header.
_sshkeys_is_private_key() {
    local file="$1"
    head -c 32 "$file" 2>/dev/null | grep -q "PRIVATE KEY\|OPENSSH"
}

# Tries to add a single key to the ssh-agent, reporting the result.
# Returns 0 on success, 1 on failure (never aborts the caller).
_sshkeys_add_key() {
    local file="$1"

    if ssh-add "$file" >/dev/null 2>&1; then
        echo "  + $file"
        return 0
    else
        echo "  ! failed: $file" >&2
        return 1
    fi
}

# Recursively walks a directory and loads every private key found in it.
# Ignores hidden directories. Prints a summary at the end.
_sshkeys_load_dir() {
    local dir="$1"
    local loaded=0

    if [ ! -d "$dir" ]; then
        echo "Directory not found: $dir" >&2
        return 1
    fi

    # -type d -name ".*" -prune : skips any hidden directory
    # -o -type f -print0 : otherwise, if it's a file, pass it to read
    while IFS= read -r -d '' file; do
        if _sshkeys_is_private_key "$file"; then
            _sshkeys_add_key "$file" && loaded=$((loaded + 1))
        fi
    done < <(find "$dir" -type d -name ".*" -prune -o -type f -print0)

    echo "Loaded $loaded key(s) from $dir"
}

# Resolves which directory should be used based on the target (all/yubikey)
# and the flags (--ssh/--service). Prints the resolved path to stdout, or
# an error to stderr if the combination is invalid.
_sshkeys_resolve_target_dir() {
    local target="$1"
    local use_ssh_only="$2"
    local use_service_only="$3"

    case "$target" in
        all)
            echo "$HOME/.ssh"
            ;;
        yubikey)
            if [ "$use_ssh_only" -eq 1 ] && [ "$use_service_only" -eq 1 ]; then
                echo "Use only one of the flags: --ssh or --service" >&2
                return 1
            elif [ "$use_ssh_only" -eq 1 ]; then
                echo "$HOME/.ssh/yubikey/homelab_ssh"
            elif [ "$use_service_only" -eq 1 ]; then
                echo "$HOME/.ssh/yubikey/homelab_services"
            else
                echo "$HOME/.ssh/yubikey"
            fi
            ;;
        *)
            echo "Unknown target: '$target' (use 'all' or 'yubikey')" >&2
            return 1
            ;;
    esac
}

# ---------------------------------------------------------------------------
# Subcommands
# ---------------------------------------------------------------------------

# sshkeys load {all|yubikey} [--ssh|--service]
_sshkeys_cmd_load() {
    local target="$1"
    shift || true

    if [ -z "$target" ]; then
        echo "Error: no target given." >&2
        _sshkeys_help
        return 1
    fi

    local use_ssh_only=0
    local use_service_only=0
    local arg
    for arg in "$@"; do
        case "$arg" in
            --ssh) use_ssh_only=1 ;;
            --service) use_service_only=1 ;;
            *)
                echo "Unknown flag: $arg" >&2
                return 1
                ;;
        esac
    done

    local dir
    dir="$(_sshkeys_resolve_target_dir "$target" "$use_ssh_only" "$use_service_only")" || return 1

    _sshkeys_load_dir "$dir"
}

# sshkeys clear
_sshkeys_cmd_clear() {
    if ssh-add -D >/dev/null 2>&1; then
        echo "All keys have been removed from the ssh-agent."
    else
        echo "Failed to clear keys from the ssh-agent (is the agent running?)" >&2
        return 1
    fi
}

# sshkeys show
_sshkeys_cmd_show() {
    # Check if agent has keys (or if it's running)
    if ! ssh-add -l >/dev/null 2>&1; then
        echo "No keys loaded or ssh-agent is not running." >&2
        return 1
    fi

    echo "Currently loaded keys:"
    # Use -l to list fingerprints, or -L to list full public keys
    ssh-add -l
}

# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------
sshkeys() {
    local cmd="$1"
    shift || true

    case "$cmd" in
        load)
            _sshkeys_cmd_load "$@"
            ;;
        clear)
            _sshkeys_cmd_clear
            ;;
        show)
            _sshkeys_cmd_show
            ;;
        help|-h|--help|"")
            _sshkeys_help
            ;;
        *)
            echo "Unknown command: '$cmd'" >&2
            echo >&2
            _sshkeys_help >&2
            return 1
            ;;
    esac
}
