/* CONFIGURACION ORO 10K - ELITE GOLD */
const telefonoGold = "50662104761";
let joyas = [];
let visiblesOro = 12;
let cargandoMasOro = false;
const lotesOroLocales = [
    "assets/data/oro-lotes/hombre-cadenas.json",
    "assets/data/oro-lotes/hombre-pulseras.json",
    "assets/data/oro-lotes/hombre-anillos.json",
    "assets/data/oro-lotes/hombre-argollas.json",
    "assets/data/oro-lotes/hombre-aretes.json",
    "assets/data/oro-lotes/mujer-cadenas.json",
    "assets/data/oro-lotes/mujer-pulseras.json",
    "assets/data/oro-lotes/mujer-anillos.json",
    "assets/data/oro-lotes/mujer-argollas.json",
    "assets/data/oro-lotes/mujer-aretes.json",
    "assets/data/oro-lotes/ninos-cadenas.json",
    "assets/data/oro-lotes/ninos-pulseras.json",
    "assets/data/oro-lotes/ninos-anillos.json",
    "assets/data/oro-lotes/ninos-argollas.json",
    "assets/data/oro-lotes/ninos-aretes.json",
    "assets/data/oro-lotes/unisex-cadenas.json",
    "assets/data/oro-lotes/unisex-pulseras.json",
    "assets/data/oro-lotes/unisex-anillos.json",
    "assets/data/oro-lotes/unisex-argollas.json",
    "assets/data/oro-lotes/unisex-aretes.json",
    "assets/data/oro-lotes/especiales-graduacion.json",
    "assets/data/oro-lotes/especiales-anos.json",
    "assets/data/oro-lotes/especiales-matrimonio.json"
];

let filtroTipo = "Todos";
let filtroGenero = "Todos";
let filtroCat = "Todos";
const categoriasEspecialesOro = ["Graduacion", "15 Años", "Matrimonio"];
const repoOwner = "stewardsprofile-ux";
const repoName = "elite-catalogo";
const repoBranch = "main";

const catalogoOro = document.getElementById("catalogo-oro");
const loaderOro = document.getElementById("loaderOro");
const btnArribaOro = document.getElementById("btnArribaOro");
const goldFeaturedSections = document.getElementById("goldFeaturedSections");
const mostQuotedGold = document.getElementById("mostQuotedGold");
const immediateGold = document.getElementById("immediateGold");
const goldResultsTitle = document.getElementById("goldResultsTitle");
const recentGoldQuotesKey = "elite_recent_quoted_gold";

async function cargarJsonDesdeGithub(folderPath) {
    const user = "stewardsprofile-ux";
    const repo = "elite-catalogo";

    try {
        const res = await fetch(`https://api.github.com/repos/${user}/${repo}/contents/${folderPath}`);
        if (!res.ok) return [];

        const archivos = await res.json();
        const jsonFiles = archivos.filter((archivo) => archivo.name.endsWith(".json"));

        const data = await Promise.all(
            jsonFiles.map(async (archivo) => {
                try {
                    const jsonRes = await fetch(archivo.download_url);
                    if (!jsonRes.ok) return null;
                    return await jsonRes.json();
                } catch (error) {
                    console.error("No se pudo cargar", archivo.name, error);
                    return null;
                }
            })
        );

        return data.filter(Boolean);
    } catch (error) {
        console.error("Error cargando carpeta", folderPath, error);
        return [];
    }
}

async function cargarJsonLocales(paths) {
    const data = await Promise.all(
        paths.map(async (path) => {
            try {
                const res = await fetch(`https://raw.githubusercontent.com/${repoOwner}/${repoName}/${repoBranch}/${path}?t=${Date.now()}`);
                if (!res.ok) return null;
                return await res.json();
            } catch (error) {
                console.error("No se pudo cargar", path, error);
                return null;
            }
        })
    );

    return data.filter(Boolean);
}

function capitalizarNombre(texto) {
    return String(texto || "")
        .toLowerCase()
        .replace(/\b([a-záéíóúñ])/g, (match) => match.toUpperCase())
        .trim();
}

function nombreDesdeImagen(ruta, fallback = "Pieza de oro") {
    const base = String(ruta || "")
        .split("/")
        .pop()
        .split("?")[0]
        .replace(/\.[^.]+$/, "")
        .replace(/[_-]+/g, " ")
        .replace(/\s+/g, " ")
        .replace(/^\d+\s*/, "")
        .trim();

    return capitalizarNombre(base || fallback);
}

function imagenDeItem(item) {
    if (!item) return "";
    if (typeof item === "string") return item;
    return item.imagen || item.src || item.url || "";
}

function normalizarRegistroManual(joya, index) {
    return {
        id: joya.id || `manual-${index}`,
        nombre: joya.nombre || nombreDesdeImagen(joya.imagen),
        tipo: joya.tipo || "Oro Nacional",
        genero: joya.genero || "Unisex",
        categoria: joya.categoria || "Cadenas",
        imagen: joya.imagen || "",
        descripcion: joya.descripcion || "",
        reciente: Boolean(joya.reciente || joya.entregaInmediata)
    };
}

function expandirLote(lote, loteIndex) {
    if (!lote || !Array.isArray(lote.grupos)) return [];

    const genero = lote.genero || "Unisex";
    const categoria = lote.categoria || "Cadenas";
    const piezas = [];

    lote.grupos.forEach((grupo, grupoIndex) => {
        const tipo = grupo?.tipo || lote.tipo || "Oro Nacional";
        const imagenes = Array.isArray(grupo?.imagenes) ? grupo.imagenes : [];

        imagenes.forEach((item, imagenIndex) => {
            const imagen = imagenDeItem(item);
            if (!imagen) return;

            piezas.push({
                id: `lote-${loteIndex}-${grupoIndex}-${imagenIndex}`,
                nombre: nombreDesdeImagen(imagen, `${categoria} ${imagenIndex + 1}`),
                tipo,
                genero,
                categoria,
                imagen,
                descripcion: "",
                reciente: true
            });
        });
    });

    return piezas;
}

function toAbsoluteImageUrl(path) {
    if (!path) return "assets/placeholder.webp";
    if (/^https?:\/\//i.test(path)) return path;

    const cleanedPath = path.replace(/^\.\//, "").replace(/^\//, "");
    if (cleanedPath.startsWith("assets/")) {
        return `https://cdn.jsdelivr.net/gh/${repoOwner}/${repoName}@${repoBranch}/${cleanedPath}`;
    }

    if (path.startsWith("/")) return `${window.location.origin}${path}`;
    return `${window.location.origin}/${cleanedPath}`;
}

async function cargarOro() {
    if (loaderOro) loaderOro.textContent = "Cargando coleccion...";

    const [manuales, lotes] = await Promise.all([
        cargarJsonDesdeGithub("assets/data/oro"),
        cargarJsonLocales(lotesOroLocales)
    ]);

    const piezasManuales = manuales.map(normalizarRegistroManual).filter((joya) => joya.imagen);
    const piezasPorLote = lotes.flatMap(expandirLote).filter((joya) => joya.imagen);

    joyas = [...piezasPorLote, ...piezasManuales];
    if (loaderOro) loaderOro.style.display = "none";
    renderOro();
}

function crearCardOro(joya) {
    const urlFinal = toAbsoluteImageUrl(joya.imagen);
    const card = document.createElement("div");
    card.className = "card";

    const img = document.createElement("img");
    img.src = urlFinal;
    img.alt = joya.nombre;
    img.loading = "lazy";
    img.decoding = "async";
    img.addEventListener("click", () => verImagen(urlFinal));
    img.onerror = () => {
        img.src = "assets/placeholder.webp";
    };

    const info = document.createElement("div");
    info.className = "card-info-perfume";

    const boton = document.createElement("button");
    boton.className = "btn btn-cotizar-perfume";
    boton.textContent = "Cotizar";
    boton.addEventListener("click", () => cotizarJoya(joya));
    info.appendChild(boton);

    card.appendChild(img);
    card.appendChild(info);
    return card;
}

function pintarJoyas(contenedor, piezas) {
    if (!contenedor) return;
    contenedor.innerHTML = "";
    piezas.forEach((joya) => contenedor.appendChild(crearCardOro(joya)));
}

function vistaOroDestacada() {
    return filtroTipo === "Todos" && filtroGenero === "Todos" && filtroCat === "Todos";
}

function cotizadasLocales() {
    try {
        const guardadas = JSON.parse(localStorage.getItem(recentGoldQuotesKey) || "[]");
        return guardadas.map((item) =>
            joyas.find((joya) => joya.nombre === item.nombre && joya.imagen === item.imagen) || item
        ).slice(0, 8);
    } catch {
        return [];
    }
}

async function obtenerMasCotizadas() {
    try {
        const response = await fetch("/api/catalog-events?catalog=oro", { cache: "no-store" });
        if (!response.ok) throw new Error("Ranking de oro no disponible");
        const data = await response.json();
        if (Array.isArray(data.ranking) && data.ranking.length) {
            return data.ranking.map((item) =>
                joyas.find((joya) => joya.nombre === item.Title && toAbsoluteImageUrl(joya.imagen) === item.Image) || {
                    nombre: item.Title,
                    imagen: item.Image,
                    tipo: item.marca || "Oro 10K",
                    genero: "Elite",
                    categoria: "Joyería"
                }
            ).slice(0, 8);
        }
    } catch {
        // El historial local mantiene la vitrina disponible si el ranking global falla.
    }
    return cotizadasLocales();
}

async function renderVitrinasOro() {
    const cotizadas = await obtenerMasCotizadas();
    if (cotizadas.length) {
        pintarJoyas(mostQuotedGold, cotizadas);
    } else if (mostQuotedGold) {
        mostQuotedGold.innerHTML = '<p class="catalog-empty-feature">Las piezas cotizadas aparecerán aquí.</p>';
    }

    const inmediatas = joyas.filter((joya) => joya.reciente).slice(0, visiblesOro);
    pintarJoyas(immediateGold, inmediatas.length ? inmediatas : joyas.slice(0, visiblesOro));
}

function renderOro() {
    if (!catalogoOro) return;
    catalogoOro.innerHTML = "";

    const vistaDestacada = vistaOroDestacada();
    if (goldFeaturedSections) goldFeaturedSections.style.display = vistaDestacada ? "block" : "none";
    if (goldResultsTitle) goldResultsTitle.style.display = vistaDestacada ? "none" : "flex";
    catalogoOro.style.display = vistaDestacada ? "none" : "grid";

    if (vistaDestacada) {
        renderVitrinasOro();
        return;
    }

    const filtrados = joyas.filter((joya) => {
        const cumpleTipo = filtroTipo === "Todos" || joya.tipo === filtroTipo;
        const esEspecial = categoriasEspecialesOro.includes(filtroCat);
        const cumpleGenero = esEspecial || filtroGenero === "Todos" || joya.genero === filtroGenero || joya.genero === "Unisex";
        const cumpleCat = filtroCat === "Todos" || joya.categoria === filtroCat;
        return cumpleTipo && cumpleGenero && cumpleCat;
    });

    if (!filtrados.length) {
        catalogoOro.innerHTML = '<p style="color:white; text-align:center; padding:40px; grid-column:1/-1;">No hay piezas disponibles para esta combinacion.</p>';
        return;
    }

    pintarJoyas(catalogoOro, filtrados.slice(0, visiblesOro));
}

function filtrarTipo(valor) {
    filtroTipo = valor;
    visiblesOro = 12;
    actualizarBotones("tipo-oro", valor);
    renderOro();
}

function filtrarGenero(valor) {
    filtroGenero = valor;
    if (categoriasEspecialesOro.includes(filtroCat)) {
        filtroCat = "Todos";
        actualizarBotones("cat-oro", "Todos");
        actualizarBotones("cat-oro-especial", "");
    }
    visiblesOro = 12;
    actualizarBotones("gen-oro", valor);
    renderOro();
}

function filtrarCat(valor) {
    filtroCat = filtroCat === valor ? "Todos" : valor;
    visiblesOro = 12;
    actualizarBotones("cat-oro", filtroCat);
    actualizarBotones("cat-oro-especial", "");
    renderOro();
}

function filtrarCatEspecial(valor) {
    filtroCat = filtroCat === valor ? "Todos" : valor;
    if (filtroCat !== "Todos") {
        filtroGenero = "Todos";
    }
    visiblesOro = 12;
    actualizarBotones("gen-oro", filtroGenero);
    actualizarBotones("cat-oro", "");
    actualizarBotones("cat-oro-especial", filtroCat === "Todos" ? "" : filtroCat);
    renderOro();
}

function actualizarBotones(clase, seleccionado) {
    document.querySelectorAll(`.${clase}`).forEach((boton) => {
        const valor = boton.getAttribute("data-val");
        boton.classList.toggle("active", valor === seleccionado);
    });
}

function slugWhatsApp(texto) {
    return String(texto || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
}

function enlacePiezaJoya(joya) {
    const baseUrl = new URL("/pieza", window.location.origin);
    const params = new URLSearchParams();

    if (joya?.tipo) params.set("tipo", joya.tipo);
    if (joya?.categoria) params.set("categoria", joya.categoria);
    if (joya?.genero && !categoriasEspecialesOro.includes(joya.categoria)) {
        params.set("genero", joya.genero);
    }
    if (joya?.nombre) params.set("pieza", slugWhatsApp(joya.nombre));

    baseUrl.search = params.toString();
    return baseUrl.toString();
}

function cotizarJoya(joya) {
    const mensaje = `Me interesa esta pieza de oro este es el Link: ${enlacePiezaJoya(joya)}\n\nme lo puedes cotizar, Por Favor?`;
    window.open(`https://wa.me/${telefonoGold}?text=${encodeURIComponent(mensaje)}`, "_blank");

    try {
        const guardadas = JSON.parse(localStorage.getItem(recentGoldQuotesKey) || "[]");
        const actualizada = [joya, ...guardadas.filter((item) =>
            item.nombre !== joya.nombre || item.imagen !== joya.imagen
        )].slice(0, 8);
        localStorage.setItem(recentGoldQuotesKey, JSON.stringify(actualizada));
    } catch {
        // La cotización continúa aunque el navegador bloquee el almacenamiento local.
    }

    fetch("/api/catalog-events?catalog=oro", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            Title: joya.nombre,
            Image: toAbsoluteImageUrl(joya.imagen),
            marca: joya.tipo || "Oro 10K"
        }),
        keepalive: true
    }).catch(() => {});
}

function verImagen(url) {
    const visor = document.getElementById("visorImagen");
    const imagen = document.getElementById("imagenGrande");
    if (visor && imagen) {
        imagen.src = url;
        visor.style.display = "flex";
    }
}

window.addEventListener("scroll", () => {
    if (btnArribaOro) {
        btnArribaOro.style.display = window.scrollY > 500 ? "block" : "none";
    }

    if (cargandoMasOro) return;

    const totalFiltrados = joyas.filter((joya) => {
        const cumpleTipo = filtroTipo === "Todos" || joya.tipo === filtroTipo;
        const cumpleGenero = filtroGenero === "Todos" || joya.genero === filtroGenero || joya.genero === "Unisex";
        const cumpleCat = filtroCat === "Todos" || joya.categoria === filtroCat;
        return cumpleTipo && cumpleGenero && cumpleCat;
    }).length;

    if (visiblesOro >= totalFiltrados) return;

    if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 1000) {
        cargandoMasOro = true;
        visiblesOro += 12;
        renderOro();
        window.setTimeout(() => {
            cargandoMasOro = false;
        }, 200);
    }
});

if (btnArribaOro) {
    btnArribaOro.addEventListener("click", () => {
        window.scrollTo({ top: 0, behavior: "smooth" });
    });
}

document.getElementById("visorImagen")?.addEventListener("click", (event) => {
    if (event.target.id === "visorImagen" || event.target.id === "imagenGrande") {
        event.currentTarget.style.display = "none";
    }
});

cargarOro();
