// Lógica de fluxo da urna: teclas, votação em sequência e encerramento

// Ordem oficial dos cargos na urna (2026: dois votos para Senador)
const FLUXO = [
    { cargo: "Deputado(a) Federal", titulo: "Deputado Federal", digitos: 4 },
    { cargo: "Deputado(a) Estadual", titulo: "Deputado Estadual", digitos: 5 },
    { cargo: "Senador(a)", titulo: "Senador", digitos: 3, ordem: "1º voto" },
    { cargo: "Senador(a)", titulo: "Senador", digitos: 3, ordem: "2º voto" },
    { cargo: "Governador(a)", titulo: "Governador", digitos: 2 },
    { cargo: "Presidente", titulo: "Presidente", digitos: 2 }
];

const TEMPO_FIM_MS = 4000;

const FOTO_PADRAO = "data:image/svg+xml;utf8," + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 90 120"><rect width="90" height="120" fill="#ccc"/><circle cx="45" cy="42" r="20" fill="#888"/><rect x="15" y="70" width="60" height="50" rx="25" fill="#888"/></svg>'
);

const estado = {
    fase: "carregando",   // carregando | votando | fim | encerrada | erro
    passo: 0,
    digitos: "",
    branco: false,
    msg: "",
    votos: [],            // votos do eleitor atual
    eleitores: [],        // todos os eleitores que já votaram
    timer: null
};

function candidatoAtual() {
    const p = FLUXO[estado.passo];
    if (estado.digitos.length < p.digitos) return null;
    return buscarCandidato(p.cargo, estado.digitos);
}

// ---------- TELA ----------

function render() {
    const tela = document.getElementById("tela");
    tela.replaceChildren();

    if (estado.fase === "carregando") { tela.append(el("p", "msg", "Carregando candidatos...")); return; }
    if (estado.fase === "erro") { tela.append(el("p", "msg", "Nenhum candidato carregado. Veja as mensagens abaixo da urna.")); return; }
    if (estado.fase === "fim") { tela.append(el("div", "fim", "F I M"), el("div", "sub", "VOTOU")); return; }
    if (estado.fase === "encerrada") { tela.append(el("div", "fim pequeno", "VOTAÇÃO ENCERRADA")); return; }

    const p = FLUXO[estado.passo];
    const completo = estado.digitos.length === p.digitos;

    tela.append(el("div", "topo", "SEU VOTO PARA"));

    const cargo = el("div", "cargo", p.titulo);
    if (p.ordem) cargo.append(el("small", "", " – " + p.ordem));
    tela.append(cargo);

    if (!estado.branco) {
        const caixas = el("div", "digitos");
        for (let i = 0; i < p.digitos; i++) caixas.append(el("span", "caixa", estado.digitos[i] || ""));
        tela.append(caixas);
    }

    const info = el("div", "info");

    if (estado.branco) {
        info.append(el("div", "aviso", "VOTO EM BRANCO"));
    } else if (completo) {
        const c = candidatoAtual();
        if (c) {
            const img = el("img", "foto");
            img.alt = "Foto de " + c.nome;
            img.onerror = () => { img.onerror = null; img.src = FOTO_PADRAO; };
            img.src = resolverFoto(c.foto);
            const dados = el("div", "dados");
            dados.append(el("p", "", "Nome: " + c.nome), el("p", "", "Partido: " + c.partido + " (" + c.numeroPartido + ")"));
            info.append(img, dados);
        } else {
            info.append(el("div", "aviso", "NÚMERO ERRADO"), el("div", "aviso", "VOTO NULO"));
        }
    }
    tela.append(info);

    if (estado.msg) tela.append(el("div", "aviso erro", estado.msg));

    if (estado.branco || completo) {
        tela.append(el("div", "rodape", "Aperte a tecla:\nCONFIRMA para CONFIRMAR este voto\nCORRIGE para REINICIAR este voto"));
    }
}

// ---------- TECLAS ----------

function digitar(d) {
    if (estado.fase !== "votando" || estado.branco) return;
    if (estado.digitos.length >= FLUXO[estado.passo].digitos) return;
    Som.iniciar();
    Som.tecla();
    estado.msg = "";
    estado.digitos += d;
    render();
}

function teclaBranco() {
    if (estado.fase !== "votando" || estado.digitos.length > 0) return;
    Som.iniciar();
    Som.tecla();
    estado.branco = true;
    render();
}

function teclaCorrige() {
    if (estado.fase !== "votando") return;
    Som.iniciar();
    Som.tecla();
    estado.digitos = "";
    estado.branco = false;
    estado.msg = "";
    render();
}

function teclaConfirma() {
    if (estado.fase !== "votando") return;
    Som.iniciar();

    const p = FLUXO[estado.passo];
    let voto;

    if (estado.branco) {
        voto = { cargo: p.cargo, tipo: "branco" };
    } else if (estado.digitos.length === p.digitos) {
        const c = candidatoAtual();
        if (c) {
            // No 2º voto para Senador não pode repetir o candidato do 1º
            const repetido = estado.votos.some(v => v.cargo === p.cargo && v.tipo === "candidato" && v.numero === c.numero);
            if (repetido) {
                estado.msg = "CANDIDATO JÁ ESCOLHIDO NO 1º VOTO";
                Som.erro();
                render();
                return;
            }
            voto = { cargo: p.cargo, tipo: "candidato", numero: c.numero, nome: c.nome, partido: c.partido };
        } else {
            voto = { cargo: p.cargo, tipo: "nulo", numero: estado.digitos };
        }
    } else {
        return; // número incompleto: CONFIRMA não faz nada
    }

    estado.votos.push(voto);
    estado.passo++;
    estado.digitos = "";
    estado.branco = false;
    estado.msg = "";

    if (estado.passo >= FLUXO.length) {
        finalizarEleitor();
    } else {
        Som.confirma();
        render();
    }
}

// ---------- ELEITORES E ENCERRAMENTO ----------

function finalizarEleitor() {
    estado.eleitores.push({
        eleitor: estado.eleitores.length + 1,
        horario: new Date().toISOString(),
        votos: estado.votos
    });
    estado.votos = [];
    estado.passo = 0;
    estado.fase = "fim";
    Som.fim();
    render();

    // Volta para o próximo eleitor depois de alguns segundos
    estado.timer = setTimeout(() => { estado.fase = "votando"; render(); }, TEMPO_FIM_MS);
}

function encerrarVotacao() {
    if (estado.fase === "carregando" || estado.fase === "encerrada") return;
    if (!confirm("Encerrar a votação? Um eleitor com voto incompleto será descartado.")) return;

    clearTimeout(estado.timer);
    estado.votos = [];
    estado.digitos = "";
    estado.branco = false;
    estado.fase = "encerrada";

    baixarJSON("votos.json", estado.eleitores);
    render();
    mostrarBoletim(estado.eleitores, candidatos);
}

// ---------- EVENTOS ----------

document.querySelectorAll("[data-tecla]").forEach(botao => {
    botao.addEventListener("click", () => {
        const t = botao.dataset.tecla;
        if (t === "confirma") teclaConfirma();
        else if (t === "corrige") teclaCorrige();
        else if (t === "branco") teclaBranco();
        else digitar(t);
        botao.blur();
    });
});

document.addEventListener("keydown", e => {
    if (estado.fase === "encerrada") return;
    let tratada = true;

    if (/^[0-9]$/.test(e.key)) digitar(e.key);
    else if (e.key === "Enter") teclaConfirma();
    else if (e.key === "Backspace" || e.key === "Delete") teclaCorrige();
    else if (e.key.toLowerCase() === "b") teclaBranco();
    else tratada = false;

    if (tratada) e.preventDefault();
});

document.getElementById("btnEncerrar").addEventListener("click", encerrarVotacao);
document.getElementById("btnBaixar").addEventListener("click", () => baixarJSON("votos.json", estado.eleitores));
document.getElementById("btnNova").addEventListener("click", () => location.reload());

window.addEventListener("beforeunload", e => {
    if (estado.eleitores.length > 0 && estado.fase !== "encerrada") { e.preventDefault(); e.returnValue = ""; }
});

// ---------- INÍCIO ----------

async function iniciar() {
    render();
    const resultado = await carregarPartidos();

    const lista = document.getElementById("statusPartidos");
    resultado.status.forEach(s => lista.append(el("li", s.ok ? "ok" : "falha", s.texto)));

    estado.fase = resultado.candidatos.length > 0 ? "votando" : "erro";
    render();
}

iniciar();
