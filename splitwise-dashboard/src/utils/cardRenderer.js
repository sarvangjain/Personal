/**
 * Canvas 2D renderer for Year-in-Review shareable cards.
 *
 * Draws directly onto a &lt;canvas&gt; element — no DOM-to-image conversion,
 * no html2canvas, no CSS parsing. 100% reliable across all browsers.
 *
 * All cards render at 1080×1920 (3× of 360×640) for crisp Instagram-story output.
 */

const W = 1080;
const H = 1920;
const S = 3; // scale factor (design coords are 360×640)

// ─── Font Loading ───────────────────────────────────────────────────────────

let fontsReady = false;

export async function ensureFonts() {
  if (fontsReady) return;
  try {
    await document.fonts.ready;
    // Try to ensure our specific fonts are loaded
    await Promise.allSettled([
      document.fonts.load('700 48px "Plus Jakarta Sans"'),
      document.fonts.load('400 36px "Plus Jakarta Sans"'),
      document.fonts.load('500 30px "Plus Jakarta Sans"'),
    ]);
    fontsReady = true;
  } catch {
    fontsReady = true; // proceed anyway
  }
}

// ─── Primitives ─────────────────────────────────────────────────────────────

function roundRect(ctx, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function fillRoundRect(ctx, x, y, w, h, r, fill) {
  roundRect(ctx, x, y, w, h, r);
  ctx.fillStyle = fill;
  ctx.fill();
}

function strokeRoundRect(ctx, x, y, w, h, r, stroke, lineWidth = 1) {
  roundRect(ctx, x, y, w, h, r);
  ctx.strokeStyle = stroke;
  ctx.lineWidth = lineWidth;
  ctx.stroke();
}

function drawGlowBlob(ctx, cx, cy, radius, color) {
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
  g.addColorStop(0, color);
  g.addColorStop(1, 'transparent');
  ctx.fillStyle = g;
  ctx.fillRect(cx - radius, cy - radius, radius * 2, radius * 2);
}

function drawText(ctx, text, x, y, {
  font = '400 36px "Plus Jakarta Sans", system-ui, sans-serif',
  fill = '#fff',
  align = 'left',
  baseline = 'top',
  maxWidth,
} = {}) {
  ctx.font = font;
  ctx.fillStyle = fill;
  ctx.textAlign = align;
  ctx.textBaseline = baseline;
  if (maxWidth) {
    ctx.fillText(text, x, y, maxWidth);
  } else {
    ctx.fillText(text, x, y);
  }
}

function drawGradientRect(ctx, x, y, w, h, r, colors, direction = 'vertical') {
  roundRect(ctx, x, y, w, h, r);
  let g;
  if (direction === 'vertical') {
    g = ctx.createLinearGradient(x, y, x, y + h);
  } else {
    g = ctx.createLinearGradient(x, y, x + w, y);
  }
  colors.forEach(([stop, color]) => g.addColorStop(stop, color));
  ctx.fillStyle = g;
  ctx.fill();
}

function drawCircle(ctx, cx, cy, r, fill) {
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = fill;
  ctx.fill();
}

function drawGradientCircle(ctx, cx, cy, r, colors) {
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  const g = ctx.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
  colors.forEach(([stop, color]) => g.addColorStop(stop, color));
  ctx.fillStyle = g;
  ctx.fill();
}

function truncateText(ctx, text, maxW) {
  if (ctx.measureText(text).width <= maxW) return text;
  let t = text;
  while (t.length > 0 && ctx.measureText(t + '…').width > maxW) t = t.slice(0, -1);
  return t + '…';
}

// ─── Card Background ────────────────────────────────────────────────────────

function drawCardBg(ctx, blobs = []) {
  // Base gradient
  const g = ctx.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, '#0c0a09');
  g.addColorStop(0.5, '#1c1917');
  g.addColorStop(1, '#0c0a09');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  // Glow blobs
  blobs.forEach(({ x, y, r, color }) => drawGlowBlob(ctx, x, y, r, color));
}

function drawCardSection(ctx, x, y, w, h, r = 36) {
  fillRoundRect(ctx, x, y, w, h, r, 'rgba(28, 25, 23, 0.6)');
  strokeRoundRect(ctx, x, y, w, h, r, 'rgba(120, 113, 108, 0.15)', 2);
}

function drawFooter(ctx) {
  // Divider
  ctx.strokeStyle = 'rgba(120, 113, 108, 0.15)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(60, H - 135);
  ctx.lineTo(W - 60, H - 135);
  ctx.stroke();

  // Icon
  drawGradientCircle(ctx, W / 2 - 75, H - 90, 24, [[0, '#10b981'], [1, '#14b8a6']]);
  drawText(ctx, '✨', W / 2 - 75, H - 90, { font: '400 22px sans-serif', fill: '#fff', align: 'center', baseline: 'middle' });

  drawText(ctx, 'SplitSight Year in Review', W / 2 - 40, H - 90, {
    font: '400 27px "Plus Jakarta Sans", system-ui, sans-serif',
    fill: '#57534e',
    align: 'left',
    baseline: 'middle',
  });
}

// ─── Formatters ─────────────────────────────────────────────────────────────

function fmt(amount) {
  if (Math.abs(amount) >= 100000) return `₹${(amount / 100000).toFixed(1)}L`;
  if (Math.abs(amount) >= 1000) return `₹${(amount / 1000).toFixed(1)}K`;
  return `₹${Math.round(amount).toLocaleString('en-IN')}`;
}

// ─── SUMMARY CARD ───────────────────────────────────────────────────────────

function drawSummaryCard(ctx, data, year, userName) {
  drawCardBg(ctx, [
    { x: 0, y: 0, r: 500, color: 'rgba(16, 185, 129, 0.08)' },
    { x: W, y: H, r: 600, color: 'rgba(20, 184, 166, 0.08)' },
  ]);

  let y = 90;

  // Icon
  drawGradientCircle(ctx, W / 2, y + 40, 40, [[0, '#10b981'], [1, '#14b8a6']]);
  drawText(ctx, '✨', W / 2, y + 40, { font: '400 36px sans-serif', fill: '#fff', align: 'center', baseline: 'middle' });
  y += 100;

  // Title
  drawText(ctx, `${userName}'s ${year}`, W / 2, y, { font: '700 60px "Plus Jakarta Sans", system-ui, sans-serif', fill: '#fff', align: 'center' });
  y += 65;
  drawText(ctx, 'Year in Review', W / 2, y, { font: '500 36px "Plus Jakarta Sans", system-ui, sans-serif', fill: '#34d399', align: 'center' });
  y += 75;

  // Main Stats Section
  drawCardSection(ctx, 60, y, W - 120, 280);
  // Total
  drawText(ctx, fmt(data.totalStats.totalYourShare), W / 2, y + 40, { font: '700 72px "Plus Jakarta Sans", system-ui, sans-serif', fill: '#fff', align: 'center' });
  drawText(ctx, 'Total Spent', W / 2, y + 115, { font: '400 27px "Plus Jakarta Sans", system-ui, sans-serif', fill: '#78716c', align: 'center' });
  // 3 sub-stats
  const statW = (W - 180) / 3;
  [
    { val: data.totalStats.totalExpenseCount, label: 'Expenses', color: '#34d399' },
    { val: data.totalStats.uniquePeopleCount, label: 'People', color: '#fbbf24' },
    { val: data.totalStats.uniqueGroupsCount, label: 'Groups', color: '#818cf8' },
  ].forEach((s, i) => {
    const sx = 90 + i * statW + statW / 2;
    drawText(ctx, String(s.val), sx, y + 170, { font: '700 48px "Plus Jakarta Sans", system-ui, sans-serif', fill: s.color, align: 'center' });
    drawText(ctx, s.label, sx, y + 225, { font: '400 24px "Plus Jakarta Sans", system-ui, sans-serif', fill: '#78716c', align: 'center' });
  });
  y += 310;

  // Personality
  drawCardSection(ctx, 60, y, W - 120, 220);
  drawText(ctx, data.personality.emoji, W / 2, y + 35, { font: '400 66px sans-serif', fill: '#fff', align: 'center' });
  drawText(ctx, data.personality.type, W / 2, y + 115, { font: '700 42px "Plus Jakarta Sans", system-ui, sans-serif', fill: '#fff', align: 'center' });
  // Traits
  ctx.font = '400 24px "Plus Jakarta Sans", system-ui, sans-serif';
  const traits = data.personality.traits.slice(0, 3);
  const traitStr = traits.join('  ·  ');
  drawText(ctx, traitStr, W / 2, y + 170, { font: '400 24px "Plus Jakarta Sans", system-ui, sans-serif', fill: '#a8a29e', align: 'center' });
  y += 250;

  // Top Categories
  const topCats = data.categoryStats.categories.slice(0, 3);
  const catColors = ['#10b981', '#f59e0b', '#6366f1'];
  drawCardSection(ctx, 60, y, W - 120, 50 + topCats.length * 54);
  drawText(ctx, 'TOP CATEGORIES', 100, y + 25, { font: '600 22px "Plus Jakarta Sans", system-ui, sans-serif', fill: '#78716c' });
  topCats.forEach((cat, i) => {
    const cy = y + 65 + i * 54;
    drawCircle(ctx, 105, cy + 8, 9, catColors[i]);
    drawText(ctx, cat.name, 130, cy - 3, { font: '400 30px "Plus Jakarta Sans", system-ui, sans-serif', fill: '#d6d3d1', maxWidth: 500 });
    drawText(ctx, fmt(cat.amount), W - 100, cy - 3, { font: '500 30px "Plus Jakarta Sans", system-ui, sans-serif', fill: '#a8a29e', align: 'right' });
  });
  y += 55 + topCats.length * 54 + 25;

  // Best Buddy
  if (data.socialStats.topFriend && y + 130 < H - 160) {
    drawCardSection(ctx, 60, y, W - 120, 120);
    drawGradientCircle(ctx, 130, y + 60, 32, [[0, '#ec4899'], [1, '#e11d48']]);
    drawText(ctx, data.socialStats.topFriend.name[0], 130, y + 60, { font: '700 30px "Plus Jakarta Sans", system-ui, sans-serif', fill: '#fff', align: 'center', baseline: 'middle' });
    drawText(ctx, 'Best Split Buddy', 185, y + 32, { font: '400 22px "Plus Jakarta Sans", system-ui, sans-serif', fill: '#78716c' });
    drawText(ctx, data.socialStats.topFriend.name, 185, y + 62, { font: '600 33px "Plus Jakarta Sans", system-ui, sans-serif', fill: '#fff', maxWidth: 580 });
    drawText(ctx, '🤝', W - 110, y + 55, { font: '400 42px sans-serif', fill: '#fff', align: 'center', baseline: 'middle' });
  }

  drawFooter(ctx);
}

// ─── STATS CARD ─────────────────────────────────────────────────────────────

function drawStatsCard(ctx, data, year, userName) {
  drawCardBg(ctx, [
    { x: W, y: 0, r: 600, color: 'rgba(16, 185, 129, 0.08)' },
    { x: 0, y: H, r: 500, color: 'rgba(20, 184, 166, 0.08)' },
  ]);

  let y = 100;
  drawText(ctx, `${userName}'s ${year}`, W / 2, y, { font: '500 33px "Plus Jakarta Sans", system-ui, sans-serif', fill: '#34d399', align: 'center' });
  y += 50;
  drawText(ctx, 'Spending Stats', W / 2, y, { font: '700 66px "Plus Jakarta Sans", system-ui, sans-serif', fill: '#fff', align: 'center' });
  y += 110;

  // Big amount
  drawCardSection(ctx, 60, y, W - 120, 240);
  drawText(ctx, 'Your Total Share', W / 2, y + 40, { font: '400 30px "Plus Jakarta Sans", system-ui, sans-serif', fill: '#78716c', align: 'center' });
  drawText(ctx, fmt(data.totalStats.totalYourShare), W / 2, y + 100, { font: '700 96px "Plus Jakarta Sans", system-ui, sans-serif', fill: '#34d399', align: 'center' });
  y += 275;

  // 2×2 grid
  const gw = (W - 150) / 2;
  const gh = 165;
  const grid = [
    { val: String(data.totalStats.totalExpenseCount), label: 'Expenses Split', color: '#fff' },
    { val: fmt(data.totalStats.totalYouPaid), label: 'You Paid', color: '#fbbf24' },
    { val: String(data.totalStats.uniquePeopleCount), label: 'People', color: '#818cf8' },
    { val: String(data.totalStats.uniqueGroupsCount), label: 'Groups', color: '#f472b6' },
  ];
  grid.forEach((item, i) => {
    const gx = 60 + (i % 2) * (gw + 30);
    const gy = y + Math.floor(i / 2) * (gh + 20);
    drawCardSection(ctx, gx, gy, gw, gh);
    drawText(ctx, item.val, gx + gw / 2, gy + 40, { font: '700 54px "Plus Jakarta Sans", system-ui, sans-serif', fill: item.color, align: 'center' });
    drawText(ctx, item.label, gx + gw / 2, gy + 110, { font: '400 26px "Plus Jakarta Sans", system-ui, sans-serif', fill: '#78716c', align: 'center' });
  });
  y += gh * 2 + 65;

  // Net contribution
  drawCardSection(ctx, 60, y, W - 120, 190);
  drawText(ctx, 'Net Contribution', W / 2, y + 30, { font: '400 30px "Plus Jakarta Sans", system-ui, sans-serif', fill: '#78716c', align: 'center' });
  const net = data.totalStats.netContribution;
  drawText(ctx, `${net >= 0 ? '+' : ''}${fmt(net)}`, W / 2, y + 80, {
    font: '700 66px "Plus Jakarta Sans", system-ui, sans-serif',
    fill: net >= 0 ? '#34d399' : '#f87171',
    align: 'center',
  });
  drawText(ctx, net >= 0 ? 'You paid more than your share!' : 'Friends covered for you', W / 2, y + 150, {
    font: '400 26px "Plus Jakarta Sans", system-ui, sans-serif', fill: '#57534e', align: 'center',
  });

  drawFooter(ctx);
}

// ─── CATEGORIES CARD ────────────────────────────────────────────────────────

function drawCategoriesCard(ctx, data, year, userName) {
  drawCardBg(ctx, [
    { x: 0, y: H * 0.33, r: 600, color: 'rgba(245, 158, 11, 0.07)' },
    { x: W, y: H, r: 500, color: 'rgba(99, 102, 241, 0.07)' },
  ]);

  let y = 100;
  drawText(ctx, `${userName}'s ${year}`, W / 2, y, { font: '500 33px "Plus Jakarta Sans", system-ui, sans-serif', fill: '#fbbf24', align: 'center' });
  y += 50;
  drawText(ctx, 'Where It Went', W / 2, y, { font: '700 66px "Plus Jakarta Sans", system-ui, sans-serif', fill: '#fff', align: 'center' });
  y += 110;

  const COLORS = ['#10b981', '#f59e0b', '#6366f1', '#ec4899', '#14b8a6'];
  const topCats = data.categoryStats.categories.slice(0, 5);
  const total = topCats.reduce((s, c) => s + c.amount, 0);

  topCats.forEach((cat, i) => {
    const pct = total > 0 ? (cat.amount / total) * 100 : 0;
    // Label
    ctx.font = '400 33px "Plus Jakarta Sans", system-ui, sans-serif';
    const catName = truncateText(ctx, cat.name, 500);
    drawText(ctx, catName, 75, y, { font: '400 33px "Plus Jakarta Sans", system-ui, sans-serif', fill: '#d6d3d1' });
    drawText(ctx, fmt(cat.amount), W - 75, y, { font: '500 33px "Plus Jakarta Sans", system-ui, sans-serif', fill: '#a8a29e', align: 'right' });
    y += 45;
    // Bar bg
    fillRoundRect(ctx, 75, y, W - 150, 66, 18, 'rgba(28, 25, 23, 0.6)');
    // Bar fill
    const barW = Math.max((W - 150) * pct / 100, 60);
    fillRoundRect(ctx, 75, y, barW, 66, 18, COLORS[i]);
    // Percent text
    drawText(ctx, `${Math.round(pct)}%`, 75 + barW - 18, y + 33, {
      font: '700 27px "Plus Jakarta Sans", system-ui, sans-serif', fill: 'rgba(255,255,255,0.9)', align: 'right', baseline: 'middle',
    });
    y += 100;
  });

  // Top category highlight
  y += 20;
  if (topCats[0]) {
    drawCardSection(ctx, 60, y, W - 120, 210);
    drawText(ctx, 'Top Category', W / 2, y + 30, { font: '400 30px "Plus Jakarta Sans", system-ui, sans-serif', fill: '#78716c', align: 'center' });
    drawText(ctx, topCats[0].name, W / 2, y + 80, { font: '700 54px "Plus Jakarta Sans", system-ui, sans-serif', fill: '#fff', align: 'center' });
    drawText(ctx, fmt(topCats[0].amount), W / 2, y + 145, { font: '700 60px "Plus Jakarta Sans", system-ui, sans-serif', fill: COLORS[0], align: 'center' });
  }

  drawFooter(ctx);
}

// ─── PERSONALITY CARD ───────────────────────────────────────────────────────

function drawPersonalityCard(ctx, data, year, userName) {
  drawCardBg(ctx, [
    { x: W * 0.25, y: H * 0.25, r: 650, color: 'rgba(139, 92, 246, 0.07)' },
    { x: W * 0.75, y: H * 0.75, r: 600, color: 'rgba(236, 72, 153, 0.07)' },
  ]);

  let y = 100;
  drawText(ctx, `${userName}'s ${year}`, W / 2, y, { font: '500 33px "Plus Jakarta Sans", system-ui, sans-serif', fill: '#c084fc', align: 'center' });
  y += 50;
  drawText(ctx, 'Splitwise Personality', W / 2, y, { font: '700 54px "Plus Jakarta Sans", system-ui, sans-serif', fill: '#fff', align: 'center' });
  y += 130;

  // Big emoji
  drawText(ctx, data.personality.emoji, W / 2, y, { font: '400 180px sans-serif', fill: '#fff', align: 'center' });
  y += 210;

  // Type
  drawText(ctx, data.personality.type, W / 2, y, { font: '700 78px "Plus Jakarta Sans", system-ui, sans-serif', fill: '#fff', align: 'center' });
  y += 90;

  // Description
  ctx.font = '400 30px "Plus Jakarta Sans", system-ui, sans-serif';
  const desc = data.personality.description;
  const words = desc.split(' ');
  let line = '';
  const lines = [];
  words.forEach(word => {
    const test = line ? line + ' ' + word : word;
    if (ctx.measureText(test).width > W - 200) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  });
  if (line) lines.push(line);
  lines.forEach((l, i) => {
    drawText(ctx, l, W / 2, y + i * 40, { font: '400 30px "Plus Jakarta Sans", system-ui, sans-serif', fill: '#a8a29e', align: 'center' });
  });
  y += lines.length * 40 + 45;

  // Traits
  const traitColors = ['#10b981', '#f59e0b', '#6366f1', '#ec4899'];
  const traitBgs = ['rgba(16,185,129,0.12)', 'rgba(245,158,11,0.12)', 'rgba(99,102,241,0.12)', 'rgba(236,72,153,0.12)'];
  ctx.font = '500 27px "Plus Jakarta Sans", system-ui, sans-serif';
  let tx = W / 2;
  const allTraits = data.personality.traits.slice(0, 4);
  // Calculate total width
  const traitWidths = allTraits.map(t => ctx.measureText(t).width + 42);
  const totalTW = traitWidths.reduce((s, w) => s + w, 0) + (allTraits.length - 1) * 12;
  tx = (W - totalTW) / 2;
  allTraits.forEach((trait, i) => {
    const tw = traitWidths[i];
    fillRoundRect(ctx, tx, y, tw, 48, 24, traitBgs[i % 4]);
    drawText(ctx, trait, tx + tw / 2, y + 24, { font: '500 27px "Plus Jakarta Sans", system-ui, sans-serif', fill: traitColors[i % 4], align: 'center', baseline: 'middle' });
    tx += tw + 12;
  });
  y += 80;

  // Busiest month + favorite day
  const halfW = (W - 150) / 2;
  drawCardSection(ctx, 60, y, halfW, 140);
  drawText(ctx, data.monthlyStats.busiestMonth.fullName, 60 + halfW / 2, y + 35, { font: '700 39px "Plus Jakarta Sans", system-ui, sans-serif', fill: '#fff', align: 'center', maxWidth: halfW - 30 });
  drawText(ctx, 'Busiest Month', 60 + halfW / 2, y + 95, { font: '400 24px "Plus Jakarta Sans", system-ui, sans-serif', fill: '#78716c', align: 'center' });

  drawCardSection(ctx, 60 + halfW + 30, y, halfW, 140);
  drawText(ctx, data.timePatterns.busiestDay.day, 60 + halfW + 30 + halfW / 2, y + 35, { font: '700 45px "Plus Jakarta Sans", system-ui, sans-serif', fill: '#fff', align: 'center' });
  drawText(ctx, 'Favorite Day', 60 + halfW + 30 + halfW / 2, y + 95, { font: '400 24px "Plus Jakarta Sans", system-ui, sans-serif', fill: '#78716c', align: 'center' });

  drawFooter(ctx);
}

// ─── SOCIAL CARD ────────────────────────────────────────────────────────────

function drawSocialCard(ctx, data, year, userName) {
  drawCardBg(ctx, [
    { x: 0, y: 0, r: 600, color: 'rgba(236, 72, 153, 0.07)' },
    { x: W, y: H, r: 500, color: 'rgba(225, 29, 72, 0.07)' },
  ]);

  let y = 100;
  drawText(ctx, `${userName}'s ${year}`, W / 2, y, { font: '500 33px "Plus Jakarta Sans", system-ui, sans-serif', fill: '#f472b6', align: 'center' });
  y += 50;
  drawText(ctx, 'Split Squad', W / 2, y, { font: '700 66px "Plus Jakarta Sans", system-ui, sans-serif', fill: '#fff', align: 'center' });
  y += 110;

  // Best Buddy
  if (data.socialStats.topFriend) {
    drawCardSection(ctx, 60, y, W - 120, 260);
    drawText(ctx, 'BEST SPLIT BUDDY', 100, y + 30, { font: '600 22px "Plus Jakarta Sans", system-ui, sans-serif', fill: '#f472b6' });
    // Avatar circle
    drawGradientCircle(ctx, 140, y + 140, 60, [[0, '#ec4899'], [1, '#e11d48']]);
    drawText(ctx, data.socialStats.topFriend.name[0], 140, y + 140, { font: '700 48px "Plus Jakarta Sans", system-ui, sans-serif', fill: '#fff', align: 'center', baseline: 'middle' });
    // Name + count
    drawText(ctx, data.socialStats.topFriend.name, 230, y + 110, { font: '700 48px "Plus Jakarta Sans", system-ui, sans-serif', fill: '#fff', maxWidth: 520 });
    drawText(ctx, `${data.socialStats.topFriend.expenseCount} expenses together`, 230, y + 170, { font: '400 30px "Plus Jakarta Sans", system-ui, sans-serif', fill: '#a8a29e' });
    drawText(ctx, '🤝', W - 120, y + 130, { font: '400 60px sans-serif', align: 'center', baseline: 'middle' });
    y += 290;
  }

  // Top Group
  if (data.socialStats.topGroup) {
    drawCardSection(ctx, 60, y, W - 120, 260);
    drawText(ctx, 'MOST ACTIVE GROUP', 100, y + 30, { font: '600 22px "Plus Jakarta Sans", system-ui, sans-serif', fill: '#818cf8' });
    drawGradientCircle(ctx, 140, y + 140, 55, [[0, '#6366f1'], [1, '#7c3aed']]);
    drawText(ctx, '👥', 140, y + 140, { font: '400 42px sans-serif', align: 'center', baseline: 'middle' });
    ctx.font = '700 48px "Plus Jakarta Sans", system-ui, sans-serif';
    const gName = truncateText(ctx, data.socialStats.topGroup.name, 520);
    drawText(ctx, gName, 230, y + 110, { font: '700 48px "Plus Jakarta Sans", system-ui, sans-serif', fill: '#fff' });
    drawText(ctx, `${data.socialStats.topGroup.count} expenses`, 230, y + 170, { font: '400 30px "Plus Jakarta Sans", system-ui, sans-serif', fill: '#a8a29e' });
    drawText(ctx, '🏆', W - 120, y + 130, { font: '400 60px sans-serif', align: 'center', baseline: 'middle' });
    y += 290;
  }

  // Stats grid
  const halfW = (W - 150) / 2;
  drawCardSection(ctx, 60, y, halfW, 160);
  drawText(ctx, String(data.socialStats.totalFriendsInteracted), 60 + halfW / 2, y + 40, { font: '700 72px "Plus Jakarta Sans", system-ui, sans-serif', fill: '#fff', align: 'center' });
  drawText(ctx, 'Friends', 60 + halfW / 2, y + 120, { font: '400 26px "Plus Jakarta Sans", system-ui, sans-serif', fill: '#78716c', align: 'center' });

  drawCardSection(ctx, 60 + halfW + 30, y, halfW, 160);
  drawText(ctx, String(data.socialStats.totalGroupsActive), 60 + halfW + 30 + halfW / 2, y + 40, { font: '700 72px "Plus Jakarta Sans", system-ui, sans-serif', fill: '#fff', align: 'center' });
  drawText(ctx, 'Active Groups', 60 + halfW + 30 + halfW / 2, y + 120, { font: '400 26px "Plus Jakarta Sans", system-ui, sans-serif', fill: '#78716c', align: 'center' });

  drawFooter(ctx);
}

// ─── HIGHLIGHTS CARD ────────────────────────────────────────────────────────

function drawHighlightsCard(ctx, data, year, userName) {
  drawCardBg(ctx, [
    { x: 0, y: H * 0.5, r: 600, color: 'rgba(245, 158, 11, 0.07)' },
    { x: W * 0.75, y: H, r: 500, color: 'rgba(249, 115, 22, 0.07)' },
  ]);

  let y = 100;
  drawText(ctx, `${userName}'s ${year}`, W / 2, y, { font: '500 33px "Plus Jakarta Sans", system-ui, sans-serif', fill: '#fbbf24', align: 'center' });
  y += 50;
  drawText(ctx, 'Highlights', W / 2, y, { font: '700 66px "Plus Jakarta Sans", system-ui, sans-serif', fill: '#fff', align: 'center' });
  y += 110;

  // Biggest Expense
  if (data.notableExpenses.biggestExpense) {
    // Left accent bar
    fillRoundRect(ctx, 60, y, 12, 250, 6, '#f59e0b');
    drawCardSection(ctx, 80, y, W - 140, 250);
    drawText(ctx, 'BIGGEST EXPENSE', 120, y + 30, { font: '600 22px "Plus Jakarta Sans", system-ui, sans-serif', fill: '#fbbf24' });
    ctx.font = '700 42px "Plus Jakarta Sans", system-ui, sans-serif';
    const bName = truncateText(ctx, data.notableExpenses.biggestExpense.description, W - 240);
    drawText(ctx, bName, 120, y + 80, { font: '700 42px "Plus Jakarta Sans", system-ui, sans-serif', fill: '#fff' });
    drawText(ctx, fmt(data.notableExpenses.biggestExpense.amount), 120, y + 140, { font: '700 60px "Plus Jakarta Sans", system-ui, sans-serif', fill: '#fbbf24' });
    drawText(ctx, data.notableExpenses.biggestExpense.category, 120, y + 205, { font: '400 27px "Plus Jakarta Sans", system-ui, sans-serif', fill: '#78716c' });
    y += 280;
  }

  // Most Frequent
  if (data.notableExpenses.mostFrequentExpense) {
    fillRoundRect(ctx, 60, y, 12, 200, 6, '#6366f1');
    drawCardSection(ctx, 80, y, W - 140, 200);
    drawText(ctx, 'MOST FREQUENT', 120, y + 30, { font: '600 22px "Plus Jakarta Sans", system-ui, sans-serif', fill: '#818cf8' });
    ctx.font = '700 42px "Plus Jakarta Sans", system-ui, sans-serif';
    const mName = truncateText(ctx, data.notableExpenses.mostFrequentExpense.description, W - 240);
    drawText(ctx, mName, 120, y + 80, { font: '700 42px "Plus Jakarta Sans", system-ui, sans-serif', fill: '#fff' });
    drawText(ctx, `${data.notableExpenses.mostFrequentExpense.count} times this year`, 120, y + 140, { font: '400 33px "Plus Jakarta Sans", system-ui, sans-serif', fill: '#a8a29e' });
    y += 230;
  }

  // Fun Facts
  const facts = data.funFacts.slice(0, 3);
  facts.forEach((fact) => {
    if (y + 100 > H - 160) return;
    drawCardSection(ctx, 60, y, W - 120, 90);
    drawText(ctx, fact.icon, 110, y + 45, { font: '400 36px sans-serif', align: 'center', baseline: 'middle' });
    ctx.font = '400 27px "Plus Jakarta Sans", system-ui, sans-serif';
    const fText = truncateText(ctx, fact.text, W - 260);
    drawText(ctx, fText, 155, y + 45, { font: '400 27px "Plus Jakarta Sans", system-ui, sans-serif', fill: '#d6d3d1', baseline: 'middle' });
    y += 110;
  });

  drawFooter(ctx);
}

// ─── Public API ─────────────────────────────────────────────────────────────

const CARD_RENDERERS = {
  summary: drawSummaryCard,
  stats: drawStatsCard,
  categories: drawCategoriesCard,
  personality: drawPersonalityCard,
  social: drawSocialCard,
  highlights: drawHighlightsCard,
};

/**
 * Render a shareable card to a canvas and return it.
 * @param {'summary'|'stats'|'categories'|'personality'|'social'|'highlights'} cardType
 * @param {object} data - Year-in-review computed data
 * @param {number} year
 * @param {string} userName
 * @returns {Promise<HTMLCanvasElement>}
 */
export async function renderCard(cardType, data, year, userName) {
  await ensureFonts();

  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');

  const renderer = CARD_RENDERERS[cardType];
  if (!renderer) throw new Error(`Unknown card type: ${cardType}`);

  renderer(ctx, data, year, userName);
  return canvas;
}

export const CARD_TYPES = Object.keys(CARD_RENDERERS);
export { W as CARD_WIDTH, H as CARD_HEIGHT };
