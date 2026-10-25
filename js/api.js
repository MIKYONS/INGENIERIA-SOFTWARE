/* ============================================================================
   SIGLV · api.js  —  CAPA DE ACCESO A DATOS
   ----------------------------------------------------------------------------
   Toda la lógica de los subprocesos del DFD vive aquí y SIEMPRE devuelve
   promesas. Cambiar de la demo a producción es cambiar una línea:

        API.modo = 'mock';   // datos de js/datos.js (sin servidor)
        API.modo = 'php';    // consume /api/*.php sobre MySQL

   En modo 'php' cada función hace fetch al endpoint equivalente y espera el
   mismo JSON que produce la versión mock, de modo que la interfaz no cambia.
   ========================================================================= */
'use strict';

const API = {
  modo: 'mock',          // 'mock' | 'php'
  base: 'api/',          // carpeta de los endpoints PHP
  timeout: 15000
};

/* ============================== UTILIDADES ============================== */
const fmtMoneda = n => new Intl.NumberFormat(CONFIG.locale,
  { style:'currency', currency:CONFIG.moneda, maximumFractionDigits:2 }).format(Number(n) || 0);

const fmtMonedaCorta = n => new Intl.NumberFormat(CONFIG.locale,
  { style:'currency', currency:CONFIG.moneda, maximumFractionDigits:0 }).format(Number(n) || 0);

const fmtFecha = f => {
  if (!f) return '—';
  const d = (f instanceof Date) ? f : new Date(String(f).slice(0,10) + 'T12:00:00');
  return isNaN(d) ? String(f) : d.toLocaleDateString(CONFIG.locale,
    { day:'2-digit', month:'short', year:'numeric' });
};

const fmtFechaHora = f => {
  if (!f) return '—';
  const d = new Date(f);
  return isNaN(d) ? String(f) : d.toLocaleString(CONFIG.locale,
    { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' });
};

const fmtHora = h => (h || '').slice(0,5);

/** Duración "HH:MM" → horas decimales y texto legible */
function duracionHoras(hhmm){
  const [h, m] = String(hhmm || '0:00').split(':').map(Number);
  return (h || 0) + (m || 0) / 60;
}
function duracionTexto(min){
  const h = Math.floor(min / 60), m = min % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}

/** Diferencia en días entre dos fechas ISO (YYYY-MM-DD) */
function diasEntre(a, b){
  if (!a || !b) return 0;
  const d1 = new Date(a + 'T00:00:00'), d2 = new Date(b + 'T00:00:00');
  return Math.round((d2 - d1) / 86400000);
}
function hoyISO(){ return new Date().toISOString().slice(0,10); }
function sumarDias(iso, n){
  const d = new Date(iso + 'T00:00:00');
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0,10);
}
function diaSemana(iso){ return new Date(iso + 'T00:00:00').getDay(); }
function nombreDia(iso){
  return new Date(iso + 'T00:00:00').toLocaleDateString(CONFIG.locale, { weekday:'long' });
}

/** Folios consecutivos (en MySQL los genera AUTO_INCREMENT + prefijo) */
const _consecutivo = { RES:0, ITI:0, COT:0, CON:0, CAL:0 };
function nuevoFolio(prefijo){
  _consecutivo[prefijo] = (_consecutivo[prefijo] || 0) + 1;
  const base = Number(localStorage.getItem('siglv_folio_' + prefijo) || 0) + 1;
  localStorage.setItem('siglv_folio_' + prefijo, base);
  const año = new Date().getFullYear();
  return `${prefijo}-${año}-${String(base).padStart(4,'0')}`;
}

/* ===================== TRANSPORTE HTTP (modo 'php') ===================== */
async function _http(endpoint, params = {}, metodo = 'GET'){
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), API.timeout);
  try{
    let url = API.base + endpoint, opciones = { method:metodo, signal:ctrl.signal };
    if (metodo === 'GET'){
      const qs = new URLSearchParams(params).toString();
      if (qs) url += (url.includes('?') ? '&' : '?') + qs;
    } else {
      opciones.headers = { 'Content-Type':'application/json' };
      opciones.body = JSON.stringify(params);
    }
    const r = await fetch(url, opciones);
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const json = await r.json();
    if (json && json.ok === false) throw new Error(json.error || 'Error del servidor');
    return json.datos !== undefined ? json.datos : json;
  } finally { clearTimeout(t); }
}

/** Simula la latencia de red para que la interfaz muestre sus estados de carga */
const _demora = (ms = 180) => new Promise(r => setTimeout(r, ms));

/* ========================================================================
   CATÁLOGOS · lectura directa de los almacenes VU / HT / AC / PR
   ===================================================================== */
API.catalogo = async function(almacen){
  if (API.modo === 'php') return _http('catalogo.php', { almacen });
  await _demora(120);
  const mapa = { VU:'vuelo', HT:'hotel', AC:'actividad', PR:'precio_bloqueado', RE:'reserva' };
  return JSON.parse(JSON.stringify(DB[mapa[almacen]] || []));
};

API.clientes = async function(){
  if (API.modo === 'php') return _http('clientes.php');
  await _demora(80);
  return JSON.parse(JSON.stringify(DB.cliente));
};

/* ========================================================================
   PROCESO 1.0 · GESTIONAR VUELO
   ===================================================================== */

/** 1.1 Capturar solicitud — normaliza y valida los Datos solicitud. */
API.capturarSolicitud = async function(datos){
  if (API.modo === 'php') return _http('solicitud.php', datos, 'POST');
  await _demora(140);

  const errores = {};
  const sol = {
    Id_Cliente:    (datos.Id_Cliente   || '').trim().toUpperCase(),
    Nombre_Cliente:(datos.Nombre_Cliente|| '').trim(),
    Origen:        (datos.Origen       || '').trim().toUpperCase(),
    Destino:       (datos.Destino      || '').trim().toUpperCase(),
    Fecha_Salida:   datos.Fecha_Salida  || '',
    Fecha_Regreso:  datos.Fecha_Regreso || '',
    N_Pasajeros:    parseInt(datos.N_Pasajeros, 10) || 0,
    Clase_Tarifa:  (datos.Clase_Tarifa || 'Económica'),
    Preferencias:  (datos.Preferencias || '').trim().slice(0,200)
  };

  // Reglas del catálogo de elementos dato
  if (!sol.Id_Cliente)                            errores.Id_Cliente   = 'El Id_Cliente es obligatorio.';
  else if (sol.Id_Cliente.length > 10 + 4)        errores.Id_Cliente   = 'Máximo 10 caracteres significativos.';
  if (!sol.Nombre_Cliente)                        errores.Nombre_Cliente = 'Captura el nombre del cliente.';
  if (!sol.Origen)                                errores.Origen       = 'Selecciona el origen.';
  if (!sol.Destino)                               errores.Destino      = 'Selecciona el destino.';
  if (sol.Origen && sol.Origen === sol.Destino)   errores.Destino      = 'El destino debe ser distinto del origen.';
  if (!sol.Fecha_Salida)                          errores.Fecha_Salida = 'Captura la fecha de salida.';
  else if (diasEntre(hoyISO(), sol.Fecha_Salida) < 0)
                                                  errores.Fecha_Salida = 'La fecha de salida debe ser mayor a hoy.';
  if (!sol.Fecha_Regreso)                         errores.Fecha_Regreso = 'Captura la fecha de regreso.';
  else if (diasEntre(sol.Fecha_Salida, sol.Fecha_Regreso) < 1)
                                                  errores.Fecha_Regreso = 'El regreso debe ser posterior a la salida.';
  if (!(sol.N_Pasajeros >= 1 && sol.N_Pasajeros <= 99))
                                                  errores.N_Pasajeros  = 'Entre 1 y 99 pasajeros.';

  if (Object.keys(errores).length) return { ok:false, errores };

  // Flujo interno: Datos de búsqueda
  const datos_busqueda = {
    Origen:sol.Origen, Destino:sol.Destino,
    Fecha_Salida:sol.Fecha_Salida, Fecha_Regreso:sol.Fecha_Regreso,
    N_Pasajeros:sol.N_Pasajeros, Clase_Tarifa:sol.Clase_Tarifa,
    Preferencias:sol.Preferencias
  };
  const noches = diasEntre(sol.Fecha_Salida, sol.Fecha_Regreso);
  return { ok:true, solicitud:sol, datos_busqueda, noches };
};

/** 1.2 Buscar vuelos — consulta VU y materializa la fecha solicitada. */
API.buscarVuelos = async function(b){
  if (API.modo === 'php') return _http('vuelos.php', b);
  await _demora(240);

  const dow = diaSemana(b.Fecha_Salida);
  return DB.vuelo
    .filter(v => v.Origen === b.Origen && v.Destino === b.Destino)
    .filter(v => v.Dias_Operacion.includes(dow))
    .filter(v => v.Estado === 'Disponible' && v.Asientos_Disponibles >= b.N_Pasajeros)
    .filter(v => !b.Clase_Tarifa || b.Clase_Tarifa === 'Cualquiera' || v.Clase_Tarifa === b.Clase_Tarifa)
    .map(v => {
      const salida  = new Date(`${b.Fecha_Salida}T${v.Hora_Salida}:00`);
      const llegada = new Date(salida.getTime() + v.Duracion_Minutos * 60000);
      const regreso = new Date(`${b.Fecha_Regreso}T${v.Hora_Salida}:00`);
      return {
        ...v,
        Fecha_Hora_Salida:  salida.toISOString(),
        Fecha_Hora_Llegada: llegada.toISOString(),
        Fecha_Hora_Regreso: regreso.toISOString(),   // informativo (tarifa redonda)
        Duracion_Texto:     duracionTexto(v.Duracion_Minutos),
        Importe_Total:      v.Precio_Base * b.N_Pasajeros
      };
    })
    .sort((a, c) => a.Precio_Base - c.Precio_Base);
};

/** 1.4 / 2.4 / 3.4 Registrar reserva — escribe en el almacén RE. */
API.registrarReserva = async function(r){
  if (API.modo === 'php') return _http('reservas.php', r, 'POST');
  await _demora(160);
  const reserva = {
    Id_Reserva:     nuevoFolio('RES'),
    Id_Cliente:     r.Id_Cliente,
    Id_Itinerario:  r.Id_Itinerario || null,
    Tipo_Servicio:  r.Tipo_Servicio,          // VUELO | HOTEL | ACTIVIDAD
    Id_Referencia:  r.Id_Referencia,
    Descripcion:    r.Descripcion || '',
    Fecha_Reserva:  hoyISO(),
    Fecha_Inicio:   r.Fecha_Inicio || null,   // salida / check-in / ejecución
    Fecha_Fin:      r.Fecha_Fin   || null,    // llegada / check-out
    N_Personas:     r.N_Personas  || 1,
    Monto_Reserva:  Number(r.Monto_Reserva) || 0,
    Estado_Reserva: 'Confirmado'
  };
  DB.reserva.push(reserva);
  return reserva;
};

/* ========================================================================
   PROCESO 2.0 · GESTIONAR HOTEL
   ===================================================================== */

/** 2.1 Filtrar por cercanía — usa el destino del vuelo como referencia. */
API.filtrarPorCercania = async function(vuelo_seleccionado, radio_km = 15){
  if (API.modo === 'php')
    return _http('hoteles.php', { paso:'cercania', destino:vuelo_seleccionado.Destino, radio:radio_km });
  await _demora(200);
  return DB.hotel
    .filter(h => h.Ciudad === vuelo_seleccionado.Destino)
    .filter(h => h.Distancia_Destino <= radio_km)
    .map(h => ({ Id_Hotel:h.Id_Hotel, Nombre_Comercial:h.Nombre_Comercial, Ubicacion:h.Ubicacion,
                 Distancia_Destino:h.Distancia_Destino, Categoria:h.Categoria }))
    .sort((a, b) => a.Distancia_Destino - b.Distancia_Destino);
};

/** 2.2 Filtrar por seguridad — valida disponibilidad contra HT. */
API.filtrarPorSeguridad = async function(hoteles_cercanos, nivel_minimo = 3, noches = 1, habitaciones = 1){
  if (API.modo === 'php')
    return _http('hoteles.php', { paso:'seguridad', ids:hoteles_cercanos.map(h => h.Id_Hotel).join(','),
                                  nivel:nivel_minimo, noches, habitaciones });
  await _demora(200);
  const ids = new Set(hoteles_cercanos.map(h => h.Id_Hotel));
  return DB.hotel
    .filter(h => ids.has(h.Id_Hotel))
    .filter(h => h.Nivel_Seguridad >= nivel_minimo)
    .filter(h => h.Habitaciones_Libres >= habitaciones)
    .map(h => ({ ...h, Costo_Estancia: h.Tarifa_Noche * noches * habitaciones }))
    .sort((a, b) => a.Tarifa_Noche - b.Tarifa_Noche);
};

/* ========================================================================
   PROCESO 3.0 · GESTIONAR ACTIVIDADES
   ===================================================================== */

/** 3.1 Buscar actividades cercanas — referencia geográfica: el hotel. */
API.buscarActividadesCercanas = async function(hotel_seleccionado, radio_km = 25){
  if (API.modo === 'php')
    return _http('actividades.php', { paso:'cercanas', ciudad:hotel_seleccionado.Ciudad, radio:radio_km });
  await _demora(220);
  return DB.actividad
    .filter(a => a.Ciudad === hotel_seleccionado.Ciudad)
    .filter(a => a.Distancia_Hotel <= radio_km)
    .map(a => ({ ...a }))
    .sort((a, b) => a.Distancia_Hotel - b.Distancia_Hotel);
};

/** 3.2 Verificar cupos y horarios — asigna Fecha_Ejecucion dentro de la
 *      ventana del viaje y marca Compatible_Horario / cupos suficientes.  */
API.verificarCuposHorarios = async function(actividades_cercanas, ventana, n_personas = 1){
  if (API.modo === 'php')
    return _http('actividades.php', { paso:'viables', ids:actividades_cercanas.map(a => a.Id_Actividad).join(','),
                                      desde:ventana.Fecha_CheckIn, hasta:ventana.Fecha_CheckOut, pax:n_personas });
  await _demora(220);

  const dias = [];
  const total = Math.max(diasEntre(ventana.Fecha_CheckIn, ventana.Fecha_CheckOut), 0);
  for (let i = 0; i <= total; i++) dias.push(sumarDias(ventana.Fecha_CheckIn, i));

  return actividades_cercanas.map((a, idx) => {
    let fecha, compatible = true, motivo = '';

    if (a.Operacion_Diaria){
      // distribuye los tours a lo largo de la estancia, evitando el día de llegada
      const base = dias.length > 1 ? 1 : 0;
      fecha = dias[Math.min(base + (idx % Math.max(dias.length - base, 1)), dias.length - 1)];
    } else {
      fecha = a.Fecha_Ejecucion;
      if (!fecha || diasEntre(ventana.Fecha_CheckIn, fecha) < 0 || diasEntre(fecha, ventana.Fecha_CheckOut) < 0){
        compatible = false;
        motivo = 'Fecha fija fuera de la ventana del viaje';
      }
    }

    const cupo_ok = a.Cupos_Libres >= n_personas;
    if (!cupo_ok){ compatible = false; motivo = a.Cupos_Libres === 0 ? 'Sin cupos disponibles'
                                                                   : `Sólo ${a.Cupos_Libres} cupos libres`; }
    return {
      Id_Actividad:a.Id_Actividad, Nombre_Tour:a.Nombre_Tour, Ubicacion:a.Ubicacion,
      Distancia_Hotel:a.Distancia_Hotel, Tipo:a.Tipo,
      Fecha_Ejecucion:fecha, Hora_Inicio:a.Hora_Inicio, Duracion_Estimada:a.Duracion_Estimada,
      Costo_Persona:a.Costo_Persona, Cupos_Maximos:a.Cupos_Maximos, Cupos_Libres:a.Cupos_Libres,
      Compatible_Horario:compatible, Motivo_No_Viable:motivo
    };
  });
};

/** 3.4 Consolidar itinerario — integra vuelo + hotel + tours elegidos. */
API.consolidarItinerario = async function(paquete){
  if (API.modo === 'php') return _http('itinerario.php', paquete, 'POST');
  await _demora(200);
  const itinerario = {
    Id_Itinerario:  nuevoFolio('ITI'),
    Id_Cliente:     paquete.Id_Cliente,
    Vuelo_seleccionado: paquete.vuelo,
    Hotel_seleccionado: paquete.hotel,
    Detalle_Actividades: paquete.tours,
    Fecha_Creacion: hoyISO()
  };
  DB.itinerario.push(itinerario);
  return itinerario;
};

/* ========================================================================
   PROCESO 4.0 · EMITIR PRESUPUESTO
   ===================================================================== */

/** 4.1 Consolidar reservas — reúne en RE todo lo del itinerario. */
API.consolidarReservas = async function(Id_Itinerario){
  if (API.modo === 'php') return _http('presupuesto.php', { paso:'consolidar', Id_Itinerario });
  await _demora(160);
  const lista = DB.reserva.filter(r => r.Id_Itinerario === Id_Itinerario);
  return {
    Id_Consolidado: nuevoFolio('CON'),
    Id_Itinerario,
    Reservas: lista,
    N_Reservas: lista.length,
    Monto_Subtotal_Reservas: lista.reduce((s, r) => s + r.Monto_Reserva, 0)
  };
};

/** Busca la tarifa vigente en PR para un servicio dado. */
function _tarifaVigente(tipo, referencia, fecha){
  return DB.precio_bloqueado.find(p =>
    p.Tipo_Servicio === tipo && p.Id_Referencia === referencia &&
    diasEntre(p.Fecha_Vigencia_Inicio, fecha) >= 0 &&
    diasEntre(fecha, p.Fecha_Vigencia_Fin) >= 0) || null;
}

/** 4.2 Calcular costo total — aplica las tarifas bloqueadas de PR. */
API.calcularCostoTotal = async function(consolidado, contexto){
  if (API.modo === 'php')
    return _http('presupuesto.php', { paso:'calcular', Id_Itinerario:consolidado.Id_Itinerario }, 'POST');
  await _demora(220);

  const hoy = hoyISO();
  const detalle = [];
  let Costo_Vuelos = 0, Costo_Hoteles = 0, Costo_Actividades = 0;

  consolidado.Reservas.forEach(r => {
    const tarifa = _tarifaVigente(r.Tipo_Servicio, r.Id_Referencia, hoy);
    let unitario, cantidad, importe;

    if (r.Tipo_Servicio === 'VUELO'){
      unitario = tarifa ? tarifa.Precio_Unitario : contexto.vuelo.Precio_Base;
      cantidad = r.N_Personas;
      importe  = unitario * cantidad;
      Costo_Vuelos += importe;
    } else if (r.Tipo_Servicio === 'HOTEL'){
      unitario = tarifa ? tarifa.Precio_Unitario : contexto.hotel.Tarifa_Noche;
      cantidad = contexto.noches * contexto.habitaciones;
      importe  = unitario * cantidad;
      Costo_Hoteles += importe;
    } else {
      const tour = contexto.tours.find(t => t.Id_Actividad === r.Id_Referencia) || {};
      unitario = tarifa ? tarifa.Precio_Unitario : (tour.Costo_Persona || 0);
      cantidad = r.N_Personas;
      importe  = unitario * cantidad;
      Costo_Actividades += importe;
    }

    detalle.push({
      Tipo_Servicio:r.Tipo_Servicio, Id_Referencia:r.Id_Referencia,
      Descripcion:r.Descripcion, Id_Reserva:r.Id_Reserva,
      Id_Tarifa: tarifa ? tarifa.Id_Tarifa : 'catálogo',
      Precio_Unitario:unitario, Cantidad:cantidad, Importe:importe,
      Bloqueado: !!tarifa
    });
  });

  const Subtotal = Costo_Vuelos + Costo_Hoteles + Costo_Actividades;
  return {
    Id_Calculo: nuevoFolio('CAL'),
    Id_Itinerario: consolidado.Id_Itinerario,
    Costo_Vuelos, Costo_Hoteles, Costo_Actividades,
    Subtotal, Detalle: detalle, Fecha_Calculo: hoy
  };
};

/** 4.3 Aplicar impuestos — IVA sobre el subtotal + tasas aeroportuarias. */
API.aplicarImpuestos = async function(costo_total, n_pasajeros){
  if (API.modo === 'php')
    return _http('presupuesto.php', { paso:'impuestos', Id_Calculo:costo_total.Id_Calculo,
                                      Subtotal:costo_total.Subtotal, pax:n_pasajeros }, 'POST');
  await _demora(140);

  const Porcentaje_IVA        = CONFIG.porcentaje_iva;
  const Monto_IVA             = +(costo_total.Subtotal * Porcentaje_IVA / 100).toFixed(2);
  const Tasas_Aeroportuarias  = +(CONFIG.tasa_aeroportuaria * n_pasajeros).toFixed(2);
  const Monto_Impuestos       = +(Monto_IVA + Tasas_Aeroportuarias).toFixed(2);
  const Costo_Final           = +(costo_total.Subtotal + Monto_Impuestos).toFixed(2);

  return { Id_Calculo:costo_total.Id_Calculo, Subtotal:costo_total.Subtotal,
           Porcentaje_IVA, Monto_IVA, Tasas_Aeroportuarias, Monto_Impuestos, Costo_Final };
};

/** 4.4 Emitir presupuesto — genera el documento final con folio y vigencia. */
API.emitirPresupuesto = async function(costo_total, costo_final, contexto){
  if (API.modo === 'php')
    return _http('presupuesto.php', {
      paso:'emitir',
      Id_Itinerario:        costo_total.Id_Itinerario,
      Costo_Vuelos:         costo_total.Costo_Vuelos,
      Costo_Hoteles:        costo_total.Costo_Hoteles,
      Costo_Actividades:    costo_total.Costo_Actividades,
      Monto_IVA:            costo_final.Monto_IVA,
      Tasas_Aeroportuarias: costo_final.Tasas_Aeroportuarias,
      Detalle:              costo_total.Detalle
    }, 'POST');
  await _demora(200);

  const presupuesto = {
    Id_Cotizacion:     nuevoFolio('COT'),
    Id_Itinerario:     costo_total.Id_Itinerario,
    Id_Cliente:        contexto.Id_Cliente,
    Nombre_Cliente:    contexto.Nombre_Cliente,
    Fecha_Emision:     hoyISO(),
    Costo_Vuelos:      costo_total.Costo_Vuelos,
    Costo_Hoteles:     costo_total.Costo_Hoteles,
    Costo_Actividades: costo_total.Costo_Actividades,
    Subtotal:          costo_total.Subtotal,
    Porcentaje_IVA:    costo_final.Porcentaje_IVA,
    Monto_IVA:         costo_final.Monto_IVA,
    Tasas_Aeroportuarias: costo_final.Tasas_Aeroportuarias,
    Monto_Impuestos:   costo_final.Monto_Impuestos,
    Monto_Total:       costo_final.Costo_Final,
    Validez_Oferta:    CONFIG.validez_oferta_dias,
    Vence_El:          sumarDias(hoyISO(), CONFIG.validez_oferta_dias),
    Detalle:           costo_total.Detalle,
    Estado:            'Emitido'
  };
  DB.cotizacion.push(presupuesto);
  API.guardarCotizacionLocal(presupuesto, contexto);
  return presupuesto;
};

/* ============ Persistencia local de cotizaciones (demo) ================= */
const LS_COT = 'siglv_cotizaciones_v1';

API.guardarCotizacionLocal = function(presupuesto, contexto){
  try{
    const lista = API.cotizacionesLocales();
    lista.unshift({
      presupuesto,
      resumen:{
        Nombre_Cliente: contexto.Nombre_Cliente,
        Destino: contexto.solicitud ? contexto.solicitud.Destino : '',
        Fecha_Salida: contexto.solicitud ? contexto.solicitud.Fecha_Salida : '',
        Fecha_Regreso: contexto.solicitud ? contexto.solicitud.Fecha_Regreso : '',
        N_Pasajeros: contexto.solicitud ? contexto.solicitud.N_Pasajeros : 1,
        Vuelo: contexto.vuelo ? `${contexto.vuelo.Aerolinea} ${contexto.vuelo.Id_Vuelo}` : '',
        Hotel: contexto.hotel ? contexto.hotel.Nombre_Comercial : '',
        Tours: (contexto.tours || []).length
      },
      contexto: { solicitud:contexto.solicitud, vuelo:contexto.vuelo, hotel:contexto.hotel,
                  tours:contexto.tours, noches:contexto.noches, habitaciones:contexto.habitaciones }
    });
    localStorage.setItem(LS_COT, JSON.stringify(lista.slice(0,30)));
  }catch(e){ /* almacenamiento no disponible: la demo sigue funcionando */ }
};

API.cotizacionesLocales = function(){
  try{ return JSON.parse(localStorage.getItem(LS_COT) || '[]'); }
  catch(e){ return []; }
};

API.borrarCotizacionLocal = function(folio){
  try{
    const lista = API.cotizacionesLocales().filter(c => c.presupuesto.Id_Cotizacion !== folio);
    localStorage.setItem(LS_COT, JSON.stringify(lista));
  }catch(e){}
};
