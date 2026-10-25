-- ===========================================================================
-- SIGLV · Esquema MySQL
-- Sistema Integral de Gestión y Logística de Viajes
--
-- Los nombres de tabla y columna reproducen el Diccionario de Datos y el
-- Catálogo de Elementos Dato del documento del sistema de viajes.
--
-- Almacenes del DFD → tablas:
--   VU → vuelo              HT → hotel            AC → actividad
--   RE → reserva            PR → precio_bloqueado
--
--   mysql -u root -p < sql/siglv_schema.sql
-- ===========================================================================

DROP DATABASE IF EXISTS siglv;
CREATE DATABASE siglv
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_unicode_ci;
USE siglv;

-- ---------------------------------------------------------------------------
-- Catálogo auxiliar de ciudades / aeropuertos (código IATA)
-- ---------------------------------------------------------------------------
CREATE TABLE ciudad (
  Codigo      CHAR(3)      NOT NULL,
  Ciudad      VARCHAR(50)  NOT NULL,
  Pais        VARCHAR(50)  NOT NULL,
  PRIMARY KEY (Codigo)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------------
-- Usuarios del sistema (agentes y capturistas)
-- ---------------------------------------------------------------------------
CREATE TABLE usuario (
  Id_Usuario   INT UNSIGNED NOT NULL AUTO_INCREMENT,
  Nombre       VARCHAR(80)  NOT NULL,
  Email        VARCHAR(120) NOT NULL,
  Password_Hash VARCHAR(255) NOT NULL,          -- password_hash() de PHP
  Rol          ENUM('agente','capturista','admin') NOT NULL DEFAULT 'agente',
  Activo       TINYINT(1)   NOT NULL DEFAULT 1,
  Creado_En    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (Id_Usuario),
  UNIQUE KEY uq_usuario_email (Email)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------------
-- Clientes · Id_Cliente X(10) alfanumérico, no nulo
-- ---------------------------------------------------------------------------
CREATE TABLE cliente (
  Id_Cliente  VARCHAR(14)  NOT NULL,
  Nombre      VARCHAR(80)  NOT NULL,
  Email       VARCHAR(120) NULL,
  Telefono    VARCHAR(20)  NULL,
  Documento   VARCHAR(20)  NULL,                -- pasaporte / identificación
  Creado_En   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (Id_Cliente),
  KEY ix_cliente_nombre (Nombre)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------------
-- ALMACÉN VU · vuelo
-- Guarda el itinerario BASE (recurrente). El subproceso 1.2 materializa
-- Fecha_Hora_Salida / Fecha_Hora_Llegada para la fecha solicitada:
--   Fecha_Hora_Salida  = CONCAT(:fecha, ' ', Hora_Salida)
--   Fecha_Hora_Llegada = Fecha_Hora_Salida + INTERVAL Duracion_Minutos MINUTE
-- Dias_Operacion usa el formato '0123456' (0=Domingo … 6=Sábado).
-- ---------------------------------------------------------------------------
CREATE TABLE vuelo (
  Id_Vuelo             VARCHAR(8)   NOT NULL,            -- Ej. VUE-1024
  Codigo_Aerolinea     CHAR(3)      NOT NULL,            -- IATA, 3 letras
  Aerolinea            VARCHAR(40)  NOT NULL,
  Origen               CHAR(3)      NOT NULL,
  Destino              CHAR(3)      NOT NULL,
  Hora_Salida          TIME         NOT NULL,
  Duracion_Minutos     SMALLINT UNSIGNED NOT NULL,
  Escalas              TINYINT UNSIGNED NOT NULL DEFAULT 0,
  Escala_En            VARCHAR(20)  NULL,
  Clase_Tarifa         VARCHAR(15)  NOT NULL,            -- Económica, Ejecutiva…
  Precio_Base          DECIMAL(10,2) NOT NULL,           -- > 0, por pasajero
  Equipaje             VARCHAR(30)  NULL,
  Asientos_Disponibles SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  Estado               ENUM('Disponible','Agotado') NOT NULL DEFAULT 'Disponible',
  Dias_Operacion       VARCHAR(7)   NOT NULL DEFAULT '0123456',
  PRIMARY KEY (Id_Vuelo),
  KEY ix_vuelo_ruta (Origen, Destino, Estado),
  KEY ix_vuelo_precio (Precio_Base),
  CONSTRAINT fk_vuelo_origen  FOREIGN KEY (Origen)  REFERENCES ciudad (Codigo),
  CONSTRAINT fk_vuelo_destino FOREIGN KEY (Destino) REFERENCES ciudad (Codigo),
  CONSTRAINT ck_vuelo_precio  CHECK (Precio_Base > 0)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------------
-- ALMACÉN HT · hotel
-- ---------------------------------------------------------------------------
CREATE TABLE hotel (
  Id_Hotel            VARCHAR(8)   NOT NULL,             -- Ej. HTL-501
  Nombre_Comercial    VARCHAR(50)  NOT NULL,
  Ciudad              CHAR(3)      NOT NULL,
  Ubicacion           VARCHAR(100) NOT NULL,             -- zona o dirección
  Distancia_Destino   DECIMAL(6,2) NOT NULL DEFAULT 0,   -- km al destino (2.1)
  Categoria           TINYINT UNSIGNED NOT NULL,         -- 1..5 estrellas
  Nivel_Seguridad     TINYINT UNSIGNED NOT NULL,         -- 1..5 (2.2)
  Tipo_Habitacion     VARCHAR(40)  NOT NULL,
  Tarifa_Noche        DECIMAL(10,2) NOT NULL,
  Habitaciones_Libres SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  Servicios           VARCHAR(120) NULL,
  Cancelacion         VARCHAR(60)  NULL,
  PRIMARY KEY (Id_Hotel),
  KEY ix_hotel_ciudad (Ciudad, Nivel_Seguridad),
  KEY ix_hotel_distancia (Distancia_Destino),
  CONSTRAINT fk_hotel_ciudad FOREIGN KEY (Ciudad) REFERENCES ciudad (Codigo),
  CONSTRAINT ck_hotel_cat CHECK (Categoria BETWEEN 1 AND 5),
  CONSTRAINT ck_hotel_seg CHECK (Nivel_Seguridad BETWEEN 1 AND 5)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------------
-- ALMACÉN AC · actividad
-- Operacion_Diaria = 1 → el subproceso 3.2 le asigna fecha dentro de la
-- ventana del viaje; si es 0, sólo es viable en su Fecha_Ejecucion fija.
-- ---------------------------------------------------------------------------
CREATE TABLE actividad (
  Id_Actividad       VARCHAR(8)   NOT NULL,              -- Ej. ACT-99
  Nombre_Tour        VARCHAR(50)  NOT NULL,
  Ciudad             CHAR(3)      NOT NULL,
  Ubicacion          VARCHAR(100) NOT NULL,
  Distancia_Hotel    DECIMAL(6,2) NOT NULL DEFAULT 0,    -- km (3.1)
  Hora_Inicio        TIME         NOT NULL,
  Duracion_Estimada  TIME         NOT NULL,              -- HH:MM
  Costo_Persona      DECIMAL(10,2) NOT NULL DEFAULT 0,   -- 0 = actividad gratuita
  Cupos_Maximos      SMALLINT UNSIGNED NOT NULL,
  Cupos_Libres       SMALLINT UNSIGNED NOT NULL,
  Tipo               VARCHAR(20)  NOT NULL,              -- Cultura, Aventura…
  Operacion_Diaria   TINYINT(1)   NOT NULL DEFAULT 1,
  Fecha_Ejecucion    DATE         NULL,                  -- sólo si no es diaria
  PRIMARY KEY (Id_Actividad),
  KEY ix_actividad_ciudad (Ciudad, Distancia_Hotel),
  CONSTRAINT fk_actividad_ciudad FOREIGN KEY (Ciudad) REFERENCES ciudad (Codigo),
  CONSTRAINT ck_actividad_cupos CHECK (Cupos_Libres <= Cupos_Maximos)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------------
-- itinerario (flujo "Itinerario", salida del proceso 3.4)
-- Itinerario = Id_Itinerario + Vuelo_seleccionado + Hotel_seleccionado +
--              Detalle_Actividades + Fecha_Creacion
-- ---------------------------------------------------------------------------
CREATE TABLE itinerario (
  Id_Itinerario    VARCHAR(16)  NOT NULL,                -- Prefijo ITI-
  Id_Cliente       VARCHAR(14)  NOT NULL,
  Id_Vuelo         VARCHAR(8)   NOT NULL,
  Id_Hotel         VARCHAR(8)   NULL,
  Origen           CHAR(3)      NOT NULL,
  Destino          CHAR(3)      NOT NULL,
  Fecha_Salida     DATE         NOT NULL,
  Fecha_Regreso    DATE         NOT NULL,
  Fecha_CheckIn    DATE         NULL,
  Fecha_CheckOut   DATE         NULL,
  N_Pasajeros      TINYINT UNSIGNED NOT NULL,
  Habitaciones     TINYINT UNSIGNED NOT NULL DEFAULT 1,
  Clase_Tarifa     VARCHAR(15)  NULL,
  Preferencias     VARCHAR(200) NULL,
  Fecha_Creacion   DATE         NOT NULL,
  PRIMARY KEY (Id_Itinerario),
  KEY ix_itinerario_cliente (Id_Cliente),
  CONSTRAINT fk_iti_cliente FOREIGN KEY (Id_Cliente) REFERENCES cliente (Id_Cliente),
  CONSTRAINT fk_iti_vuelo   FOREIGN KEY (Id_Vuelo)   REFERENCES vuelo (Id_Vuelo),
  CONSTRAINT fk_iti_hotel   FOREIGN KEY (Id_Hotel)   REFERENCES hotel (Id_Hotel),
  CONSTRAINT ck_iti_fechas  CHECK (Fecha_Regreso > Fecha_Salida),
  CONSTRAINT ck_iti_pax     CHECK (N_Pasajeros BETWEEN 1 AND 99)
) ENGINE=InnoDB;

-- Detalle_Actividades: lista de tours dentro del itinerario
CREATE TABLE itinerario_actividad (
  Id_Detalle        INT UNSIGNED NOT NULL AUTO_INCREMENT,
  Id_Itinerario     VARCHAR(16)  NOT NULL,
  Id_Actividad      VARCHAR(8)   NOT NULL,
  Fecha_Ejecucion   DATE         NOT NULL,
  Hora_Inicio       TIME         NOT NULL,
  Duracion_Estimada TIME         NOT NULL,
  N_Personas        TINYINT UNSIGNED NOT NULL DEFAULT 1,
  Costo_Persona     DECIMAL(10,2) NOT NULL,
  Criterio_Seleccion VARCHAR(40) NULL,
  PRIMARY KEY (Id_Detalle),
  UNIQUE KEY uq_iti_act (Id_Itinerario, Id_Actividad, Fecha_Ejecucion),
  CONSTRAINT fk_ia_iti FOREIGN KEY (Id_Itinerario) REFERENCES itinerario (Id_Itinerario) ON DELETE CASCADE,
  CONSTRAINT fk_ia_act FOREIGN KEY (Id_Actividad)  REFERENCES actividad (Id_Actividad)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------------
-- ALMACÉN RE · reserva  (escrito por 1.4, 2.4 y 3.4; leído por 4.1)
-- Reserva_Viaje = Id_Reserva + Id_Cliente + Id_Itinerario + Tipo_Servicio +
--                 Fecha_Reserva + Monto_Reserva + Estado_Reserva
-- ---------------------------------------------------------------------------
CREATE TABLE reserva (
  Id_Reserva     VARCHAR(16)  NOT NULL,                  -- Prefijo RES-
  Id_Cliente     VARCHAR(14)  NOT NULL,
  Id_Itinerario  VARCHAR(16)  NULL,
  Tipo_Servicio  ENUM('VUELO','HOTEL','ACTIVIDAD') NOT NULL,
  Id_Referencia  VARCHAR(8)   NOT NULL,                  -- Id_Vuelo / Id_Hotel / Id_Actividad
  Descripcion    VARCHAR(120) NULL,
  Fecha_Reserva  DATE         NOT NULL,
  Fecha_Inicio   DATE         NULL,                      -- salida / check-in / ejecución
  Fecha_Fin      DATE         NULL,                      -- llegada / check-out
  N_Personas     TINYINT UNSIGNED NOT NULL DEFAULT 1,
  Monto_Reserva  DECIMAL(12,2) NOT NULL DEFAULT 0,
  Estado_Reserva ENUM('Pendiente','Confirmado','Cancelado') NOT NULL DEFAULT 'Pendiente',
  PRIMARY KEY (Id_Reserva),
  KEY ix_reserva_itinerario (Id_Itinerario),
  KEY ix_reserva_cliente (Id_Cliente, Fecha_Reserva),
  KEY ix_reserva_servicio (Tipo_Servicio, Id_Referencia),
  CONSTRAINT fk_res_cliente FOREIGN KEY (Id_Cliente)    REFERENCES cliente (Id_Cliente),
  CONSTRAINT fk_res_iti     FOREIGN KEY (Id_Itinerario) REFERENCES itinerario (Id_Itinerario) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------------
-- ALMACÉN PR · precio_bloqueado  (leído por 4.2)
-- Precio = Id_Tarifa + Tipo_Servicio + Id_Referencia + Precio_Unitario +
--          Moneda + Fecha_Vigencia_Inicio + Fecha_Vigencia_Fin + Porcentaje_Impuesto
-- ---------------------------------------------------------------------------
CREATE TABLE precio_bloqueado (
  Id_Tarifa             VARCHAR(12)  NOT NULL,           -- Ej. TAR-0001
  Tipo_Servicio         ENUM('VUELO','HOTEL','ACTIVIDAD') NOT NULL,
  Id_Referencia         VARCHAR(8)   NOT NULL,
  Precio_Unitario       DECIMAL(10,2) NOT NULL,
  Moneda                CHAR(3)      NOT NULL DEFAULT 'MXN',
  Fecha_Vigencia_Inicio DATE         NOT NULL,
  Fecha_Vigencia_Fin    DATE         NOT NULL,
  Porcentaje_Impuesto   DECIMAL(5,2) NOT NULL DEFAULT 16.00,
  PRIMARY KEY (Id_Tarifa),
  KEY ix_precio_busqueda (Tipo_Servicio, Id_Referencia, Fecha_Vigencia_Inicio, Fecha_Vigencia_Fin),
  CONSTRAINT ck_precio_vig CHECK (Fecha_Vigencia_Fin >= Fecha_Vigencia_Inicio)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------------
-- cotizacion (flujo "Presupuesto", salida del proceso 4.4)
-- ---------------------------------------------------------------------------
CREATE TABLE cotizacion (
  Id_Cotizacion        VARCHAR(16)  NOT NULL,            -- Ej. COT-2026-0001
  Id_Itinerario        VARCHAR(16)  NOT NULL,
  Id_Cliente           VARCHAR(14)  NOT NULL,
  Id_Usuario           INT UNSIGNED NULL,                -- agente que emite
  Fecha_Emision        DATE         NOT NULL,
  Costo_Vuelos         DECIMAL(12,2) NOT NULL DEFAULT 0,
  Costo_Hoteles        DECIMAL(12,2) NOT NULL DEFAULT 0,
  Costo_Actividades    DECIMAL(12,2) NOT NULL DEFAULT 0,
  Subtotal             DECIMAL(12,2) NOT NULL DEFAULT 0,
  Porcentaje_IVA       DECIMAL(5,2)  NOT NULL DEFAULT 16.00,
  Monto_IVA            DECIMAL(12,2) NOT NULL DEFAULT 0,
  Tasas_Aeroportuarias DECIMAL(12,2) NOT NULL DEFAULT 0,
  Monto_Impuestos      DECIMAL(12,2) NOT NULL DEFAULT 0,
  Monto_Total          DECIMAL(12,2) NOT NULL DEFAULT 0,
  Validez_Oferta       TINYINT UNSIGNED NOT NULL DEFAULT 15,
  Vence_El             DATE         NOT NULL,
  Estado               ENUM('Emitido','Aceptado','Rechazado','Vencido') NOT NULL DEFAULT 'Emitido',
  PRIMARY KEY (Id_Cotizacion),
  KEY ix_cot_cliente (Id_Cliente, Fecha_Emision),
  CONSTRAINT fk_cot_iti     FOREIGN KEY (Id_Itinerario) REFERENCES itinerario (Id_Itinerario),
  CONSTRAINT fk_cot_cliente FOREIGN KEY (Id_Cliente)    REFERENCES cliente (Id_Cliente),
  CONSTRAINT fk_cot_usuario FOREIGN KEY (Id_Usuario)    REFERENCES usuario (Id_Usuario)
) ENGINE=InnoDB;

-- Desglose congelado que se imprime en el PDF
CREATE TABLE cotizacion_detalle (
  Id_Detalle      INT UNSIGNED NOT NULL AUTO_INCREMENT,
  Id_Cotizacion   VARCHAR(16)  NOT NULL,
  Tipo_Servicio   ENUM('VUELO','HOTEL','ACTIVIDAD') NOT NULL,
  Id_Referencia   VARCHAR(8)   NOT NULL,
  Id_Reserva      VARCHAR(16)  NULL,
  Id_Tarifa       VARCHAR(12)  NULL,                     -- NULL = precio de catálogo
  Descripcion     VARCHAR(160) NOT NULL,
  Precio_Unitario DECIMAL(10,2) NOT NULL,
  Cantidad        DECIMAL(8,2)  NOT NULL DEFAULT 1,
  Importe         DECIMAL(12,2) NOT NULL,
  PRIMARY KEY (Id_Detalle),
  KEY ix_cotdet_cot (Id_Cotizacion),
  CONSTRAINT fk_cotdet_cot FOREIGN KEY (Id_Cotizacion) REFERENCES cotizacion (Id_Cotizacion) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------------
-- Contenido editable del sitio (banner, videos, testimonios, mensajes)
-- ---------------------------------------------------------------------------
CREATE TABLE video (
  Id_Video  INT UNSIGNED NOT NULL AUTO_INCREMENT,
  Titulo    VARCHAR(60)  NOT NULL,
  Archivo   VARCHAR(160) NOT NULL,
  Poster    VARCHAR(160) NULL,
  Orden     TINYINT UNSIGNED NOT NULL DEFAULT 1,
  Activo    TINYINT(1)   NOT NULL DEFAULT 1,
  PRIMARY KEY (Id_Video)
) ENGINE=InnoDB;

CREATE TABLE testimonio (
  Id_Testimonio INT UNSIGNED NOT NULL AUTO_INCREMENT,
  Nombre        VARCHAR(60)  NOT NULL,
  Rol           VARCHAR(80)  NULL,
  Texto         VARCHAR(400) NOT NULL,
  Imagen        VARCHAR(160) NULL,
  Activo        TINYINT(1)   NOT NULL DEFAULT 1,
  PRIMARY KEY (Id_Testimonio)
) ENGINE=InnoDB;

CREATE TABLE contacto_mensaje (
  Id_Mensaje INT UNSIGNED NOT NULL AUTO_INCREMENT,
  Nombre     VARCHAR(80)  NOT NULL,
  Email      VARCHAR(120) NOT NULL,
  Asunto     VARCHAR(80)  NULL,
  Mensaje    TEXT         NOT NULL,
  Creado_En  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  Atendido   TINYINT(1)   NOT NULL DEFAULT 0,
  PRIMARY KEY (Id_Mensaje)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------------
-- Parámetros del sistema (IVA, tasas, vigencia): equivalen a CONFIG en JS
-- ---------------------------------------------------------------------------
CREATE TABLE parametro (
  Clave  VARCHAR(40)  NOT NULL,
  Valor  VARCHAR(120) NOT NULL,
  Nota   VARCHAR(160) NULL,
  PRIMARY KEY (Clave)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------------
-- VISTAS de apoyo a los subprocesos 4.1 y 4.2
-- ---------------------------------------------------------------------------

-- 4.1 Consolidar reservas: reservas agrupadas por itinerario
CREATE OR REPLACE VIEW v_reservas_consolidadas AS
SELECT r.Id_Itinerario,
       COUNT(*)                AS N_Reservas,
       SUM(r.Monto_Reserva)    AS Monto_Subtotal_Reservas,
       SUM(CASE WHEN r.Tipo_Servicio = 'VUELO'     THEN r.Monto_Reserva ELSE 0 END) AS Monto_Vuelos,
       SUM(CASE WHEN r.Tipo_Servicio = 'HOTEL'     THEN r.Monto_Reserva ELSE 0 END) AS Monto_Hoteles,
       SUM(CASE WHEN r.Tipo_Servicio = 'ACTIVIDAD' THEN r.Monto_Reserva ELSE 0 END) AS Monto_Actividades
FROM reserva r
WHERE r.Estado_Reserva <> 'Cancelado'
GROUP BY r.Id_Itinerario;

-- 4.2 Tarifa vigente por servicio (la más reciente que cubre la fecha de hoy)
CREATE OR REPLACE VIEW v_precio_vigente AS
SELECT p.*
FROM precio_bloqueado p
WHERE CURDATE() BETWEEN p.Fecha_Vigencia_Inicio AND p.Fecha_Vigencia_Fin;

-- Reporte de cotizaciones con datos del cliente
CREATE OR REPLACE VIEW v_cotizacion_reporte AS
SELECT c.Id_Cotizacion, c.Fecha_Emision, c.Monto_Total, c.Estado, c.Vence_El,
       cl.Id_Cliente, cl.Nombre AS Cliente,
       i.Id_Itinerario, i.Origen, i.Destino, i.Fecha_Salida, i.Fecha_Regreso, i.N_Pasajeros
FROM cotizacion c
JOIN cliente    cl ON cl.Id_Cliente    = c.Id_Cliente
JOIN itinerario i  ON i.Id_Itinerario  = c.Id_Itinerario;

-- ---------------------------------------------------------------------------
-- Disparador: al confirmar una reserva se descuenta el inventario
-- ---------------------------------------------------------------------------
DELIMITER //
CREATE TRIGGER trg_reserva_descuenta_inventario
AFTER INSERT ON reserva FOR EACH ROW
BEGIN
  IF NEW.Estado_Reserva = 'Confirmado' THEN
    IF NEW.Tipo_Servicio = 'VUELO' THEN
      UPDATE vuelo
         SET Asientos_Disponibles = GREATEST(Asientos_Disponibles - NEW.N_Personas, 0),
             Estado = IF(Asientos_Disponibles - NEW.N_Personas <= 0, 'Agotado', 'Disponible')
       WHERE Id_Vuelo = NEW.Id_Referencia;
    ELSEIF NEW.Tipo_Servicio = 'ACTIVIDAD' THEN
      UPDATE actividad
         SET Cupos_Libres = GREATEST(Cupos_Libres - NEW.N_Personas, 0)
       WHERE Id_Actividad = NEW.Id_Referencia;
    ELSEIF NEW.Tipo_Servicio = 'HOTEL' THEN
      UPDATE hotel
         SET Habitaciones_Libres = GREATEST(Habitaciones_Libres - 1, 0)
       WHERE Id_Hotel = NEW.Id_Referencia;
    END IF;
  END IF;
END//
DELIMITER ;

-- ---------------------------------------------------------------------------
-- Usuario de aplicación con permisos mínimos
-- ---------------------------------------------------------------------------
-- CREATE USER 'siglv_app'@'localhost' IDENTIFIED BY 'cambia_esta_clave';
-- GRANT SELECT, INSERT, UPDATE ON siglv.* TO 'siglv_app'@'localhost';
-- FLUSH PRIVILEGES;
