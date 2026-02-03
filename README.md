# RetireOnSol (Charlie's Simple Version)

Dead simple Solana retirement calculator with realistic, fixed parameters.

## Design Philosophy

**Radically Simple.** No toggles, no tabs, no options. Just the four inputs that matter and instant, realistic results.

## What's Included

- **4 Core Inputs**
  - Current SOL holdings
  - Monthly DCA (USD)
  - Years until retirement
  - Monthly withdrawal (USD)

- **Instant Results**
  - Projected portfolio value (median)
  - Monte Carlo confidence intervals (P10/P50/P90)
  - Years of income sustainability
  - ROI and total invested

- **Wallet Integration**
  - Connect Phantom or any Solana wallet
  - Import balance with one click

- **Fixed Realistic Parameters** (hardcoded, no UI controls)
  - Growth: **15% CAGR** (realistic long-term)
  - Inflation: **3.5% annual** (always applied to withdrawals)
  - Debasement: **0%** (disabled)
  - JitoSOL: **disabled** (pure SOL only)
  - Monte Carlo: **P10/P50/P90** confidence intervals

## What's NOT Included

- Plan/Monitor tab split (removed for simplicity)
- All toggles and option switches (fixed parameters)
- Execute plan / automation features
- Growth rate selector (fixed at 15%)
- Inflation toggle (always on at 3.5%)

The "Advanced" button in the header is a placeholder for future linking to the full-featured RetireOnSol.

## Why These Parameters?

- **15% CAGR**: Realistic for mature SOL. Not moonboy 1000x, not bearish. Sustainable.
- **3.5% inflation**: Historical US average. Always applied for real purchasing power.
- **60% volatility**: Mature crypto vol for Monte Carlo confidence bands.
- **Pure SOL**: No liquid staking complexity. Just SOL.

## Tech Stack

- Vite + React + TypeScript
- Solana Wallet Adapter
- Minimal dependencies (~600KB bundle)
- Custom CSS (no frameworks)

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

## Deployment

Deploys automatically to GitHub Pages on push to master:
**https://charlieashworth70.github.io/retireonsol_charlie/**

## Philosophy

This isn't a power tool. It's a quick, honest answer to "Can I retire on SOL?"

No complexity. No options. No BS. Just math.

---

Built by Charlie Ashworth for Chris Booth.
