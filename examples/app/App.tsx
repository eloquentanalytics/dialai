import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { LobbyView } from "./LobbyView.js";
import { SessionView } from "./SessionView.js";
import { NewSession } from "./NewSession.js";

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LobbyView />} />
        <Route path="/new/:name" element={<NewSession />} />
        <Route path="/machine/:name/session/:id/state/:state" element={<SessionView />} />
        <Route path="/machine/:name/session/:id" element={<Navigate to="/" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
