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
    fb.textContent = correctText || '✅ Правильно!';
  } else {
    fb.classList.add('bad');
    fb.textContent = wrongText || '❌ Неправильно.';
  }

  document.getElementById('rulebox').style.display = 'block';
  document.getElementById('remember').style.display = 'flex';
}
