import React, { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

const STORAGE_PREFIX = "cosmo-mono-room-";
const PRESENCE_KEY = "cosmo-mono-client-id";
const BOARD_SIZE = 40;
const MAX_SEATS = 4;
const START_MONEY = 1600;

const DIFFERENCES = [
  "Покупка цивилизаций вместо улиц",
  "Лунное казино со ставками",
  "Чёрные дыры и телепорты",
  "Космические аномалии вместо случайных карт",
  "Прокачка цивилизаций",
  "Щиты для защиты владений",
  "Рейды на чужие сектора",
  "Аукционы артефактов",
  "Космическая полиция",
  "Налоги по секторам",
  "Порталы между зонами",
  "Контрабанда ресурсов",
  "Контроль регионов",
  "Экономические шоки",
  "Мультиплеер по комнатам",
  "Русский интерфейс",
  "Игровое поле как у монополии",
  "Крупные кубики в центре",
  "Карты событий",
  "Победа через выживание экономики",
];

const CITIES = [
  "Альфа-Луна",
  "Пульсар-1",
  "Марсианский Узел",
  "Вега-Купол",
  "Небула-9",
  "Орион-Порт",
  "Титан-7",
  "Сектор Кварц",
  "Гелиос-Сити",
  "Лунная Верфь",
  "Кольцо Сатурна",
  "Астра-3",
  "Ковчег Икар",
  "Пояс Ион",
  "Династия Нова",
  "Кратерный Флот",
  "Синдикат Комет",
  "Купол Туманности",
  "Форт Калипсо",
];

const BOARD_TEMPLATE = [
  { name: "Стартовая орбита", type: "start" },
  { name: CITIES[0], type: "civilization" },
  { name: "Сигнальный разлом", type: "chance" },
  { name: CITIES[1], type: "civilization" },
  { name: "Лунное казино", type: "casino" },
  { name: CITIES[2], type: "civilization" },
  { name: "Космический налог", type: "tax" },
  { name: CITIES[3], type: "civilization" },
  { name: "Портал Вега", type: "portal" },
  { name: CITIES[4], type: "civilization" },
  { name: "Лунное казино", type: "casino" },
  { name: CITIES[5], type: "civilization" },
  { name: "Аномалия", type: "chance" },
  { name: CITIES[6], type: "civilization" },
  { name: "Космополция", type: "police" },
  { name: CITIES[7], type: "civilization" },
  { name: "Сектор налога", type: "tax" },
  { name: CITIES[8], type: "civilization" },
  { name: "Галактический аукцион", type: "auction" },
  { name: CITIES[9], type: "civilization" },
  { name: "Чёрная дыра", type: "blackhole" },
  { name: CITIES[10], type: "civilization" },
  { name: "Сигнальный разлом", type: "chance" },
  { name: CITIES[11], type: "civilization" },
  { name: "Лунное казино", type: "casino" },
  { name: CITIES[12], type: "civilization" },
  { name: "Космический налог", type: "tax" },
  { name: CITIES[13], type: "civilization" },
  { name: "Рынок артефактов", type: "auction" },
  { name: CITIES[14], type: "civilization" },
  { name: "Лунное казино", type: "casino" },
  { name: CITIES[15], type: "civilization" },
  { name: "Портал Икар", type: "portal" },
  { name: CITIES[16], type: "civilization" },
  { name: "Сигнальный разлом", type: "chance" },
  { name: CITIES[17], type: "civilization" },
  { name: "Космический налог", type: "tax" },
  { name: CITIES[18], type: "civilization" },
  { name: "Лунное казино", type: "casino" },
  { name: "Сверхновая", type: "bonus" },
];

function getClientId() {
  if (typeof window === "undefined") return Math.random().toString(36).slice(2, 10);
  const stored = localStorage.getItem(PRESENCE_KEY);
  if (stored) return stored;
  const id = Math.random().toString(36).slice(2, 10);
  localStorage.setItem(PRESENCE_KEY, id);
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

function getCellPosition(index) {
  if (index === 0) return { row: 11, col: 11 };
  if (index >= 1 && index <= 9) return { row: 11, col: 11 - index };
  if (index === 10) return { row: 11, col: 1 };
  if (index >= 11 && index <= 19) return { row: 11 - (index - 10), col: 1 };
  if (index === 20) return { row: 1, col: 1 };
  if (index >= 21 && index <= 29) return { row: 1, col: index - 19 };
  if (index === 30) return { row: 1, col: 11 };
  if (index >= 31 && index <= 39) return { row: index - 29, col: 11 };
  return { row: 1, col: 1 };
}

function createBoard() {
  return BOARD_TEMPLATE.map((item, index) => {
    const priceBase = 140 + index * 20;
    return {
      id: index,
      name: item.name,
      type: item.type,
      price: item.type === "civilization" ? priceBase : 0,
      rent: item.type === "civilization" ? Math.max(35, Math.round(priceBase * 0.3)) : 0,
      level: 0,
      ownerId: null,
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
    diceKey: 0,
    log: ["Создайте комнату или войдите по коду."],
    pendingBuy: null,
    pendingCasino: null,
    pendingUpgrade: null,
    gameOver: false,
    winnerId: null,
    version: 1,
  };
}

function parseLocal(code) {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(roomKey(code));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveLocal(code, state) {
  if (typeof window === "undefined") return;
  localStorage.setItem(roomKey(code), JSON.stringify(state));
}

function activeSeatIndexes(seats) {
  return seats.map((seat, index) => (seat ? index : null)).filter((v) => v !== null);
}

function currentSeatIndex(state) {
  const active = activeSeatIndexes(state.seats);
  if (!active.length) return 0;
  return active[state.turnIndex % active.length];
}

function tokenName(index) {
  return ["А", "Б", "В", "Г"][index] || "?";
}

function BoardMarker({ label, active = false, owner = false }) {
  return (
    <motion.div
      animate={active ? { scale: [1, 1.12, 1], y: [0, -2, 0] } : {}}
      transition={active ? { duration: 1.2, repeat: Infinity } : undefined}
      className={`flex h-8 w-8 items-center justify-center rounded-full border text-[11px] font-semibold ${
        owner ? "border-cyan-300/40 bg-cyan-400/20 text-cyan-100" : "border-white/10 bg-white/10 text-white"
      }`}
    >
      {label}
    </motion.div>
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
    <motion.div
      key={`${value}-${rolling ? "roll" : "still"}`}
      animate={rolling ? { rotate: [0, 12, -12, 0], scale: [1, 1.06, 1] } : {}}
      transition={rolling ? { duration: 0.7 } : undefined}
      className="grid h-20 w-20 place-items-center rounded-[20px] border border-white/10 bg-gradient-to-br from-white/90 to-slate-200 text-slate-900 shadow-[0_20px_60px_rgba(0,0,0,0.45)]"
    >
      <div className="grid h-12 w-12 grid-cols-3 grid-rows-3 gap-1">
        {Array.from({ length: 9 }).map((_, i) => (
          <div key={i} className={`rounded-full ${pips.some(([r, c]) => r * 3 + c === i) ? "bg-slate-900" : "bg-transparent"}`} />
        ))}
      </div>
    </motion.div>
  );
}

export default function SpaceMonopolyRussian() {
  const [state, setState] = useState(initialState);
  const [roomInput, setRoomInput] = useState("");
  const [nameInput, setNameInput] = useState("Игрок");
  const [joined, setJoined] = useState(false);
  const [betAmount, setBetAmount] = useState(100);
  const [betMode, setBetMode] = useState("высоко");
  const [syncTick, setSyncTick] = useState(0);
  const [rolling, setRolling] = useState(false);

  const currentIndex = currentSeatIndex(state);
  const currentSeat = state.seats[currentIndex];
  const mySeatIndex = useMemo(() => state.seats.findIndex((s) => s?.clientId === state.clientId), [state.seats, state.clientId]);
  const mySeat = mySeatIndex >= 0 ? state.seats[mySeatIndex] : null;
  const myTurn = state.phase === "game" && currentSeat?.clientId === state.clientId && !state.gameOver;

  const board = useMemo(() => {
    return state.board.map((cell) => {
      const occupants = state.seats
        .map((seat, seatIndex) => (seat && seat.pos === cell.id ? { ...seat, seatIndex } : null))
        .filter(Boolean);
      return { ...cell, occupants };
    });
  }, [state.board, state.seats]);

  const currentCell = mySeat ? state.board[mySeat.pos] : null;
  const canBuy = Boolean(state.pendingBuy);
  const canCasino = Boolean(state.pendingCasino?.open);
  const canUpgrade = Boolean(currentCell && currentCell.type === "civilization" && currentCell.ownerId === state.clientId);

  useEffect(() => {
    const hash = typeof window !== "undefined" ? window.location.hash.slice(1).toUpperCase() : "";
    if (hash) setRoomInput(hash);
  }, []);

  useEffect(() => {
    if (!state.roomCode || typeof window === "undefined") return;
    const saved = parseLocal(state.roomCode);
    if (saved && saved.version > state.version && saved.clientId !== state.clientId) {
      setState(saved);
    }
  }, [syncTick, state.roomCode]);

  useEffect(() => {
    if (!state.roomCode) return;
    saveLocal(state.roomCode, state);
  }, [state]);

  useEffect(() => {
    if (state.phase !== "game" || state.gameOver) return;
    const idx = currentSeatIndex(state);
    const seat = state.seats[idx];
    if (!seat || seat.clientId === state.clientId) return;
    if (!String(seat.clientId).startsWith("ai-")) return;
    const timer = setTimeout(() => aiTurn(), 900);
    return () => clearTimeout(timer);
  }, [state.phase, state.turnIndex, state.gameOver, state.version]);

  function update(updater) {
    setState((prev) => {
      const next = updater(prev);
      return { ...next, version: (next.version || 1) + 1 };
    });
  }

  function pushLog(next, text) {
    return { ...next, log: [text, ...next.log].slice(0, 8) };
  }

  function createRoom() {
    const code = randomRoom();
    const next = initialState();
    next.roomCode = code;
    next.phase = "lobby";
    next.hostId = next.clientId;
    next.nickname = nameInput.trim() || "Игрок";
    next.seats[0] = { clientId: next.clientId, name: next.nickname, ready: true, money: START_MONEY, pos: 0, laps: 0 };
    next.log = [`Комната ${code} создана. Скопируйте ссылку и отправьте друзьям.`];
    const saved = { ...next, version: 1 };
    setState(saved);
    saveLocal(code, saved);
    setJoined(true);
    window.location.hash = code;
  }

  function joinRoom() {
    const code = roomInput.trim().toUpperCase();
    if (!code) return;
    const saved = parseLocal(code);
    if (!saved) {
      const next = initialState();
      next.roomCode = code;
      next.phase = "lobby";
      next.nickname = nameInput.trim() || "Игрок";
      next.seats[0] = { clientId: next.clientId, name: next.nickname, ready: true, money: START_MONEY, pos: 0, laps: 0 };
      next.log = [`Комната ${code} не найдена. Создано локальное лобби.`];
      const local = { ...next, version: 1 };
      setState(local);
      saveLocal(code, local);
      setJoined(true);
      window.location.hash = code;
      return;
    }
    const cloned = { ...saved, clientId: getClientId() };
    setState(cloned);
    setJoined(true);
    window.location.hash = code;
  }

  function addAI() {
    update((prev) => {
      if (prev.phase !== "lobby") return prev;
      const idx = prev.seats.findIndex((s) => !s);
      if (idx === -1) return pushLog(prev, "Свободных мест нет.");
      const next = { ...prev, seats: [...prev.seats] };
      next.seats[idx] = {
        clientId: `ai-${idx}-${Math.random().toString(36).slice(2, 6)}`,
        name: `ИИ ${idx + 1}`,
        ready: true,
        money: START_MONEY,
        pos: 0,
        laps: 0,
      };
      return pushLog(next, `Добавлен ИИ ${idx + 1}.`);
    });
  }

  function claimSeat(index) {
    update((prev) => {
      if (prev.phase !== "lobby") return prev;
      const next = { ...prev, seats: [...prev.seats] };
      next.seats[index] = {
        clientId: prev.clientId,
        name: nameInput.trim() || "Игрок",
        ready: false,
        money: START_MONEY,
        pos: 0,
        laps: 0,
      };
      next.nickname = nameInput.trim() || "Игрок";
      return pushLog(next, `Место ${index + 1} занято.`);
    });
  }

  function toggleReady(index) {
    update((prev) => {
      const seat = prev.seats[index];
      if (!seat || seat.clientId !== prev.clientId || prev.phase !== "lobby") return prev;
      const next = { ...prev, seats: [...prev.seats] };
      next.seats[index] = { ...seat, ready: !seat.ready };
      return pushLog(next, next.seats[index].ready ? `Место ${index + 1} готово.` : `Место ${index + 1} не готово.`);
    });
  }

  function startGame() {
    update((prev) => {
      if (prev.phase !== "lobby") return prev;
      const occupied = prev.seats.filter(Boolean);
      if (occupied.length < 2) return pushLog(prev, "Нужно минимум 2 игрока.");
      if (!occupied.every((s) => s.ready)) return pushLog(prev, "Все игроки должны нажать «Готов».");
      return pushLog(
        {
          ...prev,
          phase: "game",
          board: createBoard(),
          pendingBuy: null,
          pendingCasino: null,
          pendingUpgrade: null,
          gameOver: false,
          winnerId: null,
          turnIndex: 0,
          dice: null,
        },
        "Игра началась."
      );
    });
  }

  function movePlayer(next, index, steps) {
    const player = { ...next.seats[index] };
    const oldPos = player.pos;
    const newPos = (oldPos + steps) % BOARD_SIZE;
    if (oldPos + steps >= BOARD_SIZE) player.laps += 1;
    player.pos = newPos;
    next.seats[index] = player;
    return { next, newPos };
  }

  function resolveLanding(next, index, pos) {
    const cell = { ...next.board[pos] };
    const board = [...next.board];
    const player = { ...next.seats[index] };
    const ownerSeat = next.seats.find((s) => s?.clientId === cell.ownerId);

    if (cell.type === "start") {
      player.money += 200;
      next.seats[index] = player;
      return pushLog(next, `${player.name} прошёл старт и получил 200.`);
    }

    if (cell.type === "tax") {
      const tax = 90 + pos * 4;
      player.money -= tax;
      next.seats[index] = player;
      return pushLog(next, `${player.name} заплатил налог ${tax}.`);
    }

    if (cell.type === "chance") {
      const delta = [180, -120, 240, -160, 100, -80][Math.floor(Math.random() * 6)];
      player.money += delta;
      next.seats[index] = player;
      return pushLog(next, delta > 0 ? `${player.name} получил ${delta} из аномалии.` : `${player.name} потерял ${Math.abs(delta)} в аномалии.`);
    }

    if (cell.type === "blackhole") {
      const target = 1 + Math.floor(Math.random() * 38);
      player.pos = target;
      next.seats[index] = player;
      return pushLog(next, `${player.name} попал в чёрную дыру и переместился на другую орбиту.`);
    }

    if (cell.type === "portal") {
      const target = (pos + 10) % BOARD_SIZE;
      player.pos = target;
      next.seats[index] = player;
      return pushLog(next, `${player.name} вошёл в портал и телепортировался.`);
    }

    if (cell.type === "auction") {
      const delta = [150, 0, -90, 220, -60][Math.floor(Math.random() * 5)];
      player.money += delta;
      next.seats[index] = player;
      return pushLog(next, delta >= 0 ? `${player.name} выиграл аукцион.` : `${player.name} потратился на аукционе.`);
    }

    if (cell.type === "police") {
      const fine = 120 + player.laps * 20;
      player.money -= fine;
      next.seats[index] = player;
      return pushLog(next, `${player.name} остановлен космополициией и платит ${fine}.`);
    }

    if (cell.type === "casino") {
      next.pendingCasino = { index: pos, open: true };
      return pushLog(next, `${player.name} попал в лунное казино.`);
    }

    if (cell.type === "civilization") {
      if (cell.ownerId === null) {
        if (player.clientId === next.clientId) {
          next.pendingBuy = { index: pos };
          return pushLog(next, `Можно купить цивилизацию ${cell.name} за ${cell.price}.`);
        }
        return pushLog(next, `${player.name} остановился на свободной цивилизации.`);
      }

      if (cell.ownerId !== player.clientId) {
        const rent = Math.round(cell.rent * (cell.shield ? 0.7 : 1) + cell.level * 35);
        player.money -= rent;
        if (ownerSeat) ownerSeat.money += rent;
        next.seats[index] = player;
        return pushLog(next, `${player.name} заплатил аренду ${rent}.`);
      }

      next.pendingUpgrade = { index: pos };
      next.seats[index] = player;
      return pushLog(next, `Это ваша цивилизация. Можно прокачать её.`);
    }

    if (cell.type === "bonus") {
      player.money += 300;
      next.seats[index] = player;
      return pushLog(next, `${player.name} получил бонус сверхновой: 300.`);
    }

    next.seats[index] = player;
    next.board = board;
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

  function aliveCount(next) {
    return next.seats.filter((s) => s && s.money > 0).length;
  }

  function finalize(next) {
    const alive = next.seats.filter((s) => s && s.money > 0);
    if (alive.length <= 1) {
      next.gameOver = true;
      next.winnerId = alive[0]?.clientId || null;
      return pushLog(next, alive[0] ? `${alive[0].name} победил.` : "Все игроки обанкротились.");
    }
    return next;
  }

  function humanRoll() {
    if (rolling) return;
    setRolling(true);
    update((prev) => {
      if (prev.phase !== "game" || prev.gameOver) return prev;
      const idx = currentSeatIndex(prev);
      const seat = prev.seats[idx];
      if (!seat || seat.clientId !== prev.clientId) return prev;
      if (prev.pendingBuy || prev.pendingCasino?.open || prev.pendingUpgrade) return prev;
      const { a, b } = rollDice();
      const steps = a + b;
      const next = { ...prev, seats: [...prev.seats], board: [...prev.board], dice: { a, b, total: steps }, diceKey: prev.diceKey + 1 };
      const moved = movePlayer(next, idx, steps);
      return finalize(resolveLanding(moved.next, idx, moved.newPos));
    });
    setTimeout(() => setRolling(false), 800);
  }

  function buyCivilization() {
    update((prev) => {
      if (!prev.pendingBuy) return prev;
      const idx = currentSeatIndex(prev);
      const player = { ...prev.seats[idx] };
      if (!player || player.clientId !== prev.clientId) return prev;
      const cell = { ...prev.board[prev.pendingBuy.index] };
      if (player.money < cell.price) return pushLog(prev, "Не хватает денег.");
      const next = { ...prev, seats: [...prev.seats], board: [...prev.board], pendingBuy: null };
      player.money -= cell.price;
      cell.ownerId = player.clientId;
      next.seats[idx] = player;
      next.board[cell.id] = cell;
      return pushLog(next, `${player.name} купил цивилизацию ${cell.name}.`);
    });
  }

  function skipBuy() {
    update((prev) => ({ ...prev, pendingBuy: null }));
  }

  function upgradeCivilization() {
    update((prev) => {
      const idx = currentSeatIndex(prev);
      const player = { ...prev.seats[idx] };
      if (!player || player.clientId !== prev.clientId) return prev;
      const current = prev.board[player.pos];
      if (!current || current.type !== "civilization" || current.ownerId !== player.clientId) return prev;
      const cost = Math.round(current.price * 0.65 + current.level * 120);
      if (player.money < cost) return pushLog(prev, "Не хватает денег на прокачку.");
      const next = { ...prev, seats: [...prev.seats], board: [...prev.board] };
      player.money -= cost;
      const upgraded = { ...current, level: current.level + 1, rent: Math.round(current.rent * 1.35), shield: current.level >= 1 || current.shield };
      next.seats[idx] = player;
      next.board[current.id] = upgraded;
      return pushLog(next, `${player.name} прокачал цивилизацию до уровня ${upgraded.level}.`);
    });
  }

  function playCasino() {
    update((prev) => {
      if (!prev.pendingCasino?.open) return prev;
      const idx = currentSeatIndex(prev);
      const player = { ...prev.seats[idx] };
      if (!player || player.clientId !== prev.clientId) return prev;
      const amount = Math.min(Math.max(20, Math.round(betAmount)), player.money);
      if (amount <= 0) return prev;
      const spin = 1 + Math.floor(Math.random() * 6);
      const win =
        betMode === "чёт"
          ? spin % 2 === 0
          : betMode === "нечёт"
          ? spin % 2 === 1
          : betMode === "низко"
          ? spin <= 3
          : spin >= 4;
      const payout = win ? Math.round(amount * 1.8) : -amount;
      player.money += payout;
      const next = { ...prev, seats: [...prev.seats], pendingCasino: null };
      next.seats[idx] = player;
      return finalize(pushLog(next, win ? `Выигрыш в казино: +${payout}.` : `Проигрыш в казино: -${amount}.`));
    });
  }

  function skipCasino() {
    update((prev) => ({ ...prev, pendingCasino: null }));
  }

  function endTurn() {
    update((prev) => {
      if (prev.phase !== "game" || prev.gameOver) return prev;
      const idx = currentSeatIndex(prev);
      const seat = prev.seats[idx];
      if (!seat || seat.clientId !== prev.clientId) return prev;
      if (prev.pendingBuy || prev.pendingCasino?.open || prev.pendingUpgrade) return prev;
      return finalize(clearTurn({ ...prev, seats: [...prev.seats], board: [...prev.board] }));
    });
  }

  function aiTurn() {
    update((prev) => {
      if (prev.phase !== "game" || prev.gameOver) return prev;
      const idx = currentSeatIndex(prev);
      const seat = prev.seats[idx];
      if (!seat || !String(seat.clientId).startsWith("ai-")) return prev;
      if (prev.pendingBuy || prev.pendingCasino?.open || prev.pendingUpgrade) return prev;
      const { a, b } = rollDice();
      const steps = a + b;
      const next = { ...prev, seats: [...prev.seats], board: [...prev.board], dice: { a, b, total: steps }, diceKey: prev.diceKey + 1 };
      const moved = movePlayer(next, idx, steps);
      let after = resolveLanding(moved.next, idx, moved.newPos);

      if (after.pendingBuy) {
        const cell = after.board[after.pendingBuy.index];
        const ai = { ...after.seats[idx] };
        if (ai.money >= cell.price && Math.random() > 0.35) {
          ai.money -= cell.price;
          after.board[cell.id] = { ...cell, ownerId: ai.clientId };
          after.seats[idx] = ai;
          after.pendingBuy = null;
          after = pushLog(after, `${ai.name} купил ${cell.name}.`);
        } else {
          after.pendingBuy = null;
        }
      }

      if (after.pendingCasino?.open) {
        const ai = { ...after.seats[idx] };
        const amount = Math.min(Math.max(20, Math.round(ai.money * 0.1)), ai.money);
        const spin = 1 + Math.floor(Math.random() * 6);
        const mode = ["высоко", "низко", "чёт", "нечёт"][Math.floor(Math.random() * 4)];
        const win = mode === "чёт" ? spin % 2 === 0 : mode === "нечёт" ? spin % 2 === 1 : mode === "низко" ? spin <= 3 : spin >= 4;
        ai.money += win ? Math.round(amount * 1.8) : -amount;
        after.seats[idx] = ai;
        after.pendingCasino = null;
        after = pushLog(after, win ? `${ai.name} выиграл в казино.` : `${ai.name} проиграл в казино.`);
      }

      return finalize(clearTurn(after));
    });
  }

  function copyInvite() {
    const code = state.roomCode || roomInput.trim().toUpperCase();
    if (!code || typeof window === "undefined") return;
    const url = `${window.location.origin}${window.location.pathname}#${code}`;
    navigator.clipboard?.writeText(url);
    update((prev) => pushLog(prev, "Ссылка приглашения скопирована."));
  }

  function syncFromStorage() {
    if (!state.roomCode) return;
    const saved = parseLocal(state.roomCode);
    if (saved) setState(saved);
    setSyncTick((v) => v + 1);
  }

  function resetAll() {
    setState(initialState());
    if (typeof window !== "undefined") window.location.hash = "";
    setJoined(false);
  }

  const winnerName = useMemo(() => {
    if (!state.winnerId) return "";
    const seat = state.seats.find((s) => s?.clientId === state.winnerId);
    return seat?.name || "Победитель";
  }, [state.winnerId, state.seats]);

  if (!joined && state.phase === "menu") {
    return (
      <div className="min-h-screen bg-[#07101f] text-slate-100 p-4 md:p-6">
        <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="rounded-[30px] border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-xl">
            <div className="text-xs uppercase tracking-[0.35em] text-cyan-300/80">Космо-Монополия</div>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight">Русская монополия в космическом стиле</h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-300">
              Интерфейс теперь сделан как у настольной монополии: поле по периметру, большой центр, понятные кнопки, крупные кубики и нормальная инструкция для друзей.
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 text-sm text-slate-300">
              {DIFFERENCES.map((item, index) => (
                <div key={index} className="rounded-2xl border border-white/10 bg-black/20 p-3">
                  {item}
                </div>
              ))}
            </div>

            <div className="mt-6 rounded-[24px] border border-white/10 bg-black/20 p-4">
              <div className="text-sm font-medium">Как играть с друзьями</div>
              <div className="mt-2 space-y-2 text-sm leading-6 text-slate-300">
                <div>1. Один игрок нажимает «Создать комнату».</div>
                <div>2. Появляется код комнаты и ссылка.</div>
                <div>3. Отправьте их друзьям.</div>
                <div>4. Друзья входят через «Войти по коду».</div>
                <div>5. Все занимают места и нажимают «Готов».</div>
                <div>6. Хозяин запускает игру.</div>
              </div>
              <div className="mt-3 text-xs text-slate-500">
                Для игры с разных устройств нужен сервер синхронизации. Эта версия уже подготовлена под комнаты и интерфейс, а сервер можно подключить следующим шагом.
              </div>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="rounded-[30px] border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-xl">
            <div className="text-lg font-semibold">Создать или войти</div>
            <div className="mt-4 space-y-4">
              <div>
                <div className="text-sm text-slate-300">Ваше имя</div>
                <input value={nameInput} onChange={(e) => setNameInput(e.target.value)} className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 outline-none" placeholder="Игрок" />
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <button onClick={createRoom} className="rounded-2xl bg-cyan-400 px-4 py-3 font-medium text-slate-950 transition hover:bg-cyan-300">Создать комнату</button>
                <button onClick={() => setJoined(true)} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 transition hover:bg-white/10">Войти по коду</button>
              </div>
              <div className="flex gap-2">
                <input value={roomInput} onChange={(e) => setRoomInput(e.target.value.toUpperCase())} className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 outline-none" placeholder="Код комнаты" />
                <button onClick={joinRoom} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 transition hover:bg-white/10">Ок</button>
              </div>
            </div>

            <div className="mt-6 rounded-[24px] border border-white/10 bg-black/20 p-4">
              <div className="text-sm text-slate-300">Что уже есть в игре</div>
              <div className="mt-2 text-sm leading-6 text-slate-300">
                Поле по кругу, цивилизации, казино, аномалии, чёрная дыра, порталы, аукционы, прокачка владений и журнал событий.
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#07101f] text-slate-100 p-4 md:p-6">
      <div className="mx-auto max-w-[1800px] space-y-4">
        <div className="rounded-[30px] border border-white/10 bg-white/5 p-4 shadow-2xl backdrop-blur-xl">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-xs uppercase tracking-[0.35em] text-cyan-300/80">Комната {state.roomCode || "—"}</div>
              <div className="mt-1 text-2xl font-semibold">Космо-Монополия</div>
              <div className="mt-1 text-sm text-slate-400">Монополия-стиль, русские подписи, понятная инструкция и крупное поле.</div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button onClick={copyInvite} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm transition hover:bg-white/10">Скопировать приглашение</button>
              <button onClick={syncFromStorage} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm transition hover:bg-white/10">Обновить комнату</button>
              <button onClick={resetAll} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm transition hover:bg-white/10">Сбросить</button>
            </div>
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
          <div className="rounded-[30px] border border-white/10 bg-white/5 p-4 shadow-2xl backdrop-blur-xl">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-xs uppercase tracking-[0.35em] text-cyan-300/80">Игровое поле</div>
                <h2 className="mt-1 text-2xl font-semibold">Поле в стиле классической монополии</h2>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-2 text-sm text-slate-300">
                {state.gameOver ? `Победил: ${winnerName || "—"}` : myTurn ? "Ваш ход" : `Ход: ${currentSeat?.name || "—"}`}
              </div>
            </div>

            <div className="mt-4 grid aspect-[1.12] w-full grid-cols-11 grid-rows-11 gap-2 rounded-[32px] border border-white/10 bg-[#0b1730] p-3">
              {board.map((cell) => {
                const pos = getCellPosition(cell.id);
                const isCurrent = mySeat?.pos === cell.id;
                const isOwnedByMe = cell.ownerId === state.clientId;
                const isOwned = Boolean(cell.ownerId);
                const styleClass =
                  cell.type === "start"
                    ? "border-emerald-400/30 bg-emerald-400/10"
                    : cell.type === "casino"
                    ? "border-amber-300/30 bg-amber-300/10"
                    : cell.type === "tax"
                    ? "border-rose-400/30 bg-rose-400/10"
                    : cell.type === "chance"
                    ? "border-sky-400/25 bg-sky-400/10"
                    : cell.type === "blackhole"
                    ? "border-violet-400/30 bg-violet-400/10"
                    : cell.type === "portal"
                    ? "border-cyan-400/30 bg-cyan-400/10"
                    : cell.type === "auction"
                    ? "border-fuchsia-300/30 bg-fuchsia-300/10"
                    : cell.type === "police"
                    ? "border-orange-300/30 bg-orange-300/10"
                    : cell.type === "bonus"
                    ? "border-teal-300/30 bg-teal-300/10"
                    : "border-white/10 bg-white/5";

                return (
                  <motion.div
                    key={cell.id}
                    layout
                    whileHover={{ scale: 1.02 }}
                    style={{ gridColumnStart: pos.col, gridRowStart: pos.row }}
                    className={`relative overflow-hidden rounded-2xl border p-2 ${styleClass}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-[10px] text-slate-500">{cell.id + 1}</div>
                        <div className="truncate text-[11px] font-medium leading-tight">{cell.name}</div>
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {cell.type === "civilization"
                          ? "ЦИВ"
                          : cell.type === "casino"
                          ? "КАЗ"
                          : cell.type === "tax"
                          ? "НАЛ"
                          : cell.type === "chance"
                          ? "СОБ"
                          : cell.type === "blackhole"
                          ? "ДЫРА"
                          : cell.type === "portal"
                          ? "ПОРТ"
                          : cell.type === "auction"
                          ? "АУКЦ"
                          : cell.type === "police"
                          ? "ПОЛ"
                          : cell.type === "start"
                          ? "СТ"
                          : "+"}
                      </div>
                    </div>

                    <div className="mt-2 text-[10px] text-slate-400">
                      {cell.type === "civilization" && <div>Цена: {formatMoney(cell.price)}</div>}
                      {cell.type === "civilization" && <div>Аренда: {formatMoney(cell.rent + cell.level * 35)}</div>}
                      {cell.type === "civilization" && cell.level > 0 && <div>Уровень: {cell.level}</div>}
                      {cell.type === "casino" && <div>Лунные ставки</div>}
                      {cell.type === "tax" && <div>Космический налог</div>}
                      {cell.type === "chance" && <div>Карта аномалии</div>}
                      {cell.type === "blackhole" && <div>Телепортирует</div>}
                      {cell.type === "portal" && <div>Прыжок по сектору</div>}
                      {cell.type === "auction" && <div>Аукцион ресурсов</div>}
                      {cell.type === "police" && <div>Штраф</div>}
                      {cell.type === "start" && <div>+200 за круг</div>}
                      {cell.type === "bonus" && <div>Большой бонус</div>}
                    </div>

                    <div className="mt-2 flex flex-wrap gap-1">
                      {cell.occupants.map((seat) => (
                        <BoardMarker key={seat.clientId} label={seat.name.slice(0, 1).toUpperCase()} active={isCurrent && seat.clientId === state.clientId} owner={isOwnedByMe} />
                      ))}
                    </div>

                    {isOwned && (
                      <div className="absolute bottom-2 right-2 rounded-full border border-cyan-300/20 bg-cyan-400/10 px-2 py-1 text-[10px] text-cyan-100">
                        {isOwnedByMe ? "Ваше" : "Чужое"}
                      </div>
                    )}
                  </motion.div>
                );
              })}

              <div className="col-start-3 col-end-10 row-start-3 row-end-10 rounded-[32px] border border-white/10 bg-black/40 p-5 shadow-2xl backdrop-blur-xl">
                <div className="text-xs uppercase tracking-[0.35em] text-cyan-300/80">Центр игры</div>
                <div className="mt-2 text-3xl font-semibold">{state.phase === "lobby" ? "Лобби" : state.gameOver ? "Игра окончена" : "Игровой раунд"}</div>
                <div className="mt-2 text-sm text-slate-300">
                  {state.phase === "lobby"
                    ? "Здесь видно комнату, игроков и кнопку старта."
                    : myTurn
                    ? "Сейчас ваш ход. Бросьте кубики и решайте, что делать дальше."
                    : `Сейчас ходит ${currentSeat?.name || "—"}.`}
                </div>

                <div className="mt-5 grid grid-cols-2 gap-4">
                  <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
                    <div className="text-xs uppercase tracking-[0.3em] text-slate-400">Кубики</div>
                    <div className="mt-4 flex items-center gap-3">
                      <DiceFace value={state.dice?.a || 1} rolling={rolling} />
                      <DiceFace value={state.dice?.b || 1} rolling={rolling} />
                    </div>
                    <div className="mt-3 text-sm text-slate-300">{state.dice ? `${state.dice.a} + ${state.dice.b} = ${state.dice.total}` : "Нажмите «Бросить кубики»."}</div>
                  </div>

                  <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
                    <div className="text-xs uppercase tracking-[0.3em] text-slate-400">Ваш сектор</div>
                    <div className="mt-3 text-lg font-semibold">{mySeat ? currentCell?.name || "—" : "Выберите место"}</div>
                    <div className="mt-2 text-sm text-slate-300">{mySeat ? `Баланс: ${formatMoney(mySeat.money)} · Круги: ${mySeat.laps}` : "Сначала займите место в лобби."}</div>
                    {currentCell?.type === "civilization" && currentCell.ownerId === state.clientId && (
                      <div className="mt-3 text-sm text-cyan-200">Эта цивилизация ваша. Можно прокачать её.</div>
                    )}
                  </div>
                </div>

                <div className="mt-5 rounded-[24px] border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
                  {state.log[0] || ""}
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-[30px] border border-white/10 bg-white/5 p-4 shadow-2xl backdrop-blur-xl">
              <div className="text-xs uppercase tracking-[0.35em] text-cyan-300/80">Управление</div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button onClick={humanRoll} disabled={!myTurn || canBuy || canCasino || !!state.pendingUpgrade || rolling} className="rounded-2xl bg-cyan-400 px-4 py-3 font-medium text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400">
                  Бросить кубики
                </button>
                <button onClick={endTurn} disabled={!myTurn || canBuy || canCasino || !!state.pendingUpgrade} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50">
                  Закончить ход
                </button>
                <button onClick={buyCivilization} disabled={!canBuy} className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 transition hover:bg-emerald-400/20 disabled:cursor-not-allowed disabled:opacity-50">
                  Купить
                </button>
                <button onClick={skipBuy} disabled={!canBuy} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50">
                  Пропустить
                </button>
                <button onClick={upgradeCivilization} disabled={!myTurn || !canUpgrade} className="rounded-2xl border border-fuchsia-300/20 bg-fuchsia-300/10 px-4 py-3 transition hover:bg-fuchsia-300/20 disabled:cursor-not-allowed disabled:opacity-50">
                  Прокачать
                </button>
                <button onClick={copyInvite} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 transition hover:bg-white/10">
                  Ссылка
                </button>
              </div>
              <div className="mt-4 rounded-[24px] border border-white/10 bg-black/20 p-3 text-sm text-slate-300">
                После броска кубиков возможны покупка цивилизации, ставка в казино или прокачка своей клетки.
              </div>
            </div>

            <div className="rounded-[30px] border border-white/10 bg-white/5 p-4 shadow-2xl backdrop-blur-xl">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className="text-xs uppercase tracking-[0.35em] text-amber-200/80">Лунное казино</div>
                  <h3 className="mt-1 text-xl font-semibold">Ставка на кубик</h3>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/20 px-3 py-2 text-xs text-slate-300">
                  {state.pendingCasino?.open ? "Открыто" : "Закрыто"}
                </div>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2">
                {[
                  ["высоко", "Высоко 4–6"],
                  ["низко", "Низко 1–3"],
                  ["чёт", "Чёт"],
                  ["нечёт", "Нечёт"],
                ].map(([mode, label]) => (
                  <button key={mode} onClick={() => setBetMode(mode)} className={`rounded-2xl border px-3 py-3 text-sm transition ${betMode === mode ? "border-cyan-300/40 bg-cyan-400/10" : "border-white/10 bg-white/5 hover:bg-white/10"}`}>
                    {label}
                  </button>
                ))}
              </div>

              <div className="mt-4">
                <div className="mb-2 flex items-center justify-between text-sm text-slate-300">
                  <span>Размер ставки</span>
                  <span>{betAmount} кр.</span>
                </div>
                <input type="range" min="20" max="1000" step="10" value={betAmount} onChange={(e) => setBetAmount(Number(e.target.value))} className="w-full" />
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <button onClick={playCasino} disabled={!state.pendingCasino?.open || !myTurn} className="rounded-2xl bg-amber-300 px-4 py-3 font-medium text-slate-950 transition hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-50">
                  Сделать ставку
                </button>
                <button onClick={skipCasino} disabled={!state.pendingCasino?.open} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50">
                  Выйти
                </button>
              </div>
            </div>

            <div className="rounded-[30px] border border-white/10 bg-white/5 p-4 shadow-2xl backdrop-blur-xl">
              <div className="text-xs uppercase tracking-[0.35em] text-cyan-300/80">Игроки</div>
              <div className="mt-3 space-y-2">
                {state.seats.map((seat, index) =>
                  seat ? (
                    <div key={index} className={`rounded-2xl border p-3 ${currentIndex === index && state.phase === "game" ? "border-cyan-300/40 bg-cyan-400/10" : "border-white/10 bg-black/20"}`}>
                      <div className="flex items-center gap-3">
                        <BoardMarker label={seat.name.slice(0, 1).toUpperCase()} owner={seat.clientId === state.clientId} active={currentIndex === index && state.phase === "game"} />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <div className="truncate font-medium">{seat.name}</div>
                            <div className="text-xs text-slate-400">Место {index + 1}</div>
                          </div>
                          <div className="mt-1 text-xs text-slate-400">{seat.clientId === state.clientId ? "Вы" : String(seat.clientId).startsWith("ai-") ? "ИИ" : "Друг"}</div>
                        </div>
                        <div className="text-sm font-medium">{formatMoney(seat.money || 0)}</div>
                      </div>
                    </div>
                  ) : (
                    <button key={index} onClick={() => claimSeat(index)} className="flex w-full items-center justify-between rounded-xl border border-dashed border-white/10 px-3 py-2 text-left text-sm text-slate-400 transition hover:bg-white/5">
                      <span>Свободное место</span>
                      <span>Занять</span>
                    </button>
                  )
                )}
              </div>

              {state.phase === "lobby" && (
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <button onClick={addAI} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm transition hover:bg-white/10">
                    Добавить ИИ
                  </button>
                  <button onClick={startGame} className="rounded-2xl bg-cyan-400 px-4 py-3 text-sm font-medium text-slate-950 transition hover:bg-cyan-300">
                    Старт игры
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <AnimatePresence>
          {state.pendingBuy && myTurn && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-30 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
              <motion.div initial={{ scale: 0.94, y: 16 }} animate={{ scale: 1, y: 0 }} className="w-full max-w-md rounded-[30px] border border-white/10 bg-[#0b1730] p-5 shadow-2xl">
                <div className="text-xs uppercase tracking-[0.35em] text-cyan-300/80">Покупка цивилизации</div>
                <h3 className="mt-2 text-2xl font-semibold">Купить эту цивилизацию?</h3>
                <p className="mt-2 text-sm text-slate-300">{state.board[state.pendingBuy.index]?.name} стоит {formatMoney(state.board[state.pendingBuy.index]?.price || 0)}.</p>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <button onClick={buyCivilization} className="rounded-2xl bg-cyan-400 px-4 py-3 font-medium text-slate-950 transition hover:bg-cyan-300">
                    Купить
                  </button>
                  <button onClick={skipBuy} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 transition hover:bg-white/10">
                    Пропустить
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {state.pendingCasino?.open && myTurn && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-30 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
              <motion.div initial={{ scale: 0.94, y: 16 }} animate={{ scale: 1, y: 0 }} className="w-full max-w-md rounded-[30px] border border-white/10 bg-[#0b1730] p-5 shadow-2xl">
                <div className="text-xs uppercase tracking-[0.35em] text-amber-200/80">Лунное казино</div>
                <h3 className="mt-2 text-2xl font-semibold">Ставка на кубик</h3>
                <p className="mt-2 text-sm text-slate-300">Выберите режим и нажмите «Сделать ставку».</p>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <button onClick={playCasino} className="rounded-2xl bg-amber-300 px-4 py-3 font-medium text-slate-950 transition hover:bg-amber-200">
                    Сделать ставку
                  </button>
                  <button onClick={skipCasino} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 transition hover:bg-white/10">
                    Выйти
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
