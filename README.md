# DaVinciF's Home Lab Cluster (HLC)

Scripts and configurations for our Home Server.

## SCP exemple

```sh
scp -o ProxyCommand="cloudflared access ssh --hostname %h" -r ~/Documents/Projects/RaspberryPi/raspberry.zip davincif@pi02-ssh.ldavincif.com:~/Documents
```

## Yubikey

```sh
# To generate a new key
ssh-keygen -t ed25519-sk -O resident -O verify-required -O application=ssh:[DESIRED_NAME] -C "ldavincif.pt@gmail.com" -f ~/.ssh/ed25519-sk


# To copy the generated key into the desired server
ssh-copy-id -i ~/.ssh/id_ed25519_sk.pub davincif@pi03-ssh.ldavincif.com
```

For the git commit signing

**_STILL IMCOMPLETE!_**

```sh
# Define SSH as signature default format
git config --local gpg.format ssh
# git config --local --unset gpg.format ssh # to undo the previus command.

# Define your public key as the signature key
git config --local user.signingkey ~/.ssh/yubikey/homelab_services/ed25519-sk.pub

# Force to Sign every commit
git config --local commit.gpgsign true
```

## License

[AGPL-3.0-or-later](LICENSE)

This repo collects all the scrips used to maintain the _@davincif_ HLC.

<!--
For the first master
curl -sfL https://get.k3s.io | sh -s - server --cluster-init --token "$TOKEN"


For the other masters
curl -sfL https://get.k3s.io | sh -s - server --server "https://${VIP}:6443" --token "$TOKEN"

Quando for exigir performance fora do K3s:
kubectl drain <nome-do-nó> --ignore-daemonsets --delete-local-data
Para voltar:
kubectl uncordon <nome-do-nó>

Adding labvels
sudo kubectl label node pi03 server-dedicated=true --overwrite

Creating namespace
sudo kubectl create namespace prod

ou ainda, para instalar um nó novo no cluster:
curl -sfL https://get.k3s.io \
 INSTALL_K3S_VERSION="v1.33.6+k3s1"
 K3S_URL="https://192.168.1.150:6443" \
 K3S_TOKEN="{TOKEN ADQIURIDO COM: sudo cat /var/lib/rancher/k3s/server/node-token}" \
 sh -s - server

-->
