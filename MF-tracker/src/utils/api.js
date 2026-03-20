const BASE_URL = 'https://api.mfapi.in';

export async function searchFunds(query) {
  if (!query || query.trim().length < 2) return [];
  
  const response = await fetch(`${BASE_URL}/mf/search?q=${encodeURIComponent(query)}`);
  if (!response.ok) throw new Error('Failed to search funds');
  
  const data = await response.json();
  return data.slice(0, 10);
}

export async function getFundNAV(schemeCode) {
  const response = await fetch(`${BASE_URL}/mf/${schemeCode}`);
  if (!response.ok) throw new Error('Failed to fetch NAV data');
  
  const data = await response.json();
  return data;
}

export function calculateChanges(navHistory) {
  if (!navHistory || navHistory.length === 0) {
    return { latestNAV: 0, latestDate: '', weeklyChange: 0, monthlyChange: 0 };
  }

  const latest = navHistory[0];
  const latestNAV = parseFloat(latest.nav);
  const latestDate = latest.date;

  const weekAgoNAV = findNAVNearDays(navHistory, 7);
  const monthAgoNAV = findNAVNearDays(navHistory, 30);

  const weeklyChange = weekAgoNAV ? ((latestNAV - weekAgoNAV) / weekAgoNAV) * 100 : 0;
  const monthlyChange = monthAgoNAV ? ((latestNAV - monthAgoNAV) / monthAgoNAV) * 100 : 0;

  return {
    latestNAV,
    latestDate,
    weeklyChange: Math.round(weeklyChange * 100) / 100,
    monthlyChange: Math.round(monthlyChange * 100) / 100,
  };
}

function findNAVNearDays(navHistory, daysAgo) {
  const targetDate = new Date();
  targetDate.setDate(targetDate.getDate() - daysAgo);
  
  for (const entry of navHistory) {
    const [day, month, year] = entry.date.split('-');
    const entryDate = new Date(`${year}-${month}-${day}`);
    
    if (entryDate <= targetDate) {
      return parseFloat(entry.nav);
    }
  }
  
  if (navHistory.length > 1) {
    return parseFloat(navHistory[navHistory.length - 1].nav);
  }
  
  return null;
}

export function getChartData(navHistory, days) {
  if (!navHistory || navHistory.length === 0) return [];
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const targetDate = new Date(today);
  targetDate.setDate(targetDate.getDate() - days);
  
  const filteredData = [];
  
  for (const entry of navHistory) {
    const [day, month, year] = entry.date.split('-');
    const entryDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    
    if (entryDate >= targetDate) {
      filteredData.push({
        date: `${day}/${month}`,
        nav: parseFloat(entry.nav),
        fullDate: entry.date,
      });
    } else {
      break;
    }
  }
  
  return filteredData.reverse();
}
