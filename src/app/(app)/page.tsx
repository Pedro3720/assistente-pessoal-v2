import { Link } from "next-view-transitions";
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
import { AnimatedNumber } from "@/components/effects/animated-number";
import { Pressable } from "@/components/effects/pressable";
import { EmptyState } from "@/components/effects/empty-state";

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
    { label: "Saldo do mês", value: data.finance.balance, currency: true, href: "/financas", icon: Wallet, tone: data.finance.balance < 0 ? "text-negative" : "text-foreground" },
    { label: "Eventos hoje", value: data.eventsTodayCount, currency: false, href: "/calendario", icon: Calendar, tone: "text-foreground" },
    { label: "Tarefas pendentes", value: data.pendingCount, currency: false, href: "/tarefas", icon: ListChecks, tone: "text-foreground" },
    { label: "Faturas abertas", value: data.finance.invoices, currency: true, href: "/financas", icon: CreditCard, tone: "text-amber-600 dark:text-amber-400" },
  ];

  return (
    <div className="max-w-5xl space-y-5 md:space-y-8">
      {/* header */}
      <Reveal>
        <p className="mb-1 text-sm text-muted-foreground">
          {greeting}, {displayName}
        </p>
        <h1 className="text-gradient-animated text-3xl md:text-4xl font-extrabold leading-none tracking-tighter" style={{ fontFamily: "var(--font-display)" }}>
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
      {/* stagger sem deslocamento vertical (y=0): fade-in em cascata sem tirar os cards
          do lugar, evitando o desalinhamento visual no mobile durante a entrada (#26) */}
      <Reveal stagger y={0} className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <Pressable key={s.label} hoverScale={1}>
            <Link href={s.href} className="group glass card-glow flex h-full flex-col justify-between gap-4 rounded-2xl border border-border p-4 md:gap-6 md:p-5">
              <div className="flex items-center justify-between">
                <Icon className="h-4 w-4 text-muted-foreground/60" strokeWidth={1.5} />
                <ArrowRight className="h-3.5 w-3.5 -translate-x-1 text-muted-foreground/0 transition-all group-hover:translate-x-0 group-hover:text-primary" />
              </div>
              <div>
                <AnimatedNumber
                  value={s.value}
                  currency={s.currency}
                  className={`block text-xl font-semibold leading-none tracking-tight md:text-2xl ${s.tone}`}
                />
                <p className="mt-2 flex min-h-8 items-start text-xs leading-tight text-muted-foreground">{s.label}</p>
              </div>
            </Link>
            </Pressable>
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
              <EmptyState lottie="/lottie/empty-events.lottie" className="px-6 py-12">
                <p className="text-center text-sm text-muted-foreground">Nenhum evento próximo.</p>
              </EmptyState>
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
                <span className="flex items-center gap-1.5 text-muted-foreground"><TrendingUp className="h-3.5 w-3.5 text-positive" /> Receitas</span>
                <AnimatedNumber value={data.finance.income} currency className="font-medium" />
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-accent">
                <div className="bar-grow h-1.5 rounded-full bg-positive" style={{ width: `${incPct}%` }} />
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 text-muted-foreground"><TrendingDown className="h-3.5 w-3.5 text-negative" /> Despesas</span>
                <AnimatedNumber value={data.finance.expense} currency className="font-medium" />
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-accent">
                <div className="bar-grow h-1.5 rounded-full bg-negative" style={{ width: `${expPct}%` }} />
              </div>
            </div>
            <div className="mt-2 flex items-center justify-between border-t border-border pt-3">
              <span className="text-xs text-muted-foreground">Saldo do mês</span>
              <AnimatedNumber value={data.finance.balance} currency className={`text-sm font-bold ${data.finance.balance < 0 ? "text-negative" : "text-positive"}`} />
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
              <EmptyState lottie="/lottie/empty-tasks.lottie" className="px-6 py-12">
                <p className="text-center text-sm text-muted-foreground">Nada pendente. 🎉</p>
              </EmptyState>
            ) : (
              data.topTasks.map((t) => {
                const overdue = t.due_on && t.due_on < data.today;
                return (
                  <div key={t.id} className="flex items-center gap-4 px-6 py-3.5 transition-colors hover:bg-accent/50">
                    <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: PRIORITY_META[t.priority].dot }} />
                    <p className="min-w-0 flex-1 truncate text-sm font-medium">{t.title}</p>
                    {t.category && (
                      <span
                        className="hidden shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium sm:flex"
                        style={{ backgroundColor: `${t.category.color}22`, color: t.category.color }}
                      >
                        <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: t.category.color }} />
                        {t.category.name}
                      </span>
                    )}
                    {t.due_on && (
                      <span className={`shrink-0 text-xs ${overdue ? "font-medium text-negative" : "text-muted-foreground"}`}>
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
      <h1 className="text-3xl md:text-4xl font-extrabold leading-none tracking-tighter" style={{ fontFamily: "var(--font-display)" }}>
        Seu Painel
      </h1>
      <div className="mt-6 rounded-xl border border-amber-300 bg-amber-50 p-6 text-sm text-amber-900 dark:border-amber-300/40 dark:bg-amber-500/10 dark:text-amber-300">
        <p className="font-semibold">Não foi possível montar o painel.</p>
        <p className="mt-1 font-mono text-xs opacity-80">{message}</p>
        <p className="mt-3">
          O painel lê as tabelas de Finanças, Calendário e Tarefas. Verifique se as três migrações
          já foram rodadas no SQL Editor do Supabase.
        </p>
      </div>
    </div>
  );
}
