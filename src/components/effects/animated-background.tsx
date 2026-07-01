"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

const VERT = /* glsl */ `
  void main() { gl_Position = vec4(position.xy, 0.0, 1.0); }
`;

const FRAG = /* glsl */ `
  precision highp float;
  uniform float u_time;
  uniform vec2 u_res;

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
    float t = u_time * 0.025;

    float f = fbm(p * 2.4 + vec2(t, t * 0.6));
    f += 0.5 * fbm(p * 4.2 - vec2(t * 0.7, t));

    vec3 base = vec3(0.027, 0.027, 0.043);
    vec3 blue = vec3(0.31, 0.55, 1.0);
    vec3 violet = vec3(0.55, 0.36, 0.96);

    vec3 col = base;
    col += blue * pow(smoothstep(0.35, 1.05, f), 2.0) * 0.30;
    col += violet * pow(smoothstep(0.45, 1.15, f + 0.2 * sin(u_time * 0.08)), 2.0) * 0.22;

    float d = distance(uv, vec2(0.5, 0.42));
    col *= 1.0 - d * 0.65;

    gl_FragColor = vec4(col, 1.0);
  }
`;

export function AnimatedBackground() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "low-power" });
    } catch {
      return; // sem WebGL → apenas o fundo CSS escuro
    }

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.setSize(window.innerWidth, window.innerHeight);
    el.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.Camera();
    const uniforms = {
      u_time: { value: 0 },
      u_res: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
    };
    const material = new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: FRAG, uniforms });
    const geometry = new THREE.PlaneGeometry(2, 2);
    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    let raf = 0;
    const start = performance.now();
    const loop = () => {
      uniforms.u_time.value = (performance.now() - start) / 1000;
      renderer.render(scene, camera);
      raf = requestAnimationFrame(loop);
    };
    const onResize = () => {
      renderer.setSize(window.innerWidth, window.innerHeight);
      uniforms.u_res.value.set(window.innerWidth, window.innerHeight);
    };
    window.addEventListener("resize", onResize);

    if (reduce) {
      uniforms.u_time.value = 10;
      renderer.render(scene, camera);
    } else {
      loop();
    }

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      geometry.dispose();
      material.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === el) el.removeChild(renderer.domElement);
    };
  }, []);

  return <div ref={ref} aria-hidden className="pointer-events-none fixed inset-0 z-0 opacity-90" />;
}
