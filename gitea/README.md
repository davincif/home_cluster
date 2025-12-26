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
