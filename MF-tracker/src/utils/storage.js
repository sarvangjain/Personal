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

export function exportWatchlist() {
  const funds = loadFunds();
  const data = JSON.stringify(funds, null, 2);
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = `mf-watchlist-${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function importWatchlist(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const imported = JSON.parse(e.target.result);
        
        if (!Array.isArray(imported)) {
          reject(new Error('Invalid file format'));
          return;
        }
        
        const existingFunds = loadFunds();
        const existingCodes = new Set(existingFunds.map(f => f.schemeCode));
        
        const newFunds = imported.filter(f => 
          f.schemeCode && f.schemeName && !existingCodes.has(f.schemeCode)
        );
        
        const merged = [...existingFunds, ...newFunds];
        localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
        
        resolve({ added: newFunds.length, total: merged.length });
      } catch {
        reject(new Error('Failed to parse file'));
      }
    };
    
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}
