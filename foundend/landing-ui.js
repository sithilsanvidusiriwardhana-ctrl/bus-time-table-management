const themeStorageKey = 'bus-time-table-theme';
const themeToggle = document.getElementById('themeToggle');
const themeToggleLabel = document.getElementById('themeToggleLabel');
const loginDialog = document.getElementById('loginDialog');
const loginForm = document.getElementById('loginForm');
const loginError = document.getElementById('loginError');
const roleChoices = [...document.querySelectorAll('[data-role-choice]')];

function setPortalRole(role) {
  if (!loginForm) return;
  loginForm.dataset.portalRole = role;
  roleChoices.forEach((choice) => {
    const selected = choice.dataset.roleChoice === role;
    choice.setAttribute('aria-pressed', String(selected));
  });
  if (loginError) loginError.textContent = '';
}

function openLogin(role = '') {
  if (!loginDialog?.showModal) return;
  if (role) setPortalRole(role);
  loginDialog.showModal();
  requestAnimationFrame(() => document.getElementById('username')?.focus());
}

document.querySelectorAll('[data-open-login]').forEach((trigger) => {
  trigger.addEventListener('click', () => openLogin(trigger.dataset.openLogin || ''));
});

document.getElementById('heroScene')?.addEventListener('click', () => openLogin());

document.querySelectorAll('[data-close-login]').forEach((trigger) => {
  trigger.addEventListener('click', () => loginDialog?.close());
});

loginDialog?.addEventListener('click', (event) => {
  if (event.target === loginDialog) loginDialog.close();
});

roleChoices.forEach((choice) => {
  choice.addEventListener('click', () => setPortalRole(choice.dataset.roleChoice));
});

function applyTheme(theme) {
  const isDark = theme === 'dark';
  document.body.dataset.theme = theme;
  themeToggle?.setAttribute('aria-checked', String(isDark));
  themeToggle?.setAttribute('aria-label', `Switch to ${isDark ? 'light' : 'dark'} mode`);
  if (themeToggleLabel) themeToggleLabel.textContent = isDark ? 'Dark mode' : 'Light mode';
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', isDark ? '#0a1012' : '#eef3ef');
}

const savedTheme = localStorage.getItem(themeStorageKey);
applyTheme(savedTheme === 'light' ? 'light' : 'dark');

themeToggle?.addEventListener('click', () => {
  const nextTheme = document.body.dataset.theme === 'dark' ? 'light' : 'dark';
  localStorage.setItem(themeStorageKey, nextTheme);
  applyTheme(nextTheme);
});

const scrollAccentFill = document.getElementById('scrollAccentFill');
const scrollAccentDot = document.getElementById('scrollAccentDot');
let scrollFrame = 0;

function updateScrollAccent() {
  scrollFrame = 0;
  const scrollableHeight = document.documentElement.scrollHeight - window.innerHeight;
  const progress = scrollableHeight > 0 ? window.scrollY / scrollableHeight : 0;
  if (scrollAccentFill) scrollAccentFill.style.height = `${progress * 100}%`;
  if (scrollAccentDot) scrollAccentDot.style.top = `calc(15vh + ${progress * 70}vh)`;
}

window.addEventListener('scroll', () => {
  if (!scrollFrame) scrollFrame = requestAnimationFrame(updateScrollAccent);
}, { passive: true });
window.addEventListener('resize', updateScrollAccent);
updateScrollAccent();