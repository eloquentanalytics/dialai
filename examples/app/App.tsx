import { BrowserRouter, Routes, Route } from "react-router-dom";
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
      </Routes>
    </BrowserRouter>
  );
}
