import { useEffect, useMemo, useRef } from 'react';
import { Binary, Eye, Ghost, Skull, Terminal } from '../icons.jsx';

const ICONS = [Ghost, Skull, Eye, Terminal, Binary];

function rand(min, max) {
  return min + Math.random() * (max - min);
}

export function LoginGhostField({ count = 16 }) {
  const fieldRef = useRef(null);

  const particles = useMemo(
    () =>
      Array.from({ length: count }, () => ({
        Icon: ICONS[Math.floor(Math.random() * ICONS.length)],
        size: Math.round(rand(20, 52)),
        opacity: rand(0.05, 0.14),
        x: rand(0, 100),
        y: rand(0, 100),
        vx: rand(-0.0007, 0.0007),
        vy: rand(-0.0026, -0.0008),
        rot: rand(0, 360),
        vr: rand(-0.009, 0.009)
      })),
    [count]
  );

  useEffect(() => {
    const field = fieldRef.current;
    if (!field) return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;

    const nodes = Array.from(field.children);
    const state = particles.map((p) => ({ ...p }));
    let raf;
    let last = performance.now();

    function tick(now) {
      const dt = Math.min(now - last, 48);
      last = now;
      for (let i = 0; i < state.length; i += 1) {
        const p = state[i];
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.rot += p.vr * dt;

        if (p.y < -12) {
          p.y = 112;
          p.x = rand(0, 100);
        }
        if (p.x < -12) p.x = 112;
        if (p.x > 112) p.x = -12;

        const el = nodes[i];
        el.style.left = `${p.x}%`;
        el.style.top = `${p.y}%`;
        el.style.transform = `translate(-50%, -50%) rotate(${p.rot}deg)`;
      }
      raf = requestAnimationFrame(tick);
    }

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [particles]);

  return (
    <div className="login-ghost-field" ref={fieldRef} aria-hidden="true">
      {particles.map((p, i) => (
        <p.Icon
          key={i}
          size={p.size}
          className="login-ghost-particle"
          style={{ left: `${p.x}%`, top: `${p.y}%`, opacity: p.opacity }}
        />
      ))}
    </div>
  );
}
