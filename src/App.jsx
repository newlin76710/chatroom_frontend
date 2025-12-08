import { BrowserRouter, Routes, Route } from "react-router-dom";
import ChatApp from "./ChatApp";
import LoginGuest from "./LoginGuest";

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
