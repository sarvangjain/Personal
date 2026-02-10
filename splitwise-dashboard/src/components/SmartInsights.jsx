import { Lightbulb } from 'lucide-react';

export default function SmartInsights({ insights }) {
  if (!insights || insights.length === 0) return null;

  return (
    <div className="glass-card p-6">
      <h3 className="font-display text-base text-stone-200 mb-4 flex items-center gap-2">
        <Lightbulb size={15} className="text-amber-400" /> Smart Insights
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {insights.map((insight, i) => (
          <div
            key={i}
            className="p-3.5 bg-stone-800/30 rounded-xl border border-stone-800/30 hover:border-stone-700/40 transition-colors"
            style={{ animationDelay: `${i * 80}ms` }}
          >
            <div className="flex items-start gap-2.5">
              <span className="text-lg leading-none mt-0.5">{insight.icon}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-stone-300 leading-tight">{insight.title}</p>
                <p className="text-[11px] text-stone-500 mt-1 leading-relaxed">{insight.desc}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
