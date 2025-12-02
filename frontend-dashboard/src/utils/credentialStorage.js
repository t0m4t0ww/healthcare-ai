const STORAGE_KEY = 'hc_auth_credentials';

const isBrowser = () => typeof window !== 'undefined' && !!window.localStorage;

const readStorage = () => {
  if (!isBrowser()) return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (error) {
    console.warn('[credentialStorage] Unable to read credentials:', error);
    return {};
  }
};

const writeStorage = (data) => {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.warn('[credentialStorage] Unable to persist credentials:', error);
  }
};

export const loadCredentials = (role) => {
  if (!role) return null;
  const all = readStorage();
  return all[role] || null;
};

export const saveCredentials = (role, email, password) => {
  if (!role || !email || !password) return;
  const all = readStorage();
  all[role] = { email, password };
  writeStorage(all);
};

export const clearCredentials = (role) => {
  if (!role) return;
  const all = readStorage();
  if (all[role]) {
    delete all[role];
    writeStorage(all);
  }
};

