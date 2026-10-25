/* ============================================================================
   SIGLV · datos.js
   Espejo en memoria de la base de datos. Cada colección corresponde 1 a 1 con
   una tabla de MySQL (ver sql/siglv_schema.sql) y usa EXACTAMENTE los nombres
   de campo del Diccionario de Datos del sistema de viajes.

   Almacenes del DFD:
     VU → DB.vuelo              HT → DB.hotel          AC → DB.actividad
     RE → DB.reserva            PR → DB.precio_bloqueado

   Al migrar a PHP/MySQL este archivo puede dejar de cargarse: api.js toma los
   mismos datos desde los endpoints de /api. Ver js/api.js → API.modo.
   ========================================================================= */
'use strict';

/* --------------------------- Parámetros del sistema --------------------- */
const CONFIG = {
  moneda: 'MXN',
  locale: 'es-MX',
  porcentaje_iva: 16,             // Monto_Impuestos = Subtotal * IVA
  tasa_aeroportuaria: 1250,       // Tasas_Aeroportuarias por pasajero (MXN)
  validez_oferta_dias: 15,        // Validez_Oferta del presupuesto
  margen_servicio: 0,             // comisión de agencia (%) opcional
  nombre_sistema: 'SIGLV',
  razon_social: 'SIGLV · Sistema Integral de Gestión y Logística de Viajes',
  rfc: 'SIG260101XY9',
  domicilio: 'Av. Reforma 222, Col. Juárez, CDMX, México',
  contacto: 'contacto@siglv.mx · (55) 1234 5678'
};

/* ----------------------------- Catálogo auxiliar ------------------------ */
const CIUDADES = [
  { codigo:'MEX', ciudad:'Ciudad de México', pais:'México' },
  { codigo:'GDL', ciudad:'Guadalajara',      pais:'México' },
  { codigo:'MTY', ciudad:'Monterrey',        pais:'México' },
  { codigo:'CUN', ciudad:'Cancún',           pais:'México' },
  { codigo:'CDG', ciudad:'París',            pais:'Francia' },
  { codigo:'MAD', ciudad:'Madrid',           pais:'España' },
  { codigo:'FCO', ciudad:'Roma',             pais:'Italia' },
  { codigo:'JFK', ciudad:'Nueva York',       pais:'Estados Unidos' },
  { codigo:'NRT', ciudad:'Tokio',            pais:'Japón' }
];

const DB = {

  /* ===================== TABLA cliente ================================= */
  cliente: [
    { Id_Cliente:'CLI-000101', Nombre:'Familia Herrera Soto', Email:'herrera.soto@mail.com',
      Telefono:'5512345678', Documento:'H4581209' },
    { Id_Cliente:'CLI-000102', Nombre:'Sofía Ramírez Lara',   Email:'sofia.rl@mail.com',
      Telefono:'5587654321', Documento:'R9137465' },
    { Id_Cliente:'CLI-000103', Nombre:'Grupo Corporativo Vela', Email:'viajes@vela.mx',
      Telefono:'8181002030', Documento:'VEL880912' }
  ],

  /* ===================== ALMACÉN VU · TABLA vuelo =======================
     El almacén guarda el itinerario base (recurrente). El subproceso 1.2
     materializa Fecha_Hora_Salida / Fecha_Hora_Llegada para la fecha pedida.
     Dias_Operacion: 0=Dom … 6=Sáb                                          */
  vuelo: [
    { Id_Vuelo:'VUE-1024', Codigo_Aerolinea:'IBE', Aerolinea:'Iberia',
      Origen:'MEX', Destino:'CDG', Hora_Salida:'23:55', Duracion_Minutos:810,
      Escalas:1, Escala_En:'MAD', Clase_Tarifa:'Económica', Precio_Base:25995.50,
      Equipaje:'1 × 23 kg', Asientos_Disponibles:34, Estado:'Disponible', Dias_Operacion:[0,1,2,3,5,6] },
    { Id_Vuelo:'VUE-1025', Codigo_Aerolinea:'AFR', Aerolinea:'Air France',
      Origen:'MEX', Destino:'CDG', Hora_Salida:'20:10', Duracion_Minutos:660,
      Escalas:0, Escala_En:'—', Clase_Tarifa:'Económica', Precio_Base:29100.00,
      Equipaje:'1 × 23 kg', Asientos_Disponibles:12, Estado:'Disponible', Dias_Operacion:[0,1,2,3,4,5,6] },
    { Id_Vuelo:'VUE-1026', Codigo_Aerolinea:'AFR', Aerolinea:'Air France',
      Origen:'MEX', Destino:'CDG', Hora_Salida:'20:10', Duracion_Minutos:660,
      Escalas:0, Escala_En:'—', Clase_Tarifa:'Ejecutiva', Precio_Base:68400.00,
      Equipaje:'2 × 32 kg', Asientos_Disponibles:6, Estado:'Disponible', Dias_Operacion:[0,1,4,6] },
    { Id_Vuelo:'VUE-1027', Codigo_Aerolinea:'LHA', Aerolinea:'Lufthansa',
      Origen:'MEX', Destino:'CDG', Hora_Salida:'18:40', Duracion_Minutos:870,
      Escalas:1, Escala_En:'FRA', Clase_Tarifa:'Económica', Precio_Base:23800.00,
      Equipaje:'1 × 23 kg', Asientos_Disponibles:0,  Estado:'Agotado',   Dias_Operacion:[2,5] },
    { Id_Vuelo:'VUE-1031', Codigo_Aerolinea:'IBE', Aerolinea:'Iberia',
      Origen:'MEX', Destino:'MAD', Hora_Salida:'22:30', Duracion_Minutos:620,
      Escalas:0, Escala_En:'—', Clase_Tarifa:'Económica', Precio_Base:21450.00,
      Equipaje:'1 × 23 kg', Asientos_Disponibles:41, Estado:'Disponible', Dias_Operacion:[0,1,2,4,5,6] },
    { Id_Vuelo:'VUE-1032', Codigo_Aerolinea:'AMX', Aerolinea:'Aeroméxico',
      Origen:'MEX', Destino:'MAD', Hora_Salida:'19:05', Duracion_Minutos:605,
      Escalas:0, Escala_En:'—', Clase_Tarifa:'Premier', Precio_Base:52300.00,
      Equipaje:'2 × 32 kg', Asientos_Disponibles:9,  Estado:'Disponible', Dias_Operacion:[0,1,3,5] },
    { Id_Vuelo:'VUE-1044', Codigo_Aerolinea:'ITA', Aerolinea:'ITA Airways',
      Origen:'MEX', Destino:'FCO', Hora_Salida:'21:15', Duracion_Minutos:720,
      Escalas:1, Escala_En:'MAD', Clase_Tarifa:'Económica', Precio_Base:26750.00,
      Equipaje:'1 × 23 kg', Asientos_Disponibles:27, Estado:'Disponible', Dias_Operacion:[0,2,3,5,6] },
    { Id_Vuelo:'VUE-1051', Codigo_Aerolinea:'AMX', Aerolinea:'Aeroméxico',
      Origen:'MEX', Destino:'JFK', Hora_Salida:'07:40', Duracion_Minutos:305,
      Escalas:0, Escala_En:'—', Clase_Tarifa:'Económica', Precio_Base:8950.00,
      Equipaje:'Carry-on', Asientos_Disponibles:58, Estado:'Disponible', Dias_Operacion:[0,1,2,3,4,5,6] },
    { Id_Vuelo:'VUE-1052', Codigo_Aerolinea:'DAL', Aerolinea:'Delta',
      Origen:'MEX', Destino:'JFK', Hora_Salida:'13:20', Duracion_Minutos:315,
      Escalas:0, Escala_En:'—', Clase_Tarifa:'Ejecutiva', Precio_Base:24600.00,
      Equipaje:'2 × 23 kg', Asientos_Disponibles:11, Estado:'Disponible', Dias_Operacion:[1,2,4,6] },
    { Id_Vuelo:'VUE-1061', Codigo_Aerolinea:'ANA', Aerolinea:'All Nippon',
      Origen:'MEX', Destino:'NRT', Hora_Salida:'01:05', Duracion_Minutos:845,
      Escalas:1, Escala_En:'YVR', Clase_Tarifa:'Económica', Precio_Base:34200.00,
      Equipaje:'2 × 23 kg', Asientos_Disponibles:19, Estado:'Disponible', Dias_Operacion:[0,2,4,6] },
    { Id_Vuelo:'VUE-1070', Codigo_Aerolinea:'VIV', Aerolinea:'Viva',
      Origen:'MEX', Destino:'CUN', Hora_Salida:'06:30', Duracion_Minutos:150,
      Escalas:0, Escala_En:'—', Clase_Tarifa:'Económica', Precio_Base:1980.00,
      Equipaje:'Personal', Asientos_Disponibles:84, Estado:'Disponible', Dias_Operacion:[0,1,2,3,4,5,6] },
    { Id_Vuelo:'VUE-1071', Codigo_Aerolinea:'AMX', Aerolinea:'Aeroméxico',
      Origen:'GDL', Destino:'CUN', Hora_Salida:'09:15', Duracion_Minutos:175,
      Escalas:0, Escala_En:'—', Clase_Tarifa:'Económica', Precio_Base:3450.00,
      Equipaje:'1 × 25 kg', Asientos_Disponibles:46, Estado:'Disponible', Dias_Operacion:[1,3,5,6] },
    { Id_Vuelo:'VUE-1080', Codigo_Aerolinea:'IBE', Aerolinea:'Iberia',
      Origen:'MTY', Destino:'MAD', Hora_Salida:'20:45', Duracion_Minutos:650,
      Escalas:1, Escala_En:'MEX', Clase_Tarifa:'Económica', Precio_Base:24990.00,
      Equipaje:'1 × 23 kg', Asientos_Disponibles:22, Estado:'Disponible', Dias_Operacion:[0,2,4,6] }
  ],

  /* ===================== ALMACÉN HT · TABLA hotel ======================= */
  hotel: [
    { Id_Hotel:'HTL-501', Nombre_Comercial:'Hôtel Alizé Montmartre', Ciudad:'CDG',
      Ubicacion:'18e · Montmartre', Distancia_Destino:7.4, Categoria:3, Nivel_Seguridad:3,
      Tipo_Habitacion:'Doble estándar', Tarifa_Noche:2400, Habitaciones_Libres:6,
      Servicios:'Wi-Fi, Desayuno', Cancelacion:'Gratis 48 h antes' },
    { Id_Hotel:'HTL-502', Nombre_Comercial:'Le Marais Rive Gauche', Ciudad:'CDG',
      Ubicacion:'4e · Le Marais', Distancia_Destino:4.1, Categoria:4, Nivel_Seguridad:4,
      Tipo_Habitacion:'Superior', Tarifa_Noche:4300, Habitaciones_Libres:3,
      Servicios:'Wi-Fi, Gym, Desayuno', Cancelacion:'Gratis 72 h antes' },
    { Id_Hotel:'HTL-503', Nombre_Comercial:'Grand Palais Vendôme', Ciudad:'CDG',
      Ubicacion:'1er · Vendôme', Distancia_Destino:2.8, Categoria:5, Nivel_Seguridad:5,
      Tipo_Habitacion:'Suite', Tarifa_Noche:14500, Habitaciones_Libres:2,
      Servicios:'Spa, Concierge, Valet', Cancelacion:'No reembolsable' },
    { Id_Hotel:'HTL-504', Nombre_Comercial:'Ibis Budget Nation', Ciudad:'CDG',
      Ubicacion:'11e · Nation', Distancia_Destino:9.6, Categoria:2, Nivel_Seguridad:2,
      Tipo_Habitacion:'Sencilla', Tarifa_Noche:1500, Habitaciones_Libres:14,
      Servicios:'Wi-Fi', Cancelacion:'Gratis 24 h antes' },
    { Id_Hotel:'HTL-511', Nombre_Comercial:'Hotel Puerta de Alcalá', Ciudad:'MAD',
      Ubicacion:'Salamanca', Distancia_Destino:3.2, Categoria:4, Nivel_Seguridad:4,
      Tipo_Habitacion:'Doble superior', Tarifa_Noche:3100, Habitaciones_Libres:8,
      Servicios:'Wi-Fi, Desayuno, Gym', Cancelacion:'Gratis 48 h antes' },
    { Id_Hotel:'HTL-512', Nombre_Comercial:'Sol Gran Vía Suites', Ciudad:'MAD',
      Ubicacion:'Centro · Gran Vía', Distancia_Destino:1.9, Categoria:3, Nivel_Seguridad:3,
      Tipo_Habitacion:'Estudio', Tarifa_Noche:2250, Habitaciones_Libres:11,
      Servicios:'Wi-Fi, Cocineta', Cancelacion:'Gratis 24 h antes' },
    { Id_Hotel:'HTL-521', Nombre_Comercial:'Trastevere Boutique', Ciudad:'FCO',
      Ubicacion:'Trastevere', Distancia_Destino:5.5, Categoria:4, Nivel_Seguridad:4,
      Tipo_Habitacion:'Doble clásica', Tarifa_Noche:2980, Habitaciones_Libres:5,
      Servicios:'Wi-Fi, Terraza', Cancelacion:'Gratis 72 h antes' },
    { Id_Hotel:'HTL-522', Nombre_Comercial:'Roma Termini Express', Ciudad:'FCO',
      Ubicacion:'Esquilino · Termini', Distancia_Destino:8.9, Categoria:2, Nivel_Seguridad:2,
      Tipo_Habitacion:'Sencilla', Tarifa_Noche:1320, Habitaciones_Libres:18,
      Servicios:'Wi-Fi', Cancelacion:'No reembolsable' },
    { Id_Hotel:'HTL-531', Nombre_Comercial:'Midtown Garden Hotel', Ciudad:'JFK',
      Ubicacion:'Midtown Manhattan', Distancia_Destino:6.7, Categoria:4, Nivel_Seguridad:5,
      Tipo_Habitacion:'Queen', Tarifa_Noche:5600, Habitaciones_Libres:7,
      Servicios:'Wi-Fi, Gym, Business center', Cancelacion:'Gratis 48 h antes' },
    { Id_Hotel:'HTL-532', Nombre_Comercial:'Brooklyn Loft Stay', Ciudad:'JFK',
      Ubicacion:'Williamsburg', Distancia_Destino:11.2, Categoria:3, Nivel_Seguridad:3,
      Tipo_Habitacion:'Loft doble', Tarifa_Noche:3400, Habitaciones_Libres:4,
      Servicios:'Wi-Fi, Cocineta', Cancelacion:'Gratis 24 h antes' },
    { Id_Hotel:'HTL-541', Nombre_Comercial:'Shinjuku Sky Inn', Ciudad:'NRT',
      Ubicacion:'Shinjuku', Distancia_Destino:12.4, Categoria:4, Nivel_Seguridad:5,
      Tipo_Habitacion:'Doble japonesa', Tarifa_Noche:3850, Habitaciones_Libres:9,
      Servicios:'Wi-Fi, Onsen, Desayuno', Cancelacion:'Gratis 72 h antes' },
    { Id_Hotel:'HTL-551', Nombre_Comercial:'Riviera Caribe All Inclusive', Ciudad:'CUN',
      Ubicacion:'Zona Hotelera km 14', Distancia_Destino:14.8, Categoria:5, Nivel_Seguridad:4,
      Tipo_Habitacion:'Vista al mar', Tarifa_Noche:6900, Habitaciones_Libres:21,
      Servicios:'Todo incluido, Spa, Playa', Cancelacion:'Gratis 7 días antes' },
    { Id_Hotel:'HTL-552', Nombre_Comercial:'Centro Cancún Urban', Ciudad:'CUN',
      Ubicacion:'Centro · Av. Tulum', Distancia_Destino:4.3, Categoria:3, Nivel_Seguridad:3,
      Tipo_Habitacion:'Doble estándar', Tarifa_Noche:1750, Habitaciones_Libres:16,
      Servicios:'Wi-Fi, Alberca', Cancelacion:'Gratis 24 h antes' }
  ],

  /* ================== ALMACÉN AC · TABLA actividad ======================
     Operacion_Diaria = true → el subproceso 3.2 le asigna una fecha dentro
     de la ventana del viaje. Si es false, sólo es viable cuando su
     Fecha_Ejecucion fija cae dentro de la ventana.                          */
  actividad: [
    { Id_Actividad:'ACT-01', Nombre_Tour:'Museo del Louvre · acceso guiado', Ciudad:'CDG',
      Ubicacion:'1er · Rivoli', Distancia_Hotel:3.1, Hora_Inicio:'09:30', Duracion_Estimada:'03:00',
      Costo_Persona:460, Cupos_Maximos:30, Cupos_Libres:12, Tipo:'Cultura',
      Operacion_Diaria:true, Fecha_Ejecucion:null },
    { Id_Actividad:'ACT-02', Nombre_Tour:'Torre Eiffel · nivel 2', Ciudad:'CDG',
      Ubicacion:'7e · Champ de Mars', Distancia_Hotel:4.8, Hora_Inicio:'11:00', Duracion_Estimada:'02:00',
      Costo_Persona:610, Cupos_Maximos:40, Cupos_Libres:25, Tipo:'Cultura',
      Operacion_Diaria:true, Fecha_Ejecucion:null },
    { Id_Actividad:'ACT-03', Nombre_Tour:'Paseo en barco por el Sena', Ciudad:'CDG',
      Ubicacion:'7e · Pont de l\'Alma', Distancia_Hotel:5.2, Hora_Inicio:'18:30', Duracion_Estimada:'01:30',
      Costo_Persona:355, Cupos_Maximos:60, Cupos_Libres:38, Tipo:'Relajación',
      Operacion_Diaria:true, Fecha_Ejecucion:null },
    { Id_Actividad:'ACT-04', Nombre_Tour:'Montmartre y Sacré-Cœur a pie', Ciudad:'CDG',
      Ubicacion:'18e · Montmartre', Distancia_Hotel:1.2, Hora_Inicio:'10:00', Duracion_Estimada:'02:00',
      Costo_Persona:0, Cupos_Maximos:25, Cupos_Libres:25, Tipo:'Cultura',
      Operacion_Diaria:true, Fecha_Ejecucion:null },
    { Id_Actividad:'ACT-05', Nombre_Tour:'Versalles · palacio y jardines', Ciudad:'CDG',
      Ubicacion:'Afuera · Versalles', Distancia_Hotel:22.6, Hora_Inicio:'08:00', Duracion_Estimada:'06:00',
      Costo_Persona:720, Cupos_Maximos:20, Cupos_Libres:4, Tipo:'Cultura',
      Operacion_Diaria:false, Fecha_Ejecucion:'2026-12-08' },
    { Id_Actividad:'ACT-06', Nombre_Tour:'Cata de vinos en Le Marais', Ciudad:'CDG',
      Ubicacion:'4e · Le Marais', Distancia_Hotel:2.4, Hora_Inicio:'19:00', Duracion_Estimada:'02:00',
      Costo_Persona:690, Cupos_Maximos:14, Cupos_Libres:0, Tipo:'Gastronomía',
      Operacion_Diaria:true, Fecha_Ejecucion:null },
    { Id_Actividad:'ACT-11', Nombre_Tour:'Museo del Prado · colección permanente', Ciudad:'MAD',
      Ubicacion:'Centro · Paseo del Prado', Distancia_Hotel:2.2, Hora_Inicio:'10:00', Duracion_Estimada:'02:30',
      Costo_Persona:330, Cupos_Maximos:35, Cupos_Libres:20, Tipo:'Cultura',
      Operacion_Diaria:true, Fecha_Ejecucion:null },
    { Id_Actividad:'ACT-12', Nombre_Tour:'Tapas tour por La Latina', Ciudad:'MAD',
      Ubicacion:'La Latina', Distancia_Hotel:3.0, Hora_Inicio:'20:00', Duracion_Estimada:'03:00',
      Costo_Persona:780, Cupos_Maximos:16, Cupos_Libres:9, Tipo:'Gastronomía',
      Operacion_Diaria:true, Fecha_Ejecucion:null },
    { Id_Actividad:'ACT-13', Nombre_Tour:'Toledo de día completo', Ciudad:'MAD',
      Ubicacion:'Afuera · Toledo', Distancia_Hotel:71.0, Hora_Inicio:'08:30', Duracion_Estimada:'08:00',
      Costo_Persona:1150, Cupos_Maximos:24, Cupos_Libres:14, Tipo:'Cultura',
      Operacion_Diaria:true, Fecha_Ejecucion:null },
    { Id_Actividad:'ACT-21', Nombre_Tour:'Coliseo y Foro Romano', Ciudad:'FCO',
      Ubicacion:'Centro histórico', Distancia_Hotel:3.6, Hora_Inicio:'09:00', Duracion_Estimada:'03:00',
      Costo_Persona:690, Cupos_Maximos:28, Cupos_Libres:16, Tipo:'Cultura',
      Operacion_Diaria:true, Fecha_Ejecucion:null },
    { Id_Actividad:'ACT-22', Nombre_Tour:'Museos Vaticanos y Capilla Sixtina', Ciudad:'FCO',
      Ubicacion:'Vaticano', Distancia_Hotel:4.9, Hora_Inicio:'08:00', Duracion_Estimada:'04:00',
      Costo_Persona:880, Cupos_Maximos:30, Cupos_Libres:6, Tipo:'Cultura',
      Operacion_Diaria:true, Fecha_Ejecucion:null },
    { Id_Actividad:'ACT-23', Nombre_Tour:'Clase de pasta casera', Ciudad:'FCO',
      Ubicacion:'Trastevere', Distancia_Hotel:0.8, Hora_Inicio:'17:30', Duracion_Estimada:'02:30',
      Costo_Persona:950, Cupos_Maximos:12, Cupos_Libres:7, Tipo:'Gastronomía',
      Operacion_Diaria:true, Fecha_Ejecucion:null },
    { Id_Actividad:'ACT-31', Nombre_Tour:'Estatua de la Libertad y Ellis Island', Ciudad:'JFK',
      Ubicacion:'Battery Park', Distancia_Hotel:8.1, Hora_Inicio:'09:30', Duracion_Estimada:'04:00',
      Costo_Persona:720, Cupos_Maximos:50, Cupos_Libres:31, Tipo:'Cultura',
      Operacion_Diaria:true, Fecha_Ejecucion:null },
    { Id_Actividad:'ACT-32', Nombre_Tour:'Top of the Rock al atardecer', Ciudad:'JFK',
      Ubicacion:'Rockefeller Center', Distancia_Hotel:1.1, Hora_Inicio:'17:00', Duracion_Estimada:'01:30',
      Costo_Persona:830, Cupos_Maximos:40, Cupos_Libres:22, Tipo:'Aventura',
      Operacion_Diaria:true, Fecha_Ejecucion:null },
    { Id_Actividad:'ACT-33', Nombre_Tour:'Central Park en bicicleta', Ciudad:'JFK',
      Ubicacion:'Central Park', Distancia_Hotel:2.6, Hora_Inicio:'10:00', Duracion_Estimada:'02:00',
      Costo_Persona:0, Cupos_Maximos:20, Cupos_Libres:20, Tipo:'Relajación',
      Operacion_Diaria:true, Fecha_Ejecucion:null },
    { Id_Actividad:'ACT-41', Nombre_Tour:'Templo Senso-ji y Asakusa', Ciudad:'NRT',
      Ubicacion:'Asakusa', Distancia_Hotel:9.3, Hora_Inicio:'09:00', Duracion_Estimada:'03:00',
      Costo_Persona:0, Cupos_Maximos:30, Cupos_Libres:30, Tipo:'Cultura',
      Operacion_Diaria:true, Fecha_Ejecucion:null },
    { Id_Actividad:'ACT-42', Nombre_Tour:'Excursión al Monte Fuji', Ciudad:'NRT',
      Ubicacion:'Afuera · Yamanashi', Distancia_Hotel:103.0, Hora_Inicio:'07:00', Duracion_Estimada:'10:00',
      Costo_Persona:1980, Cupos_Maximos:22, Cupos_Libres:8, Tipo:'Aventura',
      Operacion_Diaria:false, Fecha_Ejecucion:'2027-03-14' },
    { Id_Actividad:'ACT-43', Nombre_Tour:'Ceremonia del té en Ginza', Ciudad:'NRT',
      Ubicacion:'Ginza', Distancia_Hotel:6.2, Hora_Inicio:'16:00', Duracion_Estimada:'01:30',
      Costo_Persona:640, Cupos_Maximos:10, Cupos_Libres:5, Tipo:'Cultura',
      Operacion_Diaria:true, Fecha_Ejecucion:null },
    { Id_Actividad:'ACT-51', Nombre_Tour:'Chichén Itzá con cenote', Ciudad:'CUN',
      Ubicacion:'Afuera · Yucatán', Distancia_Hotel:198.0, Hora_Inicio:'07:30', Duracion_Estimada:'11:00',
      Costo_Persona:1490, Cupos_Maximos:45, Cupos_Libres:27, Tipo:'Cultura',
      Operacion_Diaria:true, Fecha_Ejecucion:null },
    { Id_Actividad:'ACT-52', Nombre_Tour:'Snorkel en Isla Mujeres', Ciudad:'CUN',
      Ubicacion:'Isla Mujeres', Distancia_Hotel:16.4, Hora_Inicio:'08:30', Duracion_Estimada:'06:00',
      Costo_Persona:1180, Cupos_Maximos:35, Cupos_Libres:19, Tipo:'Aventura',
      Operacion_Diaria:true, Fecha_Ejecucion:null },
    { Id_Actividad:'ACT-53', Nombre_Tour:'Atardecer en playa Delfines', Ciudad:'CUN',
      Ubicacion:'Zona Hotelera km 17', Distancia_Hotel:2.9, Hora_Inicio:'18:00', Duracion_Estimada:'01:30',
      Costo_Persona:0, Cupos_Maximos:60, Cupos_Libres:60, Tipo:'Relajación',
      Operacion_Diaria:true, Fecha_Ejecucion:null }
  ],

  /* ============== ALMACÉN PR · TABLA precio_bloqueado ===================
     Tarifas vigentes congeladas. El subproceso 4.2 las consulta para
     calcular el costo total; si no hay tarifa vigente usa el precio del
     catálogo. Porcentaje_Impuesto se aplica por tipo de servicio.           */
  precio_bloqueado: [
    { Id_Tarifa:'TAR-0001', Tipo_Servicio:'VUELO',     Id_Referencia:'VUE-1024', Precio_Unitario:25995.50,
      Moneda:'MXN', Fecha_Vigencia_Inicio:'2026-09-01', Fecha_Vigencia_Fin:'2027-03-31', Porcentaje_Impuesto:16 },
    { Id_Tarifa:'TAR-0002', Tipo_Servicio:'VUELO',     Id_Referencia:'VUE-1025', Precio_Unitario:28500.00,
      Moneda:'MXN', Fecha_Vigencia_Inicio:'2026-10-01', Fecha_Vigencia_Fin:'2027-01-31', Porcentaje_Impuesto:16 },
    { Id_Tarifa:'TAR-0003', Tipo_Servicio:'VUELO',     Id_Referencia:'VUE-1031', Precio_Unitario:20900.00,
      Moneda:'MXN', Fecha_Vigencia_Inicio:'2026-10-01', Fecha_Vigencia_Fin:'2027-02-28', Porcentaje_Impuesto:16 },
    { Id_Tarifa:'TAR-0004', Tipo_Servicio:'VUELO',     Id_Referencia:'VUE-1070', Precio_Unitario:1880.00,
      Moneda:'MXN', Fecha_Vigencia_Inicio:'2026-10-01', Fecha_Vigencia_Fin:'2026-12-20', Porcentaje_Impuesto:16 },
    { Id_Tarifa:'TAR-0101', Tipo_Servicio:'HOTEL',     Id_Referencia:'HTL-502',  Precio_Unitario:4150.00,
      Moneda:'MXN', Fecha_Vigencia_Inicio:'2026-09-15', Fecha_Vigencia_Fin:'2027-03-31', Porcentaje_Impuesto:16 },
    { Id_Tarifa:'TAR-0102', Tipo_Servicio:'HOTEL',     Id_Referencia:'HTL-501',  Precio_Unitario:2280.00,
      Moneda:'MXN', Fecha_Vigencia_Inicio:'2026-09-15', Fecha_Vigencia_Fin:'2027-03-31', Porcentaje_Impuesto:16 },
    { Id_Tarifa:'TAR-0103', Tipo_Servicio:'HOTEL',     Id_Referencia:'HTL-551',  Precio_Unitario:6500.00,
      Moneda:'MXN', Fecha_Vigencia_Inicio:'2026-11-01', Fecha_Vigencia_Fin:'2027-04-30', Porcentaje_Impuesto:16 },
    { Id_Tarifa:'TAR-0201', Tipo_Servicio:'ACTIVIDAD', Id_Referencia:'ACT-01',   Precio_Unitario:440.00,
      Moneda:'MXN', Fecha_Vigencia_Inicio:'2026-09-01', Fecha_Vigencia_Fin:'2027-06-30', Porcentaje_Impuesto:16 },
    { Id_Tarifa:'TAR-0202', Tipo_Servicio:'ACTIVIDAD', Id_Referencia:'ACT-05',   Precio_Unitario:700.00,
      Moneda:'MXN', Fecha_Vigencia_Inicio:'2026-09-01', Fecha_Vigencia_Fin:'2027-06-30', Porcentaje_Impuesto:16 },
    { Id_Tarifa:'TAR-0203', Tipo_Servicio:'ACTIVIDAD', Id_Referencia:'ACT-51',   Precio_Unitario:1420.00,
      Moneda:'MXN', Fecha_Vigencia_Inicio:'2026-10-01', Fecha_Vigencia_Fin:'2027-05-31', Porcentaje_Impuesto:16 }
  ],

  /* ===== ALMACÉN RE · TABLA reserva (se escribe en 1.4, 2.4 y 3.4) ===== */
  reserva: [],

  /* ===== TABLAS itinerario / itinerario_actividad / cotizacion ========= */
  itinerario: [],
  cotizacion: [],

  /* =================== Documentación requerida ========================== */
  checklist: [
    'Pasaporte vigente (mínimo 6 meses)',
    'Visa o autorización de viaje del destino (si aplica)',
    'Seguro de viaje con cobertura médica',
    'Boleto de avión ida y vuelta',
    'Reservación de hospedaje confirmada',
    'Comprobante de solvencia económica',
    'Vouchers de actividades impresos o digitales',
    'Copia digital de todos los documentos'
  ],

  /* ===================== Contenido del sitio ============================ */
  destinos_galeria: [
    { img:'img/items/item3.jpg',           categoria:'Europa',       titulo:'Ciudades históricas', extra:'Vuelo + hotel céntrico + city tour' },
    { img:'img/items/item2.jpg',           categoria:'Mediterráneo', titulo:'Islas griegas',       extra:'Vuelo + 7 noches + ferry' },
    { img:'img/items/item6.jpg',           categoria:'Caribe',       titulo:'Cancún',              extra:'Todo incluido 7 noches' },
    { img:'img/items/item10.jpg',          categoria:'Alpes',        titulo:'Dolomitas',           extra:'Vuelo + hotel + senderismo' },
    { img:'img/items/item9.jpg',           categoria:'Sudamérica',   titulo:'Machu Picchu',        extra:'Vuelo + tren + guía' },
    { img:'img/recomendados/recomendado3.jpg', categoria:'Asia',     titulo:'Patrimonio de la India', extra:'Vuelo + hotel + excursiones' }
  ],

  videos: [
    { id:'v1', titulo:'La agencia',        archivo:'img/empresa.mp4', poster:'img/principal.jpg' },
    { id:'v2', titulo:'Destinos 2027',     archivo:'img/empresa.mp4', poster:'img/items/item8.jpg' },
    { id:'v3', titulo:'Cómo cotizamos',    archivo:'img/empresa.mp4', poster:'img/test-bg.jpg' }
  ],

  testimonios: [
    { img:'img/testimonios/persona1.jpg', nombre:'Laura Gómez',          rol:'Viaje familiar a París',
      texto:'Nos entregaron la cotización desglosada el mismo día. Saber exactamente qué incluía cada peso hizo la decisión fácil.' },
    { img:'img/testimonios/persona2.jpg', nombre:'Carlos Rodríguez',     rol:'Viaje corporativo a Madrid',
      texto:'Armaron vuelo, hotel y traslados para ocho personas sin un solo cruce de horarios. El itinerario llegó en PDF listo para firmar.' },
    { img:'img/testimonios/persona3.jpg', nombre:'Sara Pérez',           rol:'Luna de miel en Roma',
      texto:'Me gustó que los precios quedaron bloqueados desde el primer día. No hubo sorpresas al momento de pagar.' },
    { img:'img/testimonios/persona4.jpg', nombre:'Alejandro Fernández',  rol:'Aventura en Japón',
      texto:'Verificaron los cupos del tour al Fuji antes de confirmarme. Ese detalle me ahorró el viaje en falso.' }
  ]
};

/* Utilidad de ciudad → nombre legible */
function nombreCiudad(codigo){
  const c = CIUDADES.find(x => x.codigo === codigo);
  return c ? `${c.ciudad} (${c.codigo})` : codigo;
}
function ciudadCorta(codigo){
  const c = CIUDADES.find(x => x.codigo === codigo);
  return c ? c.ciudad : codigo;
}
