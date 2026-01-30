'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { Download, Upload, FileText, Calculator, ZoomIn, ZoomOut } from 'lucide-react';

// --- Types ---
type RoofType = 'symmetrisch' | 'asymmetrisch' | 'trapez' | 'dreieck';

interface CalculationResult {
  projekt: string;
  dachform: RoofType;
  dachseiten: number;
  eaves: number;
  heightL_m: number;
  heightR_m: number;
  ridge_m: number | null;
  shingle_mm: number;
  coverage: string;
  stdBase_cm: number | null;
  allowedMax_cm: number | null;
  customNote: string | null;
  N: number;
  baseLeft_cm: number;
  baseRight_cm: number;
  lastLeft_cm: number;
  lastRight_cm: number;
  qm: number;
  bm: number;
  bmRowsOneSide: number;
  bmTraufe: number;
  bmBestell: number;
  bmPerM2: number | null;
  bmEffPerM2: number | null;
  kaufQmStd: number | null;
}

// --- Constants ---
const GRUNDBEDARF_DATA: Record<string, Record<string, number>> = {
  '3-lagig': {
    '150': 22.22,
    '200': 16.67,
    '250': 13.33,
    '300': 11.11,
    '350': 9.09,
    '400': 8.0,
    '500': 6.25,
    '600': 5.56,
    '700': 4.55,
    '800': 4.0,
    '1000': 3.13,
  },
};

const STANDARD_ROW_SPACINGS: Record<string, Record<string, number>> = {
  '3-lagig': {
    '150': 4.5,
    '200': 6,
    '250': 7.5,
    '300': 9,
    '350': 11,
    '400': 12.5,
    '500': 16,
    '600': 18,
    '700': 22,
    '800': 25,
    '1000': 32,
  },
};

const SHINGLE_LENGTHS = [150, 200, 250, 300, 350, 400, 500, 600, 700, 800, 1000];

// --- Main Component ---
export function HolzSchindel() {
  // Form states
  const [projectName, setProjectName] = useState('');
  const [roofType, setRoofType] = useState<RoofType>('symmetrisch');
  const [height, setHeight] = useState('');
  const [leftHeight, setLeftHeight] = useState('');
  const [rightHeight, setRightHeight] = useState('');
  const [triangleHeight, setTriangleHeight] = useState('');
  const [eavesLength, setEavesLength] = useState('');
  const [ridgeLength, setRidgeLength] = useState('');
  const [numberOfRoofSides, setNumberOfRoofSides] = useState(1);
  const [shingleLength, setShingleLength] = useState(400);
  const [specialCoverage, setSpecialCoverage] = useState(false);
  const [customRowSpacing, setCustomRowSpacing] = useState('');
  const [showForm, setShowForm] = useState(true);

  // Result & Canvas
  const [result, setResult] = useState<CalculationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1.0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- Helper Functions ---
  const getStdBaseCm = (coverage: string, sl: number): number | null => {
    const val = STANDARD_ROW_SPACINGS[coverage]?.[String(sl)];
    return typeof val === 'number' ? val : null;
  };

  const getAllowedMaxCm = (coverage: string, sl: number): number | null => {
    return getStdBaseCm(coverage, sl);
  };

  const getBMPerM2 = (coverage: string, sl: number): number | null => {
    const val = GRUNDBEDARF_DATA[coverage]?.[String(sl)];
    return typeof val === 'number' ? val : null;
  };

  const round2 = (x: number) => Math.round((x + Number.EPSILON) * 100) / 100;

  // --- Calculate ---
  const calculate = useCallback(() => {
    setError(null);

    if (!projectName.trim()) {
      setError('Bitte Projektnamen eingeben.');
      return;
    }

    const eaves = parseFloat(eavesLength);
    if (!(eaves > 0)) {
      setError('Gültige Trauflänge eingeben.');
      return;
    }

    const coverage = '3-lagig';
    const stdBase = getStdBaseCm(coverage, shingleLength);
    const maxAllowed = specialCoverage && customRowSpacing
      ? Math.min(parseFloat(customRowSpacing), getAllowedMaxCm(coverage, shingleLength) || 0)
      : getAllowedMaxCm(coverage, shingleLength);

    if (!(maxAllowed && maxAllowed > 0)) {
      setError('Kein zulässiger Reihenabstand für Auswahl.');
      return;
    }

    let heightLcm = 0,
      heightRcm = 0,
      ridgeLen: number | null = null;

    if (roofType === 'symmetrisch') {
      const h = parseFloat(height);
      if (!(h > 0)) {
        setError('Gültige Dachhöhe eingeben.');
        return;
      }
      heightLcm = heightRcm = h * 100;
    } else if (roofType === 'asymmetrisch' || roofType === 'trapez') {
      const hl = parseFloat(leftHeight);
      const hr = parseFloat(rightHeight);
      if (!(hl > 0)) {
        setError('Gültige linke Dachhöhe eingeben.');
        return;
      }
      if (!(hr > 0)) {
        setError('Gültige rechte Dachhöhe eingeben.');
        return;
      }
      heightLcm = hl * 100;
      heightRcm = hr * 100;
      if (roofType === 'trapez') {
        ridgeLen = parseFloat(ridgeLength);
        if (!(ridgeLen > 0) || ridgeLen >= eaves) {
          setError('Gültige Firstlänge eingeben (< Traufe).');
          return;
        }
      }
    } else if (roofType === 'dreieck') {
      const hm = parseFloat(triangleHeight);
      if (!(hm > 0)) {
        setError('Gültige mittlere Dachhöhe eingeben.');
        return;
      }
      heightLcm = heightRcm = hm * 100;
    }

    const effMax = maxAllowed;

    const tBase = effMax / Math.max(heightLcm, heightRcm);
    let N = Math.ceil(1 / tBase);

    let baseLeft_cm = heightLcm * tBase;
    let baseRight_cm = heightRcm * tBase;
    let lastLeft_cm = heightLcm - baseLeft_cm * (N - 1);
    let lastRight_cm = heightRcm - baseRight_cm * (N - 1);

    const eps = 0.01;
    if (lastLeft_cm - effMax > eps || lastRight_cm - effMax > eps) {
      N += 1;
      baseLeft_cm = heightLcm * tBase;
      baseRight_cm = heightRcm * tBase;
      lastLeft_cm = heightLcm - baseLeft_cm * (N - 1);
      lastRight_cm = heightRcm - baseRight_cm * (N - 1);
    }

    const bmPerM2 = getBMPerM2(coverage, shingleLength);

    let qm = 0;
    if (roofType === 'symmetrisch') {
      qm = (heightLcm / 100) * eaves * numberOfRoofSides;
    } else if (roofType === 'asymmetrisch') {
      const hl_m = heightLcm / 100,
        hr_m = heightRcm / 100;
      const h_avg = (hl_m + hr_m) / 2;
      qm = h_avg * eaves * numberOfRoofSides;
    } else if (roofType === 'trapez') {
      const hl_m = heightLcm / 100,
        hr_m = heightRcm / 100;
      const h_avg = (hl_m + hr_m) / 2;
      qm = ((eaves + (ridgeLen || 0)) / 2) * h_avg * numberOfRoofSides;
    } else if (roofType === 'dreieck') {
      const h_m = heightLcm / 100;
      qm = ((h_m * eaves) / 2) * numberOfRoofSides;
    }

    // Sum row lengths
    let bmRowsOneSide = 0;
    for (let k = 1; k <= N; k++) {
      const t = k === N ? 1 : Math.min(k * tBase, 1);
      let L = 0;
      if (roofType === 'trapez') {
        L = eaves + t * ((ridgeLen || 0) - eaves);
      } else if (roofType === 'dreieck') {
        L = eaves * (1 - t);
      } else {
        L = eaves;
      }
      bmRowsOneSide += Math.max(0, L);
    }

    if (roofType === 'dreieck' && baseLeft_cm > 0 && heightLcm > 0) {
      bmRowsOneSide = eaves * (heightLcm / baseLeft_cm) * 0.5;
    }

    const bm = bmRowsOneSide * numberOfRoofSides;
    const bmTraufe = eaves * 2 * numberOfRoofSides;
    const bmBestell = bm + bmTraufe;
    const bmEffPerM2 = qm > 0 ? bm / qm : null;
    const kaufQmStd = bmPerM2 && bmPerM2 > 0 ? bmBestell / bmPerM2 : null;

    const res: CalculationResult = {
      projekt: projectName.trim(),
      dachform: roofType,
      dachseiten: numberOfRoofSides,
      eaves,
      heightL_m: heightLcm / 100,
      heightR_m: heightRcm / 100,
      ridge_m: ridgeLen,
      shingle_mm: shingleLength,
      coverage,
      stdBase_cm: stdBase,
      allowedMax_cm: maxAllowed,
      customNote: specialCoverage && customRowSpacing ? `Max: ${customRowSpacing} cm` : null,
      N,
      baseLeft_cm: round2(baseLeft_cm),
      baseRight_cm: round2(baseRight_cm),
      lastLeft_cm: round2(lastLeft_cm),
      lastRight_cm: round2(lastRight_cm),
      qm: round2(qm),
      bm: round2(bm),
      bmRowsOneSide: round2(bmRowsOneSide),
      bmTraufe: round2(bmTraufe),
      bmBestell: round2(bmBestell),
      bmPerM2: bmPerM2 != null ? round2(bmPerM2) : null,
      bmEffPerM2: bmEffPerM2 != null ? round2(bmEffPerM2) : null,
      kaufQmStd: kaufQmStd != null ? round2(kaufQmStd) : null,
    };

    setResult(res);
  }, [
    projectName,
    roofType,
    height,
    leftHeight,
    rightHeight,
    triangleHeight,
    eavesLength,
    ridgeLength,
    numberOfRoofSides,
    shingleLength,
    specialCoverage,
    customRowSpacing,
  ]);

  // --- Draw Canvas ---
  const drawRoof = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, rect.width, rect.height);

    const eaves = parseFloat(eavesLength) || 0;
    let hL = 0,
      hR = 0,
      ridgeLen: number | null = null;

    if (roofType === 'symmetrisch') {
      const h = parseFloat(height) || 0;
      hL = hR = h;
    } else if (roofType === 'asymmetrisch' || roofType === 'trapez') {
      hL = parseFloat(leftHeight) || 0;
      hR = parseFloat(rightHeight) || 0;
      if (roofType === 'trapez') ridgeLen = parseFloat(ridgeLength) || 0;
    } else if (roofType === 'dreieck') {
      const hm = parseFloat(triangleHeight) || 0;
      hL = hR = hm;
    }

    if (eaves <= 0 || (hL <= 0 && hR <= 0)) return;

    const margin = 50;
    const availW = Math.max(rect.width - margin * 2, 1);
    const availH = Math.max(rect.height - margin * 2, 1);
    const scaleX = availW / Math.max(eaves, 0.001);
    const scaleY = availH / Math.max(hL, hR, 0.001);
    const scale = Math.min(scaleX, scaleY) * zoom;
    const widthPx = eaves * scale;
    const startX = (rect.width - widthPx) / 2;
    const maxHPxTop = roofType === 'asymmetrisch' || roofType === 'trapez' ? Math.max(hL * scale, hR * scale) : hL * scale;
    const startY = margin + maxHPxTop;

    ctx.lineWidth = 2;
    ctx.strokeStyle = '#701717';
    ctx.fillStyle = '#8B4513';

    ctx.beginPath();
    if (roofType === 'symmetrisch') {
      const hPx = hL * scale;
      ctx.moveTo(startX, startY);
      ctx.lineTo(startX, startY - hPx);
      ctx.lineTo(startX + widthPx, startY - hPx);
      ctx.lineTo(startX + widthPx, startY);
    } else if (roofType === 'asymmetrisch') {
      const lPx = hL * scale,
        rPx = hR * scale;
      ctx.moveTo(startX, startY);
      ctx.lineTo(startX, startY - lPx);
      ctx.lineTo(startX + widthPx, startY - rPx);
      ctx.lineTo(startX + widthPx, startY);
    } else if (roofType === 'trapez' && ridgeLen) {
      const lPx = hL * scale,
        rPx = hR * scale;
      const ridgePx = ridgeLen * scale;
      const ridgeStartX = startX + (widthPx - ridgePx) / 2;
      const ridgeEndX = ridgeStartX + ridgePx;
      ctx.moveTo(startX, startY);
      ctx.lineTo(ridgeStartX, startY - lPx);
      ctx.lineTo(ridgeEndX, startY - rPx);
      ctx.lineTo(startX + widthPx, startY);
    } else if (roofType === 'dreieck') {
      const hPx = hL * scale;
      const topX = startX + widthPx / 2;
      ctx.moveTo(startX, startY);
      ctx.lineTo(topX, startY - hPx);
      ctx.lineTo(startX + widthPx, startY);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Draw rows
    if (result && result.N > 0) {
      const N = result.N;
      const tBase = result.allowedMax_cm ? result.allowedMax_cm / (Math.max(hL, hR) * 100) : 0;

      ctx.strokeStyle = 'rgba(255,255,255,0.8)';
      ctx.lineWidth = 1;

      for (let i = 1; i <= N - 1; i++) {
        const t = Math.min(i * tBase, 0.999999);
        if (roofType === 'symmetrisch') {
          const hPx = hL * scale;
          const y = startY - hPx * t;
          ctx.beginPath();
          ctx.moveTo(startX, y);
          ctx.lineTo(startX + widthPx, y);
          ctx.stroke();
        } else if (roofType === 'asymmetrisch') {
          const lPx = hL * scale,
            rPx = hR * scale;
          const y1 = startY - lPx * t;
          const y2 = startY - rPx * t;
          ctx.beginPath();
          ctx.moveTo(startX, y1);
          ctx.lineTo(startX + widthPx, y2);
          ctx.stroke();
        } else if (roofType === 'trapez' && ridgeLen) {
          const lPx = hL * scale,
            rPx = hR * scale;
          const ridgePx = ridgeLen * scale;
          const ridgeStartX = startX + (widthPx - ridgePx) / 2;
          const ridgeEndX = ridgeStartX + ridgePx;
          const x1 = startX + t * (ridgeStartX - startX);
          const y1 = startY - lPx * t;
          const x2 = startX + widthPx - t * (startX + widthPx - ridgeEndX);
          const y2 = startY - rPx * t;
          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.stroke();
        } else if (roofType === 'dreieck') {
          const hPx = hL * scale;
          const topX = startX + widthPx / 2;
          const y = startY - hPx * t;
          const x1 = startX + t * (topX - startX);
          const x2 = startX + widthPx - t * (startX + widthPx - topX);
          ctx.beginPath();
          ctx.moveTo(x1, y);
          ctx.lineTo(x2, y);
          ctx.stroke();
        }
      }
    }

    // Labels
    ctx.fillStyle = '#2c3e50';
    ctx.strokeStyle = '#2c3e50';
    ctx.lineWidth = 1;
    ctx.font = '13px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';

    // Eaves label
    ctx.beginPath();
    ctx.moveTo(startX, startY + 20);
    ctx.lineTo(startX + widthPx, startY + 20);
    ctx.stroke();
    ctx.fillText(`${eaves.toFixed(2)} m`, startX + widthPx / 2, startY + 17);

    // Height labels
    const fmt = (x: number) => x.toFixed(2);
    if (roofType === 'symmetrisch' || roofType === 'dreieck') {
      const hPx = hL * scale;
      ctx.save();
      ctx.translate(startX + widthPx + 24, startY - hPx / 2);
      ctx.rotate(-Math.PI / 2);
      ctx.fillText(`${fmt(hL)} m`, 0, 0);
      ctx.restore();
    } else if (roofType === 'asymmetrisch' || roofType === 'trapez') {
      const lPx = hL * scale,
        rPx = hR * scale;
      ctx.save();
      ctx.translate(startX - 24, startY - lPx / 2);
      ctx.rotate(-Math.PI / 2);
      ctx.fillText(`${fmt(hL)} m`, 0, 0);
      ctx.restore();
      ctx.save();
      ctx.translate(startX + widthPx + 24, startY - rPx / 2);
      ctx.rotate(-Math.PI / 2);
      ctx.fillText(`${fmt(hR)} m`, 0, 0);
      ctx.restore();
    }
  }, [roofType, height, leftHeight, rightHeight, triangleHeight, eavesLength, ridgeLength, result, zoom]);

  // Draw canvas when result changes
  useEffect(() => {
    drawRoof();
  }, [drawRoof]);

  // Resize handler
  useEffect(() => {
    const handleResize = () => drawRoof();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [drawRoof]);

  // --- Export/Import ---
  const exportProject = () => {
    if (!projectName.trim()) {
      setError('Bitte Projektnamen eingeben.');
      return;
    }
    const data = {
      projectName,
      roofType,
      height,
      leftHeight,
      rightHeight,
      triangleHeight,
      eavesLength,
      ridgeLength,
      numberOfRoofSides,
      shingleLength,
      specialCoverage,
      customRowSpacing,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${projectName}.json`;
    a.click();
  };

  const importProject = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const fr = new FileReader();
    fr.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string);
        setProjectName(data.projectName || '');
        setRoofType(data.roofType || 'symmetrisch');
        setHeight(data.height || '');
        setLeftHeight(data.leftHeight || '');
        setRightHeight(data.rightHeight || '');
        setTriangleHeight(data.triangleHeight || '');
        setEavesLength(data.eavesLength || '');
        setRidgeLength(data.ridgeLength || '');
        setNumberOfRoofSides(data.numberOfRoofSides || 1);
        setShingleLength(data.shingleLength || 400);
        setSpecialCoverage(data.specialCoverage || false);
        setCustomRowSpacing(data.customRowSpacing || '');
      } catch {
        setError('Fehler beim Import.');
      }
    };
    fr.readAsText(file);
    e.target.value = '';
  };

  // --- Format Helper ---
  const fmt = (v: number | null, u = '') => (v == null || isNaN(v) ? '—' : `${Number(v).toFixed(2)}${u}`);

  // --- Render ---
  return (
    <div className="space-y-6">
      {/* Action Buttons */}
      <div className="flex flex-wrap gap-3 justify-center">
        <button
          onClick={exportProject}
          className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
        >
          <Upload className="h-4 w-4" />
          Projekt exportieren
        </button>
        <button
          onClick={importProject}
          className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
        >
          <Download className="h-4 w-4" />
          Projekt importieren
        </button>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
        >
          <FileText className="h-4 w-4" />
          Formular {showForm ? 'verstecken' : 'anzeigen'}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          className="hidden"
          onChange={handleFileSelect}
        />
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-card border border-border rounded-xl p-6 space-y-6">
          {/* Project Info */}
          <div className="bg-background border border-border rounded-lg p-4">
            <h3 className="font-semibold mb-3">Projektinformationen</h3>
            <div>
              <label className="block text-sm text-muted-foreground mb-1">Projektname *</label>
              <input
                type="text"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-border bg-muted"
              />
            </div>
          </div>

          {/* Roof Type */}
          <div className="bg-background border border-border rounded-lg p-4">
            <h3 className="font-semibold mb-3">Dachform</h3>
            <select
              value={roofType}
              onChange={(e) => setRoofType(e.target.value as RoofType)}
              className="w-full h-10 px-3 rounded-lg border border-border bg-muted"
            >
              <option value="symmetrisch">Symmetrisches Satteldach</option>
              <option value="asymmetrisch">Asymmetrisches Satteldach</option>
              <option value="trapez">Trapezförmig</option>
              <option value="dreieck">Dreieckig</option>
            </select>

            {/* Conditional Height Fields */}
            {roofType === 'symmetrisch' && (
              <div className="mt-4">
                <label className="block text-sm text-muted-foreground mb-1">Dachhöhe (m) *</label>
                <input
                  type="number"
                  value={height}
                  onChange={(e) => setHeight(e.target.value)}
                  step="0.01"
                  className="w-full h-10 px-3 rounded-lg border border-border bg-muted"
                />
              </div>
            )}

            {(roofType === 'asymmetrisch' || roofType === 'trapez') && (
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div>
                  <label className="block text-sm text-muted-foreground mb-1">Linke Dachhöhe (m) *</label>
                  <input
                    type="number"
                    value={leftHeight}
                    onChange={(e) => setLeftHeight(e.target.value)}
                    step="0.01"
                    className="w-full h-10 px-3 rounded-lg border border-border bg-muted"
                  />
                </div>
                <div>
                  <label className="block text-sm text-muted-foreground mb-1">Rechte Dachhöhe (m) *</label>
                  <input
                    type="number"
                    value={rightHeight}
                    onChange={(e) => setRightHeight(e.target.value)}
                    step="0.01"
                    className="w-full h-10 px-3 rounded-lg border border-border bg-muted"
                  />
                </div>
              </div>
            )}

            {roofType === 'trapez' && (
              <div className="mt-4">
                <label className="block text-sm text-muted-foreground mb-1">Firstlänge (m) *</label>
                <input
                  type="number"
                  value={ridgeLength}
                  onChange={(e) => setRidgeLength(e.target.value)}
                  step="0.01"
                  className="w-full h-10 px-3 rounded-lg border border-border bg-muted"
                />
              </div>
            )}

            {roofType === 'dreieck' && (
              <div className="mt-4">
                <label className="block text-sm text-muted-foreground mb-1">Mittlere Dachhöhe (m) *</label>
                <input
                  type="number"
                  value={triangleHeight}
                  onChange={(e) => setTriangleHeight(e.target.value)}
                  step="0.01"
                  className="w-full h-10 px-3 rounded-lg border border-border bg-muted"
                />
              </div>
            )}
          </div>

          {/* Dimensions */}
          <div className="bg-background border border-border rounded-lg p-4">
            <h3 className="font-semibold mb-3">Dachabmessungen</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-muted-foreground mb-1">Trauflänge (m) *</label>
                <input
                  type="number"
                  value={eavesLength}
                  onChange={(e) => setEavesLength(e.target.value)}
                  step="0.01"
                  className="w-full h-10 px-3 rounded-lg border border-border bg-muted"
                />
              </div>
              <div>
                <label className="block text-sm text-muted-foreground mb-1">Anzahl der Dachseiten</label>
                <select
                  value={numberOfRoofSides}
                  onChange={(e) => setNumberOfRoofSides(parseInt(e.target.value))}
                  className="w-full h-10 px-3 rounded-lg border border-border bg-muted"
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Shingle Parameters */}
          <div className="bg-background border border-border rounded-lg p-4">
            <h3 className="font-semibold mb-3">Schindelparameter</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-muted-foreground mb-1">Schindellänge (mm)</label>
                <select
                  value={shingleLength}
                  onChange={(e) => setShingleLength(parseInt(e.target.value))}
                  className="w-full h-10 px-3 rounded-lg border border-border bg-muted"
                >
                  {SHINGLE_LENGTHS.map((l) => (
                    <option key={l} value={l}>
                      {l} mm
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm text-muted-foreground mb-1">Deckungsart</label>
                <select
                  disabled
                  className="w-full h-10 px-3 rounded-lg border border-border bg-muted opacity-50"
                >
                  <option value="3-lagig">3-lagig</option>
                </select>
              </div>
            </div>

            <div className="mt-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={specialCoverage}
                  onChange={(e) => setSpecialCoverage(e.target.checked)}
                  className="w-4 h-4"
                />
                <span className="text-sm">Spezielle Deckung / individueller max. Reihenabstand</span>
              </label>
            </div>

            {specialCoverage && (
              <div className="mt-4">
                <label className="block text-sm text-muted-foreground mb-1">Max. Reihenabstand (cm)</label>
                <input
                  type="number"
                  value={customRowSpacing}
                  onChange={(e) => setCustomRowSpacing(e.target.value)}
                  step="0.01"
                  className="w-full h-10 px-3 rounded-lg border border-border bg-muted"
                />
              </div>
            )}
          </div>

          {/* Calculate Button */}
          <button
            onClick={calculate}
            className="w-full flex items-center justify-center gap-2 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90"
          >
            <Calculator className="h-5 w-5" />
            Berechnen
          </button>
        </div>
      )}

      {/* Error */}
      {error && <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-500">{error}</div>}

      {/* Results */}
      {result && (
        <div className="bg-card border border-border rounded-xl p-6">
          <h2 className="text-xl font-bold mb-4">
            Ergebnisse: <span className="text-muted-foreground">„{result.projekt}"</span>
          </h2>
          <div className="grid md:grid-cols-2 gap-4">
            {/* Geometry */}
            <div className="bg-background border border-border rounded-lg p-4">
              <h3 className="font-semibold mb-3">Geometrie</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Dachform</span>
                  <span className="font-medium">{result.dachform}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Anzahl Dachseiten</span>
                  <span className="font-medium">{result.dachseiten}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Trauflänge</span>
                  <span className="font-medium">{fmt(result.eaves, ' m')}</span>
                </div>
                {(result.dachform === 'asymmetrisch' || result.dachform === 'trapez') ? (
                  <>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Dachhöhe links</span>
                      <span className="font-medium">{fmt(result.heightL_m, ' m')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Dachhöhe rechts</span>
                      <span className="font-medium">{fmt(result.heightR_m, ' m')}</span>
                    </div>
                  </>
                ) : (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Dachhöhe</span>
                    <span className="font-medium">{fmt(result.heightL_m, ' m')}</span>
                  </div>
                )}
                {result.dachform === 'trapez' && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Firstlänge</span>
                    <span className="font-medium">{fmt(result.ridge_m, ' m')}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Shingles & Rules */}
            <div className="bg-background border border-border rounded-lg p-4">
              <h3 className="font-semibold mb-3">Schindeln & Regeln</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Schindellänge</span>
                  <span className="font-medium">{result.shingle_mm} mm</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Deckungsart</span>
                  <span className="font-medium">{result.coverage}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Standard-Reihenabstand</span>
                  <span className="font-medium">{fmt(result.stdBase_cm, ' cm')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Max. zul. Abstand (DIN 68119)</span>
                  <span className="font-medium">{fmt(result.allowedMax_cm, ' cm')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Spezielle Deckung</span>
                  <span className="font-medium">{result.customNote || '—'}</span>
                </div>
              </div>
            </div>

            {/* Row Spacings */}
            <div className="bg-background border border-border rounded-lg p-4">
              <h3 className="font-semibold mb-3">Reihenabstände</h3>
              <div className="space-y-2 text-sm">
                {(result.dachform === 'symmetrisch' || result.dachform === 'dreieck') ? (
                  <>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Reihen 1…N-1</span>
                      <span className="font-medium">{fmt(result.baseLeft_cm, ' cm')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Letzte Reihe (First)</span>
                      <span className="font-medium">{fmt(result.lastLeft_cm, ' cm')}</span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Reihen 1…N-1 links</span>
                      <span className="font-medium">{fmt(result.baseLeft_cm, ' cm')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Letzte links</span>
                      <span className="font-medium">{fmt(result.lastLeft_cm, ' cm')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Reihen 1…N-1 rechts</span>
                      <span className="font-medium">{fmt(result.baseRight_cm, ' cm')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Letzte rechts</span>
                      <span className="font-medium">{fmt(result.lastRight_cm, ' cm')}</span>
                    </div>
                  </>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Scharen je Seite (N)</span>
                  <span className="font-medium">{result.N}</span>
                </div>
              </div>
            </div>

            {/* Quantities */}
            <div className="bg-background border border-border rounded-lg p-4">
              <h3 className="font-semibold mb-3">Mengen</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Fläche gesamt</span>
                  <span className="font-medium">{fmt(result.qm, ' m²')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Breitenmeter (ohne Traufe)</span>
                  <span className="font-medium">{fmt(result.bm, ' bm')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">+ Doppelschar Traufe</span>
                  <span className="font-medium">{fmt(result.bmTraufe, ' bm')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">= Bestell-Breitenmeter</span>
                  <span className="font-medium font-bold">{fmt(result.bmBestell, ' bm')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">BM pro m² (Tabelle)</span>
                  <span className="font-medium">{result.bmPerM2 != null ? `${result.bmPerM2.toFixed(2)} bm` : '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">BM pro m² (effektiv)</span>
                  <span className="font-medium">{result.bmEffPerM2 != null ? `${result.bmEffPerM2.toFixed(2)} bm` : '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Kaufmenge (m², Standard)</span>
                  <span className="font-medium">{fmt(result.kaufQmStd, ' m²')}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Canvas Visualization */}
      <div className="bg-card border border-border rounded-xl p-4">
        <div className="flex justify-center gap-4 mb-4">
          <button
            onClick={() => setZoom((z) => Math.min(z + 0.1, 3))}
            className="flex items-center gap-2 px-4 py-2 bg-muted rounded-lg hover:bg-muted/80"
          >
            <ZoomIn className="h-4 w-4" />
            Zoom In
          </button>
          <button
            onClick={() => setZoom((z) => Math.max(z - 0.1, 0.5))}
            className="flex items-center gap-2 px-4 py-2 bg-muted rounded-lg hover:bg-muted/80"
          >
            <ZoomOut className="h-4 w-4" />
            Zoom Out
          </button>
        </div>
        <p className="text-center text-sm text-muted-foreground mb-2">Zoomstufe: {(zoom * 100).toFixed(0)}%</p>
        <canvas
          ref={canvasRef}
          className="w-full h-[400px] rounded-lg border border-border bg-white"
        />
      </div>

      {/* DIN 68119 Reference Table */}
      <details className="bg-card border border-border rounded-xl p-4">
        <summary className="font-semibold cursor-pointer">
          Schindel-Bedarf (BM/m²) – Tabelle (DIN 68119, normgerechte Reihenabstände)
        </summary>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2 px-3">Schindel-Länge (mm)</th>
                <th className="text-right py-2 px-3">Reihenabstand (mm)</th>
                <th className="text-right py-2 px-3">BM pro m²</th>
              </tr>
            </thead>
            <tbody>
              {SHINGLE_LENGTHS.map((l) => (
                <tr key={l} className="border-b border-border/50">
                  <td className="py-2 px-3">{l}</td>
                  <td className="py-2 px-3 text-right">{(STANDARD_ROW_SPACINGS['3-lagig'][String(l)] || 0) * 10}</td>
                  <td className="py-2 px-3 text-right">{GRUNDBEDARF_DATA['3-lagig'][String(l)]?.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-4 text-sm text-muted-foreground">
          <strong>Dachneigungs-Hinweis (DIN 68119, Anhang A):</strong><br />
          <strong>Dreilagig</strong> (Dach 22°–90°) — maßgebend für die Berechnung in diesem Tool.<br />
          Beispiel: <strong>400 mm ⇒ 125 mm</strong> (max. Reihenabstand je Reihe).<br />
          <strong>Zweilagig</strong> (71°–90°) ist laut Norm nur in Ausnahmefällen zulässig.
        </p>
      </details>
    </div>
  );
}
