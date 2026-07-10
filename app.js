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
      status: 'On Time'
    },
    {
      id: 2,
      route: 'North Town - Market',
      routeNumber: '8C',
      busNumber: 'B-205',
      driverName: 'Sara',
      departureTime: '10:30',
      arrivalTime: '11:45',
      status: 'Delayed'
    },
    {
      id: 3,
      route: 'Hill View - City Center',
      routeNumber: '12A',
      busNumber: 'B-309',
      driverName: 'John',
      departureTime: '13:00',
      arrivalTime: '14:00',
      status: 'Departed'
    }
  ]
};

let state = loadState();
let editingScheduleId = null;

function isValidUser(user) {
  if (!user || typeof user !== 'object') {
    return false;
  }

  const users = state?.users || defaultState.users;
  const storedUsername = String(user.username || user.name || '').toLowerCase();

  return users.some((savedUser) => {
    return storedUsername === String(savedUser.username || '').toLowerCase() || savedUser.displayName === user.displayName || savedUser.displayName === user.name;
  });
}

function loadState() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) {
    return defaultState;
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

    if (!isValidUser(normalizedState.currentUser)) {
      normalizedState.currentUser = null;
    }

    return normalizedState;
  } catch (error) {
    console.error('Unable to load saved state.', error);
    return defaultState;
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

function render() {
  renderOtpSection();
  renderDashboard();
  renderAdminPanel();
  renderDriverPanel();
  renderPassengerPanel();
}

function getUserDisplayName(user) {
  return user?.displayName || user?.name || user?.username || 'User';
}

function renderDashboard() {
  const loginSection = document.getElementById('loginSection');
  const dashboardSection = document.getElementById('dashboardSection');
  const dashboardTitle = document.getElementById('dashboardTitle');
  const userRoleBadge = document.getElementById('userRoleBadge');
  const welcomeCard = document.getElementById('welcomeCard');

  if (!state.currentUser) {
    loginSection.classList.remove('hidden');
    dashboardSection.classList.add('hidden');
    return;
  }

  loginSection.classList.add('hidden');
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

  document.getElementById('totalSchedules').textContent = state.schedules.length;
  document.getElementById('totalDrivers').textContent = new Set(state.schedules.map((item) => item.driverName)).size;
  document.getElementById('activeRoutes').textContent = state.schedules.filter((item) => item.status !== 'Departed').length;

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

  const matchingTrips = state.schedules.filter((trip) => trip.driverName.toLowerCase() === state.currentUser.displayName.toLowerCase() || trip.driverName.toLowerCase() === state.currentUser.username.toLowerCase());

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
        <section class="route-group-card">
          <h4 class="route-group-title">Route ${routeKey}</h4>
          ${items
            .map(
              (trip) => `
                <article class="trip-card">
                  <h4>${trip.route}</h4>
                  <span class="route-chip">Route ${getRouteNumber(trip)}</span>
                  <p class="trip-meta">Bus ${trip.busNumber} • Driver ${trip.driverName}</p>
                  <p class="trip-meta">Departure ${trip.departureTime} • Arrival ${trip.arrivalTime}</p>
                  <span class="status-pill ${getStatusClass(trip.status)}">${trip.status}</span>
                </article>
              `
            )
            .join('')}
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

  // generate OTP and redirect to separate OTP page
  const otp = otpUtils.generateOtp(6);
  const pendingUser = { ...verifiedUser, name: verifiedUser.displayName };
  sessionStorage.setItem('pendingOtp', otp);
  sessionStorage.setItem('pendingUser', JSON.stringify(pendingUser));
  sessionStorage.setItem('pendingAction', 'login');
  // navigate to OTP page
  window.location.href = 'otp.html';
}

function handleRegister(event) {
  event.preventDefault();
  const formData = new FormData(event.target);
  const displayName = String(formData.get('displayName') || '').trim();
  const username = String(formData.get('newUsername') || '').trim();
  const password = String(formData.get('newPassword') || '').trim();
  const role = String(formData.get('newRole') || 'Passenger');

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
  const newSchedule = {
    id: editingScheduleId || Date.now(),
    route: String(formData.get('route') || '').trim(),
    routeNumber: String(formData.get('routeNumber') || '').trim(),
    busNumber: String(formData.get('busNumber') || '').trim(),
    driverName: String(formData.get('driverName') || '').trim(),
    departureTime: String(formData.get('departureTime') || '').trim(),
    arrivalTime: String(formData.get('arrivalTime') || '').trim(),
    status: String(formData.get('status') || 'On Time')
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
    document.getElementById('driverName').value = schedule.driverName;
    document.getElementById('departureTime').value = schedule.departureTime;
    document.getElementById('arrivalTime').value = schedule.arrivalTime;
    document.getElementById('status').value = schedule.status;
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
  render();
}

function attachEvents() {
  const loginForm = document.getElementById('loginForm');
  const registerForm = document.getElementById('registerForm');
  const scheduleForm = document.getElementById('scheduleForm');
  const timetableGroups = document.getElementById('routeTimetableGroups');
  const driverTrips = document.getElementById('driverTrips');
  const searchRoute = document.getElementById('searchRoute');
  const statusFilter = document.getElementById('statusFilter');
  const logoutBtn = document.getElementById('logoutBtn');
  const verifyOtpBtn = document.getElementById('verifyOtpBtn');
  const resendOtpBtn = document.getElementById('resendOtpBtn');
  const createAccountBtn = document.getElementById('createAccountBtn');
  const registerPanel = document.getElementById('registerPanel');

  if (loginForm) loginForm.addEventListener('submit', handleLogin);
  if (registerForm) registerForm.addEventListener('submit', handleRegister);
  if (scheduleForm) scheduleForm.addEventListener('submit', handleScheduleSubmit);
  if (timetableGroups) timetableGroups.addEventListener('click', handleTableClick);
  if (createAccountBtn && registerPanel) createAccountBtn.addEventListener('click', () => {
    registerPanel.classList.toggle('hidden');
    if (!registerPanel.classList.contains('hidden')) {
      document.getElementById('newUsername')?.focus();
    }
  });
  if (driverTrips) driverTrips.addEventListener('change', handleDriverStatusChange);
  if (searchRoute) searchRoute.addEventListener('input', renderPassengerPanel);
  if (statusFilter) statusFilter.addEventListener('change', renderPassengerPanel);
  if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);
  if (verifyOtpBtn) verifyOtpBtn.addEventListener('click', handleVerifyOtp);
  if (resendOtpBtn) resendOtpBtn.addEventListener('click', handleResendOtp);
}

window.addEventListener('DOMContentLoaded', () => {
  attachEvents();
  render();
});
