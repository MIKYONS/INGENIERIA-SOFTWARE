-- ===========================================================================
-- SIGLV · Datos de carga inicial (seed)
-- Mismos registros que js/datos.js, para que la demo y la base coincidan.
--   mysql -u root -p siglv < sql/siglv_seed.sql
-- ===========================================================================
USE siglv;
SET NAMES utf8mb4;

-- ------------------------------ ciudad ------------------------------------
INSERT INTO ciudad (Codigo, Ciudad, Pais) VALUES
  ('MEX', 'Ciudad de México', 'México'),
  ('GDL', 'Guadalajara', 'México'),
  ('MTY', 'Monterrey', 'México'),
  ('CUN', 'Cancún', 'México'),
  ('CDG', 'París', 'Francia'),
  ('MAD', 'Madrid', 'España'),
  ('FCO', 'Roma', 'Italia'),
  ('JFK', 'Nueva York', 'Estados Unidos'),
  ('NRT', 'Tokio', 'Japón');

-- ----------------------------- parametro ----------------------------------
INSERT INTO parametro (Clave, Valor, Nota) VALUES
  ('porcentaje_iva', '16', 'IVA aplicado por el subproceso 4.3'),
  ('tasa_aeroportuaria', '1250', 'Tasas aeroportuarias por pasajero (MXN)'),
  ('validez_oferta_dias', '15', 'Validez_Oferta del presupuesto'),
  ('moneda', 'MXN', 'Moneda base del sistema'),
  ('razon_social', 'SIGLV · Sistema Integral de Gestión y Logística de Viajes', 'Encabezado del documento PDF'),
  ('rfc', 'SIG260101XY9', 'RFC impreso en la cotización'),
  ('domicilio', 'Av. Reforma 222, Col. Juárez, CDMX, México', 'Domicilio fiscal'),
  ('contacto', 'contacto@siglv.mx · (55) 1234 5678', 'Datos de contacto del pie del PDF');

-- ------------------------------ usuario -----------------------------------
-- Contraseña de ambos: siglv2026  (hash generado con password_hash de PHP)
INSERT INTO usuario (Nombre, Email, Password_Hash, Rol) VALUES
  ('Rodrigo Beltrán', 'rodrigo@siglv.mx', '$2y$10$e0NRxTj9Qk9m3vUqQ0t9VeJ8xH1Zr6YbQ4oP2sN7wK5aC8dF1gH3u', 'agente'),
  ('Mariana Ortiz',   'mariana@siglv.mx', '$2y$10$e0NRxTj9Qk9m3vUqQ0t9VeJ8xH1Zr6YbQ4oP2sN7wK5aC8dF1gH3u', 'capturista');
-- Para regenerar el hash:  php -r "echo password_hash('siglv2026', PASSWORD_DEFAULT);"

-- ------------------------------ cliente -----------------------------------
INSERT INTO cliente (Id_Cliente, Nombre, Email, Telefono, Documento) VALUES
  ('CLI-000101', 'Familia Herrera Soto', 'herrera.soto@mail.com', '5512345678', 'H4581209'),
  ('CLI-000102', 'Sofía Ramírez Lara', 'sofia.rl@mail.com', '5587654321', 'R9137465'),
  ('CLI-000103', 'Grupo Corporativo Vela', 'viajes@vela.mx', '8181002030', 'VEL880912');

-- -------------------------- ALMACÉN VU · vuelo ----------------------------
INSERT INTO vuelo (Id_Vuelo, Codigo_Aerolinea, Aerolinea, Origen, Destino, Hora_Salida,
  Duracion_Minutos, Escalas, Escala_En, Clase_Tarifa, Precio_Base, Equipaje,
  Asientos_Disponibles, Estado, Dias_Operacion) VALUES
  ('VUE-1024', 'IBE', 'Iberia', 'MEX', 'CDG', '23:55:00', 810, 1, 'MAD', 'Económica', 25995.5, '1 × 23 kg', 34, 'Disponible', '1356'),
  ('VUE-1025', 'AFR', 'Air France', 'MEX', 'CDG', '20:10:00', 660, 0, '—', 'Económica', 29100, '1 × 23 kg', 12, 'Disponible', '0123456'),
  ('VUE-1026', 'AFR', 'Air France', 'MEX', 'CDG', '20:10:00', 660, 0, '—', 'Ejecutiva', 68400, '2 × 32 kg', 6, 'Disponible', '146'),
  ('VUE-1027', 'LHA', 'Lufthansa', 'MEX', 'CDG', '18:40:00', 870, 1, 'FRA', 'Económica', 23800, '1 × 23 kg', 0, 'Agotado', '25'),
  ('VUE-1031', 'IBE', 'Iberia', 'MEX', 'MAD', '22:30:00', 620, 0, '—', 'Económica', 21450, '1 × 23 kg', 41, 'Disponible', '0246'),
  ('VUE-1032', 'AMX', 'Aeroméxico', 'MEX', 'MAD', '19:05:00', 605, 0, '—', 'Premier', 52300, '2 × 32 kg', 9, 'Disponible', '135'),
  ('VUE-1044', 'ITA', 'ITA Airways', 'MEX', 'FCO', '21:15:00', 720, 1, 'MAD', 'Económica', 26750, '1 × 23 kg', 27, 'Disponible', '035'),
  ('VUE-1051', 'AMX', 'Aeroméxico', 'MEX', 'JFK', '07:40:00', 305, 0, '—', 'Económica', 8950, 'Carry-on', 58, 'Disponible', '0123456'),
  ('VUE-1052', 'DAL', 'Delta', 'MEX', 'JFK', '13:20:00', 315, 0, '—', 'Ejecutiva', 24600, '2 × 23 kg', 11, 'Disponible', '1246'),
  ('VUE-1061', 'ANA', 'All Nippon', 'MEX', 'NRT', '01:05:00', 845, 1, 'YVR', 'Económica', 34200, '2 × 23 kg', 19, 'Disponible', '024'),
  ('VUE-1070', 'VIV', 'Viva', 'MEX', 'CUN', '06:30:00', 150, 0, '—', 'Económica', 1980, 'Personal', 84, 'Disponible', '0123456'),
  ('VUE-1071', 'AMX', 'Aeroméxico', 'GDL', 'CUN', '09:15:00', 175, 0, '—', 'Económica', 3450, '1 × 25 kg', 46, 'Disponible', '1356'),
  ('VUE-1080', 'IBE', 'Iberia', 'MTY', 'MAD', '20:45:00', 650, 1, 'MEX', 'Económica', 24990, '1 × 23 kg', 22, 'Disponible', '246');

-- -------------------------- ALMACÉN HT · hotel ----------------------------
INSERT INTO hotel (Id_Hotel, Nombre_Comercial, Ciudad, Ubicacion, Distancia_Destino,
  Categoria, Nivel_Seguridad, Tipo_Habitacion, Tarifa_Noche, Habitaciones_Libres,
  Servicios, Cancelacion) VALUES
  ('HTL-501', 'Hôtel Alizé Montmartre', 'CDG', '18e · Montmartre', 7.4, 3, 3, 'Doble estándar', 2400, 6, 'Wi-Fi, Desayuno', 'Gratis 48 h antes'),
  ('HTL-502', 'Le Marais Rive Gauche', 'CDG', '4e · Le Marais', 4.1, 4, 4, 'Superior', 4300, 3, 'Wi-Fi, Gym, Desayuno', 'Gratis 72 h antes'),
  ('HTL-503', 'Grand Palais Vendôme', 'CDG', '1er · Vendôme', 2.8, 5, 5, 'Suite', 14500, 2, 'Spa, Concierge, Valet', 'No reembolsable'),
  ('HTL-504', 'Ibis Budget Nation', 'CDG', '11e · Nation', 9.6, 2, 2, 'Sencilla', 1500, 14, 'Wi-Fi', 'Gratis 24 h antes'),
  ('HTL-511', 'Hotel Puerta de Alcalá', 'MAD', 'Salamanca', 3.2, 4, 4, 'Doble superior', 3100, 8, 'Wi-Fi, Desayuno, Gym', 'Gratis 48 h antes'),
  ('HTL-512', 'Sol Gran Vía Suites', 'MAD', 'Centro · Gran Vía', 1.9, 3, 3, 'Estudio', 2250, 11, 'Wi-Fi, Cocineta', 'Gratis 24 h antes'),
  ('HTL-521', 'Trastevere Boutique', 'FCO', 'Trastevere', 5.5, 4, 4, 'Doble clásica', 2980, 5, 'Wi-Fi, Terraza', 'Gratis 72 h antes'),
  ('HTL-522', 'Roma Termini Express', 'FCO', 'Esquilino · Termini', 8.9, 2, 2, 'Sencilla', 1320, 18, 'Wi-Fi', 'No reembolsable'),
  ('HTL-531', 'Midtown Garden Hotel', 'JFK', 'Midtown Manhattan', 6.7, 4, 5, 'Queen', 5600, 7, 'Wi-Fi, Gym, Business center', 'Gratis 48 h antes'),
  ('HTL-532', 'Brooklyn Loft Stay', 'JFK', 'Williamsburg', 11.2, 3, 3, 'Loft doble', 3400, 4, 'Wi-Fi, Cocineta', 'Gratis 24 h antes'),
  ('HTL-541', 'Shinjuku Sky Inn', 'NRT', 'Shinjuku', 12.4, 4, 5, 'Doble japonesa', 3850, 9, 'Wi-Fi, Onsen, Desayuno', 'Gratis 72 h antes'),
  ('HTL-551', 'Riviera Caribe All Inclusive', 'CUN', 'Zona Hotelera km 14', 14.8, 5, 4, 'Vista al mar', 6900, 21, 'Todo incluido, Spa, Playa', 'Gratis 7 días antes'),
  ('HTL-552', 'Centro Cancún Urban', 'CUN', 'Centro · Av. Tulum', 4.3, 3, 3, 'Doble estándar', 1750, 16, 'Wi-Fi, Alberca', 'Gratis 24 h antes');

-- ------------------------ ALMACÉN AC · actividad --------------------------
INSERT INTO actividad (Id_Actividad, Nombre_Tour, Ciudad, Ubicacion, Distancia_Hotel,
  Hora_Inicio, Duracion_Estimada, Costo_Persona, Cupos_Maximos, Cupos_Libres, Tipo,
  Operacion_Diaria, Fecha_Ejecucion) VALUES
  ('ACT-01', 'Museo del Louvre · acceso guiado', 'CDG', '1er · Rivoli', 3.1, '09:30:00', '03:00:00', 460, 30, 12, 'Cultura', 1, NULL),
  ('ACT-02', 'Torre Eiffel · nivel 2', 'CDG', '7e · Champ de Mars', 4.8, '11:00:00', '02:00:00', 610, 40, 25, 'Cultura', 1, NULL),
  ('ACT-03', 'Paseo en barco por el Sena', 'CDG', '7e · Pont de l\'Alma', 5.2, '18:30:00', '01:30:00', 355, 60, 38, 'Relajación', 1, NULL),
  ('ACT-04', 'Montmartre y Sacré-Cœur a pie', 'CDG', '18e · Montmartre', 1.2, '10:00:00', '02:00:00', 0, 25, 25, 'Cultura', 1, NULL),
  ('ACT-05', 'Versalles · palacio y jardines', 'CDG', 'Afuera · Versalles', 22.6, '08:00:00', '06:00:00', 720, 20, 4, 'Cultura', 0, '2026-12-08'),
  ('ACT-06', 'Cata de vinos en Le Marais', 'CDG', '4e · Le Marais', 2.4, '19:00:00', '02:00:00', 690, 14, 0, 'Gastronomía', 1, NULL),
  ('ACT-11', 'Museo del Prado · colección permanente', 'MAD', 'Centro · Paseo del Prado', 2.2, '10:00:00', '02:30:00', 330, 35, 20, 'Cultura', 1, NULL),
  ('ACT-12', 'Tapas tour por La Latina', 'MAD', 'La Latina', 3, '20:00:00', '03:00:00', 780, 16, 9, 'Gastronomía', 1, NULL),
  ('ACT-13', 'Toledo de día completo', 'MAD', 'Afuera · Toledo', 71, '08:30:00', '08:00:00', 1150, 24, 14, 'Cultura', 1, NULL),
  ('ACT-21', 'Coliseo y Foro Romano', 'FCO', 'Centro histórico', 3.6, '09:00:00', '03:00:00', 690, 28, 16, 'Cultura', 1, NULL),
  ('ACT-22', 'Museos Vaticanos y Capilla Sixtina', 'FCO', 'Vaticano', 4.9, '08:00:00', '04:00:00', 880, 30, 6, 'Cultura', 1, NULL),
  ('ACT-23', 'Clase de pasta casera', 'FCO', 'Trastevere', 0.8, '17:30:00', '02:30:00', 950, 12, 7, 'Gastronomía', 1, NULL),
  ('ACT-31', 'Estatua de la Libertad y Ellis Island', 'JFK', 'Battery Park', 8.1, '09:30:00', '04:00:00', 720, 50, 31, 'Cultura', 1, NULL),
  ('ACT-32', 'Top of the Rock al atardecer', 'JFK', 'Rockefeller Center', 1.1, '17:00:00', '01:30:00', 830, 40, 22, 'Aventura', 1, NULL),
  ('ACT-33', 'Central Park en bicicleta', 'JFK', 'Central Park', 2.6, '10:00:00', '02:00:00', 0, 20, 20, 'Relajación', 1, NULL),
  ('ACT-41', 'Templo Senso-ji y Asakusa', 'NRT', 'Asakusa', 9.3, '09:00:00', '03:00:00', 0, 30, 30, 'Cultura', 1, NULL),
  ('ACT-42', 'Excursión al Monte Fuji', 'NRT', 'Afuera · Yamanashi', 103, '07:00:00', '10:00:00', 1980, 22, 8, 'Aventura', 0, '2027-03-14'),
  ('ACT-43', 'Ceremonia del té en Ginza', 'NRT', 'Ginza', 6.2, '16:00:00', '01:30:00', 640, 10, 5, 'Cultura', 1, NULL),
  ('ACT-51', 'Chichén Itzá con cenote', 'CUN', 'Afuera · Yucatán', 198, '07:30:00', '11:00:00', 1490, 45, 27, 'Cultura', 1, NULL),
  ('ACT-52', 'Snorkel en Isla Mujeres', 'CUN', 'Isla Mujeres', 16.4, '08:30:00', '06:00:00', 1180, 35, 19, 'Aventura', 1, NULL),
  ('ACT-53', 'Atardecer en playa Delfines', 'CUN', 'Zona Hotelera km 17', 2.9, '18:00:00', '01:30:00', 0, 60, 60, 'Relajación', 1, NULL);

-- -------------------- ALMACÉN PR · precio_bloqueado ----------------------
INSERT INTO precio_bloqueado (Id_Tarifa, Tipo_Servicio, Id_Referencia, Precio_Unitario,
  Moneda, Fecha_Vigencia_Inicio, Fecha_Vigencia_Fin, Porcentaje_Impuesto) VALUES
  ('TAR-0001', 'VUELO', 'VUE-1024', 25995.5, 'MXN', '2026-09-01', '2027-03-31', 16),
  ('TAR-0002', 'VUELO', 'VUE-1025', 28500, 'MXN', '2026-10-01', '2027-01-31', 16),
  ('TAR-0003', 'VUELO', 'VUE-1031', 20900, 'MXN', '2026-10-01', '2027-02-28', 16),
  ('TAR-0004', 'VUELO', 'VUE-1070', 1880, 'MXN', '2026-10-01', '2026-12-20', 16),
  ('TAR-0101', 'HOTEL', 'HTL-502', 4150, 'MXN', '2026-09-15', '2027-03-31', 16),
  ('TAR-0102', 'HOTEL', 'HTL-501', 2280, 'MXN', '2026-09-15', '2027-03-31', 16),
  ('TAR-0103', 'HOTEL', 'HTL-551', 6500, 'MXN', '2026-11-01', '2027-04-30', 16),
  ('TAR-0201', 'ACTIVIDAD', 'ACT-01', 440, 'MXN', '2026-09-01', '2027-06-30', 16),
  ('TAR-0202', 'ACTIVIDAD', 'ACT-05', 700, 'MXN', '2026-09-01', '2027-06-30', 16),
  ('TAR-0203', 'ACTIVIDAD', 'ACT-51', 1420, 'MXN', '2026-10-01', '2027-05-31', 16);

-- ------------------------------- video ------------------------------------
INSERT INTO video (Titulo, Archivo, Poster, Orden) VALUES
  ('La agencia', 'img/empresa.mp4', 'img/principal.jpg', 1),
  ('Destinos 2027', 'img/empresa.mp4', 'img/items/item8.jpg', 2),
  ('Cómo cotizamos', 'img/empresa.mp4', 'img/test-bg.jpg', 3);

-- ----------------------------- testimonio ---------------------------------
INSERT INTO testimonio (Nombre, Rol, Texto, Imagen) VALUES
  ('Laura Gómez', 'Viaje familiar a París', 'Nos entregaron la cotización desglosada el mismo día. Saber exactamente qué incluía cada peso hizo la decisión fácil.', 'img/testimonios/persona1.jpg'),
  ('Carlos Rodríguez', 'Viaje corporativo a Madrid', 'Armaron vuelo, hotel y traslados para ocho personas sin un solo cruce de horarios. El itinerario llegó en PDF listo para firmar.', 'img/testimonios/persona2.jpg'),
  ('Sara Pérez', 'Luna de miel en Roma', 'Me gustó que los precios quedaron bloqueados desde el primer día. No hubo sorpresas al momento de pagar.', 'img/testimonios/persona3.jpg'),
  ('Alejandro Fernández', 'Aventura en Japón', 'Verificaron los cupos del tour al Fuji antes de confirmarme. Ese detalle me ahorró el viaje en falso.', 'img/testimonios/persona4.jpg');

-- ===========================================================================
-- Consultas de verificación
-- ===========================================================================
-- Subproceso 1.2 · Buscar vuelos (MEX → CDG el 2026-12-06, 3 pasajeros)
-- SELECT Id_Vuelo, Aerolinea, Clase_Tarifa, Precio_Base,
--        TIMESTAMP(DATE '2026-12-06', Hora_Salida) AS Fecha_Hora_Salida,
--        TIMESTAMP(DATE '2026-12-06', Hora_Salida) + INTERVAL Duracion_Minutos MINUTE AS Fecha_Hora_Llegada
--   FROM vuelo
--  WHERE Origen='MEX' AND Destino='CDG' AND Estado='Disponible'
--    AND Asientos_Disponibles >= 3
--    AND LOCATE(DAYOFWEEK(DATE '2026-12-06')-1, Dias_Operacion) > 0
--  ORDER BY Precio_Base;

-- Subprocesos 2.1 y 2.2 · hoteles cercanos y seguros
-- SELECT * FROM hotel
--  WHERE Ciudad='CDG' AND Distancia_Destino <= 15
--    AND Nivel_Seguridad >= 3 AND Habitaciones_Libres >= 1
--  ORDER BY Tarifa_Noche;

-- Subprocesos 3.1 y 3.2 · actividades cercanas con cupo
-- SELECT * FROM actividad
--  WHERE Ciudad='CDG' AND Distancia_Hotel <= 30 AND Cupos_Libres >= 3
--    AND (Operacion_Diaria = 1
--         OR Fecha_Ejecucion BETWEEN '2026-12-06' AND '2026-12-13');
