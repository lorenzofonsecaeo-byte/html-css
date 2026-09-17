// ===================================
// ELEMENTOS DO CRONÔMETRO E SEQUÊNCIA
// ===================================
const displayTempo = document.querySelector('.cronometro h1');
const labelStatus = document.getElementById('label-status');
const btnAlternar = document.querySelector('.btn-alternar');
const btnReiniciar = document.querySelector('.btn-reiniciar');
const circuloProgresso = document.getElementById('circulo-progresso');

const btnModoFoco = document.getElementById('modo-foco');
const btnModoCurto = document.getElementById('modo-curto');
const btnModoLongo = document.getElementById('modo-longo');

// Sequências concluídas
let sequencia = { foco: 0, curto: 0, longo: 0 };

// Configurações padrão
let config = {
  pomodoro: 25,
  shortBreak: 5,
  longBreak: 15,
  longBreakInterval: 4,
  autoStartBreaks: false,
  autoStartPomodoros: false,
  alarmSound: 'bell',
  alarmVolume: 80,
  theme: 'aquarela',
  accentColor: '#ffa500',
  bgImageUrl: '',
  userAge: 8,
  userGender: 'all',
  userBirthday: '',
  timerHours: 0,
  timerMinutes: 5,
  timerSeconds: 0,
  countdownMode: false,
  stopwatchLimit: 0
};

let tempoTotalSegundos = config.pomodoro * 60;
let tempoRestanteMS = tempoTotalSegundos * 1000;
let cronometroIntervalo = null;
let ultimaAtualizacao = null;
let modoAtual = 'foco';
let cronometroDirection = 'up'; // 'up' for stopwatch, 'down' for countdown
let cronometroOffsetMs = 0; // elapsed (for up) or remaining base (for down)

function getCoresModo() {
  return {
    foco: config.accentColor || '#ffa500',
    curto: '#28a745',
    longo: '#007bff',
    temporizador: '#9333ea',
    cronometro: '#ea00ff'
  };
}

// ===================================
// LÓGICA DO CRONÔMETRO
// ===================================
const PERIMETRO_CIRCULO = 2 * Math.PI * 215;

function atualizarTela() {
  if (!displayTempo) return;

  const coresModo = getCoresModo();
  const corAtiva = coresModo[modoAtual] || coresModo.foco;

  if (cronometroDirection === 'up') {
    const elapsedSeg = Math.ceil(tempoRestanteMS / 1000);
    const minutos = Math.floor(elapsedSeg / 60);
    const segundos = elapsedSeg % 60;
    displayTempo.textContent = `${String(minutos).padStart(2, '0')}:${String(segundos).padStart(2, '0')}`;
    // progress ring fills from center outward; just show full ring
    if (circuloProgresso) {
      circuloProgresso.style.strokeDashoffset = 0;
      circuloProgresso.style.stroke = corAtiva;
    }
  } else {
    const totalSegundos = Math.ceil(tempoRestanteMS / 1000);
    const minutos = Math.floor(totalSegundos / 60);
    const segundos = totalSegundos % 60;
    displayTempo.textContent = `${String(minutos).padStart(2, '0')}:${String(segundos).padStart(2, '0')}`;

    const porcentagem = Math.max(0, tempoRestanteMS / (tempoTotalSegundos * 1000));
    const desvio = PERIMETRO_CIRCULO - (porcentagem * PERIMETRO_CIRCULO);
    if (circuloProgresso) {
      circuloProgresso.style.strokeDashoffset = desvio;
      circuloProgresso.style.stroke = corAtiva;
    }
  }

  if (labelStatus) {
    labelStatus.style.color = corAtiva;
  }

  document.documentElement.style.setProperty('--ambient-color', corAtiva);
}

function pausarIntervalo() {
  clearInterval(cronometroIntervalo);
  cronometroIntervalo = null;

  if (btnAlternar) {
    btnAlternar.innerHTML = `<span class="material-symbols-rounded">play_arrow</span> Iniciar`;
  }
}

function definirModo(novoModo) {
  pausarIntervalo();
  modoAtual = novoModo;

  // Reseta visibilidade de botões de sub-modo
  if (btnModoFoco) btnModoFoco.classList.remove('ativo');
  if (btnModoCurto) btnModoCurto.classList.remove('ativo');
  if (btnModoLongo) btnModoLongo.classList.remove('ativo');
  esconderSubModos();

  const coresModo = getCoresModo();
  const corAtiva = coresModo[modoAtual] || coresModo.foco;

  if (novoModo === 'foco') {
    if (btnModoFoco) { btnModoFoco.classList.add('ativo'); mostrarSubModos(); }
    tempoTotalSegundos = config.pomodoro * 60;
    cronometroDirection = 'down';
    if (labelStatus) {
      labelStatus.textContent = "Foco 💪";
      labelStatus.style.color = coresModo.foco;
    }
  } else if (novoModo === 'curto') {
    if (btnModoCurto) { btnModoCurto.classList.add('ativo'); mostrarSubModos(); }
    tempoTotalSegundos = config.shortBreak * 60;
    cronometroDirection = 'down';
    if (labelStatus) {
      labelStatus.textContent = "Pausa Curta ☕";
      labelStatus.style.color = coresModo.curto;
    }
  } else if (novoModo === 'longo') {
    if (btnModoLongo) { btnModoLongo.classList.add('ativo'); mostrarSubModos(); }
    tempoTotalSegundos = config.longBreak * 60;
    cronometroDirection = 'down';
    if (labelStatus) {
      labelStatus.textContent = "Pausa Longa 🌴";
      labelStatus.style.color = coresModo.longo;
    }
  } else if (novoModo === 'temporizador') {
    // Countdown timer using timer-* config
    tempoTotalSegundos =
      (config.timerHours * 3600) +
      (config.timerMinutes * 60) +
      config.timerSeconds;
    tempoTotalSegundos = Math.max(1, tempoTotalSegundos);
    cronometroDirection = 'down';
    if (labelStatus) {
      labelStatus.textContent = "Temporizador";
      labelStatus.style.color = coresModo.temporizador;
    }
    esconderSubModos();
  } else if (novoModo === 'cronometro') {
    // Stopwatch: count up from 0 (or down to a limit if countdownMode)
    cronometroDirection = config.countdownMode ? 'down' : 'up';
    if (config.countdownMode) {
      tempoTotalSegundos = Math.max(1, config.stopwatchLimit);
    } else {
      tempoTotalSegundos = 0;
    }
    if (labelStatus) {
      labelStatus.textContent = config.countdownMode ? "Contagem Regressiva" : "Cronômetro";
      labelStatus.style.color = coresModo.cronometro;
    }
    esconderSubModos();
  }

  // Reset tempoRestanteMS: for stopwatch up mode, restart from 0 (elapsed)
  if (novoModo === 'cronometro' && !config.countdownMode) {
    tempoRestanteMS = 0;
  } else {
    tempoRestanteMS = tempoTotalSegundos * 1000;
  }
  cronometroOffsetMs = 0;
  atualizarTela();

  // Update brand subtitle based on mode
  if (brandSubtitle) {
    const subtitles = {
      foco: 'Foco concentrado',
      curto: 'Pausa curta',
      longo: 'Pausa longa',
      temporizador: 'Temporizador customizado',
      cronometro: config.countdownMode ? 'Contagem regressiva' : 'Cronômetro'
    };
    brandSubtitle.textContent = subtitles[novoModo] || 'Foco • Pausas • Tarefas';
  }
}

function esconderSubModos() {
  const subRow = document.getElementById('modos-timer-externo');
  if (subRow) subRow.classList.add('oculto-sub');
}
function mostrarSubModos() {
  const subRow = document.getElementById('modos-timer-externo');
  if (subRow) subRow.classList.remove('oculto-sub');
}

function incrementarSequencia() {
  if (modoAtual === 'foco') sequencia.foco++;
  else if (modoAtual === 'curto') sequencia.curto++;
  else if (modoAtual === 'longo') sequencia.longo++;
  atualizarFireBtn();
}

function atualizarFireBtn() {
  const fireCount = document.getElementById('fire-count');
  if (fireCount) {
    const total = (sequencia.foco || 0) + (sequencia.curto || 0) + (sequencia.longo || 0);
    fireCount.textContent = total;
  }
}

let audioContext = null;

function getAudioContext() {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioContext.state === 'suspended') {
    audioContext.resume();
  }
  return audioContext;
}

function playAlarm() {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    const volume = Math.max(0, Math.min(1, (config.alarmVolume || 80) / 100));
    const sound = config.alarmSound || 'bell';
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(volume, now);
    gain.connect(ctx.destination);

    if (sound === 'digital') {
      const osc = ctx.createOscillator();
      osc.type = 'square';
      osc.frequency.setValueAtTime(880, now);
      gain.gain.setValueAtTime(volume, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.4);
      osc.connect(gain);
      osc.start(now);
      osc.stop(now + 0.4);
    } else if (sound === 'birds') {
      const notas = [1200, 1600, 1800, 2000, 1600];
      const duracao = 0.12;
      const inicio = now;
      notas.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, inicio + i * duracao);
        const g = ctx.createGain();
        g.gain.setValueAtTime(0, inicio + i * duracao);
        g.gain.linearRampToValueAtTime(volume, inicio + i * duracao + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, inicio + i * duracao + duracao);
        osc.connect(g);
        g.connect(ctx.destination);
        osc.start(inicio + i * duracao);
        osc.stop(inicio + i * duracao + duracao);
      });
    } else {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.exponentialRampToValueAtTime(440, now + 0.6);
      gain.gain.setValueAtTime(volume, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.9);
      osc.connect(gain);
      osc.start(now);
      osc.stop(now + 0.9);
    }
  } catch (e) {
    console.error('Erro ao tocar alarme:', e);
  }
}

function alternarCronometro() {
  if (!btnAlternar) return;

  if (cronometroIntervalo === null) {
    ultimaAtualizacao = Date.now();
    cronometroOffsetMs = tempoRestanteMS;

    cronometroIntervalo = setInterval(() => {
      const agora = Date.now();
      const delta = agora - ultimaAtualizacao;
      ultimaAtualizacao = agora;

      if (cronometroDirection === 'up') {
        tempoRestanteMS += delta;
        atualizarTela();
      } else {
        // countdown
        if (tempoRestanteMS > 0) {
          tempoRestanteMS -= delta;
          atualizarTela();
        } else {
          tempoRestanteMS = 0;
          atualizarTela();
          pausarIntervalo();
          incrementarSequencia();
          playAlarm();
        }
      }
    }, 50);

    btnAlternar.innerHTML = `<span class="material-symbols-rounded">pause</span> Pausar`;
  } else {
    pausarIntervalo();
  }
}

function reiniciarCronometro() {
  pausarIntervalo();
  if (cronometroDirection === 'up') {
    tempoRestanteMS = 0;
  } else {
    tempoRestanteMS = tempoTotalSegundos * 1000;
  }
  atualizarTela();
}

if (btnModoFoco) btnModoFoco.addEventListener('click', () => definirModo('foco'));
if (btnModoCurto) btnModoCurto.addEventListener('click', () => definirModo('curto'));
if (btnModoLongo) btnModoLongo.addEventListener('click', () => definirModo('longo'));
if (btnAlternar) btnAlternar.addEventListener('click', alternarCronometro);
if (btnReiniciar) btnReiniciar.addEventListener('click', reiniciarCronometro);

// ===================================
// CONTROLE DOS PAINÉIS LATERAIS
// ===================================
function fecharPaineis() {
  const painelPomodoro = document.getElementById('painel-pomodoro');
  const painelTemporizador = document.getElementById('painel-temporizador');
  const painelCronometro = document.getElementById('painel-cronometro');
  const painelTarefas = document.getElementById('painel-tarefas');
  const painelMusica = document.getElementById('painel-musica');
  const painelConfig = document.getElementById('painel-config');
  const painelTemas = document.getElementById('painel-temas');

  if (painelTarefas) painelTarefas.classList.add('oculto');
  if (painelMusica) painelMusica.classList.add('oculto');
  if (painelConfig) painelConfig.classList.add('oculto');
  if (painelTemas) painelTemas.classList.add('oculto');
  if (painelPomodoro) painelPomodoro.classList.add('oculto');
  if (painelTemporizador) painelTemporizador.classList.add('oculto');
  if (painelCronometro) painelCronometro.classList.add('oculto');
}

function fecharModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.classList.add('oculto');
}

function abrirModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.classList.remove('oculto');
}

function fecharConfig() {
  const painelConfig = document.getElementById('painel-config');
  if (painelConfig) painelConfig.classList.add('oculto');
}

const btnTarefas = document.getElementById('btn-tarefas');
const btnMusica = document.getElementById('btn-musica');
const btnConfig = document.getElementById('open-settings-btn');

if (btnTarefas) {
  btnTarefas.addEventListener('click', () => {
    fecharPaineis();
    const painelTarefas = document.getElementById('painel-tarefas');
    if (painelTarefas) painelTarefas.classList.remove('oculto');
  });
}

if (btnMusica) {
  btnMusica.addEventListener('click', () => {
    fecharPaineis();
    const painelMusica = document.getElementById('painel-musica');
    if (painelMusica) painelMusica.classList.remove('oculto');
  });
}

// Configurações de Temporizador / Cronômetro
const inputTimerHours = document.getElementById('timer-hours');
const inputTimerMinutes = document.getElementById('timer-minutes');
const inputTimerSeconds = document.getElementById('timer-seconds');
const cbCountdownMode = document.getElementById('countdown-mode');
const inputStopwatchLimit = document.getElementById('stopwatch-limit');

function lerConfigTimer() {
  config.timerHours = parseInt(inputTimerHours?.value || '0', 10) || 0;
  config.timerMinutes = parseInt(inputTimerMinutes?.value || '0', 10) || 0;
  config.timerSeconds = parseInt(inputTimerSeconds?.value || '0', 10) || 0;
  config.countdownMode = !!cbCountdownMode?.checked;
  config.stopwatchLimit = parseInt(inputStopwatchLimit?.value || '0', 10) || 0;
}
if (inputTimerHours) inputTimerHours.addEventListener('change', () => { lerConfigTimer(); definirModo(modoAtual); });
if (inputTimerMinutes) inputTimerMinutes.addEventListener('change', () => { lerConfigTimer(); definirModo(modoAtual); });
if (inputTimerSeconds) inputTimerSeconds.addEventListener('change', () => { lerConfigTimer(); definirModo(modoAtual); });
if (cbCountdownMode) cbCountdownMode.addEventListener('change', () => { lerConfigTimer(); definirModo(modoAtual); });
if (inputStopwatchLimit) inputStopwatchLimit.addEventListener('change', () => { lerConfigTimer(); definirModo(modoAtual); });

const btnModoPomodoro = document.getElementById('btn-pomodoro');
const btnModoTemporizador = document.getElementById('btn-temporizador');
const btnModoCronometro = document.getElementById('btn-cronometro');

document.querySelectorAll('.mode-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    // Marca o modo ativo visualmente
    document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    const id = btn.id;
    fecharPaineis();

    if (id === 'btn-temporizador') {
      lerConfigTimer();
      definirModo('temporizador');
      const targetPanel = document.getElementById('painel-temporizador');
      if (targetPanel) targetPanel.classList.remove('oculto');
    } else if (id === 'btn-cronometro') {
      lerConfigTimer();
      definirModo('cronometro');
      const targetPanel = document.getElementById('painel-cronometro');
      if (targetPanel) targetPanel.classList.remove('oculto');
    } else {
      definirModo('foco');
      const targetId = btn.getAttribute('data-target');
      if (targetId) {
        const targetPanel = document.getElementById(targetId);
        if (targetPanel) targetPanel.classList.remove('oculto');
      }
    }
  });
});

if (btnConfig) {
  btnConfig.addEventListener('click', () => {
    fecharPaineis();
    const painelConfig = document.getElementById('painel-config');
    if (painelConfig) painelConfig.classList.remove('oculto');
  });
}

const btnTemas = document.getElementById('btn-temas');
const btnLang = document.getElementById('btn-lang');
if (btnTemas) {
  btnTemas.addEventListener('click', () => {
    fecharPaineis();
    const painelTemas = document.getElementById('painel-temas');
    if (painelTemas) painelTemas.classList.remove('oculto');
    renderCustomMedia();
  });
}

if (btnLang) {
  btnLang.addEventListener('click', () => {
    abrirModal('modal-idioma');
  });
}

// ===================================
// LÓGICA DAS TAREFAS
// ===================================
const inputTarefa = document.getElementById('nova-tarefa');
const btnAddTarefa = document.getElementById('btn-add-tarefa');
const listaTarefas = document.getElementById('lista-tarefas');
const tarefasStatus = document.getElementById('tarefas-status');

let tarefas = [];
let tarefaFocoId = null;

function salvarTarefas() {
  try { localStorage.setItem('studyTimerTasks', JSON.stringify(tarefas)); } catch (e) {}
}
function carregarTarefas() {
  try {
    const raw = localStorage.getItem('studyTimerTasks');
    if (raw) tarefas = JSON.parse(raw);
  } catch (e) { tarefas = []; }
}
function renderizarTarefas() {
  if (!listaTarefas) return;
  listaTarefas.innerHTML = '';
  tarefas.forEach((t, idx) => {
    const li = document.createElement('li');
    li.className = 'task-item' + (t.feita ? ' feita' : '') + (t.id === tarefaFocoId ? ' em-foco' : '');
    li.innerHTML = `
      <div class="task-main" data-id="${t.id}">
        <button class="task-check" data-id="${t.id}" aria-label="Concluir">${t.feita ? '✓' : '○'}</button>
        <span class="task-text" data-id="${t.id}">${t.texto}</span>
      </div>
      <div class="task-actions">
        <button class="task-foco-btn" data-id="${t.id}" title="Focar nesta tarefa">🎯</button>
        <button class="task-del" data-id="${t.id}" title="Remover">✖</button>
      </div>
    `;
    listaTarefas.appendChild(li);
  });
  if (tarefasStatus) {
    const pendentes = tarefas.filter(t => !t.feita).length;
    tarefasStatus.textContent = `${tarefas.length} tarefa${tarefas.length !== 1 ? 's' : ''} · ${pendentes} pendente${pendentes !== 1 ? 's' : ''}`;
  }
}

function adicionarTarefa() {
  const texto = inputTarefa.value.trim();
  if (!texto) return;
  tarefas.push({ id: Date.now().toString(), texto, feita: false });
  inputTarefa.value = '';
  salvarTarefas();
  renderizarTarefas();
}

function toggleFeita(id) {
  const t = tarefas.find(x => x.id === id);
  if (t) { t.feita = !t.feita; salvarTarefas(); renderizarTarefas(); }
}
function removerTarefa(id) {
  tarefas = tarefas.filter(x => x.id !== id);
  if (tarefaFocoId === id) tarefaFocoId = null;
  salvarTarefas();
  renderizarTarefas();
}
function setTarefaFoco(id) {
  tarefaFocoId = id;
  salvarTarefas();
  renderizarTarefas();
}

if (btnAddTarefa) btnAddTarefa.addEventListener('click', adicionarTarefa);
if (inputTarefa) {
  inputTarefa.addEventListener('keydown', (e) => { if (e.key === 'Enter') adicionarTarefa(); });
}
if (listaTarefas) {
  listaTarefas.addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    const id = btn.getAttribute('data-id');
    if (btn.classList.contains('task-del')) removerTarefa(id);
    else if (btn.classList.contains('task-check')) toggleFeita(id);
    else if (btn.classList.contains('task-foco-btn')) setTarefaFoco(id);
  });
  listaTarefas.addEventListener('click', (e) => {
    const span = e.target.closest('.task-text');
    if (!span) return;
    const id = span.getAttribute('data-id');
    setTarefaFoco(id);
  });
}

carregarTarefas();
renderizarTarefas();

// ===================================
// PLAYER DE MÚSICA (WIDGET)
// ===================================
const btnCarregarEmbed = document.getElementById('btn-carregar-embed');
const embedUrlInput = document.getElementById('embed-url');
const ytEmbed = document.getElementById('yt-embed');

console.log('[Music Widget] Elements:', { btnCarregarEmbed, embedUrlInput, ytEmbed });

function parseYoutubeUrl(url) {
  console.log('[Music Widget] parseYoutubeUrl called with:', url);
  if (!url) return null;
  let parsed;
  try {
    parsed = new URL(url);
  } catch (e) {
    console.log('[Music Widget] Invalid URL');
    return null;
  }
  const host = parsed.hostname.replace(/^www\./, '');
  console.log('[Music Widget] Host:', host);
  if (host === 'youtube.com' || host === 'music.youtube.com') {
    const list = parsed.searchParams.get('list');
    if (list) {
      console.log('[Music Widget] Found playlist:', list);
      return { type: 'playlist', id: list };
    }
    const v = parsed.searchParams.get('v');
    if (v) {
      console.log('[Music Widget] Found video:', v);
      return { type: 'video', id: v };
    }
    const pathParts = parsed.pathname.split('/').filter(Boolean);
    if (pathParts[0] === 'shorts' && pathParts[1]) {
      console.log('[Music Widget] Found shorts:', pathParts[1]);
      return { type: 'video', id: pathParts[1] };
    }
  }
  if (host === 'youtu.be') {
    const id = parsed.pathname.slice(1);
    if (id) {
      console.log('[Music Widget] Found youtu.be video:', id);
      return { type: 'video', id };
    }
  }
  console.log('[Music Widget] No match found');
  return null;
}

function buildYoutubeUrl(type, id) {
  if (type === 'playlist') {
    return `https://www.youtube.com/embed/videoseries?list=${encodeURIComponent(id)}&autoplay=1`;
  }
  return `https://www.youtube.com/embed/${encodeURIComponent(id)}?autoplay=1`;
}

function loadYoutubeFromUrl(url) {
  const info = parseYoutubeUrl(url);
  console.log('[Music Widget] loadYoutubeFromUrl result:', info);
  if (!info) return false;
  if (!ytEmbed) {
    console.log('[Music Widget] ytEmbed not found');
    return false;
  }
  const embedUrl = buildYoutubeUrl(info.type, info.id);
  console.log('[Music Widget] Setting src to:', embedUrl);
  ytEmbed.src = embedUrl;
  return true;
}

if (btnCarregarEmbed && embedUrlInput) {
  btnCarregarEmbed.addEventListener('click', () => {
    console.log('[Music Widget] btnCarregarEmbed clicked');
    const url = embedUrlInput.value.trim();
    console.log('[Music Widget] URL input value:', url);
    if (!url) return;
    const success = loadYoutubeFromUrl(url);
    console.log('[Music Widget] Load success:', success);
    if (!success) {
      embedUrlInput.classList.add('invalid');
    } else {
      embedUrlInput.classList.remove('invalid');
    }
  });
  embedUrlInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const url = embedUrlInput.value.trim();
      if (!url) return;
      const success = loadYoutubeFromUrl(url);
      if (!success) {
        embedUrlInput.classList.add('invalid');
      } else {
        embedUrlInput.classList.remove('invalid');
      }
    }
  });
}

// ===================================
// PAINEL LATERAL DE CONFIGURAÇÕES
// ===================================
const userNameInput = document.getElementById("input-user-name");
const userGreeting = document.getElementById("user-greeting");
const brandSubtitle = document.getElementById("brand-subtitle");
const inputPomodoro = document.getElementById("pomodoro-time");
const inputShort = document.getElementById("short-break");
const inputLong = document.getElementById("long-break");
const selectAccent = document.getElementById("accent-color");
const selectAlarmSound = document.getElementById("alarm-sound");
const rangeAlarmVolume = document.getElementById("alarm-volume");
const bgImageUrlInput = document.getElementById("bg-image-url");
const cbAutoStartBreaks = document.getElementById("auto-start-breaks");
const cbAutoStartPomodoros = document.getElementById("auto-start-pomodoros");
const inputLongBreakInterval = document.getElementById("long-break-interval");
const userAgeInput = document.getElementById("user-age");
const userGenderSelect = document.getElementById("user-gender");
const userBirthdayInput = document.getElementById("user-birthday");
const themeFilterBtns = document.querySelectorAll('.theme-filter-btn');
const themeItems = document.querySelectorAll('.theme-item');
const profilesList = document.getElementById('profiles-list');
const btnAddProfile = document.getElementById('btn-add-profile');

function calculateAge(birthday) {
  if (!birthday || birthday.length !== 10) return null;
  const parts = birthday.split('/');
  if (parts.length !== 3) return null;
  const day = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const year = parseInt(parts[2], 10);
  if (isNaN(day) || isNaN(month) || isNaN(year)) return null;
  const birthDate = new Date(year, month, day);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  if (age < 4) age = 4;
  if (age > 14) age = 14;
  return age;
}

function formatBirthday(value) {
  if (!value) return '';
  const numbers = value.replace(/\D/g, '').slice(0, 8);
  if (numbers.length <= 2) return numbers;
  if (numbers.length <= 4) return `${numbers.slice(0, 2)}/${numbers.slice(2)}`;
  return `${numbers.slice(0, 2)}/${numbers.slice(2, 4)}/${numbers.slice(4)}`;
}

function getProfiles() {
  try {
    return JSON.parse(localStorage.getItem('studyTimerProfiles') || '[]');
  } catch (e) {
    return [];
  }
}

function saveProfiles(profiles) {
  localStorage.setItem('studyTimerProfiles', JSON.stringify(profiles));
  if (window.__cloudSync) window.__cloudSync();
}

function addProfile(name, age, gender, birthday) {
  const profiles = getProfiles();
  profiles.push({
    id: Date.now().toString(),
    name: name || 'Perfil',
    age: age || 8,
    gender: gender || 'all',
    birthday: birthday || '',
    bgImageUrl: config.bgImageUrl || '',
    createdAt: new Date().toISOString()
  });
  saveProfiles(profiles);
  renderProfiles();
}

function removeProfile(id) {
  let profiles = getProfiles();
  profiles = profiles.filter(p => p.id !== id);
  saveProfiles(profiles);
  if (profiles.length === 0) {
    addProfile('Perfil 1', 8, 'all', '');
  }
  renderProfiles();
}

function selectProfile(id) {
  const profiles = getProfiles();
  const profile = profiles.find(p => p.id === id);
  if (!profile) return;
  localStorage.setItem('studyTimerActiveProfileId', id);
  if (userNameInput) userNameInput.value = profile.name;
  if (userGreeting) userGreeting.textContent = profile.name;
  if (userAgeInput) userAgeInput.value = profile.age;
  if (userGenderSelect) userGenderSelect.value = profile.gender;
  if (userBirthdayInput) userBirthdayInput.value = profile.birthday || '';
  if (profile.bgImageUrl) {
    config.bgImageUrl = profile.bgImageUrl;
    aplicarBgImage(profile.bgImageUrl, profile.bgOverlayOpacity || 0.35);
    if (bgImageUrlInput) bgImageUrlInput.value = profile.bgImageUrl;
  }
}

function carregarCustomMedia() {
  try {
    const raw = localStorage.getItem('studyTimerCustomMedia');
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (e) {
    return [];
  }
}

function salvarCustomMedia(lista) {
  localStorage.setItem('studyTimerCustomMedia', JSON.stringify(lista));
}

function renderCustomMedia() {
  const container = document.getElementById('custom-media-list');
  if (!container) return;
  const lista = carregarCustomMedia();
  container.innerHTML = '';
  lista.forEach((item, idx) => {
    const div = document.createElement('div');
    div.className = 'custom-media-item';
    const nome = item.name || item.url.split('/').pop();
    div.innerHTML = `
      <span class="media-info" title="${item.url}">${nome}</span>
      <button class="media-remove" data-index="${idx}" title="Remover">✖</button>
    `;
    container.appendChild(div);
  });
}

function adicionarCustomMedia(files) {
  const MAX_FILES = 8;
  const MAX_SIZE = 20 * 1024 * 1024;
  const lista = carregarCustomMedia();
  const remaining = MAX_FILES - lista.length;
  if (remaining <= 0) {
    alert('Limite de 8 arquivos atingido.');
    return;
  }
  const toProcess = Array.from(files).slice(0, remaining);
  toProcess.forEach(file => {
    if (file.size > MAX_SIZE) {
      alert(`Arquivo "${file.name}" ultrapassa 20 MB.`);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      lista.push({ name: file.name, url: reader.result, type: file.type });
      salvarCustomMedia(lista);
      renderCustomMedia();
    };
    reader.readAsDataURL(file);
  });
}

function aplicarAjustesFundo() {
  const brightness = document.getElementById('bg-brightness')?.value || '100';
  const blur = document.getElementById('bg-blur')?.value || '0';
  const current = document.body.style.backgroundImage || '';
  const match = current.match(/linear-gradient\([^)]+\)/);
  if (!match) return;
  const overlay = (100 - parseFloat(brightness)) / 100;
  const grad = `linear-gradient(rgba(255,255,255,${overlay}),rgba(0,0,0,${parseFloat(blur) / 20})),url("${config.bgImageUrl}")`;
  document.body.style.backgroundImage = grad;
}

const bgBrightnessInput = document.getElementById('bg-brightness');
const bgBlurInput = document.getElementById('bg-blur');
const customMediaUpload = document.getElementById('custom-media-upload');

if (bgBrightnessInput) {
  bgBrightnessInput.addEventListener('input', aplicarAjustesFundo);
}
if (bgBlurInput) {
  bgBlurInput.addEventListener('input', aplicarAjustesFundo);
}
if (customMediaUpload) {
  customMediaUpload.addEventListener('change', (e) => {
    if (e.target.files && e.target.files.length) {
      adicionarCustomMedia(e.target.files);
      e.target.value = '';
    }
  });
}

document.getElementById('custom-media-list')?.addEventListener('click', (e) => {
  const btn = e.target.closest('.media-remove');
  if (!btn) return;
  const index = parseInt(btn.dataset.index || '0', 10);
  const lista = carregarCustomMedia();
  if (index >= 0 && index < lista.length) {
    lista.splice(index, 1);
    salvarCustomMedia(lista);
    renderCustomMedia();
  }
});

function renderProfiles() {
  if (!profilesList) return;
  const profiles = getProfiles();
  const activeId = localStorage.getItem('studyTimerActiveProfileId');
  profilesList.innerHTML = profiles.map(p => `
    <div class="profile-card ${p.id === activeId ? 'active' : ''}" data-id="${p.id}">
      <div class="profile-avatar" data-gender="${p.gender}">
        <span class="material-symbols-rounded">person</span>
      </div>
      <div class="profile-info">
        <span class="profile-name">${escapeHtml(p.name)}</span>
        <span class="profile-meta">${p.age} anos</span>
      </div>
      <button class="profile-select-btn" data-id="${p.id}">Abrir</button>
      <button class="profile-remove-btn" data-id="${p.id}">✖</button>
    </div>
  `).join('');

  profilesList.querySelectorAll('.profile-card').forEach((card) => {
    const id = card.dataset.id;
    card.querySelector('.profile-select-btn').addEventListener('click', () => selectProfile(id));
    card.querySelector('.profile-remove-btn').addEventListener('click', () => removeProfile(id));
  });
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

if (btnAddProfile) {
  btnAddProfile.addEventListener('click', () => {
    const name = userNameInput ? userNameInput.value.trim() : '';
    const age = userAgeInput ? parseInt(userAgeInput.value, 10) || 8 : 8;
    const gender = userGenderSelect ? userGenderSelect.value : 'all';
    const birthday = userBirthdayInput ? userBirthdayInput.value : '';
    addProfile(name || 'Novo Perfil', age, gender, birthday);
  });
}

function applySettings() {
  if (userNameInput && userGreeting) {
    const nomeFinal = userNameInput.value.trim() || "Estudante";
    userGreeting.textContent = nomeFinal;
    localStorage.setItem("studyTimerName", nomeFinal);
  }

  if (userAgeInput) {
    const age = parseInt(userAgeInput.value, 10) || 8;
    config.userAge = Math.max(4, Math.min(14, age));
    localStorage.setItem("studyTimerAge", config.userAge);
  }
  if (userGenderSelect) {
    config.userGender = userGenderSelect.value;
    localStorage.setItem("studyTimerGender", config.userGender);
  }

  if (inputPomodoro) config.pomodoro = parseInt(inputPomodoro.value) || 25;
  if (inputShort) config.shortBreak = parseInt(inputShort.value) || 5;
  if (inputLong) config.longBreak = parseInt(inputLong.value) || 15;
  if (selectAccent) {
    config.accentColor = selectAccent.value;
    document.documentElement.style.setProperty('--primary-color', config.accentColor);
  }
  if (selectAlarmSound) config.alarmSound = selectAlarmSound.value;
  if (rangeAlarmVolume) config.alarmVolume = parseInt(rangeAlarmVolume.value, 10) || 80;
  if (cbAutoStartBreaks) {
    config.autoStartBreaks = cbAutoStartBreaks.checked;
    localStorage.setItem("studyTimerAutoStartBreaks", cbAutoStartBreaks.checked);
  }
  if (cbAutoStartPomodoros) {
    config.autoStartPomodoros = cbAutoStartPomodoros.checked;
    localStorage.setItem("studyTimerAutoStartPomodoros", cbAutoStartPomodoros.checked);
  }
  if (inputLongBreakInterval) {
    config.longBreakInterval = parseInt(inputLongBreakInterval.value, 10) || 4;
    localStorage.setItem("studyTimerLongBreakInterval", config.longBreakInterval);
  }

  definirModo(modoAtual);
  if (window.__cloudSync) window.__cloudSync();
}

if (userAgeInput) userAgeInput.addEventListener('input', applySettings);
if (userGenderSelect) userGenderSelect.addEventListener('change', applySettings);
if (userNameInput) userNameInput.addEventListener('input', applySettings);
if (inputPomodoro) inputPomodoro.addEventListener('change', applySettings);
if (inputShort) inputShort.addEventListener('change', applySettings);
if (inputLong) inputLong.addEventListener('change', applySettings);
if (selectAccent) selectAccent.addEventListener('change', applySettings);
if (selectAlarmSound) selectAlarmSound.addEventListener('change', applySettings);
if (rangeAlarmVolume) rangeAlarmVolume.addEventListener('input', applySettings);
if (cbAutoStartBreaks) cbAutoStartBreaks.addEventListener('change', applySettings);
if (cbAutoStartPomodoros) cbAutoStartPomodoros.addEventListener('change', applySettings);
if (inputLongBreakInterval) inputLongBreakInterval.addEventListener('change', applySettings);
if (bgImageUrlInput) bgImageUrlInput.addEventListener('input', applySettings);

if (userBirthdayInput) {
  userBirthdayInput.addEventListener('input', () => {
    const formatted = formatBirthday(userBirthdayInput.value);
    userBirthdayInput.value = formatted;
    const age = calculateAge(formatted);
    if (age !== null) {
      if (userAgeInput) userAgeInput.value = age;
      config.userAge = age;
    }
    applySettings();
  });
}

themeFilterBtns.forEach((btn) => {
  btn.addEventListener('click', () => {
    themeFilterBtns.forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    const filter = btn.dataset.filter || 'menina';
    themeItems.forEach((item) => {
      const gender = item.dataset.gender || 'all';
      if (filter === 'all' || gender === filter) {
        item.style.display = '';
      } else {
        item.style.display = 'none';
      }
    });
  });
});

document.querySelectorAll('.language-option').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.language-option').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const lang = btn.dataset.lang;
    localStorage.setItem('studyTimerLanguage', lang);
    aplicarIdioma(lang);
    fecharModal('modal-idioma');
  });
});

function aplicarIdioma(lang) {
  // A ser implementado com um objeto de traduções
  console.log('Idioma selecionado:', lang);
}
  pill.addEventListener('click', () => {
    const color = pill.dataset.color;
    const sel = document.getElementById('accent-color');
    if (sel) {
      sel.value = color;
      sel.dispatchEvent(new Event('change', { bubbles: true }));
    }
    document.querySelectorAll('.color-pill').forEach(p => p.classList.toggle('active', p === pill));
  });
;

function updateActiveColorPill() {
  const current = document.getElementById('accent-color')?.value;
  if (!current) return;
  document.querySelectorAll('.color-pill').forEach(p => {
    p.classList.toggle('active', p.dataset.color.toLowerCase() === current.toLowerCase());
  });
}
window.updateActiveColorPill = updateActiveColorPill;

function aplicarBgImage(caminho, overlay) {
  const overlayNum = isNaN(overlay) ? 0.35 : overlay;
  document.documentElement.style.setProperty('--bg-overlay-opacity', overlayNum);
  const grad = `linear-gradient(rgba(0,0,0,${overlayNum}),rgba(0,0,0,${overlayNum}))`;
  if (caminho) {
    document.body.style.backgroundImage = grad + `,url("${caminho}")`;
  } else {
    document.body.style.backgroundImage = grad;
  }
}

document.querySelectorAll('.theme-item').forEach((item) => {
  item.addEventListener('click', () => {
    const bg = item.dataset.bg || '';
    const overlay = parseFloat(item.dataset.overlay || '0');
    aplicarBgImage(bg, overlay);
    config.bgImageUrl = bg;
    config.bgOverlayOpacity = overlay;
    localStorage.setItem("studyTimerBgImageUrl", bg);
    localStorage.setItem("studyTimerBgOverlayOpacity", String(overlay));
    if (bgImageUrlInput) bgImageUrlInput.value = bg;
    applySettings();
  });
});

// Inicialização
function refreshApp() {
const nomeSalvo = localStorage.getItem("studyTimerName");
if (nomeSalvo && userGreeting && userNameInput) {
  userGreeting.textContent = nomeSalvo;
  userNameInput.value = nomeSalvo;
}

const ageSalvo = localStorage.getItem("studyTimerAge");
if (ageSalvo && userAgeInput) {
  userAgeInput.value = ageSalvo;
  config.userAge = parseInt(ageSalvo, 10) || 8;
}

const genderSalvo = localStorage.getItem("studyTimerGender");
if (genderSalvo && userGenderSelect) {
  userGenderSelect.value = genderSalvo;
  config.userGender = genderSalvo;
}

const birthdaySalvo = localStorage.getItem("studyTimerBirthday");
if (birthdaySalvo && userBirthdayInput) {
  userBirthdayInput.value = birthdaySalvo;
  config.userBirthday = birthdaySalvo;
  const calculatedAge = calculateAge(birthdaySalvo);
  if (calculatedAge !== null) {
    userAgeInput.value = calculatedAge;
    config.userAge = calculatedAge;
    localStorage.setItem("studyTimerAge", calculatedAge);
  }
}

renderProfiles();
const activeProfileId = localStorage.getItem("studyTimerActiveProfileId");
if (activeProfileId) {
  const profiles = getProfiles();
  const activeProfile = profiles.find(p => p.id === activeProfileId);
  if (activeProfile) {
    selectProfile(activeProfileId);
  }
}

const bgSalvo = localStorage.getItem("studyTimerBgImageUrl");
if (bgSalvo !== null) {
  config.bgImageUrl = bgSalvo;
}
  const overlaySalvo = localStorage.getItem("studyTimerBgOverlayOpacity");
  if (overlaySalvo !== null) {
    config.bgOverlayOpacity = parseFloat(overlaySalvo) || 0;
  }

  const asb = localStorage.getItem("studyTimerAutoStartBreaks");
  if (asb !== null) {
    config.autoStartBreaks = asb === 'true';
    if (cbAutoStartBreaks) cbAutoStartBreaks.checked = config.autoStartBreaks;
  }
  const asp = localStorage.getItem("studyTimerAutoStartPomodoros");
  if (asp !== null) {
    config.autoStartPomodoros = asp === 'true';
    if (cbAutoStartPomodoros) cbAutoStartPomodoros.checked = config.autoStartPomodoros;
  }
  const lbi = localStorage.getItem("studyTimerLongBreakInterval");
  if (lbi !== null) {
    config.longBreakInterval = parseInt(lbi, 10) || 4;
    if (inputLongBreakInterval) inputLongBreakInterval.value = config.longBreakInterval;
  }

  if (config.bgImageUrl) {
    aplicarBgImage(config.bgImageUrl, config.bgOverlayOpacity);
    if (bgImageUrlInput) bgImageUrlInput.value = config.bgImageUrl;
  } else if (config.bgOverlayOpacity !== undefined) {
    aplicarBgImage('', config.bgOverlayOpacity);
  }
if (config.bgOverlayOpacity !== undefined) {
  document.documentElement.style.setProperty('--bg-overlay-opacity', config.bgOverlayOpacity);
}

definirModo(modoAtual);
}

window.AppRefresh = refreshApp;
refreshApp();
updateActiveColorPill();
atualizarFireBtn();