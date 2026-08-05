(() => {
  'use strict';

  const ALPHABET = [...'АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ'];
  const HARD_LETTERS = new Set(['Й', 'Ъ', 'Ы', 'Ь', 'Э']);
  const EASY_ALPHABET = ALPHABET.filter((letter) => !HARD_LETTERS.has(letter));
  const LEVEL_COUNTS = [5, 10, 15, 20, 25, 30, 33];
  const LEVEL_NAMES = ['Звёздный сад', 'Море пузырьков', 'Цветочная поляна', 'Облачный город', 'Конфетная долина', 'Долина динозавров', 'Радужный финал'];
  const WORD_CARDS = {
    А: ['Арбуз', '🍉'], Б: ['Бабочка', '🦋'], В: ['Вулкан', '🌋'], Г: ['Гриб', '🍄'], Д: ['Динозавр', '🦖'], Е: ['Енот', '🦝'], Ё: ['Ёж', '🦔'],
    Ж: ['Жираф', '🦒'], З: ['Зонт', '☂️'], И: ['Иголка', '🪡'], Й: ['Йогурт', '🥛'], К: ['Кот', '🐱'], Л: ['Лимон', '🍋'], М: ['Мяч', '⚽'],
    Н: ['Носорог', '🦏'], О: ['Облако', '☁️'], П: ['Панда', '🐼'], Р: ['Радуга', '🌈'], С: ['Солнце', '☀️'], Т: ['Тигр', '🐯'], У: ['Улитка', '🐌'],
    Ф: ['Фламинго', '🦩'], Х: ['Хомяк', '🐹'], Ц: ['Цветок', '🌼'], Ч: ['Черепаха', '🐢'], Ш: ['Шар', '🎈'], Щ: ['Щётка', '🪥'], Ъ: ['Твёрдый знак', '🧱'],
    Ы: ['Звук Ы', '🔊'], Ь: ['Мягкий знак', '🌿'], Э: ['Экскаватор', '🚜'], Ю: ['Юла', '🪀'], Я: ['Яблоко', '🍎']
  };
  const KEY_ROWS = ['Ё Й Ц У К Е Н Г Ш Щ З Х Ъ', 'Ф Ы В А П Р О Л Д Ж Э', 'Я Ч С М И Т Ь Б Ю'];
  const PHYSICAL_LAYOUT = {
    Backquote: 'Ё', KeyQ: 'Й', KeyW: 'Ц', KeyE: 'У', KeyR: 'К', KeyT: 'Е', KeyY: 'Н', KeyU: 'Г', KeyI: 'Ш', KeyO: 'Щ', KeyP: 'З', BracketLeft: 'Х', BracketRight: 'Ъ',
    KeyA: 'Ф', KeyS: 'Ы', KeyD: 'В', KeyF: 'А', KeyG: 'П', KeyH: 'Р', KeyJ: 'О', KeyK: 'Л', KeyL: 'Д', Semicolon: 'Ж', Quote: 'Э',
    KeyZ: 'Я', KeyX: 'Ч', KeyC: 'С', KeyV: 'М', KeyB: 'И', KeyN: 'Т', KeyM: 'Ь', Comma: 'Б', Period: 'Ю'
  };

  const fallingField = document.querySelector('#fallingField');
  const playArea = document.querySelector('#playArea');
  const keyboard = document.querySelector('#keyboard');
  const levelButtons = [...document.querySelectorAll('.level-button')];
  const levelLabel = document.querySelector('#levelLabel');
  const progressCount = document.querySelector('#progressCount');
  const progressBar = document.querySelector('#progressBar');
  const sceneLabel = document.querySelector('#sceneLabel');
  const sceneArt = document.querySelector('#sceneArt');
  const feedback = document.querySelector('#feedback');
  const speedRange = document.querySelector('#speedRange');
  const speedValue = document.querySelector('#speedValue');
  const keyboardToggle = document.querySelector('#keyboardToggle');
  const hintValue = document.querySelector('#hintValue');
  const lettersMode = document.querySelector('#lettersMode');
  const cardsMode = document.querySelector('#cardsMode');
  const modeHint = document.querySelector('#modeHint');
  const restartButton = document.querySelector('#restartButton');
  const helpButton = document.querySelector('#helpButton');
  const modalBackdrop = document.querySelector('#modalBackdrop');
  const modalClose = document.querySelector('#modalClose');
  const modalOk = document.querySelector('#modalOk');
  const modalTitle = document.querySelector('#modalTitle');
  const modalText = document.querySelector('#modalText');
  const modalIcon = document.querySelector('#modalIcon');
  const modalEyebrow = document.querySelector('#modalEyebrow');
  const modalActions = document.querySelector('#modalActions');

  const state = {
    level: 0,
    letters: [],
    active: [],
    caught: 0,
    caughtLetters: new Set(),
    raf: 0,
    lastTime: 0,
    nextId: 1,
    feedbackTimer: 0,
    audioContext: null,
    mode: 'letters',
    playing: true
  };

  function randomItem(items) {
    return items[Math.floor(Math.random() * items.length)];
  }

  function shuffled(items) {
    const copy = [...items];
    for (let i = copy.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  function lettersForLevel(levelIndex) {
    const count = LEVEL_COUNTS[levelIndex];
    const source = levelIndex < 5 ? EASY_ALPHABET : levelIndex === 5 ? ALPHABET.filter((letter) => letter !== 'Ъ') : ALPHABET;
    return shuffled(source).slice(0, count);
  }

  function createKeyboard() {
    KEY_ROWS.forEach((rowLetters, rowIndex) => {
      const row = document.createElement('div');
      row.className = `keyboard-row row-${rowIndex + 1}`;
      rowLetters.split(' ').forEach((letter) => {
        const key = document.createElement('div');
        key.className = 'key';
        key.dataset.letter = letter;
        key.textContent = letter;
        key.setAttribute('aria-label', `Клавиша ${letter}`);
        row.append(key);
      });
      keyboard.append(row);
    });
  }

  function updateKeyboard() {
    const activeLetters = new Set(state.active.map((item) => item.letter));
    keyboard.querySelectorAll('.key').forEach((key) => {
      key.classList.toggle('is-target', activeLetters.has(key.dataset.letter));
    });
  }

  function updateProgress() {
    const total = LEVEL_COUNTS[state.level];
    levelLabel.textContent = `Уровень ${state.level + 1}`;
    progressCount.textContent = `${state.caught} / ${total}`;
    progressBar.style.width = `${(state.caught / total) * 100}%`;
    levelButtons.forEach((button, index) => button.classList.toggle('is-selected', index === state.level));
  }

  function setScene(levelIndex) {
    document.body.dataset.scene = String(levelIndex);
    sceneLabel.textContent = LEVEL_NAMES[levelIndex];
    sceneArt.dataset.level = String(levelIndex);
  }

  function showFeedback(message, type = 'correct') {
    window.clearTimeout(state.feedbackTimer);
    feedback.textContent = message;
    feedback.className = `feedback is-visible${type === 'miss' ? ' is-miss' : ''}`;
    state.feedbackTimer = window.setTimeout(() => feedback.classList.remove('is-visible'), 750);
  }

  function getAudioContext() {
    if (!state.audioContext) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return null;
      state.audioContext = new AudioContext();
    }
    if (state.audioContext.state === 'suspended') state.audioContext.resume();
    return state.audioContext;
  }

  function tone(frequency, duration, type = 'sine', volume = .045, delay = 0) {
    const context = getAudioContext();
    if (!context) return;
    const start = context.currentTime + delay;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, start);
    gain.gain.setValueAtTime(.001, start);
    gain.gain.exponentialRampToValueAtTime(volume, start + .015);
    gain.gain.exponentialRampToValueAtTime(.001, start + duration);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start(start);
    oscillator.stop(start + duration + .02);
  }

  function playSound(sound) {
    if (sound === 'correct') tone(630, .12, 'sine', .045);
    if (sound === 'miss') tone(180, .16, 'triangle', .032);
    if (sound === 'click') tone(420, .06, 'sine', .022);
    if (sound === 'win') {
      tone(520, .14, 'sine', .045);
      tone(660, .14, 'sine', .045, .11);
      tone(790, .25, 'sine', .05, .22);
    }
  }

  function maxActiveLetters() {
    if (state.mode === 'cards') return window.innerWidth < 600 ? 1 : 2;
    return window.innerWidth < 600 ? 2 : 3;
  }

  function spawnLetter() {
    const remaining = state.letters.filter((letter) => !state.caughtLetters.has(letter) && !state.active.some((item) => item.letter === letter));
    if (!remaining.length || !state.playing) return;
    const letter = randomItem(remaining);
    const element = document.createElement('div');
    const isCard = state.mode === 'cards';
    const card = WORD_CARDS[letter];
    element.className = `falling-letter${isCard ? ' picture-card' : ''}`;
    if (isCard) {
      element.innerHTML = `<span class="card-letter-badge">${letter}</span><span class="card-picture">${card[1]}</span><span class="card-word">${card[0]}</span>`;
      element.setAttribute('aria-label', `${letter} — ${card[0]}`);
    } else {
      element.textContent = letter;
      element.setAttribute('aria-label', `Падающая буква ${letter}`);
    }
    fallingField.append(element);
    const width = isCard ? 126 : 76;
    const height = isCard ? 118 : 76;
    const item = {
      id: state.nextId++,
      letter,
      element,
      width,
      height,
      y: -height - Math.random() * 80,
      x: 8 + Math.random() * 82,
      drift: (Math.random() - .5) * 2.8,
      rotation: (Math.random() - .5) * 7
    };
    state.active.push(item);
    drawLetter(item);
  }

  function drawLetter(item) {
    item.element.style.left = `calc(${item.x}% - ${item.width / 2}px)`;
    item.element.style.transform = `translateY(${item.y}px) rotate(${item.rotation}deg)`;
  }

  function removeLetter(item) {
    item.element.remove();
    state.active = state.active.filter((activeItem) => activeItem.id !== item.id);
  }

  function fillField() {
    while (state.active.length < maxActiveLetters() && state.active.length + state.caught < state.letters.length) spawnLetter();
    updateKeyboard();
  }

  function animate(timestamp) {
    if (!state.playing) return;
    if (!state.lastTime) state.lastTime = timestamp;
    const delta = Math.min((timestamp - state.lastTime) / 1000, .05);
    state.lastTime = timestamp;
    const speed = Number(speedRange.value);
    const fieldHeight = fallingField.clientHeight;
    state.active.forEach((item) => {
      item.y += speed * delta;
      item.x += item.drift * delta;
      if (item.x < 6 || item.x > 94) item.drift *= -1;
      item.rotation += item.drift * delta * .7;
      if (item.y > fieldHeight - item.height) {
        item.y = -item.height - Math.random() * 50;
        item.x = 8 + Math.random() * 82;
        playSound('miss');
        showFeedback('Поймай ещё раз!', 'miss');
        item.element.classList.remove('is-shaking');
        void item.element.offsetWidth;
        item.element.classList.add('is-shaking');
      }
      drawLetter(item);
    });
    state.raf = requestAnimationFrame(animate);
  }

  function startAnimation() {
    cancelAnimationFrame(state.raf);
    state.lastTime = 0;
    state.playing = true;
    state.raf = requestAnimationFrame(animate);
  }

  function startLevel(levelIndex) {
    state.level = levelIndex;
    state.letters = lettersForLevel(levelIndex);
    state.caught = 0;
    state.caughtLetters = new Set();
    state.playing = true;
    state.active.forEach((item) => item.element.remove());
    state.active = [];
    updateProgress();
    setScene(levelIndex);
    closeModal();
    fillField();
    startAnimation();
    showFeedback('Поехали!', 'correct');
    playSound('click');
  }

  function handleCharacter(character) {
    const letter = String(character).toUpperCase();
    if (!state.playing || !ALPHABET.includes(letter)) return;
    const item = state.active.find((activeItem) => activeItem.letter === letter);
    const key = keyboard.querySelector(`[data-letter="${letter}"]`);
    if (!item) {
      if (key) {
        key.classList.remove('is-pressed');
        void key.offsetWidth;
        key.classList.add('is-pressed');
        window.setTimeout(() => key.classList.remove('is-pressed'), 130);
      }
      return;
    }
    removeLetter(item);
    state.caughtLetters.add(letter);
    state.caught += 1;
    playSound('correct');
    showFeedback('Отлично!', 'correct');
    if (key) {
      key.classList.remove('is-pressed');
      void key.offsetWidth;
      key.classList.add('is-pressed');
      window.setTimeout(() => key.classList.remove('is-pressed'), 130);
    }
    updateProgress();
    if (state.caught >= state.letters.length) {
      finishLevel();
      return;
    }
    fillField();
  }

  function finishLevel() {
    state.playing = false;
    cancelAnimationFrame(state.raf);
    state.active.forEach((item) => item.element.remove());
    state.active = [];
    updateKeyboard();
    playSound('win');
    window.setTimeout(() => {
      const isFinal = state.level === LEVEL_COUNTS.length - 1;
      openResultModal(isFinal);
    }, 280);
  }

  function openHelpModal() {
    modalIcon.textContent = '✦';
    modalEyebrow.textContent = 'МАЛЕНЬКАЯ ПОДСКАЗКА';
    modalTitle.textContent = 'Как играть';
    modalText.textContent = 'Лови падающую букву нажатием на настоящую клавишу или на клавишу на экране. Если буква упадёт вниз, она начнёт свой полёт заново.';
    modalActions.innerHTML = '<button class="primary-button" id="modalOk" type="button">Понятно!</button>';
    modalActions.querySelector('#modalOk').addEventListener('click', closeModal);
    modalBackdrop.hidden = false;
  }

  function openResultModal(isFinal) {
    modalIcon.textContent = isFinal ? '🌈' : '★';
    modalEyebrow.textContent = isFinal ? 'ТЫ СОБРАЛ ВЕСЬ АЛФАВИТ' : `УРОВЕНЬ ${state.level + 1} ПРОЙДЕН`;
    modalTitle.textContent = isFinal ? 'Буквенный герой!' : 'Ура, получилось!';
    modalText.textContent = isFinal ? 'Ты поймал все 33 русские буквы. Теперь можно повторить любимый уровень или попробовать другой режим.' : `Ты поймал все ${state.letters.length} букв. Готов к следующему приключению?`;
    const nextButton = isFinal ? '' : `<button class="primary-button" id="nextLevelButton" type="button">Следующий уровень</button>`;
    modalActions.innerHTML = `${nextButton}<button class="secondary-button" id="repeatLevelButton" type="button">Повторить</button>`;
    modalActions.querySelector('#repeatLevelButton').addEventListener('click', () => startLevel(state.level));
    if (!isFinal) modalActions.querySelector('#nextLevelButton').addEventListener('click', () => startLevel(state.level + 1));
    modalBackdrop.hidden = false;
  }

  function closeModal() { modalBackdrop.hidden = true; }

  function characterFromKey(event) {
    const direct = event.key && event.key.length === 1 ? event.key.toUpperCase() : '';
    if (ALPHABET.includes(direct)) return direct;
    return PHYSICAL_LAYOUT[event.code] || '';
  }

  function updateSpeedLabel() {
    const speed = Number(speedRange.value);
    speedValue.textContent = speed < 27 ? 'очень спокойно' : speed < 40 ? 'спокойно' : 'бодрее';
  }

  function updateKeyboardVisibility() {
    const visible = keyboardToggle.checked;
    document.body.classList.toggle('keyboard-hidden', !visible);
    hintValue.textContent = visible ? 'включена' : 'скрыта';
  }

  function setMode(mode) {
    state.mode = mode;
    const cards = mode === 'cards';
    lettersMode.classList.toggle('is-selected', !cards);
    cardsMode.classList.toggle('is-selected', cards);
    modeHint.textContent = cards ? 'Узнай слово по картинке и поймай его букву.' : 'Сначала поймай саму букву.';
    startLevel(state.level);
  }

  levelButtons.forEach((button) => button.addEventListener('click', () => startLevel(Number(button.dataset.level))));
  restartButton.addEventListener('click', () => startLevel(state.level));
  helpButton.addEventListener('click', openHelpModal);
  modalClose.addEventListener('click', closeModal);
  modalOk.addEventListener('click', closeModal);
  modalBackdrop.addEventListener('click', (event) => { if (event.target === modalBackdrop) closeModal(); });
  speedRange.addEventListener('input', updateSpeedLabel);
  keyboardToggle.addEventListener('change', updateKeyboardVisibility);
  lettersMode.addEventListener('click', () => setMode('letters'));
  cardsMode.addEventListener('click', () => setMode('cards'));
  window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') { closeModal(); return; }
    const character = characterFromKey(event);
    if (!character) return;
    event.preventDefault();
    handleCharacter(character);
  });

  createKeyboard();
  updateSpeedLabel();
  updateKeyboardVisibility();
  startLevel(0);
})();
