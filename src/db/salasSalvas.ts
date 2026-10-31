// Lista de salas deste navegador: o banco só conhece a pessoa pela aba (login anônimo por aba),
// então quem é mestre de quê fica guardado aqui, com a chave de mestre de cada sala.
import { obterBackend, modoLocalForcado } from "./backend";

export interface SalaSalva {
  id: string;
  chave: string;
  criadaEm: number;
  visitadaEm: number;
  local: boolean;
}

const LS = "sz-salas-salvas";

export function lerSalasSalvas(): SalaSalva[] {
  try {
    const v = JSON.parse(localStorage.getItem(LS) || "[]");
    return Array.isArray(v) ? v.filter((s) => s && typeof s.id === "string" && typeof s.chave === "string") : [];
  } catch {
    return [];
  }
}

function gravar(lista: SalaSalva[]) {
  try {
    localStorage.setItem(LS, JSON.stringify(lista));
  } catch {
    /* sem storage: a lista some, as salas continuam valendo */
  }
}

/** guarda (ou atualiza a visita de) uma sala em que esta pessoa é mestre */
export function registrarSala(id: string, chave: string) {
  const local = modoLocalForcado();
  const lista = lerSalasSalvas();
  const i = lista.findIndex((s) => s.id === id);
  const agora = Date.now();
  if (i >= 0) lista[i] = { ...lista[i], chave, local, visitadaEm: agora };
  else lista.push({ id, chave, local, criadaEm: agora, visitadaEm: agora });
  gravar(lista);
}

/** tira da lista e, se der, apaga os dados da sala no banco */
export async function apagarSalaSalva(s: SalaSalva): Promise<boolean> {
  let apagouDados = false;
  if (s.local === modoLocalForcado()) {
    try {
      const b = await obterBackend();
      try {
        await b.set(`gmkeys/${s.id}`, s.chave);
      } catch {
        /* já existe */
      }
      await b.set(`salas/${s.id}/gmauth/${b.uid}`, s.chave);
      await b.remove(`salas/${s.id}`);
      apagouDados = true;
    } catch {
      /* sem conexão ou chave não confere: só some da lista */
    }
  }
  gravar(lerSalasSalvas().filter((x) => x.id !== s.id));
  return apagouDados;
}

export function linkMestre(s: SalaSalva) {
  return `#/s/${s.id}?m=${s.chave}${s.local ? "&local" : ""}`;
}

/** só tira da lista (a sala já foi apagada por outro caminho) */
export function esquecerSala(id: string) {
  gravar(lerSalasSalvas().filter((x) => x.id !== id));
}
