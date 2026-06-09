import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { trilhasCenarios } from "./bancoDeAudio";

export default function Lobby() {
  const navigate = useNavigate();
  const [herois, setHerois] = useState([]);
  const [modoForja, setModoForja] = useState(false);

  const [esquadrao, setEsquadrao] = useState([]);
  const [limiteEsquadrao, setLimiteEsquadrao] = useState(1);

  const [nomeForm, setNomeForm] = useState("");
  const [classeForm, setClasseForm] = useState("Guerreiro");
  const [generoForm, setGeneroForm] = useState("Masculino");
  const [corForm, setCorForm] = useState("Vermelho Escuro");
  const [imagemBase64, setImagemBase64] = useState(null);

  const audioRef = useRef(null);
  const [musicaTocando, setMusicaTocando] = useState(false);
  const [mutado, setMutado] = useState(
    () => localStorage.getItem("taverna_mute") === "true"
  );

  const alternarMute = (e) => {
    e.stopPropagation();
    const novoEstado = !mutado;
    setMutado(novoEstado);
    localStorage.setItem("taverna_mute", novoEstado);
  };

  useEffect(() => {
    audioRef.current = new Audio(trilhasCenarios.lobby);
    audioRef.current.loop = true;
    audioRef.current.volume = 0.4;
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (audioRef.current) {
      if (mutado) audioRef.current.pause();
      else
        audioRef.current
          .play()
          .then(() => setMusicaTocando(true))
          .catch(() => console.log("Aguardando interação"));
    }
  }, [mutado]);

  const iniciarMusicaSePausada = () => {
    if (!mutado && !musicaTocando && audioRef.current) {
      audioRef.current
        .play()
        .then(() => setMusicaTocando(true))
        .catch((e) => console.log(e));
    }
  };

  useEffect(() => {
    const atualizarRegra = () => {
      const regra = localStorage.getItem("taverna_regra_campanha") || "single";
      setLimiteEsquadrao(regra === "multi" ? 3 : 1);
    };
    atualizarRegra();

    const intervalRegra = setInterval(atualizarRegra, 2000);

    const carregarSaves = () => {
      const savesEncontrados = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key.startsWith("taverna_save_")) {
          const dados = JSON.parse(localStorage.getItem(key));
          if (dados && dados.heroi) {
            savesEncontrados.push(dados.heroi);
          }
        }
      }
      setHerois(savesEncontrados);
    };
    carregarSaves();

    return () => clearInterval(intervalRegra);
  }, [modoForja]);

  useEffect(() => {
    if (esquadrao.length > limiteEsquadrao) {
      setEsquadrao(esquadrao.slice(0, limiteEsquadrao));
    }
  }, [limiteEsquadrao, esquadrao]);

  // 📸 AQUI ESTÁ A MÁGICA: Agora salva em WebP mantendo o fundo transparente!
  const handleUploadImagem = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX_WIDTH = 400;
        const MAX_HEIGHT = 400;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);

        // Usando WEBP para garantir suporte a transparência e leveza
        const dataUrl = canvas.toDataURL("image/webp", 0.8);
        setImagemBase64(dataUrl);
      };
    };
  };

  const gerarPromptIngles = () => {
    const classTrans = {
      Guerreiro: "Warrior",
      Arqueira: "Archer",
      Mago: "Mage",
      Ladina: "Rogue",
      Clérigo: "Cleric",
      Druida: "Druid",
      "Elfo Negro": "Dark Elf",
      "Meio-Orc": "Half-Orc",
      Tiefling: "Tiefling",
      Vampiro: "Vampire",
    };
    const genTrans = { Masculino: "Male", Feminino: "Female" };
    const corTrans = {
      "Vermelho Escuro": "Dark Red",
      "Azul Cobalto": "Cobalt Blue",
      "Verde Esmeralda": "Emerald Green",
      "Preto Ônix": "Onyx Black",
      Dourado: "Gold",
      Prata: "Silver",
      "Roxo Sombrio": "Dark Purple",
    };
    return `2D game UI asset icon, full body character portrait, ${genTrans[generoForm]} ${classTrans[classeForm]}, wearing ${corTrans[corForm]} detailed armor/clothing, dark fantasy style, highly detailed, dramatic lighting, solid plain white background for easy cropping, 1024x1024 resolution, clean edges, concept art.`;
  };

  const copiarPrompt = () => {
    navigator.clipboard.writeText(gerarPromptIngles());
    alert(
      "Prompt copiado! Vá no Google AI Studio, gere a imagem, e depois faça o upload aqui!"
    );
  };

  const forjarHeroi = (e) => {
    e.preventDefault();
    if (!nomeForm || !imagemBase64) {
      alert("Herói sem nome ou sem rosto não entra na Taverna! Preencha tudo.");
      return;
    }
    try {
      const statusIniciais = {
        Guerreiro: { hp: 120, mana: 30, ataque: 12, movimento: 3, alcance: 1 },
        Arqueira: { hp: 80, mana: 50, ataque: 15, movimento: 5, alcance: 5 },
        Mago: { hp: 70, mana: 100, ataque: 8, movimento: 4, alcance: 4 },
        Ladina: { hp: 90, mana: 60, ataque: 18, movimento: 6, alcance: 1 },
        Clérigo: { hp: 110, mana: 80, ataque: 10, movimento: 3, alcance: 1 },
        Druida: { hp: 100, mana: 70, ataque: 12, movimento: 4, alcance: 3 },
        "Elfo Negro": {
          hp: 85,
          mana: 50,
          ataque: 16,
          movimento: 5,
          alcance: 4,
        },
        "Meio-Orc": { hp: 140, mana: 20, ataque: 16, movimento: 3, alcance: 1 },
        Tiefling: { hp: 90, mana: 90, ataque: 14, movimento: 4, alcance: 4 },
        Vampiro: { hp: 100, mana: 40, ataque: 18, movimento: 5, alcance: 1 },
      };

      const idHeroi = Date.now().toString();
      const mochilaVazia = Array(16).fill(null);
      const novoHeroi = {
        id: idHeroi,
        nome: nomeForm,
        classe: classeForm,
        genero: generoForm,
        imagem: imagemBase64,
        status: statusIniciais[classeForm],
        mochilaInicial: mochilaVazia,
      };

      const novoSave = {
        heroi: novoHeroi,
        mapa: null,
        posicaoHeroi: 27,
        manaAtual: novoHeroi.status.mana,
        danoRecebidoHeroi: 0,
        mochila: mochilaVazia,
        armaEquipada: null,
        armaduraEquipada: null,
        monstros: null,
        ouroAtual: 0,
      };
      localStorage.setItem(`taverna_save_${idHeroi}`, JSON.stringify(novoSave));

      alert(`⚔️ ${nomeForm} foi forjado com sucesso!`);
      setModoForja(false);
      setImagemBase64(null);
      setNomeForm("");
      window.location.reload();
    } catch (error) {
      alert("Erro ao salvar! A imagem pode estar demasiadamente pesada.");
    }
  };

  const deletarSave = (id, nome, e) => {
    e.stopPropagation();
    if (
      window.confirm(
        `Tem a certeza que deseja apagar o herói ${nome} permanentemente?`
      )
    ) {
      localStorage.removeItem(`taverna_save_${id}`);
      setHerois(herois.filter((h) => h.id !== id));
      setEsquadrao(esquadrao.filter((h) => h.id !== id));
    }
  };

  const toggleSelecaoHeroi = (heroi) => {
    const jaSelecionado = esquadrao.find((h) => h.id === heroi.id);
    if (jaSelecionado) {
      setEsquadrao(esquadrao.filter((h) => h.id !== heroi.id));
    } else {
      if (esquadrao.length < limiteEsquadrao) {
        setEsquadrao([...esquadrao, heroi]);
      } else {
        alert(
          `O Mestre definiu que o limite desta campanha é de ${limiteEsquadrao} herói(s) por jogador!`
        );
      }
    }
  };

  const entrarNaMesaDeGuerra = () => {
    if (esquadrao.length === 0) return;
    navigate("/mapa", { state: { esquadrao: esquadrao } }); // Repassa só o esquadrão inteiro
  };

  return (
    <div
      onClick={iniciarMusicaSePausada}
      className="min-h-screen bg-black flex flex-col items-center justify-center p-8 font-sans text-white relative bg-[url('/bg-parchment-dark.jpg')] bg-cover bg-center bg-blend-multiply bg-black/95"
    >
      <div className="absolute top-6 right-6 flex items-center gap-6 z-50">
        <button
          onClick={alternarMute}
          className="text-3xl hover:scale-110 transition-all drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]"
          title="Mutar/Desmutar Som"
        >
          {mutado ? "🔇" : "🔊"}
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            navigate("/mestre");
          }}
          className="bg-yellow-900/60 hover:bg-yellow-700 border-2 border-yellow-500 text-yellow-400 px-5 py-2.5 rounded-md font-extrabold uppercase tracking-widest text-xs transition-all shadow-[0_0_15px_rgba(250,204,21,0.5)] flex items-center gap-2"
        >
          👁️ Painel do Mestre
        </button>
      </div>

      <div className="flex flex-col items-center justify-center text-center mb-10 drop-shadow-[0_5px_15px_rgba(0,208,255,0.4)] mt-10">
        <div className="flex items-center gap-4 mb-2">
          <img
            src="/logo-taverna.png"
            alt="Logo Taverna"
            className="w-16 h-16 object-contain"
            onError={(e) => (e.target.style.display = "none")}
          />
          <h1 className="text-5xl font-serif font-extrabold text-transparent bg-clip-text bg-gradient-to-b from-[#00d0ff] to-[#8b2aff] tracking-widest uppercase">
            Taverna Digital
          </h1>
        </div>
        <p className="text-[#d4af37] font-serif text-lg tracking-widest italic">
          VTT Engine • Mesa de RPG
        </p>
      </div>

      {!modoForja ? (
        <div className="w-full max-w-5xl bg-[#0a0a0a] border-4 border-[#3e2723] rounded-xl p-8 shadow-[0_0_40px_rgba(0,0,0,0.9)] relative">
          <div className="flex justify-between items-center mb-8 border-b-2 border-[#5c3a21] pb-4">
            <div>
              <h2 className="text-2xl font-serif font-bold text-[#d4af37] uppercase tracking-widest">
                Sua Party (Saves)
              </h2>
              <p className="text-sm text-cyan-400 mt-1">
                Regra do Mestre atual: Max {limiteEsquadrao} Herói(s)
              </p>
            </div>
            <button
              onClick={() => setModoForja(true)}
              className="bg-gradient-to-r from-blue-900 to-indigo-900 hover:from-blue-800 hover:to-indigo-800 border-2 border-[#00d0ff] text-white px-6 py-2 rounded font-bold uppercase tracking-widest text-sm transition-all shadow-[0_0_15px_rgba(0,208,255,0.4)]"
            >
              ✨ Forjar Novo Herói
            </button>
          </div>

          {herois.length === 0 ? (
            <div className="text-center py-12 flex flex-col items-center gap-4">
              <span className="text-6xl grayscale opacity-30">🛡️</span>
              <p className="text-slate-400 text-lg font-serif">
                Nenhum herói forjado ainda. A mesa está vazia.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 mb-20">
              {herois.map((heroi) => {
                const isSelecionado = esquadrao.find((h) => h.id === heroi.id);
                return (
                  <div
                    key={heroi.id}
                    onClick={() => toggleSelecaoHeroi(heroi)}
                    className={`group bg-black border-4 rounded-lg p-3 cursor-pointer transition-all hover:scale-105 shadow-lg relative overflow-hidden flex flex-col items-center ${
                      isSelecionado
                        ? "border-green-500 shadow-[0_0_20px_rgba(34,197,94,0.6)] bg-green-900/20"
                        : "border-[#5c3a21] hover:border-[#d4af37]"
                    }`}
                  >
                    {isSelecionado && (
                      <div className="absolute top-0 left-0 bg-green-500 text-black text-[10px] font-bold px-2 py-1 rounded-br-lg z-10">
                        SELECIONADO
                      </div>
                    )}
                    <div className="w-16 h-16 bg-gradient-to-b from-slate-900 to-black rounded-full border-2 border-[#d4af37] mb-2 overflow-hidden shadow-inner flex items-center justify-center">
                      <img
                        src={heroi.imagem}
                        alt={heroi.nome}
                        className="w-full h-full object-cover object-top"
                      />
                    </div>
                    <h3 className="font-serif font-bold text-sm text-center text-white uppercase tracking-wider truncate w-full">
                      {heroi.nome}
                    </h3>
                    <p className="text-cyan-400 text-[10px] font-bold uppercase tracking-widest mt-1">
                      {heroi.classe}
                    </p>
                    <button
                      onClick={(e) => deletarSave(heroi.id, heroi.nome, e)}
                      className="absolute top-1 right-1 text-red-500 hover:text-red-300 hover:scale-125 transition-all text-lg drop-shadow-md"
                      title="Apagar Save"
                    >
                      ✖
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {esquadrao.length > 0 && (
            <div className="absolute bottom-[-20px] left-1/2 -translate-x-1/2 w-3/4 flex justify-center animate-[floatUp_0.5s_ease-out]">
              <button
                onClick={entrarNaMesaDeGuerra}
                className="w-full bg-gradient-to-r from-green-700 to-green-500 border-4 border-green-300 text-white font-extrabold text-xl py-4 rounded-full uppercase tracking-widest shadow-[0_0_30px_rgba(34,197,94,0.8)] hover:scale-105 transition-all"
              >
                ⚔️ Entrar na Taverna ({esquadrao.length}/{limiteEsquadrao})
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="w-full max-w-5xl bg-[#0a0a0a] border-4 border-[#3e2723] rounded-xl p-8 shadow-[0_0_40px_rgba(0,208,255,0.2)] flex flex-col md:flex-row gap-8">
          <div className="flex-1 flex flex-col gap-5 border-r-2 border-[#5c3a21] pr-8">
            <h2 className="text-2xl font-serif font-bold text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-400 to-cyan-400 uppercase tracking-widest border-b border-[#5c3a21] pb-2">
              Forja Divina (IA)
            </h2>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold uppercase tracking-widest text-[#d4af37]">
                Nome do Herói
              </label>
              <input
                type="text"
                value={nomeForm}
                onChange={(e) => setNomeForm(e.target.value)}
                placeholder="Ex: Evandro, O Destruidor"
                className="bg-black border border-[#5c3a21] p-3 rounded text-white outline-none focus:border-cyan-400 transition-all font-serif"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold uppercase tracking-widest text-[#d4af37]">
                  Classe / Raça
                </label>
                <select
                  value={classeForm}
                  onChange={(e) => setClasseForm(e.target.value)}
                  className="bg-black border border-[#5c3a21] p-3 rounded text-white outline-none focus:border-cyan-400 font-serif"
                >
                  <option value="Guerreiro">Guerreiro</option>
                  <option value="Arqueira">Arqueira</option>
                  <option value="Mago">Mago</option>
                  <option value="Ladina">Ladina</option>
                  <option value="Clérigo">Clérigo</option>
                  <option value="Druida">Druida</option>
                  <option value="Elfo Negro">Elfo Negro</option>
                  <option value="Meio-Orc">Meio-Orc</option>
                  <option value="Tiefling">Tiefling</option>
                  <option value="Vampiro">Vampiro</option>
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold uppercase tracking-widest text-[#d4af37]">
                  Gênero
                </label>
                <select
                  value={generoForm}
                  onChange={(e) => setGeneroForm(e.target.value)}
                  className="bg-black border border-[#5c3a21] p-3 rounded text-white outline-none focus:border-cyan-400 font-serif"
                >
                  <option value="Masculino">Masculino</option>
                  <option value="Feminino">Feminino</option>
                </select>
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold uppercase tracking-widest text-[#d4af37]">
                Cor da Armadura / Veste
              </label>
              <select
                value={corForm}
                onChange={(e) => setCorForm(e.target.value)}
                className="bg-black border border-[#5c3a21] p-3 rounded text-white outline-none focus:border-cyan-400 font-serif"
              >
                <option value="Vermelho Escuro">Vermelho Escuro</option>
                <option value="Azul Cobalto">Azul Cobalto</option>
                <option value="Verde Esmeralda">Verde Esmeralda</option>
                <option value="Preto Ônix">Preto Ônix</option>
                <option value="Dourado">Dourado</option>
                <option value="Prata">Prata</option>
                <option value="Roxo Sombrio">Roxo Sombrio</option>
              </select>
            </div>

            <div className="bg-[#140e0b] border border-fuchsia-900 p-4 rounded mt-2 shadow-inner">
              <p className="text-[10px] text-fuchsia-300 font-bold uppercase tracking-widest mb-2">
                Prompt Gerado Automaticamente
              </p>
              <p className="text-sm font-serif text-slate-300 italic select-all bg-black p-3 rounded border border-slate-700">
                {gerarPromptIngles()}
              </p>
              <button
                onClick={copiarPrompt}
                className="w-full mt-3 bg-fuchsia-900 hover:bg-fuchsia-800 text-white text-xs font-bold py-2 rounded border border-fuchsia-500 uppercase tracking-widest transition-all"
              >
                📋 Copiar Prompt
              </button>
            </div>
          </div>

          <div className="w-80 shrink-0 flex flex-col gap-6 items-center">
            <div className="w-full bg-[#140e0b] border-2 border-dashed border-[#5c3a21] rounded-lg p-6 flex flex-col items-center justify-center gap-4 relative hover:border-cyan-400 transition-all group">
              {imagemBase64 ? (
                <div className="w-48 h-48 bg-black rounded-full border-4 border-[#d4af37] overflow-hidden shadow-[0_0_20px_rgba(212,175,55,0.4)] flex items-center justify-center">
                  <img
                    src={imagemBase64}
                    alt="Preview"
                    className="w-full h-full object-contain"
                  />
                </div>
              ) : (
                <div className="w-48 h-48 bg-black/50 rounded-full border-4 border-dashed border-slate-700 flex items-center justify-center text-5xl text-slate-600 group-hover:text-cyan-400 group-hover:border-cyan-400 transition-all">
                  🧙‍♂️
                </div>
              )}
              <div className="text-center w-full relative">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleUploadImagem}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />
                <button className="w-full bg-slate-800 text-cyan-400 text-xs font-bold py-3 rounded border border-slate-600 uppercase tracking-widest shadow-md">
                  {imagemBase64 ? "Trocar Imagem" : "📂 Fazer Upload da Arte"}
                </button>
              </div>
            </div>

            <div className="w-full flex gap-3 mt-auto">
              <button
                onClick={() => setModoForja(false)}
                className="flex-1 bg-transparent border-2 border-red-900 text-red-500 hover:bg-red-900/30 font-bold uppercase tracking-widest text-xs py-3 rounded transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={forjarHeroi}
                className="flex-1 bg-green-900 border-2 border-green-500 hover:bg-green-800 text-white font-bold uppercase tracking-widest text-xs py-3 rounded transition-all shadow-[0_0_15px_rgba(34,197,94,0.4)]"
              >
                Finalizar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
