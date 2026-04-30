function removeWhiteBg(img) {
    try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx || !img.naturalWidth || !img.naturalHeight) return;
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const px = imageData.data;
        const w = canvas.width, h = canvas.height;
        const visited = new Uint8Array(w * h);
        const queue = [];

        // seed from all 4 edges
        for (let x = 0; x < w; x++) { queue.push(x, 0); queue.push(x, h - 1); }
        for (let y = 1; y < h - 1; y++) { queue.push(0, y); queue.push(w - 1, y); }

        while (queue.length) {
            const y = queue.pop(), x = queue.pop();
            const id = y * w + x;
            if (visited[id]) continue;
            visited[id] = 1;
            const i = id * 4;
            if (px[i] > 230 && px[i+1] > 230 && px[i+2] > 230) {
                px[i+3] = 0;
                if (x > 0)     queue.push(x-1, y);
                if (x < w-1)   queue.push(x+1, y);
                if (y > 0)     queue.push(x, y-1);
                if (y < h-1)   queue.push(x, y+1);
            }
        }

        // Erase any dark artifact rows connected to the top edge
        for (let y = 0; y < Math.min(20, h); y++) {
            let hasDark = false;
            for (let x = 0; x < w; x++) {
                const i = (y * w + x) * 4;
                if (px[i+3] > 0 && px[i] < 60 && px[i+1] < 60 && px[i+2] < 60) {
                    hasDark = true;
                    break;
                }
            }
            if (!hasDark) break;
            for (let x = 0; x < w; x++) {
                const i = (y * w + x) * 4;
                px[i+3] = 0;
            }
        }

        ctx.putImageData(imageData, 0, 0);
        img.src = canvas.toDataURL();
    } catch (error) {
        console.warn('removeWhiteBg skipped for', img.src, error);
    }
}

document.querySelectorAll('.character-img').forEach(img => {
    if (img.complete) removeWhiteBg(img);
    else img.addEventListener('load', () => removeWhiteBg(img));
});

// Scale arv.png to kc.png's visual size and fix feet-to-ground alignment
(function scaleArv() {
    const arv = document.querySelector('.char-wrap:nth-child(1) .character-img');
    const kc  = document.querySelector('.char-wrap:nth-child(2) .character-img');
    if (!arv || !kc) return;

    function apply() {
        // Match arv's width to kc's natural aspect ratio at 230px height
        if (kc.naturalWidth && kc.naturalHeight) {
            const targetW = (kc.naturalWidth / kc.naturalHeight) * 230;
            arv.style.width  = Math.round(targetW) + 'px';
            arv.style.height = '230px';
            arv.style.objectFit = 'contain';
            arv.style.objectPosition = 'bottom center';
        }
        // Detect transparent rows at the bottom of arv and shift image down
        if (!arv.naturalWidth) return;
        const cv = document.createElement('canvas');
        cv.width  = arv.naturalWidth;
        cv.height = arv.naturalHeight;
        const cx  = cv.getContext('2d');
        cx.drawImage(arv, 0, 0);
        const px  = cx.getImageData(0, 0, cv.width, cv.height).data;
        let lastFilledRow = 0;
        for (let y = cv.height - 1; y >= 0; y--) {
            let hit = false;
            for (let x = 0; x < cv.width; x++) {
                if (px[(y * cv.width + x) * 4 + 3] > 20) { hit = true; break; }
            }
            if (hit) { lastFilledRow = y; break; }
        }
        const blankRows = cv.height - lastFilledRow - 1;
        const shiftPx   = (blankRows / cv.height) * 230;
        if (shiftPx > 1) arv.style.marginBottom = '-' + shiftPx.toFixed(1) + 'px';
    }

    // removeWhiteBg replaces src with a data: URL, triggering a second load
    arv.addEventListener('load', function onSecondLoad() {
        if (!arv.src.startsWith('data:')) return;
        arv.removeEventListener('load', onSecondLoad);
        apply();
    });
    // Fallback: if arv had no white background to remove
    window.addEventListener('load', () => { if (!arv.src.startsWith('data:')) apply(); }, { once: true });
})();

const cake = document.getElementById('cake');
const blowout = document.getElementById('blowout');
const flames = document.querySelectorAll('.flame');
const birthdayPopup = document.getElementById('birthday-popup');
const cakeTop = document.getElementById('cake-top');
const cakeArea = document.getElementById('cake-area');
const slices = document.querySelectorAll('.slice-cut');
const cakeSliceView = document.getElementById('cake-slice-view');
const cakeHint = document.getElementById('cake-hint');
const giftBtn = document.getElementById('gift-btn');
const gifts = document.getElementById('gifts');
let sliceCount = 0;
let blown = 0;

const canvas = document.getElementById('fireworks');
const ctx = canvas.getContext('2d');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const particles = [];
const colors = ['#ff4444','#ff9900','#ffee00','#44ff44','#44aaff','#ff44ff','#ffffff'];

function spawnFirework() {
    const x = Math.random() * canvas.width;
    const y = Math.random() * canvas.height * 0.6;
    for (let i = 0; i < 40; i++) {
        const angle = (i / 40) * Math.PI * 2;
        const speed = 2 + Math.random() * 4;
        particles.push({
            x, y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            alpha: 1,
            color: colors[Math.floor(Math.random() * colors.length)],
            size: 2 + Math.random() * 2
        });
    }
}

let fireworksRunning = true;

function animateFireworks() {
    if (!fireworksRunning) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.05;
        p.alpha -= 0.015;
        ctx.globalAlpha = Math.max(p.alpha, 0);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
    });
    ctx.globalAlpha = 1;
    for (let i = particles.length - 1; i >= 0; i--) {
        if (particles[i].alpha <= 0) particles.splice(i, 1);
    }
    requestAnimationFrame(animateFireworks);
}

const fireworkInterval = setInterval(spawnFirework, 800);
animateFireworks();

// Show cake immediately — DOM is ready since script is at bottom of body.
// window.load waits for all images, which can take longer than the 5.5s intro
// on first visit, causing the blowout button to appear before the cake.
cake.classList.add('show');

blowout.addEventListener('click', () => {
    if (blown < flames.length) {
        flames[blown].classList.add('out');
        blown++;
    }
    if (blown === flames.length) {
        blowout.style.display = 'none';
        birthdayPopup.classList.add('show');
    }
});

setTimeout(() => {
    blowout.style.display = 'block';
    fireworksRunning = false;
    clearInterval(fireworkInterval);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
}, 5500);

function revealCakeTop() {
    const scrollPrompt = document.getElementById('scroll-prompt');
    if (scrollPrompt) scrollPrompt.remove();

    const scene = document.getElementById('scene');
    const h1 = document.querySelector('h1');

    scene.style.transition = 'opacity 0.6s ease';
    h1.style.transition = 'opacity 0.6s ease';
    scene.style.opacity = '0';
    h1.style.opacity = '0';

    setTimeout(() => {
        scene.style.display = 'none';
        h1.style.display = 'none';
        document.body.style.paddingBottom = '';
        window.scrollTo(0, 0);

        cakeTop.style.position = 'fixed';
        cakeTop.style.top = '50%';
        cakeTop.style.left = '50%';
        cakeTop.style.transform = 'translate(-50%, -50%)';
        cakeTop.style.margin = '0';
        cakeTop.style.display = 'block';
        cakeHint.style.display = 'block';
        cakeHint.style.position = 'fixed';
        cakeHint.style.top = 'calc(50% + 130px)';
        cakeHint.style.left = '50%';
        cakeHint.style.transform = 'translateX(-50%)';
        cakeHint.style.zIndex = '100';
    }, 600);
}

birthdayPopup.addEventListener('click', () => {
    birthdayPopup.classList.remove('show');
    cakeArea.style.display = 'none';

    const scrollPrompt = document.createElement('div');
    scrollPrompt.id = 'scroll-prompt';
    scrollPrompt.textContent = 'scroll down ↓';
    document.body.appendChild(scrollPrompt);

    document.body.style.paddingBottom = '100vh';

    function onScroll() {
        if (window.scrollY > window.innerHeight * 0.7) {
            window.removeEventListener('scroll', onScroll);
            revealCakeTop();
        }
    }
    window.addEventListener('scroll', onScroll);
});
// ── POKÉMON PACK ──
const packImages = ['krit.jpg'];

let cardElements = [];
let seenCards   = new Set();
let currentCardIndex = 0;

function initPack() {
    const pack = document.getElementById('pokemon-pack');
    if (!pack || pack.dataset.ready) return;
    pack.dataset.ready = '1';
    pack.addEventListener('click', () => {
        pack.classList.add('opening');
        setTimeout(() => {
            pack.style.display = 'none';
            buildViewer();
        }, 700);
    });
}

function buildViewer() {
    cardElements = [];
    seenCards    = new Set();
    currentCardIndex = 0;

    const container = document.getElementById('pack-cards');
    container.innerHTML = '';

    const stage = document.createElement('div');
    stage.id = 'card-stage';
    container.appendChild(stage);
    addSwipeNav(stage);

    const navRow = document.createElement('div');
    navRow.className = 'card-nav-row';

    const prevBtn = document.createElement('button');
    prevBtn.className = 'card-nav-btn';
    prevBtn.id = 'card-prev';
    prevBtn.textContent = '‹';
    prevBtn.disabled = true;

    const counter = document.createElement('span');
    counter.id = 'card-counter';

    const nextBtn = document.createElement('button');
    nextBtn.className = 'card-nav-btn';
    nextBtn.id = 'card-next';
    nextBtn.textContent = '›';

    navRow.appendChild(prevBtn);
    navRow.appendChild(counter);
    navRow.appendChild(nextBtn);
    container.appendChild(navRow);

    const cardSrcs   = ['krit1','krit2','krit8','krit10','krit3','krit9','krit4','krit5','krit7','krit6'];
    const cardColors = ['blue','green','red','orange',null,null,null,null,null,null];
    for (let i = 0; i < cardSrcs.length; i++) {
        const src = cardSrcs[i] + '.jpeg';
        let type = 'normal';
        if (i === 4) type = 'full-art-purple';
        if (i === 5) type = 'ex';
        if (i === 6) type = 'full-art-red';
        if (i === 7) type = 'full-art-green';
        if (i === 8) type = 'full-art-ex';
        if (i === 9) type = 'full-art-rainbow';
        cardElements.push(makeCard(src, type, i + 1, cardColors[i]));
    }

    showCard(0, 0);

    prevBtn.addEventListener('click', () => {
        if (currentCardIndex > 0) showCard(currentCardIndex - 1, -1);
    });
    nextBtn.addEventListener('click', () => {
        if (currentCardIndex < cardElements.length - 1) showCard(currentCardIndex + 1, 1);
    });
}

function updateNav() {
    const prevBtn = document.getElementById('card-prev');
    const nextBtn = document.getElementById('card-next');
    const counter = document.getElementById('card-counter');
    if (prevBtn) prevBtn.disabled = (currentCardIndex === 0);
    if (nextBtn) nextBtn.disabled = (currentCardIndex === cardElements.length - 1);
    if (counter) counter.textContent = `${currentCardIndex + 1} / ${cardElements.length}`;
}

function showCard(index, direction) {
    const stage    = document.getElementById('card-stage');
    const oldCard  = stage.querySelector('.poke-card');
    const newCard  = cardElements[index];
    const firstTime = !seenCards.has(index);

    seenCards.add(index);
    currentCardIndex = index;
    updateNav();

    const _sparkleThemes = {
        4: ['#cc88ff','#aa44ff','#dd99ff','#f0ccff'],
        6: ['#ff9999','#ff4444','#ffaa88','#ffddcc'],
        7: ['#99ffaa','#44ff88','#88ffdd','#ccffee'],
        9: ['#ff0080','#ff6600','#ffdd00','#00cc44','#0088ff','#cc00ff','#ffffff'],
    };
    if (index >= 4) {
        setTimeout(() => burstSparkles(stage, 55, _sparkleThemes[index] || null), 220);
    }

    if (oldCard && oldCard !== newCard) {
        if (oldCard._tiltMove)  oldCard.removeEventListener('mousemove',  oldCard._tiltMove);
        if (oldCard._tiltLeave) oldCard.removeEventListener('mouseleave', oldCard._tiltLeave);
        oldCard.classList.remove('tilting');
        oldCard.style.transition = 'transform 0.32s ease, opacity 0.32s ease';
        oldCard.style.transform  = `translateX(${direction >= 0 ? '-110%' : '110%'})`;
        oldCard.style.opacity    = '0';
        setTimeout(() => { if (oldCard.parentNode) oldCard.parentNode.removeChild(oldCard); }, 350);
    }

    if (firstTime) {
        newCard.style.opacity    = '0';
        newCard.style.transform  = '';
        newCard.style.transition = '';
        stage.appendChild(newCard);

        const delay = (oldCard && oldCard !== newCard) ? 150 : 80;
        setTimeout(() => {
            newCard.classList.add('reveal');
            function onAnimEnd(e) {
                if (e.animationName !== 'card-deal') return;
                newCard.removeEventListener('animationend', onAnimEnd);
                newCard.style.opacity    = '1';
                newCard.style.transform  = '';
                newCard.style.transition = '';
                newCard.classList.remove('reveal');
                if (newCard.classList.contains('poke-card-ex-full') ||
                    newCard.classList.contains('poke-card-full-art')) {
                    newCard.classList.add('glow-active');
                }
                attachTilt(newCard);
            }
            newCard.addEventListener('animationend', onAnimEnd);
        }, delay);
    } else {
        newCard.style.transition = 'none';
        newCard.style.transform  = `translateX(${direction >= 0 ? '110%' : '-110%'})`;
        newCard.style.opacity    = '0';
        stage.appendChild(newCard);

        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                newCard.style.transition = 'transform 0.32s ease, opacity 0.32s ease';
                newCard.style.transform  = '';
                newCard.style.opacity    = '1';
                setTimeout(() => {
                    newCard.style.transition = '';
                    attachTilt(newCard);
                }, 360);
            });
        });
    }
}

function burstSparkles(container, count, palette) {
    const colors = palette || ['#ffffff','#ffe566','#ff80bb','#80d4ff','#cc80ff','#80ffcc'];
    for (let i = 0; i < count; i++) {
        const sp = document.createElement('div');
        sp.className = 'transition-sparkle';
        sp.style.left = (5 + Math.random() * 90) + '%';
        sp.style.top  = (5 + Math.random() * 90) + '%';
        const angle = Math.random() * Math.PI * 2;
        const dist  = 50 + Math.random() * 110;
        sp.style.setProperty('--tx', (Math.cos(angle) * dist).toFixed(1) + 'px');
        sp.style.setProperty('--ty', (Math.sin(angle) * dist).toFixed(1) + 'px');
        const color = colors[Math.floor(Math.random() * colors.length)];
        sp.style.background = color;
        sp.style.boxShadow  = `0 0 5px 2px ${color}`;
        sp.style.animationDuration = (450 + Math.random() * 650) + 'ms';
        sp.style.animationDelay    = (Math.random() * 600) + 'ms';
        container.appendChild(sp);
        sp.addEventListener('animationend', () => sp.remove());
    }
}

function attachTilt(card) {
    function applyTilt(clientX, clientY) {
        const rect = card.getBoundingClientRect();
        const dx = (clientX - (rect.left + rect.width  / 2)) / (rect.width  / 2);
        const dy = (clientY - (rect.top  + rect.height / 2)) / (rect.height / 2);
        card.style.transition = 'box-shadow 0.15s ease';
        card.style.transform  = `perspective(800px) rotateX(${-dy * 12}deg) rotateY(${dx * 18}deg)`;
        card.style.setProperty('--holo-x', (dx * 0.5 + 0.5) * 100 + '%');
        card.style.setProperty('--holo-y', (dy * 0.5 + 0.5) * 100 + '%');
        card.classList.add('tilting');
    }
    function onMove(e)  { applyTilt(e.clientX, e.clientY); }
    function onTouch(e) { if (e.touches[0]) { e.preventDefault(); applyTilt(e.touches[0].clientX, e.touches[0].clientY); } }
    function onLeave() {
        card.style.transition = 'transform 0.5s ease, box-shadow 0.3s ease';
        card.style.transform  = '';
        card.classList.remove('tilting');
        card.style.removeProperty('--holo-x');
        card.style.removeProperty('--holo-y');
    }
    if (card._tiltMove)  card.removeEventListener('mousemove',  card._tiltMove);
    if (card._tiltLeave) card.removeEventListener('mouseleave', card._tiltLeave);
    if (card._tiltTouch) card.removeEventListener('touchmove',  card._tiltTouch);
    if (card._tiltTEnd)  card.removeEventListener('touchend',   card._tiltTEnd);
    card._tiltMove  = onMove;
    card._tiltLeave = onLeave;
    card._tiltTouch = onTouch;
    card._tiltTEnd  = onLeave;
    card.addEventListener('mousemove',  onMove);
    card.addEventListener('mouseleave', onLeave);
    card.addEventListener('touchmove',  onTouch, { passive: false });
    card.addEventListener('touchend',   onLeave);
}

function addSwipeNav(stage) {
    let startX = 0;
    stage.addEventListener('touchstart', e => { startX = e.touches[0].clientX; }, { passive: true });
    stage.addEventListener('touchend', e => {
        const dx = e.changedTouches[0].clientX - startX;
        if (Math.abs(dx) < 40) return;
        if (dx < 0 && currentCardIndex < cardElements.length - 1) showCard(currentCardIndex + 1, 1);
        if (dx > 0 && currentCardIndex > 0) showCard(currentCardIndex - 1, -1);
    });
}

function makeCard(src, type, num, colorClass) {
    const card = document.createElement('div');
    card.className = 'poke-card';

    if (type === 'holo') {
        card.classList.add('poke-card-holo');
        card.innerHTML = `
            <div class="card-inner">
                <div class="card-header">
                    <span class="card-name">PAMMO ✦</span>
                    <span class="card-hp">HP ∞</span>
                </div>
                <div class="card-img-wrap"><img src="${src}" class="card-img"></div>
                <div class="card-type">🌈 Holographic · Rare</div>
                <div class="card-moves">
                    <div class="move">🌟 <b>Radiate Joy</b> — affects everyone nearby</div>
                    <div class="move">💕 <b>Main Character Aura</b> — cannot be countered</div>
                </div>
                <div class="card-footer"><span>✦ Rare</span><span>${num}/10</span></div>
            </div>`;

    } else if (type === 'ex') {
        card.classList.add('poke-card-ex');
        card.innerHTML = `
            <div class="card-inner">
                <div class="card-header">
                    <span class="card-name">PAMMO <em class="ex-tag">ex</em></span>
                    <span class="card-hp hp-ex">HP 999</span>
                </div>
                <div class="card-img-wrap"><img src="${src}" class="card-img"></div>
                <div class="card-type">⚡ Legendary Type · ex</div>
                <div class="card-moves">
                    <div class="move move-ex">💫 <b>Birthday Beam</b><span class="dmg">200</span></div>
                    <div class="move move-ex">👑 <b>Queen Energy</b><span class="dmg">∞+</span></div>
                </div>
                <div class="card-footer card-footer-ex"><span>★★ Legendary ex</span><span>${num}/10</span></div>
            </div>`;

    } else if (type === 'full-art-rainbow') {
        card.classList.add('poke-card-full-art', 'poke-card-full-art-rainbow');
        card.innerHTML = `
            <div class="card-full-art">
                <img src="${src}" class="card-full-img">
                <div class="card-full-top">
                    <span class="card-full-name">PAMMO ✦</span>
                    <span class="card-full-hp">HP ∞</span>
                </div>
                <div class="card-full-bottom">
                    <span class="card-full-rarity">✦ RAINBOW RARE · SECRET ✦</span>
                </div>
            </div>`;
        const art = card.querySelector('.card-full-art');
        const rbPalette = ['#ff0080','#ff6600','#ffdd00','#00cc44','#0088ff','#cc00ff'];
        for (let s = 0; s < 14; s++) {
            const sp = document.createElement('div');
            sp.className = 'card-sparkle';
            sp.style.left = (5 + Math.random() * 90) + '%';
            sp.style.top  = (5 + Math.random() * 90) + '%';
            sp.style.animationDelay    = -(Math.random() * 2) + 's';
            sp.style.animationDuration = (0.9 + Math.random() * 1.4) + 's';
            const c = rbPalette[s % rbPalette.length];
            sp.style.boxShadow = `0 0 7px 3px ${c}, 0 0 18px rgba(255,255,255,0.8)`;
            art.appendChild(sp);
        }

    } else if (type === 'full-art-red' || type === 'full-art-green' || type === 'full-art-purple') {
        const shade = type.split('-')[2];
        const cfg = {
            red:   { tag: '✦', tagColor: '#ff8888', rarity: '✦ FULL ART · RARE ✦',  sparkGlow: 'rgba(255,80,80,0.8)'   },
            green: { tag: '✧', tagColor: '#88ffbb', rarity: '✧ FULL ART · RARE ✧',  sparkGlow: 'rgba(80,255,140,0.8)'  },
            purple:{ tag: '✦', tagColor: '#dd99ff', rarity: '✦ FULL ART · RARE ✦',  sparkGlow: 'rgba(180,80,255,0.8)'  },
        }[shade];
        card.classList.add('poke-card-full-art', `poke-card-full-art-${shade}`);
        card.innerHTML = `
            <div class="card-full-art">
                <img src="${src}" class="card-full-img">
                <div class="card-full-top">
                    <span class="card-full-name">PAMMO <em class="ex-tag-full" style="color:${cfg.tagColor}">${cfg.tag}</em></span>
                    <span class="card-full-hp">HP ∞</span>
                </div>
                <div class="card-full-bottom">
                    <span class="card-full-rarity">${cfg.rarity}</span>
                </div>
            </div>`;
        const art = card.querySelector('.card-full-art');
        for (let s = 0; s < 10; s++) {
            const sp = document.createElement('div');
            sp.className = 'card-sparkle';
            sp.style.left = (5 + Math.random() * 90) + '%';
            sp.style.top  = (5 + Math.random() * 90) + '%';
            sp.style.animationDelay    = -(Math.random() * 2) + 's';
            sp.style.animationDuration = (1.2 + Math.random() * 1.2) + 's';
            sp.style.boxShadow = `0 0 6px 3px white, 0 0 16px ${cfg.sparkGlow}`;
            art.appendChild(sp);
        }

    } else if (type === 'full-art-ex') {
        card.classList.add('poke-card-ex-full');
        card.innerHTML = `
            <div class="card-full-art">
                <img src="${src}" class="card-full-img">
                <div class="card-full-top">
                    <span class="card-full-name">PAMMO <em class="ex-tag-full">EX</em></span>
                    <span class="card-full-hp">HP ∞</span>
                </div>
                <div class="card-full-bottom">
                    <span class="card-full-rarity">✦ MYTHICAL · 1 OF 1 ✦</span>
                </div>
            </div>`;
        const art = card.querySelector('.card-full-art');
        for (let s = 0; s < 16; s++) {
            const sp = document.createElement('div');
            sp.className = 'card-sparkle';
            sp.style.left = (5 + Math.random() * 90) + '%';
            sp.style.top  = (5 + Math.random() * 90) + '%';
            sp.style.animationDelay    = -(Math.random() * 2) + 's';
            sp.style.animationDuration = (1.2 + Math.random() * 1.2) + 's';
            art.appendChild(sp);
        }

    } else {
        if (colorClass) card.classList.add(`card-theme-${colorClass}`);
        const normalCfgs = {
            1: {
                type: '💧 Water Type · Uncommon',
                ability: 'Aqua Shield — immune to all negativity and bad takes',
                moves: [
                    '🌊 <b>Tidal Laugh</b> — unleashes contagious joy in a 5m radius',
                    '💙 <b>Deep Breath</b> — fully resets composure; cannot be stressed',
                ]
            },
            2: {
                type: '🌿 Grass Type · Uncommon',
                ability: 'Bloom Aura — radiates warmth; allies heal 20 HP per turn',
                moves: [
                    '🌱 <b>Petal Bomb</b> — overwhelms opponent with pure cuteness (30)',
                    '🍀 <b>Fortune Smile</b> — the next event is guaranteed to go well',
                ]
            },
            3: {
                type: '🔥 Fire Type · Uncommon',
                ability: 'Fierce Entry — foes lose 10 confidence on contact',
                moves: [
                    '💥 <b>Spicy Reply</b> — instant clap-back, never misses (50)',
                    '❤️‍🔥 <b>Passionate Mode</b> — attack stat doubles when motivated',
                ]
            },
            4: {
                type: '⚡ Electric Type · Uncommon',
                ability: 'Night Owl — speed and power double after 11 PM',
                moves: [
                    '🎉 <b>Party Ignition</b> — forces entire room into celebration mode (45)',
                    '✨ <b>Spotlight Grab</b> — permanently becomes the center of attention',
                ]
            },
        };
        const cfg = normalCfgs[num] || {
            type: '✨ Birthday Star · Uncommon',
            ability: null,
            moves: [
                '🌟 <b>Radiate Joy</b> — affects everyone nearby',
                '💕 <b>Main Character Aura</b> — cannot be countered',
            ]
        };
        const abilityHTML = cfg.ability
            ? `<div class="card-ability"><span class="ability-label">Ability</span> ${cfg.ability}</div>`
            : '';
        card.innerHTML = `
            <div class="card-inner">
                <div class="card-header">
                    <span class="card-name">PAMMO</span>
                    <span class="card-hp">HP ∞</span>
                </div>
                <div class="card-img-wrap"><img src="${src}" class="card-img"></div>
                <div class="card-type">${cfg.type}</div>
                ${abilityHTML}
                <div class="card-moves">
                    <div class="move">${cfg.moves[0]}</div>
                    <div class="move">${cfg.moves[1]}</div>
                </div>
                <div class="card-footer"><span>★★ Uncommon</span><span>${num}/10</span></div>
            </div>`;
    }
    return card;
}

function initFortuneTeller() {
    const fortunes = [
        "This year, your main character energy reaches its final form 🌟",
        "The universe confirms: great hair, great food, great vibes — every single day 💁‍♀️",
        "A surprise is coming that will make you laugh for actual days 🎭",
        "Your patience will be tested exactly once this year. You win, obviously 👑",
        "Someone out there is thinking about how cool you are right now ✨",
        "New adventures are loading… they are rated 10/10 by everyone who witnesses them 🗺️",
        "The prophecy is sealed: the Pammo era is completely, utterly, unstoppable 🔮💕",
    ];
    const dots = ['✦ · · · · · ·','✦ ✦ · · · · ·','✦ ✦ ✦ · · · ·','✦ ✦ ✦ ✦ · · ·','✦ ✦ ✦ ✦ ✦ · ·','✦ ✦ ✦ ✦ ✦ ✦ ·','✦ ✦ ✦ ✦ ✦ ✦ ✦'];

    const btn     = document.getElementById('fortune-btn');
    const textEl  = document.getElementById('fortune-text');
    const counter = document.getElementById('fortune-counter');
    const ball    = document.getElementById('fortune-ball');

    if (btn._fortuneReady) return;
    btn._fortuneReady = true;

    let idx = 0;

    btn.addEventListener('click', () => {
        if (idx >= fortunes.length) return;

        ball.style.animation = 'none';
        ball.offsetHeight;
        ball.style.animation = 'ball-flash 0.6s ease, ball-pulse 3s ease-in-out 0.6s infinite';

        textEl.style.opacity = '0';
        setTimeout(() => {
            textEl.textContent = fortunes[idx];
            textEl.style.animation = 'fortune-pop 0.45s ease forwards';
            textEl.style.opacity   = '1';
            counter.textContent    = dots[idx];
            idx++;
            if (idx >= fortunes.length) {
                btn.textContent = '💕 that\'s all, pammo!';
                btn.style.background = 'linear-gradient(135deg, #ff80cc, #ffaa66)';
                btn.disabled = true;
                btn.style.cursor = 'default';
            }
        }, 280);

        const popup = document.getElementById('gift-popup');
        burstSparkles(popup, 18, ['#cc88ff','#ff88cc','#ffcc88','#88ccff','#ffffff']);
    });
}

giftBtn.addEventListener('click', () => {
    const giftsEl = gifts.cloneNode(true);
    const giftPopupEl = document.getElementById('gift-popup').cloneNode(true);
    const giftPopupRedEl = document.getElementById('gift-popup-red').cloneNode(true);
    const giftPopupBlueEl = document.getElementById('gift-popup-blue').cloneNode(true);

    document.body.innerHTML = '';
    document.body.style.backgroundColor = 'blueviolet';

    giftsEl.style.display = 'flex';
    giftsEl.style.flexWrap = 'wrap';
    document.body.appendChild(giftsEl);
    document.body.appendChild(giftPopupEl);
    document.body.appendChild(giftPopupRedEl);
    document.body.appendChild(giftPopupBlueEl);

    const giftText = document.getElementById('gift-text');

    document.getElementById('gift-blue').addEventListener('mouseenter', () => {
        giftText.textContent = 'Do you wanna choose the blue one? 👀';
    });
    document.getElementById('gift-blue').addEventListener('mouseleave', () => {
        giftText.textContent = '';
    });
    document.getElementById('gift-blue').addEventListener('click', () => {
        if (!redOpened) {
            giftText.textContent = 'nope nope you gotta choose in order 😛';
        } else {
            document.getElementById('gift-popup-blue').classList.add('show');
        }
    });

    document.getElementById('gift-popup-blue-close').addEventListener('click', () => {
        document.getElementById('gift-popup-blue').classList.remove('show');
        const allGifts = document.querySelectorAll('.gift');
        allGifts.forEach(g => g.classList.add('fly'));
        setTimeout(() => {
            document.body.innerHTML = '';
            document.body.style.backgroundColor = 'blueviolet';
            showDecorScreen();
        }, 1000);
    });

    document.getElementById('gift-red').addEventListener('mouseenter', () => {
        giftText.textContent = 'Do you wanna choose the red one? 👀';
    });
    document.getElementById('gift-red').addEventListener('mouseleave', () => {
        giftText.textContent = '';
    });
    let yellowOpened = false;
    let redOpened = false;

    document.getElementById('gift-red').addEventListener('click', () => {
        if (!yellowOpened) {
            giftText.textContent = 'nope nope you gotta choose in order 😛';
        } else {
            document.getElementById('gift-popup-red').classList.add('show');
            initPack();
        }
    });

    document.getElementById('gift-yellow').addEventListener('mouseenter', () => {
        giftText.textContent = 'Do you wanna choose the yellow one? 👀';
    });
    document.getElementById('gift-yellow').addEventListener('mouseleave', () => {
        giftText.textContent = '';
    });
    document.getElementById('gift-yellow').addEventListener('click', () => {
        document.getElementById('gift-popup').classList.add('show');
        initFortuneTeller();
    });

    document.getElementById('gift-popup-close').addEventListener('click', () => {
        document.getElementById('gift-popup').classList.remove('show');
        yellowOpened = true;
    });

    document.getElementById('gift-popup-red-close').addEventListener('click', () => {
        document.getElementById('gift-popup-red').classList.remove('show');
        redOpened = true;
    });
});

function showDecorScreen() {
    const colors = ['red','orange','gold','limegreen','dodgerblue','hotpink','violet'];

    // lights
    const lightsBar = document.createElement('div');
    lightsBar.id = 'lights-bar';
    for (let i = 0; i < 20; i++) {
        const bulb = document.createElement('div');
        bulb.className = 'bulb';
        bulb.style.backgroundColor = colors[i % colors.length];
        bulb.style.animationDelay = (i * 0.1) + 's';
        lightsBar.appendChild(bulb);
    }
    document.body.appendChild(lightsBar);

    // border animals with hats
    const animalFiles = ['panda.png','capybara.png','hamster.png','squirrel.png'];
    const positions = [
        {top:'80px', left:'10px'},
        {top:'80px', left:'130px'},
        {top:'80px', right:'10px'},
        {top:'80px', right:'130px'},
        {top:'220px', left:'10px'},
        {top:'340px', left:'10px'},
        {top:'220px', right:'10px'},
        {top:'340px', right:'10px'},
        {bottom:'10px', left:'10px'},
        {bottom:'10px', left:'150px'},
        {bottom:'10px', left:'300px'},
        {bottom:'10px', right:'10px'},
        {bottom:'10px', right:'150px'},
        {bottom:'10px', right:'300px'},
    ];

    positions.forEach((pos, i) => {
        const wrapper = document.createElement('div');
        wrapper.className = 'animal-wrapper';
        Object.assign(wrapper.style, pos);

        const hat = document.createElement('img');
        hat.src = 'Birthday-Hat-PNG.png';
        hat.className = 'animal-hat';

        const animal = document.createElement('img');
        animal.src = animalFiles[i % animalFiles.length];
        animal.className = 'animal-img';

        wrapper.appendChild(hat);
        wrapper.appendChild(animal);
        document.body.appendChild(wrapper);
    });

    // main message
    const msg = document.createElement('p');
    msg.id = 'birthday-msg';
    msg.innerHTML = 'To the prettiest girl on the planet. Your positivity makes every other thing look trivial. Happy birthday to my queen of hearts. Now i cant call you chhotu :( but you are mah cutu patoootu still hehe. I wish every year from now you become more happier and achieve all you want.<br><br><span id="msg-sig">- AKCV</span>';
    document.body.appendChild(msg);

    // replay button
    const replayBtn = document.createElement('button');
    replayBtn.textContent = 'replay? 🔁';
    replayBtn.id = 'replay-btn';
    replayBtn.addEventListener('click', () => location.reload());
    document.body.appendChild(replayBtn);

    // black panther meme — small, tucked in bottom corner
    const panther = document.createElement('img');
    panther.src = 'blackpanther.png';
    panther.className = 'panther-meme';
    document.body.appendChild(panther);
}

document.addEventListener('click', (e) => {
    const photo = document.getElementById('krit-photo');
    if (!photo) return;

    if (e.target === photo && !photo.classList.contains('zoomed')) {
        const popup = document.getElementById('gift-popup-blue');
        const birthdayText = document.getElementById('krit-birthday-text');

        const backdrop = document.createElement('div');
        backdrop.id = 'krit-zoom-backdrop';
        document.body.appendChild(backdrop);
        // Move photo to body so it escapes the popup's stacking context
        document.body.appendChild(photo);
        photo.classList.add('zoomed');

        function closeZoom() {
            photo.classList.remove('zoomed');
            popup.insertBefore(photo, birthdayText);
            backdrop.remove();
            backdrop.removeEventListener('click', closeZoom);
            photo.removeEventListener('click', closeZoom);
        }
        backdrop.addEventListener('click', closeZoom);
        photo.addEventListener('click', closeZoom);
    }
});

cakeTop.addEventListener('click', (e) => {
    if (sliceCount < 2) {
        const rect = cakeTop.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const angle = Math.atan2(e.clientY - centerY, e.clientX - centerX) * (180 / Math.PI) - 90;
        slices[sliceCount].style.transform = `rotate(${angle}deg)`;
        slices[sliceCount].classList.add('show');
        sliceCount++;
    } else {
        cakeTop.style.display = 'none';
        cakeHint.style.display = 'none';
        cakeSliceView.style.display = 'block';
        setTimeout(() => {
            document.getElementById('gift-btn').style.display = 'block';
        }, 1000);

    }
});