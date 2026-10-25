/* ============================================================================
   SIGLV · propuesta.js  —  MÓDULO "NUEVA PROPUESTA"
   Implementa el recorrido completo del DFD:
     1.0 Gestionar vuelo       (1.1 capturar · 1.2 buscar · 1.3 seleccionar · 1.4 reservar)
     2.0 Gestionar hotel       (2.1 cercanía · 2.2 seguridad · 2.3 seleccionar · 2.4 reservar)
     3.0 Gestionar actividades (3.1 buscar · 3.2 cupos · 3.3 seleccionar · 3.4 consolidar)
     4.0 Emitir presupuesto    (4.1 consolidar · 4.2 calcular · 4.3 impuestos · 4.4 emitir)
   ========================================================================= */
'use strict';

/* ============================ ESTADO DEL WIZARD ========================= */
const PASOS = [
  { id:'vuelo',       proceso:'1.0', titulo:'Gestionar vuelo' },
  { id:'hotel',       proceso:'2.0', titulo:'Gestionar hotel' },
  { id:'actividades', proceso:'3.0', titulo:'Gestionar actividades' },
  { id:'presupuesto', proceso:'4.0', titulo:'Emitir presupuesto' }
];

let PROP = estadoInicial();

function estadoInicial(){
  return {
    paso:0,
    // Proceso 1.0
    solicitud:null, datos_busqueda:null, vuelos:[], vuelo:null, reservaVuelo:null,
    criterio_vuelo:'precio',
    // Proceso 2.0
    radio_km:15, nivel_seguridad:3, habitaciones:1, noches:0,
    hoteles_cercanos:[], hoteles_seguros:[], hotel:null, reservaHotel:null,
    // Proceso 3.0
    radio_act:30, actividades_cercanas:[], actividades_viables:[], tours:[],
    reservasTour:[], itinerario:null,
    // Proceso 4.0
    consolidado:null, costo_total:null, costo_final:null, presupuesto:null,
    checklist:{}
  };
}

function hayPaquete(){ return !!(PROP.vuelo || PROP.hotel || PROP.tours.length); }

function reiniciarPropuesta(){
  if (hayPaquete() && !confirm('Se perderán los datos capturados en esta propuesta. ¿Continuar?')) return;
  PROP = estadoInicial();
  renderPropuesta();
  toast('Propuesta reiniciada');
}

/* ============================== RENDER BASE ============================= */
function renderPropuesta(){
  // Indicador de pasos
  $('#propPasos').innerHTML = PASOS.map((p, i) => {
    const clase = i === PROP.paso ? 'activo' : (i < PROP.paso ? 'hecho' : '');
    return `<button class="paso ${clase}" onclick="irAPaso(${i})">
              <span class="pn">${i + 1}</span>${p.proceso} ${p.titulo}
            </button>`;
  }).join('');

  $('#propTitulo').textContent = PROP.solicitud
    ? `Propuesta · ${PROP.solicitud.Nombre_Cliente}`
    : 'Nueva propuesta';

  const cuerpo = $('#propCuerpo');
  if (PROP.paso === 0) cuerpo.innerHTML = vistaVuelo();
  if (PROP.paso === 1) cuerpo.innerHTML = vistaHotel();
  if (PROP.paso === 2) cuerpo.innerHTML = vistaActividades();
  if (PROP.paso === 3) cuerpo.innerHTML = vistaPresupuesto();

  renderResumenFlotante();
  requestAnimationFrame(() => setTimeout(() =>
    $$('.barra .relleno').forEach(b => b.style.width = b.dataset.w + '%'), 80));
}

function irAPaso(i){
  if (i > 0 && !PROP.vuelo)   return toast('Primero registra la reserva del vuelo (paso 1.4)', 'err');
  if (i > 1 && !PROP.hotel)   return toast('Primero reserva la habitación (paso 2.4)', 'err');
  if (i > 2 && !PROP.itinerario) return toast('Primero consolida el itinerario (paso 3.4)', 'err');
  PROP.paso = i;
  renderPropuesta();
  window.scrollTo({ top:0, behavior:'smooth' });
}
function pasoSiguiente(){ if (PROP.paso < PASOS.length - 1) irAPaso(PROP.paso + 1); }
function pasoAnterior(){ if (PROP.paso > 0){ PROP.paso--; renderPropuesta(); } }

/* ======================= RESUMEN FLOTANTE DEL PAQUETE =================== */
function renderResumenFlotante(){
  const caja = $('#resumenFlotante');
  if (!hayPaquete()){ caja.classList.remove('visible'); return; }
  const pax = PROP.solicitud ? PROP.solicitud.N_Pasajeros : 1;
  const cv = PROP.vuelo ? PROP.vuelo.Precio_Base * pax : 0;
  const ch = PROP.hotel ? PROP.hotel.Tarifa_Noche * PROP.noches * PROP.habitaciones : 0;
  const ca = PROP.tours.reduce((s, t) => s + t.Costo_Persona * (t.N_Personas || pax), 0);
  caja.innerHTML = `
    <h5>Paquete en construcción</h5>
    <div class="rf-linea"><span>Vuelo</span><b>${cv ? fmtMonedaCorta(cv) : '—'}</b></div>
    <div class="rf-linea"><span>Hospedaje</span><b>${ch ? fmtMonedaCorta(ch) : '—'}</b></div>
    <div class="rf-linea"><span>Actividades (${PROP.tours.length})</span><b>${ca ? fmtMonedaCorta(ca) : '—'}</b></div>
    <div class="rf-total"><span>Subtotal</span><span>${fmtMonedaCorta(cv + ch + ca)}</span></div>
    <p class="xs muted" style="margin-top:.5rem">Sin impuestos. El cálculo formal corre en el paso 4.2 con las tarifas de PR.</p>`;
  caja.classList.add('visible');
}

/* ========================================================================
   PASO 1 · PROCESO 1.0 GESTIONAR VUELO
   ===================================================================== */
function vistaVuelo(){
  const s = PROP.solicitud || {};
  const opcionesCiudad = (sel, excluir) => CIUDADES
    .filter(c => c.codigo !== excluir)
    .map(c => `<option value="${c.codigo}" ${sel === c.codigo ? 'selected' : ''}>${c.ciudad} (${c.codigo})</option>`).join('');

  const clientes = DB.cliente.map(c =>
    `<option value="${c.Id_Cliente}" ${s.Id_Cliente === c.Id_Cliente ? 'selected' : ''}>${c.Id_Cliente} · ${c.Nombre}</option>`).join('');

  const minSalida = sumarDias(hoyISO(), 1);

  return `
  <div class="rejilla r-ancho">
    <div class="panel">
      <h3><span class="panel-tag">1.1</span> Capturar solicitud</h3>
      <p class="sub">Datos solicitud = Id_Cliente + Destino + Fecha_Salida + Fecha_Regreso + N_Pasajeros + Preferencias</p>

      <div class="campo">
        <label for="f-cliente">Cliente registrado</label>
        <select id="f-cliente" onchange="autollenarCliente()">
          <option value="">— Capturar cliente nuevo —</option>${clientes}
        </select>
        <span class="ayuda">Tabla <code>cliente</code>. Al elegir uno se autollenan Id_Cliente y nombre.</span>
      </div>

      <div class="rejilla r-2">
        <div class="campo">
          <label for="f-id">Id_Cliente <span class="req">*</span></label>
          <input id="f-id" maxlength="14" value="${s.Id_Cliente || ''}" placeholder="CLI-000104">
          <span class="error" id="e-Id_Cliente"></span>
        </div>
        <div class="campo">
          <label for="f-nombre">Nombre del cliente <span class="req">*</span></label>
          <input id="f-nombre" maxlength="60" value="${s.Nombre_Cliente || ''}" placeholder="Nombre y apellidos">
          <span class="error" id="e-Nombre_Cliente"></span>
        </div>
      </div>

      <div class="rejilla r-2">
        <div class="campo">
          <label for="f-origen">Origen <span class="req">*</span></label>
          <select id="f-origen">${opcionesCiudad(s.Origen || 'MEX')}</select>
          <span class="error" id="e-Origen"></span>
        </div>
        <div class="campo">
          <label for="f-destino">Destino <span class="req">*</span></label>
          <select id="f-destino">${opcionesCiudad(s.Destino || 'CDG')}</select>
          <span class="error" id="e-Destino"></span>
        </div>
      </div>

      <div class="rejilla r-2">
        <div class="campo">
          <label for="f-salida">Fecha_Salida <span class="req">*</span></label>
          <input type="date" id="f-salida" min="${minSalida}" value="${s.Fecha_Salida || '2026-12-06'}">
          <span class="error" id="e-Fecha_Salida"></span>
        </div>
        <div class="campo">
          <label for="f-regreso">Fecha_Regreso <span class="req">*</span></label>
          <input type="date" id="f-regreso" min="${minSalida}" value="${s.Fecha_Regreso || '2026-12-13'}">
          <span class="error" id="e-Fecha_Regreso"></span>
        </div>
      </div>

      <div class="rejilla r-2">
        <div class="campo">
          <label for="f-pax">N_Pasajeros <span class="req">*</span></label>
          <input type="number" id="f-pax" min="1" max="99" value="${s.N_Pasajeros || 3}">
          <span class="error" id="e-N_Pasajeros"></span>
        </div>
        <div class="campo">
          <label for="f-clase">Clase_Tarifa</label>
          <select id="f-clase">
            ${['Cualquiera','Económica','Ejecutiva','Premier'].map(c =>
              `<option ${s.Clase_Tarifa === c ? 'selected' : ''}>${c}</option>`).join('')}
          </select>
        </div>
      </div>

      <div class="campo">
        <label for="f-pref">Preferencias</label>
        <textarea id="f-pref" rows="2" maxlength="200"
          placeholder="Vuelo directo, hotel céntrico, tours culturales…">${s.Preferencias || ''}</textarea>
        <span class="ayuda">X(200) · opcional.</span>
      </div>

      <button class="cta-btn" onclick="ejecutarCaptura()" id="btnCaptura">
        <i class="fas fa-magnifying-glass"></i> 1.1 → 1.2 Validar y buscar vuelos
      </button>
    </div>

    <div class="panel">
      <h3><span class="panel-tag">Flujo</span> Datos de búsqueda</h3>
      <p class="sub">Flujo interno generado por 1.1 y consumido por 1.2.</p>
      <div id="panelBusqueda">
        ${PROP.datos_busqueda ? tablaDatosBusqueda() :
          `<div class="aviso info"><i class="fas fa-circle-info"></i>
            <div>Captura la solicitud para generar el flujo <b>Datos de búsqueda</b>.
            Se valida que la salida sea posterior a hoy, que el regreso sea posterior a la salida
            y que N_Pasajeros esté entre 1 y 99.</div></div>`}
      </div>
    </div>
  </div>

  <div class="panel" style="margin-top:1.3rem">
    <h3><span class="panel-tag">1.2 · 1.3</span> Lista de vuelos → Vuelo elegido</h3>
    <p class="sub">Resultado de la consulta al almacén <b>VU</b>. Se descartan vuelos agotados
      y los que no operan el día de salida.</p>
    <div id="listaVuelos">
      ${PROP.vuelos.length ? listaVuelosHTML() :
        `<div class="aviso oro"><i class="fas fa-plane-departure"></i>
          <div>Aún no hay búsqueda ejecutada.</div></div>`}
    </div>
  </div>

  <div class="navegacion-pasos no-print">
    <span></span>
    <button class="cta-btn" id="btnReservaVuelo" onclick="ejecutarReservaVuelo()" ${PROP.vuelo ? '' : 'disabled'}>
      ${PROP.reservaVuelo ? '<i class="fas fa-check"></i> Vuelo reservado · continuar al hotel'
                          : '<i class="fas fa-bookmark"></i> 1.4 Registrar reserva y continuar'}
    </button>
  </div>`;
}

function autollenarCliente(){
  const id = $('#f-cliente').value;
  const c = DB.cliente.find(x => x.Id_Cliente === id);
  if (c){ $('#f-id').value = c.Id_Cliente; $('#f-nombre').value = c.Nombre; }
}

function tablaDatosBusqueda(){
  const b = PROP.datos_busqueda, s = PROP.solicitud;
  return `
  <div class="aviso ok"><i class="fas fa-circle-check"></i>
    <div><b>Solicitud válida.</b> ${PROP.noches} noche(s) de estancia · ${b.N_Pasajeros} pasajero(s).</div></div>
  <div class="kv"><span>Id_Cliente</span><span>${s.Id_Cliente}</span></div>
  <div class="kv"><span>Origen</span><span>${nombreCiudad(b.Origen)}</span></div>
  <div class="kv"><span>Destino</span><span>${nombreCiudad(b.Destino)}</span></div>
  <div class="kv"><span>Fecha_Salida</span><span>${fmtFecha(b.Fecha_Salida)} · ${nombreDia(b.Fecha_Salida)}</span></div>
  <div class="kv"><span>Fecha_Regreso</span><span>${fmtFecha(b.Fecha_Regreso)}</span></div>
  <div class="kv"><span>N_Pasajeros</span><span>${b.N_Pasajeros}</span></div>
  <div class="kv"><span>Clase_Tarifa</span><span>${b.Clase_Tarifa}</span></div>
  <div class="kv"><span>Preferencias</span><span>${b.Preferencias || '—'}</span></div>
  <div class="separador"></div>
  <div class="campo">
    <label for="f-criterio">1.3 Criterio_Seleccion</label>
    <select id="f-criterio" onchange="ordenarVuelos(this.value)">
      <option value="precio"   ${PROP.criterio_vuelo === 'precio'   ? 'selected' : ''}>Menor precio</option>
      <option value="duracion" ${PROP.criterio_vuelo === 'duracion' ? 'selected' : ''}>Menor duración</option>
      <option value="escalas"  ${PROP.criterio_vuelo === 'escalas'  ? 'selected' : ''}>Menos escalas</option>
      <option value="horario"  ${PROP.criterio_vuelo === 'horario'  ? 'selected' : ''}>Salida más temprana</option>
    </select>
    <span class="ayuda">El criterio queda registrado en el flujo <b>Vuelo elegido</b>.</span>
  </div>`;
}

async function ejecutarCaptura(){
  const btn = $('#btnCaptura');
  btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Validando…';

  const datos = {
    Id_Cliente:    $('#f-id').value,
    Nombre_Cliente:$('#f-nombre').value,
    Origen:        $('#f-origen').value,
    Destino:       $('#f-destino').value,
    Fecha_Salida:  $('#f-salida').value,
    Fecha_Regreso: $('#f-regreso').value,
    N_Pasajeros:   $('#f-pax').value,
    Clase_Tarifa:  $('#f-clase').value,
    Preferencias:  $('#f-pref').value
  };

  $$('.error').forEach(e => e.textContent = '');
  $$('.campo input').forEach(i => i.removeAttribute('aria-invalid'));

  const r = await API.capturarSolicitud(datos);
  btn.disabled = false;
  btn.innerHTML = '<i class="fas fa-magnifying-glass"></i> 1.1 → 1.2 Validar y buscar vuelos';

  if (!r.ok){
    Object.entries(r.errores).forEach(([campo, msg]) => {
      const el = $('#e-' + campo);
      if (el) el.textContent = msg;
    });
    return toast('Revisa los datos marcados en rojo', 'err');
  }

  PROP.solicitud      = r.solicitud;
  PROP.datos_busqueda = r.datos_busqueda;
  PROP.noches         = r.noches;
  // Cambiar la solicitud invalida lo armado después
  PROP.vuelo = null; PROP.reservaVuelo = null; PROP.hotel = null; PROP.reservaHotel = null;
  PROP.tours = []; PROP.itinerario = null; PROP.presupuesto = null;

  PROP.vuelos = await API.buscarVuelos(PROP.datos_busqueda);
  ordenarVuelos(PROP.criterio_vuelo, true);
  renderPropuesta();

  toast(PROP.vuelos.length
    ? `1.2 Buscar vuelos: ${PROP.vuelos.length} opción(es) en el almacén VU`
    : 'Sin vuelos para esa ruta y fecha. Prueba otra fecha o clase.', PROP.vuelos.length ? 'ok' : 'err');
}

function ordenarVuelos(criterio, silencioso){
  PROP.criterio_vuelo = criterio;
  const orden = {
    precio:   (a, b) => a.Precio_Base - b.Precio_Base,
    duracion: (a, b) => a.Duracion_Minutos - b.Duracion_Minutos,
    escalas:  (a, b) => a.Escalas - b.Escalas || a.Precio_Base - b.Precio_Base,
    horario:  (a, b) => a.Hora_Salida.localeCompare(b.Hora_Salida)
  };
  PROP.vuelos.sort(orden[criterio] || orden.precio);
  if (!silencioso){
    $('#listaVuelos').innerHTML = listaVuelosHTML();
  }
}

function listaVuelosHTML(){
  if (!PROP.vuelos.length)
    return `<div class="aviso warn"><i class="fas fa-triangle-exclamation"></i>
      <div><b>Sin resultados.</b> Ninguna fila de VU cumple ruta, día de operación, clase y asientos
      suficientes para ${PROP.datos_busqueda.N_Pasajeros} pasajero(s).</div></div>`;

  const pax = PROP.datos_busqueda.N_Pasajeros;
  return `<div class="opciones">` + PROP.vuelos.map(v => `
    <article class="opcion ${PROP.vuelo && PROP.vuelo.Id_Vuelo === v.Id_Vuelo ? 'elegida' : ''}"
             onclick="elegirVuelo('${v.Id_Vuelo}')" tabindex="0">
      <h4>${v.Aerolinea}<span class="celda-sub">${v.Id_Vuelo} · ${v.Codigo_Aerolinea}</span></h4>
      <div class="etiquetas">
        <span class="pill oro">${v.Clase_Tarifa}</span>
        <span class="pill ${v.Escalas ? 'info' : 'ok'}">${v.Escalas ? v.Escalas + ' escala · ' + v.Escala_En : 'Directo'}</span>
        <span class="pill ${v.Asientos_Disponibles < 10 ? 'warn' : 'ok'}">${v.Asientos_Disponibles} asientos</span>
      </div>
      <div class="meta">
        <span><i class="fas fa-plane-departure"></i>${fmtFechaHora(v.Fecha_Hora_Salida)}</span>
        <span><i class="fas fa-plane-arrival"></i>${fmtFechaHora(v.Fecha_Hora_Llegada)}</span>
      </div>
      <div class="meta">
        <span><i class="fas fa-clock"></i>${v.Duracion_Texto}</span>
        <span><i class="fas fa-suitcase-rolling"></i>${v.Equipaje}</span>
        <span><i class="fas fa-arrow-rotate-left"></i>Regreso ${fmtFecha(PROP.datos_busqueda.Fecha_Regreso)}</span>
      </div>
      <div class="precio">${fmtMoneda(v.Precio_Base)}
        <small>por pasajero · ${fmtMoneda(v.Precio_Base * pax)} por ${pax} pax</small></div>
    </article>`).join('') + `</div>`;
}

function elegirVuelo(id){
  PROP.vuelo = PROP.vuelos.find(v => v.Id_Vuelo === id) || null;
  if (PROP.vuelo) PROP.vuelo.Criterio_Seleccion = PROP.criterio_vuelo;
  PROP.reservaVuelo = null;
  $('#listaVuelos').innerHTML = listaVuelosHTML();
  const btn = $('#btnReservaVuelo');
  btn.disabled = false;
  btn.innerHTML = '<i class="fas fa-bookmark"></i> 1.4 Registrar reserva y continuar';
  renderResumenFlotante();
  toast('1.3 Vuelo elegido: ' + PROP.vuelo.Aerolinea + ' ' + PROP.vuelo.Id_Vuelo);
}

async function ejecutarReservaVuelo(){
  if (!PROP.vuelo) return toast('Elige primero un vuelo', 'err');
  if (PROP.reservaVuelo) return pasoSiguiente();

  const btn = $('#btnReservaVuelo');
  btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Registrando en RE…';

  PROP.reservaVuelo = await API.registrarReserva({
    Id_Cliente:    PROP.solicitud.Id_Cliente,
    Tipo_Servicio:'VUELO',
    Id_Referencia: PROP.vuelo.Id_Vuelo,
    Descripcion:  `${PROP.vuelo.Aerolinea} ${PROP.vuelo.Origen}→${PROP.vuelo.Destino} · ${PROP.vuelo.Clase_Tarifa}`,
    Fecha_Inicio:  PROP.solicitud.Fecha_Salida,
    Fecha_Fin:     PROP.solicitud.Fecha_Regreso,
    N_Personas:    PROP.solicitud.N_Pasajeros,
    Monto_Reserva: PROP.vuelo.Precio_Base * PROP.solicitud.N_Pasajeros
  });

  toast('1.4 Reserva ' + PROP.reservaVuelo.Id_Reserva + ' escrita en el almacén RE', 'ok');
  await prepararHotel();
  pasoSiguiente();
}

/* ========================================================================
   PASO 2 · PROCESO 2.0 GESTIONAR HOTEL
   ===================================================================== */
async function prepararHotel(){
  PROP.hoteles_cercanos = await API.filtrarPorCercania(PROP.vuelo, PROP.radio_km);
  PROP.hoteles_seguros  = await API.filtrarPorSeguridad(
    PROP.hoteles_cercanos, PROP.nivel_seguridad, PROP.noches, PROP.habitaciones);
}

function vistaHotel(){
  const s = PROP.solicitud;
  return `
  <div class="panel">
    <h3><span class="panel-tag">2.1 · 2.2</span> Filtrar por cercanía y seguridad</h3>
    <p class="sub">Referencia geográfica: el destino del <b>Vuelo seleccionado</b>
      (${nombreCiudad(PROP.vuelo.Destino)}). Se consulta el almacén <b>HT</b>.</p>

    <div class="filtros">
      <div class="campo">
        <label for="f-radio">Radio máximo · <span class="filtro-valor" id="vRadio">${PROP.radio_km} km</span></label>
        <input type="range" id="f-radio" min="1" max="25" step="1" value="${PROP.radio_km}"
               oninput="document.getElementById('vRadio').textContent=this.value+' km'"
               onchange="cambiarFiltrosHotel()">
      </div>
      <div class="campo">
        <label for="f-seg">Nivel_Seguridad mínimo</label>
        <select id="f-seg" onchange="cambiarFiltrosHotel()">
          ${[1,2,3,4,5].map(n => `<option value="${n}" ${PROP.nivel_seguridad === n ? 'selected' : ''}>Nivel ${n} o superior</option>`).join('')}
        </select>
      </div>
      <div class="campo">
        <label for="f-hab">Habitaciones</label>
        <input type="number" id="f-hab" min="1" max="20" value="${PROP.habitaciones}" onchange="cambiarFiltrosHotel()">
      </div>
      <div class="campo">
        <label>Ventana de estancia</label>
        <input type="text" value="${fmtFecha(s.Fecha_Salida)} → ${fmtFecha(s.Fecha_Regreso)} · ${PROP.noches} noches" readonly>
      </div>
    </div>

    <div class="rejilla r-2" style="margin-bottom:1.2rem">
      <div class="aviso info"><i class="fas fa-location-dot"></i>
        <div><b>2.1 Hoteles cercanos:</b> ${PROP.hoteles_cercanos.length} dentro de ${PROP.radio_km} km.</div></div>
      <div class="aviso ${PROP.hoteles_seguros.length ? 'ok' : 'warn'}">
        <i class="fas fa-shield-halved"></i>
        <div><b>2.2 Hoteles seguros:</b> ${PROP.hoteles_seguros.length} cumplen nivel ≥ ${PROP.nivel_seguridad}
          y tienen ${PROP.habitaciones} habitación(es) libre(s).</div></div>
    </div>

    <h3 style="margin-top:1.6rem"><span class="panel-tag">2.3</span> Seleccionar hotel</h3>
    <p class="sub">Costo_Estancia = Tarifa_Noche × ${PROP.noches} noches × ${PROP.habitaciones} habitación(es)</p>
    <div id="listaHoteles">${listaHotelesHTML()}</div>
  </div>

  <div class="navegacion-pasos no-print">
    <button class="cta-btn outline" onclick="pasoAnterior()"><i class="fas fa-arrow-left"></i> Volver al vuelo</button>
    <button class="cta-btn" id="btnReservaHotel" onclick="ejecutarReservaHotel()" ${PROP.hotel ? '' : 'disabled'}>
      ${PROP.reservaHotel ? '<i class="fas fa-check"></i> Habitación reservada · continuar'
                          : '<i class="fas fa-key"></i> 2.4 Reservar habitación y continuar'}
    </button>
  </div>`;
}

async function cambiarFiltrosHotel(){
  PROP.radio_km        = parseInt($('#f-radio').value, 10);
  PROP.nivel_seguridad = parseInt($('#f-seg').value, 10);
  PROP.habitaciones    = Math.max(parseInt($('#f-hab').value, 10) || 1, 1);
  PROP.hotel = null; PROP.reservaHotel = null;
  await prepararHotel();
  renderPropuesta();
}

function listaHotelesHTML(){
  if (!PROP.hoteles_seguros.length)
    return `<div class="aviso warn"><i class="fas fa-triangle-exclamation"></i>
      <div><b>Ningún hotel viable.</b> Amplía el radio de búsqueda o baja el nivel de seguridad exigido.</div></div>`;

  const estrellas = n => '★'.repeat(n);
  return `<div class="opciones">` + PROP.hoteles_seguros.map(h => `
    <article class="opcion ${PROP.hotel && PROP.hotel.Id_Hotel === h.Id_Hotel ? 'elegida' : ''}"
             onclick="elegirHotel('${h.Id_Hotel}')" tabindex="0">
      <h4>${h.Nombre_Comercial}<span class="celda-sub">${h.Id_Hotel} · ${h.Ubicacion}</span></h4>
      <div class="etiquetas">
        <span class="pill oro">${estrellas(h.Categoria)}</span>
        <span class="pill ${h.Nivel_Seguridad >= 4 ? 'ok' : 'info'}">Seguridad ${h.Nivel_Seguridad}</span>
        <span class="pill ${h.Habitaciones_Libres < 4 ? 'warn' : 'ok'}">${h.Habitaciones_Libres} libres</span>
      </div>
      <div class="meta">
        <span><i class="fas fa-route"></i>${h.Distancia_Destino} km del destino</span>
        <span><i class="fas fa-bed"></i>${h.Tipo_Habitacion}</span>
      </div>
      <div class="meta">
        <span><i class="fas fa-concierge-bell"></i>${h.Servicios}</span>
        <span><i class="fas fa-ban"></i>${h.Cancelacion}</span>
      </div>
      <div class="precio">${fmtMoneda(h.Costo_Estancia)}
        <small>${fmtMoneda(h.Tarifa_Noche)} / noche · estancia completa</small></div>
    </article>`).join('') + `</div>`;
}

function elegirHotel(id){
  PROP.hotel = PROP.hoteles_seguros.find(h => h.Id_Hotel === id) || null;
  if (PROP.hotel){
    PROP.hotel.Fecha_CheckIn  = PROP.solicitud.Fecha_Salida;
    PROP.hotel.Fecha_CheckOut = PROP.solicitud.Fecha_Regreso;
    PROP.hotel.Criterio_Seleccion = 'precio/seguridad';
  }
  PROP.reservaHotel = null;
  $('#listaHoteles').innerHTML = listaHotelesHTML();
  const btn = $('#btnReservaHotel');
  btn.disabled = false;
  btn.innerHTML = '<i class="fas fa-key"></i> 2.4 Reservar habitación y continuar';
  renderResumenFlotante();
  toast('2.3 Hotel elegido: ' + PROP.hotel.Nombre_Comercial);
}

async function ejecutarReservaHotel(){
  if (!PROP.hotel) return toast('Elige primero un hotel', 'err');
  if (PROP.reservaHotel) return pasoSiguiente();

  const btn = $('#btnReservaHotel');
  btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Registrando en RE…';

  PROP.reservaHotel = await API.registrarReserva({
    Id_Cliente:    PROP.solicitud.Id_Cliente,
    Tipo_Servicio:'HOTEL',
    Id_Referencia: PROP.hotel.Id_Hotel,
    Descripcion:  `${PROP.hotel.Nombre_Comercial} · ${PROP.hotel.Tipo_Habitacion} × ${PROP.habitaciones}`,
    Fecha_Inicio:  PROP.hotel.Fecha_CheckIn,
    Fecha_Fin:     PROP.hotel.Fecha_CheckOut,
    N_Personas:    PROP.solicitud.N_Pasajeros,
    Monto_Reserva: PROP.hotel.Costo_Estancia
  });

  toast('2.4 Reserva ' + PROP.reservaHotel.Id_Reserva + ' escrita en RE', 'ok');
  await prepararActividades();
  pasoSiguiente();
}

/* ========================================================================
   PASO 3 · PROCESO 3.0 GESTIONAR ACTIVIDADES
   ===================================================================== */
async function prepararActividades(){
  PROP.actividades_cercanas = await API.buscarActividadesCercanas(PROP.hotel, PROP.radio_act);
  PROP.actividades_viables  = await API.verificarCuposHorarios(
    PROP.actividades_cercanas,
    { Fecha_CheckIn:PROP.hotel.Fecha_CheckIn, Fecha_CheckOut:PROP.hotel.Fecha_CheckOut },
    PROP.solicitud.N_Pasajeros);
}

function vistaActividades(){
  const viables   = PROP.actividades_viables.filter(a => a.Compatible_Horario);
  const noViables = PROP.actividades_viables.filter(a => !a.Compatible_Horario);

  return `
  <div class="panel">
    <h3><span class="panel-tag">3.1 · 3.2</span> Buscar actividades y verificar cupos</h3>
    <p class="sub">Referencia geográfica: <b>${PROP.hotel.Nombre_Comercial}</b> (${PROP.hotel.Ubicacion}).
      Se consulta el almacén <b>AC</b> y se valida cupo para ${PROP.solicitud.N_Pasajeros} persona(s).</p>

    <div class="filtros">
      <div class="campo">
        <label for="f-radioact">Radio desde el hotel · <span class="filtro-valor" id="vRadioAct">${PROP.radio_act} km</span></label>
        <input type="range" id="f-radioact" min="1" max="220" step="1" value="${PROP.radio_act}"
               oninput="document.getElementById('vRadioAct').textContent=this.value+' km'"
               onchange="cambiarFiltrosActividades()">
        <span class="ayuda">Amplía el radio para incluir excursiones fuera de la ciudad.</span>
      </div>
      <div class="campo">
        <label>Ventana de ejecución</label>
        <input type="text" readonly
          value="${fmtFecha(PROP.hotel.Fecha_CheckIn)} → ${fmtFecha(PROP.hotel.Fecha_CheckOut)}">
      </div>
      <div class="campo">
        <label>Seleccionadas</label>
        <input type="text" readonly value="${PROP.tours.length} tour(s)">
      </div>
    </div>

    <div class="rejilla r-2" style="margin-bottom:1.2rem">
      <div class="aviso info"><i class="fas fa-mountain-sun"></i>
        <div><b>3.1 Actividades cercanas:</b> ${PROP.actividades_cercanas.length} registro(s) de AC.</div></div>
      <div class="aviso ${viables.length ? 'ok' : 'warn'}"><i class="fas fa-calendar-check"></i>
        <div><b>3.2 Actividades viables:</b> ${viables.length} con cupo y horario compatible.
          ${noViables.length ? noViables.length + ' descartada(s).' : ''}</div></div>
    </div>

    <h3 style="margin-top:1.6rem"><span class="panel-tag">3.3</span> Seleccionar tours</h3>
    <p class="sub">Haz clic para agregar o quitar. El costo se multiplica por N_Personas.</p>
    <div id="listaTours">${listaToursHTML()}</div>

    ${noViables.length ? `
      <div class="separador"></div>
      <h3 style="font-size:1rem"><span class="panel-tag">3.2</span> Descartadas por el filtro</h3>
      <div class="tabla-envoltorio" style="margin-top:.7rem"><table class="tabla">
        <thead><tr><th>Id_Actividad</th><th>Nombre_Tour</th><th>Cupos_Libres</th><th>Motivo</th></tr></thead>
        <tbody>${noViables.map(a => `<tr>
          <td data-th="Id_Actividad">${a.Id_Actividad}</td>
          <td data-th="Nombre_Tour">${a.Nombre_Tour}</td>
          <td data-th="Cupos_Libres" class="num">${a.Cupos_Libres}/${a.Cupos_Maximos}</td>
          <td data-th="Motivo"><span class="pill err">${a.Motivo_No_Viable}</span></td>
        </tr>`).join('')}</tbody>
      </table></div>` : ''}
  </div>

  ${PROP.tours.length ? `
  <div class="panel" style="margin-top:1.3rem">
    <h3><span class="panel-tag">3.4</span> Itinerario consolidado</h3>
    <p class="sub">Integración del vuelo, el hotel y los tours elegidos, día por día.</p>
    ${itinerarioPorDiasHTML()}
  </div>` : ''}

  <div class="navegacion-pasos no-print">
    <button class="cta-btn outline" onclick="pasoAnterior()"><i class="fas fa-arrow-left"></i> Volver al hotel</button>
    <button class="cta-btn" id="btnConsolidar" onclick="ejecutarConsolidacion()">
      ${PROP.itinerario ? '<i class="fas fa-check"></i> Itinerario ' + PROP.itinerario.Id_Itinerario + ' · continuar'
                        : '<i class="fas fa-layer-group"></i> 3.4 Consolidar itinerario y continuar'}
    </button>
  </div>`;
}

async function cambiarFiltrosActividades(){
  PROP.radio_act = parseInt($('#f-radioact').value, 10);
  await prepararActividades();
  // conserva sólo los tours que siguen siendo viables
  const viables = new Set(PROP.actividades_viables.filter(a => a.Compatible_Horario).map(a => a.Id_Actividad));
  PROP.tours = PROP.tours.filter(t => viables.has(t.Id_Actividad));
  renderPropuesta();
}

function listaToursHTML(){
  const viables = PROP.actividades_viables.filter(a => a.Compatible_Horario);
  if (!viables.length)
    return `<div class="aviso warn"><i class="fas fa-triangle-exclamation"></i>
      <div><b>Sin actividades viables.</b> Amplía el radio o ajusta las fechas del viaje.</div></div>`;

  const pax = PROP.solicitud.N_Pasajeros;
  return `<div class="opciones">` + viables.map(a => {
    const elegido = PROP.tours.find(t => t.Id_Actividad === a.Id_Actividad);
    return `<article class="opcion ${elegido ? 'elegida' : ''}" onclick="alternarTour('${a.Id_Actividad}')" tabindex="0">
      <h4>${a.Nombre_Tour}<span class="celda-sub">${a.Id_Actividad} · ${a.Ubicacion}</span></h4>
      <div class="etiquetas">
        <span class="pill oro">${a.Tipo}</span>
        <span class="pill ${a.Cupos_Libres < 6 ? 'warn' : 'ok'}">${a.Cupos_Libres} cupos</span>
        ${a.Costo_Persona === 0 ? '<span class="pill ok">Gratis</span>' : ''}
      </div>
      <div class="meta">
        <span><i class="fas fa-calendar-day"></i>${fmtFecha(a.Fecha_Ejecucion)}</span>
        <span><i class="fas fa-clock"></i>${a.Hora_Inicio} · ${a.Duracion_Estimada} h</span>
        <span><i class="fas fa-route"></i>${a.Distancia_Hotel} km</span>
      </div>
      <div class="precio">${a.Costo_Persona === 0 ? 'Sin costo' : fmtMoneda(a.Costo_Persona)}
        <small>${a.Costo_Persona === 0 ? 'actividad gratuita' : `por persona · ${fmtMoneda(a.Costo_Persona * pax)} por ${pax} pax`}</small></div>
    </article>`;
  }).join('') + `</div>`;
}

function alternarTour(id){
  const i = PROP.tours.findIndex(t => t.Id_Actividad === id);
  if (i >= 0){
    PROP.tours.splice(i, 1);
  } else {
    const a = PROP.actividades_viables.find(x => x.Id_Actividad === id);
    if (!a) return;
    PROP.tours.push({ ...a, N_Personas:PROP.solicitud.N_Pasajeros, Criterio_Seleccion:'preferencias del cliente' });
  }
  PROP.itinerario = null; PROP.presupuesto = null;
  renderPropuesta();
}

function itinerarioPorDiasHTML(){
  const s = PROP.solicitud;
  const total = diasEntre(s.Fecha_Salida, s.Fecha_Regreso);
  let html = '';
  for (let i = 0; i <= total; i++){
    const fecha = sumarDias(s.Fecha_Salida, i);
    const delDia = PROP.tours.filter(t => t.Fecha_Ejecucion === fecha)
                             .sort((a, b) => a.Hora_Inicio.localeCompare(b.Hora_Inicio));
    const lineas = [];

    if (i === 0){
      lineas.push([`✈ Vuelo ${PROP.vuelo.Aerolinea} ${PROP.vuelo.Id_Vuelo}`,
                   `Sale ${fmtHora(PROP.vuelo.Hora_Salida)} · llega ${fmtFechaHora(PROP.vuelo.Fecha_Hora_Llegada)}`]);
      lineas.push([`⌂ Check-in ${PROP.hotel.Nombre_Comercial}`, PROP.hotel.Ubicacion]);
    }
    delDia.forEach(t => lineas.push([`★ ${t.Nombre_Tour}`,
      `${t.Hora_Inicio} · ${t.Duracion_Estimada} h · ${t.Costo_Persona === 0 ? 'gratis' : fmtMonedaCorta(t.Costo_Persona * t.N_Personas)}`]));
    if (i === total){
      lineas.push([`⌂ Check-out ${PROP.hotel.Nombre_Comercial}`, fmtFecha(fecha)]);
      lineas.push([`✈ Vuelo de regreso ${PROP.vuelo.Id_Vuelo}`, fmtHora(PROP.vuelo.Hora_Salida)]);
    }

    html += `<div class="dia">
      <h4><span class="dc">Día ${i + 1}</span> ${nombreDia(fecha)} ${fmtFecha(fecha)}</h4>
      ${lineas.length ? `<ul>${lineas.map(l => `<li><span>${l[0]}</span><span>${l[1]}</span></li>`).join('')}</ul>`
                      : `<p class="libre">Día libre · sin actividades programadas.</p>`}
    </div>`;
  }
  return html;
}

async function ejecutarConsolidacion(){
  if (PROP.itinerario) return pasoSiguiente();
  if (!PROP.tours.length && !confirm('No seleccionaste ninguna actividad. ¿Consolidar el itinerario solo con vuelo y hotel?'))
    return;

  const btn = $('#btnConsolidar');
  btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Consolidando…';

  PROP.itinerario = await API.consolidarItinerario({
    Id_Cliente:   PROP.solicitud.Id_Cliente,
    N_Pasajeros:  PROP.solicitud.N_Pasajeros,
    Habitaciones: PROP.habitaciones,
    Preferencias: PROP.solicitud.Preferencias,
    // Id_Reserva permite que el back-end enlace las reservas ya creadas
    vuelo: { ...PROP.vuelo, Id_Reserva: PROP.reservaVuelo ? PROP.reservaVuelo.Id_Reserva : null },
    hotel: { ...PROP.hotel, Id_Reserva: PROP.reservaHotel ? PROP.reservaHotel.Id_Reserva : null },
    tours: PROP.tours
  });

  // Reservas de actividades + enlace de las reservas previas al itinerario
  PROP.reservasTour = [];
  for (const t of PROP.tours){
    PROP.reservasTour.push(await API.registrarReserva({
      Id_Cliente:    PROP.solicitud.Id_Cliente,
      Id_Itinerario: PROP.itinerario.Id_Itinerario,
      Tipo_Servicio:'ACTIVIDAD',
      Id_Referencia: t.Id_Actividad,
      Descripcion:   t.Nombre_Tour,
      Fecha_Inicio:  t.Fecha_Ejecucion,
      N_Personas:    t.N_Personas,
      Monto_Reserva: t.Costo_Persona * t.N_Personas
    }));
  }
  PROP.reservaVuelo.Id_Itinerario = PROP.itinerario.Id_Itinerario;
  PROP.reservaHotel.Id_Itinerario = PROP.itinerario.Id_Itinerario;

  toast('3.4 Itinerario ' + PROP.itinerario.Id_Itinerario + ' consolidado', 'ok');
  await calcularPresupuesto();
  pasoSiguiente();
}

/* ========================================================================
   PASO 4 · PROCESO 4.0 EMITIR PRESUPUESTO
   ===================================================================== */
async function calcularPresupuesto(){
  PROP.consolidado = await API.consolidarReservas(PROP.itinerario.Id_Itinerario);
  PROP.costo_total = await API.calcularCostoTotal(PROP.consolidado, {
    vuelo:PROP.vuelo, hotel:PROP.hotel, tours:PROP.tours,
    noches:PROP.noches, habitaciones:PROP.habitaciones
  });
  PROP.costo_final = await API.aplicarImpuestos(PROP.costo_total, PROP.solicitud.N_Pasajeros);
}

function vistaPresupuesto(){
  if (!PROP.costo_total)
    return `<div class="panel"><div class="aviso warn"><i class="fas fa-triangle-exclamation"></i>
      <div>Consolida primero el itinerario en el paso 3.4.</div></div>
      <button class="cta-btn outline" onclick="irAPaso(2)">Volver a actividades</button></div>`;

  const ct = PROP.costo_total, cf = PROP.costo_final, s = PROP.solicitud;
  const sub = ct.Subtotal || 1;
  const pct = v => Math.round(v / sub * 100);

  return `
  <div class="rejilla r-ancho">
    <div class="panel">
      <h3><span class="panel-tag">4.1 · 4.2</span> Reservas consolidadas y costo total</h3>
      <p class="sub">${PROP.consolidado.N_Reservas} reserva(s) del itinerario
        <b>${PROP.itinerario.Id_Itinerario}</b>. Las tarifas marcadas como bloqueadas provienen del almacén <b>PR</b>.</p>

      <div class="tabla-envoltorio"><table class="tabla">
        <thead><tr><th>Servicio</th><th>Referencia</th><th>Tarifa</th><th>P. unitario</th><th>Cant.</th><th>Importe</th></tr></thead>
        <tbody>${ct.Detalle.map(d => `<tr>
          <td data-th="Servicio"><span class="pill oro">${d.Tipo_Servicio}</span></td>
          <td data-th="Referencia">${d.Descripcion}<span class="celda-sub">${d.Id_Referencia} · ${d.Id_Reserva}</span></td>
          <td data-th="Tarifa">${d.Bloqueado ? `<span class="pill ok">${d.Id_Tarifa}</span>`
                                              : '<span class="pill info">catálogo</span>'}</td>
          <td data-th="P. unitario" class="num">${fmtMoneda(d.Precio_Unitario)}</td>
          <td data-th="Cant." class="num">${d.Cantidad}</td>
          <td data-th="Importe" class="num fuerte">${fmtMoneda(d.Importe)}</td>
        </tr>`).join('')}</tbody>
      </table></div>

      <div class="separador"></div>
      <div class="barra"><div class="arriba"><span>Costo_Vuelos</span><b>${fmtMoneda(ct.Costo_Vuelos)}</b></div>
        <div class="pista"><div class="relleno" data-w="${pct(ct.Costo_Vuelos)}"></div></div></div>
      <div class="barra"><div class="arriba"><span>Costo_Hoteles</span><b>${fmtMoneda(ct.Costo_Hoteles)}</b></div>
        <div class="pista"><div class="relleno" data-w="${pct(ct.Costo_Hoteles)}"></div></div></div>
      <div class="barra"><div class="arriba"><span>Costo_Actividades</span><b>${fmtMoneda(ct.Costo_Actividades)}</b></div>
        <div class="pista"><div class="relleno" data-w="${pct(ct.Costo_Actividades)}"></div></div></div>
    </div>

    <div class="panel">
      <h3><span class="panel-tag">4.3</span> Aplicar impuestos</h3>
      <p class="sub">IVA del ${cf.Porcentaje_IVA}% sobre el subtotal más tasas aeroportuarias por pasajero.</p>
      <div class="kv"><span>Subtotal</span><span>${fmtMoneda(cf.Subtotal)}</span></div>
      <div class="kv"><span>IVA (${cf.Porcentaje_IVA}%)</span><span>${fmtMoneda(cf.Monto_IVA)}</span></div>
      <div class="kv"><span>Tasas aeroportuarias (${s.N_Pasajeros} pax)</span><span>${fmtMoneda(cf.Tasas_Aeroportuarias)}</span></div>
      <div class="kv"><span>Monto_Impuestos</span><span>${fmtMoneda(cf.Monto_Impuestos)}</span></div>
      <div class="kv total"><span>Monto_Total</span><span>${fmtMoneda(cf.Costo_Final)}</span></div>
      <p class="nota-mini">Costo por pasajero: <b>${fmtMoneda(cf.Costo_Final / s.N_Pasajeros)}</b> ·
        Validez_Oferta: ${CONFIG.validez_oferta_dias} días.</p>

      <div class="separador"></div>
      <h3 style="font-size:1rem">Documentación requerida</h3>
      <p class="sub">Checklist que acompaña al presupuesto.</p>
      <div id="chkLista">${DB.checklist.map((t, i) => `
        <label class="chk ${PROP.checklist[i] ? 'listo' : ''}">
          <input type="checkbox" ${PROP.checklist[i] ? 'checked' : ''} onchange="marcarChecklist(${i}, this.checked)">
          <span>${t}</span>
        </label>`).join('')}</div>
      <p class="nota-mini" id="chkAvance">${Object.values(PROP.checklist).filter(Boolean).length} de ${DB.checklist.length} completados.</p>
    </div>
  </div>

  <div class="panel" style="margin-top:1.3rem">
    <h3><span class="panel-tag">4.4</span> Emitir presupuesto</h3>
    <p class="sub">Genera el folio de cotización, lo guarda y habilita la exportación a PDF.</p>
    ${PROP.presupuesto ? `
      <div class="aviso ok"><i class="fas fa-file-invoice-dollar"></i>
        <div><b>Presupuesto ${PROP.presupuesto.Id_Cotizacion} emitido.</b>
          Fecha_Emision ${fmtFecha(PROP.presupuesto.Fecha_Emision)} ·
          vigente hasta ${fmtFecha(PROP.presupuesto.Vence_El)} ·
          Monto_Total ${fmtMoneda(PROP.presupuesto.Monto_Total)}.</div></div>
      <div class="rejilla r-2">
        <button class="cta-btn" onclick="exportarPDF()"><i class="fas fa-file-pdf"></i> Exportar a PDF</button>
        <button class="cta-btn outline" data-goto="cotizaciones"><i class="fas fa-folder-open"></i> Ver cotizaciones emitidas</button>
      </div>`
    : `<div class="aviso oro"><i class="fas fa-circle-info"></i>
        <div>Al emitir, el sistema asigna el folio <code>COT-${new Date().getFullYear()}-####</code>
          y congela el desglose mostrado arriba.</div></div>
       <button class="cta-btn" id="btnEmitir" onclick="ejecutarEmision()">
         <i class="fas fa-file-invoice-dollar"></i> 4.4 Emitir presupuesto</button>`}
  </div>

  <div class="navegacion-pasos no-print">
    <button class="cta-btn outline" onclick="pasoAnterior()"><i class="fas fa-arrow-left"></i> Volver a actividades</button>
    <button class="cta-btn outline" onclick="reiniciarPropuesta()"><i class="fas fa-rotate"></i> Nueva propuesta</button>
  </div>`;
}

function marcarChecklist(i, valor){
  PROP.checklist[i] = valor;
  const hechos = Object.values(PROP.checklist).filter(Boolean).length;
  $('#chkAvance').textContent = `${hechos} de ${DB.checklist.length} completados.`;
  $$('#chkLista .chk')[i].classList.toggle('listo', valor);
}

async function ejecutarEmision(){
  const btn = $('#btnEmitir');
  btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Emitiendo…';

  PROP.presupuesto = await API.emitirPresupuesto(PROP.costo_total, PROP.costo_final, {
    Id_Cliente:PROP.solicitud.Id_Cliente, Nombre_Cliente:PROP.solicitud.Nombre_Cliente,
    solicitud:PROP.solicitud, vuelo:PROP.vuelo, hotel:PROP.hotel, tours:PROP.tours,
    noches:PROP.noches, habitaciones:PROP.habitaciones
  });

  renderPropuesta();
  toast('4.4 Presupuesto ' + PROP.presupuesto.Id_Cotizacion + ' emitido', 'ok');
}

/* ========================================================================
   EXPORTACIÓN A PDF
   ===================================================================== */
function exportarPDF(){
  if (!PROP.vuelo || !PROP.solicitud)
    return toast('Arma al menos el vuelo para poder exportar', 'err');

  const borrador = !PROP.presupuesto;
  $('#documentoPDF').innerHTML = documentoHTML(borrador);
  $('#documentoPDF').classList.add('previsualizar');
  $('#documentoPDF').setAttribute('aria-hidden','false');
  document.body.style.overflow = 'hidden';
  window.scrollTo({ top:0, behavior:'instant' });
}

function cerrarPrevisualizacion(){
  $('#documentoPDF').classList.remove('previsualizar');
  $('#documentoPDF').setAttribute('aria-hidden','true');
  document.body.style.overflow = '';
}

function imprimirDocumento(){ window.print(); }

/** Documento de cotización. En impresión sólo este bloque queda visible,
 *  de modo que "Imprimir → Guardar como PDF" produce el archivo final. */
function documentoHTML(borrador){
  const s   = PROP.solicitud;
  const ct  = PROP.costo_total;
  const cf  = PROP.costo_final;
  const p   = PROP.presupuesto;
  const pax = s.N_Pasajeros;
  const folio = p ? p.Id_Cotizacion : 'BORRADOR';

  // Si aún no hay cálculo formal, se estima con los precios del catálogo
  const costoVuelos = ct ? ct.Costo_Vuelos : PROP.vuelo.Precio_Base * pax;
  const costoHotel  = ct ? ct.Costo_Hoteles : (PROP.hotel ? PROP.hotel.Tarifa_Noche * PROP.noches * PROP.habitaciones : 0);
  const costoTours  = ct ? ct.Costo_Actividades : PROP.tours.reduce((a, t) => a + t.Costo_Persona * t.N_Personas, 0);
  const subtotal    = costoVuelos + costoHotel + costoTours;
  const iva         = cf ? cf.Monto_IVA : +(subtotal * CONFIG.porcentaje_iva / 100).toFixed(2);
  const tasas       = cf ? cf.Tasas_Aeroportuarias : CONFIG.tasa_aeroportuaria * pax;
  const total       = cf ? cf.Costo_Final : subtotal + iva + tasas;

  const filas = [];
  filas.push(['VUELO', `${PROP.vuelo.Aerolinea} ${PROP.vuelo.Id_Vuelo} · ${PROP.vuelo.Origen} → ${PROP.vuelo.Destino}`,
    `${fmtFecha(s.Fecha_Salida)} ${fmtHora(PROP.vuelo.Hora_Salida)}<br>Regreso ${fmtFecha(s.Fecha_Regreso)} · ${PROP.vuelo.Clase_Tarifa}`,
    pax, PROP.vuelo.Precio_Base, costoVuelos]);
  if (PROP.hotel)
    filas.push(['HOSPEDAJE', `${PROP.hotel.Nombre_Comercial} · ${PROP.hotel.Ubicacion}`,
      `Check-in ${fmtFecha(PROP.hotel.Fecha_CheckIn)}<br>Check-out ${fmtFecha(PROP.hotel.Fecha_CheckOut)} · ${PROP.hotel.Tipo_Habitacion}`,
      `${PROP.noches} × ${PROP.habitaciones}`, PROP.hotel.Tarifa_Noche, costoHotel]);
  PROP.tours.forEach(t =>
    filas.push(['ACTIVIDAD', `${t.Nombre_Tour} · ${t.Ubicacion}`,
      `${fmtFecha(t.Fecha_Ejecucion)} ${t.Hora_Inicio} · ${t.Duracion_Estimada} h`,
      t.N_Personas, t.Costo_Persona, t.Costo_Persona * t.N_Personas]));

  return `
  <div class="doc-barra-prev no-print">
    <span><i class="fas fa-file-pdf"></i> Vista previa del documento ${borrador ? '(borrador)' : folio}</span>
    <div class="grupo">
      <button class="cta-btn small" onclick="imprimirDocumento()"><i class="fas fa-print"></i> Imprimir / Guardar PDF</button>
      <button class="cta-btn outline small" onclick="cerrarPrevisualizacion()">Cerrar</button>
    </div>
  </div>

  <div class="doc-hoja">
    <div class="doc-head">
      <div>
        <div class="doc-marca">SIGLV<small>Sistema Integral de Gestión y Logística de Viajes</small></div>
        <p style="font-size:10px;margin-top:6px">${CONFIG.domicilio}<br>RFC ${CONFIG.rfc} · ${CONFIG.contacto}</p>
      </div>
      <div class="doc-folio">
        <span>Presupuesto de viaje</span>
        <b>${folio}</b>
        <span>Fecha_Emision: ${fmtFecha(p ? p.Fecha_Emision : hoyISO())}</span>
        <span>Id_Itinerario: ${PROP.itinerario ? PROP.itinerario.Id_Itinerario : '—'}</span>
        ${borrador ? '<span style="color:#b23a3a!important;font-weight:700">DOCUMENTO SIN EMITIR</span>' : ''}
      </div>
    </div>

    <h2>Datos del cliente y del viaje</h2>
    <div class="doc-rejilla">
      <div class="doc-kv"><span>Id_Cliente</span><span>${s.Id_Cliente}</span></div>
      <div class="doc-kv"><span>Cliente</span><span>${s.Nombre_Cliente}</span></div>
      <div class="doc-kv"><span>Origen</span><span>${nombreCiudad(s.Origen)}</span></div>
      <div class="doc-kv"><span>Destino</span><span>${nombreCiudad(s.Destino)}</span></div>
      <div class="doc-kv"><span>Fecha_Salida</span><span>${fmtFecha(s.Fecha_Salida)}</span></div>
      <div class="doc-kv"><span>Fecha_Regreso</span><span>${fmtFecha(s.Fecha_Regreso)}</span></div>
      <div class="doc-kv"><span>N_Pasajeros</span><span>${pax}</span></div>
      <div class="doc-kv"><span>Noches</span><span>${PROP.noches}</span></div>
      <div class="doc-kv"><span>Clase_Tarifa</span><span>${s.Clase_Tarifa}</span></div>
      <div class="doc-kv"><span>Preferencias</span><span>${s.Preferencias || '—'}</span></div>
    </div>

    <h2>Desglose de servicios</h2>
    <table class="doc-tabla">
      <thead><tr><th>Servicio</th><th>Descripción</th><th>Fechas</th><th>Cant.</th><th>P. unitario</th><th>Importe</th></tr></thead>
      <tbody>
        ${filas.map(f => `<tr>
          <td><b>${f[0]}</b></td><td>${f[1]}</td><td>${f[2]}</td>
          <td class="num">${f[3]}</td><td class="num">${fmtMoneda(f[4])}</td><td class="num"><b>${fmtMoneda(f[5])}</b></td>
        </tr>`).join('')}
      </tbody>
      <tfoot><tr><td colspan="5">Subtotal de servicios</td><td class="num">${fmtMoneda(subtotal)}</td></tr></tfoot>
    </table>

    <div class="doc-totales">
      <div class="doc-kv"><span>Costo_Vuelos</span><span>${fmtMoneda(costoVuelos)}</span></div>
      <div class="doc-kv"><span>Costo_Hoteles</span><span>${fmtMoneda(costoHotel)}</span></div>
      <div class="doc-kv"><span>Costo_Actividades</span><span>${fmtMoneda(costoTours)}</span></div>
      <div class="doc-kv"><span>IVA ${CONFIG.porcentaje_iva}%</span><span>${fmtMoneda(iva)}</span></div>
      <div class="doc-kv"><span>Tasas aeroportuarias</span><span>${fmtMoneda(tasas)}</span></div>
      <div class="doc-kv gran-total"><span>Monto_Total</span><span>${fmtMoneda(total)}</span></div>
      <div class="doc-kv"><span>Costo por pasajero</span><span>${fmtMoneda(total / pax)}</span></div>
    </div>

    ${PROP.tours.length || PROP.hotel ? `
    <h2>Itinerario propuesto</h2>
    ${itinerarioDocumentoHTML()}` : ''}

    <h2>Documentación requerida</h2>
    <table class="doc-tabla">
      <tbody>
        ${DB.checklist.map((t, i) => `<tr>
          <td style="width:26px;text-align:center">${PROP.checklist[i] ? '☑' : '☐'}</td><td>${t}</td>
        </tr>`).join('')}
      </tbody>
    </table>

    <div class="doc-nota">
      <b>Condiciones.</b> Vigencia de la oferta: ${CONFIG.validez_oferta_dias} días naturales a partir de la
      fecha de emisión${p ? ` (vence el ${fmtFecha(p.Vence_El)})` : ''}. Los precios se expresan en
      ${CONFIG.moneda} e incluyen los impuestos señalados. Las tarifas quedan congeladas en el almacén de
      precios bloqueados (PR) al momento de la reserva; fuera de la vigencia están sujetas a
      reconfirmación de disponibilidad. Las políticas de cancelación son las de cada proveedor.
      ${borrador ? '<br><b>Este documento es un borrador y no constituye una cotización emitida.</b>' : ''}
    </div>

    <div class="doc-firmas">
      <div>Agente de viajes SIGLV</div>
      <div>Aceptación del cliente</div>
    </div>

    <div class="doc-pie">
      <span>${CONFIG.razon_social}</span>
      <span>Folio ${folio} · ${PROP.itinerario ? PROP.itinerario.Id_Itinerario : 'sin itinerario'}</span>
      <span>Impreso el ${fmtFecha(hoyISO())}</span>
    </div>
  </div>`;
}

function itinerarioDocumentoHTML(){
  const s = PROP.solicitud;
  const total = diasEntre(s.Fecha_Salida, s.Fecha_Regreso);
  let filas = '';
  for (let i = 0; i <= total; i++){
    const fecha = sumarDias(s.Fecha_Salida, i);
    const delDia = PROP.tours.filter(t => t.Fecha_Ejecucion === fecha)
                             .sort((a, b) => a.Hora_Inicio.localeCompare(b.Hora_Inicio));
    const detalle = [];
    if (i === 0){
      detalle.push(`Vuelo ${PROP.vuelo.Aerolinea} ${PROP.vuelo.Id_Vuelo} (${fmtHora(PROP.vuelo.Hora_Salida)})`);
      if (PROP.hotel) detalle.push(`Check-in en ${PROP.hotel.Nombre_Comercial}`);
    }
    delDia.forEach(t => detalle.push(`${t.Hora_Inicio} · ${t.Nombre_Tour} (${t.Duracion_Estimada} h)`));
    if (i === total){
      if (PROP.hotel) detalle.push('Check-out');
      detalle.push(`Vuelo de regreso ${PROP.vuelo.Id_Vuelo}`);
    }
    filas += `<tr>
      <td style="width:92px"><b>Día ${i + 1}</b><br><span style="font-size:9px">${fmtFecha(fecha)}</span></td>
      <td>${detalle.length ? detalle.join('<br>') : 'Día libre'}</td>
    </tr>`;
  }
  return `<table class="doc-tabla"><tbody>${filas}</tbody></table>`;
}
