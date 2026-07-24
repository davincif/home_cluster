# Seafile - Self Hosted

```sh
SEAFILE_DB_ROOT_PASSWD="SuaSenhaForteDoBanco123" SEAFILE_ADMIN_PASSWORD="SuaSenhaDeAdmin123" sudo docker compose up -d --build

# Monitor initialization: The first startup generates required cryptographic keys and structural folders. Wait for it to complete.
docker compose logs -f seafile
```
