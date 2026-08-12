/**
 * Shared app-shell behaviour: route guarding, sidebar nav state,
 * mobile drawer toggle, logout, and the user chip / plan badge.
 */
import { getSession, logout } from './auth.js';

/**
 * Redirect to the login page if there is no active session.
 * Call at the top of every protected page.
 */
export function requireAuth() {
  const session = getSession();
  if (!session) {
    window.location.href = 'index.html';
    return null;
  }
  return session;
}

function initials(name) {
  if (!name) return '?';
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join('');
}

/**
 * Wire up the common shell chrome: active nav highlighting, mobile
 * drawer, user chip, plan badge, and the logout button.
 */
export function initShell(session, activePage) {
  document.querySelectorAll('[data-nav]').forEach((el) => {
    if (el.getAttribute('data-nav') === activePage) el.classList.add('active');
    else el.classList.remove('active');
  });

  const userNameEl = document.querySelector('[data-user-name]');
  const userAvatarEl = document.querySelector('[data-user-avatar]');
  const planNameEl = document.querySelector('[data-plan-name]');

  if (userNameEl) userNameEl.textContent = session.name;
  if (userAvatarEl) userAvatarEl.textContent = initials(session.name);
  if (planNameEl) planNameEl.textContent = session.plan;

  const logoutBtn = document.querySelector('[data-logout]');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      logout();
      window.location.href = 'index.html';
    });
  }

  const toggle = document.querySelector('[data-sidebar-toggle]');
  const sidebar = document.querySelector('.sidebar');
  const overlay = document.querySelector('[data-sidebar-overlay]');
  if (toggle && sidebar && overlay) {
    const closeSidebar = () => {
      sidebar.classList.remove('open');
      overlay.classList.remove('visible');
    };
    toggle.addEventListener('click', () => {
      sidebar.classList.toggle('open');
      overlay.classList.toggle('visible');
    });
    overlay.addEventListener('click', closeSidebar);
  }
}

export function showToast(message, timeout = 2600) {
  let toast = document.querySelector('.toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.classList.add('visible');
  window.clearTimeout(toast._timer);
  toast._timer = window.setTimeout(() => toast.classList.remove('visible'), timeout);
}
