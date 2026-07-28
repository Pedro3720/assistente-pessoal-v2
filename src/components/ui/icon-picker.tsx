"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown } from "lucide-react";
import { ICON_GROUPS } from "@/lib/icons/catalog";
import { BANKS, bankLogoSrc } from "@/lib/finance/banks";
import { EntityIcon } from "./entity-icon";

type Aba = "bancos" | "icones";

/**
 * Seletor visual de ícone, no lugar do campo onde se digitava um emoji.
 *
 * Com `withBanks`, ganha a aba de bancos (usada no cadastro de conta), que
 * grava "bank:<slug>". A aba de ícones grava o nome do ícone do catálogo.
 * O painel abre via portal, como as demais camadas flutuantes do projeto.
 */
export function IconPicker({
  value,
  onChange,
  withBanks = false,
  fallback = "tag",
}: {
  value: string;
  onChange: (value: string) => void;
  withBanks?: boolean;
  fallback?: "bank" | "subscription" | "tag";
}) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [aba, setAba] = useState<Aba>(withBanks ? "bancos" : "icones");
  const [busca, setBusca] = useState("");
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0 });
  const btnRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (!open) setBusca("");
  }, [open]);

  useLayoutEffect(() => {
    if (!open || !btnRef.current) return;
    const r = btnRef.current.getBoundingClientRect();
    const largura = Math.min(320, window.innerWidth - 16);
    const altura = 340;
    const espacoAbaixo = window.innerHeight - r.bottom;
    setPos({
      top: espacoAbaixo < altura + 8 ? Math.max(8, r.top - altura - 6) : r.bottom + 6,
      left: Math.max(8, Math.min(r.left, window.innerWidth - largura - 8)),
      width: largura,
    });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!panelRef.current?.contains(t) && !btnRef.current?.contains(t)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onDown);
    };
  }, [open]);

  const termo = busca.trim().toLowerCase();
  const bancosVisiveis = termo ? BANKS.filter((b) => b.nome.toLowerCase().includes(termo)) : BANKS;
  const gruposVisiveis = termo
    ? ICON_GROUPS.map((g) => ({
        ...g,
        itens: g.itens.filter(
          (i) => i.rotulo.toLowerCase().includes(termo) || i.nome.includes(termo)
        ),
      })).filter((g) => g.itens.length > 0)
    : ICON_GROUPS;

  function escolher(v: string) {
    onChange(v);
    setOpen(false);
  }

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label="Escolher ícone"
        className="flex h-10 w-14 shrink-0 items-center justify-center gap-1 rounded-lg border border-border bg-muted transition-colors hover:border-primary/40"
      >
        <EntityIcon value={value} fallback={fallback} className="h-6 w-6 rounded-full" size={18} />
        <ChevronDown className="h-3 w-3 text-muted-foreground" />
      </button>

      {mounted &&
        open &&
        createPortal(
          <div
            ref={panelRef}
            role="dialog"
            aria-label="Escolher ícone"
            style={{ top: pos.top, left: pos.left, width: pos.width }}
            className="fixed z-[120] rounded-xl border border-border bg-popover p-2 shadow-2xl"
          >
            {withBanks && (
              <div className="mb-2 flex gap-1 rounded-lg bg-muted p-0.5">
                {(["bancos", "icones"] as const).map((a) => (
                  <button
                    key={a}
                    type="button"
                    onClick={() => setAba(a)}
                    className={`flex-1 rounded-md px-2 py-1 text-xs font-medium transition-colors ${
                      aba === a ? "bg-popover text-foreground shadow-sm" : "text-muted-foreground"
                    }`}
                  >
                    {a === "bancos" ? "Bancos" : "Ícones"}
                  </button>
                ))}
              </div>
            )}

            <input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar..."
              className="mb-2 w-full rounded-lg border border-border bg-muted px-2 py-1.5 text-xs outline-none focus:border-primary/50"
            />

            <div className="max-h-64 overflow-y-auto">
              {withBanks && aba === "bancos" ? (
                <div className="grid grid-cols-5 gap-1.5">
                  {bancosVisiveis.map((b) => {
                    const v = `bank:${b.slug}`;
                    return (
                      <button
                        key={b.slug}
                        type="button"
                        onClick={() => escolher(v)}
                        title={b.nome}
                        aria-label={b.nome}
                        className={`relative flex flex-col items-center gap-1 rounded-lg p-1.5 transition-colors hover:bg-accent ${
                          value === v ? "bg-accent" : ""
                        }`}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element -- SVG local e estático */}
                        <img src={bankLogoSrc(b.slug)} alt="" className="h-8 w-8 rounded-full" />
                        <span className="w-full truncate text-[9px] leading-tight text-muted-foreground">
                          {b.nome}
                        </span>
                        {value === v && (
                          <Check className="absolute right-0 top-0 h-3 w-3 text-primary" />
                        )}
                      </button>
                    );
                  })}
                  {bancosVisiveis.length === 0 && (
                    <p className="col-span-5 py-4 text-center text-xs text-muted-foreground">
                      Nenhum banco encontrado.
                    </p>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  {gruposVisiveis.map((g) => (
                    <div key={g.grupo}>
                      <p className="mb-1 px-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                        {g.grupo}
                      </p>
                      <div className="grid grid-cols-6 gap-1">
                        {g.itens.map(({ nome, rotulo, Icon }) => (
                          <button
                            key={nome}
                            type="button"
                            onClick={() => escolher(nome)}
                            title={rotulo}
                            aria-label={rotulo}
                            className={`flex h-9 items-center justify-center rounded-lg transition-colors hover:bg-accent ${
                              value === nome ? "bg-primary/15 text-primary" : "text-foreground"
                            }`}
                          >
                            <Icon className="h-4 w-4" strokeWidth={1.8} />
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                  {gruposVisiveis.length === 0 && (
                    <p className="py-4 text-center text-xs text-muted-foreground">
                      Nenhum ícone encontrado.
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
