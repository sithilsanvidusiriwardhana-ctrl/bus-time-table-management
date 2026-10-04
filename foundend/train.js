const trainApi = '/api/trains';

async function trainRequest(url, options = {}) {
  const response = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  });
  const responseText = await response.text();
  let body;
  try {
    body = JSON.parse(responseText);
  } catch {
    throw new Error(`The train API is unavailable at ${url}. Restart the server or redeploy the Netlify function.`);
  }
  if (!response.ok) throw new Error(body.message || 'Request failed.');
  return body;
}

function setTrainMessage(message, isError = false) {
  const target = document.getElementById('trainMessage');
  if (target) {
    target.textContent = message;
    target.className = isError ? 'form-error' : 'form-success';
  }
}

function escapeTrainHtml(value) {
  return String(value ?? '').replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[character]));
}

async function setupStationMaster() {
  const form = document.getElementById('stationForm');
  const list = document.getElementById('stationList');
  if (!form || !list) return;
  async function load() {
    const { stations } = await trainRequest(`${trainApi}/stations`);
    list.innerHTML = stations.length ? `<table><thead><tr><th>Code</th><th>Station</th><th>Railway line</th><th></th></tr></thead><tbody>${stations.map((station) => `<tr><td>${escapeTrainHtml(station.station_code)}</td><td>${escapeTrainHtml(station.station_name)}</td><td>${escapeTrainHtml(station.railway_line)}</td><td><button class="action-btn delete-btn" data-delete-station="${station._id}">Delete</button></td></tr>`).join('')}</tbody></table>` : '<p>No stations have been added yet.</p>';
  }
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(form));
    try { await trainRequest(`${trainApi}/stations`, { method: 'POST', body: JSON.stringify(data) }); form.reset(); setTrainMessage('Station added.'); await load(); } catch (error) { setTrainMessage(error.message, true); }
  });
  list.addEventListener('click', async (event) => {
    const id = event.target.dataset.deleteStation;
    if (!id || !confirm('Delete this station?')) return;
    try { await trainRequest(`${trainApi}/stations/${id}`, { method: 'DELETE' }); setTrainMessage('Station deleted.'); await load(); } catch (error) { setTrainMessage(error.message, true); }
  });
  try { await load(); } catch (error) { setTrainMessage(error.message, true); }
}

async function setupTrainMaster() {
  const trainForm = document.getElementById('trainForm');
  const stopForm = document.getElementById('stopForm');
  const noticeForm = document.getElementById('noticeForm');
  const trainSelect = document.getElementById('timetableTrain');
  const stationSelect = document.getElementById('timetableStation');
  const list = document.getElementById('trainList');
  if (!trainForm || !stopForm || !noticeForm || !list) return;
  let trains = [];
  let stations = [];
  function populateSelects() {
    trainSelect.innerHTML = '<option value="">Select a train</option>' + trains.map((train) => `<option value="${train._id}">${escapeTrainHtml(train.train_number)} — ${escapeTrainHtml(train.train_name)}</option>`).join('');
    stationSelect.innerHTML = '<option value="">Select a station</option>' + stations.map((station) => `<option value="${station._id}">${escapeTrainHtml(station.station_code)} — ${escapeTrainHtml(station.station_name)} (${escapeTrainHtml(station.railway_line)})</option>`).join('');
  }
  function render() {
    list.innerHTML = trains.length ? trains.map((train) => `<section class="route-group-card"><div class="route-group-header"><h4 class="route-group-title">${escapeTrainHtml(train.train_number)} — ${escapeTrainHtml(train.train_name)}</h4><button class="action-btn delete-btn" data-delete-train="${train._id}">Delete train</button></div><div class="table-wrap"><table><thead><tr><th>Stop</th><th>Arrival</th><th>Departure</th><th></th></tr></thead><tbody>${train.stops.length ? train.stops.map((stop) => `<tr><td>${escapeTrainHtml(stop.station_code)} — ${escapeTrainHtml(stop.station_name)}</td><td>${escapeTrainHtml(stop.arrival_time || '—')}</td><td>${escapeTrainHtml(stop.departure_time || '—')}</td><td><button class="action-btn delete-btn" data-train-id="${train._id}" data-delete-stop="${stop._id}">Remove stop</button></td></tr>`).join('') : '<tr><td colspan="4">No timetable stops yet.</td></tr>'}</tbody></table></div></section>`).join('') : '<p>No trains have been added yet.</p>';
  }
  async function load() {
    const data = await Promise.all([trainRequest(`${trainApi}/trains`), trainRequest(`${trainApi}/stations`)]);
    trains = data[0].trains; stations = data[1].stations; populateSelects(); render();
  }
  trainForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    try { await trainRequest(`${trainApi}/trains`, { method: 'POST', body: JSON.stringify(Object.fromEntries(new FormData(trainForm))) }); trainForm.reset(); setTrainMessage('Train added.'); await load(); } catch (error) { setTrainMessage(error.message, true); }
  });
  stopForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(stopForm));
    const trainId = data.train_id; delete data.train_id;
    try { await trainRequest(`${trainApi}/trains/${trainId}/stops`, { method: 'POST', body: JSON.stringify(data) }); stopForm.reset(); setTrainMessage('Timetable stop added.'); await load(); } catch (error) { setTrainMessage(error.message, true); }
  });
  noticeForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    try { await trainRequest(`${trainApi}/notices`, { method: 'POST', body: JSON.stringify(Object.fromEntries(new FormData(noticeForm))) }); noticeForm.reset(); setTrainMessage('Public notice published.'); } catch (error) { setTrainMessage(error.message, true); }
  });
  list.addEventListener('click', async (event) => {
    const trainId = event.target.dataset.deleteTrain || event.target.dataset.trainId;
    if (!trainId) return;
    const stopId = event.target.dataset.deleteStop;
    if (!confirm(stopId ? 'Remove this stop?' : 'Delete this train and its timetable?')) return;
    try { await trainRequest(stopId ? `${trainApi}/trains/${trainId}/stops/${stopId}` : `${trainApi}/trains/${trainId}`, { method: 'DELETE' }); setTrainMessage(stopId ? 'Stop removed.' : 'Train deleted.'); await load(); } catch (error) { setTrainMessage(error.message, true); }
  });
  try { await load(); } catch (error) { setTrainMessage(error.message, true); }
}

async function setupTrainDashboard() {
  const list = document.getElementById('trainDashboardList');
  if (!list) return;
  try {
    const [{ trains }, { notices }] = await Promise.all([trainRequest(`${trainApi}/trains`), trainRequest(`${trainApi}/notices`)]);
    const noticeHtml = notices.length ? `<section class="route-group-card"><h4 class="route-group-title">Public notices</h4>${notices.map((notice) => `<p><strong>${escapeTrainHtml(notice.title)}:</strong> ${escapeTrainHtml(notice.message)}</p>`).join('')}</section>` : '';
    list.innerHTML = noticeHtml + (trains.length ? trains.map((train) => `<section class="route-group-card"><h4 class="route-group-title">${escapeTrainHtml(train.train_number)} — ${escapeTrainHtml(train.train_name)}</h4><div class="table-wrap"><table><thead><tr><th>Station</th><th>Arrival</th><th>Departure</th></tr></thead><tbody>${train.stops.length ? train.stops.map((stop) => `<tr><td>${escapeTrainHtml(stop.station_code)} — ${escapeTrainHtml(stop.station_name)}</td><td>${escapeTrainHtml(stop.arrival_time || '—')}</td><td>${escapeTrainHtml(stop.departure_time || '—')}</td></tr>`).join('') : '<tr><td colspan="3">Timetable not published yet.</td></tr>'}</tbody></table></div></section>`).join('') : '<p>No train timetables are available yet.</p>');
  } catch (error) { list.innerHTML = `<p class="form-error">${escapeTrainHtml(error.message)}</p>`; }
}

document.addEventListener('DOMContentLoaded', () => { setupStationMaster(); setupTrainMaster(); setupTrainDashboard(); });
