import React from "react";

export default function App() {
  return (
    <div style={{
      minHeight: "100vh",
      background: "#07101f",
      color: "white",
      fontFamily: "Arial",
      padding: "40px"
    }}>
      <h1 style={{fontSize:"48px"}}>Космо-Монополия</h1>
      <p>React версия игры успешно запущена.</p>

      <div style={{
        marginTop:"30px",
        padding:"20px",
        border:"1px solid rgba(255,255,255,0.1)",
        borderRadius:"20px",
        background:"rgba(255,255,255,0.05)"
      }}>
        <h2>Как запустить</h2>

        <ol style={{lineHeight:"2"}}>
          <li>Установи Node.js</li>
          <li>Открой папку проекта</li>
          <li>Напиши в консоли npm install</li>
          <li>Потом npm run dev</li>
        </ol>
      </div>
    </div>
  );
}
