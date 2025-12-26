# Instalation guid

> standard tutorial at https://docs.k3s.io/add-ons/storage

before everything do:

```sh
sudo apt-get update
sudo apt-get install -y open-iscsi
sudo systemctl enable --now iscsid
# if wanting to add RWM capability
sudo apt-get install -y nfs-common
```

being at the root directory of the this project, therefore outside of the ./longhorn dir, do:

```sh
kubectl apply -k ./longhorn
```

Wait for the pods to be provisoned and then check with:

```sh
kubectl -n longhorn-system get pods
kubectl -n longhorn-system get svc longhorn-frontend
```

## Longhorn Frontend

longhorn-frontend em `nodePort: 30070`.

how to apply:

```bash
# from this very same directory
kustomize build longhorn | kubectl apply -f -
```

# Adjust 30% Disk reservation

```bash
kubectl -n longhorn-system patch settings.longhorn.io storage-reserved-percentage-for-default-disk --type=merge -p '{"value":"10"}'
```

<!--
Notas:

- Ajuste `30070` caso já esteja em uso no cluster.
- Em clusters com `Ingress`/`LB` preferidos, considere criar um `Ingress` ou usar `Service[type: LoadBalancer]` em vez de `NodePort`.
-->
