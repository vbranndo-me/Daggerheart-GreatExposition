// O X de latão que fecha janelas e modais: sem círculo, só o metal gravado.
import { useId } from "react";

export function BotaoFechar({ aoClicar, rotulo = "fechar", tamanho = 30 }: { aoClicar: () => void; rotulo?: string; tamanho?: number }) {
  const g = useId();
  return (
    <button type="button" className="botao-fechar" onClick={aoClicar} aria-label={rotulo} title={rotulo}>
      <svg viewBox="0 0 24 24" width={tamanho} height={tamanho} aria-hidden="true">
        <defs>
          <linearGradient id={g} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#fbeab8" />
            <stop offset="0.35" stopColor="#d9bb74" />
            <stop offset="0.52" stopColor="#9d7f45" />
            <stop offset="1" stopColor="#b79b5c" />
          </linearGradient>
        </defs>
        <path d="M5 5 L19 19 M19 5 L5 19" stroke="#241a09" strokeWidth="6.2" strokeLinecap="square" fill="none" />
        <path d="M5 5 L19 19 M19 5 L5 19" stroke={`url(#${g})`} strokeWidth="4" strokeLinecap="square" fill="none" />
        <path d="M5.2 4.2 L19 18 M18.8 4.2 L5 18" stroke="rgba(255,244,214,0.6)" strokeWidth="0.7" fill="none" />
      </svg>
    </button>
  );
}
