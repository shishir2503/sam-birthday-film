const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const canvas = document.querySelector('#confetti');
const context = canvas.getContext('2d');
let frame;

function celebrate(origin, count) {
  if (!context || reducedMotion.matches) return;
  cancelAnimationFrame(frame);
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  const scale = Math.min(devicePixelRatio || 1, 2);
  canvas.width = width * scale;
  canvas.height = height * scale;
  context.scale(scale, scale);
  const colors = ['#ff9cc2', '#ffdfaa', '#fff3eb', '#ca9fff', '#ff6d9a'];
  const pieces = Array.from({ length: count }, (_, index) => ({
    x: origin.left + origin.width / 2,
    y: origin.top + origin.height / 2,
    vx: (Math.random() - 0.5) * 850,
    vy: -100 - Math.random() * 480,
    rotation: Math.random() * Math.PI,
    spin: (Math.random() - 0.5) * 14,
    size: 4 + Math.random() * 7,
    color: colors[index % colors.length]
  }));

  const start = performance.now();
  let previous = start;
  function draw(now) {
    const age = (now - start) / 1000;
    const step = Math.min((now - previous) / 1000, 0.04);
    previous = now;
    context.clearRect(0, 0, width, height);
    if (age >= 2.1 || reducedMotion.matches) return;
    context.globalAlpha = Math.min(1, (2.1 - age) * 2);
    for (const piece of pieces) {
      piece.vy += 520 * step;
      piece.x += piece.vx * step;
      piece.y += piece.vy * step;
      piece.rotation += piece.spin * step;
      context.save();
      context.translate(piece.x, piece.y);
      context.rotate(piece.rotation);
      context.fillStyle = piece.color;
      context.fillRect(-piece.size / 2, -piece.size / 2, piece.size, piece.size * 0.58);
      context.restore();
    }
    frame = requestAnimationFrame(draw);
  }
  frame = requestAnimationFrame(draw);
}


const scenes = [...document.querySelectorAll('.scene')];
const nav = document.querySelector('.film-nav');
const back = document.querySelector('#back');
const counter = document.querySelector('#counter');
const progress = document.querySelector('#progress');
const shutter = document.querySelector('.shutter');
const cake = document.querySelector('.cake');
const wish = document.querySelector('#wish');
const sound = document.querySelector('#sound');
const chapterNames = ['Opening', 'Little moments', 'Stadium memory', 'Favorite frame', 'Birthday wish', 'Love note'];
let current = 0;
let changing = false;
let revealed = false;
let soundEnabled = false;
let audio;
let volume;
let musicTimer;
let bar = 0;

function note(midi, start, duration, loudness, type = 'sine') {
  const voice = audio.createOscillator();
  const envelope = audio.createGain();
  voice.type = type;
  voice.frequency.value = 440 * 2 ** ((midi - 69) / 12);
  envelope.gain.setValueAtTime(0.0001, start);
  envelope.gain.exponentialRampToValueAtTime(loudness, start + 0.045);
  envelope.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  voice.connect(envelope).connect(volume);
  voice.start(start);
  voice.stop(start + duration + 0.03);
}

function playBar() {
  const chords = [[48,55,60,64],[45,52,57,60],[41,48,53,57],[43,50,55,62]];
  const chord = chords[bar++ % chords.length];
  const time = audio.currentTime + 0.04;
  note(chord[0], time, 2.6, 0.10);
  [1,2,3,2,1,3].forEach((degree, index) => {
    note(chord[degree] + 12, time + index * 0.42, 1.35, 0.065, 'triangle');
  });
}

function setSound(enabled) {
  if (!enabled) {
    soundEnabled = false;
    clearInterval(musicTimer);
    if (volume) volume.gain.setTargetAtTime(0, audio.currentTime, 0.04);
  } else {
    const Audio = window.AudioContext || window.webkitAudioContext;
    if (!Audio) return;
    try {
      if (!audio) {
        audio = new Audio();
        volume = audio.createGain();
        volume.gain.value = 0;
        volume.connect(audio.destination);
      }
      soundEnabled = true;
      audio.resume().then(() => {
        if (!soundEnabled) return;
        volume.gain.setTargetAtTime(0.45, audio.currentTime, 0.06);
        clearInterval(musicTimer);
        playBar();
        musicTimer = setInterval(playBar, 2520);
      }).catch(() => setSound(false));
    } catch {
      return;
    }
  }
  sound.textContent = soundEnabled ? '♪ Sound on' : '♪ Sound off';
  sound.setAttribute('aria-pressed', String(soundEnabled));
}

function chime(finale = false) {
  if (!soundEnabled || audio.state !== 'running') return;
  const time = audio.currentTime;
  const notes = finale ? [72, 76, 79, 84] : [69, 76];
  notes.forEach((pitch, index) => note(pitch, time + index * 0.095, 0.85, 0.09));
}

const chapterButtons = chapterNames.map((name, index) => {
  const button = document.createElement('button');
  button.type = 'button';
  button.setAttribute('aria-label', name);
  button.addEventListener('click', () => go(index));
  progress.append(button);
  return button;
});

function updateNav() {
  nav.hidden = current === 0;
  back.disabled = changing || current === 0;
  counter.textContent = (current + 1) + ' / ' + scenes.length;
  chapterButtons.forEach((button, index) => {
    button.disabled = changing || (index === scenes.length - 1 && !revealed);
    if (index === current) button.setAttribute('aria-current', 'step');
    else button.removeAttribute('aria-current');
  });
}

function go(index, fromWish = false) {
  if (changing || index < 0 || index >= scenes.length || index === current) return;
  changing = true;
  updateNav();
  if (!reducedMotion.matches) shutter.className = 'shutter closing';
  if (!fromWish) chime();
  setTimeout(() => {
    scenes[current].hidden = true;
    current = index;
    scenes[current].hidden = false;
    if (current === 0) revealed = false;
    if (current === 4) {
      cake.classList.remove('out');
      wish.disabled = false;
    }
    window.scrollTo(0, 0);
    scenes[current].querySelector('h1,h2').focus({ preventScroll: true });
    if (!reducedMotion.matches) shutter.className = 'shutter opening';
    if (fromWish) {
      const origin = scenes[current].querySelector('h2').getBoundingClientRect();
      celebrate(origin, 135);
    }
    setTimeout(() => {
      shutter.className = 'shutter';
      changing = false;
      updateNav();
    }, reducedMotion.matches ? 0 : 520);
  }, reducedMotion.matches ? 0 : 280);
}

for (const button of document.querySelectorAll('[data-next]')) {
  button.addEventListener('click', () => {
    if (changing) return;
    if (current === 0 && sound.dataset.chosen !== 'true') setSound(true);
    go(current + 1);
  });
}
sound.addEventListener('click', () => {
  sound.dataset.chosen = 'true';
  setSound(!soundEnabled);
});
back.addEventListener('click', () => go(current - 1));
wish.addEventListener('click', () => {
  if (changing) return;
  wish.disabled = true;
  cake.classList.add('out');
  changing = true;
  updateNav();
  chime(true);
  setTimeout(() => {
    changing = false;
    revealed = true;
    go(5, true);
  }, reducedMotion.matches ? 0 : 650);
});
document.querySelector('#replay').addEventListener('click', () => go(0));
updateNav();
