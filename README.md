# RetireOnSol (Charlie's Version)

My clean, opinionated take on Solana retirement planning.

## Design Philosophy

**Less is more.** Most retirement calculators overwhelm users with options. This one doesn't.

### What's Different

1. **Smart Defaults** — Works out of box. 25% SOL CAGR, 80% vol, 4% rule. Realistic, not moonboy.
2. **Progressive Disclosure** — Advanced features hidden until you need them. Clean first impression.
3. **Mobile-First** — Big touch targets, readable on phones. 90% of people plan on mobile.
4. **Instant Feedback** — Change a slider, see results immediately. No "Calculate" button needed.
5. **Honest Numbers** — Shows confidence intervals (P10/P90). Retirement planning needs realism, not hopium.

### What's Included

- **Wallet Integration** — Connect Phantom, import SOL balance instantly
- **DCA Planning** — Monthly USD contributions with price averaging
- **Growth Projections** — Conservative 25% CAGR (not 1000% moonshots)
- **Monte Carlo** — 90% confidence bands for realistic planning
- **Sustainability Check** — Red/green warnings if your plan won't last 30 years
- **Clean UI** — Solana brand colors, dark theme, no clutter

### What's NOT Included (Yet)

- Monitor tab (planned — track active plans vs actual wallet)
- Jupiter swap integration (planned — DCA automation)
- Notifications (planned — "time to DCA" reminders)
- JitoSOL staking (planned — liquid staking APR)
- Power law / S-curve models (CAGR is enough for v1)
- Inflation adjustments (adds complexity most won't use)

## Tech Stack

- **Vite + React + TypeScript** — Fast, type-safe, modern
- **Solana Wallet Adapter** — Standard wallet integration
- **No bloat** — Minimal dependencies, <600KB bundle
- **CSS only** — No Tailwind/MUI. Just clean, custom styles.

## Run Locally

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

Outputs to `dist/` — ready for deployment.

## Philosophy on Features

**Every feature has a cost.** Users pay with confusion, developers pay with maintenance.

- **Don't add unless 80%+ will use it**
- **Don't show unless user asks**
- **Don't bloat bundle for edge cases**

This isn't feature-complete. It's feature-*right*.

## Compared to Original RetireOnSol

| Original | Charlie's Version |
|----------|------------------|
| Every option upfront | Hidden until needed |
| 7 growth models | 1 (CAGR) |
| Inflation/debasement | Not yet |
| JitoSOL toggle | Not yet |
| ~1MB bundle | ~600KB |
| Complex UI | Minimal UI |

Both valid. Different goals.

Original = Power tool for quants  
This = iPhone of retirement planning

## License

MIT — do what you want.

---

Built by Charlie Ashworth for Chris Booth.  
**Feedback welcome.**
