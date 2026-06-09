import React, { useEffect, useState, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { bancoDeItens } from "./bancoDeItens";
import { trilhasCenarios } from "./bancoDeAudio";

export default function SelecaoMapa() {
  const location = useLocation();
  const navigate = useNavigate();

  // 🛡️ Lê o Esquadrão que veio do Lobby
  const esquadraoCompleto = location.state?.esquadrao || [];

  // 🔄 Controle de quem está comprando/agindo no Mercado
  const [idxHeroiFocado, setIdxHeroiFocado] = useState(0);

  const [esquadrao, setEsquadrao] = useState(() => {
    return esquadraoCompleto.map((h) => {
      const saved =
        JSON.parse(localStorage.getItem(`taverna_save_${h.id}`)) || {};
      return {
        ...h,
        ouro: saved.ouroAtual || 0,
        mochila: saved.mochila || h.mochilaInicial || Array(16).fill(null),
      };
    });
  });

  const heroiAtivo = esquadrao[idxHeroiFocado];

  const [mapaHover, setMapaHover] = useState(null);
  const [abaExibicao, setAbaExibicao] = useState("mapas");

  const [diarioAberto, setDiarioAberto] = useState(false);
  const [diarioLogs, setDiarioLogs] = useState(() => {
    const history = localStorage.getItem("taverna_diario_history");
    return history ? JSON.parse(history) : [];
  });

  const [comprasSessao, setComprasSessao] = useState({});
  const [trocasSessao, setTrocasSessao] = useState([]);
  const [trocaPendente, setTrocaPendente] = useState(null);
  const [outrosJogadores, setOutrosJogadores] = useState([]);

  const dispararMensagemGlobal = (texto, autor) => {
    const msg = { autor, texto, timestamp: Date.now() };
    const history = JSON.parse(
      localStorage.getItem("taverna_diario_history") || "[]"
    );
    history.push(msg);
    localStorage.setItem("taverna_diario_history", JSON.stringify(history));
    localStorage.setItem("taverna_chat_global", JSON.stringify(msg));
    setDiarioLogs(history);
  };

  const consolidarResumoDoMercado = () => {
    const itensComprados = Object.entries(comprasSessao)
      .map(([nome, qtd]) => `${qtd}x [${nome}]`)
      .join(", ");
    const resumosDeTroca = trocasSessao.join(" | ");

    if (itensComprados || resumosDeTroca) {
      const dataStr = new Date().toLocaleString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
      let textoFinal = `(${dataStr}) 🛒 Visita de ${heroiAtivo?.nome}: `;
      if (itensComprados) textoFinal += `Comprou: ${itensComprados}. `;
      if (resumosDeTroca) textoFinal += `Negócios: ${resumosDeTroca}.`;
      dispararMensagemGlobal(textoFinal, "Mercador");
      setComprasSessao({});
      setTrocasSessao([]);
    }
  };

  useEffect(() => {
    const escutarEventosGlobais = (e) => {
      if (e.key === "taverna_chat_global" && e.newValue)
        setDiarioLogs((prev) => [...prev, JSON.parse(e.newValue)]);
      if (e.key === "taverna_trade_request" && e.newValue) {
        const req = JSON.parse(e.newValue);
        if (req.paraId === heroiAtivo?.id) setTrocaPendente(req);
      }
      if (e.key === "taverna_trade_response" && e.newValue) {
        const res = JSON.parse(e.newValue);
        if (res.deId === heroiAtivo?.id) {
          if (res.status === "aceito") {
            const novaMochila = [...heroiAtivo.mochila];
            if (novaMochila[res.slotIndexOriginal]) {
              novaMochila[res.slotIndexOriginal].qtd -= res.qtdOriginal;
              if (novaMochila[res.slotIndexOriginal].qtd <= 0)
                novaMochila[res.slotIndexOriginal] = null;
            }
            const slotExistente = novaMochila.findIndex(
              (s) => s && s.id === res.itemEnviadoDeVolta
            );
            if (slotExistente !== -1) novaMochila[slotExistente].qtd += 1;
            else {
              const espacoLivre = novaMochila.findIndex((s) => s === null);
              if (espacoLivre !== -1)
                novaMochila[espacoLivre] = {
                  id: res.itemEnviadoDeVolta,
                  qtd: 1,
                };
            }
            atualizarHeroi(idxHeroiFocado, { mochila: novaMochila });
            alert("Troca realizada com sucesso!");
          } else alert("Sua proposta foi recusada.");
        }
      }
    };
    window.addEventListener("storage", escutarEventosGlobais);
    return () => window.removeEventListener("storage", escutarEventosGlobais);
  }, [heroiAtivo?.id]);

  useEffect(() => {
    if (abaExibicao === "loja") {
      const carregarOutros = () => {
        const saves = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (
            key.startsWith("taverna_save_") &&
            !esquadrao.some((h) => `taverna_save_${h.id}` === key)
          ) {
            saves.push(JSON.parse(localStorage.getItem(key)));
          }
        }
        setOutrosJogadores(saves);
      };
      carregarOutros();
      const interval = setInterval(carregarOutros, 3000);
      return () => clearInterval(interval);
    }
  }, [abaExibicao, esquadrao]);

  const atualizarHeroi = (index, novosDados) => {
    setEsquadrao((prev) => {
      const copia = [...prev];
      copia[index] = { ...copia[index], ...novosDados };

      // Salva no LocalStorage em tempo real
      const saveKeyHeroi = `taverna_save_${copia[index].id}`;
      const saved = JSON.parse(localStorage.getItem(saveKeyHeroi)) || {};
      localStorage.setItem(
        saveKeyHeroi,
        JSON.stringify({
          ...saved,
          heroi: copia[index],
          ouroAtual: copia[index].ouro,
          mochila: copia[index].mochila,
        })
      );
      return copia;
    });
  };

  const transferirOuro = (alvoSave, valor) => {
    if (isNaN(valor) || valor <= 0) return alert("Valor inválido!");
    if (heroiAtivo.ouro < valor) return alert("Você não possui fundos!");

    atualizarHeroi(idxHeroiFocado, { ouro: heroiAtivo.ouro - valor });

    const novoAlvo = {
      ...alvoSave,
      ouroAtual: (alvoSave.ouroAtual || 0) + valor,
    };
    localStorage.setItem(
      `taverna_save_${alvoSave.heroi.id}`,
      JSON.stringify(novoAlvo)
    );

    setTrocasSessao((prev) => [
      ...prev,
      `Enviou ${valor}g para ${alvoSave.heroi.nome}`,
    ]);
    alert(`Transferência de ${valor}g concluída!`);
  };

  const aceitarTroca = (slotIndex) => {
    if (!trocaPendente) return;
    const meuItem = heroiAtivo.mochila[slotIndex];
    if (!meuItem) return alert("Selecione um item real!");

    const novaMochila = [...heroiAtivo.mochila];
    novaMochila[slotIndex].qtd -= 1;
    if (novaMochila[slotIndex].qtd <= 0) novaMochila[slotIndex] = null;

    const slotA = novaMochila.findIndex(
      (s) => s && s.id === trocaPendente.itemId
    );
    if (slotA !== -1) novaMochila[slotA].qtd += trocaPendente.quantidade;
    else {
      const espLivre = novaMochila.findIndex((s) => s === null);
      if (espLivre !== -1)
        novaMochila[espLivre] = {
          id: trocaPendente.itemId,
          qtd: trocaPendente.quantidade,
        };
    }

    atualizarHeroi(idxHeroiFocado, { mochila: novaMochila });
    localStorage.setItem(
      "taverna_trade_response",
      JSON.stringify({
        deId: trocaPendente.deId,
        status: "aceito",
        slotIndexOriginal: trocaPendente.slotIndex,
        qtdOriginal: trocaPendente.quantidade,
        itemEnviadoDeVolta: meuItem.id,
      })
    );
    setTrocasSessao((prev) => [
      ...prev,
      `Trocou [x${trocaPendente.quantidade}] por [x1] com ${trocaPendente.deNome}`,
    ]);
    alert("Escambo selado com sucesso!");
    setTrocaPendente(null);
  };

  const comprarItem = (itemVenda) => {
    iniciarMusicaSePausada();
    if (heroiAtivo.ouro < itemVenda.preco) return alert("Ouro insuficiente!");

    const novaMochila = [...heroiAtivo.mochila];
    const slot = novaMochila.findIndex((s) => s && s.id === itemVenda.id);
    if (slot !== -1) novaMochila[slot].qtd += 1;
    else {
      const espacoLivre = novaMochila.findIndex((s) => s === null);
      if (espacoLivre !== -1)
        novaMochila[espacoLivre] = { id: itemVenda.id, qtd: 1 };
      else return alert("Sua mochila está cheia!");
    }

    atualizarHeroi(idxHeroiFocado, {
      ouro: heroiAtivo.ouro - itemVenda.preco,
      mochila: novaMochila,
    });

    const nomeDoItem = bancoDeItens[itemVenda.id]?.nome || "Item";
    setComprasSessao((prev) => ({
      ...prev,
      [nomeDoItem]: (prev[nomeDoItem] || 0) + 1,
    }));
  };

  const mudarAbaSegura = (novaAba) => {
    if (abaExibicao === "loja" && novaAba !== "loja")
      consolidarResumoDoMercado();
    setAbaExibicao(novaAba);
  };

  const sairDoMapa = () => {
    consolidarResumoDoMercado();
    navigate("/");
  };

  const entrarNaBatalha = (mapaEscolhido) => {
    consolidarResumoDoMercado();

    // 🛡️ PREPARA O ESQUADRÃO PARA ENTRAR (FORÇA POSIÇÕES DIFERENTES PARA NÃO SOBREPOR)
    const esquadraoParaBatalha = esquadrao.map((h, i) => {
      const saved =
        JSON.parse(localStorage.getItem(`taverna_save_${h.id}`)) || {};
      saved.posicaoHeroi = 25 + i; // Força posições: 25, 26, 27
      localStorage.setItem(`taverna_save_${h.id}`, JSON.stringify(saved));
      return h;
    });

    navigate("/arena", {
      state: {
        heroi: esquadraoParaBatalha[0],
        esquadrao: esquadraoParaBatalha,
        mapa: mapaEscolhido.imagem,
        idCenario: mapaEscolhido.id,
      },
    });
  };

  const audioRef = useRef(null);
  const [musicaTocando, setMusicaTocando] = useState(false);
  const [mutado, setMutado] = useState(
    () => localStorage.getItem("taverna_mute") === "true"
  );

  const alternarMute = (e) => {
    e.stopPropagation();
    const m = !mutado;
    setMutado(m);
    localStorage.setItem("taverna_mute", m);
  };

  useEffect(() => {
    audioRef.current = new Audio(trilhasCenarios.lobby);
    audioRef.current.loop = true;
    audioRef.current.volume = 0.4;
    return () => {
      if (audioRef.current) audioRef.current.pause();
    };
  }, []);
  useEffect(() => {
    if (audioRef.current) {
      if (mutado) audioRef.current.pause();
      else
        audioRef.current
          .play()
          .then(() => setMusicaTocando(true))
          .catch(() => {});
    }
  }, [mutado]);
  const iniciarMusicaSePausada = () => {
    if (!mutado && !musicaTocando && audioRef.current)
      audioRef.current
        .play()
        .then(() => setMusicaTocando(true))
        .catch(() => {});
  };

  if (esquadrao.length === 0)
    return <div className="min-h-screen bg-black"></div>;

  const mapas = [
    {
      id: "taverna",
      nome: "Taverna Pós-Briga",
      imagem: "/cenarios/01-taverna-pos-briga.jpg",
      dica: "A bagunça de ontem é a arena de hoje.",
    },
    {
      id: "masmorra-vulcanica",
      nome: "Masmorra Vulcânica",
      imagem: "/cenarios/02-masmorra-vulcanica.jpg",
      dica: "O chão queima.",
    },
    {
      id: "floresta",
      nome: "Floresta Sombria",
      imagem: "/cenarios/03-floresta-sombria.jpg",
      dica: "As árvores sussurram mentiras.",
    },
    {
      id: "templo",
      nome: "Templo Arcano",
      imagem: "/cenarios/04-templo-arcano.jpg",
      dica: "O Devorador espreita.",
    },
    {
      id: "santuario",
      nome: "Santuário Élfico",
      imagem: "/cenarios/05-santuario-elfico.jpg",
      dica: "Um lugar de paz corrompido.",
    },
    {
      id: "caverna-congelada",
      nome: "Caverna Congelada",
      imagem: "/cenarios/06-caverna-congelada.jpg",
      dica: "O gelo fino esconde abismos.",
    },
    {
      id: "ruinas-deserto",
      nome: "Ruínas do Deserto",
      imagem: "/cenarios/07-ruinas-deserto.jpg",
      dica: "Antigos horrores secos.",
    },
    {
      id: "cemiterio",
      nome: "Cemitério Esquecido",
      imagem: "/cenarios/08-cemiterio-esquecido.jpg",
      dica: "Traga poções.",
    },
    {
      id: "forja",
      nome: "Forja Anã",
      imagem: "/cenarios/09-forja-ana.jpg",
      dica: "O calor lá derrete ossos.",
    },
    {
      id: "acampamento",
      nome: "Acampamento Senhor da Guerra",
      imagem: "/cenarios/10-acampamento-senhor-da-guerra.jpg",
      dica: "A linha de frente.",
    },
  ];

  const estoqueLoja = [
    { id: "/itens/item-pocao-vida.png", preco: 20 },
    { id: "/itens/item-pocao-mana.png", preco: 20 },
    { id: "/itens/item-armadura-couro.png", preco: 150 },
    { id: "/itens/item-espada-base.png", preco: 100 },
  ];

  const falaDoAnciao = mapaHover
    ? mapaHover.dica
    : `O tempo urge. Onde a sua lâmina será necessária hoje?`;

  return (
    <div
      onClick={iniciarMusicaSePausada}
      className="min-h-screen bg-[#050814] flex flex-col items-center p-8 font-sans text-white relative"
    >
      {trocaPendente && (
        <div className="fixed inset-0 bg-black/90 z-[60] flex items-center justify-center p-4 backdrop-blur-md">
          <div className="bg-[#140e0b] border-4 border-cyan-600 w-full max-w-md rounded-lg p-6 flex flex-col gap-4">
            <h3 className="text-xl text-cyan-400 text-center">
              Proposta de Escambo
            </h3>
            <p className="text-slate-300 text-sm text-center">
              <span>{trocaPendente.deNome}</span> quer enviar: <br />
              <span className="text-yellow-400 font-bold">
                [{bancoDeItens[trocaPendente.itemId]?.nome || "Item"} x
                {trocaPendente.quantidade}]
              </span>
            </p>
            <div className="grid grid-cols-4 gap-2 bg-black/40 p-3 max-h-40 overflow-y-auto">
              {heroiAtivo.mochila.map(
                (slot, i) =>
                  slot && (
                    <div
                      key={i}
                      onClick={() => aceitarTroca(i)}
                      className="border border-[#5c3a21] p-1 cursor-pointer"
                    >
                      <img
                        src={slot.id}
                        className="w-full h-full object-contain"
                      />
                    </div>
                  )
              )}
            </div>
            <button
              onClick={() => {
                localStorage.setItem(
                  "taverna_trade_response",
                  JSON.stringify({
                    deId: trocaPendente.deId,
                    status: "recusado",
                  })
                );
                setTrocaPendente(null);
              }}
              className="bg-red-900 text-red-200 py-2"
            >
              Recusar
            </button>
          </div>
        </div>
      )}

      {diarioAberto && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-[#140e0b] border-4 border-[#5c3a21] w-full max-w-2xl rounded-lg max-h-[80vh] flex flex-col">
            <div className="bg-[#2b1810] p-4 flex justify-between">
              <h2 className="text-[#d4af37] font-bold">Diário</h2>
              <button
                onClick={() => setDiarioAberto(false)}
                className="text-red-500"
              >
                ✖
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {diarioLogs.map((log, i) => (
                <div
                  key={i}
                  className="bg-black/70 border-l-4 border-[#d4af37] p-3 mb-2"
                >
                  [{log.autor}] {log.texto}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="w-full max-w-6xl flex justify-between items-center mb-4">
        <button
          onClick={sairDoMapa}
          className="bg-[#1a1c29] border border-[#d4af37] text-[#d4af37] px-6 py-2 rounded"
        >
          ← Voltar
        </button>
        <button
          onClick={() => setDiarioAberto(true)}
          className="bg-fuchsia-900 border border-fuchsia-500 text-fuchsia-200 px-6 py-2 rounded animate-pulse"
        >
          📜 Abrir Diário
        </button>
      </div>

      {/* 🔄 AQUI O SELETOR DE HERÓI DO MERCADO */}
      <div className="w-full max-w-6xl flex justify-between items-end mb-6">
        <div className="flex gap-4 border-b-2 border-[#5c3a21] pb-2">
          <button
            onClick={() => mudarAbaSegura("mapas")}
            className={`text-xl font-bold uppercase transition-all ${
              abaExibicao === "mapas"
                ? "text-[#00d0ff]"
                : "text-slate-600 hover:text-slate-400"
            }`}
          >
            Mesa de Guerra
          </button>
          <span className="text-slate-700 text-xl">|</span>
          <button
            onClick={() => mudarAbaSegura("loja")}
            className={`text-xl font-bold uppercase transition-all ${
              abaExibicao === "loja"
                ? "text-yellow-400"
                : "text-slate-600 hover:text-slate-400"
            }`}
          >
            Mercador & Trade
          </button>
        </div>

        <div className="flex gap-6 items-center">
          <button onClick={alternarMute} className="text-2xl">
            {mutado ? "🔇" : "🔊"}
          </button>

          <div className="flex gap-2 items-center bg-[#140e0b] p-2 border-2 border-[#5c3a21] rounded-lg shadow-lg">
            <span className="text-[10px] text-slate-400 font-bold uppercase mr-2">
              Comprador:
            </span>
            {esquadrao.map((h, i) => (
              <div
                key={h.id}
                onClick={() => {
                  if (abaExibicao === "loja") consolidarResumoDoMercado();
                  setIdxHeroiFocado(i);
                }}
                className={`w-10 h-10 rounded-full border-2 cursor-pointer transition-all ${
                  i === idxHeroiFocado
                    ? "border-yellow-400 scale-110"
                    : "border-slate-700 opacity-50"
                } overflow-hidden`}
              >
                <img
                  src={h.imagem}
                  className="w-full h-full object-cover object-top"
                  title={h.nome}
                />
              </div>
            ))}
            <div className="text-yellow-400 text-lg font-bold ml-4 border-l border-slate-700 pl-4">
              💰 {heroiAtivo?.ouro}g
            </div>
          </div>
        </div>
      </div>

      <section className="flex flex-col md:flex-row items-center gap-6 mb-8 max-w-4xl w-full bg-[#140e0b] border-2 border-[#5c3a21] p-6 rounded-lg">
        <div
          className="w-32 h-32 bg-black border-2 border-[#2b1810] shrink-0"
          style={{
            backgroundImage: `url('/npc-anciao.png')`,
            backgroundSize: "cover",
          }}
        ></div>
        <div className="flex-1 bg-[#2b1810] p-4 rounded-md relative shadow-inner">
          <h3 className="text-[#d4af37] font-bold text-sm uppercase mb-1 border-b border-[#5c3a21] pb-1">
            {abaExibicao === "mapas" ? "Ancião da Taverna" : "Mercador"}
          </h3>
          <p className="text-slate-300 text-sm italic">
            {abaExibicao === "mapas"
              ? `"${falaDoAnciao}"`
              : `"Ouro move o mundo. O que vai querer para a mochila do(a) ${heroiAtivo?.nome}?"`}
          </p>
        </div>
      </section>

      {abaExibicao === "mapas" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 w-full max-w-7xl">
          {mapas.map((mapa) => (
            <div
              key={mapa.id}
              onClick={() => entrarNaBatalha(mapa)}
              onMouseEnter={() => setMapaHover(mapa)}
              onMouseLeave={() => setMapaHover(null)}
              className="group relative bg-[#140e0b] border-2 border-[#5c3a21] rounded-lg overflow-hidden cursor-pointer hover:border-[#00d0ff]"
            >
              <div className="h-32 relative">
                <div
                  className="absolute inset-0 opacity-60 group-hover:opacity-100"
                  style={{
                    backgroundImage: `url('${mapa.imagem}')`,
                    backgroundSize: "cover",
                  }}
                ></div>
              </div>
              <div className="p-3 bg-black flex justify-center">
                <h2 className="text-sm font-bold text-white text-center">
                  {mapa.nome}
                </h2>
              </div>
            </div>
          ))}
        </div>
      )}

      {abaExibicao === "loja" && (
        <div className="w-full max-w-5xl flex flex-col gap-8">
          <div className="bg-[#140e0b] border-2 border-yellow-700/50 p-6">
            <h2 className="text-2xl text-yellow-400 font-bold mb-6 text-center">
              Bens à Venda
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {estoqueLoja.map((item, index) => {
                const infoItem = bancoDeItens[item.id];
                return (
                  <div
                    key={index}
                    className="bg-[#2b1810] border border-[#5c3a21] p-4 flex flex-col items-center gap-3"
                  >
                    <img src={item.id} className="w-16 h-16 object-contain" />
                    <h3 className="text-white text-sm font-bold">
                      {infoItem.nome}
                    </h3>
                    <button
                      onClick={() => comprarItem(item)}
                      className="w-full bg-yellow-600 text-black font-bold py-2"
                    >
                      💰 {item.preco}g
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-[#1a1c29] border-2 border-cyan-800 p-6">
            <h2 className="text-2xl text-cyan-400 font-bold mb-6">
              Mercado Livre
            </h2>
            {outrosJogadores.length === 0 ? (
              <p className="text-slate-500 text-center">
                Nenhum jogador online.
              </p>
            ) : (
              <div className="grid grid-cols-3 gap-4">
                {outrosJogadores.map((jogador) => (
                  <div
                    key={jogador.heroi.id}
                    className="bg-black border border-cyan-900 p-4"
                  >
                    <div className="flex gap-3 items-center mb-2">
                      <img
                        src={jogador.heroi.imagem}
                        className="w-10 h-10 rounded-full"
                      />
                      <span>{jogador.heroi.nome}</span>
                    </div>
                    <button
                      onClick={() =>
                        transferirOuro(jogador, parseInt(prompt("Ouro?")))
                      }
                      className="w-full bg-yellow-900 text-yellow-400 py-1 mb-2"
                    >
                      💰 Enviar Ouro
                    </button>
                    <select
                      id={`trade-${jogador.heroi.id}`}
                      className="w-full text-black mb-1 p-1"
                    >
                      <option>-- Item --</option>
                      {heroiAtivo.mochila.map(
                        (s, idx) =>
                          s && (
                            <option
                              key={idx}
                              value={JSON.stringify({
                                slotId: s.id,
                                sIdx: idx,
                                maxQtd: s.qtd,
                              })}
                            >
                              Slot {idx}
                            </option>
                          )
                      )}
                    </select>
                    <button
                      onClick={() => {
                        const v = document.getElementById(
                          `trade-${jogador.heroi.id}`
                        )?.value;
                        if (v) {
                          const t = JSON.parse(v);
                          const q = parseInt(prompt(`Qtd? Max:${t.maxQtd}`));
                          if (q > 0 && q <= t.maxQtd) {
                            localStorage.setItem(
                              "taverna_trade_request",
                              JSON.stringify({
                                id: Date.now(),
                                deId: heroiAtivo.id,
                                deNome: heroiAtivo.nome,
                                paraId: jogador.heroi.id,
                                itemId: t.slotId,
                                slotIndex: t.sIdx,
                                quantidade: q,
                              })
                            );
                            alert("Proposta enviada!");
                          }
                        }
                      }}
                      className="w-full bg-cyan-900 text-cyan-400 py-1"
                    >
                      Propor Troca
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
