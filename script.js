const telefono = "50662104761";
let perfumes = [];
let visibles = 24;
let visiblesInmediatos = 24;
let cargando = false; 

let tipoActual = "Todos"; 
let categoriaActual = "Todos"; 
let marcaActual = "";

const catalogo = document.getElementById("catalogo");
const search = document.getElementById("search");
const contenedorMarcas = document.getElementById("contenedorMarcas");
const loader = document.getElementById("loader");
const btnArriba = document.getElementById("btnArriba");
const seccionReciente = document.getElementById("seccion-reciente");
const featuredSections = document.getElementById("catalogFeaturedSections");
const mostSearchedCatalog = document.getElementById("mostSearchedCatalog");
const immediateCatalog = document.getElementById("immediateCatalog");
const catalogResultsTitle = document.getElementById("catalogResultsTitle");
const recentQuotesStorageKey = "elite_recent_quoted_perfumes";

/* CARGAR CATÁLOGO (Híbrido: Scraping Estático + Admin Panel) */
async function cargarDatos() {
    try {
        // 1. Carga el JSON base actual (tu scraping)
        const res = await fetch("perfumes.json");
        const perfumesBase = await res.json();
        
        // 2. Intentar cargar perfumes nuevos desde la carpeta del Admin en GitHub
        const user = "stewardsprofile-ux";
        const repo = "elite-catalogo";
        const folderPath = "assets/data/perfumes";
        let perfumesNuevos = [];

        try {
            // Consultamos la API de GitHub para listar archivos en la carpeta de perfumes
            const resGithub = await fetch(`https://api.github.com/repos/${user}/${repo}/contents/${folderPath}`);
            
            if (resGithub.ok) {
                const archivos = await resGithub.json();
                
                // Descargamos cada archivo .json individualmente
                const promesas = archivos
                    .filter(archivo => archivo.name.endsWith('.json'))
                    .map(archivo => fetch(archivo.download_url).then(r => r.json()));
                
                const datosNuevos = await Promise.all(promesas);

                // Mapeamos para que los nombres del Admin coincidan con tu lógica de 'Title' e 'Image'
                perfumesNuevos = datosNuevos.map(p => ({
                    id: p.id,
                    marca: p.marca,
                    Title: p.nombre,    // El admin usa 'nombre', el script usa 'Title'
                    genero: p.genero,
                    tipo: p.tipo,
                    Image: p.imagen,    // El admin usa 'imagen', el script usa 'Image'
                    descripcion: p.descripcion,
                    categoria: p.tipo   // Usamos tipo como categoría para mantener tus filtros
                }));
            }
        } catch (errorGit) {
            console.log("No se detectaron perfumes nuevos en el Admin todavía.");
        }

        // 3. FUSIÓN: Los nuevos aparecen DE PRIMERO
        perfumes = [...perfumesNuevos, ...perfumesBase];

        if(loader) loader.style.display = "none";
        renderMarcas(); 
        render();
    } catch (err) {
        if(loader) loader.innerHTML = "Error cargando catálogo";
        console.error(err);
    }
}
cargarDatos();

/* GENERAR BOTONES DE MARCAS */
function renderMarcas() {
    if(!contenedorMarcas) return;
    contenedorMarcas.innerHTML = "";
    let marcas = [...new Set(perfumes.map(p => p.marca).filter(m => m && m !== "Otros"))]
        .sort((a, b) => a.localeCompare(b, "es", { sensitivity: "base" }));
    
    const btnReset = document.createElement("button");
    btnReset.className = `btn-marca ${marcaActual === "" ? 'active' : ''}`;
    btnReset.textContent = "TODAS";
    btnReset.onclick = () => { 
        marcaActual = ""; 
        visibles = 24; 
        renderMarcas(); 
        render(); 
    };
    contenedorMarcas.appendChild(btnReset);

    marcas.forEach(m => {
        const btn = document.createElement("button");
        btn.className = `btn-marca ${marcaActual === m ? 'active' : ''}`;
        btn.textContent = m;
        btn.onclick = () => {
            marcaActual = m;
            visibles = 24;
            tipoActual = "Todos";
            categoriaActual = "Todos";
            manejarCarrusel(false); // Oculta carrusel al filtrar
            actualizarBotonesActivos();
            renderMarcas();
            render();
            window.scrollTo({ top: catalogo.offsetTop - 100, behavior: 'smooth' });
        };
        contenedorMarcas.appendChild(btn);
    });
}

function scrollMarcas(distancia) {
    contenedorMarcas.scrollBy({ left: distancia, behavior: 'smooth' });
}

/* LÓGICA DE FILTRADO */
function getFiltrados() {
    return perfumes.filter(p => {
        const pTitle = (p.Title || "").toLowerCase();
        const pCat = (p.categoria || "").toLowerCase();
        const pTipo = (p.tipo || "").toLowerCase();
        const pMarca = (p.marca || "").toLowerCase();

        let matchTipo = (tipoActual === "Todos") || 
                        pTitle.includes(tipoActual.toLowerCase()) || 
                        pTipo.includes(tipoActual.toLowerCase()) ||
                        pCat.includes(tipoActual.toLowerCase());

        let matchCat = (categoriaActual === "Todos") || 
                       (pCat === categoriaActual.toLowerCase()) || 
                       (pTipo === categoriaActual.toLowerCase());

        const matchMarca = (marcaActual === "") || (p.marca === marcaActual);

        const q = search.value.toLowerCase();
        const matchSearch = !q || pTitle.includes(q) || pMarca.includes(q);

        return matchTipo && matchCat && matchMarca && matchSearch;
    });
}

/* RENDERIZAR */
function crearTarjetaProducto(p) {
        const card = document.createElement("div");
        card.className = "card";

        const img = document.createElement("img");
        img.src = p.Image;
        img.alt = p.Title || "Perfume Elite";
        img.loading = "lazy";
        img.onclick = () => verProducto(p);
        img.onerror = () => { img.src = "assets/placeholder.webp"; };

        const info = document.createElement("div");
        info.className = "card-info-perfume";

        const favorite = document.createElement("button");
        favorite.type = "button";
        favorite.className = "card-favorite";
        favorite.setAttribute("aria-label", `Guardar ${p.Title || "perfume"} en favoritos`);
        favorite.textContent = "♡";
        favorite.onclick = () => {
            favorite.classList.toggle("selected");
            favorite.textContent = favorite.classList.contains("selected") ? "♥" : "♡";
        };

        const copy = document.createElement("div");
        copy.className = "card-product-copy";
        const title = document.createElement("h3");
        title.textContent = (p.Title || "ELITE PARFUMS").toUpperCase();
        const brand = document.createElement("span");
        brand.textContent = p.marca || "Elite Parfums";
        copy.appendChild(title);
        copy.appendChild(brand);

        const button = document.createElement("button");
        button.className = "btn btn-cotizar-perfume";
        button.textContent = "Cotizar";
        button.onclick = () => cotizar(p.Title, p.Image);

        info.appendChild(copy);
        info.appendChild(button);
        card.appendChild(favorite);
        card.appendChild(img);
        card.appendChild(info);
        return card;
}

function pintarProductos(contenedor, productos) {
    contenedor.innerHTML = "";
    productos.forEach(producto => contenedor.appendChild(crearTarjetaProducto(producto)));
}

function obtenerCotizadosLocales() {
    try {
        const guardados = JSON.parse(localStorage.getItem(recentQuotesStorageKey) || "[]");
        return guardados
            .map(item => perfumes.find(p => p.Title === item.Title && p.Image === item.Image) || item)
            .slice(0, 8);
    } catch {
        return [];
    }
}

async function obtenerMasBuscados() {
    try {
        const response = await fetch("/api/catalog-events", { cache: "no-store" });
        if (!response.ok) throw new Error("Ranking global no disponible");
        const data = await response.json();
        if (Array.isArray(data.ranking) && data.ranking.length) {
            return data.ranking.map(item =>
                perfumes.find(p => p.Title === item.Title && p.Image === item.Image) || item
            ).slice(0, 8);
        }
    } catch {
        // Usa el historial del dispositivo mientras el almacenamiento global no esté conectado.
    }
    return obtenerCotizadosLocales();
}

async function renderVitrinas() {
    const recientes = await obtenerMasBuscados();
    if (recientes.length) {
        pintarProductos(mostSearchedCatalog, recientes);
    } else {
        mostSearchedCatalog.innerHTML = '<p class="catalog-empty-feature">Los perfumes cotizados recientemente aparecerán aquí.</p>';
    }
    pintarProductos(immediateCatalog, perfumes.slice(0, visiblesInmediatos));
}

function esVistaDestacada() {
    return !search.value.trim() && tipoActual === "Todos" && categoriaActual === "Todos" && marcaActual === "";
}

function render() {
    const vistaDestacada = esVistaDestacada();
    featuredSections.style.display = vistaDestacada ? "block" : "none";
    catalogResultsTitle.style.display = vistaDestacada ? "none" : "flex";
    catalogo.style.display = vistaDestacada ? "none" : "grid";

    if (vistaDestacada) {
        catalogo.innerHTML = "";
        renderVitrinas();
        return;
    }

    const lista = getFiltrados().slice(0, visibles);
    if(lista.length === 0) {
        catalogo.innerHTML = `
            <div style="text-align:center; width:100%; color:#a0aab4; padding:50px; grid-column: 1 / -1;">
                <p>No se encontraron productos para esta combinación.</p>
                <button onclick="resetFiltros()" style="background:#ffffff; color:#10171f; border:none; padding:10px 20px; border-radius:5px; cursor:pointer; font-weight:bold;">Limpiar Filtros</button>
            </div>`;
        return;
    }

    pintarProductos(catalogo, lista);
}

/* MANEJAR VISIBILIDAD DE CARRUSEL RECIENTE */
function manejarCarrusel(mostrar) {
    if(seccionReciente) {
        seccionReciente.style.display = mostrar ? "block" : "none";
    }
}

/* SCROLL INFINITO */
window.addEventListener("scroll", () => {
    if(btnArriba) btnArriba.style.display = (window.scrollY > 300) ? "block" : "none";
    if(esVistaDestacada()) {
        if (!cargando && window.innerHeight + window.scrollY >= document.body.offsetHeight - 1000 && visiblesInmediatos < perfumes.length) {
            cargando = true;
            visiblesInmediatos += 20;
            pintarProductos(immediateCatalog, perfumes.slice(0, visiblesInmediatos));
            setTimeout(() => { cargando = false; }, 300);
        }
        return;
    }
    if(cargando) return;
    if(window.innerHeight + window.scrollY >= document.body.offsetHeight - 1000){
        const totalFiltrados = getFiltrados().length;
        if(visibles < totalFiltrados){
            cargando = true;
            visibles += 20;
            render();
            setTimeout(() => { cargando = false; }, 300);
        }
    }
});

/* FILTROS Y BOTONES */
function actualizarBotonesActivos() {
    document.querySelectorAll(".tipo, .categoria").forEach(btn => btn.classList.remove("active"));
    document.querySelectorAll(".tipo").forEach(btn => {
        if(btn.dataset.tipo === tipoActual) btn.classList.add("active");
    });
    document.querySelectorAll(".categoria").forEach(btn => {
        if(btn.dataset.cat === categoriaActual) btn.classList.add("active");
    });
}

document.querySelectorAll(".tipo").forEach(b => {
    b.addEventListener("click", () => {
        manejarCarrusel(false); // Ocultar carrusel al elegir categoría
        categoriaActual = "Todos"; 
        marcaActual = "";
        tipoActual = b.dataset.tipo;
        visibles = 24;
        actualizarBotonesActivos();
        renderMarcas();
        render();
    });
});

document.querySelectorAll(".categoria").forEach(b => {
    b.addEventListener("click", () => {
        manejarCarrusel(false); // Ocultar carrusel al elegir categoría
        tipoActual = "Todos";
        marcaActual = "";
        categoriaActual = b.dataset.cat;
        visibles = 24;
        actualizarBotonesActivos();
        renderMarcas();
        render();
    });
});

function resetFiltros() {
    manejarCarrusel(true); // Mostrar carrusel al limpiar filtros
    tipoActual = "Todos";
    categoriaActual = "Todos";
    marcaActual = "";
    search.value = "";
    actualizarBotonesActivos();
    renderMarcas();
    render();
}

/* UTILIDADES */
function verProducto(producto){
    const visor = document.getElementById("visorImagen");
    const imagen = document.getElementById("imagenGrande");
    imagen.src = producto.Image;
    imagen.alt = producto.Title || "Perfume Elite";
    document.getElementById("visorTitulo").textContent = producto.Title || "Elite Parfums";
    document.getElementById("visorMarca").textContent = producto.marca || "Elite Parfums";
    document.getElementById("visorCotizar").onclick = () => cotizar(producto.Title, producto.Image);
    visor.style.display = "flex";
    document.body.style.overflow = "hidden";
}

function cerrarVisorProducto() {
    document.getElementById("visorImagen").style.display = "none";
    document.body.style.overflow = "";
}

if(document.getElementById("cerrarVisor")) {
    document.getElementById("cerrarVisor").onclick = cerrarVisorProducto;
    document.getElementById("visorImagen").addEventListener("click", event => {
        if (event.target.id === "visorImagen") cerrarVisorProducto();
    });
    document.addEventListener("keydown", event => {
        if (event.key === "Escape") cerrarVisorProducto();
    });
}

search.addEventListener("input", () => { 
    if(search.value.length > 0) manejarCarrusel(false);
    visibles = 24; 
    render(); 
});

document.querySelector(".catalog-search-submit")?.addEventListener("click", () => {
    visibles = 24;
    render();
    catalogo.scrollIntoView({ behavior: "smooth", block: "start" });
});

function cotizar(n, i){ 
    const producto = perfumes.find(p => p.Title === n && p.Image === i) || { Title: n, Image: i, marca: "Elite Parfums" };
    try {
        const anteriores = JSON.parse(localStorage.getItem(recentQuotesStorageKey) || "[]");
        const actualizados = [producto, ...anteriores.filter(p => !(p.Title === n && p.Image === i))].slice(0, 8);
        localStorage.setItem(recentQuotesStorageKey, JSON.stringify(actualizados));
        if (esVistaDestacada()) renderVitrinas();
    } catch {
        // La cotización continúa aunque el navegador bloquee el almacenamiento local.
    }
    fetch("/api/catalog-events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(producto),
        keepalive: true
    }).then(response => {
        if (response.ok && esVistaDestacada()) renderVitrinas();
    }).catch(() => {});
    const urlCompleta = window.location.origin + "/" + i;
    window.open(`https://wa.me/${telefono}?text=${encodeURIComponent('Hola, quiero cotizar este producto:\n\n'+n+'\n\n'+urlCompleta)}`, "_blank"); 
}

if(btnArriba) {
    btnArriba.onclick = () => window.scrollTo({top:0, behavior:"smooth"});
}

// Función para redirigir a la sección de Oro
function irAOro() {
    window.location.href = "/oro";
}

// ==========================================
//          LÓGICA DEL ASISTENTE IA ELITE
// ==========================================

const preguntasBot = [
    { id: 'genero', titulo: '¿Para quién sería el perfume?', opciones: ['👨 Hombre', '👩 Mujer', '👫 Unisex', '🎁 Es para un regalo', '🌈 Sin etiqueta'] },
    { id: 'edad', titulo: '¿En qué etapa estás más o menos?', opciones: ['👶 Menos de 18', '✨ 18 – 24', '💼 25 – 34', '👔 35 – 44', '🏙️ 45 – 54', '👑 55 o más'] },
    { id: 'clima', titulo: '¿Dónde vas a usarlo normalmente?', opciones: ['🔥 Mucho calor', '🌤️ Clima templado', '🌧️ Fresco o lluvioso', '❄️ Aire acondicionado', '☀️ Día soleado', '🌙 De noche'] },
    { id: 'ocasion', titulo: '¿Para qué momento lo quieres principalmente?', opciones: ['🏢 Trabajo / Diario', '🚶 Salidas normales', '🕯️ Citas', '🎉 Fiestas', '🤝 Reuniones', '👔 Eventos elegantes', '🏃 Gimnasio', '💎 Perfume principal'] },
    { id: 'objetivo', titulo: '¿Qué te gustaría que piensen de ti?', opciones: ['🧼 Limpio', '🤵 Elegante', '🌶️ Sexy', '🌀 Diferente', '💰 Exitoso', '🍃 Relajado', '🍬 Agradable', '📣 Que me noten', '✨ Fino', '🧠 Que me recuerden'] },
    { id: 'perfil_aroma', titulo: '¿Qué te gusta más en un perfume?', opciones: ['🌊 Muy fresco', '🍊 Fresco y dulce', '⚖️ Balanceado', '🍭 Dulce', '🍰 Muy dulce', '🪵 Amaderado', '⭐ Perfume fino', '❓ No sé'] },
    { id: 'intensidad', titulo: '¿Qué tan fuerte quieres que sea?', opciones: ['☁️ Suave', '🌡️ Moderado', '⚡ Fuerte', '🌪️ Muy fuerte', '🎭 Depende'] },
    { id: 'personalidad', titulo: 'Si el perfume fuera una persona...', opciones: ['🎩 Elegante', '🕵️ Misterioso', '😎 Divertido', '💪 Seguro', '🧘 Tranquilo', '🌹 Sexy', '💼 Profesional', '🤫 Millonario', '🎸 Rebelde', '💘 Romántico'] },
    { id: 'referencia', titulo: '¿Hay algún perfume que ya te guste mucho?', opciones: ['✅ Sí, tengo uno', '🔄 Quiero cambiar', '🚫 Casi no uso', '🆕 Es mi primero', '🕵️ Sé cuáles me gustan'] }
];

let pasoActual = 0;
let respuestasUsuario = {};
const urlSheets = "https://script.google.com/macros/s/AKfycbzxrZcQvWFO_iumeewVQ8c9WQbMUoZCZgNA9TGPAx4mX54ycLl-k8jIz2TmxU-qL7Jd/exec";

function abrirBot() {
    document.getElementById('bot-modal').style.display = 'block';
    document.body.style.overflow = 'hidden';
    pasoActual = 0;
    respuestasUsuario = {};
    document.getElementById('quiz-content').style.display = 'block';
    document.getElementById('resultados-bot').style.display = 'none';
    mostrarPregunta();
}

function cerrarBot() {
    document.getElementById('bot-modal').style.display = 'none';
    document.body.style.overflow = 'auto';
}

function mostrarPregunta() {
    const container = document.getElementById('opciones-container');
    const titulo = document.getElementById('pregunta-titulo');
    container.innerHTML = '';
    
    const data = preguntasBot[pasoActual];
    titulo.innerText = data.titulo;
    
    data.opciones.forEach(opcion => {
        const btn = document.createElement('button');
        btn.innerText = opcion;
        btn.className = 'btn-pregunta';
        btn.onclick = () => procesarRespuesta(data.id, opcion);
        container.appendChild(btn);
    });
}

function procesarRespuesta(id, valor) {
    respuestasUsuario[id] = valor;
    const valorLimpio = valor.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '').trim();
    respuestasUsuario[id] = valorLimpio;

    if (id === 'referencia' && valor.includes('Sí, tengo uno')) {
        pedirNombrePerfume();
    } else {
        avanzarSiguiente();
    }
}

function pedirNombrePerfume() {
    const container = document.getElementById('opciones-container');
    const titulo = document.getElementById('pregunta-titulo');
    titulo.innerText = "¿Cómo se llama ese perfume que te encanta?";
    container.innerHTML = `
        <input type="text" id="perfume-favorito" placeholder="Ej: Sauvage, 212 VIP..." style="width:100%; padding:15px; border-radius:10px; border:1px solid #333; background:#222; color:white; margin-bottom:15px; font-family:inherit;">
        <button class="btn" style="width:100%" onclick="guardarFavorito()">Continuar</button>
    `;
}

function guardarFavorito() {
    const nombre = document.getElementById('perfume-favorito').value;
    respuestasUsuario['nombre_favorito'] = nombre || "No especificado";
    avanzarSiguiente();
}

function avanzarSiguiente() {
    pasoActual++;
    if (pasoActual < preguntasBot.length) {
        mostrarPregunta();
    } else {
        consultarIA();
    }
}

async function consultarIA() {
    const container = document.getElementById('opciones-container');
    const titulo = document.getElementById('pregunta-titulo');
    
    titulo.innerText = "Buscando los Perfumes Ideales...";
    container.innerHTML = '<div class="loader-ia" style="margin:20px auto; border:4px solid rgba(255,255,255,0.1); border-top:4px solid var(--elite-gold); border-radius:50%; width:40px; height:40px; animation:spin 1s linear infinite;"></div>';

    const perfilSensorial = `
        Cliente ${respuestasUsuario.genero}, etapa ${respuestasUsuario.edad}. 
        Uso: ${respuestasUsuario.ocasion} en clima ${respuestasUsuario.clima}. 
        Busca: ${respuestasUsuario.objetivo}. 
        Preferencia: ${respuestasUsuario.perfil_aroma}, intensidad ${respuestasUsuario.intensidad}. 
        Personalidad: ${respuestasUsuario.personalidad}.
        Favorito: ${respuestasUsuario.nombre_favorito || 'N/A'}.
    `;

    const nombresCatalogo = perfumes.map(p => p.Title);

    try {
        const res = await fetch('/api/recomendar', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ perfil: perfilSensorial, catalogoNombres: nombresCatalogo })
        });
        
        if (!res.ok) throw new Error("Error en la respuesta del servidor");
        
        const data = await res.json();
        guardarEnGoogle(respuestasUsuario, data.recomendados.join(', '));
        renderizarResultadosBot(data.recomendados);
    } catch (error) {
        titulo.innerText = "Error de conexión. Intenta de nuevo.";
        console.error("Detalle del error:", error);
    }
}

async function guardarEnGoogle(respuestas, recomendacion) {
    const payload = {
        genero: respuestas.genero,
        edad: respuestas.edad,
        clima: respuestas.clima,
        ocasion: respuestas.ocasion,
        objetivo: respuestas.objetivo,
        perfil_aroma: respuestas.perfil_aroma,
        intensidad: respuestas.intensidad,
        personalidad: respuestas.personalidad,
        nombre_favorito: respuestas.nombre_favorito || "N/A",
        recomendacion: recomendacion
    };

    try {
        await fetch(urlSheets, {
            method: 'POST',
            mode: 'no-cors',
            body: JSON.stringify(payload)
        });
    } catch (e) { console.log("Error al guardar en Google Sheets"); }
}

function renderizarResultadosBot(nombres) {
    document.getElementById('quiz-content').style.display = 'none';
    document.getElementById('resultados-bot').querySelector('h2').innerHTML = '🏆 Perfumes Ideales';
    document.getElementById('resultados-bot').querySelector('p').innerText = 'Resultados:';

    const lista = document.getElementById('lista-matches');
    lista.innerHTML = '';
    
    nombres.forEach(nombre => {
        const busqueda = nombre.toLowerCase().trim();
        const match = perfumes.find(p => p.Title.toLowerCase().trim() === busqueda) || 
                      perfumes.find(p => p.Title.toLowerCase().includes(busqueda));
        
        if (match) {
            const card = document.createElement("div");
            card.className = "match-card";
            card.style.cssText = "background:#fff; padding:15px; border-radius:15px; text-align:center; display:flex; flex-direction:column; align-items:center; box-shadow: 0 4px 10px rgba(0,0,0,0.1);";
            card.innerHTML = `
                <img src="${match.Image}" style="width:100%; height:120px; object-fit:contain; margin-bottom:10px;">
                <h3 style="font-size:12px; color:#111; margin:5px 0 10px 0; height:32px; overflow:hidden; line-height:1.2; font-weight:bold;">${match.Title}</h3>
                <button class="btn" style="width:100%; padding:8px; font-size:11px;" onclick="cotizar('${match.Title}','${match.Image}')">Lo quiero</button>
            `;
            lista.appendChild(card);
        }
    });
    document.getElementById('resultados-bot').style.display = 'block';
}

const styleBot = document.createElement('style');
styleBot.innerHTML = `
    @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
    .btn-pregunta { 
        background-image:
            linear-gradient(var(--elite-bg), var(--elite-bg)),
            var(--elite-gold-gradient);
        background-origin: border-box;
        background-clip: padding-box, border-box;
        border: 1px solid transparent;
        color: #e0e0e0; 
        padding: 10px 14px; 
        border-radius: 10px; 
        cursor: pointer; 
        transition: 0.2s; 
        text-align: left;
        font-size: 13.5px;
        display: flex;
        align-items: center;
        gap: 10px;
        font-family: inherit;
    }
    .btn-pregunta:hover { 
        background: var(--elite-gold-gradient);
        border-color: var(--elite-gold);
        color: var(--elite-bg);
    }
`;
document.head.appendChild(styleBot);
