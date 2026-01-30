'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { Plus, Trash2, Edit, Download, Upload, Calculator, Wand2, ChevronDown, ChevronUp } from 'lucide-react';

// --- Types ---
interface Cut {
  id: string;
  breite: number; // in meters
  laenge: number; // in meters
  bezeichnung: string;
  materialBezeichnung: string;
  color: string;
}

interface Placement {
  cutId: string;
  breite: number;
  laenge: number;
  x: number;
  y: number;
  color: string;
  bezeichnung: string;
  rotated: boolean;
}

interface Sheet {
  placements: Placement[];
  usedLength: number;
  wasteArea: number;
}

interface OptimizationResult {
  sheets: Sheet[];
  totalUsedArea: number;
  totalWasteArea: number;
  verschnittProzent: number;
  totalMaterialKosten: number;
}

// --- Material Templates ---
const MATERIAL_TEMPLATES: Record<string, { name: string; pricePerM2: number }> = {
  kupfer: { name: 'Kupfer', pricePerM2: 85 },
  titanzink: { name: 'Titanzink', pricePerM2: 45 },
  blei: { name: 'Blei', pricePerM2: 60 },
  aluminium: { name: 'Aluminium', pricePerM2: 25 },
  stahlblech: { name: 'Stahlblech verzinkt', pricePerM2: 18 },
  edelstahl: { name: 'Edelstahl', pricePerM2: 55 },
  prefa: { name: 'PREFA Aluminium', pricePerM2: 75 },
};

// --- Helper Functions ---
const getRandomColor = (existingColors: string[]): string => {
  let color: string;
  let attempts = 0;
  do {
    const h = Math.floor(Math.random() * 360);
    const s = Math.floor(Math.random() * 30) + 70;
    const l = Math.floor(Math.random() * 15) + 75;
    color = `hsl(${h}, ${s}%, ${l}%)`;
    attempts++;
    if (attempts > 50) break;
  } while (existingColors.includes(color));
  return color;
};

const formatNumber = (num: number, decimals = 2): string => {
  if (isNaN(num) || num === null) return '0,00';
  return num.toFixed(decimals).replace('.', ',');
};

// --- Main Component ---
export function Verschnittoptimierung() {
  // Project
  const [projectName, setProjectName] = useState('Neues Projekt');

  // Cuts
  const [cuts, setCuts] = useState<Cut[]>([]);
  const [usedColors, setUsedColors] = useState<string[]>([]);

  // Cut form
  const [breite, setBreite] = useState('');
  const [laenge, setLaenge] = useState('');
  const [bezeichnung, setBezeichnung] = useState('');
  const [editingCutId, setEditingCutId] = useState<string | null>(null);

  // Material
  const [materialVorlage, setMaterialVorlage] = useState('');
  const [materialBezeichnung, setMaterialBezeichnung] = useState('');
  const [materialKostenProM2, setMaterialKostenProM2] = useState('');
  const [rolleBreite, setRolleBreite] = useState('100');
  const [rolleLaenge, setRolleLaenge] = useState('30');
  const [maxLaenge, setMaxLaenge] = useState('4');

  // Results
  const [result, setResult] = useState<OptimizationResult | null>(null);

  // UI States
  const [showCutForm, setShowCutForm] = useState(true);
  const [showProjectForm, setShowProjectForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- Apply Material Template ---
  useEffect(() => {
    if (materialVorlage && MATERIAL_TEMPLATES[materialVorlage]) {
      const template = MATERIAL_TEMPLATES[materialVorlage];
      setMaterialBezeichnung(template.name);
      setMaterialKostenProM2(template.pricePerM2.toString());
    }
  }, [materialVorlage]);

  // --- Add/Edit Cut ---
  const addCut = useCallback(() => {
    setError(null);
    const b = parseFloat(breite.replace(',', '.')) / 100; // cm to m
    const l = parseFloat(laenge.replace(',', '.'));

    if (!(b > 0) || !(l > 0)) {
      setError('Bitte gültige Breite (cm) und Länge (m) eingeben.');
      return;
    }

    const rollWidthM = parseFloat(rolleBreite) / 100;
    if (b > rollWidthM) {
      setError(`Breite (${formatNumber(b * 100, 1)} cm) überschreitet Rollenbreite (${rolleBreite} cm).`);
      return;
    }

    if (editingCutId) {
      setCuts((prev) =>
        prev.map((cut) =>
          cut.id === editingCutId
            ? { ...cut, breite: b, laenge: l, bezeichnung, materialBezeichnung }
            : cut
        )
      );
      setEditingCutId(null);
    } else {
      const newColor = getRandomColor(usedColors);
      setUsedColors((prev) => [...prev, newColor]);
      setCuts((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          breite: b,
          laenge: l,
          bezeichnung,
          materialBezeichnung,
          color: newColor,
        },
      ]);
    }

    setBreite('');
    setLaenge('');
    setBezeichnung('');
  }, [breite, laenge, bezeichnung, materialBezeichnung, editingCutId, usedColors, rolleBreite]);

  const editCut = (cut: Cut) => {
    setBreite((cut.breite * 100).toString());
    setLaenge(cut.laenge.toString());
    setBezeichnung(cut.bezeichnung);
    setEditingCutId(cut.id);
    setShowCutForm(true);
  };

  const deleteCut = (id: string) => {
    setCuts((prev) => prev.filter((cut) => cut.id !== id));
    setResult(null);
  };

  // --- Optimization Algorithm (First-Fit Decreasing) ---
  const optimizeCuts = useCallback(() => {
    if (cuts.length === 0) {
      setError('Keine Zuschnitte zum Optimieren vorhanden.');
      return;
    }

    setError(null);
    const rollWidthM = parseFloat(rolleBreite) / 100;
    const rollLengthM = parseFloat(rolleLaenge);
    const maxL = parseFloat(maxLaenge);
    const pricePerM2 = parseFloat(materialKostenProM2) || 0;

    if (!(rollWidthM > 0) || !(rollLengthM > 0)) {
      setError('Ungültige Rollenmaße.');
      return;
    }

    // Create pieces from cuts, splitting if necessary
    interface Piece {
      cutId: string;
      breite: number;
      laenge: number;
      color: string;
      bezeichnung: string;
    }
    const pieces: Piece[] = [];

    cuts.forEach((cut) => {
      let remaining = cut.laenge;
      while (remaining > 0) {
        const pieceLength = Math.min(remaining, maxL);
        pieces.push({
          cutId: cut.id,
          breite: cut.breite,
          laenge: pieceLength,
          color: cut.color,
          bezeichnung: cut.bezeichnung,
        });
        remaining -= pieceLength;
      }
    });

    // Sort pieces by width (descending) for better packing
    pieces.sort((a, b) => b.breite - a.breite);

    // First-Fit Decreasing algorithm
    const sheets: Sheet[] = [];

    pieces.forEach((piece) => {
      let placed = false;

      // Try to fit in existing sheets
      for (const sheet of sheets) {
        // Check if piece fits in remaining width at current length
        const currentMaxY = sheet.placements.reduce(
          (max, p) => Math.max(max, p.y + p.laenge),
          0
        );

        // Try to place beside existing pieces
        for (let x = 0; x <= rollWidthM - piece.breite; x += 0.01) {
          let canPlace = true;
          let maxYAtX = 0;

          for (const p of sheet.placements) {
            if (x < p.x + p.breite && x + piece.breite > p.x) {
              maxYAtX = Math.max(maxYAtX, p.y + p.laenge);
            }
          }

          if (maxYAtX + piece.laenge <= rollLengthM) {
            sheet.placements.push({
              cutId: piece.cutId,
              breite: piece.breite,
              laenge: piece.laenge,
              x: Math.round(x * 100) / 100,
              y: maxYAtX,
              color: piece.color,
              bezeichnung: piece.bezeichnung,
              rotated: false,
            });
            sheet.usedLength = Math.max(sheet.usedLength, maxYAtX + piece.laenge);
            placed = true;
            break;
          }
        }
        if (placed) break;
      }

      // Create new sheet if needed
      if (!placed) {
        sheets.push({
          placements: [
            {
              cutId: piece.cutId,
              breite: piece.breite,
              laenge: piece.laenge,
              x: 0,
              y: 0,
              color: piece.color,
              bezeichnung: piece.bezeichnung,
              rotated: false,
            },
          ],
          usedLength: piece.laenge,
          wasteArea: 0,
        });
      }
    });

    // Calculate areas
    let totalUsedArea = 0;
    let totalConsumedArea = 0;

    sheets.forEach((sheet) => {
      const sheetUsedArea = sheet.placements.reduce(
        (sum, p) => sum + p.breite * p.laenge,
        0
      );
      const sheetConsumedArea = rollWidthM * sheet.usedLength;
      sheet.wasteArea = sheetConsumedArea - sheetUsedArea;
      totalUsedArea += sheetUsedArea;
      totalConsumedArea += sheetConsumedArea;
    });

    const totalWasteArea = totalConsumedArea - totalUsedArea;
    const verschnittProzent = totalConsumedArea > 0 ? (totalWasteArea / totalConsumedArea) * 100 : 0;
    const totalMaterialKosten = totalConsumedArea * pricePerM2;

    setResult({
      sheets,
      totalUsedArea,
      totalWasteArea,
      verschnittProzent,
      totalMaterialKosten,
    });
  }, [cuts, rolleBreite, rolleLaenge, maxLaenge, materialKostenProM2]);

  // --- Export/Import ---
  const exportProject = () => {
    const data = {
      projectName,
      cuts,
      materialBezeichnung,
      materialKostenProM2,
      rolleBreite,
      rolleLaenge,
      maxLaenge,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${projectName}.json`;
    a.click();
  };

  const importProject = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const fr = new FileReader();
    fr.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string);
        setProjectName(data.projectName || 'Importiertes Projekt');
        setCuts(data.cuts || []);
        setMaterialBezeichnung(data.materialBezeichnung || '');
        setMaterialKostenProM2(data.materialKostenProM2 || '');
        setRolleBreite(data.rolleBreite || '100');
        setRolleLaenge(data.rolleLaenge || '30');
        setMaxLaenge(data.maxLaenge || '4');
        setUsedColors(data.cuts?.map((c: Cut) => c.color) || []);
        setResult(null);
      } catch {
        setError('Fehler beim Import.');
      }
    };
    fr.readAsText(file);
    e.target.value = '';
  };

  const resetProject = () => {
    if (confirm('Alle Daten löschen?')) {
      setProjectName('Neues Projekt');
      setCuts([]);
      setUsedColors([]);
      setResult(null);
    }
  };

  // --- Render ---
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-xl font-bold text-primary">{projectName}</h2>
      </div>

      {/* Error */}
      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-500">{error}</div>
      )}

      {/* Project Management */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <button
          onClick={() => setShowProjectForm(!showProjectForm)}
          className="w-full px-4 py-3 flex items-center justify-between bg-primary text-primary-foreground font-medium"
        >
          <span>Projektverwaltung</span>
          {showProjectForm ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
        </button>
        {showProjectForm && (
          <div className="p-4 space-y-4">
            <div>
              <label className="block text-sm text-muted-foreground mb-1">Projektname</label>
              <input
                type="text"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-border bg-background"
              />
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={exportProject}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                <Download className="h-4 w-4" />
                Export
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
              >
                <Upload className="h-4 w-4" />
                Import
              </button>
              <button
                onClick={resetProject}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                <Trash2 className="h-4 w-4" />
                Reset
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                className="hidden"
                onChange={importProject}
              />
            </div>
          </div>
        )}
      </div>

      {/* Cut & Material Form */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <button
          onClick={() => setShowCutForm(!showCutForm)}
          className="w-full px-4 py-3 flex items-center justify-between bg-primary text-primary-foreground font-medium"
        >
          <span>Zuschnittdaten & Materialdaten</span>
          {showCutForm ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
        </button>
        {showCutForm && (
          <div className="p-4">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Cut Data */}
              <div className="space-y-4">
                <h4 className="font-semibold">Zuschnittdaten</h4>
                <div>
                  <label className="block text-sm text-muted-foreground mb-1">Breite (cm)</label>
                  <input
                    type="number"
                    value={breite}
                    onChange={(e) => setBreite(e.target.value)}
                    step="0.1"
                    placeholder="z.B. 30"
                    className="w-full h-10 px-3 rounded-lg border border-border bg-background"
                  />
                </div>
                <div>
                  <label className="block text-sm text-muted-foreground mb-1">Länge (m)</label>
                  <input
                    type="number"
                    value={laenge}
                    onChange={(e) => setLaenge(e.target.value)}
                    step="0.01"
                    placeholder="z.B. 16"
                    className="w-full h-10 px-3 rounded-lg border border-border bg-background"
                  />
                </div>
                <div>
                  <label className="block text-sm text-muted-foreground mb-1">Bezeichnung</label>
                  <input
                    type="text"
                    value={bezeichnung}
                    onChange={(e) => setBezeichnung(e.target.value)}
                    placeholder="Optional"
                    className="w-full h-10 px-3 rounded-lg border border-border bg-background"
                  />
                </div>
                <button
                  onClick={addCut}
                  className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
                >
                  <Plus className="h-4 w-4" />
                  {editingCutId ? 'Zuschnitt aktualisieren' : 'Zuschnitt hinzufügen'}
                </button>
              </div>

              {/* Material Data */}
              <div className="space-y-4">
                <h4 className="font-semibold">Materialdaten</h4>
                <div>
                  <label className="block text-sm text-muted-foreground mb-1">Material-Vorlage</label>
                  <select
                    value={materialVorlage}
                    onChange={(e) => setMaterialVorlage(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg border border-border bg-background"
                  >
                    <option value="">Bitte wählen...</option>
                    {Object.entries(MATERIAL_TEMPLATES).map(([key, val]) => (
                      <option key={key} value={key}>
                        {val.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-muted-foreground mb-1">Material-Bezeichnung</label>
                  <input
                    type="text"
                    value={materialBezeichnung}
                    onChange={(e) => setMaterialBezeichnung(e.target.value)}
                    placeholder="z.B. Edelstahl 304"
                    className="w-full h-10 px-3 rounded-lg border border-border bg-background"
                  />
                </div>
                <div>
                  <label className="block text-sm text-muted-foreground mb-1">Materialkosten pro m² (€)</label>
                  <input
                    type="number"
                    value={materialKostenProM2}
                    onChange={(e) => setMaterialKostenProM2(e.target.value)}
                    step="0.01"
                    placeholder="z.B. 10"
                    className="w-full h-10 px-3 rounded-lg border border-border bg-background"
                  />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-sm text-muted-foreground mb-1">Rollenbreite (cm)</label>
                    <input
                      type="number"
                      value={rolleBreite}
                      onChange={(e) => setRolleBreite(e.target.value)}
                      className="w-full h-10 px-3 rounded-lg border border-border bg-background"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-muted-foreground mb-1">Rollenlänge (m)</label>
                    <input
                      type="number"
                      value={rolleLaenge}
                      onChange={(e) => setRolleLaenge(e.target.value)}
                      className="w-full h-10 px-3 rounded-lg border border-border bg-background"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-muted-foreground mb-1">Max. Länge (m)</label>
                    <input
                      type="number"
                      value={maxLaenge}
                      onChange={(e) => setMaxLaenge(e.target.value)}
                      className="w-full h-10 px-3 rounded-lg border border-border bg-background"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Cuts Table */}
      <div className="bg-card border border-border rounded-xl p-4">
        <h3 className="font-semibold mb-4">Tabelle der Zuschnitte</h3>
        {cuts.length === 0 ? (
          <p className="text-center text-muted-foreground py-4">Keine Zuschnitte vorhanden</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 px-2">Farbe</th>
                  <th className="text-left py-2 px-2">Bezeichnung</th>
                  <th className="text-right py-2 px-2">Breite (cm)</th>
                  <th className="text-right py-2 px-2">Länge (m)</th>
                  <th className="py-2 px-2">Aktionen</th>
                </tr>
              </thead>
              <tbody>
                {cuts.map((cut) => (
                  <tr key={cut.id} className="border-b border-border/50">
                    <td className="py-2 px-2">
                      <div
                        className="w-6 h-6 rounded border border-border"
                        style={{ backgroundColor: cut.color }}
                      />
                    </td>
                    <td className="py-2 px-2">{cut.bezeichnung || '-'}</td>
                    <td className="py-2 px-2 text-right">{formatNumber(cut.breite * 100, 1)}</td>
                    <td className="py-2 px-2 text-right">{formatNumber(cut.laenge, 2)}</td>
                    <td className="py-2 px-2">
                      <div className="flex gap-2 justify-center">
                        <button
                          onClick={() => editCut(cut)}
                          className="p-1.5 text-orange-500 hover:bg-orange-500/10 rounded"
                          title="Bearbeiten"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => deleteCut(cut.id)}
                          className="p-1.5 text-red-500 hover:bg-red-500/10 rounded"
                          title="Löschen"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Optimization Button & Results */}
      <div className="bg-card border border-border rounded-xl p-4">
        <button
          onClick={optimizeCuts}
          disabled={cuts.length === 0}
          className="w-full flex items-center justify-center gap-2 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 disabled:opacity-50"
        >
          <Wand2 className="h-5 w-5" />
          Zuschnitte optimieren
        </button>

        {result && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
            <div className="bg-background border border-border rounded-lg p-3">
              <p className="text-xs text-muted-foreground">Produktive Fläche</p>
              <p className="text-lg font-bold">{formatNumber(result.totalUsedArea)} m²</p>
            </div>
            <div className="bg-background border border-border rounded-lg p-3">
              <p className="text-xs text-muted-foreground">Verschnittfläche</p>
              <p className="text-lg font-bold">{formatNumber(result.totalWasteArea)} m²</p>
            </div>
            <div className="bg-background border border-border rounded-lg p-3">
              <p className="text-xs text-muted-foreground">Verschnitt</p>
              <p className="text-lg font-bold">{formatNumber(result.verschnittProzent, 1)} %</p>
            </div>
            <div className="bg-background border border-border rounded-lg p-3">
              <p className="text-xs text-muted-foreground">Materialkosten</p>
              <p className="text-lg font-bold">{formatNumber(result.totalMaterialKosten)} €</p>
            </div>
          </div>
        )}
      </div>

      {/* Visualization */}
      {result && result.sheets.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-4">
          <h3 className="font-semibold mb-4">Visualisierung der Abwicklung</h3>
          <div className="flex flex-wrap gap-6">
            {result.sheets.map((sheet, sheetIndex) => {
              const widthPx = (parseFloat(rolleBreite) / 100) * 200;
              const heightPx = sheet.usedLength * 18;
              return (
                <div key={sheetIndex} className="relative">
                  <div className="text-xs text-muted-foreground mb-1">
                    Blechrolle {sheetIndex + 1}: {rolleBreite} cm × {formatNumber(sheet.usedLength, 2)} m
                  </div>
                  <div
                    className="relative bg-muted border border-border rounded"
                    style={{ width: widthPx, height: heightPx }}
                  >
                    {sheet.placements.map((p, pIndex) => (
                      <div
                        key={pIndex}
                        className="absolute border border-black/30 flex items-center justify-center text-[10px] overflow-hidden"
                        style={{
                          backgroundColor: p.color,
                          left: p.x * 200,
                          top: p.y * 18,
                          width: p.breite * 200,
                          height: p.laenge * 18,
                        }}
                        title={`${p.bezeichnung || 'Zuschnitt'}: ${formatNumber(p.breite * 100, 1)} cm × ${formatNumber(p.laenge, 2)} m`}
                      >
                        <span className="bg-white/70 px-1 rounded text-black">
                          {formatNumber(p.breite * 100, 0)}×{formatNumber(p.laenge, 1)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
