import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { marked } from "marked";
import type { Jogador } from "../db/tipos";

// ---------- Markdown ----------
export function Markdown({ texto, className }: { texto: string; className?: string }) {
  const html = useMemo(() => marked.parse(texto || "", { async: false }) as string, [texto]);
  return <div className={className} dangerouslySetInnerHTML={{ __html: html }} />;
}

// ---------- Cabeça de alfinete / pessoa ----------
export function Cabeca({ cor, tamanho = 14 }: { cor: string; tamanho?: number }) {
  return <span className="cabeca" style={{ background: cor, width: tamanho, height: tamanho }} />;
}
export function PessoaChip({ j, voce }: { j: Jogador; voce?: boolean }) {
  return (
    <span className="pessoa-chip" title={j.online ? "na sala" : "fora da sala"}>
      <Cabeca cor={j.cor} />
      {j.nome}
      {voce && <span className="fraco">(você)</span>}
      <span className={"presenca" + (j.online ? " on" : "")} />
    </span>
  );
}

// ---------- Texto que salva sozinho ----------
// Mantém o que a pessoa está digitando e só aceita o valor remoto quando o campo não está em foco.
export function TextoVivo({
  valor,
  salvar,
  multilinha = true,
  desabilitado,
  placeholder,
  linhas = 3,
  atraso = 600,
  id,
}: {
  valor: string | undefined | null;
  salvar: (v: string) => void;
  multilinha?: boolean;
  desabilitado?: boolean;
  placeholder?: string;
  linhas?: number;
  atraso?: number;
  id?: string;
}) {
  const [local, setLocal] = useState(valor || "");
  const foco = useRef(false);
  const timer = useRef<number | undefined>(undefined);
  const pendente = useRef<string | null>(null);
  useEffect(() => {
    if (!foco.current && pendente.current == null) setLocal(valor || "");
  }, [valor]);
  const disparar = useCallback(() => {
    window.clearTimeout(timer.current);
    if (pendente.current != null) {
      const v = pendente.current;
      pendente.current = null;
      salvar(v);
    }
  }, [salvar]);
  useEffect(() => () => disparar(), [disparar]);
  const mudar = (v: string) => {
    setLocal(v);
    pendente.current = v;
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(disparar, atraso);
  };
  const props = {
    id,
    value: local,
    disabled: desabilitado,
    placeholder,
    onFocus: () => (foco.current = true),
    onBlur: () => {
      foco.current = false;
      disparar();
    },
  };
  return multilinha ? (
    <textarea {...props} rows={linhas} onChange={(e) => mudar(e.target.value)} />
  ) : (
    <input type="text" {...props} onChange={(e) => mudar(e.target.value)} />
  );
}

// ---------- Diálogos próprios ----------
type Pedido = { titulo: string; texto?: ReactNode; ok?: string; perigo?: boolean; resolver: (v: boolean) => void };
const DialogoCtx = createContext<(p: Omit<Pedido, "resolver">) => Promise<boolean>>(async () => false);
const ToastCtx = createContext<(t: string) => void>(() => {});

export function ProvedorDialogos({ children }: { children: ReactNode }) {
  const [pedido, setPedido] = useState<Pedido | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const tt = useRef<number | undefined>(undefined);
  const confirmar = useCallback(
    (p: Omit<Pedido, "resolver">) => new Promise<boolean>((resolver) => setPedido({ ...p, resolver })),
    [],
  );
  const avisar = useCallback((t: string) => {
    setToast(t);
    window.clearTimeout(tt.current);
    tt.current = window.setTimeout(() => setToast(null), 2600);
  }, []);
  const fechar = (v: boolean) => {
    pedido?.resolver(v);
    setPedido(null);
  };
  return (
    <DialogoCtx.Provider value={confirmar}>
      <ToastCtx.Provider value={avisar}>
        {children}
        {pedido && (
          <div className="veu" onMouseDown={(e) => e.target === e.currentTarget && fechar(false)}>
            <div className="cartao dialogo" role="dialog" aria-modal="true">
              <h3>{pedido.titulo}</h3>
              {pedido.texto && <div style={{ marginBottom: 16 }}>{pedido.texto}</div>}
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <button className="btn" onClick={() => fechar(false)} autoFocus>
                  cancelar
                </button>
                <button className={"btn " + (pedido.perigo ? "lacre" : "primario")} onClick={() => fechar(true)}>
                  {pedido.ok || "confirmar"}
                </button>
              </div>
            </div>
          </div>
        )}
        {toast && (
          <div className="toast" role="status">
            {toast}
          </div>
        )}
      </ToastCtx.Provider>
    </DialogoCtx.Provider>
  );
}
export const useConfirmar = () => useContext(DialogoCtx);
export const useAvisar = () => useContext(ToastCtx);

export async function copiar(texto: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(texto);
    return true;
  } catch {
    return false;
  }
}

export function SeloPrivado({ texto = "só o mestre vai ler isto" }: { texto?: string }) {
  return (
    <span className="selo-privado">
      <svg width="12" height="12" viewBox="0 0 24 24" aria-hidden="true">
        <path fill="currentColor" d="M6 10V8a6 6 0 1 1 12 0v2h1v12H5V10h1zm2 0h8V8a4 4 0 1 0-8 0v2z" />
      </svg>
      {texto}
    </span>
  );
}

export function nomeDe(jogadores: Record<string, Jogador>, jid: string | null | undefined) {
  if (!jid) return "—";
  if (jid === "mestre") return "Mestre";
  return jogadores[jid]?.nome || "alguém";
}
export function corDe(jogadores: Record<string, Jogador>, jid: string | null | undefined) {
  if (jid === "mestre") return "#221c15";
  return (jid && jogadores[jid]?.cor) || "#776a59";
}
export function jogadoresOrdenados(jogadores: Record<string, Jogador>): [string, Jogador][] {
  return Object.entries(jogadores).sort((a, b) => (a[1].ordem ?? 0) - (b[1].ordem ?? 0) || a[1].nome.localeCompare(b[1].nome));
}
