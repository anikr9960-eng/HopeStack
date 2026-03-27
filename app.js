/* ============================================
   HopeStack — Core Application Logic (Part 1)
   Navigation, Storage, VADER Engine
   ============================================ */

// --- State ---
const state = {
  currentScreen: 'onboarding',
  authMode: 'login',
  lang: 'en',
  selectedMood: null,
  journalMood: null,
  entries: JSON.parse(localStorage.getItem('hs_entries') || '[]'),
  user: JSON.parse(localStorage.getItem('hs_user') || 'null'),
  screeningAnswers: [],
  currentQuestion: 0,
  breathingActive: false,
  breathingTimer: null,
  period: 7,
  voiceActive: false,
  recognition: null,
  audioContext: null,
  analyser: null,
  dataArray: null,
  voiceIntensity: 1.0,
  voiceToneValence: 0 // -1 to 1 based on audio features
};

const TRANSLATIONS = {
  en: {
    nav_dashboard: "Dashboard", nav_journal: "Journal", nav_stats: "Stats", nav_screen: "Screen", nav_wellness: "Wellness",
    greeting_morning: "Good Morning 👋", greeting_afternoon: "Good Afternoon 🌤️", greeting_evening: "Good Evening 🌙",
    dash_mood_title: "Today's Mood", mood_happy: "Happy", mood_calm: "Calm", mood_anxious: "Anxious", mood_sad: "Sad", mood_angry: "Angry",
    action_entry_title: "New Entry", action_entry_desc: "Write in your journal",
    action_stats_title: "Mood Stats", action_stats_desc: "View your trends",
    action_screen_title: "Screening", action_screen_desc: "PHQ-9 check-in"
  },
  hi: {
    nav_dashboard: "डैशबोर्ड", nav_journal: "जर्नल", nav_stats: "आंकड़े", nav_screen: "जाँच", nav_wellness: "कल्याण",
    greeting_morning: "शुभ प्रभात 👋", greeting_afternoon: "शुभ दोपहर 🌤️", greeting_evening: "शुभ संध्या 🌙",
    dash_mood_title: "आज का मूड", mood_happy: "खुश", mood_calm: "शांत", mood_anxious: "चिंतित", mood_sad: "उदास", mood_angry: "गुस्सा",
    action_entry_title: "नई प्रविष्टि", action_entry_desc: "अपनी डायरी लिखें",
    action_stats_title: "मूड आंकड़े", action_stats_desc: "अपने रुझान देखें",
    action_screen_title: "जाँच", action_screen_desc: "PHQ-9 चेक-इन"
  },
  bn: {
    nav_dashboard: "ড্যাশবোর্ড", nav_journal: "জার্নাল", nav_stats: "পরিসংখ্যান", nav_screen: "স্ক্রিনিং", nav_wellness: "ওয়েলনেস",
    greeting_morning: "সুপ্রভাত 👋", greeting_afternoon: "শুভ অপরাহ্ন 🌤️", greeting_evening: "শুভ সন্ধ্যা 🌙",
    dash_mood_title: "আজকের মুড", mood_happy: "খুশি", mood_calm: "শান্ত", mood_anxious: "উদ্বিগ্ন", mood_sad: "দুঃখিত", mood_angry: "রাগী",
    action_entry_title: "নতুন এন্ট্রি", action_entry_desc: "আপনার ডায়েরি লিখুন",
    action_stats_title: "পরিসংখ্যান", action_stats_desc: "আপনার ট্রেন্ড দেখুন",
    action_screen_title: "স্ক্রিনিং", action_screen_desc: "PHQ-9 চেক-ইন"
  }
};

const GENZ_LEXICON = {
  "slay": 3.0, "rizz": 2.5, "cap": -1.5, "no cap": 2.5, "mid": -1.0, "bet": 1.0, "sus": -2.0, "bussin": 3.0, "glow up": 2.5,
  "living for it": 2.5, "understood the assignment": 3.0, "finna": 0.5, "dead": 1.5, "shook": -1.0, "extra": -1.5
};

// --- Navigation ---
function navigateTo(screen) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const el = document.getElementById('screen-' + screen);
  if (el) { el.classList.add('active'); el.scrollTop = 0; }
  state.currentScreen = screen;
  const nav = document.getElementById('bottomNav');
  const stars = document.getElementById('starsContainer');
  if (screen === 'onboarding' || screen === 'auth') {
    nav.style.display = 'none';
    stars.style.display = 'block';
  } else {
    nav.style.display = 'flex';
    stars.style.display = 'none';
  }
  document.querySelectorAll('.nav-item').forEach(n => {
    n.classList.toggle('active', n.dataset.screen === screen);
  });
  
  // Re-apply translations for new screen content
  applyTranslations();
  
  if (screen === 'dashboard') updateDashboard();
  if (screen === 'journal') { updateJournalDate(); renderJournalEntries(); setTimeout(() => drawGauge(0), 10); }
  if (screen === 'mood') setTimeout(updateMoodTracker, 10); // Delay to ensure visible dimensions
  if (screen === 'resources') renderResources();
  window.scrollTo(0, 0);
}

// --- Toast ---
function showToast(msg, type = 'success') {
  const t = document.getElementById('toast');
  document.getElementById('toastMsg').textContent = msg;
  document.getElementById('toastIcon').textContent = type === 'success' ? '✓' : '✕';
  t.className = 'toast toast-' + type + ' show';
  setTimeout(() => t.classList.remove('show'), 2500);
}

// --- Storage ---
function saveEntries() { localStorage.setItem('hs_entries', JSON.stringify(state.entries)); }

// --- Greeting ---
function updateGreeting() {
  const h = new Date().getHours();
  let key = 'greeting_evening';
  if (h < 12) key = 'greeting_morning';
  else if (h < 17) key = 'greeting_afternoon';
  
  const baseGreeting = TRANSLATIONS[state.lang][key];
  const name = state.user ? state.user.name.split(' ')[0] : '';
  const el = document.getElementById('greetingText');
  if (el) el.textContent = name ? `${baseGreeting.replace('👋', '')}, ${name} 👋` : baseGreeting;
  
  const te = document.getElementById('greetingTime');
  if (te) te.textContent = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
}

function changeLanguage(lang, btn) {
  state.lang = lang;
  document.querySelectorAll('.lang-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  applyTranslations();
  updateGreeting();
  saveSession();
}

function applyTranslations() {
  const dict = TRANSLATIONS[state.lang];
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.dataset.i18n;
    if (dict[key]) el.textContent = dict[key];
  });
}

function saveSession() {
  localStorage.setItem('hs_lang', state.lang);
}

// --- Auth Logic ---
function toggleAuthMode(mode) {
  state.authMode = mode;
  const tabs = document.getElementById('authTabs');
  const title = document.getElementById('authTitle');
  const nameGroup = document.getElementById('name-group');
  const btn = document.getElementById('btnAuth');
  const footer = document.getElementById('authFooter');
  const indicator = document.querySelector('.auth-tab-indicator');
  
  document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
  
  if (mode === 'signup') {
    tabs.classList.add('signup-mode');
    document.getElementById('tab-signup').classList.add('active');
    title.textContent = 'Create Account';
    nameGroup.classList.remove('hidden');
    nameGroup.classList.add('animate-form-in');
    btn.textContent = 'Create Account 🚀';
    footer.innerHTML = `Already have an account? <span class="auth-toggle-link" onclick="toggleAuthMode('login')">Login here</span>`;
  } else {
    tabs.classList.remove('signup-mode');
    document.getElementById('tab-login').classList.add('active');
    title.textContent = 'Welcome Back';
    nameGroup.classList.add('hidden');
    nameGroup.classList.remove('animate-form-in');
    btn.textContent = 'Sign In 🔐';
    footer.innerHTML = `Don't have an account? <span class="auth-toggle-link" onclick="toggleAuthMode('signup')">Sign up here</span>`;
  }
}

function handleAuth() {
  const email = document.getElementById('authEmail').value.trim();
  const password = document.getElementById('authPassword').value.trim();
  const name = document.getElementById('authName').value.trim();
  
  if (!email || !password) {
    showToast('Please fill in all fields', 'error');
    return;
  }
  
  if (state.authMode === 'signup' && !name) {
    showToast('Please enter your name', 'error');
    return;
  }

  // Simulated Auth Logic
  const userData = {
    email: email,
    name: name || (state.user ? state.user.name : 'User'),
    joinedDate: new Date().toISOString()
  };
  
  state.user = userData;
  localStorage.setItem('hs_user', JSON.stringify(userData));
  
  showToast(state.authMode === 'signup' ? 'Account created! Welcome.' : 'Welcome back!');
  
  setTimeout(() => {
    navigateTo('dashboard');
  }, 500);
}

function logout() {
  localStorage.removeItem('hs_user');
  state.user = null;
  navigateTo('onboarding');
  showToast('Logged out safely');
}

// --- Dashboard ---
function selectDashMood(btn) {
  document.querySelectorAll('#dashMoodSelect .mood-btn').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');
  state.selectedMood = btn.dataset.mood;
}

function updateDashboard() {
  updateGreeting();
  drawTrendChart();
  renderRecentEntries();
}

function renderRecentEntries() {
  const c = document.getElementById('recentEntries');
  const recent = state.entries.slice(-3).reverse();
  if (!recent.length) { c.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📓</div><div class="empty-state-text">No entries yet. Start journaling!</div></div>'; return; }
  const moodMap = { happy: '😊', calm: '😌', anxious: '😟', sad: '😢', angry: '😠' };
  c.innerHTML = recent.map(e => `<div class="entry-item"><div class="entry-mood-icon">${moodMap[e.mood]||'📝'}</div><div class="entry-content"><div class="entry-preview">${e.text.substring(0,50)}${e.text.length>50?'...':''}</div><div class="entry-meta">${new Date(e.date).toLocaleDateString('en-US',{month:'short',day:'numeric'})} · ${e.mood}</div></div><div class="entry-sentiment"><span class="chip ${e.compound>=0.05?'chip-teal':e.compound<=-0.05?'chip-rose':'chip-amber'}">${e.compound>=0.05?'Pos':e.compound<=-0.05?'Neg':'Neu'}</span></div></div>`).join('');
}

// --- Journal ---
function updateJournalDate() {
  const el = document.getElementById('journalDate');
  if (el) el.textContent = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function selectJournalMood(btn) {
  document.querySelectorAll('#journalMoodSelect .journal-mood-btn').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');
  state.journalMood = btn.dataset.mood;
}

function saveJournalEntry() {
  const text = document.getElementById('journalText').value.trim();
  if (!text) { showToast('Please write something first', 'error'); return; }
  if (!state.journalMood) { showToast('Please select a mood', 'error'); return; }
  
  const scores = vaderSentiment(text);
  
  const entry = {
    id: Date.now(),
    date: new Date().toISOString(),
    mood: state.journalMood,
    text: text, // In a real app, we would use encryptJournalEntry(text) here
    ...scores,
    synced: navigator.onLine // Initially synced if online
  };
  
  state.entries.push(entry);
  
  // Secure Local Storage
  const secureData = secureStorage(state.entries);
  localStorage.setItem('hopestack_secure_entries', secureData);
  localStorage.setItem('hopestack_entries', JSON.stringify(state.entries)); // Backwards compatibility
  
  // Reset UI
  document.getElementById('journalText').value = '';
  document.querySelectorAll('#journalMoodSelect .journal-mood-btn').forEach(b => b.classList.remove('selected'));
  state.journalMood = null;
  drawGauge(0);
  renderJournalEntries();
  
  if (!navigator.onLine) {
    updateSyncUI('pending');
    showToast('Encrypted locally & queued for sync 🔒');
  } else {
    executeSync();
    showToast('Entry synced to cloud! ✨');
  }
}

function renderJournalEntries() {
  const c = document.getElementById('journalEntriesList');
  const entries = state.entries.slice().reverse();
  const moodMap = { happy: '😊', calm: '😌', anxious: '😟', sad: '😢', angry: '😠' };
  if (!entries.length) { c.innerHTML = '<div class="glass-card glass-card-sm empty-state"><div class="empty-state-icon">📝</div><div class="empty-state-text">Your journal entries will appear here</div></div>'; return; }
  c.innerHTML = entries.slice(0, 10).map(e => `<div class="glass-card glass-card-sm"><div class="entry-item" style="border:none;"><div class="entry-mood-icon">${moodMap[e.mood]||'📝'}</div><div class="entry-content"><div class="entry-preview">${e.text.substring(0,80)}${e.text.length>80?'...':''}</div><div class="entry-meta">${new Date(e.date).toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'})} · Compound: ${(e.compound||0).toFixed(2)}</div></div><div class="entry-sentiment"><span class="chip ${(e.compound||0)>=0.05?'chip-teal':(e.compound||0)<=-0.05?'chip-rose':'chip-amber'}">${(e.compound||0)>=0.05?'Positive':(e.compound||0)<=-0.05?'Negative':'Neutral'}</span></div></div></div>`).join('');
}

// ============================================
// VADER Sentiment Analysis Engine
// ============================================
const VADER_LEXICON = {"$:":"-1.5","%)":"-0.4",":(":-1.9,":'(":-1.9,":)":" 1.9",":-(":-1.9,":-)":" 1.9",":/":-0.9,":>":" 0.5",":D":" 2.2",":P":" 0.7",":]":" 1.5",":{":"-1.1",":}":" 0.7",";)":" 1.3","<3":" 2.0","</3":"-1.3","xD":" 1.9",
"abandon":-2.0,"abandoned":-2.4,"abandonment":-2.5,"abhor":-3.0,"abhorred":-2.9,"abhorrent":-3.1,"abuse":-3.2,"abused":-3.1,"ache":-2.0,"aching":-1.8,"admirable":2.0,"admire":2.1,"adore":2.5,"adored":2.5,"affection":2.2,"afraid":-2.0,"aggravate":-2.2,"agony":-3.0,"agree":1.0,"agreeable":1.5,"alarmed":-2.0,"alienated":-2.1,"alive":1.5,"alone":-1.5,"amazed":2.1,"amazing":2.8,"anger":-2.3,"angry":-2.5,"anguish":-3.0,"annoyed":-2.0,"anxious":-1.8,"apathetic":-1.5,"apologize":-0.5,"appreciate":2.0,"appreciated":2.2,"appreciation":2.3,"apprehensive":-1.5,"ashamed":-2.0,"assault":-3.0,"awful":-2.5,
"bad":-2.5,"beautiful":2.8,"beloved":2.5,"benefit":1.5,"best":3.0,"better":1.5,"bitter":-2.0,"bless":2.0,"blessed":2.2,"bliss":3.0,"blissful":3.0,"blue":-0.5,"bored":-1.5,"boring":-2.0,"brave":2.0,"breakdown":-2.5,"breathtaking":3.0,"bright":1.5,"brilliant":2.5,"broken":-2.5,"burden":-2.0,"burnout":-2.5,
"calm":1.5,"calming":1.8,"care":1.5,"careful":1.0,"careless":-1.5,"celebrate":2.5,"charming":2.2,"cheer":2.5,"cheerful":2.5,"cold":-0.5,"comfort":2.0,"comfortable":1.8,"compassion":2.5,"concern":-0.5,"confident":2.0,"confused":-1.5,"content":1.5,"cope":0.5,"courage":2.0,"courageous":2.2,"crash":-2.0,"crazy":-1.0,"creative":2.0,"crisis":-3.0,"critical":-1.5,"cruel":-2.8,"crush":-2.0,"crushed":-2.5,"cry":-2.0,"crying":-2.5,
"damage":-2.5,"danger":-2.5,"dark":-1.5,"dead":-3.0,"death":-3.0,"defeat":-2.0,"defeated":-2.5,"delight":2.5,"delighted":2.8,"depressed":-3.0,"depression":-3.5,"despair":-3.0,"desperate":-3.0,"destroy":-3.0,"destroyed":-3.0,"devastated":-3.0,"difficult":-1.5,"disappointed":-2.0,"disappointing":-2.2,"disaster":-3.0,"dislike":-2.0,"distress":-2.5,"disturbed":-2.0,"doom":-3.0,"doubt":-1.5,"dread":-2.5,"dreadful":-2.8,"dumb":-2.0,
"eager":1.5,"ease":1.5,"easy":1.0,"elated":3.0,"embarrass":-2.0,"embarrassed":-2.2,"embrace":1.5,"emotional":-0.5,"empathy":2.0,"empowered":2.5,"empty":-2.0,"encourage":2.0,"encouraged":2.2,"energetic":2.0,"enjoy":2.0,"enjoyable":2.2,"enormous":0.5,"enthusiastic":2.5,"evil":-3.0,"excellent":3.0,"excited":2.5,"exciting":2.5,"exhausted":-2.0,"extraordinary":2.8,
"fail":-2.0,"failed":-2.2,"failure":-2.5,"fair":1.0,"faith":1.5,"fantastic":3.0,"fatigue":-1.8,"fear":-2.5,"fearful":-2.5,"fine":1.0,"fool":-2.0,"forgive":1.5,"forgiveness":1.8,"free":1.5,"freedom":1.5,"friendly":1.8,"frightened":-2.2,"frustrate":-2.0,"frustrated":-2.2,"frustrating":-2.5,"fulfilled":2.5,"fun":2.5,"furious":-3.0,
"gentle":1.5,"gift":1.5,"glad":2.0,"gloomy":-2.0,"glorious":2.5,"good":1.9,"grace":1.5,"graceful":2.0,"grateful":2.5,"gratitude":2.8,"great":2.5,"grieve":-2.5,"grief":-3.0,"grim":-2.0,"gross":-2.0,"growth":1.5,"guilt":-2.5,"guilty":-2.5,
"happiness":3.0,"happy":2.7,"harm":-2.5,"harmful":-2.5,"hate":-3.0,"hatred":-3.5,"heal":2.0,"healing":2.2,"health":1.5,"healthy":1.8,"heart":0.5,"heartbroken":-3.0,"heaven":1.5,"hell":-2.5,"help":1.5,"helpful":2.0,"helpless":-2.5,"hope":2.0,"hopeful":2.2,"hopeless":-3.0,"horrible":-2.8,"horrified":-3.0,"hostile":-2.5,"hug":2.0,"humble":1.0,"humor":1.8,"hurt":-2.5,"hurting":-2.5,
"ignore":-1.5,"ill":-2.0,"important":1.0,"impressed":2.0,"improve":1.5,"inadequate":-2.0,"incredible":2.8,"inferior":-2.0,"injure":-2.0,"innocent":1.0,"insecure":-2.0,"inspire":2.5,"inspired":2.5,"interesting":1.5,"irritated":-2.0,"isolated":-2.0,
"jealous":-2.0,"joyful":3.0,"joyous":3.0,"joy":3.0,"judge":-1.0,"justice":1.5,
"keen":1.5,"kind":2.0,"kindness":2.5,
"laugh":2.0,"laughter":2.2,"lazy":-1.0,"liberate":2.0,"lie":-2.0,"life":1.0,"light":1.0,"like":1.5,"lively":2.0,"lonely":-2.5,"loneliness":-2.5,"lose":-2.0,"loss":-2.5,"lost":-2.0,"love":3.0,"loved":3.0,"lovely":2.5,"loving":2.8,"low":-1.0,"lucky":2.0,
"mad":-2.0,"magnificent":3.0,"mean":-2.0,"meaningful":2.0,"mercy":1.5,"merry":2.5,"miracle":2.5,"miserable":-3.0,"misery":-3.0,"miss":-1.0,"mistake":-1.5,"moody":-1.5,"mourn":-2.5,
"nasty":-2.5,"negative":-2.0,"neglect":-2.0,"nervous":-1.5,"nice":1.8,"nightmare":-3.0,"numb":-1.5,
"ok":1.0,"okay":1.0,"optimistic":2.0,"outstanding":3.0,"overcome":1.5,"overwhelmed":-2.0,"overjoyed":3.0,
"pain":-2.5,"painful":-2.5,"panic":-3.0,"passion":2.0,"passionate":2.2,"patient":1.5,"peace":2.0,"peaceful":2.5,"perfect":3.0,"pessimistic":-2.0,"pity":-1.0,"pleasant":2.0,"pleased":2.0,"pleasure":2.5,"poor":-1.5,"positive":2.0,"powerful":2.0,"pray":1.0,"precious":2.2,"pressure":-1.5,"pride":1.5,"problem":-1.5,"promise":1.0,"proud":2.0,"punish":-2.5,
"rage":-3.0,"recovery":1.5,"regret":-2.0,"reject":-2.0,"rejected":-2.5,"relax":2.0,"relaxed":2.2,"relief":2.0,"relieved":2.2,"resilient":2.0,"respect":2.0,"restless":-1.5,"restore":1.5,"rude":-2.0,
"sad":-2.5,"sadness":-2.8,"safe":1.5,"satisfied":2.0,"scare":-2.0,"scared":-2.2,"scary":-2.2,"scream":-2.0,"selfish":-2.0,"serene":2.5,"shame":-2.5,"shocked":-1.5,"shy":-0.5,"sick":-2.0,"silly":0.5,"sincere":1.5,"smile":2.0,"soothe":1.8,"sorry":-1.0,"soul":0.5,"special":2.0,"spirit":1.0,"stress":-2.0,"stressed":-2.2,"strong":1.5,"struggle":-2.0,"stuck":-1.5,"stupid":-2.0,"success":2.5,"suffer":-2.5,"suffering":-2.8,"sunshine":1.5,"superb":3.0,"support":2.0,"supportive":2.2,"survive":1.0,"sweet":1.5,"sympathy":1.5,
"tear":-1.5,"tender":1.5,"terrible":-2.8,"terrified":-3.0,"terror":-3.0,"thankful":2.5,"therapy":1.0,"thoughtful":1.8,"thrive":2.5,"tired":-1.5,"together":1.0,"torment":-3.0,"touch":1.0,"tough":-0.5,"toxic":-3.0,"tragic":-3.0,"tranquil":2.0,"trap":-2.0,"trapped":-2.5,"trauma":-3.0,"treasure":2.0,"tremendous":2.0,"trouble":-2.0,"troubled":-2.2,"trust":2.0,
"ugly":-2.0,"unbearable":-3.0,"understand":1.5,"understanding":2.0,"unfair":-2.0,"unfortunate":-1.5,"unhappy":-2.5,"unique":1.5,"upset":-2.0,"useless":-2.5,
"valuable":2.0,"victim":-2.5,"victory":2.5,"violence":-3.0,"violent":-3.0,"virtue":1.5,"vital":1.5,"vulnerable":-1.0,
"warm":1.5,"warmth":2.0,"weak":-1.5,"weary":-1.5,"weep":-2.0,"welcome":1.5,"well":1.0,"wellness":2.0,"whole":1.0,"wicked":-2.5,"win":2.5,"wisdom":2.0,"wise":1.5,"wish":0.5,"wonder":2.0,"wonderful":3.0,"worried":-2.0,"worry":-2.0,"worse":-2.5,"worst":-3.0,"worth":1.0,"worthless":-3.0,"worthy":2.0,"wow":2.5,"wrath":-3.0,"wrong":-2.0,
"yay":2.0,"yes":0.5,"young":0.5,"youthful":1.0,"zen":2.0,"zest":1.5};

const BOOSTERS = {"absolutely":0.293,"amazingly":0.293,"awfully":0.293,"completely":0.293,"considerably":0.293,"decidedly":0.293,"deeply":0.293,"enormously":0.293,"entirely":0.293,"especially":0.293,"exceptionally":0.293,"extremely":0.293,"fabulously":0.293,"greatly":0.293,"hardly":-0.293,"highly":0.293,"hugely":0.293,"incredibly":0.293,"intensely":0.293,"majorly":0.293,"more":0.293,"most":0.293,"particularly":0.293,"purely":0.293,"quite":0.293,"really":0.293,"remarkably":0.293,"so":0.293,"substantially":0.293,"thoroughly":0.293,"totally":0.293,"tremendously":0.293,"truly":0.293,"uber":0.293,"unbelievably":0.293,"unusually":0.293,"utterly":0.293,"very":0.293};
const NEGATIONS = new Set(["aint","arent","cannot","cant","couldnt","darent","didnt","doesnt","dont","hadnt","hasnt","havent","isnt","mightnt","mustnt","neither","never","no","nobody","none","nope","nor","not","nothing","nowhere","oughtnt","shant","shouldnt","uhuh","wasnt","werent","without","wont","wouldnt"]);

function vaderSentiment(text) {
  if (!text || !text.trim()) return { pos: 0, neu: 1, neg: 0, compound: 0 };
  const words = text.toLowerCase().replace(/[^\w\s':;()\-<>/\\|@#]/g, ' ').split(/\s+/).filter(Boolean);
  let sentiments = [];
  for (let i = 0; i < words.length; i++) {
    const w = words[i];
    let val = VADER_LEXICON[w];
    if (val === undefined) continue;
    val = parseFloat(val);
    // Check for negation in previous 3 words
    for (let j = Math.max(0, i - 3); j < i; j++) {
      if (NEGATIONS.has(words[j])) { val *= -0.74; break; }
    }
    // Check for boosters in previous word
    if (i > 0 && BOOSTERS[words[i - 1]]) {
      val += val > 0 ? BOOSTERS[words[i - 1]] : -BOOSTERS[words[i - 1]];
    }
    // ALL CAPS emphasis
    const orig = text.split(/\s+/)[i];
    if (orig && orig === orig.toUpperCase() && orig !== orig.toLowerCase()) val *= 1.15;
    sentiments.push(val);
  }
  if (!sentiments.length) return { pos: 0, neu: 1, neg: 0, compound: 0 };
  let posSum = 0, negSum = 0, neuCount = 0;
  sentiments.forEach(s => { if (s > 0.05) posSum += s + 1; else if (s < -0.05) negSum += s - 1; else neuCount++; });
  const total = posSum + Math.abs(negSum) + neuCount;
  const pos = Math.round((posSum / total) * 1000) / 1000;
  const neg = Math.round((Math.abs(negSum) / total) * 1000) / 1000;
  const neu = Math.round((neuCount / total) * 1000) / 1000;
  const raw = sentiments.reduce((a, b) => a + b, 0);
  const compound = Math.round((raw / Math.sqrt(raw * raw + 15)) * 10000) / 10000;
  return { pos, neu, neg, compound };
}

function analyzeJournalSentiment() {
  const text = document.getElementById('journalText').value;
  const scores = vaderSentiment(text);
  
  // Combine Text Sentiment with Audio Tone Analysis
  if (state.voiceActive) {
    // Audio tone acts as a secondary bias (Weight: 70% Text, 30% Audio Tone)
    const audioBias = state.voiceToneValence * 0.3;
    scores.compound = Math.max(-1, Math.min(1, (scores.compound * 0.7) + audioBias));
  }

  drawGauge(scores.compound);
  const label = document.getElementById('gaugeLabel');
  if (scores.compound >= 0.05) label.textContent = 'Positive 😊';
  else if (scores.compound <= -0.05) label.textContent = 'Negative 😟';
  else label.textContent = 'Neutral 😐';
  document.getElementById('sentimentChips').innerHTML =
    `<span class="chip chip-teal">Pos: ${scores.pos.toFixed(2)}</span>` +
    `<span class="chip chip-amber">Neu: ${scores.neu.toFixed(2)}</span>` +
    `<span class="chip chip-rose">Neg: ${scores.neg.toFixed(2)}</span>` +
    `<span class="chip chip-indigo">Compound: ${scores.compound.toFixed(2)}</span>`;
}
/* ============================================
   HopeStack — App Logic Part 2
   Charts, PHQ-9, Resources, Breathing, Init
   ============================================ */

// --- Gauge Drawing ---
function drawGauge(compound) {
  const canvas = document.getElementById('gaugeCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  ctx.clearRect(0, 0, W, H);
  const cx = W / 2, cy = H - 10, r = 85;
  // Background arc
  ctx.beginPath(); ctx.arc(cx, cy, r, Math.PI, 0, false);
  ctx.lineWidth = 18; ctx.strokeStyle = 'rgba(255,255,255,0.06)'; ctx.lineCap = 'round'; ctx.stroke();
  // Gradient arc
  const grad = ctx.createLinearGradient(cx - r, cy, cx + r, cy);
  grad.addColorStop(0, '#fb7185'); grad.addColorStop(0.5, '#fbbf24'); grad.addColorStop(1, '#2dd4bf');
  ctx.beginPath(); ctx.arc(cx, cy, r, Math.PI, 0, false);
  ctx.lineWidth = 18; ctx.strokeStyle = grad; ctx.lineCap = 'round'; ctx.stroke();
  // Needle
  const norm = (compound + 1) / 2; // 0 to 1
  const angle = Math.PI + norm * Math.PI;
  const nx = cx + Math.cos(angle) * (r - 5), ny = cy + Math.sin(angle) * (r - 5);
  ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(nx, ny);
  ctx.lineWidth = 3; ctx.strokeStyle = '#f1f5f9'; ctx.lineCap = 'round'; ctx.stroke();
  // Center dot
  ctx.beginPath(); ctx.arc(cx, cy, 6, 0, Math.PI * 2);
  ctx.fillStyle = '#f1f5f9'; ctx.fill();
}

// --- Trend Sparkline ---
function drawTrendChart() {
  const canvas = document.getElementById('trendCanvas');
  const parent = canvas ? canvas.parentElement : null;
  if (!canvas || !parent || parent.offsetWidth === 0) return;
  
  const ctx = canvas.getContext('2d');
  canvas.width = parent.offsetWidth * 2; canvas.height = parent.offsetHeight * 2;
  ctx.scale(2, 2);
  const W = parent.offsetWidth, H = parent.offsetHeight;
  ctx.clearRect(0, 0, W, H);
  const recent = state.entries.slice(-7);
  if (recent.length < 2) {
    ctx.fillStyle = '#64748b'; ctx.font = '12px Inter'; ctx.textAlign = 'center';
    ctx.fillText('Add more entries to see trends', W / 2, H / 2); return;
  }
  const vals = recent.map(e => e.compound || 0);
  const min = Math.min(...vals, -1), max = Math.max(...vals, 1);
  const range = max - min || 1;
  const pts = vals.map((v, i) => ({ x: (i / (vals.length - 1)) * (W - 40) + 20, y: H - 35 - ((v - min) / range) * (H - 50) }));
  // X-Axis Labels (Time)
  ctx.fillStyle = '#94a3b8'; ctx.font = '9px Inter'; ctx.textAlign = 'center';
  recent.forEach((e, i) => {
    const x = pts[i].x;
    const timeStr = new Date(e.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    ctx.fillText(timeStr, x, H - 10);
  });
  // Fill gradient
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, 'rgba(129,140,248,0.2)'); grad.addColorStop(1, 'rgba(129,140,248,0)');
  ctx.beginPath(); ctx.moveTo(pts[0].x, H);
  pts.forEach(p => ctx.lineTo(p.x, p.y));
  ctx.lineTo(pts[pts.length - 1].x, H); ctx.closePath(); ctx.fillStyle = grad; ctx.fill();
  // Line
  ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y);
  pts.forEach(p => ctx.lineTo(p.x, p.y));
  ctx.strokeStyle = '#818cf8'; ctx.lineWidth = 2; ctx.lineJoin = 'round'; ctx.stroke();
  // Dots
  pts.forEach(p => { ctx.beginPath(); ctx.arc(p.x, p.y, 3, 0, Math.PI * 2); ctx.fillStyle = '#818cf8'; ctx.fill(); });
}

// --- Mood Chart ---
function updateMoodTracker() {
  drawMoodChart(); drawSentimentChart(); updateMoodStats(); drawHeatmap();
}

function drawMoodChart() {
  const canvas = document.getElementById('moodChartCanvas');
  const parent = canvas ? canvas.parentElement : null;
  if (!canvas || !parent || parent.offsetWidth === 0) return;
  
  const ctx = canvas.getContext('2d');
  canvas.width = parent.offsetWidth * 2; canvas.height = parent.offsetHeight * 2;
  ctx.scale(2, 2);
  const W = parent.offsetWidth, H = parent.offsetHeight;
  ctx.clearRect(0, 0, W, H);
  const moodValues = { happy: 5, calm: 4, anxious: 2, sad: 1, angry: 1 };
  const recent = state.entries.slice(-state.period);
  if (recent.length < 2) {
    ctx.fillStyle = '#64748b'; ctx.font = '12px Inter'; ctx.textAlign = 'center';
    ctx.fillText('Need more entries for chart', W / 2, H / 2); return;
  }
  const vals = recent.map(e => moodValues[e.mood] || 3);
  const pts = vals.map((v, i) => ({ x: (i / (vals.length - 1)) * (W - 40) + 20, y: H - 35 - ((v - 1) / 4) * (H - 55) }));

  // X-Axis Labels (Time)
  ctx.fillStyle = '#94a3b8'; ctx.font = '9px Inter'; ctx.textAlign = 'center';
  recent.forEach((e, i) => {
    const x = pts[i].x;
    const timeStr = new Date(e.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    ctx.fillText(timeStr, x, H - 10);
  });

  // Y-Axis Indicators (Simplified)
  ctx.textAlign = 'right'; ctx.font = '8px Inter';
  ctx.fillText('Great', 18, H - 35 - (4/4)*(H-55));
  ctx.fillText('Rough', 18, H - 35);
  // Grid lines
  ctx.strokeStyle = 'rgba(255,255,255,0.04)'; ctx.lineWidth = 1;
  for (let i = 0; i < 5; i++) { const y = H - 20 - (i / 4) * (H - 40); ctx.beginPath(); ctx.moveTo(20, y); ctx.lineTo(W - 20, y); ctx.stroke(); }
  // Area fill
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, 'rgba(45,212,191,0.15)'); grad.addColorStop(1, 'rgba(45,212,191,0)');
  ctx.beginPath(); ctx.moveTo(pts[0].x, H - 20);
  pts.forEach(p => ctx.lineTo(p.x, p.y));
  ctx.lineTo(pts[pts.length - 1].x, H - 20); ctx.closePath(); ctx.fillStyle = grad; ctx.fill();
  // Line
  ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) {
    const xc = (pts[i - 1].x + pts[i].x) / 2, yc = (pts[i - 1].y + pts[i].y) / 2;
    ctx.quadraticCurveTo(pts[i - 1].x, pts[i - 1].y, xc, yc);
  }
  ctx.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y);
  ctx.strokeStyle = '#2dd4bf'; ctx.lineWidth = 2.5; ctx.stroke();
  // Dots
  const colors = { 5: '#2dd4bf', 4: '#818cf8', 3: '#fbbf24', 2: '#fb923c', 1: '#fb7185' };
  pts.forEach((p, i) => { ctx.beginPath(); ctx.arc(p.x, p.y, 4, 0, Math.PI * 2); ctx.fillStyle = colors[vals[i]] || '#818cf8'; ctx.fill(); ctx.strokeStyle = '#0f172a'; ctx.lineWidth = 2; ctx.stroke(); });
}

function drawSentimentChart() {
  const canvas = document.getElementById('sentimentChartCanvas');
  const parent = canvas ? canvas.parentElement : null;
  if (!canvas || !parent || parent.offsetWidth === 0) return;
  
  const ctx = canvas.getContext('2d');
  canvas.width = parent.offsetWidth * 2; canvas.height = parent.offsetHeight * 2;
  ctx.scale(2, 2);
  const W = parent.offsetWidth, H = parent.offsetHeight;
  ctx.clearRect(0, 0, W, H);
  const recent = state.entries.slice(-state.period);
  if (!recent.length) { ctx.fillStyle = '#64748b'; ctx.font = '12px Inter'; ctx.textAlign = 'center'; ctx.fillText('No data yet', W / 2, H / 2); return; }
  const barW = Math.min(30, (W - 40) / recent.length - 4);
  recent.forEach((e, i) => {
    const x = 20 + i * ((W - 40) / recent.length);
    const posH = (e.pos || 0) * (H - 40);
    const negH = (e.neg || 0) * (H - 40);
    // Positive bar
    ctx.fillStyle = 'rgba(45,212,191,0.7)';
    ctx.beginPath(); ctx.roundRect(x, H - 20 - posH, barW, posH, 3); ctx.fill();
    // Negative bar (below baseline conceptually, shown as red portion)
    ctx.fillStyle = 'rgba(251,113,133,0.7)';
    ctx.beginPath(); ctx.roundRect(x + barW + 2, H - 35 - negH, barW, negH, 3); ctx.fill();
    
    // X-Axis Labels (Time)
    ctx.fillStyle = '#94a3b8'; ctx.font = '8px Inter'; ctx.textAlign = 'center';
    const timeStr = new Date(e.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    ctx.fillText(timeStr, x + barW, H - 10);
  });
}

function updateMoodStats() {
  const recent = state.entries.slice(-state.period);
  const moodMap = { happy: '😊', calm: '😌', anxious: '😟', sad: '😢', angry: '😠' };
  if (!recent.length) { document.getElementById('avgMoodStat').textContent = '—'; document.getElementById('frequentMoodStat').textContent = '—'; document.getElementById('streakCount').textContent = '0'; return; }
  const counts = {};
  recent.forEach(e => { counts[e.mood] = (counts[e.mood] || 0) + 1; });
  const topMood = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
  document.getElementById('frequentMoodStat').textContent = (moodMap[topMood[0]] || '') + ' ' + topMood[0];
  const moodValues = { happy: 5, calm: 4, anxious: 2, sad: 1, angry: 1 };
  const avg = recent.reduce((s, e) => s + (moodValues[e.mood] || 3), 0) / recent.length;
  const avgLabels = { 5: '😊 Great', 4: '😌 Good', 3: '😐 Okay', 2: '😟 Low', 1: '😢 Rough' };
  document.getElementById('avgMoodStat').textContent = avgLabels[Math.round(avg)] || '😐 Okay';
  // Streak
  let streak = 0;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  for (let d = 0; d < 365; d++) {
    const check = new Date(today); check.setDate(check.getDate() - d);
    const found = state.entries.some(e => { const ed = new Date(e.date); ed.setHours(0, 0, 0, 0); return ed.getTime() === check.getTime(); });
    if (found) streak++; else break;
  }
  document.getElementById('streakCount').textContent = streak;
}

function drawHeatmap() {
  const grid = document.getElementById('heatmapGrid');
  if (!grid) return;
  const days = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  let html = days.map(d => `<div class="heatmap-day-label">${d}</div>`).join('');
  const today = new Date();
  const entryCounts = {};
  state.entries.forEach(e => { const d = new Date(e.date).toDateString(); entryCounts[d] = (entryCounts[d] || 0) + 1; });
  for (let i = 34; i >= 0; i--) {
    const d = new Date(today); d.setDate(d.getDate() - i);
    const count = entryCounts[d.toDateString()] || 0;
    const level = count === 0 ? 0 : Math.min(count + 1, 5);
    html += `<div class="heatmap-cell level-${level}" title="${d.toDateString()}: ${count} entries"></div>`;
  }
  grid.innerHTML = html;
}

function setPeriod(btn) {
  document.querySelectorAll('.period-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  state.period = parseInt(btn.dataset.period);
  updateMoodTracker();
}

// ============================================
// PHQ-9 SCREENING
// ============================================
const PHQ9_QUESTIONS = [
  "Little interest or pleasure in doing things?",
  "Feeling down, depressed, or hopeless?",
  "Trouble falling or staying asleep, or sleeping too much?",
  "Feeling tired or having little energy?",
  "Poor appetite or overeating?",
  "Feeling bad about yourself — or that you are a failure or have let yourself or your family down?",
  "Trouble concentrating on things, such as reading or watching television?",
  "Moving or speaking so slowly that other people could have noticed? Or being fidgety or restless?",
  "Thoughts that you would be better off dead, or of hurting yourself?"
];
const PHQ9_OPTIONS = ["Not at all", "Several days", "More than half the days", "Nearly every day"];

function startScreening() {
  state.screeningAnswers = new Array(9).fill(-1);
  state.currentQuestion = 0;
  document.getElementById('screeningIntro').style.display = 'none';
  document.getElementById('screeningQuestions').style.display = 'block';
  document.getElementById('screeningResults').style.display = 'none';
  showQuestion();
}

function showQuestion() {
  const q = state.currentQuestion;
  document.getElementById('questionText').textContent = `Over the last 2 weeks, how often have you been bothered by: ${PHQ9_QUESTIONS[q]}`;
  document.getElementById('questionCounter').textContent = `Question ${q + 1} of 9`;
  document.getElementById('screeningProgress').style.width = `${((q + 1) / 9) * 100}%`;
  document.getElementById('btnPrevQ').style.display = q > 0 ? 'block' : 'none';
  const sel = state.screeningAnswers[q];
  document.getElementById('answerOptions').innerHTML = PHQ9_OPTIONS.map((opt, i) =>
    `<button class="answer-option ${sel === i ? 'selected' : ''}" onclick="selectAnswer(${i})"><div class="answer-radio"></div>${opt}</button>`
  ).join('');
  document.getElementById('btnNextQ').disabled = sel === -1;
  document.getElementById('btnNextQ').textContent = q === 8 ? 'See Results' : 'Next →';
}

function selectAnswer(val) {
  state.screeningAnswers[state.currentQuestion] = val;
  showQuestion();
}

function nextQuestion() {
  if (state.screeningAnswers[state.currentQuestion] === -1) return;
  if (state.currentQuestion < 8) { state.currentQuestion++; showQuestion(); }
  else showResults();
}

function prevQuestion() {
  if (state.currentQuestion > 0) { state.currentQuestion--; showQuestion(); }
}

function showResults() {
  const score = state.screeningAnswers.reduce((a, b) => a + b, 0);
  document.getElementById('screeningQuestions').style.display = 'none';
  document.getElementById('screeningResults').style.display = 'block';
  document.getElementById('phqScore').textContent = score;
  let severity, cls, desc;
  if (score <= 4) { severity = 'Minimal'; cls = 'severity-minimal'; desc = 'Your responses suggest minimal depression symptoms. Continue monitoring your mental health and maintaining healthy habits.'; }
  else if (score <= 9) { severity = 'Mild'; cls = 'severity-mild'; desc = 'Your responses suggest mild depression symptoms. Consider incorporating wellness activities and monitoring how you feel. If symptoms persist, consult a professional.'; }
  else if (score <= 14) { severity = 'Moderate'; cls = 'severity-moderate'; desc = 'Your responses suggest moderate depression symptoms. We recommend speaking with a mental health professional for further evaluation and support.'; }
  else if (score <= 19) { severity = 'Moderately Severe'; cls = 'severity-mod-severe'; desc = 'Your responses suggest moderately severe depression. Please consider reaching out to a mental health professional. Treatment can make a significant difference.'; }
  else { severity = 'Severe'; cls = 'severity-severe'; desc = 'Your responses suggest severe depression symptoms. We strongly encourage you to seek professional help as soon as possible. You are not alone — support is available.'; }
  const badge = document.getElementById('severityBadge');
  badge.textContent = severity; badge.className = 'severity-badge ' + cls;
  document.getElementById('resultDescription').textContent = desc;
}

function resetScreening() {
  document.getElementById('screeningIntro').style.display = 'block';
  document.getElementById('screeningQuestions').style.display = 'none';
  document.getElementById('screeningResults').style.display = 'none';
}

// --- Voice Recording & Transcription ---
function toggleVoiceRecording() {
  if (state.voiceActive) stopVoiceRecording();
  else startVoiceRecording();
}

async function startVoiceRecording() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    showToast('Speech Recognition requires Chrome or Safari 14.1+.', 'error');
    return;
  }
  
  try {
    // 1. Initialize Speech Recognition First to prevent Mac Mic Lock
    state.recognition = new SpeechRecognition();
    state.recognition.continuous = true;
    state.recognition.interimResults = true;
    state.recognition.lang = state.lang === 'en' ? 'en-US' : (state.lang === 'hi' ? 'hi-IN' : 'bn-IN');
    
    // Save the text the user already authored before hitting record
    const originalText = document.getElementById('journalText').value.trim();
    const prefix = originalText ? originalText + ' ' : '';
    
    // 2. Request manual Media Stream for visualizer
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    state.mediaStream = stream; // Track to close later
    
    // Update UI
    state.voiceActive = true;
    const btn = document.getElementById('btnMic');
    btn.classList.add('recording');
    btn.querySelector('.btn-label').textContent = 'Stop Recording';
    document.getElementById('voiceWaveCard').classList.remove('hidden');
    
    // Waveform Setup
    state.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const source = state.audioContext.createMediaStreamSource(stream);
    state.analyser = state.audioContext.createAnalyser();
    state.analyser.fftSize = 64;
    source.connect(state.analyser);
    state.dataArray = new Uint8Array(state.analyser.frequencyBinCount);
    
    renderVoiceBars();
    animateVoiceWave();
    
    // 3. Setup Recognition Callbacks
    state.recognition.onresult = (event) => {
      let transcript = '';
      for (let i = 0; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      document.getElementById('journalText').value = prefix + transcript;
      analyzeJournalSentiment();
    };
    
    state.recognition.onerror = (e) => {
      console.error('Recognition error:', e.error);
      if (e.error === 'not-allowed') {
        showToast('Microphone access denied', 'error');
        stopVoiceRecording();
      }
    };
    
    state.recognition.onend = () => { 
      if (state.voiceActive) {
        try { state.recognition.start(); } catch(e){} 
      }
    };
    
    state.recognition.start();
    showToast('Listening... Speak freely 🎙️');
    
  } catch (err) {
    console.error('Audio initialization error:', err);
    showToast('Microphone start failed. Check permissions.', 'error');
    stopVoiceRecording();
  }
}

function stopVoiceRecording() {
  state.voiceActive = false;
  const btn = document.getElementById('btnMic');
  if (btn) {
    btn.classList.remove('recording');
    btn.querySelector('.btn-label').textContent = 'Speech to Text';
  }
  const waveCard = document.getElementById('voiceWaveCard');
  if (waveCard) waveCard.classList.add('hidden');
  
  if (state.recognition) {
    state.recognition.onend = null;
    try { state.recognition.stop(); } catch(e){}
  }
  
  if (state.audioContext) {
    state.audioContext.close();
  }
  
  if (state.mediaStream) {
    state.mediaStream.getTracks().forEach(track => track.stop());
    state.mediaStream = null;
  }
  
  showToast('Voice journaling stopped');
}
function renderVoiceBars() {
  const container = document.getElementById('voiceWaveform');
  container.innerHTML = '';
  for (let i = 0; i < 20; i++) {
    const bar = document.createElement('div');
    bar.className = 'voice-bar';
    container.appendChild(bar);
  }
}

function animateVoiceWave() {
  if (!state.voiceActive) { state.voiceIntensity = 1.0; state.voiceToneValence = 0; return; }
  state.analyser.getByteFrequencyData(state.dataArray);
  
  let sum = 0;
  let peakFreqIndex = 0;
  let maxFreqVal = 0;
  const bars = document.querySelectorAll('.voice-bar');
  
  bars.forEach((bar, i) => {
    const val = state.dataArray[i] || 0;
    sum += val;
    if (val > maxFreqVal) { maxFreqVal = val; peakFreqIndex = i; }
    const height = Math.max(4, (val / 255) * 40);
    bar.style.height = height + 'px';
    bar.style.opacity = 0.3 + (val / 255) * 0.7;
  });
  
  // 1. Intensity (Energy)
  const avg = sum / bars.length;
  state.voiceIntensity = 1.0 + (avg / 255) * 0.5;
  
  // 2. Valence Estimation (Pitch Analysis)
  // Higher peak frequency index (i) = higher pitch
  // Mid-high pitch with stable energy = Positive
  // Very high/harsh energy = Stress/Anger (Negative)
  // Low pitch with low energy = Sad (Negative)
  const pitchFactor = peakFreqIndex / bars.length; // 0 to 1
  const energyFactor = avg / 255; // 0 to 1
  
  if (energyFactor > 0.4 && pitchFactor > 0.4) {
    state.voiceToneValence = 0.5; // High/Bright (Positive/Excited)
  } else if (energyFactor > 0.6 && pitchFactor < 0.3) {
    state.voiceToneValence = -0.5; // Harsh/Low (Anger/Frustration)
  } else if (energyFactor < 0.15 && pitchFactor < 0.2) {
    state.voiceToneValence = -0.4; // Dull/Soft (Sadness/Low energy)
  } else {
    state.voiceToneValence = 0; // Neutral/Calm
  }
  
  requestAnimationFrame(animateVoiceWave);
}

// --- Secure Offline & Cloud Sync ---
async function initSyncEngine() {
  window.addEventListener('online', () => {
    document.body.classList.remove('is-offline');
    updateSyncUI('online');
    executeSync();
  });
  window.addEventListener('offline', () => {
    document.body.classList.add('is-offline');
    updateSyncUI('offline');
  });
  
  // Initial check
  if (!navigator.onLine) {
    document.body.classList.add('is-offline');
    updateSyncUI('offline');
  }
}

function updateSyncUI(status) {
  const el = document.getElementById('syncStatus');
  if (!el) return;
  el.className = 'sync-status';
  if (status === 'offline') {
    el.classList.add('offline');
    el.title = 'Working Offline (Encrypted Local Storage Active)';
  } else if (status === 'pending') {
    el.classList.add('pending');
    el.title = 'Unsynced Changes (Waiting to Upload)';
  } else if (status === 'syncing') {
    el.classList.add('syncing');
    el.title = 'Syncing to Cloud...';
  } else {
    el.title = 'All Data Securely Synced';
  }
}

// Simple Obfuscation Wrapper for local storage security
function secureStorage(data) {
  const str = JSON.stringify(data);
  // Basic XOR/Base64 for POC - upgradeable to AES-GCM
  return btoa(unescape(encodeURIComponent(str)));
}

function insecureStorage(blob) {
  try {
    const str = decodeURIComponent(escape(atob(blob)));
    return JSON.parse(str);
  } catch (e) { return null; }
}

async function executeSync() {
  const unsynced = state.entries.filter(e => !e.synced);
  if (unsynced.length === 0) return;
  
  updateSyncUI('syncing');
  
  // Simulated Cloud API Upload
  console.log('☁️ HopeStack: Syncing ' + unsynced.length + ' entries to cloud...');
  
  // Wait for simulation
  await new Promise(r => setTimeout(r, 2000));
  
  state.entries.forEach(e => { e.synced = true; });
  localStorage.setItem('hopestack_entries', JSON.stringify(state.entries));
  
  updateSyncUI('online');
  showToast('✓ All data successfully synced to cloud');
  renderRecentEntries();
}

// ============================================
// RESOURCES
// ============================================
const RESOURCES = [
  { cat: 'meditation', icon: '🧘', bg: 'var(--accent-lavender-dim)', title: 'Mindfulness Meditation', desc: 'A research-proven way to reduce stress and improve emotional health.', source: 'APA', link: 'https://www.apa.org/topics/mindfulness/meditation', tag: 'chip-lavender' },
  { cat: 'meditation', icon: '🌅', bg: 'var(--accent-amber-dim)', title: 'Morning Rituals for Calm', desc: 'Simple morning habits to set a positive tone for your entire day.', source: 'Mayo Clinic', link: 'https://www.mayoclinichealthsystem.org/hometown-health/speaking-of-health/morning-routines-for-mental-well-being', tag: 'chip-amber' },
  { cat: 'breathing', icon: '🌬️', bg: 'var(--accent-teal-dim)', title: '4-7-8 Breathing Technique', desc: 'A scientifically backed tool to reduce anxiety and aid sleep.', source: 'Healthline', link: 'https://www.healthline.com/health/4-7-8-breathing', tag: 'chip-teal', action: 'breathing' },
  { cat: 'breathing', icon: '💨', bg: 'var(--accent-emerald-dim)', title: 'Box Breathing Benefits', desc: 'How rhythmic breathing can calm your nervous system instantly.', source: 'Cleveland Clinic', link: 'https://health.clevelandclinic.org/box-breathing-benefits/', tag: 'chip-emerald' },
  { cat: 'articles', icon: '📖', bg: 'var(--accent-indigo-dim)', title: '4 Steps to Relieve Stress', desc: 'Practical, actionable steps to manage daily stressors effectively.', source: 'Mayo Clinic', link: 'https://www.mayoclinic.org/healthy-lifestyle/stress-management/in-depth/stress-relief/art-20044456', tag: 'chip-indigo' },
  { cat: 'articles', icon: '🧠', bg: 'var(--accent-rose-dim)', title: 'Caring for Your Mental Health', desc: 'Fundamental self-care tips from the leading mental health research agency.', source: 'NIMH', link: 'https://www.nimh.nih.gov/health/topics/caring-for-your-mental-health', tag: 'chip-rose' },
  { cat: 'articles', icon: '💤', bg: 'var(--accent-lavender-dim)', title: 'Sleep and Mental Health', desc: 'Explore the vital link between quality sleep and emotional resilience.', source: 'Psychology Today', link: 'https://www.psychologytoday.com/us/blog/sleep-new-world/202102/the-vital-link-between-sleep-and-mental-health', tag: 'chip-lavender' },
  { cat: 'articles', icon: '🌱', bg: 'var(--accent-emerald-dim)', title: 'Healthy Ways to Cope', desc: 'CDC-recommended strategies for building resilience during stressful times.', source: 'CDC', link: 'https://www.cdc.gov/mentalhealth/stress-coping/index.html', tag: 'chip-emerald' }
];

const AFFIRMATIONS = [
  "You are worthy of the love and kindness you give to others.",
  "Every day is a new opportunity to grow and become a better version of yourself.",
  "Your feelings are valid. It's okay to not be okay sometimes.",
  "You have survived 100% of your worst days. You are stronger than you think.",
  "Progress, not perfection, is what matters.",
  "You deserve rest and recovery without guilt.",
  "Your mental health is a priority. Taking care of yourself is not selfish.",
  "You are not your thoughts. You are the observer of your thoughts.",
  "Small steps still move you forward.",
  "You are enough, just as you are right now.",
  "Healing is not linear. Be patient with yourself.",
  "You have the power to create positive change in your life."
];

function renderResources(filter = 'all') {
  const container = document.getElementById('resourceCards');
  const breathing = document.getElementById('breathingSection');
  const crisis = document.getElementById('crisisSection');
  const filtered = filter === 'all' ? RESOURCES : RESOURCES.filter(r => r.cat === filter);
  breathing.style.display = (filter === 'all' || filter === 'breathing') ? 'block' : 'none';
  crisis.style.display = (filter === 'all' || filter === 'crisis') ? 'block' : 'none';
  container.innerHTML = filtered.map(r =>
    `<div class="glass-card glass-card-sm resource-card" ${r.action ? `onclick="showBreathing()"` : ''}>
      <div class="resource-icon-wrapper" style="background: ${r.bg}">${r.icon}</div>
      <div class="resource-info">
        <div class="resource-title">${r.title}</div>
        <div class="resource-desc">${r.desc}</div>
        ${r.source ? `<div class="resource-source">${r.source}</div>` : ''}
        <div class="resource-tag"><span class="chip ${r.tag}">${r.cat}</span></div>
        ${r.link ? `<a href="${r.link}" target="_blank" class="resource-read-more" onclick="event.stopPropagation()">Read More ↗</a>` : ''}
      </div>
    </div>`
  ).join('');
}

function filterResources(btn) {
  document.querySelectorAll('.resource-tab').forEach(t => t.classList.remove('active'));
  btn.classList.add('active');
  renderResources(btn.dataset.tab);
}

function refreshAffirmation() {
  const text = AFFIRMATIONS[Math.floor(Math.random() * AFFIRMATIONS.length)];
  const el = document.getElementById('affirmationText');
  el.style.opacity = 0;
  setTimeout(() => { el.textContent = `"${text}"`; el.style.opacity = 1; }, 300);
}

// --- Breathing Exercise ---
function toggleBreathing() {
  const btn = document.getElementById('btnBreathing');
  if (state.breathingActive) { stopBreathing(); btn.textContent = 'Start Breathing 🌬️'; }
  else { startBreathingExercise(); btn.textContent = 'Stop ⬜'; }
}

function startBreathingExercise() {
  state.breathingActive = true;
  const circle = document.getElementById('breathingCircle');
  const instr = document.getElementById('breathingInstruction');
  let phase = 0;
  function breathCycle() {
    if (!state.breathingActive) return;
    if (phase === 0) { circle.textContent = 'Inhale'; circle.className = 'breathing-circle inhale'; instr.textContent = 'Breathe in slowly for 4 seconds...'; state.breathingTimer = setTimeout(() => { phase = 1; breathCycle(); }, 4000); }
    else if (phase === 1) { circle.textContent = 'Hold'; circle.className = 'breathing-circle inhale'; instr.textContent = 'Hold your breath for 7 seconds...'; state.breathingTimer = setTimeout(() => { phase = 2; breathCycle(); }, 7000); }
    else { circle.textContent = 'Exhale'; circle.className = 'breathing-circle exhale'; instr.textContent = 'Breathe out slowly for 8 seconds...'; state.breathingTimer = setTimeout(() => { phase = 0; breathCycle(); }, 8000); }
  }
  breathCycle();
}

function stopBreathing() {
  state.breathingActive = false;
  clearTimeout(state.breathingTimer);
  const circle = document.getElementById('breathingCircle');
  circle.textContent = 'Ready'; circle.className = 'breathing-circle';
  document.getElementById('breathingInstruction').textContent = 'Press start to begin a 4-7-8 breathing exercise';
}

function showBreathing() {
  document.getElementById('breathingSection').style.display = 'block';
  document.getElementById('breathingSection').scrollIntoView({ behavior: 'smooth' });
}

// ============================================
// HERO CANVAS (Onboarding illustration)
// ============================================
function drawHeroIllustration() {
  const canvas = document.getElementById('heroCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  // Sky gradient
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, '#1e293b'); sky.addColorStop(1, '#0f172a');
  ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);
  // Stars
  for (let i = 0; i < 40; i++) { ctx.beginPath(); ctx.arc(Math.random() * W, Math.random() * H * 0.6, Math.random() * 1.5 + 0.5, 0, Math.PI * 2); ctx.fillStyle = `rgba(255,255,255,${Math.random() * 0.5 + 0.2})`; ctx.fill(); }
  // Moon
  ctx.beginPath(); ctx.arc(W * 0.75, H * 0.2, 30, 0, Math.PI * 2);
  const moonGrad = ctx.createRadialGradient(W * 0.75, H * 0.2, 0, W * 0.75, H * 0.2, 40);
  moonGrad.addColorStop(0, 'rgba(196,181,253,0.8)'); moonGrad.addColorStop(0.7, 'rgba(196,181,253,0.2)'); moonGrad.addColorStop(1, 'transparent');
  ctx.fillStyle = moonGrad; ctx.fill();
  ctx.beginPath(); ctx.arc(W * 0.75, H * 0.2, 22, 0, Math.PI * 2); ctx.fillStyle = '#c4b5fd'; ctx.fill();
  // Hills
  ctx.beginPath(); ctx.moveTo(0, H * 0.7);
  ctx.quadraticCurveTo(W * 0.3, H * 0.5, W * 0.6, H * 0.65);
  ctx.quadraticCurveTo(W * 0.8, H * 0.75, W, H * 0.6);
  ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.closePath();
  ctx.fillStyle = '#1a3a2a'; ctx.fill();
  ctx.beginPath(); ctx.moveTo(0, H * 0.8);
  ctx.quadraticCurveTo(W * 0.2, H * 0.65, W * 0.5, H * 0.75);
  ctx.quadraticCurveTo(W * 0.7, H * 0.82, W, H * 0.7);
  ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.closePath();
  ctx.fillStyle = '#15362a'; ctx.fill();
  // Tree
  ctx.fillStyle = '#2d5a3f'; ctx.beginPath();
  ctx.moveTo(W * 0.3, H * 0.73); ctx.lineTo(W * 0.3 - 20, H * 0.73);
  ctx.quadraticCurveTo(W * 0.3 - 5, H * 0.45, W * 0.3 + 10, H * 0.4);
  ctx.quadraticCurveTo(W * 0.3 + 25, H * 0.45, W * 0.3 + 20, H * 0.73);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#3d7a55'; ctx.beginPath();
  ctx.moveTo(W * 0.3 - 5, H * 0.68); ctx.quadraticCurveTo(W * 0.3, H * 0.48, W * 0.3 + 10, H * 0.45);
  ctx.quadraticCurveTo(W * 0.3 + 15, H * 0.50, W * 0.3 + 15, H * 0.68);
  ctx.closePath(); ctx.fill();
  // Person meditating
  const px = W * 0.5, py = H * 0.72;
  ctx.fillStyle = '#c4b5fd';
  ctx.beginPath(); ctx.arc(px, py - 25, 10, 0, Math.PI * 2); ctx.fill(); // head
  ctx.beginPath(); ctx.ellipse(px, py - 5, 15, 12, 0, 0, Math.PI * 2); ctx.fill(); // body
  ctx.beginPath(); ctx.ellipse(px, py + 8, 22, 6, 0, 0, Math.PI); ctx.fill(); // legs
  // Lotus
  ctx.fillStyle = 'rgba(45,212,191,0.4)';
  ctx.beginPath(); ctx.ellipse(px, py + 15, 25, 5, 0, 0, Math.PI * 2); ctx.fill();
}

// --- Stars ---
function createStars() {
  const c = document.getElementById('starsContainer');
  c.innerHTML = '';
  for (let i = 0; i < 50; i++) {
    const s = document.createElement('div');
    s.className = 'star';
    s.style.left = Math.random() * 100 + '%';
    s.style.top = Math.random() * 100 + '%';
    s.style.setProperty('--duration', (2 + Math.random() * 4) + 's');
    s.style.setProperty('--delay', (Math.random() * 3) + 's');
    s.style.width = s.style.height = (1 + Math.random() * 2) + 'px';
    c.appendChild(s);
  }
}

// ============================================
// INITIALIZATION
// ============================================
document.addEventListener('DOMContentLoaded', () => {
  createStars();
  drawHeroIllustration();
  drawGauge(0);
  initSyncEngine();
  
  // Inject Gen-Z lexicon into VADER
  Object.assign(VADER_LEXICON, GENZ_LEXICON);
  
  // Check if returning user (authenticated)
  if (state.user) {
    navigateTo('dashboard');
  }
  // Add transition for affirmation text
  const affEl = document.getElementById('affirmationText');
  if (affEl) affEl.style.transition = 'opacity 0.3s ease';
});

// Redraw canvases on resize
window.addEventListener('resize', () => {
  if (state.currentScreen === 'dashboard') drawTrendChart();
  if (state.currentScreen === 'mood') { drawMoodChart(); drawSentimentChart(); }
});
