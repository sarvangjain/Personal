const STORAGE_KEY = 'splitsight_config';

const defaults = {
  apiKey: '',
  userId: 0,
  userName: '',
};

export function getConfig() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed.apiKey) return null;
    return { ...defaults, ...parsed };
  } catch {
    return null;
  }
}

export function saveConfig({ apiKey, userId, userName }) {
  const config = { apiKey, userId: parseInt(userId) || 0, userName: userName || '' };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  return config;
}

export function clearConfig() {
  localStorage.removeItem(STORAGE_KEY);
}

export function isLoggedIn() {
  return getConfig() !== null;
}

export function getApiKey() {
  return getConfig()?.apiKey || '';
}

export function getUserId() {
  return getConfig()?.userId || 0;
}
