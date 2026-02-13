# Gitea — Installation Guide

Install (preferred — choose environment)

```sh
# Home Dev
kubectl apply -k ./gitea/overlays/hdev

# or Home Prod
kubectl apply -k ./gitea/overlays/hprod
```

Verify

```sh
kubectl -n gitea get pods
kubectl -n gitea get svc
kubectl -n gitea describe pvc    # check PV binding
```

Remover

```sh
kubectl delete -k ./gitea/overlays/hdev --ignore-not-found
kubectl delete -k ./gitea/overlays/hprod --ignore-not-found

# for te PVCs
kubectl get pv | grep -i gitea
kubectl delete pv <pv-name>
```
