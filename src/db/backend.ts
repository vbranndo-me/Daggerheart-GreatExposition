// Camada fina sobre o banco. Duas implementações:
//  - Firebase Realtime Database (a de verdade, para a sessão);
//  - Local: guarda tudo no localStorage e sincroniza as abas DESTE navegador.
//    Serve para ensaiar e testar antes de configurar o Firebase. Imita as regras de leitura
//    do privado, para dar para testar o segredo numa terceira aba.
import { firebaseConfig, firebaseConfigurado } from "../firebase-config";

export type Unsub = () => void;

export interface Backend {
  tipo: "firebase" | "local";
  uid: string;
  on(path: string, cb: (val: any) => void, erro?: (e: Error) => void): Unsub;
  get(path: string): Promise<any>;
  set(path: string, val: any): Promise<void>;
  update(path: string, obj: Record<string, any>): Promise<void>;
  remove(path: string): Promise<void>;
  novaChave(): string;
  aoDesconectar(path: string, val: any): Promise<void>;
  cancelarDesconexao(path: string): Promise<void>;
  conectado(cb: (ok: boolean) => void): Unsub;
}

// ---------- utilidades ----------
const PUSH_CHARS = "-0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ_abcdefghijklmnopqrstuvwxyz";
export function chaveCronologica(): string {
  let t = Date.now();
  let s = "";
  for (let i = 0; i < 8; i++) {
    s = PUSH_CHARS.charAt(t % 64) + s;
    t = Math.floor(t / 64);
  }
  for (let i = 0; i < 12; i++) s += PUSH_CHARS.charAt(Math.floor(Math.random() * 64));
  return s;
}

const partes = (p: string) => p.split("/").filter(Boolean);

function lerCaminho(arvore: any, p: string): any {
  let n = arvore;
  for (const k of partes(p)) {
    if (n == null || typeof n !== "object") return null;
    n = n[k];
  }
  return n === undefined ? null : n;
}

function limpar(v: any): any {
  // remove nulos e objetos vazios, como o Firebase faz
  if (v === null || v === undefined) return null;
  if (Array.isArray(v)) {
    const o: any = {};
    v.forEach((x, i) => {
      const c = limpar(x);
      if (c !== null) o[i] = c;
    });
    return Object.keys(o).length ? o : null;
  }
  if (typeof v === "object") {
    const o: any = {};
    for (const [k, x] of Object.entries(v)) {
      const c = limpar(x);
      if (c !== null) o[k] = c;
    }
    return Object.keys(o).length ? o : null;
  }
  return v;
}

function escreverCaminho(arvore: any, p: string, val: any): any {
  const ks = partes(p);
  if (!ks.length) return limpar(val) ?? {};
  const raiz = arvore && typeof arvore === "object" ? { ...arvore } : {};
  let n = raiz;
  for (let i = 0; i < ks.length - 1; i++) {
    const k = ks[i];
    n[k] = n[k] && typeof n[k] === "object" ? { ...n[k] } : {};
    n = n[k];
  }
  const c = limpar(val);
  if (c === null) delete n[ks[ks.length - 1]];
  else n[ks[ks.length - 1]] = c;
  return limpar(raiz) ?? {};
}

// Arrays do Firebase voltam como objetos com chaves numéricas às vezes; normaliza.
export function comoLista<T>(v: any): T[] {
  if (!v) return [];
  if (Array.isArray(v)) return v.filter((x) => x != null);
  return Object.keys(v)
    .sort((a, b) => Number(a) - Number(b))
    .map((k) => v[k])
    .filter((x) => x != null);
}

// ---------- Local ----------
const LS_DB = "sz-banco-local";

function lerSessao(k: string): string | null {
  try {
    return sessionStorage.getItem(k);
  } catch {
    return null;
  }
}
function gravarSessao(k: string, v: string) {
  try {
    sessionStorage.setItem(k, v);
  } catch {
    /* sem storage */
  }
}

class BackendLocal implements Backend {
  tipo = "local" as const;
  uid: string;
  private arvore: any = {};
  private ouvintes = new Set<{ path: string; cb: (v: any) => void; erro?: (e: Error) => void; ultimo: string }>();
  private desconexao = new Map<string, any>();

  constructor() {
    this.uid = lerSessao("sz-uid-local") || "local-" + Math.random().toString(36).slice(2, 10);
    gravarSessao("sz-uid-local", this.uid);
    this.carregar();
    window.addEventListener("storage", (e) => {
      if (e.key === LS_DB) {
        this.carregar();
        this.notificar();
      }
    });
    window.addEventListener("pagehide", () => {
      for (const [p, v] of this.desconexao) this.arvore = escreverCaminho(this.arvore, p, v);
      this.salvar();
    });
  }
  private carregar() {
    try {
      this.arvore = JSON.parse(localStorage.getItem(LS_DB) || "{}") || {};
    } catch {
      this.arvore = {};
    }
  }
  private salvar() {
    try {
      localStorage.setItem(LS_DB, JSON.stringify(this.arvore));
    } catch {
      /* cheio ou bloqueado: segue só na memória */
    }
  }
  private ehMestre(sala: string) {
    return lerCaminho(this.arvore, `salas/${sala}/gmauth/${this.uid}`) != null;
  }
  // Imita as regras de leitura de database.rules.json
  private podeLer(p: string): boolean {
    const k = partes(p);
    if (k[0] === "gmkeys") return false;
    if (k[0] !== "salas" || k.length < 2) return false;
    const sala = k[1];
    if (this.ehMestre(sala)) return true;
    if (k.length === 2) return false;
    if (k[2] === "gmauth") return k[3] === this.uid;
    if (k[2] === "privado") {
      if (k.length < 4) return false;
      return lerCaminho(this.arvore, `salas/${sala}/jogadores/${k[3]}/uid`) === this.uid;
    }
    return true;
  }
  private podeEscrever(p: string, val: any): boolean {
    const k = partes(p);
    if (k[0] === "gmkeys") return lerCaminho(this.arvore, p) == null;
    if (k[0] === "salas" && k[2] === "gmauth") {
      return k[3] === this.uid && val === lerCaminho(this.arvore, `gmkeys/${k[1]}`);
    }
    return true;
  }
  private notificar() {
    for (const o of this.ouvintes) this.entregar(o);
  }
  private entregar(o: { path: string; cb: (v: any) => void; erro?: (e: Error) => void; ultimo: string }) {
    if (!this.podeLer(o.path)) {
      if (o.ultimo !== "__negado") {
        o.ultimo = "__negado";
        o.erro?.(new Error("permission_denied"));
      }
      return;
    }
    const v = lerCaminho(this.arvore, o.path);
    const s = JSON.stringify(v);
    if (s !== o.ultimo) {
      o.ultimo = s;
      o.cb(v == null ? null : JSON.parse(s));
    }
  }
  on(path: string, cb: (v: any) => void, erro?: (e: Error) => void): Unsub {
    const o = { path, cb, erro, ultimo: "\u0000" };
    this.ouvintes.add(o);
    queueMicrotask(() => this.entregar(o));
    return () => this.ouvintes.delete(o);
  }
  async get(path: string) {
    if (!this.podeLer(path)) throw new Error("permission_denied");
    return lerCaminho(this.arvore, path);
  }
  async set(path: string, val: any) {
    this.carregar();
    if (!this.podeEscrever(path, val)) throw new Error("permission_denied");
    this.arvore = escreverCaminho(this.arvore, path, val);
    this.salvar();
    this.notificar();
  }
  async update(path: string, obj: Record<string, any>) {
    this.carregar();
    for (const [k, v] of Object.entries(obj)) this.arvore = escreverCaminho(this.arvore, `${path}/${k}`, v);
    this.salvar();
    this.notificar();
  }
  async remove(path: string) {
    return this.set(path, null);
  }
  novaChave() {
    return chaveCronologica();
  }
  async aoDesconectar(path: string, val: any) {
    this.desconexao.set(path, val);
  }
  async cancelarDesconexao(path: string) {
    this.desconexao.delete(path);
  }
  conectado(cb: (ok: boolean) => void): Unsub {
    queueMicrotask(() => cb(true));
    return () => {};
  }
}

// ---------- Firebase ----------
async function criarFirebase(): Promise<Backend> {
  const { initializeApp } = await import("firebase/app");
  const { getAuth, signInAnonymously, setPersistence, browserSessionPersistence, onAuthStateChanged } = await import(
    "firebase/auth"
  );
  const db_ = await import("firebase/database");
  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  // Sessão por aba: cada aba é uma pessoa (dá para ensaiar com várias abas).
  // Um F5 mantém a mesma identidade; o nome escolhido fica salvo no navegador.
  await setPersistence(auth, browserSessionPersistence);
  const uid: string = await new Promise((ok, falha) => {
    const un = onAuthStateChanged(auth, (u) => {
      if (u) {
        un();
        ok(u.uid);
      }
    });
    signInAnonymously(auth).catch(falha);
  });
  const db = db_.getDatabase(app);
  const r = (p: string) => db_.ref(db, p);
  return {
    tipo: "firebase",
    uid,
    on(path, cb, erro) {
      return db_.onValue(r(path), (s) => cb(s.val()), (e) => erro?.(e));
    },
    async get(path) {
      return (await db_.get(r(path))).val();
    },
    set: (p, v) => db_.set(r(p), v ?? null),
    update: (p, o) => db_.update(r(p), o),
    remove: (p) => db_.remove(r(p)),
    novaChave: () => db_.push(r("_")).key!,
    aoDesconectar: (p, v) => db_.onDisconnect(r(p)).set(v),
    cancelarDesconexao: (p) => db_.onDisconnect(r(p)).cancel(),
    conectado(cb) {
      return db_.onValue(r(".info/connected"), (s) => cb(!!s.val()));
    },
  };
}

let instancia: Promise<Backend> | null = null;
export function modoLocalForcado() {
  return /[?&]local\b/.test(location.hash) || /[?&]local\b/.test(location.search);
}
export function obterBackend(): Promise<Backend> {
  if (!instancia) {
    instancia = firebaseConfigurado && !modoLocalForcado() ? criarFirebase() : Promise.resolve(new BackendLocal());
  }
  return instancia;
}
