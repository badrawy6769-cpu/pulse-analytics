/**
 * Client-side auth for the MVP demo.
 *
 * IMPORTANT: This is a static, backend-less demo. Credentials are hashed
 * (not encrypted) and stored in localStorage purely to let a reviewer sign
 * up and log back in within the same browser. This module MUST be replaced
 * by a real server-side auth provider (e.g. OAuth/JWT via a backend) before
 * handling any real user data in production.
 */
import { hashString, isValidEmail, isValidPassword, generateId } from './utils.js';

const USERS_KEY = 'subanalytics_users_v1';
const SESSION_KEY = 'subanalytics_session_v1';
const DEMO_EMAIL = 'demo@subanalytics.io';
const DEMO_PASSWORD = 'Demo1234';

function readUsers() {
  try {
    const raw = localStorage.getItem(USERS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeUsers(users) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function ensureDemoUser() {
  const users = readUsers();
  if (!users.some((u) => u.email === DEMO_EMAIL)) {
    users.push({
      id: generateId('user'),
      name: 'Demo Admin',
      email: DEMO_EMAIL,
      passwordHash: hashString(DEMO_PASSWORD),
      plan: 'growth',
      createdAt: new Date().toISOString(),
    });
    writeUsers(users);
  }
}

export class AuthError extends Error {}

/**
 * Register a new user. Throws AuthError with a user-facing message on
 * validation failure or duplicate email.
 */
export function signup({ name, email, password }) {
  const cleanName = (name || '').trim();
  const cleanEmail = (email || '').trim().toLowerCase();

  if (!cleanName) throw new AuthError('Please enter your name.');
  if (!isValidEmail(cleanEmail)) throw new AuthError('Please enter a valid email address.');
  if (!isValidPassword(password)) {
    throw new AuthError('Password must be at least 8 characters and include a letter and a number.');
  }

  const users = readUsers();
  if (users.some((u) => u.email === cleanEmail)) {
    throw new AuthError('An account with that email already exists.');
  }

  const user = {
    id: generateId('user'),
    name: cleanName,
    email: cleanEmail,
    passwordHash: hashString(password),
    plan: 'starter',
    createdAt: new Date().toISOString(),
  };
  users.push(user);
  writeUsers(users);

  return createSession(user);
}

/**
 * Log in an existing user. Throws AuthError on invalid credentials.
 */
export function login({ email, password }) {
  ensureDemoUser();
  const cleanEmail = (email || '').trim().toLowerCase();
  const users = readUsers();
  const user = users.find((u) => u.email === cleanEmail);

  if (!user || user.passwordHash !== hashString(password || '')) {
    throw new AuthError('Invalid email or password.');
  }
  return createSession(user);
}

function createSession(user) {
  const session = {
    userId: user.id,
    name: user.name,
    email: user.email,
    plan: user.plan,
    issuedAt: new Date().toISOString(),
  };
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
  return session;
}

export function getSession() {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function isAuthenticated() {
  return getSession() !== null;
}

export function logout() {
  sessionStorage.removeItem(SESSION_KEY);
}

/**
 * Persist a plan upgrade for the currently logged-in user, updating both
 * the users store and the active session.
 */
export function upgradePlan(planId) {
  const session = getSession();
  if (!session) throw new AuthError('You must be logged in to change plans.');

  const users = readUsers();
  const user = users.find((u) => u.id === session.userId);
  if (!user) throw new AuthError('Account not found.');

  user.plan = planId;
  writeUsers(users);

  const updatedSession = { ...session, plan: planId };
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(updatedSession));
  return updatedSession;
}

export function getDemoCredentials() {
  return { email: DEMO_EMAIL, password: DEMO_PASSWORD };
}

// Ensure the demo account exists as soon as this module loads in a browser.
if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
  ensureDemoUser();
}
