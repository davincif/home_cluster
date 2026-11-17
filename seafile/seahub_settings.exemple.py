SECRET_KEY = "0q83hr97w8gf98wq3rsegfiuse"

TIME_ZONE = "Europe/Lisbon"

SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
SERVICE_URL = "https://seafile.ldavincif.com"
FILE_SERVER_ROOT = "https://seafile.ldavincif.com/seafhttp"

ENABLE_TWO_FACTOR_AUTH = True
TWO_FACTOR_DEVICE_REMEMBER_DAYS = 30

# --- Email (AWS SES) ---
# The Seafile image does NOT turn EMAIL_* env vars into Django settings on its own,
# so read them here (docker-compose passes them into the container from .env).
import os
EMAIL_USE_TLS = os.environ.get("EMAIL_USE_TLS", "true").lower() == "true"
EMAIL_HOST = os.environ.get("EMAIL_HOST", "")
EMAIL_HOST_USER = os.environ.get("EMAIL_HOST_USER", "")
EMAIL_HOST_PASSWORD = os.environ.get("EMAIL_HOST_PASSWORD", "")
EMAIL_PORT = int(os.environ.get("EMAIL_PORT", "587"))
DEFAULT_FROM_EMAIL = os.environ.get("DEFAULT_FROM_EMAIL", "")
SERVER_EMAIL = os.environ.get("SERVER_EMAIL", DEFAULT_FROM_EMAIL)
