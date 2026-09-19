#!/usr/bin/env fish
# sshkeys.fish
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
# Source it from your config.fish:
#   source ~/.config/fish/sshkeys.fish

# ---------------------------------------------------------------------------
# Help
# ---------------------------------------------------------------------------
function _sshkeys_help
    echo "sshkeys - load and manage SSH keys in the ssh-agent"
    echo
    echo "USAGE"
    echo "  sshkeys load all                  Recursively load all keys under ~/.ssh"
    echo "  sshkeys load yubikey              Load all keys under ~/.ssh/yubikey"
    echo "  sshkeys load yubikey --ssh        Load only ~/.ssh/yubikey/homelab_ssh"
    echo "  sshkeys load yubikey --service    Load only ~/.ssh/yubikey/homelab_services"
    echo "  sshkeys clear                     Remove all keys currently loaded in the ssh-agent"
    echo "  sshkeys show                      Show all currently loaded keys"
    echo "  sshkeys help | -h | --help        Show this message"
    echo
    echo "EXAMPLES"
    echo "  sshkeys load all"
    echo "  sshkeys load yubikey --service"
    echo "  sshkeys clear"
    echo "  sshkeys show"
    echo
    echo "NOTES"
    echo "  - The --ssh and --service flags are mutually exclusive and only apply to 'yubikey'."
    echo "  - Only files that look like private keys (PEM/OPENSSH header) are considered;"
    echo "    .pub files and other unrelated files are skipped."
    echo "  - Hidden directories (starting with '.') are ignored during load."
end

# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

# Checks whether a file looks like a private key by inspecting its header.
function _sshkeys_is_private_key
    set -l file $argv[1]
    head -c 32 "$file" 2>/dev/null | grep -q "PRIVATE KEY\|OPENSSH"
end

# Tries to add a single key to the ssh-agent, reporting the result.
# Returns 0 on success, 1 on failure (never aborts the caller).
function _sshkeys_add_key
    set -l file $argv[1]

    if ssh-add "$file" >/dev/null 2>&1
        echo "  + $file"
        return 0
    else
        echo "  ! failed: $file" >&2
        return 1
    end
end

# Recursively walks a directory and loads every private key found in it.
# Ignores hidden directories. Prints a summary at the end.
function _sshkeys_load_dir
    set -l dir $argv[1]
    set -l loaded 0

    if not test -d "$dir"
        echo "Directory not found: $dir" >&2
        return 1
    end

    # -type d -name ".*" -prune : skips any hidden directory
    # -o -type f -print : otherwise, if it's a file, output it
    for file in (find "$dir" -type d -name ".*" -prune -o -type f -print)
        if _sshkeys_is_private_key "$file"
            if _sshkeys_add_key "$file"
                set loaded (math $loaded + 1)
            end
        end
    end

    echo "Loaded $loaded key(s) from $dir"
end

# Resolves which directory should be used based on the target (all/yubikey)
# and the flags (--ssh/--service). Prints the resolved path to stdout, or
# an error to stderr if the combination is invalid.
function _sshkeys_resolve_target_dir
    set -l target $argv[1]
    set -l use_ssh_only $argv[2]
    set -l use_service_only $argv[3]

    switch "$target"
        case all
            echo "$HOME/.ssh"
        case yubikey
            if test "$use_ssh_only" = 1 -a "$use_service_only" = 1
                echo "Use only one of the flags: --ssh or --service" >&2
                return 1
            else if test "$use_ssh_only" = 1
                echo "$HOME/.ssh/yubikey/homelab_ssh"
            else if test "$use_service_only" = 1
                echo "$HOME/.ssh/yubikey/homelab_services"
            else
                echo "$HOME/.ssh/yubikey"
            end
        case '*'
            echo "Unknown target: '$target' (use 'all' or 'yubikey')" >&2
            return 1
    end
end

# ---------------------------------------------------------------------------
# Subcommands
# ---------------------------------------------------------------------------

# sshkeys load {all|yubikey} [--ssh|--service]
function _sshkeys_cmd_load
    set -l target $argv[1]
    set -l flags $argv[2..-1]

    if test -z "$target"
        echo "Error: no target given." >&2
        _sshkeys_help
        return 1
    end

    set -l use_ssh_only 0
    set -l use_service_only 0
    for flag in $flags
        switch "$flag"
            case --ssh
                set use_ssh_only 1
            case --service
                set use_service_only 1
            case '*'
                echo "Unknown flag: $flag" >&2
                return 1
        end
    end

    set -l dir (_sshkeys_resolve_target_dir "$target" "$use_ssh_only" "$use_service_only")
    or return 1

    _sshkeys_load_dir "$dir"
end

# sshkeys clear
function _sshkeys_cmd_clear
    if ssh-add -D >/dev/null 2>&1
        echo "All keys have been removed from the ssh-agent."
    else
        echo "Failed to clear keys from the ssh-agent (is the agent running?)" >&2
        return 1
    end
end

# sshkeys show
function _sshkeys_cmd_show
    if not ssh-add -l >/dev/null 2>&1
        echo "No keys loaded or ssh-agent is not running." >&2
        return 1
    end

    echo "Currently loaded keys:"
    ssh-add -l
end

# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------
function sshkeys
    set -l cmd $argv[1]
    set -l rest $argv[2..-1]

    switch "$cmd"
        case load
            _sshkeys_cmd_load $rest
        case clear
            _sshkeys_cmd_clear
        case show
            _sshkeys_cmd_show
        case help -h --help ''
            _sshkeys_help
        case '*'
            echo "Unknown command: '$cmd'" >&2
            echo >&2
            _sshkeys_help >&2
            return 1
    end
end
