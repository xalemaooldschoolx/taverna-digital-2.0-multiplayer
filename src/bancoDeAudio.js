// bancoDeAudio.js

// 🎵 TRILHAS DE AMBIENTE E MAPAS
export const trilhasCenarios = {
  lobby: "/audio/bgm-deck-2.mp3",
  taverna: "/audio/bgm-taverna.mp3",
  "masmorra-vulcanica": "/audio/bgm-masmorra.mp3",
  floresta: "/audio/bgm-floresta.mp3",
  templo: "/audio/bgm-templo.mp3",
  santuario: "/audio/bgm-santuario.mp3",
  "caverna-congelada": "/audio/bgm-caverna.mp3",
  "ruinas-deserto": "/audio/bgm-ruinas.mp3",
  cemiterio: "/audio/bgm-cemiterio.mp3",
  forja: "/audio/bgm-forja.mp3",
  acampamento: "/audio/bgm-acampamento.mp3",
};

// ⚔️ TRILHAS ÉPICAS DOS CHEFES (O Mestre pode escolher ou podemos sortear)
export const trilhasBoss = [
  "/audio/bgm-epic-boss-1.mp3",
  "/audio/bgm-epic-boss-2.mp3",
  "/audio/bgm-epic-boss-3.mp3",
  "/audio/bgm-epic-boss-4.mp3",
];

// 💥 EFEITOS SONOROS (SFX)
export const sfx = {
  espada: "/audio/sfx-corte-espada.mp3",
  flecha: "/audio/sfx-tiro-flecha.mp3",
  magiaFogo: "/audio/sfx-explosao-fogo.mp3",
  magiaAtaque: "/audio/sfx-magia-ataque.mp3",
  magiaArea: "/audio/sfx-magia-area.mp3",
  cura: "/audio/sfx-magia-cura.mp3",
  pancada: "/audio/sfx-pancada-bruta.mp3",
  bau: "/audio/sfx-bau-caido.mp3",
};

// 🩸 SONS DE DANO (Heróis e Monstros)
export const sfxDano = {
  homem: ["/audio/sfx-dano-homem.mp3", "/audio/sfx-dano-homem-2.mp3"],
  mulher: ["/audio/sfx-dano-mulher.mp3"],
  monstro: "/audio/sfx-dano-monstro.mp3",
  animal: "/audio/sfx-dano-animal.mp3",
  goblin: "/audio/sfx-rei-goblin.mp3",
  orc: "/audio/sfx-ataque-orc-grun-1.mp3",
};

// 🗣️ VOZES DOS CHEFÕES (VOX)
export const voxBoss = {
  intro: [
    "/audio/vox-boss-intro-1.mp3",
    "/audio/vox-boss-intro-2.mp3",
    "/audio/vox-boss-intro-3.mp3",
  ],
  provocacao: [
    "/audio/vox-boss-provocacao-1.mp3",
    "/audio/vox-boss-meio-confronto.mp3",
  ],
  invencivel: [
    "/audio/vox-boss-invencivel.mp3",
    "/audio/vox-boss-invencivel-1.mp3",
  ],
  morte: ["/audio/vox-boss-morte-1.mp3", "/audio/vox-boss-morte-2.mp3"],
};

// Checa se o jogador apertou o botão de Mudo
export const isMutado = () => localStorage.getItem("taverna_mute") === "true";

// 💥 Canal para Efeitos Rápidos (Podem se sobrepor, ex: magia batendo junto com espada)
export const tocarSFX = (caminhoAudio, volume = 0.8) => {
  if (!caminhoAudio || isMutado()) return;
  const audio = new Audio(caminhoAudio);
  audio.volume = volume;
  audio.play().catch((e) => console.log("Áudio bloqueado pelo navegador:", e));
};

// 🗣️ Canal EXCLUSIVO para o Boss (Corta a fala anterior para NÃO encavalar)
let canalVozBoss = null;

export const tocarVozBoss = (arrayDeCaminhos) => {
  if (!arrayDeCaminhos || arrayDeCaminhos.length === 0 || isMutado()) return;

  // Se o boss estiver falando, interrompe a fala atual
  if (canalVozBoss) {
    canalVozBoss.pause();
    canalVozBoss.currentTime = 0;
  }

  // Sorteia a nova fala
  const escolhido = Array.isArray(arrayDeCaminhos)
    ? arrayDeCaminhos[Math.floor(Math.random() * arrayDeCaminhos.length)]
    : arrayDeCaminhos;

  canalVozBoss = new Audio(escolhido);
  canalVozBoss.volume = 1.0; // Voz do Boss no talo para intimidar!
  canalVozBoss.play().catch((e) => console.log("Áudio de voz bloqueado:", e));
};
