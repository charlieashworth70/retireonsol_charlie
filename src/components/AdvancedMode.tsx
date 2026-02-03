import { useState, useMemo, useCallback, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useWalletBalance } from '../hooks/useWalletBalance';
import { Share2, ArrowRight } from 'lucide-react';
import {
  calculateProjection,
  formatUSD,
  formatSOL,
  type ProjectionInput,
  type ProjectionResult,
  type GrowthModel,
  type GrowthModelParams,
} from '../utils/calculations';
import { getModelDisplayName, getModelDescription, getFuturePowerLawFairValue, calculateFuturePrice, type CAGRDecayType } from '../utils/growthModels';
import { toTodaysDollars, type InflationParams } from '../utils/inflation';
import { runMonteCarloSimulation, type MonteCarloParams, type MonteCarloResult, type VolatilityDecayType } from '../utils/monteCarlo';
import { fetchSOLPrice } from '../utils/solPrice';
import { shareProjection as shareAdvanced } from '../utils/shareImageAdvanced';
import { GrowthChart } from './advanced/GrowthChart';
import { SpendTab } from './SpendTab';
import { MonitorAccum } from './MonitorAccum';
import { MonitorDecum } from './MonitorDecum';
import './AdvancedMode.css';

type DCAFrequency = 'daily' | 'weekly' | 'monthly' | 'yearly';
type MainTab = 'plan' | 'monitor';
type PlanSubTab = 'grow' | 'spend';
type MonitorSubTab = 'accum' | 'decum';

interface AdvancedModeProps {
  initialSOL?: number;
  initialDCA?: number;
  initialYears?: number;
}

export function AdvancedMode({ initialSOL = 100, initialDCA = 500, initialYears = 10 }: AdvancedModeProps) {
  // Wallet connection
  const { connected } = useWallet();
  const { balance: walletSOL, jitoSolBalance: walletJitoSOL } = useWalletBalance();

  // Tab state
  const [mainTab, setMainTab] = useState<MainTab>('plan');
  const [planSubTab, setPlanSubTab] = useState<PlanSubTab>('grow');
  const [monitorSubTab, setMonitorSubTab] = useState<MonitorSubTab>('accum');

  // Form state
  const [currentSOL, setCurrentSOL] = useState<number>(initialSOL);
  const [currentJitoSOL, setCurrentJitoSOL] = useState<number>(0);
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);
  const [priceLoading, setPriceLoading] = useState<boolean>(true);
  const [years, setYears] = useState<number>(initialYears);
  const [dcaAmountUSD, setDcaAmountUSD] = useState<number>(initialDCA);
  const [dcaMaxLimit, setDcaMaxLimit] = useState<number>(5000);
  const [dcaFrequency, setDcaFrequency] = useState<DCAFrequency>('monthly');

  // Spend Now toggle
  const [spendNow, setSpendNow] = useState<boolean>(false);

  // Growth model state - DEFAULT: 25% CAGR with auto decay ON
  const [growthModel, setGrowthModel] = useState<GrowthModel>('cagr');
  const [modelParams, setModelParams] = useState<GrowthModelParams>({
    cagr: 0.25, // 25% default
    cagrDecay: 'auto', // Auto decay ON
    powerLawSlope: 1.6,
    sCurveYearsToHalfRemaining: 12,
  });

  // Calculate dynamic ceiling for S-curve
  const dynamicCeiling = useMemo(() => {
    if (currentPrice === null) return 50000;
    const slope = modelParams.powerLawSlope || 1.6;
    const todayFairValue = getFuturePowerLawFairValue(0, slope);
    const futureFairValue = getFuturePowerLawFairValue(years, slope);
    const growthMultiplier = futureFairValue / todayFairValue;
    const normalizedCeiling = currentPrice * growthMultiplier;
    return Math.round(normalizedCeiling / 1000) * 1000;
  }, [years, modelParams.powerLawSlope, currentPrice]);

  const [growthModelExpanded, setGrowthModelExpanded] = useState(false);

  // Inflation & Debasement state - DEFAULT: 3.5% linear, ON, debasement OFF
  const [inflationEnabled, setInflationEnabled] = useState(true); // ON by default
  const [inflationExpanded, setInflationExpanded] = useState(false);
  const [inflationType, setInflationType] = useState<'linear' | 'cyclical'>('linear');
  const [inflationRate, setInflationRate] = useState(0.035); // 3.5%
  const [inflationAmplitude, setInflationAmplitude] = useState(0.02);
  const [inflationCyclePeriod, setInflationCyclePeriod] = useState(7);
  const [debasementRate, setDebasementRate] = useState(0); // Debasement OFF

  // Monte Carlo state - DEFAULT: ON, 80% volatility, auto decay, 500 simulations
  const [mcEnabled, setMcEnabled] = useState(true); // ON by default
  const [mcExpanded, setMcExpanded] = useState(false);
  const [mcVolatility, setMcVolatility] = useState(0.80); // 80%
  const [mcVolatilityDecay, setMcVolatilityDecay] = useState<VolatilityDecayType>('auto'); // Auto decay
  const [mcSimulations, setMcSimulations] = useState(500); // 500 simulations
  const [mcCalculating, setMcCalculating] = useState(false);

  // JitoSOL staking state - DEFAULT: ON
  const [jitoSOLEnabled, setJitoSOLEnabled] = useState(true); // ON by default
  const [jitoSOLExpanded, setJitoSOLExpanded] = useState(false);
  const [jitoSOLAPR, setJitoSOLAPR] = useState(0.075);

  // Fetch SOL price on mount
  useEffect(() => {
    async function loadPrice() {
      try {
        setPriceLoading(true);
        const data = await fetchSOLPrice();
        setCurrentPrice(data.price);
      } catch (err) {
        console.error('Failed to fetch price:', err);
        setCurrentPrice(180); // Fallback
      } finally {
        setPriceLoading(false);
      }
    }
    loadPrice();
  }, []);

  // Effective model params with dynamic ceiling
  const effectiveModelParams = useMemo(() => ({
    ...modelParams,
    sCurveMaxPrice: dynamicCeiling,
  }), [modelParams, dynamicCeiling]);

  // Calculate projections
  const effectiveSOL = jitoSOLEnabled ? currentSOL + currentJitoSOL : currentSOL + currentJitoSOL;
  const projection = useMemo<ProjectionResult | null>(() => {
    if (currentPrice === null) return null;
    const input: ProjectionInput = {
      currentSOL: effectiveSOL,
      currentPrice,
      years: spendNow ? 0 : years, // If spend now, skip accumulation
      dcaAmountUSD: spendNow ? 0 : dcaAmountUSD, // If spend now, no DCA
      dcaFrequency,
      growthModel,
      modelParams: effectiveModelParams,
      jitoSOLEnabled,
      jitoSOLAPR,
    };
    return calculateProjection(input);
  }, [effectiveSOL, currentPrice, years, dcaAmountUSD, dcaFrequency, growthModel, effectiveModelParams, jitoSOLEnabled, jitoSOLAPR, spendNow]);

  // Inflation params
  const inflationParams: InflationParams = useMemo(() => ({
    enabled: inflationEnabled,
    type: inflationType,
    rate: inflationRate,
    amplitude: inflationAmplitude,
    cyclePeriod: inflationCyclePeriod,
    debasementRate: debasementRate,
  }), [inflationEnabled, inflationType, inflationRate, inflationAmplitude, inflationCyclePeriod, debasementRate]);

  // Calculate today's dollars value
  const todaysDollarsValue = useMemo(() => {
    if (!projection || !inflationEnabled) return null;
    return toTodaysDollars(projection.finalValueUSD, years, inflationParams);
  }, [projection, years, inflationParams, inflationEnabled]);

  // Inflation adjustment function
  const inflationAdjustmentFn = useCallback((value: number, year: number) => {
    return toTodaysDollars(value, year, inflationParams);
  }, [inflationParams]);

  // Monte Carlo params
  const mcParams: MonteCarloParams = useMemo(() => ({
    enabled: mcEnabled,
    volatility: mcVolatility,
    volatilityDecay: mcVolatilityDecay,
    simulations: mcSimulations,
  }), [mcEnabled, mcVolatility, mcVolatilityDecay, mcSimulations]);

  // Monte Carlo simulation results
  const [mcResult, setMcResult] = useState<MonteCarloResult | null>(null);

  useEffect(() => {
    if (!mcEnabled || currentPrice === null) {
      setMcResult(null);
      setMcCalculating(false);
      return;
    }

    setMcCalculating(true);
    const timeoutId = setTimeout(() => {
      const result = runMonteCarloSimulation(
        effectiveSOL,
        currentPrice,
        spendNow ? 0 : years,
        spendNow ? 0 : dcaAmountUSD,
        dcaFrequency,
        growthModel,
        effectiveModelParams,
        mcParams,
        jitoSOLEnabled,
        jitoSOLAPR
      );
      setMcResult(result);
      setMcCalculating(false);
    }, 50);

    return () => clearTimeout(timeoutId);
  }, [mcEnabled, effectiveSOL, currentPrice, years, dcaAmountUSD, dcaFrequency, growthModel, effectiveModelParams, mcParams, jitoSOLEnabled, jitoSOLAPR, spendNow]);

  const handleShare = useCallback(async () => {
    if (!projection) return;
    try {
      await shareAdvanced({
        projection,
        years: spendNow ? 0 : years,
        growthModel,
        modelParams: effectiveModelParams,
        dcaAmountUSD: spendNow ? 0 : dcaAmountUSD,
        dcaFrequency,
        currentSOL: effectiveSOL,
        currentPrice: currentPrice!,
        mcEnabled,
        mcResult,
        mcVolatility,
        mcSimulations,
        inflationEnabled,
        inflationParams,
        todaysDollarsValue,
        inflationAdjustmentFn,
      });
    } catch (error) {
      console.error('Failed to share:', error);
      alert('Failed to generate share image. Please try again.');
    }
  }, [projection, years, growthModel, effectiveModelParams, dcaAmountUSD, dcaFrequency, effectiveSOL, currentPrice, mcEnabled, mcResult, mcVolatility, mcSimulations, inflationEnabled, inflationParams, todaysDollarsValue, inflationAdjustmentFn, spendNow]);

  if (priceLoading) {
    return <div className="advanced-loading">Loading price data...</div>;
  }

  return (
    <div className="advanced-mode">
      {/* Wallet Connection */}
      <div className="wallet-section">
        <WalletMultiButton />
      </div>

      {/* Main Tabs */}
      <div className="main-tabs">
        <button
          className={`main-tab-btn ${mainTab === 'plan' ? 'active' : ''}`}
          onClick={() => setMainTab('plan')}
        >
          Plan
        </button>
        <button
          className={`main-tab-btn ${mainTab === 'monitor' ? 'active' : ''}`}
          onClick={() => setMainTab('monitor')}
        >
          Monitor
        </button>
      </div>

      {/* Plan Tab */}
      {mainTab === 'plan' && (
        <>
          {/* Plan Sub-tabs */}
          <div className="sub-tabs">
            <button
              className={`sub-tab-btn ${planSubTab === 'grow' ? 'active' : ''}`}
              onClick={() => setPlanSubTab('grow')}
            >
              Grow
            </button>
            <button
              className={`sub-tab-btn ${planSubTab === 'spend' ? 'active' : ''}`}
              onClick={() => setPlanSubTab('spend')}
            >
              Spend
            </button>
          </div>

          {/* Grow Sub-tab Content */}
          {planSubTab === 'grow' && (
            <>
              {/* Holdings Section */}
              <section className="adv-section">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h2>Your SOL Holdings</h2>
                  <button
                    type="button"
                    className="link-btn"
                    style={{ fontSize: '0.9rem', color: 'var(--sol-purple)', fontWeight: 'bold' }}
                    onClick={() => {
                      // Demo Mode: Pre-fill realistic test values
                      setCurrentSOL(1000);
                      setCurrentJitoSOL(500);
                      setYears(15);
                      setDcaAmountUSD(2000);
                      setDcaMaxLimit(5000);
                      setGrowthModel('cagr');
                      setModelParams({
                        cagr: 0.25, // 25%
                        cagrDecay: 'auto',
                        powerLawSlope: 1.6,
                        sCurveYearsToHalfRemaining: 12,
                      });
                      setJitoSOLEnabled(true);
                      setInflationEnabled(true);
                      setInflationRate(0.035); // 3.5%
                      setMcEnabled(true);
                      setMcVolatility(0.80); // 80%
                      setMcSimulations(500);
                    }}
                  >
                    🎮 Demo Mode
                  </button>
                </div>
                
                <div className="input-row">
                  <div className="input-group">
                    <label htmlFor="currentSOL">Current SOL</label>
                    <input
                      id="currentSOL"
                      type="number"
                      min="0"
                      step="1"
                      value={currentSOL}
                      onChange={(e) => setCurrentSOL(Number(e.target.value) || 0)}
                    />
                  </div>

                  <div className="input-group">
                    <label htmlFor="currentJitoSOL">Current JitoSOL</label>
                    <input
                      id="currentJitoSOL"
                      type="number"
                      min="0"
                      step="0.01"
                      value={currentJitoSOL}
                      onChange={(e) => setCurrentJitoSOL(Number(e.target.value) || 0)}
                    />
                  </div>
                </div>

                {connected && (walletSOL !== null || walletJitoSOL !== null) && (
                  <button
                    type="button"
                    className="link-btn"
                    style={{ marginTop: '0.5rem', fontSize: '0.9rem' }}
                    onClick={() => {
                      if (walletSOL !== null) setCurrentSOL(walletSOL);
                      if (walletJitoSOL !== null) setCurrentJitoSOL(walletJitoSOL);
                    }}
                  >
                    Import from connected wallet ({walletSOL?.toFixed(2)} SOL
                    {walletJitoSOL && walletJitoSOL > 0 ? `, ${walletJitoSOL.toFixed(2)} JitoSOL` : ''})
                  </button>
                )}

                <div className="price-display">
                  Current Price: <span className="price-value">${currentPrice?.toFixed(2)}</span>
                </div>

                {currentPrice && (
                  <div className="current-value-display">
                    Current Value: <span className="highlight">{formatUSD((currentSOL + currentJitoSOL) * currentPrice)}</span>
                  </div>
                )}
              </section>

              {/* Spend Now Toggle */}
              <section className="adv-section spend-now-section">
                <div className="spend-now-toggle">
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={spendNow}
                      onChange={(e) => setSpendNow(e.target.checked)}
                    />
                    <span className="toggle-slider"></span>
                  </label>
                  <div className="toggle-text">
                    <span className="toggle-label">Spend Now</span>
                    <span className="toggle-summary">
                      {spendNow ? 'Skip accumulation, use existing SOL' : 'Standard DCA → spend flow'}
                    </span>
                  </div>
                </div>
              </section>

              {!spendNow && (
                <>
                  {/* Accumulation Plan */}
                  <section className="adv-section">
                    <h2>Accumulation Plan</h2>

                    <div className="input-group slider-group">
                      <label htmlFor="years">Years to Retirement: <span className="slider-value">{years}</span></label>
                      <input
                        id="years"
                        type="range"
                        min="5"
                        max="40"
                        value={years}
                        onChange={(e) => setYears(Number(e.target.value))}
                      />
                      <div className="slider-labels">
                        <span>5</span>
                        <span>40</span>
                      </div>
                    </div>

                    <div className="input-group slider-group">
                      <label htmlFor="dcaAmountUSD">DCA per Period: <span className="slider-value">${dcaAmountUSD}</span></label>
                      <input
                        id="dcaAmountUSD"
                        type="range"
                        min="0"
                        max={dcaMaxLimit}
                        step={dcaMaxLimit <= 1000 ? 10 : 50}
                        value={Math.min(dcaAmountUSD, dcaMaxLimit)}
                        onChange={(e) => setDcaAmountUSD(Number(e.target.value))}
                      />
                      <div className="slider-labels">
                        <span>$0</span>
                        <span>${dcaMaxLimit.toLocaleString()}</span>
                      </div>
                      <div className="limit-buttons">
                        {[1000, 5000, 10000].map((limit) => (
                          <button
                            key={limit}
                            type="button"
                            className={`limit-btn ${dcaMaxLimit === limit ? 'active' : ''}`}
                            onClick={() => setDcaMaxLimit(limit)}
                          >
                            ${limit >= 1000 ? `${limit / 1000}K` : limit}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="input-group">
                      <label>Frequency</label>
                      <div className="frequency-buttons">
                        {(['daily', 'weekly', 'monthly', 'yearly'] as DCAFrequency[]).map((freq) => (
                          <button
                            key={freq}
                            type="button"
                            className={`freq-btn ${dcaFrequency === freq ? 'active' : ''}`}
                            onClick={() => setDcaFrequency(freq)}
                          >
                            {freq.charAt(0).toUpperCase() + freq.slice(1)}
                          </button>
                        ))}
                      </div>
                    </div>
                  </section>
                </>
              )}

              {/* Growth Model */}
              <section className="adv-section">
                <h2>Growth Model</h2>

                <div className="input-group">
                  <label>Price Projection Model</label>
                  <div className="model-buttons">
                    {(['cagr', 'powerlaw', 'scurve'] as GrowthModel[]).map((model) => (
                      <button
                        key={model}
                        type="button"
                        className={`model-btn ${growthModel === model ? 'active' : ''}`}
                        onClick={() => setGrowthModel(model)}
                      >
                        {getModelDisplayName(model)}
                      </button>
                    ))}
                  </div>
                  <span className="input-hint">{getModelDescription(growthModel)}</span>
                </div>

                <button
                  type="button"
                  className={`params-toggle ${growthModelExpanded ? 'expanded' : ''}`}
                  onClick={() => setGrowthModelExpanded(!growthModelExpanded)}
                >
                  <span className="params-toggle-label">Parameters</span>
                  <span className="params-toggle-summary">
                    {growthModel === 'cagr' && `${Math.round((modelParams.cagr || 0.25) * 100)}%${modelParams.cagrDecay === 'auto' ? ' + auto decay' : ''}`}
                    {growthModel === 'powerlaw' && `slope ${(modelParams.powerLawSlope || 1.6).toFixed(1)}`}
                    {growthModel === 'scurve' && `$${(dynamicCeiling / 1000).toFixed(0)}K ceiling`}
                  </span>
                  <span className={`toggle-arrow ${growthModelExpanded ? 'expanded' : ''}`}>▼</span>
                </button>

                <div className={`growth-params-content ${growthModelExpanded ? 'expanded' : ''}`}>
                  {growthModel === 'cagr' && (
                    <>
                      <div className="input-group slider-group">
                        <label htmlFor="cagr">Starting Growth Rate: <span className="slider-value">{Math.round((modelParams.cagr || 0.25) * 100)}%</span></label>
                        <input
                          id="cagr"
                          type="range"
                          min="0"
                          max="100"
                          value={(modelParams.cagr || 0.25) * 100}
                          onChange={(e) => setModelParams({ ...modelParams, cagr: Number(e.target.value) / 100 })}
                        />
                        <div className="slider-labels">
                          <span>0%</span>
                          <span>100%</span>
                        </div>
                      </div>
                      <div className="input-group">
                        <label>CAGR Decay</label>
                        <div className="decay-buttons">
                          {([
                            { value: 'none' as CAGRDecayType, label: 'None' },
                            { value: 'auto' as CAGRDecayType, label: 'Auto' },
                          ]).map((decay) => (
                            <button
                              key={decay.value}
                              type="button"
                              className={`decay-btn ${modelParams.cagrDecay === decay.value ? 'active' : ''}`}
                              onClick={() => setModelParams({ ...modelParams, cagrDecay: decay.value })}
                            >
                              {decay.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </>
                  )}

                  {growthModel === 'powerlaw' && (
                    <div className="input-group slider-group">
                      <label htmlFor="powerLawSlope">Power Law Slope: <span className="slider-value">{(modelParams.powerLawSlope || 1.6).toFixed(1)}</span></label>
                      <input
                        id="powerLawSlope"
                        type="range"
                        min="1"
                        max="3"
                        step="0.1"
                        value={modelParams.powerLawSlope || 1.6}
                        onChange={(e) => setModelParams({ ...modelParams, powerLawSlope: Number(e.target.value) })}
                      />
                      <div className="slider-labels">
                        <span>1.0</span>
                        <span>3.0</span>
                      </div>
                    </div>
                  )}

                  {growthModel === 'scurve' && (
                    <div className="input-group slider-group">
                      <label htmlFor="sCurveYearsToHalfRemaining">Years to 50% of Remaining: <span className="slider-value">{modelParams.sCurveYearsToHalfRemaining || 12} years</span></label>
                      <input
                        id="sCurveYearsToHalfRemaining"
                        type="range"
                        min="5"
                        max="30"
                        value={modelParams.sCurveYearsToHalfRemaining || 12}
                        onChange={(e) => setModelParams({ ...modelParams, sCurveYearsToHalfRemaining: Number(e.target.value) })}
                      />
                      <div className="slider-labels">
                        <span>5 years</span>
                        <span>30 years</span>
                      </div>
                    </div>
                  )}
                </div>
              </section>

              {/* JitoSOL Staking */}
              <section className="adv-section collapsible-section">
                <div className={`section-toggle ${jitoSOLEnabled ? 'enabled' : ''} ${jitoSOLExpanded ? 'expanded-below' : ''}`}>
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={jitoSOLEnabled}
                      onChange={(e) => setJitoSOLEnabled(e.target.checked)}
                    />
                    <span className="toggle-slider"></span>
                  </label>
                  <div className="toggle-text">
                    <span className="toggle-label">Stake to JitoSOL</span>
                    <span className="toggle-summary">
                      {!jitoSOLEnabled ? 'Off' : `~${(jitoSOLAPR * 100).toFixed(1)}% APR`}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="toggle-arrow-btn"
                    onClick={() => setJitoSOLExpanded(!jitoSOLExpanded)}
                  >
                    <span className={`toggle-arrow ${jitoSOLExpanded ? 'expanded' : ''}`}>▼</span>
                  </button>
                </div>

                <div className={`section-content ${jitoSOLExpanded ? 'expanded' : ''}`}>
                  <div className="input-group slider-group">
                    <label htmlFor="jitoSOLAPR">JitoSOL APR: <span className="slider-value">{(jitoSOLAPR * 100).toFixed(1)}%</span></label>
                    <input
                      id="jitoSOLAPR"
                      type="range"
                      min="3"
                      max="12"
                      step="0.5"
                      value={jitoSOLAPR * 100}
                      onChange={(e) => setJitoSOLAPR(Number(e.target.value) / 100)}
                    />
                    <div className="slider-labels">
                      <span>3%</span>
                      <span>12%</span>
                    </div>
                  </div>
                </div>
              </section>

              {/* Inflation & Debasement */}
              <section className="adv-section collapsible-section">
                <div className={`section-toggle ${inflationEnabled ? 'enabled' : ''} ${inflationExpanded ? 'expanded-below' : ''}`}>
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={inflationEnabled}
                      onChange={(e) => setInflationEnabled(e.target.checked)}
                    />
                    <span className="toggle-slider"></span>
                  </label>
                  <div className="toggle-text">
                    <span className="toggle-label">Inflation & Debasement</span>
                    <span className="toggle-summary">
                      {!inflationEnabled ? 'Off' : `${(inflationRate * 100).toFixed(1)}%${debasementRate > 0 ? ` + ${(debasementRate * 100).toFixed(0)}% debasement` : ''}`}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="toggle-arrow-btn"
                    onClick={() => setInflationExpanded(!inflationExpanded)}
                  >
                    <span className={`toggle-arrow ${inflationExpanded ? 'expanded' : ''}`}>▼</span>
                  </button>
                </div>

                <div className={`section-content ${inflationExpanded ? 'expanded' : ''}`}>
                  <div className="input-group">
                    <label>Inflation Model</label>
                    <div className="decay-buttons">
                      <button
                        type="button"
                        className={`decay-btn ${inflationType === 'linear' ? 'active' : ''}`}
                        onClick={() => setInflationType('linear')}
                      >
                        Linear
                      </button>
                      <button
                        type="button"
                        className={`decay-btn ${inflationType === 'cyclical' ? 'active' : ''}`}
                        onClick={() => setInflationType('cyclical')}
                      >
                        Cyclical
                      </button>
                    </div>
                  </div>

                  <div className="input-group slider-group">
                    <label htmlFor="inflationRate">
                      {inflationType === 'linear' ? 'Inflation Rate' : 'Base Inflation'}: <span className="slider-value">{(inflationRate * 100).toFixed(1)}%</span>
                    </label>
                    <input
                      id="inflationRate"
                      type="range"
                      min="0"
                      max="10"
                      step="0.5"
                      value={inflationRate * 100}
                      onChange={(e) => setInflationRate(Number(e.target.value) / 100)}
                    />
                    <div className="slider-labels">
                      <span>0%</span>
                      <span>10%</span>
                    </div>
                  </div>

                  {inflationType === 'cyclical' && (
                    <>
                      <div className="input-group slider-group">
                        <label htmlFor="inflationAmplitude">Cycle Amplitude: <span className="slider-value">±{(inflationAmplitude * 100).toFixed(1)}%</span></label>
                        <input
                          id="inflationAmplitude"
                          type="range"
                          min="0"
                          max="5"
                          step="0.5"
                          value={inflationAmplitude * 100}
                          onChange={(e) => setInflationAmplitude(Number(e.target.value) / 100)}
                        />
                        <div className="slider-labels">
                          <span>0%</span>
                          <span>±5%</span>
                        </div>
                      </div>

                      <div className="input-group slider-group">
                        <label htmlFor="inflationCycle">Cycle Period: <span className="slider-value">{inflationCyclePeriod} years</span></label>
                        <input
                          id="inflationCycle"
                          type="range"
                          min="4"
                          max="12"
                          step="1"
                          value={inflationCyclePeriod}
                          onChange={(e) => setInflationCyclePeriod(Number(e.target.value))}
                        />
                        <div className="slider-labels">
                          <span>4 yrs</span>
                          <span>12 yrs</span>
                        </div>
                      </div>
                    </>
                  )}

                  <div className="input-group slider-group">
                    <label htmlFor="debasement">Currency Debasement: <span className="slider-value">{(debasementRate * 100).toFixed(1)}%</span></label>
                    <input
                      id="debasement"
                      type="range"
                      min="0"
                      max="15"
                      step="0.5"
                      value={debasementRate * 100}
                      onChange={(e) => setDebasementRate(Number(e.target.value) / 100)}
                    />
                    <div className="slider-labels">
                      <span>0%</span>
                      <span>15%</span>
                    </div>
                  </div>
                </div>
              </section>

              {/* Monte Carlo Simulation */}
              <section className="adv-section collapsible-section">
                <div className={`section-toggle ${mcEnabled ? 'enabled' : ''} ${mcExpanded ? 'expanded-below' : ''}`}>
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={mcEnabled}
                      onChange={(e) => setMcEnabled(e.target.checked)}
                    />
                    <span className="toggle-slider"></span>
                  </label>
                  <div className="toggle-text">
                    <span className="toggle-label">Monte Carlo Simulation</span>
                    <span className="toggle-summary">
                      {!mcEnabled ? 'Off' : `${Math.round(mcVolatility * 100)}% vol, ${mcSimulations} sims`}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="toggle-arrow-btn"
                    onClick={() => setMcExpanded(!mcExpanded)}
                  >
                    <span className={`toggle-arrow ${mcExpanded ? 'expanded' : ''}`}>▼</span>
                  </button>
                </div>

                <div className={`section-content ${mcExpanded ? 'expanded' : ''}`}>
                  <div className="input-group slider-group">
                    <label htmlFor="mcVolatility">Starting Volatility: <span className="slider-value">{Math.round(mcVolatility * 100)}%</span></label>
                    <input
                      id="mcVolatility"
                      type="range"
                      min="20"
                      max="150"
                      step="5"
                      value={mcVolatility * 100}
                      onChange={(e) => setMcVolatility(Number(e.target.value) / 100)}
                    />
                    <div className="slider-labels">
                      <span>20%</span>
                      <span>150%</span>
                    </div>
                  </div>

                  <div className="input-group">
                    <label>Volatility Decay</label>
                    <div className="decay-buttons">
                      {([
                        { value: 'none' as VolatilityDecayType, label: 'None' },
                        { value: 'auto' as VolatilityDecayType, label: 'Auto' },
                      ]).map((decay) => (
                        <button
                          key={decay.value}
                          type="button"
                          className={`decay-btn ${mcVolatilityDecay === decay.value ? 'active' : ''}`}
                          onClick={() => setMcVolatilityDecay(decay.value)}
                        >
                          {decay.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="input-group slider-group">
                    <label htmlFor="mcSimulations">Simulations: <span className="slider-value">{mcSimulations}</span></label>
                    <input
                      id="mcSimulations"
                      type="range"
                      min="100"
                      max="2000"
                      step="100"
                      value={mcSimulations}
                      onChange={(e) => setMcSimulations(Number(e.target.value))}
                    />
                    <div className="slider-labels">
                      <span>100</span>
                      <span>2000</span>
                    </div>
                  </div>
                </div>
              </section>
            </>
          )}

          {/* Spend Sub-tab Content */}
          {planSubTab === 'spend' && projection && currentPrice && (
            <SpendTab
              startingSOL={mcEnabled && mcResult ? mcResult.finalSolP50 : projection.finalSOL}
              startingPrice={calculateFuturePrice(currentPrice, spendNow ? 0 : years, growthModel, effectiveModelParams)}
              startingValueUSD={mcEnabled && mcResult ? (inflationEnabled ? inflationAdjustmentFn(mcResult.finalP50, years) : mcResult.finalP50) : (inflationEnabled && todaysDollarsValue ? todaysDollarsValue : projection.finalValueUSD)}
              defaultInflationRate={inflationRate}
              spendNow={spendNow}
            />
          )}
        </>
      )}

      {/* Monitor Tab */}
      {mainTab === 'monitor' && (
        <>
          {/* Monitor Sub-tabs */}
          <div className="sub-tabs">
            <button
              className={`sub-tab-btn ${monitorSubTab === 'accum' ? 'active' : ''}`}
              onClick={() => setMonitorSubTab('accum')}
            >
              Accum
            </button>
            <button
              className={`sub-tab-btn ${monitorSubTab === 'decum' ? 'active' : ''}`}
              onClick={() => setMonitorSubTab('decum')}
            >
              Decum
            </button>
          </div>

          {/* Accum Sub-tab */}
          {monitorSubTab === 'accum' && currentPrice && (
            <MonitorAccum
              currentJitoSOL={currentJitoSOL}
              currentPrice={currentPrice}
              targetSOL={currentSOL}
              years={years}
              dcaAmountUSD={dcaAmountUSD}
              dcaFrequency={dcaFrequency}
              walletSOL={walletSOL}
              walletJitoSOL={walletJitoSOL}
              connected={connected}
            />
          )}

          {/* Decum Sub-tab */}
          {monitorSubTab === 'decum' && currentPrice && projection && (
            <MonitorDecum
              currentSOL={mcEnabled && mcResult ? mcResult.finalSolP50 : projection.finalSOL}
              currentPrice={calculateFuturePrice(currentPrice, years, growthModel, effectiveModelParams)}
              monthlyIncome={3000}
              retirementYears={30}
              walletSOL={walletSOL}
              walletJitoSOL={walletJitoSOL}
              connected={connected}
            />
          )}
        </>
      )}

      {/* Results Section - Show when on Plan→Grow tab */}
      {mainTab === 'plan' && planSubTab === 'grow' && projection && (
        <section className="adv-section results-section">
          <div className="results-header">
            <h2>After {spendNow ? '0' : years} Years</h2>
            <button className="share-btn" onClick={handleShare} title="Share projection">
              <Share2 size={18} />
            </button>
          </div>

          <div className="summary-cards">
            <div className="summary-card">
              <span className="card-label">
                {mcEnabled ? "Median Value" : (inflationEnabled ? "Today's Dollars" : "Portfolio Value")}
              </span>
              <span className="card-value highlight">
                {mcEnabled && mcResult
                  ? formatUSD(inflationEnabled ? inflationAdjustmentFn(mcResult.finalP50, years) : mcResult.finalP50)
                  : formatUSD(inflationEnabled && todaysDollarsValue ? todaysDollarsValue : projection.finalValueUSD)}
              </span>
            </div>

            {mcEnabled && mcResult && (
              <div className="summary-card">
                <span className="card-label">Range (P10-P90)</span>
                <span className="card-value">
                  {formatUSD(inflationEnabled ? inflationAdjustmentFn(mcResult.finalP10, years) : mcResult.finalP10)} - {formatUSD(inflationEnabled ? inflationAdjustmentFn(mcResult.finalP90, years) : mcResult.finalP90)}
                </span>
              </div>
            )}

            <div className="summary-card">
              <span className="card-label">Total Invested</span>
              <span className="card-value">{formatUSD(projection.totalInvestedUSD)}</span>
            </div>

            <div className="summary-card">
              <span className="card-label">SOL Accumulated</span>
              <span className="card-value">{formatSOL(mcEnabled && mcResult ? mcResult.finalSolP50 : projection.finalSOL)} SOL</span>
            </div>
          </div>

          {projection.projections && projection.projections.length > 0 && (
            <div className="chart-container">
              <GrowthChart
                projections={projection.projections}
                mcResult={mcEnabled ? mcResult : null}
                inflationAdjustment={inflationEnabled ? inflationAdjustmentFn : undefined}
                showRealValue={inflationEnabled}
              />
            </div>
          )}

          {mcCalculating && (
            <div className="mc-calculating">
              Running {mcSimulations} Monte Carlo simulations...
            </div>
          )}

          {!spendNow && planSubTab === 'grow' && (
            <button
              type="button"
              className="btn-primary"
              style={{ marginTop: '1.5rem', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
              onClick={() => {
                setPlanSubTab('spend');
                // Scroll to top when navigating to Spend tab
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            >
              Next: Plan Spend Strategy
              <ArrowRight size={18} />
            </button>
          )}
        </section>
      )}
    </div>
  );
}
