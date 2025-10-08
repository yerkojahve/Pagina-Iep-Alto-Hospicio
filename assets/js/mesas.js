/* assets/js/mesas.js */
(() => {
  "use strict";

  // =========================
  // Fetch helpers (nube -> local)
  // =========================
  const BUST = String(Date.now());
  const DATA_BASE_REL = new URL("./data/", window.location.href).href;
  const HOST_BASE = "https://iepaltohospicio.site/data/";
  const urlFor = (f) => [HOST_BASE + f + "?" + BUST, DATA_BASE_REL + f + "?" + BUST];

  async function safeFetchMulti(urls) {
    for (const u of urls) {
      try {
        const r = await fetch(u, { cache: "no-store" });
        if (r.ok) return await r.json();
      } catch (_) {}
    }
    return null;
  }

  // =========================
  // UI utils
  // =========================
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const setText = (id, v) => {
    const el = document.getElementById(id);
    if (el) el.textContent = v ?? "—";
  };

  function statusBadgeClass(status) {
    switch ((status || "").toLowerCase()) {
      case "available":
        return "table-available";
      case "occupied":
        return "table-occupied";
      case "reserved":
        return "table-reserved";
      case "out-of-service":
        return "table-out-of-service";
      default:
        return "table-available";
    }
  }

  function estadoCalculado(cap, occ) {
    if (!cap || cap === 0) return "Ilimitada";
    return cap - occ > 0 ? "Disponible" : "Completa";
  }

  // =========================
  // Helpers de integrantes/sillas (NUEVO)
  // =========================
  function getInitials(nombre = "") {
    const parts = nombre.trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return "—";
    const first = parts[0]?.[0] ?? "";
    const second = (parts[1]?.[0] ?? "");
    return (first + second).toUpperCase();
  }

  function pillIntegrante(persona) {
    const nombre = persona?.nombre ?? "—";
    const cargo = (persona?.cargo ?? "").toString().trim();
    const iglesia = (persona?.iglesia ?? "").toString().trim();
    const sub = [cargo || null, iglesia || null].filter(Boolean).join(" · ");
    return `
      <span class="badge text-bg-light border me-1 mb-1" title="${sub}">
        <i class="fa-solid fa-user me-1"></i>${nombre}
        ${sub ? `<small class="text-muted ms-1">(${sub})</small>` : ""}
      </span>
    `;
  }

  // Silla con nombre debajo (NUEVO)
  function sillaConNombre(persona, idx) {
    const ocupado = !!persona && !!(persona.nombre || "").trim();
    const nombre = ocupado ? persona.nombre.trim() : "Libre";
    const ini = ocupado ? getInitials(nombre) : "—";
    const chairClass = ocupado ? "chair-detail otros" : "chair-detail empty";
    const title = ocupado ? nombre : "Silla libre";

    return `
      <div class="text-center" style="width:72px">
        <div class="${chairClass}" title="${title}">
          ${ini}
          <div class="chair-number">${idx + 1}</div>
        </div>
        <div class="seat-name" title="${nombre}">${nombre}</div>
      </div>
    `;
  }

  // Renderiza un grid de sillas con nombres (NUEVO)
  function gridSillas(m) {
    const cap = Number(m.capacidad ?? 0);
    const miembros = Array.isArray(m.miembros) ? m.miembros : [];
    const c = Math.max(cap, miembros.length); // por si hay más nombres que capacidad

    if (!c) {
      return `
        <div class="text-muted small">— Sin sillas definidas —</div>
      `;
    }

    const items = [];
    for (let i = 0; i < c; i++) {
      const persona = miembros[i] || null;
      items.push(sillaConNombre(persona, i));
    }

    // grid responsive simple sin depender de CSS extra
    return `
      <div class="d-grid" style="grid-template-columns: repeat(auto-fill, minmax(72px, 1fr)); gap: 10px;">
        ${items.join("")}
      </div>
    `;
  }

  // =========================
  // KPIs
  // =========================
  function renderKPIs(totales) {
    setText("kpi_mesas_total", totales.mesas);
    setText("kpi_mesas_cap", totales.capacidad_total_mesas ?? 0);
    setText("kpi_mesas_occ", totales.ocupacion_total_mesas ?? 0);
    setText("kpi_mesas_free", totales.cupos_libres_total_mesas ?? 0);
  }

  // =========================
  // Tarjeta de mesa (EXTENDIDA)
  // =========================
  function cardMesa(m) {
    const cap = Number(m.capacidad ?? 0);
    const occ = Number(m.ocupados ?? 0);
    const libres = cap === 0 ? "∞" : Math.max(cap - occ, 0);
    const estCalc = m.estado || estadoCalculado(cap, occ);
    const semaforo = statusBadgeClass(m.status);
    const shape = (m.shape || "square").toLowerCase();
    const shapeClass =
      shape === "round" ? "round" : shape === "rectangle" ? "rectangle" : "";

    const miembros = Array.isArray(m.miembros) ? m.miembros : [];

    return `
      <div class="card shadow-sm h-100">
        <div class="card-body">
          <div class="d-flex justify-content-between align-items-start">
            <div>
              <h5 class="card-title mb-1">${m.mesa}</h5>
              <div class="small text-muted">ID: ${m.id}</div>
            </div>
            <div class="ms-2">
              <div class="table-shape ${semaforo} ${shapeClass}" style="width:56px;height:56px;border-radius:8px;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700">
                ${cap === 0 ? "∞" : cap}
              </div>
            </div>
          </div>

          <div class="row text-center mt-3">
            <div class="col">
              <div class="fw-bold">${cap === 0 ? "∞" : cap}</div>
              <div class="ahj-small-muted">Capacidad</div>
            </div>
            <div class="col">
              <div class="fw-bold">${occ}</div>
              <div class="ahj-small-muted">Ocupados</div>
            </div>
            <div class="col">
              <div class="fw-bold">${libres}</div>
              <div class="ahj-small-muted">Disponibles</div>
            </div>
          </div>

          <div class="mt-3 d-flex flex-wrap gap-1">
            <span class="badge ${estCalc === "Disponible" ? "text-bg-success" : estCalc === "Completa" ? "text-bg-danger" : "text-bg-secondary"}">
              ${estCalc}
            </span>
            ${m.responsable ? `<span class="badge text-bg-primary"><i class="fa-solid fa-user-tie me-1"></i>${m.responsable}</span>` : ""}
            ${m.area ? `<span class="badge text-bg-secondary"><i class="fa-solid fa-location-dot me-1"></i>${m.area}</span>` : ""}
            ${m.piso ? `<span class="badge text-bg-secondary"><i class="fa-solid fa-stairs me-1"></i>Piso ${m.piso}</span>` : ""}
          </div>

          <hr class="my-3" />

          <div class="mb-3">
            <div class="d-flex justify-content-between align-items-center mb-2">
              <h6 class="mb-0">Integrantes</h6>
              <small class="text-muted">${miembros.length} persona(s)</small>
            </div>
            <div class="d-flex flex-wrap">
              ${
                miembros.length
                  ? miembros.map(pillIntegrante).join("")
                  : `<span class="text-muted">— Sin integrantes aún —</span>`
              }
            </div>
          </div>

          <!-- SILLAS CON NOMBRE (NUEVO) -->
          <div>
            <div class="d-flex justify-content-between align-items-center mb-2">
              <h6 class="mb-0">Sillas</h6>
              <small class="text-muted">${cap || miembros.length || 0} total</small>
            </div>
            ${gridSillas(m)}
          </div>
        </div>
      </div>
    `;
  }

  // =========================
  // Secciones por piso/área
  // =========================
  function sectionPisoArea(titulo, count, tarjetasHTML) {
    return `
      <section class="bg-white rounded-3 p-3 p-md-4 border mb-3">
        <div class="d-flex align-items-center justify-content-between mb-2">
          <h5 class="mb-0">${titulo}</h5>
          <small class="text-muted">${count} mesa(s)</small>
        </div>
        <div class="row g-3">${tarjetasHTML}</div>
      </section>
    `;
  }

  function renderFloors(mesas) {
    const wrap = document.getElementById("floors-wrap");
    if (!wrap) return;
    wrap.innerHTML = "";

    // Agrupar por clave piso|area
    const grp = new Map();
    for (const m of mesas) {
      const piso = m.piso ?? 1;
      const area = (m.area || "Salón").trim();
      const key = `${piso}|||${area}`;
      if (!grp.has(key)) grp.set(key, []);
      grp.get(key).push(m);
    }

    // Orden por piso asc, area alfa
    const keys = [...grp.keys()].sort((a, b) => {
      const [pa, aa] = a.split("|||");
      const [pb, ab] = b.split("|||");
      return Number(pa) - Number(pb) || aa.localeCompare(ab);
    });

    for (const key of keys) {
      const [piso, area] = key.split("|||");
      const items = grp.get(key) || [];
      const tarjetas = items
        .sort((a, b) => (a.mesa || "").localeCompare(b.mesa || ""))
        .map((m) => `<div class="col-12 col-md-6 col-lg-4">${cardMesa(m)}</div>`)
        .join("");
      wrap.insertAdjacentHTML(
        "beforeend",
        sectionPisoArea(`Piso ${piso} — ${area}`, items.length, tarjetas)
      );
    }
  }

  // =========================
  // Botones de piso
  // =========================
  function wireFloorButtons(mesas) {
    const btns = $$(".floor-btn");
    const renderByFloor = (floor) => {
      btns.forEach((b) => b.classList.toggle("active", b.dataset.floor == floor));
      const filtered = (mesas || []).filter(
        (m) => String(m.piso ?? 1) === String(floor)
      );
      renderFloors(filtered.length ? filtered : mesas); // si no hay, muestro todo
    };
    btns.forEach((b) => b.addEventListener("click", () => renderByFloor(b.dataset.floor)));
    renderByFloor(1);
  }

  // =========================
  // Init
  // =========================
  (async () => {
    const dash = await safeFetchMulti(urlFor("dashboard.json"));
    const tot = dash?.totales ?? {};
    const mesas = dash?.mesas ?? [];

    renderKPIs(tot);
    wireFloorButtons(mesas);
  })();
})();
