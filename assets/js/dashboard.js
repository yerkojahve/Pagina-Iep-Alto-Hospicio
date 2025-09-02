/* global Chart */
(() => {
  'use strict';

  // === Carga de datos (local ./data + fallback a dominio) ===
  const BUST = String(Date.now());
  const DATA_BASE_REL = new URL('./data/', window.location.href).href;
  const HOST_BASE     = "https://iepaltohospicio.site/data/";

  function urlFor(file){
    return [
      DATA_BASE_REL + file + "?" + BUST,
      HOST_BASE     + file + "?" + BUST,
    ];
  }
  async function safeFetchMulti(urls){
    for(const u of urls){
      try{
        const r = await fetch(u, {cache:"no-store"});
        if(r.ok) return await r.json();
      }catch(_){}
    }
    return null;
  }

  // Utilidades UI
  const setText = (id, v)=> (document.getElementById(id).textContent = (v ?? "—"));
  const td = (t, cls)=>{
    const el=document.createElement("td");
    el.textContent=t??"";
    if(cls) el.className=cls;
    return el;
  };
  const showEmpty = (tbody, cols, msg="(sin datos)")=>{
    const tr = document.createElement("tr");
    const c  = document.createElement("td");
    c.colSpan = cols; c.textContent = msg; c.className = "text-secondary";
    tr.appendChild(c); tbody.appendChild(tr);
  };

  // === Visitantes: buscador + paginación ===
  const PAGE_SIZE = 10;
  let personasAll = [];
  let visQuery = "";
  let visPage  = 1;

  function filtrarPersonas(arr, q){
    if(!q) return arr;
    const qq = q.toLowerCase().trim();
    return arr.filter(p => [
      p?.nombre, p?.iglesia, p?.familia_alojadora, p?.cargo
    ].map(x => (x ?? "").toString().toLowerCase()).some(s => s.includes(qq)));
  }

  function renderVisitantes(){
    const tbody = document.getElementById("tbody_personas");
    const pagerWrap = document.getElementById("vis-pager-wrap");
    const pager = document.getElementById("vis-pager");
    const count = document.getElementById("vis-count");

    tbody.innerHTML = "";
    pager.innerHTML = "";

    const filtered = filtrarPersonas(personasAll, visQuery);
    const total = filtered.length;
    if(total === 0){
      showEmpty(tbody, 4, "No hay registros");
      pagerWrap.style.display = "none";
      count.textContent = "";
      return;
    }

    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    if(visPage > totalPages) visPage = totalPages;

    const startIdx = (visPage - 1) * PAGE_SIZE;
    const pageItems = filtered.slice(startIdx, startIdx + PAGE_SIZE);

    pageItems.forEach(p=>{
      const tr = document.createElement("tr");
      tr.appendChild(td(p.nombre));
      tr.appendChild(td(p.iglesia));
      tr.appendChild(td(p.familia_alojadora));
      tr.appendChild(td(p.cargo));
      tbody.appendChild(tr);
    });

    const from = startIdx + 1;
    const to   = Math.min(startIdx + PAGE_SIZE, total);
    count.textContent = `Mostrando ${from}–${to} de ${total}`;

    function addPage(label, page, disabled=false, active=false){
      const li = document.createElement("li");
      li.className = `page-item${disabled ? " disabled":""}${active ? " active":""}`;
      const a = document.createElement("a");
      a.className = "page-link";
      a.href = "#";
      a.textContent = label;
      a.onclick = (e)=>{ e.preventDefault(); if(disabled || active) return; visPage = page; renderVisitantes(); };
      li.appendChild(a);
      pager.appendChild(li);
    }

    addPage("«", Math.max(1, visPage-1), visPage===1, false);

    const windowSize = 5;
    let start = Math.max(1, visPage - Math.floor(windowSize/2));
    let end   = Math.min(totalPages, start + windowSize - 1);
    if(end - start + 1 < windowSize) start = Math.max(1, end - windowSize + 1);

    for(let i=start; i<=end; i++){
      addPage(String(i), i, false, i===visPage);
    }

    addPage("»", Math.min(totalPages, visPage+1), visPage===totalPages, false);

    pagerWrap.style.display = (total > PAGE_SIZE) ? "flex" : "none";
  }

  // Conectar buscadores (sección y header)
  const inputVis = document.getElementById("vis-buscar");
  inputVis?.addEventListener("input", ()=>{
    visQuery = inputVis.value;
    visPage = 1;
    renderVisitantes();
  });
  const buscadorHdr = document.getElementById("buscador");
  buscadorHdr?.addEventListener("input", ()=>{
    inputVis.value = buscadorHdr.value;
    visQuery = buscadorHdr.value;
    visPage = 1;
    renderVisitantes();
  });

  // ===== Helpers para gráficos =====
  function makeChart(ctxId, type, data, options={}){
    const el = document.getElementById(ctxId);
    if(!el) return null;
    return new Chart(el.getContext('2d'), { type, data, options });
  }
  function topNFromMapCount(arr, key, N=10){
    const map = new Map();
    for(const it of arr){
      const val = (it?.[key] ?? '').toString().trim() || '(Sin dato)';
      map.set(val, (map.get(val) ?? 0) + 1);
    }
    const pairs = [...map.entries()].sort((a,b)=>b[1]-a[1]).slice(0,N);
    return { labels: pairs.map(p=>p[0]), data: pairs.map(p=>p[1]) };
  }

  // ===== Init =====
  (async ()=>{
    const [dash, personas, full] = await Promise.all([
      safeFetchMulti(urlFor("dashboard.json")),
      safeFetchMulti(urlFor("personas.json")),
      safeFetchMulti(urlFor("full_dump.json")),
    ]);

    // ==== KPIs (dashboard) ====
    if(dash?.totales){
      setText("kpi_asistentes", dash.totales.asistentes);
      setText("kpi_familias",   dash.totales.familias);
      setText("kpi_capacidad",  dash.totales.capacidad_total ?? 0);
      setText("kpi_cupos",      dash.totales.cupos_libres_total ?? 0);
      setText("kpi_ocupacion",  dash.totales.ocupacion_total ?? 0);
      setText("kpi_iglesias",   dash.totales.iglesias);
      const orgs = (full?.organizadores?.length ?? dash?.totales?.organizadores ?? 0);
      setText("kpi_organizadores", orgs);
      setText("kpi_confirmados", dash.totales.ocupacion_total ?? 0);
    }
    if(dash?.updated_at){ setText("updated_at", `Actualizado: ${dash.updated_at}`); }

    // ==== Visitantes ====
    personasAll = personas ?? [];
    renderVisitantes();

    // ==== Hospedajes (dashboard.familias) ====
    const familiasContainer = document.getElementById("familias-container");
    const familias = (dash?.familias ?? []);
    if (familias.length === 0) {
    familiasContainer.innerHTML = '<div class="text-secondary">No hay familias aún.</div>';
    } else {
    familias.forEach(f => {
        const cap = Number(f.capacidad ?? 0);
        const occ = Number(f.ocupados ?? 0);
        const pct = cap > 0 ? Math.min(100, Math.round((occ / cap) * 100)) : 0;
        let color = "bg-success";
        if (pct >= 100) color = "bg-danger"; 
        else if (pct >= 70) color = "bg-warning";
        const disp = (f.disponibles ?? (cap > 0 ? Math.max(cap - occ, 0) : "—"));

        const col = document.createElement("div");
        col.className = "col-md-4";
        col.innerHTML = `
        <div class="card p-3 shadow-sm h-100">
            <h5 class="mb-2">${f.familia}</h5>
            
            <!-- Capacidad / Ocupados / Disponibles -->
            <div class="d-flex flex-wrap gap-2 mb-2">
            <span class="badge bg-primary">Capacidad: ${cap}</span>
            <span class="badge bg-danger">Ocupados: ${occ}</span>
            <span class="badge bg-success">Disponibles: ${disp}</span>
            </div>

            <!-- Barra de progreso -->
            <div class="progress mb-2">
            <div class="progress-bar ${color}" style="width:${pct}%"></div>
            </div>

            <small class="text-muted">${pct}% ocupado — Estado: ${f.estado}</small>
        </div>`;
        familiasContainer.appendChild(col);
    });
    }

    // ==== Iglesias ====
    const tbodyIglesias = document.getElementById("tbody_iglesias");
    const ig = (full?.iglesias ?? []);
    if(ig.length===0) showEmpty(tbodyIglesias, 4);
    else ig.forEach(i=>{
      const tr = document.createElement("tr");
      tr.appendChild(td(i.nombre));
      tr.appendChild(td(i.contacto));
      tr.appendChild(td(i.telefono));
      tr.appendChild(td(i.direccion));
      tbodyIglesias.appendChild(tr);
    });

    // ==== Organizadores ====
    const tbodyOrganizadores = document.getElementById("tbody_organizadores");
    const org = (full?.organizadores ?? []);
    if(org.length===0) showEmpty(tbodyOrganizadores, 5);
    else org.forEach(o=>{
      const tr = document.createElement("tr");
      tr.appendChild(td(o.nombre));
      tr.appendChild(td(o.rol));
      tr.appendChild(td(o.iglesia));
      tr.appendChild(td(o.contacto));
      tr.appendChild(td(o.turno));
      tbodyOrganizadores.appendChild(tr);
    });

    // ===== GRÁFICOS (Chart.js) =====
    // 1) Ocupación total (doughnut)
    const capacidadTotal = Number(dash?.totales?.capacidad_total ?? 0);
    const ocupadosTotal  = Number(dash?.totales?.ocupacion_total ?? 0);
    const libresTotal    = Math.max(capacidadTotal - ocupadosTotal, 0);

    makeChart("chart_ocupacion", "doughnut", {
    labels: ["Ocupados", "Libres"],
    datasets: [{
        data: [ocupadosTotal, libresTotal],
        // Colores sugeridos para alinear con tus badges (primary y danger):
        backgroundColor: ["#0d6efd", "#dc3545"],
        borderWidth: 0
    }]
    }, {
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
        legend: { display: false }, // 👈 oculta la leyenda del gráfico
        tooltip: {
        callbacks: {
            label: (ctx) => {
            const x = ctx.raw ?? 0;
            const pct = capacidadTotal > 0 ? Math.round((x / capacidadTotal) * 100) : 0;
            return `${ctx.label}: ${x} (${pct}%)`;
            }
        }
        }
    },
    cutout: "65%" // opcional, para rosquilla más limpia
    });

    // 2) Capacidad por familia (Top 10, apilado)
    const famRows = familias
      .map(f=>{
        const cap = Number(f.capacidad ?? 0);
        const occ = Number(f.ocupados ?? 0);
        const disp = Math.max(cap - occ, 0);
        return { nombre: f.familia, cap, occ, disp };
      })
      .sort((a,b)=> b.cap - a.cap)
      .slice(0,10);

    makeChart("chart_familias_cap", "bar", {
      labels: famRows.map(x=>x.nombre),
      datasets: [
        { label: "Ocupados",    data: famRows.map(x=>x.occ), stack: "stack0" },
        { label: "Disponibles", data: famRows.map(x=>x.disp), stack: "stack0" }
      ]
    }, {
      responsive: true,
      scales: {
        x: { stacked: true },
        y: { stacked: true, beginAtZero: true, ticks: { precision:0 } }
      },
      plugins: { legend: { position: "bottom" } }
    });

    // 3) Asistentes por iglesia (Top 12)
    const topIglesias = topNFromMapCount(personasAll, "iglesia", 12);
    makeChart("chart_iglesias", "bar", {
      labels: topIglesias.labels,
      datasets: [{ label: "Personas", data: topIglesias.data }]
    }, {
      responsive: true,
      scales: { y: { beginAtZero: true, ticks: { precision:0 } } },
      plugins: { legend: { display:false } }
    });

    // 4) Distribución por cargo
    const cargos = topNFromMapCount(personasAll, "cargo", 8);
    makeChart("chart_cargos", "pie", {
      labels: cargos.labels,
      datasets: [{ data: cargos.data }]
    }, {
      responsive: true,
      plugins: { legend: { position: "bottom" } }
    });
  })();

  // === Cuenta regresiva ===
  const eventDate = new Date("Oct 31, 2025 09:00:00").getTime();
  const timer = setInterval(()=>{
    const now = Date.now();
    const distance = eventDate - now;
    const d = Math.floor(distance / 86400000);
    const h = Math.floor((distance % 86400000) / 3600000);
    const m = Math.floor((distance % 3600000) / 60000);
    const s = Math.floor((distance % 60000) / 1000);
    const el = document.getElementById("countdown");
    if(!el) return;
    if(distance < 0){ clearInterval(timer); el.textContent = "¡El evento ha comenzado!"; }
    else el.textContent = `${d}d ${h}h ${m}m ${s}s`;
  }, 1000);
})();
