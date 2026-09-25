(() => {
  'use strict';
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const SAVE_KEY = 'banana-bazaar-save-v1';
  const WORLD = { w: 1200, h: 720 };
  const products = { banana: { price: 5, color: '#ffd447', label: 'Banane' }, corn: { price: 9, color: '#f5c542', label: 'Mais' } };
  let scale = 1, last = performance.now(), customerId = 0, toastTimer;
  const keys = new Set();
  const touchInput = { x: 0, y: 0 };
  const defaultState = () => ({
    money: 50, pending: 0, total: 0, unlockedCorn: false, stacker: false,
    upgradeLevel: 0, elapsed: 0,
    player: { x: 370, y: 360, speed: 190, capacity: 12, inventory: { banana: 0, corn: 0 } },
    producers: [
      { id: 'banana-tree', x: 210, y: 240, type: 'banana', amount: 0, capacity: 12, timer: 0, interval: 2.2 },
      { id: 'corn-field', x: 210, y: 500, type: 'corn', amount: 0, capacity: 12, timer: 0, interval: 3.5, locked: true }
    ],
    shelves: [
      { id: 'banana-shelf', x: 650, y: 240, type: 'banana', amount: 4, capacity: 10 },
      { id: 'corn-shelf', x: 650, y: 500, type: 'corn', amount: 0, capacity: 10, locked: true }
    ],
    customers: [],
    workers: [{ x: 930, y: 475, task: 'idle', carry: 0, speed: 115 }]
  });
  let state = load();

  function load() { try { const saved = JSON.parse(localStorage.getItem(SAVE_KEY)); if (saved) return Object.assign(defaultState(), saved); } catch (_) {} return defaultState(); }
  function save() { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); }
  function reset() { if (confirm('Cancellare tutti i progressi?')) { localStorage.removeItem(SAVE_KEY); location.reload(); } }
  function resize() { const dpr = Math.min(devicePixelRatio || 1, 2); canvas.width = innerWidth * dpr; canvas.height = innerHeight * dpr; scale = Math.min(innerWidth / WORLD.w, innerHeight / WORLD.h); ctx.setTransform(dpr * scale, 0, 0, dpr * scale, (innerWidth - WORLD.w * scale) / 2, (innerHeight - WORLD.h * scale) / 2); }
  addEventListener('resize', resize); resize();
  addEventListener('keydown', e => { keys.add(e.key.toLowerCase()); if (['arrowup','arrowdown','arrowleft','arrowright',' '].includes(e.key.toLowerCase())) e.preventDefault(); });
  addEventListener('keyup', e => keys.delete(e.key.toLowerCase()));
  addEventListener('beforeunload', save);

  const joystick = document.getElementById('joystick'), stick = document.getElementById('stick');
  function joystickMove(e) { const r = joystick.getBoundingClientRect(), max = 35, x = e.clientX - (r.left + r.width / 2), y = e.clientY - (r.top + r.height / 2), len = Math.hypot(x, y) || 1, k = Math.min(max / len, 1); touchInput.x = x / len * k; touchInput.y = y / len * k; stick.style.transform = `translate(${touchInput.x * max}px,${touchInput.y * max}px)`; }
  joystick.addEventListener('pointermove', joystickMove); joystick.addEventListener('pointerdown', e => { joystick.setPointerCapture(e.pointerId); joystickMove(e); });
  joystick.addEventListener('pointerup', () => { touchInput.x = touchInput.y = 0; stick.style.transform = ''; });

  function notify(text) { const el = document.getElementById('toast'); el.textContent = text; el.classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove('show'), 2200); }
  function distance(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }
  function totalInventory() { return state.player.inventory.banana + state.player.inventory.corn; }
  function near(a, b, radius) { return distance(a, b) < radius; }
  function moveTowards(obj, target, speed, dt) { const dx = target.x - obj.x, dy = target.y - obj.y, d = Math.hypot(dx, dy); if (d < speed * dt) { obj.x = target.x; obj.y = target.y; return true; } obj.x += dx / d * speed * dt; obj.y += dy / d * speed * dt; return false; }

  function update(dt) {
    state.elapsed += dt;
    const p = state.player;
    let x = 0, y = 0;
    if (keys.has('a') || keys.has('arrowleft')) x--; if (keys.has('d') || keys.has('arrowright')) x++; if (keys.has('w') || keys.has('arrowup')) y--; if (keys.has('s') || keys.has('arrowdown')) y++;
    x += touchInput.x; y += touchInput.y; const len = Math.hypot(x, y) || 1;
    p.x = Math.max(35, Math.min(WORLD.w - 35, p.x + x / len * p.speed * dt)); p.y = Math.max(70, Math.min(WORLD.h - 35, p.y + y / len * p.speed * dt));
    for (const producer of state.producers) { if (producer.locked && !state.unlockedCorn) continue; producer.timer += dt; if (producer.timer >= producer.interval) { producer.timer = 0; producer.amount = Math.min(producer.capacity, producer.amount + 1); } if (near(p, producer, 62) && producer.amount && totalInventory() < p.capacity) { const n = Math.min(producer.amount, p.capacity - totalInventory()); producer.amount -= n; p.inventory[producer.type] += n; } }
    for (const shelf of state.shelves) { if (shelf.locked && !state.unlockedCorn) continue; if (near(p, shelf, 72)) { const n = Math.min(p.inventory[shelf.type], shelf.capacity - shelf.amount); shelf.amount += n; p.inventory[shelf.type] -= n; } }
    if (near(p, { x: 930, y: 535 }, 78) && state.pending) { p.money += state.pending; state.pending = 0; notify('Hai raccolto il denaro dalla cassa!'); }
    updateCustomers(dt); updateWorker(dt); spawnCustomers();
    if (Math.floor(state.elapsed) % 4 === 0) save();
    updateUI();
  }

  function spawnCustomers() { if (state.customers.length < 7 && Math.random() < 0.012) state.customers.push({ id: ++customerId, x: 1120, y: 380, state: 'shelf', target: null, type: state.unlockedCorn && Math.random() > .45 ? 'corn' : 'banana', wait: 0 }); }
  function updateCustomers(dt) {
    for (let i = state.customers.length - 1; i >= 0; i--) { const c = state.customers[i]; const shelf = state.shelves.find(s => s.type === c.type && !s.locked && s.amount > 0);
      if (c.state === 'shelf') { if (!shelf) { c.state = 'leave'; } else { c.target = shelf; if (moveTowards(c, { x: shelf.x + 58, y: shelf.y }, 78, dt)) { shelf.amount--; c.state = 'cash'; c.wait = 0; } } }
      else if (c.state === 'cash') { if (moveTowards(c, { x: 930, y: 535 }, 82, dt)) { c.wait += dt; if (c.wait > .55) { state.pending += products[c.type].price; state.total += products[c.type].price; c.state = 'leave'; } } }
      else if (c.state === 'leave' && moveTowards(c, { x: 1160, y: 380 }, 90, dt)) state.customers.splice(i, 1);
    }
  }
  function updateWorker(dt) { if (!state.stacker) return; const w = state.workers[0], targetShelf = state.shelves.find(s => !s.locked && s.amount < s.capacity * .45), producer = state.producers.find(p => !p.locked && p.amount > 0); let target = targetShelf || producer;
    if (!target) return; if (w.task === 'idle') w.task = targetShelf ? 'shelf' : 'producer'; if (w.task === 'shelf') { if (moveTowards(w, targetShelf, w.speed, dt)) { const n = Math.min(3, state.player.capacity, targetShelf.capacity - targetShelf.amount); targetShelf.amount += n; w.task = 'producer'; } } else if (producer && moveTowards(w, producer, w.speed, dt)) { const shelf = state.shelves.find(s => s.type === producer.type && !s.locked && s.amount < s.capacity); if (shelf) { shelf.amount += Math.min(producer.amount, shelf.capacity - shelf.amount, 3); producer.amount -= Math.min(producer.amount, 3); } w.task = 'idle'; }
  }

  function draw() { ctx.clearRect(0, 0, WORLD.w, WORLD.h); ctx.fillStyle = '#83c96b'; ctx.fillRect(0, 0, WORLD.w, WORLD.h); drawWorld(); for (const producer of state.producers) if (!producer.locked || state.unlockedCorn) drawProducer(producer); for (const shelf of state.shelves) if (!shelf.locked || state.unlockedCorn) drawShelf(shelf); drawRegister(); for (const c of state.customers) drawCharacter(c, '#f2b35b'); if (state.stacker) drawCharacter(state.workers[0], '#a96de8'); drawCharacter(state.player, '#3d6de8'); }
  function drawWorld() { ctx.fillStyle = '#6cac54'; ctx.fillRect(35, 95, 1130, 560); ctx.fillStyle = '#d4b36a'; ctx.fillRect(50, 110, 1080, 520); ctx.fillStyle = '#c9a25d'; for (let x=70;x<1120;x+=80) { ctx.fillRect(x, 125, 2, 490); } ctx.fillStyle = '#7b543d'; ctx.fillRect(875, 450, 110, 145); ctx.fillStyle = '#f0cf84'; ctx.font = 'bold 18px system-ui'; ctx.fillText('CASSA', 900, 440); ctx.fillStyle = '#244c35'; ctx.font = 'bold 16px system-ui'; ctx.fillText('PRODUZIONE', 135, 125); ctx.fillText('SCAFFALI', 595, 125); }
  function drawProducer(o) { ctx.fillStyle = products[o.type].color; ctx.beginPath(); ctx.arc(o.x, o.y, 36, 0, Math.PI*2); ctx.fill(); ctx.fillStyle = '#4a9c52'; ctx.fillRect(o.x-7,o.y+25,14,30); ctx.fillStyle='#fff'; ctx.font='bold 15px system-ui'; ctx.fillText(products[o.type].label, o.x-34, o.y+78); ctx.fillText(`${o.amount}/${o.capacity}`, o.x-18, o.y-45); }
  function drawShelf(o) { ctx.fillStyle='#8a5536'; ctx.fillRect(o.x-52,o.y-28,104,56); ctx.fillStyle=products[o.type].color; for(let i=0;i<o.amount;i++) { ctx.beginPath(); ctx.arc(o.x-38+(i%5)*19,o.y-9+Math.floor(i/5)*18,6,0,Math.PI*2);ctx.fill(); } ctx.fillStyle='#fff';ctx.font='bold 14px system-ui';ctx.fillText(`${products[o.type].label} ${o.amount}/${o.capacity}`,o.x-53,o.y+48); }
  function drawRegister() { ctx.fillStyle='#51417c';ctx.fillRect(890,490,80,55);ctx.fillStyle='#fff';ctx.font='bold 14px system-ui';ctx.fillText('💵 '+state.pending,900,520); }
  function drawCharacter(o, color) { ctx.fillStyle=color; ctx.beginPath();ctx.arc(o.x,o.y-12,12,0,Math.PI*2);ctx.fill();ctx.fillRect(o.x-11,o.y,22,25); }

  function updateUI() { document.getElementById('money').textContent = Math.floor(state.money); document.getElementById('pending').textContent = Math.floor(state.pending); document.getElementById('inventory').textContent = `${totalInventory()}/${state.player.capacity}`; const corn = document.getElementById('unlock-corn'); corn.disabled = state.unlockedCorn || state.money < 100; corn.textContent = state.unlockedCorn ? 'Mais sbloccato ✓' : 'Sblocca mais · 100'; const hire = document.getElementById('hire-stacker'); hire.disabled = state.stacker || state.money < 250; hire.textContent = state.stacker ? 'Rifornitore assunto ✓' : 'Assumi rifornitore · 250'; const cost = 150 + state.upgradeLevel * 100; document.getElementById('upgrade-cost').textContent = cost; document.getElementById('upgrade').disabled = state.money < cost; }
  document.getElementById('unlock-corn').onclick = () => { if (!state.unlockedCorn && state.money >= 100) { state.money -= 100; state.unlockedCorn = true; state.producers[1].locked = false; state.shelves[1].locked = false; notify('Nuova area Mais sbloccata!'); save(); } };
  document.getElementById('hire-stacker').onclick = () => { if (!state.stacker && state.money >= 250) { state.money -= 250; state.stacker = true; notify('Rifornitore assunto!'); save(); } };
  document.getElementById('upgrade').onclick = () => { const cost = 150 + state.upgradeLevel * 100; if (state.money >= cost) { state.money -= cost; state.upgradeLevel++; state.player.speed += 25; if (state.stacker) state.workers[0].speed += 20; notify('Velocità migliorata!'); save(); } };
  document.getElementById('reset').onclick = reset;
  function frame(now) { const dt = Math.min((now-last)/1000, .05); last=now; update(dt); draw(); requestAnimationFrame(frame); }
  updateUI(); requestAnimationFrame(frame);
})();
