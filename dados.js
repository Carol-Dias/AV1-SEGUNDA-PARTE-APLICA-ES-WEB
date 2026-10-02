// Carga e integração dos JSONs dos partidos do grupo

const CARGOS_VALIDOS = {
    "Presidente": 2,
    "Governador(a)": 2,
    "Senador(a)": 3,
    "Deputado(a) Federal": 4,
    "Deputado(a) Estadual": 5
};

let candidatos = [];

// Utilitário para criar elementos de forma segura (textContent)
function el(tag, classe, texto) {
    const e = document.createElement(tag);
    if (classe) e.className = classe;
    if (texto !== undefined) e.textContent = texto;
    return e;
}

async function carregarPartidos() {
    const status = [];
    let manifesto;

    try {
        const resp = await fetch("partidos.json");
        if (!resp.ok) throw new Error("HTTP " + resp.status);
        manifesto = (await resp.json()).partidos;
    } catch (erro) {
        console.error(erro);
        return { candidatos: [], status: [{ ok: false, texto: "Não foi possível ler partidos.json. Abra a urna por um servidor local (Live Server)." }] };
    }

    // Lê todos os arquivos dos partidos em paralelo
    const resultados = await Promise.all(manifesto.map(async partido => {
        try {
            const resp = await fetch(partido.arquivo);
            if (!resp.ok) throw new Error("HTTP " + resp.status);
            const lista = await resp.json();
            if (!Array.isArray(lista)) throw new Error("JSON não é uma lista");
            return { partido, lista };
        } catch (erro) {
            return { partido, erro };
        }
    }));

    candidatos = [];

    resultados.forEach(({ partido, lista, erro }) => {
        if (erro) {
            status.push({ ok: false, texto: `${partido.sigla}: não foi possível carregar ${partido.arquivo}` });
            return;
        }

        let aceitos = 0, ignorados = 0;

        lista.forEach(c => {
            const numero = String(c.numero);
            const digitos = CARGOS_VALIDOS[c.cargo];
            const valido = c.nome && digitos && numero.length === digitos && numero.startsWith(partido.numero);
            const duplicado = candidatos.some(x => x.cargo === c.cargo && x.numero === numero);

            if (!valido || duplicado) {
                ignorados++;
                console.warn("Candidatura ignorada:", c);
                return;
            }

            candidatos.push({
                nome: c.nome,
                numero: numero,
                foto: c.foto,
                cargo: c.cargo,
                partido: partido.sigla,
                numeroPartido: partido.numero
            });
            aceitos++;
        });

        status.push({ ok: true, texto: `${partido.sigla}: ${aceitos} candidato(s)` + (ignorados ? ` (${ignorados} ignorado(s))` : "") });
    });

    return { candidatos, status };
}

function buscarCandidato(cargo, numero) {
    return candidatos.find(c => c.cargo === cargo && c.numero === numero) || null;
}

// Fotos sem endereço completo ficam na pasta fotos/
function resolverFoto(foto) {
    if (!foto) return "";
    return /^(https?:|data:|\/|\.{1,2}\/|fotos\/)/i.test(foto) ? foto : "fotos/" + foto;
}
