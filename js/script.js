// =========================================
// 1. SISTEMA DE NAVEGACIÓN SPA
// =========================================
function mostrarPantalla(idPantalla) {
    const pantallas = document.querySelectorAll('.pantalla');
    pantallas.forEach(p => p.classList.remove('activa'));
    document.getElementById(idPantalla).classList.add('activa');
    
    const botones = document.querySelectorAll('.nav-links button');
    botones.forEach(btn => btn.classList.remove('active-btn'));
    const btnActivo = document.getElementById('btn-' + idPantalla);
    if(btnActivo) btnActivo.classList.add('active-btn');
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// =========================================
// 2. MENÚ HAMBURGUESA
// =========================================
function toggleMenu() {
    document.getElementById('overlayMenu').classList.toggle('active');
}

// =========================================
// 3. AUTENTICACIÓN CON ROLES
// =========================================
const STORAGE_KEY = 'siglv_user_v1';

function verificarUsuario() {
    const usuarioGuardado = localStorage.getItem(STORAGE_KEY);
    const formView = document.getElementById('auth-form-view');
    const profileView = document.getElementById('user-profile-view');
    
    if (usuarioGuardado) {
        const datos = JSON.parse(usuarioGuardado);
        document.getElementById('display-name').textContent = `Hola, ${datos.nombre}`;
        document.getElementById('display-email').textContent = datos.email;
        document.getElementById('display-rol').textContent = `Rol: ${datos.rol}`;
        formView.style.display = 'none';
        profileView.style.display = 'block';
    } else {
        formView.style.display = 'block';
        profileView.style.display = 'none';
    }
}

document.getElementById('user-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const nombre = document.getElementById('reg-name').value.trim();
    const email = document.getElementById('reg-email').value.trim();
    const pass = document.getElementById('reg-pass').value;
    const rol = document.getElementById('reg-rol').value;
    
    if(nombre && email && pass.length >= 6) {
        const nuevoUsuario = { nombre, email, rol, fecha: new Date().toLocaleDateString() };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(nuevoUsuario));
        verificarUsuario();
        document.getElementById('user-form').reset();
        alert(`¡Bienvenido/a ${nombre}! Rol: ${rol}`);
    } else {
        alert('Completa todos los campos (contraseña mín. 6 caracteres).');
    }
});

function cerrarSesion() {
    if(confirm('¿Borrar datos y salir?')) {
        localStorage.removeItem(STORAGE_KEY);
        verificarUsuario();
    }
}

// =========================================
// 4. MOTOR DE COTIZACIÓN (RF-02)
// =========================================
let cotizacionItems = [];
const PRESUPUESTO_MAX = 50000;

function agregarCotizacion(tipo, precio) {
    const item = {
        id: Date.now(),
        tipo: tipo,
        nombre: tipo.charAt(0).toUpperCase() + tipo.slice(1),
        cantidad: 1,
        precioUnitario: precio
    };
    cotizacionItems.push(item);
    renderizarCotizacion();
}

function renderizarCotizacion() {
    const tbody = document.getElementById('cotizacionBody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    let subtotal = 0;
    
    cotizacionItems.forEach(item => {
        const itemSubtotal = item.cantidad * item.precioUnitario;
        subtotal += itemSubtotal;
        
        tbody.innerHTML += `
            <tr>
                <td>${item.nombre}</td>
                <td>${item.cantidad}</td>
                <td>$${item.precioUnitario.toLocaleString()}</td>
                <td>$${itemSubtotal.toLocaleString()}</td>
                <td><button onclick="eliminarItem(${item.id})" class="btn-eliminar">×</button></td>
            </tr>
        `;
    });
    
    const iva = subtotal * 0.16;
    const total = subtotal + iva;
    
    document.getElementById('resumenSubtotal').textContent = `$${subtotal.toLocaleString()}`;
    document.getElementById('resumenIVA').textContent = `$${iva.toLocaleString()}`;
    document.getElementById('resumenTotal').textContent = `$${total.toLocaleString()}`;
    
    const disponible = PRESUPUESTO_MAX - total;
    document.getElementById('presupuestoDisponible').textContent = `$${disponible.toLocaleString()}`;
    
    const progress = Math.min((total / PRESUPUESTO_MAX) * 100, 100);
    document.getElementById('progressPresupuesto').style.width = `${progress}%`;
    
    // Alerta migratoria
    const alerta = document.getElementById('alertaMigratoria');
    if (alerta) {
        alerta.style.display = total > 0 ? 'flex' : 'none';
    }
}

function eliminarItem(id) {
    cotizacionItems = cotizacionItems.filter(item => item.id !== id);
    renderizarCotizacion();
}

function confirmarCotizacion() {
    if (cotizacionItems.length === 0) {
        alert('Agrega al menos un servicio a la cotización.');
        return;
    }
    alert('Cotización confirmada. Procede a validación migratoria.');
    mostrarPantalla('validacion');
}

// =========================================
// 5. VOTACIÓN ITINERARIO (RF-05)
// =========================================
function votar(actividadId, puntuacion) {
    alert(`Voto registrado: ${puntuacion} estrellas para actividad ${actividadId}`);
}

// =========================================
// 6. SWITCH DÍA/NOCHE
// =========================================
const toggleSwitch = document.querySelector('.theme-switch input[type="checkbox"]');
const currentTheme = localStorage.getItem('theme');

if (currentTheme === 'switch') {
    document.body.classList.add('switch');
    if (toggleSwitch) toggleSwitch.checked = true;
}

toggleSwitch?.addEventListener('change', (e) => {
    if (e.target.checked) {
        document.body.classList.add('switch');
        localStorage.setItem('theme', 'switch');
    } else {
        document.body.classList.remove('switch');
        localStorage.setItem('theme', '');
    }
});

// =========================================
// 7. SELECCIÓN DE DESTINO
// =========================================
function seleccionarDestino(destino) {
    alert(`Destino seleccionado: ${destino}. Las reglas de dominio se cargarán automáticamente.`);
    mostrarPantalla('catalogo');
}

// =========================================
// 8. INICIALIZACIÓN
// =========================================
document.addEventListener('DOMContentLoaded', () => {
    mostrarPantalla('inicio');
    verificarUsuario();
    renderizarCotizacion();
});