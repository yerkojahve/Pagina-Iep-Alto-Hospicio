// galerias.js — visor modal + navegación teclado + año footer
(function () {
  // Año footer
  const yearEl = document.getElementById('year-gal');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // Modal (Bootstrap)
  const viewerModalEl = document.getElementById('viewerModal');
  if (!viewerModalEl) return;

  const viewerImg = document.getElementById('viewerImage');
  const modal = new bootstrap.Modal(viewerModalEl, { backdrop: true, keyboard: true });

  // Click en miniaturas -> abrir modal con imagen grande
  document.addEventListener('click', function (e) {
    const item = e.target.closest('.gallery-item');
    if (!item) return;

    e.preventDefault();
    const full = item.getAttribute('data-full') || item.querySelector('img')?.src || '';
    if (full) {
      viewerImg.src = full;
      modal.show();
    }
  });

  // Navegación con teclado (← →) entre todas las imágenes
  document.addEventListener('keydown', function (e) {
    if (!viewerModalEl.classList.contains('show')) return;

    const grids = Array.from(document.querySelectorAll('.gallery-grid'));
    const allItems = grids.flatMap(grid => Array.from(grid.querySelectorAll('.gallery-item')));
    const current = allItems.findIndex(a => (a.getAttribute('data-full') || a.querySelector('img')?.src) === viewerImg.src);

    if (allItems.length === 0) return;

    if (e.key === 'ArrowRight') {
      const next = (current + 1 + allItems.length) % allItems.length;
      const full = allItems[next].getAttribute('data-full') || allItems[next].querySelector('img')?.src || '';
      if (full) viewerImg.src = full;
    }
    if (e.key === 'ArrowLeft') {
      const prev = (current - 1 + allItems.length) % allItems.length;
      const full = allItems[prev].getAttribute('data-full') || allItems[prev].querySelector('img')?.src || '';
      if (full) viewerImg.src = full;
    }
  });
})();
