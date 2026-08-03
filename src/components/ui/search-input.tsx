// src/components/ui/search-input.tsx
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

export function SearchInput({
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className={cn("flex items-center gap-2 rounded-full bg-muted px-3 py-2", className)}>
      <Search className="h-3.5 w-3.5 shrink-0 text-subtle-foreground" strokeWidth={1.5} />
      <input
        type="search"
        className="min-w-0 flex-1 bg-transparent text-xs outline-none placeholder:text-subtle-foreground"
        {...props}
      />
    </label>
  );
}
