// In dev, requests go to /splitwise-api/v3.0/... which Vite proxies to https://secure.splitwise.com/api/v3.0/...
// This avoids CORS issues since the browser sees same-origin requests.
const BASE_URL = '/splitwise-api/v3.0';
const API_KEY = import.meta.env.VITE_SPLITWISE_API_KEY || '';

async function fetchApi(endpoint, params = {}) {
  const queryString = Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join('&');

  const url = `${BASE_URL}${endpoint}${queryString ? '?' + queryString : ''}`;

  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
    },
  });

  if (!response.ok) {
    throw new Error(`API Error: ${response.status} ${response.statusText}`);
  }
  return response.json();
}

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

export async function getExpenses({ groupId, limit = 100, offset = 0, datedAfter, datedBefore } = {}) {
  const params = {
    visible: true,
    order: 'date',
    limit,
    offset,
  };
  if (groupId) params.group_id = groupId;
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
    if (expenses.length < limit) {
      hasMore = false;
    } else {
      offset += limit;
    }
  }
  return allExpenses.filter(e => !e.deleted_at && !e.payment);
}

export async function getCategories() {
  const data = await fetchApi('/get_categories');
  return data.categories || [];
}
