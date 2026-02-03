import { useState, useMemo, useCallback } from 'react';
import {
  calculateProjection,
  formatUSD,
  formatSOL,
  type ProjectionInput,
  type ProjectionResult,
  type GrowthModel,
  type GrowthModelParams,
} from '../utils/calculations';
import { getModelDisplayName, getModelDescription, getFuturePowerLawFairValue, type CAGRDecayType } from '../utils/growthModels';
import { toTodaysDollars, type InflationParams } from '../utils/inflation';
import { runMonteCarloSimulation, type MonteCarloParams, type MonteCarloResult, type VolatilityDecayType } from '../utils/monteCarlo';
import { fetchSOLPrice } from '../utils/solPrice';
import { shareProjection as shareAdvanced } from '../utils/shareImageAdvanced';
import { GrowthChart } from './advanced/GrowthChart';
import './AdvancedMode.css';
import { useEffect } from 'react';

type DCAFrequency = 'daily' | 'weekly' | 'monthly' | 'yearly';

interface AdvancedModeProps {
  initialSOL?: number;
  initialDCA?: number;
  initialYears?: number;
}

export function AdvancedMode({ initialSOL = 100, initialDCA = 500, initialYears = 10 }: AdvancedModeProps) {
  // Form state
  const [currentSOL, setCurrentSOL] = useState<number>(initialSOL);
  const [currentJitoSOL, setCurrentJitoSOL] = useState<number>(0);
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);
  const [priceLoading, setPriceLoading] = useState<boolean>(true);
  const [years, setYears] = useState<number>(initialYears);
  const [dcaAmountUSD, setDcaAmountUSD] = useState<number>(initialDCA);
  const [dcaMaxLimit, setDcaMaxLimit] = useState<number>(5000);
  const [dcaFrequency, setDcaFrequency] = useState<DCAFrequency>('monthly');

  // Growth model state
  const [growthModel, setGrowthModel] = useState<GrowthModel>('cagr');
  const [modelParams, setModelParams] = useState<GrowthModelParams>({
    cagr: 0.25,
    cagrDecay: 'auto',
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

  // Inflation & Debasement state
  const [inflationEnabled, setInflationEnabled] = useState(false);
  const [inflationExpanded, setInflationExpanded] = useState(false);
  const [inflationType, setInflationType] = useState<'linear' | 'cyclical'>('linear');
  const [inflationRate, setInflationRate] = useState(0.035);
  const [inflationAmplitude, setInflationAmplitude] = useState(0.02);
  const [inflationCyclePeriod, setInflationCyclePeriod] = useState(7);
  const [debasementRate, setDebasementRate] = useState(0.07);

  // Monte Carlo state
  const [mcEnabled, setMcEnabled] = useState(false);
  const [mcExpanded, setMcExpanded] = useState(false);
  const [mcVolatility, setMcVolatility] = useState(0.80);
  const [mcVolatilityDecay, setMcVolatilityDecay] = useState<VolatilityDecayType>('auto');
  const [mcSimulations, setMcSimulations] = useState(500);
  const [mcCalculating, setMcCalculating] = useState(false);

  // JitoSOL staking state
  const [jitoSOLEnabled, setJitoSOLEnabled] = useState(false);
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
      years,
      dcaAmountUSD,
      dcaFrequency,
      growthModel,
      modelParams: effectiveModelParams,
      jitoSOLEnabled,
      jitoSOLAPR,
    };
    return calculateProjection(input);
  }, [effectiveSOL, currentPrice, years, dcaAmountUSD, dcaFrequency, growthModel, effectiveModelParams, jitoSOLEnabled, jitoSOLAPR]);

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
        years,
        dcaAmountUSD,
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
  }, [mcEnabled, effectiveSOL, currentPrice, years, dcaAmountUSD, dcaFrequency, growthModel, effectiveModelParams, mcParams, jitoSOLEnabled, jitoSOLAPR]);

  const handleShare = useCallback(async () => {
    if (!projection) return;
    try {
      await shareAdvanced({
        projection,
        years,
        growthModel,
        modelParams: effectiveModelParams,
        dcaAmountUSD,
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
  }, [projection, years, growthModel, effectiveModelParams, dcaAmountUSD, dcaFrequency, effectiveSOL, currentPrice, mcEnabled, mcResult, mcVolatility, mcSimulations, inflationEnabled, inflationParams, todaysDollarsValue, inflationAdjustmentFn]);

  if (priceLoading) {
    return <div className="advanced-loading">Loading price data...</div>;
  }

  return (
    <div className="advanced-mode">
      {/* Holdings Section */}
      <section className="adv-section">
        <h2>Your SOL Holdings</h2>
        
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

        <div className="price-display">
          Current Price: <span className="price-value">${currentPrice?.toFixed(2)}</span>
        </div>

        {currentPrice && (
          <div className="current-value-display">
            Current Value: <span className="highlight">{formatUSD((currentSOL + currentJitoSOL) * currentPrice)}</span>
          </div>
        )}
      </section>

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
              {!inflationEnabled ? 'Off' : `${(inflationRate * 100).toFixed(1)}% + ${(debasementRate * 100).toFixed(0)}% debasement`}
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

      {/* Results Section */}
      {projection && (
        <section className="adv-section results-section">
          <div className="results-header">
            <h2>After {years} Years</h2>
            <button className="share-btn" onClick={handleShare}>
              📤 Share
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
        </section>
      )}
    </div>
  );
}
