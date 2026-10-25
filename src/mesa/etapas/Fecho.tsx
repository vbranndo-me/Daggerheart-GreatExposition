// Capítulo VII · Fecho do registro. O resumo da noite em qualidades. Exportar fica na Mesa.
import { useSessao } from "../../db/sala";
import { Insignia } from "../../jogo/componentes";
import { Gestao, Painel, normalizar } from "../pecas";
import { useVisao } from "../Casca";

export function Fecho() {
  const { sala, conteudo } = useSessao();
  const { mestre } = useVisao();
  const segUnicos = new Set(Object.values(sala.seguranca.itens || {}).map((i) => i.lista + normalizar(i.texto))).size;
  const linhas: [string, string, string | number][] = [
    ["cap-3", "Alfinetes no continente", Object.keys(sala.pins.continente || {}).length],
    ["cap-5", "Alfinetes em Rouillac", Object.keys(sala.pins.rouillac || {}).length],
    ["pavilhao", "Atrações no programa", Object.keys(sala.builder?.respostas || {}).length],
    ["cap-6", "Laços respondidos", Object.values(sala.lacos || {}).filter((l) => l.resposta).length],
    ["cap-2", "Linhas e véus", segUnicos],
  ];
  const tripulacao = Object.entries(sala.jogadores).sort((a, b) => (a[1].ordem ?? 0) - (b[1].ordem ?? 0));
  return (
    <Gestao n={7} titulo="Fecho do registro" colunas="minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1fr)">
      <Painel titulo="O registro">
        <p className="n-N" style={{ marginTop: 0 }}>O funcionário sopra a tinta, fecha o livro e amarra a fita. Tudo o que a mesa criou esta noite está registrado.</p>
        {mestre && <p className="n-I">Mestre: as exportações estão na Mesa, aba Exportar.</p>}
      </Painel>
      <Painel titulo="O que a mesa criou">
        <div className="qualidades" style={{ paddingLeft: 0 }}>
          {linhas.map(([i, n, v]) => (
            <div key={n} className="qualidade">
              <Insignia icone={i} tamanho={32} />
              <span className="nome">{n}</span>
              <span className="valor">{v}</span>
            </div>
          ))}
        </div>
      </Painel>
      <Painel titulo="Quem chegou">
        <div className="qualidades" style={{ paddingLeft: 0 }}>
          {tripulacao.map(([jid, j]) => {
            const p = sala.personagens[jid] || {};
            const pais = conteudo.paises.find((x) => x.id === p.pais)?.nome;
            const classe = conteudo.classes.find((x) => x.id === p.classe)?.nome;
            return (
              <div key={jid} className="qualidade">
                <span className="insignia" style={{ ["--t" as string]: "32px", background: `radial-gradient(circle at 45% 40%, ${j.cor}, #161a26 120%)` }}>
                  <span style={{ fontFamily: "var(--font-display)", color: "#0e1213", fontWeight: 700 }}>{j.nome.slice(0, 1)}</span>
                </span>
                <span className="nome">{j.nome}</span>
                <span className="valor" style={{ fontSize: 13 }}>
                  {[pais, classe].filter(Boolean).join(" · ") || "—"}
                </span>
              </div>
            );
          })}
        </div>
      </Painel>
    </Gestao>
  );
}
