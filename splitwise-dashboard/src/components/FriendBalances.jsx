import { ArrowUpRight, ArrowDownRight, ChevronRight } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts';
import { formatCurrency, formatCompact } from '../utils/analytics';

export default function FriendBalances({ friends, onSelectFriend }) {
  const owedToYou = friends.filter(f => f.balance > 0);
  const youOwe = friends.filter(f => f.balance < 0);

  const chartData = friends
    .slice(0, 12)
    .map(f => ({
      name: f.name.split(' ')[0],
      balance: Math.round(f.balance),
    }));

  function FriendRow({ f, colorClass }) {
    return (
      <button
        key={f.id}
        onClick={() => onSelectFriend?.(f)}
        className="w-full flex items-center gap-3 py-2.5 px-2 rounded-lg hover:bg-stone-800/30 transition-colors text-left group"
      >
        {f.picture ? (
          <img src={f.picture} className="w-8 h-8 rounded-full" alt="" />
        ) : (
          <div className="w-8 h-8 rounded-full bg-stone-700 flex items-center justify-center text-xs text-stone-400 font-medium">
            {f.name[0]}
          </div>
        )}
        <span className="flex-1 text-sm text-stone-300">{f.name}</span>
        <span className={`text-sm font-mono ${colorClass}`}>
          {formatCurrency(Math.abs(f.balance))}
        </span>
        <ChevronRight size={12} className="text-stone-600 opacity-0 group-hover:opacity-100 transition-opacity" />
      </button>
    );
  }

  return (
    <div className="space-y-6">
      {/* Balance Chart */}
      <div className="glass-card p-6">
        <h3 className="font-display text-lg text-stone-200 mb-4">Balance Overview</h3>
        {chartData.length > 0 ? (
          <div className="h-64">
            <ResponsiveContainer>
              <BarChart data={chartData} margin={{ top: 5, right: 5, bottom: 0, left: -10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(120,113,108,0.1)" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#78716c' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#78716c' }} axisLine={false} tickLine={false} tickFormatter={v => formatCompact(v)} />
                <Tooltip formatter={(value) => [formatCurrency(value), 'Balance']} />
                <Bar dataKey="balance" radius={[4, 4, 0, 0]} maxBarSize={36}>
                  {chartData.map((entry, i) => (
                    <Cell key={i} fill={entry.balance >= 0 ? '#10b981' : '#ef4444'} fillOpacity={0.8} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="text-sm text-stone-500 py-8 text-center">No outstanding balances</p>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* They owe you */}
        <div className="glass-card p-6">
          <h3 className="font-display text-base text-stone-200 mb-1 flex items-center gap-2">
            <ArrowDownRight size={16} className="text-emerald-400" />
            They Owe You
          </h3>
          <p className="text-xs text-stone-500 mb-4">
            Total: {formatCurrency(owedToYou.reduce((s, f) => s + f.balance, 0))}
          </p>
          {owedToYou.length === 0 ? (
            <p className="text-sm text-stone-500 py-4 text-center">Nobody owes you</p>
          ) : (
            <div className="space-y-1">
              {owedToYou.map(f => <FriendRow key={f.id} f={f} colorClass="text-emerald-400" />)}
            </div>
          )}
        </div>

        {/* You owe them */}
        <div className="glass-card p-6">
          <h3 className="font-display text-base text-stone-200 mb-1 flex items-center gap-2">
            <ArrowUpRight size={16} className="text-red-400" />
            You Owe Them
          </h3>
          <p className="text-xs text-stone-500 mb-4">
            Total: {formatCurrency(Math.abs(youOwe.reduce((s, f) => s + f.balance, 0)))}
          </p>
          {youOwe.length === 0 ? (
            <p className="text-sm text-stone-500 py-4 text-center">You don't owe anyone</p>
          ) : (
            <div className="space-y-1">
              {youOwe.map(f => <FriendRow key={f.id} f={f} colorClass="text-red-400" />)}
            </div>
          )}
        </div>
      </div>

      <p className="text-[10px] text-stone-600 text-center">Click on a friend to see your full expense history together</p>
    </div>
  );
}
