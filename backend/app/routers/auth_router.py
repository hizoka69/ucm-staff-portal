import re
import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from pydantic import BaseModel, Field

from app.auth import create_access_token, get_current_user, hash_password, verify_password
from app.db import call_proc_no_out, call_refcursor

router = APIRouter(prefix="/api/auth", tags=["Autenticación"])

AVATARS_DIR = Path(__file__).resolve().parent.parent.parent / "uploads" / "avatars"
ALLOWED_IMAGE_TYPES = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
}
MAX_AVATAR_BYTES = 3 * 1024 * 1024  # 3 MB


class LoginRequest(BaseModel):
    correo: str
    password: str


class CambiarClaveRequest(BaseModel):
    clave_actual: str
    clave_nueva: str = Field(..., min_length=6, max_length=72)


class CambiarMiClaveRequest(BaseModel):
    password_actual: str
    password_nueva: str = Field(..., min_length=6, max_length=72)


def _normalizar_rut(valor: str) -> str:
    return re.sub(r"[^0-9kK]", "", valor or "").upper()


@router.post("/login")
def login(payload: LoginRequest):
    identificador = payload.correo.strip()
    correo_objetivo = identificador.lower()

    if "@" not in identificador:
        rut_buscado = _normalizar_rut(identificador)
        todos = call_refcursor("pkg_gest_usuarios.listar_por_rol", [None])
        match = next(
            (u for u in todos if _normalizar_rut(u.get("rut", "")) == rut_buscado),
            None,
        )
        if not match:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="RUT, correo o contraseña incorrectos.",
            )
        correo_objetivo = match["correo"].lower()

    rows = call_refcursor("pkg_gest_usuarios.obtener_por_correo", [correo_objetivo])
    if not rows:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="RUT, correo o contraseña incorrectos.",
        )

    user = rows[0]
    if user.get("activo") != "S":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cuenta desactivada. Contacta al administrador del sistema.",
        )

    if not verify_password(payload.password, user.get("password_hash", "")):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="RUT, correo o contraseña incorrectos.",
        )

    token = create_access_token(user)
    safe_user = {k: v for k, v in user.items() if k != "password_hash"}

    return {
        "access_token": token,
        "token_type": "bearer",
        "user": safe_user,
    }


@router.get("/me")
def me(current_user: dict = Depends(get_current_user)):
    return current_user


@router.post("/cambiar-clave")
def cambiar_clave(
    payload: CambiarClaveRequest,
    current_user: dict = Depends(get_current_user),
):
    rows = call_refcursor("pkg_gest_usuarios.obtener_por_correo", [current_user["correo"]])
    if not rows or not verify_password(payload.clave_actual, rows[0].get("password_hash", "")):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La contraseña actual ingresada no es correcta.",
        )

    if payload.clave_actual == payload.clave_nueva:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La nueva contraseña debe ser diferente a la actual.",
        )

    nuevo_hash = hash_password(payload.clave_nueva)
    call_proc_no_out("pkg_gest_usuarios.cambiar_clave", [current_user["id_usuario"], nuevo_hash])

    return {
        "message": "Contraseña actualizada correctamente.",
        "debe_cambiar_clave": "N",
    }


@router.post("/mi-clave")
def cambiar_mi_clave(
    body: CambiarMiClaveRequest,
    user: dict = Depends(get_current_user),
):
    if body.password_actual == body.password_nueva:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La nueva contraseña debe ser diferente a la actual.",
        )

    rows = call_refcursor("pkg_gest_usuarios.obtener_por_correo", [user["correo"]])
    if not rows or not verify_password(body.password_actual, rows[0].get("password_hash", "")):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La contraseña actual es incorrecta.",
        )

    nuevo_hash = hash_password(body.password_nueva)
    call_proc_no_out("pkg_gest_usuarios.cambiar_clave", [user["id_usuario"], nuevo_hash])

    return {"message": "Contraseña actualizada correctamente."}


@router.post("/foto")
async def subir_foto_perfil(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
):
    ext = ALLOWED_IMAGE_TYPES.get(file.content_type or "")
    if not ext:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Formato no soportado. Sube una imagen JPG, PNG o WebP.",
        )

    content = await file.read()
    if len(content) > MAX_AVATAR_BYTES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La imagen supera el máximo permitido de 3 MB.",
        )

    AVATARS_DIR.mkdir(parents=True, exist_ok=True)
    filename = f"user_{current_user['id_usuario']}_{uuid.uuid4().hex[:10]}{ext}"
    dest = AVATARS_DIR / filename
    dest.write_bytes(content)

    old_url = current_user.get("foto_url") or ""
    if old_url.startswith("/uploads/avatars/"):
        old_path = AVATARS_DIR / Path(old_url).name
        if old_path.exists() and old_path != dest:
            old_path.unlink(missing_ok=True)

    nueva_url = f"/uploads/avatars/{filename}"
    call_proc_no_out("pkg_gest_usuarios.actualizar_foto", [current_user["id_usuario"], nueva_url])

    return {
        "foto_url": nueva_url,
        "message": "Foto de perfil actualizada correctamente.",
    }