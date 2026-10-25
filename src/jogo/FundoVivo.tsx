// O fundo vivo: poeira no ar, feixe de luz e cinza/brasa, num <canvas> só, contínuo e sutil.
// Portado de prova-fundo-vivo.html: os valores foram escolhidos olhando para ela (intensidade 2×, velocidade 2×).
// Fica por cima do fundo e da arte e por baixo do HUD e das janelas. Nunca depende de a aba estar "visível" para existir.
import { useEffect, useRef, useSyncExternalStore } from "react";

/** Intensidade e velocidade escolhidas pelo mestre, em relação aos valores-base da prova. */
const AMB = 2;
const VEL = 2;
/** Se a cinza atrapalhar a leitura de um parágrafo longo, reduza SÓ esta opacidade (não a da poeira). Valor da prova: 0.22. */
const OPACIDADE_CINZA = 0.22;

// ---------- o interruptor "Ambiente" (guardado no navegador, dentro de try/catch) ----------
const CHAVE = "sz-ambiente";
let ligado = (() => {
  try {
    return localStorage.getItem(CHAVE) !== "0";
  } catch {
    return true;
  }
})();
let reducoes = 0; // quantas coisas pedem o ambiente pela metade (sorteio, convite)
const inscritos = new Set<() => void>();
const avisar = () => inscritos.forEach((f) => f());
const assinar = (f: () => void) => {
  inscritos.add(f);
  return () => inscritos.delete(f);
};
export function useAmbiente() {
  const v = useSyncExternalStore(assinar, () => ligado);
  return {
    ligado: v,
    alternar: () => {
      ligado = !ligado;
      try {
        localStorage.setItem(CHAVE, ligado ? "1" : "0");
      } catch {
        /* sem localStorage o interruptor vale só nesta visita */
      }
      avisar();
    },
  };
}
/** Enquanto `quando` for verdadeiro, o ambiente cai pela metade (para não competir com uma animação principal). */
export function useAmbientePelaMetade(quando: boolean) {
  useEffect(() => {
    if (!quando) return;
    reducoes++;
    avisar();
    return () => {
      reducoes--;
      avisar();
    };
  }, [quando]);
}

export function BotaoAmbiente() {
  const { ligado: v, alternar } = useAmbiente();
  return (
    <button className={`btn-hud ${v ? "ligado" : ""}`} onClick={alternar} aria-pressed={v} title="Ambiente: poeira, luz e cinza no fundo">
      Ambiente {v ? "·" : "×"}
    </button>
  );
}

const R = (a: number, b: number) => a + Math.random() * (b - a);
const camadas = [
  { n: 34, s: [0.5, 0.9], v: 4, o: 0.1 },
  { n: 18, s: [1, 1.6], v: 7, o: 0.13 },
  { n: 6, s: [2, 3.2], v: 12, o: 0.09 },
] as const;
const ANG = -0.42;

interface Grao {
  k: number;
  x: number;
  y: number;
  s: number;
  ph: number;
  fx: number;
  fy: number;
}
interface Cinza {
  x: number;
  y: number;
  s: number;
  ph: number;
  v: number;
  brasa: boolean;
}

/** `ativo` desliga tudo (telas de mapa). `fator` multiplica a intensidade (0,5 = pela metade). */
export function FundoVivo({ ativo = true, fator = 1 }: { ativo?: boolean; fator?: number }) {
  const cv = useRef<HTMLCanvasElement>(null);
  const ligadoAgora = useAmbiente().ligado;
  const meia = useSyncExternalStore(assinar, () => reducoes > 0);
  const f = useRef(1);
  f.current = (meia ? 0.5 : 1) * fator;
  const vivo = ativo && ligadoAgora;

  useEffect(() => {
    const canvas = cv.current;
    if (!canvas || !vivo) return;
    const g = canvas.getContext("2d");
    if (!g) return;
    const parado = !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    let W = 0;
    let H = 0;
    const fit = () => {
      const DPR = Math.min(1.5, window.devicePixelRatio || 1);
      W = window.innerWidth;
      H = window.innerHeight;
      canvas.width = W * DPR;
      canvas.height = H * DPR;
      g.setTransform(DPR, 0, 0, DPR, 0, 0);
    };
    fit();

    const poeira: Grao[] = [];
    camadas.forEach((c, k) => {
      for (let i = 0; i < c.n; i++) poeira.push({ k, x: R(0, 1), y: R(0, 1), s: R(c.s[0], c.s[1]), ph: R(0, 99), fx: R(0.05, 0.15), fy: R(0.04, 0.12) });
    });
    const cinza: Cinza[] = [];
    for (let i = 0; i < 22; i++) cinza.push({ x: R(0, 1), y: R(0, 1), s: R(0.8, 2), ph: R(0, 99), v: R(5, 11), brasa: i < 2 });

    const feixeInfo = (t: number) => ({ cx: W * 0.68 + Math.sin(t / 8000) * W * 0.03, larg: Math.max(160, W * 0.16), luz: 0.75 + 0.25 * Math.sin(t / 7900 + 1) });
    const noFeixe = (x: number, y: number, fx: { cx: number; larg: number }) => {
      const ux = Math.sin(-ANG);
      const uy = Math.cos(-ANG);
      const d = Math.abs((x - fx.cx) * uy - y * ux);
      return Math.max(0, 1 - d / (fx.larg / 2));
    };

    let ultimo = performance.now();
    let quadro = 0;
    const desenhar = (t: number, passo: number) => {
      const amb = AMB * f.current;
      const dt = Math.min(64, passo) * VEL;
      g.clearRect(0, 0, W, H);
      const fx = feixeInfo(t * VEL);
      // feixe: faixa diagonal vinda do alto à direita
      g.save();
      g.translate(fx.cx, 0);
      g.rotate(ANG);
      const gr = g.createLinearGradient(-fx.larg / 2, 0, fx.larg / 2, 0);
      const a = (0.045 * amb * fx.luz).toFixed(3);
      gr.addColorStop(0, "rgba(232,200,140,0)");
      gr.addColorStop(0.5, `rgba(232,200,140,${a})`);
      gr.addColorStop(1, "rgba(232,200,140,0)");
      g.fillStyle = gr;
      g.fillRect(-fx.larg / 2, -H * 0.2, fx.larg, H * 2.2);
      g.restore();
      // poeira: deriva de senos com fases sorteadas por grão; brilha ao cruzar o feixe
      for (const p of poeira) {
        const c = camadas[p.k];
        p.ph += dt * 0.00035;
        p.x += (Math.sin(p.ph * p.fx * 7) * 0.6 + 0.15) * c.v * dt * 2e-6;
        p.y += (Math.cos(p.ph * p.fy * 9) * 0.5 - 0.35) * c.v * dt * 2e-6 * (W / H);
        if (p.x > 1.02) p.x = -0.02;
        if (p.x < -0.02) p.x = 1.02;
        if (p.y < -0.02) p.y = 1.02;
        if (p.y > 1.02) p.y = -0.02;
        const x = p.x * W;
        const y = p.y * H;
        const brilho = noFeixe(x, y, fx) * fx.luz;
        const al = Math.min(0.6, (c.o * (0.6 + 0.4 * Math.sin(p.ph * 3)) + brilho * 0.35) * amb);
        g.fillStyle = `rgba(236,220,182,${al.toFixed(3)})`;
        g.beginPath();
        g.arc(x, y, p.s * (1 + brilho * 0.4), 0, 7);
        g.fill();
      }
      // cinza e brasa: fuligem das chaminés; duas brasas pulsam em laranja
      for (const p of cinza) {
        p.ph += dt * 0.0006;
        p.y += (p.v * dt * 3) / 1e6;
        p.x += (Math.sin(p.ph) * 0.00012 * dt) / 16;
        if (p.y > 1.03) {
          p.y = -0.03;
          p.x = R(0, 1);
        }
        const x = p.x * W;
        const y = p.y * H;
        if (p.brasa) {
          const pul = 0.5 + 0.5 * Math.sin(p.ph * 2.3);
          g.fillStyle = `rgba(232,150,80,${(0.22 * amb * pul).toFixed(3)})`;
          g.beginPath();
          g.arc(x, y, p.s * 0.9, 0, 7);
          g.fill();
        } else {
          g.fillStyle = `rgba(120,112,100,${(OPACIDADE_CINZA * amb).toFixed(3)})`;
          g.save();
          g.translate(x, y);
          g.rotate(p.ph);
          g.fillRect(-p.s, -p.s * 0.5, p.s * 2, p.s);
          g.restore();
        }
      }
    };

    const loop = (t: number) => {
      const passo = t - ultimo;
      ultimo = t;
      desenhar(t, passo);
      quadro = requestAnimationFrame(loop);
    };
    desenhar(performance.now(), 0); // o primeiro quadro não espera o navegador
    if (!parado) quadro = requestAnimationFrame(loop);
    const aoRedimensionar = () => {
      fit();
      if (parado) desenhar(performance.now(), 0);
    };
    window.addEventListener("resize", aoRedimensionar);
    return () => {
      cancelAnimationFrame(quadro);
      window.removeEventListener("resize", aoRedimensionar);
    };
  }, [vivo]);

  if (!vivo) return null;
  return <canvas ref={cv} className="fundo-vivo" aria-hidden="true" />;
}
