export const bancoDeItens = {
  // 🧪 POÇÕES (Consumíveis)
  "/itens/item-pocao-vida.png": {
    nome: "Poção de Vida",
    consumivel: true,
    hpBonus: 40,
  },
  "/itens/item-pocao-mana.png": {
    nome: "Poção de Mana",
    consumivel: true,
    manaBonus: 30,
  },

  // 🛡️ ARMADURAS E VESTIMENTAS BÁSICAS E DE CLASSE
  "/itens/item-armadura-couro.png": {
    nome: "Colete de Couro (Comum)",
    tipo: "armadura",
    hpBonus: 20,
  },
  "/itens/item-placas-imperiais.png": {
    nome: "Placas Imperiais (Épica)",
    tipo: "armadura",
    hpBonus: 80,
    movimentoBonus: -1,
  },
  "/itens/item-armadura-pesada.png": {
    nome: "Armadura Pesada (Guerreiro)",
    tipo: "armadura",
    hpBonus: 100,
    movimentoBonus: -1,
  },
  "/itens/item-armadura-leve.png": {
    nome: "Túnica Furtiva (Ladino)",
    tipo: "armadura",
    hpBonus: 30,
    movimentoBonus: 2,
  },
  "/itens/item-manto-arcano.png": {
    nome: "Manto Arcano (Mago)",
    tipo: "armadura",
    hpBonus: 20,
    manaBonus: 50,
  },
  "/itens/item-armadura-forja.png": {
    nome: "Avental de Magma (Anão)",
    tipo: "armadura",
    hpBonus: 70,
  },
  "/itens/item-veste-vampiro.png": {
    nome: "Traje Gótico (Vampiro)",
    tipo: "armadura",
    hpBonus: 40,
    movimentoBonus: 1,
  },
  "/itens/item-armadura-tiflin.png": {
    nome: "Couro Infernal (Tiflin)",
    tipo: "armadura",
    hpBonus: 60,
    ataqueBonus: 5,
  },
  "/itens/item-manto-druida.png": {
    nome: "Manto Ancestral (Druida)",
    tipo: "armadura",
    hpBonus: 50,
  },
  "/itens/item-armadura-elfo-negro.png": {
    nome: "Traje de Obsidiana (Elfo)",
    tipo: "armadura",
    hpBonus: 40,
    movimentoBonus: 3,
  },

  // ⚔️ ARMAS (Tiers e Exclusivas)
  "/itens/item-espada-longa.png": {
    nome: "Espada Longa",
    tipo: "arma",
    ataqueBonus: 5,
  },
  "/itens/item-arco-madeira.png": {
    nome: "Arco de Caça",
    tipo: "arma",
    ataqueBonus: 4,
    alcance: 3,
  },
  "/itens/item-cajado-magico.png": {
    nome: "Cajado Aprendiz",
    tipo: "arma",
    ataqueBonus: 3,
    alcance: 2,
    area: 1,
  },
  "/itens/item-adaga-ferro.png": {
    nome: "Adaga Enferrujada",
    tipo: "arma",
    ataqueBonus: 6,
  },

  // ⚔️ ARMAS TIER 2 E ÉPICAS
  "/itens/item-espada-base.png": {
    nome: "Espada de Aço",
    tipo: "arma",
    ataqueBonus: 8,
  },
  "/itens/item-espada-10.png": {
    nome: "Lâmina Polida (+10)",
    tipo: "arma",
    ataqueBonus: 18,
  },
  "/itens/item-espada-20.png": {
    nome: "Cortadora de Almas (+20)",
    tipo: "arma",
    ataqueBonus: 30,
    alcance: 2,
  },
  "/itens/item-machado-30.png": {
    nome: "Machado do Caos (+30)",
    tipo: "arma",
    ataqueBonus: 50,
    area: 1,
  },
  "/itens/item-arco-fenix.png": {
    nome: "Arco da Fênix",
    tipo: "arma",
    ataqueBonus: 25,
    alcance: 4,
    area: 1,
  },
  "/itens/item-adagas-veneno.png": {
    nome: "Adagas Peçonhentas",
    tipo: "arma",
    ataqueBonus: 28,
  },
  "/itens/item-cajado-vazio.png": {
    nome: "Cajado do Vazio",
    tipo: "arma",
    ataqueBonus: 20,
    alcance: 3,
    area: 2,
  },
  "/itens/item-martelo-aurora.png": {
    nome: "Martelo da Aurora",
    tipo: "arma",
    ataqueBonus: 35,
  },

  // ☠️ ITENS AMALDIÇOADOS (Drops Raros de 24h)
  "/itens/item-maldito-rei-goblin.png": {
    nome: "Armadura do Rei Goblin (Amaldiçoada)",
    tipo: "armadura",
    hpBonus: 150,
    movimentoBonus: -2,
  },
  "/itens/item-maldito-manto-kraken.png": {
    nome: "Manto do Kraken (Amaldiçoado)",
    tipo: "armadura",
    hpBonus: 40,
    movimentoBonus: 5,
  },
  "/itens/item-maldito-coroa-lich.png": {
    nome: "Coroa do Lich (Amaldiçoada)",
    tipo: "armadura",
    hpBonus: -30,
    manaBonus: 200,
  },
  "/itens/item-maldito-manoplas-fogo.png": {
    nome: "Manoplas do Fogo (Amaldiçoada)",
    tipo: "armadura",
    hpBonus: 20,
    ataqueBonus: 40,
    area: 1,
  },
  "/itens/item-maldito-espada-tita.png": {
    nome: "Lâmina do Titã (Amaldiçoada)",
    tipo: "arma",
    ataqueBonus: 80,
    movimentoBonus: -3,
  },
  "/itens/item-maldito-amuleto-devorador.png": {
    nome: "Amuleto do Devorador (Amaldiçoado)",
    tipo: "armadura",
    alcance: 5,
    hpBonus: -10,
  },
};

// 💰 TABELAS DE LOOT DINÂMICAS PARA CADA BOSS
export const tabelasDeLoot = {
  comum: ["/itens/item-pocao-vida.png", "/itens/item-pocao-mana.png"],
  elite: [
    "/itens/item-espada-base.png",
    "/itens/item-armadura-couro.png",
    "/itens/item-pocao-vida.png",
  ],
  reiGoblin: [
    "/itens/item-espada-10.png",
    "/itens/item-placas-imperiais.png",
    "/itens/item-maldito-rei-goblin.png",
  ],
  bossFogo: [
    "/itens/item-arco-fenix.png",
    "/itens/item-maldito-manoplas-fogo.png",
    "/itens/item-espada-20.png",
  ],
  bossDevorador: [
    "/itens/item-cajado-vazio.png",
    "/itens/item-maldito-amuleto-devorador.png",
    "/itens/item-manto-arcano.png",
  ],
  bossLich: [
    "/itens/item-maldito-coroa-lich.png",
    "/itens/item-martelo-aurora.png",
    "/itens/item-maldito-espada-tita.png",
  ],
};
