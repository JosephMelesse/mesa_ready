let nextId = 1;
let catalog = [];
let allMajors = [];
let semesters = [
  { id: nextId++, name: 'Semester 1', classes: [{ id: nextId++, value: '' }, { id: nextId++, value: '' }] }
];
let selectedMajorId = null;
let selectedUniversity = null;

const AREA_LABELS = {
  '1A': 'English Composition',
  '1B': 'Critical Thinking & Composition',
  '1C': 'Oral Communication',
  '2':  'Mathematical Concepts',
  '3A': 'Arts',
  '3B': 'Humanities',
  '4':  'Social & Behavioral Sciences',
  '5A': 'Physical Sciences',
  '5B': 'Biological Sciences',
  '5C': 'Laboratory',
  '6':  'Ethnic Studies',
};

function esc(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ── Init ──────────────────────────────────────────────────────────────────────

async function init() {
  const [majorsData, catalogData] = await Promise.all([
    fetch('/api/majors').then(r => r.json()),
    fetch('/api/cerritos-courses').then(r => r.json()),
  ]);

  if (Array.isArray(majorsData)) allMajors = majorsData;
  if (Array.isArray(catalogData)) catalog = catalogData;

  renderSemesters();
}

function populateMajors(university) {
  const select = document.getElementById('major-select');
  select.innerHTML = '<option value="">— select a major —</option>';
  const filtered = allMajors.filter(m => m.university === university);
  for (const m of filtered) {
    const opt = document.createElement('option');
    opt.value = m.id;
    opt.textContent = m.name;
    select.appendChild(opt);
  }
  select.disabled = filtered.length === 0;
  selectedMajorId = null;
  document.getElementById('check-transfer-btn').disabled = true;
}

// ── Semester rendering ────────────────────────────────────────────────────────

function renderSemesters() {
  const container = document.getElementById('semesters');
  container.innerHTML = '';
  for (const sem of semesters) {
    container.appendChild(buildSemesterCard(sem));
  }
}

function buildSemesterCard(sem) {
  const card = document.createElement('div');
  card.className = 'semester-card';

  const nameInput = document.createElement('input');
  nameInput.className = 'semester-name-input';
  nameInput.value = sem.name;
  nameInput.addEventListener('input', () => { sem.name = nameInput.value; });
  card.appendChild(nameInput);

  const courseInputs = document.createElement('div');
  courseInputs.className = 'course-inputs';
  for (const cls of sem.classes) {
    courseInputs.appendChild(buildCourseInput(sem, cls, courseInputs));
  }
  card.appendChild(courseInputs);

  const addBtn = document.createElement('button');
  addBtn.className = 'add-class-btn';
  addBtn.innerHTML = '<span class="icon">⊕</span><span>Add Class</span>';
  addBtn.addEventListener('click', () => {
    const newClass = { id: nextId++, value: '' };
    sem.classes.push(newClass);
    courseInputs.appendChild(buildCourseInput(sem, newClass, courseInputs));
    clearResults();
  });
  card.appendChild(addBtn);

  return card;
}

function buildCourseInput(sem, cls) {
  const wrapper = document.createElement('div');
  wrapper.className = 'course-input-wrapper';

  const input = document.createElement('input');
  input.className = 'course-input';
  input.placeholder = 'e.g. CHEM 111 or General Chemistry…';
  input.value = cls.value;
  input.autocomplete = 'off';

  const list = document.createElement('ul');
  list.className = 'suggestions';

  wrapper.appendChild(input);
  wrapper.appendChild(list);

  input.addEventListener('input', () => {
    cls.value = input.value;
    clearResults();
    showSuggestions(input, list, cls);
  });

  input.addEventListener('focus', () => {
    showSuggestions(input, list, cls);
  });

  document.addEventListener('mousedown', (e) => {
    if (!wrapper.contains(e.target)) list.style.display = 'none';
  });

  return wrapper;
}

function showSuggestions(input, list, cls) {
  const query = input.value.trim().toLowerCase();
  if (query.length < 1) { list.style.display = 'none'; return; }

  const matches = catalog.filter(c => {
    const code = `${c.course_prefix} ${c.course_number}`.toLowerCase();
    const title = c.course_title.toLowerCase();
    const formers = (c.former_identifiers ?? []).map(f => f.toLowerCase());
    return code.includes(query) || title.includes(query) || formers.some(f => f.includes(query));
  }).slice(0, 8);

  if (matches.length === 0) { list.style.display = 'none'; return; }

  list.innerHTML = '';
  for (const c of matches) {
    const li = document.createElement('li');
    li.className = 'suggestion-item';
    li.innerHTML = `<span class="suggestion-code">${esc(c.course_prefix)} ${esc(c.course_number)}</span><span class="suggestion-title">— ${esc(c.course_title)}</span><span class="suggestion-units">(${esc(c.min_units)} u)</span>`;
    li.addEventListener('mousedown', () => {
      const chosen = `${c.course_prefix} ${c.course_number}`;
      input.value = chosen;
      cls.value = chosen;
      list.style.display = 'none';
      clearResults();
    });
    list.appendChild(li);
  }
  list.style.display = 'block';
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function getCourses() {
  return semesters.flatMap(s => s.classes.map(c => c.value)).filter(Boolean);
}

function clearResults() {
  document.getElementById('results').innerHTML = '';
}

// ── Event listeners ───────────────────────────────────────────────────────────

document.getElementById('uni-select').addEventListener('change', (e) => {
  selectedUniversity = e.target.value || null;
  selectedMajorId = null;
  clearResults();
  if (selectedUniversity) {
    populateMajors(selectedUniversity);
  } else {
    const select = document.getElementById('major-select');
    select.innerHTML = '<option value="">— select a university first —</option>';
    select.disabled = true;
    document.getElementById('check-transfer-btn').disabled = true;
  }
});

document.getElementById('major-select').addEventListener('change', async (e) => {
  selectedMajorId = e.target.value ? Number(e.target.value) : null;
  document.getElementById('check-transfer-btn').disabled = !selectedMajorId;
  clearResults();
  if (selectedMajorId) {
    const { notes } = await fetch(`/api/major-notes/${selectedMajorId}`).then(r => r.json());
    showMajorNotes(notes);
  } else {
    showMajorNotes(null);
  }
});

function showMajorNotes(notes) {
  const container = document.getElementById('major-notes');
  if (!notes) { container.innerHTML = ''; return; }
  container.innerHTML = `
    <details class="major-notes-details">
      <summary class="major-notes-summary">University Notes</summary>
      <pre class="major-notes-body">${esc(notes)}</pre>
    </details>
  `;
}

document.getElementById('add-semester-btn').addEventListener('click', () => {
  const newSem = { id: nextId++, name: `Semester ${semesters.length + 1}`, classes: [] };
  semesters.push(newSem);
  document.getElementById('semesters').appendChild(buildSemesterCard(newSem));
});

document.getElementById('check-transfer-btn').addEventListener('click', async () => {
  if (!selectedMajorId) return;
  const btn = document.getElementById('check-transfer-btn');
  btn.textContent = 'Checking…';
  btn.disabled = true;
  clearResults();
  try {
    const res = await fetch('/api/check-readiness', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ majorId: selectedMajorId, courses: getCourses() }),
    });
    renderTransferResults(await res.json());
  } finally {
    btn.textContent = 'Check Transfer Readiness';
    btn.disabled = !selectedMajorId;
  }
});

document.getElementById('check-calgetc-btn').addEventListener('click', async () => {
  const btn = document.getElementById('check-calgetc-btn');
  btn.textContent = 'Checking…';
  btn.disabled = true;
  clearResults();
  try {
    const res = await fetch('/api/check-calgetc', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ courses: getCourses() }),
    });
    renderCalGetcResults(await res.json());
  } finally {
    btn.textContent = 'Check Cal-GETC Readiness';
    btn.disabled = false;
  }
});

// ── Render transfer results ───────────────────────────────────────────────────

function renderTransferResults(result) {
  const container = document.getElementById('results');

  const banner = document.createElement('div');
  banner.className = `result-banner ${result.ready ? 'ready' : 'not-ready'}`;
  banner.textContent = result.ready ? '✓ Transfer Ready' : '✗ Not Ready Yet';
  container.appendChild(banner);

  const stats = document.createElement('div');
  stats.className = 'stats-row';
  stats.innerHTML = `
    <div class="stat-card">
      <div class="stat-label amber">UC-Transferable Units</div>
      <div class="stat-value amber">${esc(result.totalUnits)}</div>
    </div>
    <div class="stat-card">
      <div class="stat-label green">Requirements Met</div>
      <div class="stat-value green">${esc(result.satisfied.length)}</div>
    </div>
    <div class="stat-card">
      <div class="stat-label red">Still Missing</div>
      <div class="stat-value red">${esc(result.missing.length)}</div>
    </div>
  `;
  container.appendChild(stats);

  if (result.missing.length > 0) {
    const section = document.createElement('div');
    section.className = 'result-section';
    let html = `<div class="result-section-header missing">Missing (${esc(result.missing.length)})</div><div class="result-items">`;
    for (const m of result.missing) {
      html += `<div class="result-item missing">
        <div class="result-item-title">${esc(m.uciCourse)} — ${esc(m.uciTitle)}</div>
        ${m.options.length > 0 ? `<div class="result-item-sub">Take: ${esc(m.options.join(' | '))}</div>` : ''}
      </div>`;
    }
    html += '</div>';
    section.innerHTML = html;
    container.appendChild(section);
  }

  if (result.satisfied.length > 0) {
    const details = document.createElement('details');
    details.className = 'result-section satisfied';
    let html = `<summary>Satisfied (${esc(result.satisfied.length)})</summary><div class="result-items">`;
    for (const s of result.satisfied) {
      html += `<div class="result-item satisfied">
        <div class="result-item-title">${esc(s.uciCourse)} — ${esc(s.uciTitle)}</div>
        <div class="result-item-sub">${esc(s.satisfiedBy.join(', '))}</div>
      </div>`;
    }
    html += '</div>';
    details.innerHTML = html;
    container.appendChild(details);
  }

  if (result.noArticulation.length > 0) {
    const details = document.createElement('details');
    details.className = 'result-section no-art';
    let html = `<summary>No Articulation (${esc(result.noArticulation.length)})</summary><div class="result-items">`;
    for (const n of result.noArticulation) {
      html += `<div class="result-item no-art">
        <div class="result-item-title">${esc(n.uciCourse)} — ${esc(n.uciTitle)}</div>
        <div class="result-item-sub">${esc(n.reason)}</div>
      </div>`;
    }
    html += '</div>';
    details.innerHTML = html;
    container.appendChild(details);
  }
}

// ── Render Cal-GETC results ───────────────────────────────────────────────────

function renderCalGetcResults(result) {
  const container = document.getElementById('results');

  const banner = document.createElement('div');
  banner.className = `result-banner ${result.ready ? 'ready' : 'not-ready'}`;
  banner.textContent = result.ready ? '✓ Cal-GETC Complete' : '✗ Cal-GETC Incomplete';
  container.appendChild(banner);

  const stats = document.createElement('div');
  stats.className = 'stats-row';
  stats.innerHTML = `
    <div class="stat-card">
      <div class="stat-label green">Areas Complete</div>
      <div class="stat-value green">${esc(result.satisfied.length)}</div>
    </div>
    <div class="stat-card">
      <div class="stat-label red">Areas Missing</div>
      <div class="stat-value red">${esc(result.missing.length)}</div>
    </div>
    <div class="stat-card">
      <div class="stat-label amber">Total Areas</div>
      <div class="stat-value amber">11</div>
    </div>
  `;
  container.appendChild(stats);

  const section = document.createElement('div');
  section.className = 'result-section';
  let html = '<div class="area-grid-header">All Areas</div><div class="area-grid">';

  for (const [area, name] of Object.entries(AREA_LABELS)) {
    const sat = result.satisfied.find(s => s.area === area);
    const mis = result.missing.find(m => m.area === area);
    const entry = sat ?? mis;
    const done = !!sat;
    const needed = mis?.needed ?? 1;

    html += `<div class="area-row ${done ? 'done' : 'missing'}">
      <span class="area-code ${done ? 'done' : 'missing'}">${esc(area)}</span>
      <div class="area-body">
        <div class="area-name ${done ? 'done' : 'missing'}">${esc(name)}${done ? ' ✓' : ` — need ${esc(needed)} more course${needed > 1 ? 's' : ''}`}</div>
        ${entry?.courses?.length ? `<div class="area-courses">${esc(entry.courses.join(' · '))}</div>` : ''}
        ${entry?.note ? `<div class="area-note">${esc(entry.note)}</div>` : ''}
      </div>
    </div>`;
  }

  html += '</div>';
  section.innerHTML = html;
  container.appendChild(section);
}

init();
