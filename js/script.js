// 1. إعداد الكانفاس والـ Context ثنائي الأبعاد
const canvas = document.getElementById("pongCanvas");
const ctx = canvas.getContext("2d");

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// 2. إعدادات اللعبة والنقاط
const paddleWidth = 20;
const paddleHeight = 120;
let iceScore = 0;
let fireScore = 0;

// مضرب الثلج (اللاعب الأيسر - يتحكم به المستخدم عبر الماوس)
const icePaddle = {
  x: 40,
  y: canvas.height / 2 - paddleHeight / 2,
  width: paddleWidth,
  height: paddleHeight,
  color: "#00e5ff", // أزرق نيون
};

// مضرب النار (اللاعب الأيمن - يتحكم به الذكاء الاصطناعي)
const firePaddle = {
  x: canvas.width - 40 - paddleWidth,
  y: canvas.height / 2 - paddleHeight / 2,
  width: paddleWidth,
  height: paddleHeight,
  color: "#ff3d00", // أحمر ناري نيون
};

// الكرة وتفاصيل حركتها وسرعتها البدائية
const ball = {
  x: canvas.width / 2,
  y: canvas.height / 2,
  radius: 12,
  color: "#ffffff", // قلب الكرة أبيض لامتصاص الوهج بشكل جمالي
  vx: 7,
  vy: 7,
  speed: 10,
};

// 3. التحكم واستقبال المدخلات (تحريك المضرب الأيسر بالماوس)
window.addEventListener("mousemove", (event) => {
  icePaddle.y = event.clientY - icePaddle.height / 2;
});

// 4. دالة التحقق من حدوث تصادم (Bounding Box Collision)
function collision(b, p) {
  return (
    b.x + b.radius > p.x &&
    b.x - b.radius < p.x + p.width &&
    b.y + b.radius > p.y &&
    b.y - b.radius < p.y + p.height
  );
}

// 5. دالة إعادة تعيين الكرة عند تسجيل هدف
function resetBall() {
  ball.x = canvas.width / 2;
  ball.y = canvas.height / 2;
  ball.speed = 10; // إعادة السرعة للقيمة الأصلية لتدريج الصعوبة مجدداً
  ball.vx = -ball.vx; // إرسال الكرة للاعب الذي استقبل الهدف
  ball.vy = 7 * (Math.random() > 0.5 ? 1 : -1); // اتجاه رأسي عشوائي لعدم التكرار
}

// 6. دالات الرسم المتقدمة مع تفعيل تأثير التوهج الضوئي (Neon Glow)
function drawRect(x, y, w, h, color, glowColor = null) {
  if (glowColor) {
    ctx.shadowColor = glowColor;
    ctx.shadowBlur = 25; // قوة انتشار التوهج
  } else {
    ctx.shadowBlur = 0;
  }
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
  ctx.shadowBlur = 0; // إعادة التعيين لحماية الأداء
}

function drawCircle(x, y, r, color, glowColor = null) {
  if (glowColor) {
    ctx.shadowColor = glowColor;
    ctx.shadowBlur = 30;
  }
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2, false);
  ctx.closePath();
  ctx.fill();
  ctx.shadowBlur = 0;
}

function drawNet() {
  ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
  ctx.lineWidth = 2;
  ctx.setLineDash([10, 15]); // رسم خط متقطع في منتصف الملعب
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
  ctx.font = "bold 60px 'Courier New', monospace";
  ctx.textAlign = "center";
  ctx.fillText(text, x, y);
  ctx.shadowBlur = 0;
}

// 7. دالة تحديث الحسابات والفيزياء (Update)
function update() {
  // حركة الكرة
  ball.x += ball.vx;
  ball.y += ball.vy;

  // [الذكاء الاصطناعي] ملاحقة المضرب الأيمن للكرة بسلاسة وبنسبة خطأ بشرية
  let firePaddleCenter = firePaddle.y + firePaddle.height / 2;
  let aiLevel = 0.07; // (0.07 = 7% سرعة استجابة) ترفع أو تقلل للتحكم في صعوبة اللعبة

  firePaddle.y += (ball.y - firePaddleCenter) * aiLevel;

  // حماية المضارب من الخروج خارج حدود الشاشة الرأسية
  if (firePaddle.y < 0) firePaddle.y = 0;
  if (firePaddle.y > canvas.height - firePaddle.height)
    firePaddle.y = canvas.height - firePaddle.height;
  if (icePaddle.y < 0) icePaddle.y = 0;
  if (icePaddle.y > canvas.height - icePaddle.height)
    icePaddle.y = canvas.height - icePaddle.height;

  // ارتداد الكرة من السقف والأرضية
  if (ball.y - ball.radius < 0 || ball.y + ball.radius > canvas.height) {
    ball.vy = -ball.vy;
  }

  // تحديد المضرب المستهدف بناءً على اتجاه حركة الكرة الأفقي
  let paddle = ball.x < canvas.width / 2 ? icePaddle : firePaddle;

  // حسابات الاصطدام المتقدمة وزوايا الارتداد الديناميكية
  if (collision(ball, paddle)) {
    let collidePoint = ball.y - (paddle.y + paddle.height / 2);
    collidePoint = collidePoint / (paddle.height / 2); // ناتج بين -1 و 1

    let angleRad = collidePoint * (Math.PI / 4); // زاوية قصوى 45 درجة
    let direction = ball.x < canvas.width / 2 ? 1 : -1;

    // تحديث متجهات السرعة بناءً على زاوية الارتطام
    ball.vx = direction * ball.speed * Math.cos(angleRad);
    ball.vy = ball.speed * Math.sin(angleRad);

    // تسريع اللعبة تدريجياً مع كل صدة ناجحة لإضافة الحماس
    ball.speed += 0.6;
  }

  // احتساب النقاط عند تجاوز الكرة للمضارب وإعادة الجولة
  if (ball.x - ball.radius < 0) {
    fireScore++;
    resetBall();
  } else if (ball.x + ball.radius > canvas.width) {
    iceScore++;
    resetBall();
  }
}

// 8. دالة الرسم الفعلي (Render)
function render() {
  // مسح الشاشة بالكامل برسم خلفية سوداء
  drawRect(0, 0, canvas.width, canvas.height, "#050505");

  // رسم عناصر الزينة والنتيجة
  drawNet();
  drawText(iceScore, canvas.width / 4, 80, "#00e5ff", "#00e5ff");
  drawText(fireScore, (3 * canvas.width) / 4, 80, "#ff3d00", "#ff3d00");

  // رسم المضارب المضيئة
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

  // تغيير لون توهج الكرة ديناميكياً بناءً على اتجاه حركتها الحالية
  let ballGlow = ball.vx > 0 ? "#00e5ff" : "#ff3d00";
  drawCircle(ball.x, ball.y, ball.radius, ball.color, ballGlow);
}

// 9. حلقة اللعبة المستمرة (Game Loop)
function gameLoop() {
  update();
  render();
  requestAnimationFrame(gameLoop);
}

// تشغيل اللعبة
gameLoop();

// تحديث الأبعاد والحدود تلقائياً عند تغيير حجم نافذة المتصفح
window.addEventListener("resize", () => {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  firePaddle.x = canvas.width - 40 - paddleWidth;
});
