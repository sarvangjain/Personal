import { getApiKey } from '../utils/config';

const BASE_URL = '/splitwise-api/v3.0';

function authHeaders() {
  return { 'Authorization': `Bearer ${getApiKey()}` };
}

async function fetchApi(endpoint, params = {}) {
  const queryString = Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join('&');

  const url = `${BASE_URL}${endpoint}${queryString ? '?' + queryString : ''}`;

  const response = await fetch(url, { headers: authHeaders() });

  if (response.status === 401 || response.status === 403) {
    throw new Error('Invalid API key. Please check your credentials.');
  }
  if (!response.ok) {
    throw new Error(`API Error: ${response.status} ${response.statusText}`);
  }
  return response.json();
}

async function postApi(endpoint, body = {}) {
  const formBody = new URLSearchParams();
  Object.entries(body).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== false) {
      formBody.append(key, value);
    }
  });

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    method: 'POST',
    headers: {
      ...authHeaders(),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: formBody.toString(),
  });

  if (response.status === 401 || response.status === 403) {
    throw new Error('Invalid API key. Please check your credentials.');
  }
  if (!response.ok) {
    throw new Error(`API Error: ${response.status} ${response.statusText}`);
  }
  return response.json();
}

// ── Read endpoints ──

export async function getCurrentUser() {
  const data = await fetchApi('/get_current_user');
  return data.user;
}

export async function getGroups() {
  const data = await fetchApi('/get_groups');
  return data.groups || [];
}

export async function getGroup(id) {
  const data = await fetchApi(`/get_group/${id}`);
  return data.group;
}

export async function getFriends() {
  const data = await fetchApi('/get_friends');
  return data.friends || [];
}

export async function getExpenses({ groupId, friendId, limit = 100, offset = 0, datedAfter, datedBefore } = {}) {
  const params = { limit, offset };
  if (groupId) params.group_id = groupId;
  if (friendId) params.friend_id = friendId;
  if (datedAfter) params.dated_after = datedAfter;
  if (datedBefore) params.dated_before = datedBefore;

  const data = await fetchApi('/get_expenses', params);
  return data.expenses || [];
}

export async function getAllExpensesForGroup(groupId) {
  let allExpenses = [];
  let offset = 0;
  const limit = 100;
  let hasMore = true;

  while (hasMore) {
    const expenses = await getExpenses({ groupId, limit, offset });
    allExpenses = [...allExpenses, ...expenses];
    hasMore = expenses.length >= limit;
    offset += limit;
    // Safety limit to prevent infinite loops
    if (offset > 5000) break;
  }
  return allExpenses.filter(e => !e.deleted_at && !e.payment);
}

export async function getExpensesForFriend(friendId) {
  let allExpenses = [];
  let offset = 0;
  const limit = 100;
  let hasMore = true;

  while (hasMore) {
    const expenses = await getExpenses({ friendId, limit, offset });
    allExpenses = [...allExpenses, ...expenses];
    hasMore = expenses.length >= limit;
    offset += limit;
    // Safety limit to prevent infinite loops
    if (offset > 5000) break;
  }
  return allExpenses.filter(e => !e.deleted_at && !e.payment);
}

export async function getCategories() {
  const data = await fetchApi('/get_categories');
  return data.categories || [];
}

// ── Write endpoints ──

export async function createExpenseEqualSplit({ groupId, cost, description, currencyCode = 'INR', date, details, categoryId }) {
  const body = {
    cost: String(cost), description, group_id: groupId,
    currency_code: currencyCode, split_equally: true,
  };
  if (date) body.date = date;
  if (details) body.details = details;
  if (categoryId) body.category_id = categoryId;

  const data = await postApi('/create_expense', body);
  if (data.errors && Object.keys(data.errors).length > 0) {
    throw new Error(Object.values(data.errors).flat().join(', '));
  }
  return data.expenses?.[0] || data;
}

export async function createExpenseCustomSplit({ cost, description, currencyCode = 'INR', date, details, categoryId, groupId, users }) {
  const body = {
    cost: String(cost), description,
    currency_code: currencyCode, payment: false,
  };
  if (groupId) body.group_id = groupId;
  if (date) body.date = date;
  if (details) body.details = details;
  if (categoryId) body.category_id = categoryId;

  users.forEach((u, i) => {
    body[`users__${i}__user_id`] = u.userId;
    body[`users__${i}__paid_share`] = String(u.paidShare);
    body[`users__${i}__owed_share`] = String(u.owedShare);
  });

  const data = await postApi('/create_expense', body);
  if (data.errors && Object.keys(data.errors).length > 0) {
    throw new Error(Object.values(data.errors).flat().join(', '));
  }
  return data.expenses?.[0] || data;
}
