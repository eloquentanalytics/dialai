import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { MachineList } from "./MachineList.js";
import { NewSession } from "./NewSession.js";
import { SessionView } from "./SessionView.js";

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MachineList />} />
        <Route path="/machine/:name/session/new" element={<NewSession />} />
        <Route path="/machine/:name/session/:id/state/:state" element={<SessionView />} />
        <Route path="/machine/:name/session/:id" element={<Navigate to="/" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
