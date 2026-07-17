const PORTAL_STORAGE_KEY = 'bus-time-table-management-state';

const portalDemoUsers = [
  { username: 'admin', password: 'admin123', role: 'Admin', displayName: 'Administrator' },
  { username: 'driver', password: 'driver123', role: 'Driver', displayName: 'Bus Driver' },
  { username: 'passenger', password: 'passenger123', role: 'Passenger', displayName: 'Passenger' }
];

function loadPortalState() {
  const stored = localStorage.getItem(PORTAL_STORAGE_KEY);
  if (!stored) {
    return { currentUser: null, users: portalDemoUsers.map((user) => ({ ...user })) };
  }

  try {
    const parsed = JSON.parse(stored);
    return {
      ...parsed,
      currentUser: parsed?.currentUser || null,
      users: Array.isArray(parsed?.users) && parsed.users.length
        ? parsed.users
        : portalDemoUsers.map((user) => ({ ...user }))
    };
  } catch (error) {
    console.error('Unable to read portal state.', error);
    return { currentUser: null, users: portalDemoUsers.map((user) => ({ ...user })) };
  }
}

function savePortalState(state) {
  localStorage.setItem(PORTAL_STORAGE_KEY, JSON.stringify(state));
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

function setPortalMessage(message, isError = false) {
  const messageBox = document.getElementById('portalMessage');
  if (!messageBox) {
    return;
  }

  messageBox.textContent = message;
  messageBox.style.color = isError ? 'var(--danger)' : 'var(--admin)';
}

function verifyPortalUser(username, password, state) {
  const normalizedUsername = String(username || '').trim().toLowerCase();
  return state.users.find((user) => {
    if (!user || String(user.password || '') !== String(password || '')) {
      return false;
    }

    return String(user.username || '').toLowerCase() === normalizedUsername;
  });
}

function handlePortalLogin(event) {
  event.preventDefault();
  const formData = new FormData(event.target);
  const username = String(formData.get('portalUsername') || '').trim();
  const password = String(formData.get('portalPassword') || '').trim();

  if (!username || !password) {
    setPortalMessage('Please enter both username and password.', true);
    return;
  }

  const verifiedUser = verifyPortalUser(username, password, portalState);
  if (!verifiedUser) {
    setPortalMessage('Invalid username or password.', true);
    return;
  }

  portalState.currentUser = { ...verifiedUser, name: verifiedUser.displayName || verifiedUser.username };
  savePortalState(portalState);
  setPortalMessage(`Welcome, ${portalState.currentUser.displayName || portalState.currentUser.username}!`);
  window.location.href = getRolePage(portalState.currentUser.role);
}

function handlePortalLogout() {
  portalState.currentUser = null;
  savePortalState(portalState);
  window.location.href = 'index.html';
}

function enforcePortalAccess() {
  const currentPage = window.location.pathname.split('/').pop() || 'index.html';
  const allowedPage = portalState.currentUser ? getRolePage(portalState.currentUser.role) : 'index.html';

  if (currentPage === 'index.html') {
    if (portalState.currentUser) {
      window.location.replace(allowedPage);
    }
    return;
  }

  if (!portalState.currentUser) {
    window.location.replace('index.html');
    return;
  }

  if (currentPage !== allowedPage) {
    window.location.replace(allowedPage);
  }
}

let portalState = loadPortalState();

document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('portalLoginForm');
  const logoutBtn = document.getElementById('portalLogoutBtn');

  if (loginForm) {
    loginForm.addEventListener('submit', handlePortalLogin);
  }

  if (logoutBtn) {
    logoutBtn.addEventListener('click', handlePortalLogout);
  }

  enforcePortalAccess();
});
