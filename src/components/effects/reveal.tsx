"use client";

import { useRef, type ReactNode } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger, useGSAP);

export function Reveal({
  children,
  className,
  y = 22,
  delay = 0,
  stagger = false,
}: {
  children: ReactNode;
  className?: string;
  y?: number;
  delay?: number;
  stagger?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const node = ref.current;
      if (!node) return;
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const targets: gsap.TweenTarget = stagger ? Array.from(node.children) : node;
      if (reduce) {
        gsap.set(targets, { opacity: 1, y: 0 });
        return;
      }
      gsap.from(targets, {
        opacity: 0,
        y,
        duration: 0.85,
        ease: "power3.out",
        delay,
        stagger: stagger ? 0.09 : 0,
        scrollTrigger: { trigger: node, start: "top 88%", once: true },
      });
    },
    { scope: ref }
  );

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
