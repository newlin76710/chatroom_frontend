import { BrowserRouter, Routes, Route } from "react-router-dom";
import ChatApp from "./pages/ChatApp";
import LoginGuest from "./pages/LoginGuest";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<ChatApp />} />
        <Route path="/login" element={<LoginGuest />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
