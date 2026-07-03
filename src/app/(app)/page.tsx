import Link from "next/link";
import {
  Wallet, Calendar, ListChecks, CreditCard, Clock, ArrowRight,
  TrendingUp, TrendingDown,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getDashboardData, type DashboardData } from "@/lib/data/dashboard";
import { getProfile } from "@/lib/data/profile";
import { formatDateBR } from "@/lib/dates";
import { PRIORITY_META } from "@/lib/tasks/constants";
import { Reveal } from "@/components/effects/reveal";
import { CountUp } from "@/components/effects/count-up";

const WD = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function weekdayOf(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  return WD[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
}

function spHour(): number {
  return Number(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "America/Sao_Paulo",
      hour: "2-digit",
      hourCycle: "h23",
    }).format(new Date())
  );
}

function nextDay(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + 1));
  return `${t.getUTCFullYear()}-${String(t.getUTCMonth() + 1).padStart(2, "0")}-${String(t.getUTCDate()).padStart(2, "0")}`;
}

export default async function Dashboard() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const profile = await getProfile();
  const displayName = profile?.display_name || user?.email?.split("@")[0] || "";

  let data: DashboardData;
  try {
    data = await getDashboardData();
  } catch (e) {
    return <DashboardError message={e instanceof Error ? e.message : "Erro desconhecido"} />;
  }

  const h = spHour();
  const greeting = h < 12 ? "Bom dia" : h < 18 ? "Boa tarde" : "Boa noite";
  const tomorrow = nextDay(data.today);
  const dayLabel = (date: string) =>
    date === data.today ? "Hoje" : date === tomorrow ? "Amanhã" : formatDateBR(date);

  const totalMov = data.finance.income + data.finance.expense;
  const incPct = totalMov > 0 ? (data.finance.income / totalMov) * 100 : 0;
  const expPct = totalMov > 0 ? (data.finance.expense / totalMov) * 100 : 0;

  const stats = [
    { label: "Saldo do mês", value: data.finance.balance, currency: true, href: "/financas", icon: Wallet, tone: data.finance.balance < 0 ? "text-red-600 dark:text-red-400" : "text-foreground" },
    { label: "Eventos hoje", value: data.eventsTodayCount, currency: false, href: "/calendario", icon: Calendar, tone: "text-foreground" },
    { label: "Tarefas pendentes", value: data.pendingCount, currency: false, href: "/tarefas", icon: ListChecks, tone: "text-foreground" },
    { label: "Faturas abertas", value: data.finance.invoices, currency: true, href: "/financas", icon: CreditCard, tone: "text-amber-600 dark:text-amber-400" },
  ];

  return (
    <div className="max-w-5xl space-y-8">
      {/* header */}
      <Reveal>
        <p className="mb-1 text-sm text-muted-foreground">
          {greeting}, {displayName} —
        </p>
        <h1 className="text-gradient text-4xl font-extrabold leading-none tracking-tighter" style={{ fontFamily: "var(--font-display)" }}>
          Seu Painel
        </h1>
      </Reveal>

      {/* semana */}
      <Reveal>
        <div className="glass card-glow rounded-2xl border border-border px-4 py-3">
          <div className="grid grid-cols-7 gap-2">
            {data.week.map((d) => (
              <Link
                key={d.date}
                href="/calendario"
                className={`flex flex-col items-center gap-2 rounded-xl px-1 py-3 text-center transition-colors ${
                  d.isToday ? "bg-primary/10 hover:bg-primary/20" : "hover:bg-accent"
                }`}
              >
                <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                  {weekdayOf(d.date)}
                </span>
                <span className={`flex h-7 w-7 items-center justify-center rounded-full text-sm font-semibold transition-transform ${d.isToday ? "bg-primary text-primary-foreground shadow-[0_0_18px_-2px_var(--primary)]" : "text-foreground"}`}>
                  {d.day}
                </span>
                <span className={`h-1.5 w-1.5 rounded-full ${d.hasEvents ? "bg-primary pulse-glow" : "bg-transparent"}`} />
              </Link>
            ))}
          </div>
        </div>
      </Reveal>

      {/* stat cards */}
      <Reveal stagger className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <Link key={s.label} href={s.href} className="group glass card-glow flex flex-col justify-between gap-6 rounded-2xl border border-border p-5">
              <div className="flex items-center justify-between">
                <Icon className="h-4 w-4 text-muted-foreground/60" strokeWidth={1.5} />
                <ArrowRight className="h-3.5 w-3.5 -translate-x-1 text-muted-foreground/0 transition-all group-hover:translate-x-0 group-hover:text-primary" />
              </div>
              <div>
                <CountUp
                  value={s.value}
                  currency={s.currency}
                  className={`block text-2xl font-semibold leading-none tracking-tight ${s.tone}`}
                />
                <p className="mt-2 text-xs text-muted-foreground">{s.label}</p>
              </div>
            </Link>
          );
        })}
      </Reveal>

      <Reveal stagger className="grid grid-cols-1 gap-5 lg:grid-cols-5">
        {/* próximos eventos */}
        <div className="glass card-glow overflow-hidden rounded-2xl border border-border lg:col-span-3">
          <div className="flex items-center justify-between border-b border-border px-6 py-5">
            <h2 className="text-base font-bold tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
              Próximos Eventos
            </h2>
            <Link href="/calendario" className="flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground">
              Ver todos <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="divide-y divide-border">
            {data.upcoming.length === 0 ? (
              <p className="px-6 py-12 text-center text-sm text-muted-foreground">Nenhum evento próximo.</p>
            ) : (
              data.upcoming.map((o) => (
                <div key={o.key} className="flex items-center gap-4 px-6 py-4 transition-colors hover:bg-accent/50">
                  <div className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: o.event.color, boxShadow: `0 0 10px -1px ${o.event.color}` }} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{o.event.title}</p>
                    <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3 shrink-0" />
                      {dayLabel(o.date)} · {o.time}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* finanças mini */}
        <div className="glass card-glow flex flex-col overflow-hidden rounded-2xl border border-border lg:col-span-2">
          <div className="border-b border-border px-6 py-5">
            <h2 className="text-base font-bold tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
              Finanças
            </h2>
          </div>
          <div className="flex flex-1 flex-col justify-center gap-4 p-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 text-muted-foreground"><TrendingUp className="h-3.5 w-3.5 text-green-600 dark:text-green-400" /> Receitas</span>
                <CountUp value={data.finance.income} currency className="font-medium" />
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-accent">
                <div className="bar-grow h-1.5 rounded-full bg-green-500" style={{ width: `${incPct}%` }} />
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 text-muted-foreground"><TrendingDown className="h-3.5 w-3.5 text-red-600 dark:text-red-400" /> Despesas</span>
                <CountUp value={data.finance.expense} currency className="font-medium" />
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-accent">
                <div className="bar-grow h-1.5 rounded-full bg-red-500" style={{ width: `${expPct}%` }} />
              </div>
            </div>
            <div className="mt-2 flex items-center justify-between border-t border-border pt-3">
              <span className="text-xs text-muted-foreground">Saldo do mês</span>
              <CountUp value={data.finance.balance} currency className={`text-sm font-bold ${data.finance.balance < 0 ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400"}`} />
            </div>
          </div>
        </div>
      </Reveal>

      {/* tarefas pendentes */}
      <Reveal>
        <div className="glass card-glow overflow-hidden rounded-2xl border border-border">
          <div className="flex items-center justify-between border-b border-border px-6 py-5">
            <h2 className="text-base font-bold tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
              Tarefas Pendentes
            </h2>
            <Link href="/tarefas" className="flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground">
              Ver todas <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="divide-y divide-border">
            {data.topTasks.length === 0 ? (
              <p className="px-6 py-12 text-center text-sm text-muted-foreground">Nada pendente. 🎉</p>
            ) : (
              data.topTasks.map((t) => {
                const overdue = t.due_on && t.due_on < data.today;
                return (
                  <div key={t.id} className="flex items-center gap-4 px-6 py-3.5 transition-colors hover:bg-accent/50">
                    <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: PRIORITY_META[t.priority].dot }} />
                    <p className="min-w-0 flex-1 truncate text-sm font-medium">{t.title}</p>
                    {t.due_on && (
                      <span className={`shrink-0 text-xs ${overdue ? "font-medium text-red-600 dark:text-red-400" : "text-muted-foreground"}`}>
                        {formatDateBR(t.due_on)}
                      </span>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </Reveal>
    </div>
  );
}

function DashboardError({ message }: { message: string }) {
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-4xl font-extrabold leading-none tracking-tighter" style={{ fontFamily: "var(--font-display)" }}>
        Seu Painel
      </h1>
      <div className="mt-6 rounded-xl border border-amber-300 bg-amber-50 p-6 text-sm text-amber-900 dark:border-amber-300/40 dark:bg-amber-500/10 dark:text-amber-300">
        <p className="font-semibold">Não foi possível montar o painel.</p>
        <p className="mt-1 font-mono text-xs opacity-80">{message}</p>
        <p className="mt-3">
          O painel lê as tabelas de Finanças, Calendário e Tarefas — verifique se as três migrações
          já foram rodadas no SQL Editor do Supabase.
        </p>
      </div>
    </div>
  );
}
