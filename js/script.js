const canvas = document.getElementById("pongCanvas");
const ctx = canvas.getContext("2d");

let iceScore = 0;
let fireScore = 0;
let gameMode = null; 
let gameStarted = false;
let animationFrameId = null;
let isPortrait = false; // تحديد اتجاه الشاشة الحالي ديناميكياً

// كائنات اللعبة المرنة
const icePaddle = { x: 0, y: 0, targetX: 0, targetY: 0, width: 0, height: 0, color: "#00e5ff" };
const firePaddle = { x: 0, y: 0, targetX: 0, targetY: 0, width: 0, height: 0, color: "#ff3d00" };
const ball = { x: 0, y: 0, radius: 10, color: "#ffffff", vx: 6, vy: 6, speed: 7 };

// دالة حساب الأبعاد والمواقع الذكية حسب اتجاه الشاشة ونوع الجهاز
function updateLayout() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    isPortrait = canvas.width < canvas.height;

    // تحديد أحجام المضارب لتتناسب مع أبعاد الموبايل والكمبيوتر
    const baseThickness = canvas.width > 768 ? 20 : 15;
    const baseLength = isPortrait 
        ? (canvas.width > 768 ? 140 : canvas.width * 0.25) // طول متناسب مع عرض الشاشة الرأسية
        : (canvas.height > 500 ? 120 : canvas.height * 0.25);

    if (isPortrait) {
        // في الوضع الرأسي (أعلى وأسفل): العرض يصبح هو الطول، والارتفاع هو السُمك
        icePaddle.width = baseLength;
        icePaddle.height = baseThickness;
        firePaddle.width = baseLength;
        firePaddle.height = baseThickness;

        // أماكن المضارب (ثلج بالأسفل، نار بالأعلى)
        icePaddle.y = canvas.height - 35 - icePaddle.height;
        firePaddle.y = 35;
    } else {
        // في الوضع الأفقي الكلاسيكي (يمين ويسار)
        icePaddle.width = baseThickness;
        icePaddle.height = baseLength;
        firePaddle.width = baseThickness;
        firePaddle.height = baseLength;

        // أماكن المضارب
        icePaddle.x = 40;
        firePaddle.x = canvas.width - 40 - firePaddle.width;
    }
}

function initPositions() {
    updateLayout();
    if (isPortrait) {
        icePaddle.x = canvas.width / 2 - icePaddle.width / 2;
        icePaddle.targetX = icePaddle.x;
        firePaddle.x = canvas.width / 2 - firePaddle.width / 2;
        firePaddle.targetX = firePaddle.x;
    } else {
        icePaddle.y = canvas.height / 2 - icePaddle.height / 2;
        icePaddle.targetY = icePaddle.y;
        firePaddle.y = canvas.height / 2 - firePaddle.height / 2;
        firePaddle.targetY = firePaddle.y;
    }
    ball.x = canvas.width / 2;
    ball.y = canvas.height / 2;
}

window.addEventListener("resize", () => {
    if (!gameStarted) { updateLayout(); return; }
    initPositions();
});

// --- أنظمة الإدخال والتحكم المزدوجة والمحسنة للسلاسة الفائقة ---

// 1. الماوس (الكمبيوتر)
window.addEventListener("mousemove", (event) => {
    if (!gameStarted) return;
    if (isPortrait) {
        icePaddle.targetX = event.clientX - icePaddle.width / 2;
    } else {
        icePaddle.targetY = event.clientY - icePaddle.height / 2;
    }
});

// 2. الكيبورد (اللاعب الثاني بالوضع الأفقي فقط)
const keys = { ArrowUp: false, ArrowDown: false, ArrowLeft: false, ArrowRight: false };
window.addEventListener("keydown", (e) => { if (e.key in keys) keys[e.key] = true; });
window.addEventListener("keyup", (e) => { if (e.key in keys) keys[e.key] = false; });

// 3. اللمس المتعدد للموبايل (Multi-Touch) - فائق النعومة والانعكاس الذاتي
function handleTouch(event) {
    if (!gameStarted) return;
    event.preventDefault(); 
    
    for (let i = 0; i < event.touches.length; i++) {
        let touch = event.touches[i];
        
        if (isPortrait) {
            // بالوضع الرأسي: الشاشة تنقسم لنصف علوي ونصف سفلي للتحكم الأفقي بالأصابع
            if (touch.clientY > canvas.height / 2) {
                icePaddle.targetX = touch.clientX - icePaddle.width / 2;
            } else if (gameMode === '2P' && touch.clientY <= canvas.height / 2) {
                firePaddle.targetX = touch.clientX - firePaddle.width / 2;
            }
        } else {
            // بالوضع الأفقي: الشاشة تنقسم لنصف أيمن وأيسر للتحكم الرأسي
            if (touch.clientX < canvas.width / 2) {
                icePaddle.targetY = touch.clientY - icePaddle.height / 2;
            } else if (gameMode === '2P' && touch.clientX >= canvas.width / 2) {
                firePaddle.targetY = touch.clientY - firePaddle.height / 2;
            }
        }
    }
}
canvas.addEventListener("touchstart", handleTouch, { passive: false });
canvas.addEventListener("touchmove", handleTouch, { passive: false });

// --- دالة التصادم العميقة الموحدة ---
function collision(b, p) {
    return b.x + b.radius > p.x && b.x - b.radius < p.x + p.width && 
           b.y + b.radius > p.y && b.y - b.radius < p.y + p.height;
}

function resetBall() {
    ball.x = canvas.width / 2;
    ball.y = canvas.height / 2;
    ball.speed = canvas.width > 768 ? 10 : 7; 
    
    if (isPortrait) {
        ball.vy = (ball.vy > 0 ? -1 : 1) * ball.speed;
        ball.vx = ball.speed * 0.5 * (Math.random() > 0.5 ? 1 : -1);
    } else {
        ball.vx = (ball.vx > 0 ? -1 : 1) * ball.speed;
        ball.vy = ball.speed * 0.5 * (Math.random() > 0.5 ? 1 : -1);
    }
}

// --- محرك اللعبة والفيزياء المتجاوبة ---
function update() {
    ball.x += ball.vx;
    ball.y += ball.vy;

    // تفعيل الـ Lerp (التنعيم الإنسيابي) لجميع حركات المستخدم لتجنب التقطيع نهائياً
    let easeFactor = 0.25; 

    if (isPortrait) {
        // --- تحديثات الوضع الرأسي (المضارب أعلى وأسفل) ---
        icePaddle.x += (icePaddle.targetX - icePaddle.x) * easeFactor;

        if (gameMode === '1P') {
            let firePaddleCenter = firePaddle.x + firePaddle.width / 2;
            firePaddle.x += (ball.x - firePaddleCenter) * 0.08; // ملاحقة الذكاء الاصطناعي
        } else {
            if (keys.ArrowLeft) firePaddle.targetX -= 12;
            if (keys.ArrowRight) firePaddle.targetX += 12;
            firePaddle.x += (firePaddle.targetX - firePaddle.x) * easeFactor;
        }

        // قفل الحدود الأفقية للمضارب
        if(icePaddle.x < 0) { icePaddle.x = 0; icePaddle.targetX = 0; }
        if(icePaddle.x > canvas.width - icePaddle.width) { icePaddle.x = canvas.width - icePaddle.width; icePaddle.targetX = canvas.width - icePaddle.width; }
        if(firePaddle.x < 0) { firePaddle.x = 0; firePaddle.targetX = 0; }
        if(firePaddle.x > canvas.width - firePaddle.width) { firePaddle.x = canvas.width - firePaddle.width; firePaddle.targetX = canvas.width - firePaddle.width; }

        // الارتداد من الجدران الجانبية (يمين ويسار)
        if (ball.x - ball.radius < 0 || ball.x + ball.radius > canvas.width) {
            ball.vx = -ball.vx;
        }

        // تحديد المضرب المستهدف للتصادم عمودياً
        let paddle = (ball.y < canvas.height / 2) ? firePaddle : icePaddle;
        if (collision(ball, paddle)) {
            let collidePoint = (ball.x - (paddle.x + paddle.width / 2)) / (paddle.width / 2);
            let angleRad = collidePoint * (Math.PI / 4);
            let directionY = (ball.y < canvas.height / 2) ? 1 : -1;

            ball.vy = directionY * ball.speed * Math.cos(angleRad);
            ball.vx = ball.speed * Math.sin(angleRad);
            ball.speed += 0.5;
        }

        // حساب الأهداف (خروج من الأعلى أو الأسفل)
        if (ball.y - ball.radius < 0) { fireScore++; resetBall(); } // هدف للنار
        else if (ball.y + ball.radius > canvas.height) { iceScore++; resetBall(); } // هدف للثلج

    } else {
        // --- تحديثات الوضع الأفقي الكلاسيكي (المضارب يمين ويسار) ---
        icePaddle.y += (icePaddle.targetY - icePaddle.y) * easeFactor;

        if (gameMode === '1P') {
            let firePaddleCenter = firePaddle.y + firePaddle.height / 2;
            firePaddle.y += (ball.y - firePaddleCenter) * 0.07;
        } else {
            if (keys.ArrowUp) firePaddle.targetY -= 12;
            if (keys.ArrowDown) firePaddle.targetY += 12;
            firePaddle.y += (firePaddle.targetY - firePaddle.y) * easeFactor;
        }

        if(icePaddle.y < 0) { icePaddle.y = 0; icePaddle.targetY = 0; }
        if(icePaddle.y > canvas.height - icePaddle.height) { icePaddle.y = canvas.height - icePaddle.height; icePaddle.targetY = canvas.height - icePaddle.height; }
        if(firePaddle.y < 0) { firePaddle.y = 0; firePaddle.targetY = 0; }
        if(firePaddle.y > canvas.height - firePaddle.height) { firePaddle.y = canvas.height - firePaddle.height; firePaddle.targetY = canvas.height - firePaddle.height; }

        // الارتداد من الحوائط الأفقية (أعلى وأسفل)
        if (ball.y - ball.radius < 0 || ball.y + ball.radius > canvas.height) {
            ball.vy = -ball.vy;
        }

        let paddle = (ball.x < canvas.width / 2) ? icePaddle : firePaddle;
        if (collision(ball, paddle)) {
            let collidePoint = (ball.y - (paddle.y + paddle.height / 2)) / (paddle.height / 2);
            let angleRad = collidePoint * (Math.PI / 4);
            let directionX = (ball.x < canvas.width / 2) ? 1 : -1;

            ball.vx = directionX * ball.speed * Math.cos(angleRad);
            ball.vy = ball.speed * Math.sin(angleRad);
            ball.speed += 0.5;
        }

        // حساب الأهداف (خروج من اليمين أو اليسار)
        if (ball.x - ball.radius < 0) { fireScore++; resetBall(); }
        else if (ball.x + ball.radius > canvas.width) { iceScore++; resetBall(); }
    }
}

// --- أدوات الرسم والتوهج النيوني الجمالي ---

function drawRect(x, y, w, h, color, glowColor = null) {
    if (glowColor) { ctx.shadowColor = glowColor; ctx.shadowBlur = 20; }
    ctx.fillStyle = color;
    ctx.fillRect(x, y, w, h);
    ctx.shadowBlur = 0;
}

function drawCircle(x, y, r, color, glowColor = null) {
    if (glowColor) { ctx.shadowColor = glowColor; ctx.shadowBlur = 25; }
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2, false);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;
}

function drawNet() {
    ctx.strokeStyle = "rgba(255, 255, 255, 0.06)";
    ctx.lineWidth = 2;
    ctx.setLineDash([10, 15]);
    ctx.beginPath();
    if (isPortrait) {
        // الخط الفاصل يصبح أفقياً في منتصف الشاشة الرأسية
        ctx.moveTo(0, canvas.height / 2);
        ctx.lineTo(canvas.width, canvas.height / 2);
    } else {
        ctx.moveTo(canvas.width / 2, 0);
        ctx.lineTo(canvas.width / 2, canvas.height);
    }
    ctx.stroke();
    ctx.setLineDash([]);
}

function drawText(text, x, y, color, glowColor) {
    ctx.shadowColor = glowColor;
    ctx.shadowBlur = 15;
    ctx.fillStyle = color;
    let fontSize = canvas.width > 768 ? "60px" : "35px";
    ctx.font = `bold ${fontSize} 'Courier New', monospace`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, x, y);
    ctx.shadowBlur = 0;
}

function render() {
    drawRect(0, 0, canvas.width, canvas.height, "#050505");
    drawNet();
    
    // مواقع طباعة النتيجة تتغير بذكاء تِبعاً للمحور الحالي
    if (isPortrait) {
        let offsetX = canvas.width > 768 ? 80 : 50;
        drawText(iceScore, canvas.width / 2, canvas.height / 2 + offsetX, "#00e5ff", "#00e5ff");
        drawText(fireScore, canvas.width / 2, canvas.height / 2 - offsetX, "#ff3d00", "#ff3d00");
    } else {
        let textY = canvas.height / 2;
        drawText(iceScore, canvas.width / 4, textY, "#00e5ff", "#00e5ff");
        drawText(fireScore, (3 * canvas.width) / 4, textY, "#ff3d00", "#ff3d00");
    }

    drawRect(icePaddle.x, icePaddle.y, icePaddle.width, icePaddle.height, icePaddle.color, icePaddle.color);
    drawRect(firePaddle.x, firePaddle.y, firePaddle.width, firePaddle.height, firePaddle.color, firePaddle.color);

    let ballGlow = (isPortrait ? ball.vy > 0 : ball.vx > 0) ? "#00e5ff" : "#ff3d00";
    drawCircle(ball.x, ball.y, ball.radius, ball.color, ballGlow);
}

function gameLoop() {
    if (!gameStarted) return;
    update();
    render();
    animationFrameId = requestAnimationFrame(gameLoop);
}

// --- إدارة شاشات القوائم والتحميل ---

function startGame(mode) {
    gameMode = mode;
    gameStarted = true;
    document.getElementById("startMenu").style.display = "none";
    document.getElementById("btnMenu").style.display = "block";
    initPositions();
    resetBall();
    gameLoop();
}

function returnToMenu() {
    gameStarted = false;
    cancelAnimationFrame(animationFrameId);
    iceScore = 0;
    fireScore = 0;
    document.getElementById("startMenu").style.display = "flex";
    document.getElementById("btnMenu").style.display = "none";
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    updateLayout();
}

document.getElementById("btn1P").addEventListener("click", () => startGame('1P'));
document.getElementById("btn2P").addEventListener("click", () => startGame('2P'));
document.getElementById("btnMenu").addEventListener("click", returnToMenu);
document.getElementById("btnMenu").addEventListener("touchstart", (e) => { e.stopPropagation(); returnToMenu(); });

// تهيئة اللمسات الأولى فور تشغيل الملفات
updateLayout();