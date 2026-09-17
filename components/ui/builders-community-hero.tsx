'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { animate, motion } from 'framer-motion';
import { ArrowUp, CircleCheck } from 'lucide-react';

const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

export type OrbitRing = 'outer' | 'inner';

interface OrbitBase {
  ring: OrbitRing;
  angle: number;
}

export interface OrbitAvatarItem extends OrbitBase {
  kind: 'avatar';
  src: string;
  alt?: string;
  color: string;
  size?: number;
}

export interface OrbitPillItem extends OrbitBase {
  kind: 'pill';
  /** Icon or emoji before label */
  icon: ReactNode;
  label: string;
}

export interface OrbitCardItem extends OrbitBase {
  kind: 'card';
  emoji: string;
  badge?: string | number;
}

export interface OrbitStatusItem extends OrbitBase {
  kind: 'status';
  label: string;
}

export interface OrbitCheckItem extends OrbitBase {
  kind: 'check';
}

export type OrbitItem =
  | OrbitAvatarItem
  | OrbitPillItem
  | OrbitCardItem
  | OrbitStatusItem
  | OrbitCheckItem;

export interface OrbitStat {
  value: string;
  label: string;
}

export interface OrbitTag {
  icon: ReactNode;
  label: string;
  href?: string;
  onClick?: () => void;
}

export interface CommunityOrbitProps {
  items: OrbitItem[];
  stats: OrbitStat[];
  headline: ReactNode;
  subheadline?: ReactNode;
  tags?: OrbitTag[];
  minScale?: number;
  className?: string;
}

const STAGE_W = 1200;
const STAGE_H = 490;
const CENTER = { x: 600, y: 620 };
const RADIUS: Record<OrbitRing, number> = { outer: 492, inner: 404 };

function positionOnRing(ring: OrbitRing, angle: number): CSSProperties {
  const rad = (angle * Math.PI) / 180;
  const r = RADIUS[ring];
  return {
    left: CENTER.x + r * Math.cos(rad),
    top: CENTER.y - r * Math.sin(rad),
  };
}

function arcPath(r: number) {
  const dy = CENTER.y - STAGE_H;
  const dx = Math.sqrt(r * r - dy * dy);
  return `M ${CENTER.x - dx} ${STAGE_H} A ${r} ${r} 0 0 1 ${CENTER.x + dx} ${STAGE_H}`;
}

function OrbitAvatar({ src, alt, color, size = 68 }: OrbitAvatarItem) {
  return (
    <div
      className="rounded-full border border-black/10 bg-white p-[3px] shadow-[0_4px_14px_rgba(0,0,0,0.08)] dark:border-white/15 dark:bg-[#161616]"
      style={{ width: size, height: size }}
    >
      <div
        className="h-full w-full overflow-hidden rounded-full flex items-center justify-center text-xl select-none"
        style={{ backgroundColor: color }}
      >
        <img
          src={src}
          alt={alt ?? ''}
          draggable={false}
          className="h-full w-full translate-y-[8%] scale-[1.08] select-none object-cover object-top"
          onError={(e) => {
            // fallback if image fails to load
            (e.target as HTMLElement).style.display = 'none';
          }}
        />
      </div>
    </div>
  );
}

function OrbitPill({ icon, label }: OrbitPillItem) {
  return (
    <div className="flex min-h-[30px] items-center gap-2 whitespace-nowrap rounded-full border border-black/10 bg-white/95 py-1 px-3.5 text-[13px] font-semibold text-[#374151] shadow-[0_4px_12px_rgba(0,0,0,0.06)] backdrop-blur-md dark:border-white/15 dark:bg-[#18181b]/95 dark:text-zinc-200">
      <span className="flex shrink-0 items-center text-[14px] leading-none">{icon}</span>
      <span className="leading-none">{label}</span>
    </div>
  );
}

function OrbitCard({ emoji, badge }: OrbitCardItem) {
  return (
    <div className="relative flex h-[54px] w-[54px] items-center justify-center rounded-2xl border border-black/10 bg-white/90 text-[24px] leading-none shadow-[0_4px_14px_rgba(0,0,0,0.08)] backdrop-blur-md dark:border-white/15 dark:bg-[#1c1c1f]/90">
      <span className="select-none">{emoji}</span>
      {badge !== undefined && (
        <span className="absolute -bottom-[6px] -right-2 flex h-[20px] items-center gap-0.5 rounded-full border border-black/10 bg-white px-1.5 text-[10px] font-bold leading-none text-emerald-600 shadow-[0_2px_4px_rgba(0,0,0,0.08)] dark:border-white/15 dark:bg-zinc-900 dark:text-emerald-400">
          <ArrowUp size={10} strokeWidth={2.5} />
          {badge}
        </span>
      )}
    </div>
  );
}

function OrbitStatus({ label }: OrbitStatusItem) {
  return (
    <div className="flex h-[32px] items-center gap-2 whitespace-nowrap rounded-full border border-emerald-500/30 bg-emerald-50/95 px-3 text-[13.5px] font-bold text-emerald-800 shadow-[0_4px_12px_rgba(16,185,129,0.12)] backdrop-blur-md dark:border-emerald-500/30 dark:bg-emerald-950/80 dark:text-emerald-300">
      <CircleCheck size={16} strokeWidth={2.4} className="fill-emerald-600 text-emerald-100 dark:fill-emerald-500 dark:text-emerald-950" />
      {label}
    </div>
  );
}

function OrbitCheck() {
  return (
    <div className="flex h-[50px] w-[50px] items-center justify-center rounded-full border border-emerald-500/30 bg-emerald-100/90 shadow-[0_4px_14px_rgba(16,185,129,0.15)] dark:border-emerald-500/30 dark:bg-emerald-950/90">
      <CircleCheck size={22} strokeWidth={2.4} className="fill-emerald-600 text-emerald-100 dark:fill-emerald-500 dark:text-emerald-950" />
    </div>
  );
}

function renderItem(item: OrbitItem) {
  switch (item.kind) {
    case 'avatar':
      return <OrbitAvatar {...item} />;
    case 'pill':
      return <OrbitPill {...item} />;
    case 'card':
      return <OrbitCard {...item} />;
    case 'status':
      return <OrbitStatus {...item} />;
    case 'check':
      return <OrbitCheck />;
  }
}

function splitValue(value: string) {
  const m = value.match(/^([^\d]*)([\d.,]+)(.*)$/);
  if (!m) return null;
  const raw = m[2].replace(/,/g, '');
  const decimals = (raw.split('.')[1] ?? '').length;
  return { prefix: m[1], target: parseFloat(raw), decimals, suffix: m[3] };
}

function CountUp({ value, delay }: { value: string; delay: number }) {
  const parts = splitValue(value);
  const target = parts?.target ?? 0;
  const [n, setN] = useState(0);

  useEffect(() => {
    if (!parts) return;
    const controls = animate(0, target, {
      delay,
      duration: 1.6,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => setN(v),
    });
    return () => controls.stop();
  }, [target, delay, parts]);

  if (!parts) return <>{value}</>;
  return (
    <>
      {parts.prefix}
      {n.toFixed(parts.decimals)}
      {parts.suffix}
    </>
  );
}

const reveal = {
  hidden: { opacity: 0, y: 14, filter: 'blur(4px)' },
  show: { opacity: 1, y: 0, filter: 'blur(0px)' },
};

export default function CommunityOrbit({
  items,
  stats,
  headline,
  subheadline,
  tags = [],
  minScale = 0.55,
  className,
}: CommunityOrbitProps) {
  const frameRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useIsomorphicLayoutEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    const measure = () =>
      setScale(Math.min(1, Math.max(minScale, frame.clientWidth / STAGE_W)));
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(frame);
    return () => ro.disconnect();
  }, [minScale]);

  return (
    <section
      className={`w-full relative px-4 pb-12 pt-6 text-[#1f1f1f] dark:text-white ${className ?? ''}`}
    >
      <div
        ref={frameRef}
        className="relative mx-auto w-full max-w-[1200px] overflow-hidden"
        style={{ height: STAGE_H * scale }}
      >
        <div
          className="absolute left-1/2 top-0"
          style={{
            width: STAGE_W,
            height: STAGE_H,
            transform: `translateX(-50%) scale(${scale})`,
            transformOrigin: 'top center',
          }}
        >
          {/* Orbiting concentric SVG arcs */}
          <svg
            className="pointer-events-none absolute inset-0"
            width={STAGE_W}
            height={STAGE_H}
            viewBox={`0 0 ${STAGE_W} ${STAGE_H}`}
            fill="none"
            style={{
              maskImage: 'linear-gradient(to bottom, #000 65%, transparent 100%)',
              WebkitMaskImage: 'linear-gradient(to bottom, #000 65%, transparent 100%)',
            }}
          >
            <motion.path
              d={arcPath(RADIUS.outer)}
              className="stroke-black/[0.08] dark:stroke-white/10"
              strokeWidth={2}
              strokeDasharray="6 6"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 1.4, ease: 'easeOut' }}
            />
            <motion.path
              d={arcPath(RADIUS.inner)}
              className="stroke-rose-500/20 dark:stroke-rose-500/30"
              strokeWidth={2.5}
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 1.4, ease: 'easeOut', delay: 0.1 }}
            />
          </svg>

          {/* Orbiting Icons / Pills / Status Cards */}
          {items.map((item, i) => (
            <motion.div
              key={i}
              className="absolute -translate-x-1/2 -translate-y-1/2 z-10"
              style={positionOnRing(item.ring, item.angle)}
              initial={{ opacity: 0, scale: 0.7 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.3 + i * 0.06, ease: [0.22, 1, 0.36, 1] }}
            >
              <motion.div
                animate={{ y: [0, -5, 0] }}
                transition={{
                  duration: 4 + (i % 4) * 0.7,
                  repeat: Infinity,
                  ease: 'easeInOut',
                  delay: (i * 0.3) % 2,
                }}
                whileHover={{ scale: 1.1, zIndex: 20 }}
              >
                {renderItem(item)}
              </motion.div>
            </motion.div>
          ))}

          {/* Central Orbit Stats Display (Zero Private Data: Pure SaaS Architecture Benchmarks) */}
          <div className="absolute left-1/2 top-[390px] grid -translate-x-1/2 auto-cols-fr grid-flow-col gap-8 md:gap-14">
            {stats.map((s, i) => (
              <motion.div
                key={s.label}
                className="flex flex-col items-center text-center"
                variants={reveal}
                initial="hidden"
                animate="show"
                transition={{ duration: 0.6, delay: 0.8 + i * 0.12, ease: [0.22, 1, 0.36, 1] }}
              >
                <span className="text-[40px] md:text-[46px] font-extrabold leading-none tracking-tight text-zinc-900 tabular-nums dark:text-white">
                  <CountUp value={s.value} delay={0.8 + i * 0.12} />
                </span>
                <span className="mt-[12px] text-[13px] md:text-[14px] font-semibold text-zinc-500 dark:text-zinc-400">
                  {s.label}
                </span>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Headline */}
      <motion.div
        className="mx-auto mt-4 max-w-[760px] text-center"
        variants={reveal}
        initial="hidden"
        animate="show"
        transition={{ duration: 0.7, delay: 1.1, ease: [0.22, 1, 0.36, 1] }}
      >
        <h2 className="text-[28px] sm:text-[38px] md:text-[44px] font-extrabold leading-[1.15] tracking-tight text-zinc-900 dark:text-white">
          {headline}
        </h2>
        {subheadline && (
          <p className="mt-3 text-[15px] sm:text-[17px] text-zinc-600 dark:text-zinc-300 max-w-[620px] mx-auto leading-relaxed">
            {subheadline}
          </p>
        )}
      </motion.div>

      {/* Interactive Tags / Features */}
      {tags.length > 0 && (
        <div className="mx-auto mt-7 flex max-w-[840px] flex-wrap justify-center gap-2.5 sm:gap-3.5">
          {tags.map((t, i) => {
            const Tag = (t.href ? motion.a : motion.button) as typeof motion.a;
            return (
              <Tag
                key={t.label}
                {...(t.href ? { href: t.href } : { type: 'button' as const })}
                onClick={t.onClick}
                variants={reveal}
                initial="hidden"
                animate="show"
                transition={{ duration: 0.5, delay: 1.4 + i * 0.07, ease: [0.22, 1, 0.36, 1] }}
                whileHover={{ y: -2 }}
                whileTap={{ y: 0 }}
                className="group flex h-10 items-center gap-2.5 rounded-full border border-black/10 bg-white pl-2 pr-4 text-[13.5px] font-semibold text-zinc-800 shadow-[0_2px_6px_rgba(0,0,0,0.04)] transition-all duration-200 hover:border-rose-500/40 hover:shadow-[0_8px_20px_-6px_rgba(225,29,72,0.15)] focus-visible:outline-none dark:border-white/10 dark:bg-zinc-900/90 dark:text-zinc-200 dark:hover:border-rose-500/40 dark:hover:bg-zinc-800"
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-rose-50 text-rose-600 transition-colors group-hover:bg-rose-600 group-hover:text-white dark:bg-rose-950/60 dark:text-rose-400 dark:group-hover:bg-rose-600 dark:group-hover:text-white [&>svg]:h-[15px] [&>svg]:w-[15px]">
                  {t.icon}
                </span>
                {t.label}
              </Tag>
            );
          })}
        </div>
      )}
    </section>
  );
}

export { CommunityOrbit as Component };
