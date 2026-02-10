import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { GitBranch, Zap, ArrowRight, Info, X } from 'lucide-react';
import { formatCurrency, getCurrencySymbol } from '../utils/analytics';

// ─── Data Extraction ──────────────────────────────────────────────────────────

function extractGraphData(groups, userId) {
  const nodeMap = {};
  const originalLinks = [];
  const simplifiedLinks = [];

  groups.forEach(group => {
    if (group.id === 0) return;
    group.members?.forEach(m => {
      if (!nodeMap[m.id]) {
        nodeMap[m.id] = {
          id: m.id,
          name: `${m.first_name} ${m.last_name || ''}`.trim(),
          shortName: m.first_name || '?',
          picture: m.picture?.medium || m.picture?.small,
          isCurrentUser: m.id === userId,
        };
      }
    });

    const addLinks = (debts, target) => {
      (debts || []).forEach(debt => {
        const amount = parseFloat(debt.amount);
        if (amount < 1) return;
        target.push({
          source: debt.from,
          target: debt.to,
          amount,
          currency: debt.currency_code || 'INR',
          groupName: group.name,
          groupId: group.id,
        });
      });
    };

    addLinks(group.original_debts, originalLinks);
    addLinks(group.simplified_debts, simplifiedLinks);
  });

  // If no original debts available, fall back to simplified for both
  const effectiveOriginal = originalLinks.length > 0 ? originalLinks : simplifiedLinks;

  // Collect active node IDs (appear in any debt)
  const activeIds = new Set();
  [...effectiveOriginal, ...simplifiedLinks].forEach(l => {
    activeIds.add(l.source);
    activeIds.add(l.target);
  });

  const nodes = Object.values(nodeMap).filter(n => activeIds.has(n.id));
  return { nodes, originalLinks: effectiveOriginal, simplifiedLinks };
}

// ─── Cross-Group Debt Optimization (Minimum Cash Flow) ──────────────────────

function computeOptimizedDebts(links) {
  const balances = {};
  links.forEach(l => {
    const c = l.currency;
    if (!balances[l.source]) balances[l.source] = {};
    if (!balances[l.target]) balances[l.target] = {};
    balances[l.source][c] = (balances[l.source][c] || 0) - l.amount;
    balances[l.target][c] = (balances[l.target][c] || 0) + l.amount;
  });

  const result = [];
  const currencies = [...new Set(links.map(l => l.currency))];

  currencies.forEach(currency => {
    const debtors = [];
    const creditors = [];

    Object.entries(balances).forEach(([id, bals]) => {
      const amount = bals[currency] || 0;
      if (amount < -0.5) debtors.push({ id: parseInt(id), amount: Math.abs(amount) });
      if (amount > 0.5) creditors.push({ id: parseInt(id), amount });
    });

    debtors.sort((a, b) => b.amount - a.amount);
    creditors.sort((a, b) => b.amount - a.amount);

    let i = 0, j = 0;
    while (i < debtors.length && j < creditors.length) {
      const transfer = Math.min(debtors[i].amount, creditors[j].amount);
      if (transfer > 0.5) {
        result.push({
          source: debtors[i].id,
          target: creditors[j].id,
          amount: Math.round(transfer * 100) / 100,
          currency,
          groupName: 'Cross-group',
        });
      }
      debtors[i].amount -= transfer;
      creditors[j].amount -= transfer;
      if (debtors[i].amount < 0.5) i++;
      if (creditors[j].amount < 0.5) j++;
    }
  });

  return result;
}

// ─── Force Simulation Engine ────────────────────────────────────────────────

const SIM_CONFIG = {
  repulsion: 4500,
  attraction: 0.035,
  centerStrength: 0.06,
  collisionRadius: 56,
  damping: 0.82,
  minAlpha: 0.002,
  initialAlpha: 1,
};

function initSimNodes(nodes, width, height) {
  const cx = width / 2, cy = height / 2;
  const r = Math.min(width, height) * 0.28;
  const n = nodes.length;
  return nodes.map((node, i) => ({
    ...node,
    x: cx + r * Math.cos((2 * Math.PI * i) / n - Math.PI / 2),
    y: cy + r * Math.sin((2 * Math.PI * i) / n - Math.PI / 2),
    vx: 0, vy: 0,
  }));
}

function tickSimulation(simNodes, links, width, height, dragId) {
  const cx = width / 2, cy = height / 2;
  const { repulsion, attraction, centerStrength, collisionRadius, damping } = SIM_CONFIG;
  const n = simNodes.length;

  for (let i = 0; i < n; i++) {
    if (simNodes[i].id === dragId) continue;
    let fx = 0, fy = 0;

    // Repulsion from all other nodes
    for (let j = 0; j < n; j++) {
      if (i === j) continue;
      let dx = simNodes[j].x - simNodes[i].x;
      let dy = simNodes[j].y - simNodes[i].y;
      let dist = Math.sqrt(dx * dx + dy * dy) || 1;
      let force = -repulsion / (dist * dist);
      fx += force * (dx / dist);
      fy += force * (dy / dist);

      // Collision
      if (dist < collisionRadius) {
        const overlap = (collisionRadius - dist) / 2;
        fx -= (dx / dist) * overlap * 0.5;
        fy -= (dy / dist) * overlap * 0.5;
      }
    }

    // Attraction along links
    links.forEach(l => {
      let otherId = null;
      if (l.source === simNodes[i].id) otherId = l.target;
      else if (l.target === simNodes[i].id) otherId = l.source;
      if (otherId === null) return;

      const other = simNodes.find(sn => sn.id === otherId);
      if (!other) return;
      let dx = other.x - simNodes[i].x;
      let dy = other.y - simNodes[i].y;
      let dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const restLength = 120 + Math.min(n * 8, 80);
      fx += attraction * (dist - restLength) * (dx / dist);
      fy += attraction * (dist - restLength) * (dy / dist);
    });

    // Center gravity
    fx += (cx - simNodes[i].x) * centerStrength;
    fy += (cy - simNodes[i].y) * centerStrength;

    simNodes[i].vx = (simNodes[i].vx + fx) * damping;
    simNodes[i].vy = (simNodes[i].vy + fy) * damping;
    simNodes[i].x += simNodes[i].vx;
    simNodes[i].y += simNodes[i].vy;

    // Bounds
    const pad = 40;
    simNodes[i].x = Math.max(pad, Math.min(width - pad, simNodes[i].x));
    simNodes[i].y = Math.max(pad, Math.min(height - pad, simNodes[i].y));
  }
}

// ─── SVG Helpers ────────────────────────────────────────────────────────────

function curvedPath(sx, sy, tx, ty, curvature = 0) {
  const mx = (sx + tx) / 2;
  const my = (sy + ty) / 2;
  const dx = tx - sx;
  const dy = ty - sy;
  const nx = -dy, ny = dx;
  const len = Math.sqrt(nx * nx + ny * ny) || 1;
  const cpx = mx + (nx / len) * curvature;
  const cpy = my + (ny / len) * curvature;
  return { path: `M ${sx} ${sy} Q ${cpx} ${cpy} ${tx} ${ty}`, cx: cpx, cy: cpy };
}

function shortenPath(sx, sy, tx, ty, nodeRadius) {
  const dx = tx - sx, dy = ty - sy;
  const dist = Math.sqrt(dx * dx + dy * dy) || 1;
  const ratio = nodeRadius / dist;
  return {
    sx: sx + dx * ratio,
    sy: sy + dy * ratio,
    tx: tx - dx * ratio,
    ty: ty - dy * ratio,
  };
}

// ─── Animated Counter ───────────────────────────────────────────────────────

function AnimCount({ value }) {
  const [display, setDisplay] = useState(value);
  const prev = useRef(value);

  useEffect(() => {
    const start = prev.current;
    const end = value;
    prev.current = value;
    if (start === end) return;
    const duration = 600;
    const t0 = performance.now();
    const anim = (now) => {
      const p = Math.min((now - t0) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(Math.round(start + (end - start) * eased));
      if (p < 1) requestAnimationFrame(anim);
    };
    requestAnimationFrame(anim);
  }, [value]);

  return <span>{display}</span>;
}

// ─── Mode Toggle ────────────────────────────────────────────────────────────

const MODES = [
  { id: 'original', label: 'All Debts', color: 'text-red-400', bg: 'bg-red-500/15', border: 'border-red-500/30', dot: 'bg-red-400' },
  { id: 'simplified', label: 'Simplified', color: 'text-amber-400', bg: 'bg-amber-500/15', border: 'border-amber-500/30', dot: 'bg-amber-400' },
  { id: 'optimized', label: 'Optimized', color: 'text-emerald-400', bg: 'bg-emerald-500/15', border: 'border-emerald-500/30', dot: 'bg-emerald-400' },
];

function ModeToggle({ mode, onChange }) {
  return (
    <div className="flex gap-1.5 sm:gap-2">
      {MODES.map(m => (
        <button
          key={m.id}
          onClick={() => onChange(m.id)}
          className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg text-[11px] sm:text-xs font-medium transition-all touch-manipulation ${
            mode === m.id
              ? `${m.bg} ${m.color} border ${m.border}`
              : 'bg-stone-800/40 text-stone-500 border border-stone-700/30 hover:text-stone-300'
          }`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${mode === m.id ? m.dot : 'bg-stone-600'}`} />
          {m.label}
        </button>
      ))}
    </div>
  );
}

// ─── Info Panel ─────────────────────────────────────────────────────────────

function InfoPanel({ mode, onClose }) {
  const info = {
    original: {
      title: 'All Debts',
      desc: 'Every individual debt from each group. This is the raw data \u2014 one transaction per debt per group. Often redundant when the same pair appears in multiple groups.',
    },
    simplified: {
      title: 'Splitwise Simplified',
      desc: 'Splitwise reduces debts within each group. If A owes B \u20b9500 and B owes A \u20b9300 in the same group, it becomes A owes B \u20b9200.',
    },
    optimized: {
      title: 'Cross-Group Optimized',
      desc: 'The minimum possible transactions across ALL groups. If you owe Rahul \u20b9500 in one group but he owes you \u20b9300 in another, this nets it to a single \u20b9200 payment.',
    },
  };
  const i = info[mode];
  return (
    <div className="absolute top-12 right-0 sm:right-2 z-20 w-72 glass-card p-4 animate-fade-in shadow-2xl">
      <div className="flex items-start justify-between mb-2">
        <h4 className="text-sm font-medium text-stone-200">{i.title}</h4>
        <button onClick={onClose} className="text-stone-500 hover:text-stone-300 p-0.5"><X size={14} /></button>
      </div>
      <p className="text-[11px] text-stone-400 leading-relaxed">{i.desc}</p>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────

const NODE_RADIUS = 22;
const NODE_RADIUS_SM = 18;

export default function DebtGraph({ groups, userId }) {
  const [mode, setMode] = useState('simplified');
  const [hoveredLink, setHoveredLink] = useState(null);
  const [hoveredNode, setHoveredNode] = useState(null);
  const [showInfo, setShowInfo] = useState(false);
  const [simNodes, setSimNodes] = useState([]);
  const [dimensions, setDimensions] = useState({ width: 600, height: 420 });

  const containerRef = useRef(null);
  const simRef = useRef([]);
  const alphaRef = useRef(SIM_CONFIG.initialAlpha);
  const frameRef = useRef(null);
  const dragRef = useRef(null);
  const isMobile = dimensions.width < 500;
  const nodeR = isMobile ? NODE_RADIUS_SM : NODE_RADIUS;

  // ── Extract graph data ──
  const { nodes, originalLinks, simplifiedLinks } = useMemo(
    () => extractGraphData(groups, userId),
    [groups, userId]
  );

  const optimizedLinks = useMemo(
    () => computeOptimizedDebts(simplifiedLinks.length > 0 ? simplifiedLinks : originalLinks),
    [originalLinks, simplifiedLinks]
  );

  const activeLinks = mode === 'original' ? originalLinks
    : mode === 'simplified' ? simplifiedLinks
    : optimizedLinks;

  // ── Resize observer ──
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(entries => {
      const { width } = entries[0].contentRect;
      const h = Math.min(Math.max(width * 0.65, 320), 520);
      setDimensions({ width, height: h });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // ── Initialize / reheat simulation when nodes or mode change ──
  useEffect(() => {
    if (nodes.length === 0) return;
    const { width, height } = dimensions;

    if (simRef.current.length === nodes.length && simRef.current.every((s, i) => s.id === nodes[i].id)) {
      alphaRef.current = 0.4;
    } else {
      simRef.current = initSimNodes(nodes, width, height);
      alphaRef.current = SIM_CONFIG.initialAlpha;
    }

    function tick() {
      if (alphaRef.current < SIM_CONFIG.minAlpha) {
        setSimNodes([...simRef.current]);
        return;
      }
      tickSimulation(simRef.current, activeLinks, width, height, dragRef.current);
      alphaRef.current *= 0.97;
      setSimNodes([...simRef.current]);
      frameRef.current = requestAnimationFrame(tick);
    }

    cancelAnimationFrame(frameRef.current);
    frameRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameRef.current);
  }, [nodes, activeLinks, dimensions]);

  // ── Drag handlers ──
  const startSimLoop = useCallback(() => {
    cancelAnimationFrame(frameRef.current);
    const tick = () => {
      if (alphaRef.current < SIM_CONFIG.minAlpha && !dragRef.current) {
        setSimNodes([...simRef.current]);
        return;
      }
      tickSimulation(simRef.current, activeLinks, dimensions.width, dimensions.height, dragRef.current);
      if (!dragRef.current) alphaRef.current *= 0.97;
      setSimNodes([...simRef.current]);
      frameRef.current = requestAnimationFrame(tick);
    };
    frameRef.current = requestAnimationFrame(tick);
  }, [activeLinks, dimensions]);

  const handlePointerDown = useCallback((e, nodeId) => {
    e.stopPropagation();
    e.target.setPointerCapture?.(e.pointerId);
    dragRef.current = nodeId;
    alphaRef.current = Math.max(alphaRef.current, 0.15);
    startSimLoop();
  }, [startSimLoop]);

  const handlePointerMove = useCallback((e) => {
    if (!dragRef.current) return;
    const svg = containerRef.current?.querySelector('svg');
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const node = simRef.current.find(n => n.id === dragRef.current);
    if (node) {
      node.x = Math.max(40, Math.min(dimensions.width - 40, x));
      node.y = Math.max(40, Math.min(dimensions.height - 40, y));
      node.vx = 0;
      node.vy = 0;
    }
  }, [dimensions]);

  const handlePointerUp = useCallback(() => {
    dragRef.current = null;
  }, []);

  // ── Stats ──
  const stats = useMemo(() => {
    const oc = originalLinks.length;
    const sc = simplifiedLinks.length;
    const optc = optimizedLinks.length;
    return {
      original: oc,
      simplified: sc,
      optimized: optc,
      simplifiedPct: oc > 0 ? Math.round((1 - sc / oc) * 100) : 0,
      optimizedPct: oc > 0 ? Math.round((1 - optc / oc) * 100) : 0,
    };
  }, [originalLinks, simplifiedLinks, optimizedLinks]);

  const currentCount = mode === 'original' ? stats.original : mode === 'simplified' ? stats.simplified : stats.optimized;

  // ── Compute link curvatures (offset duplicates between same pair) ──
  const linkRenderData = useMemo(() => {
    const pairCounts = {};
    activeLinks.forEach(l => {
      const key = [Math.min(l.source, l.target), Math.max(l.source, l.target)].join('-');
      pairCounts[key] = (pairCounts[key] || 0) + 1;
    });
    const pairIndex = {};
    return activeLinks.map(l => {
      const key = [Math.min(l.source, l.target), Math.max(l.source, l.target)].join('-');
      const total = pairCounts[key];
      if (!pairIndex[key]) pairIndex[key] = 0;
      const idx = pairIndex[key]++;
      const curvature = total === 1 ? 0 : (idx - (total - 1) / 2) * 40;
      return { ...l, curvature };
    });
  }, [activeLinks]);

  const maxAmount = useMemo(
    () => Math.max(...activeLinks.map(l => l.amount), 1),
    [activeLinks]
  );

  if (nodes.length === 0) return null;

  // Node lookup
  const nodeById = {};
  simNodes.forEach(n => { nodeById[n.id] = n; });

  return (
    <div className="glass-card overflow-hidden">
      {/* Header */}
      <div className="p-4 sm:p-5 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
            <GitBranch size={16} className="text-white" />
          </div>
          <div>
            <h3 className="font-display text-sm sm:text-base text-stone-200">Debt Network</h3>
            <p className="text-[10px] sm:text-[11px] text-stone-500">Drag nodes · Toggle modes to see simplification</p>
          </div>
        </div>
        <div className="flex items-center gap-2 relative">
          <ModeToggle mode={mode} onChange={setMode} />
          <button
            onClick={() => setShowInfo(!showInfo)}
            className="w-8 h-8 rounded-lg bg-stone-800/60 hover:bg-stone-700/60 flex items-center justify-center border border-stone-700/40 transition-colors flex-shrink-0"
          >
            <Info size={13} className="text-stone-400" />
          </button>
          {showInfo && <InfoPanel mode={mode} onClose={() => setShowInfo(false)} />}
        </div>
      </div>

      {/* Stats Bar */}
      <div className="px-4 sm:px-5 pb-3 flex flex-wrap items-center gap-3 sm:gap-5 text-[11px] sm:text-xs">
        <div className="flex items-center gap-2">
          <span className="text-stone-500">Transactions:</span>
          <span className="font-mono font-medium text-stone-200"><AnimCount value={currentCount} /></span>
        </div>
        {mode !== 'original' && stats.original > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-stone-500">Reduced:</span>
            <span className="flex items-center gap-1">
              <span className="font-mono text-stone-400 line-through">{stats.original}</span>
              <ArrowRight size={10} className="text-stone-600" />
              <span className={`font-mono font-medium ${mode === 'simplified' ? 'text-amber-400' : 'text-emerald-400'}`}>
                <AnimCount value={currentCount} />
              </span>
              <span className={`font-mono ${mode === 'simplified' ? 'text-amber-400/70' : 'text-emerald-400/70'}`}>
                ({mode === 'simplified' ? stats.simplifiedPct : stats.optimizedPct}% fewer)
              </span>
            </span>
          </div>
        )}
        <div className="flex items-center gap-2">
          <span className="text-stone-500">People:</span>
          <span className="font-mono font-medium text-stone-200">{nodes.length}</span>
        </div>
      </div>

      {/* SVG Graph */}
      <div
        ref={containerRef}
        className="relative cursor-grab active:cursor-grabbing"
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        style={{ touchAction: 'none' }}
      >
        <svg
          width={dimensions.width}
          height={dimensions.height}
          className="w-full select-none"
          viewBox={`0 0 ${dimensions.width} ${dimensions.height}`}
        >
          <defs>
            <marker id="arrow-gray" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
              <path d="M 0 0 L 8 3 L 0 6 Z" fill="rgba(120,113,108,0.5)" />
            </marker>
            <marker id="arrow-red" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
              <path d="M 0 0 L 8 3 L 0 6 Z" fill="rgba(239,68,68,0.7)" />
            </marker>
            <marker id="arrow-green" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
              <path d="M 0 0 L 8 3 L 0 6 Z" fill="rgba(16,185,129,0.7)" />
            </marker>
            <filter id="glow-emerald" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feFlood floodColor="#10b981" floodOpacity="0.35" result="color" />
              <feComposite in="color" in2="blur" operator="in" result="shadow" />
              <feMerge><feMergeNode in="shadow" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            <filter id="node-shadow" x="-30%" y="-30%" width="160%" height="160%">
              <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#000" floodOpacity="0.5" />
            </filter>
            {simNodes.map(n => (
              <clipPath key={`clip-${n.id}`} id={`clip-${n.id}`}>
                <circle cx={0} cy={0} r={nodeR - 2} />
              </clipPath>
            ))}
          </defs>

          {/* Background grid dots */}
          <pattern id="grid" width="30" height="30" patternUnits="userSpaceOnUse">
            <circle cx="15" cy="15" r="0.5" fill="rgba(120,113,108,0.08)" />
          </pattern>
          <rect width="100%" height="100%" fill="url(#grid)" />

          {/* Links */}
          <g>
            {linkRenderData.map((link, i) => {
              const sn = nodeById[link.source];
              const tn = nodeById[link.target];
              if (!sn || !tn) return null;

              const { sx, sy, tx, ty } = shortenPath(sn.x, sn.y, tn.x, tn.y, nodeR + 6);
              const { path, cx: labelX, cy: labelY } = curvedPath(sx, sy, tx, ty, link.curvature);

              const involvesUser = link.source === userId || link.target === userId;
              const userOwes = link.source === userId;

              const strokeColor = involvesUser
                ? (userOwes ? 'rgba(239,68,68,0.55)' : 'rgba(16,185,129,0.55)')
                : 'rgba(120,113,108,0.2)';
              const hoverStroke = involvesUser
                ? (userOwes ? 'rgba(239,68,68,0.85)' : 'rgba(16,185,129,0.85)')
                : 'rgba(120,113,108,0.5)';
              const markerId = involvesUser ? (userOwes ? 'arrow-red' : 'arrow-green') : 'arrow-gray';
              const isHovered = hoveredLink === i || hoveredNode === link.source || hoveredNode === link.target;
              const strokeW = 1.5 + (link.amount / maxAmount) * 3.5;

              const showLabel = isHovered || (involvesUser && activeLinks.length <= 15) || activeLinks.length <= 8;

              return (
                <g
                  key={`link-${i}`}
                  onPointerEnter={() => setHoveredLink(i)}
                  onPointerLeave={() => setHoveredLink(null)}
                  className="transition-opacity duration-300"
                  style={{ opacity: hoveredNode && !isHovered ? 0.15 : 1 }}
                >
                  <path d={path} fill="none" stroke="transparent" strokeWidth={16} className="cursor-pointer" />
                  <path
                    d={path}
                    fill="none"
                    stroke={isHovered ? hoverStroke : strokeColor}
                    strokeWidth={isHovered ? strokeW + 1 : strokeW}
                    markerEnd={`url(#${markerId})`}
                    strokeLinecap="round"
                    className="transition-all duration-200"
                  />
                  {showLabel && (
                    <g transform={`translate(${labelX}, ${labelY})`}>
                      <rect x="-28" y="-10" width="56" height="20" rx="6" fill="rgba(12,10,9,0.85)" stroke="rgba(120,113,108,0.2)" strokeWidth="0.5" />
                      <text
                        textAnchor="middle"
                        dominantBaseline="central"
                        className="text-[9px] sm:text-[10px] font-mono"
                        fill={involvesUser ? (userOwes ? '#f87171' : '#34d399') : '#a8a29e'}
                      >
                        {getCurrencySymbol(link.currency)}{Math.round(link.amount).toLocaleString()}
                      </text>
                    </g>
                  )}
                </g>
              );
            })}
          </g>

          {/* Nodes */}
          <g>
            {simNodes.map(node => {
              const isMe = node.isCurrentUser;
              const isHighlighted = hoveredNode === node.id;
              const isDimmed = hoveredNode && hoveredNode !== node.id && !activeLinks.some(
                l => (l.source === hoveredNode || l.target === hoveredNode) && (l.source === node.id || l.target === node.id)
              );

              return (
                <g
                  key={node.id}
                  transform={`translate(${node.x}, ${node.y})`}
                  onPointerDown={(e) => handlePointerDown(e, node.id)}
                  onPointerEnter={() => setHoveredNode(node.id)}
                  onPointerLeave={() => setHoveredNode(null)}
                  className="cursor-grab active:cursor-grabbing transition-opacity duration-200"
                  style={{ opacity: isDimmed ? 0.2 : 1 }}
                  filter={isMe ? 'url(#glow-emerald)' : 'url(#node-shadow)'}
                >
                  {/* Outer ring on hover */}
                  <circle
                    r={nodeR + 3}
                    fill="none"
                    stroke={isMe ? 'rgba(16,185,129,0.4)' : (isHighlighted ? 'rgba(120,113,108,0.4)' : 'transparent')}
                    strokeWidth={2}
                    className="transition-all duration-200"
                  />
                  {/* Background circle */}
                  <circle
                    r={nodeR}
                    fill={isMe ? '#064e3b' : '#1c1917'}
                    stroke={isMe ? '#10b981' : 'rgba(120,113,108,0.3)'}
                    strokeWidth={isMe ? 2 : 1.5}
                  />
                  {/* Avatar or initial */}
                  {node.picture ? (
                    <image
                      href={node.picture}
                      x={-(nodeR - 2)}
                      y={-(nodeR - 2)}
                      width={(nodeR - 2) * 2}
                      height={(nodeR - 2) * 2}
                      clipPath={`url(#clip-${node.id})`}
                      preserveAspectRatio="xMidYMid slice"
                    />
                  ) : (
                    <text
                      textAnchor="middle"
                      dominantBaseline="central"
                      fill={isMe ? '#34d399' : '#a8a29e'}
                      className="text-sm font-medium select-none pointer-events-none"
                      style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                    >
                      {node.shortName[0]}
                    </text>
                  )}
                  {/* Name label */}
                  <text
                    y={nodeR + 14}
                    textAnchor="middle"
                    fill={isMe ? '#6ee7b7' : '#78716c'}
                    className="text-[10px] sm:text-[11px] font-medium select-none pointer-events-none"
                    style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                  >
                    {isMe ? 'You' : node.shortName}
                  </text>
                  {/* Star badge for current user */}
                  {isMe && (
                    <g transform={`translate(${nodeR - 2}, ${-nodeR + 2})`}>
                      <circle r={7} fill="#10b981" stroke="#064e3b" strokeWidth={1.5} />
                      <text textAnchor="middle" dominantBaseline="central" fill="white" className="text-[7px] font-bold select-none pointer-events-none">{'\u2605'}</text>
                    </g>
                  )}
                </g>
              );
            })}
          </g>
        </svg>

        {/* Hover tooltip for link details */}
        {hoveredLink !== null && linkRenderData[hoveredLink] && (() => {
          const link = linkRenderData[hoveredLink];
          const sn = nodeById[link.source];
          const tn = nodeById[link.target];
          if (!sn || !tn) return null;
          return (
            <div
              className="absolute pointer-events-none z-10 glass-card p-2.5 text-[11px] shadow-xl min-w-[180px]"
              style={{
                left: Math.min((sn.x + tn.x) / 2, dimensions.width - 200),
                top: Math.max((sn.y + tn.y) / 2 - 60, 8),
              }}
            >
              <div className="flex items-center gap-1.5 mb-1">
                <span className="text-stone-300 font-medium">{sn.shortName}</span>
                <ArrowRight size={10} className="text-stone-600" />
                <span className="text-stone-300 font-medium">{tn.shortName}</span>
              </div>
              <p className={`font-mono font-medium ${link.source === userId ? 'text-red-400' : link.target === userId ? 'text-emerald-400' : 'text-stone-300'}`}>
                {formatCurrency(link.amount, link.currency)}
              </p>
              {link.groupName && <p className="text-stone-500 mt-0.5">{link.groupName}</p>}
            </div>
          );
        })()}
      </div>

      {/* Simplification Journey Bar */}
      {stats.original > 0 && (
        <div className="px-4 sm:px-5 py-3 sm:py-4 border-t border-stone-800/30">
          <div className="flex items-center gap-2 sm:gap-3 text-[10px] sm:text-[11px]">
            <button onClick={() => setMode('original')} className={`flex items-center gap-1.5 transition-colors ${mode === 'original' ? 'text-red-400' : 'text-stone-500 hover:text-stone-300'}`}>
              <div className={`w-5 h-5 sm:w-6 sm:h-6 rounded-md flex items-center justify-center font-mono font-bold text-[10px] ${mode === 'original' ? 'bg-red-500/20 text-red-400' : 'bg-stone-800/60 text-stone-500'}`}>
                {stats.original}
              </div>
              <span className="hidden sm:inline">All</span>
            </button>

            <div className="flex-1 h-1.5 bg-stone-800/60 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700 ease-out"
                style={{
                  width: mode === 'original' ? '100%' : mode === 'simplified' ? `${100 - stats.simplifiedPct}%` : `${100 - stats.optimizedPct}%`,
                  background: mode === 'original'
                    ? 'linear-gradient(90deg, #ef4444, #f59e0b)'
                    : mode === 'simplified'
                    ? 'linear-gradient(90deg, #f59e0b, #10b981)'
                    : 'linear-gradient(90deg, #10b981, #14b8a6)',
                }}
              />
            </div>

            <button onClick={() => setMode('optimized')} className={`flex items-center gap-1.5 transition-colors ${mode === 'optimized' ? 'text-emerald-400' : 'text-stone-500 hover:text-stone-300'}`}>
              <span className="hidden sm:inline">Optimal</span>
              <div className={`w-5 h-5 sm:w-6 sm:h-6 rounded-md flex items-center justify-center font-mono font-bold text-[10px] ${mode === 'optimized' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-stone-800/60 text-stone-500'}`}>
                {stats.optimized}
              </div>
            </button>
          </div>

          {mode === 'optimized' && stats.optimizedPct > 0 && (
            <div className="mt-2.5 flex items-start gap-2 p-2.5 bg-emerald-500/5 border border-emerald-500/10 rounded-lg">
              <Zap size={12} className="text-emerald-400 mt-0.5 flex-shrink-0" />
              <p className="text-[10px] sm:text-[11px] text-emerald-400/80 leading-relaxed">
                Cross-group optimization reduces <span className="font-mono font-medium">{stats.original}</span> transactions to just <span className="font-mono font-medium">{stats.optimized}</span> — that's <span className="font-mono font-medium">{stats.optimizedPct}%</span> fewer payments needed!
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
