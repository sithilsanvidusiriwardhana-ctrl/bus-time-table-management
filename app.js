const STORAGE_KEY = 'bus-time-table-management-state';

const verifiedUsers = [
  { username: 'admin', password: 'admin123', role: 'Admin', displayName: 'Administrator' },
  { username: 'driver', password: 'driver123', role: 'Driver', displayName: 'Bus Driver' },
  { username: 'passenger', password: 'passenger123', role: 'Passenger', displayName: 'Passenger' }
];

const defaultState = {
  currentUser: null,
  users: verifiedUsers.map((user) => ({ ...user })),
  schedules: [
    {
      id: 1,
      route: 'Central - Airport',
      busNumber: 'B-101',
      driverName: 'John',
      departureTime: '08:00',
      arrivalTime: '09:15',
      status: 'On Time'
    },
    {
      id: 2,
      route: 'North Town - Market',
      busNumber: 'B-205',
      driverName: 'Sara',
      departureTime: '10:30',
      arrivalTime: '11:45',
      status: 'Delayed'
    },
    {
      id: 3,
      route: 'Hill View - City Center',
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

function render() {
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
  const tableBody = document.getElementById('scheduleTableBody');
  if (!tableBody) return;

  document.getElementById('totalSchedules').textContent = state.schedules.length;
  document.getElementById('totalDrivers').textContent = new Set(state.schedules.map((item) => item.driverName)).size;
  document.getElementById('activeRoutes').textContent = state.schedules.filter((item) => item.status !== 'Departed').length;

  tableBody.innerHTML = '';

  state.schedules.forEach((schedule) => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${schedule.route}</td>
      <td>${schedule.busNumber}</td>
      <td>${schedule.driverName}</td>
      <td>${schedule.departureTime}</td>
      <td>${schedule.arrivalTime}</td>
      <td><span class="status-pill ${getStatusClass(schedule.status)}">${schedule.status}</span></td>
      <td>
        <button class="action-btn edit-btn" data-action="edit" data-id="${schedule.id}">Edit</button>
        <button class="action-btn delete-btn" data-action="delete" data-id="${schedule.id}">Delete</button>
      </td>
    `;
    tableBody.appendChild(row);
  });
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
    const matchesSearch = trip.route.toLowerCase().includes(searchInput);
    const matchesStatus = statusFilter === 'All' || trip.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (!filteredTrips.length) {
    passengerTrips.innerHTML = '<p>No buses match your filters.</p>';
    return;
  }

  passengerTrips.innerHTML = filteredTrips
    .map(
      (trip) => `
        <article class="trip-card">
          <h4>${trip.route}</h4>
          <p class="trip-meta">Bus ${trip.busNumber} • Driver ${trip.driverName}</p>
          <p class="trip-meta">Departure ${trip.departureTime} • Arrival ${trip.arrivalTime}</p>
          <span class="status-pill ${getStatusClass(trip.status)}">${trip.status}</span>
        </article>
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

function verifyUser(username, password, role) {
  return getUsers().find((user) => user.username === username.toLowerCase() && user.password === password && user.role === role);
}

function handleLogin(event) {
  event.preventDefault();
  const formData = new FormData(event.target);
  const username = String(formData.get('username') || '').trim();
  const password = String(formData.get('password') || '').trim();
  const role = String(formData.get('role') || 'Passenger');

  if (!username || !password) {
    setLoginError('Please enter both username and password.');
    return;
  }

  const verifiedUser = verifyUser(username, password, role);
  if (!verifiedUser) {
    setLoginError('Invalid username, password, or role.');
    return;
  }

  state.currentUser = { ...verifiedUser, name: verifiedUser.displayName };
  clearLoginError();
  saveState();
  render();
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

  state.users = [...getUsers(), newUser];
  state.currentUser = { ...newUser, name: displayName };
  setRegisterMessage(`Account created for ${displayName}.`);
  saveState();
  render();
}

function handleScheduleSubmit(event) {
  event.preventDefault();
  const formData = new FormData(event.target);
  const newSchedule = {
    id: editingScheduleId || Date.now(),
    route: String(formData.get('route') || '').trim(),
    busNumber: String(formData.get('busNumber') || '').trim(),
    driverName: String(formData.get('driverName') || '').trim(),
    departureTime: String(formData.get('departureTime') || '').trim(),
    arrivalTime: String(formData.get('arrivalTime') || '').trim(),
    status: String(formData.get('status') || 'On Time')
  };

  if (!newSchedule.route || !newSchedule.busNumber || !newSchedule.driverName || !newSchedule.departureTime || !newSchedule.arrivalTime) {
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
  saveState();
  resetForm();
  render();
}

function attachEvents() {
  const loginForm = document.getElementById('loginForm');
  const registerForm = document.getElementById('registerForm');
  const scheduleForm = document.getElementById('scheduleForm');
  const scheduleTableBody = document.getElementById('scheduleTableBody');
  const driverTrips = document.getElementById('driverTrips');
  const searchRoute = document.getElementById('searchRoute');
  const statusFilter = document.getElementById('statusFilter');
  const logoutBtn = document.getElementById('logoutBtn');

  if (loginForm) loginForm.addEventListener('submit', handleLogin);
  if (registerForm) registerForm.addEventListener('submit', handleRegister);
  if (scheduleForm) scheduleForm.addEventListener('submit', handleScheduleSubmit);
  if (scheduleTableBody) scheduleTableBody.addEventListener('click', handleTableClick);
  if (driverTrips) driverTrips.addEventListener('change', handleDriverStatusChange);
  if (searchRoute) searchRoute.addEventListener('input', renderPassengerPanel);
  if (statusFilter) statusFilter.addEventListener('change', renderPassengerPanel);
  if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);
}

window.addEventListener('DOMContentLoaded', () => {
  attachEvents();
  render();
});
