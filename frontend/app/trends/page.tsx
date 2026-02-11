"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import { motion, useInView } from "framer-motion";
import {
  AreaChart,
  Area,
  ResponsiveContainer,
} from "recharts";

/* ═══════════════════════════════
   MICRO-SOUND GENERATORS (Web Audio API)
   Zero dependencies — no audio files required
   ═══════════════════════════════ */
function playClick(muted: boolean) {
  if (muted) return;
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = 1200;
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.08);
  } catch { /* silent fail */ }
}

function playBeep(muted: boolean) {
  if (muted) return;
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.value = 800;
    gain.gain.setValueAtTime(0.06, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.12);
  } catch { /* silent fail */ }
}

function playPop(muted: boolean) {
  if (muted) return;
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(600, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.06);
    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.06);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.06);
  } catch { /* silent fail */ }
}

/* ── Chart data ── */
const chartData = Array.from({ length: 24 }, (_, i) => ({
  x: i,
  v: 40 + Math.sin(i * 0.5) * 20 + Math.random() * 15,
}));

/* ── Animation variants ── */
const fadeUp = {
  hidden: { opacity: 0, y: 40 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] },
  },
};

const stagger = {
  visible: { transition: { staggerChildren: 0.15 } },
};

/* ── Scroll-animated section wrapper ── */
function AnimatedSection({
  children,
  className,
  id,
}: {
  children: React.ReactNode;
  className?: string;
  id?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  return (
    <motion.div
      ref={ref}
      id={id}
      className={className}
      initial="hidden"
      animate={inView ? "visible" : "hidden"}
      variants={stagger}
    >
      {children}
    </motion.div>
  );
}

/* ═══════════════════════════════
   MAIN PAGE COMPONENT
   ═══════════════════════════════ */
export default function TrendsPage() {
  const [muted, setMuted] = useState(false);
  const [y2kTooltip, setY2kTooltip] = useState<string | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const parallaxRef = useRef<HTMLDivElement>(null);

  /* Parallax mouse tracking */
  const handleParallaxMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!parallaxRef.current) return;
      const rect = parallaxRef.current.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      setMousePos({ x, y });
    },
    []
  );

  /* Animated wave bars for sonic card */
  const [waveBars, setWaveBars] = useState([4, 8, 12, 8, 4]);
  useEffect(() => {
    const interval = setInterval(() => {
      setWaveBars(Array.from({ length: 5 }, () => 3 + Math.random() * 11));
    }, 200);
    return () => clearInterval(interval);
  }, []);

  /* Smooth scroll helper */
  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <main>
      {/* ════════════════════════════
          STICKY NAVBAR (CTA in nav)
          ════════════════════════════ */}
      <nav className="trends-nav">
        <div className="trends-nav-logo">
          Trends<span>.2026</span>
        </div>
        <ul className="trends-nav-links">
          <li>
            <span className="trends-nav-link" onClick={() => scrollTo("pillar-1")}>
              AI & Tech
            </span>
          </li>
          <li>
            <span className="trends-nav-link" onClick={() => scrollTo("pillar-2")}>
              Human
            </span>
          </li>
          <li>
            <span className="trends-nav-link" onClick={() => scrollTo("pillar-3")}>
              Experience
            </span>
          </li>
          <li>
            <button className="cta-btn" onClick={() => scrollTo("pillar-1")}>
              Explore Trends →
            </button>
          </li>
        </ul>
      </nav>

      {/* ════════════════════════════
          HERO SECTION
          ════════════════════════════ */}
      <section className="hero-section">
        <div className="hero-gradient-mesh" />

        <motion.span
          className="hero-year"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.8 }}
        >
          2 0 2 6
        </motion.span>

        <motion.h1
          className="hero-title"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 1, ease: [0.16, 1, 0.3, 1] }}
        >
          Web Design Trends
        </motion.h1>

        <motion.p
          className="hero-subtitle"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9, duration: 0.8 }}
        >
          The aesthetics, interactions &amp; philosophies shaping the internet
          — across 3 pillars and 9 defining movements.
        </motion.p>

        {/* Hero CTA (above the fold) */}
        <motion.div
          className="hero-actions"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.1, duration: 0.8 }}
        >
          <button
            className="cta-btn cta-btn-lg"
            onClick={() => scrollTo("pillar-1")}
          >
            Explore All 9 Trends ↓
          </button>
          <button
            className="cta-btn cta-btn-ghost cta-btn-lg"
            onClick={() => scrollTo("pillar-3")}
          >
            Try Interactive Demos
          </button>
        </motion.div>

        {/* Social proof near CTA */}
        <motion.div
          className="hero-social-proof"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.4, duration: 0.8 }}
        >
          <div className="hero-avatars">
            <div className="hero-avatar">🎨</div>
            <div className="hero-avatar">⚡</div>
            <div className="hero-avatar">✦</div>
            <div className="hero-avatar">◆</div>
          </div>
          <span className="hero-proof-text">
            Trusted by <strong>12,400+</strong> designers &amp; developers
          </span>
        </motion.div>

        <motion.div
          className="hero-scroll-cue"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.7, duration: 0.8 }}
        >
          <span>Scroll</span>
          <div className="scroll-line" />
        </motion.div>
      </section>

      {/* ════════════════════════════
          PILLAR 1 — AI & TECH
          ════════════════════════════ */}
      <AnimatedSection className="trends-section" id="pillar-1">
        <div className="section-header">
          <motion.span className="section-label" variants={fadeUp}>
            Pillar 01
          </motion.span>
          <motion.h2 className="section-title" variants={fadeUp}>
            The AI &amp; Tech Influence
          </motion.h2>
          <motion.p className="section-desc" variants={fadeUp}>
            Minimalist and future-forward. Driven by the massive influx of
            venture capital into AI startups, brands are adopting the aesthetics
            of industry leaders like OpenAI and Perplexity.
          </motion.p>
        </div>

        <div className="trends-grid">
          {/* ── Barely There UI ── */}
          <motion.div className="trend-card card-barely-there" variants={fadeUp}>
            <span className="trend-card-label">01 / Barely There UI</span>
            <h3 className="trend-card-title">Hyper-minimal. Data-driven.</h3>
            <p className="trend-card-desc">
              Stripped-down layouts with skinny sans-serif type. The interface
              disappears so the data can speak.
            </p>
            <div className="barely-there-chart">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Area
                    type="monotone"
                    dataKey="v"
                    stroke="#8b5cf6"
                    strokeWidth={1}
                    fill="url(#chartGrad)"
                    dot={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="barely-there-stat">
              <div>
                <div className="stat-value">97.4%</div>
                <div className="stat-label">Adoption rate</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div className="stat-value">+12</div>
                <div className="stat-label">Trust index Δ</div>
              </div>
            </div>
          </motion.div>

          {/* ── Tech Bro Gradient ── */}
          <motion.div className="trend-card card-gradient" variants={fadeUp}>
            <span className="trend-card-label">02 / The Tech Bro Gradient</span>
            <h3 className="trend-card-title">Soft, ethereal color fields</h3>
            <p className="trend-card-desc">
              Purple → blue → teal mixes with neon inner-glow. In 2026,
              irregular fluid shapes replace generic circles.
            </p>
            <div className="gradient-orb-container">
              <div className="gradient-orb-ring" />
              <div className="gradient-orb" />
            </div>
          </motion.div>

          {/* ── Spaceship Manual ── */}
          <motion.div className="trend-card card-blueprint" variants={fadeUp}>
            <div className="blueprint-grid-bg" />
            <span
              className="trend-card-label"
              style={{ position: "relative", zIndex: 1 }}
            >
              03 / Spaceship Instruction Manual
            </span>
            <h3
              className="trend-card-title"
              style={{ position: "relative", zIndex: 1 }}
            >
              Blueprint aesthetics
            </h3>
            <p
              className="trend-card-desc"
              style={{ position: "relative", zIndex: 1 }}
            >
              Thin vector lines, monospace micro-labels, and exploded-view
              technical drawings replace glossy product photos.
            </p>
            <div
              className="blueprint-diagram"
              style={{ position: "relative", zIndex: 1 }}
            >
              <div className="blueprint-box blueprint-box-main" />
              <div className="blueprint-box blueprint-box-sm1" />
              <div className="blueprint-box blueprint-box-sm2" />
              <div className="blueprint-line blueprint-line-h blueprint-line-1" />
              <div className="blueprint-line blueprint-line-h blueprint-line-2" />
              <div className="blueprint-dot" style={{ top: 58, left: "calc(15% + 38px)" }} />
              <div className="blueprint-dot" style={{ top: 58, left: "calc(50% - 42px)" }} />
              <div className="blueprint-dot" style={{ bottom: 23, right: "calc(15% + 48px)" }} />
              <div className="blueprint-dot" style={{ bottom: 23, right: "calc(50% - 38px)" }} />
              <span className="blueprint-label blueprint-label-1">module_a</span>
              <span className="blueprint-label blueprint-label-2">core_unit</span>
              <span className="blueprint-label blueprint-label-3">io_bus</span>
            </div>
          </motion.div>
        </div>

        {/* Section CTA #1 — repeated every 2-3 scroll screens */}
        <motion.div className="section-cta" variants={fadeUp}>
          <div className="section-cta-text">
            <div className="section-cta-title">
              Ready to redesign?
            </div>
            <div className="section-cta-subtitle">
              Apply these AI-native aesthetics to your next project.
            </div>
            <div className="social-proof-bar">
              <span className="social-proof-stars">★★★★★</span>
              <span className="social-proof-count">4.9/5 from 2,100+ reviews</span>
            </div>
          </div>
          <button
            className="cta-btn"
            onClick={() => scrollTo("pillar-2")}
          >
            Continue →
          </button>
        </motion.div>
      </AnimatedSection>

      <div className="pillar-divider" />

      {/* ════════════════════════════
          PILLAR 2 — HUMAN RESPONSE
          ════════════════════════════ */}
      <AnimatedSection className="trends-section" id="pillar-2">
        <div className="section-header">
          <motion.span
            className="section-label"
            variants={fadeUp}
            style={{ color: "var(--grade-orange)" }}
          >
            Pillar 02
          </motion.span>
          <motion.h2 className="section-title" variants={fadeUp}>
            The Human Response
          </motion.h2>
          <motion.p className="section-desc" variants={fadeUp}>
            As AI content becomes more polished, there is a growing
            counter-trend toward intentional imperfection to prove a human was
            behind the design.
          </motion.p>
        </div>

        <div className="trends-grid">
          {/* ── Wabi-Sabi ── */}
          <motion.div className="trend-card card-wabi-sabi" variants={fadeUp}>
            <svg className="wabi-scribble" viewBox="0 0 50 50">
              <path
                d="M5 45 Q10 5, 25 25 T45 5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <circle
                cx="8"
                cy="40"
                r="4"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              />
            </svg>
            <span className="trend-card-label">The Human Touch</span>
            <h3 className="trend-card-title">Wabi-Sabi</h3>
            <p className="trend-card-desc">
              Hand-drawn scribbles, messy underlines, rough icons. Finding
              beauty in the unpolished and irreplaceable.
            </p>
            <div className="wabi-photo">
              <span className="wabi-photo-text">
                [ shot on phone — raw &amp; unedited ]
              </span>
            </div>
          </motion.div>

          {/* ── Maximalism ── */}
          <motion.div className="trend-card card-maximalism" variants={fadeUp}>
            <div className="maximalist-shapes" />
            <span className="trend-card-label">Loud &amp; proud</span>
            <h3 className="trend-card-title maximalist-title">
              MAX<span className="maximalist-asterisk">✱</span>
            </h3>
            <p className="trend-card-desc">
              Uncomfortably large headers, loud colors, high-energy layouts —
              the antithesis of AI minimalism. Use &quot;maximalist
              sections&quot; to break up minimal flows.
            </p>
          </motion.div>

          {/* ── Grade School Colors ── */}
          <motion.div className="trend-card card-gradeschool" variants={fadeUp}>
            <span className="trend-card-label">The &quot;It&quot; Color</span>
            <h3 className="trend-card-title">Grade School Palette</h3>
            <p className="trend-card-desc">
              Grounded, primary-adjacent colors that feel nostalgic — like a box
              of Crayola crayons. Earthy orange dominates 2026.
            </p>
            <div className="color-swatches">
              <div>
                <div
                  className="swatch swatch-hero"
                  style={{ background: "var(--grade-orange)" }}
                  title="The 'It' Color"
                />
                <div className="swatch-label">HERO</div>
              </div>
              {[
                { color: "var(--grade-red)", name: "RED" },
                { color: "var(--grade-yellow)", name: "MAIZE" },
                { color: "var(--grade-green)", name: "GREEN" },
                { color: "var(--grade-blue)", name: "BLUE" },
                { color: "var(--grade-pink)", name: "PINK" },
                { color: "var(--grade-brown)", name: "BROWN" },
              ].map((s) => (
                <div key={s.name}>
                  <div
                    className="swatch"
                    style={{ background: s.color }}
                    title={s.name}
                  />
                  <div className="swatch-label">{s.name}</div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Section CTA #2 */}
        <motion.div className="section-cta" variants={fadeUp}>
          <div className="section-cta-text">
            <div className="section-cta-title">
              Feel the difference?
            </div>
            <div className="section-cta-subtitle">
              Human imperfection builds trust that AI polish can&apos;t match.
            </div>
            <div className="social-proof-bar">
              <span className="social-proof-stars">★★★★★</span>
              <span className="social-proof-count">
                &quot;This changed how we approach branding&quot; — A. Rivera
              </span>
            </div>
          </div>
          <button
            className="cta-btn"
            onClick={() => scrollTo("pillar-3")}
          >
            Try Interactions →
          </button>
        </motion.div>
      </AnimatedSection>

      <div className="pillar-divider" />

      {/* ════════════════════════════
          PILLAR 3 — EXPERIENCE
          ════════════════════════════ */}
      <AnimatedSection className="trends-section" id="pillar-3">
        <div className="section-header">
          <motion.span
            className="section-label"
            variants={fadeUp}
            style={{ color: "var(--tech-teal)" }}
          >
            Pillar 03
          </motion.span>
          <motion.h2 className="section-title" variants={fadeUp}>
            Experience &amp; Interaction
          </motion.h2>
          <motion.p className="section-desc" variants={fadeUp}>
            How users feel while interacting — drawing from past experiences,
            smartphone behavior, and the desire for immersive, game-like digital
            worlds.
          </motion.p>
        </div>

        <div className="trends-grid">
          {/* ── Y2K Nostalgia ── */}
          <motion.div
            className="trend-card card-y2k y2k-cursor-zone"
            variants={fadeUp}
          >
            <div className="y2k-titlebar">
              <span>📁 Internet Nostalgia.exe</span>
              <div className="y2k-titlebar-buttons">
                <button className="y2k-btn">_</button>
                <button className="y2k-btn">□</button>
                <button className="y2k-btn">✕</button>
              </div>
            </div>
            <div className="y2k-content">
              <span className="trend-card-label">Y2K Revival</span>
              <h3 className="trend-card-title">Internet Nostalgia</h3>
              <p className="trend-card-desc">
                Blocky Windows-style UI, retro tooltips, pixelated icons, and
                custom cursors — tastefully reimagined.
              </p>
              <div className="y2k-icons">
                {[
                  { icon: "📁", label: "Files", tip: "My Documents" },
                  { icon: "🌐", label: "Web", tip: "Internet Explorer" },
                  { icon: "💾", label: "Save", tip: "3½ Floppy (A:)" },
                  { icon: "🎮", label: "Games", tip: "Minesweeper" },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="y2k-icon"
                    style={{ position: "relative" }}
                    onMouseEnter={() => setY2kTooltip(item.tip)}
                    onMouseLeave={() => setY2kTooltip(null)}
                  >
                    <div className="y2k-icon-box">{item.icon}</div>
                    <span>{item.label}</span>
                    {y2kTooltip === item.tip && (
                      <div className="y2k-tooltip">{item.tip}</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </motion.div>

          {/* ── Sonic Feedback ── */}
          <motion.div className="trend-card card-sonic" variants={fadeUp}>
            <span className="trend-card-label">Sonic Feedback</span>
            <h3 className="trend-card-title">Interactive Sound</h3>
            <p className="trend-card-desc">
              Micro-sounds — short, subtle beeps or clicks on interaction. Our
              brains are trained by smartphones to expect sonic feedback.
            </p>
            <div className="sonic-buttons">
              <button className="sonic-btn" onClick={() => playClick(muted)}>
                <span>Click</span>
                <div className="sonic-wave">
                  {waveBars.map((h, i) => (
                    <div
                      key={i}
                      className="sonic-wave-bar"
                      style={{ height: `${h}px` }}
                    />
                  ))}
                </div>
              </button>
              <button className="sonic-btn" onClick={() => playBeep(muted)}>
                <span>Beep</span>
                <div className="sonic-wave">
                  {waveBars
                    .slice()
                    .reverse()
                    .map((h, i) => (
                      <div
                        key={i}
                        className="sonic-wave-bar"
                        style={{
                          height: `${h}px`,
                          background: "var(--tech-teal)",
                        }}
                      />
                    ))}
                </div>
              </button>
              <button className="sonic-btn" onClick={() => playPop(muted)}>
                <span>Pop</span>
                <div className="sonic-wave">
                  {waveBars.map((h, i) => (
                    <div
                      key={i}
                      className="sonic-wave-bar"
                      style={{
                        height: `${h * 0.8}px`,
                        background: "var(--tech-blue)",
                      }}
                    />
                  ))}
                </div>
              </button>
            </div>
            <div
              className="sonic-mute-toggle"
              onClick={() => setMuted((m) => !m)}
            >
              {muted ? "🔇" : "🔊"} {muted ? "Sounds off" : "Sounds on"}
            </div>
          </motion.div>

          {/* ── 3D / WebGL ── */}
          <motion.div className="trend-card card-3d" variants={fadeUp}>
            <span className="trend-card-label">Democratized WebGL</span>
            <h3 className="trend-card-title">3D Animations</h3>
            <p className="trend-card-desc">
              Immersive, video-game-like scrolling where 3D objects respond to
              the user. Tools like Spline and Rive make this accessible.
            </p>
            <div
              ref={parallaxRef}
              className="parallax-container"
              onMouseMove={handleParallaxMove}
              onMouseLeave={() => setMousePos({ x: 0, y: 0 })}
            >
              <div
                className="parallax-layer"
                style={{
                  transform: `translate(${mousePos.x * 15}px, ${mousePos.y * 15}px)`,
                }}
              >
                <div className="parallax-dots">
                  {Array.from({ length: 15 }).map((_, i) => (
                    <div key={i} className="parallax-dot" />
                  ))}
                </div>
              </div>
              <div
                className="parallax-layer"
                style={{
                  transform: `translate(${mousePos.x * -25}px, ${mousePos.y * -25}px)`,
                }}
              >
                <div className="parallax-ring" />
              </div>
              <div
                className="parallax-layer"
                style={{
                  transform: `translate(${mousePos.x * 40}px, ${mousePos.y * 40}px) rotateX(${mousePos.y * -20}deg) rotateY(${mousePos.x * 20}deg)`,
                }}
              >
                <div className="parallax-cube" />
              </div>
              <div
                className="parallax-layer"
                style={{
                  transform: `translate(${mousePos.x * -10}px, ${mousePos.y * -10 + 70}px)`,
                }}
              >
                <span className="parallax-float-text">move your mouse</span>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Section CTA #3 — final call */}
        <motion.div className="section-cta" variants={fadeUp}>
          <div className="section-cta-text">
            <div className="section-cta-title">
              All 9 trends. One showcase.
            </div>
            <div className="section-cta-subtitle">
              Bookmark this page — it&apos;s updated as new patterns emerge.
            </div>
            <div className="social-proof-bar">
              <span className="social-proof-stars">★★★★★</span>
              <span className="social-proof-count">
                Updated for February 2026
              </span>
            </div>
          </div>
          <button
            className="cta-btn"
            onClick={() => scrollTo("pillar-1")}
          >
            Back to Top ↑
          </button>
        </motion.div>
      </AnimatedSection>

      {/* ── Footer ── */}
      <footer className="trends-footer">
        <p>2026 Web Design Trends — A living showcase</p>
        <p style={{ marginTop: "0.5rem" }}>
          Inspired by{" "}
          <a
            href="https://www.youtube.com/watch?v=dQw4w9WgXcQ"
            target="_blank"
            rel="noopener noreferrer"
          >
            Steal These 2026 Web Design Trends
          </a>
        </p>
      </footer>
    </main>
  );
}
