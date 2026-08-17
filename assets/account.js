// ============ Supabase: акаунти, синхронізація результатів, рейтинг ============

const SUPABASE_URL = 'https://bhjcxommeixlnwgvurhz.supabase.co';
const SUPABASE_KEY = 'sb_publishable_pUTt418HPH8VZwuLCoFjeQ_BVUdCure';
const sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let currentUser = null;
let currentProfile = null;

function accountPrefix(){
  return location.pathname.includes('/days/') ? '../' : '';
}

async function initAccount(){
  const { data: { session } } = await sb.auth.getSession();
  if (session){
    currentUser = session.user;
    await loadProfile();
  }
  renderAccountWidget();
}

async function loadProfile(){
  if (!currentUser) return;
  const { data } = await sb.from('profiles').select('*').eq('id', currentUser.id).single();
  currentProfile = data;
}

function renderAccountWidget(){
  const el = document.getElementById('account-widget');
  if (!el) return;
  if (currentUser && currentProfile){
    el.innerHTML = `
      <span class="acc-name">👤 ${currentProfile.username}</span>
      <a class="acc-link" href="${accountPrefix()}leaderboard.html">🏆 Рейтинг</a>
      <button class="acc-btn" onclick="doLogout()">Вийти</button>
    `;
  } else if (currentUser && !currentProfile){
    el.innerHTML = `<span class="acc-name">Завантаження...</span>`;
  } else {
    el.innerHTML = `<button class="acc-btn acc-btn-main" onclick="openAuthForm()">Увійти / Створити кабінет</button>`;
  }
}

function openAuthForm(){
  const el = document.getElementById('account-widget');
  el.innerHTML = `
    <div class="auth-form">
      <input id="auth-username" type="text" placeholder="Ім'я в рейтингу" maxlength="20">
      <input id="auth-email" type="email" placeholder="Email">
      <input id="auth-password" type="password" placeholder="Пароль (мін. 6 символів)">
      <div class="auth-actions">
        <button onclick="doSignUp()">Зареєструватись</button>
        <button onclick="doSignIn()" class="auth-alt">Вже маю акаунт — увійти</button>
      </div>
      <div id="auth-msg" class="auth-msg"></div>
    </div>
  `;
}

async function doSignUp(){
  const username = document.getElementById('auth-username').value.trim();
  const email = document.getElementById('auth-email').value.trim();
  const password = document.getElementById('auth-password').value;
  const msg = document.getElementById('auth-msg');
  if (!username || !email || !password){ msg.textContent = 'Заповни всі поля'; return; }
  if (password.length < 6){ msg.textContent = 'Пароль має бути мінімум 6 символів'; return; }
  msg.textContent = 'Реєструємо...';
  const { data, error } = await sb.auth.signUp({ email, password });
  if (error){ msg.textContent = error.message; return; }
  currentUser = data.user;
  if (!currentUser){ msg.textContent = 'Перевір пошту для підтвердження акаунта.'; return; }
  const { error: pErr } = await sb.from('profiles').insert({ id: currentUser.id, username });
  if (pErr){ msg.textContent = 'Це ім\\'я вже зайняте, спробуй інше.'; return; }
  await loadProfile();
  await syncLocalToCloud();
  renderAccountWidget();
  if (typeof renderProgress === 'function') renderProgress();
}

async function doSignIn(){
  const email = document.getElementById('auth-email').value.trim();
  const password = document.getElementById('auth-password').value;
  const msg = document.getElementById('auth-msg');
  msg.textContent = 'Входимо...';
  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  if (error){ msg.textContent = 'Невірний email або пароль.'; return; }
  currentUser = data.user;
  await loadProfile();
  await syncLocalToCloud();
  renderAccountWidget();
  if (typeof renderProgress === 'function') renderProgress();
}

async function doLogout(){
  await sb.auth.signOut();
  currentUser = null;
  currentProfile = null;
  renderAccountWidget();
}

// Переносить гостьові результати (localStorage) у хмару одразу після входу/реєстрації
async function syncLocalToCloud(){
  if (!currentUser || typeof getDayResults !== 'function') return;
  const results = getDayResults();
  const rows = Object.keys(results).map(day => ({
    user_id: currentUser.id,
    day: parseInt(day, 10),
    is_correct: results[day] === 'correct'
  }));
  if (rows.length){
    await sb.from('results').upsert(rows, { onConflict: 'user_id,day' });
  }
}

// Викликається з quiz.js одразу після відповіді на питання
async function syncResultToCloud(day, isCorrect){
  if (!currentUser) return;
  await sb.from('results').upsert(
    { user_id: currentUser.id, day, is_correct: isCorrect },
    { onConflict: 'user_id,day' }
  );
}

document.addEventListener('DOMContentLoaded', initAccount);
