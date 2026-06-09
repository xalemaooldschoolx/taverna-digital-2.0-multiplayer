import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Lobby from "./Lobby";
import SelecaoMapa from "./SelecaoMapa";
import Arena from "./Arena";
import PainelMestre from "./PainelMestre";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Rota da tela inicial (Forja e Seleção) */}
        <Route path="/" element={<Lobby />} />

        {/* Rota do Mapa / Mercado / Diário */}
        <Route path="/mapa" element={<SelecaoMapa />} />

        {/* Rota do Combate Tático (Esquadrão) */}
        <Route path="/arena" element={<Arena />} />

        {/* Rota Secreta do Painel do Mestre */}
        <Route path="/mestre" element={<PainelMestre />} />
      </Routes>
    </BrowserRouter>
  );
}
