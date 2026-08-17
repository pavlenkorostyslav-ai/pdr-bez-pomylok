// ============ Локальне сховище: статистика, прогрес, стрік, помилки ============

function getStats(){
  try{ return JSON.parse(localStorage.getItem('pdr_stats')) || {correct:0, wrong:0}; }
  catch(e){ return {correct:0, wrong:0}; }
}
function saveStats(s){ try{ localStorage.setItem('pdr_stats', JSON.stringify(s)); }catch(e){} }

function getDayResults(){
  try{ return JSON.parse(localStorage.getItem('pdr_days')) || {}; }
  catch(e){ return {}; }
}
function saveDayResults(d){ try{ localStorage.setItem('pdr_days', JSON.stringify(d)); }catch(e){} }

function getStreak(){
  try{ return JSON.parse(localStorage.getItem('pdr_streak')) || {count:0, lastDate:null}; }
  catch(e){ return {count:0, lastDate:null}; }
}
function saveStreak(s){ try{ localStorage.setItem('pdr_streak', JSON.stringify(s)); }catch(e){} }

function todayStr(){
  const d = new Date();
  return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
}
function updateStreak(){
  const s = getStreak();
  const today = todayStr();
  if (s.lastDate === today) return s; // вже враховано сьогодні
  const y = new Date(); y.setDate(y.getDate()-1);
  const yesterday = y.getFullYear()+'-'+String(y.getMonth()+1).padStart(2,'0')+'-'+String(y.getDate()).padStart(2,'0');
  if (s.lastDate === yesterday) s.count += 1;
  else s.count = 1;
  s.lastDate = today;
  saveStreak(s);
  return s;
}

// ============ Рендер віджетів ============

function renderStats(){
  const el = document.getElementById('stats-bar');
  if(!el) return;
  const s = getStats();
  const total = s.correct + s.wrong;
  const pct = total ? Math.round(s.correct/total*100) : 0;
  const streak = getStreak();
  const streakHtml = streak.count > 1 ? `<span class="stat-streak">🔥 ${streak.count} дн. поспіль</span>` : '';
  el.innerHTML = total
    ? `<span class="stat-ok">✅ ${s.correct}</span><span class="stat-bad">❌ ${s.wrong}</span><span class="stat-pct">${pct}% правильних</span>${streakHtml}`
    : `<span class="stat-empty">Пройди перший тест — тут з'явиться твоя статистика</span>`;
}

function renderProgress(){
  const el = document.getElementById('progress-bar');
  if(!el || typeof PDR_DAYS === 'undefined') return;
  const results = getDayResults();
  const total = PDR_DAYS.length;
  const done = Object.keys(results).filter(k => PDR_DAYS.some(d => String(d.day) === k)).length;
  const pct = total ? Math.round(done/total*100) : 0;
  el.innerHTML = `
    <div class="progress-label">Пройдено ${done} з ${total} питань</div>
    <div class="progress-track"><div class="progress-fill" style="width:${pct}%"></div></div>
  `;
}

function dayBadge(dayNum){
  const results = getDayResults();
  const r = results[String(dayNum)];
  if (r === 'correct') return '<span class="badge-ok">✅</span>';
  if (r === 'wrong') return '<span class="badge-bad">❌</span>';
  return '<span class="badge-none">—</span>';
}

// ============ Кнопка "Наступне питання" ============

function renderNextButton(){
  const el = document.getElementById('next-question');
  if(!el || typeof PDR_DAYS === 'undefined') return;
  const currentDay = parseInt(document.body.getAttribute('data-day') || '0', 10);
  const sorted = [...PDR_DAYS].sort((a,b)=>a.day-b.day);
  const next = sorted.find(d => d.day > currentDay);
  if (next){
    const href = '../' + next.file;
    el.innerHTML = `<a class="next-btn" href="${href}">Наступне питання →</a>`;
  } else {
    el.innerHTML = `<a class="next-btn next-btn-alt" href="../index.html">Це останнє питання поки що — заглядай завтра 👋</a>`;
  }
  el.style.display = 'block';
}

// ============ Поділитись ============

function shareResult(){
  const s = getStats();
  const title = 'ПДР без помилок — Тест дня';
  const text = `Мій результат: ✅ ${s.correct} правильних, ❌ ${s.wrong} неправильних. Перевір себе за офіційною базою ГСЦ МВС!`;
  const url = window.location.href;
  if (navigator.share){
    navigator.share({title, text, url}).catch(()=>{});
  } else {
    navigator.clipboard.writeText(`${text} ${url}`).then(()=>{
      const btn = document.getElementById('share-btn');
      if (btn){ const orig = btn.textContent; btn.textContent = 'Скопійовано ✓'; setTimeout(()=>{btn.textContent = orig;}, 2000); }
    }).catch(()=>{});
  }
}

document.addEventListener('DOMContentLoaded', function(){
  renderStats();
  renderProgress();
});

// ============ Обробка відповіді ============

function answer(el){
  const container = el.closest('.options');
  if (container.classList.contains('locked')) return;
  container.classList.add('locked');

  const options = container.querySelectorAll('.opt');
  const isCorrect = el.getAttribute('data-correct') === 'true';
  const correctText = container.getAttribute('data-correct-msg') || '✅ Правильно!';
  const wrongText = container.getAttribute('data-wrong-msg') || '❌ Неправильно.';

  options.forEach(o=>{
    o.classList.add('locked');
    if (o.getAttribute('data-correct') === 'true'){
      o.classList.add('correct');
    } else if (o === el){
      o.classList.add('wrong');
    } else {
      o.classList.add('dim');
    }
  });

  const fb = document.getElementById('feedback');
  fb.classList.add('show');
  if (isCorrect){
    fb.classList.add('ok');
    fb.textContent = correctText;
  } else {
    fb.classList.add('bad');
    fb.textContent = wrongText;
  }

  document.getElementById('rulebox').style.display = 'block';
  document.getElementById('remember').style.display = 'flex';

  // Статистика (глобальна)
  const stats = getStats();
  if (isCorrect) stats.correct++; else stats.wrong++;
  saveStats(stats);

  // Результат по конкретному дню (для прогресу й фільтра помилок)
  const currentDay = document.body.getAttribute('data-day');
  if (currentDay){
    const results = getDayResults();
    results[currentDay] = isCorrect ? 'correct' : 'wrong';
    saveDayResults(results);
  }

  updateStreak();
  renderStats();
  renderProgress();
  renderNextButton();

  // Синхронізація з акаунтом (якщо людина увійшла)
  if (typeof syncResultToCloud === 'function' && currentDay){
    syncResultToCloud(parseInt(currentDay,10), isCorrect);
  }

  const shareBar = document.getElementById('share-bar');
  if (shareBar) shareBar.style.display = 'flex';
}
