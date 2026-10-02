// Exportação dos votos e Boletim de Urna (apuração)

function baixarJSON(nome, dados) {
    const blob = new Blob([JSON.stringify(dados, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = nome;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
}

function apurar(eleitores, listaCandidatos) {
    const resultado = {};

    Object.keys(CARGOS_VALIDOS).forEach(cargo => {
        resultado[cargo] = {
            candidatos: listaCandidatos.filter(c => c.cargo === cargo).map(c => ({ ...c, votos: 0 })),
            brancos: 0,
            nulos: 0
        };
    });

    eleitores.forEach(eleitor => eleitor.votos.forEach(voto => {
        const r = resultado[voto.cargo];
        if (voto.tipo === "branco") r.brancos++;
        else if (voto.tipo === "nulo") r.nulos++;
        else {
            const c = r.candidatos.find(x => x.numero === voto.numero);
            if (c) c.votos++;
        }
    }));

    return resultado;
}

function mostrarBoletim(eleitores, listaCandidatos) {
    const corpo = document.getElementById("boletimCorpo");
    corpo.replaceChildren(el("p", "", "Total de eleitores: " + eleitores.length));

    const resultado = apurar(eleitores, listaCandidatos);

    Object.entries(resultado).forEach(([cargo, r]) => {
        const tabela = el("table");
        const cab = el("tr");
        ["Número", "Candidato", "Partido", "Votos"].forEach(t => cab.append(el("th", "", t)));
        tabela.append(cab);

        const linha = (a, b, c, d, classe) => {
            const tr = el("tr", classe);
            [a, b, c, d].forEach(t => tr.append(el("td", "", String(t))));
            tabela.append(tr);
        };

        r.candidatos.sort((a, b) => b.votos - a.votos).forEach(c => linha(c.numero, c.nome, c.partido, c.votos));
        linha("", "Votos em branco", "", r.brancos);
        linha("", "Votos nulos", "", r.nulos);
        const total = r.candidatos.reduce((s, c) => s + c.votos, 0) + r.brancos + r.nulos;
        linha("", "Total de votos", "", total, "total");

        corpo.append(el("h3", "", cargo), tabela);
    });

    document.getElementById("boletim").hidden = false;
}
