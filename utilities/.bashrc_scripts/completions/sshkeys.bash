#!/usr/bin/env bash
# Bash completion for sshkeys

_sshkeys_completions() {
    local cur prev words cword
    _init_completion || return

    local commands="load clear show help"
    local load_targets="all yubikey"
    local yubikey_flags="--ssh --service"

    # Suggest top-level commands
    if [ "$cword" -eq 1 ]; then
        COMPREPLY=( $(compgen -W "$commands" -- "$cur") )
        return 0
    fi

    # Subcommand: load
    if [ "${words[1]}" = "load" ]; then
        if [ "$cword" -eq 2 ]; then
            COMPREPLY=( $(compgen -W "$load_targets" -- "$cur") )
            return 0
        fi

        # Flags for 'yubikey' target
        if [ "${words[2]}" = "yubikey" ]; then
            local has_ssh=0
            local has_service=0

            for word in "${words[@]:3}"; do
                [ "$word" = "--ssh" ] && has_ssh=1
                [ "$word" = "--service" ] && has_service=1
            done

            # Flags are mutually exclusive
            if [ "$has_ssh" -eq 0 ] && [ "$has_service" -eq 0 ]; then
                COMPREPLY=( $(compgen -W "$yubikey_flags" -- "$cur") )
            fi
            return 0
        fi
    fi
}

complete -F _sshkeys_completions sshkeys
