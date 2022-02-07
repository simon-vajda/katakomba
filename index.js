const startButton = document.querySelector("#startButton");
const descButton = document.querySelector("#descriptionButton");
const saveButton = document.querySelector("#saveButton");
const playerInput = document.querySelector("#playerInput");
const treasureInput = document.querySelector("#treasureInput");
const description = document.querySelector("#description");
const settings = document.querySelector("#settings");
const gameArea = document.querySelector("#gameArea");
const loadGameArea = document.querySelector("#loadGameArea");
const loadButton = document.querySelector("#loadGameArea button");

const stats = document.querySelector("#stats");
const canvas = document.querySelector("canvas");
const ctx = canvas.getContext("2d");

const boardColor = "#483d8b";
const tileBackgroundColor = "#413d3a";
const tileForegroundColor = "#ffc107";
const tileBorderColor = "#b3826b";
const highlightColor = "#dae87b";
const playerDefaults = [
  { name: "Piros", color: "red", x: 0, y: 0 },
  { name: "Zöld", color: "green", x: 6, y: 6 },
  { name: "Kék", color: "blue", x: 6, y: 0 },
  { name: "Fekete", color: "black", x: 0, y: 6 },
];

const directions = [];
directions["turn"] = [
  ["up", "right"],
  ["right", "down"],
  ["down", "left"],
  ["left", "up"],
];
directions["straight"] = [
  ["left", "right"],
  ["up", "down"],
  ["left", "right"],
  ["up", "down"],
];
directions["junction"] = [
  ["left", "up", "right"],
  ["up", "right", "down"],
  ["left", "down", "right"],
  ["down", "left", "up"],
];

let playerCount;
let treasureCount;

const pushData = { x: 0, y: 0, dx: 0, dy: 0, xStep: 0, yStep: 0 };

let currentPlayer;
let playerMovingState;
let isGameOver;

let players;
let extraTile;
let tiles;

const randomInt = (min, max) => Math.floor(Math.random() * (max - min) + min);

// --- Inicializalas ---

checkSavedGame();

function init(p, t) {
  playerCount = p;
  treasureCount = t;

  isGameOver = false;
  playerMovingState = false;
  currentPlayer = 0;

  extraTile = {};

  tiles = new Array(7);

  for (let i = 0; i < 7; i++) {
    tiles[i] = new Array(7);

    for (let j = 0; j < 7; j++) {
      tiles[i][j] = {};
    }
  }

  players = new Array(playerCount);
  for (let i = 0; i < playerCount; i++) {
    players[i] = {
      name: playerDefaults[i].name,
      color: playerDefaults[i].color,
      x: playerDefaults[i].x,
      y: playerDefaults[i].y,
      treasures: [],
    };
  }

  placeFixedTiles();
  placeRandomTiles();
  placeTresures();
  draw();
  updatePlayerStats();

  saveButton.disabled = false;
}

function placeFixedTiles() {
  tiles[0][0] = { type: "turn", variant: 1 };
  tiles[2][0] = { type: "junction", variant: 2 };
  tiles[4][0] = { type: "junction", variant: 2 };
  tiles[6][0] = { type: "turn", variant: 2 };
  tiles[0][2] = { type: "junction", variant: 1 };
  tiles[2][2] = { type: "junction", variant: 1 };
  tiles[4][2] = { type: "junction", variant: 2 };
  tiles[6][2] = { type: "junction", variant: 3 };
  tiles[0][4] = { type: "junction", variant: 1 };
  tiles[2][4] = { type: "junction", variant: 0 };
  tiles[4][4] = { type: "junction", variant: 3 };
  tiles[6][4] = { type: "junction", variant: 3 };
  tiles[0][6] = { type: "turn", variant: 0 };
  tiles[2][6] = { type: "junction", variant: 0 };
  tiles[4][6] = { type: "junction", variant: 0 };
  tiles[6][6] = { type: "turn", variant: 3 };
}

function placeRandomTiles() {
  const remaining = [];
  remaining["turn"] = 15;
  remaining["straight"] = 13;
  remaining["junction"] = 6;

  for (let i = 0; i < 7; i++) {
    for (let j = 0; j < 7; j++) {
      if (i % 2 == 1 || j % 2 == 1) {
        let type;
        do {
          type = randomType();
        } while (remaining[type] == 0);
        remaining[type]--;

        const variant = randomInt(0, 4);

        tiles[i][j] = {
          type: type,
          variant: variant,
        };
      }
    }
  }

  extraTile = {
    x: 0,
    y: 0,
    type: Object.keys(remaining).find((k) => remaining[k] > 0),
    variant: randomInt(0, 4),
  };
}

function randomType() {
  const r = randomInt(0, 3);

  switch (r) {
    case 0:
      return "straight";
    case 1:
      return "turn";
    case 2:
      return "junction";
  }
}

function placeTresures() {
  const isCorner = (a, b) =>
    (a == 0 && b == 0) ||
    (a == 0 && b == 6) ||
    (a == 6 && b == 0) ||
    (a == 6 && b == 6);

  const values = [];
  for (let i = 0; i < playerCount * treasureCount; i++) {
    values.push(i + 1);
  }

  // Random sorrend
  values.sort(() => (Math.random() > 0.5 ? 1 : -1));

  values.forEach((v) => {
    let x;
    let y;

    do {
      x = randomInt(0, 7);
      y = randomInt(0, 7);
    } while (tiles[x][y].treasure || isCorner(x, y));

    tiles[x][y].treasure = v;
  });

  for (let i = 0; i < playerCount; i++) {
    for (let j = 0; j < treasureCount; j++) {
      players[i].treasures.push(values[i * treasureCount + j]);
    }
  }
}

// --- Kirajzolas ---

function draw() {
  if (isGameOver) {
    onGameOver();
    return;
  }

  drawTable();
  drawTiles();
  drawPlayers();

  if (pushData.xStep != 0 || pushData.yStep != 0) {
    if (pushData.dx != 0) {
      pushData.dx += pushData.xStep;
    } else {
      pushData.xStep = 0;
      pushData.dx = 0;
    }

    if (pushData.dy != 0) {
      pushData.dy += pushData.yStep;
    } else {
      pushData.yStep = 0;
      pushData.dy = 0;
    }
  }

  window.requestAnimationFrame(draw);
}

function drawTable() {
  ctx.fillStyle = boardColor;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  drawArrow(200, 60, "down");
  drawArrow(360, 60, "down");
  drawArrow(520, 60, "down");
  drawArrow(200, 660, "up");
  drawArrow(360, 660, "up");
  drawArrow(520, 660, "up");
  drawArrow(60, 200, "right");
  drawArrow(60, 360, "right");
  drawArrow(60, 520, "right");
  drawArrow(660, 200, "left");
  drawArrow(660, 360, "left");
  drawArrow(660, 520, "left");
}

function drawArrow(x, y, d) {
  ctx.fillStyle = "white";
  ctx.beginPath();
  ctx.moveTo(x, y);

  switch (d) {
    case "up":
      ctx.lineTo(x + 20, y + 40);
      ctx.lineTo(x, y + 35);
      ctx.lineTo(x - 20, y + 40);
      ctx.lineTo(x, y);
      break;
    case "down":
      ctx.lineTo(x + 20, y - 40);
      ctx.lineTo(x, y - 35);
      ctx.lineTo(x - 20, y - 40);
      ctx.lineTo(x, y);
      break;
    case "left":
      ctx.lineTo(x + 40, y - 20);
      ctx.lineTo(x + 35, y);
      ctx.lineTo(x + 40, y + 20);
      ctx.lineTo(x, y);
      break;
    case "right":
      ctx.lineTo(x - 40, y - 20);
      ctx.lineTo(x - 35, y);
      ctx.lineTo(x - 40, y + 20);
      ctx.lineTo(x, y);
      break;
  }

  ctx.closePath();
  ctx.fill();
}

function drawTileBackround(x, y) {
  ctx.fillStyle = tileBorderColor;
  ctx.fillRect(x, y, 80, 80);
  ctx.fillStyle = tileBackgroundColor;
  ctx.fillRect(x + 2, y + 2, 76, 76);
}

function drawTiles() {
  ctx.font = "bold 15px sans-serif";

  for (let i = 0; i < 7; i++) {
    for (let j = 0; j < 7; j++) {
      let x0 = 80;
      let y0 = 80;

      if (pushData.dx && j == pushData.x) x0 += pushData.dx;

      if (pushData.dy && i == pushData.y) y0 += pushData.dy;

      switch (tiles[i][j].type) {
        case "junction":
          drawJunction(x0 + i * 80, y0 + j * 80, tiles[i][j]);
          break;
        case "straight":
          drawStraight(x0 + i * 80, y0 + j * 80, tiles[i][j]);
          break;
        case "turn":
          drawTurn(x0 + i * 80, y0 + j * 80, tiles[i][j]);
          break;
      }

      if (tiles[i][j].treasure) {
        ctx.fillStyle = "black";
        ctx.fillText(tiles[i][j].treasure, x0 + 35 + i * 80, y0 + 45 + j * 80);
      }
    }
  }

  switch (extraTile.type) {
    case "junction":
      drawJunction(
        extraTile.x + pushData.dx,
        extraTile.y + pushData.dy,
        extraTile
      );
      break;
    case "straight":
      drawStraight(
        extraTile.x + pushData.dx,
        extraTile.y + pushData.dy,
        extraTile
      );
      break;
    case "turn":
      drawTurn(extraTile.x + pushData.dx, extraTile.y + pushData.dy, extraTile);
      break;
  }

  if (extraTile.treasure) {
    ctx.fillStyle = "black";
    ctx.fillText(
      extraTile.treasure,
      extraTile.x + pushData.dx + 35,
      extraTile.y + pushData.dy + 45
    );
  }
}

function drawTurn(x, y, t) {
  drawTileBackround(x, y);
  ctx.beginPath();

  switch (t.variant) {
    case 0:
      ctx.moveTo(x + 20, y + 2);
      ctx.lineTo(x + 60, y + 2);
      ctx.lineTo(x + 60, y + 20);
      ctx.lineTo(x + 78, y + 20);
      ctx.lineTo(x + 78, y + 60);
      ctx.lineTo(x + 40, y + 60);
      ctx.lineTo(x + 20, y + 40);
      ctx.lineTo(x + 20, y + 2);
      break;
    case 1:
      ctx.moveTo(x + 78, y + 20);
      ctx.lineTo(x + 78, y + 60);
      ctx.lineTo(x + 60, y + 60);
      ctx.lineTo(x + 60, y + 78);
      ctx.lineTo(x + 20, y + 78);
      ctx.lineTo(x + 20, y + 40);
      ctx.lineTo(x + 40, y + 20);
      ctx.lineTo(x + 78, y + 20);
      break;
    case 2:
      ctx.moveTo(x + 60, y + 78);
      ctx.lineTo(x + 20, y + 78);
      ctx.lineTo(x + 20, y + 60);
      ctx.lineTo(x + 2, y + 60);
      ctx.lineTo(x + 2, y + 20);
      ctx.lineTo(x + 40, y + 20);
      ctx.lineTo(x + 60, y + 40);
      ctx.lineTo(x + 60, y + 78);
      break;
    case 3:
      ctx.moveTo(x + 2, y + 60);
      ctx.lineTo(x + 2, y + 20);
      ctx.lineTo(x + 20, y + 20);
      ctx.lineTo(x + 20, y + 2);
      ctx.lineTo(x + 60, y + 2);
      ctx.lineTo(x + 60, y + 40);
      ctx.lineTo(x + 40, y + 60);
      ctx.lineTo(x + 2, y + 60);
      break;
  }

  ctx.closePath();

  ctx.fillStyle = t.highlighted ? highlightColor : tileForegroundColor;
  ctx.fill();
}

function drawStraight(x, y, t) {
  drawTileBackround(x, y);
  ctx.fillStyle = t.highlighted ? highlightColor : tileForegroundColor;
  let variant = t.variant % 2;

  if (variant == 0) ctx.fillRect(x + 2, y + 20, 76, 40);
  else ctx.fillRect(x + 20, y + 2, 40, 76);
}

function drawJunction(x, y, t) {
  drawTileBackround(x, y);
  ctx.fillStyle = t.highlighted ? highlightColor : tileForegroundColor;

  switch (t.variant) {
    case 0:
      ctx.fillRect(x + 2, y + 20, 76, 40);
      ctx.fillRect(x + 20, y + 2, 40, 18);
      break;
    case 1:
      ctx.fillRect(x + 20, y + 2, 40, 76);
      ctx.fillRect(x + 60, y + 20, 18, 40);
      break;
    case 2:
      ctx.fillRect(x + 2, y + 20, 76, 40);
      ctx.fillRect(x + 20, y + 60, 40, 18);
      break;
    case 3:
      ctx.fillRect(x + 20, y + 2, 40, 76);
      ctx.fillRect(x + 2, y + 20, 18, 40);
      break;
  }
}

function drawPlayers() {
  players.forEach((p) => {
    let x0 = 120;
    let y0 = 120;

    if (pushData.dx && p.y == pushData.x) x0 += pushData.dx;
    if (pushData.dy && p.x == pushData.y) y0 += pushData.dy;

    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(x0 + p.x * 80, y0 + p.y * 80, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.closePath();
  });
}

function updatePlayerStats() {
  stats.innerHTML = "";
  for (let i = 0; i < playerCount; i++) {
    const info = document.createElement("div");
    const nextTreasure =
      players[i].treasures.length > 0
        ? players[i].treasures[0]
        : "kiindulási pont";
    const found = treasureCount - players[i].treasures.length;
    info.innerHTML = `${players[i].name} játékos | Következő kincs: ${nextTreasure} | ${found}/${treasureCount} megtalálva`;

    if (currentPlayer === i) info.classList.add("current");

    stats.appendChild(info);
  }
}

// --- Esemenyek ---

canvas.onmousemove = function (e) {
  if (isGameOver) return;
  if (pushData.dx || pushData.dy) return;

  const rect = this.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  const ind = getIndexes(x, y);

  if (0 <= getArrowIndex(x, y)) {
    extraTile.x = (ind.x + 1) * 80;
    extraTile.y = (ind.y + 1) * 80;
  }
};

canvas.addEventListener("contextmenu", function (e) {
  e.preventDefault();
  if (isGameOver) return;
  if (pushData.dx || pushData.dy) return;

  const rect = this.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;

  if (
    extraTile.x <= x &&
    extraTile.x + 80 >= x &&
    extraTile.y <= y &&
    extraTile.y + 80 >= y
  ) {
    extraTile.variant = (extraTile.variant + 1) % 4;
  }
});

canvas.addEventListener("click", function (e) {
  if (isGameOver) {
    restart();
    return;
  }

  const rect = this.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;

  if (playerMovingState) {
    let ind = getIndexes(x, y);
    const p = players[currentPlayer];

    if (ind.x < 0 || ind.y < 0 || ind.x > 6 || ind.y > 6) return;

    if (tiles[ind.x][ind.y].highlighted) {
      p.x = ind.x;
      p.y = ind.y;

      if (tiles[ind.x][ind.y].treasure == p.treasures[0]) {
        p.treasures.shift();
      }

      for (let col of tiles) {
        for (let t of col) {
          t.highlighted = false;
        }
      }

      if (
        p.treasures.length == 0 &&
        p.x == playerDefaults[currentPlayer].x &&
        p.y == playerDefaults[currentPlayer].y
      ) {
        isGameOver = true;
        saveButton.disabled = true;
        return;
      }

      playerMovingState = false;
      currentPlayer = currentPlayer == playerCount - 1 ? 0 : currentPlayer + 1;
      updatePlayerStats();
    }
  } else {
    if (
      extraTile.x <= x &&
      extraTile.x + 80 >= x &&
      extraTile.y <= y &&
      extraTile.y + 80 >= y &&
      getArrowIndex(x, y) != extraTile.prev
    ) {
      push(x, y);
    }
  }
});

function getIndexes(x, y) {
  const i = Math.floor(x / 80) - 1;
  const j = Math.floor(y / 80) - 1;
  const v = 0 <= i && i <= 6 && 0 <= j && j <= 6;
  return { x: i, y: j, isValid: v };
}

function getArrowIndex(x, y) {
  const ind = getIndexes(x, y);

  if (ind.x == 1 && ind.y == -1) return 0;
  if (ind.x == 3 && ind.y == -1) return 1;
  if (ind.x == 5 && ind.y == -1) return 2;
  if (ind.x == 7 && ind.y == 1) return 3;
  if (ind.x == 7 && ind.y == 3) return 4;
  if (ind.x == 7 && ind.y == 5) return 5;
  if (ind.x == 5 && ind.y == 7) return 6;
  if (ind.x == 3 && ind.y == 7) return 7;
  if (ind.x == 1 && ind.y == 7) return 8;
  if (ind.x == -1 && ind.y == 5) return 9;
  if (ind.x == -1 && ind.y == 3) return 10;
  if (ind.x == -1 && ind.y == 1) return 11;

  return -1;
}

function push(x, y) {
  const arrowIndex = getArrowIndex(x, y);
  const ind = getIndexes(x, y);

  if (0 <= arrowIndex && arrowIndex <= 2) {
    tiles[ind.x].unshift(extraTile);
    delete tiles[ind.x][0].x;
    delete tiles[ind.x][0].y;
    delete tiles[ind.x][0].prev;

    extraTile = tiles[ind.x][7];
    extraTile.x = arrowIndex * 160 + 160;
    extraTile.y = 640;
    extraTile.prev = 8 - arrowIndex;

    players
      .filter((p) => p.x == ind.x)
      .forEach((p) => (p.y = p.y == 6 ? 0 : p.y + 1));
    tiles[ind.x].pop();

    pushData.y = ind.x;
    pushData.dy = -80;
    pushData.yStep = 2;
  } else if (3 <= arrowIndex && arrowIndex <= 5) {
    horizontalPush(ind.y, false);
    delete tiles[6][ind.y].x;
    delete tiles[6][ind.y].y;
    delete tiles[6][ind.y].prev;

    extraTile.x = 0;
    extraTile.y = 160 + (arrowIndex - 3) * 160;
    extraTile.prev = 14 - arrowIndex;

    players
      .filter((p) => p.y == ind.y)
      .forEach((p) => (p.x = p.x == 0 ? 6 : p.x - 1));

    pushData.x = ind.y;
    pushData.dx = 80;
    pushData.xStep = -2;
  } else if (6 <= arrowIndex && arrowIndex <= 8) {
    tiles[ind.x].push(extraTile);
    delete tiles[ind.x][7].x;
    delete tiles[ind.x][7].y;
    delete tiles[ind.x][7].prev;

    extraTile = tiles[ind.x][0];
    extraTile.x = (8 - arrowIndex) * 160 + 160;
    extraTile.y = 0;
    extraTile.prev = 8 - arrowIndex;

    players
      .filter((p) => p.x == ind.x)
      .forEach((p) => (p.y = p.y == 0 ? 6 : p.y - 1));
    tiles[ind.x].shift();

    pushData.y = ind.x;
    pushData.dy = 80;
    pushData.yStep = -2;
  } else if (9 <= arrowIndex && arrowIndex <= 11) {
    horizontalPush(ind.y, true);
    delete tiles[0][ind.y].x;
    delete tiles[0][ind.y].y;
    delete tiles[0][ind.y].prev;

    extraTile.x = 640;
    extraTile.y = 160 + (2 - (arrowIndex - 9)) * 160;
    extraTile.prev = 14 - arrowIndex;

    players
      .filter((p) => p.y == ind.y)
      .forEach((p) => (p.x = p.x == 6 ? 0 : p.x + 1));

    pushData.x = ind.y;
    pushData.dx = -80;
    pushData.xStep = 2;
  }

  playerMovingState = true;
  highlightNeighbors(players[currentPlayer].x, players[currentPlayer].y);
}

function horizontalPush(row, dir) {
  if (dir) {
    const last = tiles[6][row];

    for (let i = 5; i >= 0; i--) {
      tiles[i + 1][row] = tiles[i][row];
    }

    tiles[0][row] = extraTile;
    extraTile = last;
  } else {
    const first = tiles[0][row];

    for (let i = 1; i <= 6; i++) {
      tiles[i - 1][row] = tiles[i][row];
    }

    tiles[6][row] = extraTile;
    extraTile = first;
  }
}

function highlightNeighbors(x, y, from) {
  if (x < 0 || x > 6 || y < 0 || y > 6) return;

  const t = tiles[x][y];
  if (t.highlighted) return;

  if (from && !directions[t.type][t.variant].find((d) => d == from)) return;

  t.highlighted = true;
  directions[t.type][t.variant].forEach((d) => {
    switch (d) {
      case "up":
        highlightNeighbors(x, y - 1, "down");
        break;
      case "down":
        highlightNeighbors(x, y + 1, "up");
        break;
      case "left":
        highlightNeighbors(x - 1, y, "right");
        break;
      case "right":
        highlightNeighbors(x + 1, y, "left");
        break;
    }
  });
}

function onGameOver() {
  ctx.fillStyle = boardColor;
  ctx.fillRect(0, 0, 720, 720);
  ctx.fillStyle = "white";
  ctx.font = "bold 36px sans-serif";
  ctx.fillText(players[currentPlayer].name + " nyert!", 250, 360);
  ctx.font = "bold 30px sans-serif";
  ctx.fillText("Kattints az újrakezdéshez", 165, 420);
}

function restart() {
  checkSavedGame();
  gameArea.hidden = true;
  settings.hidden = false;
}

// --- Mentes / betoltes ---

saveButton.addEventListener("click", (e) => {
  localStorage.setItem(
    "catacomb-game",
    JSON.stringify({
      date: new Date().toLocaleString(),
      playerCount: playerCount,
      treasureCount: treasureCount,
      currentPlayer: currentPlayer,
      playerMovingState: playerMovingState,
      isGameOver: isGameOver,
      players: players,
      tiles: tiles,
      extraTile: extraTile,
    })
  );
});

function checkSavedGame() {
  const data = JSON.parse(localStorage.getItem("catacomb-game"));
  loadGameArea.hidden = data ? false : true;
  loadButton.innerHTML = data ? data.date : "";
}

loadButton.addEventListener("click", (e) => loadGame());

function loadGame() {
  const data = JSON.parse(localStorage.getItem("catacomb-game"));
  if (data) {
    playerCount = data.playerCount;
    treasureCount = data.treasureCount;
    currentPlayer = data.currentPlayer;
    playerMovingState = data.playerMovingState;
    isGameOver = data.isGameOver;
    players = data.players;
    tiles = data.tiles;
    extraTile = data.extraTile;

    settings.hidden = true;
    description.hidden = true;
    gameArea.hidden = false;

    draw();
    updatePlayerStats();

    saveButton.disabled = false;
  }
}

// --- Kezdokepernyo ---

descButton.addEventListener("click", (e) => {
  description.hidden = !description.hidden;
});

startButton.addEventListener("click", (e) => {
  let p = playerInput.value;
  let t = treasureInput.value;
  let error =
    playerInput.classList.contains("is-invalid") ||
    treasureInput.classList.contains("is-invalid");

  if (!error) {
    settings.hidden = true;
    description.hidden = true;
    gameArea.hidden = false;
    init(p, t);
  }
});

playerInput.addEventListener("input", (e) => {
  let p = playerInput.value;
  if (p < 1 || p > 4) {
    playerInput.classList.add("is-invalid");
  } else {
    playerInput.classList.remove("is-invalid");
    treasureInput.max = 24 / p;

    checkTreasureInput();
  }
});

treasureInput.addEventListener("input", checkTreasureInput);

function checkTreasureInput() {
  let t = treasureInput.value;
  let max = parseInt(treasureInput.max);
  if (t < 1 || max < t) {
    treasureInput.classList.add("is-invalid");
  } else {
    treasureInput.classList.remove("is-invalid");
  }
}
