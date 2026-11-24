const motion = matchMedia('(prefers-reduced-motion: reduce)');
const get = (id) => document.getElementById(id);
const cover = get('cover');
const chapter = get('chapter');
const ending = get('ending');
const frames = get('frames');
const nav = get('nav');
const back = get('back');
const next = get('next');
const flash = get('flash');
const sound = get('sound');
const viewer = get('viewer');

const memories = [
  {
    title: 'The camera roll classics',
    note: 'The random photos are usually the first ones I send back to you. Thanks for being the kind of friend I can look completely ridiculous around.',
    captions: ['An outdoor selfie', 'The sunglasses selfie', 'A smile by the brick wall', 'The filter was a choice', 'An extremely serious portrait']
  },
  {
    title: 'Match day',
    note: 'Blue jerseys, a packed stadium, and about a dozen attempts at getting both of us in the frame. I’d happily do the whole match day again.',
    captions: ['Blue jerseys in the stands', 'A view of the pitch', 'Cheering from the stands', 'The ground under floodlights']
  },
  {
    title: 'Out and about',
    note: 'A walk, a stop for photos, and something new to point at around the next corner. You make a regular day out feel worth putting in the camera roll.',
    captions: ['A selfie by the entrance', 'A walk between the towers', 'Meeting a curious fish', 'Another sunglasses cameo']
  },
  {
    title: 'The scenic route',
    note: 'A bit of rain makes for a surprisingly good story when you’ve got the right company. That umbrella deserves a thank-you of its own.',
    captions: ['The road through the trees', 'One umbrella, two people', 'A photo on the wet road', 'The path lined with palms']
  },
  {
    title: 'Under the lights',
    note: 'I like how much of the evening you can see in these frames. Everywhere we looked, there was something bright enough to stop and take a photo.',
    captions: ['Among the decorations', 'A photo at the festivities', 'A selfie under the lights', 'One more with the festival backdrop']
  },
  {
    title: 'The ones worth keeping',
    note: 'A sunset, a roadside photo, and a table full of familiar faces. Looking at them makes me want to plan another day out already.',
    captions: ['The sky just before dark', 'One more by the blue railing', 'A quick roadside stop', 'Around the table with friends']
  }
];
let photoNumber = 2;
for (const memory of memories) {
  memory.photos = memory.captions.map(caption => ({
    src: 'photos/' + String(photoNumber++).padStart(2, '0') + '.jpg',
    caption
  }));
}

let current = -1;
let currentPhoto = 0;
let changing = false;
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
  const chords = [[50,57,62,66],[47,54,59,62],[43,50,55,59],[45,52,57,61]];
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


const dots = [...memories.map(memory => memory.title), 'Birthday note'].map((name, index) => {
  const button = document.createElement('button');
  button.type = 'button';
  button.setAttribute('aria-label', name);
  button.addEventListener('click', () => go(index));
  get('dots').append(button);
  return button;
});

function showPhoto(index) {
  const photos = memories[current].photos;
  currentPhoto = (index + photos.length) % photos.length;
  const { src, caption } = photos[currentPhoto];
  get('full-photo').src = src;
  get('full-photo').alt = caption;
  get('photo-caption').textContent = caption + ' · ' + (currentPhoto + 1) + ' / ' + photos.length;
}

function renderMemory(memory) {
  get('chapter-label').textContent = 'MEMORY ' + String(current + 1).padStart(2, '0');
  get('chapter-title').textContent = memory.title;
  get('chapter-note').textContent = memory.note;
  next.textContent = current === memories.length - 1 ? 'Read the birthday note' : 'Next memory';
  frames.replaceChildren(...memory.photos.map(({src, caption}, index) => {
    const button = document.createElement('button');
    const image = document.createElement('img');
    const text = document.createElement('span');
    button.type = 'button';
    button.className = 'frame';
    button.style.setProperty('--delay', (index * 85 + 100) + 'ms');
    image.src = src;
    image.alt = '';
    image.decoding = 'async';
    text.textContent = caption;
    button.append(image, text);
    button.addEventListener('click', () => {
      showPhoto(index);
      viewer.showModal();
    });
    return button;
  }));
}

function go(index) {
  if (changing || index === current || index < -1 || index > memories.length) return;
  changing = true;
  if (!motion.matches) flash.className = 'closing';
  chime(index === memories.length);
  setTimeout(() => {
    current = index;
    const scene = index < 0 ? cover : index === memories.length ? ending : chapter;
    if (scene === chapter) renderMemory(memories[index]);
    for (const section of [cover, chapter, ending]) section.hidden = section !== scene;
    nav.hidden = scene === cover;
    get('count').textContent = (index + 1) + ' / ' + dots.length;
    dots.forEach((dot, position) => {
      if (position === index) dot.setAttribute('aria-current', 'step');
      else dot.removeAttribute('aria-current');
    });
    window.scrollTo(0, 0);
    scene.querySelector('h1,h2').focus({ preventScroll: true });
    if (!motion.matches) flash.className = 'opening';
    setTimeout(() => {
      flash.className = '';
      changing = false;
    }, motion.matches ? 0 : 420);
  }, motion.matches ? 0 : 240);
}

get('start').addEventListener('click', () => {
  if (changing) return;
  if (!sound.dataset.chosen && !soundEnabled) setSound(true);
  go(0);
});
sound.addEventListener('click', () => {
  sound.dataset.chosen = 'true';
  setSound(!soundEnabled);
});
next.addEventListener('click', () => go(current + 1));
back.addEventListener('click', () => go(current - 1));
get('replay').addEventListener('click', () => go(-1));
get('close').addEventListener('click', () => viewer.close());
get('prev-photo').addEventListener('click', () => showPhoto(currentPhoto - 1));
get('next-photo').addEventListener('click', () => showPhoto(currentPhoto + 1));
viewer.addEventListener('keydown', (event) => {
  if (event.key === 'ArrowLeft') showPhoto(currentPhoto - 1);
  if (event.key === 'ArrowRight') showPhoto(currentPhoto + 1);
});
