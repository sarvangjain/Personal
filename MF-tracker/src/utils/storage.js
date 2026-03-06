const STORAGE_KEY = 'mf-tracker-funds';

export function loadFunds() {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function saveFund(fund) {
  const funds = loadFunds();
  const exists = funds.some(f => f.schemeCode === fund.schemeCode);
  
  if (!exists) {
    funds.push(fund);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(funds));
  }
  
  return funds;
}

export function removeFund(schemeCode) {
  const funds = loadFunds();
  const filtered = funds.filter(f => f.schemeCode !== schemeCode);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  return filtered;
}
