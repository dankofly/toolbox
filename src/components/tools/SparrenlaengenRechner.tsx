'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { RotateCcw } from 'lucide-react';

type Unit = 'm' | 'cm' | 'mm' | 'ft' | 'in';
type PitchUnit = 'deg' | 'pct';
type Mode = 'pitch' | 'ridge';

interface CalculationResult {
  rafterU: number;
  riseU: number;
  depthU: number;
  overU: number;
  pitchDeg: number;
}

const DECIMALS_BY_UNIT: Record<Unit, number> = { m: 3, cm: 1, mm: 0, ft: 3, in: 2 };
const STEP_BY_UNIT: Record<Unit, number> = { m: 0.01, cm: 0.1, mm: 1, ft: 0.01, in: 0.01 };
const MIN_BY_UNIT: Record<Unit, number> = { m: 0.01, cm: 0.1, mm: 1, ft: 0.01, in: 0.01 };

// Conversion functions
const toM = (v: number, u: Unit): number => {
  const conversions: Record<Unit, number> = { m: v, cm: v / 100, mm: v / 1000, ft: v * 0.3048, in: v * 0.0254 };
  return conversions[u];
};

const fromM = (v: number, u: Unit): number => {
  const conversions: Record<Unit, number> = { m: v, cm: v * 100, mm: v * 1000, ft: v / 0.3048, in: v / 0.0254 };
  return conversions[u];
};

const degToPct = (deg: number): number => Math.tan((deg * Math.PI) / 180) * 100;
const pctToDeg = (pct: number): number => (Math.atan(pct / 100) * 180) / Math.PI;
const riseFrom = (depth: number, pitchDeg: number): number => Math.tan((pitchDeg * Math.PI) / 180) * depth;
const rafterFrom = (depth: number, rise: number): number => Math.hypot(depth, rise);
const pitchFrom = (depth: number, rise: number): number => (Math.atan2(rise, depth) * 180) / Math.PI;
const clamp = (v: number, min: number, max: number): number => Math.max(min, Math.min(max, v));

export function SparrenlaengenRechner() {
  const [mode, setMode] = useState<Mode>('pitch');
  const [unit, setUnit] = useState<Unit>('m');
  const [pitchUnit, setPitchUnit] = useState<PitchUnit>('deg');
  const [horizontalDepth, setHorizontalDepth] = useState<string>('');
  const [eavesOverhang, setEavesOverhang] = useState<string>('0');
  const [roofPitch, setRoofPitch] = useState<string>('');
  const [ridgeHeight, setRidgeHeight] = useState<string>('');
  const [result, setResult] = useState<CalculationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const fmt = useCallback((v: number): string => {
    const d = DECIMALS_BY_UNIT[unit] ?? 2;
    const n = Math.abs(v) < 1e-12 ? 0 : v;
    return Number(n).toFixed(d);
  }, [unit]);

  const readNumber = (value: string): number => {
    const v = value.replace(',', '.');
    return parseFloat(v);
  };

  const calculate = useCallback(() => {
    const depthRaw = readNumber(horizontalDepth);
    const overRaw = readNumber(eavesOverhang);

    if (!(depthRaw > 0)) {
      setError('Bitte Tiefe in Draufsicht eingeben (>0).');
      setResult(null);
      return;
    }
    if (!(overRaw >= 0)) {
      setError('Traufüberstand darf nicht negativ sein.');
      setResult(null);
      return;
    }

    const depth = toM(depthRaw, unit);
    const over = toM(overRaw, unit);
    const dTot = depth + over;

    let pitchDeg: number;
    let riseM: number;

    if (mode === 'pitch') {
      const raw = readNumber(roofPitch);
      if (!(raw > 0)) {
        setError('Bitte Dachneigung eingeben (>0).');
        setResult(null);
        return;
      }
      pitchDeg = pitchUnit === 'deg' ? raw : pctToDeg(raw);
      pitchDeg = clamp(pitchDeg, 0.1, 89.9);
      riseM = riseFrom(dTot, pitchDeg);
    } else {
      const rhRaw = readNumber(ridgeHeight);
      if (!(rhRaw > 0)) {
        setError('Bitte Firsthöhe eingeben (>0).');
        setResult(null);
        return;
      }
      riseM = toM(rhRaw, unit);
      pitchDeg = pitchFrom(dTot, riseM);
    }

    const rafterM = rafterFrom(dTot, riseM);
    const rafterU = fromM(rafterM, unit);
    const riseU = fromM(riseM, unit);
    const depthU = fromM(dTot, unit);
    const overU = fromM(over, unit);

    setError(null);
    setResult({ rafterU, riseU, depthU, overU, pitchDeg });
  }, [horizontalDepth, eavesOverhang, roofPitch, ridgeHeight, mode, unit, pitchUnit]);

  const handleReset = () => {
    setHorizontalDepth('');
    setEavesOverhang('0');
    setRoofPitch('');
    setRidgeHeight('');
    setMode('pitch');
    setUnit('m');
    setPitchUnit('deg');
    setResult(null);
    setError(null);
  };

  // Auto-calculate on input change
  useEffect(() => {
    const timer = setTimeout(() => {
      if (horizontalDepth) {
        calculate();
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [horizontalDepth, eavesOverhang, roofPitch, ridgeHeight, mode, unit, pitchUnit, calculate]);

  // SVG Drawing
  const renderSVG = () => {
    if (!result || result.depthU <= 0 || result.riseU <= 0) {
      return null;
    }

    const W = 480, H = 260, baseY = H - 30, centerX = W / 2;
    const scale = 170 / Math.max(result.depthU, result.riseU);
    const dPx = result.depthU * scale;
    const rPx = result.riseU * scale;
    const footX = centerX - dPx;
    const ridgeX = centerX;
    const ridgeY = baseY - rPx;

    const overPx = result.overU * scale;

    return (
      <>
        {/* Baseline */}
        <line x1={footX} y1={baseY} x2={ridgeX} y2={baseY} stroke="currentColor" strokeWidth="2" />
        {/* Sparren */}
        <line x1={footX} y1={baseY} x2={ridgeX} y2={ridgeY} stroke="currentColor" strokeWidth="2" />

        {/* Tiefe (unten) */}
        <line x1={footX} y1={baseY + 20} x2={ridgeX} y2={baseY + 20} stroke="currentColor" strokeWidth="1.5" strokeDasharray="6 6" />
        <line x1={footX} y1={baseY + 12} x2={footX} y2={baseY + 28} stroke="currentColor" strokeWidth="1.5" />
        <line x1={ridgeX} y1={baseY + 12} x2={ridgeX} y2={baseY + 28} stroke="currentColor" strokeWidth="1.5" />
        <text x={(footX + ridgeX) / 2} y={baseY + 36} textAnchor="middle" className="fill-current text-sm">
          Tiefe {fmt(result.depthU)} {unit}
        </text>

        {/* Trauf-Überstand */}
        {result.overU > 0 && (
          <>
            <line x1={footX} y1={baseY + 52} x2={footX + overPx} y2={baseY + 52} stroke="currentColor" strokeWidth="1.5" strokeDasharray="6 6" />
            <line x1={footX} y1={baseY + 44} x2={footX} y2={baseY + 60} stroke="currentColor" strokeWidth="1.5" />
            <line x1={footX + overPx} y1={baseY + 44} x2={footX + overPx} y2={baseY + 60} stroke="currentColor" strokeWidth="1.5" />
            <text x={footX + overPx / 2} y={baseY + 68} textAnchor="middle" className="fill-current text-sm">
              Überstand {fmt(result.overU)} {unit}
            </text>
          </>
        )}

        {/* Firsthöhe (rechts) */}
        <line x1={ridgeX + 24} y1={baseY} x2={ridgeX + 24} y2={ridgeY} stroke="currentColor" strokeWidth="1.5" strokeDasharray="6 6" />
        <line x1={ridgeX + 16} y1={baseY} x2={ridgeX + 32} y2={baseY} stroke="currentColor" strokeWidth="1.5" />
        <line x1={ridgeX + 16} y1={ridgeY} x2={ridgeX + 32} y2={ridgeY} stroke="currentColor" strokeWidth="1.5" />
        <text x={ridgeX + 36} y={(baseY + ridgeY) / 2} textAnchor="start" className="fill-current text-sm">
          H {fmt(result.riseU)} {unit}
        </text>

        {/* Sparrenmaß */}
        <text x={ridgeX - 12} y={(baseY + ridgeY) / 2} textAnchor="end" className="fill-current text-sm font-semibold">
          {fmt(result.rafterU)} {unit}
        </text>

        {/* Neigung */}
        <text x={footX + 24} y={baseY - 18} textAnchor="start" className="fill-current text-sm">
          {result.pitchDeg.toFixed(1)}°
        </text>
      </>
    );
  };

  const pitchDisplay = result
    ? pitchUnit === 'deg' || mode === 'ridge'
      ? `${result.pitchDeg.toFixed(1)}°`
      : `${degToPct(result.pitchDeg).toFixed(1)} %`
    : null;

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <label htmlFor="unit" className="sr-only">Längeneinheit</label>
          <select
            id="unit"
            value={unit}
            onChange={(e) => setUnit(e.target.value as Unit)}
            className="h-10 px-3 rounded-lg border border-border bg-card text-foreground"
          >
            <option value="m">Meter [m]</option>
            <option value="cm">Zentimeter [cm]</option>
            <option value="mm">Millimeter [mm]</option>
            <option value="ft">Feet [ft]</option>
            <option value="in">Inch [in]</option>
          </select>
        </div>
        <button
          onClick={handleReset}
          className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border hover:bg-muted transition-colors"
        >
          <RotateCcw className="h-4 w-4" />
          Zurücksetzen
        </button>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Eingaben */}
        <div className="bg-card border border-border rounded-2xl p-6 space-y-6">
          <h2 className="text-lg font-semibold">Eingaben</h2>

          {/* Modus-Auswahl */}
          <div className="flex gap-2">
            <button
              onClick={() => setMode('pitch')}
              className={`flex-1 py-3 px-4 rounded-full border text-sm font-medium transition-colors ${
                mode === 'pitch'
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border hover:bg-muted'
              }`}
            >
              Dachneigung
            </button>
            <button
              onClick={() => setMode('ridge')}
              className={`flex-1 py-3 px-4 rounded-full border text-sm font-medium transition-colors ${
                mode === 'ridge'
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border hover:bg-muted'
              }`}
            >
              Firsthöhe
            </button>
          </div>

          {/* Neigungs-Einheit */}
          {mode === 'pitch' && (
            <div>
              <label className="block text-sm text-muted-foreground mb-2">Neigungs-Einheit</label>
              <select
                value={pitchUnit}
                onChange={(e) => setPitchUnit(e.target.value as PitchUnit)}
                className="w-full h-12 px-3 rounded-xl border border-border bg-background text-foreground focus:border-primary focus:ring-2 focus:ring-primary/20"
              >
                <option value="deg">Grad [°]</option>
                <option value="pct">Prozent [%]</option>
              </select>
            </div>
          )}

          {/* Grundmaße */}
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-3">Grundmaße</h3>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-muted-foreground mb-2">
                  Tiefe in Draufsicht <span className="text-muted-foreground">[{unit}]</span>
                </label>
                <input
                  type="number"
                  value={horizontalDepth}
                  onChange={(e) => setHorizontalDepth(e.target.value)}
                  placeholder="z. B. 3,50"
                  step={STEP_BY_UNIT[unit]}
                  min={MIN_BY_UNIT[unit]}
                  className="w-full h-12 px-3 rounded-xl border border-border bg-background text-foreground focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
                <p className="text-xs text-muted-foreground mt-1">Traufe → First-Lot (Draufsicht)</p>
              </div>
              <div>
                <label className="block text-sm text-muted-foreground mb-2">
                  Traufüberstand <span className="text-muted-foreground">[{unit}]</span>
                </label>
                <input
                  type="number"
                  value={eavesOverhang}
                  onChange={(e) => setEavesOverhang(e.target.value)}
                  placeholder="z. B. 0,30"
                  step={STEP_BY_UNIT[unit]}
                  min="0"
                  className="w-full h-12 px-3 rounded-xl border border-border bg-background text-foreground focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
                <p className="text-xs text-muted-foreground mt-1">Wird zur Tiefe addiert</p>
              </div>
            </div>
          </div>

          {/* Dachneigung / Firsthöhe */}
          {mode === 'pitch' ? (
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-3">Dachneigung</h3>
              <label className="block text-sm text-muted-foreground mb-2">
                Dachneigung ({pitchUnit === 'deg' ? '°' : '%'})
              </label>
              <input
                type="number"
                value={roofPitch}
                onChange={(e) => setRoofPitch(e.target.value)}
                placeholder="z. B. 35"
                step="0.1"
                min="0.1"
                className="w-full h-12 px-3 rounded-xl border border-border bg-background text-foreground focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </div>
          ) : (
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-3">Firsthöhe</h3>
              <label className="block text-sm text-muted-foreground mb-2">
                Firsthöhe <span className="text-muted-foreground">[{unit}]</span>
              </label>
              <input
                type="number"
                value={ridgeHeight}
                onChange={(e) => setRidgeHeight(e.target.value)}
                placeholder="z. B. 2,10"
                step={STEP_BY_UNIT[unit]}
                min={MIN_BY_UNIT[unit]}
                className="w-full h-12 px-3 rounded-xl border border-border bg-background text-foreground focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </div>
          )}

          {/* Berechnen Button */}
          <button
            onClick={calculate}
            className="w-full py-3 bg-primary text-primary-foreground font-semibold rounded-xl hover:bg-primary/90 transition-colors"
          >
            Berechnen
          </button>

          {/* Ergebnis */}
          <div className={`p-4 rounded-xl border ${error ? 'border-red-500/50' : 'border-green-500/50'}`}>
            {error ? (
              <p className="text-muted-foreground">{error}</p>
            ) : result ? (
              <div className="space-y-2">
                <div className="flex justify-between items-baseline">
                  <span className="font-semibold">Sparrenlänge:</span>
                  <span className="text-xl font-bold">{fmt(result.rafterU)} {unit}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Firsthöhe:</span>
                  <span>{fmt(result.riseU)} {unit}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Tiefe:</span>
                  <span>{fmt(result.depthU)} {unit}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Überstand:</span>
                  <span>{fmt(result.overU)} {unit}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Neigung:</span>
                  <span>{pitchDisplay}</span>
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground">Gib Tiefe und Neigung oder Firsthöhe ein, dann „Berechnen".</p>
            )}
          </div>
        </div>

        {/* Visualisierung */}
        <div className="bg-card border border-border rounded-2xl p-6">
          <h2 className="text-lg font-semibold mb-4">Visualisierung & Maße</h2>
          <div className="relative rounded-xl border border-dashed border-border overflow-hidden bg-muted/30">
            {/* Grid Background */}
            <div
              className="absolute inset-0 opacity-10"
              style={{
                backgroundImage: 'linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)',
                backgroundSize: '24px 24px'
              }}
            />
            <svg
              ref={svgRef}
              viewBox="0 0 480 260"
              className="w-full h-auto min-h-[240px]"
              role="img"
              aria-label="Dachgeometrie"
            >
              {renderSVG()}
            </svg>
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            Darstellung symbolisch; Zahlen sind real (gewählte Einheit).
          </p>
        </div>
      </div>
    </div>
  );
}
