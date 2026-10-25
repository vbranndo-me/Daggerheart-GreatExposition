// Prólogo · Registro de chegada. Quem ainda não tem nome escolhe o seu (cada nome é um ramo);
// quem já entrou vê a tripulação chegando.
import { useState } from "react";
import { useSessao } from "../../db/sala";
import { Insignia, Ramo, Selo } from "../../jogo/componentes";
import { BotaoHextech } from "../../jogo/hextech";
import { Gestao, Painel } from "../pecas";
import { useVisao } from "../Casca";

export function Chegada({ escolher }: { escolher?: (jid: string) => Promise<void> }) {
  const { sala, uid, erroMestre } = useSessao();
  const { mestre } = useVisao();
  const [escolhido, setEscolhido] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const lista = Object.entries(sala.jogadores).sort((a, b) => (a[1].ordem ?? 0) - (b[1].ordem ?? 0));
  const aBordoDe = (j: (typeof lista)[number][1]) => !!j.uid && j.uid !== uid && !!j.online;

  const tripulacao = (
    <Painel titulo="A tripulação">
      <div className="tripulacao-grande">
        {lista.map(([jid, j]) => (
          <div key={jid} className={`tripulante-grande ${j.online ? "a-bordo" : ""}`}>
            <span className="insignia" style={{ ["--t" as string]: "56px", background: `radial-gradient(circle at 45% 40%, ${j.cor}, #161a26 120%)` }}>
              <span style={{ fontFamily: "var(--font-display)", color: "#0e1213", fontWeight: 700, fontSize: 24 }}>{j.nome.slice(0, 1)}</span>
            </span>
            <span className="nome">{j.nome}</span>
            <Selo tipo={j.online ? "feito" : undefined}>{j.online ? "a bordo" : "a caminho"}</Selo>
          </div>
        ))}
        {!lista.length && (
          <div className="tripulante-grande">
            <Insignia icone="pessoa" tamanho={40} />
            <span className="nome">Nenhum nome cadastrado</span>
          </div>
        )}
      </div>
    </Painel>
  );

  if (escolher) {
    return (
      <Gestao n={0} titulo="Quem desembarca em Rouillac?" colunas="minmax(0, 1.7fr) minmax(260px, 1fr)">
        <Painel
          titulo="Escolha o seu nome"
          acao={
            <BotaoHextech
              disabled={!escolhido || ocupado}
              onClick={async () => {
                if (!escolhido) return;
                setOcupado(true);
                try {
                  await escolher(escolhido);
                } finally {
                  setOcupado(false);
                }
              }}
            >
              Assumir este nome
            </BotaoHextech>
          }
        >
          <p className="n-N" style={{ marginTop: 0 }}>
            Na plataforma, entre baús e fumaça, um funcionário da Exposição confere a lista de chegada com a ponta de um lápis. Ele levanta os olhos e espera o
            seu nome.
          </p>
          {erroMestre && <p className="n-I" style={{ color: "var(--danger)" }}>{erroMestre}</p>}
          <div className="grade-ramos" style={{ marginTop: 14 }}>
            {lista.map(([jid, j]) => {
              const aBordo = aBordoDe(j);
              return (
                <Ramo
                  key={jid}
                  titulo={j.nome}
                  descricao={aBordo ? "Já desembarcou e está na sala." : "Ainda não chegou."}
                  chamada={aBordo || escolhido === jid ? undefined : "Este sou eu."}
                  icone="pessoa"
                  corMedalhao={j.cor}
                  estado={aBordo ? "bloqueado" : escolhido === jid ? "selecionado" : "normal"}
                  selo={aBordo ? <Selo>a bordo</Selo> : escolhido === jid ? <Selo>escolhido</Selo> : undefined}
                  aoClicar={() => setEscolhido(jid)}
                />
              );
            })}
          </div>
          {!lista.length && <p className="n-I">O mestre ainda não cadastrou os nomes. Espere um pouquinho.</p>}
        </Painel>
        {tripulacao}
      </Gestao>
    );
  }

  return (
    <Gestao n={0} titulo="A tripulação chega" colunas="minmax(0, 1fr) minmax(280px, 1.2fr)">
      <Painel titulo="Os passageiros descem">
        <p className="n-N" style={{ marginTop: 0 }}>Os passageiros descem um a um. Quando todos estiverem na plataforma, o mestre abre o primeiro capítulo.</p>
        {mestre && <p className="n-I">Mestre: cadastre os nomes na Mesa (aba Pessoas) e mande o link dos jogadores no Discord.</p>}
      </Painel>
      {tripulacao}
    </Gestao>
  );
}
