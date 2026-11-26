import re
import uuid

import oracledb
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from fastapi.responses import Response
from pydantic import BaseModel, Field

from app.auth import create_access_token, get_current_user, hash_password, verify_password
from app.db import call_proc_no_out, call_refcursor, get_connection, handle_oracle_error

router = APIRouter(prefix="/api/auth", tags=["Autenticación"])

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
    content_type = (file.content_type or "").lower()
    if content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Formato no soportado. Sube una imagen JPG, PNG o WebP.",
        )

    content = await file.read()
    if not content:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El archivo de imagen está vacío.",
        )
    if len(content) > MAX_AVATAR_BYTES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La imagen supera el máximo permitido de 3 MB.",
        )

    nueva_url = f"/api/auth/avatar/{current_user['id_usuario']}?v={uuid.uuid4().hex[:8]}"
    try:
        with get_connection() as conn:
            blob_var = conn.createlob(oracledb.DB_TYPE_BLOB)
            blob_var.write(content)
            with conn.cursor() as cur:
                cur.callproc(
                    "pkg_gest_usuarios.actualizar_foto_blob",
                    [current_user["id_usuario"], nueva_url, blob_var, content_type],
                )
    except oracledb.DatabaseError as exc:
        handle_oracle_error(exc)

    return {
        "foto_url": nueva_url,
        "message": "Foto de perfil guardada permanentemente en Oracle.",
    }


@router.get("/avatar/{id_usuario}")
def obtener_avatar_usuario(id_usuario: int):
    try:
        with get_connection() as conn:
            with conn.cursor() as cur, conn.cursor() as out_cur:
                cur.callproc("pkg_gest_usuarios.obtener_foto_blob", [id_usuario, out_cur])
                row = out_cur.fetchone()
                if not row or row[0] is None:
                    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Avatar no encontrado.")
                raw = row[0].read() if hasattr(row[0], "read") else bytes(row[0])
                mime = row[1] or "image/jpeg"
    except HTTPException:
        raise
    except oracledb.DatabaseError as exc:
        handle_oracle_error(exc)

    if not raw:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Avatar no encontrado.")

    return Response(
        content=raw,
        media_type=mime,
        headers={"Cache-Control": "public, max-age=3600"},
    )