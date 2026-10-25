# SIGLV · Sistema Integral de Gestión y Logística de Viajes

Sitio web del sistema de viajes, construido con **HTML + CSS + JavaScript puro**
y preparado para escalar a **PHP + MySQL** sin rehacer la interfaz.

Toma como base los dos proyectos entregados y respeta el sistema definido en
`Sistema de viajes.tex`:

| Fuente | Qué se conservó |
|---|---|
| `Proyecto 2` (SPA Zahara) | El menú/banner: menú hamburguesa desplegable con login y switch día/noche, navbar sticky, banner animado 3D, galería clásica, galería mosaico dorada, reproductor de video personalizado, slider de testimonios y todo el responsive. |
| `index(1).html` (Travel Concierge) | El motor funcional: catálogos internos, wizard de propuesta, cálculo de presupuesto, checklist documental y exportación a PDF. |
| `Sistema de viajes.tex` | Los 4 procesos del DFD, los 5 almacenes (VU, HT, AC, RE, PR), el diccionario de datos y el catálogo de elementos dato: nombres de campo, tipos, longitudes y reglas de validación. |

---

## 1. Cómo ejecutarlo

### Modo demo (sin servidor)
Abre `index.html` en el navegador. Funciona todo: el catálogo, el armado de la
propuesta, los cálculos y el PDF. Los datos viven en `js/datos.js`.

> Para que el video y las imágenes carguen sin restricciones de `file://`,
> conviene servir la carpeta:
> ```bash
> php -S localhost:8000      # o
> python3 -m http.server 8000
> ```

### Modo PHP + MySQL
```bash
mysql -u root -p < sql/siglv_schema.sql
mysql -u root -p siglv < sql/siglv_seed.sql
```
1. Edita las credenciales en `api/config.php`.
2. En `js/api.js` cambia **una línea**:
   ```js
   API.modo = 'php';   // antes: 'mock'
   ```
3. Publica la carpeta en Apache/Nginx con PHP 8.

No hay que tocar nada más: cada función de `js/api.js` ya tiene su endpoint
equivalente y ambos devuelven el mismo JSON.

---

## 2. Estructura

```
SIGLV/
├── index.html              Una sola página con 6 pantallas (SPA por secciones)
├── css/
│   ├── estilos.css         Shell: menú, banner, galerías, video, responsive, tema
│   └── propuesta.css       Catálogo, wizard, cotizaciones y hoja de impresión/PDF
├── js/
│   ├── datos.js            Espejo de la base de datos (una colección por tabla)
│   ├── api.js              Capa de acceso a datos: toda la lógica del DFD
│   ├── ui.js               Navegación, menú, tema, video, slider, catálogo
│   └── propuesta.js        Wizard 1.0 → 4.0, itinerario, presupuesto y PDF
├── api/                    Endpoints PHP con PDO y consultas preparadas
│   ├── config.php          Conexión, folios, parámetros y respuestas JSON
│   ├── catalogo.php        Lectura de VU / HT / AC / PR / RE
│   ├── solicitud.php       1.1 Capturar solicitud
│   ├── vuelos.php          1.2 Buscar vuelos
│   ├── hoteles.php         2.1 Cercanía · 2.2 Seguridad
│   ├── actividades.php     3.1 Cercanas · 3.2 Cupos y horarios
│   ├── reservas.php        1.4 / 2.4 / 3.4 Registrar reserva (almacén RE)
│   ├── itinerario.php      3.4 Consolidar itinerario
│   ├── presupuesto.php     4.1 → 4.4 Emitir presupuesto
│   ├── clientes.php        Alta y consulta de clientes
│   ├── contacto.php        Formulario del sitio
│   └── login.php           Sesión del agente
├── sql/
│   ├── siglv_schema.sql    Tablas, vistas, disparador y restricciones
│   └── siglv_seed.sql      Carga inicial idéntica a js/datos.js
└── img/                    Imágenes y video heredados del Proyecto 2
```

---

## 3. Requisitos cubiertos

| Pedido | Dónde está |
|---|---|
| Apartado **"Nueva propuesta"** | Pantalla `#propuesta`, en el navbar y en el menú desplegable. |
| Botón **"Explorar catálogo" → Nueva propuesta** | `index.html` → `#btn-explorar-catalogo` y el botón del pie del catálogo. Todo elemento con `data-goto="propuesta"` navega ahí (`ui.js` → delegación de clics). |
| Menú / banner conservado | Menú hamburguesa `.overlay-menu` + navbar `.navbar` + banner `.hero-animated` con animación 3D. |
| Animaciones | Banner 3D rotatorio, aparición al hacer scroll (`IntersectionObserver`), hover de galerías, barras del presupuesto, transición de pasos, hamburguesa que se convierte en X. |
| Menú desplegable | `.overlay-menu` con login, switch día/noche y accesos a los módulos. |
| Banner | Sección hero con contadores de los almacenes en vivo. |
| Los videos | Reproductor propio (play/pausa, barra de progreso, retroceso de 10 s, silencio, pantalla completa, tiempo) y lista de videos alimentada por datos. |
| Adaptabilidad móvil | Breakpoints en 1100 / 900 / 768 / 480 px; las tablas se vuelven tarjetas en móvil; menú a pantalla completa; mosaico reordenado. |
| Exportar a PDF | Botón "Exportar a PDF" → vista previa del documento → *Imprimir / Guardar PDF*. Hoja tamaño carta con folio, desglose, itinerario, checklist, condiciones y firmas (`@media print` en `propuesta.css`). |
| Escalable a PHP/MySQL | `API.modo`, `api/*.php` con PDO y `sql/*.sql`. |

---

## 4. El sistema del DFD en el código

### Nivel 1 · procesos y almacenes

| Proceso | Función del front | Endpoint |
|---|---|---|
| 1.0 Gestionar vuelo | `vistaVuelo()` | `solicitud.php`, `vuelos.php`, `reservas.php` |
| 2.0 Gestionar hotel | `vistaHotel()` | `hoteles.php`, `reservas.php` |
| 3.0 Gestionar actividades | `vistaActividades()` | `actividades.php`, `itinerario.php` |
| 4.0 Emitir presupuesto | `vistaPresupuesto()` | `presupuesto.php` |

| Almacén | Tabla | Quién lo usa |
|---|---|---|
| VU · Vuelos | `vuelo` | lee 1.2 |
| HT · Hoteles | `hotel` | lee 2.2 |
| AC · Actividades | `actividad` | leen 3.1 y 3.2 |
| RE · Reservas | `reserva` | escriben 1.4 / 2.4 / 3.4 · lee 4.1 |
| PR · Precios bloqueados | `precio_bloqueado` | lee 4.2 |

### Nivel 2 · subprocesos

```
1.1 Capturar solicitud   → API.capturarSolicitud()      valida fechas, pax 1–99 y longitudes
1.2 Buscar vuelos        → API.buscarVuelos()           materializa Fecha_Hora_Salida/Llegada
1.3 Seleccionar vuelo    → elegirVuelo()                guarda Criterio_Seleccion
1.4 Registrar reserva    → API.registrarReserva()       escribe en RE

2.1 Filtrar por cercanía → API.filtrarPorCercania()     radio en km desde el destino del vuelo
2.2 Filtrar por seguridad→ API.filtrarPorSeguridad()    Nivel_Seguridad y habitaciones libres
2.3 Seleccionar hotel    → elegirHotel()                Costo_Estancia = tarifa × noches × cuartos
2.4 Reservar habitación  → API.registrarReserva()       escribe en RE

3.1 Buscar actividades   → API.buscarActividadesCercanas()  radio desde el hotel
3.2 Verificar cupos      → API.verificarCuposHorarios()     Compatible_Horario + Cupos_Libres
3.3 Seleccionar tours    → alternarTour()                   N_Personas por tour
3.4 Consolidar itinerario→ API.consolidarItinerario()       folio ITI- y reservas de tours

4.1 Consolidar reservas  → API.consolidarReservas()     agrupa RE por itinerario
4.2 Calcular costo total → API.calcularCostoTotal()     tarifa de PR o precio de catálogo
4.3 Aplicar impuestos    → API.aplicarImpuestos()       IVA 16% + tasas por pasajero
4.4 Emitir presupuesto   → API.emitirPresupuesto()      folio COT- y vigencia de 15 días
```

### Detalle de modelado: vuelos recurrentes

El diccionario define `Vuelo_seleccionado` con `Fecha_Hora_Salida` y
`Fecha_Hora_Llegada`. Para que la búsqueda funcione con cualquier fecha, el
almacén VU guarda el **itinerario base** (`Hora_Salida`, `Duracion_Minutos`,
`Dias_Operacion`) y el subproceso 1.2 construye las marcas de tiempo
concretas para la fecha solicitada:

```sql
TIMESTAMP(:fecha, Hora_Salida)                                  AS Fecha_Hora_Salida,
TIMESTAMP(:fecha, Hora_Salida) + INTERVAL Duracion_Minutos MINUTE AS Fecha_Hora_Llegada
```

`Precio_Base` es la tarifa **redonda por pasajero**, de modo que el flujo
conserva un solo vuelo seleccionado como indica el diagrama.

---

## 5. Parámetros del cálculo

En `js/datos.js` → `CONFIG` y en la tabla `parametro`:

| Clave | Valor | Uso |
|---|---|---|
| `porcentaje_iva` | 16 | `Monto_IVA = Subtotal × 16%` (4.3) |
| `tasa_aeroportuaria` | 1250 | `Tasas_Aeroportuarias = 1250 × N_Pasajeros` |
| `validez_oferta_dias` | 15 | `Validez_Oferta` del presupuesto |
| `moneda` | MXN | Formato con `Intl.NumberFormat` |

---

## 6. Siguientes pasos sugeridos

- Reemplazar el login de `localStorage` por `api/login.php` y proteger los
  endpoints de escritura con la sesión y un token CSRF.
- Sustituir `Distancia_Destino` / `Distancia_Hotel` por coordenadas
  (`POINT` + `ST_Distance_Sphere`) para que los filtros 2.1 y 3.1 calculen la
  distancia real.
- Generar el PDF también en el servidor (por ejemplo con Dompdf) para enviarlo
  por correo desde `api/presupuesto.php`.
- Agregar la tabla `pago` y los estados `Aceptado` / `Rechazado` de la
  cotización para cerrar el ciclo de venta.
