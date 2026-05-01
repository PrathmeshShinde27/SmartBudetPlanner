import { BarChart3, ShieldCheck, TrendingUp, WalletCards } from 'lucide-react';

export default function AuthShell({ children }) {
  return (
    <main className="min-h-screen bg-[#07111f] text-white">
      <div className="grid min-h-screen gap-8 px-5 py-8 lg:grid-cols-[1fr_0.95fr] lg:px-16">
        <section className="flex flex-col justify-center">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-sky-400 text-slate-950">
              <BarChart3 />
            </div>
            <div>
              <p className="text-sm font-semibold">Smart Budget Planner</p>
              <p className="text-xs text-sky-200">by Prathmesh Shinde</p>
            </div>
          </div>

          <p className="mt-16 text-xs font-semibold uppercase tracking-[0.45em] text-sky-300">Personal finance stack</p>
          <h1 className="mt-5 max-w-2xl text-5xl font-black leading-[0.95] tracking-normal text-white sm:text-6xl xl:text-7xl">
            Plan money with clarity, not guesswork.
          </h1>
          <p className="mt-6 max-w-xl text-base leading-8 text-sky-100">
            Create monthly income plans, split spending into Needs, Wants, and Savings, track daily expenses, and keep every month accountable.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            {[
              ['React', TrendingUp],
              ['PostgreSQL', WalletCards],
              ['JWT Auth', ShieldCheck],
              ['Excel Export', BarChart3]
            ].map(([label, Icon]) => (
              <span key={label} className="inline-flex items-center gap-2 rounded-full border border-sky-300/20 bg-white/5 px-4 py-2 text-sm text-sky-50">
                <Icon size={15} />
                {label}
              </span>
            ))}
          </div>

          <a className="mt-12 text-sm font-medium text-sky-300 hover:text-white" href="https://prathmeshshinde.com" target="_blank" rel="noreferrer">
            Built by Prathmesh Shinde · prathmeshshinde.com
          </a>
        </section>

        <section className="flex items-center justify-center">
          {children}
        </section>
      </div>
    </main>
  );
}
