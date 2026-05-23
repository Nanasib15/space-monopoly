import React, { useEffect, useMemo, useState } from "react";

const STORAGE_PREFIX = "cosmo-mono-room-";
const PRESENCE_KEY = "cosmo-mono-client-id";
const MAX_SEATS = 4;
const BOARD_SIZE = 40;
const START_MONEY = 1600;

const DIFFERENCES = [
  "Покупка цивилизаций вместо улиц",
  "Лунное казино со ставками",
  "Чёрные дыры и порталы",
  "Случайные космические события",
  "Прокачка владений",
  "Щиты для защиты",
  "Аукционы и рынок",
  "Космическая полиция",
  "Налоги по секторам",
  "Контроль регионов",
  "Русский интерфейс",
  "Поле по периметру",
  "Большие кубики в центре",
  "Подсказки для друзей",
  "Комнаты по коду",
  "Анимации и подсветка",
  "Аренда растёт с уровнем",
  "Случайные телепорты",
  "Джекпот в казино",
  "Победа последнего игрока",
];

const BOARD_CELLS = [
  { name: "СТАРТ", type: "start" },
  { name: "Альфа-Луна", type: "civilization" },
  { name: "Сигнальный разлом", type: "chance" },
  { name: "Пульсар-1", type: "civilization" },
  { name: "Лунное казино", type: "casino" },
  { name: "Марсианский узел", type: "civilization" },
  { name: "Космический налог", type: "tax" },
  { name: "Вега-Купол", type: "civilization" },
  { name: "Портал Вега", type: "portal" },
  { name: "Небула-9", type: "civilization" },
  { name: "Аномалия", type: "chance" },
  { name: "Орион-Порт", type: "civilization" },
  { name: "Галактический аукцион", type: "auction" },
  { name: "Титан-7", type: "civilization" },
  { name: "Космополиция", type: "police" },
  { name: "Сектор Кварц", type: "civilization" },
  { name: "Космический налог", type: "tax" },
  { name: "Гелиос-Сити", type: "civilization" },
  { name: "Чёрная дыра", type: "blackhole" },
  { name: "Лунная верфь", type: "civilization" },
  { name: "Лунное казино", type: "casino" },
  { name: "Кольцо Сатурна", type: "civilization" },
  { name: "Сигнальный разлом", type: "chance" },
  { name: "Астра-3", type: "civilization" },
  { name: "Бонус сверхновой", type: "bonus" },
  { name: "Ковчег Икар", type: "civilization" },
  { name: "Космический налог", type: "tax" },
  { name: "Пояс Ион", type: "civilization" },
  { name: "Рынок артефактов", type: "auction" },
  { name: "Династия Нова", type: "civilization" },
  { name: "Лунное казино", type: "casino" },
  { name: "Кратерный флот", type: "civilization" },
  { name: "Портал Икар", type: "portal" },
  { name: "Синдикат Комет", type: "civilization" },
  { name: "Космополиция", type: "police" },
  { name: "Купол Туманности", type: "civilization" },
  { name: "Сигнальный разлом", type: "chance" },
  { name: "Форт Калипсо", type: "civilization" },
  { name: "Бонус сверхновой", type: "bonus" },
  { name: "Сектор Омега", type: "civilization" },
];

function getClientId() {
  if (typeof window === "undefined") return Math.random().toString(36).slice(2, 10);
  const existing = window.localStorage.getItem(PRESENCE_KEY);
  if (existing) return existing;
  const id = Math.random().toString(36).slice(2, 10);
  window.localStorage.setItem(PRESENCE_KEY, id);
  return id;
}

function roomKey(code) {
  return `${STORAGE_PREFIX}${code}`;
}

function randomRoom() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

function formatMoney(value) {
  return `${value.toLocaleString("ru-RU")} кр.`;
}

function rollDice() {
  return {
    a: 1 + Math.floor(Math.random() * 6),
    b: 1 + Math.floor(Math.random() * 6),
  };
}

function getCellPos(index) {
  if (index <= 10) return { row: 11, col: 11 - index };
  if (index <= 19) return { row: 11 - (index - 10), col: 1 };
  if (index <= 29) return { row: 1, col: index - 19 };
  return { row: index - 29, col: 11 };
}

function createBoard() {
  return BOARD_CELLS.map((cell, index) => {
    const basePrice = 120 + index * 22;
    return {
      id: index,
      name: cell.name,
      type: cell.type,
      price: cell.type === "civilization" ? basePrice : 0,
      rent: cell.type === "civilization" ? Math.max(30, Math.round(basePrice * 0.3)) : 0,
      ownerId: null,
      level: 0,
      shield: false,
    };
  });
}

function initialState() {
  const clientId = getClientId();
  return {
    clientId,
    roomCode: "",
    hostId: "",
    phase: "menu",
    nickname: "Игрок",
    board: createBoard(),
    seats: Array.from({ length: MAX_SEATS }, () => null),
    turnIndex: 0,
    dice: null,
    log: ["Создайте комнату или войдите по коду."],
    pendingBuy: null,
    pendingCasino: null,
    pendingUpgrade: null,
    gameOver: false,
    winnerId: null,
    version: 1,
  };
}

function loadRoom(code) {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(roomKey(code));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveRoom(code, state) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(roomKey(code), JSON.stringify(state));
}

function activeSeatIndexes(seats) {
  return seats.map((seat, idx) => (seat ? idx : null)).filter((idx) => idx !== null);
}

function currentSeatIndex(state) {
  const active = activeSeatIndexes(state.seats);
  if (!active.length) return 0;
  return active[state.turnIndex % active.length];
}

function cellStyle(type) {
  switch (type) {
    case "start":
      return { bg: "rgba(16,185,129,0.12)", border: "rgba(16,185,129,0.3)" };
    case "casino":
      return { bg: "rgba(251,191,36,0.12)", border: "rgba(251,191,36,0.3)" };
    case "tax":
      return { bg: "rgba(244,63,94,0.12)", border: "rgba(244,63,94,0.3)" };
    case "chance":
      return { bg: "rgba(56,189,248,0.12)", border: "rgba(56,189,248,0.3)" };
    case "portal":
      return { bg: "rgba(34,211,238,0.12)", border: "rgba(34,211,238,0.3)" };
    case "blackhole":
      return { bg: "rgba(168,85,247,0.12)", border: "rgba(168,85,247,0.3)" };
    case "auction":
      return { bg: "rgba(232,121,249,0.12)", border: "rgba(232,121,249,0.3)" };
    case "police":
      return { bg: "rgba(249,115,22,0.12)", border: "rgba(249,115,22,0.3)" };
    case "bonus":
      return { bg: "rgba(45,212,191,0.12)", border: "rgba(45,212,191,0.3)" };
    default:
      return { bg: "rgba(255,255,255,0.04)", border: "rgba(255,255,255,0.08)" };
  }
}

function Token({ name, active = false, owned = false }) {
  const letter = name.slice(0, 1).toUpperCase();
  return (
    <div
      style={{
        width: 28,
        height: 28,
        borderRadius: 999,
        display: "grid",
        placeItems: "center",
        fontSize: 11,
        fontWeight: 700,
        color: "white",
        border: "1px solid rgba(255,255,255,0.18)",
        background: owned ? "linear-gradient(135deg, #22d3ee, #2563eb)" : "linear-gradient(135deg, #6b7280, #111827)",
        boxShadow: active ? "0 0 0 6px rgba(34,211,238,0.12)" : "0 8px 20px rgba(0,0,0,0.3)",
        transform: active ? "translateY(-2px) scale(1.05)" : "none",
        transition: "all .2s ease",
      }}
    >
      {letter}
    </div>
  );
}

function DiceFace({ value, rolling }) {
  const pips = {
    1: [[1, 1]],
    2: [[0, 0], [2, 2]],
    3: [[0, 0], [1, 1], [2, 2]],
    4: [[0, 0], [0, 2], [2, 0], [2, 2]],
    5: [[0, 0], [0, 2], [1, 1], [2, 0], [2, 2]],
    6: [[0, 0], [1, 0], [2, 0], [0, 2], [1, 2], [2, 2]],
  }[value] || [];

  return (
    <div
      style={{
        width: 86,
        height: 86,
        borderRadius: 22,
        background: "linear-gradient(135deg, #f8fafc, #cbd5e1)",
        color: "#111827",
        display: "grid",
        placeItems: "center",
        border: "1px solid rgba(255,255,255,0.2)",
        boxShadow: "0 16px 45px rgba(0,0,0,0.35)",
        transform: rolling ? "rotate(8deg) scale(1.03)" : "none",
        transition: "transform .2s ease",
      }}
    >
      <div style={{ width: 48, height: 48, display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gridTemplateRows: "repeat(3, 1fr)", gap: 4 }}>
        {Array.from({ length: 9 }).map((_, i) => (
          <div key={i} style={{ borderRadius: 999, background: pips.some(([r, c]) => r * 3 + c === i) ? "#0f172a" : "transparent" }} />
        ))}
      </div>
    </div>
  );
}

function cellLabel(cell) {
  if (cell.type === "civilization") return "ЦИВ";
  if (cell.type === "casino") return "КАЗ";
  if (cell.type === "tax") return "НАЛ";
  if (cell.type === "chance") return "СОБ";
  if (cell.type === "portal") return "ПОРТ";
  if (cell.type === "blackhole") return "ДЫРА";
  if (cell.type === "auction") return "АУКЦ";
  if (cell.type === "police") return "ПОЛ";
  if (cell.type === "bonus") return "+";
  return "СТ";
}

export default function App() {
  const [state, setState] = useState(initialState);
  const [roomInput, setRoomInput] = useState("");
  const [nameInput, setNameInput] = useState("Игрок");
  const [joined, setJoined] = useState(false);
  const [betAmount, setBetAmount] = useState(100);
  const [betMode, setBetMode] = useState("высоко");
  const [rolling, setRolling] = useState(false);
  const [hint, setHint] = useState("");

  const currentIndex = currentSeatIndex(state);
  const currentSeat = state.seats[currentIndex];
  const mySeatIndex = useMemo(() => state.seats.findIndex((seat) => seat?.clientId === state.clientId), [state.seats, state.clientId]);
  const mySeat = mySeatIndex >= 0 ? state.seats[mySeatIndex] : null;
  const myTurn = state.phase === "game" && currentSeat?.clientId === state.clientId && !state.gameOver;
  const board = useMemo(() => state.board.map((cell) => ({ ...cell, occupants: state.seats.filter((seat) => seat?.pos === cell.id) })), [state.board, state.seats]);
  const currentCell = mySeat ? state.board[mySeat.pos] : null;

  useEffect(() => {
    const hash = typeof window !== "undefined" ? window.location.hash.slice(1).toUpperCase() : "";
    if (hash) setRoomInput(hash);
  }, []);

  useEffect(() => {
    if (!state.roomCode || typeof window === "undefined") return;
    const saved = loadRoom(state.roomCode);
    if (saved && saved.version > state.version && saved.clientId !== state.clientId) {
      setState(saved);
    }
  }, [state.roomCode]);

  useEffect(() => {
    if (!state.roomCode) return;
    saveRoom(state.roomCode, state);
  }, [state]);

  useEffect(() => {
    if (state.phase !== "game" || state.gameOver) return;
    const seat = currentSeat;
    if (!seat || seat.clientId === state.clientId) return;
    if (!String(seat.clientId).startsWith("ai-")) return;
    const timer = setTimeout(() => aiTurn(), 850);
    return () => clearTimeout(timer);
  }, [state.phase, state.turnIndex, state.gameOver, state.version]);

  function setLog(next, message) {
    return { ...next, log: [message, ...next.log].slice(0, 8) };
  }

  function update(updater) {
    setState((prev) => {
      const next = updater(prev);
      return { ...next, version: (next.version || 1) + 1 };
    });
  }

  function createRoom() {
    const code = randomRoom();
    const next = initialState();
    next.roomCode = code;
    next.phase = "lobby";
    next.hostId = next.clientId;
    next.nickname = nameInput.trim() || "Игрок";
    next.seats[0] = { clientId: next.clientId, name: next.nickname, money: START_MONEY, pos: 0, laps: 0, ready: true };
    next.log = [`Комната ${code} создана.`, "Скопируйте ссылку и отправьте друзьям."];
    const saved = { ...next, version: 1 };
    setState(saved);
    saveRoom(code, saved);
    setJoined(true);
    window.location.hash = code;
  }

  function joinRoom() {
    const code = roomInput.trim().toUpperCase();
    if (!code) return;
    const saved = loadRoom(code);
    if (!saved) {
      const next = initialState();
      next.roomCode = code;
      next.phase = "lobby";
      next.nickname = nameInput.trim() || "Игрок";
      next.seats[0] = { clientId: next.clientId, name: next.nickname, money: START_MONEY, pos: 0, laps: 0, ready: true };
      next.log = [`Комната ${code} не найдена. Создано локальное лобби.`];
      const local = { ...next, version: 1 };
      setState(local);
      saveRoom(code, local);
      setJoined(true);
      window.location.hash = code;
      return;
    }
    const cloned = { ...saved, clientId: getClientId() };
    setState(cloned);
    setJoined(true);
    window.location.hash = code;
  }

  function copyInvite() {
    const code = state.roomCode || roomInput.trim().toUpperCase();
    if (!code || typeof window === "undefined") return;
    const url = `${window.location.origin}${window.location.pathname}#${code}`;
    navigator.clipboard?.writeText(url);
    setHint("Ссылка приглашения скопирована.");
  }

  function addAI() {
    update((prev) => {
      if (prev.phase !== "lobby") return prev;
      const index = prev.seats.findIndex((seat) => !seat);
      if (index === -1) return setLog(prev, "Свободных мест нет.");
      const next = { ...prev, seats: [...prev.seats] };
      next.seats[index] = {
        clientId: `ai-${index}-${Math.random().toString(36).slice(2, 6)}`,
        name: `ИИ ${index + 1}`,
        money: START_MONEY,
        pos: 0,
        laps: 0,
        ready: true,
      };
      return setLog(next, `Добавлен ИИ ${index + 1}.`);
    });
  }

  function claimSeat(index) {
    update((prev) => {
      if (prev.phase !== "lobby") return prev;
      const next = { ...prev, seats: [...prev.seats] };
      next.seats[index] = { clientId: prev.clientId, name: nameInput.trim() || "Игрок", money: START_MONEY, pos: 0, laps: 0, ready: false };
      next.nickname = nameInput.trim() || "Игрок";
      return setLog(next, `Место ${index + 1} занято.`);
    });
  }

  function toggleReady(index) {
    update((prev) => {
      if (prev.phase !== "lobby") return prev;
      const seat = prev.seats[index];
      if (!seat || seat.clientId !== prev.clientId) return prev;
      const next = { ...prev, seats: [...prev.seats] };
      next.seats[index] = { ...seat, ready: !seat.ready };
      return setLog(next, next.seats[index].ready ? `Место ${index + 1} готово.` : `Место ${index + 1} не готово.`);
    });
  }

  function startGame() {
    update((prev) => {
      if (prev.phase !== "lobby") return prev;
      const occupied = prev.seats.filter(Boolean);
      if (occupied.length < 2) return setLog(prev, "Нужно минимум 2 игрока.");
      if (!occupied.every((seat) => seat.ready)) return setLog(prev, "Все игроки должны нажать «Готов».");
      return setLog({ ...prev, phase: "game", board: createBoard(), pendingBuy: null, pendingCasino: null, pendingUpgrade: null, gameOver: false, winnerId: null, turnIndex: 0, dice: null }, "Игра началась.");
    });
  }

  function movePlayer(next, index, steps) {
    const player = { ...next.seats[index] };
    const oldPos = player.pos;
    const rawPos = oldPos + steps;
    const newPos = rawPos % BOARD_SIZE;
    if (rawPos >= BOARD_SIZE) player.money += 200;
    player.pos = newPos;
    next.seats[index] = player;
    next.dice = { a: Math.floor(steps / 2), b: Math.ceil(steps / 2), total: steps };
    return { next, newPos };
  }

  function resolveLanding(next, index, pos) {
    const cell = next.board[pos];
    const player = { ...next.seats[index] };
    const owner = next.seats.find((seat) => seat?.clientId === cell.ownerId);

    if (cell.type === "start") {
      next.seats[index] = player;
      return setLog(next, `${player.name} прошёл старт и получил 200.`);
    }

    if (cell.type === "tax") {
      const tax = 80 + pos * 5;
      player.money -= tax;
      next.seats[index] = player;
      return setLog(next, `${player.name} заплатил налог ${tax}.`);
    }

    if (cell.type === "chance") {
      const delta = [180, -120, 240, -160, 100, -80][Math.floor(Math.random() * 6)];
      player.money += delta;
      next.seats[index] = player;
      return setLog(next, delta >= 0 ? `${player.name} получил ${delta} из аномалии.` : `${player.name} потерял ${Math.abs(delta)} в аномалии.`);
    }

    if (cell.type === "portal") {
      player.pos = [1, 7, 15, 23, 31, 39][Math.floor(Math.random() * 6)];
      next.seats[index] = player;
      return setLog(next, `${player.name} вошёл в портал и телепортировался.`);
    }

    if (cell.type === "blackhole") {
      player.pos = Math.floor(Math.random() * BOARD_SIZE);
      player.money -= 150;
      next.seats[index] = player;
      return setLog(next, `${player.name} попал в чёрную дыру.`);
    }

    if (cell.type === "auction") {
      const delta = [150, 0, -90, 220, -60][Math.floor(Math.random() * 5)];
      player.money += delta;
      next.seats[index] = player;
      return setLog(next, delta >= 0 ? `${player.name} выиграл на аукционе.` : `${player.name} потратился на аукционе.`);
    }

    if (cell.type === "police") {
      const fine = 120 + player.laps * 20;
      player.money -= fine;
      next.seats[index] = player;
      return setLog(next, `${player.name} остановлен космополициией и платит ${fine}.`);
    }

    if (cell.type === "bonus") {
      player.money += 300;
      next.seats[index] = player;
      return setLog(next, `${player.name} получил бонус сверхновой: 300.`);
    }

    if (cell.type === "casino") {
      next.pendingCasino = { index: pos, open: true };
      next.seats[index] = player;
      return setLog(next, `${player.name} попал в лунное казино.`);
    }

    if (cell.type === "civilization") {
      if (!cell.ownerId) {
        if (player.clientId === next.clientId) {
          next.pendingBuy = { index: pos };
          return setLog(next, `Можно купить цивилизацию ${cell.name} за ${formatMoney(cell.price)}.`);
        }
        next.seats[index] = player;
        return setLog(next, `${player.name} остановился на свободной цивилизации.`);
      }

      if (cell.ownerId !== player.clientId) {
        const rent = Math.round(cell.rent * (cell.shield ? 0.7 : 1) + cell.level * 35);
        player.money -= rent;
        if (owner) owner.money += rent;
        next.seats[index] = player;
        return setLog(next, `${player.name} заплатил аренду ${rent}.`);
      }

      next.pendingUpgrade = { index: pos };
      next.seats[index] = player;
      return setLog(next, `Это ваша цивилизация. Можно прокачать её.`);
    }

    next.seats[index] = player;
    return next;
  }

  function clearTurn(next) {
    const active = activeSeatIndexes(next.seats);
    if (!active.length) return next;
    next.turnIndex = (next.turnIndex + 1) % active.length;
    next.dice = null;
    next.pendingBuy = null;
    next.pendingCasino = null;
    next.pendingUpgrade = null;
    return next;
  }

  function finalize(next) {
    const alive = next.seats.filter((seat) => seat && seat.money > 0);
    if (alive.length <= 1) {
      next.gameOver = true;
      next.winnerId = alive[0]?.clientId || null;
      return setLog(next, alive[0] ? `${alive[0].name} победил.` : "Все игроки обанкротились.");
    }
    return next;
  }

  function humanRoll() {
    if (rolling) return;
    setRolling(true);
    update((prev) => {
      if (prev.phase !== "game" || prev.gameOver) return prev;
      const index = currentSeatIndex(prev);
      const seat = prev.seats[index];
      if (!seat || seat.clientId !== prev.clientId) return prev;
      if (prev.pendingBuy || prev.pendingCasino?.open || prev.pendingUpgrade) return prev;
      const { a, b } = rollDice();
      const steps = a + b;
      const next = { ...prev, seats: [...prev.seats], board: [...prev.board], dice: { a, b, total: steps } };
      const moved = movePlayer(next, index, steps);
      return finalize(resolveLanding(moved.next, index, moved.newPos));
    });
    setTimeout(() => setRolling(false), 700);
  }

  function buyCivilization() {
    update((prev) => {
      if (!prev.pendingBuy) return prev;
      const index = currentSeatIndex(prev);
      const player = { ...prev.seats[index] };
      if (!player || player.clientId !== prev.clientId) return prev;
      const cell = { ...prev.board[prev.pendingBuy.index] };
      if (player.money < cell.price) return setLog(prev, "Не хватает денег.");
      const next = { ...prev, seats: [...prev.seats], board: [...prev.board], pendingBuy: null };
      player.money -= cell.price;
      cell.ownerId = player.clientId;
      next.seats[index] = player;
      next.board[cell.id] = cell;
      return setLog(next, `${player.name} купил цивилизацию ${cell.name}.`);
    });
  }

  function skipBuy() {
    update((prev) => ({ ...prev, pendingBuy: null }));
  }

  function upgradeCivilization() {
    update((prev) => {
      const index = currentSeatIndex(prev);
      const player = { ...prev.seats[index] };
      if (!player || player.clientId !== prev.clientId) return prev;
      const cell = prev.board[player.pos];
      if (!cell || cell.type !== "civilization" || cell.ownerId !== player.clientId) return prev;
      const cost = Math.round(cell.price * 0.55 + cell.level * 120);
      if (player.money < cost) return setLog(prev, "Не хватает денег на прокачку.");
      const next = { ...prev, seats: [...prev.seats], board: [...prev.board] };
      player.money -= cost;
      const upgraded = { ...cell, level: cell.level + 1, rent: Math.round(cell.rent * 1.35), shield: cell.level >= 1 || cell.shield };
      next.seats[index] = player;
      next.board[cell.id] = upgraded;
      return setLog(next, `${player.name} прокачал цивилизацию до уровня ${upgraded.level}.`);
    });
  }

  function playCasino() {
    update((prev) => {
      if (!prev.pendingCasino?.open) return prev;
      const index = currentSeatIndex(prev);
      const player = { ...prev.seats[index] };
      if (!player || player.clientId !== prev.clientId) return prev;
      const amount = Math.min(Math.max(20, Math.round(betAmount)), player.money);
      if (amount <= 0) return prev;
      const spin = 1 + Math.floor(Math.random() * 6);
      const win =
        betMode === "чёт" ? spin % 2 === 0 :
        betMode === "нечёт" ? spin % 2 === 1 :
        betMode === "низко" ? spin <= 3 :
        spin >= 4;
      const payout = win ? Math.round(amount * 1.8) : -amount;
      player.money += payout;
      const next = { ...prev, seats: [...prev.seats], pendingCasino: null };
      next.seats[index] = player;
      return finalize(setLog(next, win ? `Выигрыш в казино: +${payout}.` : `Проигрыш в казино: -${amount}.`));
    });
  }

  function skipCasino() {
    update((prev) => ({ ...prev, pendingCasino: null }));
  }

  function endTurn() {
    update((prev) => {
      if (prev.phase !== "game" || prev.gameOver) return prev;
      const index = currentSeatIndex(prev);
      const seat = prev.seats[index];
      if (!seat || seat.clientId !== prev.clientId) return prev;
      if (prev.pendingBuy || prev.pendingCasino?.open || prev.pendingUpgrade) return prev;
      return finalize(clearTurn({ ...prev, seats: [...prev.seats], board: [...prev.board] }));
    });
  }

  function aiTurn() {
    update((prev) => {
      if (prev.phase !== "game" || prev.gameOver) return prev;
      const index = currentSeatIndex(prev);
      const seat = prev.seats[index];
      if (!seat || !String(seat.clientId).startsWith("ai-")) return prev;
      if (prev.pendingBuy || prev.pendingCasino?.open || prev.pendingUpgrade) return prev;
      const { a, b } = rollDice();
      const steps = a + b;
      const next = { ...prev, seats: [...prev.seats], board: [...prev.board], dice: { a, b, total: steps } };
      const moved = movePlayer(next, index, steps);
      let after = resolveLanding(moved.next, index, moved.newPos);

      if (after.pendingBuy) {
        const cell = after.board[after.pendingBuy.index];
        const ai = { ...after.seats[index] };
        if (ai.money >= cell.price && Math.random() > 0.35) {
          ai.money -= cell.price;
          after.board[cell.id] = { ...cell, ownerId: ai.clientId };
          after.seats[index] = ai;
          after.pendingBuy = null;
          after = setLog(after, `${ai.name} купил ${cell.name}.`);
        } else {
          after.pendingBuy = null;
        }
      }

      if (after.pendingCasino?.open) {
        const ai = { ...after.seats[index] };
        const amount = Math.min(Math.max(20, Math.round(ai.money * 0.1)), ai.money);
        const spin = 1 + Math.floor(Math.random() * 6);
        const mode = ["высоко", "низко", "чёт", "нечёт"][Math.floor(Math.random() * 4)];
        const win = mode === "чёт" ? spin % 2 === 0 : mode === "нечёт" ? spin % 2 === 1 : mode === "низко" ? spin <= 3 : spin >= 4;
        ai.money += win ? Math.round(amount * 1.8) : -amount;
        after.seats[index] = ai;
        after.pendingCasino = null;
        after = setLog(after, win ? `${ai.name} выиграл в казино.` : `${ai.name} проиграл в казино.`);
      }

      return finalize(clearTurn(after));
    });
  }

  function resetAll() {
    setState(initialState());
    setJoined(false);
    setRoomInput("");
    setHint("");
    if (typeof window !== "undefined") window.location.hash = "";
  }

  const winnerName = useMemo(() => {
    if (!state.winnerId) return "";
    const seat = state.seats.find((item) => item?.clientId === state.winnerId);
    return seat?.name || "Победитель";
  }, [state.winnerId, state.seats]);

  const style = `
    @keyframes floaty { 0%,100% { transform: translateY(0px); } 50% { transform: translateY(-6px); } }
    @keyframes pulseGlow { 0%,100% { box-shadow: 0 0 0 0 rgba(34,211,238,.0); } 50% { box-shadow: 0 0 0 10px rgba(34,211,238,.08); } }
    @keyframes fadeUp { from { opacity: 0; transform: translateY(10px);} to { opacity: 1; transform: translateY(0);} }
  `;

  if (!joined && state.phase === "menu") {
    return (
      <div style={{ minHeight: "100vh", background: "radial-gradient(circle at top, #10203c, #07101f 48%, #050812 100%)", color: "#e5eefb", fontFamily: "Inter, Arial, sans-serif", padding: 24 }}>
        <style>{style}</style>
        <div style={{ maxWidth: 1200, margin: "0 auto", display: "grid", gridTemplateColumns: "1.15fr .85fr", gap: 24, alignItems: "start" }}>
          <section style={{ background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.1)", borderRadius: 28, padding: 24, backdropFilter: "blur(18px)", boxShadow: "0 20px 60px rgba(0,0,0,.35)", animation: "fadeUp .35s ease" }}>
            <div style={{ fontSize: 12, letterSpacing: "0.28em", textTransform: "uppercase", color: "#8dd7ff" }}>Космо-Монополия</div>
            <h1 style={{ margin: "10px 0 0", fontSize: 46, lineHeight: 1.02 }}>Русская версия в стиле классической монополии</h1>
            <p style={{ marginTop: 14, color: "#b8c6db", lineHeight: 1.6, maxWidth: 760 }}>
              Поле по периметру, большой центр, кубики, цивилизации вместо улиц, лунное казино, аномалии и комнаты по коду. Всё сделано так, чтобы было понятно сразу.
            </p>
            <div style={{ marginTop: 18, display: "grid", gridTemplateColumns: "repeat(2, minmax(0,1fr))", gap: 12 }}>
              {DIFFERENCES.map((item, i) => (
                <div key={i} style={{ padding: 12, borderRadius: 18, background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.08)", color: "#dbe7ff", fontSize: 14 }}>
                  {item}
                </div>
              ))}
            </div>
            <div style={{ marginTop: 18, padding: 18, borderRadius: 22, background: "rgba(0,0,0,.22)", border: "1px solid rgba(255,255,255,.08)" }}>
              <div style={{ fontWeight: 700, marginBottom: 10 }}>Как играть с друзьями</div>
              <div style={{ color: "#c8d3e8", lineHeight: 1.8, fontSize: 14 }}>
                1. Один игрок создаёт комнату.<br />
                2. Отправляет код или ссылку друзьям.<br />
                3. Друзья заходят по коду и занимают места.<br />
                4. Все нажимают «Готов».<br />
                5. Хозяин запускает игру.
              </div>
              <div style={{ marginTop: 12, fontSize: 12, color: "#8ea2bf" }}>
                Для реального онлайн-мультиплеера нужен сервер синхронизации. Этот вариант уже готов по интерфейсу и комнатам.
              </div>
            </div>
          </section>

          <section style={{ background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.1)", borderRadius: 28, padding: 24, backdropFilter: "blur(18px)", boxShadow: "0 20px 60px rgba(0,0,0,.35)", animation: "fadeUp .45s ease" }}>
            <div style={{ fontSize: 22, fontWeight: 800 }}>Создать или войти</div>
            <div style={{ marginTop: 16 }}>
              <div style={{ fontSize: 14, color: "#b8c6db", marginBottom: 8 }}>Ваше имя</div>
              <input value={nameInput} onChange={(e) => setNameInput(e.target.value)} placeholder="Игрок" style={{ width: "100%", padding: "14px 16px", borderRadius: 18, border: "1px solid rgba(255,255,255,.1)", background: "rgba(10,14,24,.7)", color: "white", outline: "none" }} />
            </div>
            <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <button onClick={createRoom} style={{ padding: "14px 16px", borderRadius: 18, border: "none", background: "linear-gradient(135deg,#22d3ee,#3b82f6)", color: "#07101f", fontWeight: 800, cursor: "pointer" }}>Создать комнату</button>
              <button onClick={() => setJoined(true)} style={{ padding: "14px 16px", borderRadius: 18, border: "1px solid rgba(255,255,255,.1)", background: "rgba(255,255,255,.05)", color: "white", fontWeight: 700, cursor: "pointer" }}>Войти по коду</button>
            </div>
            <div style={{ marginTop: 10, display: "flex", gap: 10 }}>
              <input value={roomInput} onChange={(e) => setRoomInput(e.target.value.toUpperCase())} placeholder="Код комнаты" style={{ flex: 1, padding: "14px 16px", borderRadius: 18, border: "1px solid rgba(255,255,255,.1)", background: "rgba(10,14,24,.7)", color: "white", outline: "none" }} />
              <button onClick={joinRoom} style={{ padding: "14px 16px", borderRadius: 18, border: "1px solid rgba(255,255,255,.1)", background: "rgba(255,255,255,.05)", color: "white", cursor: "pointer" }}>Ок</button>
            </div>
            <div style={{ marginTop: 18, padding: 16, borderRadius: 20, background: "rgba(0,0,0,.22)", border: "1px solid rgba(255,255,255,.08)" }}>
              <div style={{ fontWeight: 700 }}>Что уже работает</div>
              <div style={{ marginTop: 8, color: "#c8d3e8", fontSize: 14, lineHeight: 1.7 }}>
                Поле по кругу, ход кубиков, покупка цивилизаций, казино, аномалии, чёрная дыра, портал, аукцион, полиция и журнал событий.
              </div>
            </div>
          </section>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "radial-gradient(circle at top, #10203c, #07101f 48%, #050812 100%)", color: "#e5eefb", fontFamily: "Inter, Arial, sans-serif", padding: 16 }}>
      <style>{style}</style>
      <div style={{ maxWidth: 1800, margin: "0 auto", display: "grid", gridTemplateColumns: "360px minmax(0, 1fr)", gap: 16 }}>
        <aside style={{ background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.1)", borderRadius: 28, padding: 18, backdropFilter: "blur(18px)", boxShadow: "0 20px 60px rgba(0,0,0,.35)" }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
            <div>
              <div style={{ fontSize: 12, letterSpacing: "0.28em", textTransform: "uppercase", color: "#8dd7ff" }}>Комната {state.roomCode || "—"}</div>
              <h2 style={{ margin: "8px 0 0", fontSize: 28 }}>Космо-Монополия</h2>
              <div style={{ marginTop: 8, color: "#b8c6db", fontSize: 14, lineHeight: 1.5 }}>Русский интерфейс, поле как у монополии, понятные кнопки и лобби по коду.</div>
            </div>
          </div>

          <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <button onClick={copyInvite} style={{ padding: "12px 14px", borderRadius: 16, border: "1px solid rgba(255,255,255,.1)", background: "rgba(255,255,255,.05)", color: "white", cursor: "pointer" }}>Скопировать ссылку</button>
            <button onClick={resetAll} style={{ padding: "12px 14px", borderRadius: 16, border: "1px solid rgba(255,255,255,.1)", background: "rgba(255,255,255,.05)", color: "white", cursor: "pointer" }}>Сбросить</button>
          </div>
          {hint && <div style={{ marginTop: 10, fontSize: 13, color: "#8ee6b0" }}>{hint}</div>}

          <div style={{ marginTop: 16, padding: 14, borderRadius: 20, background: "rgba(0,0,0,.22)", border: "1px solid rgba(255,255,255,.08)" }}>
            <div style={{ fontSize: 12, letterSpacing: "0.22em", textTransform: "uppercase", color: "#8dd7ff" }}>Лобби / ход</div>
            <div style={{ marginTop: 8, fontSize: 14, color: "#d7e6ff", lineHeight: 1.6 }}>
              {state.phase === "lobby" ? "Соберите игроков, отметьте готовность и запускайте игру." : myTurn ? "Ваш ход. Нажмите на кубики и ходите." : `Сейчас ходит ${currentSeat?.name || "—"}.`}
            </div>
          </div>

          <div style={{ marginTop: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>Игроки</div>
            <div style={{ display: "grid", gap: 10 }}>
              {state.seats.map((seat, index) =>
                seat ? (
                  <div key={index} style={{ padding: 12, borderRadius: 18, background: currentIndex === index && state.phase === "game" ? "rgba(34,211,238,.12)" : "rgba(0,0,0,.22)", border: "1px solid rgba(255,255,255,.08)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <Token name={seat.name} active={currentIndex === index && state.phase === "game"} owned={seat.clientId === state.clientId} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                          <div style={{ fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{seat.name}</div>
                          <div style={{ fontSize: 12, color: "#8ea2bf" }}>Место {index + 1}</div>
                        </div>
                        <div style={{ marginTop: 4, fontSize: 12, color: "#8ea2bf" }}>{seat.clientId === state.clientId ? "Вы" : String(seat.clientId).startsWith("ai-") ? "ИИ" : "Друг"}</div>
                      </div>
                      <div style={{ fontWeight: 800, fontSize: 14 }}>{formatMoney(seat.money || 0)}</div>
                    </div>
                    {state.phase === "lobby" && seat.clientId === state.clientId && (
                      <div style={{ marginTop: 10, display: "flex", justifyContent: "flex-end" }}>
                        <button onClick={() => toggleReady(index)} style={{ padding: "8px 12px", borderRadius: 999, border: "1px solid rgba(255,255,255,.1)", background: "rgba(255,255,255,.05)", color: "white", cursor: "pointer" }}>{seat.ready ? "Готов" : "Не готов"}</button>
                      </div>
                    )}
                  </div>
                ) : (
                  <button key={index} onClick={() => claimSeat(index)} style={{ padding: 12, borderRadius: 18, border: "1px dashed rgba(255,255,255,.15)", background: "rgba(255,255,255,.03)", color: "#b8c6db", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span>Свободное место</span>
                    <span>Занять</span>
                  </button>
                )
              )}
            </div>
            {state.phase === "lobby" && (
              <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <button onClick={addAI} style={{ padding: "12px 14px", borderRadius: 16, border: "1px solid rgba(255,255,255,.1)", background: "rgba(255,255,255,.05)", color: "white", cursor: "pointer" }}>Добавить ИИ</button>
                <button onClick={startGame} style={{ padding: "12px 14px", borderRadius: 16, border: "none", background: "linear-gradient(135deg,#22d3ee,#3b82f6)", color: "#07101f", fontWeight: 800, cursor: "pointer" }}>Старт игры</button>
              </div>
            )}
          </div>

          <div style={{ marginTop: 16, padding: 14, borderRadius: 20, background: "rgba(0,0,0,.22)", border: "1px solid rgba(255,255,255,.08)" }}>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>Журнал</div>
            <div style={{ maxHeight: 220, overflow: "auto", display: "grid", gap: 8 }}>
              {state.log.map((line, i) => (
                <div key={i} style={{ padding: 10, borderRadius: 14, background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.05)", fontSize: 13, color: "#d7e6ff" }}>{line}</div>
              ))}
            </div>
          </div>
        </aside>

        <main style={{ background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.1)", borderRadius: 28, padding: 18, backdropFilter: "blur(18px)", boxShadow: "0 20px 60px rgba(0,0,0,.35)", position: "relative", overflow: "hidden" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: 12, letterSpacing: "0.28em", textTransform: "uppercase", color: "#8dd7ff" }}>Игровое поле</div>
              <h3 style={{ margin: "8px 0 0", fontSize: 24 }}>Поле в стиле классической монополии</h3>
            </div>
            <div style={{ padding: "10px 14px", borderRadius: 16, background: "rgba(0,0,0,.25)", border: "1px solid rgba(255,255,255,.08)", color: "#d7e6ff" }}>
              {state.gameOver ? `Победил: ${winnerName || "—"}` : myTurn ? "Ваш ход" : `Ход: ${currentSeat?.name || "—"}`}
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(11, minmax(0, 1fr))", gridTemplateRows: "repeat(11, minmax(0, 1fr))", gap: 8, aspectRatio: "1.08 / 1", minHeight: 820, position: "relative" }}>
            {board.map((cell) => {
              const pos = getCellPos(cell.id);
              const styleCell = cellStyle(cell.type);
              return (
                <div key={cell.id} style={{ gridColumn: pos.col, gridRow: pos.row, background: styleCell.bg, border: `1px solid ${styleCell.border}`, borderRadius: 18, padding: 8, position: "relative", overflow: "hidden", transition: "transform .15s ease", boxShadow: "0 8px 24px rgba(0,0,0,.18)" }}>
                  <div style={{ display: "flex", alignItems: "start", justifyContent: "space-between", gap: 8 }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 10, color: "#8ea2bf" }}>{cell.id + 1}</div>
                      <div style={{ fontSize: 11, fontWeight: 700, lineHeight: 1.2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{cell.name}</div>
                    </div>
                    <div style={{ fontSize: 10, color: "#b8c6db", letterSpacing: "0.15em" }}>{cellLabel(cell)}</div>
                  </div>
                  <div style={{ marginTop: 8, fontSize: 10, color: "#a8b9d4", lineHeight: 1.45 }}>
                    {cell.type === "civilization" && <div>Цена: {formatMoney(cell.price)}</div>}
                    {cell.type === "civilization" && <div>Аренда: {formatMoney(cell.rent + cell.level * 35)}</div>}
                    {cell.type === "civilization" && cell.level > 0 && <div>Уровень: {cell.level}</div>}
                    {cell.type === "casino" && <div>Лунные ставки</div>}
                    {cell.type === "tax" && <div>Космический налог</div>}
                    {cell.type === "chance" && <div>Карта события</div>}
                    {cell.type === "portal" && <div>Телепорт</div>}
                    {cell.type === "blackhole" && <div>Случайный прыжок</div>}
                    {cell.type === "auction" && <div>Аукцион</div>}
                    {cell.type === "police" && <div>Штраф</div>}
                    {cell.type === "bonus" && <div>Награда</div>}
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 8 }}>
                    {cell.occupants.map((seat) => (
                      <Token key={seat.clientId} name={seat.name} active={seat.clientId === state.clientId} owned={seat.clientId === state.clientId} />
                    ))}
                  </div>
                  {cell.ownerId && <div style={{ position: "absolute", right: 8, bottom: 8, fontSize: 10, color: "#c2f0ff", background: "rgba(34,211,238,.12)", border: "1px solid rgba(34,211,238,.25)", borderRadius: 999, padding: "3px 8px" }}>Владелец</div>}
                </div>
              );
            })}

            <div style={{ gridColumn: "3 / 10", gridRow: "3 / 10", borderRadius: 30, border: "1px solid rgba(255,255,255,.1)", background: "rgba(3,7,18,.58)", backdropFilter: "blur(16px)", boxShadow: "0 20px 60px rgba(0,0,0,.36)", padding: 18, display: "grid", gridTemplateColumns: "1.1fr .9fr", gap: 16 }}>
              <div>
                <div style={{ fontSize: 12, letterSpacing: "0.28em", textTransform: "uppercase", color: "#8dd7ff" }}>Центр управления</div>
                <div style={{ marginTop: 8, fontSize: 26, fontWeight: 800 }}>{state.phase === "lobby" ? "Лобби" : state.gameOver ? "Игра окончена" : "Игровой раунд"}</div>
                <div style={{ marginTop: 8, color: "#b8c6db", lineHeight: 1.6 }}>
                  {state.phase === "lobby" ? "Занимайте места, нажимайте готовность и запускайте матч." : myTurn ? "Сейчас ваш ход. Бросайте кубики, покупайте и прокачивайте цивилизации." : `Сейчас ходит ${currentSeat?.name || "—"}.`}
                </div>

                <div style={{ marginTop: 16, display: "grid", gridTemplateColumns: "repeat(2, minmax(0,1fr))", gap: 12 }}>
                  <div style={{ padding: 14, borderRadius: 20, background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.08)" }}>
                    <div style={{ fontSize: 12, color: "#8ea2bf", textTransform: "uppercase", letterSpacing: "0.2em" }}>Кубики</div>
                    <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 12 }}>
                      <DiceFace value={state.dice?.a || 1} rolling={rolling} />
                      <DiceFace value={state.dice?.b || 1} rolling={rolling} />
                    </div>
                    <div style={{ marginTop: 12, color: "#d7e6ff" }}>{state.dice ? `${state.dice.a} + ${state.dice.b} = ${state.dice.total}` : "Нажмите «Бросить кубики»."}</div>
                  </div>

                  <div style={{ padding: 14, borderRadius: 20, background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.08)" }}>
                    <div style={{ fontSize: 12, color: "#8ea2bf", textTransform: "uppercase", letterSpacing: "0.2em" }}>Ваш сектор</div>
                    <div style={{ marginTop: 10, fontSize: 18, fontWeight: 800 }}>{mySeat ? currentCell?.name || "—" : "Займите место"}</div>
                    <div style={{ marginTop: 8, color: "#b8c6db", lineHeight: 1.55 }}>
                      {mySeat ? `Баланс: ${formatMoney(mySeat.money)} · Круги: ${mySeat.laps}` : "Сначала займите место в лобби."}
                    </div>
                    {currentCell?.type === "civilization" && currentCell.ownerId === state.clientId && <div style={{ marginTop: 10, color: "#8ee6b0" }}>Эта цивилизация ваша. Можно прокачать её.</div>}
                  </div>
                </div>
              </div>

              <div style={{ display: "grid", gap: 12, alignContent: "start" }}>
                <div style={{ padding: 14, borderRadius: 20, background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.08)" }}>
                  <div style={{ fontSize: 12, color: "#8ea2bf", textTransform: "uppercase", letterSpacing: "0.2em" }}>Управление</div>
                  <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(2, minmax(0,1fr))", gap: 10 }}>
                    <button onClick={humanRoll} disabled={!myTurn || rolling || !!state.pendingBuy || !!state.pendingCasino?.open || !!state.pendingUpgrade} style={primaryButtonStyle(myTurn && !rolling && !state.pendingBuy && !state.pendingCasino?.open && !state.pendingUpgrade)}>Бросить кубики</button>
                    <button onClick={endTurn} disabled={!myTurn || !!state.pendingBuy || !!state.pendingCasino?.open || !!state.pendingUpgrade} style={secondaryButtonStyle(myTurn && !state.pendingBuy && !state.pendingCasino?.open && !state.pendingUpgrade)}>Закончить ход</button>
                    <button onClick={buyCivilization} disabled={!state.pendingBuy} style={positiveButtonStyle(!!state.pendingBuy)}>Купить</button>
                    <button onClick={skipBuy} disabled={!state.pendingBuy} style={secondaryButtonStyle(!!state.pendingBuy)}>Пропустить</button>
                    <button onClick={upgradeCivilization} disabled={!myTurn || !currentCell || currentCell.type !== "civilization" || currentCell.ownerId !== state.clientId} style={accentButtonStyle(myTurn && currentCell && currentCell.type === "civilization" && currentCell.ownerId === state.clientId)}>Прокачать</button>
                    <button onClick={copyInvite} style={secondaryButtonStyle(true)}>Ссылка</button>
                  </div>
                </div>

                <div style={{ padding: 14, borderRadius: 20, background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.08)" }}>
                  <div style={{ fontSize: 12, color: "#8ea2bf", textTransform: "uppercase", letterSpacing: "0.2em" }}>Лунное казино</div>
                  <div style={{ marginTop: 8, display: "grid", gridTemplateColumns: "repeat(2, minmax(0,1fr))", gap: 8 }}>
                    {[["высоко", "Высоко 4–6"], ["низко", "Низко 1–3"], ["чёт", "Чёт"], ["нечёт", "Нечёт"]].map(([mode, label]) => (
                      <button key={mode} onClick={() => setBetMode(mode)} style={{ ...secondaryButtonStyle(true), borderColor: betMode === mode ? "rgba(34,211,238,.4)" : "rgba(255,255,255,.08)", background: betMode === mode ? "rgba(34,211,238,.14)" : "rgba(255,255,255,.05)" }}>
                        {label}
                      </button>
                    ))}
                  </div>
                  <div style={{ marginTop: 12 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "#b8c6db", marginBottom: 8 }}>
                      <span>Размер ставки</span>
                      <span>{betAmount} кр.</span>
                    </div>
                    <input type="range" min="20" max="1000" step="10" value={betAmount} onChange={(e) => setBetAmount(Number(e.target.value))} style={{ width: "100%" }} />
                  </div>
                  <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    <button onClick={playCasino} disabled={!state.pendingCasino?.open || !myTurn} style={casinoButtonStyle(!!state.pendingCasino?.open && myTurn)}>Сделать ставку</button>
                    <button onClick={skipCasino} disabled={!state.pendingCasino?.open} style={secondaryButtonStyle(!!state.pendingCasino?.open)}>Выйти</button>
                  </div>
                </div>
              </div>
            </div>

            <div style={{ position: "absolute", right: 18, bottom: 18, width: 260, padding: 14, borderRadius: 20, background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.08)" }}>
              <div style={{ fontSize: 12, color: "#8ea2bf", textTransform: "uppercase", letterSpacing: "0.2em" }}>Кратко</div>
              <div style={{ marginTop: 8, color: "#d7e6ff", lineHeight: 1.6, fontSize: 13 }}>
                {state.phase === "lobby"
                  ? "Займите места, дождитесь готовности и запустите игру."
                  : "Бросайте кубики, покупайте цивилизации и выживайте до конца."}
              </div>
            </div>
          </div>
        </main>
      </div>

      {state.pendingBuy && myTurn && (
        <OverlayCard title="Покупка цивилизации" subtitle={`Купить ${state.board[state.pendingBuy.index]?.name} за ${formatMoney(state.board[state.pendingBuy.index]?.price || 0)}?`}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <button onClick={buyCivilization} style={primaryButtonStyle(true)}>Купить</button>
            <button onClick={skipBuy} style={secondaryButtonStyle(true)}>Пропустить</button>
          </div>
        </OverlayCard>
      )}

      {state.pendingCasino?.open && myTurn && (
        <OverlayCard title="Лунное казино" subtitle="Выберите режим и сделайте ставку.">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <button onClick={playCasino} style={casinoButtonStyle(true)}>Сделать ставку</button>
            <button onClick={skipCasino} style={secondaryButtonStyle(true)}>Выйти</button>
          </div>
        </OverlayCard>
      )}

      {state.pendingUpgrade && myTurn && (
        <OverlayCard title="Прокачка цивилизации" subtitle="У вас есть своя цивилизация. Можно усилить её и поднять аренду.">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <button onClick={upgradeCivilization} style={primaryButtonStyle(true)}>Прокачать</button>
            <button onClick={() => setState((prev) => ({ ...prev, pendingUpgrade: null }))} style={secondaryButtonStyle(true)}>Закрыть</button>
          </div>
        </OverlayCard>
      )}
    </div>
  );
}

function primaryButtonStyle(enabled) {
  return {
    padding: "12px 14px",
    borderRadius: 16,
    border: "none",
    cursor: enabled ? "pointer" : "not-allowed",
    background: enabled ? "linear-gradient(135deg,#22d3ee,#3b82f6)" : "rgba(148,163,184,.25)",
    color: enabled ? "#07101f" : "#e5eefb",
    fontWeight: 800,
  };
}

function secondaryButtonStyle(enabled) {
  return {
    padding: "12px 14px",
    borderRadius: 16,
    border: "1px solid rgba(255,255,255,.1)",
    cursor: enabled ? "pointer" : "not-allowed",
    background: "rgba(255,255,255,.05)",
    color: "white",
    fontWeight: 700,
  };
}

function positiveButtonStyle(enabled) {
  return {
    padding: "12px 14px",
    borderRadius: 16,
    border: "1px solid rgba(16,185,129,.25)",
    cursor: enabled ? "pointer" : "not-allowed",
    background: enabled ? "rgba(16,185,129,.14)" : "rgba(255,255,255,.05)",
    color: "white",
    fontWeight: 800,
  };
}

function accentButtonStyle(enabled) {
  return {
    padding: "12px 14px",
    borderRadius: 16,
    border: "1px solid rgba(232,121,249,.25)",
    cursor: enabled ? "pointer" : "not-allowed",
    background: enabled ? "rgba(232,121,249,.14)" : "rgba(255,255,255,.05)",
    color: "white",
    fontWeight: 800,
  };
}

function casinoButtonStyle(enabled) {
  return {
    padding: "12px 14px",
    borderRadius: 16,
    border: "1px solid rgba(251,191,36,.25)",
    cursor: enabled ? "pointer" : "not-allowed",
    background: enabled ? "rgba(251,191,36,.18)" : "rgba(255,255,255,.05)",
    color: enabled ? "#fff7ed" : "white",
    fontWeight: 800,
  };
}

function OverlayCard({ title, subtitle, children }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(2,6,23,.68)", backdropFilter: "blur(10px)", display: "grid", placeItems: "center", padding: 20, zIndex: 50 }}>
      <div style={{ width: "100%", maxWidth: 520, borderRadius: 28, border: "1px solid rgba(255,255,255,.12)", background: "#0b1730", boxShadow: "0 30px 80px rgba(0,0,0,.45)", padding: 22, animation: "fadeUp .2s ease" }}>
        <div style={{ fontSize: 12, letterSpacing: "0.28em", textTransform: "uppercase", color: "#8dd7ff" }}>{title}</div>
        <div style={{ marginTop: 10, fontSize: 24, fontWeight: 800 }}>{subtitle}</div>
        <div style={{ marginTop: 18 }}>{children}</div>
      </div>
    </div>
  );
}
