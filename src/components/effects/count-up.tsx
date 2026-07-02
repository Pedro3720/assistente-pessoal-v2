"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { formatBRL } from "@/lib/money";

export function CountUp({
  value,
  currency = false,
  className,
  style,
}: {
  value: number;
  currency?: boolean;
  className?: string;
  style?: React.CSSProperties;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const fmt = (n: number) => (currency ? formatBRL(n) : Math.round(n).toLocaleString("pt-BR"));

  useGSAP(
    () => {
      const node = ref.current;
      if (!node) return;
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (reduce) {
        node.textContent = fmt(value);
        return;
      }
      const obj = { v: 0 };
      gsap.to(obj, {
        v: value,
        duration: 1.1,
        ease: "power2.out",
        onUpdate: () => {
          if (ref.current) ref.current.textContent = fmt(obj.v);
        },
      });
    },
    { dependencies: [value] }
  );

  return (
    <span ref={ref} className={`num ${className ?? ""}`} style={style}>
      {fmt(value)}
    </span>
  );
}
