// Efeitos sonoros da urna (Web Audio API, sem arquivos de áudio)

const Som = (() => {
    let ctx = null;

    function iniciar() {
        if (!ctx) {
            const AC = window.AudioContext || window.webkitAudioContext;
            if (AC) ctx = new AC();
        }
        if (ctx && ctx.state === "suspended") ctx.resume();
    }

    function bip(freq, inicio, duracao, volume = 0.12) {
        if (!ctx) return;
        const osc = ctx.createOscillator();
        const ganho = ctx.createGain();
        const t = ctx.currentTime + inicio;
        osc.type = "square";
        osc.frequency.value = freq;
        ganho.gain.setValueAtTime(volume, t);
        ganho.gain.exponentialRampToValueAtTime(0.001, t + duracao);
        osc.connect(ganho).connect(ctx.destination);
        osc.start(t);
        osc.stop(t + duracao);
    }

    return {
        iniciar,
        tecla: () => bip(1000, 0, 0.06),
        erro: () => bip(300, 0, 0.25),
        // "pi-li-li" ao confirmar cada voto
        confirma: () => { bip(1200, 0, 0.07); bip(1500, 0.09, 0.05); bip(1500, 0.16, 0.05); },
        // sequência longa no FIM
        fim: () => { for (let i = 0; i < 10; i++) bip(i % 2 ? 1100 : 1500, i * 0.09, 0.07); bip(1300, 1, 0.6); }
    };
})();
