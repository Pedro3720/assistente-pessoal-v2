"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, Pencil } from "lucide-react";

export type SelectOption = {
  value: string;
  label: string;
  icon?: string;
  color?: string;
};

/**
 * Seletor com painel próprio (via portal, como o modal do projeto), no lugar
 * do <select> nativo: mostra ícone e cor de cada opção e aceita um rodapé
 * (usado para "Nova categoria") e edição por item.
 */
export function SelectMenu({
  value,
  options,
  onChange,
  placeholder = "Selecionar",
  disabled = false,
  className = "",
  footer,
  onEditOption,
}: {
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  footer?: React.ReactNode;
  onEditOption?: (opt: SelectOption) => void;
}) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [busca, setBusca] = useState("");
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0 });
  const btnRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => setMounted(true), []);

  // a busca só existe em lista longa; zera ao fechar para não guardar filtro
  const comBusca = options.length > 8;
  useEffect(() => {
    if (!open) setBusca("");
  }, [open]);
  const visiveis =
    comBusca && busca.trim()
      ? options.filter((o) => o.label.toLowerCase().includes(busca.trim().toLowerCase()))
      : options;

  // posiciona o painel sob o botão; se não couber embaixo, abre para cima
  useLayoutEffect(() => {
    if (!open || !btnRef.current) return;
    const r = btnRef.current.getBoundingClientRect();
    const espacoAbaixo = window.innerHeight - r.bottom;
    const altura = Math.min(320, options.length * 40 + (footer ? 56 : 0) + 16);
    const largura = Math.max(r.width, 220);
    setPos({
      top: espacoAbaixo < altura + 8 ? Math.max(8, r.top - altura - 6) : r.bottom + 6,
      left: Math.max(8, Math.min(r.left, window.innerWidth - largura - 8)),
      width: largura,
    });
  }, [open, options.length, footer]);

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

  const selected = options.find((o) => o.value === value);

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={`flex items-center gap-1.5 rounded-lg border border-border bg-muted px-2 py-1.5 text-xs transition-colors hover:border-primary/40 disabled:opacity-50 ${className}`}
      >
        {selected?.color && (
          <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: selected.color }} />
        )}
        <span className={`min-w-0 flex-1 truncate text-left ${selected ? "" : "text-muted-foreground"}`}>
          {selected ? `${selected.icon ?? ""} ${selected.label}`.trim() : placeholder}
        </span>
        <ChevronDown className="h-3 w-3 shrink-0 text-muted-foreground" />
      </button>

      {mounted &&
        open &&
        createPortal(
          <div
            ref={panelRef}
            role="listbox"
            style={{ top: pos.top, left: pos.left, width: pos.width }}
            className="fixed z-[110] max-h-80 overflow-y-auto rounded-xl border border-border bg-popover p-1 shadow-2xl"
          >
            {comBusca && (
              <input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                autoFocus
                placeholder="Buscar..."
                className="mb-1 w-full rounded-lg border border-border bg-muted px-2 py-1.5 text-xs outline-none focus:border-primary/50"
              />
            )}
            {visiveis.length === 0 && (
              <p className="px-2 py-3 text-center text-xs text-muted-foreground">Nada encontrado.</p>
            )}
            {visiveis.map((o) => (
              <div key={o.value} className="group flex items-center gap-1">
                <button
                  type="button"
                  role="option"
                  aria-selected={o.value === value}
                  onClick={() => {
                    onChange(o.value);
                    setOpen(false);
                  }}
                  className="flex min-w-0 flex-1 items-center gap-2 rounded-lg px-2 py-2 text-left text-xs hover:bg-accent"
                >
                  {o.color && (
                    <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: o.color }} />
                  )}
                  {o.icon && <span className="shrink-0">{o.icon}</span>}
                  <span className="min-w-0 flex-1 truncate">{o.label}</span>
                  {o.value === value && <Check className="h-3.5 w-3.5 shrink-0 text-primary" />}
                </button>
                {onEditOption && o.value !== "" && (
                  <button
                    type="button"
                    onClick={() => onEditOption(o)}
                    aria-label={`Editar ${o.label}`}
                    className="shrink-0 rounded p-1.5 text-muted-foreground opacity-0 transition-opacity hover:bg-accent hover:text-foreground group-hover:opacity-100"
                  >
                    <Pencil className="h-3 w-3" />
                  </button>
                )}
              </div>
            ))}
            {footer && <div className="mt-1 border-t border-border pt-1">{footer}</div>}
          </div>,
          document.body
        )}
    </>
  );
}
