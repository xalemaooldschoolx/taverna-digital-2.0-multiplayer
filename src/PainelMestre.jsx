import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { bancoDeItens } from "./bancoDeItens"; // 📦 IMPORTANDO O BANCO COMPLETO

// Transformando o banco de itens em uma lista pro Select
const listaItensDivinos = Object.keys(bancoDeItens).map((key) => ({
  id: key,
  nome: bancoDeItens[key].nome,
}));

export default function PainelMestre() {
  const navigate = useNavigate();
  const [jogadores, setJogadores] = useState([]);
  const [chat, setChat] = useState([
    { autor: "Sistema", texto: "Sessão iniciada.", cor: "text-[#d4af37]" },
  ]);
  const [inputChat, setInputChat] = useState("");
  const [musicaAtiva, setMusicaAtiva] = useState("ambiente");
  const [regraCampanha, setRegraCampanha] = useState(
    () => localStorage.getItem("taverna_regra_campanha") || "single"
  );
  const [itemSelecionado, setItemSelecionado] = useState({});

  useEffect(() => {
    const carregarSaves = () => {
      const savesEncontrados = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key.startsWith("taverna_save_")) {
          try {
            const dados = JSON.parse(localStorage.getItem(key));
            if (dados && dados.heroi) savesEncontrados.push(dados);
          } catch (error) {
            console.error("Save corrompido ignorado:", key);
          }
        }
      }
      setJogadores(savesEncontrados);
    };
    carregarSaves();
    const interval = setInterval(carregarSaves, 3000);
    return () => clearInterval(interval);
  }, []);

  const adicionarMensagem = (autor, texto, cor = "text-white") => {
    setChat((prev) => [...prev, { autor, texto, cor }]);
  };

  const enviarChatMestre = (e) => {
    e.preventDefault();
    if (!inputChat.trim()) return;
    adicionarMensagem("Mestre", inputChat, "text-cyan-400 font-bold");
    localStorage.setItem(
      "taverna_chat_global",
      JSON.stringify({
        autor: "Mestre",
        texto: inputChat,
        timestamp: Date.now(),
      })
    );
    setInputChat("");
  };

  const concederOuro = (jogador, valor) => {
    const novoSave = {
      ...jogador,
      ouroAtual: (jogador.ouroAtual || 0) + valor,
    };
    localStorage.setItem(
      `taverna_save_${jogador.heroi.id}`,
      JSON.stringify(novoSave)
    );
    const msg = `O Mestre concedeu ${valor} moedas de ouro para ${jogador.heroi.nome}!`;
    adicionarMensagem("Mestre", msg, "text-yellow-400 font-bold");
    localStorage.setItem(
      "taverna_chat_global",
      JSON.stringify({ autor: "Mestre", texto: msg, timestamp: Date.now() })
    );
  };

  const concederCura = (jogador) => {
    const novoSave = { ...jogador, danoRecebidoHeroi: 0 };
    localStorage.setItem(
      `taverna_save_${jogador.heroi.id}`,
      JSON.stringify(novoSave)
    );
    const msg = `Uma luz divina curou todos os ferimentos de ${jogador.heroi.nome}!`;
    adicionarMensagem("Mestre", msg, "text-green-400 font-bold");
    localStorage.setItem(
      "taverna_chat_global",
      JSON.stringify({ autor: "Mestre", texto: msg, timestamp: Date.now() })
    );
  };

  // 🎁 A MÃO DIVINA (COM EMPILHAMENTO CORRETO)
  const concederItem = (jogador) => {
    const itemId = itemSelecionado[jogador.heroi.id] || listaItensDivinos[0].id;
    const itemObj = listaItensDivinos.find((i) => i.id === itemId);
    const novoSave = { ...jogador };
    const novaMochila = [...(novoSave.mochila || Array(16).fill(null))];

    // Verifica se já existe na mochila para empilhar
    const slotExistente = novaMochila.findIndex((s) => s && s.id === itemId);

    if (slotExistente !== -1) {
      novaMochila[slotExistente].qtd += 1;
    } else {
      const espacoLivre = novaMochila.findIndex((s) => s === null);
      if (espacoLivre !== -1) {
        novaMochila[espacoLivre] = { id: itemId, qtd: 1 };
      } else {
        return alert(`A mochila de ${jogador.heroi.nome} está cheia!`);
      }
    }

    novoSave.mochila = novaMochila;
    localStorage.setItem(
      `taverna_save_${jogador.heroi.id}`,
      JSON.stringify(novoSave)
    );

    const msg = `🎁 Uma luz divina brilhou e [${itemObj.nome}] apareceu na mochila de ${jogador.heroi.nome}!`;
    adicionarMensagem("Mestre", msg, "text-yellow-300 font-bold");
    localStorage.setItem(
      "taverna_chat_global",
      JSON.stringify({
        autor: "Mestre Divino",
        texto: msg,
        timestamp: Date.now(),
      })
    );
  };

  const alterarTrilhaGlobal = (tipo) => {
    setMusicaAtiva(tipo);
    localStorage.setItem(
      "taverna_bgm_global",
      JSON.stringify({ tipo: tipo, timestamp: Date.now() })
    );
    adicionarMensagem(
      "🎵 Bardo",
      tipo === "boss" ? "Música épica iniciada!" : "A calmaria retornou.",
      "text-fuchsia-400 italic"
    );
  };

  const alterarRegraCampanha = (regra) => {
    setRegraCampanha(regra);
    localStorage.setItem("taverna_regra_campanha", regra);
    const msg =
      regra === "multi"
        ? "Modo Esquadrão Liberado! (Até 3 heróis)"
        : "Modo Solo Ativado (1 herói).";
    adicionarMensagem(
      "⚠️ Regra da Mesa",
      msg,
      "text-yellow-400 font-extrabold"
    );
    localStorage.setItem(
      "taverna_chat_global",
      JSON.stringify({ autor: "⚠️ Regra", texto: msg, timestamp: Date.now() })
    );
  };

  const dispararEfeito = (chave, tipo, nome) => {
    localStorage.setItem(
      chave,
      JSON.stringify({ tipo: tipo, timestamp: Date.now() })
    );
    let cor = "text-fuchsia-300";
    let icone = "🔊";
    if (chave === "taverna_caos_global") {
      cor = "text-red-500 font-bold";
      icone = "⛈️";
    }
    if (chave === "taverna_spawn_global") {
      cor = "text-purple-400 font-bold";
      icone = "🪤";
    }
    adicionarMensagem(`${icone} Mestre`, nome, cor);
  };

  const apagarCampanha = () => {
    if (
      window.confirm("CUIDADO: Isso vai apagar todos os saves. Tem certeza?")
    ) {
      const chavesParaApagar = [];
      for (let i = 0; i < localStorage.length; i++) {
        if (localStorage.key(i).startsWith("taverna_save_"))
          chavesParaApagar.push(localStorage.key(i));
      }
      chavesParaApagar.forEach((key) => localStorage.removeItem(key));
      setJogadores([]);
      adicionarMensagem(
        "⚠️ SISTEMA",
        "O MESTRE DESTRUIU O MUNDO.",
        "text-red-500 font-extrabold text-xl"
      );
    }
  };

  return (
    <div className="min-h-screen bg-[#050814] p-6 font-sans text-white flex gap-6 bg-[url('/bg-parchment-dark.jpg')] bg-cover bg-blend-overlay bg-black/90">
      <div className="flex-1 flex flex-col gap-6">
        <div className="bg-[#0a0a0a] border-2 border-[#5c3a21] rounded-lg p-4 shadow-lg flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-black border-2 border-[#d4af37] rounded-full flex items-center justify-center text-2xl shadow-[0_0_15px_rgba(212,175,55,0.4)]">
              👁️
            </div>
            <div>
              <h1 className="text-xl font-serif font-extrabold text-[#d4af37] tracking-widest uppercase">
                Painel do Mestre
              </h1>
              <p className="text-[10px] text-slate-400">
                Controle absoluto da sessão.
              </p>
            </div>
          </div>
          <button
            onClick={() => navigate("/")}
            className="px-4 py-2 border-2 border-slate-600 rounded text-slate-400 text-xs font-bold uppercase hover:bg-slate-800"
          >
            Sair para Lobby
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-[#0a0a0a] border-2 border-[#3e2723] rounded-lg p-4 shadow-inner flex flex-col gap-3">
            <h3 className="font-serif font-bold text-xs text-yellow-500 uppercase tracking-widest">
              📜 Regras da Campanha
            </h3>
            <div className="flex gap-2">
              <button
                onClick={() => alterarRegraCampanha("single")}
                className={`flex-1 py-2 font-bold uppercase text-[10px] transition-all border-2 rounded ${
                  regraCampanha === "single"
                    ? "bg-yellow-900 border-yellow-400 text-white shadow-[0_0_10px_rgba(250,204,21,0.5)]"
                    : "bg-black border-slate-700 text-slate-400"
                }`}
              >
                👤 Solo
              </button>
              <button
                onClick={() => alterarRegraCampanha("multi")}
                className={`flex-1 py-2 font-bold uppercase text-[10px] transition-all border-2 rounded ${
                  regraCampanha === "multi"
                    ? "bg-blue-900 border-blue-400 text-white shadow-[0_0_10px_rgba(59,130,246,0.5)]"
                    : "bg-black border-slate-700 text-slate-400"
                }`}
              >
                🛡️ Esquadrão
              </button>
            </div>
          </div>

          <div className="bg-[#0a0a0a] border-2 border-[#3e2723] rounded-lg p-4 shadow-inner flex flex-col gap-3">
            <h3 className="font-serif font-bold text-xs text-fuchsia-400 uppercase tracking-widest">
              🎵 Trilha Global
            </h3>
            <div className="flex gap-2">
              <button
                onClick={() => alterarTrilhaGlobal("ambiente")}
                className={`flex-1 py-2 font-bold uppercase text-[10px] transition-all border-2 rounded ${
                  musicaAtiva === "ambiente"
                    ? "bg-fuchsia-900 border-fuchsia-400 text-white"
                    : "bg-black border-slate-700 text-slate-400"
                }`}
              >
                🌲 Ambiente
              </button>
              <button
                onClick={() => alterarTrilhaGlobal("boss")}
                className={`flex-1 py-2 font-bold uppercase text-[10px] transition-all border-2 rounded ${
                  musicaAtiva === "boss"
                    ? "bg-red-900 border-red-500 text-white"
                    : "bg-black border-slate-700 text-slate-400"
                }`}
              >
                ⚔️ Boss
              </button>
            </div>
          </div>
        </div>

        <div className="bg-[#0a0a0a] border-2 border-[#3e2723] rounded-lg p-4 shadow-inner grid grid-cols-3 gap-4">
          <div className="flex flex-col gap-2">
            <h3 className="font-serif font-bold text-[10px] text-red-500 uppercase tracking-widest text-center">
              ⛈️ Injetor de Caos
            </h3>
            <button
              onClick={() =>
                dispararEfeito(
                  "taverna_caos_global",
                  "terremoto",
                  "Terremoto Ativado!"
                )
              }
              className="bg-red-950 border border-red-700 hover:bg-red-800 text-red-300 text-xs py-1.5 rounded"
            >
              Terremoto
            </button>
          </div>
          <div className="flex flex-col gap-2 border-l border-r border-[#3e2723] px-4">
            <h3 className="font-serif font-bold text-[10px] text-purple-400 uppercase tracking-widest text-center">
              🪤 Spawn Rápido
            </h3>
            <button
              onClick={() =>
                dispararEfeito(
                  "taverna_spawn_global",
                  "lacaio",
                  "Lacaio Invocado!"
                )
              }
              className="bg-purple-950 border border-purple-700 hover:bg-purple-800 text-purple-300 text-xs py-1.5 rounded"
            >
              Invocar Lacaio
            </button>
            <button
              onClick={() =>
                dispararEfeito(
                  "taverna_spawn_global",
                  "bau",
                  "Baú Surpresa Criado!"
                )
              }
              className="bg-yellow-950 border border-yellow-700 hover:bg-yellow-800 text-yellow-300 text-xs py-1.5 rounded"
            >
              Dropar Baú
            </button>
          </div>
          <div className="flex flex-col gap-2">
            <h3 className="font-serif font-bold text-[10px] text-fuchsia-300 uppercase tracking-widest text-center">
              🔊 Soundboard
            </h3>
            <button
              onClick={() =>
                dispararEfeito(
                  "taverna_sfx_global",
                  "risada",
                  "Tocou: Risada Maligna"
                )
              }
              className="bg-fuchsia-950 border border-fuchsia-700 hover:bg-fuchsia-800 text-fuchsia-300 text-xs py-1.5 rounded"
            >
              Risada Boss
            </button>
            <button
              onClick={() =>
                dispararEfeito(
                  "taverna_sfx_global",
                  "alarme",
                  "Tocou: Som de Alerta"
                )
              }
              className="bg-blue-950 border border-blue-700 hover:bg-blue-800 text-blue-300 text-xs py-1.5 rounded"
            >
              Alerta
            </button>
          </div>
        </div>

        <div className="flex-1 bg-[#0a0a0a] border-2 border-[#5c3a21] rounded-lg shadow-lg flex flex-col overflow-hidden max-h-[350px]">
          <div className="bg-[#2b1810] p-2 border-b border-[#5c3a21] text-center">
            <span className="font-serif font-bold text-sm text-[#d4af37] uppercase tracking-widest">
              Diário da Taverna (Log)
            </span>
          </div>
          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2 bg-black/60 custom-scrollbar">
            {chat.map((msg, i) => (
              <div
                key={i}
                className="bg-black border border-[#2b1810] p-2 rounded text-sm shadow-md"
              >
                <span className="font-bold text-[#d4af37] mr-2">
                  [{msg.autor}]
                </span>
                <span className={msg.cor}>{msg.texto}</span>
              </div>
            ))}
          </div>
          <form
            onSubmit={enviarChatMestre}
            className="bg-[#2b1810] p-3 flex gap-2 border-t border-[#5c3a21]"
          >
            <input
              type="text"
              value={inputChat}
              onChange={(e) => setInputChat(e.target.value)}
              placeholder="Narre um evento..."
              className="flex-1 bg-black border border-[#5c3a21] rounded px-3 py-2 text-sm text-cyan-100 outline-none focus:border-cyan-500"
            />
            <button
              type="submit"
              className="bg-cyan-900 border border-cyan-500 text-cyan-400 px-4 font-bold uppercase text-xs rounded hover:bg-cyan-800"
            >
              Narrar
            </button>
          </form>
        </div>
      </div>

      <div className="w-80 shrink-0 flex flex-col gap-4">
        <div className="bg-[#0a0a0a] border-2 border-[#5c3a21] rounded-lg shadow-lg flex flex-col overflow-hidden h-full">
          <div className="bg-[#2b1810] p-3 border-b border-[#5c3a21] text-center flex justify-between items-center">
            <span className="font-serif font-bold text-sm text-[#d4af37] uppercase tracking-widest">
              Aventureiros ({jogadores.length})
            </span>
            <button
              onClick={apagarCampanha}
              className="text-[10px] bg-red-900 text-white px-2 py-1 rounded border border-red-500"
            >
              Resetar Campanha
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 custom-scrollbar">
            {jogadores.map((j, index) => {
              const hpAtual = j.heroi.status.hp - (j.danoRecebidoHeroi || 0);
              return (
                <div
                  key={index}
                  className="bg-black border-2 border-[#5c3a21] rounded p-3 flex flex-col gap-3 shadow-md relative"
                >
                  <div className="flex gap-3 items-center">
                    <img
                      src={j.heroi.imagem}
                      alt="Heroi"
                      className="w-10 h-10 rounded-full border border-[#d4af37] object-cover object-top"
                    />
                    <div className="flex flex-col flex-1 min-w-0">
                      <span className="font-bold text-xs text-white uppercase truncate">
                        {j.heroi.nome}
                      </span>
                      <span className="text-[9px] text-cyan-400 uppercase truncate">
                        NVL {j.nivel || 1} • {j.heroi.classe}
                      </span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center bg-[#1a1c29] p-2 border border-slate-800 rounded">
                    <span className="text-[10px] font-bold text-red-400">
                      ❤️ {hpAtual}/{j.heroi.status.hp}
                    </span>
                    <span className="text-[10px] font-bold text-yellow-400">
                      💰 {j.ouroAtual || 0}g
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-1 mt-1">
                    <button
                      onClick={() => concederOuro(j, 50)}
                      className="bg-yellow-900 border border-yellow-600 text-yellow-300 text-[9px] font-bold uppercase py-1 rounded hover:bg-yellow-700"
                    >
                      +50 Ouro
                    </button>
                    <button
                      onClick={() => concederCura(j)}
                      className="bg-green-900 border border-green-600 text-green-300 text-[9px] font-bold uppercase py-1 rounded hover:bg-green-700"
                    >
                      Curar Max
                    </button>
                  </div>

                  <div className="flex gap-1 items-center mt-1 border-t border-slate-800 pt-2">
                    <select
                      onChange={(e) =>
                        setItemSelecionado((prev) => ({
                          ...prev,
                          [j.heroi.id]: e.target.value,
                        }))
                      }
                      className="bg-black border border-slate-700 text-[9px] text-slate-300 p-1 flex-1 outline-none rounded"
                    >
                      {listaItensDivinos.map((i) => (
                        <option key={i.id} value={i.id}>
                          {i.nome}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={() => concederItem(j)}
                      className="bg-cyan-900 border border-cyan-500 text-cyan-200 px-2 py-1 text-[9px] font-bold uppercase rounded hover:bg-cyan-700"
                    >
                      Dar Item
                    </button>
                  </div>
                </div>
              );
            })}
            {jogadores.length === 0 && (
              <p className="text-xs text-slate-500 text-center italic mt-10">
                Nenhum aventureiro na mesa.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
