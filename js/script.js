const canvas = document.getElementById("pongCanvas");
const ctx = canvas.getContext("2d");

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  if (firePaddle) firePaddle.x = canvas.width - 40 - paddleWidth;
}
window.addEventListener("resize", resizeCanvas);

const paddleWidth = window.innerWidth > 768 ? 20 : 15;
const paddleHeight = window.innerHeight > 500 ? 120 : 90;
let iceScore = 0;
let fireScore = 0;
let gameMode = null;
let gameStarted = false;
let animationFrameId = null; // للاحتفاظ بمعرف الحلقة لإلغائها عند الحاجة

// إضافة متغيرات targetY للمضارب لضمان انسيابية ونعومة الحركة (Easing)
const icePaddle = {
  x: 40,
  y: 0,
  targetY: 0, // المكان الذي يريد اللمس/الماوس الوصول إليه
  width: paddleWidth,
  height: paddleHeight,
  color: "#00e5ff",
};

const firePaddle = {
  x: 0,
  y: 0,
  targetY: 0, // المكان المستهدف للاعب الثاني أو الذكاء الاصطناعي
  width: paddleWidth,
  height: paddleHeight,
  color: "#ff3d00",
};

const ball = {
  x: 0,
  y: 0,
  radius: 10,
  color: "#ffffff",
  vx: 7,
  vy: 7,
  speed: 8,
};

// تهيئة الأماكن
function initPositions() {
  icePaddle.y = window.innerHeight / 2 - paddleHeight / 2;
  icePaddle.targetY = icePaddle.y;

  firePaddle.x = window.innerWidth - 40 - paddleWidth;
  firePaddle.y = window.innerHeight / 2 - paddleHeight / 2;
  firePaddle.targetY = firePaddle.y;

  ball.x = window.innerWidth / 2;
  ball.y = window.innerHeight / 2;
}

// --- أنظمة التحكم الذكية والناعمة ---

// الماوس (الكمبيوتر)
window.addEventListener("mousemove", (event) => {
  if (!gameStarted) return;
  // بدلاً من نقل المضرب فوراً، نحدد له الهدف فقط
  icePaddle.targetY = event.clientY - icePaddle.height / 2;
});

// الكيبورد (اللاعب الثاني على الكمبيوتر)
const keys = { ArrowUp: false, ArrowDown: false };
window.addEventListener("keydown", (e) => {
  if (e.key in keys) keys[e.key] = true;
});
window.addEventListener("keyup", (e) => {
  if (e.key in keys) keys[e.key] = false;
});

// اللمس المتعدد للموبايل (Multi-Touch) مع معالجة وتنعيم فائق
function handleTouch(event) {
  if (!gameStarted) return;
  event.preventDefault();

  for (let i = 0; i < event.touches.length; i++) {
    let touch = event.touches[i];

    if (touch.clientX < canvas.width / 2) {
      icePaddle.targetY = touch.clientY - icePaddle.height / 2;
    } else if (gameMode === "2P" && touch.clientX >= canvas.width / 2) {
      firePaddle.targetY = touch.clientY - firePaddle.height / 2;
    }
  }
}
canvas.addEventListener("touchstart", handleTouch, { passive: false });
canvas.addEventListener("touchmove", handleTouch, { passive: false });

// --- منطق الفيزياء والتحديث الفريمي ---

function collision(b, p) {
  return (
    b.x + b.radius > p.x &&
    b.x - b.radius < p.x + p.width &&
    b.y + b.radius > p.y &&
    b.y - b.radius < p.y + p.height
  );
}

function resetBall() {
  ball.x = canvas.width / 2;
  ball.y = canvas.height / 2;
  ball.speed = window.innerWidth > 768 ? 11 : 8;
  ball.vx = -ball.vx;
  ball.vy = ball.speed * 0.6 * (Math.random() > 0.5 ? 1 : -1);
}

function update() {
  // حركة الكرة
  ball.x += ball.vx;
  ball.y += ball.vy;

  // --- [سر النعومة والسلاسة الكبيرة للأصابع] ---
  // المضرب يتحرك الآن تدريجياً وبنعومة تامة نحو الـ targetY بنسبة 25% في كل إطار (Linear Interpolation)
  let easeFactor = 0.25;
  icePaddle.y += (icePaddle.targetY - icePaddle.y) * easeFactor;

  // حركة مضرب النار
  if (gameMode === "1P") {
    // الذكاء الاصطناعي يلاحق الكرة
    let firePaddleCenter = firePaddle.y + firePaddle.height / 2;
    let aiLevel = 0.07;
    firePaddle.y += (ball.y - firePaddleCenter) * aiLevel;
  } else if (gameMode === "2P") {
    // إذا كانا لاعبين (بالكيبورد أو اللمس)
    if (canvas.width > 768) {
      // للكمبيوتر عبر الأسهم
      if (keys.ArrowUp) firePaddle.targetY -= 14;
      if (keys.ArrowDown) firePaddle.targetY += 14;
    }
    // تطبيق النعومة والانسياب لمضرب النار أيضاً
    firePaddle.y += (firePaddle.targetY - firePaddle.y) * easeFactor;
  }

  // قفل حواف الشاشة للمضارب
  if (firePaddle.y < 0) {
    firePaddle.y = 0;
    firePaddle.targetY = 0;
  }
  if (firePaddle.y > canvas.height - firePaddle.height) {
    firePaddle.y = canvas.height - firePaddle.height;
    firePaddle.targetY = canvas.height - firePaddle.height;
  }
  if (icePaddle.y < 0) {
    icePaddle.y = 0;
    icePaddle.targetY = 0;
  }
  if (icePaddle.y > canvas.height - icePaddle.height) {
    icePaddle.y = canvas.height - icePaddle.height;
    icePaddle.targetY = canvas.height - icePaddle.height;
  }

  // ارتداد الكرة من الحوائط الرأسية
  if (ball.y - ball.radius < 0 || ball.y + ball.radius > canvas.height) {
    ball.vy = -ball.vy;
  }

  let paddle = ball.x < canvas.width / 2 ? icePaddle : firePaddle;

  if (collision(ball, paddle)) {
    let collidePoint =
      (ball.y - (paddle.y + paddle.height / 2)) / (paddle.height / 2);
    let angleRad = collidePoint * (Math.PI / 4);
    let direction = ball.x < canvas.width / 2 ? 1 : -1;

    ball.vx = direction * ball.speed * Math.cos(angleRad);
    ball.vy = ball.speed * Math.sin(angleRad);
    ball.speed += 0.5;
  }

  if (ball.x - ball.radius < 0) {
    fireScore++;
    resetBall();
  } else if (ball.x + ball.radius > canvas.width) {
    iceScore++;
    resetBall();
  }
}

// --- الرسومات والوهج ---

function drawRect(x, y, w, h, color, glowColor = null) {
  if (glowColor) {
    ctx.shadowColor = glowColor;
    ctx.shadowBlur = 20;
  }
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
  ctx.shadowBlur = 0;
}

function drawCircle(x, y, r, color, glowColor = null) {
  if (glowColor) {
    ctx.shadowColor = glowColor;
    ctx.shadowBlur = 25;
  }
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2, false);
  ctx.closePath();
  ctx.fill();
  ctx.shadowBlur = 0;
}

function drawNet() {
  ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
  ctx.lineWidth = 2;
  ctx.setLineDash([10, 15]);
  ctx.beginPath();
  ctx.moveTo(canvas.width / 2, 0);
  ctx.lineTo(canvas.width / 2, canvas.height);
  ctx.stroke();
  ctx.setLineDash([]);
}

function drawText(text, x, y, color, glowColor) {
  ctx.shadowColor = glowColor;
  ctx.shadowBlur = 15;
  ctx.fillStyle = color;
  let fontSize = canvas.width > 768 ? "60px" : "40px";
  ctx.font = `bold ${fontSize} 'Courier New', monospace`;
  ctx.textAlign = "center";
  ctx.fillText(text, x, y);
  ctx.shadowBlur = 0;
}

function render() {
  drawRect(0, 0, canvas.width, canvas.height, "#050505");
  drawNet();

  let textY = canvas.width > 768 ? 80 : 50;
  drawText(iceScore, canvas.width / 4, textY, "#00e5ff", "#00e5ff");
  drawText(fireScore, (3 * canvas.width) / 4, textY, "#ff3d00", "#ff3d00");

  drawRect(
    icePaddle.x,
    icePaddle.y,
    icePaddle.width,
    icePaddle.height,
    icePaddle.color,
    icePaddle.color,
  );
  drawRect(
    firePaddle.x,
    firePaddle.y,
    firePaddle.width,
    firePaddle.height,
    firePaddle.color,
    firePaddle.color,
  );

  let ballGlow = ball.vx > 0 ? "#00e5ff" : "#ff3d00";
  drawCircle(ball.x, ball.y, ball.radius, ball.color, ballGlow);
}

function gameLoop() {
  if (!gameStarted) return;
  update();
  render();
  animationFrameId = requestAnimationFrame(gameLoop);
}

// --- ربط وإدارة القوائم والتحكم الكامل ---

function startGame(mode) {
  gameMode = mode;
  gameStarted = true;

  // إخفاء القائمة الرئيسية وإظهار زر القائمة العلوي
  document.getElementById("startMenu").style.display = "none";
  document.getElementById("btnMenu").style.display = "block";

  resizeCanvas();
  initPositions();
  resetBall();
  gameLoop();
}

// دالة العودة للقائمة وتصفير اللعبة
function returnToMenu() {
  gameStarted = false;
  cancelAnimationFrame(animationFrameId); // إيقاف حلقة الأنيميشن فوراً لتوفير المعالج

  // تصفير النقاط
  iceScore = 0;
  fireScore = 0;

  // إدارة ظهور عناصر الواجهة
  document.getElementById("startMenu").style.display = "flex";
  document.getElementById("btnMenu").style.display = "none";

  // مسح الكانفاس لتنظيف الشاشة خلف القائمة
  ctx.clearRect(0, 0, canvas.width, canvas.height);
}

// تسجيل المستمعات للأزرار
document
  .getElementById("btn1P")
  .addEventListener("click", () => startGame("1P"));
document
  .getElementById("btn2P")
  .addEventListener("click", () => startGame("2P"));
document.getElementById("btnMenu").addEventListener("click", returnToMenu);
document.getElementById("btnMenu").addEventListener("touchstart", (e) => {
  e.stopPropagation(); // منع تداخل اللمس مع الكانفاس في الخلفية
  returnToMenu();
});

// إعداد أولي عند فتح الصفحة لأول مرة
resizeCanvas();
initPositions();
