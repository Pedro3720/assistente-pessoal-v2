"use client";

import { useEffect, useRef } from "react";
import { useTheme } from "next-themes";
import * as THREE from "three";

const VERT = /* glsl */ `
  void main() { gl_Position = vec4(position.xy, 0.0, 1.0); }
`;

const FRAG = /* glsl */ `
  precision highp float;
  uniform float u_time;
  uniform vec2  u_res;
  uniform vec2  u_mouse;    // 0..1 (y para cima)
  uniform vec3  u_base;     // cor de fundo
  uniform vec3  u_c1;       // cor primária da aurora
  uniform vec3  u_c2;       // cor secundária da aurora
  uniform float u_w1;       // intensidade da cor 1
  uniform float u_w2;       // intensidade da cor 2
  uniform float u_vig;      // força da vinheta
  uniform float u_mstr;     // força do halo do mouse

  vec2 hash(vec2 p){
    p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
    return -1.0 + 2.0 * fract(sin(p) * 43758.5453123);
  }
  float noise(vec2 p){
    vec2 i = floor(p); vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(dot(hash(i + vec2(0.0,0.0)), f - vec2(0.0,0.0)), dot(hash(i + vec2(1.0,0.0)), f - vec2(1.0,0.0)), u.x),
      mix(dot(hash(i + vec2(0.0,1.0)), f - vec2(0.0,1.0)), dot(hash(i + vec2(1.0,1.0)), f - vec2(1.0,1.0)), u.x),
      u.y);
  }
  float fbm(vec2 p){
    float v = 0.0; float a = 0.5;
    for (int i = 0; i < 5; i++){ v += a * noise(p); p *= 2.0; a *= 0.5; }
    return v;
  }

  void main(){
    vec2 uv = gl_FragCoord.xy / u_res.xy;
    vec2 p = uv;
    p.x *= u_res.x / u_res.y;
    vec2 m = u_mouse;
    m.x *= u_res.x / u_res.y;

    float t = u_time * 0.025;

    // o campo de névoa "deriva" levemente na direção do mouse (parallax vivo)
    vec2 drift = (u_mouse - 0.5) * 0.22;

    float f = fbm(p * 2.4 + vec2(t, t * 0.6) + drift);
    f += 0.5 * fbm(p * 4.2 - vec2(t * 0.7, t) - drift * 0.6);

    float s1 = pow(smoothstep(0.35, 1.05, f), 2.0);
    float s2 = pow(smoothstep(0.45, 1.15, f + 0.2 * sin(u_time * 0.08)), 2.0);

    vec3 col = u_base;
    col = mix(col, u_c1, s1 * u_w1);
    col = mix(col, u_c2, s2 * u_w2);

    // halo suave que segue o cursor
    float md = distance(p, m);
    float glow = exp(-md * md * 6.0) * u_mstr;
    col = mix(col, u_c1, glow);

    // vinheta (profundidade)
    float d = distance(uv, vec2(0.5, 0.42));
    col *= 1.0 - d * u_vig;

    gl_FragColor = vec4(col, 1.0);
  }
`;

// Paletas por tema — dark: aurora azul/violeta sobre near-black;
// light: névoa pastel azul/lilás sobre quase-branco.
const PALETTES = {
  dark: {
    base: [0.027, 0.027, 0.043],
    c1: [0.31, 0.55, 1.0],
    c2: [0.55, 0.36, 0.96],
    w1: 0.32,
    w2: 0.24,
    vig: 0.65,
    mstr: 0.1,
  },
  light: {
    base: [0.972, 0.976, 0.992],
    c1: [0.55, 0.71, 1.0],
    c2: [0.8, 0.7, 0.99],
    w1: 0.5,
    w2: 0.4,
    vig: 0.1,
    mstr: 0.18,
  },
} as const;

type Uniforms = {
  u_time: { value: number };
  u_res: { value: THREE.Vector2 };
  u_mouse: { value: THREE.Vector2 };
  u_base: { value: THREE.Vector3 };
  u_c1: { value: THREE.Vector3 };
  u_c2: { value: THREE.Vector3 };
  u_w1: { value: number };
  u_w2: { value: number };
  u_vig: { value: number };
  u_mstr: { value: number };
};

export function AnimatedBackground() {
  const ref = useRef<HTMLDivElement>(null);
  const { resolvedTheme } = useTheme();
  const uniformsRef = useRef<Uniforms | null>(null);
  const renderOnceRef = useRef<() => void>(() => {});

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "low-power" });
    } catch {
      return; // sem WebGL → fica o fundo CSS do tema
    }

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.setSize(window.innerWidth, window.innerHeight);
    el.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.Camera();
    const p = PALETTES.dark; // paleta inicial; o efeito de tema ajusta em seguida
    const uniforms: Uniforms = {
      u_time: { value: 0 },
      u_res: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
      u_mouse: { value: new THREE.Vector2(0.5, 0.5) },
      u_base: { value: new THREE.Vector3(...p.base) },
      u_c1: { value: new THREE.Vector3(...p.c1) },
      u_c2: { value: new THREE.Vector3(...p.c2) },
      u_w1: { value: p.w1 },
      u_w2: { value: p.w2 },
      u_vig: { value: p.vig },
      u_mstr: { value: p.mstr },
    };
    uniformsRef.current = uniforms;

    const material = new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: FRAG, uniforms });
    const geometry = new THREE.PlaneGeometry(2, 2);
    scene.add(new THREE.Mesh(geometry, material));

    renderOnceRef.current = () => renderer.render(scene, camera);

    // mouse com suavização (lerp) — o fundo "respira" atrás do cursor
    const target = new THREE.Vector2(0.5, 0.5);
    const onPointer = (e: PointerEvent) => {
      target.set(e.clientX / window.innerWidth, 1 - e.clientY / window.innerHeight);
    };

    let raf = 0;
    const start = performance.now();
    const loop = () => {
      uniforms.u_time.value = (performance.now() - start) / 1000;
      uniforms.u_mouse.value.lerp(target, 0.06);
      renderer.render(scene, camera);
      raf = requestAnimationFrame(loop);
    };

    const onResize = () => {
      renderer.setSize(window.innerWidth, window.innerHeight);
      uniforms.u_res.value.set(window.innerWidth, window.innerHeight);
      if (reduce) renderOnceRef.current();
    };
    const onVisibility = () => {
      if (reduce) return;
      cancelAnimationFrame(raf);
      if (!document.hidden) raf = requestAnimationFrame(loop);
    };

    window.addEventListener("resize", onResize);
    document.addEventListener("visibilitychange", onVisibility);

    if (reduce) {
      uniforms.u_time.value = 10;
      renderer.render(scene, camera);
    } else {
      window.addEventListener("pointermove", onPointer);
      loop();
    }

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("pointermove", onPointer);
      document.removeEventListener("visibilitychange", onVisibility);
      uniformsRef.current = null;
      renderOnceRef.current = () => {};
      geometry.dispose();
      material.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === el) el.removeChild(renderer.domElement);
    };
  }, []);

  // troca de paleta ao alternar o tema (sem recriar o WebGL)
  useEffect(() => {
    const u = uniformsRef.current;
    if (!u) return;
    const p = resolvedTheme === "light" ? PALETTES.light : PALETTES.dark;
    u.u_base.value.set(p.base[0], p.base[1], p.base[2]);
    u.u_c1.value.set(p.c1[0], p.c1[1], p.c1[2]);
    u.u_c2.value.set(p.c2[0], p.c2[1], p.c2[2]);
    u.u_w1.value = p.w1;
    u.u_w2.value = p.w2;
    u.u_vig.value = p.vig;
    u.u_mstr.value = p.mstr;
    renderOnceRef.current(); // garante o frame certo mesmo com reduced-motion
  }, [resolvedTheme]);

  return <div ref={ref} aria-hidden className="pointer-events-none fixed inset-0 z-0 opacity-90" />;
}
