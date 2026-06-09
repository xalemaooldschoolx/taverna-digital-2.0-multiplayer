import React, { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { bancoDeItens } from "./bancoDeItens";
import {
  trilhasCenarios,
  sfx,
  sfxDano,
  voxBoss,
  tocarSFX,
  tocarVozBoss,
} from "./bancoDeAudio";

export default function Arena() {
  const location = useLocation();
  const navigate = useNavigate();

  const esquadraoBase =
    location.state?.esquadrao ||
    (location.state?.heroi ? [location.state?.heroi] : []);
  const mapaVindoDaTelaAnterior = location.state?.mapa;
  const idCenarioAtivo = location.state?.idCenario || "forja";

  const [mapaAtivo] = useState(
    mapaVindoDaTelaAnterior || "/cenarios/09-forja-ana.jpg"
  );
  const quadradosBloqueados = [12, 13, 21, 29, 37, 45, 53, 54, 55];

  const [petsEquipados, setPetsEquipados] = useState({});
  const [montariasEquipadas, setMontariasEquipadas] = useState({});
  const [carregando, setCarregando] = useState(true);

  // ==========================================
  // 1. NÚCLEO MATEMÁTICO E STATUS BASE
  // ==========================================
  const getHpMaximo = (h) => {
    if (!h || !h.id) return 100;
    let hp = (h.status?.hp || 100) + ((h.nivel || 1) - 1) * 20;
    if (h.armaduraEquipada?.id && bancoDeItens[h.armaduraEquipada.id]) {
      hp += bancoDeItens[h.armaduraEquipada.id].hpBonus || 0;
    }
    if (montariasEquipadas[h.id]) hp += 20;
    return hp;
  };

  const isVivo = (h) => h && getHpMaximo(h) - (h.danoRecebido || 0) > 0;

  const [esquadraoCombate, setEsquadraoCombate] = useState(() => {
    let party = esquadraoBase.filter(Boolean).map((h, i) => {
      const saved =
        JSON.parse(localStorage.getItem(`taverna_save_${h.id}`)) || {};
      const posInicial =
        saved.posicaoHeroi && !quadradosBloqueados.includes(saved.posicaoHeroi)
          ? saved.posicaoHeroi
          : 25 + i;
      return {
        ...h,
        posicao: posInicial,
        nivel: saved.nivel || 1,
        xp: saved.xp || 0,
        danoRecebido: saved.danoRecebidoHeroi || 0,
        mana: saved.manaAtual ?? (h.status?.mana || 50),
        mochila: saved.mochila || h.mochilaInicial || Array(16).fill(null),
        armaEquipada: saved.armaEquipada || null,
        armaduraEquipada: saved.armaduraEquipada || null,
        ouro: saved.ouroAtual || 0,
      };
    });

    const alguemVivo = party.some((h) => isVivo(h));
    if (!alguemVivo)
      party = party.map((h) => ({
        ...h,
        danoRecebido: 0,
        mana: h.status?.mana || 50,
      }));
    return party;
  });

  const [idxHeroiFocado, setIdxHeroiFocado] = useState(0);
  const heroiAtivo = esquadraoCombate[idxHeroiFocado];
  const partyViva = esquadraoCombate.some((h) => isVivo(h));

  const [mutado, setMutado] = useState(
    () => localStorage.getItem("taverna_mute") === "true"
  );
  const audioBgmRef = useRef(null);
  const [bgmAtual] = useState(
    trilhasCenarios[idCenarioAtivo] || trilhasCenarios.forja
  );
  const [telaTremendo, setTelaTremendo] = useState(false);

  const gerarMonstrosHardcore = (tamanhoEsquadrao) => {
    const horda = [];
    const qtdMonstros = tamanhoEsquadrao + 1;
    let posDisponiveis = Array.from({ length: 64 }, (_, i) => i)
      .filter((i) => !quadradosBloqueados.includes(i) && i < 24)
      .sort(() => Math.random() - 0.5);

    for (let i = 0; i < Math.max(2, qtdMonstros); i++) {
      let rank = "comum";
      let hp = 60;
      let atq = 8;
      let img = "/personagens/inimigo-goblin.png";
      let nome = "Lacaio";
      if (i === 0) {
        rank = "boss";
        hp = 200;
        atq = 18;
        nome = "General";
        img = "/personagens/inimigo-orc.png";
      } else if (i === 1 && tamanhoEsquadrao > 1) {
        rank = "elite";
        hp = 100;
        atq = 12;
        nome = "Elite";
        img = "/personagens/inimigo-sucubo.png";
      }
      horda.push({
        id: Date.now() + i,
        nome: `${nome} ${i + 1}`,
        posicao: posDisponiveis[i],
        hp,
        hpMaximo: hp,
        vivo: true,
        imagem: img,
        ataque: atq,
        rank,
      });
    }
    return horda;
  };

  const [monstros, setMonstros] = useState(() => {
    const hordaBase = gerarMonstrosHardcore(esquadraoCombate.length);
    let poderExtraItens = 0;
    esquadraoCombate.forEach((h) => {
      if (h.armaEquipada?.id && bancoDeItens[h.armaEquipada.id])
        poderExtraItens += bancoDeItens[h.armaEquipada.id].ataqueBonus || 0;
    });
    const multiplicadorHard =
      1.0 + esquadraoCombate.length * 0.15 + poderExtraItens * 0.02;

    return hordaBase.map((m) => ({
      ...m,
      hpMaximo: Math.floor(m.hpMaximo * multiplicadorHard),
      hp: Math.floor(m.hpMaximo * multiplicadorHard),
      ataque: Math.floor(m.ataque * multiplicadorHard),
    }));
  });

  const [abaAtiva, setAbaAtiva] = useState("");
  const [turno, setTurno] = useState("jogador");
  const [magiaPreparada, setMagiaPreparada] = useState(null);
  const [efeitoCombate, setEfeitoCombate] = useState(null);
  const [bau, setBau] = useState({
    ativo: false,
    posicao: null,
    item: null,
    imagem: "/itens/item-bau-epico.png",
  });

  const alternarMute = () => {
    const novoEstado = !mutado;
    setMutado(novoEstado);
    localStorage.setItem("taverna_mute", novoEstado);
  };
  const tocarAleatorio = (arr) => {
    if (arr?.length > 0) tocarSFX(arr[Math.floor(Math.random() * arr.length)]);
  };

  // ==========================================
  // 2. TODOS OS EFFECTS (RODAM ANTES DA TELA)
  // ==========================================

  useEffect(() => {
    if (esquadraoCombate.length > 0) {
      const timer = setTimeout(() => setCarregando(false), 300);
      return () => clearTimeout(timer);
    } else navigate("/");
  }, [esquadraoCombate, navigate]);

  useEffect(() => {
    if (!bgmAtual) return;
    if (audioBgmRef.current) audioBgmRef.current.pause();
    audioBgmRef.current = new Audio(bgmAtual);
    audioBgmRef.current.loop = true;
    audioBgmRef.current.volume = 0.3;
    if (!mutado) audioBgmRef.current.play().catch(() => {});
    return () => {
      if (audioBgmRef.current) audioBgmRef.current.pause();
    };
  }, [bgmAtual, mutado]);

  useEffect(() => {
    if (heroiAtivo && !isVivo(heroiAtivo)) {
      const proximoVivo = esquadraoCombate.findIndex((h) => isVivo(h));
      if (proximoVivo !== -1) setIdxHeroiFocado(proximoVivo);
    }
  }, [esquadraoCombate, heroiAtivo]);

  useEffect(() => {
    const escutarMestre = (e) => {
      if (e.key === "taverna_caos_global" && e.newValue) {
        setTelaTremendo(true);
        tocarAleatorio(sfxDano.monstro);
        setEfeitoCombate({
          centro: 27,
          areaAfetada: Array.from({ length: 64 }, (_, i) => i),
          texto: "CAOS!",
          cor: "text-red-600",
          alvoHUD: "heroi",
        });
        setTimeout(() => {
          setTelaTremendo(false);
          setEfeitoCombate(null);
        }, 3000);
      }
      if (e.key === "taverna_spawn_global" && e.newValue) {
        const data = JSON.parse(e.newValue);
        if (data.tipo === "bau") {
          tocarSFX(sfx.bau);
          setBau({
            ativo: true,
            posicao: Math.floor(Math.random() * 64),
            item: "/itens/item-pocao-vida.png",
            imagem: "/itens/item-bau-epico.png",
          });
        } else if (data.tipo === "lacaio") {
          tocarAleatorio(sfxDano.homem);
          setMonstros((prev) => [
            ...prev,
            {
              id: Date.now(),
              nome: "Reforço Extra",
              posicao: 15,
              hp: 50,
              hpMaximo: 50,
              vivo: true,
              imagem: "/personagens/inimigo-goblin.png",
              ataque: 10,
              rank: "comum",
            },
          ]);
        }
      }
    };
    window.addEventListener("storage", escutarMestre);
    return () => window.removeEventListener("storage", escutarMestre);
  }, []);

  useEffect(() => {
    esquadraoCombate.forEach((h) => {
      if (!h.id) return;
      const saveKeyHeroi = `taverna_save_${h.id}`;
      const saved = JSON.parse(localStorage.getItem(saveKeyHeroi)) || {};
      const novoSave = {
        ...saved,
        heroi: h,
        mapa: mapaAtivo,
        posicaoHeroi: h.posicao,
        manaAtual: h.mana,
        xp: h.xp,
        nivel: h.nivel,
        danoRecebidoHeroi: h.danoRecebido,
        mochila: h.mochila,
        armaEquipada: h.armaEquipada,
        armaduraEquipada: h.armaduraEquipada,
        ouroAtual: h.ouro,
        monstros: monstros,
      };
      localStorage.setItem(saveKeyHeroi, JSON.stringify(novoSave));
    });
  }, [esquadraoCombate, monstros, mapaAtivo]);

  const abandonarBatalha = () => {
    if (
      window.confirm(
        "Retirada Tática? Todos os monstros voltarão à vida na próxima visita."
      )
    ) {
      esquadraoCombate.forEach((h) => {
        const s =
          JSON.parse(localStorage.getItem(`taverna_save_${h.id}`)) || {};
        s.mapa = null;
        s.monstros = null;
        localStorage.setItem(`taverna_save_${h.id}`, JSON.stringify(s));
      });
      navigate("/mapa", {
        state: { heroi: esquadraoCombate[0], esquadrao: esquadraoCombate },
      });
    }
  };

  useEffect(() => {
    if (!carregando && !partyViva) {
      setTimeout(() => {
        alert("💀 ESQUADRÃO ANIQUILADO! GAME OVER!");
        abandonarBatalha();
      }, 1000);
    }
  }, [partyViva, carregando]);

  const calcularDistancia = (o, d) =>
    Math.max(
      Math.abs((d % 8) - (o % 8)),
      Math.abs(Math.floor(d / 8) - Math.floor(o / 8))
    );
  const getAlvoMaisProximo = (posMonstro) => {
    let alvo = null;
    let menorDist = 999;
    esquadraoCombate.forEach((h) => {
      if (isVivo(h)) {
        const dist = calcularDistancia(posMonstro, h.posicao);
        if (dist < menorDist) {
          menorDist = dist;
          alvo = h;
        }
      }
    });
    return { alvo, dist: menorDist };
  };

  useEffect(() => {
    if (turno === "inimigo" && partyViva) {
      if (monstros.filter((m) => m.vivo).length === 0) {
        setTurno("jogador");
        return;
      }

      setTimeout(() => {
        let danoPorHeroi = {};
        let posicoesOcupadas = [
          ...quadradosBloqueados,
          ...esquadraoCombate.map((h) => h.posicao),
        ];

        const monstrosAtualizados = monstros.map((m) => {
          if (!m.vivo) return m;
          const { alvo, dist } = getAlvoMaisProximo(m.posicao);
          if (!alvo) return m;

          if (dist <= 1) {
            danoPorHeroi[alvo.id] = (danoPorHeroi[alvo.id] || 0) + m.ataque;
            return m;
          } else {
            let nX = m.posicao % 8;
            let nY = Math.floor(m.posicao / 8);
            const aX = alvo.posicao % 8;
            const aY = Math.floor(alvo.posicao / 8);
            if (aX > nX) nX++;
            else if (aX < nX) nX--;
            if (aY > nY) nY++;
            else if (aY < nY) nY--;
            const novaPos = nY * 8 + nX;
            if (!posicoesOcupadas.includes(novaPos)) {
              posicoesOcupadas.push(novaPos);
              return { ...m, posicao: novaPos };
            } else {
              posicoesOcupadas.push(m.posicao);
              return m;
            }
          }
        });

        if (Object.keys(danoPorHeroi).length > 0) {
          tocarSFX(sfx.pancada);
          tocarAleatorio(sfxDano.homem);
          setEsquadraoCombate((prev) =>
            prev.map((h) =>
              danoPorHeroi[h.id]
                ? { ...h, danoRecebido: h.danoRecebido + danoPorHeroi[h.id] }
                : h
            )
          );
          setEfeitoCombate({
            centro: 27,
            areaAfetada: [],
            texto: `Dano Sofrido!`,
            cor: "text-red-500",
            alvoHUD: "heroi",
          });
          setTimeout(() => setEfeitoCombate(null), 800);
        }
        setMonstros(monstrosAtualizados);
        setTurno("jogador");
      }, 800);
    }
  }, [turno, monstros, esquadraoCombate, partyViva]);

  // ==========================================
  // 3. TELA DE LOADING
  // ==========================================
  if (carregando || !heroiAtivo) {
    return (
      <div className="min-h-screen bg-[#050814] flex flex-col items-center justify-center font-sans text-white gap-4 relative bg-[url('/bg-parchment-dark.jpg')] bg-cover bg-center bg-blend-multiply bg-black/95">
        <div className="w-16 h-16 bg-black border-4 border-[#d4af37] rounded-full animate-spin border-t-cyan-400"></div>
        <h2 className="text-[#d4af37] font-serif text-2xl uppercase tracking-widest animate-pulse">
          Forjando a Masmorra...
        </h2>
      </div>
    );
  }

  // ==========================================
  // 4. PREPARAÇÃO DA INTERFACE
  // ==========================================
  const xpMaximoAtual = heroiAtivo.nivel * 100;
  const classeBase = heroiAtivo.classe
    ? heroiAtivo.classe.split(" ")[0].toLowerCase()
    : "guerreiro";
  const iconeBrasaoHeroi = `/itens/brasao-${classeBase}.png`;

  let hpMaximo = getHpMaximo(heroiAtivo);
  const manaMaxima =
    (heroiAtivo.status?.mana || 50) + ((heroiAtivo.nivel || 1) - 1) * 10;

  let ataqueTotal =
    (heroiAtivo.status?.ataque || 10) + (heroiAtivo.nivel - 1) * 2;
  let movimentoAtual = heroiAtivo.status?.movimento || 3;
  let alcanceAtaque =
    heroiAtivo.status?.alcance ||
    (classeBase === "arqueira" || classeBase === "arqueiro"
      ? 5
      : classeBase === "mago"
      ? 4
      : 1);
  let areaAtaque = 0;

  if (heroiAtivo.armaEquipada?.id && bancoDeItens[heroiAtivo.armaEquipada.id]) {
    const bArma = bancoDeItens[heroiAtivo.armaEquipada.id];
    if (bArma.ataqueBonus) ataqueTotal += bArma.ataqueBonus;
    if (bArma.alcance) alcanceAtaque = bArma.alcance;
    if (bArma.area) areaAtaque = bArma.area;
  }
  if (
    heroiAtivo.armaduraEquipada?.id &&
    bancoDeItens[heroiAtivo.armaduraEquipada.id]
  ) {
    movimentoAtual +=
      bancoDeItens[heroiAtivo.armaduraEquipada.id].movimentoBonus || 0;
  }
  if (montariasEquipadas[heroiAtivo.id]) {
    movimentoAtual += 2;
  }
  if (petsEquipados[heroiAtivo.id]) {
    ataqueTotal += 5;
  }

  const hpAtualHeroi = Math.max(0, hpMaximo - (heroiAtivo.danoRecebido || 0));
  const areaLimpa = monstros.length > 0 && !monstros.some((m) => m.vivo);
  const monstroHUD =
    monstros.find((m) => m.vivo && m.rank === "boss") ||
    monstros.find((m) => m.vivo) ||
    monstros[0];

  const retornarVitorioso = () => {
    if (
      bau.ativo &&
      !window.confirm("⚠️ Tem um Baú no chão! Quer voltar e perder o tesouro?")
    )
      return;
    esquadraoCombate.forEach((h) => {
      const s = JSON.parse(localStorage.getItem(`taverna_save_${h.id}`)) || {};
      s.mapa = null;
      s.monstros = null;
      localStorage.setItem(`taverna_save_${h.id}`, JSON.stringify(s));
    });
    navigate("/mapa", {
      state: { heroi: esquadraoCombate[0], esquadrao: esquadraoCombate },
    });
  };

  const grimorioDeClasses = {
    guerreiro: [
      {
        nome: "Golpe Demolidor",
        custo: 15,
        tipo: "ataque",
        danoExtra: 25,
        alcance: 1,
        icone: "💥",
      },
      { nome: "Grito", custo: 10, tipo: "buff", cura: 20, icone: "🛡️" },
      {
        nome: "Fúria",
        custo: 25,
        tipo: "ataque",
        danoExtra: 40,
        alcance: 1,
        area: 1,
        icone: "⚔️",
      },
    ],
    arqueira: [
      {
        nome: "Tiro Perfurante",
        custo: 15,
        tipo: "ataque",
        danoExtra: 20,
        alcance: 5,
        icone: "🎯",
      },
      {
        nome: "Chuva de Flechas",
        custo: 25,
        tipo: "ataque",
        danoExtra: 15,
        alcance: 5,
        area: 2,
        icone: "🏹",
      },
      { nome: "Curativo", custo: 10, tipo: "buff", cura: 25, icone: "🍃" },
    ],
    mago: [
      {
        nome: "Bola de Fogo",
        custo: 20,
        tipo: "ataque",
        danoExtra: 35,
        alcance: 4,
        area: 1,
        icone: "🔥",
      },
      {
        nome: "Raio",
        custo: 15,
        tipo: "ataque",
        danoExtra: 25,
        alcance: 5,
        icone: "❄️",
      },
      { nome: "Transfusão", custo: 10, tipo: "buff", cura: 30, icone: "✨" },
    ],
    ladina: [
      {
        nome: "Furtivo",
        custo: 15,
        tipo: "ataque",
        danoExtra: 40,
        alcance: 1,
        icone: "🗡️",
      },
      { nome: "Fumaça", custo: 10, tipo: "buff", cura: 10, icone: "🌫️" },
      {
        nome: "Tóxica",
        custo: 20,
        tipo: "ataque",
        danoExtra: 30,
        alcance: 1,
        icone: "☠️",
      },
    ],
  };
  let habilidadesDoHeroi =
    grimorioDeClasses[classeBase] || grimorioDeClasses.guerreiro;
  if (classeBase === "arqueiro")
    habilidadesDoHeroi = grimorioDeClasses.arqueira;

  const atualizarHeroiAtivo = (novosDados) => {
    setEsquadraoCombate((prev) => {
      const copia = [...prev];
      copia[idxHeroiFocado] = { ...copia[idxHeroiFocado], ...novosDados };
      return copia;
    });
  };

  const usarHabilidade = (hab) => {
    if (heroiAtivo.mana < hab.custo) return alert("Mana insuficiente!");
    if (hab.tipo === "buff") {
      tocarSFX(sfx.cura);
      atualizarHeroiAtivo({
        mana: heroiAtivo.mana - hab.custo,
        danoRecebido: Math.max(0, heroiAtivo.danoRecebido - hab.cura),
      });
      setEfeitoCombate({
        centro: heroiAtivo.posicao,
        areaAfetada: [heroiAtivo.posicao],
        texto: `+${hab.cura} HP`,
        cor: "text-green-400",
        alvoHUD: "heroi",
      });
      setTimeout(() => setEfeitoCombate(null), 1000);
      setTurno("inimigo");
    } else setMagiaPreparada(hab);
  };

  const interagirComQuadrado = (novoIndice) => {
    if (turno !== "jogador" || hpAtualHeroi <= 0) return;
    if (quadradosBloqueados.includes(novoIndice))
      return alert("Caminho bloqueado!");

    const monstroAlvo = monstros.find(
      (m) => m.vivo && m.posicao === novoIndice
    );

    if (monstroAlvo) {
      let danoFinal = ataqueTotal;
      let custoMana = 0;
      let alcanceFinal = alcanceAtaque;
      let areaFinal = areaAtaque;
      let corDano = areaAtaque > 0 ? "text-fuchsia-400" : "text-yellow-400";
      let textoDano = "BAM!";

      if (magiaPreparada) {
        danoFinal = ataqueTotal + magiaPreparada.danoExtra;
        custoMana = magiaPreparada.custo;
        if (magiaPreparada.alcance) alcanceFinal = magiaPreparada.alcance;
        if (magiaPreparada.area) areaFinal = magiaPreparada.area;
        corDano = "text-cyan-400";
        textoDano = magiaPreparada.icone;
      }

      if (calcularDistancia(heroiAtivo.posicao, novoIndice) > alcanceFinal) {
        setMagiaPreparada(null);
        return alert(`Fora de alcance! Alcance é ${alcanceFinal}.`);
      }
      if (heroiAtivo.mana < custoMana) {
        setMagiaPreparada(null);
        return alert("Sem Mana.");
      }

      atualizarHeroiAtivo({ mana: heroiAtivo.mana - custoMana });
      if (magiaPreparada) {
        if (areaFinal > 0) tocarSFX(sfx.magiaArea);
        else tocarSFX(sfx.magiaAtaque);
      } else {
        if (classeBase === "mago") tocarSFX(sfx.magiaAtaque);
        else if (alcanceFinal > 1) tocarSFX(sfx.flecha);
        else tocarSFX(sfx.espada);
      }
      setMagiaPreparada(null);

      let posAtingidas = [novoIndice];
      if (areaFinal > 0) {
        const mX = novoIndice % 8;
        const mY = Math.floor(novoIndice / 8);
        for (let x = -areaFinal; x <= areaFinal; x++) {
          for (let y = -areaFinal; y <= areaFinal; y++) {
            const nX = mX + x;
            const nY = mY + y;
            if (nX >= 0 && nX < 8 && nY >= 0 && nY < 8) {
              const idx = nY * 8 + nX;
              if (!posAtingidas.includes(idx)) posAtingidas.push(idx);
            }
          }
        }
      }

      const monstrosAposAtaque = monstros.map((m) => {
        if (m.vivo && posAtingidas.includes(m.posicao))
          return { ...m, hp: m.hp - danoFinal, vivo: m.hp - danoFinal > 0 };
        return m;
      });

      if (monstroAlvo.rank === "boss" && monstroAlvo.hp - danoFinal <= 0)
        setTimeout(() => tocarVozBoss(voxBoss.morte), 300);
      else tocarSFX(sfxDano.monstro);

      setMonstros(monstrosAposAtaque);
      setEfeitoCombate({
        centro: novoIndice,
        areaAfetada: posAtingidas,
        texto: `${textoDano} -${danoFinal}`,
        cor: corDano,
        alvoHUD: "monstro",
      });
      setTimeout(() => setEfeitoCombate(null), 800);

      const aindaVivos = monstrosAposAtaque.filter((m) => m.vivo);
      if (aindaVivos.length === 0) {
        setTimeout(() => {
          tocarSFX(sfx.bau);
          let xpTotalGanhado = 0;
          monstrosAposAtaque.forEach((m) => {
            if (m.rank === "boss") xpTotalGanhado += 100;
            else if (m.rank === "elite") xpTotalGanhado += 50;
            else xpTotalGanhado += 20;
          });

          setEsquadraoCombate((prev) =>
            prev.map((h) => {
              if (!isVivo(h)) return h;
              let novaXp = h.xp + xpTotalGanhado;
              let novoNivel = h.nivel;
              let moedasExtras = Math.floor(Math.random() * 100) + 50;
              while (novaXp >= novoNivel * 100) {
                novaXp -= novoNivel * 100;
                novoNivel++;
              }
              return {
                ...h,
                xp: novaXp,
                nivel: novoNivel,
                ouro: h.ouro + moedasExtras,
              };
            })
          );

          alert(`🛡️ VITÓRIA!\nO Esquadrão ganhou ${xpTotalGanhado} de XP!`);
          const itensAleatorios = [
            "/itens/item-espada-base.png",
            "/itens/item-armadura-couro.png",
            "/itens/item-pocao-vida.png",
          ];
          setBau({
            ativo: true,
            posicao: monstroAlvo.posicao,
            item: itensAleatorios[
              Math.floor(Math.random() * itensAleatorios.length)
            ],
            imagem: "/itens/item-bau-epico.png",
          });
        }, 1200);
      } else {
        setTurno("inimigo");
      }
      return;
    }

    if (bau.ativo && novoIndice === bau.posicao) {
      if (calcularDistancia(heroiAtivo.posicao, novoIndice) > movimentoAtual)
        return alert("Você precisa andar até o baú!");

      const novaMochila = [...heroiAtivo.mochila];
      const slotExistente = novaMochila.findIndex(
        (s) => s && s.id === bau.item
      );

      if (slotExistente !== -1) {
        novaMochila[slotExistente].qtd += 1;
        atualizarHeroiAtivo({ mochila: novaMochila, posicao: novoIndice });
        alert(`🔓 Baú aberto! Item acumulado na mochila.`);
        setBau({ ...bau, ativo: false });
      } else {
        const espacoLivre = novaMochila.findIndex((s) => s === null);
        if (espacoLivre !== -1) {
          novaMochila[espacoLivre] = { id: bau.item, qtd: 1 };
          atualizarHeroiAtivo({ mochila: novaMochila, posicao: novoIndice });
          alert(`🔓 Baú aberto! Item novo guardado.`);
          setBau({ ...bau, ativo: false });
        } else {
          alert(`A mochila de ${heroiAtivo.nome} está cheia!`);
        }
      }
      return;
    }

    if (magiaPreparada) setMagiaPreparada(null);
    if (calcularDistancia(heroiAtivo.posicao, novoIndice) > movimentoAtual)
      return alert("Fora de alcance de movimento!");
    atualizarHeroiAtivo({ posicao: novoIndice });
    if (monstros.some((m) => m.vivo)) setTurno("inimigo");
  };

  const equiparOuUsarItemDaMochila = (i) => {
    const slotClicado = heroiAtivo.mochila[i];
    if (!slotClicado) return;
    const det = bancoDeItens[slotClicado.id];
    if (!det) return;

    if (det.consumivel) {
      tocarSFX(sfx.cura);
      const novaMochila = [...heroiAtivo.mochila];
      novaMochila[i].qtd -= 1;
      if (novaMochila[i].qtd <= 0) novaMochila[i] = null;
      atualizarHeroiAtivo({
        danoRecebido: det.hpBonus
          ? Math.max(0, heroiAtivo.danoRecebido - det.hpBonus)
          : heroiAtivo.danoRecebido,
        mana: det.manaBonus
          ? Math.min(manaMaxima, heroiAtivo.mana + det.manaBonus)
          : heroiAtivo.mana,
        mochila: novaMochila,
      });
      setTurno("inimigo");
    } else if (det.tipo === "armadura") {
      const novaMochila = [...heroiAtivo.mochila];
      if (heroiAtivo.armaduraEquipada)
        novaMochila[i] = heroiAtivo.armaduraEquipada;
      else novaMochila[i] = null;
      atualizarHeroiAtivo({
        armaduraEquipada: slotClicado,
        mochila: novaMochila,
      });
    } else {
      const novaMochila = [...heroiAtivo.mochila];
      if (heroiAtivo.armaEquipada) novaMochila[i] = heroiAtivo.armaEquipada;
      else novaMochila[i] = null;
      atualizarHeroiAtivo({ armaEquipada: slotClicado, mochila: novaMochila });
    }
  };

  const guardarEquipamento = (tipo) => {
    const equipAtual =
      tipo === "arma" ? heroiAtivo.armaEquipada : heroiAtivo.armaduraEquipada;
    if (!equipAtual) return;
    const novaMochila = [...heroiAtivo.mochila];
    const slot = novaMochila.findIndex((s) => s && s.id === equipAtual.id);
    if (slot !== -1) novaMochila[slot].qtd += equipAtual.qtd || 1;
    else {
      const i = novaMochila.findIndex((s) => s === null);
      if (i !== -1) novaMochila[i] = equipAtual;
    }
    atualizarHeroiAtivo(
      tipo === "arma"
        ? { mochila: novaMochila, armaEquipada: null }
        : { mochila: novaMochila, armaduraEquipada: null }
    );
  };

  const dicionarioDeCompanheiros = {
    guerreiro: {
      pet: { nome: "Golem", img: "/itens/item-pet-golem-bolso.png" },
      montaria: { nome: "Cavalo", img: "/itens/item-montaria-cavalo.png" },
    },
    arqueira: {
      pet: { nome: "Corvo", img: "/itens/item-pet-corvo.png" },
      montaria: { nome: "Urso", img: "/itens/item-montaria-urso.png" },
    },
    arqueiro: {
      pet: { nome: "Corvo", img: "/itens/item-pet-corvo.png" },
      montaria: { nome: "Urso", img: "/itens/item-montaria-urso.png" },
    },
    mago: {
      pet: { nome: "Dragonete", img: "/itens/item-pet-dragonete.png" },
      montaria: { nome: "Grifo", img: "/itens/item-montaria-grifo.png" },
    },
    ladina: {
      pet: { nome: "Lobo", img: "/itens/item-pet-lobo-espectral.png" },
      montaria: { nome: "Sombra", img: "/itens/item-montaria-lobo.png" },
    },
  };
  const meusCompanheiros = dicionarioDeCompanheiros[classeBase] || {
    pet: { nome: "Fada", img: "/itens/item-pet-fada.png" },
    montaria: { nome: "Cavalo", img: "/itens/item-montaria-cavalo.png" },
  };

  return (
    <div
      className={`min-h-screen bg-[#050814] flex flex-col font-sans text-white relative transition-all duration-100 ${
        telaTremendo ? "animate-shake bg-red-900/20" : ""
      }`}
    >
      <style>{`
        @keyframes shake { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-5px) rotate(-5deg); filter: brightness(1.5) sepia(1) hue-rotate(-50deg) saturate(5); } 50% { transform: translateX(5px) rotate(5deg); filter: brightness(1.5) sepia(1) hue-rotate(-50deg) saturate(5); } 75% { transform: translateX(-5px) rotate(-5deg); } }
        .animate-shake { animation: shake 0.4s ease-in-out; }
        @keyframes hudShake { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-3px); } 50% { transform: translateX(3px); } 75% { transform: translateX(-3px); } }
        .hud-shake { animation: hudShake 0.3s ease-in-out; }
        @keyframes floatUp { 0% { opacity: 1; transform: translateY(0) scale(1); } 50% { transform: translateY(-25px) scale(1.3); } 100% { opacity: 0; transform: translateY(-50px) scale(1); } }
        .animate-float { animation: floatUp 0.8s ease-out forwards; }
        .area-magica { background-color: rgba(168, 85, 247, 0.4); box-shadow: inset 0 0 15px rgba(168, 85, 247, 0.8); }
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #140e0b; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #5c3a21; border-radius: 3px; }
      `}</style>

      {magiaPreparada && (
        <div
          className="absolute top-32 left-1/2 -translate-x-1/2 bg-blue-900/90 border-2 border-cyan-400 px-6 py-2 rounded-full z-50 flex items-center gap-3 shadow-[0_0_20px_rgba(0,208,255,0.8)] animate-pulse cursor-pointer"
          onClick={() => setMagiaPreparada(null)}
        >
          <span className="text-2xl">{magiaPreparada.icone}</span>
          <span className="font-bold tracking-widest uppercase text-sm">
            Magia Preparada! Clique no Alvo
          </span>
        </div>
      )}

      <header className="flex items-center gap-6 w-full p-4 bg-[#050814] border-b border-[#00d0ff]/50 z-50 shrink-0 shadow-lg">
        {areaLimpa ? (
          <div
            onClick={retornarVitorioso}
            className="flex flex-col items-center justify-center cursor-pointer group px-2 border-r border-[#00d0ff]/30 pr-6"
          >
            <span className="text-2xl mb-1 group-hover:scale-110 drop-shadow-[0_0_10px_rgba(0,208,255,0.8)]">
              🗺️
            </span>
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#00d0ff]">
              Mapa
            </span>
          </div>
        ) : (
          <div
            onClick={abandonarBatalha}
            className="flex flex-col items-center justify-center cursor-pointer group px-2 border-r border-[#00d0ff]/30 pr-6"
          >
            <img
              src="/logo-taverna.png"
              alt="Logo"
              style={{ display: "block" }}
              onError={(e) => (e.target.style.display = "none")}
              className="w-10 h-10 object-contain group-hover:drop-shadow-[0_0_15px_rgba(0,208,255,0.8)] transition-all"
            />
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#00d0ff] mt-1">
              Fugir
            </span>
          </div>
        )}

        <div className="flex gap-4 flex-1 items-center justify-center">
          {esquadraoCombate.map((h, i) => {
            const isMorto = !isVivo(h);
            const isFocado = i === idxHeroiFocado;
            return (
              <div
                key={h.id}
                onClick={() => {
                  if (!isMorto && turno === "jogador") setIdxHeroiFocado(i);
                }}
                className={`w-14 h-14 rounded-full border-2 overflow-hidden cursor-pointer transition-all ${
                  isFocado
                    ? "border-cyan-400 scale-125 mx-2 shadow-[0_0_20px_rgba(0,208,255,0.8)]"
                    : "border-[#5c3a21] opacity-60 hover:opacity-100"
                } ${
                  isMorto
                    ? "grayscale opacity-30 cursor-not-allowed border-red-900"
                    : ""
                }`}
                title={h.nome}
              >
                <img
                  src={h.imagem}
                  className="w-full h-full object-cover object-top"
                  alt="retrato"
                  onError={(e) => (e.target.style.display = "none")}
                />
              </div>
            );
          })}
        </div>

        <button
          onClick={alternarMute}
          className="text-xl hover:scale-110 transition-all mr-4 drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]"
        >
          {mutado ? "🔇" : "🔊"}
        </button>

        <div
          className={`px-6 py-2 rounded-full border-2 font-bold uppercase tracking-widest text-sm shadow-lg ${
            !partyViva
              ? "bg-slate-900/50 border-slate-500 text-slate-500"
              : areaLimpa
              ? "bg-blue-900/50 border-blue-400 text-blue-400"
              : turno === "jogador"
              ? "bg-green-900/50 border-green-400 text-green-400"
              : "bg-red-900/50 border-red-500 text-red-500"
          }`}
        >
          {!partyViva
            ? "Esquadrão Caído"
            : areaLimpa
            ? "Área Limpa"
            : turno === "jogador"
            ? `Sua Vez (${heroiAtivo.nome})`
            : "Inimigos Agindo!"}
        </div>
      </header>

      <div className="w-full shrink-0 bg-[#140e0b] border-b-4 border-[#3e2723] p-3 px-8 flex justify-between items-center shadow-[0_5px_20px_rgba(0,0,0,0.8)] z-40 relative">
        <div className={`flex items-center gap-4 w-[40%] max-w-md`}>
          <div className="w-16 h-16 bg-black border-2 border-[#d4af37] rounded-full overflow-hidden flex items-center justify-center shadow-[0_0_15px_rgba(212,175,55,0.3)] shrink-0">
            <img
              src={iconeBrasaoHeroi}
              alt="Brasão"
              onError={(e) => (e.target.style.display = "none")}
              className="w-full h-full object-cover"
            />
          </div>
          <div className="flex flex-col flex-1 gap-1">
            <div className="flex justify-between items-center">
              <h2 className="text-[#d4af37] font-serif font-bold text-lg uppercase tracking-wider drop-shadow-md">
                {heroiAtivo.nome}{" "}
                <span className="text-cyan-400 text-[10px] ml-1">
                  NVL {heroiAtivo.nivel}
                </span>
              </h2>
              <span className="text-yellow-400 text-xs font-bold bg-yellow-900/30 px-2 py-0.5 rounded border border-yellow-700/50">
                💰 {heroiAtivo.ouro}g
              </span>
            </div>

            <div className="flex flex-col gap-0.5 mt-1">
              <div className="w-full h-3.5 bg-red-950 border border-[#5c3a21] rounded-sm overflow-hidden relative">
                <div
                  className="h-full bg-gradient-to-r from-red-700 to-red-400 transition-all duration-500"
                  style={{
                    width: `${Math.max(0, (hpAtualHeroi / hpMaximo) * 100)}%`,
                  }}
                ></div>
                <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-white drop-shadow-[0_1px_1px_rgba(0,0,0,1)]">
                  {hpAtualHeroi}/{hpMaximo}
                </span>
              </div>
              <div className="w-full flex gap-1">
                <div className="w-3/4 h-2.5 bg-blue-950 border border-[#5c3a21] rounded-sm overflow-hidden relative">
                  <div
                    className="h-full bg-gradient-to-r from-blue-800 to-blue-400 transition-all duration-500"
                    style={{
                      width: `${(heroiAtivo.mana / manaMaxima) * 100}%`,
                    }}
                  ></div>
                  <span className="absolute inset-0 flex items-center justify-center text-[8px] font-bold text-white drop-shadow-[0_1px_1px_rgba(0,0,0,1)]">
                    {heroiAtivo.mana}/{manaMaxima}
                  </span>
                </div>
                <div
                  className="w-1/4 h-2.5 bg-green-950 border border-[#5c3a21] rounded-sm overflow-hidden relative"
                  title={`XP: ${heroiAtivo.xp}/${xpMaximoAtual}`}
                >
                  <div
                    className="h-full bg-gradient-to-r from-green-600 to-green-300 transition-all duration-500"
                    style={{
                      width: `${(heroiAtivo.xp / xpMaximoAtual) * 100}%`,
                    }}
                  ></div>
                  <span className="absolute inset-0 flex items-center justify-center text-[7px] font-bold text-white drop-shadow-[0_1px_1px_rgba(0,0,0,1)]">
                    XP
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="font-extrabold text-3xl italic font-serif text-[#5c3a21] opacity-50">
          VS
        </div>

        {monstroHUD && monstroHUD.vivo ? (
          <div
            className={`flex items-center gap-4 w-[40%] max-w-md justify-end`}
          >
            <div className="flex flex-col flex-1 gap-1 items-end">
              <h2 className="text-red-500 font-serif font-extrabold text-xl uppercase drop-shadow-[0_0_5px_rgba(255,0,0,0.5)]">
                🔥 {monstroHUD.nome} 🔥
              </h2>
              <div className="w-full h-6 bg-red-950 border-2 border-red-900 rounded-sm overflow-hidden relative shadow-[0_0_15px_rgba(255,0,0,0.3)]">
                <div
                  className="h-full bg-gradient-to-l from-red-500 to-red-800 transition-all duration-500"
                  style={{
                    width: `${Math.max(
                      0,
                      (monstroHUD.hp / monstroHUD.hpMaximo) * 100
                    )}%`,
                  }}
                ></div>
                <span className="absolute inset-0 flex items-center justify-center text-xs font-extrabold text-white drop-shadow-[0_1px_1px_rgba(0,0,0,1)]">
                  {monstroHUD.hp}/{monstroHUD.hpMaximo}
                </span>
              </div>
            </div>
            <div className="w-20 h-20 bg-black border-2 border-red-600 rounded-full overflow-hidden flex items-center justify-center shrink-0">
              <img
                src={`/itens/brasao-${monstroHUD.rank}.png`}
                alt={monstroHUD.rank}
                onError={(e) => (e.target.style.display = "none")}
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        ) : (
          <div className="w-[40%] flex justify-end">
            <span className="text-[#d4af37] font-serif font-bold text-xl uppercase">
              Área Dominada!
            </span>
          </div>
        )}
      </div>

      <main className="flex-1 flex items-start p-4 gap-4 overflow-hidden relative">
        <section className="flex-1 relative aspect-square max-h-[92vh] max-w-6xl mx-auto cursor-crosshair flex items-center justify-center">
          <div className="absolute inset-0 bg-black rounded-xl border-2 border-[#00d0ff] overflow-hidden shadow-[0_0_20px_rgba(0,208,255,0.2)]">
            <div
              className="w-full h-full opacity-60"
              style={{
                backgroundImage: `url('${mapaAtivo}')`,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }}
            ></div>
          </div>

          <div className="relative z-10 grid grid-cols-8 grid-rows-8 gap-1 p-4 pt-12 w-full h-full">
            {Array.from({ length: 64 }).map((_, index) => {
              const ehObstaculo = quadradosBloqueados.includes(index);
              const ehCentroEfeito =
                efeitoCombate && efeitoCombate.centro === index;
              const taNaAreaAfetada =
                efeitoCombate && efeitoCombate.areaAfetada.includes(index);
              const monstroNoQuadrado = monstros.find(
                (m) => m.vivo && m.posicao === index
              );
              const heroisAqui = esquadraoCombate.filter(
                (h) => h.posicao === index && isVivo(h)
              );

              return (
                <div
                  key={index}
                  onClick={() => interagirComQuadrado(index)}
                  className={`border transition-all cursor-pointer rounded-sm flex flex-col items-center justify-end relative ${
                    ehObstaculo
                      ? "border-red-500/40 bg-red-900/30"
                      : "border-[#00d0ff]/30 hover:bg-[#00d0ff]/20"
                  } ${taNaAreaAfetada ? "area-magica animate-shake" : ""}`}
                >
                  {ehCentroEfeito && (
                    <div
                      className={`absolute z-50 font-extrabold text-2xl font-serif drop-shadow-[0_4px_4px_rgba(0,0,0,1)] animate-float ${efeitoCombate.cor}`}
                      style={{
                        textShadow:
                          "2px 2px 0 #000, -2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000",
                      }}
                    >
                      {efeitoCombate.texto}
                    </div>
                  )}

                  {heroisAqui.map((h) => (
                    <div key={h.id} className="relative z-10">
                      <img
                        src={h.imagem}
                        className={`w-10 h-14 object-contain drop-shadow-[0_5px_5px_rgba(0,0,0,0.8)] ${
                          h.id === heroiAtivo.id
                            ? "scale-110 border-b-2 border-cyan-400 pb-1"
                            : "opacity-80"
                        } ${taNaAreaAfetada ? "animate-shake" : ""}`}
                        onError={(e) => (e.target.style.display = "none")}
                      />
                      {petsEquipados[h.id] && (
                        <img
                          src={petsEquipados[h.id]}
                          className="absolute -bottom-1 -right-3 w-6 h-6 object-contain animate-[bounce_2s_ease-in-out_infinite]"
                          onError={(e) => (e.target.style.display = "none")}
                        />
                      )}
                    </div>
                  ))}

                  {monstroNoQuadrado && (
                    <div className="relative w-full h-full flex flex-col items-center justify-end pb-2 z-0">
                      <div className="absolute top-1 w-3/4 h-1.5 bg-red-900 rounded-sm border border-black">
                        <div
                          className="h-full bg-red-500"
                          style={{
                            width: `${
                              (monstroNoQuadrado.hp /
                                monstroNoQuadrado.hpMaximo) *
                              100
                            }%`,
                          }}
                        ></div>
                      </div>
                      <img
                        src={monstroNoQuadrado.imagem}
                        className={`w-12 h-16 object-contain drop-shadow-[0_5px_5px_rgba(255,0,0,0.5)] ${
                          taNaAreaAfetada ? "animate-shake" : ""
                        } ${
                          monstroNoQuadrado.rank === "boss" ? "scale-125" : ""
                        }`}
                        onError={(e) => (e.target.style.display = "none")}
                      />
                    </div>
                  )}

                  {bau.ativo && index === bau.posicao && (
                    <div className="relative w-full h-full flex items-center justify-center z-0">
                      <img
                        src={bau.imagem}
                        className="w-10 h-10 object-contain animate-[bounce_2s_ease-in-out_infinite] drop-shadow-[0_0_15px_rgba(128,0,128,0.8)]"
                        onError={(e) => (e.target.style.display = "none")}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        <aside className="w-72 shrink-0 bg-[#140e0b] border-4 border-[#3e2723] shadow-[0_0_20px_rgba(0,0,0,0.8)] rounded-md flex flex-col overflow-y-auto max-h-full z-10 custom-scrollbar">
          <div className="p-3 bg-gradient-to-b from-[#2b1810] to-black border-b-2 border-[#5c3a21] shrink-0">
            <h3 className="text-[#d4af37] font-serif font-bold uppercase tracking-widest text-xs text-center">
              Ações de {heroiAtivo.nome}
            </h3>
          </div>

          <div className="border-b-4 border-[#2b1810]">
            <button
              onClick={() =>
                setAbaAtiva(abaAtiva === "habilidades" ? "" : "habilidades")
              }
              className="w-full text-left px-4 py-2 font-bold font-serif text-base text-cyan-400 uppercase tracking-wide bg-gradient-to-r from-[#1a2c3d] to-[#140e0b] shadow-inner"
            >
              Grimório
            </button>
            {abaAtiva === "habilidades" && (
              <div className="p-3 bg-[#1a0f0a] flex flex-col gap-2">
                {habilidadesDoHeroi.map((hab, i) => (
                  <div
                    key={i}
                    onClick={() => usarHabilidade(hab)}
                    className={`flex items-center gap-2 p-2 bg-black border-2 cursor-pointer transition-all ${
                      magiaPreparada?.nome === hab.nome
                        ? "border-cyan-400 shadow-[0_0_10px_rgba(0,208,255,0.5)]"
                        : "border-[#5c3a21] hover:border-[#d4af37]"
                    }`}
                  >
                    <div className="text-2xl drop-shadow-md">{hab.icone}</div>
                    <div className="flex flex-col flex-1">
                      <span className="text-[#d4af37] font-bold text-xs uppercase leading-tight">
                        {hab.nome}
                      </span>
                      <span className="text-blue-400 font-bold text-[10px] mt-0.5">
                        -{hab.custo} MP
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="border-b-4 border-[#2b1810]">
            <button
              onClick={() =>
                setAbaAtiva(abaAtiva === "inventario" ? "" : "inventario")
              }
              className="w-full text-left px-4 py-2 font-bold font-serif text-base text-[#d4af37] uppercase bg-gradient-to-r from-[#3e2723] to-[#140e0b] shadow-inner"
            >
              Equipamento
            </button>
            {abaAtiva === "inventario" && (
              <div className="p-3 bg-[#1a0f0a] flex flex-col gap-4">
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <div className="bg-[#2b1810] border border-[#5c3a21] rounded-sm p-2 flex flex-col items-center gap-1 shadow-inner relative group">
                    <span className="text-[9px] text-[#d4af37] uppercase font-bold tracking-widest font-serif">
                      Arma
                    </span>
                    <div
                      onClick={() => guardarEquipamento("arma")}
                      className="w-12 h-12 bg-black border-2 border-[#d4af37] flex items-center justify-center cursor-pointer shadow-lg relative"
                    >
                      {heroiAtivo.armaEquipada ? (
                        <>
                          <img
                            src={heroiAtivo.armaEquipada.id}
                            className="w-full h-full object-contain p-1"
                            onError={(e) => (e.target.style.display = "none")}
                          />
                          {heroiAtivo.armaEquipada.qtd > 1 && (
                            <span className="absolute -top-2 -right-2 bg-red-700 text-white text-[9px] font-bold px-1 py-0.5 rounded-full border border-[#d4af37]">
                              x{heroiAtivo.armaEquipada.qtd}
                            </span>
                          )}
                        </>
                      ) : (
                        <span className="text-slate-600 text-[9px] uppercase font-bold text-center">
                          Vazio
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="bg-[#2b1810] border border-[#5c3a21] rounded-sm p-2 flex flex-col items-center gap-1 shadow-inner relative group">
                    <span className="text-[9px] text-[#00d0ff] uppercase font-bold tracking-widest font-serif">
                      Armadura
                    </span>
                    <div
                      onClick={() => guardarEquipamento("armadura")}
                      className="w-12 h-12 bg-black border-2 border-[#00d0ff] flex items-center justify-center cursor-pointer shadow-lg relative"
                    >
                      {heroiAtivo.armaduraEquipada ? (
                        <>
                          <img
                            src={heroiAtivo.armaduraEquipada.id}
                            className="w-full h-full object-contain p-1"
                            onError={(e) => (e.target.style.display = "none")}
                          />
                          {heroiAtivo.armaduraEquipada.qtd > 1 && (
                            <span className="absolute -top-2 -right-2 bg-red-700 text-white text-[9px] font-bold px-1 py-0.5 rounded-full border border-[#00d0ff]">
                              x{heroiAtivo.armaduraEquipada.qtd}
                            </span>
                          )}
                        </>
                      ) : (
                        <span className="text-slate-600 text-[9px] uppercase font-bold text-center">
                          Vazio
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {heroiAtivo.mochila.map((slot, i) => (
                    <div
                      key={i}
                      onClick={() => equiparOuUsarItemDaMochila(i)}
                      className={`aspect-square bg-black border-2 rounded-sm flex items-center justify-center p-1 cursor-pointer relative group ${
                        slot
                          ? "border-[#5c3a21] hover:border-[#d4af37]"
                          : "border-[#2b1810]"
                      }`}
                    >
                      {slot && (
                        <>
                          <img
                            src={slot.id}
                            className="w-full h-full object-contain"
                            onError={(e) => (e.target.style.display = "none")}
                          />
                          {slot.qtd > 1 && (
                            <span className="absolute -bottom-2 -right-2 bg-blue-800 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full border border-black z-20">
                              x{slot.qtd}
                            </span>
                          )}
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="border-b-4 border-[#2b1810]">
            <button
              onClick={() =>
                setAbaAtiva(abaAtiva === "atributos" ? "" : "atributos")
              }
              className="w-full text-left px-4 py-2 font-bold font-serif text-base text-[#d4af37] uppercase bg-gradient-to-r from-[#3e2723] to-[#140e0b] shadow-inner"
            >
              Status Base
            </button>
            {abaAtiva === "atributos" && (
              <div className="p-3 bg-[#1a0f0a] text-xs text-slate-300 font-serif space-y-2">
                <p>
                  Ataque Total:{" "}
                  <span className="text-red-400 font-bold">{ataqueTotal}</span>
                </p>
                <p>
                  Alcance do Ataque:{" "}
                  <span className="text-yellow-400 font-bold">
                    {alcanceAtaque} sq
                  </span>
                </p>
                <p>
                  Movimento Livre:{" "}
                  <span className="text-green-400 font-bold">
                    {movimentoAtual} sq
                  </span>
                </p>
              </div>
            )}
          </div>

          <div className="border-b-4 border-[#2b1810]">
            <button
              onClick={() =>
                setAbaAtiva(abaAtiva === "companheiros" ? "" : "companheiros")
              }
              className="w-full text-left px-4 py-2 font-bold font-serif text-base text-[#d4af37] uppercase bg-gradient-to-r from-[#3e2723] to-[#140e0b] shadow-inner"
            >
              Companheiros
            </button>
            {abaAtiva === "companheiros" && (
              <div className="p-3 bg-[#1a0f0a] transition-all">
                <div className="grid grid-cols-2 gap-2">
                  <div
                    onClick={() =>
                      setPetsEquipados((prev) => ({
                        ...prev,
                        [heroiAtivo.id]: prev[heroiAtivo.id]
                          ? null
                          : meusCompanheiros.pet.img,
                      }))
                    }
                    className={`flex flex-col items-center gap-1 bg-black border-2 rounded-sm p-2 cursor-pointer transition-all ${
                      petsEquipados[heroiAtivo.id]
                        ? "border-[#d4af37] bg-[#d4af37]/10"
                        : "border-[#5c3a21]"
                    }`}
                  >
                    <img
                      src={meusCompanheiros.pet.img}
                      alt={meusCompanheiros.pet.nome}
                      onError={(e) => (e.target.style.display = "none")}
                      className="w-10 h-10 object-contain drop-shadow-md"
                    />
                    <span
                      className={`text-[9px] font-serif font-bold text-center ${
                        petsEquipados[heroiAtivo.id]
                          ? "text-[#d4af37]"
                          : "text-[#8a684b]"
                      }`}
                    >
                      {petsEquipados[heroiAtivo.id]
                        ? "EQUIPADO"
                        : meusCompanheiros.pet.nome}
                    </span>
                  </div>
                  <div
                    onClick={() =>
                      setMontariasEquipadas((prev) => ({
                        ...prev,
                        [heroiAtivo.id]: prev[heroiAtivo.id]
                          ? null
                          : meusCompanheiros.montaria.img,
                      }))
                    }
                    className={`flex flex-col items-center gap-1 bg-black border-2 rounded-sm p-2 cursor-pointer transition-all ${
                      montariasEquipadas[heroiAtivo.id]
                        ? "border-[#00d0ff] bg-[#00d0ff]/10"
                        : "border-[#5c3a21]"
                    }`}
                  >
                    <img
                      src={meusCompanheiros.montaria.img}
                      alt={meusCompanheiros.montaria.nome}
                      onError={(e) => (e.target.style.display = "none")}
                      className="w-10 h-10 object-contain drop-shadow-md"
                    />
                    <span
                      className={`text-[9px] font-serif font-bold text-center ${
                        montariasEquipadas[heroiAtivo.id]
                          ? "text-[#00d0ff]"
                          : "text-[#8a684b]"
                      }`}
                    >
                      {montariasEquipadas[heroiAtivo.id]
                        ? "MONTADO"
                        : meusCompanheiros.montaria.nome}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </aside>
      </main>
    </div>
  );
}
