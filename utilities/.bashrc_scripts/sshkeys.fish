# sshkeys.fish
#
# Uso:
#   sshkeys load all                 -> carrega tudo recursivamente em ~/.ssh
#   sshkeys load yubikey             -> carrega tudo em ~/.ssh/yubikey (ambas as subpastas)
#   sshkeys load yubikey --ssh       -> carrega apenas ~/.ssh/yubikey/homelab_ssh
#   sshkeys load yubikey --service   -> carrega apenas ~/.ssh/yubikey/homelab_services
#
# Coloque este arquivo em ~/.config/fish/functions/sshkeys.fish
# (o fish carrega funções desse diretório automaticamente, autoload)

function sshkeys
    set -l cmd $argv[1]

    if test "$cmd" != "load"
        echo "Uso: sshkeys load {all|yubikey} [--ssh|--service]" >&2
        return 1
    end

    set -l target $argv[2]
    set -l rest
    if test (count $argv) -ge 3
        set rest $argv[3..-1]
    end

    set -l ssh_flag 0
    set -l service_flag 0
    for arg in $rest
        switch $arg
            case --ssh
                set ssh_flag 1
            case --service
                set service_flag 1
            case '*'
                echo "Flag desconhecida: $arg" >&2
                return 1
        end
    end

    set -l search_dir ""
    switch "$target"
        case all
            set search_dir "$HOME/.ssh"
        case yubikey
            if test $ssh_flag -eq 1 -a $service_flag -eq 1
                echo "Use apenas uma das flags: --ssh ou --service" >&2
                return 1
            else if test $ssh_flag -eq 1
                set search_dir "$HOME/.ssh/yubikey/homelab_ssh"
            else if test $service_flag -eq 1
                set search_dir "$HOME/.ssh/yubikey/homelab_services"
            else
                set search_dir "$HOME/.ssh/yubikey"
            end
        case '*'
            echo "Alvo desconhecido: $target (use 'all' ou 'yubikey')" >&2
            return 1
    end

    if not test -d "$search_dir"
        echo "Diretório não encontrado: $search_dir" >&2
        return 1
    end

    set -l count 0
    for f in (find "$search_dir" -type f)
        if head -c 32 "$f" 2>/dev/null | grep -q "PRIVATE KEY\|OPENSSH"
            if ssh-add "$f" >/dev/null 2>&1
                echo "  + $f"
                set count (math $count + 1)
            else
                echo "  ! falhou: $f" >&2
            end
        end
    end

    echo "Carregada(s) $count chave(s) de $search_dir"
end
