-- Sistema de Gestión de Staff Universitario - UCM (Esquema: UCM_STAFF_BD)

SET DEFINE OFF;
SET SERVEROUTPUT ON;

-- 1. Limpieza de objetos previos
BEGIN
    FOR p IN (SELECT object_name FROM user_objects WHERE object_type = 'PACKAGE') LOOP
        EXECUTE IMMEDIATE 'DROP PACKAGE ' || p.object_name;
    END LOOP;

    FOR t IN (SELECT table_name FROM user_tables) LOOP
        EXECUTE IMMEDIATE 'DROP TABLE ' || t.table_name || ' CASCADE CONSTRAINTS PURGE';
    END LOOP;

    FOR s IN (SELECT sequence_name FROM user_sequences) LOOP
        EXECUTE IMMEDIATE 'DROP SEQUENCE ' || s.sequence_name;
    END LOOP;

    DBMS_OUTPUT.PUT_LINE('Limpieza previa completada correctamente.');
END;
/

-- 2. Creación de tablas e índices

CREATE TABLE roles (
    id_rol          NUMBER          NOT NULL,
    nombre_rol      VARCHAR2(50)    NOT NULL,
    descripcion     VARCHAR2(200),
    CONSTRAINT pk_roles PRIMARY KEY (id_rol),
    CONSTRAINT uq_roles_nombre UNIQUE (nombre_rol)
);

CREATE TABLE facultades (
    id_facultad     NUMBER          NOT NULL,
    nombre_facultad VARCHAR2(120)   NOT NULL,
    siglas          VARCHAR2(15)    NOT NULL,
    CONSTRAINT pk_facultades PRIMARY KEY (id_facultad),
    CONSTRAINT uq_facultades_nombre UNIQUE (nombre_facultad),
    CONSTRAINT uq_facultades_siglas UNIQUE (siglas)
);

CREATE TABLE carreras (
    id_carrera      NUMBER          NOT NULL,
    id_facultad     NUMBER          NOT NULL,
    nombre_carrera  VARCHAR2(120)   NOT NULL,
    CONSTRAINT pk_carreras PRIMARY KEY (id_carrera),
    CONSTRAINT uq_carreras_nombre UNIQUE (nombre_carrera),
    CONSTRAINT fk_carreras_facultad FOREIGN KEY (id_facultad) REFERENCES facultades (id_facultad)
);

CREATE TABLE regiones (
    id_region       NUMBER          NOT NULL,
    nombre_region   VARCHAR2(80)    NOT NULL,
    codigo_romano   VARCHAR2(10)    NOT NULL,
    CONSTRAINT pk_regiones PRIMARY KEY (id_region),
    CONSTRAINT uq_regiones_nombre UNIQUE (nombre_region),
    CONSTRAINT uq_regiones_codigo UNIQUE (codigo_romano)
);

CREATE TABLE ciudades (
    id_ciudad       NUMBER          NOT NULL,
    id_region       NUMBER          NOT NULL,
    nombre_ciudad   VARCHAR2(80)    NOT NULL,
    CONSTRAINT pk_ciudades PRIMARY KEY (id_ciudad),
    CONSTRAINT uq_ciudades_nombre UNIQUE (nombre_ciudad),
    CONSTRAINT fk_ciudades_region FOREIGN KEY (id_region) REFERENCES regiones (id_region)
);

CREATE TABLE ubicaciones (
    id_ubicacion    NUMBER          NOT NULL,
    id_ciudad       NUMBER          NOT NULL,
    nombre_lugar    VARCHAR2(150)   NOT NULL,
    direccion       VARCHAR2(180)   NOT NULL,
    url_google_maps VARCHAR2(400),
    CONSTRAINT pk_ubicaciones PRIMARY KEY (id_ubicacion),
    CONSTRAINT fk_ubicaciones_ciudad FOREIGN KEY (id_ciudad) REFERENCES ciudades (id_ciudad)
);

CREATE TABLE tipos_actividad (
    id_tipo_actividad NUMBER        NOT NULL,
    nombre_tipo       VARCHAR2(30)  NOT NULL,
    color_hex         VARCHAR2(10)  NOT NULL,
    CONSTRAINT pk_tipos_actividad PRIMARY KEY (id_tipo_actividad),
    CONSTRAINT uq_tipos_act_nombre UNIQUE (nombre_tipo),
    CONSTRAINT ck_tipos_act_color CHECK (REGEXP_LIKE(color_hex, '^#[0-9A-Fa-f]{6}$'))
);

CREATE TABLE estados_actividad (
    id_estado_actividad NUMBER       NOT NULL,
    nombre_estado       VARCHAR2(30) NOT NULL,
    descripcion         VARCHAR2(160),
    CONSTRAINT pk_estados_actividad PRIMARY KEY (id_estado_actividad),
    CONSTRAINT uq_estados_act_nombre UNIQUE (nombre_estado)
);

CREATE TABLE usuarios (
    id_usuario         NUMBER          NOT NULL,
    rut                VARCHAR2(12)    NOT NULL,
    correo             VARCHAR2(120)   NOT NULL,
    password_hash      VARCHAR2(255)   NOT NULL,
    nombre             VARCHAR2(50)    NOT NULL,
    apellido           VARCHAR2(50)    NOT NULL,
    foto_url           VARCHAR2(255),
    id_rol             NUMBER          NOT NULL,
    debe_cambiar_clave CHAR(1)         DEFAULT 'S' NOT NULL,
    activo             CHAR(1)         DEFAULT 'S' NOT NULL,
    creado_por         NUMBER,
    fecha_creacion     TIMESTAMP       DEFAULT CAST(SYSTIMESTAMP AT TIME ZONE 'America/Santiago' AS TIMESTAMP) NOT NULL,
    CONSTRAINT pk_usuarios PRIMARY KEY (id_usuario),
    CONSTRAINT uq_usuarios_rut UNIQUE (rut),
    CONSTRAINT uq_usuarios_correo UNIQUE (correo),
    CONSTRAINT fk_usuarios_rol FOREIGN KEY (id_rol) REFERENCES roles (id_rol),
    CONSTRAINT fk_usuarios_creador FOREIGN KEY (creado_por) REFERENCES usuarios (id_usuario),
    CONSTRAINT ck_usuarios_cambiar_clave CHECK (debe_cambiar_clave IN ('S', 'N')),
    CONSTRAINT ck_usuarios_activo CHECK (activo IN ('S', 'N'))
);

CREATE UNIQUE INDEX uq_unico_superadmin
    ON usuarios (CASE WHEN id_rol = 1 THEN 1 END);

CREATE TABLE perfiles_staff (
    id_usuario            NUMBER        NOT NULL,
    id_carrera            NUMBER        NOT NULL,
    generacion            NUMBER        NOT NULL,
    telefono              VARCHAR2(20),
    estado_disponibilidad VARCHAR2(15)  DEFAULT 'DISPONIBLE' NOT NULL,
    CONSTRAINT pk_perfiles_staff PRIMARY KEY (id_usuario),
    CONSTRAINT fk_perfil_usuario FOREIGN KEY (id_usuario) REFERENCES usuarios (id_usuario),
    CONSTRAINT fk_perfil_carrera FOREIGN KEY (id_carrera) REFERENCES carreras (id_carrera),
    CONSTRAINT ck_perfil_generacion CHECK (generacion BETWEEN 2015 AND 2035),
    CONSTRAINT ck_perfil_estado_disp CHECK (estado_disponibilidad IN ('DISPONIBLE', 'OCUPADO', 'INACTIVO'))
);

CREATE TABLE disponibilidad_staff (
    id_disponibilidad NUMBER        NOT NULL,
    id_usuario        NUMBER        NOT NULL,
    fecha_disponible  DATE          NOT NULL,
    bloque_horario    VARCHAR2(20)  NOT NULL,
    estado_disp       VARCHAR2(15)  DEFAULT 'DISPONIBLE' NOT NULL,
    CONSTRAINT pk_disponibilidad_staff PRIMARY KEY (id_disponibilidad),
    CONSTRAINT fk_disp_perfil FOREIGN KEY (id_usuario) REFERENCES perfiles_staff (id_usuario),
    CONSTRAINT ck_disp_bloque CHECK (bloque_horario IN ('MANANA', 'TARDE', 'COMPLETO')),
    CONSTRAINT ck_disp_estado CHECK (estado_disp IN ('DISPONIBLE', 'RESERVADO', 'NO_DISPONIBLE'))
);

CREATE TABLE actividades (
    id_actividad             NUMBER         NOT NULL,
    titulo                   VARCHAR2(120)  NOT NULL,
    descripcion              VARCHAR2(500),
    id_tipo_actividad        NUMBER         NOT NULL,
    id_ubicacion             NUMBER         NOT NULL,
    id_estado_actividad      NUMBER         NOT NULL,
    fecha_actividad          DATE           NOT NULL,
    hora_inicio              VARCHAR2(5)    NOT NULL,
    cantidad_horas           NUMBER(4,1)    NOT NULL,
    cupos_maximos            NUMBER         NOT NULL,
    fecha_pub_programada     TIMESTAMP,
    id_admin_creador         NUMBER         NOT NULL,
    horas_cierre_postulacion NUMBER(4,1)    DEFAULT 10 NOT NULL,
    CONSTRAINT pk_actividades PRIMARY KEY (id_actividad),
    CONSTRAINT fk_act_tipo FOREIGN KEY (id_tipo_actividad) REFERENCES tipos_actividad (id_tipo_actividad),
    CONSTRAINT fk_act_ubicacion FOREIGN KEY (id_ubicacion) REFERENCES ubicaciones (id_ubicacion),
    CONSTRAINT fk_act_estado FOREIGN KEY (id_estado_actividad) REFERENCES estados_actividad (id_estado_actividad),
    CONSTRAINT fk_act_admin FOREIGN KEY (id_admin_creador) REFERENCES usuarios (id_usuario),
    CONSTRAINT ck_act_hora CHECK (REGEXP_LIKE(hora_inicio, '^([01][0-9]|2[0-3]):[0-5][0-9]$')),
    CONSTRAINT ck_act_horas CHECK (cantidad_horas > 0 AND cantidad_horas <= 24),
    CONSTRAINT ck_act_cupos CHECK (cupos_maximos > 0),
    CONSTRAINT ck_act_cierre CHECK (horas_cierre_postulacion >= 0 AND horas_cierre_postulacion <= 720)
);

CREATE TABLE postulaciones (
    id_postulacion     NUMBER        NOT NULL,
    id_actividad       NUMBER        NOT NULL,
    id_usuario         NUMBER        NOT NULL,
    estado_postulacion VARCHAR2(20)  DEFAULT 'CONFIRMADA' NOT NULL,
    fecha_postulacion  TIMESTAMP     DEFAULT CAST(SYSTIMESTAMP AT TIME ZONE 'America/Santiago' AS TIMESTAMP) NOT NULL,
    asignado_por       NUMBER,
    CONSTRAINT pk_postulaciones PRIMARY KEY (id_postulacion),
    CONSTRAINT uq_post_act_usr UNIQUE (id_actividad, id_usuario),
    CONSTRAINT fk_post_actividad FOREIGN KEY (id_actividad) REFERENCES actividades (id_actividad),
    CONSTRAINT fk_post_usuario FOREIGN KEY (id_usuario) REFERENCES usuarios (id_usuario),
    CONSTRAINT fk_post_asignado_por FOREIGN KEY (asignado_por) REFERENCES usuarios (id_usuario),
    CONSTRAINT ck_post_estado CHECK (estado_postulacion IN ('CONFIRMADA', 'ASIGNADA', 'CANCELADA'))
);

CREATE TABLE lista_espera (
    id_lista_espera  NUMBER        NOT NULL,
    id_actividad     NUMBER        NOT NULL,
    id_usuario       NUMBER        NOT NULL,
    fecha_ingreso    TIMESTAMP     DEFAULT CAST(SYSTIMESTAMP AT TIME ZONE 'America/Santiago' AS TIMESTAMP) NOT NULL,
    estado_espera    VARCHAR2(20)  DEFAULT 'PENDIENTE' NOT NULL,
    resuelto_por     NUMBER,
    fecha_resolucion TIMESTAMP,
    CONSTRAINT pk_lista_espera PRIMARY KEY (id_lista_espera),
    CONSTRAINT uq_espera_act_usr UNIQUE (id_actividad, id_usuario),
    CONSTRAINT fk_espera_actividad FOREIGN KEY (id_actividad) REFERENCES actividades (id_actividad),
    CONSTRAINT fk_espera_usuario FOREIGN KEY (id_usuario) REFERENCES usuarios (id_usuario),
    CONSTRAINT fk_espera_resuelto_por FOREIGN KEY (resuelto_por) REFERENCES usuarios (id_usuario),
    CONSTRAINT ck_espera_estado CHECK (estado_espera IN ('PENDIENTE', 'ACEPTADA', 'RECHAZADA', 'CANCELADA'))
);

CREATE TABLE registro_trabajo (
    id_registro      NUMBER        NOT NULL,
    id_postulacion   NUMBER        NOT NULL,
    asistio          CHAR(1)       DEFAULT 'S' NOT NULL,
    horas_efectivas  NUMBER(4,1)   NOT NULL,
    observaciones    VARCHAR2(300),
    validado_por     NUMBER        NOT NULL,
    fecha_validacion TIMESTAMP     DEFAULT CAST(SYSTIMESTAMP AT TIME ZONE 'America/Santiago' AS TIMESTAMP) NOT NULL,
    CONSTRAINT pk_registro_trabajo PRIMARY KEY (id_registro),
    CONSTRAINT uq_reg_postulacion UNIQUE (id_postulacion),
    CONSTRAINT fk_reg_postulacion FOREIGN KEY (id_postulacion) REFERENCES postulaciones (id_postulacion),
    CONSTRAINT fk_reg_validador FOREIGN KEY (validado_por) REFERENCES usuarios (id_usuario),
    CONSTRAINT ck_reg_asistio CHECK (asistio IN ('S', 'N')),
    CONSTRAINT ck_reg_horas CHECK (horas_efectivas >= 0 AND horas_efectivas <= 24)
);

CREATE TABLE auditoria_sistema (
    id_auditoria        NUMBER        NOT NULL,
    tabla_afectada      VARCHAR2(40)  NOT NULL,
    id_registro         NUMBER        NOT NULL,
    accion              VARCHAR2(30)  NOT NULL,
    detalle_cambio      VARCHAR2(400),
    id_usuario_ejecutor NUMBER,
    fecha_evento        TIMESTAMP     DEFAULT CAST(SYSTIMESTAMP AT TIME ZONE 'America/Santiago' AS TIMESTAMP) NOT NULL,
    CONSTRAINT pk_auditoria_sistema PRIMARY KEY (id_auditoria),
    CONSTRAINT fk_aud_usuario FOREIGN KEY (id_usuario_ejecutor) REFERENCES usuarios (id_usuario)
);

CREATE INDEX idx_usuarios_rol         ON usuarios (id_rol);
CREATE INDEX idx_actividades_fecha    ON actividades (fecha_actividad);
CREATE INDEX idx_actividades_estado   ON actividades (id_estado_actividad);
CREATE INDEX idx_post_actividad       ON postulaciones (id_actividad);
CREATE INDEX idx_post_usuario         ON postulaciones (id_usuario);
CREATE INDEX idx_espera_actividad     ON lista_espera (id_actividad);
CREATE INDEX idx_disp_usuario_fecha   ON disponibilidad_staff (id_usuario, fecha_disponible);
CREATE INDEX idx_auditoria_fecha      ON auditoria_sistema (fecha_evento);

-- 3. Secuencias
CREATE SEQUENCE seq_roles                START WITH 1 INCREMENT BY 1 NOCACHE;
CREATE SEQUENCE seq_facultades           START WITH 1 INCREMENT BY 1 NOCACHE;
CREATE SEQUENCE seq_carreras             START WITH 1 INCREMENT BY 1 NOCACHE;
CREATE SEQUENCE seq_regiones             START WITH 1 INCREMENT BY 1 NOCACHE;
CREATE SEQUENCE seq_ciudades             START WITH 1 INCREMENT BY 1 NOCACHE;
CREATE SEQUENCE seq_ubicaciones          START WITH 1 INCREMENT BY 1 NOCACHE;
CREATE SEQUENCE seq_tipos_actividad      START WITH 1 INCREMENT BY 1 NOCACHE;
CREATE SEQUENCE seq_estados_actividad    START WITH 1 INCREMENT BY 1 NOCACHE;
CREATE SEQUENCE seq_usuarios             START WITH 1 INCREMENT BY 1 NOCACHE;
CREATE SEQUENCE seq_disponibilidad_staff START WITH 1 INCREMENT BY 1 NOCACHE;
CREATE SEQUENCE seq_actividades          START WITH 1 INCREMENT BY 1 NOCACHE;
CREATE SEQUENCE seq_postulaciones        START WITH 1 INCREMENT BY 1 NOCACHE;
CREATE SEQUENCE seq_lista_espera         START WITH 1 INCREMENT BY 1 NOCACHE;
CREATE SEQUENCE seq_registro_trabajo     START WITH 1 INCREMENT BY 1 NOCACHE;
CREATE SEQUENCE seq_auditoria_sistema    START WITH 1 INCREMENT BY 1 NOCACHE;

-- 4. Triggers de validación y auditoría

CREATE OR REPLACE TRIGGER trg_usuarios_jerarquia
FOR INSERT OR UPDATE OR DELETE ON usuarios
COMPOUND TRIGGER
    TYPE t_check_rec IS RECORD (
        id_rol      NUMBER,
        creado_por  NUMBER,
        es_creacion BOOLEAN
    );
    TYPE t_check_tab IS TABLE OF t_check_rec INDEX BY PLS_INTEGER;
    g_checks t_check_tab;

    BEFORE EACH ROW IS
    BEGIN
        IF DELETING THEN
            IF :OLD.id_rol = 1 THEN
                RAISE_APPLICATION_ERROR(-20001, 'Operación denegada: el SUPERADMIN no puede ser eliminado.');
            END IF;
        END IF;

        IF UPDATING THEN
            IF :OLD.id_rol = 1 AND (:NEW.id_rol <> 1 OR :NEW.activo <> 'S') THEN
                RAISE_APPLICATION_ERROR(-20002, 'Operación denegada: el SUPERADMIN no puede cambiar de rol ni ser desactivado.');
            END IF;
        END IF;

        IF INSERTING OR UPDATING THEN
            :NEW.correo := LOWER(TRIM(:NEW.correo));
            :NEW.rut    := UPPER(TRIM(:NEW.rut));

            IF :NEW.id_rol = 1 AND :NEW.creado_por IS NOT NULL THEN
                RAISE_APPLICATION_ERROR(-20003, 'El SUPERADMIN raíz no puede tener un usuario creador asignado.');
            END IF;

            IF :NEW.id_rol IN (2, 3) AND :NEW.creado_por IS NULL THEN
                RAISE_APPLICATION_ERROR(-20004, 'Toda cuenta ADMIN o STAFF debe registrar obligatoriamente creado_por.');
            END IF;

            IF :NEW.id_rol IN (2, 3) THEN
                g_checks(g_checks.COUNT + 1).id_rol      := :NEW.id_rol;
                g_checks(g_checks.COUNT).creado_por      := :NEW.creado_por;
                g_checks(g_checks.COUNT).es_creacion     := INSERTING OR (NVL(:OLD.creado_por, -1) <> :NEW.creado_por);
            END IF;
        END IF;
    END BEFORE EACH ROW;

    AFTER STATEMENT IS
        v_rol_creador    NUMBER;
        v_activo_creador CHAR(1);
    BEGIN
        FOR i IN 1 .. g_checks.COUNT LOOP
            SELECT id_rol, activo
              INTO v_rol_creador, v_activo_creador
              FROM usuarios
             WHERE id_usuario = g_checks(i).creado_por;

            IF g_checks(i).es_creacion AND v_activo_creador <> 'S' THEN
                RAISE_APPLICATION_ERROR(-20005, 'El usuario creador no se encuentra activo.');
            END IF;

            IF g_checks(i).id_rol = 2 AND v_rol_creador <> 1 THEN
                RAISE_APPLICATION_ERROR(-20006, 'Jerarquía violada: solo el SUPERADMIN puede crear cuentas ADMIN.');
            END IF;

            IF g_checks(i).id_rol = 3 AND v_rol_creador <> 2 THEN
                RAISE_APPLICATION_ERROR(-20007, 'Jerarquía violada: solo un ADMIN puede crear cuentas STAFF.');
            END IF;
        END LOOP;
        g_checks.DELETE;
    EXCEPTION
        WHEN OTHERS THEN
            g_checks.DELETE;
            RAISE;
    END AFTER STATEMENT;
END trg_usuarios_jerarquia;
/

CREATE OR REPLACE TRIGGER trg_perfil_solo_staff
BEFORE INSERT OR UPDATE ON perfiles_staff
FOR EACH ROW
DECLARE
    v_rol NUMBER;
BEGIN
    SELECT id_rol INTO v_rol FROM usuarios WHERE id_usuario = :NEW.id_usuario;
    IF v_rol <> 3 THEN
        RAISE_APPLICATION_ERROR(-20008, 'Solo los usuarios con rol STAFF pueden tener un registro en PERFILES_STAFF.');
    END IF;
END trg_perfil_solo_staff;
/

CREATE OR REPLACE TRIGGER trg_actividades_control
BEFORE INSERT OR UPDATE ON actividades
FOR EACH ROW
DECLARE
    v_rol    NUMBER;
    v_activo CHAR(1);
BEGIN
    SELECT id_rol, activo INTO v_rol, v_activo
      FROM usuarios
     WHERE id_usuario = :NEW.id_admin_creador;

    IF v_rol <> 2 THEN
        RAISE_APPLICATION_ERROR(-20009, 'Solo usuarios con rol ADMIN pueden crear o gestionar actividades.');
    END IF;

    IF INSERTING AND v_activo <> 'S' THEN
        RAISE_APPLICATION_ERROR(-20010, 'Un ADMIN inactivo no puede crear nuevas actividades.');
    END IF;
END trg_actividades_control;
/

CREATE OR REPLACE TRIGGER trg_postulaciones_control
FOR INSERT OR UPDATE ON postulaciones
COMPOUND TRIGGER
    TYPE t_act_tab IS TABLE OF NUMBER INDEX BY PLS_INTEGER;
    g_acts t_act_tab;

    BEFORE EACH ROW IS
        v_rol_usr    NUMBER;
        v_activo_usr CHAR(1);
        v_rol_asig   NUMBER;
    BEGIN
        SELECT id_rol, activo INTO v_rol_usr, v_activo_usr
          FROM usuarios
         WHERE id_usuario = :NEW.id_usuario;

        IF v_rol_usr <> 3 THEN
            RAISE_APPLICATION_ERROR(-20011, 'Solo usuarios con rol STAFF pueden postular o ser asignados a actividades.');
        END IF;

        IF INSERTING AND v_activo_usr <> 'S' THEN
            RAISE_APPLICATION_ERROR(-20012, 'Un usuario STAFF inactivo no puede postular a actividades.');
        END IF;

        IF :NEW.asignado_por IS NOT NULL THEN
            SELECT id_rol INTO v_rol_asig FROM usuarios WHERE id_usuario = :NEW.asignado_por;
            IF v_rol_asig <> 2 THEN
                RAISE_APPLICATION_ERROR(-20013, 'Solo un ADMIN puede asignar manualmente a un STAFF.');
            END IF;
        END IF;

        IF :NEW.estado_postulacion IN ('CONFIRMADA', 'ASIGNADA') THEN
            g_acts(g_acts.COUNT + 1) := :NEW.id_actividad;
        END IF;
    END BEFORE EACH ROW;

    AFTER STATEMENT IS
        v_cupos_max NUMBER;
        v_ocupados  NUMBER;
    BEGIN
        FOR i IN 1 .. g_acts.COUNT LOOP
            SELECT cupos_maximos INTO v_cupos_max
              FROM actividades
             WHERE id_actividad = g_acts(i);

            SELECT COUNT(*) INTO v_ocupados
              FROM postulaciones
             WHERE id_actividad = g_acts(i)
               AND estado_postulacion IN ('CONFIRMADA', 'ASIGNADA');

            IF v_ocupados > v_cupos_max THEN
                RAISE_APPLICATION_ERROR(
                    -20014,
                    'Cupos completos para la actividad ID ' || g_acts(i) ||
                    ' (' || v_cupos_max || ' cupos). El Staff debe ingresar a LISTA_ESPERA.'
                );
            END IF;
        END LOOP;
        g_acts.DELETE;
    EXCEPTION
        WHEN OTHERS THEN
            g_acts.DELETE;
            RAISE;
    END AFTER STATEMENT;
END trg_postulaciones_control;
/

CREATE OR REPLACE TRIGGER trg_lista_espera_control
BEFORE INSERT OR UPDATE ON lista_espera
FOR EACH ROW
DECLARE
    v_rol_usr  NUMBER;
    v_rol_res  NUMBER;
BEGIN
    SELECT id_rol INTO v_rol_usr FROM usuarios WHERE id_usuario = :NEW.id_usuario;
    IF v_rol_usr <> 3 THEN
        RAISE_APPLICATION_ERROR(-20015, 'Solo usuarios STAFF pueden ingresar a la lista de espera.');
    END IF;

    IF :NEW.resuelto_por IS NOT NULL THEN
        SELECT id_rol INTO v_rol_res FROM usuarios WHERE id_usuario = :NEW.resuelto_por;
        IF v_rol_res <> 2 THEN
            RAISE_APPLICATION_ERROR(-20016, 'Solo un ADMIN puede aprobar o rechazar solicitudes de lista de espera.');
        END IF;
        IF :NEW.fecha_resolucion IS NULL THEN
            :NEW.fecha_resolucion := CAST(SYSTIMESTAMP AT TIME ZONE 'America/Santiago' AS TIMESTAMP);
        END IF;
    END IF;
END trg_lista_espera_control;
/

CREATE OR REPLACE TRIGGER trg_registro_trabajo_control
BEFORE INSERT OR UPDATE ON registro_trabajo
FOR EACH ROW
DECLARE
    v_rol_val  NUMBER;
    v_est_post VARCHAR2(20);
BEGIN
    SELECT id_rol INTO v_rol_val FROM usuarios WHERE id_usuario = :NEW.validado_por;
    IF v_rol_val <> 2 THEN
        RAISE_APPLICATION_ERROR(-20017, 'Solo un ADMIN puede validar horas trabajadas.');
    END IF;

    SELECT estado_postulacion INTO v_est_post
      FROM postulaciones
     WHERE id_postulacion = :NEW.id_postulacion;

    IF v_est_post = 'CANCELADA' THEN
        RAISE_APPLICATION_ERROR(-20018, 'No se puede registrar asistencia sobre una postulación CANCELADA.');
    END IF;

    IF :NEW.asistio = 'N' THEN
        :NEW.horas_efectivas := 0;
    END IF;
END trg_registro_trabajo_control;
/

CREATE OR REPLACE TRIGGER trg_aud_usuarios
AFTER INSERT OR UPDATE OR DELETE ON usuarios
FOR EACH ROW
DECLARE
    v_accion   VARCHAR2(30);
    v_detalle  VARCHAR2(400);
    v_ejecutor NUMBER;
    v_id_reg   NUMBER;
BEGIN
    IF INSERTING THEN
        v_accion   := 'INSERT';
        v_id_reg   := :NEW.id_usuario;
        v_ejecutor := NVL(:NEW.creado_por, :NEW.id_usuario);
        v_detalle  := 'Alta usuario ' || :NEW.correo || ' (rol=' || :NEW.id_rol || ')';
    ELSIF UPDATING THEN
        v_accion   := 'UPDATE';
        v_id_reg   := :NEW.id_usuario;
        v_ejecutor := NVL(:NEW.creado_por, :NEW.id_usuario);
        v_detalle  := 'Actualización usuario ' || :NEW.correo || ' activo=' || :NEW.activo || ' cambiar_clave=' || :NEW.debe_cambiar_clave;
    ELSE
        v_accion   := 'DELETE';
        v_id_reg   := :OLD.id_usuario;
        v_ejecutor := :OLD.creado_por;
        v_detalle  := 'Eliminación usuario ' || :OLD.correo;
    END IF;

    INSERT INTO auditoria_sistema (
        id_auditoria, tabla_afectada, id_registro, accion, detalle_cambio, id_usuario_ejecutor
    ) VALUES (
        seq_auditoria_sistema.NEXTVAL, 'USUARIOS', v_id_reg, v_accion, v_detalle, v_ejecutor
    );
END trg_aud_usuarios;
/

CREATE OR REPLACE TRIGGER trg_aud_actividades
AFTER INSERT OR UPDATE OR DELETE ON actividades
FOR EACH ROW
DECLARE
    v_accion  VARCHAR2(30);
    v_detalle VARCHAR2(400);
BEGIN
    IF INSERTING THEN
        v_accion  := 'INSERT';
        v_detalle := 'Nueva actividad: ' || :NEW.titulo || ' (cupos=' || :NEW.cupos_maximos || ')';
        INSERT INTO auditoria_sistema (id_auditoria, tabla_afectada, id_registro, accion, detalle_cambio, id_usuario_ejecutor)
        VALUES (seq_auditoria_sistema.NEXTVAL, 'ACTIVIDADES', :NEW.id_actividad, v_accion, v_detalle, :NEW.id_admin_creador);
    ELSIF UPDATING THEN
        v_accion  := 'UPDATE';
        v_detalle := 'Modificación actividad: ' || :NEW.titulo || ' estado=' || :OLD.id_estado_actividad || '->' || :NEW.id_estado_actividad;
        INSERT INTO auditoria_sistema (id_auditoria, tabla_afectada, id_registro, accion, detalle_cambio, id_usuario_ejecutor)
        VALUES (seq_auditoria_sistema.NEXTVAL, 'ACTIVIDADES', :NEW.id_actividad, v_accion, v_detalle, :NEW.id_admin_creador);
    ELSE
        v_accion  := 'DELETE';
        v_detalle := 'Eliminación actividad: ' || :OLD.titulo;
        INSERT INTO auditoria_sistema (id_auditoria, tabla_afectada, id_registro, accion, detalle_cambio, id_usuario_ejecutor)
        VALUES (seq_auditoria_sistema.NEXTVAL, 'ACTIVIDADES', :OLD.id_actividad, v_accion, v_detalle, :OLD.id_admin_creador);
    END IF;
END trg_aud_actividades;
/

CREATE OR REPLACE TRIGGER trg_aud_postulaciones
AFTER INSERT OR UPDATE ON postulaciones
FOR EACH ROW
DECLARE
    v_accion   VARCHAR2(30) := CASE WHEN INSERTING THEN 'INSERT' ELSE 'UPDATE' END;
    v_ejecutor NUMBER       := NVL(:NEW.asignado_por, :NEW.id_usuario);
BEGIN
    INSERT INTO auditoria_sistema (
        id_auditoria, tabla_afectada, id_registro, accion, detalle_cambio, id_usuario_ejecutor
    ) VALUES (
        seq_auditoria_sistema.NEXTVAL,
        'POSTULACIONES',
        :NEW.id_postulacion,
        v_accion,
        'Act=' || :NEW.id_actividad || ' Staff=' || :NEW.id_usuario || ' Estado=' || :NEW.estado_postulacion,
        v_ejecutor
    );
END trg_aud_postulaciones;
/

CREATE OR REPLACE TRIGGER trg_aud_registro_trabajo
AFTER INSERT OR UPDATE ON registro_trabajo
FOR EACH ROW
DECLARE
    v_accion VARCHAR2(30) := CASE WHEN INSERTING THEN 'INSERT' ELSE 'UPDATE' END;
BEGIN
    INSERT INTO auditoria_sistema (
        id_auditoria, tabla_afectada, id_registro, accion, detalle_cambio, id_usuario_ejecutor
    ) VALUES (
        seq_auditoria_sistema.NEXTVAL,
        'REGISTRO_TRABAJO',
        :NEW.id_registro,
        v_accion,
        'Postulacion=' || :NEW.id_postulacion || ' Asistio=' || :NEW.asistio || ' Horas=' || :NEW.horas_efectivas,
        :NEW.validado_por
    );
END trg_aud_registro_trabajo;
/

SELECT
    (SELECT COUNT(*) FROM user_tables)    AS tablas_creadas,
    (SELECT COUNT(*) FROM user_sequences) AS secuencias_creadas,
    (SELECT COUNT(*) FROM user_triggers)  AS triggers_creados,
    (SELECT COUNT(*) FROM user_errors)    AS errores_compilacion
FROM dual;

-- 5. Packages mantenedores (CRUD)

CREATE OR REPLACE PACKAGE pkg_mant_facultades AS
    PROCEDURE listar(p_cursor OUT SYS_REFCURSOR);
    PROCEDURE obtener(p_id IN NUMBER, p_cursor OUT SYS_REFCURSOR);
    PROCEDURE crear(p_nombre IN VARCHAR2, p_siglas IN VARCHAR2, p_id_out OUT NUMBER);
    PROCEDURE actualizar(p_id IN NUMBER, p_nombre IN VARCHAR2, p_siglas IN VARCHAR2);
    PROCEDURE eliminar(p_id IN NUMBER);
END pkg_mant_facultades;
/

CREATE OR REPLACE PACKAGE BODY pkg_mant_facultades AS
    e_fk_violation EXCEPTION;
    PRAGMA EXCEPTION_INIT(e_fk_violation, -2292);

    PROCEDURE listar(p_cursor OUT SYS_REFCURSOR) IS
    BEGIN
        OPEN p_cursor FOR
            SELECT id_facultad, nombre_facultad, siglas
              FROM facultades
             ORDER BY nombre_facultad;
    END;

    PROCEDURE obtener(p_id IN NUMBER, p_cursor OUT SYS_REFCURSOR) IS
    BEGIN
        OPEN p_cursor FOR
            SELECT id_facultad, nombre_facultad, siglas
              FROM facultades
             WHERE id_facultad = p_id;
    END;

    PROCEDURE crear(p_nombre IN VARCHAR2, p_siglas IN VARCHAR2, p_id_out OUT NUMBER) IS
    BEGIN
        p_id_out := seq_facultades.NEXTVAL;
        INSERT INTO facultades (id_facultad, nombre_facultad, siglas)
        VALUES (p_id_out, TRIM(p_nombre), UPPER(TRIM(p_siglas)));
        COMMIT;
    END;

    PROCEDURE actualizar(p_id IN NUMBER, p_nombre IN VARCHAR2, p_siglas IN VARCHAR2) IS
    BEGIN
        UPDATE facultades
           SET nombre_facultad = TRIM(p_nombre),
               siglas          = UPPER(TRIM(p_siglas))
         WHERE id_facultad = p_id;
        IF SQL%ROWCOUNT = 0 THEN
            RAISE_APPLICATION_ERROR(-20101, 'Facultad no encontrada.');
        END IF;
        COMMIT;
    END;

    PROCEDURE eliminar(p_id IN NUMBER) IS
    BEGIN
        DELETE FROM facultades WHERE id_facultad = p_id;
        IF SQL%ROWCOUNT = 0 THEN
            RAISE_APPLICATION_ERROR(-20101, 'Facultad no encontrada.');
        END IF;
        COMMIT;
    EXCEPTION
        WHEN e_fk_violation THEN
            RAISE_APPLICATION_ERROR(-20100, 'No se puede eliminar la facultad porque tiene carreras asociadas.');
    END;
END pkg_mant_facultades;
/

CREATE OR REPLACE PACKAGE pkg_mant_carreras AS
    PROCEDURE listar(p_cursor OUT SYS_REFCURSOR);
    PROCEDURE obtener(p_id IN NUMBER, p_cursor OUT SYS_REFCURSOR);
    PROCEDURE crear(p_id_facultad IN NUMBER, p_nombre IN VARCHAR2, p_id_out OUT NUMBER);
    PROCEDURE actualizar(p_id IN NUMBER, p_id_facultad IN NUMBER, p_nombre IN VARCHAR2);
    PROCEDURE eliminar(p_id IN NUMBER);
END pkg_mant_carreras;
/

CREATE OR REPLACE PACKAGE BODY pkg_mant_carreras AS
    e_fk_violation EXCEPTION;
    PRAGMA EXCEPTION_INIT(e_fk_violation, -2292);

    PROCEDURE listar(p_cursor OUT SYS_REFCURSOR) IS
    BEGIN
        OPEN p_cursor FOR
            SELECT c.id_carrera, c.id_facultad, f.nombre_facultad, f.siglas, c.nombre_carrera
              FROM carreras c
              JOIN facultades f ON f.id_facultad = c.id_facultad
             ORDER BY f.nombre_facultad, c.nombre_carrera;
    END;

    PROCEDURE obtener(p_id IN NUMBER, p_cursor OUT SYS_REFCURSOR) IS
    BEGIN
        OPEN p_cursor FOR
            SELECT c.id_carrera, c.id_facultad, f.nombre_facultad, c.nombre_carrera
              FROM carreras c
              JOIN facultades f ON f.id_facultad = c.id_facultad
             WHERE c.id_carrera = p_id;
    END;

    PROCEDURE crear(p_id_facultad IN NUMBER, p_nombre IN VARCHAR2, p_id_out OUT NUMBER) IS
    BEGIN
        p_id_out := seq_carreras.NEXTVAL;
        INSERT INTO carreras (id_carrera, id_facultad, nombre_carrera)
        VALUES (p_id_out, p_id_facultad, TRIM(p_nombre));
        COMMIT;
    END;

    PROCEDURE actualizar(p_id IN NUMBER, p_id_facultad IN NUMBER, p_nombre IN VARCHAR2) IS
    BEGIN
        UPDATE carreras
           SET id_facultad    = p_id_facultad,
               nombre_carrera = TRIM(p_nombre)
         WHERE id_carrera = p_id;
        IF SQL%ROWCOUNT = 0 THEN
            RAISE_APPLICATION_ERROR(-20102, 'Carrera no encontrada.');
        END IF;
        COMMIT;
    END;

    PROCEDURE eliminar(p_id IN NUMBER) IS
    BEGIN
        DELETE FROM carreras WHERE id_carrera = p_id;
        IF SQL%ROWCOUNT = 0 THEN
            RAISE_APPLICATION_ERROR(-20102, 'Carrera no encontrada.');
        END IF;
        COMMIT;
    EXCEPTION
        WHEN e_fk_violation THEN
            RAISE_APPLICATION_ERROR(-20100, 'No se puede eliminar la carrera porque tiene estudiantes Staff asociados.');
    END;
END pkg_mant_carreras;
/

CREATE OR REPLACE PACKAGE pkg_mant_regiones AS
    PROCEDURE listar(p_cursor OUT SYS_REFCURSOR);
    PROCEDURE obtener(p_id IN NUMBER, p_cursor OUT SYS_REFCURSOR);
    PROCEDURE crear(p_nombre IN VARCHAR2, p_codigo_romano IN VARCHAR2, p_id_out OUT NUMBER);
    PROCEDURE actualizar(p_id IN NUMBER, p_nombre IN VARCHAR2, p_codigo_romano IN VARCHAR2);
    PROCEDURE eliminar(p_id IN NUMBER);
END pkg_mant_regiones;
/

CREATE OR REPLACE PACKAGE BODY pkg_mant_regiones AS
    e_fk_violation EXCEPTION;
    PRAGMA EXCEPTION_INIT(e_fk_violation, -2292);

    PROCEDURE listar(p_cursor OUT SYS_REFCURSOR) IS
    BEGIN
        OPEN p_cursor FOR
            SELECT id_region, nombre_region, codigo_romano
              FROM regiones
             ORDER BY id_region;
    END;

    PROCEDURE obtener(p_id IN NUMBER, p_cursor OUT SYS_REFCURSOR) IS
    BEGIN
        OPEN p_cursor FOR
            SELECT id_region, nombre_region, codigo_romano
              FROM regiones
             WHERE id_region = p_id;
    END;

    PROCEDURE crear(p_nombre IN VARCHAR2, p_codigo_romano IN VARCHAR2, p_id_out OUT NUMBER) IS
    BEGIN
        p_id_out := seq_regiones.NEXTVAL;
        INSERT INTO regiones (id_region, nombre_region, codigo_romano)
        VALUES (p_id_out, TRIM(p_nombre), UPPER(TRIM(p_codigo_romano)));
        COMMIT;
    END;

    PROCEDURE actualizar(p_id IN NUMBER, p_nombre IN VARCHAR2, p_codigo_romano IN VARCHAR2) IS
    BEGIN
        UPDATE regiones
           SET nombre_region = TRIM(p_nombre),
               codigo_romano = UPPER(TRIM(p_codigo_romano))
         WHERE id_region = p_id;
        IF SQL%ROWCOUNT = 0 THEN
            RAISE_APPLICATION_ERROR(-20103, 'Región no encontrada.');
        END IF;
        COMMIT;
    END;

    PROCEDURE eliminar(p_id IN NUMBER) IS
    BEGIN
        DELETE FROM regiones WHERE id_region = p_id;
        IF SQL%ROWCOUNT = 0 THEN
            RAISE_APPLICATION_ERROR(-20103, 'Región no encontrada.');
        END IF;
        COMMIT;
    EXCEPTION
        WHEN e_fk_violation THEN
            RAISE_APPLICATION_ERROR(-20100, 'No se puede eliminar la región porque tiene ciudades asociadas.');
    END;
END pkg_mant_regiones;
/

CREATE OR REPLACE PACKAGE pkg_mant_ciudades AS
    PROCEDURE listar(p_cursor OUT SYS_REFCURSOR);
    PROCEDURE obtener(p_id IN NUMBER, p_cursor OUT SYS_REFCURSOR);
    PROCEDURE crear(p_id_region IN NUMBER, p_nombre IN VARCHAR2, p_id_out OUT NUMBER);
    PROCEDURE actualizar(p_id IN NUMBER, p_id_region IN NUMBER, p_nombre IN VARCHAR2);
    PROCEDURE eliminar(p_id IN NUMBER);
END pkg_mant_ciudades;
/

CREATE OR REPLACE PACKAGE BODY pkg_mant_ciudades AS
    e_fk_violation EXCEPTION;
    PRAGMA EXCEPTION_INIT(e_fk_violation, -2292);

    PROCEDURE listar(p_cursor OUT SYS_REFCURSOR) IS
    BEGIN
        OPEN p_cursor FOR
            SELECT c.id_ciudad, c.id_region, r.nombre_region, r.codigo_romano, c.nombre_ciudad
              FROM ciudades c
              JOIN regiones r ON r.id_region = c.id_region
             ORDER BY r.id_region, c.nombre_ciudad;
    END;

    PROCEDURE obtener(p_id IN NUMBER, p_cursor OUT SYS_REFCURSOR) IS
    BEGIN
        OPEN p_cursor FOR
            SELECT c.id_ciudad, c.id_region, r.nombre_region, c.nombre_ciudad
              FROM ciudades c
              JOIN regiones r ON r.id_region = c.id_region
             WHERE c.id_ciudad = p_id;
    END;

    PROCEDURE crear(p_id_region IN NUMBER, p_nombre IN VARCHAR2, p_id_out OUT NUMBER) IS
    BEGIN
        p_id_out := seq_ciudades.NEXTVAL;
        INSERT INTO ciudades (id_ciudad, id_region, nombre_ciudad)
        VALUES (p_id_out, p_id_region, TRIM(p_nombre));
        COMMIT;
    END;

    PROCEDURE actualizar(p_id IN NUMBER, p_id_region IN NUMBER, p_nombre IN VARCHAR2) IS
    BEGIN
        UPDATE ciudades
           SET id_region     = p_id_region,
               nombre_ciudad = TRIM(p_nombre)
         WHERE id_ciudad = p_id;
        IF SQL%ROWCOUNT = 0 THEN
            RAISE_APPLICATION_ERROR(-20104, 'Ciudad no encontrada.');
        END IF;
        COMMIT;
    END;

    PROCEDURE eliminar(p_id IN NUMBER) IS
    BEGIN
        DELETE FROM ciudades WHERE id_ciudad = p_id;
        IF SQL%ROWCOUNT = 0 THEN
            RAISE_APPLICATION_ERROR(-20104, 'Ciudad no encontrada.');
        END IF;
        COMMIT;
    EXCEPTION
        WHEN e_fk_violation THEN
            RAISE_APPLICATION_ERROR(-20100, 'No se puede eliminar la ciudad porque tiene ubicaciones asociadas.');
    END;
END pkg_mant_ciudades;
/

CREATE OR REPLACE PACKAGE pkg_mant_ubicaciones AS
    PROCEDURE listar(p_cursor OUT SYS_REFCURSOR);
    PROCEDURE obtener(p_id IN NUMBER, p_cursor OUT SYS_REFCURSOR);
    PROCEDURE crear(
        p_id_ciudad       IN NUMBER,
        p_nombre_lugar    IN VARCHAR2,
        p_direccion       IN VARCHAR2,
        p_url_google_maps IN VARCHAR2,
        p_id_out          OUT NUMBER
    );
    PROCEDURE actualizar(
        p_id              IN NUMBER,
        p_id_ciudad       IN NUMBER,
        p_nombre_lugar    IN VARCHAR2,
        p_direccion       IN VARCHAR2,
        p_url_google_maps IN VARCHAR2
    );
    PROCEDURE eliminar(p_id IN NUMBER);
END pkg_mant_ubicaciones;
/

CREATE OR REPLACE PACKAGE BODY pkg_mant_ubicaciones AS
    e_fk_violation EXCEPTION;
    PRAGMA EXCEPTION_INIT(e_fk_violation, -2292);

    PROCEDURE listar(p_cursor OUT SYS_REFCURSOR) IS
    BEGIN
        OPEN p_cursor FOR
            SELECT u.id_ubicacion, u.id_ciudad, c.nombre_ciudad, r.nombre_region,
                   u.nombre_lugar, u.direccion, u.url_google_maps
              FROM ubicaciones u
              JOIN ciudades c ON c.id_ciudad = u.id_ciudad
              JOIN regiones r ON r.id_region = c.id_region
             ORDER BY c.nombre_ciudad, u.nombre_lugar;
    END;

    PROCEDURE obtener(p_id IN NUMBER, p_cursor OUT SYS_REFCURSOR) IS
    BEGIN
        OPEN p_cursor FOR
            SELECT u.id_ubicacion, u.id_ciudad, c.nombre_ciudad,
                   u.nombre_lugar, u.direccion, u.url_google_maps
              FROM ubicaciones u
              JOIN ciudades c ON c.id_ciudad = u.id_ciudad
             WHERE u.id_ubicacion = p_id;
    END;

    PROCEDURE crear(
        p_id_ciudad       IN NUMBER,
        p_nombre_lugar    IN VARCHAR2,
        p_direccion       IN VARCHAR2,
        p_url_google_maps IN VARCHAR2,
        p_id_out          OUT NUMBER
    ) IS
    BEGIN
        p_id_out := seq_ubicaciones.NEXTVAL;
        INSERT INTO ubicaciones (id_ubicacion, id_ciudad, nombre_lugar, direccion, url_google_maps)
        VALUES (p_id_out, p_id_ciudad, TRIM(p_nombre_lugar), TRIM(p_direccion), TRIM(p_url_google_maps));
        COMMIT;
    END;

    PROCEDURE actualizar(
        p_id              IN NUMBER,
        p_id_ciudad       IN NUMBER,
        p_nombre_lugar    IN VARCHAR2,
        p_direccion       IN VARCHAR2,
        p_url_google_maps IN VARCHAR2
    ) IS
    BEGIN
        UPDATE ubicaciones
           SET id_ciudad       = p_id_ciudad,
               nombre_lugar    = TRIM(p_nombre_lugar),
               direccion       = TRIM(p_direccion),
               url_google_maps = TRIM(p_url_google_maps)
         WHERE id_ubicacion = p_id;
        IF SQL%ROWCOUNT = 0 THEN
            RAISE_APPLICATION_ERROR(-20105, 'Ubicación no encontrada.');
        END IF;
        COMMIT;
    END;

    PROCEDURE eliminar(p_id IN NUMBER) IS
    BEGIN
        DELETE FROM ubicaciones WHERE id_ubicacion = p_id;
        IF SQL%ROWCOUNT = 0 THEN
            RAISE_APPLICATION_ERROR(-20105, 'Ubicación no encontrada.');
        END IF;
        COMMIT;
    EXCEPTION
        WHEN e_fk_violation THEN
            RAISE_APPLICATION_ERROR(-20100, 'No se puede eliminar la ubicación porque tiene actividades programadas.');
    END;
END pkg_mant_ubicaciones;
/

CREATE OR REPLACE PACKAGE pkg_mant_tipos_act AS
    PROCEDURE listar(p_cursor OUT SYS_REFCURSOR);
    PROCEDURE obtener(p_id IN NUMBER, p_cursor OUT SYS_REFCURSOR);
    PROCEDURE crear(p_nombre_tipo IN VARCHAR2, p_color_hex IN VARCHAR2, p_id_out OUT NUMBER);
    PROCEDURE actualizar(p_id IN NUMBER, p_nombre_tipo IN VARCHAR2, p_color_hex IN VARCHAR2);
    PROCEDURE eliminar(p_id IN NUMBER);
END pkg_mant_tipos_act;
/

CREATE OR REPLACE PACKAGE BODY pkg_mant_tipos_act AS
    e_fk_violation EXCEPTION;
    PRAGMA EXCEPTION_INIT(e_fk_violation, -2292);

    PROCEDURE listar(p_cursor OUT SYS_REFCURSOR) IS
    BEGIN
        OPEN p_cursor FOR
            SELECT id_tipo_actividad, nombre_tipo, color_hex
              FROM tipos_actividad
             ORDER BY nombre_tipo;
    END;

    PROCEDURE obtener(p_id IN NUMBER, p_cursor OUT SYS_REFCURSOR) IS
    BEGIN
        OPEN p_cursor FOR
            SELECT id_tipo_actividad, nombre_tipo, color_hex
              FROM tipos_actividad
             WHERE id_tipo_actividad = p_id;
    END;

    PROCEDURE crear(p_nombre_tipo IN VARCHAR2, p_color_hex IN VARCHAR2, p_id_out OUT NUMBER) IS
    BEGIN
        p_id_out := seq_tipos_actividad.NEXTVAL;
        INSERT INTO tipos_actividad (id_tipo_actividad, nombre_tipo, color_hex)
        VALUES (p_id_out, TRIM(p_nombre_tipo), UPPER(TRIM(p_color_hex)));
        COMMIT;
    END;

    PROCEDURE actualizar(p_id IN NUMBER, p_nombre_tipo IN VARCHAR2, p_color_hex IN VARCHAR2) IS
    BEGIN
        UPDATE tipos_actividad
           SET nombre_tipo = TRIM(p_nombre_tipo),
               color_hex   = UPPER(TRIM(p_color_hex))
         WHERE id_tipo_actividad = p_id;
        IF SQL%ROWCOUNT = 0 THEN
            RAISE_APPLICATION_ERROR(-20106, 'Tipo de actividad no encontrado.');
        END IF;
        COMMIT;
    END;

    PROCEDURE eliminar(p_id IN NUMBER) IS
    BEGIN
        DELETE FROM tipos_actividad WHERE id_tipo_actividad = p_id;
        IF SQL%ROWCOUNT = 0 THEN
            RAISE_APPLICATION_ERROR(-20106, 'Tipo de actividad no encontrado.');
        END IF;
        COMMIT;
    EXCEPTION
        WHEN e_fk_violation THEN
            RAISE_APPLICATION_ERROR(-20100, 'No se puede eliminar el tipo porque tiene actividades asociadas.');
    END;
END pkg_mant_tipos_act;
/

CREATE OR REPLACE PACKAGE pkg_mant_estados_act AS
    PROCEDURE listar(p_cursor OUT SYS_REFCURSOR);
    PROCEDURE obtener(p_id IN NUMBER, p_cursor OUT SYS_REFCURSOR);
    PROCEDURE crear(p_nombre_estado IN VARCHAR2, p_descripcion IN VARCHAR2, p_id_out OUT NUMBER);
    PROCEDURE actualizar(p_id IN NUMBER, p_nombre_estado IN VARCHAR2, p_descripcion IN VARCHAR2);
    PROCEDURE eliminar(p_id IN NUMBER);
END pkg_mant_estados_act;
/

CREATE OR REPLACE PACKAGE BODY pkg_mant_estados_act AS
    e_fk_violation EXCEPTION;
    PRAGMA EXCEPTION_INIT(e_fk_violation, -2292);

    PROCEDURE listar(p_cursor OUT SYS_REFCURSOR) IS
    BEGIN
        OPEN p_cursor FOR
            SELECT id_estado_actividad, nombre_estado, descripcion
              FROM estados_actividad
             ORDER BY id_estado_actividad;
    END;

    PROCEDURE obtener(p_id IN NUMBER, p_cursor OUT SYS_REFCURSOR) IS
    BEGIN
        OPEN p_cursor FOR
            SELECT id_estado_actividad, nombre_estado, descripcion
              FROM estados_actividad
             WHERE id_estado_actividad = p_id;
    END;

    PROCEDURE crear(p_nombre_estado IN VARCHAR2, p_descripcion IN VARCHAR2, p_id_out OUT NUMBER) IS
    BEGIN
        p_id_out := seq_estados_actividad.NEXTVAL;
        INSERT INTO estados_actividad (id_estado_actividad, nombre_estado, descripcion)
        VALUES (p_id_out, UPPER(TRIM(p_nombre_estado)), TRIM(p_descripcion));
        COMMIT;
    END;

    PROCEDURE actualizar(p_id IN NUMBER, p_nombre_estado IN VARCHAR2, p_descripcion IN VARCHAR2) IS
    BEGIN
        UPDATE estados_actividad
           SET nombre_estado = UPPER(TRIM(p_nombre_estado)),
               descripcion   = TRIM(p_descripcion)
         WHERE id_estado_actividad = p_id;
        IF SQL%ROWCOUNT = 0 THEN
            RAISE_APPLICATION_ERROR(-20107, 'Estado de actividad no encontrado.');
        END IF;
        COMMIT;
    END;

    PROCEDURE eliminar(p_id IN NUMBER) IS
    BEGIN
        DELETE FROM estados_actividad WHERE id_estado_actividad = p_id;
        IF SQL%ROWCOUNT = 0 THEN
            RAISE_APPLICATION_ERROR(-20107, 'Estado de actividad no encontrado.');
        END IF;
        COMMIT;
    EXCEPTION
        WHEN e_fk_violation THEN
            RAISE_APPLICATION_ERROR(-20100, 'No se puede eliminar el estado porque hay actividades en ese estado.');
    END;
END pkg_mant_estados_act;
/

CREATE OR REPLACE PACKAGE pkg_mant_perfiles_staff AS
    PROCEDURE listar(p_cursor OUT SYS_REFCURSOR);
    PROCEDURE obtener(p_id_usuario IN NUMBER, p_cursor OUT SYS_REFCURSOR);
    PROCEDURE crear(
        p_id_usuario            IN NUMBER,
        p_id_carrera            IN NUMBER,
        p_generacion            IN NUMBER,
        p_telefono              IN VARCHAR2,
        p_estado_disponibilidad IN VARCHAR2 DEFAULT 'DISPONIBLE'
    );
    PROCEDURE actualizar(
        p_id_usuario            IN NUMBER,
        p_id_carrera            IN NUMBER,
        p_generacion            IN NUMBER,
        p_telefono              IN VARCHAR2,
        p_estado_disponibilidad IN VARCHAR2
    );
    PROCEDURE eliminar(p_id_usuario IN NUMBER);
END pkg_mant_perfiles_staff;
/

CREATE OR REPLACE PACKAGE BODY pkg_mant_perfiles_staff AS
    e_fk_violation EXCEPTION;
    PRAGMA EXCEPTION_INIT(e_fk_violation, -2292);

    PROCEDURE listar(p_cursor OUT SYS_REFCURSOR) IS
    BEGIN
        OPEN p_cursor FOR
            SELECT ps.id_usuario, u.rut, u.nombre, u.apellido, u.correo, u.foto_url, u.activo,
                   ps.id_carrera, c.nombre_carrera, f.id_facultad, f.siglas AS facultad_siglas,
                   ps.generacion, ps.telefono, ps.estado_disponibilidad
              FROM perfiles_staff ps
              JOIN usuarios u   ON u.id_usuario = ps.id_usuario
              JOIN carreras c   ON c.id_carrera = ps.id_carrera
              JOIN facultades f ON f.id_facultad = c.id_facultad
             ORDER BY u.apellido, u.nombre;
    END;

    PROCEDURE obtener(p_id_usuario IN NUMBER, p_cursor OUT SYS_REFCURSOR) IS
    BEGIN
        OPEN p_cursor FOR
            SELECT ps.id_usuario, u.rut, u.nombre, u.apellido, u.correo, u.foto_url, u.activo,
                   ps.id_carrera, c.nombre_carrera, f.nombre_facultad,
                   ps.generacion, ps.telefono, ps.estado_disponibilidad
              FROM perfiles_staff ps
              JOIN usuarios u   ON u.id_usuario = ps.id_usuario
              JOIN carreras c   ON c.id_carrera = ps.id_carrera
              JOIN facultades f ON f.id_facultad = c.id_facultad
             WHERE ps.id_usuario = p_id_usuario;
    END;

    PROCEDURE crear(
        p_id_usuario            IN NUMBER,
        p_id_carrera            IN NUMBER,
        p_generacion            IN NUMBER,
        p_telefono              IN VARCHAR2,
        p_estado_disponibilidad IN VARCHAR2 DEFAULT 'DISPONIBLE'
    ) IS
    BEGIN
        INSERT INTO perfiles_staff (id_usuario, id_carrera, generacion, telefono, estado_disponibilidad)
        VALUES (p_id_usuario, p_id_carrera, p_generacion, TRIM(p_telefono), UPPER(TRIM(p_estado_disponibilidad)));
        COMMIT;
    END;

    PROCEDURE actualizar(
        p_id_usuario            IN NUMBER,
        p_id_carrera            IN NUMBER,
        p_generacion            IN NUMBER,
        p_telefono              IN VARCHAR2,
        p_estado_disponibilidad IN VARCHAR2
    ) IS
    BEGIN
        UPDATE perfiles_staff
           SET id_carrera            = p_id_carrera,
               generacion            = p_generacion,
               telefono              = TRIM(p_telefono),
               estado_disponibilidad = UPPER(TRIM(p_estado_disponibilidad))
         WHERE id_usuario = p_id_usuario;
        IF SQL%ROWCOUNT = 0 THEN
            RAISE_APPLICATION_ERROR(-20108, 'Perfil Staff no encontrado.');
        END IF;
        COMMIT;
    END;

    PROCEDURE eliminar(p_id_usuario IN NUMBER) IS
    BEGIN
        DELETE FROM perfiles_staff WHERE id_usuario = p_id_usuario;
        IF SQL%ROWCOUNT = 0 THEN
            RAISE_APPLICATION_ERROR(-20108, 'Perfil Staff no encontrado.');
        END IF;
        COMMIT;
    EXCEPTION
        WHEN e_fk_violation THEN
            RAISE_APPLICATION_ERROR(-20100, 'No se puede eliminar el perfil porque tiene disponibilidades registradas.');
    END;
END pkg_mant_perfiles_staff;
/

CREATE OR REPLACE PACKAGE pkg_mant_disp_staff AS
    PROCEDURE listar(p_id_usuario IN NUMBER DEFAULT NULL, p_cursor OUT SYS_REFCURSOR);
    PROCEDURE obtener(p_id IN NUMBER, p_cursor OUT SYS_REFCURSOR);
    PROCEDURE crear(
        p_id_usuario       IN NUMBER,
        p_fecha_disponible IN DATE,
        p_bloque_horario   IN VARCHAR2,
        p_estado_disp      IN VARCHAR2 DEFAULT 'DISPONIBLE',
        p_id_out           OUT NUMBER
    );
    PROCEDURE actualizar(
        p_id               IN NUMBER,
        p_fecha_disponible IN DATE,
        p_bloque_horario   IN VARCHAR2,
        p_estado_disp      IN VARCHAR2
    );
    PROCEDURE eliminar(p_id IN NUMBER);
END pkg_mant_disp_staff;
/

CREATE OR REPLACE PACKAGE BODY pkg_mant_disp_staff AS
    PROCEDURE listar(p_id_usuario IN NUMBER DEFAULT NULL, p_cursor OUT SYS_REFCURSOR) IS
    BEGIN
        OPEN p_cursor FOR
            SELECT d.id_disponibilidad, d.id_usuario, u.nombre || ' ' || u.apellido AS nombre_staff,
                   d.fecha_disponible, d.bloque_horario, d.estado_disp
              FROM disponibilidad_staff d
              JOIN usuarios u ON u.id_usuario = d.id_usuario
             WHERE (p_id_usuario IS NULL OR d.id_usuario = p_id_usuario)
             ORDER BY d.fecha_disponible DESC, d.bloque_horario;
    END;

    PROCEDURE obtener(p_id IN NUMBER, p_cursor OUT SYS_REFCURSOR) IS
    BEGIN
        OPEN p_cursor FOR
            SELECT id_disponibilidad, id_usuario, fecha_disponible, bloque_horario, estado_disp
              FROM disponibilidad_staff
             WHERE id_disponibilidad = p_id;
    END;

    PROCEDURE crear(
        p_id_usuario       IN NUMBER,
        p_fecha_disponible IN DATE,
        p_bloque_horario   IN VARCHAR2,
        p_estado_disp      IN VARCHAR2 DEFAULT 'DISPONIBLE',
        p_id_out           OUT NUMBER
    ) IS
    BEGIN
        p_id_out := seq_disponibilidad_staff.NEXTVAL;
        INSERT INTO disponibilidad_staff (id_disponibilidad, id_usuario, fecha_disponible, bloque_horario, estado_disp)
        VALUES (p_id_out, p_id_usuario, TRUNC(p_fecha_disponible), UPPER(TRIM(p_bloque_horario)), UPPER(TRIM(p_estado_disp)));
        COMMIT;
    END;

    PROCEDURE actualizar(
        p_id               IN NUMBER,
        p_fecha_disponible IN DATE,
        p_bloque_horario   IN VARCHAR2,
        p_estado_disp      IN VARCHAR2
    ) IS
    BEGIN
        UPDATE disponibilidad_staff
           SET fecha_disponible = TRUNC(p_fecha_disponible),
               bloque_horario   = UPPER(TRIM(p_bloque_horario)),
               estado_disp      = UPPER(TRIM(p_estado_disp))
         WHERE id_disponibilidad = p_id;
        IF SQL%ROWCOUNT = 0 THEN
            RAISE_APPLICATION_ERROR(-20109, 'Registro de disponibilidad no encontrado.');
        END IF;
        COMMIT;
    END;

    PROCEDURE eliminar(p_id IN NUMBER) IS
    BEGIN
        DELETE FROM disponibilidad_staff WHERE id_disponibilidad = p_id;
        IF SQL%ROWCOUNT = 0 THEN
            RAISE_APPLICATION_ERROR(-20109, 'Registro de disponibilidad no encontrado.');
        END IF;
        COMMIT;
    END;
END pkg_mant_disp_staff;
/

CREATE OR REPLACE PACKAGE pkg_mant_actividades AS
    PROCEDURE listar(p_cursor OUT SYS_REFCURSOR);
    PROCEDURE obtener(p_id IN NUMBER, p_cursor OUT SYS_REFCURSOR);
    PROCEDURE crear(
        p_titulo                   IN VARCHAR2,
        p_descripcion              IN VARCHAR2,
        p_id_tipo_actividad        IN NUMBER,
        p_id_ubicacion             IN NUMBER,
        p_id_estado_actividad      IN NUMBER,
        p_fecha_actividad          IN DATE,
        p_hora_inicio              IN VARCHAR2,
        p_cantidad_horas           IN NUMBER,
        p_cupos_maximos            IN NUMBER,
        p_fecha_pub_programada     IN TIMESTAMP,
        p_id_admin_creador         IN NUMBER,
        p_horas_cierre_postulacion IN NUMBER DEFAULT 10,
        p_id_out                   OUT NUMBER
    );
    PROCEDURE actualizar(
        p_id                       IN NUMBER,
        p_titulo                   IN VARCHAR2,
        p_descripcion              IN VARCHAR2,
        p_id_tipo_actividad        IN NUMBER,
        p_id_ubicacion             IN NUMBER,
        p_id_estado_actividad      IN NUMBER,
        p_fecha_actividad          IN DATE,
        p_hora_inicio              IN VARCHAR2,
        p_cantidad_horas           IN NUMBER,
        p_cupos_maximos            IN NUMBER,
        p_fecha_pub_programada     IN TIMESTAMP,
        p_horas_cierre_postulacion IN NUMBER DEFAULT 10
    );
    PROCEDURE eliminar(p_id IN NUMBER);
END pkg_mant_actividades;
/

CREATE OR REPLACE PACKAGE BODY pkg_mant_actividades AS
    e_fk_violation EXCEPTION;
    PRAGMA EXCEPTION_INIT(e_fk_violation, -2292);

    PROCEDURE listar(p_cursor OUT SYS_REFCURSOR) IS
    BEGIN
        OPEN p_cursor FOR
            SELECT a.id_actividad, a.titulo, a.descripcion,
                   a.id_tipo_actividad, ta.nombre_tipo, ta.color_hex,
                   a.id_ubicacion, ub.nombre_lugar, ub.direccion, ub.url_google_maps, ci.nombre_ciudad,
                   a.id_estado_actividad, ea.nombre_estado,
                   a.fecha_actividad, a.hora_inicio, a.cantidad_horas, a.cupos_maximos,
                   a.horas_cierre_postulacion,
                   TO_TIMESTAMP(TO_CHAR(a.fecha_actividad, 'YYYY-MM-DD') || ' ' || a.hora_inicio, 'YYYY-MM-DD HH24:MI')
                       - NUMTODSINTERVAL(NVL(a.horas_cierre_postulacion, 10), 'HOUR') AS fecha_cierre_postulacion,
                   a.fecha_pub_programada, a.id_admin_creador,
                   adm.nombre || ' ' || adm.apellido AS admin_creador
              FROM actividades a
              JOIN tipos_actividad ta   ON ta.id_tipo_actividad   = a.id_tipo_actividad
              JOIN ubicaciones ub       ON ub.id_ubicacion        = a.id_ubicacion
              JOIN ciudades ci          ON ci.id_ciudad           = ub.id_ciudad
              JOIN estados_actividad ea ON ea.id_estado_actividad = a.id_estado_actividad
              JOIN usuarios adm         ON adm.id_usuario         = a.id_admin_creador
             ORDER BY a.fecha_actividad DESC, a.hora_inicio;
    END;

    PROCEDURE obtener(p_id IN NUMBER, p_cursor OUT SYS_REFCURSOR) IS
    BEGIN
        OPEN p_cursor FOR
            SELECT a.id_actividad, a.titulo, a.descripcion,
                   a.id_tipo_actividad, ta.nombre_tipo, ta.color_hex,
                   a.id_ubicacion, ub.nombre_lugar, ub.direccion, ub.url_google_maps, ci.nombre_ciudad,
                   a.id_estado_actividad, ea.nombre_estado,
                   a.fecha_actividad, a.hora_inicio, a.cantidad_horas, a.cupos_maximos,
                   a.horas_cierre_postulacion,
                   TO_TIMESTAMP(TO_CHAR(a.fecha_actividad, 'YYYY-MM-DD') || ' ' || a.hora_inicio, 'YYYY-MM-DD HH24:MI')
                       - NUMTODSINTERVAL(NVL(a.horas_cierre_postulacion, 10), 'HOUR') AS fecha_cierre_postulacion,
                   a.fecha_pub_programada, a.id_admin_creador
              FROM actividades a
              JOIN tipos_actividad ta   ON ta.id_tipo_actividad   = a.id_tipo_actividad
              JOIN ubicaciones ub       ON ub.id_ubicacion        = a.id_ubicacion
              JOIN ciudades ci          ON ci.id_ciudad           = ub.id_ciudad
              JOIN estados_actividad ea ON ea.id_estado_actividad = a.id_estado_actividad
             WHERE a.id_actividad = p_id;
    END;

    PROCEDURE crear(
        p_titulo                   IN VARCHAR2,
        p_descripcion              IN VARCHAR2,
        p_id_tipo_actividad        IN NUMBER,
        p_id_ubicacion             IN NUMBER,
        p_id_estado_actividad      IN NUMBER,
        p_fecha_actividad          IN DATE,
        p_hora_inicio              IN VARCHAR2,
        p_cantidad_horas           IN NUMBER,
        p_cupos_maximos            IN NUMBER,
        p_fecha_pub_programada     IN TIMESTAMP,
        p_id_admin_creador         IN NUMBER,
        p_horas_cierre_postulacion IN NUMBER DEFAULT 10,
        p_id_out                   OUT NUMBER
    ) IS
    BEGIN
        p_id_out := seq_actividades.NEXTVAL;
        INSERT INTO actividades (
            id_actividad, titulo, descripcion, id_tipo_actividad, id_ubicacion,
            id_estado_actividad, fecha_actividad, hora_inicio, cantidad_horas,
            cupos_maximos, fecha_pub_programada, id_admin_creador, horas_cierre_postulacion
        ) VALUES (
            p_id_out, TRIM(p_titulo), TRIM(p_descripcion), p_id_tipo_actividad, p_id_ubicacion,
            p_id_estado_actividad, TRUNC(p_fecha_actividad), TRIM(p_hora_inicio), p_cantidad_horas,
            p_cupos_maximos, p_fecha_pub_programada, p_id_admin_creador, NVL(p_horas_cierre_postulacion, 10)
        );
        COMMIT;
    END;

    PROCEDURE actualizar(
        p_id                       IN NUMBER,
        p_titulo                   IN VARCHAR2,
        p_descripcion              IN VARCHAR2,
        p_id_tipo_actividad        IN NUMBER,
        p_id_ubicacion             IN NUMBER,
        p_id_estado_actividad      IN NUMBER,
        p_fecha_actividad          IN DATE,
        p_hora_inicio              IN VARCHAR2,
        p_cantidad_horas           IN NUMBER,
        p_cupos_maximos            IN NUMBER,
        p_fecha_pub_programada     IN TIMESTAMP,
        p_horas_cierre_postulacion IN NUMBER DEFAULT 10
    ) IS
        v_ocupados NUMBER;
    BEGIN
        SELECT COUNT(*) INTO v_ocupados
          FROM postulaciones
         WHERE id_actividad = p_id
           AND estado_postulacion IN ('CONFIRMADA', 'ASIGNADA');

        IF p_cupos_maximos < v_ocupados THEN
            RAISE_APPLICATION_ERROR(-20110, 'No puedes bajar los cupos por debajo de los ' || v_ocupados || ' Staff ya confirmados.');
        END IF;

        UPDATE actividades
           SET titulo                   = TRIM(p_titulo),
               descripcion              = TRIM(p_descripcion),
               id_tipo_actividad        = p_id_tipo_actividad,
               id_ubicacion             = p_id_ubicacion,
               id_estado_actividad      = p_id_estado_actividad,
               fecha_actividad          = TRUNC(p_fecha_actividad),
               hora_inicio              = TRIM(p_hora_inicio),
               cantidad_horas           = p_cantidad_horas,
               cupos_maximos            = p_cupos_maximos,
               fecha_pub_programada     = p_fecha_pub_programada,
               horas_cierre_postulacion = NVL(p_horas_cierre_postulacion, 10)
         WHERE id_actividad = p_id;

        IF SQL%ROWCOUNT = 0 THEN
            RAISE_APPLICATION_ERROR(-20111, 'Actividad no encontrada.');
        END IF;
        COMMIT;
    END;

    PROCEDURE eliminar(p_id IN NUMBER) IS
    BEGIN
        DELETE FROM actividades WHERE id_actividad = p_id;
        IF SQL%ROWCOUNT = 0 THEN
            RAISE_APPLICATION_ERROR(-20111, 'Actividad no encontrada.');
        END IF;
        COMMIT;
    EXCEPTION
        WHEN e_fk_violation THEN
            RAISE_APPLICATION_ERROR(-20100, 'No se puede eliminar la actividad porque tiene postulaciones o lista de espera. Cámbiala a estado CANCELADA.');
    END;
END pkg_mant_actividades;
/

-- 6. Packages de gestión

CREATE OR REPLACE PACKAGE pkg_gest_usuarios AS
    PROCEDURE obtener_por_correo(p_correo IN VARCHAR2, p_cursor OUT SYS_REFCURSOR);
    PROCEDURE obtener_por_id(p_id_usuario IN NUMBER, p_cursor OUT SYS_REFCURSOR);
    PROCEDURE listar_roles(p_cursor OUT SYS_REFCURSOR);
    PROCEDURE listar_por_rol(p_id_rol IN NUMBER, p_cursor OUT SYS_REFCURSOR);
    PROCEDURE crear_admin(
        p_id_superadmin IN NUMBER,
        p_rut           IN VARCHAR2,
        p_correo        IN VARCHAR2,
        p_password_hash IN VARCHAR2,
        p_nombre        IN VARCHAR2,
        p_apellido      IN VARCHAR2,
        p_foto_url      IN VARCHAR2,
        p_id_out        OUT NUMBER
    );
    PROCEDURE crear_staff_completo(
        p_id_admin      IN NUMBER,
        p_rut           IN VARCHAR2,
        p_correo        IN VARCHAR2,
        p_password_hash IN VARCHAR2,
        p_nombre        IN VARCHAR2,
        p_apellido      IN VARCHAR2,
        p_foto_url      IN VARCHAR2,
        p_id_carrera    IN NUMBER,
        p_generacion    IN NUMBER,
        p_telefono      IN VARCHAR2,
        p_id_out        OUT NUMBER
    );
    PROCEDURE cambiar_clave(p_id_usuario IN NUMBER, p_nuevo_hash IN VARCHAR2);
    PROCEDURE cambiar_estado_activo(p_id_ejecutor IN NUMBER, p_id_usuario IN NUMBER, p_activo IN CHAR);
    PROCEDURE actualizar_foto(p_id_usuario IN NUMBER, p_foto_url IN VARCHAR2);
    PROCEDURE actualizar_credenciales(
        p_id_ejecutor   IN NUMBER,
        p_id_usuario    IN NUMBER,
        p_rut           IN VARCHAR2,
        p_correo        IN VARCHAR2,
        p_nombre        IN VARCHAR2,
        p_apellido      IN VARCHAR2,
        p_nuevo_hash    IN VARCHAR2 DEFAULT NULL,
        p_forzar_cambio IN CHAR     DEFAULT 'N'
    );
    PROCEDURE eliminar_staff(p_id_ejecutor IN NUMBER, p_id_usuario IN NUMBER);
    PROCEDURE eliminar_usuario(p_id_ejecutor IN NUMBER, p_id_usuario IN NUMBER);
END pkg_gest_usuarios;
/

CREATE OR REPLACE PACKAGE BODY pkg_gest_usuarios AS
    PROCEDURE obtener_por_correo(p_correo IN VARCHAR2, p_cursor OUT SYS_REFCURSOR) IS
    BEGIN
        OPEN p_cursor FOR
            SELECT u.id_usuario, u.rut, u.correo, u.password_hash, u.nombre, u.apellido,
                   u.foto_url, u.id_rol, r.nombre_rol, u.debe_cambiar_clave, u.activo,
                   u.creado_por, u.fecha_creacion
              FROM usuarios u
              JOIN roles r ON r.id_rol = u.id_rol
             WHERE u.correo = LOWER(TRIM(p_correo));
    END;

    PROCEDURE obtener_por_id(p_id_usuario IN NUMBER, p_cursor OUT SYS_REFCURSOR) IS
    BEGIN
        OPEN p_cursor FOR
            SELECT u.id_usuario, u.rut, u.correo, u.nombre, u.apellido,
                   u.foto_url, u.id_rol, r.nombre_rol, u.debe_cambiar_clave, u.activo,
                   u.creado_por, u.fecha_creacion
              FROM usuarios u
              JOIN roles r ON r.id_rol = u.id_rol
             WHERE u.id_usuario = p_id_usuario;
    END;

    PROCEDURE listar_roles(p_cursor OUT SYS_REFCURSOR) IS
    BEGIN
        OPEN p_cursor FOR
            SELECT id_rol, nombre_rol, descripcion FROM roles ORDER BY id_rol;
    END;

    PROCEDURE listar_por_rol(p_id_rol IN NUMBER, p_cursor OUT SYS_REFCURSOR) IS
    BEGIN
        OPEN p_cursor FOR
            SELECT u.id_usuario, u.rut, u.correo, u.nombre, u.apellido, u.foto_url,
                   u.id_rol, r.nombre_rol, u.debe_cambiar_clave, u.activo, u.fecha_creacion,
                   ps.id_carrera, c.nombre_carrera, f.siglas AS facultad_siglas,
                   ps.generacion, ps.telefono, ps.estado_disponibilidad
              FROM usuarios u
              JOIN roles r                ON r.id_rol      = u.id_rol
              LEFT JOIN perfiles_staff ps ON ps.id_usuario = u.id_usuario
              LEFT JOIN carreras c        ON c.id_carrera  = ps.id_carrera
              LEFT JOIN facultades f      ON f.id_facultad = c.id_facultad
             WHERE (p_id_rol IS NULL OR u.id_rol = p_id_rol)
             ORDER BY u.id_rol, u.apellido, u.nombre;
    END;

    PROCEDURE crear_admin(
        p_id_superadmin IN NUMBER,
        p_rut           IN VARCHAR2,
        p_correo        IN VARCHAR2,
        p_password_hash IN VARCHAR2,
        p_nombre        IN VARCHAR2,
        p_apellido      IN VARCHAR2,
        p_foto_url      IN VARCHAR2,
        p_id_out        OUT NUMBER
    ) IS
    BEGIN
        p_id_out := seq_usuarios.NEXTVAL;
        INSERT INTO usuarios (
            id_usuario, rut, correo, password_hash, nombre, apellido,
            foto_url, id_rol, debe_cambiar_clave, activo, creado_por
        ) VALUES (
            p_id_out, p_rut, p_correo, p_password_hash, TRIM(p_nombre), TRIM(p_apellido),
            TRIM(p_foto_url), 2, 'S', 'S', p_id_superadmin
        );
        COMMIT;
    END;

    PROCEDURE crear_staff_completo(
        p_id_admin      IN NUMBER,
        p_rut           IN VARCHAR2,
        p_correo        IN VARCHAR2,
        p_password_hash IN VARCHAR2,
        p_nombre        IN VARCHAR2,
        p_apellido      IN VARCHAR2,
        p_foto_url      IN VARCHAR2,
        p_id_carrera    IN NUMBER,
        p_generacion    IN NUMBER,
        p_telefono      IN VARCHAR2,
        p_id_out        OUT NUMBER
    ) IS
    BEGIN
        p_id_out := seq_usuarios.NEXTVAL;
        INSERT INTO usuarios (
            id_usuario, rut, correo, password_hash, nombre, apellido,
            foto_url, id_rol, debe_cambiar_clave, activo, creado_por
        ) VALUES (
            p_id_out, p_rut, p_correo, p_password_hash, TRIM(p_nombre), TRIM(p_apellido),
            TRIM(p_foto_url), 3, 'S', 'S', p_id_admin
        );

        INSERT INTO perfiles_staff (
            id_usuario, id_carrera, generacion, telefono, estado_disponibilidad
        ) VALUES (
            p_id_out, p_id_carrera, p_generacion, TRIM(p_telefono), 'DISPONIBLE'
        );
        COMMIT;
    EXCEPTION
        WHEN OTHERS THEN
            ROLLBACK;
            RAISE;
    END;

    PROCEDURE cambiar_clave(p_id_usuario IN NUMBER, p_nuevo_hash IN VARCHAR2) IS
    BEGIN
        UPDATE usuarios
           SET password_hash      = p_nuevo_hash,
               debe_cambiar_clave = 'N'
         WHERE id_usuario = p_id_usuario;
        IF SQL%ROWCOUNT = 0 THEN
            RAISE_APPLICATION_ERROR(-20201, 'Usuario no encontrado.');
        END IF;
        COMMIT;
    END;

    PROCEDURE cambiar_estado_activo(p_id_ejecutor IN NUMBER, p_id_usuario IN NUMBER, p_activo IN CHAR) IS
        v_rol_ejecutor NUMBER;
        v_rol_objetivo NUMBER;
    BEGIN
        SELECT id_rol INTO v_rol_ejecutor FROM usuarios WHERE id_usuario = p_id_ejecutor;
        SELECT id_rol INTO v_rol_objetivo FROM usuarios WHERE id_usuario = p_id_usuario;

        IF v_rol_objetivo = 2 AND v_rol_ejecutor <> 1 THEN
            RAISE_APPLICATION_ERROR(-20202, 'Solo el SUPERADMIN puede activar o desactivar cuentas ADMIN.');
        END IF;

        IF v_rol_objetivo = 3 AND v_rol_ejecutor NOT IN (1, 2) THEN
            RAISE_APPLICATION_ERROR(-20203, 'No tienes permisos para modificar el estado de un STAFF.');
        END IF;

        UPDATE usuarios
           SET activo = UPPER(p_activo)
         WHERE id_usuario = p_id_usuario;
        COMMIT;
    END;

    PROCEDURE actualizar_foto(p_id_usuario IN NUMBER, p_foto_url IN VARCHAR2) IS
    BEGIN
        UPDATE usuarios
           SET foto_url = TRIM(p_foto_url)
         WHERE id_usuario = p_id_usuario;
        IF SQL%ROWCOUNT = 0 THEN
            RAISE_APPLICATION_ERROR(-20201, 'Usuario no encontrado.');
        END IF;
        COMMIT;
    END;

    PROCEDURE actualizar_credenciales(
        p_id_ejecutor   IN NUMBER,
        p_id_usuario    IN NUMBER,
        p_rut           IN VARCHAR2,
        p_correo        IN VARCHAR2,
        p_nombre        IN VARCHAR2,
        p_apellido      IN VARCHAR2,
        p_nuevo_hash    IN VARCHAR2 DEFAULT NULL,
        p_forzar_cambio IN CHAR     DEFAULT 'N'
    ) IS
        v_rol_ejecutor NUMBER;
        v_rol_objetivo NUMBER;
    BEGIN
        SELECT id_rol INTO v_rol_ejecutor FROM usuarios WHERE id_usuario = p_id_ejecutor;
        IF v_rol_ejecutor <> 1 THEN
            RAISE_APPLICATION_ERROR(-20206, 'Solo el SUPERADMIN puede modificar credenciales de otros usuarios.');
        END IF;

        BEGIN
            SELECT id_rol INTO v_rol_objetivo FROM usuarios WHERE id_usuario = p_id_usuario;
        EXCEPTION
            WHEN NO_DATA_FOUND THEN
                RAISE_APPLICATION_ERROR(-20201, 'Usuario no encontrado.');
        END;

        IF v_rol_objetivo = 1 THEN
            RAISE_APPLICATION_ERROR(-20207, 'La cuenta SUPERADMIN no puede modificarse desde esta opción.');
        END IF;

        UPDATE usuarios
           SET rut                = UPPER(TRIM(p_rut)),
               correo             = LOWER(TRIM(p_correo)),
               nombre             = TRIM(p_nombre),
               apellido           = TRIM(p_apellido),
               password_hash      = CASE
                                        WHEN p_nuevo_hash IS NOT NULL AND LENGTH(TRIM(p_nuevo_hash)) > 0
                                        THEN p_nuevo_hash
                                        ELSE password_hash
                                    END,
               debe_cambiar_clave = UPPER(NVL(p_forzar_cambio, 'N'))
         WHERE id_usuario = p_id_usuario;

        COMMIT;
    EXCEPTION
        WHEN DUP_VAL_ON_INDEX THEN
            ROLLBACK;
            RAISE_APPLICATION_ERROR(-20208, 'El RUT o correo ingresado ya pertenece a otro usuario.');
        WHEN OTHERS THEN
            ROLLBACK;
            RAISE;
    END;

    PROCEDURE eliminar_usuario(p_id_ejecutor IN NUMBER, p_id_usuario IN NUMBER) IS
        v_rol_ejecutor    NUMBER;
        v_rol_objetivo    NUMBER;
        v_admin_reemplazo NUMBER;
        v_refs_admin      NUMBER := 0;
    BEGIN
        SELECT id_rol INTO v_rol_ejecutor FROM usuarios WHERE id_usuario = p_id_ejecutor;

        BEGIN
            SELECT id_rol INTO v_rol_objetivo FROM usuarios WHERE id_usuario = p_id_usuario;
        EXCEPTION
            WHEN NO_DATA_FOUND THEN
                RAISE_APPLICATION_ERROR(-20201, 'Usuario no encontrado.');
        END;

        IF v_rol_objetivo = 1 THEN
            RAISE_APPLICATION_ERROR(-20209, 'Operación denegada: el SUPERADMIN no puede ser eliminado.');
        END IF;

        IF v_rol_objetivo = 2 AND v_rol_ejecutor <> 1 THEN
            RAISE_APPLICATION_ERROR(-20210, 'Solo el SUPERADMIN puede eliminar cuentas de Administradores.');
        END IF;

        IF v_rol_objetivo = 3 AND v_rol_ejecutor NOT IN (1, 2) THEN
            RAISE_APPLICATION_ERROR(-20204, 'No tienes permisos para eliminar cuentas Staff.');
        END IF;

        UPDATE auditoria_sistema
           SET id_usuario_ejecutor = NULL
         WHERE id_usuario_ejecutor = p_id_usuario;

        IF v_rol_objetivo = 3 THEN
            DELETE FROM registro_trabajo
             WHERE id_postulacion IN (
                 SELECT id_postulacion FROM postulaciones WHERE id_usuario = p_id_usuario
             );
            DELETE FROM postulaciones        WHERE id_usuario = p_id_usuario;
            DELETE FROM lista_espera         WHERE id_usuario = p_id_usuario;
            DELETE FROM disponibilidad_staff WHERE id_usuario = p_id_usuario;
            DELETE FROM perfiles_staff       WHERE id_usuario = p_id_usuario;
            DELETE FROM usuarios             WHERE id_usuario = p_id_usuario;
        ELSE
            SELECT (SELECT COUNT(*) FROM actividades      WHERE id_admin_creador = p_id_usuario)
                 + (SELECT COUNT(*) FROM registro_trabajo WHERE validado_por     = p_id_usuario)
                 + (SELECT COUNT(*) FROM usuarios         WHERE creado_por       = p_id_usuario)
              INTO v_refs_admin
              FROM dual;

            IF v_refs_admin > 0 THEN
                BEGIN
                    SELECT id_usuario
                      INTO v_admin_reemplazo
                      FROM usuarios
                     WHERE id_rol = 2
                       AND activo = 'S'
                       AND id_usuario <> p_id_usuario
                       AND ROWNUM = 1;
                EXCEPTION
                    WHEN NO_DATA_FOUND THEN
                        RAISE_APPLICATION_ERROR(
                            -20211,
                            'No se puede eliminar al único Admin activo mientras tenga actividades, validaciones o Staff asociados. Crea otro Admin primero o desactívalo.'
                        );
                END;

                UPDATE actividades      SET id_admin_creador = v_admin_reemplazo WHERE id_admin_creador = p_id_usuario;
                UPDATE registro_trabajo SET validado_por     = v_admin_reemplazo WHERE validado_por     = p_id_usuario;
                UPDATE usuarios         SET creado_por       = v_admin_reemplazo WHERE creado_por       = p_id_usuario;
            END IF;

            UPDATE postulaciones SET asignado_por = NULL WHERE asignado_por = p_id_usuario;
            UPDATE lista_espera  SET resuelto_por = NULL WHERE resuelto_por = p_id_usuario;

            DELETE FROM usuarios WHERE id_usuario = p_id_usuario;
        END IF;

        COMMIT;
    EXCEPTION
        WHEN OTHERS THEN
            ROLLBACK;
            RAISE;
    END;

    PROCEDURE eliminar_staff(p_id_ejecutor IN NUMBER, p_id_usuario IN NUMBER) IS
        v_rol_objetivo NUMBER;
    BEGIN
        SELECT id_rol INTO v_rol_objetivo FROM usuarios WHERE id_usuario = p_id_usuario;
        IF v_rol_objetivo <> 3 THEN
            RAISE_APPLICATION_ERROR(-20205, 'Solo se pueden eliminar definitivamente cuentas con rol STAFF.');
        END IF;
        eliminar_usuario(p_id_ejecutor, p_id_usuario);
    EXCEPTION
        WHEN NO_DATA_FOUND THEN
            RAISE_APPLICATION_ERROR(-20201, 'El estudiante Staff no existe.');
    END;
END pkg_gest_usuarios;
/

CREATE OR REPLACE PACKAGE pkg_gest_actividades AS
    FUNCTION fn_cupos_disponibles(p_id_actividad IN NUMBER) RETURN NUMBER;
    PROCEDURE publicar_actividad(p_id_actividad IN NUMBER, p_id_admin IN NUMBER);
    PROCEDURE programar_publicacion(p_id_actividad IN NUMBER, p_fecha_pub IN TIMESTAMP, p_id_admin IN NUMBER);
    PROCEDURE activar_programadas(p_activadas_out OUT NUMBER);
    PROCEDURE cambiar_estado(p_id_actividad IN NUMBER, p_nombre_estado IN VARCHAR2, p_id_admin IN NUMBER);
    PROCEDURE listar_calendario(
        p_mes             IN NUMBER DEFAULT NULL,
        p_anio            IN NUMBER DEFAULT NULL,
        p_solo_publicadas IN CHAR   DEFAULT 'N',
        p_id_usuario      IN NUMBER DEFAULT NULL,
        p_cursor          OUT SYS_REFCURSOR
    );
END pkg_gest_actividades;
/

CREATE OR REPLACE PACKAGE BODY pkg_gest_actividades AS
    FUNCTION fn_cupos_disponibles(p_id_actividad IN NUMBER) RETURN NUMBER IS
        v_max      NUMBER := 0;
        v_ocupados NUMBER := 0;
    BEGIN
        SELECT cupos_maximos INTO v_max FROM actividades WHERE id_actividad = p_id_actividad;
        SELECT COUNT(*) INTO v_ocupados
          FROM postulaciones
         WHERE id_actividad = p_id_actividad
           AND estado_postulacion IN ('CONFIRMADA', 'ASIGNADA');
        RETURN GREATEST(v_max - v_ocupados, 0);
    EXCEPTION
        WHEN NO_DATA_FOUND THEN
            RETURN 0;
    END;

    PROCEDURE cambiar_estado(p_id_actividad IN NUMBER, p_nombre_estado IN VARCHAR2, p_id_admin IN NUMBER) IS
        v_rol       NUMBER;
        v_id_estado NUMBER;
    BEGIN
        SELECT id_rol INTO v_rol FROM usuarios WHERE id_usuario = p_id_admin;
        IF v_rol <> 2 THEN
            RAISE_APPLICATION_ERROR(-20210, 'Solo un ADMIN puede cambiar el estado de una actividad.');
        END IF;

        SELECT id_estado_actividad INTO v_id_estado
          FROM estados_actividad
         WHERE UPPER(nombre_estado) = UPPER(TRIM(p_nombre_estado));

        UPDATE actividades
           SET id_estado_actividad = v_id_estado
         WHERE id_actividad = p_id_actividad;

        IF SQL%ROWCOUNT = 0 THEN
            RAISE_APPLICATION_ERROR(-20211, 'Actividad no encontrada.');
        END IF;
        COMMIT;
    EXCEPTION
        WHEN NO_DATA_FOUND THEN
            RAISE_APPLICATION_ERROR(-20212, 'Estado de actividad o administrador no válido.');
    END;

    PROCEDURE publicar_actividad(p_id_actividad IN NUMBER, p_id_admin IN NUMBER) IS
    BEGIN
        cambiar_estado(p_id_actividad, 'PUBLICADA', p_id_admin);
    END;

    PROCEDURE programar_publicacion(p_id_actividad IN NUMBER, p_fecha_pub IN TIMESTAMP, p_id_admin IN NUMBER) IS
        v_id_estado NUMBER;
        v_rol       NUMBER;
    BEGIN
        SELECT id_rol INTO v_rol FROM usuarios WHERE id_usuario = p_id_admin;
        IF v_rol <> 2 THEN
            RAISE_APPLICATION_ERROR(-20210, 'Solo un ADMIN puede programar publicaciones.');
        END IF;

        SELECT id_estado_actividad INTO v_id_estado
          FROM estados_actividad
         WHERE UPPER(nombre_estado) = 'PROGRAMADA';

        UPDATE actividades
           SET id_estado_actividad  = v_id_estado,
               fecha_pub_programada = p_fecha_pub
         WHERE id_actividad = p_id_actividad;
        COMMIT;
    END;

    PROCEDURE activar_programadas(p_activadas_out OUT NUMBER) IS
        v_id_prog NUMBER;
        v_id_pub  NUMBER;
    BEGIN
        SELECT id_estado_actividad INTO v_id_prog FROM estados_actividad WHERE UPPER(nombre_estado) = 'PROGRAMADA';
        SELECT id_estado_actividad INTO v_id_pub  FROM estados_actividad WHERE UPPER(nombre_estado) = 'PUBLICADA';

        UPDATE actividades
           SET id_estado_actividad = v_id_pub
         WHERE id_estado_actividad = v_id_prog
           AND fecha_pub_programada IS NOT NULL
           AND fecha_pub_programada <= CAST(SYSTIMESTAMP AT TIME ZONE 'America/Santiago' AS TIMESTAMP);

        p_activadas_out := SQL%ROWCOUNT;
        COMMIT;
    END;

    PROCEDURE listar_calendario(
        p_mes             IN NUMBER DEFAULT NULL,
        p_anio            IN NUMBER DEFAULT NULL,
        p_solo_publicadas IN CHAR   DEFAULT 'N',
        p_id_usuario      IN NUMBER DEFAULT NULL,
        p_cursor          OUT SYS_REFCURSOR
    ) IS
    BEGIN
        OPEN p_cursor FOR
            SELECT a.id_actividad, a.titulo, a.descripcion,
                   a.fecha_actividad, a.hora_inicio, a.cantidad_horas, a.cupos_maximos,
                   a.horas_cierre_postulacion,
                   TO_TIMESTAMP(TO_CHAR(a.fecha_actividad, 'YYYY-MM-DD') || ' ' || a.hora_inicio, 'YYYY-MM-DD HH24:MI')
                       - NUMTODSINTERVAL(NVL(a.horas_cierre_postulacion, 10), 'HOUR') AS fecha_cierre_postulacion,
                   CASE
                       WHEN CAST(SYSTIMESTAMP AT TIME ZONE 'America/Santiago' AS TIMESTAMP) >=
                            (TO_TIMESTAMP(TO_CHAR(a.fecha_actividad, 'YYYY-MM-DD') || ' ' || a.hora_inicio, 'YYYY-MM-DD HH24:MI')
                             - NUMTODSINTERVAL(NVL(a.horas_cierre_postulacion, 10), 'HOUR'))
                       THEN 'S'
                       ELSE 'N'
                   END AS postulacion_cerrada,
                   a.fecha_pub_programada,
                   ta.id_tipo_actividad, ta.nombre_tipo, ta.color_hex,
                   ea.id_estado_actividad, ea.nombre_estado,
                   ub.id_ubicacion, ub.nombre_lugar, ub.direccion, ub.url_google_maps,
                   ci.nombre_ciudad,
                   (SELECT COUNT(*) FROM postulaciones p
                     WHERE p.id_actividad = a.id_actividad
                       AND p.estado_postulacion IN ('CONFIRMADA', 'ASIGNADA')) AS cupos_ocupados,
                   fn_cupos_disponibles(a.id_actividad) AS cupos_disponibles,
                   (SELECT COUNT(*) FROM lista_espera l
                     WHERE l.id_actividad = a.id_actividad
                       AND l.estado_espera = 'PENDIENTE') AS total_en_espera,
                   (SELECT MAX(p.estado_postulacion) FROM postulaciones p
                     WHERE p.id_actividad = a.id_actividad
                       AND p.id_usuario = p_id_usuario) AS mi_estado_postulacion,
                   (SELECT MAX(l.estado_espera) FROM lista_espera l
                     WHERE l.id_actividad = a.id_actividad
                       AND l.id_usuario = p_id_usuario) AS mi_estado_espera
              FROM actividades a
              JOIN tipos_actividad ta   ON ta.id_tipo_actividad   = a.id_tipo_actividad
              JOIN estados_actividad ea ON ea.id_estado_actividad = a.id_estado_actividad
              JOIN ubicaciones ub       ON ub.id_ubicacion        = a.id_ubicacion
              JOIN ciudades ci          ON ci.id_ciudad           = ub.id_ciudad
             WHERE (p_mes  IS NULL OR EXTRACT(MONTH FROM a.fecha_actividad) = p_mes)
               AND (p_anio IS NULL OR EXTRACT(YEAR  FROM a.fecha_actividad) = p_anio)
               AND (UPPER(p_solo_publicadas) <> 'S' OR UPPER(ea.nombre_estado) IN ('PUBLICADA', 'EN_CURSO'))
             ORDER BY a.fecha_actividad ASC, a.hora_inicio ASC;
    END;
END pkg_gest_actividades;
/

CREATE OR REPLACE PACKAGE pkg_gest_postulaciones AS
    PROCEDURE postular_staff(
        p_id_actividad  IN NUMBER,
        p_id_usuario    IN NUMBER,
        p_resultado_out OUT VARCHAR2,
        p_id_out        OUT NUMBER
    );
    PROCEDURE asignar_staff_manual(
        p_id_actividad IN NUMBER,
        p_id_usuario   IN NUMBER,
        p_id_admin     IN NUMBER,
        p_id_out       OUT NUMBER
    );
    PROCEDURE cancelar_postulacion(p_id_postulacion IN NUMBER, p_id_solicitante IN NUMBER);
    PROCEDURE listar_por_actividad(p_id_actividad IN NUMBER, p_cursor OUT SYS_REFCURSOR);
    PROCEDURE listar_por_usuario(p_id_usuario IN NUMBER, p_cursor OUT SYS_REFCURSOR);
END pkg_gest_postulaciones;
/

CREATE OR REPLACE PACKAGE BODY pkg_gest_postulaciones AS
    PROCEDURE postular_staff(
        p_id_actividad  IN NUMBER,
        p_id_usuario    IN NUMBER,
        p_resultado_out OUT VARCHAR2,
        p_id_out        OUT NUMBER
    ) IS
        v_cupos_max    NUMBER;
        v_ocupados     NUMBER;
        v_nom_estado   VARCHAR2(30);
        v_fecha_act    DATE;
        v_hora_inicio  VARCHAR2(5);
        v_horas_cierre NUMBER;
        v_fecha_cierre TIMESTAMP;
        v_ahora_chile  TIMESTAMP;
        v_post_id      NUMBER;
        v_post_estado  VARCHAR2(20);
        v_esp_id       NUMBER;
        v_esp_estado   VARCHAR2(20);
    BEGIN
        SELECT a.cupos_maximos, ea.nombre_estado, a.fecha_actividad, a.hora_inicio,
               NVL(a.horas_cierre_postulacion, 10)
          INTO v_cupos_max, v_nom_estado, v_fecha_act, v_hora_inicio, v_horas_cierre
          FROM actividades a
          JOIN estados_actividad ea ON ea.id_estado_actividad = a.id_estado_actividad
         WHERE a.id_actividad = p_id_actividad
           FOR UPDATE OF a.cupos_maximos;

        IF UPPER(v_nom_estado) <> 'PUBLICADA' THEN
            RAISE_APPLICATION_ERROR(-20220, 'La actividad no se encuentra PUBLICADA para postulación.');
        END IF;

        v_ahora_chile  := CAST(SYSTIMESTAMP AT TIME ZONE 'America/Santiago' AS TIMESTAMP);
        v_fecha_cierre := TO_TIMESTAMP(TO_CHAR(v_fecha_act, 'YYYY-MM-DD') || ' ' || v_hora_inicio, 'YYYY-MM-DD HH24:MI')
                          - NUMTODSINTERVAL(v_horas_cierre, 'HOUR');

        IF v_ahora_chile >= v_fecha_cierre THEN
            RAISE_APPLICATION_ERROR(
                -20226,
                'Postulaciones cerradas: el plazo cerró el ' ||
                TO_CHAR(v_fecha_cierre, 'DD/MM/YYYY HH24:MI') ||
                ' (' || v_horas_cierre || 'h antes del inicio de la actividad).'
            );
        END IF;

        BEGIN
            SELECT id_postulacion, estado_postulacion
              INTO v_post_id, v_post_estado
              FROM postulaciones
             WHERE id_actividad = p_id_actividad
               AND id_usuario   = p_id_usuario;

            IF v_post_estado IN ('CONFIRMADA', 'ASIGNADA') THEN
                RAISE_APPLICATION_ERROR(-20221, 'Ya te encuentras inscrito en esta actividad.');
            END IF;
        EXCEPTION
            WHEN NO_DATA_FOUND THEN
                v_post_id := NULL;
        END;

        SELECT COUNT(*) INTO v_ocupados
          FROM postulaciones
         WHERE id_actividad = p_id_actividad
           AND estado_postulacion IN ('CONFIRMADA', 'ASIGNADA');

        IF v_ocupados < v_cupos_max THEN
            IF v_post_id IS NOT NULL THEN
                UPDATE postulaciones
                   SET estado_postulacion = 'CONFIRMADA',
                       fecha_postulacion  = v_ahora_chile,
                       asignado_por       = NULL
                 WHERE id_postulacion = v_post_id;
                p_id_out := v_post_id;
            ELSE
                p_id_out := seq_postulaciones.NEXTVAL;
                INSERT INTO postulaciones (id_postulacion, id_actividad, id_usuario, estado_postulacion)
                VALUES (p_id_out, p_id_actividad, p_id_usuario, 'CONFIRMADA');
            END IF;
            p_resultado_out := 'POSTULACION_CONFIRMADA';
        ELSE
            BEGIN
                SELECT id_lista_espera, estado_espera
                  INTO v_esp_id, v_esp_estado
                  FROM lista_espera
                 WHERE id_actividad = p_id_actividad
                   AND id_usuario   = p_id_usuario;

                IF v_esp_estado = 'PENDIENTE' THEN
                    RAISE_APPLICATION_ERROR(-20222, 'Ya te encuentras en lista de espera para esta actividad.');
                END IF;

                UPDATE lista_espera
                   SET estado_espera    = 'PENDIENTE',
                       fecha_ingreso    = v_ahora_chile,
                       resuelto_por     = NULL,
                       fecha_resolucion = NULL
                 WHERE id_lista_espera = v_esp_id;
                p_id_out := v_esp_id;
            EXCEPTION
                WHEN NO_DATA_FOUND THEN
                    p_id_out := seq_lista_espera.NEXTVAL;
                    INSERT INTO lista_espera (id_lista_espera, id_actividad, id_usuario, estado_espera)
                    VALUES (p_id_out, p_id_actividad, p_id_usuario, 'PENDIENTE');
            END;
            p_resultado_out := 'INGRESADO_LISTA_ESPERA';
        END IF;

        COMMIT;
    EXCEPTION
        WHEN NO_DATA_FOUND THEN
            ROLLBACK;
            RAISE_APPLICATION_ERROR(-20223, 'Actividad no encontrada.');
        WHEN OTHERS THEN
            ROLLBACK;
            RAISE;
    END;

    PROCEDURE asignar_staff_manual(
        p_id_actividad IN NUMBER,
        p_id_usuario   IN NUMBER,
        p_id_admin     IN NUMBER,
        p_id_out       OUT NUMBER
    ) IS
        v_post_id NUMBER;
    BEGIN
        BEGIN
            SELECT id_postulacion INTO v_post_id
              FROM postulaciones
             WHERE id_actividad = p_id_actividad
               AND id_usuario   = p_id_usuario;

            UPDATE postulaciones
               SET estado_postulacion = 'ASIGNADA',
                   asignado_por       = p_id_admin,
                   fecha_postulacion  = CAST(SYSTIMESTAMP AT TIME ZONE 'America/Santiago' AS TIMESTAMP)
             WHERE id_postulacion = v_post_id;
            p_id_out := v_post_id;
        EXCEPTION
            WHEN NO_DATA_FOUND THEN
                p_id_out := seq_postulaciones.NEXTVAL;
                INSERT INTO postulaciones (id_postulacion, id_actividad, id_usuario, estado_postulacion, asignado_por)
                VALUES (p_id_out, p_id_actividad, p_id_usuario, 'ASIGNADA', p_id_admin);
        END;
        COMMIT;
    END;

    PROCEDURE cancelar_postulacion(p_id_postulacion IN NUMBER, p_id_solicitante IN NUMBER) IS
        v_rol    NUMBER;
        v_dueno  NUMBER;
        v_valido NUMBER;
    BEGIN
        SELECT id_rol INTO v_rol FROM usuarios WHERE id_usuario = p_id_solicitante;
        SELECT id_usuario INTO v_dueno FROM postulaciones WHERE id_postulacion = p_id_postulacion;

        IF v_rol = 3 AND v_dueno <> p_id_solicitante THEN
            RAISE_APPLICATION_ERROR(-20224, 'Solo puedes cancelar tus propias postulaciones.');
        END IF;

        SELECT COUNT(*) INTO v_valido FROM registro_trabajo WHERE id_postulacion = p_id_postulacion;
        IF v_valido > 0 THEN
            RAISE_APPLICATION_ERROR(-20225, 'No se puede cancelar una postulación que ya tiene registro de trabajo validado.');
        END IF;

        UPDATE postulaciones
           SET estado_postulacion = 'CANCELADA'
         WHERE id_postulacion = p_id_postulacion;
        COMMIT;
    END;

    PROCEDURE listar_por_actividad(p_id_actividad IN NUMBER, p_cursor OUT SYS_REFCURSOR) IS
    BEGIN
        OPEN p_cursor FOR
            SELECT p.id_postulacion, p.id_actividad, p.id_usuario,
                   u.rut, u.nombre, u.apellido, u.correo, u.foto_url,
                   c.nombre_carrera, ps.telefono,
                   p.estado_postulacion, p.fecha_postulacion, p.asignado_por,
                   rt.id_registro, rt.asistio, rt.horas_efectivas, rt.observaciones, rt.fecha_validacion
              FROM postulaciones p
              JOIN usuarios u             ON u.id_usuario     = p.id_usuario
              LEFT JOIN perfiles_staff ps ON ps.id_usuario    = u.id_usuario
              LEFT JOIN carreras c        ON c.id_carrera     = ps.id_carrera
              LEFT JOIN registro_trabajo rt ON rt.id_postulacion = p.id_postulacion
             WHERE p.id_actividad = p_id_actividad
             ORDER BY p.estado_postulacion, p.fecha_postulacion;
    END;

    PROCEDURE listar_por_usuario(p_id_usuario IN NUMBER, p_cursor OUT SYS_REFCURSOR) IS
    BEGIN
        OPEN p_cursor FOR
            SELECT p.id_postulacion, p.id_actividad, a.titulo, a.fecha_actividad, a.hora_inicio,
                   a.cantidad_horas, ta.nombre_tipo, ta.color_hex, ea.nombre_estado,
                   ub.nombre_lugar, ci.nombre_ciudad,
                   p.estado_postulacion, p.fecha_postulacion,
                   rt.asistio, rt.horas_efectivas, rt.observaciones
              FROM postulaciones p
              JOIN actividades a            ON a.id_actividad        = p.id_actividad
              JOIN tipos_actividad ta       ON ta.id_tipo_actividad  = a.id_tipo_actividad
              JOIN estados_actividad ea     ON ea.id_estado_actividad = a.id_estado_actividad
              JOIN ubicaciones ub           ON ub.id_ubicacion       = a.id_ubicacion
              JOIN ciudades ci              ON ci.id_ciudad          = ub.id_ciudad
              LEFT JOIN registro_trabajo rt ON rt.id_postulacion     = p.id_postulacion
             WHERE p.id_usuario = p_id_usuario
             ORDER BY a.fecha_actividad DESC, a.hora_inicio;
    END;
END pkg_gest_postulaciones;
/

CREATE OR REPLACE PACKAGE pkg_gest_lista_espera AS
    PROCEDURE listar_por_actividad(p_id_actividad IN NUMBER, p_cursor OUT SYS_REFCURSOR);
    PROCEDURE listar_pendientes(p_cursor OUT SYS_REFCURSOR);
    PROCEDURE resolver_solicitud(
        p_id_lista_espera    IN NUMBER,
        p_decision           IN VARCHAR2,
        p_id_admin           IN NUMBER,
        p_id_postulacion_out OUT NUMBER
    );
END pkg_gest_lista_espera;
/

CREATE OR REPLACE PACKAGE BODY pkg_gest_lista_espera AS
    PROCEDURE listar_por_actividad(p_id_actividad IN NUMBER, p_cursor OUT SYS_REFCURSOR) IS
    BEGIN
        OPEN p_cursor FOR
            SELECT l.id_lista_espera, l.id_actividad, l.id_usuario,
                   u.rut, u.nombre, u.apellido, u.correo, u.foto_url,
                   c.nombre_carrera, ps.telefono,
                   l.fecha_ingreso, l.estado_espera, l.resuelto_por, l.fecha_resolucion
              FROM lista_espera l
              JOIN usuarios u             ON u.id_usuario  = l.id_usuario
              LEFT JOIN perfiles_staff ps ON ps.id_usuario = u.id_usuario
              LEFT JOIN carreras c        ON c.id_carrera  = ps.id_carrera
             WHERE l.id_actividad = p_id_actividad
             ORDER BY l.fecha_ingreso ASC;
    END;

    PROCEDURE listar_pendientes(p_cursor OUT SYS_REFCURSOR) IS
    BEGIN
        OPEN p_cursor FOR
            SELECT l.id_lista_espera, l.id_actividad, a.titulo AS actividad_titulo,
                   a.fecha_actividad, a.cupos_maximos,
                   pkg_gest_actividades.fn_cupos_disponibles(a.id_actividad) AS cupos_disponibles,
                   l.id_usuario, u.nombre || ' ' || u.apellido AS nombre_staff, u.correo, u.foto_url,
                   c.nombre_carrera, l.fecha_ingreso, l.estado_espera
              FROM lista_espera l
              JOIN actividades a          ON a.id_actividad = l.id_actividad
              JOIN usuarios u             ON u.id_usuario   = l.id_usuario
              LEFT JOIN perfiles_staff ps ON ps.id_usuario  = u.id_usuario
              LEFT JOIN carreras c        ON c.id_carrera   = ps.id_carrera
             WHERE l.estado_espera = 'PENDIENTE'
             ORDER BY a.fecha_actividad ASC, l.fecha_ingreso ASC;
    END;

    PROCEDURE resolver_solicitud(
        p_id_lista_espera    IN NUMBER,
        p_decision           IN VARCHAR2,
        p_id_admin           IN NUMBER,
        p_id_postulacion_out OUT NUMBER
    ) IS
        v_id_act   NUMBER;
        v_id_usr   NUMBER;
        v_est_act  VARCHAR2(20);
        v_post_id  NUMBER;
        v_dec      VARCHAR2(20) := UPPER(TRIM(p_decision));
    BEGIN
        IF v_dec NOT IN ('ACEPTADA', 'RECHAZADA') THEN
            RAISE_APPLICATION_ERROR(-20230, 'La decisión debe ser ACEPTADA o RECHAZADA.');
        END IF;

        SELECT id_actividad, id_usuario, estado_espera
          INTO v_id_act, v_id_usr, v_est_act
          FROM lista_espera
         WHERE id_lista_espera = p_id_lista_espera
           FOR UPDATE;

        IF v_est_act <> 'PENDIENTE' THEN
            RAISE_APPLICATION_ERROR(-20231, 'Esta solicitud de lista de espera ya fue resuelta.');
        END IF;

        p_id_postulacion_out := NULL;

        IF v_dec = 'ACEPTADA' THEN
            BEGIN
                SELECT id_postulacion INTO v_post_id
                  FROM postulaciones
                 WHERE id_actividad = v_id_act
                   AND id_usuario   = v_id_usr;

                UPDATE postulaciones
                   SET estado_postulacion = 'ASIGNADA',
                       asignado_por       = p_id_admin,
                       fecha_postulacion  = CAST(SYSTIMESTAMP AT TIME ZONE 'America/Santiago' AS TIMESTAMP)
                 WHERE id_postulacion = v_post_id;
                p_id_postulacion_out := v_post_id;
            EXCEPTION
                WHEN NO_DATA_FOUND THEN
                    p_id_postulacion_out := seq_postulaciones.NEXTVAL;
                    INSERT INTO postulaciones (id_postulacion, id_actividad, id_usuario, estado_postulacion, asignado_por)
                    VALUES (p_id_postulacion_out, v_id_act, v_id_usr, 'ASIGNADA', p_id_admin);
            END;
        END IF;

        UPDATE lista_espera
           SET estado_espera    = v_dec,
               resuelto_por     = p_id_admin,
               fecha_resolucion = CAST(SYSTIMESTAMP AT TIME ZONE 'America/Santiago' AS TIMESTAMP)
         WHERE id_lista_espera = p_id_lista_espera;

        COMMIT;
    EXCEPTION
        WHEN NO_DATA_FOUND THEN
            ROLLBACK;
            RAISE_APPLICATION_ERROR(-20232, 'Registro de lista de espera no encontrado.');
        WHEN OTHERS THEN
            ROLLBACK;
            RAISE;
    END;
END pkg_gest_lista_espera;
/

CREATE OR REPLACE PACKAGE pkg_gest_trabajo AS
    FUNCTION fn_horas_mes_staff(p_id_usuario IN NUMBER, p_mes IN NUMBER, p_anio IN NUMBER) RETURN NUMBER;
    PROCEDURE validar_trabajo(
        p_id_postulacion  IN NUMBER,
        p_asistio         IN CHAR,
        p_horas_efectivas IN NUMBER,
        p_observaciones   IN VARCHAR2,
        p_id_admin        IN NUMBER,
        p_id_registro_out OUT NUMBER
    );
    PROCEDURE resumen_mensual_staff(
        p_id_usuario       IN NUMBER,
        p_mes              IN NUMBER,
        p_anio             IN NUMBER,
        p_horas_total_out  OUT NUMBER,
        p_asistencias_out  OUT NUMBER,
        p_cursor_detalle   OUT SYS_REFCURSOR
    );
    PROCEDURE listar_auditoria(p_limite IN NUMBER DEFAULT 100, p_cursor OUT SYS_REFCURSOR);
END pkg_gest_trabajo;
/

CREATE OR REPLACE PACKAGE BODY pkg_gest_trabajo AS
    FUNCTION fn_horas_mes_staff(p_id_usuario IN NUMBER, p_mes IN NUMBER, p_anio IN NUMBER) RETURN NUMBER IS
        v_horas NUMBER := 0;
    BEGIN
        SELECT NVL(SUM(rt.horas_efectivas), 0)
          INTO v_horas
          FROM registro_trabajo rt
          JOIN postulaciones p ON p.id_postulacion = rt.id_postulacion
          JOIN actividades a   ON a.id_actividad   = p.id_actividad
         WHERE p.id_usuario = p_id_usuario
           AND rt.asistio   = 'S'
           AND EXTRACT(MONTH FROM a.fecha_actividad) = p_mes
           AND EXTRACT(YEAR  FROM a.fecha_actividad) = p_anio;
        RETURN v_horas;
    END;

    PROCEDURE validar_trabajo(
        p_id_postulacion  IN NUMBER,
        p_asistio         IN CHAR,
        p_horas_efectivas IN NUMBER,
        p_observaciones   IN VARCHAR2,
        p_id_admin        IN NUMBER,
        p_id_registro_out OUT NUMBER
    ) IS
        v_id_reg NUMBER;
    BEGIN
        BEGIN
            SELECT id_registro INTO v_id_reg
              FROM registro_trabajo
             WHERE id_postulacion = p_id_postulacion;

            UPDATE registro_trabajo
               SET asistio          = UPPER(p_asistio),
                   horas_efectivas  = p_horas_efectivas,
                   observaciones    = TRIM(p_observaciones),
                   validado_por     = p_id_admin,
                   fecha_validacion = CAST(SYSTIMESTAMP AT TIME ZONE 'America/Santiago' AS TIMESTAMP)
             WHERE id_registro = v_id_reg;
            p_id_registro_out := v_id_reg;
        EXCEPTION
            WHEN NO_DATA_FOUND THEN
                p_id_registro_out := seq_registro_trabajo.NEXTVAL;
                INSERT INTO registro_trabajo (
                    id_registro, id_postulacion, asistio, horas_efectivas, observaciones, validado_por
                ) VALUES (
                    p_id_registro_out, p_id_postulacion, UPPER(p_asistio),
                    p_horas_efectivas, TRIM(p_observaciones), p_id_admin
                );
        END;
        COMMIT;
    END;

    PROCEDURE resumen_mensual_staff(
        p_id_usuario       IN NUMBER,
        p_mes              IN NUMBER,
        p_anio             IN NUMBER,
        p_horas_total_out  OUT NUMBER,
        p_asistencias_out  OUT NUMBER,
        p_cursor_detalle   OUT SYS_REFCURSOR
    ) IS
    BEGIN
        p_horas_total_out := fn_horas_mes_staff(p_id_usuario, p_mes, p_anio);

        SELECT COUNT(*)
          INTO p_asistencias_out
          FROM registro_trabajo rt
          JOIN postulaciones p ON p.id_postulacion = rt.id_postulacion
          JOIN actividades a   ON a.id_actividad   = p.id_actividad
         WHERE p.id_usuario = p_id_usuario
           AND rt.asistio   = 'S'
           AND EXTRACT(MONTH FROM a.fecha_actividad) = p_mes
           AND EXTRACT(YEAR  FROM a.fecha_actividad) = p_anio;

        OPEN p_cursor_detalle FOR
            SELECT rt.id_registro, a.id_actividad, a.titulo, a.fecha_actividad, a.hora_inicio,
                   ta.nombre_tipo, ta.color_hex, ub.nombre_lugar, ci.nombre_ciudad,
                   rt.asistio, rt.horas_efectivas, rt.observaciones, rt.fecha_validacion,
                   val.nombre || ' ' || val.apellido AS validado_por_nombre
              FROM registro_trabajo rt
              JOIN postulaciones p    ON p.id_postulacion    = rt.id_postulacion
              JOIN actividades a      ON a.id_actividad      = p.id_actividad
              JOIN tipos_actividad ta ON ta.id_tipo_actividad = a.id_tipo_actividad
              JOIN ubicaciones ub     ON ub.id_ubicacion     = a.id_ubicacion
              JOIN ciudades ci        ON ci.id_ciudad        = ub.id_ciudad
              JOIN usuarios val       ON val.id_usuario      = rt.validado_por
             WHERE p.id_usuario = p_id_usuario
               AND EXTRACT(MONTH FROM a.fecha_actividad) = p_mes
               AND EXTRACT(YEAR  FROM a.fecha_actividad) = p_anio
             ORDER BY a.fecha_actividad DESC;
    END;

    PROCEDURE listar_auditoria(p_limite IN NUMBER DEFAULT 100, p_cursor OUT SYS_REFCURSOR) IS
    BEGIN
        OPEN p_cursor FOR
            SELECT aud.id_auditoria, aud.tabla_afectada, aud.id_registro, aud.accion,
                   aud.detalle_cambio, aud.id_usuario_ejecutor,
                   NVL(u.nombre || ' ' || u.apellido, 'SISTEMA') AS ejecutor_nombre,
                   aud.fecha_evento
              FROM auditoria_sistema aud
              LEFT JOIN usuarios u ON u.id_usuario = aud.id_usuario_ejecutor
             ORDER BY aud.fecha_evento DESC, aud.id_auditoria DESC
             FETCH FIRST NVL(p_limite, 100) ROWS ONLY;
    END;
END pkg_gest_trabajo;
/

-- 7. Packages de reportes

CREATE OR REPLACE PACKAGE pkg_rep_horas_staff AS
    PROCEDURE rep_ranking_staff(
        p_mes    IN NUMBER DEFAULT NULL,
        p_anio   IN NUMBER DEFAULT NULL,
        p_cursor OUT SYS_REFCURSOR
    );
    PROCEDURE rep_horas_por_facultad(
        p_mes    IN NUMBER DEFAULT NULL,
        p_anio   IN NUMBER DEFAULT NULL,
        p_cursor OUT SYS_REFCURSOR
    );
END pkg_rep_horas_staff;
/

CREATE OR REPLACE PACKAGE BODY pkg_rep_horas_staff AS
    PROCEDURE rep_ranking_staff(
        p_mes    IN NUMBER DEFAULT NULL,
        p_anio   IN NUMBER DEFAULT NULL,
        p_cursor OUT SYS_REFCURSOR
    ) IS
    BEGIN
        OPEN p_cursor FOR
            SELECT u.id_usuario, u.rut, u.nombre || ' ' || u.apellido AS nombre_staff,
                   u.correo, u.foto_url, c.nombre_carrera, f.siglas AS facultad, ps.generacion,
                   COUNT(CASE WHEN a.id_actividad IS NOT NULL THEN 1 END) AS postulaciones_activas,
                   COUNT(CASE WHEN a.id_actividad IS NOT NULL AND rt.asistio = 'S' THEN 1 END) AS asistencias,
                   COUNT(CASE WHEN a.id_actividad IS NOT NULL AND rt.asistio = 'N' THEN 1 END) AS inasistencias,
                   NVL(SUM(CASE WHEN a.id_actividad IS NOT NULL AND rt.asistio = 'S' THEN rt.horas_efectivas ELSE 0 END), 0) AS horas_efectivas,
                   ROUND(
                       NVL(
                           COUNT(CASE WHEN a.id_actividad IS NOT NULL AND rt.asistio = 'S' THEN 1 END) * 100 /
                           NULLIF(COUNT(CASE WHEN a.id_actividad IS NOT NULL AND rt.id_registro IS NOT NULL THEN 1 END), 0),
                       0), 1
                   ) AS tasa_asistencia_pct
              FROM usuarios u
              JOIN perfiles_staff ps ON ps.id_usuario = u.id_usuario
              JOIN carreras c        ON c.id_carrera  = ps.id_carrera
              JOIN facultades f      ON f.id_facultad = c.id_facultad
              LEFT JOIN postulaciones p
                ON p.id_usuario = u.id_usuario
               AND p.estado_postulacion IN ('CONFIRMADA', 'ASIGNADA')
              LEFT JOIN actividades a
                ON a.id_actividad = p.id_actividad
               AND (p_mes  IS NULL OR EXTRACT(MONTH FROM a.fecha_actividad) = p_mes)
               AND (p_anio IS NULL OR EXTRACT(YEAR  FROM a.fecha_actividad) = p_anio)
              LEFT JOIN registro_trabajo rt
                ON rt.id_postulacion = p.id_postulacion
             WHERE u.id_rol = 3
             GROUP BY u.id_usuario, u.rut, u.nombre, u.apellido, u.correo, u.foto_url,
                      c.nombre_carrera, f.siglas, ps.generacion
             ORDER BY horas_efectivas DESC, asistencias DESC, nombre_staff ASC;
    END;

    PROCEDURE rep_horas_por_facultad(
        p_mes    IN NUMBER DEFAULT NULL,
        p_anio   IN NUMBER DEFAULT NULL,
        p_cursor OUT SYS_REFCURSOR
    ) IS
    BEGIN
        OPEN p_cursor FOR
            SELECT f.id_facultad, f.nombre_facultad, f.siglas,
                   COUNT(DISTINCT ps.id_usuario) AS total_staff,
                   COUNT(CASE WHEN a.id_actividad IS NOT NULL AND rt.asistio = 'S' THEN 1 END) AS total_asistencias,
                   NVL(SUM(CASE WHEN a.id_actividad IS NOT NULL AND rt.asistio = 'S' THEN rt.horas_efectivas ELSE 0 END), 0) AS total_horas
              FROM facultades f
              LEFT JOIN carreras c       ON c.id_facultad = f.id_facultad
              LEFT JOIN perfiles_staff ps ON ps.id_carrera = c.id_carrera
              LEFT JOIN postulaciones p
                ON p.id_usuario = ps.id_usuario
               AND p.estado_postulacion IN ('CONFIRMADA', 'ASIGNADA')
              LEFT JOIN actividades a
                ON a.id_actividad = p.id_actividad
               AND (p_mes  IS NULL OR EXTRACT(MONTH FROM a.fecha_actividad) = p_mes)
               AND (p_anio IS NULL OR EXTRACT(YEAR  FROM a.fecha_actividad) = p_anio)
              LEFT JOIN registro_trabajo rt
                ON rt.id_postulacion = p.id_postulacion
             GROUP BY f.id_facultad, f.nombre_facultad, f.siglas
             ORDER BY total_horas DESC, f.nombre_facultad ASC;
    END;
END pkg_rep_horas_staff;
/

CREATE OR REPLACE PACKAGE pkg_rep_cobertura AS
    FUNCTION fn_tasa_ocupacion(p_id_actividad IN NUMBER) RETURN NUMBER;
    PROCEDURE rep_cobertura_actividades(
        p_mes    IN NUMBER DEFAULT NULL,
        p_anio   IN NUMBER DEFAULT NULL,
        p_cursor OUT SYS_REFCURSOR
    );
    PROCEDURE rep_demanda_por_tipo(
        p_anio   IN NUMBER DEFAULT NULL,
        p_cursor OUT SYS_REFCURSOR
    );
END pkg_rep_cobertura;
/

CREATE OR REPLACE PACKAGE BODY pkg_rep_cobertura AS
    FUNCTION fn_tasa_ocupacion(p_id_actividad IN NUMBER) RETURN NUMBER IS
        v_max      NUMBER;
        v_ocupados NUMBER;
    BEGIN
        SELECT cupos_maximos INTO v_max FROM actividades WHERE id_actividad = p_id_actividad;
        SELECT COUNT(*) INTO v_ocupados
          FROM postulaciones
         WHERE id_actividad = p_id_actividad
           AND estado_postulacion IN ('CONFIRMADA', 'ASIGNADA');
        RETURN ROUND(NVL(v_ocupados * 100 / NULLIF(v_max, 0), 0), 1);
    EXCEPTION
        WHEN NO_DATA_FOUND THEN
            RETURN 0;
    END;

    PROCEDURE rep_cobertura_actividades(
        p_mes    IN NUMBER DEFAULT NULL,
        p_anio   IN NUMBER DEFAULT NULL,
        p_cursor OUT SYS_REFCURSOR
    ) IS
    BEGIN
        OPEN p_cursor FOR
            SELECT a.id_actividad, a.titulo, a.fecha_actividad, a.hora_inicio, a.cantidad_horas,
                   ta.nombre_tipo, ta.color_hex, ea.nombre_estado,
                   ub.nombre_lugar, ci.nombre_ciudad,
                   a.cupos_maximos,
                   (SELECT COUNT(*) FROM postulaciones p
                     WHERE p.id_actividad = a.id_actividad
                       AND p.estado_postulacion IN ('CONFIRMADA', 'ASIGNADA')) AS cupos_ocupados,
                   (SELECT COUNT(*) FROM lista_espera l
                     WHERE l.id_actividad = a.id_actividad
                       AND l.estado_espera = 'PENDIENTE') AS demanda_en_espera,
                   fn_tasa_ocupacion(a.id_actividad) AS tasa_ocupacion_pct
              FROM actividades a
              JOIN tipos_actividad ta   ON ta.id_tipo_actividad   = a.id_tipo_actividad
              JOIN estados_actividad ea ON ea.id_estado_actividad = a.id_estado_actividad
              JOIN ubicaciones ub       ON ub.id_ubicacion        = a.id_ubicacion
              JOIN ciudades ci          ON ci.id_ciudad           = ub.id_ciudad
             WHERE (p_mes  IS NULL OR EXTRACT(MONTH FROM a.fecha_actividad) = p_mes)
               AND (p_anio IS NULL OR EXTRACT(YEAR  FROM a.fecha_actividad) = p_anio)
             ORDER BY a.fecha_actividad DESC, tasa_ocupacion_pct DESC;
    END;

    PROCEDURE rep_demanda_por_tipo(
        p_anio   IN NUMBER DEFAULT NULL,
        p_cursor OUT SYS_REFCURSOR
    ) IS
    BEGIN
        OPEN p_cursor FOR
            SELECT ta.id_tipo_actividad, ta.nombre_tipo, ta.color_hex,
                   COUNT(a.id_actividad) AS total_actividades,
                   NVL(SUM(a.cupos_maximos), 0) AS total_cupos_ofertados,
                   NVL(SUM(
                       (SELECT COUNT(*) FROM postulaciones p
                         WHERE p.id_actividad = a.id_actividad
                           AND p.estado_postulacion IN ('CONFIRMADA', 'ASIGNADA'))
                   ), 0) AS total_cupos_ocupados,
                   NVL(SUM(
                       (SELECT COUNT(*) FROM lista_espera l
                         WHERE l.id_actividad = a.id_actividad)
                   ), 0) AS total_lista_espera,
                   ROUND(
                       NVL(
                           SUM((SELECT COUNT(*) FROM postulaciones p
                                 WHERE p.id_actividad = a.id_actividad
                                   AND p.estado_postulacion IN ('CONFIRMADA', 'ASIGNADA'))) * 100 /
                           NULLIF(SUM(a.cupos_maximos), 0),
                       0), 1
                   ) AS ocupacion_promedio_pct
              FROM tipos_actividad ta
              LEFT JOIN actividades a
                ON a.id_tipo_actividad = ta.id_tipo_actividad
               AND (p_anio IS NULL OR EXTRACT(YEAR FROM a.fecha_actividad) = p_anio)
             GROUP BY ta.id_tipo_actividad, ta.nombre_tipo, ta.color_hex
             ORDER BY total_actividades DESC, ta.nombre_tipo ASC;
    END;
END pkg_rep_cobertura;
/

CREATE OR REPLACE PACKAGE pkg_rep_ejecutivo AS
    PROCEDURE rep_kpis_generales(
        p_mes    IN NUMBER DEFAULT NULL,
        p_anio   IN NUMBER DEFAULT NULL,
        p_cursor OUT SYS_REFCURSOR
    );
    PROCEDURE rep_tendencia_mensual(
        p_anio   IN NUMBER,
        p_cursor OUT SYS_REFCURSOR
    );
END pkg_rep_ejecutivo;
/

CREATE OR REPLACE PACKAGE BODY pkg_rep_ejecutivo AS
    PROCEDURE rep_kpis_generales(
        p_mes    IN NUMBER DEFAULT NULL,
        p_anio   IN NUMBER DEFAULT NULL,
        p_cursor OUT SYS_REFCURSOR
    ) IS
    BEGIN
        OPEN p_cursor FOR
            SELECT
                (SELECT COUNT(*) FROM usuarios WHERE id_rol = 3 AND activo = 'S') AS staff_activos,
                (SELECT COUNT(*) FROM usuarios WHERE id_rol = 2 AND activo = 'S') AS admins_activos,
                (SELECT COUNT(*) FROM actividades a
                  WHERE (p_mes  IS NULL OR EXTRACT(MONTH FROM a.fecha_actividad) = p_mes)
                    AND (p_anio IS NULL OR EXTRACT(YEAR  FROM a.fecha_actividad) = p_anio)) AS total_actividades,
                (SELECT NVL(SUM(a.cupos_maximos), 0) FROM actividades a
                  WHERE (p_mes  IS NULL OR EXTRACT(MONTH FROM a.fecha_actividad) = p_mes)
                    AND (p_anio IS NULL OR EXTRACT(YEAR  FROM a.fecha_actividad) = p_anio)) AS cupos_totales,
                (SELECT COUNT(*) FROM postulaciones p
                   JOIN actividades a ON a.id_actividad = p.id_actividad
                  WHERE p.estado_postulacion IN ('CONFIRMADA', 'ASIGNADA')
                    AND (p_mes  IS NULL OR EXTRACT(MONTH FROM a.fecha_actividad) = p_mes)
                    AND (p_anio IS NULL OR EXTRACT(YEAR  FROM a.fecha_actividad) = p_anio)) AS cupos_ocupados,
                (SELECT COUNT(*) FROM lista_espera l
                  WHERE l.estado_espera = 'PENDIENTE') AS espera_pendiente,
                (SELECT NVL(SUM(rt.horas_efectivas), 0) FROM registro_trabajo rt
                   JOIN postulaciones p ON p.id_postulacion = rt.id_postulacion
                   JOIN actividades a   ON a.id_actividad   = p.id_actividad
                  WHERE rt.asistio = 'S'
                    AND (p_mes  IS NULL OR EXTRACT(MONTH FROM a.fecha_actividad) = p_mes)
                    AND (p_anio IS NULL OR EXTRACT(YEAR  FROM a.fecha_actividad) = p_anio)) AS horas_validadas,
                (SELECT ROUND(
                            NVL(
                                COUNT(CASE WHEN rt.asistio = 'S' THEN 1 END) * 100 /
                                NULLIF(COUNT(*), 0),
                            0), 1
                        )
                   FROM registro_trabajo rt
                   JOIN postulaciones p ON p.id_postulacion = rt.id_postulacion
                   JOIN actividades a   ON a.id_actividad   = p.id_actividad
                  WHERE (p_mes  IS NULL OR EXTRACT(MONTH FROM a.fecha_actividad) = p_mes)
                    AND (p_anio IS NULL OR EXTRACT(YEAR  FROM a.fecha_actividad) = p_anio)) AS tasa_asistencia_pct
            FROM dual;
    END;

    PROCEDURE rep_tendencia_mensual(
        p_anio   IN NUMBER,
        p_cursor OUT SYS_REFCURSOR
    ) IS
    BEGIN
        OPEN p_cursor FOR
            WITH meses AS (
                SELECT LEVEL AS mes FROM dual CONNECT BY LEVEL <= 12
            ),
            act_mes AS (
                SELECT EXTRACT(MONTH FROM fecha_actividad) AS mes,
                       COUNT(*) AS total_actividades,
                       SUM(cupos_maximos) AS total_cupos
                  FROM actividades
                 WHERE EXTRACT(YEAR FROM fecha_actividad) = p_anio
                 GROUP BY EXTRACT(MONTH FROM fecha_actividad)
            ),
            post_mes AS (
                SELECT EXTRACT(MONTH FROM a.fecha_actividad) AS mes,
                       COUNT(p.id_postulacion) AS total_postulaciones,
                       COUNT(CASE WHEN rt.asistio = 'S' THEN 1 END) AS total_asistencias,
                       NVL(SUM(CASE WHEN rt.asistio = 'S' THEN rt.horas_efectivas ELSE 0 END), 0) AS total_horas
                  FROM postulaciones p
                  JOIN actividades a ON a.id_actividad = p.id_actividad
                  LEFT JOIN registro_trabajo rt ON rt.id_postulacion = p.id_postulacion
                 WHERE EXTRACT(YEAR FROM a.fecha_actividad) = p_anio
                   AND p.estado_postulacion IN ('CONFIRMADA', 'ASIGNADA')
                 GROUP BY EXTRACT(MONTH FROM a.fecha_actividad)
            )
            SELECT m.mes,
                   NVL(am.total_actividades, 0)   AS total_actividades,
                   NVL(am.total_cupos, 0)         AS total_cupos,
                   NVL(pm.total_postulaciones, 0) AS total_postulaciones,
                   NVL(pm.total_asistencias, 0)   AS total_asistencias,
                   NVL(pm.total_horas, 0)         AS total_horas
              FROM meses m
              LEFT JOIN act_mes  am ON am.mes = m.mes
              LEFT JOIN post_mes pm ON pm.mes = m.mes
             ORDER BY m.mes ASC;
    END;
END pkg_rep_ejecutivo;
/

-- 8. Carga de datos iniciales

DECLARE
    v_hash_demo VARCHAR2(255);

    v_rol_super NUMBER;
    v_rol_admin NUMBER;
    v_rol_staff NUMBER;

    v_fac_fci   NUMBER;
    v_fac_fcs   NUMBER;
    v_fac_fcb   NUMBER;
    v_fac_facse NUMBER;
    v_fac_fce   NUMBER;
    v_fac_fmed  NUMBER;
    v_fac_facaf NUMBER;
    v_fac_fcrf  NUMBER;

    v_car_ici   NUMBER;
    v_car_ind   NUMBER;
    v_car_ele   NUMBER;
    v_car_enf   NUMBER;
    v_car_kin   NUMBER;
    v_car_pmat  NUMBER;
    v_car_ico   NUMBER;
    v_car_aud   NUMBER;
    v_car_pbas  NUMBER;
    v_car_med   NUMBER;

    v_reg_maule NUMBER;
    v_reg_ohig  NUMBER;
    v_reg_nuble NUMBER;
    v_reg_rm    NUMBER;

    v_ciu_talca  NUMBER;
    v_ciu_curico NUMBER;
    v_ciu_lin    NUMBER;
    v_ciu_const  NUMBER;
    v_ciu_ranca  NUMBER;
    v_ciu_chill  NUMBER;

    v_ub_smiguel NUMBER;
    v_ub_carmen  NUMBER;
    v_ub_ext     NUMBER;
    v_ub_trm     NUMBER;
    v_ub_plaza_t NUMBER;
    v_ub_lam     NUMBER;
    v_ub_estadio NUMBER;
    v_ub_plaza_c NUMBER;
    v_ub_linares NUMBER;

    v_tipo_feria  NUMBER;
    v_tipo_puert  NUMBER;
    v_tipo_charla NUMBER;
    v_tipo_paes   NUMBER;
    v_tipo_inst   NUMBER;
    v_tipo_induc  NUMBER;

    v_est_borr NUMBER;
    v_est_prog NUMBER;
    v_est_pub  NUMBER;
    v_est_curs NUMBER;
    v_est_fin  NUMBER;
    v_est_canc NUMBER;

    v_usr_super  NUMBER;
    v_adm_talca  NUMBER;
    v_adm_cur    NUMBER;
    v_adm_carlos NUMBER;
    v_s1 NUMBER; v_s2 NUMBER; v_s3 NUMBER; v_s4 NUMBER;

    v_act_01 NUMBER; v_act_02 NUMBER; v_act_03 NUMBER; v_act_04 NUMBER;
    v_act_05 NUMBER; v_act_06 NUMBER; v_act_07 NUMBER; v_act_08 NUMBER;
    v_act_09 NUMBER; v_act_10 NUMBER; v_act_11 NUMBER; v_act_12 NUMBER;

    v_p NUMBER;

    FUNCTION ins_post(p_act NUMBER, p_usr NUMBER, p_est VARCHAR2, p_asig NUMBER DEFAULT NULL) RETURN NUMBER IS
        v_id NUMBER := seq_postulaciones.NEXTVAL;
    BEGIN
        INSERT INTO postulaciones (id_postulacion, id_actividad, id_usuario, estado_postulacion, asignado_por)
        VALUES (v_id, p_act, p_usr, p_est, p_asig);
        RETURN v_id;
    END;

    PROCEDURE ins_reg(p_post NUMBER, p_asis CHAR, p_hrs NUMBER, p_obs VARCHAR2, p_val NUMBER) IS
    BEGIN
        INSERT INTO registro_trabajo (id_registro, id_postulacion, asistio, horas_efectivas, observaciones, validado_por)
        VALUES (seq_registro_trabajo.NEXTVAL, p_post, p_asis, p_hrs, p_obs, p_val);
    END;
BEGIN
    SELECT 'SHA256:' || LOWER(RAWTOHEX(STANDARD_HASH('Ucm2026!', 'SHA256')))
      INTO v_hash_demo
      FROM dual;

    v_rol_super := seq_roles.NEXTVAL;
    INSERT INTO roles VALUES (v_rol_super, 'SUPERADMIN', 'Control maestro de cuentas Administradoras y auditoría global');
    v_rol_admin := seq_roles.NEXTVAL;
    INSERT INTO roles VALUES (v_rol_admin, 'ADMIN', 'Gestión operativa de actividades, Staff, lista de espera y horas');
    v_rol_staff := seq_roles.NEXTVAL;
    INSERT INTO roles VALUES (v_rol_staff, 'STAFF', 'Estudiante embajador UCM con postulación y registro de horas');

    v_fac_fci   := seq_facultades.NEXTVAL; INSERT INTO facultades VALUES (v_fac_fci,   'Facultad de Ciencias de la Ingeniería',        'FCI');
    v_fac_fcs   := seq_facultades.NEXTVAL; INSERT INTO facultades VALUES (v_fac_fcs,   'Facultad de Ciencias de la Salud',             'FCS');
    v_fac_fcb   := seq_facultades.NEXTVAL; INSERT INTO facultades VALUES (v_fac_fcb,   'Facultad de Ciencias Básicas',                 'FCB');
    v_fac_facse := seq_facultades.NEXTVAL; INSERT INTO facultades VALUES (v_fac_facse, 'Facultad de Ciencias Sociales y Económicas',   'FACSE');
    v_fac_fce   := seq_facultades.NEXTVAL; INSERT INTO facultades VALUES (v_fac_fce,   'Facultad de Ciencias de la Educación',         'FCE');
    v_fac_fmed  := seq_facultades.NEXTVAL; INSERT INTO facultades VALUES (v_fac_fmed,  'Facultad de Medicina',                         'FMED');
    v_fac_facaf := seq_facultades.NEXTVAL; INSERT INTO facultades VALUES (v_fac_facaf, 'Facultad de Ciencias Agrarias y Forestales',   'FACAF');
    v_fac_fcrf  := seq_facultades.NEXTVAL; INSERT INTO facultades VALUES (v_fac_fcrf,  'Facultad de Ciencias Religiosas y Filosóficas','FCRF');

    v_car_ici  := seq_carreras.NEXTVAL; INSERT INTO carreras VALUES (v_car_ici,  v_fac_fci,   'Ingeniería Civil Informática');
    v_car_ind  := seq_carreras.NEXTVAL; INSERT INTO carreras VALUES (v_car_ind,  v_fac_fci,   'Ingeniería Civil Industrial');
    v_car_ele  := seq_carreras.NEXTVAL; INSERT INTO carreras VALUES (v_car_ele,  v_fac_fci,   'Ingeniería Civil Electrónica');
    INSERT INTO carreras VALUES (seq_carreras.NEXTVAL, v_fac_fci,   'Arquitectura');
    INSERT INTO carreras VALUES (seq_carreras.NEXTVAL, v_fac_fci,   'Construcción Civil');
    INSERT INTO carreras VALUES (seq_carreras.NEXTVAL, v_fac_fci,   'Ingeniería Civil');
    INSERT INTO carreras VALUES (seq_carreras.NEXTVAL, v_fac_fci,   'Ingeniería Ejecución en Computación e Informática');
    INSERT INTO carreras VALUES (seq_carreras.NEXTVAL, v_fac_fci,   'Ingeniería Ejecución en Geomensura');
    INSERT INTO carreras VALUES (seq_carreras.NEXTVAL, v_fac_fci,   'Ingeniería en Automatización y Control');
    INSERT INTO carreras VALUES (seq_carreras.NEXTVAL, v_fac_fci,   'Ingeniería en Construcción');
    INSERT INTO carreras VALUES (seq_carreras.NEXTVAL, v_fac_fci,   'Ingeniería en Ejecución Industrial');

    v_car_enf  := seq_carreras.NEXTVAL; INSERT INTO carreras VALUES (v_car_enf,  v_fac_fcs,   'Enfermería');
    v_car_kin  := seq_carreras.NEXTVAL; INSERT INTO carreras VALUES (v_car_kin,  v_fac_fcs,   'Kinesiología');
    INSERT INTO carreras VALUES (seq_carreras.NEXTVAL, v_fac_fcs,   'Nutrición y Dietética');
    INSERT INTO carreras VALUES (seq_carreras.NEXTVAL, v_fac_fcs,   'Obstetricia y Puericultura');
    INSERT INTO carreras VALUES (seq_carreras.NEXTVAL, v_fac_fcs,   'Psicología');
    INSERT INTO carreras VALUES (seq_carreras.NEXTVAL, v_fac_fcs,   'Tecnología Médica');
    INSERT INTO carreras VALUES (seq_carreras.NEXTVAL, v_fac_fcs,   'Terapia Ocupacional');

    v_car_pmat := seq_carreras.NEXTVAL; INSERT INTO carreras VALUES (v_car_pmat, v_fac_fcb,   'Pedagogía en Matemática y Computación');
    INSERT INTO carreras VALUES (seq_carreras.NEXTVAL, v_fac_fcb,   'Geología');
    INSERT INTO carreras VALUES (seq_carreras.NEXTVAL, v_fac_fcb,   'Ingeniería en Estadística');
    INSERT INTO carreras VALUES (seq_carreras.NEXTVAL, v_fac_fcb,   'Ingeniería Matemática');
    INSERT INTO carreras VALUES (seq_carreras.NEXTVAL, v_fac_fcb,   'Pedagogía en Ciencias con mención');

    v_car_ico  := seq_carreras.NEXTVAL; INSERT INTO carreras VALUES (v_car_ico,  v_fac_facse, 'Ingeniería Comercial');
    v_car_aud  := seq_carreras.NEXTVAL; INSERT INTO carreras VALUES (v_car_aud,  v_fac_facse, 'Contador Público y Auditor');
    INSERT INTO carreras VALUES (seq_carreras.NEXTVAL, v_fac_facse, 'Administración Pública');
    INSERT INTO carreras VALUES (seq_carreras.NEXTVAL, v_fac_facse, 'Contador Auditor');
    INSERT INTO carreras VALUES (seq_carreras.NEXTVAL, v_fac_facse, 'Derecho');
    INSERT INTO carreras VALUES (seq_carreras.NEXTVAL, v_fac_facse, 'Ingeniería de Ejecución en Administración de Empresas');
    INSERT INTO carreras VALUES (seq_carreras.NEXTVAL, v_fac_facse, 'Sociología');
    INSERT INTO carreras VALUES (seq_carreras.NEXTVAL, v_fac_facse, 'Trabajo Social');

    v_car_pbas := seq_carreras.NEXTVAL; INSERT INTO carreras VALUES (v_car_pbas, v_fac_fce,   'Pedagogía en Educación General Básica');
    INSERT INTO carreras VALUES (seq_carreras.NEXTVAL, v_fac_fce,   'Pedagogía en Educación Especial');
    INSERT INTO carreras VALUES (seq_carreras.NEXTVAL, v_fac_fce,   'Pedagogía en Educación Física');
    INSERT INTO carreras VALUES (seq_carreras.NEXTVAL, v_fac_fce,   'Pedagogía en Educación Parvularia');
    INSERT INTO carreras VALUES (seq_carreras.NEXTVAL, v_fac_fce,   'Pedagogía en Historia, Geografía y Ciencias Sociales');
    INSERT INTO carreras VALUES (seq_carreras.NEXTVAL, v_fac_fce,   'Pedagogía en Inglés');
    INSERT INTO carreras VALUES (seq_carreras.NEXTVAL, v_fac_fce,   'Pedagogía en Lengua Castellana y Comunicación');

    v_car_med  := seq_carreras.NEXTVAL; INSERT INTO carreras VALUES (v_car_med,  v_fac_fmed,  'Medicina');
    INSERT INTO carreras VALUES (seq_carreras.NEXTVAL, v_fac_fmed,  'Bachillerato en Ciencias Biomédicas');
    INSERT INTO carreras VALUES (seq_carreras.NEXTVAL, v_fac_fmed,  'Bioingeniería Médica');
    INSERT INTO carreras VALUES (seq_carreras.NEXTVAL, v_fac_fmed,  'Química y Farmacia');

    INSERT INTO carreras VALUES (seq_carreras.NEXTVAL, v_fac_facaf, 'Agronomía');
    INSERT INTO carreras VALUES (seq_carreras.NEXTVAL, v_fac_facaf, 'Ingeniería en Biotecnología');
    INSERT INTO carreras VALUES (seq_carreras.NEXTVAL, v_fac_facaf, 'Ingeniería en Recursos Naturales');
    INSERT INTO carreras VALUES (seq_carreras.NEXTVAL, v_fac_facaf, 'Medicina Veterinaria');

    INSERT INTO carreras VALUES (seq_carreras.NEXTVAL, v_fac_fcrf,  'Pedagogía en Religión y Filosofía');

    v_reg_maule := seq_regiones.NEXTVAL; INSERT INTO regiones VALUES (v_reg_maule, 'Región del Maule', 'VII');
    v_reg_ohig  := seq_regiones.NEXTVAL; INSERT INTO regiones VALUES (v_reg_ohig,  'Región del Libertador Gral. Bernardo O''Higgins', 'VI');
    v_reg_nuble := seq_regiones.NEXTVAL; INSERT INTO regiones VALUES (v_reg_nuble, 'Región de Ñuble', 'XVI');
    v_reg_rm    := seq_regiones.NEXTVAL; INSERT INTO regiones VALUES (v_reg_rm,    'Región Metropolitana de Santiago', 'RM');

    v_ciu_talca  := seq_ciudades.NEXTVAL; INSERT INTO ciudades VALUES (v_ciu_talca,  v_reg_maule, 'Talca');
    v_ciu_curico := seq_ciudades.NEXTVAL; INSERT INTO ciudades VALUES (v_ciu_curico, v_reg_maule, 'Curicó');
    v_ciu_lin    := seq_ciudades.NEXTVAL; INSERT INTO ciudades VALUES (v_ciu_lin,    v_reg_maule, 'Linares');
    v_ciu_const  := seq_ciudades.NEXTVAL; INSERT INTO ciudades VALUES (v_ciu_const,  v_reg_maule, 'Constitución');
    v_ciu_ranca  := seq_ciudades.NEXTVAL; INSERT INTO ciudades VALUES (v_ciu_ranca,  v_reg_ohig,  'Rancagua');
    v_ciu_chill  := seq_ciudades.NEXTVAL; INSERT INTO ciudades VALUES (v_ciu_chill,  v_reg_nuble, 'Chillán');

    v_ub_smiguel := seq_ubicaciones.NEXTVAL;
    INSERT INTO ubicaciones VALUES (v_ub_smiguel, v_ciu_talca, 'Campus San Miguel UCM', 'Av. San Miguel 3605, Talca', 'https://maps.google.com/?q=Universidad+Catolica+del+Maule+Campus+San+Miguel');

    v_ub_carmen := seq_ubicaciones.NEXTVAL;
    INSERT INTO ubicaciones VALUES (v_ub_carmen, v_ciu_curico, 'Campus Nuestra Señora del Carmen UCM', 'Carmen 684, Curicó', 'https://maps.google.com/?q=Universidad+Catolica+del+Maule+Curico');

    v_ub_ext := seq_ubicaciones.NEXTVAL;
    INSERT INTO ubicaciones VALUES (v_ub_ext, v_ciu_talca, 'Centro de Extensión UCM Talca', '3 Norte 650, Talca', 'https://maps.google.com/?q=Centro+de+Extension+UCM+Talca');

    v_ub_trm := seq_ubicaciones.NEXTVAL;
    INSERT INTO ubicaciones VALUES (v_ub_trm, v_ciu_talca, 'Teatro Regional del Maule', '1 Oriente 1484, Talca', 'https://maps.google.com/?q=Teatro+Regional+del+Maule+Talca');

    v_ub_plaza_t := seq_ubicaciones.NEXTVAL;
    INSERT INTO ubicaciones VALUES (v_ub_plaza_t, v_ciu_talca, 'Plaza de Armas de Talca', '1 Sur con 1 Oriente, Talca', 'https://maps.google.com/?q=Plaza+de+Armas+Talca');

    v_ub_lam := seq_ubicaciones.NEXTVAL;
    INSERT INTO ubicaciones VALUES (v_ub_lam, v_ciu_talca, 'Liceo Abate Molina', '4 Norte 1267, Talca', 'https://maps.google.com/?q=Liceo+Abate+Molina+Talca');

    v_ub_estadio := seq_ubicaciones.NEXTVAL;
    INSERT INTO ubicaciones VALUES (v_ub_estadio, v_ciu_talca, 'Gimnasio Regional de Talca', '2 Norte con 18 Oriente, Talca', 'https://maps.google.com/?q=Gimnasio+Regional+Talca');

    v_ub_plaza_c := seq_ubicaciones.NEXTVAL;
    INSERT INTO ubicaciones VALUES (v_ub_plaza_c, v_ciu_curico, 'Plaza de Armas de Curicó', 'Estado con Merced, Curicó', 'https://maps.google.com/?q=Plaza+de+Armas+Curico');

    v_ub_linares := seq_ubicaciones.NEXTVAL;
    INSERT INTO ubicaciones VALUES (v_ub_linares, v_ciu_lin, 'Plaza de Armas de Linares', 'Independencia 540, Linares', 'https://maps.google.com/?q=Plaza+de+Armas+Linares');

    v_tipo_feria  := seq_tipos_actividad.NEXTVAL; INSERT INTO tipos_actividad VALUES (v_tipo_feria,  'Feria Vocacional',     '#2563EB');
    v_tipo_puert  := seq_tipos_actividad.NEXTVAL; INSERT INTO tipos_actividad VALUES (v_tipo_puert,  'Puertas Abiertas',     '#16A34A');
    v_tipo_charla := seq_tipos_actividad.NEXTVAL; INSERT INTO tipos_actividad VALUES (v_tipo_charla, 'Charla en Colegio',    '#D97706');
    v_tipo_paes   := seq_tipos_actividad.NEXTVAL; INSERT INTO tipos_actividad VALUES (v_tipo_paes,   'Ensayo PAES',          '#7C3AED');
    v_tipo_inst   := seq_tipos_actividad.NEXTVAL; INSERT INTO tipos_actividad VALUES (v_tipo_inst,   'Evento Institucional', '#DC2626');
    v_tipo_induc  := seq_tipos_actividad.NEXTVAL; INSERT INTO tipos_actividad VALUES (v_tipo_induc,  'Inducción Novatos',    '#0891B2');

    v_est_borr := seq_estados_actividad.NEXTVAL; INSERT INTO estados_actividad VALUES (v_est_borr, 'BORRADOR',   'Actividad creada por Admin, aún no visible para el Staff');
    v_est_prog := seq_estados_actividad.NEXTVAL; INSERT INTO estados_actividad VALUES (v_est_prog, 'PROGRAMADA', 'Actividad agendada con fecha automática de publicación');
    v_est_pub  := seq_estados_actividad.NEXTVAL; INSERT INTO estados_actividad VALUES (v_est_pub,  'PUBLICADA',  'Abierta para postulación en el calendario Staff');
    v_est_curs := seq_estados_actividad.NEXTVAL; INSERT INTO estados_actividad VALUES (v_est_curs, 'EN_CURSO',   'Actividad ejecutándose actualmente');
    v_est_fin  := seq_estados_actividad.NEXTVAL; INSERT INTO estados_actividad VALUES (v_est_fin,  'FINALIZADA', 'Actividad cerrada y lista para validación de horas');
    v_est_canc := seq_estados_actividad.NEXTVAL; INSERT INTO estados_actividad VALUES (v_est_canc, 'CANCELADA',  'Actividad suspendida o cancelada');

    v_usr_super := seq_usuarios.NEXTVAL;
    INSERT INTO usuarios (id_usuario, rut, correo, password_hash, nombre, apellido, id_rol, debe_cambiar_clave, activo, creado_por)
    VALUES (v_usr_super, '11.111.111-1', 'superadmin@ucm.cl', v_hash_demo, 'Superadmin', 'UCM', v_rol_super, 'N', 'S', NULL);

    v_adm_talca := seq_usuarios.NEXTVAL;
    INSERT INTO usuarios (id_usuario, rut, correo, password_hash, nombre, apellido, id_rol, debe_cambiar_clave, activo, creado_por)
    VALUES (v_adm_talca, '16.482.310-4', 'admin1.talca@ucm.cl', v_hash_demo, 'Admin1', 'Talca', v_rol_admin, 'N', 'S', v_usr_super);

    v_adm_cur := seq_usuarios.NEXTVAL;
    INSERT INTO usuarios (id_usuario, rut, correo, password_hash, nombre, apellido, id_rol, debe_cambiar_clave, activo, creado_por)
    VALUES (v_adm_cur, '17.920.514-K', 'admin2.curico@ucm.cl', v_hash_demo, 'Admin2', 'Curicó', v_rol_admin, 'N', 'S', v_usr_super);

    v_adm_carlos := seq_usuarios.NEXTVAL;
    INSERT INTO usuarios (id_usuario, rut, correo, password_hash, nombre, apellido, id_rol, debe_cambiar_clave, activo, creado_por)
    VALUES (v_adm_carlos, '15.741.892-3', 'c.castro@ucm.cl', v_hash_demo, 'Carlos', 'Castro', v_rol_admin, 'N', 'S', v_usr_super);

    v_s1 := seq_usuarios.NEXTVAL;
    INSERT INTO usuarios (id_usuario, rut, correo, password_hash, nombre, apellido, id_rol, debe_cambiar_clave, activo, creado_por)
    VALUES (v_s1, '21.111.111-1', 'j.hernandez@alu.ucm.cl', v_hash_demo, 'Joaquín', 'Hernández', v_rol_staff, 'N', 'S', v_adm_talca);
    INSERT INTO perfiles_staff VALUES (v_s1, v_car_ici, 2024, '+56981111111', 'DISPONIBLE');

    v_s2 := seq_usuarios.NEXTVAL;
    INSERT INTO usuarios (id_usuario, rut, correo, password_hash, nombre, apellido, id_rol, debe_cambiar_clave, activo, creado_por)
    VALUES (v_s2, '21.222.222-2', 'b.rojas@alu.ucm.cl', v_hash_demo, 'Blas', 'Rojas', v_rol_staff, 'N', 'S', v_adm_talca);
    INSERT INTO perfiles_staff VALUES (v_s2, v_car_ici, 2024, '+56982222222', 'DISPONIBLE');

    v_s3 := seq_usuarios.NEXTVAL;
    INSERT INTO usuarios (id_usuario, rut, correo, password_hash, nombre, apellido, id_rol, debe_cambiar_clave, activo, creado_por)
    VALUES (v_s3, '21.333.333-3', 'r.torres@alu.ucm.cl', v_hash_demo, 'Rosario', 'Torres', v_rol_staff, 'N', 'S', v_adm_talca);
    INSERT INTO perfiles_staff VALUES (v_s3, v_car_enf, 2023, '+56983333333', 'DISPONIBLE');

    v_s4 := seq_usuarios.NEXTVAL;
    INSERT INTO usuarios (id_usuario, rut, correo, password_hash, nombre, apellido, id_rol, debe_cambiar_clave, activo, creado_por)
    VALUES (v_s4, '21.444.444-4', 'r.jana@alu.ucm.cl', v_hash_demo, 'Rodrigo', 'Jaña', v_rol_staff, 'N', 'S', v_adm_cur);
    INSERT INTO perfiles_staff VALUES (v_s4, v_car_ico, 2024, '+56984444444', 'DISPONIBLE');

    INSERT INTO disponibilidad_staff VALUES (seq_disponibilidad_staff.NEXTVAL, v_s1, DATE '2026-11-25', 'MANANA',   'DISPONIBLE');
    INSERT INTO disponibilidad_staff VALUES (seq_disponibilidad_staff.NEXTVAL, v_s1, DATE '2026-11-28', 'COMPLETO', 'DISPONIBLE');
    INSERT INTO disponibilidad_staff VALUES (seq_disponibilidad_staff.NEXTVAL, v_s2, DATE '2026-11-25', 'COMPLETO', 'RESERVADO');
    INSERT INTO disponibilidad_staff VALUES (seq_disponibilidad_staff.NEXTVAL, v_s2, DATE '2026-12-04', 'MANANA',   'RESERVADO');
    INSERT INTO disponibilidad_staff VALUES (seq_disponibilidad_staff.NEXTVAL, v_s3, DATE '2026-11-25', 'MANANA',   'RESERVADO');
    INSERT INTO disponibilidad_staff VALUES (seq_disponibilidad_staff.NEXTVAL, v_s4, DATE '2026-11-28', 'MANANA',   'RESERVADO');
    INSERT INTO disponibilidad_staff VALUES (seq_disponibilidad_staff.NEXTVAL, v_s4, DATE '2026-12-10', 'COMPLETO', 'DISPONIBLE');

    v_act_01 := seq_actividades.NEXTVAL;
    INSERT INTO actividades VALUES (
        v_act_01, 'Feria Vocacional Maule Norte', 'Stand de difusión de carreras de Ingeniería y Salud para colegios de Talca.',
        v_tipo_feria, v_ub_plaza_t, v_est_fin, DATE '2026-08-14', '09:00', 5.0, 4, NULL, v_adm_talca, 10
    );

    v_act_02 := seq_actividades.NEXTVAL;
    INSERT INTO actividades VALUES (
        v_act_02, 'Charla Admisión Liceo Abate Molina', 'Presentación de becas, beneficios y vías de ingreso UCM a 4tos medios.',
        v_tipo_charla, v_ub_lam, v_est_fin, DATE '2026-08-26', '10:30', 3.0, 3, NULL, v_adm_talca, 10
    );

    v_act_03 := seq_actividades.NEXTVAL;
    INSERT INTO actividades VALUES (
        v_act_03, 'Ensayo Nacional PAES UCM Talca', 'Apoyo logístico, acreditación y guía de salas en Campus San Miguel.',
        v_tipo_paes, v_ub_smiguel, v_est_fin, DATE '2026-09-05', '08:00', 6.0, 5, NULL, v_adm_talca, 10
    );

    v_act_04 := seq_actividades.NEXTVAL;
    INSERT INTO actividades VALUES (
        v_act_04, 'Feria Estudiantil Curicó 2026', 'Orientación vocacional en Plaza de Armas de Curicó.',
        v_tipo_feria, v_ub_plaza_c, v_est_fin, DATE '2026-09-24', '09:30', 4.5, 4, NULL, v_adm_cur, 10
    );

    v_act_05 := seq_actividades.NEXTVAL;
    INSERT INTO actividades VALUES (
        v_act_05, 'Casa Abierta UCM San Miguel', 'Recorridos guiados por laboratorios, biblioteca y simuladores clínicos.',
        v_tipo_puert, v_ub_smiguel, v_est_fin, DATE '2026-10-15', '09:00', 6.0, 5, NULL, v_adm_talca, 10
    );

    v_act_06 := seq_actividades.NEXTVAL;
    INSERT INTO actividades VALUES (
        v_act_06, 'Ceremonia Aniversario Institucional UCM', 'Protocolo, recepción de autoridades y acreditación de invitados.',
        v_tipo_inst, v_ub_trm, v_est_fin, DATE '2026-10-28', '17:00', 4.0, 4, NULL, v_adm_talca, 10
    );

    v_act_07 := seq_actividades.NEXTVAL;
    INSERT INTO actividades VALUES (
        v_act_07, 'Expo Carreras Maule Sur - Linares', 'Atención de consultas de postulación y mallas curriculares.',
        v_tipo_feria, v_ub_linares, v_est_fin, DATE '2026-11-10', '09:00', 5.0, 5, NULL, v_adm_cur, 10
    );

    v_act_08 := seq_actividades.NEXTVAL;
    INSERT INTO actividades VALUES (
        v_act_08, 'Jornada Puertas Abiertas Ingeniería y Salud', 'Tours guiados a delegaciones de colegios del Maule en Campus San Miguel.',
        v_tipo_puert, v_ub_smiguel, v_est_pub, DATE '2026-11-25', '09:00', 4.0, 2, NULL, v_adm_talca, 10
    );

    v_act_09 := seq_actividades.NEXTVAL;
    INSERT INTO actividades VALUES (
        v_act_09, 'Feria de Postulación y Beneficios Estudiantiles', 'Asesoría de gratuidad, FUAS y simulación de puntajes PAES.',
        v_tipo_feria, v_ub_ext, v_est_pub, DATE '2026-11-28', '10:00', 5.0, 6, NULL, v_adm_talca, 10
    );

    v_act_10 := seq_actividades.NEXTVAL;
    INSERT INTO actividades VALUES (
        v_act_10, 'Orientación Postulación Admisión 2027 Curicó', 'Módulos presenciales de acompañamiento en Campus Nuestra Señora del Carmen.',
        v_tipo_charla, v_ub_carmen, v_est_pub, DATE '2026-12-04', '09:30', 4.5, 5, NULL, v_adm_cur, 10
    );

    v_act_11 := seq_actividades.NEXTVAL;
    INSERT INTO actividades VALUES (
        v_act_11, 'Ensayo General Verano PAES', 'Jornada masiva de práctica en Gimnasio Regional de Talca.',
        v_tipo_paes, v_ub_estadio, v_est_prog, DATE '2026-12-10', '08:30', 5.0, 4, TIMESTAMP '2026-12-01 09:00:00', v_adm_talca, 10
    );

    v_act_12 := seq_actividades.NEXTVAL;
    INSERT INTO actividades VALUES (
        v_act_12, 'Bienvenida e Inducción Novatos Admisión 2027', 'Planificación preliminar de equipos guías por facultad.',
        v_tipo_induc, v_ub_smiguel, v_est_borr, DATE '2026-12-15', '09:00', 6.0, 8, NULL, v_adm_carlos, 10
    );

    v_p := ins_post(v_act_01, v_s1, 'CONFIRMADA'); ins_reg(v_p, 'S', 5.0, 'Excelente disposición en stand FCI', v_adm_talca);
    v_p := ins_post(v_act_01, v_s2, 'CONFIRMADA'); ins_reg(v_p, 'S', 5.0, 'Cumplió turno completo', v_adm_talca);
    v_p := ins_post(v_act_01, v_s3, 'CONFIRMADA'); ins_reg(v_p, 'S', 5.0, 'Apoyo destacado en área Salud', v_adm_talca);

    v_p := ins_post(v_act_02, v_s3, 'CONFIRMADA'); ins_reg(v_p, 'S', 3.0, 'Charla fluida a 4tos medios', v_adm_talca);
    v_p := ins_post(v_act_02, v_s4, 'CONFIRMADA'); ins_reg(v_p, 'S', 3.0, 'Entrega completa de folletería', v_adm_talca);
    v_p := ins_post(v_act_02, v_s1, 'CONFIRMADA'); ins_reg(v_p, 'S', 3.0, 'Puntual y comprometido', v_adm_talca);

    v_p := ins_post(v_act_03, v_s1, 'CONFIRMADA'); ins_reg(v_p, 'S', 6.0, 'Coordinación puerta principal', v_adm_talca);
    v_p := ins_post(v_act_03, v_s2, 'CONFIRMADA'); ins_reg(v_p, 'S', 6.0, 'Apoyo acreditación salas A', v_adm_talca);
    v_p := ins_post(v_act_03, v_s4, 'CONFIRMADA'); ins_reg(v_p, 'S', 6.0, 'Excelente trato a postulantes', v_adm_talca);
    v_p := ins_post(v_act_03, v_s3, 'CONFIRMADA'); ins_reg(v_p, 'N', 0.0, 'Inasistencia justificada por licencia médica', v_adm_talca);

    v_p := ins_post(v_act_04, v_s2, 'CONFIRMADA'); ins_reg(v_p, 'S', 4.5, 'Viaje y montaje stand Curicó', v_adm_cur);
    v_p := ins_post(v_act_04, v_s3, 'CONFIRMADA'); ins_reg(v_p, 'S', 4.5, 'Atención continua de consultas', v_adm_cur);
    v_p := ins_post(v_act_04, v_s4, 'CONFIRMADA'); ins_reg(v_p, 'S', 4.5, 'Jornada completada con éxito', v_adm_cur);

    v_p := ins_post(v_act_05, v_s1, 'CONFIRMADA'); ins_reg(v_p, 'S', 6.0, 'Guía laboratorio de computación', v_adm_talca);
    v_p := ins_post(v_act_05, v_s2, 'CONFIRMADA'); ins_reg(v_p, 'S', 6.0, 'Guía edificio ingeniería', v_adm_talca);
    v_p := ins_post(v_act_05, v_s3, 'CONFIRMADA'); ins_reg(v_p, 'S', 6.0, 'Demostración simulación clínica', v_adm_talca);
    v_p := ins_post(v_act_05, v_s4, 'CONFIRMADA'); ins_reg(v_p, 'S', 5.5, 'Retiro autorizado 30 min antes', v_adm_talca);

    v_p := ins_post(v_act_06, v_s1, 'CONFIRMADA'); ins_reg(v_p, 'S', 4.0, 'Soporte técnico escenario', v_adm_talca);
    v_p := ins_post(v_act_06, v_s3, 'CONFIRMADA'); ins_reg(v_p, 'S', 4.0, 'Protocolo ingreso autoridades', v_adm_talca);
    v_p := ins_post(v_act_06, v_s4, 'CONFIRMADA'); ins_reg(v_p, 'S', 4.0, 'Mesa de registro prensa', v_adm_talca);
    v_p := ins_post(v_act_06, v_s2, 'ASIGNADA', v_adm_talca); ins_reg(v_p, 'S', 4.0, 'Ingresó desde lista de espera y cumplió', v_adm_talca);
    INSERT INTO lista_espera (id_lista_espera, id_actividad, id_usuario, estado_espera, resuelto_por, fecha_resolucion)
    VALUES (seq_lista_espera.NEXTVAL, v_act_06, v_s2, 'ACEPTADA', v_adm_talca, CAST(SYSTIMESTAMP AT TIME ZONE 'America/Santiago' AS TIMESTAMP) - 20);

    v_p := ins_post(v_act_07, v_s1, 'CONFIRMADA'); ins_reg(v_p, 'S', 5.0, 'Lideró módulo de ingenierías', v_adm_cur);
    v_p := ins_post(v_act_07, v_s2, 'CONFIRMADA'); ins_reg(v_p, 'S', 5.0, 'Muy buena evaluación de colegios', v_adm_cur);
    v_p := ins_post(v_act_07, v_s3, 'CONFIRMADA'); ins_reg(v_p, 'S', 5.0, 'Apoyo traslado de pendones', v_adm_cur);
    v_p := ins_post(v_act_07, v_s4, 'CONFIRMADA'); ins_reg(v_p, 'S', 5.0, 'Cumplió horario completo', v_adm_cur);

    v_p := ins_post(v_act_08, v_s2, 'CONFIRMADA');
    v_p := ins_post(v_act_08, v_s3, 'CONFIRMADA');
    INSERT INTO lista_espera (id_lista_espera, id_actividad, id_usuario, estado_espera)
    VALUES (seq_lista_espera.NEXTVAL, v_act_08, v_s4, 'PENDIENTE');

    v_p := ins_post(v_act_09, v_s3, 'CONFIRMADA');
    v_p := ins_post(v_act_09, v_s4, 'CONFIRMADA');

    v_p := ins_post(v_act_10, v_s2, 'ASIGNADA', v_adm_cur);

    COMMIT;
    DBMS_OUTPUT.PUT_LINE('Seed limpio UCM (1 Superadmin, 3 Admins, 4 Staff) cargado sin errores.');
END;
/

SELECT
    (SELECT COUNT(*) FROM user_tables)                                                          AS tablas,
    (SELECT COUNT(*) FROM user_sequences)                                                       AS secuencias,
    (SELECT COUNT(*) FROM user_triggers)                                                        AS triggers,
    (SELECT COUNT(*) FROM user_objects WHERE object_type = 'PACKAGE'      AND status = 'VALID') AS pkg_specs,
    (SELECT COUNT(*) FROM user_objects WHERE object_type = 'PACKAGE BODY' AND status = 'VALID') AS pkg_bodies,
    (SELECT COUNT(*) FROM user_errors)                                                          AS errores
FROM dual;

SELECT 'USUARIOS'         AS entidad, COUNT(*) AS registros FROM usuarios
UNION ALL SELECT 'PERFILES_STAFF',    COUNT(*) FROM perfiles_staff
UNION ALL SELECT 'ACTIVIDADES',       COUNT(*) FROM actividades
UNION ALL SELECT 'POSTULACIONES',     COUNT(*) FROM postulaciones
UNION ALL SELECT 'LISTA_ESPERA',      COUNT(*) FROM lista_espera
UNION ALL SELECT 'REGISTRO_TRABAJO',  COUNT(*) FROM registro_trabajo
UNION ALL SELECT 'AUDITORIA_SISTEMA', COUNT(*) FROM auditoria_sistema;

SELECT u.id_usuario, r.nombre_rol, u.nombre || ' ' || u.apellido AS nombre_completo, u.rut, u.correo
  FROM usuarios u
  JOIN roles r ON r.id_rol = u.id_rol
 ORDER BY u.id_rol, u.id_usuario;

-- 9. Carga de regiones y comunas de Chile
DECLARE
    v_reg NUMBER;

    FUNCTION ensure_region(p_codigo VARCHAR2, p_nombre VARCHAR2) RETURN NUMBER IS
        v_id NUMBER;
    BEGIN
        SELECT id_region INTO v_id
          FROM regiones
         WHERE UPPER(codigo_romano) = UPPER(p_codigo);

        UPDATE regiones
           SET nombre_region = p_nombre
         WHERE id_region = v_id;

        RETURN v_id;
    EXCEPTION
        WHEN NO_DATA_FOUND THEN
            v_id := seq_regiones.NEXTVAL;
            INSERT INTO regiones (id_region, nombre_region, codigo_romano)
            VALUES (v_id, p_nombre, UPPER(p_codigo));
            RETURN v_id;
    END;

    PROCEDURE ensure_ciudad(p_id_region NUMBER, p_nombre VARCHAR2) IS
        v_cnt NUMBER;
    BEGIN
        SELECT COUNT(*) INTO v_cnt
          FROM ciudades
         WHERE LOWER(TRIM(nombre_ciudad)) = LOWER(TRIM(p_nombre));

        IF v_cnt = 0 THEN
            INSERT INTO ciudades (id_ciudad, id_region, nombre_ciudad)
            VALUES (seq_ciudades.NEXTVAL, p_id_region, TRIM(p_nombre));
        END IF;
    END;

    PROCEDURE cargar_comunas(p_id_region NUMBER, p_lista VARCHAR2) IS
        v_pos  PLS_INTEGER := 1;
        v_next PLS_INTEGER;
        v_item VARCHAR2(100);
    BEGIN
        LOOP
            v_next := INSTR(p_lista, '|', v_pos);
            IF v_next = 0 THEN
                v_item := SUBSTR(p_lista, v_pos);
                ensure_ciudad(p_id_region, v_item);
                EXIT;
            ELSE
                v_item := SUBSTR(p_lista, v_pos, v_next - v_pos);
                ensure_ciudad(p_id_region, v_item);
                v_pos := v_next + 1;
            END IF;
        END LOOP;
    END;
BEGIN
    v_reg := ensure_region('XV', 'Región de Arica y Parinacota');
    cargar_comunas(v_reg, 'Arica|Camarones|Putre|General Lagos');

    v_reg := ensure_region('I', 'Región de Tarapacá');
    cargar_comunas(v_reg, 'Iquique|Alto Hospicio|Pozo Almonte|Camiña|Colchane|Huara|Pica');

    v_reg := ensure_region('II', 'Región de Antofagasta');
    cargar_comunas(v_reg, 'Antofagasta|Mejillones|Sierra Gorda|Taltal|Calama|Ollagüe|San Pedro de Atacama|Tocopilla|María Elena');

    v_reg := ensure_region('III', 'Región de Atacama');
    cargar_comunas(v_reg, 'Copiapó|Caldera|Tierra Amarilla|Chañaral|Diego de Almagro|Vallenar|Alto del Carmen|Freirina|Huasco');

    v_reg := ensure_region('IV', 'Región de Coquimbo');
    cargar_comunas(v_reg, 'La Serena|Coquimbo|Andacollo|La Higuera|Paiguano|Vicuña|Illapel|Canela|Los Vilos|Salamanca|Ovalle|Combarbalá|Monte Patria|Punitaqui|Río Hurtado');

    v_reg := ensure_region('V', 'Región de Valparaíso');
    cargar_comunas(v_reg, 'Valparaíso|Casablanca|Concón|Juan Fernández|Puchuncaví|Quintero|Viña del Mar|Isla de Pascua|Los Andes|Calle Larga|Rinconada|San Esteban|La Ligua|Cabildo|Papudo|Petorca|Zapallar|Quillota|La Calera|Hijuelas|La Cruz|Nogales|San Antonio|Algarrobo|Cartagena|El Quisco|El Tabo|Santo Domingo|San Felipe|Catemu|Llaillay|Panquehue|Putaendo|Santa María|Quilpué|Limache|Olmué|Villa Alemana');

    v_reg := ensure_region('RM', 'Región Metropolitana');
    cargar_comunas(v_reg, 'Santiago|Cerrillos|Cerro Navia|Conchalí|El Bosque|Estación Central|Huechuraba|Independencia|La Cisterna|La Florida|La Granja|La Reina|Las Condes|Lo Barnechea|Lo Espejo|Lo Prado|Macul|Maipú|Ñuñoa|Pedro Aguirre Cerda|Peñalolén|Providencia|Pudahuel|Quilicura|Quinta Normal|Recoleta|Renca|San Joaquín|San Miguel|San Ramón|Vitacura|Puente Alto|Pirque|San José de Maipo|Colina|Lampa|Tiltil|San Bernardo|Buin|Calera de Tango|Paine|Melipilla|Alhué|Curacaví|María Pinto|San Pedro|Talagante|El Monte|Isla de Maipo|Padre Hurtado|Peñaflor');

    v_reg := ensure_region('VI', 'Región de O''Higgins');
    cargar_comunas(v_reg, 'Rancagua|Codegua|Coinco|Coltauco|Doñihue|Graneros|Las Cabras|Machalí|Malloa|Mostazal|Olivar|Peumo|Pichidegua|Quinta de Tilcoco|Rengo|Requínoa|San Vicente|Pichilemu|La Estrella|Litueche|Marchihue|Navidad|Paredones|San Fernando|Chépica|Chimbarongo|Lolol|Nancagua|Palmilla|Peralillo|Placilla|Pumanque|Santa Cruz');

    v_reg := ensure_region('VII', 'Región del Maule');
    cargar_comunas(v_reg, 'Talca|Constitución|Curepto|Empedrado|Maule|Pelarco|Pencahue|Río Claro|San Clemente|San Rafael|Cauquenes|Chanco|Pelluhue|Curicó|Hualañé|Licantén|Molina|Rauco|Romeral|Sagrada Familia|Teno|Vichuquén|Linares|Colbún|Longaví|Parral|Retiro|San Javier|Villa Alegre|Yerbas Buenas');

    v_reg := ensure_region('XVI', 'Región de Ñuble');
    cargar_comunas(v_reg, 'Chillán|Bulnes|Chillán Viejo|El Carmen|Pemuco|Pinto|Quillón|San Ignacio|Yungay|Quirihue|Cobquecura|Coelemu|Ninhue|Portezuelo|Ránquil|Treguaco|San Carlos|Coihueco|Ñiquén|San Fabián|San Nicolás');

    v_reg := ensure_region('VIII', 'Región del Biobío');
    cargar_comunas(v_reg, 'Concepción|Coronel|Chiguayante|Florida|Hualqui|Lota|Penco|San Pedro de la Paz|Santa Juana|Talcahuano|Tomé|Hualpén|Lebu|Arauco|Cañete|Contulmo|Curanilahue|Los Álamos|Tirúa|Los Ángeles|Antuco|Cabrero|Laja|Mulchén|Nacimiento|Negrete|Quilaco|Quilleco|San Rosendo|Santa Bárbara|Tucapel|Yumbel|Alto Biobío');

    v_reg := ensure_region('IX', 'Región de La Araucanía');
    cargar_comunas(v_reg, 'Temuco|Carahue|Cholchol|Cunco|Curarrehue|Freire|Galvarino|Gorbea|Lautaro|Loncoche|Melipeuco|Nueva Imperial|Padre Las Casas|Perquenco|Pitrufquén|Pucón|Saavedra|Teodoro Schmidt|Toltén|Vilcún|Villarrica|Angol|Collipulli|Curacautín|Ercilla|Lonquimay|Los Sauces|Lumaco|Purén|Renaico|Traiguén|Victoria');

    v_reg := ensure_region('XIV', 'Región de Los Ríos');
    cargar_comunas(v_reg, 'Valdivia|Corral|Lanco|Los Lagos|Máfil|Mariquina|Paillaco|Panguipulli|La Unión|Futrono|Lago Ranco|Río Bueno');

    v_reg := ensure_region('X', 'Región de Los Lagos');
    cargar_comunas(v_reg, 'Puerto Montt|Calbuco|Cochamó|Fresia|Frutillar|Los Muermos|Llanquihue|Maullín|Puerto Varas|Castro|Ancud|Chonchi|Curaco de Vélez|Dalcahue|Puqueldón|Queilén|Quellón|Quemchi|Quinchao|Osorno|Puerto Octay|Purranque|Puyehue|Río Negro|San Juan de la Costa|San Pablo|Chaitén|Futaleufú|Hualaihué|Palena');

    v_reg := ensure_region('XI', 'Región de Aysén');
    cargar_comunas(v_reg, 'Coyhaique|Lago Verde|Aysén|Cisnes|Guaitecas|Cochrane|O''Higgins|Tortel|Chile Chico|Río Ibáñez');

    v_reg := ensure_region('XII', 'Región de Magallanes');
    cargar_comunas(v_reg, 'Punta Arenas|Laguna Blanca|Río Verde|San Gregorio|Cabo de Hornos|Antártica|Porvenir|Primavera|Timaukel|Natales|Torres del Paine');

    COMMIT;
    DBMS_OUTPUT.PUT_LINE('Catálogo completo de Chile (16 regiones, 346 comunas) cargado correctamente.');
END;
/

-- 10. Consultas de verificación
SELECT
    (SELECT COUNT(*) FROM user_tables)                                                          AS tablas,
    (SELECT COUNT(*) FROM user_sequences)                                                       AS secuencias,
    (SELECT COUNT(*) FROM user_triggers)                                                        AS triggers,
    (SELECT COUNT(*) FROM user_objects WHERE object_type = 'PACKAGE'      AND status = 'VALID') AS pkg_specs,
    (SELECT COUNT(*) FROM user_objects WHERE object_type = 'PACKAGE BODY' AND status = 'VALID') AS pkg_bodies,
    (SELECT COUNT(*) FROM user_errors)                                                          AS errores
FROM dual;

SELECT 'FACULTADES'       AS entidad, COUNT(*) AS registros FROM facultades
UNION ALL SELECT 'CARRERAS',           COUNT(*) FROM carreras
UNION ALL SELECT 'REGIONES',           COUNT(*) FROM regiones
UNION ALL SELECT 'CIUDADES (COMUNAS)', COUNT(*) FROM ciudades
UNION ALL SELECT 'USUARIOS',           COUNT(*) FROM usuarios
UNION ALL SELECT 'PERFILES_STAFF',     COUNT(*) FROM perfiles_staff
UNION ALL SELECT 'ACTIVIDADES',        COUNT(*) FROM actividades
UNION ALL SELECT 'POSTULACIONES',      COUNT(*) FROM postulaciones
UNION ALL SELECT 'LISTA_ESPERA',       COUNT(*) FROM lista_espera
UNION ALL SELECT 'REGISTRO_TRABAJO',   COUNT(*) FROM registro_trabajo
UNION ALL SELECT 'AUDITORIA_SISTEMA',  COUNT(*) FROM auditoria_sistema;

SELECT u.id_usuario, r.nombre_rol, u.nombre || ' ' || u.apellido AS nombre_completo, u.rut, u.correo
  FROM usuarios u
  JOIN roles r ON r.id_rol = u.id_rol
 ORDER BY u.id_rol, u.id_usuario;
