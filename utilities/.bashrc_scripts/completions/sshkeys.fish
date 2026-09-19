# ~/.config/fish/completions/sshkeys.fish
# Autocompletion for the sshkeys CLI tool

# Disable default file completions for this command
complete -c sshkeys -f

# ---------------------------------------------------------------------------
# Helper functions for completion conditions
# ---------------------------------------------------------------------------

function __sshkeys_needs_command
    set -l cmd (commandline -opc)
    test (count $cmd) -eq 1
end

function __sshkeys_using_subcommand
    set -l cmd (commandline -opc)
    test (count $cmd) -ge 2; and test "$cmd[2]" = "$argv[1]"
end

function __sshkeys_load_needs_target
    set -l cmd (commandline -opc)
    test (count $cmd) -eq 2; and test "$cmd[2]" = "load"
end

function __sshkeys_can_use_yubikey_flags
    set -l cmd (commandline -opc)
    test (count $cmd) -ge 3
    and test "$cmd[2]" = "load"
    and test "$cmd[3]" = "yubikey"
    and not contains -- --ssh $cmd
    and not contains -- --service $cmd
end

# ---------------------------------------------------------------------------
# Subcommands
# ---------------------------------------------------------------------------

complete -c sshkeys -n __sshkeys_needs_command -a load -d "Load SSH keys into ssh-agent"
complete -c sshkeys -n __sshkeys_needs_command -a clear -d "Remove all keys from ssh-agent"
complete -c sshkeys -n __sshkeys_needs_command -a show -d "Show currently loaded keys"
complete -c sshkeys -n __sshkeys_needs_command -a help -d "Show help message"

# ---------------------------------------------------------------------------
# Arguments for 'load'
# ---------------------------------------------------------------------------

complete -c sshkeys -n __sshkeys_load_needs_target -a all -d "Recursively load all keys under ~/.ssh"
complete -c sshkeys -n __sshkeys_load_needs_target -a yubikey -d "Load keys under ~/.ssh/yubikey"

# ---------------------------------------------------------------------------
# Flags for 'load yubikey' (mutually exclusive)
# ---------------------------------------------------------------------------

complete -c sshkeys -n __sshkeys_can_use_yubikey_flags -l ssh -d "Load only homelab_ssh keys"
complete -c sshkeys -n __sshkeys_can_use_yubikey_flags -l service -d "Load only homelab_services keys"
