
import { useState, useEffect } from "react";
import { io } from "socket.io-client";

const socket = io(import.meta.env.VITE_BACKEND_URL);

export default function App(){
  const [room,setRoom]=useState("public");
  const [name,setName]=useState("訪客"+Math.floor(Math.random()*999));
  const [messages,setMessages]=useState([]);
  const [text,setText]=useState("");

  useEffect(()=>{
    socket.on("message",(m)=>setMessages(s=>[...s,m]));
    return ()=> socket.off("message");
  },[]);

  const join = ()=> socket.emit("joinRoom",{room,user:{name}});
  const send = ()=>{
    if(!text) return;
    socket.emit("message",{room,message:text,user:{name}});
    setText("");
  };

  return (
    <div style={{padding:"20px", maxWidth:"600px", margin:"auto"}}>
      <h2>免費版聊天室</h2>
      <div>
        暱稱：<input value={name} onChange={e=>setName(e.target.value)}/>
      </div>
      <div>
        房間：
        <select value={room} onChange={e=>setRoom(e.target.value)}>
          <option value="public">大廳</option>
        </select>
        <button onClick={join}>加入</button>
      </div>

      <div style={{border:"1px solid #ccc", height:"300px", overflow:"auto", marginTop:"10px", padding:"5px"}}>
        {messages.map((m,i)=>(
          <div key={i}><b>{m.user?.name}：</b>{m.message}</div>
        ))}
      </div>

      <input value={text} onChange={e=>setText(e.target.value)}
       onKeyDown={e=> e.key==="Enter" && send()}/>
      <button onClick={send}>發送</button>
    </div>
  )
}
