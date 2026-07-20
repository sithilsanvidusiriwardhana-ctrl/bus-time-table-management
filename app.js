const STORAGE_KEY = 'bus-time-table-management-state';

const verifiedUsers = [
  { username: 'admin', password: 'admin123', role: 'Admin', displayName: 'Administrator' },
  { username: 'driver', password: 'driver123', role: 'Driver', displayName: 'Bus Driver' },
  { username: 'passenger', password: 'passenger123', role: 'Passenger', displayName: 'Passenger' }
];

const defaultState = {
  currentUser: null,
  users: verifiedUsers.map((user) => ({ ...user })),
  pendingOtp: null,
  pendingUser: null,
  pendingAction: null,
  schedules: [
    {
      id: 1,
      route: 'Central - Airport',
      routeNumber: '12A',
      busNumber: 'B-101',
      driverName: 'John',
      departureTime: '08:00',
      arrivalTime: '09:15',
      status: 'On Time',
      type: 'Normal',
      priceBase: 1430
    },
    {
      id: 2,
      route: 'North Town - Market',
      routeNumber: '8C',
      busNumber: 'B-205',
      driverName: 'Sara',
      departureTime: '10:30',
      arrivalTime: '11:45',
      status: 'Delayed',
      type: 'Semi Luxiri',
      priceBase: 1660
    },
    {
      id: 3,
      route: 'Hill View - City Center',
      routeNumber: '12A',
      busNumber: 'B-309',
      driverName: 'John',
      departureTime: '13:00',
      arrivalTime: '14:00',
      status: 'Departed',
      type: 'Luxire',
      priceBase: 1970
    }
  ]
};

let state = loadState();
let editingScheduleId = null;

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
  return state.schedules.find((item) => item.id === id);
}

function getRouteNumber(schedule) {
  return String(schedule?.routeNumber || '').trim() || 'General';
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

function getRolePage(role) {
  switch (role) {
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

function redirectToRolePage() {
  const currentPage = window.location.pathname.split('/').pop() || 'index.html';
  if (!state.currentUser || currentPage === 'otp.html') {
    return;
  }

  const targetPage = getRolePage(state.currentUser.role);
  if (currentPage !== targetPage) {
    window.location.replace(targetPage);
  }
}

function render() {
  if (state.currentUser) {
    redirectToRolePage();
    if (window.location.pathname.split('/').pop() !== getRolePage(state.currentUser.role)) {
      return;
    }
  }

  renderOtpSection();
  renderDashboard();
  renderAdminPanel();
  renderDriverPanel();
  renderPassengerPanel();
  // Ensure price modal is only visible/available for passengers
  const priceModal = document.getElementById('priceModal');
  if (priceModal) {
    const isPassenger = state.currentUser?.role === 'Passenger';
    priceModal.classList.toggle('hidden', !isPassenger);
    priceModal.setAttribute('aria-hidden', !isPassenger ? 'true' : 'false');
    if (!isPassenger) closePriceModal();
  }
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
  dashboardTitle.textContent = `${state.currentUser.role} dashboard`;
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
  if (!timetableGroups) return;

  // Populate the driver dropdown with all registered Driver-role users
  const driverSelect = document.getElementById('driverName');
  if (driverSelect) {
    const drivers = getUsers().filter((u) => u.role === 'Driver');
    const currentVal = driverSelect.value;
    driverSelect.innerHTML = '<option value="">— Select a driver —</option>' +
      drivers.map((d) => `<option value="${d.username}">${d.displayName || d.username}</option>`).join('');
    if (currentVal) driverSelect.value = currentVal;
  }

  document.getElementById('totalSchedules').textContent = state.schedules.length;
  document.getElementById('totalDrivers').textContent = getUsers().filter((u) => u.role === 'Driver').length;
  document.getElementById('activeRoutes').textContent = state.schedules.filter((item) => item.status !== 'Departed').length;
  renderDriverAccountsList();

  const groupedSchedules = groupSchedulesByRoute(state.schedules);

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

function renderDriverPanel() {
  const driverTrips = document.getElementById('driverTrips');
  if (!driverTrips || state.currentUser?.role !== 'Driver') return;

  const currentUsername = String(state.currentUser.username || '').toLowerCase();
  const currentDisplayName = String(state.currentUser.displayName || state.currentUser.name || '').toLowerCase();

  const matchingTrips = state.schedules.filter((trip) => {
    // Primary match: by assigned username (set when admin assigns via dropdown)
    if (trip.assignedDriverUsername && trip.assignedDriverUsername.toLowerCase() === currentUsername) return true;
    // Fallback: by display name or username in the driverName field (legacy schedules)
    const tripDriver = String(trip.driverName || '').toLowerCase();
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
            <select id="status-${trip.id}" data-id="${trip.id}">
              <option value="On Time" ${trip.status === 'On Time' ? 'selected' : ''}>On Time</option>
              <option value="Delayed" ${trip.status === 'Delayed' ? 'selected' : ''}>Delayed</option>
              <option value="Departed" ${trip.status === 'Departed' ? 'selected' : ''}>Departed</option>
            </select>
          </div>
        </article>
      `
    )
    .join('');
}

function renderPassengerPanel() {
  const passengerTrips = document.getElementById('passengerTrips');
  if (!passengerTrips || state.currentUser?.role !== 'Passenger') return;

  const searchInput = document.getElementById('searchRoute').value.toLowerCase();
  const statusFilter = document.getElementById('statusFilter').value;

  const filteredTrips = state.schedules.filter((trip) => {
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

function normalizeContact(input) {
  const raw = String(input || '').trim();
  if (!raw) return '';
  // simple heuristic: treat values with @ as email (case-insensitive)
  if (raw.indexOf('@') >= 0) {
    return raw.toLowerCase();
  }

  // otherwise treat as phone-like: remove non-digits
  const digits = raw.replace(/\D+/g, '');
  return digits || raw;
}

function verifyUser(username, password, role) {
  const normalizedInput = normalizeContact(username);
  return getUsers().find((user) => {
    if (!user || user.password !== password) return false;
    if (role && user.role !== role) return false;

    const candidate = normalizeContact(user.username || user.contact || user.email || '');
    // accept either normalized match or exact username (case-insensitive)
    return (candidate && candidate === normalizedInput) || String(user.username || '').toLowerCase() === String(username || '').toLowerCase();
  });
}

function handleLogin(event) {
  event.preventDefault();
  const formData = new FormData(event.target);
  const username = String(formData.get('username') || '').trim();
  const password = String(formData.get('password') || '').trim();

  if (!username || !password) {
    setLoginError('Please enter both username and password.');
    return;
  }

  const verifiedUser = verifyUser(username, password);
  if (!verifiedUser) {
    setLoginError('Invalid username or password.');
    return;
  }

  if (verifiedUser.role === 'Passenger') {
    state.currentUser = { ...verifiedUser, name: verifiedUser.displayName };
    clearLoginError();
    saveState();
    render();
    return;
  }

  const otp = otpUtils.generateOtp(6);
  const pendingUser = { ...verifiedUser, name: verifiedUser.displayName };
  sessionStorage.setItem('pendingOtp', otp);
  sessionStorage.setItem('pendingUser', JSON.stringify(pendingUser));
  sessionStorage.setItem('pendingAction', 'login');
  window.location.href = 'otp.html';
}

function handleRegister(event) {
  event.preventDefault();
  const formData = new FormData(event.target);
  const displayName = String(formData.get('displayName') || '').trim();
  const username = String(formData.get('newUsername') || '').trim();
  const password = String(formData.get('newPassword') || '').trim();
  // Always force Passenger — users cannot self-register as Driver or Admin
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

  state.pendingOtp = otpUtils.generateOtp(6);
  state.pendingUser = { ...newUser, name: displayName };
  state.pendingAction = 'register';
  // store pending in session and redirect to OTP page
  const otp = otpUtils.generateOtp(6);
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

  if (!otpUtils.isValidOtp(enteredOtp, state.pendingOtp)) {
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
    setRegisterMessage(`Account verified for ${userToCreate.displayName}.`);
    clearOtpState();
    saveState();
    render();
    return;
  }

  state.currentUser = { ...state.pendingUser, name: state.pendingUser?.displayName || state.pendingUser?.name };
  setOtpMessage('OTP verified. Redirecting to your dashboard.');
  clearOtpState();
  saveState();
  render();
}

function handleResendOtp() {
  if (!state.pendingUser) {
    return;
  }

  // regenerate OTP and update sessionStorage so OTP page sees it
  const newOtp = otpUtils.generateOtp(6);
  state.pendingOtp = newOtp;
  sessionStorage.setItem('pendingOtp', newOtp);
  setOtpMessage(`A new OTP was generated: ${newOtp}`);
  saveState();
  render();
}

function handleScheduleSubmit(event) {
  event.preventDefault();
  const formData = new FormData(event.target);
  const assignedUsername = String(formData.get('driverName') || '').trim();
  const assignedUser = getUsers().find((u) => u.username === assignedUsername);
  const newSchedule = {
    id: editingScheduleId || Date.now(),
    route: String(formData.get('route') || '').trim(),
    routeNumber: String(formData.get('routeNumber') || '').trim(),
    busNumber: String(formData.get('busNumber') || '').trim(),
    driverName: assignedUser ? (assignedUser.displayName || assignedUser.username) : assignedUsername,
    assignedDriverUsername: assignedUsername,
    departureTime: String(formData.get('departureTime') || '').trim(),
    arrivalTime: String(formData.get('arrivalTime') || '').trim(),
    status: String(formData.get('status') || 'On Time'),
    type: String(formData.get('busType') || 'Normal'),
    priceBase: Number(formData.get('priceBase')) || 1200
  };

  if (!newSchedule.route || !newSchedule.routeNumber || !newSchedule.busNumber || !newSchedule.driverName || !newSchedule.departureTime || !newSchedule.arrivalTime) {
    return;
  }

  if (editingScheduleId) {
    state.schedules = state.schedules.map((item) => (item.id === editingScheduleId ? newSchedule : item));
  } else {
    state.schedules.unshift(newSchedule);
  }

  saveState();
  resetForm();
  render();
}

function handleAdminCreateDriver(event) {
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

  const newDriver = { username, password, role: 'Driver', displayName };
  state.users = [...getUsers(), newDriver];
  saveState();
  event.target.reset();
  setMsg(`Driver account created for ${displayName}. They can now log in.`);
  renderAdminPanel();
}

function renderDriverAccountsList() {
  const listEl = document.getElementById('driverAccountsList');
  if (!listEl) return;
  const drivers = getUsers().filter((u) => u.role === 'Driver');
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
            <td>${d.displayName || d.username}</td>
            <td>${d.username}</td>
            <td><button class="action-btn delete-btn" data-action="delete-driver" data-username="${d.username}">Remove</button></td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
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
  // only allow passengers to open the modal
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

function handlePassengerClick(event) {
  const el = event.target.closest('[data-action]');
  if (!el) return;
  const action = el.getAttribute('data-action');
  const id = el.getAttribute('data-id');
  if (action === 'price') {
    showPriceModal(id);
    return;
  }
  if (action === 'close') {
    closePriceModal();
    return;
  }
}

function handleTableClick(event) {
  const button = event.target.closest('button[data-action]');
  if (!button) return;

  const id = Number(button.getAttribute('data-id'));
  const action = button.getAttribute('data-action');

  if (action === 'delete') {
    state.schedules = state.schedules.filter((item) => item.id !== id);
    saveState();
    render();
    return;
  }

  if (action === 'edit') {
    const schedule = getScheduleById(id);
    if (!schedule) return;

    editingScheduleId = schedule.id;
    document.getElementById('route').value = schedule.route;
    document.getElementById('routeNumber').value = schedule.routeNumber || '';
    document.getElementById('busNumber').value = schedule.busNumber;
    // Set driver dropdown: prefer stored username, fallback to name match
    const driverSel = document.getElementById('driverName');
    if (driverSel) {
      driverSel.value = schedule.assignedDriverUsername || '';
      // If username not found in options, try matching display name
      if (!driverSel.value) {
        const matchOpt = Array.from(driverSel.options).find(
          (o) => o.text.toLowerCase() === String(schedule.driverName || '').toLowerCase()
        );
        if (matchOpt) driverSel.value = matchOpt.value;
      }
    }
    document.getElementById('departureTime').value = schedule.departureTime;
    document.getElementById('arrivalTime').value = schedule.arrivalTime;
    document.getElementById('status').value = schedule.status;
    document.getElementById('busType').value = schedule.type || 'Normal';
    document.getElementById('scheduleSubmitBtn').textContent = 'Update schedule';
  }
}

function handleDriverStatusChange(event) {
  const select = event.target.closest('select[data-id]');
  if (!select) return;

  const id = Number(select.getAttribute('data-id'));
  const schedule = getScheduleById(id);
  if (!schedule) return;

  schedule.status = select.value;
  saveState();
  render();
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
  const timetableGroups = document.getElementById('routeTimetableGroups');
  const driverTrips = document.getElementById('driverTrips');
  const passengerTrips = document.getElementById('passengerTrips');
  const searchRoute = document.getElementById('searchRoute');
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
  if (timetableGroups) timetableGroups.addEventListener('click', handleTableClick);
  const createDriverForm = document.getElementById('createDriverForm');
  if (createDriverForm) createDriverForm.addEventListener('submit', handleAdminCreateDriver);
  const driverAccountsList = document.getElementById('driverAccountsList');
  if (driverAccountsList) driverAccountsList.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action="delete-driver"]');
    if (!btn) return;
    const uname = btn.getAttribute('data-username');
    if (!uname || !confirm(`Remove driver account "${uname}"?`)) return;
    state.users = state.users.filter((u) => u.username !== uname);
    saveState();
    renderAdminPanel();
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
  if (statusFilter) statusFilter.addEventListener('change', renderPassengerPanel);
  if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);
  if (verifyOtpBtn) verifyOtpBtn.addEventListener('click', handleVerifyOtp);
  if (resendOtpBtn) resendOtpBtn.addEventListener('click', handleResendOtp);
  const priceModal = document.getElementById('priceModal');
  if (priceModal) priceModal.addEventListener('click', handlePassengerClick);
  // fallback: handle any data-action clicks anywhere on the page
  document.addEventListener('click', handlePassengerClick);
  // allow Escape key to close modal
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closePriceModal();
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
  // ensure modal is closed on startup
  closePriceModal();
  render();
});
