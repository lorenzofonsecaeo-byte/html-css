import { initializeApp } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";

window.__captureErr = (label, err) => {
  const msg = `[${new Date().toISOString()}] ${label}: ${err && (err.code || err.message || err)}`;
  console.error(msg, err);
  try {
    const arr = JSON.parse(localStorage.getItem("__errors") || "[]");
    arr.push(msg);
    localStorage.setItem("__errors", JSON.stringify(arr.slice(-20)));
  } catch (_) {}
};
window.addEventListener("error", (e) => window.__captureErr("window.error", e.error || e.message));
window.addEventListener("unhandledrejection", (e) => window.__captureErr("unhandledrejection", e.reason));

const firebaseConfig = {
  apiKey: "AIzaSyBtsXl_EBxOuLOdGTWgsJz1GZMb_87F-Ls",
  authDomain: "cantinho-do-foco.firebaseapp.com",
  projectId: "cantinho-do-foco",
  storageBucket: "cantinho-do-foco.firebasestorage.app",
  messagingSenderId: "168860445590",
  appId: "1:168860445590:web:681a7da9ecd86f1a220bb7"
};

const app = initializeApp(firebaseConfig);
try { window.firebaseApp = app; } catch(_) {}

const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

let currentUser = null;
let cloudReady = false;
let saveTimer = null;

const GOOGLE_ICON = `<svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/></svg>`;

function userDoc(uid) {
  return doc(db, "users", uid);
}

function readSettingsFromInputs() {
  const g = (id) => {
    const el = document.getElementById(id);
    return el ? el.value : undefined;
  };
  const gc = (id) => {
    const el = document.getElementById(id);
    return el ? el.checked : false;
  };
  return {
    name: g("input-user-name"),
    age: g("user-age"),
    gender: g("user-gender"),
    birthday: g("user-birthday"),
    pomodoro: g("pomodoro-time"),
    shortBreak: g("short-break"),
    longBreak: g("long-break"),
    longBreakInterval: g("long-break-interval"),
    accentColor: g("accent-color"),
    alarmSound: g("alarm-sound"),
    alarmVolume: g("alarm-volume"),
    bgImageUrl: g("bg-image-url"),
    timerHours: g("timer-hours"),
    timerMinutes: g("timer-minutes"),
    timerSeconds: g("timer-seconds"),
    stopwatchLimit: g("stopwatch-limit"),
    countdownMode: gc("countdown-mode"),
    autoStartBreaks: gc("auto-start-breaks"),
    autoStartPomodoros: gc("auto-start-pomodoros")
  };
}

function applySettingsToInputs(s) {
  if (!s) return;
  const set = (id, val) => {
    const el = document.getElementById(id);
    if (el && val !== undefined && val !== null) el.value = val;
  };

  if (s.name) {
    const n = document.getElementById("input-user-name");
    if (n) n.value = s.name;
  }
  set("user-age", s.age);
  set("user-gender", s.gender);
  set("user-birthday", s.birthday);
   set("pomodoro-time", s.pomodoro);
  set("short-break", s.shortBreak);
  set("long-break", s.longBreak);
  set("long-break-interval", s.longBreakInterval);
  set("accent-color", s.accentColor);
  set("alarm-sound", s.alarmSound);
  set("alarm-volume", s.alarmVolume);
  set("bg-image-url", s.bgImageUrl);
  set("timer-hours", s.timerHours);
  set("timer-minutes", s.timerMinutes);
  set("timer-seconds", s.timerSeconds);
  set("stopwatch-limit", s.stopwatchLimit);
  const setChecked = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.checked = !!val;
  };
  setChecked("auto-start-breaks", s.autoStartBreaks);
  setChecked("auto-start-pomodoros", s.autoStartPomodoros);
  setChecked("countdown-mode", s.countdownMode);

  // Sync into runtime config object so definirModo picks up fresh values
  if (typeof window.config !== "undefined" && window.config) {
    if (s.timerHours !== undefined) window.config.timerHours = s.timerHours;
    if (s.timerMinutes !== undefined) window.config.timerMinutes = s.timerMinutes;
    if (s.timerSeconds !== undefined) window.config.timerSeconds = s.timerSeconds;
    if (s.stopwatchLimit !== undefined) window.config.stopwatchLimit = s.stopwatchLimit;
    if (s.countdownMode !== undefined) window.config.countdownMode = !!s.countdownMode;
  }
  if (typeof window.updateActiveColorPill === "function") window.updateActiveColorPill();
}

async function pullFromCloud(user) {
  try {
    const snap = await getDoc(userDoc(user.uid));
    if (!snap.exists()) return;
    const data = snap.data();

    if (Array.isArray(data.profiles)) {
      localStorage.setItem("studyTimerProfiles", JSON.stringify(data.profiles));
    }
    if (data.activeProfileId) {
      localStorage.setItem("studyTimerActiveProfileId", data.activeProfileId);
    }
    if (data.settings) {
      applySettingsToInputs(data.settings);
      if (data.settings.bgImageUrl !== undefined) {
        localStorage.setItem("studyTimerBgImageUrl", data.settings.bgImageUrl || "");
      }
      if (data.settings.longBreakInterval !== undefined) {
        localStorage.setItem("studyTimerLongBreakInterval", String(data.settings.longBreakInterval));
      }
      if (data.settings.autoStartBreaks !== undefined) {
        localStorage.setItem("studyTimerAutoStartBreaks", String(!!data.settings.autoStartBreaks));
      }
      if (data.settings.autoStartPomodoros !== undefined) {
        localStorage.setItem("studyTimerAutoStartPomodoros", String(!!data.settings.autoStartPomodoros));
      }
    }

    if (typeof window.AppRefresh === "function") {
      window.AppRefresh();
    }
    if (typeof window.updateActiveColorPill === "function") {
      window.updateActiveColorPill();
    }
  } catch (err) {
    window.__captureErr("pullFromCloud", err);
  }
}

async function pushToCloud() {
  if (!currentUser) return;
  try {
    const profiles = JSON.parse(localStorage.getItem("studyTimerProfiles") || "[]");
    const activeProfileId = localStorage.getItem("studyTimerActiveProfileId") || "";
    const settings = readSettingsFromInputs();

    await setDoc(
      userDoc(currentUser.uid),
      {
        email: currentUser.email,
        displayName: currentUser.displayName,
        photoURL: currentUser.photoURL,
        profiles,
        activeProfileId,
        settings,
        updatedAt: serverTimestamp()
      },
      { merge: true }
    );
  } catch (err) {
    window.__captureErr("pushToCloud", err);
  }
}

function scheduleCloudSave() {
  if (!cloudReady || !currentUser) return;
  clearTimeout(saveTimer);
  saveTimer = setTimeout(pushToCloud, 800);
}

window.__cloudSync = scheduleCloudSave;

function updateAuthUI(user) {
  const btnGoogle = document.getElementById("btn-login-google");
  if (!btnGoogle) return;

  if (user) {
    const label = user.displayName || user.email || "Conta";
    btnGoogle.innerHTML = `<span class="material-symbols-rounded">logout</span> Sair (${label})`;
    btnGoogle.classList.add("logged-in");
  } else {
    btnGoogle.innerHTML = `${GOOGLE_ICON} Entrar com o Google`;
    btnGoogle.classList.remove("logged-in");
  }
}

const btnGoogle = document.getElementById("btn-login-google");
const btnApple = document.getElementById("btn-login-apple");

if (btnGoogle) {
  btnGoogle.addEventListener("click", async () => {
    if (currentUser) {
      try {
        await signOut(auth);
      } catch (err) {
        console.error("Erro ao sair:", err);
      }
      return;
    }
    try {
      await signInWithPopup(auth, provider);
    } catch (err) {
      window.__captureErr("signInWithPopup", err);
      const friendly = {
        "auth/popup-blocked": "Popup bloqueado pelo navegador. Permita popups para este site.",
        "auth/popup-closed-by-user": "Login cancelado.",
        "auth/unauthorized-domain": "Dominio nao autorizado. Adicione " + location.hostname + " em Firebase Auth > Settings > Authorized domains.",
        "auth/operation-not-allowed": "Login com Google desativado no Firebase Console (Authentication > Sign-in method).",
        "auth/configuration-not-found": "Authentication nao configurado no projeto. Ative em Firebase Console > Authentication > Get started."
      }[err.code] || err.message;
      alert("Falha no login: " + friendly);
    }
  });
}

if (btnApple) {
  btnApple.addEventListener("click", () => {
    alert(
      "O login com a Apple exige a configuração do Apple Developer Program " +
      "(conta paga) e não está ativo neste projeto. Use o login com o Google."
    );
  });
}

onAuthStateChanged(auth, async (user) => {
  cloudReady = true;
  currentUser = user;
  updateAuthUI(user);
  if (user) {
    await pullFromCloud(user);
  }
});
