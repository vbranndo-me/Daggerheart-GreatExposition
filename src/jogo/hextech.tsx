// Botão hextech: a peça especial, só para as ações que pedem destaque (rolar os bilhetes,
// entregar o convite, próximo capítulo...). Moldura de ouro hexagonal com joias nas pontas
// e, dentro, um cristal escuro com energia viva: brilhos que respiram e fios de luz que correm.
// Em repouso a energia é calma; no hover ela acende, a moldura brilha e um reflexo atravessa;
// no clique, uma onda sai do ponto clicado. Pausa fora da tela e respeita prefers-reduced-motion.
import { useEffect, useRef, useState, type ReactNode } from "react";

type Tema = "ciano" | "ambar" | "noite";
type RGB = [number, number, number];
// Paleta de cada versão do botão: energia (base/claro/pálido/brilho/meio), joias e cristal.
const TEMAS: Record<Tema, { base: RGB; claro: RGB; palido: RGB; brilho: RGB; meio: RGB; sombra: string; joia: [string, string, string]; cristal: [string, string, string]; glow: string }> = {
  ciano: { base: [10, 200, 185], claro: [160, 246, 238], palido: [205, 250, 250], brilho: [225, 255, 252], meio: [120, 240, 228], sombra: "#5ff2e4", joia: ["#e6fffd", "#0ac8b9", "#035a63"], cristal: ["#0c6470", "#083340", "#04131b"], glow: "10,200,185" },
  ambar: { base: [232, 150, 40], claro: [255, 222, 150], palido: [255, 236, 190], brilho: [255, 246, 220], meio: [246, 190, 90], sombra: "#ffcf70", joia: ["#fff4d6", "#e8a030", "#7a4a0c"], cristal: ["#7a4a14", "#3d2410", "#170d07"], glow: "232,150,40" },
  noite: { base: [90, 120, 230], claro: [170, 190, 255], palido: [205, 215, 255], brilho: [230, 236, 255], meio: [130, 150, 240], sombra: "#9db0ff", joia: ["#eef1ff", "#6a84e8", "#1c2a7a"], cristal: ["#2a3a8a", "#141d4a", "#070a1c"], glow: "90,120,230" },
};
const cor = (c: RGB, a: number) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;

const PONTA = 18; // largura da ponta do hexágono (px)

function hexagono(w: number, h: number, inset: number) {
  const p = PONTA - inset * 0.414; // mantém o ângulo das pontas paralelo
  return [
    [p + inset, inset],
    [w - p - inset, inset],
    [w - inset, h / 2],
    [w - p - inset, h - inset],
    [p + inset, h - inset],
    [inset, h / 2],
  ]
    .map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`)
    .join(" ");
}

export function BotaoHextech({
  children,
  onClick,
  disabled,
  grande,
  ativo = true,
  tema = "ciano",
  redondo,
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  grande?: boolean;
  /** false = apagado (opção não escolhida num par de botões) */
  ativo?: boolean;
  /** cor da energia e das joias */
  tema?: Tema;
  /** versão circular, compacta */
  redondo?: boolean;
}) {
  const T = TEMAS[tema];
  const btn = useRef<HTMLButtonElement>(null);
  const cv = useRef<HTMLCanvasElement>(null);
  const [tam, setTam] = useState({ w: 0, h: 0 });
  const estado = useRef({ hover: 0, alvo: 0, ondas: [] as { x: number; y: number; t: number }[], faiscas: [] as { x: number; y: number; vx: number; vy: number; vida: number; max: number }[] });

  // mede o botão para desenhar a moldura com ângulos certos
  useEffect(() => {
    const el = btn.current!;
    const medir = () => setTam({ w: el.offsetWidth, h: el.offsetHeight });
    medir();
    const ro = new ResizeObserver(medir);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // energia dentro do cristal
  useEffect(() => {
    const canvas = cv.current;
    const el = btn.current;
    if (!canvas || !el || !tam.w) return;
    const reduzir = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const ctx = canvas.getContext("2d")!;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const { w, h } = tam;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    const E = estado.current;
    let raf = 0;
    let ultimo = 0;
    let visivel = true;
    const semente = Math.random() * 100;
    const fios = Array.from({ length: 5 }, (_, i) => ({
      base: 0.28 + (i / 4) * 0.44,
      amp: 0.1 + Math.random() * 0.12,
      f1: 1.2 + Math.random() * 1.6,
      f2: 2.5 + Math.random() * 3,
      vel: 0.5 + Math.random() * 0.7,
      fase: Math.random() * 10,
    }));

    const quadro = (agora: number) => {
      const dt = Math.min(0.05, (agora - (ultimo || agora)) / 1000);
      ultimo = agora;
      const t = agora / 1000 + semente;
      E.hover += (E.alvo - E.hover) * Math.min(1, dt * 6);
      const forca = disabled ? 0 : 0.35 + E.hover * 0.65;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      ctx.globalCompositeOperation = "lighter";

      // brilhos que respiram (névoa de cristal)
      const blobs = [
        [0.3 + Math.sin(t * 0.7) * 0.15, 0.6 + Math.cos(t * 0.9) * 0.2, 0.9],
        [0.7 + Math.cos(t * 0.5) * 0.15, 0.4 + Math.sin(t * 1.1) * 0.2, 0.8],
        [0.5 + Math.sin(t * 0.33) * 0.3, 0.9, 1.1],
      ];
      for (const [bx, by, br] of blobs) {
        const g = ctx.createRadialGradient(bx * w, by * h, 0, bx * w, by * h, br * h * 1.3);
        g.addColorStop(0, cor(T.base, 0.22 * forca));
        g.addColorStop(1, cor(T.base, 0));
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, w, h);
      }

      // fios de energia correndo pelo cristal
      ctx.lineCap = "round";
      ctx.shadowColor = T.sombra;
      for (const f of fios) {
        const N = 48;
        ctx.beginPath();
        for (let i = 0; i <= N; i++) {
          const s = i / N;
          const x = s * w;
          const y =
            h * (f.base + Math.sin(s * Math.PI * f.f1 + t * f.vel * 2 + f.fase) * f.amp + Math.sin(s * Math.PI * f.f2 - t * f.vel * 3) * f.amp * 0.4);
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        const g = ctx.createLinearGradient(0, 0, w, 0);
        const a = 0.14 + 0.3 * forca;
        g.addColorStop(0, cor(T.claro, 0));
        g.addColorStop(0.5, cor(T.palido, a));
        g.addColorStop(1, cor(T.claro, 0));
        ctx.strokeStyle = g;
        ctx.lineWidth = 0.8 + E.hover * 0.3;
        ctx.shadowBlur = 5 + E.hover * 5;
        ctx.stroke();

        // clarão: uma mancha de luz difusa que desliza pelo cristal no hover,
        // seguindo o fio só de longe (sem traço nítido)
        if (E.hover > 0.05) {
          const s = ((t * f.vel * 0.3 + f.fase) % 1.6) - 0.3;
          if (s > -0.2 && s < 1.2) {
            const x = s * w;
            const y =
              h * (f.base + Math.sin(s * Math.PI * f.f1 + t * f.vel * 2 + f.fase) * f.amp + Math.sin(s * Math.PI * f.f2 - t * f.vel * 3) * f.amp * 0.4);
            const r = h * 0.55;
            const borda = Math.min(1, Math.max(0, Math.min(s + 0.2, 1.2 - s) * 3)); // some ao chegar nas pontas
            ctx.save();
            ctx.translate(x, y);
            ctx.scale(1.8, 1); // mancha alongada no sentido do fluxo
            const brilho = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
            brilho.addColorStop(0, cor(T.brilho, 0.22 * E.hover * borda));
            brilho.addColorStop(0.45, cor(T.meio, 0.09 * E.hover * borda));
            brilho.addColorStop(1, cor(T.meio, 0));
            ctx.shadowBlur = 0;
            ctx.fillStyle = brilho;
            ctx.beginPath();
            ctx.arc(0, 0, r, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
          }
        }
      }

      // faíscas subindo (hover)
      if (E.hover > 0.3 && Math.random() < dt * 14)
        E.faiscas.push({ x: Math.random() * w, y: h * (0.6 + Math.random() * 0.4), vx: (Math.random() - 0.5) * 10, vy: -(14 + Math.random() * 22), vida: 0, max: 0.6 + Math.random() * 0.6 });
      for (let i = E.faiscas.length - 1; i >= 0; i--) {
        const p = E.faiscas[i];
        p.vida += dt;
        if (p.vida > p.max) {
          E.faiscas.splice(i, 1);
          continue;
        }
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        const k = 1 - p.vida / p.max;
        ctx.fillStyle = cor(T.palido, k * 0.9);
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 0.6 + k, 0, Math.PI * 2);
        ctx.fill();
      }

      // onda do clique
      for (let i = E.ondas.length - 1; i >= 0; i--) {
        const o = E.ondas[i];
        o.t += dt;
        if (o.t > 0.6) {
          E.ondas.splice(i, 1);
          continue;
        }
        const k = o.t / 0.6;
        ctx.strokeStyle = cor(T.palido, (1 - k) * 0.9);
        ctx.lineWidth = 2 * (1 - k) + 0.5;
        ctx.shadowBlur = 14;
        ctx.beginPath();
        ctx.arc(o.x, o.y, 6 + k * w * 0.6, 0, Math.PI * 2);
        ctx.stroke();
      }

      ctx.shadowBlur = 0;
      ctx.globalCompositeOperation = "source-over";
      if (visivel && !document.hidden) raf = requestAnimationFrame(quadro);
      else raf = 0;
    };

    const iniciar = () => {
      if (!raf) {
        ultimo = 0;
        raf = requestAnimationFrame(quadro);
      }
    };
    if (reduzir) {
      // um quadro parado, sem movimento
      quadro(performance.now());
      cancelAnimationFrame(raf);
      raf = 0;
      return;
    }
    const io = new IntersectionObserver(([e]) => {
      visivel = e.isIntersecting;
      if (visivel) iniciar();
    });
    io.observe(el);
    const vis = () => !document.hidden && visivel && iniciar();
    document.addEventListener("visibilitychange", vis);
    iniciar();
    return () => {
      cancelAnimationFrame(raf);
      io.disconnect();
      document.removeEventListener("visibilitychange", vis);
    };
  }, [tam, disabled, tema]);

  const { w, h } = tam;
  const gid = useRef(`hx${Math.random().toString(36).slice(2, 8)}`).current;
  return (
    <span className={`hx-envolta ${disabled ? "desligado" : ""} ${ativo ? "" : "apagado"}`} style={{ ["--hx-glow" as string]: T.glow }}>
    <button
      ref={btn}
      type="button"
      className={`hextech ${grande ? "grande" : ""} ${redondo ? "redondo" : ""}`}
      disabled={disabled}
      onPointerEnter={() => (estado.current.alvo = 1)}
      onPointerLeave={() => (estado.current.alvo = 0)}
      onFocus={() => (estado.current.alvo = 1)}
      onBlur={() => (estado.current.alvo = 0)}
      onClick={(e) => {
        const r = btn.current!.getBoundingClientRect();
        estado.current.ondas.push({ x: e.clientX - r.left || r.width / 2, y: e.clientY - r.top || r.height / 2, t: 0 });
        btn.current!.classList.remove("hx-pulso");
        void btn.current!.offsetWidth;
        btn.current!.classList.add("hx-pulso");
        onClick?.();
      }}
      style={w ? redondo ? { clipPath: "circle(50%)" } : { clipPath: `polygon(${hexagono(w, h, 0).split(" ").map((p) => p.replace(",", "px ") + "px").join(", ")})` } : undefined}
    >
      <span className="hx-cristal" style={{ background: `radial-gradient(ellipse at 50% 135%, ${T.cristal[0]} 0%, ${T.cristal[1]} 42%, ${T.cristal[2]} 100%)` }} />
      <canvas ref={cv} className="hx-energia" aria-hidden="true" />
      <span className="hx-reflexo" aria-hidden="true" />
      {w > 0 && redondo && (
        <svg className="hx-moldura" width={w} height={h} aria-hidden="true">
          <defs>
            <linearGradient id={`${gid}-ouro`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#f0e6d2" />
              <stop offset=".35" stopColor="#c8aa6e" />
              <stop offset=".7" stopColor="#a07c3c" />
              <stop offset="1" stopColor="#785a28" />
            </linearGradient>
            <radialGradient id={`${gid}-joia`} cx=".4" cy=".35" r=".8">
              <stop offset="0" stopColor={T.joia[0]} />
              <stop offset=".4" stopColor={T.joia[1]} />
              <stop offset="1" stopColor={T.joia[2]} />
            </radialGradient>
          </defs>
          <circle className="hx-borda" cx={w / 2} cy={h / 2} r={w / 2 - 1.5} fill="none" stroke={`url(#${gid}-ouro)`} strokeWidth="3" />
          <circle cx={w / 2} cy={h / 2} r={w / 2 - 6.5} fill="none" stroke="#c8aa6e" strokeOpacity=".55" strokeWidth="1" />
          <circle className="hx-anel-giro" cx={w / 2} cy={h / 2} r={w / 2 - 10.5} fill="none" stroke="#f0e6d2" strokeOpacity=".55" strokeWidth="1.4" strokeDasharray="1.2 5.2" />
          {[[w / 2, 5], [w - 5, h / 2], [w / 2, h - 5], [5, h / 2]].map(([x, y], i) => (
            <g key={i} className="hx-joia">
              <path d={`M${x} ${y - 5} L${x + 3.6} ${y} L${x} ${y + 5} L${x - 3.6} ${y} Z`} fill={`url(#${gid}-joia)`} stroke="#f0e6d2" strokeWidth=".8" />
            </g>
          ))}
        </svg>
      )}
      {w > 0 && !redondo && (
        <svg className="hx-moldura" width={w} height={h} aria-hidden="true">
          <defs>
            <linearGradient id={`${gid}-ouro`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#f0e6d2" />
              <stop offset=".35" stopColor="#c8aa6e" />
              <stop offset=".7" stopColor="#a07c3c" />
              <stop offset="1" stopColor="#785a28" />
            </linearGradient>
            <radialGradient id={`${gid}-joia`} cx=".4" cy=".35" r=".8">
              <stop offset="0" stopColor={T.joia[0]} />
              <stop offset=".4" stopColor={T.joia[1]} />
              <stop offset="1" stopColor={T.joia[2]} />
            </radialGradient>
          </defs>
          <polygon className="hx-borda" points={hexagono(w, h, 1.25)} fill="none" stroke={`url(#${gid}-ouro)`} strokeWidth="2.5" />
          <polygon className="hx-linha" points={hexagono(w, h, 5)} fill="none" stroke="#c8aa6e" strokeOpacity=".55" strokeWidth="1" />
          {/* joias nas pontas */}
          {[6.5, w - 6.5].map((x, i) => (
            <g key={i} className="hx-joia">
              <path d={`M${x} ${h / 2 - 5.5} L${x + 4} ${h / 2} L${x} ${h / 2 + 5.5} L${x - 4} ${h / 2} Z`} fill={`url(#${gid}-joia)`} stroke="#f0e6d2" strokeWidth=".8" />
            </g>
          ))}
          {/* frisos no topo e na base */}
          <path d={`M${w / 2 - 22} 1.5 L${w / 2} 5.5 L${w / 2 + 22} 1.5`} fill="none" stroke="#f0e6d2" strokeOpacity=".8" strokeWidth="1" />
          <path d={`M${w / 2 - 22} ${h - 1.5} L${w / 2} ${h - 5.5} L${w / 2 + 22} ${h - 1.5}`} fill="none" stroke="#f0e6d2" strokeOpacity=".8" strokeWidth="1" />
        </svg>
      )}
      <span className="hx-texto">{children}</span>
    </button>
    </span>
  );
}
