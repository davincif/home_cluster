# DaVinciF's Home Lab Cluster (HLC)

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
-->
