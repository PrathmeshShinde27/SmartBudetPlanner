export default function StatCard({ label, value, tone = 'default', icon: Icon }) {
  const tones = {
    default: 'bg-white dark:bg-zinc-900',
    good: 'bg-mint/80 dark:bg-emerald-950',
    warn: 'bg-[#fff3cf] dark:bg-amber-950',
    hot: 'bg-[#ffe1d8] dark:bg-red-950'
  };

  return (
    <div className={`panel p-4 ${tones[tone]}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">{label}</p>
          <p className="mt-2 text-2xl font-semibold">{value}</p>
        </div>
        {Icon ? (
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-black/5 dark:bg-white/10">
            <Icon size={20} />
          </div>
        ) : null}
      </div>
    </div>
  );
}
