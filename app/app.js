// Leonida Platinum: offline GTA VI trophy guide and tracker.
// Loads the official trophy list and the roadmap from app/data/, renders the
// checklist, detail pane, roadmap and missable views, and saves progress in
// localStorage on this machine only. No network request is made at run time.
const STORAGE_KEY = 'leonida-platinum-progress-v1';
const listEl = document.getElementById('trophyList');
const detailEl = document.getElementById('detailPane');
const showingEl = document.getElementById('showingLine');

const trophyData = await (await fetch('data/trophies.json')).json();
const roadmapData = await (await fetch('data/roadmap.json')).json();
const trophies = trophyData.trophies;
const byId = new Map(trophies.map((t) => [t.id, t]));

let saved = readSavedProgress();
let selectedId = trophies[0].id;

function readSavedProgress() {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}');
    return { earned: new Set(raw.earned ?? []), counts: raw.counts ?? {} };
  } catch {
    return { earned: new Set(), counts: {} };
  }
}

function saveProgress() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    earned: [...saved.earned], counts: saved.counts,
  }));
}

function isStoryTrophy(t) {
  return t.kind === 'story' || t.kind === 'mission';
}

function spoilerOn() {
  return document.getElementById('spoilerToggle').checked;
}

function spoilerHides(t) {
  return spoilerOn() && isStoryTrophy(t) && !saved.earned.has(t.name);
}

function displayName(t) {
  return spoilerHides(t) ? 'Hidden story trophy' : t.name;
}

function displayDescription(t) {
  return spoilerHides(t)
    ? 'Hidden on PlayStation until earned. Turn the spoiler setting off, or earn it, to reveal it.'
    : t.description;
}

function formatTarget(t) {
  if (t.target == null) return '';
  const unit = t.target >= 1000 ? '$' + t.target.toLocaleString('en-US') : String(t.target);
  const have = saved.counts[t.id] ?? 0;
  return `${have} / ${unit}`;
}

function gradeLabel(t) {
  return t.grade[0].toUpperCase() + t.grade.slice(1);
}

function kindLabel(t) {
  const labels = { story: 'Story', mission: 'Mission', side: 'Strangers & side',
    collectible: 'Collectible', activity: 'Activity', combat: 'Combat & crime',
    exploration: 'Exploration', economy: 'Money' };
  return labels[t.kind] ?? t.kind;
}

function applyFilters() {
  const q = document.getElementById('search').value.trim().toLowerCase();
  const grade = document.getElementById('gradeFilter').value;
  const kind = document.getElementById('kindFilter').value;
  const status = document.getElementById('statusFilter').value;
  const missableOnly = document.getElementById('missableOnly').checked;
  return trophies.filter((t) => {
    if (grade !== 'all' && t.grade !== grade) return false;
    if (kind !== 'all' && t.kind !== kind) return false;
    if (status === 'earned' && !saved.earned.has(t.name)) return false;
    if (status === 'unearned' && saved.earned.has(t.name)) return false;
    if (missableOnly && !t.missable) return false;
    if (q && !(t.name.toLowerCase().includes(q) || t.description.toLowerCase().includes(q)
      || (t.guide ?? '').toLowerCase().includes(q))) return false;
    return true;
  });
}

function badgeHtml(t) {
  const parts = [`<span class="badge ${t.grade}">${gradeLabel(t)}</span>`];
  parts.push(`<span class="badge">${kindLabel(t)}</span>`);
  if (t.missable) parts.push('<span class="badge missable">MISSABLE</span>');
  if (t.hidden) parts.push('<span class="badge hiddenB">Hidden on PSN</span>');
  if (saved.earned.has(t.name)) parts.push('<span class="badge earnedB">Earned</span>');
  return parts.join('');
}

function renderTrophyList() {
  const shown = applyFilters();
  showingEl.textContent = `Showing ${shown.length} of ${trophies.length} trophies`
    + (spoilerOn() ? ' · story spoilers hidden until earned' : ' · spoilers shown');
  listEl.replaceChildren();
  for (const t of shown) {
    const li = document.createElement('li');
    li.className = 'trophyCard' + (saved.earned.has(t.name) ? ' earned' : '')
      + (t.id === selectedId ? ' selected' : '');
    const box = document.createElement('input');
    box.type = 'checkbox';
    box.checked = saved.earned.has(t.name);
    box.setAttribute('aria-label', `Earned: ${t.name}`);
    box.addEventListener('change', () => {
      if (box.checked) saved.earned.add(t.name);
      else saved.earned.delete(t.name);
      saveProgress();
      renderAll();
    });
    const top = document.createElement('div');
    top.className = 'cardTop';
    const text = document.createElement('div');
    const title = document.createElement('div');
    title.className = 'cardTitle';
    title.textContent = displayName(t);
    const desc = document.createElement('div');
    desc.className = 'cardDesc';
    desc.textContent = displayDescription(t);
    text.append(title, desc);
    top.append(box, text);
    const badges = document.createElement('div');
    badges.className = 'badges';
    badges.innerHTML = badgeHtml(t);
    li.append(top, badges);
    if (t.target != null && !spoilerHides(t)) {
      const counter = document.createElement('div');
      counter.className = 'counter';
      const minus = document.createElement('button');
      minus.type = 'button';
      minus.textContent = '−';
      minus.addEventListener('click', (e) => { e.stopPropagation(); bumpCount(t, -1); });
      const plus = document.createElement('button');
      plus.type = 'button';
      plus.textContent = '+';
      plus.addEventListener('click', (e) => { e.stopPropagation(); bumpCount(t, 1); });
      const label = document.createElement('span');
      label.textContent = `Progress: ${formatTarget(t)}`;
      counter.append(label, minus, plus);
      li.append(counter);
    }
    li.addEventListener('click', (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'BUTTON') return;
      selectedId = t.id;
      renderAll();
    });
    listEl.append(li);
  }
  if (shown.length === 0) {
    const li = document.createElement('li');
    li.className = 'trophyCard';
    li.textContent = 'No trophies match these filters. Clear the search or a filter to see more.';
    listEl.append(li);
  }
}

function bumpCount(t, delta) {
  const next = Math.max(0, Math.min(t.target, (saved.counts[t.id] ?? 0) + delta));
  saved.counts[t.id] = next;
  if (next >= t.target) saved.earned.add(t.name);
  saveProgress();
  renderAll();
}

function renderDetailPane() {
  const t = byId.get(selectedId) ?? trophies[0];
  detailEl.replaceChildren();
  if (spoilerHides(t)) {
    const h = document.createElement('h2');
    h.textContent = 'Hidden story trophy';
    const p = document.createElement('p');
    p.className = 'empty';
    p.textContent = 'This story trophy is hidden on PlayStation until you earn it. Turn off "Hide story spoilers" in the toolbar, or earn it in the game, to read its guide.';
    detailEl.append(h, p);
    return;
  }
  const h = document.createElement('h2');
  h.textContent = t.name;
  const official = document.createElement('p');
  official.className = 'official';
  official.textContent = `Official: "${t.description}" — ${gradeLabel(t)}`;
  const badges = document.createElement('div');
  badges.className = 'badges';
  badges.innerHTML = badgeHtml(t);
  const guideH = document.createElement('h3');
  guideH.textContent = 'Guide';
  const guide = document.createElement('p');
  guide.textContent = t.guide;
  detailEl.append(h, official, badges, guideH, guide);
  if (t.steps?.length) {
    const stepsH = document.createElement('h3');
    stepsH.textContent = 'Steps';
    const ol = document.createElement('ol');
    for (const s of t.steps) {
      const li = document.createElement('li');
      li.textContent = s;
      ol.append(li);
    }
    detailEl.append(stepsH, ol);
  }
  if (t.target != null) {
    const targetP = document.createElement('p');
    targetP.textContent = `PSN tracks this one: ${formatTarget(t)}. Use the + and − buttons on its card to count your progress.`;
    detailEl.append(targetP);
  }
  const srcH = document.createElement('h3');
  srcH.textContent = 'Sources';
  const ul = document.createElement('ul');
  ul.className = 'sources';
  for (const s of t.sources ?? []) {
    const li = document.createElement('li');
    li.textContent = s;
    ul.append(li);
  }
  const note = document.createElement('li');
  note.textContent = 'Guide method: our own advice built from the official description only — exact spots not yet verified in-game (game released 19 Nov 2026).';
  ul.append(note);
  detailEl.append(srcH, ul);
}

function renderRoadmapView() {
  const list = document.getElementById('roadmapList');
  list.replaceChildren();
  for (const stage of roadmapData.stages) {
    const li = document.createElement('li');
    const h = document.createElement('h3');
    h.textContent = stage.title;
    const p = document.createElement('p');
    p.textContent = stage.text;
    const done = stage.trophies.filter((id) => saved.earned.has(byId.get(id).name)).length;
    const meta = document.createElement('p');
    meta.className = 'stageTrophies';
    const strong = document.createElement('span');
    strong.className = 'stageCount';
    strong.textContent = `${done} / ${stage.trophies.length} earned in this stage`;
    meta.append(strong, document.createTextNode(' — ' + stage.trophies.map((id) => byId.get(id).name).join(' · ')));
    li.append(h, p, meta);
    list.append(li);
  }
}

function renderMissableView() {
  const list = document.getElementById('missableList');
  list.replaceChildren();
  for (const t of trophies.filter((x) => x.missable)) {
    const li = document.createElement('li');
    li.className = 'trophyCard' + (saved.earned.has(t.name) ? ' earned' : '');
    const title = document.createElement('div');
    title.className = 'cardTitle';
    title.textContent = t.name;
    const desc = document.createElement('div');
    desc.className = 'cardDesc';
    desc.textContent = t.description;
    const why = document.createElement('p');
    why.textContent = t.guide.split('. ').slice(0, 2).join('. ') + '.';
    const badges = document.createElement('div');
    badges.className = 'badges';
    badges.innerHTML = badgeHtml(t);
    li.append(title, desc, why, badges);
    li.addEventListener('click', () => {
      selectedId = t.id;
      switchView('checklist');
    });
    list.append(li);
  }
}

function updateProgressHeader() {
  const earned = saved.earned.size;
  document.getElementById('earnedCount').textContent = String(earned);
  document.getElementById('progressFill').style.width = `${(earned / trophies.length) * 100}%`;
  const byGrade = {};
  for (const t of trophies) {
    byGrade[t.grade] = byGrade[t.grade] ?? [0, 0];
    byGrade[t.grade][1] += 1;
    if (saved.earned.has(t.name)) byGrade[t.grade][0] += 1;
  }
  document.getElementById('gradeLine').textContent =
    `Platinum ${byGrade.platinum[0]}/${byGrade.platinum[1]} · Gold ${byGrade.gold[0]}/${byGrade.gold[1]} · Silver ${byGrade.silver[0]}/${byGrade.silver[1]} · Bronze ${byGrade.bronze[0]}/${byGrade.bronze[1]}`;
  const next = trophies.find((t) => !saved.earned.has(t.name) && isStoryTrophy(t) && t.grade !== 'platinum');
  document.getElementById('nextUp').textContent = next
    ? `Next up: ${next.name} — ${next.description}`
    : 'All 55 earned — the platinum is yours.';
}

function renderAll() {
  updateProgressHeader();
  renderTrophyList();
  renderDetailPane();
  renderRoadmapView();
  renderMissableView();
}

function switchView(name) {
  for (const btn of document.querySelectorAll('#tabs button')) {
    btn.classList.toggle('active', btn.dataset.view === name);
  }
  for (const section of document.querySelectorAll('.view')) {
    section.hidden = section.id !== `view-${name}`;
  }
}

function exportProgress() {
  const blob = new Blob([JSON.stringify({
    game: 'Grand Theft Auto VI', earned: [...saved.earned], counts: saved.counts,
  }, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'gta6-trophy-progress.json';
  a.click();
  URL.revokeObjectURL(a.href);
}

async function importProgress(file) {
  if (!file) return;
  try {
    const data = JSON.parse(await file.text());
    saved = { earned: new Set(data.earned ?? []), counts: data.counts ?? {} };
    saveProgress();
    renderAll();
  } catch {
    alert('That file is not a trophy-progress export.');
  }
}

function bindToolbar() {
  for (const id of ['search', 'gradeFilter', 'kindFilter', 'statusFilter', 'missableOnly', 'spoilerToggle']) {
    document.getElementById(id).addEventListener('input', renderAll);
    document.getElementById(id).addEventListener('change', renderAll);
  }
  for (const btn of document.querySelectorAll('#tabs button')) {
    btn.addEventListener('click', () => switchView(btn.dataset.view));
  }
  document.getElementById('exportBtn').addEventListener('click', exportProgress);
  document.getElementById('importFile').addEventListener('change', (e) => importProgress(e.target.files[0]));
  document.getElementById('resetBtn').addEventListener('click', () => {
    if (confirm('Clear all earned trophies and counters?')) {
      saved = { earned: new Set(), counts: {} };
      saveProgress();
      renderAll();
    }
  });
}

bindToolbar();
renderAll();
