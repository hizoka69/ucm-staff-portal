from typing import Optional

from fastapi import APIRouter, Depends, Query

from app.auth import require_roles
from app.db import call_refcursor

router = APIRouter(prefix="/api/reportes", tags=["Reportes Estratégicos (3)"])

admin_or_super = require_roles("ADMIN", "SUPERADMIN")


# REPORTE 1: HORAS Y DESEMPEÑO DE STAFF / FACULTADES
@router.get("/ranking-staff")
def rep_ranking_staff(
    mes: Optional[int] = Query(default=None, ge=1, le=12),
    anio: Optional[int] = Query(default=None, ge=2020, le=2035),
    _=Depends(admin_or_super),
):
    return call_refcursor("BRRJ_pkg_rep_horas_staff.BRRJ_rep_ranking_staff", [mes, anio])


@router.get("/horas-facultad")
def rep_horas_por_facultad(
    mes: Optional[int] = Query(default=None, ge=1, le=12),
    anio: Optional[int] = Query(default=None, ge=2020, le=2035),
    _=Depends(admin_or_super),
):
    return call_refcursor("BRRJ_pkg_rep_horas_staff.BRRJ_rep_horas_por_facultad", [mes, anio])


# REPORTE 2: COBERTURA Y DEMANDA INSATISFECHA
@router.get("/cobertura-actividades")
def rep_cobertura_actividades(
    mes: Optional[int] = Query(default=None, ge=1, le=12),
    anio: Optional[int] = Query(default=None, ge=2020, le=2035),
    _=Depends(admin_or_super),
):
    return call_refcursor("BRRJ_pkg_rep_cobertura.BRRJ_rep_cobertura_actividades", [mes, anio])


@router.get("/demanda-tipo")
def rep_demanda_por_tipo(
    anio: Optional[int] = Query(default=None, ge=2020, le=2035),
    _=Depends(admin_or_super),
):
    return call_refcursor("BRRJ_pkg_rep_cobertura.BRRJ_rep_demanda_por_tipo", [anio])


# REPORTE 3: DASHBOARD EJECUTIVO (KPIS + TENDENCIA ANUAL)
@router.get("/kpis")
def rep_kpis_generales(
    mes: Optional[int] = Query(default=None, ge=1, le=12),
    anio: Optional[int] = Query(default=None, ge=2020, le=2035),
    _=Depends(admin_or_super),
):
    rows = call_refcursor("BRRJ_pkg_rep_ejecutivo.BRRJ_rep_kpis_generales", [mes, anio])
    return rows[0] if rows else {}


@router.get("/tendencia-mensual")
def rep_tendencia_mensual(
    anio: int = Query(default=2026, ge=2020, le=2035),
    _=Depends(admin_or_super),
):
    return call_refcursor("BRRJ_pkg_rep_ejecutivo.BRRJ_rep_tendencia_mensual", [anio])