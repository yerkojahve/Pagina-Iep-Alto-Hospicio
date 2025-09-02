// assets/js/main.js

document.addEventListener('DOMContentLoaded', () => {
  /* ========== Año en footer ========== */
  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ========== Scroll suave en nav (solo anchors internos) ========== */
  document.querySelectorAll('a.nav-link[href^="#"]').forEach(a => {
    a.addEventListener('click', (e) => {
      const id = a.getAttribute('href');
      const target = id && id.startsWith('#') ? document.querySelector(id) : null;
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });

  /* ========== Leaflet (si existe el contenedor y la lib está cargada) ========== */
  const mapEl = document.getElementById('map');
  if (mapEl && window.L) initMap(mapEl);

  /* ========== Módulo Programa (aislado a #programa) ========== */
  initPrograma();
});

/* -------- Mapa -------- */
function initMap(el) {
  const lat = -20.268064543090464;
  const lng = -70.09718909493581;

  const map = L.map(el, {
    scrollWheelZoom: false,
    zoomControl: true,
  }).setView([lat, lng], 16);

  L.tileLayer(
    'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    {
      subdomains: 'abcd',
      maxZoom: 19,
      detectRetina: true,
      crossOrigin: true,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
    }
  ).addTo(map);

  // Ajuste de tamaño post-render para evitar "corte"
  requestAnimationFrame(() => map.invalidateSize());

  // Color dorado desde :root con fallback
  const gold = (getComputedStyle(document.documentElement)
    .getPropertyValue('--brand-gold') || '#d6a01d').trim();

  const marker = L.circleMarker([lat, lng], {
    radius: 10,
    color: '#fff',
    weight: 3,
    fillColor: gold,
    fillOpacity: 1
  }).addTo(map);

  marker.bindPopup(
    '<strong>IEP Alto Hospicio</strong><br>Concentración de Jóvenes<br><small>Click para centrar</small>'
  );

  marker.on('click', () => map.setView([lat, lng], 17, { animate: true }));

  // Tema oscuro opcional:
  // L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', { subdomains:'abcd', maxZoom:19 }).addTo(map);
}

/* -------- Programa (namespaced en #programa) -------- */
function initPrograma() {
  const root = document.getElementById('programa');
  if (!root) return;

  const buttons   = root.querySelectorAll('.prog-day');
  const timelines = root.querySelectorAll('.prog-timeline');
  const titleEl   = root.querySelector('.prog-title');

  if (!buttons.length || !timelines.length || !titleEl) return;

  // Mapeo de títulos (ajusta a tus fechas reales si cambian)
  const titles = {
    '30': 'Eventos del 31 de Octubre',
    '31': 'Eventos del 1 de Noviembre',
    '1' : 'Eventos del 2 de Noviembre'
  };

  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      if (btn.classList.contains('active')) return;

      // Botones
      buttons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      // Timelines
      timelines.forEach(t => t.classList.remove('active'));
      const day = btn.dataset.day;
      const tl = root.querySelector(`#prog-${CSS.escape(day)}`);
      if (tl) {
        // leve retardo para transición
        setTimeout(() => tl.classList.add('active'), 120);
      }

      // Título con fade
      if (titles[day]) {
        titleEl.style.opacity = 0;
        setTimeout(() => {
          titleEl.textContent = titles[day];
          titleEl.style.opacity = 1;
        }, 180);
      }
    });
  });
}
