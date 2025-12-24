# Gitea — Installation Guide

Install

```sh
# from repository root
kubectl apply -k ./gitea
# or: kustomize build gitea | kubectl apply -f -
```

Verify

```sh
kubectl -n gitea get pods
kubectl -n gitea get svc
kubectl -n gitea describe pvc    # check PV binding
```
