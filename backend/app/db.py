import logging
import os
import re
from contextlib import contextmanager
from pathlib import Path
from typing import Any, Generator

import oracledb
from dotenv import load_dotenv
from fastapi import HTTPException, status

logger = logging.getLogger("ucm_staff_api.db")

# Carga backend/.env sin importar desde qué carpeta se ejecute uvicorn
BASE_DIR = Path(__file__).resolve().parent.parent
ENV_PATH = BASE_DIR / ".env"
load_dotenv(dotenv_path=ENV_PATH)

IS_PROD = os.getenv("ENV", "development").lower() == "production"

ORACLE_USER = os.getenv("ORACLE_USER", "UCM_STAFF_BD")
ORACLE_PASSWORD = os.getenv("ORACLE_PASSWORD", "oracle")
ORACLE_DSN = os.getenv("ORACLE_DSN", "localhost:1521/XEPDB1")
ORACLE_WALLET_DIR = os.getenv("ORACLE_WALLET_DIR", "").strip()
ORACLE_WALLET_PASSWORD = os.getenv("ORACLE_WALLET_PASSWORD", "").strip()

_pool: oracledb.ConnectionPool | None = None


def init_pool() -> None:
    global _pool
    if _pool is None:
        pool_kwargs: dict[str, Any] = {
            "user": ORACLE_USER,
            "password": ORACLE_PASSWORD,
            "dsn": ORACLE_DSN,
            "min": 1,
            "max": 10,
            "increment": 1,
            "ping_interval": 60,
            "timeout": 300,
        }

        # Si se configura Wallet (mTLS de Oracle Cloud Autonomous DB), sigue siendo 100% modo Thin
        if ORACLE_WALLET_DIR:
            wallet_path = Path(ORACLE_WALLET_DIR)
            if not wallet_path.is_absolute():
                wallet_path = BASE_DIR / wallet_path
            pool_kwargs["config_dir"] = str(wallet_path)
            pool_kwargs["wallet_location"] = str(wallet_path)
            if ORACLE_WALLET_PASSWORD:
                pool_kwargs["wallet_password"] = ORACLE_WALLET_PASSWORD

        _pool = oracledb.create_pool(**pool_kwargs)


def close_pool() -> None:
    global _pool
    if _pool is not None:
        _pool.close()
        _pool = None


@contextmanager
def get_connection() -> Generator[oracledb.Connection, None, None]:
    if _pool is None:
        init_pool()
    conn = _pool.acquire()
    try:
        yield conn
    finally:
        _pool.release(conn)


def cursor_to_dicts(cursor: oracledb.Cursor) -> list[dict[str, Any]]:
    """Convierte un SYS_REFCURSOR abierto en una lista de diccionarios con llaves en minúscula."""
    if not cursor.description:
        return []
    columns = [col[0].lower() for col in cursor.description]
    return [dict(zip(columns, row)) for row in cursor.fetchall()]


def call_refcursor(proc_name: str, params: list[Any] | None = None) -> list[dict[str, Any]]:
    """Ejecuta un procedimiento PL/SQL cuyo último parámetro es OUT SYS_REFCURSOR."""
    args = list(params or [])
    try:
        with get_connection() as conn:
            with conn.cursor() as cur, conn.cursor() as out_cur:
                cur.callproc(proc_name, [*args, out_cur])
                return cursor_to_dicts(out_cur)
    except oracledb.DatabaseError as exc:
        handle_oracle_error(exc)


def call_proc_no_out(proc_name: str, params: list[Any] | None = None) -> None:
    """Ejecuta un procedimiento PL/SQL sin parámetros de salida."""
    try:
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.callproc(proc_name, list(params or []))
    except oracledb.DatabaseError as exc:
        handle_oracle_error(exc)


def call_proc_id_out(proc_name: str, params: list[Any] | None = None) -> int:
    """Ejecuta un procedimiento PL/SQL cuyo último parámetro es OUT NUMBER (ID generado)."""
    try:
        with get_connection() as conn:
            with conn.cursor() as cur:
                out_id = cur.var(oracledb.NUMBER)
                cur.callproc(proc_name, [*(params or []), out_id])
                val = out_id.getvalue()
                return int(val) if val is not None else 0
    except oracledb.DatabaseError as exc:
        handle_oracle_error(exc)


def handle_oracle_error(exc: oracledb.DatabaseError) -> None:
    """Traduce errores nativos de Oracle y RAISE_APPLICATION_ERROR (-20xxx) a HTTPException."""
    error_obj = exc.args[0] if exc.args else None
    code = getattr(error_obj, "code", 0)
    raw_msg = getattr(error_obj, "message", str(exc))

    # Errores de negocio propios definidos en triggers y packages (-20000 a -20999)
    if 20000 <= code <= 20999:
        first_line = raw_msg.splitlines()[0]
        clean_msg = re.sub(r"^ORA-\d+:\s*", "", first_line).strip()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=clean_msg)

    if code == 1:  # ORA-00001: unique constraint violated
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Ya existe un registro con esos datos únicos (RUT, correo, nombre o inscripción duplicada).",
        )
    if code == 2291:  # ORA-02291: parent key not found
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Referencia inválida: uno de los IDs relacionados no existe en la base de datos.",
        )
    if code == 2292:  # ORA-02292: child record found
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="No se puede eliminar este registro porque tiene información dependiente asociada.",
        )
    if code == 2290:  # ORA-02290: check constraint violated
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uno de los valores no cumple el formato o rango permitido (ej. hora HH:MM, color #HEX o cupos > 0).",
        )

    logger.error("Error inesperado en Oracle (%s): %s", code, raw_msg)
    detail = (
        "Error interno al procesar la operación en la base de datos."
        if IS_PROD
        else f"Error en Oracle ({code}): {raw_msg.splitlines()[0]}"
    )
    raise HTTPException(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        detail=detail,
    )