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

function isAllowedRolePage(role, page) {
  if (role === 'Admin') {
    return ['admin.html', 'admin-drivers.html', 'admin-schedules.html'].includes(page);
  }
  return page === getRolePage(role);
}

function setPortalMessage(message, isError = false) {
  const messageBox = document.getElementById('portalMessage');
  if (!messageBox) return;
  messageBox.textContent = message;
  messageBox.style.color = isError ? 'var(--danger)' : 'var(--admin)';
}

async function handlePortalLogin(event) {
  event.preventDefault();
  const formData = new FormData(event.target);
  const username = String(formData.get('portalUsername') || '').trim();
  const password = String(formData.get('portalPassword') || '').trim();

  if (!username || !password) {
    setPortalMessage('Please enter both username and password.', true);
    return;
  }

  try {
    const response = await fetch('/api/users/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || 'Invalid username or password.');
    }

    const verifiedUser = result.user;
    const otp = typeof otpUtils !== 'undefined'
      ? otpUtils.generateOtp(6)
      : String(Math.floor(100000 + Math.random() * 900000));
    sessionStorage.setItem('pendingOtp', otp);
    sessionStorage.setItem('pendingUser', JSON.stringify({
      ...verifiedUser,
      name: verifiedUser.displayName || verifiedUser.username
    }));
    sessionStorage.setItem('pendingAction', 'login');
    window.location.href = 'otp.html';
  } catch (error) {
    setPortalMessage(error.message || 'Unable to connect to the server.', true);
  }
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
    if (portalState.currentUser) window.location.replace(allowedPage);
    return;
  }

  if (!portalState.currentUser) {
    window.location.replace('index.html');
    return;
  }

  if (!isAllowedRolePage(portalState.currentUser.role, currentPage)) window.location.replace(allowedPage);
}

let portalState = loadPortalState();

document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('portalLoginForm');
  const logoutBtn = document.getElementById('logoutBtn') || document.getElementById('portalLogoutBtn');

  if (loginForm) loginForm.addEventListener('submit', handlePortalLogin);
  if (logoutBtn) logoutBtn.addEventListener('click', handlePortalLogout);
  enforcePortalAccess();
});
