from datetime import date, datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field

from app.auth import get_current_user, require_roles
from app.db import call_proc_id_out, call_proc_no_out, call_refcursor

router = APIRouter(prefix="/api/mantenedores", tags=["Mantenedores CRUD (10)"])

admin_or_super = require_roles("ADMIN", "SUPERADMIN")
only_admin = require_roles("ADMIN")


def _naive_dt(dt: Optional[datetime]) -> Optional[datetime]:
    return dt.replace(tzinfo=None) if dt and dt.tzinfo else dt


# ============================================================================
# SCHEMAS PYDANTIC
# ============================================================================
class FacultadIn(BaseModel):
    nombre_facultad: str = Field(..., min_length=2, max_length=120)
    siglas: str = Field(..., min_length=2, max_length=15)


class CarreraIn(BaseModel):
    id_facultad: int
    nombre_carrera: str = Field(..., min_length=2, max_length=120)


class RegionIn(BaseModel):
    nombre_region: str = Field(..., min_length=2, max_length=80)
    codigo_romano: str = Field(..., min_length=1, max_length=10)


class CiudadIn(BaseModel):
    id_region: int
    nombre_ciudad: str = Field(..., min_length=2, max_length=80)


class UbicacionIn(BaseModel):
    id_ciudad: int
    nombre_lugar: str = Field(..., min_length=2, max_length=150)
    direccion: str = Field(..., min_length=2, max_length=180)
    url_google_maps: Optional[str] = Field(default=None, max_length=400)


class TipoActividadIn(BaseModel):
    nombre_tipo: str = Field(..., min_length=2, max_length=30)
    color_hex: str = Field(..., pattern=r"^#[0-9A-Fa-f]{6}$")


class EstadoActividadIn(BaseModel):
    nombre_estado: str = Field(..., min_length=2, max_length=30)
    descripcion: Optional[str] = Field(default=None, max_length=160)


class PerfilStaffIn(BaseModel):
    id_usuario: Optional[int] = None
    id_carrera: int
    generacion: int = Field(..., ge=2015, le=2035)
    telefono: Optional[str] = Field(default=None, max_length=20)
    estado_disponibilidad: str = Field(default="DISPONIBLE")


class DisponibilidadIn(BaseModel):
    id_usuario: Optional[int] = None
    fecha_disponible: date
    bloque_horario: str = Field(..., pattern=r"^(MANANA|TARDE|COMPLETO)$")
    estado_disp: str = Field(default="DISPONIBLE", pattern=r"^(DISPONIBLE|RESERVADO|NO_DISPONIBLE)$")


class ActividadIn(BaseModel):
    titulo: str = Field(..., min_length=3, max_length=120)
    descripcion: Optional[str] = Field(default=None, max_length=500)
    id_tipo_actividad: int
    id_ubicacion: int
    id_estado_actividad: int
    fecha_actividad: date
    hora_inicio: str = Field(..., pattern=r"^([01][0-9]|2[0-3]):[0-5][0-9]$")
    cantidad_horas: float = Field(..., gt=0, le=24)
    cupos_maximos: int = Field(..., gt=0)
    fecha_pub_programada: Optional[datetime] = None
    horas_cierre_postulacion: float = Field(default=10, ge=0, le=720)


# ============================================================================
# 1. FACULTADES
# ============================================================================
@router.get("/facultades")
def listar_facultades(_=Depends(get_current_user)):
    return call_refcursor("BRRJ_pkg_mant_facultades.BRRJ_listar")


@router.get("/facultades/{id_facultad}")
def obtener_facultad(id_facultad: int, _=Depends(get_current_user)):
    rows = call_refcursor("BRRJ_pkg_mant_facultades.BRRJ_obtener", [id_facultad])
    if not rows:
        raise HTTPException(status_code=404, detail="Facultad no encontrada.")
    return rows[0]


@router.post("/facultades", status_code=status.HTTP_201_CREATED)
def crear_facultad(payload: FacultadIn, _=Depends(admin_or_super)):
    new_id = call_proc_id_out("BRRJ_pkg_mant_facultades.BRRJ_crear", [payload.nombre_facultad, payload.siglas])
    return {"id_facultad": new_id, "message": "Facultad creada correctamente."}


@router.put("/facultades/{id_facultad}")
def actualizar_facultad(id_facultad: int, payload: FacultadIn, _=Depends(admin_or_super)):
    call_proc_no_out("BRRJ_pkg_mant_facultades.BRRJ_actualizar", [id_facultad, payload.nombre_facultad, payload.siglas])
    return {"message": "Facultad actualizada correctamente."}


@router.delete("/facultades/{id_facultad}")
def eliminar_facultad(id_facultad: int, _=Depends(admin_or_super)):
    call_proc_no_out("BRRJ_pkg_mant_facultades.BRRJ_eliminar", [id_facultad])
    return {"message": "Facultad eliminada correctamente."}


# ============================================================================
# 2. CARRERAS
# ============================================================================
@router.get("/carreras")
def listar_carreras(_=Depends(get_current_user)):
    return call_refcursor("BRRJ_pkg_mant_carreras.BRRJ_listar")


@router.get("/carreras/{id_carrera}")
def obtener_carrera(id_carrera: int, _=Depends(get_current_user)):
    rows = call_refcursor("BRRJ_pkg_mant_carreras.BRRJ_obtener", [id_carrera])
    if not rows:
        raise HTTPException(status_code=404, detail="Carrera no encontrada.")
    return rows[0]


@router.post("/carreras", status_code=status.HTTP_201_CREATED)
def crear_carrera(payload: CarreraIn, _=Depends(admin_or_super)):
    new_id = call_proc_id_out("BRRJ_pkg_mant_carreras.BRRJ_crear", [payload.id_facultad, payload.nombre_carrera])
    return {"id_carrera": new_id, "message": "Carrera creada correctamente."}


@router.put("/carreras/{id_carrera}")
def actualizar_carrera(id_carrera: int, payload: CarreraIn, _=Depends(admin_or_super)):
    call_proc_no_out("BRRJ_pkg_mant_carreras.BRRJ_actualizar", [id_carrera, payload.id_facultad, payload.nombre_carrera])
    return {"message": "Carrera actualizada correctamente."}


@router.delete("/carreras/{id_carrera}")
def eliminar_carrera(id_carrera: int, _=Depends(admin_or_super)):
    call_proc_no_out("BRRJ_pkg_mant_carreras.BRRJ_eliminar", [id_carrera])
    return {"message": "Carrera eliminada correctamente."}


# ============================================================================
# 3. REGIONES
# ============================================================================
@router.get("/regiones")
def listar_regiones(_=Depends(get_current_user)):
    return call_refcursor("BRRJ_pkg_mant_regiones.BRRJ_listar")


@router.get("/regiones/{id_region}")
def obtener_region(id_region: int, _=Depends(get_current_user)):
    rows = call_refcursor("BRRJ_pkg_mant_regiones.BRRJ_obtener", [id_region])
    if not rows:
        raise HTTPException(status_code=404, detail="Región no encontrada.")
    return rows[0]


@router.post("/regiones", status_code=status.HTTP_201_CREATED)
def crear_region(payload: RegionIn, _=Depends(admin_or_super)):
    new_id = call_proc_id_out("BRRJ_pkg_mant_regiones.BRRJ_crear", [payload.nombre_region, payload.codigo_romano])
    return {"id_region": new_id, "message": "Región creada correctamente."}


@router.put("/regiones/{id_region}")
def actualizar_region(id_region: int, payload: RegionIn, _=Depends(admin_or_super)):
    call_proc_no_out("BRRJ_pkg_mant_regiones.BRRJ_actualizar", [id_region, payload.nombre_region, payload.codigo_romano])
    return {"message": "Región actualizada correctamente."}


@router.delete("/regiones/{id_region}")
def eliminar_region(id_region: int, _=Depends(admin_or_super)):
    call_proc_no_out("BRRJ_pkg_mant_regiones.BRRJ_eliminar", [id_region])
    return {"message": "Región eliminada correctamente."}


# ============================================================================
# 4. CIUDADES
# ============================================================================
@router.get("/ciudades")
def listar_ciudades(_=Depends(get_current_user)):
    return call_refcursor("BRRJ_pkg_mant_ciudades.BRRJ_listar")


@router.get("/ciudades/{id_ciudad}")
def obtener_ciudad(id_ciudad: int, _=Depends(get_current_user)):
    rows = call_refcursor("BRRJ_pkg_mant_ciudades.BRRJ_obtener", [id_ciudad])
    if not rows:
        raise HTTPException(status_code=404, detail="Ciudad no encontrada.")
    return rows[0]


@router.post("/ciudades", status_code=status.HTTP_201_CREATED)
def crear_ciudad(payload: CiudadIn, _=Depends(admin_or_super)):
    new_id = call_proc_id_out("BRRJ_pkg_mant_ciudades.BRRJ_crear", [payload.id_region, payload.nombre_ciudad])
    return {"id_ciudad": new_id, "message": "Ciudad creada correctamente."}


@router.put("/ciudades/{id_ciudad}")
def actualizar_ciudad(id_ciudad: int, payload: CiudadIn, _=Depends(admin_or_super)):
    call_proc_no_out("BRRJ_pkg_mant_ciudades.BRRJ_actualizar", [id_ciudad, payload.id_region, payload.nombre_ciudad])
    return {"message": "Ciudad actualizada correctamente."}


@router.delete("/ciudades/{id_ciudad}")
def eliminar_ciudad(id_ciudad: int, _=Depends(admin_or_super)):
    call_proc_no_out("BRRJ_pkg_mant_ciudades.BRRJ_eliminar", [id_ciudad])
    return {"message": "Ciudad eliminada correctamente."}


# ============================================================================
# 5. UBICACIONES
# ============================================================================
@router.get("/ubicaciones")
def listar_ubicaciones(_=Depends(get_current_user)):
    return call_refcursor("BRRJ_pkg_mant_ubicaciones.BRRJ_listar")


@router.get("/ubicaciones/{id_ubicacion}")
def obtener_ubicacion(id_ubicacion: int, _=Depends(get_current_user)):
    rows = call_refcursor("BRRJ_pkg_mant_ubicaciones.BRRJ_obtener", [id_ubicacion])
    if not rows:
        raise HTTPException(status_code=404, detail="Ubicación no encontrada.")
    return rows[0]


@router.post("/ubicaciones", status_code=status.HTTP_201_CREATED)
def crear_ubicacion(payload: UbicacionIn, _=Depends(admin_or_super)):
    new_id = call_proc_id_out(
        "BRRJ_pkg_mant_ubicaciones.BRRJ_crear",
        [payload.id_ciudad, payload.nombre_lugar, payload.direccion, payload.url_google_maps],
    )
    return {"id_ubicacion": new_id, "message": "Ubicación creada correctamente."}


@router.put("/ubicaciones/{id_ubicacion}")
def actualizar_ubicacion(id_ubicacion: int, payload: UbicacionIn, _=Depends(admin_or_super)):
    call_proc_no_out(
        "BRRJ_pkg_mant_ubicaciones.BRRJ_actualizar",
        [id_ubicacion, payload.id_ciudad, payload.nombre_lugar, payload.direccion, payload.url_google_maps],
    )
    return {"message": "Ubicación actualizada correctamente."}


@router.delete("/ubicaciones/{id_ubicacion}")
def eliminar_ubicacion(id_ubicacion: int, _=Depends(admin_or_super)):
    call_proc_no_out("BRRJ_pkg_mant_ubicaciones.BRRJ_eliminar", [id_ubicacion])
    return {"message": "Ubicación eliminada correctamente."}


# ============================================================================
# 6. TIPOS DE ACTIVIDAD
# ============================================================================
@router.get("/tipos-actividad")
def listar_tipos_actividad(_=Depends(get_current_user)):
    return call_refcursor("BRRJ_pkg_mant_tipos_act.BRRJ_listar")


@router.get("/tipos-actividad/{id_tipo}")
def obtener_tipo_actividad(id_tipo: int, _=Depends(get_current_user)):
    rows = call_refcursor("BRRJ_pkg_mant_tipos_act.BRRJ_obtener", [id_tipo])
    if not rows:
        raise HTTPException(status_code=404, detail="Tipo de actividad no encontrado.")
    return rows[0]


@router.post("/tipos-actividad", status_code=status.HTTP_201_CREATED)
def crear_tipo_actividad(payload: TipoActividadIn, _=Depends(admin_or_super)):
    new_id = call_proc_id_out("BRRJ_pkg_mant_tipos_act.BRRJ_crear", [payload.nombre_tipo, payload.color_hex])
    return {"id_tipo_actividad": new_id, "message": "Tipo de actividad creado correctamente."}


@router.put("/tipos-actividad/{id_tipo}")
def actualizar_tipo_actividad(id_tipo: int, payload: TipoActividadIn, _=Depends(admin_or_super)):
    call_proc_no_out("BRRJ_pkg_mant_tipos_act.BRRJ_actualizar", [id_tipo, payload.nombre_tipo, payload.color_hex])
    return {"message": "Tipo de actividad actualizado correctamente."}


@router.delete("/tipos-actividad/{id_tipo}")
def eliminar_tipo_actividad(id_tipo: int, _=Depends(admin_or_super)):
    call_proc_no_out("BRRJ_pkg_mant_tipos_act.BRRJ_eliminar", [id_tipo])
    return {"message": "Tipo de actividad eliminado correctamente."}


# ============================================================================
# 7. ESTADOS DE ACTIVIDAD
# ============================================================================
@router.get("/estados-actividad")
def listar_estados_actividad(_=Depends(get_current_user)):
    return call_refcursor("BRRJ_pkg_mant_estados_act.BRRJ_listar")


@router.get("/estados-actividad/{id_estado}")
def obtener_estado_actividad(id_estado: int, _=Depends(get_current_user)):
    rows = call_refcursor("BRRJ_pkg_mant_estados_act.BRRJ_obtener", [id_estado])
    if not rows:
        raise HTTPException(status_code=404, detail="Estado de actividad no encontrado.")
    return rows[0]


@router.post("/estados-actividad", status_code=status.HTTP_201_CREATED)
def crear_estado_actividad(payload: EstadoActividadIn, _=Depends(admin_or_super)):
    new_id = call_proc_id_out("BRRJ_pkg_mant_estados_act.BRRJ_crear", [payload.nombre_estado, payload.descripcion])
    return {"id_estado_actividad": new_id, "message": "Estado de actividad creado correctamente."}


@router.put("/estados-actividad/{id_estado}")
def actualizar_estado_actividad(id_estado: int, payload: EstadoActividadIn, _=Depends(admin_or_super)):
    call_proc_no_out("BRRJ_pkg_mant_estados_act.BRRJ_actualizar", [id_estado, payload.nombre_estado, payload.descripcion])
    return {"message": "Estado de actividad actualizado correctamente."}


@router.delete("/estados-actividad/{id_estado}")
def eliminar_estado_actividad(id_estado: int, _=Depends(admin_or_super)):
    call_proc_no_out("BRRJ_pkg_mant_estados_act.BRRJ_eliminar", [id_estado])
    return {"message": "Estado de actividad eliminado correctamente."}


# ============================================================================
# 8. PERFILES STAFF
# ============================================================================
@router.get("/perfiles-staff")
def listar_perfiles_staff(_=Depends(admin_or_super)):
    return call_refcursor("BRRJ_pkg_mant_perfiles_staff.BRRJ_listar")


@router.get("/perfiles-staff/{id_usuario}")
def obtener_perfil_staff(id_usuario: int, current_user: dict = Depends(get_current_user)):
    if current_user["nombre_rol"] == "STAFF" and current_user["id_usuario"] != id_usuario:
        raise HTTPException(status_code=403, detail="Solo puedes consultar tu propio perfil.")
    rows = call_refcursor("BRRJ_pkg_mant_perfiles_staff.BRRJ_obtener", [id_usuario])
    if not rows:
        raise HTTPException(status_code=404, detail="Perfil Staff no encontrado.")
    return rows[0]


@router.post("/perfiles-staff", status_code=status.HTTP_201_CREATED)
def crear_perfil_staff(payload: PerfilStaffIn, _=Depends(admin_or_super)):
    if not payload.id_usuario:
        raise HTTPException(status_code=400, detail="Debes indicar id_usuario para crear un perfil Staff.")
    call_proc_no_out(
        "BRRJ_pkg_mant_perfiles_staff.BRRJ_crear",
        [
            payload.id_usuario,
            payload.id_carrera,
            payload.generacion,
            payload.telefono,
            payload.estado_disponibilidad,
        ],
    )
    return {"id_usuario": payload.id_usuario, "message": "Perfil Staff creado correctamente."}


@router.put("/perfiles-staff/{id_usuario}")
def actualizar_perfil_staff(
    id_usuario: int,
    payload: PerfilStaffIn,
    current_user: dict = Depends(get_current_user),
):
    if current_user["nombre_rol"] == "STAFF" and current_user["id_usuario"] != id_usuario:
        raise HTTPException(status_code=403, detail="Solo puedes actualizar tu propio perfil.")
    call_proc_no_out(
        "BRRJ_pkg_mant_perfiles_staff.BRRJ_actualizar",
        [
            id_usuario,
            payload.id_carrera,
            payload.generacion,
            payload.telefono,
            payload.estado_disponibilidad,
        ],
    )
    return {"message": "Perfil Staff actualizado correctamente."}


@router.delete("/perfiles-staff/{id_usuario}")
def eliminar_perfil_staff(id_usuario: int, _=Depends(admin_or_super)):
    call_proc_no_out("BRRJ_pkg_mant_perfiles_staff.BRRJ_eliminar", [id_usuario])
    return {"message": "Perfil Staff eliminado correctamente."}


# ============================================================================
# 9. DISPONIBILIDAD STAFF
# ============================================================================
@router.get("/disponibilidad-staff")
def listar_disponibilidad(
    id_usuario: Optional[int] = Query(default=None),
    current_user: dict = Depends(get_current_user),
):
    target_user = current_user["id_usuario"] if current_user["nombre_rol"] == "STAFF" else id_usuario
    return call_refcursor("BRRJ_pkg_mant_disp_staff.BRRJ_listar", [target_user])


@router.get("/disponibilidad-staff/{id_disp}")
def obtener_disponibilidad(id_disp: int, _=Depends(get_current_user)):
    rows = call_refcursor("BRRJ_pkg_mant_disp_staff.BRRJ_obtener", [id_disp])
    if not rows:
        raise HTTPException(status_code=404, detail="Disponibilidad no encontrada.")
    return rows[0]


@router.post("/disponibilidad-staff", status_code=status.HTTP_201_CREATED)
def crear_disponibilidad(payload: DisponibilidadIn, current_user: dict = Depends(get_current_user)):
    target_user = (
        current_user["id_usuario"]
        if current_user["nombre_rol"] == "STAFF"
        else payload.id_usuario
    )
    if not target_user:
        raise HTTPException(status_code=400, detail="Debes indicar el id_usuario del Staff.")
    new_id = call_proc_id_out(
        "BRRJ_pkg_mant_disp_staff.BRRJ_crear",
        [target_user, payload.fecha_disponible, payload.bloque_horario, payload.estado_disp],
    )
    return {"id_disponibilidad": new_id, "message": "Disponibilidad registrada correctamente."}


@router.put("/disponibilidad-staff/{id_disp}")
def actualizar_disponibilidad(
    id_disp: int,
    payload: DisponibilidadIn,
    current_user: dict = Depends(get_current_user),
):
    if current_user["nombre_rol"] == "STAFF":
        rows = call_refcursor("BRRJ_pkg_mant_disp_staff.BRRJ_obtener", [id_disp])
        if not rows:
            raise HTTPException(status_code=404, detail="Disponibilidad no encontrada.")
        if rows[0]["id_usuario"] != current_user["id_usuario"]:
            raise HTTPException(status_code=403, detail="Solo puedes editar tu propia disponibilidad.")

    call_proc_no_out(
        "BRRJ_pkg_mant_disp_staff.BRRJ_actualizar",
        [id_disp, payload.fecha_disponible, payload.bloque_horario, payload.estado_disp],
    )
    return {"message": "Disponibilidad actualizada correctamente."}


@router.delete("/disponibilidad-staff/{id_disp}")
def eliminar_disponibilidad(id_disp: int, current_user: dict = Depends(get_current_user)):
    if current_user["nombre_rol"] == "STAFF":
        rows = call_refcursor("BRRJ_pkg_mant_disp_staff.BRRJ_obtener", [id_disp])
        if not rows:
            raise HTTPException(status_code=404, detail="Disponibilidad no encontrada.")
        if rows[0]["id_usuario"] != current_user["id_usuario"]:
            raise HTTPException(status_code=403, detail="Solo puedes eliminar tu propia disponibilidad.")

    call_proc_no_out("BRRJ_pkg_mant_disp_staff.BRRJ_eliminar", [id_disp])
    return {"message": "Disponibilidad eliminada correctamente."}


# ============================================================================
# 10. ACTIVIDADES
# ============================================================================
@router.get("/actividades")
def listar_actividades(_=Depends(get_current_user)):
    return call_refcursor("BRRJ_pkg_mant_actividades.BRRJ_listar")


@router.get("/actividades/{id_actividad}")
def obtener_actividad(id_actividad: int, _=Depends(get_current_user)):
    rows = call_refcursor("BRRJ_pkg_mant_actividades.BRRJ_obtener", [id_actividad])
    if not rows:
        raise HTTPException(status_code=404, detail="Actividad no encontrada.")
    return rows[0]


@router.post("/actividades", status_code=status.HTTP_201_CREATED)
def crear_actividad(payload: ActividadIn, current_user: dict = Depends(only_admin)):
    new_id = call_proc_id_out(
        "BRRJ_pkg_mant_actividades.BRRJ_crear",
        [
            payload.titulo,
            payload.descripcion,
            payload.id_tipo_actividad,
            payload.id_ubicacion,
            payload.id_estado_actividad,
            payload.fecha_actividad,
            payload.hora_inicio,
            payload.cantidad_horas,
            payload.cupos_maximos,
            _naive_dt(payload.fecha_pub_programada),
            current_user["id_usuario"],
            payload.horas_cierre_postulacion,
        ],
    )
    return {"id_actividad": new_id, "message": "Actividad creada correctamente."}


@router.put("/actividades/{id_actividad}")
def actualizar_actividad(id_actividad: int, payload: ActividadIn, _=Depends(only_admin)):
    call_proc_no_out(
        "BRRJ_pkg_mant_actividades.BRRJ_actualizar",
        [
            id_actividad,
            payload.titulo,
            payload.descripcion,
            payload.id_tipo_actividad,
            payload.id_ubicacion,
            payload.id_estado_actividad,
            payload.fecha_actividad,
            payload.hora_inicio,
            payload.cantidad_horas,
            payload.cupos_maximos,
            _naive_dt(payload.fecha_pub_programada),
            payload.horas_cierre_postulacion,
        ],
    )
    return {"message": "Actividad actualizada correctamente."}


@router.delete("/actividades/{id_actividad}")
def eliminar_actividad(id_actividad: int, _=Depends(only_admin)):
    call_proc_no_out("BRRJ_pkg_mant_actividades.BRRJ_eliminar", [id_actividad])
    return {"message": "Actividad eliminada correctamente."}
