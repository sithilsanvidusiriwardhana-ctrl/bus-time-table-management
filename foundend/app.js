const STORAGE_KEY = 'bus-time-table-management-state';
const defaultState = {
  currentUser: null,
  users: [],
  pendingOtp: null,
  pendingUser: null,
  pendingAction: null,
  schedules: []
};

let state = loadState();
if (state.currentUser) {
  state.currentUser.role = normalizeRole(state.currentUser.role);
}
state.databaseDrivers = null;
state.databaseRoutes = [];
state.databaseBuses = [];
let editingScheduleId = null;
let editingRouteId = null;
let editingBusId = null;

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[character]);
}

function isValidUser(user, users = defaultState.users) {
  if (!user || typeof user !== 'object') {
    return false;
  }

  const storedUsername = String(user.username || user.name || '').toLowerCase();

  return users.some((savedUser) => {
    return storedUsername === String(savedUser.username || '').toLowerCase() || savedUser.displayName === user.displayName || savedUser.displayName === user.name;
  });
}

function loadState() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) {
    return { ...defaultState };
  }

  try {
    const parsedState = JSON.parse(stored);
    const normalizedState = {
      ...defaultState,
      ...(parsedState || {})
    };

    if (!normalizedState.users || !normalizedState.users.length) {
      normalizedState.users = defaultState.users;
    }

    if (!isValidUser(normalizedState.currentUser, normalizedState.users)) {
      normalizedState.currentUser = null;
    }

    return normalizedState;
  } catch (error) {
    console.error('Unable to load saved state.', error);
    return { ...defaultState };
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function getScheduleById(id) {
  return state.schedules.find((item) => String(item.id) === String(id));
}

function getRouteNumber(schedule) {
  return String(schedule?.routeNumber || '').trim() || 'General';
}

function isDepartedSchedule(schedule) {
  return String(schedule?.status || '').trim().toLowerCase() === 'departed';
}

function getRouteLabel(schedule) {
  const routeNumber = getRouteNumber(schedule);
  const routeName = String(schedule?.route || '').trim();
  return routeNumber === 'General' ? routeName || 'General route' : `${routeNumber}${routeName ? ` • ${routeName}` : ''}`;
}

function groupSchedulesByRoute(schedules) {
  const groups = new Map();

  schedules.forEach((schedule) => {
    const routeKey = getRouteNumber(schedule);
    if (!groups.has(routeKey)) {
      groups.set(routeKey, []);
    }
    groups.get(routeKey).push(schedule);
  });

  return Array.from(groups.entries()).map(([routeKey, items]) => ({
    routeKey,
    items
  }));
}

function resetForm() {
  const scheduleForm = document.getElementById('scheduleForm');
  if (scheduleForm) {
    scheduleForm.reset();
  }
  editingScheduleId = null;
  const submitButton = document.getElementById('scheduleSubmitBtn');
  if (submitButton) {
    submitButton.textContent = 'Add schedule';
  }
}

function setLoginError(message) {
  const errorBox = document.getElementById('loginError');
  if (errorBox) {
    errorBox.textContent = message;
  }
}

function clearLoginError() {
  setLoginError('');
}

function setRegisterMessage(message) {
  const messageBox = document.getElementById('registerMessage');
  if (messageBox) {
    messageBox.textContent = message;
  }
}

function setOtpMessage(message, isError = false) {
  const messageBox = document.getElementById('otpError');
  const otpMessage = document.getElementById('otpMessage');

  if (messageBox) {
    messageBox.textContent = message;
    messageBox.style.color = isError ? 'var(--danger)' : 'var(--admin)';
  }

  if (otpMessage && !message) {
    otpMessage.textContent = 'Enter the 6-digit code sent to your registered phone or email.';
  } else if (otpMessage) {
    otpMessage.textContent = message;
  }
}
async function sendEmailOTP() {
    const email = document.getElementById('emailInput').value;

    const response = await fetch('http://localhost:8000/api/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
    });

    const data = await response.json();
    if (data.success) {
        alert('OTP sent successfully to your email.');
    } else {
        alert('Failed to send OTP. Please try again.');
    }
}

function clearOtpState() {
  state.pendingOtp = null;
  state.pendingUser = null;
  state.pendingAction = null;
}

function renderOtpSection() {
  const otpSection = document.getElementById('otpSection');
  const otpTitle = document.getElementById('otpTitle');
  const otpMessage = document.getElementById('otpMessage');
  const verifyButton = document.getElementById('verifyOtpBtn');
  const otpCodeInput = document.getElementById('otpCode');

  if (!otpSection) {
    return;
  }

  const isPending = Boolean(state.pendingOtp && !state.currentUser);
  otpSection.classList.toggle('hidden', !isPending);

  if (!isPending) {
    if (otpCodeInput) {
      otpCodeInput.value = '';
    }
    return;
  }

  if (otpTitle) {
    otpTitle.textContent = state.pendingAction === 'register' ? 'Verify your account' : 'Verify sign-in';
  }

  if (otpMessage) {
    otpMessage.textContent = `Demo OTP: ${state.pendingOtp}. Enter it to continue.`;
  }

  if (verifyButton) {
    verifyButton.textContent = state.pendingAction === 'register' ? 'Verify and create account' : 'Verify and sign in';
  }
}

function normalizeRole(role) {
  const roleName = String(role || '').trim().toLowerCase();
  return {
    admin: 'Admin',
    driver: 'Driver',
    passenger: 'Passenger'
  }[roleName] || role;
}

function getRolePage(role) {
  switch (normalizeRole(role)) {
    case 'Admin':
      return 'admin.html';
    case 'Driver':
      return 'driver.html';
    case 'Passenger':
      return 'passenger.html';
    default:
      return 'index.html';
  }
}

function isAllowedRolePage(role, page) {
  const normalizedRole = normalizeRole(role);
  if (normalizedRole === 'Admin') {
    return ['admin.html', 'admin-drivers.html', 'admin-schedules.html'].includes(page);
  }
  return page === getRolePage(normalizedRole);
}

function redirectToRolePage() {
  const currentPage = window.location.pathname.split('/').pop() || 'index.html';
  if (!state.currentUser) {
    return;
  }

  const targetPage = getRolePage(state.currentUser.role);
  if (!isAllowedRolePage(state.currentUser.role, currentPage)) {
    window.location.replace(targetPage);
  }
}

function render() {
  if (state.currentUser) {
    redirectToRolePage();
    if (!isAllowedRolePage(state.currentUser.role, window.location.pathname.split('/').pop())) {
      return;
    }
  }

  renderOtpSection();
  renderDashboard();
  renderAdminPanel();
  renderDriverPanel();
  renderPassengerPanel();
  const priceModal = document.getElementById('priceModal');
  if (priceModal) {
    const isPassenger = state.currentUser?.role === 'Passenger';
    priceModal.classList.toggle('hidden', !isPassenger);
    priceModal.setAttribute('aria-hidden', !isPassenger ? 'true' : 'false');
    if (!isPassenger) closePriceModal();
  }
  const timetableModal = document.getElementById('passengerTimetableModal');
  if (timetableModal && state.currentUser?.role !== 'Passenger') closePassengerTimetable();
}

function getUserDisplayName(user) {
  return user?.displayName || user?.name || user?.username || 'User';
}

function renderDashboard() {
  const loginSection = document.getElementById('loginSection') || document.querySelector('.login-card');
  const dashboardSection = document.getElementById('dashboardSection');
  const dashboardTitle = document.getElementById('dashboardTitle');
  const userRoleBadge = document.getElementById('userRoleBadge');
  const welcomeCard = document.getElementById('welcomeCard');

  if (!dashboardSection) {
    return;
  }

  if (!state.currentUser) {
    if (loginSection) {
      loginSection.classList.remove('hidden');
    }
    dashboardSection.classList.add('hidden');
    return;
  }

  if (loginSection) {
    loginSection.classList.add('hidden');
  }
  dashboardSection.classList.remove('hidden');
  const page = window.location.pathname.split('/').pop();
  const adminPageTitles = {
    'admin.html': 'Admin dashboard',
    'admin-schedules.html': 'Schedule management',
    'admin-routes.html': 'Route timetables',
    'admin-buses.html': 'Bus management',
    'admin-drivers.html': 'Driver management',
  };
  dashboardTitle.textContent = state.currentUser.role === 'Admin'
    ? adminPageTitles[page] || 'Admin dashboard'
    : `${state.currentUser.role} dashboard`;
  userRoleBadge.textContent = state.currentUser.role;
  userRoleBadge.style.background = state.currentUser.role === 'Admin' ? 'var(--admin)' : state.currentUser.role === 'Driver' ? 'var(--driver)' : 'var(--passenger)';

  const displayName = getUserDisplayName(state.currentUser);
  const role = state.currentUser.role || 'Passenger';
  const message = role === 'Admin'
    ? 'You can manage routes, update trip status, and oversee every schedule.'
    : role === 'Driver'
      ? 'Your personal board shows the routes assigned to you and lets you update live status.'
      : 'You can browse trips, search by route, and track each bus before you travel.';

  welcomeCard.innerHTML = `
    <h3>Welcome, ${displayName}</h3>
    <p>${message}</p>
  `;

  document.getElementById('adminPanel').classList.toggle('hidden', role !== 'Admin');
  document.getElementById('driverPanel').classList.toggle('hidden', role !== 'Driver');
  document.getElementById('passengerPanel').classList.toggle('hidden', role !== 'Passenger');
}

function renderAdminPanel() {
  const timetableGroups = document.getElementById('routeTimetableGroups');

  const driverSelect = document.getElementById('driverName');
  if (driverSelect) {
    const drivers = Array.isArray(state.databaseDrivers) ? state.databaseDrivers : [];
    const currentVal = driverSelect.value;
    driverSelect.innerHTML = '<option value="">— Select a driver —</option>' +
      drivers.map((d) => `<option value="${d.username}">${d.name || d.displayName || d.username}</option>`).join('');
    if (currentVal) driverSelect.value = currentVal;
  }

  populateScheduleRouteOptions();
  populateBusRouteOptions();
  renderRouteManagement();
  renderBusManagement();

  const totalSchedules = document.getElementById('totalSchedules');
  const totalDrivers = document.getElementById('totalDrivers');
  const activeRoutes = document.getElementById('activeRoutes');
  const activeSchedules = state.schedules.filter((item) => !isDepartedSchedule(item));
  if (totalSchedules) totalSchedules.textContent = activeSchedules.length;
  if (totalDrivers) totalDrivers.textContent = Array.isArray(state.databaseDrivers) ? state.databaseDrivers.length : 0;
  if (activeRoutes) activeRoutes.textContent = activeSchedules.length;
  renderDriverAccountsList();

  if (!timetableGroups) return;

  const groupedSchedules = groupSchedulesByRoute(activeSchedules);

  if (!groupedSchedules.length) {
    timetableGroups.innerHTML = '<p>No timetable entries yet.</p>';
    return;
  }

  timetableGroups.innerHTML = groupedSchedules
    .map(
      ({ routeKey, items }) => `
        <section class="route-group-card">
          <h4 class="route-group-title">Route ${routeKey}</h4>
          <table>
            <thead>
              <tr>
                <th>Route</th>
                <th>Bus</th>
                <th>Driver</th>
                <th>Departure</th>
                <th>Arrival</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${items
                .map(
                  (schedule) => `
                    <tr>
                      <td>${getRouteLabel(schedule)}</td>
                      <td>${schedule.busNumber}</td>
                      <td>${schedule.driverName}</td>
                      <td>${schedule.departureTime}</td>
                      <td>${schedule.arrivalTime}</td>
                      <td><span class="status-pill ${getStatusClass(schedule.status)}">${schedule.status}</span></td>
                      <td>
                        ${schedule.pendingStatus ? `<span class="status-pill status-delayed">Pending: ${schedule.pendingStatus}</span><button class="action-btn edit-btn" data-action="approve-status" data-id="${schedule.id}">Approve</button>` : ''}
                        <button class="action-btn edit-btn" data-action="edit" data-id="${schedule.id}">Edit</button>
                        <button class="action-btn delete-btn" data-action="delete" data-id="${schedule.id}">Delete</button>
                      </td>
                    </tr>
                  `
                )
                .join('')}
            </tbody>
          </table>
        </section>
      `
    )
    .join('');
}

function populateScheduleRouteOptions() {
  const routeSelect = document.getElementById('routeNumber');
  if (!routeSelect) return;
  const selectedRoute = routeSelect.value;
  routeSelect.innerHTML = '<option value="">— Select a route —</option>' + state.databaseRoutes
    .map((route) => `<option value="${escapeHtml(route.route_number)}">${escapeHtml(route.route_number)} · ${escapeHtml(route.route_name)}</option>`)
    .join('');
  if (state.databaseRoutes.some((route) => route.route_number === selectedRoute)) routeSelect.value = selectedRoute;
  populateScheduleChoices();
}

function populateScheduleChoices(selectedBus = '', selectedDeparture = '') {
  const routeSelect = document.getElementById('routeNumber');
  const busSelect = document.getElementById('busNumber');
  const departureSelect = document.getElementById('departureTime');
  const routeName = document.getElementById('route');
  if (!routeSelect || !busSelect || !departureSelect) return;
  const route = state.databaseRoutes.find((item) => item.route_number === routeSelect.value);
  if (routeName) routeName.value = route?.route_name || '';
  const buses = state.databaseBuses.filter((bus) => bus.route_number === route?.route_number);
  busSelect.innerHTML = `<option value="">${route ? '— Select a bus —' : '— Select a route first —'}</option>` +
    buses.map((bus) => `<option value="${escapeHtml(bus.bus_number)}">${escapeHtml(bus.bus_number)} · ${escapeHtml(bus.bus_type)}</option>`).join('');
  busSelect.disabled = !route || !buses.length;
  if (buses.some((bus) => bus.bus_number === selectedBus)) busSelect.value = selectedBus;
  const times = route?.departure_times || [];
  departureSelect.innerHTML = `<option value="">${route ? '— Select a departure —' : '— Select a route first —'}</option>` +
    times.map((time) => `<option value="${escapeHtml(time)}">${escapeHtml(time)}</option>`).join('');
  departureSelect.disabled = !route || !times.length;
  if (times.includes(selectedDeparture)) departureSelect.value = selectedDeparture;
}

function populateBusRouteOptions(selectedRoute = '') {
  const routeSelect = document.getElementById('busRouteInput');
  if (!routeSelect) return;
  const currentRoute = selectedRoute || routeSelect.value;
  routeSelect.innerHTML = '<option value="">— Select a route —</option>' + state.databaseRoutes
    .map((route) => `<option value="${escapeHtml(route.route_number)}">${escapeHtml(route.route_number)} · ${escapeHtml(route.route_name)}</option>`)
    .join('');
  if (state.databaseRoutes.some((route) => route.route_number === currentRoute)) routeSelect.value = currentRoute;
}

function renderRouteManagement() {
  const list = document.getElementById('routeManagementList');
  if (!list) return;
  if (!state.databaseRoutes.length) {
    list.innerHTML = '<p>No routes registered yet.</p>';
    return;
  }
  list.innerHTML = state.databaseRoutes.map((route) => {
    const hourGroups = new Map();
    (route.departure_times || []).forEach((time) => {
      const [hour, minute] = time.split(':');
      if (!hourGroups.has(hour)) hourGroups.set(hour, []);
      hourGroups.get(hour).push(minute);
    });
    const timetableRows = [...hourGroups.entries()].map(([hour, minutes]) => `
      <tr><th>${escapeHtml(hour)}</th><td>${minutes.map((minute) => `[${escapeHtml(minute)}]`).join(' ')}</td></tr>
    `).join('');
    return `
      <section class="route-group-card">
        <div class="route-group-header"><h4 class="route-group-title">Route ${escapeHtml(route.route_number)}</h4><p class="route-summary">${escapeHtml(route.route_name)}</p></div>
        <table class="route-timetable"><thead><tr><th>Hours</th><th>Minutes</th></tr></thead><tbody>${timetableRows}</tbody></table>
        <div class="route-management-actions"><button class="action-btn edit-btn" data-action="edit-route" data-id="${escapeHtml(route._id)}">Edit</button><button class="action-btn delete-btn" data-action="delete-route" data-id="${escapeHtml(route._id)}">Delete</button></div>
      </section>`;
  }).join('');
}

function renderBusManagement() {
  const list = document.getElementById('busManagementList');
  if (!list) return;
  if (!state.databaseBuses.length) {
    list.innerHTML = '<p>No buses registered yet.</p>';
    return;
  }
  list.innerHTML = `
    <table><thead><tr><th>Bus</th><th>Route</th><th>Type</th><th>Actions</th></tr></thead>
      <tbody>${state.databaseBuses.map((bus) => {
        const route = state.databaseRoutes.find((item) => item.route_number === bus.route_number);
        return `<tr><td>${escapeHtml(bus.bus_number)}</td><td>${escapeHtml(bus.route_number)} · ${escapeHtml(route?.route_name || '')}</td><td>${escapeHtml(bus.bus_type)}</td>
          <td><button class="action-btn edit-btn" data-action="edit-bus" data-id="${escapeHtml(bus._id)}">Edit</button><button class="action-btn delete-btn" data-action="delete-bus" data-id="${escapeHtml(bus._id)}">Remove</button></td></tr>`;
      }).join('')}</tbody></table>`;
}

function renderDriverPanel() {
  const driverTrips = document.getElementById('driverTrips');
  if (!driverTrips || state.currentUser?.role !== 'Driver') return;

  const currentUsername = String(state.currentUser.username || '').trim().toLowerCase();
  const currentDisplayName = String(state.currentUser.displayName || state.currentUser.name || '').trim().toLowerCase();

  const matchingTrips = state.schedules.filter((trip) => {
    if (isDepartedSchedule(trip)) return false;
    const assignedUsername = String(trip.assignedDriverUsername || '').trim().toLowerCase();
    if (assignedUsername) return assignedUsername === currentUsername;
    const tripDriver = String(trip.driverName || '').trim().toLowerCase();
    return tripDriver === currentDisplayName || tripDriver === currentUsername;
  });

  if (!matchingTrips.length) {
    driverTrips.innerHTML = '<p>No assigned trips yet.</p>';
    return;
  }

  driverTrips.innerHTML = matchingTrips
    .map(
      (trip) => `
        <article class="trip-card">
          <h4>${trip.route}</h4>
          <p class="trip-meta">Bus ${trip.busNumber} • ${trip.departureTime} to ${trip.arrivalTime}</p>
          <div class="field-group">
            <label for="status-${trip.id}">Update status</label>
            <select id="status-${trip.id}" data-id="${trip.id}" ${trip.pendingStatus ? 'disabled' : ''}>
              <option value="On Time" ${trip.status === 'On Time' ? 'selected' : ''}>On Time</option>
              <option value="Delayed" ${trip.status === 'Delayed' ? 'selected' : ''}>Delayed</option>
              <option value="Departed" ${trip.status === 'Departed' ? 'selected' : ''}>Departed</option>
            </select>
            ${trip.pendingStatus ? `<p class="form-success">Pending admin approval: ${trip.pendingStatus}</p>` : ''}
          </div>
        </article>
      `
    )
    .join('');
}

function renderPassengerPanel() {
  const passengerTrips = document.getElementById('passengerTrips');
  if (!passengerTrips || state.currentUser?.role !== 'Passenger') return;

  const routeSelect = document.getElementById('passengerRouteSelect');
  const selectedRouteNumber = routeSelect?.value || '';
  if (routeSelect) {
    routeSelect.innerHTML = '<option value="">All routes</option>' + state.databaseRoutes
      .map((route) => `<option value="${escapeHtml(route.route_number)}">${escapeHtml(route.route_number)} · ${escapeHtml(route.route_name)}</option>`)
      .join('');
    if (state.databaseRoutes.some((route) => route.route_number === selectedRouteNumber)) {
      routeSelect.value = selectedRouteNumber;
    }
  }

  renderPassengerRouteTimetable(selectedRouteNumber);

  const searchInput = document.getElementById('searchRoute').value.toLowerCase();
  const statusFilter = document.getElementById('statusFilter').value;

  const filteredTrips = state.schedules.filter((trip) => {
    if (isDepartedSchedule(trip)) return false;
    const matchesSearch = trip.route.toLowerCase().includes(searchInput) || getRouteNumber(trip).toLowerCase().includes(searchInput);
    const matchesStatus = statusFilter === 'All' || trip.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (!filteredTrips.length) {
    passengerTrips.innerHTML = '<p>No buses match your filters.</p>';
    return;
  }

  const groupedTrips = groupSchedulesByRoute(filteredTrips);

  passengerTrips.innerHTML = groupedTrips
    .map(
      ({ routeKey, items }) => `
        <section class="route-group-card passenger-route-card">
          <div class="route-group-header">
            <h4 class="route-group-title">Route ${routeKey}</h4>
            <p class="route-summary">${items[0]?.route || 'Scheduled trips'}</p>
          </div>
          <div class="table-wrap">
            <table class="passenger-timetable">
              <thead>
                <tr>
                  <th>Route</th>
                  <th>Bus</th>
                  <th>Driver</th>
                  <th>Departure</th>
                  <th>Arrival</th>
                  <th>Status</th>
                  <th>Fare</th>
                </tr>
              </thead>
              <tbody>
                ${items
                  .map(
                    (trip) => `
                      <tr>
                        <td>${getRouteLabel(trip)}</td>
                        <td>${trip.busNumber}</td>
                        <td>${trip.driverName}</td>
                        <td>${trip.departureTime}</td>
                        <td>${trip.arrivalTime}</td>
                        <td><span class="status-pill ${getStatusClass(trip.status)}">${trip.status}</span></td>
                        <td><button class="price-btn" data-action="price" data-id="${trip.id}">${formatCurrency(trip.priceBase || 1200)}</button></td>
                      </tr>
                    `
                  )
                  .join('')}
              </tbody>
            </table>
          </div>
        </section>
      `
    )
    .join('');
}

function renderPassengerRouteTimetable(routeNumber) {
  const timetable = document.getElementById('passengerRouteTimetable');
  if (!timetable) return;
  if (!routeNumber) {
    timetable.innerHTML = '<p>Select a route to view its timetable.</p>';
    return;
  }
  const route = state.databaseRoutes.find((item) => item.route_number === routeNumber);
  if (!route) {
    timetable.innerHTML = '<p>This route timetable is unavailable.</p>';
    return;
  }
  const hourGroups = new Map();
  (route.departure_times || []).forEach((time) => {
    const [hour, minute] = time.split(':');
    if (!hourGroups.has(hour)) hourGroups.set(hour, []);
    hourGroups.get(hour).push(minute);
  });
  const rows = [...hourGroups.entries()].map(([hour, minutes]) => `
    <tr><th scope="row">${escapeHtml(hour)}</th><td>${minutes.map((minute) => `[${escapeHtml(minute)}]`).join(' ')}</td></tr>
  `).join('');
  timetable.innerHTML = `
    <div class="route-group-header"><h4 class="route-group-title">Route ${escapeHtml(route.route_number)}</h4><p class="route-summary">${escapeHtml(route.route_name)}</p></div>
    <table class="route-timetable"><thead><tr><th>Hours</th><th>Minutes</th></tr></thead><tbody>${rows}</tbody></table>`;
}

function getStatusClass(status) {
  switch (status) {
    case 'Delayed':
      return 'status-delayed';
    case 'Departed':
      return 'status-departed';
    default:
      return 'status-on-time';
  }
}

function getUsers() {
  return Array.isArray(state.users) ? state.users : [];
}

async function readApiResponse(response) {
  const responseText = await response.text();
  let result = {};

  try {
    result = responseText ? JSON.parse(responseText) : {};
  } catch {
    throw new Error(
      `The server returned HTML instead of JSON (HTTP ${response.status}). Restart node server.js and open the app through http://localhost:8000.`
    );
  }

  return result;
}

function normalizeContact(input) {
  const raw = String(input || '').trim();
  if (!raw) return '';
  if (raw.indexOf('@') >= 0) {
    return raw.toLowerCase();
  }

  const digits = raw.replace(/\D+/g, '');
  return digits || raw;
}

async function handleLogin(event) {
  event.preventDefault();
  const formData = new FormData(event.target);
  const username = String(formData.get('username') || '').trim();
  const password = String(formData.get('password') || '').trim();

  if (!username || !password) {
    setLoginError('Please enter both username and password.');
    return;
  }

  try {
    // Send only username and password to MongoDB backend
    const response = await fetch('/api/users/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });

    const responseText = await response.text();
    let result;

    try {
      result = responseText ? JSON.parse(responseText) : {};
    } catch {
      throw new Error(`Login endpoint returned HTML (HTTP ${response.status}). Open the app through http://localhost:8000.`);
    }

    if (!response.ok) {
      throw new Error(result.message || result.error || 'Invalid username or password.');
    }

    const verifiedUser = result.user; // Contains the role fetched from DB
    const normalizedUser = {
      ...verifiedUser,
      role: normalizeRole(verifiedUser?.role),
      name: verifiedUser.displayName || verifiedUser.username
    };

    if (normalizedUser.role === 'Passenger') {
      state.currentUser = normalizedUser;
      state.users = [
        ...getUsers().filter((user) => user.username.toLowerCase() !== normalizedUser.username.toLowerCase()),
        normalizedUser
      ];
      clearLoginError();
      saveState();
      render();
      return;
    }

    // For Admin or Driver, handle OTP / dashboard redirect based on DB role
    const otp = otpUtils.generateOtp(6);
    const pendingUser = normalizedUser;
    sessionStorage.setItem('pendingOtp', otp);
    sessionStorage.setItem('pendingUser', JSON.stringify(pendingUser));
    sessionStorage.setItem('pendingAction', 'login');
    window.location.href = 'otp.html';

  } catch (error) {
    setLoginError(error.message || 'Server error during login.');
  }
}

function handleRegister(event) {
  event.preventDefault();
  const formData = new FormData(event.target);
  const displayName = String(formData.get('displayName') || '').trim();
  const username = String(formData.get('newUsername') || '').trim();
  const password = String(formData.get('newPassword') || '').trim();
  const role = 'Passenger';

  if (!displayName || !username || !password) {
    setRegisterMessage('Please fill in all fields to create an account.');
    return;
  }

  if (getUsers().some((user) => user.username.toLowerCase() === username.toLowerCase())) {
    setRegisterMessage('That username is already taken.');
    return;
  }

  const newUser = {
    username: username.toLowerCase(),
    password,
    role,
    displayName
  };

  const otp = otpUtils.generateOtp(6);

  state.pendingOtp = otp;
  state.pendingUser = { ...newUser, name: displayName };
  state.pendingAction = 'register';

  sessionStorage.setItem('pendingOtp', otp);
  sessionStorage.setItem('pendingUser', JSON.stringify(state.pendingUser));
  sessionStorage.setItem('pendingAction', 'register');

  setRegisterMessage(`Account setup requires OTP verification. Demo OTP: ${otp}`);
  window.location.href = 'otp.html';
}

function handleVerifyOtp() {
  const enteredOtp = String(document.getElementById('otpCode')?.value || '').trim();
  if (!enteredOtp) {
    setOtpMessage('Please enter the OTP.', true);
    return;
  }

  if (!state.pendingOtp || !otpUtils.isValidOtp(enteredOtp, state.pendingOtp)) {
    setOtpMessage('The OTP you entered is incorrect. Please try again.', true);
    return;
  }

  if (state.pendingAction === 'register') {
    const userToCreate = state.pendingUser;
    if (!userToCreate) {
      setOtpMessage('No pending registration found.', true);
      return;
    }

    state.users = [...getUsers(), {
      username: userToCreate.username,
      password: userToCreate.password,
      role: userToCreate.role,
      displayName: userToCreate.displayName
    }];

    state.currentUser = { ...userToCreate, name: userToCreate.displayName };
    clearOtpState();
    saveState();
    setRegisterMessage(`Account verified for ${userToCreate.displayName}.`);
    window.location.href = 'passenger.html';
    return;
  }

  state.currentUser = { ...state.pendingUser, name: state.pendingUser?.displayName || state.pendingUser?.name };
  clearOtpState();
  saveState();
  window.location.href = getRolePage(state.currentUser.role || 'Passenger');
}

function handleResendOtp() {
  if (!state.pendingUser) {
    return;
  }

  const newOtp = otpUtils.generateOtp(6);
  state.pendingOtp = newOtp;
  sessionStorage.setItem('pendingOtp', newOtp);
  setOtpMessage(`A new OTP was generated: ${newOtp}`);
  saveState();
  render();
}
async function handleScheduleSubmit(event) {
  event.preventDefault();
  const formData = new FormData(event.target);
  const assignedUsername = String(formData.get('driverName') || '').trim();
  const assignedUser = (Array.isArray(state.databaseDrivers) ? state.databaseDrivers : [])
    .find((driver) => String(driver.username || '').toLowerCase() === assignedUsername.toLowerCase())
    || getUsers().find((user) => String(user.username || '').toLowerCase() === assignedUsername.toLowerCase());
  const assignedDriverUsername = String(assignedUser?.username || assignedUsername).trim();
  
  const newSchedule = {
    id: editingScheduleId || Date.now(),
    route: String(formData.get('route') || '').trim(),
    routeNumber: String(formData.get('routeNumber') || '').trim(),
    busNumber: String(formData.get('busNumber') || '').trim(),
    driverName: assignedUser ? (assignedUser.name || assignedUser.displayName || assignedUser.username) : assignedUsername,
    assignedDriverUsername,
    departureTime: String(formData.get('departureTime') || '').trim(),
    arrivalTime: String(formData.get('arrivalTime') || '').trim(),
    status: String(formData.get('status') || 'On Time'),
    type: String(formData.get('busType') || 'Normal'),
    priceBase: Number(formData.get('priceBase')) || 1200
  };

  if (!newSchedule.route || !newSchedule.routeNumber || !newSchedule.busNumber || !newSchedule.driverName || !newSchedule.departureTime || !newSchedule.arrivalTime) {
    return;
  }

  try {
    // Send data to your MongoDB backend route
    const schedulePayload = {
      bus_number: newSchedule.busNumber,
      route_name: newSchedule.route,
      route_number: newSchedule.routeNumber,
      assign_driver: newSchedule.assignedDriverUsername,
      departure_time: newSchedule.departureTime,
      arrival_time: newSchedule.arrivalTime,
      status: newSchedule.status,
      bus_type: newSchedule.type
    };
    const response = await fetch(
      editingScheduleId
        ? `/api/shedulle/${encodeURIComponent(editingScheduleId)}`
        : '/api/shedulle/register',
      {
      method: editingScheduleId ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(schedulePayload)
      }
    );

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || result.error || 'Failed to save schedule to database');
    }

    resetForm();
    await loadSchedulesFromDatabase();
  } catch (error) {
    console.error('Error saving schedule:', error);
    alert(error.message || 'Unable to save schedule to MongoDB.');
  }
}

function setManagementMessage(id, text, isError = false) {
  const message = document.getElementById(id);
  if (!message) return;
  message.textContent = text;
  message.classList.toggle('form-error', isError);
  message.classList.toggle('form-success', !isError);
}

async function handleRouteSubmit(event) {
  event.preventDefault();
  const formData = new FormData(event.target);
  const departure_times = [...new Set(String(formData.get('departureTimes') || '')
    .split(/[\s,;]+/)
    .map((time) => time.trim())
    .filter(Boolean))].sort();
  const payload = {
    route_number: String(formData.get('routeNumber') || '').trim(),
    route_name: String(formData.get('routeName') || '').trim(),
    departure_times,
  };
  try {
    const response = await fetch(editingRouteId ? `/api/routes/${encodeURIComponent(editingRouteId)}` : '/api/routes', {
      method: editingRouteId ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.message || 'Unable to save route.');
    event.target.reset();
    editingRouteId = null;
    document.getElementById('routeSubmitBtn').textContent = 'Add route';
    setManagementMessage('routeMessage', result.message);
    await loadRouteAndBusData();
  } catch (error) {
    setManagementMessage('routeMessage', error.message || 'Unable to save route.', true);
  }
}

async function handleBusSubmit(event) {
  event.preventDefault();
  const formData = new FormData(event.target);
  const payload = {
    bus_number: String(formData.get('busNumber') || '').trim(),
    route_number: String(formData.get('routeNumber') || '').trim(),
    bus_type: String(formData.get('busType') || 'Normal'),
  };
  try {
    const response = await fetch(editingBusId ? `/api/buses/${encodeURIComponent(editingBusId)}` : '/api/buses', {
      method: editingBusId ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.message || 'Unable to save bus.');
    event.target.reset();
    editingBusId = null;
    document.getElementById('busSubmitBtn').textContent = 'Register bus';
    setManagementMessage('busMessage', result.message);
    await loadRouteAndBusData();
  } catch (error) {
    setManagementMessage('busMessage', error.message || 'Unable to save bus.', true);
  }
}

async function handleRouteManagementClick(event) {
  const button = event.target.closest('button[data-action]');
  if (!button) return;
  const route = state.databaseRoutes.find((item) => String(item._id) === button.dataset.id);
  if (!route) return;
  if (button.dataset.action === 'edit-route') {
    editingRouteId = route._id;
    document.getElementById('routeNumberInput').value = route.route_number;
    document.getElementById('routeNameInput').value = route.route_name;
    document.getElementById('routeTimesInput').value = (route.departure_times || []).join(', ');
    document.getElementById('routeSubmitBtn').textContent = 'Update route';
    document.getElementById('routeNumberInput').focus();
    return;
  }
  if (button.dataset.action === 'delete-route' && confirm(`Delete route ${route.route_number}?`)) {
    try {
      const response = await fetch(`/api/routes/${encodeURIComponent(route._id)}`, { method: 'DELETE' });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Unable to delete route.');
      setManagementMessage('routeMessage', result.message);
      await loadRouteAndBusData();
    } catch (error) {
      setManagementMessage('routeMessage', error.message || 'Unable to delete route.', true);
    }
  }
}

async function handleBusManagementClick(event) {
  const button = event.target.closest('button[data-action]');
  if (!button) return;
  const bus = state.databaseBuses.find((item) => String(item._id) === button.dataset.id);
  if (!bus) return;
  if (button.dataset.action === 'edit-bus') {
    editingBusId = bus._id;
    document.getElementById('busNumberInput').value = bus.bus_number;
    document.getElementById('busRouteInput').value = bus.route_number;
    document.getElementById('busTypeInput').value = bus.bus_type;
    document.getElementById('busSubmitBtn').textContent = 'Update bus';
    document.getElementById('busNumberInput').focus();
    return;
  }
  if (button.dataset.action === 'delete-bus' && confirm(`Remove bus ${bus.bus_number}?`)) {
    try {
      const response = await fetch(`/api/buses/${encodeURIComponent(bus._id)}`, { method: 'DELETE' });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Unable to remove bus.');
      setManagementMessage('busMessage', result.message);
      await loadRouteAndBusData();
    } catch (error) {
      setManagementMessage('busMessage', error.message || 'Unable to remove bus.', true);
    }
  }
}

async function handleAdminCreateDriver(event) {
  event.preventDefault();
  const msgEl = document.getElementById('createDriverMessage');
  const formData = new FormData(event.target);
  const displayName = String(formData.get('driverFullName') || '').trim();
  const username = String(formData.get('driverUsername') || '').trim().toLowerCase();
  const password = String(formData.get('driverPassword') || '').trim();

  function setMsg(text, isError = false) {
    if (msgEl) {
      msgEl.textContent = text;
      msgEl.style.color = isError ? 'var(--danger)' : 'var(--admin)';
    }
  }

  if (!displayName || !username || !password) {
    setMsg('Please fill in all fields.', true);
    return;
  }

  if (getUsers().some((u) => u.username.toLowerCase() === username)) {
    setMsg('That username is already taken.', true);
    return;
  }

  const newDriver = { name: displayName, username, password, role: 'Driver', displayName };

  try {
    const response = await fetch('/api/drivers/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newDriver)
    });
    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Failed to save user');
    }
    event.target.reset();
    setMsg(`Driver account created for ${displayName}. They can now log in.`);
    await loadDriversFromDatabase();
  } catch (error) {
    setMsg(error.message || 'Unable to save the driver account.', true);
  }
}

function renderDriverAccountsList() {
  const listEl = document.getElementById('driverAccountsList');
  if (!listEl) return;
  if (!Array.isArray(state.databaseDrivers)) {
    listEl.innerHTML = '<p>Loading drivers...</p>';
    return;
  }
  const drivers = state.databaseDrivers;
  if (!drivers.length) {
    listEl.innerHTML = '<p>No driver accounts yet.</p>';
    return;
  }
  listEl.innerHTML = `
    <table>
      <thead><tr><th>Name</th><th>Username</th><th>Actions</th></tr></thead>
      <tbody>
        ${drivers.map((d) => `
          <tr>
            <td>${d.name || d.displayName || d.username}</td>
            <td>${d.username}</td>
            <td><button class="action-btn delete-btn" data-action="delete-driver" data-username="${d.username}">Remove</button></td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

async function loadSchedulesFromDatabase() {
  try {
    const response = await fetch('/api/shedulle');
    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || 'Failed to load schedules from MongoDB.');
    }

    state.schedules = (Array.isArray(result.shedulles) ? result.shedulles : []).map((item) => ({
      id: String(item._id),
      route: item.route_name,
      routeNumber: item.route_number,
      busNumber: item.bus_number,
      driverName: item.assign_driver,
      assignedDriverUsername: item.assign_driver,
      departureTime: item.departure_time,
      arrivalTime: item.arrival_time,
      status: item.status,
      pendingStatus: item.pending_status,
      pendingStatusDriver: item.pending_status_driver,
      type: item.bus_type,
      priceBase: Number(item.price_base) || 1200
    }));
    saveState();
    render();
  } catch (error) {
    console.error('Unable to load schedules from MongoDB.', error);
  }
}

async function loadDriversFromDatabase() {
  try {
    const response = await fetch('/api/drivers');
    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || 'Failed to load drivers from MongoDB.');
    }

    state.databaseDrivers = Array.isArray(result.drivers) ? result.drivers : [];
    renderAdminPanel();
  } catch (error) {
    state.databaseDrivers = [];
    const listEl = document.getElementById('driverAccountsList');
    if (listEl) {
      listEl.innerHTML = `<p class="form-error">${error.message || 'Unable to load drivers from MongoDB.'}</p>`;
    }
  }
}

async function loadRouteAndBusData() {
  try {
    const [routeResponse, busResponse] = await Promise.all([
      fetch('/api/routes'),
      fetch('/api/buses'),
    ]);
    const [routeResult, busResult] = await Promise.all([routeResponse.json(), busResponse.json()]);
    if (!routeResponse.ok) throw new Error(routeResult.message || 'Unable to load routes.');
    if (!busResponse.ok) throw new Error(busResult.message || 'Unable to load buses.');
    state.databaseRoutes = Array.isArray(routeResult.routes) ? routeResult.routes : [];
    state.databaseBuses = Array.isArray(busResult.buses) ? busResult.buses : [];
    renderAdminPanel();
    renderPassengerPanel();
  } catch (error) {
    const list = document.getElementById('routeManagementList') || document.getElementById('busManagementList');
    if (list) list.innerHTML = `<p class="form-error">${escapeHtml(error.message || 'Unable to load route and bus data.')}</p>`;
  }
}

function formatCurrency(v) {
  return Number(v).toLocaleString('en-US');
}

function computeFares(base) {
  const normal = Math.round(base);
  const semi = Math.round(base * 1.25);
  const lux = Math.round(base * 1.6);
  return [
    { type: 'Normal', fare: normal },
    { type: 'Semi Luxiri', fare: semi },
    { type: 'Luxire', fare: lux }
  ];
}

function showPriceModal(scheduleId) {
  if (state.currentUser?.role !== 'Passenger') return;
  const modal = document.getElementById('priceModal');
  const tbody = document.querySelector('#priceTable tbody');
  const schedule = getScheduleById(Number(scheduleId));
  if (!modal || !tbody || !schedule) return;

  const fares = computeFares(schedule.priceBase || 1200);
  tbody.innerHTML = fares.map(f => `<tr><td>${f.type}</td><td>${formatCurrency(f.fare)}</td></tr>`).join('');

  modal.classList.remove('hidden');
  modal.setAttribute('aria-hidden', 'false');
}

function closePriceModal() {
  const modal = document.getElementById('priceModal');
  if (!modal) return;
  modal.classList.add('hidden');
  modal.setAttribute('aria-hidden', 'true');
}

function openPassengerTimetable() {
  if (state.currentUser?.role !== 'Passenger') return;
  const modal = document.getElementById('passengerTimetableModal');
  if (!modal) return;
  modal.classList.remove('hidden');
  modal.setAttribute('aria-hidden', 'false');
  document.getElementById('passengerRouteSelect')?.focus();
}

function closePassengerTimetable() {
  const modal = document.getElementById('passengerTimetableModal');
  if (!modal) return;
  modal.classList.add('hidden');
  modal.setAttribute('aria-hidden', 'true');
  const routeSelect = document.getElementById('passengerRouteSelect');
  if (routeSelect) {
    routeSelect.value = '';
    renderPassengerRouteTimetable('');
  }
}

function handlePassengerClick(event) {
  const el = event.target.closest('[data-action]');
  if (!el) return;
  const action = el.getAttribute('data-action');
  const id = el.getAttribute('data-id');
  if (action === 'open-timetable') {
    openPassengerTimetable();
    return;
  }
  if (action === 'close-timetable') {
    closePassengerTimetable();
    return;
  }
  if (action === 'price') {
    showPriceModal(id);
    return;
  }
  if (action === 'close') {
    closePriceModal();
    return;
  }
}

async function handleTableClick(event) {
  const button = event.target.closest('button[data-action]');
  if (!button) return;

  const id = button.getAttribute('data-id');
  const action = button.getAttribute('data-action');

  if (action === 'approve-status') {
    try {
      const response = await fetch(`/api/shedulle/${encodeURIComponent(id)}/status-approve`, { method: 'POST' });
      const result = await readApiResponse(response);
      if (!response.ok) throw new Error(result.message || 'Unable to approve status update.');
      await loadSchedulesFromDatabase();
    } catch (error) {
      alert(error.message || 'Unable to approve status update.');
    }
    return;
  }

  if (action === 'delete') {
    try {
      const response = await fetch(`/api/shedulle/${encodeURIComponent(id)}`, { method: 'DELETE' });
      const result = await readApiResponse(response);
      if (!response.ok) throw new Error(result.message || 'Unable to delete schedule.');
      await loadSchedulesFromDatabase();
    } catch (error) {
      alert(error.message || 'Unable to delete schedule.');
    }
    return;
  }

  if (action === 'edit') {
    const schedule = getScheduleById(id);
    if (!schedule) return;

    editingScheduleId = schedule.id;
    const routeSelect = document.getElementById('routeNumber');
    if (routeSelect) {
      routeSelect.value = schedule.routeNumber || '';
      populateScheduleChoices(schedule.busNumber, schedule.departureTime);
    }
    document.getElementById('route').value = schedule.route;
    const driverSel = document.getElementById('driverName');
    if (driverSel) {
      driverSel.value = schedule.assignedDriverUsername || '';
      if (!driverSel.value) {
        const matchOpt = Array.from(driverSel.options).find(
          (o) => o.text.toLowerCase() === String(schedule.driverName || '').toLowerCase()
        );
        if (matchOpt) driverSel.value = matchOpt.value;
      }
    }
    document.getElementById('arrivalTime').value = schedule.arrivalTime;
    document.getElementById('status').value = schedule.status;
    document.getElementById('busType').value = schedule.type || 'Normal';
    document.getElementById('scheduleSubmitBtn').textContent = 'Update schedule';
  }
}

async function handleDriverStatusChange(event) {
  const select = event.target.closest('select[data-id]');
  if (!select) return;

  const id = select.getAttribute('data-id');
  const schedule = getScheduleById(id);
  if (!schedule) return;

  try {
    const response = await fetch(`/api/shedulle/${encodeURIComponent(id)}/status-request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: select.value,
        driver_username: state.currentUser.username
      })
    });
    const result = await readApiResponse(response);
    if (!response.ok) throw new Error(result.message || 'Unable to send status for approval.');
    schedule.pendingStatus = result.shedulle.pending_status;
    schedule.pendingStatusDriver = result.shedulle.pending_status_driver;
    render();
  } catch (error) {
    alert(error.message || 'Unable to send status for admin approval.');
    render();
  }
}

function handleLogout() {
  state.currentUser = null;
  clearOtpState();
  saveState();
  resetForm();
  window.location.replace('index.html');
}

function attachEvents() {
  const loginForm = document.getElementById('loginForm');
  const registerForm = document.getElementById('registerForm');
  const scheduleForm = document.getElementById('scheduleForm');
  const routeForm = document.getElementById('routeForm');
  const busForm = document.getElementById('busForm');
  const routeManagementList = document.getElementById('routeManagementList');
  const busManagementList = document.getElementById('busManagementList');
  const scheduleRouteSelect = document.getElementById('routeNumber');
  const timetableGroups = document.getElementById('routeTimetableGroups');
  const driverTrips = document.getElementById('driverTrips');
  const passengerTrips = document.getElementById('passengerTrips');
  const searchRoute = document.getElementById('searchRoute');
  const passengerRouteSelect = document.getElementById('passengerRouteSelect');
  const statusFilter = document.getElementById('statusFilter');
  const logoutBtn = document.getElementById('logoutBtn');
  const verifyOtpBtn = document.getElementById('verifyOtpBtn');
  const resendOtpBtn = document.getElementById('resendOtpBtn');
  const createAccountBtn = document.getElementById('createAccountBtn');
  const resetDemoBtn = document.getElementById('resetDemoBtn');
  const quickAdmin = document.getElementById('quickAdmin');
  const quickDriver = document.getElementById('quickDriver');
  const quickPassenger = document.getElementById('quickPassenger');
  const registerPanel = document.getElementById('registerPanel');

  if (loginForm) loginForm.addEventListener('submit', handleLogin);
  if (registerForm) registerForm.addEventListener('submit', handleRegister);
  if (scheduleForm) scheduleForm.addEventListener('submit', handleScheduleSubmit);
  if (routeForm) routeForm.addEventListener('submit', handleRouteSubmit);
  if (busForm) busForm.addEventListener('submit', handleBusSubmit);
  if (routeManagementList) routeManagementList.addEventListener('click', handleRouteManagementClick);
  if (busManagementList) busManagementList.addEventListener('click', handleBusManagementClick);
  if (scheduleRouteSelect) scheduleRouteSelect.addEventListener('change', () => populateScheduleChoices());
  if (timetableGroups) timetableGroups.addEventListener('click', handleTableClick);
  const createDriverForm = document.getElementById('createDriverForm');
  if (createDriverForm) createDriverForm.addEventListener('submit', handleAdminCreateDriver);
  const driverAccountsList = document.getElementById('driverAccountsList');
  if (driverAccountsList) driverAccountsList.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-action="delete-driver"]');
    if (!btn) return;
    const uname = btn.getAttribute('data-username');
    if (!uname || !confirm(`Remove driver account "${uname}"?`)) return;

    try {
      const response = await fetch(`/api/drivers/${encodeURIComponent(uname)}`, { method: 'DELETE' });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message || 'Unable to remove driver account.');
      }

      state.users = state.users.filter((user) => String(user.username || '').toLowerCase() !== uname.toLowerCase());
      saveState();
      await loadDriversFromDatabase();
    } catch (error) {
      alert(error.message || 'Unable to remove driver account from the database.');
    }
  });
  if (createAccountBtn && registerPanel) createAccountBtn.addEventListener('click', () => {
    registerPanel.classList.toggle('hidden');
    if (!registerPanel.classList.contains('hidden')) {
      document.getElementById('newUsername')?.focus();
    }
  });
  if (resetDemoBtn) resetDemoBtn.addEventListener('click', resetDemoData);
  if (quickAdmin) quickAdmin.addEventListener('click', () => quickLogin('Admin'));
  if (quickDriver) quickDriver.addEventListener('click', () => quickLogin('Driver'));
  if (quickPassenger) quickPassenger.addEventListener('click', () => quickLogin('Passenger'));
  if (driverTrips) driverTrips.addEventListener('change', handleDriverStatusChange);
  if (passengerTrips) passengerTrips.addEventListener('click', handlePassengerClick);
  if (searchRoute) searchRoute.addEventListener('input', renderPassengerPanel);
  if (passengerRouteSelect) passengerRouteSelect.addEventListener('change', renderPassengerPanel);
  if (statusFilter) statusFilter.addEventListener('change', renderPassengerPanel);
  if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);
  if (verifyOtpBtn) verifyOtpBtn.addEventListener('click', handleVerifyOtp);
  if (resendOtpBtn) resendOtpBtn.addEventListener('click', handleResendOtp);
  const priceModal = document.getElementById('priceModal');
  if (priceModal) priceModal.addEventListener('click', handlePassengerClick);
  document.addEventListener('click', handlePassengerClick);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closePriceModal();
      closePassengerTimetable();
    }
  });
}

function quickLogin(role) {
  const users = getUsers();
  const candidate = users.find(u => u.role === role) || users.find(u => (u.username || '').toLowerCase() === role.toLowerCase());
  if (!candidate) {
    alert('Demo user not found. Try Reset demo data first.');
    return;
  }
  state.currentUser = { ...candidate, name: candidate.displayName || candidate.username };
  saveState();
  render();
}

function resetDemoData() {
  if (!confirm('Reset demo data? This will clear saved schedules and accounts and reload the app.')) return;
  try {
    localStorage.removeItem(STORAGE_KEY);
    sessionStorage.clear();
  } catch (e) {
    console.warn('Unable to clear storage', e);
  }
  location.reload();
}

window.addEventListener('DOMContentLoaded', () => {
  attachEvents();
  closePriceModal();
  render();
  loadSchedulesFromDatabase();
  loadRouteAndBusData();
  if (document.getElementById('driverAccountsList') || document.getElementById('driverName')) {
    loadDriversFromDatabase();
  }
});
