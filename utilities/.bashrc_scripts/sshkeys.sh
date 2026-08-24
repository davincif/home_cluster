#!/usr/bin/env bash
# sshkeys.bash
#
# Uso:
#   sshkeys load all                 -> carrega tudo recursivamente em ~/.ssh
#   sshkeys load yubikey             -> carrega tudo em ~/.ssh/yubikey (ambas as subpastas)
#   sshkeys load yubikey --ssh       -> carrega apenas ~/.ssh/yubikey/homelab_ssh
#   sshkeys load yubikey --service   -> carrega apenas ~/.ssh/yubikey/homelab_services
#
# Source no .bashrc:
#   source ~/.config/shell/sshkeys.bash

sshkeys() {
    local cmd="$1"
    shift || true

    if [ "$cmd" != "load" ]; then
        echo "Uso: sshkeys load {all|yubikey} [--ssh|--service]" >&2
        return 1
    fi

    local target="$1"
    shift || true

    local ssh_flag=0
    local service_flag=0
    for arg in "$@"; do
        case "$arg" in
            --ssh) ssh_flag=1 ;;
            --service) service_flag=1 ;;
            *) echo "Flag desconhecida: $arg" >&2; return 1 ;;
        esac
    done

    local search_dir=""
    case "$target" in
        all)
            search_dir="$HOME/.ssh"
            ;;
        yubikey)
            if [ "$ssh_flag" -eq 1 ] && [ "$service_flag" -eq 1 ]; then
                echo "Use apenas uma das flags: --ssh ou --service" >&2
                return 1
            elif [ "$ssh_flag" -eq 1 ]; then
                search_dir="$HOME/.ssh/yubikey/homelab_ssh"
            elif [ "$service_flag" -eq 1 ]; then
                search_dir="$HOME/.ssh/yubikey/homelab_services"
            else
                search_dir="$HOME/.ssh/yubikey"
            fi
            ;;
        *)
            echo "Alvo desconhecido: $target (use 'all' ou 'yubikey')" >&2
            return 1
            ;;
    esac

    if [ ! -d "$search_dir" ]; then
        echo "Diretório não encontrado: $search_dir" >&2
        return 1
    fi

    local count=0
    while IFS= read -r -d '' f; do
        if head -c 32 "$f" 2>/dev/null | grep -q "PRIVATE KEY\|OPENSSH"; then
            if ssh-add "$f" >/dev/null 2>&1; then
                echo "  + $f"
                count=$((count + 1))
            else
                echo "  ! falhou: $f" >&2
            fi
        fi
    done < <(find "$search_dir" -type f -print0)

    echo "Carregada(s) $count chave(s) de $search_dir"
}