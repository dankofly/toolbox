'use client';

import { useState, useCallback, useEffect } from 'react';
import { Plus, Trash2, Download, Settings, RotateCcw } from 'lucide-react';

type Tab = 'festmeter' | 'balken';
type CalcMethod = 'huber_mid' | 'huber_avg_ends' | 'smalian';

interface FestmeterEntry {
  id: string;
  projectName: string;
  holzart: string;
  qualitaet: string;
  length: number;
  diameter_mid: number | null;
  diameter_d1: number | null;
  diameter_d2: number | null;
  method: CalcMethod;
  volume: number;
}

interface BalkenEntry {
  id: string;
  diameter: number;
  length: number;
  volume: number;
  suitable: boolean | null;
}

// --- Festmeter Rechner ---
function FestmeterRechner() {
  const [entries, setEntries] = useState<FestmeterEntry[]>([]);
  const [projectName, setProjectName] = useState('');
  const [holzart, setHolzart] = useState('');
  const [qualitaet, setQualitaet] = useState('');
  const [method, setMethod] = useState<CalcMethod>('huber_mid');
  const [length, setLength] = useState('');
  const [diameter, setDiameter] = useState('');
  const [d1, setD1] = useState('');
  const [d2, setD2] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Load from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('festmeter_entries');
    if (stored) {
      try {
        setEntries(JSON.parse(stored));
      } catch {
        // ignore
      }
    }
  }, []);

  // Save to localStorage
  useEffect(() => {
    localStorage.setItem('festmeter_entries', JSON.stringify(entries));
  }, [entries]);

  const parseNumber = (v: string): number => {
    return parseFloat(v.replace(',', '.'));
  };

  const calculateVolume = useCallback((l: number, d_mid: number | null, d1: number | null, d2: number | null, m: CalcMethod): number => {
    if (l <= 0) return 0;

    switch (m) {
      case 'huber_mid':
        if (!d_mid || d_mid <= 0) return 0;
        const r = (d_mid / 2) / 100; // m
        return Math.PI * r * r * l;
      case 'huber_avg_ends':
        if (!d1 || !d2 || d1 <= 0 || d2 <= 0) return 0;
        const avgD = (d1 + d2) / 2;
        const rAvg = (avgD / 2) / 100;
        return Math.PI * rAvg * rAvg * l;
      case 'smalian':
        if (!d1 || !d2 || d1 <= 0 || d2 <= 0) return 0;
        const r1 = (d1 / 2) / 100;
        const r2 = (d2 / 2) / 100;
        const a1 = Math.PI * r1 * r1;
        const a2 = Math.PI * r2 * r2;
        return ((a1 + a2) / 2) * l;
      default:
        return 0;
    }
  }, []);

  const handleAdd = () => {
    setError(null);
    if (!projectName.trim()) {
      setError('Bitte Projektnamen eingeben');
      return;
    }

    const l = parseNumber(length);
    if (isNaN(l) || l <= 0) {
      setError('Bitte gültige Länge eingeben');
      return;
    }

    let d_mid: number | null = null;
    let d_1: number | null = null;
    let d_2: number | null = null;

    if (method === 'huber_mid') {
      d_mid = parseNumber(diameter);
      if (isNaN(d_mid) || d_mid <= 0) {
        setError('Bitte gültigen Durchmesser eingeben');
        return;
      }
    } else {
      d_1 = parseNumber(d1);
      d_2 = parseNumber(d2);
      if (isNaN(d_1) || isNaN(d_2) || d_1 <= 0 || d_2 <= 0) {
        setError('Bitte gültige Durchmesser D1 und D2 eingeben');
        return;
      }
    }

    const vol = calculateVolume(l, d_mid, d_1, d_2, method);

    const entry: FestmeterEntry = {
      id: Date.now().toString(),
      projectName: projectName.trim(),
      holzart: holzart.trim(),
      qualitaet: qualitaet.trim(),
      length: l,
      diameter_mid: d_mid,
      diameter_d1: d_1,
      diameter_d2: d_2,
      method,
      volume: vol
    };

    setEntries([...entries, entry]);
    setDiameter('');
    setD1('');
    setD2('');
  };

  const handleDelete = (id: string) => {
    setEntries(entries.filter(e => e.id !== id));
  };

  const handleClearAll = () => {
    if (confirm('Alle Einträge löschen?')) {
      setEntries([]);
    }
  };

  const totalVolume = entries.reduce((sum, e) => sum + e.volume, 0);

  const formatNumber = (n: number, decimals = 3) => {
    return n.toFixed(decimals).replace('.', ',');
  };

  return (
    <div className="space-y-6">
      {/* Eingaben */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-card border border-border rounded-xl p-5 space-y-4">
          <h3 className="font-semibold">Projektdaten</h3>
          <div>
            <label className="block text-sm text-muted-foreground mb-1">Projektname *</label>
            <input
              type="text"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="z.B. Polter Waldweg"
              className="w-full h-11 px-3 rounded-lg border border-border bg-background"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-muted-foreground mb-1">Holzart</label>
              <input
                type="text"
                value={holzart}
                onChange={(e) => setHolzart(e.target.value)}
                placeholder="z.B. Fichte"
                className="w-full h-11 px-3 rounded-lg border border-border bg-background"
              />
            </div>
            <div>
              <label className="block text-sm text-muted-foreground mb-1">Qualität</label>
              <input
                type="text"
                value={qualitaet}
                onChange={(e) => setQualitaet(e.target.value)}
                placeholder="z.B. B/C"
                className="w-full h-11 px-3 rounded-lg border border-border bg-background"
              />
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-5 space-y-4">
          <h3 className="font-semibold">Maße</h3>
          <div>
            <label className="block text-sm text-muted-foreground mb-1">Messmethode</label>
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value as CalcMethod)}
              className="w-full h-11 px-3 rounded-lg border border-border bg-background"
            >
              <option value="huber_mid">Mittendurchmesser (Huber)</option>
              <option value="huber_avg_ends">Enddurchmesser D1/D2 (für Huber)</option>
              <option value="smalian">Enddurchmesser D1/D2 (für Smalian)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm text-muted-foreground mb-1">Länge (m) *</label>
            <input
              type="number"
              value={length}
              onChange={(e) => setLength(e.target.value)}
              placeholder="z.B. 4,00"
              step="0.01"
              min="0.01"
              className="w-full h-11 px-3 rounded-lg border border-border bg-background"
            />
          </div>

          {method === 'huber_mid' ? (
            <div>
              <label className="block text-sm text-muted-foreground mb-1">Mittendurchmesser (cm) *</label>
              <input
                type="number"
                value={diameter}
                onChange={(e) => setDiameter(e.target.value)}
                placeholder="z.B. 35,5"
                step="0.1"
                min="0.1"
                className="w-full h-11 px-3 rounded-lg border border-border bg-background"
              />
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-muted-foreground mb-1">D1 (cm) *</label>
                <input
                  type="number"
                  value={d1}
                  onChange={(e) => setD1(e.target.value)}
                  placeholder="z.B. 32,0"
                  step="0.1"
                  min="0.1"
                  className="w-full h-11 px-3 rounded-lg border border-border bg-background"
                />
              </div>
              <div>
                <label className="block text-sm text-muted-foreground mb-1">D2 (cm) *</label>
                <input
                  type="number"
                  value={d2}
                  onChange={(e) => setD2(e.target.value)}
                  placeholder="z.B. 38,5"
                  step="0.1"
                  min="0.1"
                  className="w-full h-11 px-3 rounded-lg border border-border bg-background"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-500 text-sm">
          {error}
        </div>
      )}

      {/* Buttons */}
      <div className="flex flex-wrap gap-3">
        <button
          onClick={handleAdd}
          className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          Position hinzufügen
        </button>
        <button
          onClick={handleClearAll}
          disabled={entries.length === 0}
          className="flex items-center gap-2 px-5 py-2.5 border border-border rounded-lg font-medium hover:bg-muted disabled:opacity-50"
        >
          <Trash2 className="h-4 w-4" />
          Alle löschen
        </button>
      </div>

      {/* Tabelle */}
      {entries.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-3 px-2">Projekt</th>
                <th className="text-left py-3 px-2">Holzart</th>
                <th className="text-left py-3 px-2">Qualität</th>
                <th className="text-right py-3 px-2">Länge (m)</th>
                <th className="text-right py-3 px-2">D (cm)</th>
                <th className="text-right py-3 px-2">Vol (Fm³)</th>
                <th className="py-3 px-2"></th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr key={entry.id} className="border-b border-border/50">
                  <td className="py-2 px-2">{entry.projectName}</td>
                  <td className="py-2 px-2">{entry.holzart || '-'}</td>
                  <td className="py-2 px-2">{entry.qualitaet || '-'}</td>
                  <td className="py-2 px-2 text-right">{formatNumber(entry.length)}</td>
                  <td className="py-2 px-2 text-right">
                    {entry.diameter_mid
                      ? formatNumber(entry.diameter_mid, 1)
                      : `${formatNumber(entry.diameter_d1!, 1)} / ${formatNumber(entry.diameter_d2!, 1)}`
                    }
                  </td>
                  <td className="py-2 px-2 text-right font-medium">{formatNumber(entry.volume)}</td>
                  <td className="py-2 px-2">
                    <button
                      onClick={() => handleDelete(entry.id)}
                      className="p-1 text-red-500 hover:bg-red-500/10 rounded"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
              <tr className="font-bold bg-muted/50">
                <td colSpan={5} className="py-3 px-2">Gesamt ({entries.length} Positionen)</td>
                <td className="py-3 px-2 text-right">{formatNumber(totalVolume)}</td>
                <td></td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// --- Balken-Stamm Rechner ---
const POST_PRESETS: Record<string, [number, number]> = {
  '10x10': [10, 10],
  '12x12': [12, 12],
  '15x15': [15, 15],
  '16x16': [16, 16],
  '16x20': [16, 20],
  '20x20': [20, 20],
  '25x25': [25, 25],
  '30x30': [30, 30],
};

function BalkenStammRechner() {
  const [postType, setPostType] = useState('15x15');
  const [customWidth, setCustomWidth] = useState('');
  const [customHeight, setCustomHeight] = useState('');
  const [allowance, setAllowance] = useState(1.0);
  const [entries, setEntries] = useState<BalkenEntry[]>([]);

  // Load from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('balken_entries');
    if (stored) {
      try {
        setEntries(JSON.parse(stored));
      } catch {
        // ignore
      }
    }
  }, []);

  // Save to localStorage
  useEffect(() => {
    localStorage.setItem('balken_entries', JSON.stringify(entries));
  }, [entries]);

  const getPostDims = (): [number, number] | null => {
    if (postType === 'custom') {
      const w = parseFloat(customWidth);
      const h = parseFloat(customHeight);
      return (w > 0 && h > 0) ? [w, h] : null;
    }
    return POST_PRESETS[postType] || null;
  };

  const calcMinDia = (dims: [number, number]): number => {
    return Math.sqrt(dims[0] ** 2 + dims[1] ** 2) + Math.max(0, allowance);
  };

  const calcVolume = (d: number, l: number): number => {
    if (d <= 0 || l <= 0) return 0;
    const r = (d / 2) / 100;
    return Math.PI * r * r * l;
  };

  const handleAddEntry = () => {
    const entry: BalkenEntry = {
      id: Date.now().toString(),
      diameter: 0,
      length: 0,
      volume: 0,
      suitable: null
    };
    setEntries([...entries, entry]);
  };

  const handleUpdateEntry = (id: string, field: 'diameter' | 'length', value: string) => {
    const numValue = parseFloat(value.replace(',', '.')) || 0;
    setEntries(entries.map(e => {
      if (e.id !== id) return e;
      const updated = { ...e, [field]: numValue };
      updated.volume = calcVolume(updated.diameter, updated.length);
      const dims = getPostDims();
      if (dims && updated.diameter > 0) {
        const minD = calcMinDia(dims);
        updated.suitable = updated.diameter >= minD;
      } else {
        updated.suitable = null;
      }
      return updated;
    }));
  };

  const handleDeleteEntry = (id: string) => {
    setEntries(entries.filter(e => e.id !== id));
  };

  const handleCalculate = () => {
    const dims = getPostDims();
    if (!dims) return;
    const minD = calcMinDia(dims);

    setEntries(entries.map(e => {
      const vol = calcVolume(e.diameter, e.length);
      return {
        ...e,
        volume: vol,
        suitable: e.diameter > 0 ? e.diameter >= minD : null
      };
    }));
  };

  const dims = getPostDims();
  const minDia = dims ? calcMinDia(dims) : null;
  const totalVolume = entries.reduce((sum, e) => sum + e.volume, 0);

  const formatNumber = (n: number, decimals = 3) => {
    return n.toFixed(decimals).replace('.', ',');
  };

  return (
    <div className="space-y-6">
      {/* Pfosten Konfiguration */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-card border border-border rounded-xl p-5 space-y-4">
          <h3 className="font-semibold">Pfostenmaße</h3>
          <div>
            <label className="block text-sm text-muted-foreground mb-1">Pfosten auswählen</label>
            <select
              value={postType}
              onChange={(e) => setPostType(e.target.value)}
              className="w-full h-11 px-3 rounded-lg border border-border bg-background"
            >
              <option value="custom">Benutzerdefiniert</option>
              {Object.keys(POST_PRESETS).map(key => (
                <option key={key} value={key}>{key.replace('x', ' × ')} cm</option>
              ))}
            </select>
          </div>

          {postType === 'custom' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-muted-foreground mb-1">Breite (cm)</label>
                <input
                  type="number"
                  value={customWidth}
                  onChange={(e) => setCustomWidth(e.target.value)}
                  step="0.1"
                  min="0.1"
                  className="w-full h-11 px-3 rounded-lg border border-border bg-background"
                />
              </div>
              <div>
                <label className="block text-sm text-muted-foreground mb-1">Höhe (cm)</label>
                <input
                  type="number"
                  value={customHeight}
                  onChange={(e) => setCustomHeight(e.target.value)}
                  step="0.1"
                  min="0.1"
                  className="w-full h-11 px-3 rounded-lg border border-border bg-background"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm text-muted-foreground mb-1">Zuschlag (cm)</label>
            <input
              type="number"
              value={allowance}
              onChange={(e) => setAllowance(parseFloat(e.target.value) || 0)}
              step="0.1"
              min="0"
              className="w-full h-11 px-3 rounded-lg border border-border bg-background"
            />
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-5 flex flex-col items-center justify-center">
          <div className="text-sm text-muted-foreground mb-2">Min. Stammdurchmesser</div>
          <div className="text-4xl font-bold text-primary">
            {minDia ? `${formatNumber(minDia, 1)} cm` : '–'}
          </div>
          {dims && (
            <div className="text-sm text-muted-foreground mt-2">
              für Pfosten {dims[0]} × {dims[1]} cm
            </div>
          )}
        </div>
      </div>

      {/* Buttons */}
      <div className="flex flex-wrap gap-3">
        <button
          onClick={handleAddEntry}
          className="flex items-center gap-2 px-5 py-2.5 border border-border rounded-lg font-medium hover:bg-muted"
        >
          <Plus className="h-4 w-4" />
          Stamm hinzufügen
        </button>
        <button
          onClick={handleCalculate}
          className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90"
        >
          Berechnen & prüfen
        </button>
      </div>

      {/* Tabelle */}
      {entries.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-3 px-2">#</th>
                <th className="text-right py-3 px-2">Ø (cm)</th>
                <th className="text-right py-3 px-2">Länge (m)</th>
                <th className="text-right py-3 px-2">Volumen (m³)</th>
                <th className="text-center py-3 px-2">Eignung</th>
                <th className="py-3 px-2"></th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry, idx) => (
                <tr key={entry.id} className="border-b border-border/50">
                  <td className="py-2 px-2">{idx + 1}</td>
                  <td className="py-2 px-2">
                    <input
                      type="number"
                      value={entry.diameter || ''}
                      onChange={(e) => handleUpdateEntry(entry.id, 'diameter', e.target.value)}
                      step="0.1"
                      min="0.1"
                      className="w-20 h-9 px-2 text-right rounded border border-border bg-background"
                    />
                  </td>
                  <td className="py-2 px-2">
                    <input
                      type="number"
                      value={entry.length || ''}
                      onChange={(e) => handleUpdateEntry(entry.id, 'length', e.target.value)}
                      step="0.1"
                      min="0.1"
                      className="w-20 h-9 px-2 text-right rounded border border-border bg-background"
                    />
                  </td>
                  <td className="py-2 px-2 text-right font-medium">
                    {entry.volume > 0 ? formatNumber(entry.volume) : '–'}
                  </td>
                  <td className="py-2 px-2 text-center">
                    {entry.suitable === true && <span className="text-green-500 text-lg">✔</span>}
                    {entry.suitable === false && <span className="text-red-500 text-lg">✖</span>}
                    {entry.suitable === null && '–'}
                  </td>
                  <td className="py-2 px-2">
                    <button
                      onClick={() => handleDeleteEntry(entry.id)}
                      className="p-1 text-red-500 hover:bg-red-500/10 rounded"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
              <tr className="font-bold bg-muted/50">
                <td colSpan={3} className="py-3 px-2">Gesamt</td>
                <td className="py-3 px-2 text-right">{formatNumber(totalVolume)}</td>
                <td colSpan={2}></td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// --- Haupt-Komponente ---
export function HolzTools() {
  const [activeTab, setActiveTab] = useState<Tab>('festmeter');

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="flex gap-2">
        <button
          onClick={() => setActiveTab('festmeter')}
          className={`px-5 py-2.5 rounded-lg font-medium transition-colors ${
            activeTab === 'festmeter'
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted hover:bg-muted/80'
          }`}
        >
          Festmeter-Rechner
        </button>
        <button
          onClick={() => setActiveTab('balken')}
          className={`px-5 py-2.5 rounded-lg font-medium transition-colors ${
            activeTab === 'balken'
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted hover:bg-muted/80'
          }`}
        >
          Balken-Stamm Pro
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'festmeter' ? (
        <FestmeterRechner />
      ) : (
        <BalkenStammRechner />
      )}
    </div>
  );
}
