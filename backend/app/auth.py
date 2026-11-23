import hashlib
import hmac
import os
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Callable

import bcrypt
import jwt
from dotenv import load_dotenv
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.db import call_refcursor

ENV_PATH = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(dotenv_path=ENV_PATH)

JWT_SECRET = os.getenv("JWT_SECRET", "ucm_staff_super_secreto_2026")
JWT_ALGORITHM = "HS256"
JWT_EXPIRE_HOURS = 12

bearer_scheme = HTTPBearer(auto_error=False)


def hash_password(plain_password: str) -> str:
    """Genera hash bcrypt seguro para nuevas cuentas y cambios de clave."""
    pwd_bytes = plain_password.encode("utf-8")[:72]
    return bcrypt.hashpw(pwd_bytes, bcrypt.gensalt()).decode("utf-8")


def verify_password(plain_password: str, stored_hash: str) -> bool:
    """Valida tanto claves iniciales del seed (SHA256:) como claves bcrypt."""
    if not stored_hash:
        return False

    if stored_hash.startswith("SHA256:"):
        expected = stored_hash.split("SHA256:", 1)[1].lower()
        actual = hashlib.sha256(plain_password.encode("utf-8")).hexdigest().lower()
        return hmac.compare_digest(actual, expected)

    try:
        return bcrypt.checkpw(
            plain_password.encode("utf-8")[:72],
            stored_hash.encode("utf-8"),
        )
    except ValueError:
        return False


def create_access_token(user: dict[str, Any]) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": str(user["id_usuario"]),
        "correo": user["correo"],
        "rol": user["nombre_rol"],
        "id_rol": user["id_rol"],
        "iat": now,
        "exp": now + timedelta(hours=JWT_EXPIRE_HOURS),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> dict[str, Any]:
    if credentials is None or not credentials.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token de autenticación requerido.",
        )

    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = int(payload["sub"])
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="La sesión ha expirado. Vuelve a iniciar sesión.",
        )
    except (jwt.InvalidTokenError, KeyError, ValueError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token de sesión inválido.",
        )

    rows = call_refcursor("pkg_gest_usuarios.obtener_por_id", [user_id])
    if not rows:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuario no encontrado.",
        )

    user = rows[0]
    if user.get("activo") != "S":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Tu cuenta se encuentra desactivada. Contacta a un administrador.",
        )
    return user


def require_roles(*allowed_roles: str) -> Callable:
    """Dependencia para restringir endpoints por rol exacto (SUPERADMIN, ADMIN, STAFF)."""
    allowed = {r.upper() for r in allowed_roles}

    def dependency(current_user: dict[str, Any] = Depends(get_current_user)) -> dict[str, Any]:
        if str(current_user.get("nombre_rol", "")).upper() not in allowed:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Acceso denegado. Se requiere rol: {', '.join(sorted(allowed))}.",
            )
        return current_user

    return dependency