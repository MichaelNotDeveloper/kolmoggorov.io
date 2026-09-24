(async () => {
  const { tasks, archive } = window.KOLMOGGOROV_DATA;
  let studyData = {
    default: { hint: 'to be done', solution: 'to be done', answer: 'to be done', analysis: { keyIdeas: ['to be done'], alternativeApproaches: [], pitfalls: [], difficultyRationale: 'to be done' } },
    tasks: {}
  };
  try {
    const response = await fetch('solutions-data.json?v=latex-1');
    if (response.ok) studyData = await response.json();
  } catch {}
  tasks.forEach(task => {
    const details = studyData.tasks?.[task.id] || {};
    task.hint = details.hint || studyData.default.hint;
    task.solution = details.solution || studyData.default.solution;
    task.answer = details.answer || studyData.default.answer;
    task.solutionAnalysis = details.analysis || studyData.default.analysis;
    task.officialSolution = details.officialSolution || null;
    task.topics = Array.isArray(details.topics) && details.topics.length ? details.topics : [task.topic];
    if (details.difficulty) task.difficulty = details.difficulty;
  });
  const PAGE_SIZE = 12;
  const DIFFICULTIES = {
    easy: { label: 'Стажёр HDI-lab', level: 'халявный', rank: 1 },
    medium: { label: 'Тимлид Сильвермонт', level: 'средний', rank: 2 },
    hard: { label: 'Первокурсник НМУ', level: 'сложный', rank: 3 },
    medal: { label: 'Безработный', level: 'очень сложный', rank: 4 }
  };
  const savedState = JSON.parse(localStorage.getItem('kolmoggorov-state-v1') || '{}');
  const state = {
    solved: new Set(savedState.solved || []),
    saved: new Set(savedState.saved || []),
    notes: savedState.notes || {},
    page: 1,
    query: '', difficulty: 'all', topics: new Set(), year: 'all', status: 'all', sort: 'year-desc'
  };
  let currentTask = null;
  let toastTimeout;

  const $ = selector => document.querySelector(selector);
  const $$ = selector => [...document.querySelectorAll(selector)];
  const escapeHTML = value => String(value).replace(/[&<>'"]/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));
  const saveState = () => localStorage.setItem('kolmoggorov-state-v1', JSON.stringify({ solved:[...state.solved], saved:[...state.saved], notes:state.notes }));
  const showToast = message => { const toast=$('#toast'); toast.textContent=message; toast.classList.add('visible'); clearTimeout(toastTimeout); toastTimeout=setTimeout(()=>toast.classList.remove('visible'),1800); };
  const typeset = root => { if (window.MathJax?.typesetPromise) window.MathJax.typesetPromise([root]).catch(()=>{}); };
  const clearTypeset = root => { if (window.MathJax?.typesetClear) window.MathJax.typesetClear([root]); };
  const excerptText = text => text.replace(/\\\[([\s\S]*?)\\\]/g, (_, math) => `\\(${math.trim()}\\)`).replace(/\s+/g, ' ').trim();
  const taskNumber = task => `${task.year}.${task.displayNumber || task.number}`;
  const taskTopics = task => task.topics?.length ? task.topics : [task.topic];

  const themeToggle = $('#theme-toggle');
  const themeColor = $('meta[name="theme-color"]');
  const systemTheme = matchMedia('(prefers-color-scheme: dark)');
  const hasSavedTheme = localStorage.getItem('kolmoggorov-theme') !== null;
  function applyTheme(theme, persist = true) {
    const isDark = theme === 'dark';
    document.documentElement.dataset.theme = isDark ? 'dark' : 'light';
    document.documentElement.style.colorScheme = isDark ? 'dark' : 'light';
    themeColor?.setAttribute('content', isDark ? '#101619' : '#f2efe7');
    themeToggle.setAttribute('aria-pressed', String(isDark));
    themeToggle.setAttribute('aria-label', isDark ? 'Включить светлую тему' : 'Включить тёмную тему');
    themeToggle.title = isDark ? 'Включить светлую тему' : 'Включить тёмную тему';
    if (persist) localStorage.setItem('kolmoggorov-theme', isDark ? 'dark' : 'light');
  }
  applyTheme(document.documentElement.dataset.theme || (systemTheme.matches ? 'dark' : 'light'), false);
  themeToggle.addEventListener('click', () => {
    const nextTheme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    applyTheme(nextTheme);
    showToast(nextTheme === 'dark' ? 'Тёмная тема включена' : 'Светлая тема включена');
  });
  if (!hasSavedTheme) systemTheme.addEventListener?.('change', event => {
    if (localStorage.getItem('kolmoggorov-theme') === null) applyTheme(event.matches ? 'dark' : 'light', false);
  });

  function switchView(view, updateHash = true) {
    $$('.nav-link').forEach(item => item.classList.toggle('active', item.dataset.view === view));
    $$('.view').forEach(item => item.classList.toggle('active', item.id === `${view}-view`));
    if (updateHash && !location.hash.startsWith('#task=')) history.replaceState(null, '', `#${view}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  $$('.nav-link').forEach(button => button.addEventListener('click', () => switchView(button.dataset.view)));
  $('.brand').addEventListener('click', event => { event.preventDefault(); switchView('problems'); });

  function populateFilters() {
    const topicCounts = new Map();
    tasks.forEach(task => taskTopics(task).forEach(topic => topicCounts.set(topic, (topicCounts.get(topic) || 0) + 1)));
    const topics = [...topicCounts.keys()].sort((a,b)=>a.localeCompare(b,'ru'));
    $('#topic-options').innerHTML = topics.map(topic => `<label class="topic-option"><input type="checkbox" value="${escapeHTML(topic)}"><span>${escapeHTML(topic)}</span><small>${topicCounts.get(topic)}</small></label>`).join('');
    $$('#topic-options input').forEach(input => input.addEventListener('change', () => {
      input.checked ? state.topics.add(input.value) : state.topics.delete(input.value);
      state.page = 1; updateTopicPicker(); render();
    }));
    [...new Set(tasks.map(task => task.year))].sort((a,b)=>b-a).forEach(year => $('#year-filter').add(new Option(year,year)));
    $('#task-count-hero').textContent = tasks.length;
  }

  function updateTopicPicker() {
    const count = state.topics.size;
    $('#topic-picker-label').textContent = count === 0 ? 'Все темы' : count === 1 ? [...state.topics][0] : `Выбрано тем: ${count}`;
    $('#topic-picker-toggle').classList.toggle('has-selection', count > 0);
    $$('#topic-options input').forEach(input => { input.checked = state.topics.has(input.value); });
  }

  function filteredTasks() {
    const query = state.query.trim().toLocaleLowerCase('ru');
    const list = tasks.filter(task => {
      if (query && !`${task.text} ${taskNumber(task)} ${taskTopics(task).join(' ')}`.toLocaleLowerCase('ru').includes(query)) return false;
      if (state.difficulty !== 'all' && task.difficulty !== state.difficulty) return false;
      if (state.topics.size && !taskTopics(task).some(topic => state.topics.has(topic))) return false;
      if (state.year !== 'all' && String(task.year) !== state.year) return false;
      if (state.status === 'solved' && !state.solved.has(task.id)) return false;
      if (state.status === 'unsolved' && state.solved.has(task.id)) return false;
      if (state.status === 'saved' && !state.saved.has(task.id)) return false;
      return true;
    });
    return list.sort((a,b) => {
      if (state.sort === 'year-asc') return a.year-b.year || a.number-b.number;
      if (state.sort === 'difficulty-asc') return DIFFICULTIES[a.difficulty].rank-DIFFICULTIES[b.difficulty].rank || b.year-a.year;
      if (state.sort === 'difficulty-desc') return DIFFICULTIES[b.difficulty].rank-DIFFICULTIES[a.difficulty].rank || b.year-a.year;
      return b.year-a.year || a.number-b.number;
    });
  }

  function taskCard(task) {
    const difficulty = DIFFICULTIES[task.difficulty];
    const solved = state.solved.has(task.id);
    const saved = state.saved.has(task.id);
    const topics = taskTopics(task);
    const topicLabel = `${topics[0]}${topics.length > 1 ? ` +${topics.length-1}` : ''}`;
    return `<article class="problem-card ${solved?'solved':''}" data-id="${task.id}">
      <div class="card-meta"><span>№${taskNumber(task)}</span><span class="pill ${task.difficulty}" title="${difficulty.level}">${difficulty.label}</span></div>
      <h2>${task.title}</h2><p class="excerpt">${escapeHTML(excerptText(task.text))}</p>
      <div class="tags"><span class="topic-summary" title="${escapeHTML(topics.join(' · '))}">${escapeHTML(topicLabel)}</span><button class="save-button ${saved?'active':''}" aria-label="${saved?'Убрать из избранного':'Добавить в избранное'}" title="Избранное">${saved?'◆':'◇'}</button></div>
      <footer><button class="open-problem">Открыть задачу</button><label class="solved-check"><input type="checkbox" ${solved?'checked':''}> Решено</label></footer>
    </article>`;
  }

  function render() {
    const list = filteredTasks();
    const pages = Math.max(1, Math.ceil(list.length/PAGE_SIZE));
    state.page = Math.min(state.page,pages);
    const start = (state.page-1)*PAGE_SIZE;
    const cards = $('#problem-cards'); clearTypeset(cards);
    cards.innerHTML = list.slice(start,start+PAGE_SIZE).map(taskCard).join('');
    $('#results-count').textContent = list.length;
    $('#page-label').textContent = list.length ? `Страница ${state.page} из ${pages}` : '';
    $('#empty-state').hidden = list.length !== 0;
    $('#pagination').hidden = list.length === 0;
    renderPagination(pages);
    bindCards();
    updateProgress();
    typeset(cards);
  }

  function renderPagination(pages) {
    const items = [];
    items.push(`<button data-page="${state.page-1}" ${state.page===1?'disabled':''} aria-label="Предыдущая страница">←</button>`);
    let last=0;
    for(let page=1;page<=pages;page++){
      if(page===1 || page===pages || Math.abs(page-state.page)<=1){
        if(last && page-last>1) items.push('<span>…</span>');
        items.push(`<button data-page="${page}" class="${page===state.page?'active':''}" ${page===state.page?'aria-current="page"':''}>${page}</button>`); last=page;
      }
    }
    items.push(`<button data-page="${state.page+1}" ${state.page===pages?'disabled':''} aria-label="Следующая страница">→</button>`);
    $('#pagination').innerHTML=items.join('');
    $$('#pagination button:not([disabled])').forEach(button=>button.addEventListener('click',()=>{state.page=Number(button.dataset.page);render();$('.results-line').scrollIntoView({behavior:'smooth',block:'start'});}));
  }

  function bindCards() {
    $$('.problem-card').forEach(card => {
      const task = tasks.find(item=>item.id===card.dataset.id);
      card.querySelector('.open-problem').addEventListener('click',()=>openTask(task));
      card.querySelector('.excerpt').addEventListener('dblclick',()=>openTask(task));
      card.querySelector('.solved-check input').addEventListener('change',event=>{toggleSolved(task.id,event.target.checked);render();});
      card.querySelector('.save-button').addEventListener('click',()=>{toggleSaved(task.id);render();});
    });
  }

  function toggleSolved(id, value = !state.solved.has(id)) {
    value ? state.solved.add(id) : state.solved.delete(id); saveState(); showToast(value?'Задача отмечена решённой':'Отметка снята');
  }
  function toggleSaved(id) { state.saved.has(id)?state.saved.delete(id):state.saved.add(id); saveState(); showToast(state.saved.has(id)?'Добавлено в избранное':'Удалено из избранного'); }

  function updateProgress() {
    $('#progress-label').textContent=`${state.solved.size} из ${tasks.length}`;
    $('#progress-bar').style.width=`${Math.min(100,state.solved.size/tasks.length*100)}%`;
  }

  function openTask(task) {
    currentTask=task; const difficulty=DIFFICULTIES[task.difficulty];
    const topics=taskTopics(task);
    const hintTbd=task.hint.trim().toLocaleLowerCase('en')==='to be done';
    const solutionTbd=task.solution.trim().toLocaleLowerCase('en')==='to be done' && !task.officialSolution;
    const official=task.officialSolution;
    const officialUrl=official ? `${official.pdf}#page=${official.page}` : '';
    const answerReady=task.answer && task.answer.trim().toLocaleLowerCase('en')!=='to be done';
    clearTypeset($('#dialog-content'));
    $('#dialog-content').innerHTML=`<div class="dialog-inner">
      <div class="dialog-kicker"><span>${task.date} · №${taskNumber(task)}</span><span class="pill ${task.difficulty}">${difficulty.label}</span><span class="dialog-topics">${topics.map(topic=>`<span>${escapeHTML(topic)}</span>`).join('')}</span></div>
      <h2>${task.title}</h2><section class="problem-text" aria-label="Условие задачи"><div class="problem-copy">${escapeHTML(task.text)}</div>${task.image?`<figure class="problem-figure"><img src="${task.image}" alt="Схема к задаче ${taskNumber(task)}"></figure>`:''}</section>
      <div class="learning-tabs" role="group" aria-label="Материалы к задаче"><button class="learning-toggle" type="button" data-panel="hint-${task.id}" aria-controls="hint-${task.id}" aria-expanded="false"><span>Подсказка</span><i aria-hidden="true">+</i></button><button class="learning-toggle" type="button" data-panel="solution-${task.id}" aria-controls="solution-${task.id}" aria-expanded="false"><span>Решение</span><i aria-hidden="true">+</i></button></div>
      <section class="learning-panel hint-panel ${hintTbd?'is-tbd':''}" id="hint-${task.id}" hidden><span class="learning-label">НАПРАВЛЕНИЕ</span><div class="learning-copy">${escapeHTML(task.hint)}</div></section>
      <section class="learning-panel solution-panel ${solutionTbd?'is-tbd':''}" id="solution-${task.id}" hidden><span class="learning-label">РАЗБОР</span><div class="learning-copy">${escapeHTML(task.solution)}</div>${answerReady?`<div class="short-answer"><strong>Короткий ответ</strong><span>${escapeHTML(task.answer)}</span></div>`:''}</section>
      <div class="dialog-actions"><button class="dialog-solved ${state.solved.has(task.id)?'active':''}">${state.solved.has(task.id)?'✓ Решено':'Отметить решённой'}</button><button class="dialog-save">${state.saved.has(task.id)?'◆ В избранном':'◇ В избранное'}</button><button class="copy-link">Скопировать ссылку</button></div>
      <label class="notes-label">ЛИЧНЫЕ ЗАМЕТКИ<textarea placeholder="Идея решения, полезная формула…">${escapeHTML(state.notes[task.id]||'')}</textarea></label>
      <div class="source-links"><span>Оригиналы в PDF</span><a href="${task.pdf}" target="_blank" rel="noopener">Условие ↗</a>${official?`<a href="${escapeHTML(officialUrl)}" target="_blank" rel="noopener">Решение · стр. ${official.page} ↗</a>`:''}</div>
    </div>`;
    history.replaceState(null,'',`#task=${task.id}`);
    const dialog=$('#problem-dialog'); dialog.showModal();
    $('.dialog-solved').addEventListener('click',()=>{toggleSolved(task.id);openTaskRefresh(task);});
    $('.dialog-save').addEventListener('click',()=>{toggleSaved(task.id);openTaskRefresh(task);});
    $('.copy-link').addEventListener('click',async()=>{try{await navigator.clipboard.writeText(location.href);showToast('Ссылка скопирована');}catch{showToast('Скопируйте адрес из строки браузера');}});
    $('.notes-label textarea').addEventListener('input',event=>{state.notes[task.id]=event.target.value;saveState();});
    $$('.learning-toggle').forEach(button=>button.addEventListener('click',()=>{
      const panel=$('#'+button.dataset.panel); const willOpen=panel.hidden;
      $$('.learning-panel').forEach(item=>{item.hidden=true;});
      $$('.learning-toggle').forEach(item=>{item.setAttribute('aria-expanded','false');item.querySelector('i').textContent='+';});
      if(willOpen){panel.hidden=false;button.setAttribute('aria-expanded','true');button.querySelector('i').textContent='−';typeset(panel);}
    }));
    typeset($('#dialog-content'));
  }

  function openTaskRefresh(task){ $('#problem-dialog').close(); render(); openTask(task); }
  function closeDialog(){ if($('#problem-dialog').open) $('#problem-dialog').close(); history.replaceState(null,'','#problems'); render(); }
  $('#dialog-close').addEventListener('click',closeDialog);
  $('#problem-dialog').addEventListener('click',event=>{if(event.target===$('#problem-dialog')) closeDialog();});
  $('#problem-dialog').addEventListener('close',()=>{ if(currentTask && location.hash.startsWith('#task=')) history.replaceState(null,'','#problems'); currentTask=null; });

  function resetFilters(){ state.query='';state.difficulty='all';state.topics.clear();state.year='all';state.status='all';state.sort='year-desc';state.page=1;$('#search-input').value='';$('#difficulty-filter').value='all';$('#year-filter').value='all';$('#status-filter').value='all';$('#sort-select').value='year-desc';updateTopicPicker();render(); }
  $('#search-input').addEventListener('input',event=>{state.query=event.target.value;state.page=1;render();});
  [['difficulty-filter','difficulty'],['year-filter','year'],['status-filter','status'],['sort-select','sort']].forEach(([id,key])=>$('#'+id).addEventListener('change',event=>{state[key]=event.target.value;state.page=1;render();}));
  $('#clear-filters').addEventListener('click',resetFilters); $('#empty-reset').addEventListener('click',resetFilters);
  $('#topic-picker-toggle').addEventListener('click',()=>{const menu=$('#topic-menu');const willOpen=menu.hidden;menu.hidden=!willOpen;$('#topic-picker-toggle').setAttribute('aria-expanded',String(willOpen));});
  $('#clear-topics').addEventListener('click',()=>{state.topics.clear();state.page=1;updateTopicPicker();render();});
  document.addEventListener('click',event=>{if(!$('#topic-picker').contains(event.target)){ $('#topic-menu').hidden=true;$('#topic-picker-toggle').setAttribute('aria-expanded','false'); }});
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!$('#topic-menu').hidden){$('#topic-menu').hidden=true;$('#topic-picker-toggle').setAttribute('aria-expanded','false');$('#topic-picker-toggle').focus();}});
  $$('.legend [data-difficulty]').forEach(button=>button.addEventListener('click',()=>{state.difficulty=button.dataset.difficulty;state.page=1;$('#difficulty-filter').value=state.difficulty;render();$('.results-line').scrollIntoView({behavior:'smooth'});}));
  $('#random-task').addEventListener('click',()=>{const list=filteredTasks();if(list.length)openTask(list[Math.floor(Math.random()*list.length)]);});

  function renderArchive() {
    const romans=['I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII','XIII','XIV','XV','XVI','XVII','XVIII','XIX','XX','XXI'];
    $('#archive-grid').innerHTML=archive.map((item,index)=>`<a class="archive-card" href="${item.href}" target="_blank" rel="noopener"><span class="archive-year">${item.year}</span><span><h2>${romans[index]} олимпиада</h2><p>${item.date}</p><span class="archive-status">${item.searchable?`${item.count} задач в каталоге`:'оригинал PDF'}</span></span><span class="arrow">↗</span></a>`).join('');
  }

  let timerSeconds=3600, remaining=3600, timerId=null, deadline=null;
  function formatTime(seconds){const min=Math.floor(seconds/60),sec=seconds%60;return `${String(min).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;}
  function updateTimer(){ $('#timer-time').textContent=formatTime(remaining); document.title=timerId?`${formatTime(remaining)} · kolmoggorov`:'kolmoggorov — задачи по теории вероятностей'; }
  function stopTimer(){clearInterval(timerId);timerId=null;deadline=null;$('#timer-toggle').textContent=remaining===0?'Снова':'Старт';}
  function tick(){remaining=Math.max(0,Math.ceil((deadline-Date.now())/1000));updateTimer();if(remaining===0){stopTimer();$('#timer-note').textContent='Время вышло. Запишите главную идею.';showToast('Время вышло');}}
  $('#timer-toggle').addEventListener('click',()=>{if(timerId){clearInterval(timerId);timerId=null;remaining=Math.max(0,Math.ceil((deadline-Date.now())/1000));deadline=null;$('#timer-toggle').textContent='Продолжить';$('#timer-note').textContent='Пауза — тоже часть решения.';}else{if(remaining===0)remaining=timerSeconds;deadline=Date.now()+remaining*1000;timerId=setInterval(tick,250);$('#timer-toggle').textContent='Пауза';$('#timer-note').textContent='Таймер идёт. Удачи.';tick();}});
  $('#timer-reset').addEventListener('click',()=>{stopTimer();remaining=timerSeconds;$('#timer-toggle').textContent='Старт';$('#timer-note').textContent='Спокойно. Одна задача за раз.';updateTimer();});
  $('#timer-preset').addEventListener('change',event=>{timerSeconds=Number(event.target.value)*60;remaining=timerSeconds;stopTimer();$('#timer-toggle').textContent='Старт';updateTimer();});

  populateFilters(); updateTopicPicker(); renderArchive(); render(); updateTimer();
  const initialHash=location.hash;
  if(initialHash.startsWith('#task=')){const task=tasks.find(item=>item.id===initialHash.slice(6));if(task)openTask(task);}
  else if(['#archive','#about'].includes(initialHash))switchView(initialHash.slice(1),false);
})();
