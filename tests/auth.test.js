import { describe, it, expect, beforeEach } from 'vitest';
import { signup, login, logout, getSession, isAuthenticated, upgradePlan, AuthError, getDemoCredentials } from '../js/auth.js';

// jsdom provides localStorage/sessionStorage; reset between tests so each
// test starts from a clean slate (auth.js also re-seeds the demo user).
beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
});

describe('signup', () => {
  it('creates a new account and returns an active session', () => {
    const session = signup({ name: 'Jane Doe', email: 'jane@example.com', password: 'abc12345' });
    expect(session.email).toBe('jane@example.com');
    expect(session.name).toBe('Jane Doe');
    expect(session.plan).toBe('starter');
    expect(isAuthenticated()).toBe(true);
  });

  it('rejects a duplicate email', () => {
    signup({ name: 'Jane Doe', email: 'jane@example.com', password: 'abc12345' });
    logout();
    expect(() => signup({ name: 'Jane 2', email: 'jane@example.com', password: 'abc12345' })).toThrow(AuthError);
  });

  it('rejects an invalid email format', () => {
    expect(() => signup({ name: 'Jane', email: 'not-an-email', password: 'abc12345' })).toThrow(AuthError);
  });

  it('rejects a weak password', () => {
    expect(() => signup({ name: 'Jane', email: 'jane2@example.com', password: 'weak' })).toThrow(AuthError);
  });

  it('rejects an empty name', () => {
    expect(() => signup({ name: '  ', email: 'jane3@example.com', password: 'abc12345' })).toThrow(AuthError);
  });

  it('does not store the plaintext password', () => {
    signup({ name: 'Jane', email: 'jane4@example.com', password: 'abc12345' });
    const raw = localStorage.getItem('subanalytics_users_v1');
    expect(raw).not.toContain('abc12345');
  });
});

describe('login', () => {
  it('logs in with the seeded demo credentials', () => {
    const { email, password } = getDemoCredentials();
    const session = login({ email, password });
    expect(session.email).toBe(email);
    expect(isAuthenticated()).toBe(true);
  });

  it('rejects an unknown email', () => {
    expect(() => login({ email: 'nobody@example.com', password: 'whatever1' })).toThrow(AuthError);
  });

  it('rejects an incorrect password', () => {
    const { email } = getDemoCredentials();
    expect(() => login({ email, password: 'WrongPass1' })).toThrow(AuthError);
  });

  it('is case-insensitive on email', () => {
    const { email, password } = getDemoCredentials();
    const session = login({ email: email.toUpperCase(), password });
    expect(session.email).toBe(email);
  });
});

describe('logout', () => {
  it('clears the active session', () => {
    const { email, password } = getDemoCredentials();
    login({ email, password });
    expect(isAuthenticated()).toBe(true);
    logout();
    expect(isAuthenticated()).toBe(false);
    expect(getSession()).toBeNull();
  });
});

describe('upgradePlan', () => {
  it('updates the plan on the active session and persists it', () => {
    const { email, password } = getDemoCredentials();
    login({ email, password });
    const updated = upgradePlan('scale');
    expect(updated.plan).toBe('scale');
    expect(getSession().plan).toBe('scale');
  });

  it('throws when there is no active session', () => {
    logout();
    expect(() => upgradePlan('scale')).toThrow(AuthError);
  });
});
