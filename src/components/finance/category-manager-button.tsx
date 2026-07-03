"use client";

import { useState } from "react";
import { Tags } from "lucide-react";
import { CategoryManager } from "./category-manager";
import type { Category } from "@/types/finance";

export function CategoryManagerButton({ categories }: { categories: Category[] }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-primary hover:bg-accent"
      >
        <Tags className="h-3.5 w-3.5" /> Gerenciar
      </button>
      {open && <CategoryManager categories={categories} onClose={() => setOpen(false)} />}
    </>
  );
}
