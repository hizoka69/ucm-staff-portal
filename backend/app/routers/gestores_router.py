from datetime import datetime
from pathlib import Path
from typing import Optional

import oracledb
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field

from app.auth import get_current_user, hash_password, require_roles
from app.db import (
    call_proc_id_out,
    call_proc_no_out,
    call_refcursor,
    cursor_to_dicts,
    get_connection,
    handle_oracle_error,
)

router = APIRouter(prefix="/api/gestores", tags=["Gestores de Información (5)"])

only_super = require_roles("SUPERADMIN")
only_admin = require_roles("ADMIN")
only_staff = require_roles("STAFF")
admin_or_super = require_roles("ADMIN", "SUPERADMIN")


def _naive_dt(dt: datetime) -> datetime:
    return dt.replace(tzinfo=None) if dt.tzinfo else dt


# ============================================================================
# SCHEMAS
# ============================================================================
class CrearAdminIn(BaseModel):
    rut: str = Field(..., min_length=7, max_length=12)
    correo: str = Field(..., min_length=5, max_length=120)
    password_inicial: str = Field(default="Ucm2026!", min_length=6, max_length=72)
    nombre: str = Field(..., min_length=2, max_length=50)
    apellido: str = Field(..., min_length=2, max_length=50)
    foto_url: Optional[str] = Field(default=None, max_length=255)


class CrearStaffIn(CrearAdminIn):
    id_carrera: int
    generacion: int = Field(..., ge=2015, le=2035)
    telefono: Optional[str] = Field(default=None, max_length=20)


class EstadoActivoIn(BaseModel):
    activo: str = Field(..., pattern=r"^[SNsn]$")


class ActualizarCredencialesRequest(BaseModel):
    rut: str = Field(..., min_length=7, max_length=12)
    correo: str = Field(..., min_length=5, max_length=120)
    nombre: str = Field(..., min_length=2, max_length=50)
    apellido: str = Field(..., min_length=2, max_length=50)
    password_nueva: Optional[str] = Field(default=None, min_length=6, max_length=72)
    forzar_cambio_clave: str = Field(default="N", pattern=r"^[SNsn]$")


class ProgramarPubIn(BaseModel):
    fecha_pub_programada: datetime


class CambiarEstadoActIn(BaseModel):
    nombre_estado: str


class PostularIn(BaseModel):
    id_actividad: int


class AsignarManualIn(BaseModel):
    id_actividad: int
    id_usuario: int


class ResolverEsperaIn(BaseModel):
    decision: str = Field(..., pattern=r"^(ACEPTADA|RECHAZADA)$")


class ValidarTrabajoIn(BaseModel):
    id_postulacion: int
    asistio: str = Field(..., pattern=r"^[SNsn]$")
    horas_efectivas: float = Field(..., ge=0, le=24)
    observaciones: Optional[str] = Field(default=None, max_length=300)


# ============================================================================
# GESTOR 1: USUARIOS JERÁRQUICOS Y ROLES
# ============================================================================
@router.get("/usuarios/roles")
def listar_roles(_=Depends(admin_or_super)):
    return call_refcursor("pkg_gest_usuarios.listar_roles")


@router.get("/usuarios")
def listar_usuarios(
    id_rol: Optional[int] = Query(default=None),
    _=Depends(admin_or_super),
):
    return call_refcursor("pkg_gest_usuarios.listar_por_rol", [id_rol])


@router.post("/usuarios/admin", status_code=status.HTTP_201_CREATED)
def crear_admin(payload: CrearAdminIn, current_user: dict = Depends(only_super)):
    pwd_hash = hash_password(payload.password_inicial)
    new_id = call_proc_id_out(
        "pkg_gest_usuarios.crear_admin",
        [
            current_user["id_usuario"],
            payload.rut,
            payload.correo,
            pwd_hash,
            payload.nombre,
            payload.apellido,
            payload.foto_url,
        ],
    )
    return {
        "id_usuario": new_id,
        "message": "Administrador creado correctamente (deberá cambiar clave en 1er ingreso).",
    }


@router.post("/usuarios/staff", status_code=status.HTTP_201_CREATED)
def crear_staff(payload: CrearStaffIn, current_user: dict = Depends(only_admin)):
    pwd_hash = hash_password(payload.password_inicial)
    new_id = call_proc_id_out(
        "pkg_gest_usuarios.crear_staff_completo",
        [
            current_user["id_usuario"],
            payload.rut,
            payload.correo,
            pwd_hash,
            payload.nombre,
            payload.apellido,
            payload.foto_url,
            payload.id_carrera,
            payload.generacion,
            payload.telefono,
        ],
    )
    return {
        "id_usuario": new_id,
        "message": "Cuenta Staff y perfil creados correctamente.",
    }


@router.patch("/usuarios/{id_usuario}/activo")
def cambiar_estado_usuario(
    id_usuario: int,
    payload: EstadoActivoIn,
    current_user: dict = Depends(admin_or_super),
):
    call_proc_no_out(
        "pkg_gest_usuarios.cambiar_estado_activo",
        [current_user["id_usuario"], id_usuario, payload.activo.upper()],
    )
    return {"message": f"Estado del usuario actualizado a activo={payload.activo.upper()}."}


@router.put("/usuarios/{id_usuario}/credenciales")
def actualizar_credenciales_usuario(
    id_usuario: int,
    body: ActualizarCredencialesRequest,
    current_user: dict = Depends(only_super),
):
    nuevo_hash = hash_password(body.password_nueva) if body.password_nueva else None
    call_proc_no_out(
        "pkg_gest_usuarios.actualizar_credenciales",
        [
            current_user["id_usuario"],
            id_usuario,
            body.rut,
            body.correo,
            body.nombre,
            body.apellido,
            nuevo_hash,
            body.forzar_cambio_clave.upper(),
        ],
    )
    return {"message": "Credenciales actualizadas correctamente."}


@router.delete("/usuarios/staff/{id_usuario}")
def eliminar_staff(
    id_usuario: int,
    current_user: dict = Depends(admin_or_super),
):
    rows = call_refcursor("pkg_gest_usuarios.obtener_por_id", [id_usuario])
    foto_anterior = rows[0].get("foto_url") if rows else None

    call_proc_no_out(
        "pkg_gest_usuarios.eliminar_staff",
        [current_user["id_usuario"], id_usuario],
    )

    # Limpia la foto de perfil del disco si existía
    if foto_anterior and foto_anterior.startswith("/uploads/avatars/"):
        avatars_dir = Path(__file__).resolve().parent.parent.parent / "uploads" / "avatars"
        (avatars_dir / Path(foto_anterior).name).unlink(missing_ok=True)

    return {"message": "Staff eliminado permanentemente junto con todos sus registros."}


@router.delete("/usuarios/{id_usuario}")
def eliminar_usuario(
    id_usuario: int,
    current_user: dict = Depends(admin_or_super),
):
    rows = call_refcursor("pkg_gest_usuarios.obtener_por_id", [id_usuario])
    foto_anterior = rows[0].get("foto_url") if rows else None

    call_proc_no_out(
        "pkg_gest_usuarios.eliminar_usuario",
        [current_user["id_usuario"], id_usuario],
    )

    # Limpia la foto de perfil del disco si existía
    if foto_anterior and foto_anterior.startswith("/uploads/avatars/"):
        avatars_dir = Path(__file__).resolve().parent.parent.parent / "uploads" / "avatars"
        (avatars_dir / Path(foto_anterior).name).unlink(missing_ok=True)

    return {"message": "Usuario desvinculado y eliminado correctamente."}


# ============================================================================
# GESTOR 2: PUBLICACIÓN Y CALENDARIO DE ACTIVIDADES
# ============================================================================
@router.get("/actividades/calendario")
def listar_calendario(
    mes: Optional[int] = Query(default=None, ge=1, le=12),
    anio: Optional[int] = Query(default=None, ge=2020, le=2035),
    solo_publicadas: Optional[str] = Query(default=None, pattern=r"^[SNsn]$"),
    current_user: dict = Depends(get_current_user),
):
    # Activa automáticamente actividades cuya fecha_pub_programada ya venció
    call_proc_id_out("pkg_gest_actividades.activar_programadas")

    is_staff = current_user["nombre_rol"] == "STAFF"
    filtro_pub = "S" if is_staff else (solo_publicadas.upper() if solo_publicadas else "N")
    usr_ctx = current_user["id_usuario"] if is_staff else None

    return call_refcursor(
        "pkg_gest_actividades.listar_calendario",
        [mes, anio, filtro_pub, usr_ctx],
    )


@router.post("/actividades/{id_actividad}/publicar")
def publicar_actividad(id_actividad: int, current_user: dict = Depends(only_admin)):
    call_proc_no_out(
        "pkg_gest_actividades.publicar_actividad",
        [id_actividad, current_user["id_usuario"]],
    )
    return {"message": "Actividad publicada correctamente en el calendario."}


@router.post("/actividades/{id_actividad}/programar")
def programar_actividad(
    id_actividad: int,
    payload: ProgramarPubIn,
    current_user: dict = Depends(only_admin),
):
    call_proc_no_out(
        "pkg_gest_actividades.programar_publicacion",
        [id_actividad, _naive_dt(payload.fecha_pub_programada), current_user["id_usuario"]],
    )
    return {"message": "Publicación programada registrada correctamente."}


@router.patch("/actividades/{id_actividad}/estado")
def cambiar_estado_actividad(
    id_actividad: int,
    payload: CambiarEstadoActIn,
    current_user: dict = Depends(only_admin),
):
    call_proc_no_out(
        "pkg_gest_actividades.cambiar_estado",
        [id_actividad, payload.nombre_estado, current_user["id_usuario"]],
    )
    return {"message": f"Estado cambiado a {payload.nombre_estado.upper()}."}


@router.post("/actividades/activar-programadas")
def activar_programadas(_=Depends(admin_or_super)):
    activadas = call_proc_id_out("pkg_gest_actividades.activar_programadas")
    return {"actividades_activadas": activadas}


# ============================================================================
# GESTOR 3: POSTULACIONES ATÓMICAS Y ASIGNACIÓN DIRECTA
# ============================================================================
@router.post("/postulaciones/postular")
def postular_staff(payload: PostularIn, current_user: dict = Depends(only_staff)):
    try:
        with get_connection() as conn:
            with conn.cursor() as cur:
                out_resultado = cur.var(oracledb.STRING, size=50)
                out_id = cur.var(oracledb.NUMBER)
                cur.callproc(
                    "pkg_gest_postulaciones.postular_staff",
                    [payload.id_actividad, current_user["id_usuario"], out_resultado, out_id],
                )
                resultado = out_resultado.getvalue()
                rec_id = int(out_id.getvalue()) if out_id.getvalue() is not None else None
                return {
                    "resultado": resultado,
                    "id_registro": rec_id,
                    "message": (
                        "Postulación confirmada con éxito."
                        if resultado == "POSTULACION_CONFIRMADA"
                        else "Cupos completos: ingresaste automáticamente a la Lista de Espera."
                    ),
                }
    except oracledb.DatabaseError as exc:
        handle_oracle_error(exc)


@router.post("/postulaciones/asignar", status_code=status.HTTP_201_CREATED)
def asignar_manual(payload: AsignarManualIn, current_user: dict = Depends(only_admin)):
    post_id = call_proc_id_out(
        "pkg_gest_postulaciones.asignar_staff_manual",
        [payload.id_actividad, payload.id_usuario, current_user["id_usuario"]],
    )
    return {"id_postulacion": post_id, "message": "Staff asignado manualmente a la actividad."}


@router.patch("/postulaciones/{id_postulacion}/cancelar")
def cancelar_postulacion(id_postulacion: int, current_user: dict = Depends(get_current_user)):
    call_proc_no_out(
        "pkg_gest_postulaciones.cancelar_postulacion",
        [id_postulacion, current_user["id_usuario"]],
    )
    return {"message": "Postulación cancelada correctamente."}


@router.get("/postulaciones/actividad/{id_actividad}")
def postulaciones_por_actividad(id_actividad: int, _=Depends(admin_or_super)):
    return call_refcursor("pkg_gest_postulaciones.listar_por_actividad", [id_actividad])


@router.get("/postulaciones/mis-postulaciones")
def mis_postulaciones(current_user: dict = Depends(only_staff)):
    return call_refcursor("pkg_gest_postulaciones.listar_por_usuario", [current_user["id_usuario"]])


# ============================================================================
# GESTOR 4: LISTA DE ESPERA
# ============================================================================
@router.get("/lista-espera/pendientes")
def listar_espera_pendientes(_=Depends(admin_or_super)):
    return call_refcursor("pkg_gest_lista_espera.listar_pendientes")


@router.get("/lista-espera/actividad/{id_actividad}")
def listar_espera_actividad(id_actividad: int, _=Depends(admin_or_super)):
    return call_refcursor("pkg_gest_lista_espera.listar_por_actividad", [id_actividad])


@router.post("/lista-espera/{id_lista_espera}/resolver")
def resolver_lista_espera(
    id_lista_espera: int,
    payload: ResolverEsperaIn,
    current_user: dict = Depends(only_admin),
):
    try:
        with get_connection() as conn:
            with conn.cursor() as cur:
                out_post_id = cur.var(oracledb.NUMBER)
                cur.callproc(
                    "pkg_gest_lista_espera.resolver_solicitud",
                    [id_lista_espera, payload.decision, current_user["id_usuario"], out_post_id],
                )
                val = out_post_id.getvalue()
                return {
                    "decision": payload.decision,
                    "id_postulacion": int(val) if val is not None else None,
                    "message": f"Solicitud de lista de espera marcada como {payload.decision}.",
                }
    except oracledb.DatabaseError as exc:
        handle_oracle_error(exc)


# ============================================================================
# GESTOR 5: VALIDACIÓN DE ASISTENCIA/HORAS Y AUDITORÍA
# ============================================================================
@router.post("/trabajo/validar")
def validar_trabajo(payload: ValidarTrabajoIn, current_user: dict = Depends(only_admin)):
    reg_id = call_proc_id_out(
        "pkg_gest_trabajo.validar_trabajo",
        [
            payload.id_postulacion,
            payload.asistio.upper(),
            payload.horas_efectivas,
            payload.observaciones,
            current_user["id_usuario"],
        ],
    )
    return {"id_registro": reg_id, "message": "Asistencia y horas validadas correctamente."}


@router.get("/trabajo/resumen-mensual")
def resumen_mensual_staff(
    mes: int = Query(..., ge=1, le=12),
    anio: int = Query(..., ge=2020, le=2035),
    id_usuario: Optional[int] = Query(default=None),
    current_user: dict = Depends(get_current_user),
):
    target_user = (
        current_user["id_usuario"]
        if current_user["nombre_rol"] == "STAFF"
        else (id_usuario or current_user["id_usuario"])
    )
    try:
        with get_connection() as conn:
            with conn.cursor() as cur, conn.cursor() as out_cur:
                out_horas = cur.var(oracledb.NUMBER)
                out_asist = cur.var(oracledb.NUMBER)
                cur.callproc(
                    "pkg_gest_trabajo.resumen_mensual_staff",
                    [target_user, mes, anio, out_horas, out_asist, out_cur],
                )
                detalle = cursor_to_dicts(out_cur)
                return {
                    "id_usuario": target_user,
                    "mes": mes,
                    "anio": anio,
                    "horas_totales": float(out_horas.getvalue() or 0),
                    "total_asistencias": int(out_asist.getvalue() or 0),
                    "detalle": detalle,
                }
    except oracledb.DatabaseError as exc:
        handle_oracle_error(exc)


@router.get("/auditoria")
def listar_auditoria(
    limite: int = Query(default=100, ge=1, le=500),
    _=Depends(admin_or_super),
):
    return call_refcursor("pkg_gest_trabajo.listar_auditoria", [limite])