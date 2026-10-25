/* ============================================================================
   SIGLV · ui.js  —  Shell de la interfaz
   Navegación entre pantallas, menú desplegable, tema claro/oscuro, banner,
   reproductor de video, slider de testimonios, catálogo y avisos.
   ========================================================================= */
'use strict';

const $  = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));

/* =============================== AVISOS ================================ */
let _toastTimer;
function toast(mensaje, tipo = ''){
  const t = $('#toast');
  t.textContent = mensaje;
  t.className = 'toast show ' + tipo;
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => { t.className = 'toast ' + tipo; }, 3200);
}

/* ========================= NAVEGACIÓN DE PANTALLAS ===================== */
const PANTALLAS = ['inicio','catalogo','propuesta','cotizaciones','empresa','contacto'];

function mostrarPantalla(id, inicial){
  if (!PANTALLAS.includes(id)) id = 'inicio';
  $$('.pantalla').forEach(p => p.classList.toggle('activa', p.id === id));
  $$('.nav-links button').forEach(b => b.classList.toggle('active-btn', b.dataset.goto === id));

  // Cierra el menú si venía abierto
  if ($('#overlayMenu').classList.contains('active')) toggleMenu();

  // El hash apunta a un id que existe en el documento, así que el navegador
  // salta al ancla: se escribe antes de subir y, en la carga inicial, no se
  // escribe en absoluto (el salto ocurriría después del evento load).
  if (!inicial && history.replaceState) history.replaceState(null, '', '#' + id);
  window.scrollTo({ top:0, behavior: inicial ? 'auto' : 'smooth' });

  // Carga diferida de cada módulo
  if (id === 'catalogo')     renderCatalogo();
  if (id === 'propuesta')    renderPropuesta();
  if (id === 'cotizaciones') renderCotizaciones();
  $('#resumenFlotante').classList.toggle('visible', id === 'propuesta' && typeof hayPaquete === 'function' && hayPaquete());
  observarRevelados();
}

/* Delegación: cualquier elemento con data-goto navega */
document.addEventListener('click', e => {
  const el = e.target.closest('[data-goto]');
  if (!el) return;
  e.preventDefault();
  mostrarPantalla(el.dataset.goto);
});

/* ==================== MENÚ HAMBURGUESA DESPLEGABLE ===================== */
function toggleMenu(){
  const menu = $('#overlayMenu'), trigger = $('#menuTrigger');
  const abierto = menu.classList.toggle('active');
  trigger.classList.toggle('abierto', abierto);
  trigger.setAttribute('aria-expanded', abierto ? 'true' : 'false');
  document.body.style.overflow = abierto && window.innerWidth < 769 ? 'hidden' : '';
}
$('#menuTrigger').addEventListener('keydown', e => {
  if (e.key === 'Enter' || e.key === ' '){ e.preventDefault(); toggleMenu(); }
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape'){
    if ($('#documentoPDF').classList.contains('previsualizar')) return cerrarPrevisualizacion();
    if ($('#overlayMenu').classList.contains('active')) toggleMenu();
  }
});

/* ========================== TEMA CLARO / OSCURO ======================== */
const switchTema = $('.theme-switch input[type="checkbox"]');
(function initTema(){
  let guardado = null;
  try{ guardado = localStorage.getItem('siglv_tema'); }catch(e){}
  if (guardado === 'claro'){ document.body.classList.add('switch'); switchTema.checked = true; }
})();
switchTema.addEventListener('change', e => {
  const claro = e.target.checked;
  document.body.classList.toggle('switch', claro);
  try{ localStorage.setItem('siglv_tema', claro ? 'claro' : 'oscuro'); }catch(err){}
  toast(claro ? 'Modo claro activado' : 'Modo oscuro activado');
});

/* =================== REPRODUCTOR DE VIDEO PERSONALIZADO ================ */
const video      = $('#videoPrincipal');
const videoIcon  = $('#videoIcon');
const videoBar   = $('#videoBar');
const barWrapper = $('#videoBarWrapper');
const videoTime  = $('#videoTime');
const videoMute  = $('#videoMute');

const mmss = s => {
  if (!isFinite(s)) return '00:00';
  const m = Math.floor(s / 60), r = Math.floor(s % 60);
  return `${String(m).padStart(2,'0')}:${String(r).padStart(2,'0')}`;
};

function playPauseVideo(){
  if (!video) return;
  if (video.paused){
    video.play().catch(() => toast('No se pudo reproducir el video', 'err'));
    videoIcon.className = 'fas fa-pause-circle';
    video.style.opacity = '1';
  } else {
    video.pause();
    videoIcon.className = 'fas fa-play-circle';
    video.style.opacity = '.78';
  }
}
function retrocederVideo(){ if (video) video.currentTime = Math.max(0, video.currentTime - 10); }
function silenciarVideo(){
  if (!video) return;
  video.muted = !video.muted;
  videoMute.className = video.muted ? 'fas fa-volume-xmark' : 'fas fa-volume-high';
}
function pantallaCompletaVideo(){
  const w = video ? video.closest('.video-wrapper') : null;
  if (!w) return;
  if (document.fullscreenElement) document.exitFullscreen();
  else if (w.requestFullscreen) w.requestFullscreen();
  else if (video.webkitEnterFullscreen) video.webkitEnterFullscreen();
}
if (video){
  video.addEventListener('timeupdate', () => {
    if (video.duration) videoBar.style.width = (video.currentTime / video.duration * 100) + '%';
    videoTime.textContent = `${mmss(video.currentTime)} / ${mmss(video.duration)}`;
  });
  video.addEventListener('loadedmetadata', () => {
    videoTime.textContent = `00:00 / ${mmss(video.duration)}`;
  });
  video.addEventListener('ended', () => {
    videoIcon.className = 'fas fa-play-circle';
    video.style.opacity = '.78';
    videoBar.style.width = '0%';
  });
  video.addEventListener('click', playPauseVideo);
  barWrapper.addEventListener('click', e => {
    const r = barWrapper.getBoundingClientRect();
    if (video.duration) video.currentTime = ((e.clientX - r.left) / r.width) * video.duration;
  });
}

/* Lista de videos (DB.videos → tabla `video` en MySQL) */
function renderVideos(){
  const cont = $('#videoPlaylist');
  if (!cont) return;
  cont.innerHTML = DB.videos.map((v, i) =>
    `<button class="video-chip ${i === 0 ? 'activo' : ''}" data-video="${v.id}">
       <i class="fas fa-circle-play"></i> ${v.titulo}
     </button>`).join('');

  cont.addEventListener('click', e => {
    const chip = e.target.closest('[data-video]');
    if (!chip) return;
    const v = DB.videos.find(x => x.id === chip.dataset.video);
    if (!v) return;
    cont.querySelectorAll('.video-chip').forEach(c => c.classList.remove('activo'));
    chip.classList.add('activo');
    video.pause();
    video.querySelector('source').src = v.archivo;
    video.poster = v.poster;
    video.load();
    videoIcon.className = 'fas fa-play-circle';
    videoBar.style.width = '0%';
    toast('Video: ' + v.titulo);
  });
}

/* ====================== SLIDER DE TESTIMONIOS ========================== */
let indiceSlide = 0, autoPlay = null;

function renderTestimonios(){
  const track = $('#testimonialTrack'), dots = $('#sliderDots');
  if (!track) return;
  track.innerHTML = DB.testimonios.map(t => `
    <div class="testimonial-card">
      <img src="${t.img}" alt="${t.nombre}" class="client-img" loading="lazy">
      <p class="client-quote">“${t.texto}”</p>
      <h4 class="client-name">${t.nombre}</h4>
      <span class="client-role">${t.rol}</span>
    </div>`).join('');
  dots.innerHTML = DB.testimonios.map((_, i) =>
    `<button class="dot ${i === 0 ? 'active' : ''}" data-slide="${i}" aria-label="Testimonio ${i+1}"></button>`).join('');
  dots.addEventListener('click', e => {
    const d = e.target.closest('[data-slide]');
    if (d) goToSlide(Number(d.dataset.slide));
  });
  iniciarAutoPlay();
  track.addEventListener('mouseenter', () => clearInterval(autoPlay));
  track.addEventListener('mouseleave', iniciarAutoPlay);
  window.addEventListener('resize', actualizarSlider);
}

function actualizarSlider(){
  const track = $('#testimonialTrack');
  const cards = $$('.testimonial-card');
  if (!track || !cards.length) return;
  const visibles = window.innerWidth >= 1024 ? 3 : (window.innerWidth >= 768 ? 2 : 1);
  const max = Math.max(cards.length - visibles, 0);
  if (indiceSlide > max) indiceSlide = 0;
  const gap = 32;
  track.style.transform = `translateX(-${(cards[0].offsetWidth + gap) * indiceSlide}px)`;
  $$('.dot').forEach((d, i) => d.classList.toggle('active', i === indiceSlide));
}
function moveSlide(dir){
  const cards = $$('.testimonial-card');
  const visibles = window.innerWidth >= 1024 ? 3 : (window.innerWidth >= 768 ? 2 : 1);
  const max = Math.max(cards.length - visibles, 0);
  indiceSlide += dir;
  if (indiceSlide < 0) indiceSlide = max;
  if (indiceSlide > max) indiceSlide = 0;
  actualizarSlider(); iniciarAutoPlay();
}
function goToSlide(i){ indiceSlide = i; actualizarSlider(); iniciarAutoPlay(); }
function iniciarAutoPlay(){ clearInterval(autoPlay); autoPlay = setInterval(() => moveSlide(1), 6000); }

/* ===================== GALERÍA DE DESTINOS ============================= */
function renderDestinos(){
  const cont = $('#galeriaDestinos');
  if (!cont) return;
  cont.innerHTML = DB.destinos_galeria.map(d => `
    <div class="item" data-goto="propuesta">
      <img src="${d.img}" alt="${d.titulo}" class="item-image" loading="lazy">
      <div class="item-text"><div class="item-text-wrap">
        <p class="item-text-category">${d.categoria}</p>
        <h2 class="item-text-title">${d.titulo}</h2>
        <p class="item-text-extra">${d.extra}</p>
      </div></div>
    </div>`).join('');
}

/* ======================= CONTADORES DEL BANNER ========================= */
function animarContador(el, destino){
  const dur = 1100, t0 = performance.now();
  const paso = t => {
    const p = Math.min((t - t0) / dur, 1);
    el.textContent = Math.round(destino * (1 - Math.pow(1 - p, 3)));
    if (p < 1) requestAnimationFrame(paso);
  };
  requestAnimationFrame(paso);
}
async function renderMetricas(){
  const valores = [DB.vuelo.length, DB.hotel.length, DB.actividad.length, DB.precio_bloqueado.length];
  $$('#heroMetrics [data-contador]').forEach((el, i) => animarContador(el, valores[i] || 0));
}

/* ==================== ANIMACIÓN AL HACER SCROLL ======================== */
let observador;
function observarRevelados(){
  if (!('IntersectionObserver' in window)){
    $$('.reveal').forEach(el => el.classList.add('visible'));
    return;
  }
  if (!observador){
    observador = new IntersectionObserver(entradas => {
      entradas.forEach(en => { if (en.isIntersecting){ en.target.classList.add('visible'); observador.unobserve(en.target); } });
    }, { threshold:.12 });
  }
  $$('.reveal:not(.visible)').forEach(el => observador.observe(el));
}

/* ============== NAVBAR COMPACTA + BOTÓN VOLVER ARRIBA ================== */
window.addEventListener('scroll', () => {
  const y = window.scrollY;
  $('#navbar').classList.toggle('compacta', y > 90);
  $('#toTop').classList.toggle('visible', y > 420);
}, { passive:true });

/* ============================== CATÁLOGO =============================== */
const ALMACENES = [
  { id:'VU', etiqueta:'Vuelos',            icono:'fa-plane',        tabla:'vuelo',
    nota:'Almacén VU · inventario de vuelos: itinerario base, tarifas y asientos libres. Lo consulta el subproceso 1.2 Buscar vuelos.' },
  { id:'HT', etiqueta:'Hoteles',           icono:'fa-hotel',        tabla:'hotel',
    nota:'Almacén HT · oferta de alojamiento con ubicación, categoría, nivel de seguridad y tarifa por noche. Lo consulta el subproceso 2.2 Filtrar por seguridad.' },
  { id:'AC', etiqueta:'Actividades',       icono:'fa-mountain-sun', tabla:'actividad',
    nota:'Almacén AC · tours y experiencias con horario, duración, costo y cupos. Lo consultan los subprocesos 3.1 y 3.2.' },
  { id:'PR', etiqueta:'Precios bloqueados',icono:'fa-tags',         tabla:'precio_bloqueado',
    nota:'Almacén PR · tarifas congeladas al momento de la reserva. Las consulta el subproceso 4.2 Calcular costo total.' },
  { id:'RE', etiqueta:'Reservas',          icono:'fa-bookmark',     tabla:'reserva',
    nota:'Almacén RE · reservas confirmadas de vuelo, hotel y actividades. Lo escriben los subprocesos 1.4, 2.4 y 3.4.' }
];

let catActual = 'VU', catFiltro = '';

function renderCatalogo(){
  $('#catTabs').innerHTML = ALMACENES.map(a =>
    `<button class="${catActual === a.id ? 'activo' : ''}" data-almacen="${a.id}">
       <i class="fas ${a.icono}"></i> ${a.etiqueta} <span class="cat-id">${a.id}</span>
     </button>`).join('');

  const def = ALMACENES.find(a => a.id === catActual);
  const filas = (DB[def.tabla] || []).filter(filaCoincide);

  let html = `<div class="cat-almacen-nota"><i class="fas fa-database"></i><div>${def.nota}</div></div>`;
  html += filas.length ? tablaDe(catActual, filas)
        : `<div class="tabla-envoltorio"><p class="vacio">
             ${catActual === 'RE' ? 'Aún no hay reservas. Se generan al armar una propuesta en los pasos 1.4, 2.4 y 3.4.'
                                  : 'Ningún registro coincide con la búsqueda.'}</p></div>`;
  $('#catContenido').innerHTML = html;
}

function filaCoincide(f){
  if (!catFiltro) return true;
  return JSON.stringify(f).toLowerCase().includes(catFiltro);
}

function tablaDe(almacen, filas){
  const estrellas = n => '★'.repeat(n) + '☆'.repeat(Math.max(5 - n, 0));
  let encabezado = '', cuerpo = '';

  if (almacen === 'VU'){
    encabezado = ['Id_Vuelo','Aerolínea','Ruta','Horario','Clase','Precio_Base','Asientos','Estado'];
    cuerpo = filas.map(v => `<tr>
      <td data-th="Id_Vuelo" class="fuerte">${v.Id_Vuelo}<span class="celda-sub">${v.Codigo_Aerolinea}</span></td>
      <td data-th="Aerolínea">${v.Aerolinea}</td>
      <td data-th="Ruta">${v.Origen} → ${v.Destino}
        <span class="celda-sub">${v.Escalas ? v.Escalas + ' escala · ' + v.Escala_En : 'Vuelo directo'}</span></td>
      <td data-th="Horario">${v.Hora_Salida}<span class="celda-sub">${duracionTexto(v.Duracion_Minutos)}</span></td>
      <td data-th="Clase">${v.Clase_Tarifa}</td>
      <td data-th="Precio_Base" class="num fuerte">${fmtMonedaCorta(v.Precio_Base)}</td>
      <td data-th="Asientos" class="num">${v.Asientos_Disponibles}</td>
      <td data-th="Estado"><span class="pill ${v.Estado === 'Disponible' ? 'ok' : 'err'}">${v.Estado}</span></td>
    </tr>`).join('');

  } else if (almacen === 'HT'){
    encabezado = ['Id_Hotel','Nombre_Comercial','Ubicacion','Distancia','Categoría','Seguridad','Tarifa_Noche','Libres'];
    cuerpo = filas.map(h => `<tr>
      <td data-th="Id_Hotel" class="fuerte">${h.Id_Hotel}</td>
      <td data-th="Nombre_Comercial">${h.Nombre_Comercial}<span class="celda-sub">${h.Servicios}</span></td>
      <td data-th="Ubicacion">${h.Ubicacion}<span class="celda-sub">${ciudadCorta(h.Ciudad)}</span></td>
      <td data-th="Distancia" class="num">${h.Distancia_Destino} km</td>
      <td data-th="Categoría"><span style="color:var(--oro)">${estrellas(h.Categoria)}</span></td>
      <td data-th="Seguridad"><span class="pill ${h.Nivel_Seguridad >= 4 ? 'ok' : h.Nivel_Seguridad >= 3 ? 'info' : 'warn'}">Nivel ${h.Nivel_Seguridad}</span></td>
      <td data-th="Tarifa_Noche" class="num fuerte">${fmtMonedaCorta(h.Tarifa_Noche)}</td>
      <td data-th="Libres" class="num">${h.Habitaciones_Libres}</td>
    </tr>`).join('');

  } else if (almacen === 'AC'){
    encabezado = ['Id_Actividad','Nombre_Tour','Ubicacion','Hora','Duración','Costo_Persona','Cupos','Tipo'];
    cuerpo = filas.map(a => `<tr>
      <td data-th="Id_Actividad" class="fuerte">${a.Id_Actividad}</td>
      <td data-th="Nombre_Tour">${a.Nombre_Tour}
        <span class="celda-sub">${a.Operacion_Diaria ? 'Operación diaria' : 'Fecha fija ' + fmtFecha(a.Fecha_Ejecucion)}</span></td>
      <td data-th="Ubicacion">${a.Ubicacion}<span class="celda-sub">${a.Distancia_Hotel} km del hotel</span></td>
      <td data-th="Hora" class="num">${a.Hora_Inicio}</td>
      <td data-th="Duración" class="num">${a.Duracion_Estimada}</td>
      <td data-th="Costo_Persona" class="num fuerte">${a.Costo_Persona === 0 ? '<span class="pill ok">Gratis</span>' : fmtMonedaCorta(a.Costo_Persona)}</td>
      <td data-th="Cupos" class="num"><span class="pill ${a.Cupos_Libres === 0 ? 'err' : a.Cupos_Libres < 6 ? 'warn' : 'ok'}">${a.Cupos_Libres}/${a.Cupos_Maximos}</span></td>
      <td data-th="Tipo">${a.Tipo}</td>
    </tr>`).join('');

  } else if (almacen === 'PR'){
    encabezado = ['Id_Tarifa','Tipo_Servicio','Id_Referencia','Precio_Unitario','Moneda','Vigencia','Impuesto'];
    cuerpo = filas.map(p => {
      const vigente = diasEntre(p.Fecha_Vigencia_Inicio, hoyISO()) >= 0 && diasEntre(hoyISO(), p.Fecha_Vigencia_Fin) >= 0;
      return `<tr>
        <td data-th="Id_Tarifa" class="fuerte">${p.Id_Tarifa}</td>
        <td data-th="Tipo_Servicio"><span class="pill oro">${p.Tipo_Servicio}</span></td>
        <td data-th="Id_Referencia">${p.Id_Referencia}</td>
        <td data-th="Precio_Unitario" class="num fuerte">${fmtMoneda(p.Precio_Unitario)}</td>
        <td data-th="Moneda">${p.Moneda}</td>
        <td data-th="Vigencia">${fmtFecha(p.Fecha_Vigencia_Inicio)} → ${fmtFecha(p.Fecha_Vigencia_Fin)}
          <span class="celda-sub">${vigente ? '<span class="pill ok">Vigente</span>' : '<span class="pill warn">Fuera de vigencia</span>'}</span></td>
        <td data-th="Impuesto" class="num">${p.Porcentaje_Impuesto}%</td>
      </tr>`;
    }).join('');

  } else { /* RE */
    encabezado = ['Id_Reserva','Tipo_Servicio','Id_Referencia','Descripción','Fecha_Reserva','Personas','Monto_Reserva','Estado'];
    cuerpo = filas.map(r => `<tr>
      <td data-th="Id_Reserva" class="fuerte">${r.Id_Reserva}<span class="celda-sub">${r.Id_Itinerario || '—'}</span></td>
      <td data-th="Tipo_Servicio"><span class="pill oro">${r.Tipo_Servicio}</span></td>
      <td data-th="Id_Referencia">${r.Id_Referencia}</td>
      <td data-th="Descripción">${r.Descripcion}</td>
      <td data-th="Fecha_Reserva">${fmtFecha(r.Fecha_Reserva)}</td>
      <td data-th="Personas" class="num">${r.N_Personas}</td>
      <td data-th="Monto_Reserva" class="num fuerte">${fmtMoneda(r.Monto_Reserva)}</td>
      <td data-th="Estado"><span class="pill ok">${r.Estado_Reserva}</span></td>
    </tr>`).join('');
  }

  return `<div class="tabla-envoltorio"><table class="tabla">
      <thead><tr>${encabezado.map(h => `<th>${h}</th>`).join('')}</tr></thead>
      <tbody>${cuerpo}</tbody>
    </table></div>
    <p class="nota-mini" style="margin-top:.8rem">${filas.length} registro(s) · tabla <code>${ALMACENES.find(a => a.id === almacen).tabla}</code></p>`;
}

$('#catTabs').addEventListener('click', e => {
  const b = e.target.closest('[data-almacen]');
  if (!b) return;
  catActual = b.dataset.almacen;
  renderCatalogo();
});
$('#catBuscar').addEventListener('input', e => {
  catFiltro = e.target.value.trim().toLowerCase();
  renderCatalogo();
});

/* ====================== COTIZACIONES GUARDADAS ========================= */
function renderCotizaciones(){
  const cont = $('#listaCotizaciones');
  const lista = API.cotizacionesLocales();
  if (!lista.length){
    cont.innerHTML = `<div class="panel" style="grid-column:1/-1;text-align:center">
        <p class="sub" style="margin:0 0 1rem">Todavía no has emitido ninguna cotización.</p>
        <button class="cta-btn" data-goto="propuesta"><i class="fas fa-plus"></i> Crear una propuesta</button>
      </div>`;
    return;
  }
  cont.innerHTML = lista.map(c => {
    const p = c.presupuesto, r = c.resumen;
    const vencida = diasEntre(hoyISO(), p.Vence_El) < 0;
    return `<article class="cotiza-card">
      <p class="folio">${p.Id_Cotizacion}</p>
      <h4>${r.Nombre_Cliente || 'Cliente'}</h4>
      <p class="xs muted">${ciudadCorta(r.Destino)} · ${fmtFecha(r.Fecha_Salida)} → ${fmtFecha(r.Fecha_Regreso)}</p>
      <p class="monto">${fmtMoneda(p.Monto_Total)}</p>
      <div class="kv"><span>Pasajeros</span><span>${r.N_Pasajeros}</span></div>
      <div class="kv"><span>Vuelo</span><span>${r.Vuelo || '—'}</span></div>
      <div class="kv"><span>Hotel</span><span>${r.Hotel || '—'}</span></div>
      <div class="kv"><span>Tours</span><span>${r.Tours}</span></div>
      <div class="kv"><span>Vigencia</span><span>${vencida ? '<span class="pill err">Vencida</span>'
        : '<span class="pill ok">Vence ' + fmtFecha(p.Vence_El) + '</span>'}</span></div>
      <div class="acciones">
        <button class="btn-mini lleno" onclick="verCotizacion('${p.Id_Cotizacion}')"><i class="fas fa-file-pdf"></i> Ver / PDF</button>
        <button class="btn-mini" onclick="eliminarCotizacion('${p.Id_Cotizacion}')"><i class="fas fa-trash"></i></button>
      </div>
    </article>`;
  }).join('');
}

function eliminarCotizacion(folio){
  if (!confirm('¿Eliminar la cotización ' + folio + '?')) return;
  API.borrarCotizacionLocal(folio);
  renderCotizaciones();
  toast('Cotización eliminada');
}

/* ===================== AUTENTICACIÓN (demo local) ====================== */
const LS_USER = 'siglv_agente_v1';

function verificarUsuario(){
  let datos = null;
  try{ datos = JSON.parse(localStorage.getItem(LS_USER) || 'null'); }catch(e){}
  if (datos){
    $('#display-name').textContent  = 'Hola, ' + datos.nombre;
    $('#display-email').textContent = datos.email;
    $('#auth-form-view').style.display = 'none';
    $('#user-profile-view').style.display = 'block';
  } else {
    $('#auth-form-view').style.display = 'block';
    $('#user-profile-view').style.display = 'none';
  }
}
$('#user-form').addEventListener('submit', e => {
  e.preventDefault();
  const nombre = $('#reg-name').value.trim();
  const email  = $('#reg-email').value.trim();
  const pass   = $('#reg-pass').value;
  if (!nombre || !email || pass.length < 6) return toast('Completa los campos (contraseña mín. 6)', 'err');
  try{ localStorage.setItem(LS_USER, JSON.stringify({ nombre, email, fecha:new Date().toISOString() })); }catch(err){}
  verificarUsuario();
  e.target.reset();
  toast('Sesión iniciada como ' + nombre, 'ok');
});
function cerrarSesion(){
  if (!confirm('¿Cerrar la sesión del agente?')) return;
  try{ localStorage.removeItem(LS_USER); }catch(e){}
  verificarUsuario();
  toast('Sesión cerrada');
}

/* ========================= FORMULARIO DE CONTACTO ====================== */
$('#formContacto').addEventListener('submit', e => {
  e.preventDefault();
  const n = $('#ct-nombre').value.trim(), m = $('#ct-email').value.trim(), t = $('#ct-msg').value.trim();
  if (!n || !m || !t) return toast('Completa nombre, email y mensaje', 'err');
  if (!/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(m)) return toast('Revisa el correo electrónico', 'err');
  e.target.reset();
  toast('Mensaje enviado. Te contactamos en menos de 24 h.', 'ok');
});

/* ============================== ARRANQUE =============================== */
document.addEventListener('DOMContentLoaded', () => {
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  renderDestinos();
  renderVideos();
  renderTestimonios();
  renderMetricas();
  verificarUsuario();
  observarRevelados();
  const hash = (location.hash || '').replace('#','');
  mostrarPantalla(PANTALLAS.includes(hash) ? hash : 'inicio', true);
});

/* El navegador aplica el salto al ancla después de 'load'; se reafirma el
   tope para que el banner no quede escondido tras la barra fija. */
window.addEventListener('load', () => {
  requestAnimationFrame(() => window.scrollTo({ top:0, behavior:'auto' }));
});
