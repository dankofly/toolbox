'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { Plus, Minus, Maximize2, Download, RotateCcw, Image as ImageIcon } from 'lucide-react';

// --- Types ---
type InputMode = 'radius' | 'umfang';

interface InputModes {
  unten: InputMode;
  oben: InputMode;
}

interface CalculationResult {
  r1: number;
  r2: number;
  h: number;
  n: number;
  anzahlHilfssehnen: number;
  s: number;
  S1: number;
  S2: number;
  hFull: number;
  L1: number;
  L2: number;
  theta: number;
  segDistL: number;
  segDistS: number;
  abkippWert: number;
  chordLengthOuter: number;
  chordLengthInner: number;
}

interface DrawingArc {
  radius: number;
  startAngle: number;
  endAngle: number;
  color: string;
  lineWidth: number;
  type: string;
  isHighlighted?: boolean;
}

interface DrawingLine {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color: string;
  lineWidth: number;
  dashed?: boolean;
  type: string;
  isHighlighted?: boolean;
}

interface DrawingPoint {
  x: number;
  y: number;
  radius: number;
  color: string;
  type: string;
  isHighlighted?: boolean;
}

interface DrawingPolygon {
  points: { x: number; y: number }[];
  color: string;
  type: string;
  isHighlighted?: boolean;
}

interface DrawingElements {
  arcs: DrawingArc[];
  mantleLines: DrawingLine[];
  segmentLines: DrawingLine[];
  centerHelperLines: DrawingLine[];
  centerLine: DrawingLine[];
  centerPoint: DrawingPoint | null;
  helperPoints: DrawingPoint[];
  allowancePolygons: DrawingPolygon[];
}

interface Transform {
  scale: number;
  userOffsetX: number;
  userOffsetY: number;
  initialOffsetX: number;
  initialOffsetY: number;
}

// --- Constants ---
const CONFIG = {
  ZOOM_SENSITIVITY: 1.1,
  MIN_ZOOM: 0.1,
  MAX_ZOOM: 20,
  ALLOWANCE_1: 1.5,
  ALLOWANCE_2: 3.0,
};

const COLORS = {
  outerArc: '#a52525',
  innerArc: '#FF453A',
  mantle: '#30D158',
  segmentLines: '#8A8A8E',
  centerHelper: '#C7C7CC',
  helper: '#AF52DE',
  allowance: 'rgba(175, 82, 222, 0.25)',
  centerLine: '#FF9500',
  highlight: '#8f1d1d',
};

// --- Main Component ---
export function Kegelstumpf() {
  // Input states
  const [radiusUnter, setRadiusUnter] = useState('14.8');
  const [radiusOben, setRadiusOben] = useState('4.25');
  const [hoehe, setHoehe] = useState('134');
  const [segmente, setSegmente] = useState('18');
  const [anzahlHilfssehnen, setAnzahlHilfssehnen] = useState('8');
  const [inputMode, setInputMode] = useState<InputModes>({ unten: 'radius', oben: 'radius' });

  // Calculation & drawing states
  const [calculation, setCalculation] = useState<CalculationResult | null>(null);
  const [elements, setElements] = useState<DrawingElements | null>(null);
  const [transform, setTransform] = useState<Transform>({
    scale: 1,
    userOffsetX: 0,
    userOffsetY: 0,
    initialOffsetX: 0,
    initialOffsetY: 0,
  });
  const [highlightedType, setHighlightedType] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const lastPointerPosition = useRef({ x: 0, y: 0 });

  // Load from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('kegelstumpf_data_v3');
    if (stored) {
      try {
        const data = JSON.parse(stored);
        if (data.r1) setRadiusUnter(data.r1);
        if (data.r2) setRadiusOben(data.r2);
        if (data.h) setHoehe(data.h);
        if (data.seg) setSegmente(data.seg);
        if (data.hilfs) setAnzahlHilfssehnen(data.hilfs);
        if (data.modeUnten) setInputMode(prev => ({ ...prev, unten: data.modeUnten }));
        if (data.modeOben) setInputMode(prev => ({ ...prev, oben: data.modeOben }));
      } catch {
        // ignore
      }
    }
  }, []);

  // Save to localStorage
  useEffect(() => {
    const data = {
      r1: radiusUnter,
      r2: radiusOben,
      h: hoehe,
      seg: segmente,
      hilfs: anzahlHilfssehnen,
      modeUnten: inputMode.unten,
      modeOben: inputMode.oben,
    };
    localStorage.setItem('kegelstumpf_data_v3', JSON.stringify(data));
  }, [radiusUnter, radiusOben, hoehe, segmente, anzahlHilfssehnen, inputMode]);

  // --- Geometry Calculations ---
  const calculateGeometry = useCallback((r1: number, r2: number, h: number): Partial<CalculationResult> => {
    const rDiff = r1 - r2;
    if (Math.abs(rDiff) < 0.000001) return { s: 0, S1: 0, S2: 0, hFull: 0, L1: 0, L2: 0, theta: 0 };
    const s = Math.hypot(h, rDiff);
    const S1 = (r1 * s) / rDiff;
    const S2 = (r2 * s) / rDiff;
    const hFull = S1 > r1 ? Math.sqrt(S1 * S1 - r1 * r1) : 0;
    const L1 = r1 * 2 * Math.PI;
    const L2 = r2 * 2 * Math.PI;
    const theta = S1 !== 0 && isFinite(S1) ? L1 / S1 : 0;
    return { s, S1, S2, hFull, L1, L2, theta };
  }, []);

  const calculateDerivedMetrics = useCallback(
    (n: number, anzHilfs: number, L1: number, L2: number, S1: number, S2: number, theta: number) => {
      const segDistL = L1 / n;
      const segDistS = L2 / n;
      const abkippWert = 360 / n;
      const subAngle = theta / (anzHilfs * 2);
      const chordLengthOuter = 2 * S1 * Math.sin(subAngle / 2);
      const chordLengthInner = 2 * S2 * Math.sin(subAngle / 2);
      return { segDistL, segDistS, abkippWert, chordLengthOuter, chordLengthInner };
    },
    []
  );

  const createDrawingElements = useCallback(
    (calc: CalculationResult): DrawingElements => {
      const { S1, S2, theta, n, anzahlHilfssehnen: anzHilfs } = calc;
      const els: DrawingElements = {
        arcs: [],
        mantleLines: [],
        segmentLines: [],
        centerHelperLines: [],
        centerLine: [],
        centerPoint: null,
        helperPoints: [],
        allowancePolygons: [],
      };

      if (!S1 || !isFinite(S1)) return els;

      const startAngle = -theta / 2 + Math.PI / 2;
      const centerX = 0,
        centerY = 0;

      // Arcs
      els.arcs.push({
        radius: S1,
        startAngle,
        endAngle: startAngle + theta,
        color: COLORS.outerArc,
        lineWidth: 3,
        type: 'radius_S1',
      });
      if (S2 > 0) {
        els.arcs.push({
          radius: S2,
          startAngle,
          endAngle: startAngle + theta,
          color: COLORS.innerArc,
          lineWidth: 3,
          type: 'radius_S2',
        });
      }

      // Segment lines
      const segmentTheta = theta / n;
      for (let i = 0; i <= n; i++) {
        const currentTheta = startAngle + i * segmentTheta;
        const cos = Math.cos(currentTheta),
          sin = Math.sin(currentTheta);
        const pInner = { x: centerX + S2 * cos, y: centerY + S2 * sin };
        const pOuter = { x: centerX + S1 * cos, y: centerY + S1 * sin };
        const line = { x1: pInner.x, y1: pInner.y, x2: pOuter.x, y2: pOuter.y };

        if (i === 0 || i === n) {
          els.mantleLines.push({ ...line, color: COLORS.mantle, lineWidth: 2.5, type: 'mantleLine' });
          els.centerHelperLines.push({
            x1: centerX,
            y1: centerY,
            x2: pOuter.x,
            y2: pOuter.y,
            color: COLORS.centerHelper,
            lineWidth: 1.5,
            dashed: true,
            type: 'centerHelper',
          });
        } else {
          els.segmentLines.push({ ...line, color: COLORS.segmentLines, lineWidth: 1, dashed: true, type: 'segmentLine' });
        }
      }

      // Center line
      const midAngle = startAngle + theta / 2;
      els.centerLine.push({
        x1: centerX,
        y1: centerY,
        x2: centerX + S1 * Math.cos(midAngle),
        y2: centerY + S1 * Math.sin(midAngle),
        color: COLORS.centerLine,
        lineWidth: 1.5,
        dashed: true,
        type: 'centerLine',
      });

      // Center point
      els.centerPoint = { x: centerX, y: centerY, radius: 4, color: COLORS.centerHelper, type: 'centerPoint' };

      // Allowance polygons
      const [firstMantle, lastMantle] = els.mantleLines;
      if (firstMantle && lastMantle) {
        [
          { line: firstMantle, allowance: CONFIG.ALLOWANCE_1 },
          { line: lastMantle, allowance: CONFIG.ALLOWANCE_2 },
        ].forEach(({ line, allowance }) => {
          const dx = line.x2 - line.x1,
            dy = line.y2 - line.y1;
          const len = Math.hypot(dx, dy);
          const nx = -dy / len,
            ny = dx / len;
          els.allowancePolygons.push({
            points: [
              { x: line.x1, y: line.y1 },
              { x: line.x2, y: line.y2 },
              { x: line.x2 + nx * allowance, y: line.y2 + ny * allowance },
              { x: line.x1 + nx * allowance, y: line.y1 + ny * allowance },
            ],
            color: COLORS.allowance,
            type: 'allowance',
          });
        });
      }

      // Helper points
      const subAngle = theta / (anzHilfs * 2);
      const midAngleHL = startAngle + theta / 2;
      for (let k = -anzHilfs; k <= anzHilfs; k++) {
        const currentTheta = midAngleHL + k * subAngle;
        const cos = Math.cos(currentTheta),
          sin = Math.sin(currentTheta);
        els.helperPoints.push({
          x: centerX + S1 * cos,
          y: centerY + S1 * sin,
          radius: 2.5,
          color: COLORS.helper,
          type: 'helperPoint',
        });
        if (S2 > 0) {
          els.helperPoints.push({
            x: centerX + S2 * cos,
            y: centerY + S2 * sin,
            radius: 2.5,
            color: COLORS.helper,
            type: 'helperPoint',
          });
        }
      }

      return els;
    },
    []
  );

  // --- Main Calculation ---
  const calculate = useCallback(() => {
    setError(null);

    let r1_val = parseFloat(radiusUnter.replace(',', '.'));
    let r2_val = parseFloat(radiusOben.replace(',', '.'));
    const r1 = inputMode.unten === 'umfang' ? r1_val / (2 * Math.PI) : r1_val;
    const r2 = inputMode.oben === 'umfang' ? r2_val / (2 * Math.PI) : r2_val;
    const h = parseFloat(hoehe.replace(',', '.'));
    const n = parseInt(segmente);
    const anzHilfs = parseInt(anzahlHilfssehnen);

    if ([r1, r2, h, n, anzHilfs].some(isNaN)) {
      setError('Bitte alle Felder mit gültigen Zahlen füllen.');
      return;
    }
    if (r1 <= 0 || h <= 0) {
      setError('Großer Radius und Höhe müssen > 0 sein.');
      return;
    }
    if (r2 < 0) {
      setError('Kleiner Radius darf nicht negativ sein.');
      return;
    }
    if (r1 <= r2) {
      setError('Großer Radius (unten) muss größer als der kleine Radius (oben) sein.');
      return;
    }

    const baseGeo = calculateGeometry(r1, r2, h);
    const derivedMetrics = calculateDerivedMetrics(
      n,
      anzHilfs,
      baseGeo.L1!,
      baseGeo.L2!,
      baseGeo.S1!,
      baseGeo.S2!,
      baseGeo.theta!
    );

    const result: CalculationResult = {
      r1,
      r2,
      h,
      n,
      anzahlHilfssehnen: anzHilfs,
      ...baseGeo,
      ...derivedMetrics,
    } as CalculationResult;

    setCalculation(result);
    setElements(createDrawingElements(result));
  }, [
    radiusUnter,
    radiusOben,
    hoehe,
    segmente,
    anzahlHilfssehnen,
    inputMode,
    calculateGeometry,
    calculateDerivedMetrics,
    createDrawingElements,
  ]);

  // --- Canvas Rendering ---
  const getBoundingBox = useCallback((els: DrawingElements) => {
    if (!els.arcs.length) return null;
    let minX = Infinity,
      maxX = -Infinity,
      minY = Infinity,
      maxY = -Infinity;
    const allPoints: { x: number; y: number }[] = [
      { x: 0, y: 0 },
      ...els.allowancePolygons.flatMap((p) => p.points),
    ];
    els.arcs.forEach((arc) => {
      const r = arc.radius;
      for (let i = 0; i <= 20; i++) {
        const angle = arc.startAngle + (arc.endAngle - arc.startAngle) * (i / 20);
        allPoints.push({ x: Math.cos(angle) * r, y: Math.sin(angle) * r });
      }
    });
    allPoints.forEach((p) => {
      minX = Math.min(minX, p.x);
      maxX = Math.max(maxX, p.x);
      minY = Math.min(minY, p.y);
      maxY = Math.max(maxY, p.y);
    });
    return { minX, maxX, minY, maxY, width: maxX - minX, height: maxY - minY };
  }, []);

  const centerView = useCallback(() => {
    if (!elements || !containerRef.current) return;
    const bb = getBoundingBox(elements);
    if (!bb || bb.width === 0 || bb.height === 0) return;
    const padding = 40;
    const scaleX = (containerRef.current.clientWidth - padding * 2) / bb.width;
    const scaleY = (containerRef.current.clientHeight - padding * 2) / bb.height;
    const newScale = Math.min(scaleX, scaleY, CONFIG.MAX_ZOOM);
    setTransform({
      scale: newScale,
      initialOffsetX: containerRef.current.clientWidth / 2 - (bb.minX + bb.width / 2) * newScale,
      initialOffsetY: containerRef.current.clientHeight / 2 - (bb.minY + bb.height / 2) * newScale,
      userOffsetX: 0,
      userOffsetY: 0,
    });
  }, [elements, getBoundingBox]);

  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container || !elements) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = container.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.save();
    ctx.fillStyle = 'var(--background, #ffffff)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.translate(transform.initialOffsetX + transform.userOffsetX, transform.initialOffsetY + transform.userOffsetY);
    ctx.scale(transform.scale, transform.scale);

    const T = transform;

    // Draw functions
    const drawPoint = (p: DrawingPoint) => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius / T.scale, 0, 2 * Math.PI);
      ctx.fillStyle = highlightedType === p.type ? COLORS.highlight : p.color;
      ctx.fill();
    };

    const drawArc = (a: DrawingArc) => {
      ctx.beginPath();
      ctx.arc(0, 0, a.radius, a.startAngle, a.endAngle);
      ctx.strokeStyle = highlightedType === a.type ? COLORS.highlight : a.color;
      ctx.lineWidth = (highlightedType === a.type ? a.lineWidth + 2 : a.lineWidth) / T.scale;
      ctx.stroke();
    };

    const drawLine = (l: DrawingLine) => {
      ctx.beginPath();
      ctx.moveTo(l.x1, l.y1);
      ctx.lineTo(l.x2, l.y2);
      ctx.strokeStyle = highlightedType === l.type ? COLORS.highlight : l.color;
      ctx.lineWidth = (highlightedType === l.type ? l.lineWidth + 2 : l.lineWidth) / T.scale;
      if (l.dashed) {
        ctx.setLineDash([4 / T.scale, 4 / T.scale]);
      }
      ctx.stroke();
      ctx.setLineDash([]);
    };

    const drawPolygon = (p: DrawingPolygon) => {
      ctx.beginPath();
      ctx.moveTo(p.points[0].x, p.points[0].y);
      for (let i = 1; i < p.points.length; i++) {
        ctx.lineTo(p.points[i].x, p.points[i].y);
      }
      ctx.closePath();
      ctx.fillStyle = highlightedType === p.type ? COLORS.highlight + '80' : p.color;
      ctx.fill();
    };

    // Render in order
    elements.allowancePolygons.forEach(drawPolygon);
    [...elements.mantleLines, ...elements.segmentLines, ...elements.centerHelperLines, ...elements.centerLine].forEach(
      drawLine
    );
    elements.arcs.forEach(drawArc);
    if (elements.centerPoint) drawPoint(elements.centerPoint);
    elements.helperPoints.forEach(drawPoint);

    ctx.restore();
  }, [elements, transform, highlightedType]);

  // Initial calculation
  useEffect(() => {
    calculate();
  }, []);

  // Center view after elements change
  useEffect(() => {
    if (elements) {
      centerView();
    }
  }, [elements]);

  // Render canvas
  useEffect(() => {
    renderCanvas();
  }, [renderCanvas]);

  // Resize handler
  useEffect(() => {
    const handleResize = () => {
      renderCanvas();
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [renderCanvas]);

  // --- Event Handlers ---
  const handleMouseDown = (e: React.MouseEvent) => {
    isDragging.current = true;
    lastPointerPosition.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging.current) return;
    const dx = e.clientX - lastPointerPosition.current.x;
    const dy = e.clientY - lastPointerPosition.current.y;
    setTransform((prev) => ({
      ...prev,
      userOffsetX: prev.userOffsetX + dx,
      userOffsetY: prev.userOffsetY + dy,
    }));
    lastPointerPosition.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseUp = () => {
    isDragging.current = false;
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? CONFIG.ZOOM_SENSITIVITY : 1 / CONFIG.ZOOM_SENSITIVITY;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    setTransform((prev) => {
      const newScale = Math.max(CONFIG.MIN_ZOOM, Math.min(CONFIG.MAX_ZOOM, prev.scale * factor));
      const scaleChange = newScale / prev.scale;
      return {
        ...prev,
        scale: newScale,
        userOffsetX: (prev.userOffsetX - (mouseX - prev.initialOffsetX)) * scaleChange + (mouseX - prev.initialOffsetX),
        userOffsetY: (prev.userOffsetY - (mouseY - prev.initialOffsetY)) * scaleChange + (mouseY - prev.initialOffsetY),
      };
    });
  };

  const handleZoomIn = () => {
    if (!containerRef.current) return;
    const center = { x: containerRef.current.clientWidth / 2, y: containerRef.current.clientHeight / 2 };
    setTransform((prev) => {
      const factor = CONFIG.ZOOM_SENSITIVITY * 1.5;
      const newScale = Math.min(CONFIG.MAX_ZOOM, prev.scale * factor);
      const scaleChange = newScale / prev.scale;
      return {
        ...prev,
        scale: newScale,
        userOffsetX: (prev.userOffsetX - (center.x - prev.initialOffsetX)) * scaleChange + (center.x - prev.initialOffsetX),
        userOffsetY: (prev.userOffsetY - (center.y - prev.initialOffsetY)) * scaleChange + (center.y - prev.initialOffsetY),
      };
    });
  };

  const handleZoomOut = () => {
    if (!containerRef.current) return;
    const center = { x: containerRef.current.clientWidth / 2, y: containerRef.current.clientHeight / 2 };
    setTransform((prev) => {
      const factor = 1 / (CONFIG.ZOOM_SENSITIVITY * 1.5);
      const newScale = Math.max(CONFIG.MIN_ZOOM, prev.scale * factor);
      const scaleChange = newScale / prev.scale;
      return {
        ...prev,
        scale: newScale,
        userOffsetX: (prev.userOffsetX - (center.x - prev.initialOffsetX)) * scaleChange + (center.x - prev.initialOffsetX),
        userOffsetY: (prev.userOffsetY - (center.y - prev.initialOffsetY)) * scaleChange + (center.y - prev.initialOffsetY),
      };
    });
  };

  // --- Input Mode Toggle ---
  const toggleInputMode = (type: 'unten' | 'oben', newMode: InputMode) => {
    const oldMode = inputMode[type];
    if (oldMode === newMode) return;

    const setter = type === 'unten' ? setRadiusUnter : setRadiusOben;
    const currentValue = type === 'unten' ? radiusUnter : radiusOben;
    const val = parseFloat(currentValue.replace(',', '.'));

    if (!isNaN(val)) {
      const newValue =
        oldMode === 'radius' && newMode === 'umfang' ? val * 2 * Math.PI : val / (2 * Math.PI);
      setter(newValue.toFixed(2));
    }

    setInputMode((prev) => ({ ...prev, [type]: newMode }));
  };

  // --- Stepper ---
  const handleStepper = (
    setter: React.Dispatch<React.SetStateAction<string>>,
    current: string,
    step: number,
    min = 0.1
  ) => {
    const val = parseFloat(current.replace(',', '.')) || 0;
    const newVal = Math.max(min, val + step);
    setter(newVal.toFixed(step < 1 ? 2 : 0));
  };

  // --- Export Functions ---
  const exportAsImage = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = 'kegelstumpf.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  const exportAsDXF = () => {
    if (!calculation || !elements) return;
    let dxf =
      '0\nSECTION\n2\nHEADER\n0\nENDSEC\n0\nSECTION\n2\nTABLES\n0\nENDSEC\n0\nSECTION\n2\nBLOCKS\n0\nENDSEC\n0\nSECTION\n2\nENTITIES\n';

    const addLine = (x1: number, y1: number, x2: number, y2: number, layer: string) => {
      dxf += `0\nLINE\n8\n${layer}\n10\n${x1.toFixed(4)}\n20\n${(-y1).toFixed(4)}\n30\n0.0\n11\n${x2.toFixed(4)}\n21\n${(-y2).toFixed(4)}\n31\n0.0\n`;
    };

    const addArc = (r: number, startRad: number, endRad: number, layer: string) => {
      const startDeg = (startRad * 180) / Math.PI;
      const endDeg = (endRad * 180) / Math.PI;
      const dxfStart = -endDeg;
      const dxfEnd = -startDeg;
      dxf += `0\nARC\n8\n${layer}\n10\n0.0\n20\n0.0\n30\n0.0\n40\n${r.toFixed(4)}\n50\n${dxfStart.toFixed(4)}\n51\n${dxfEnd.toFixed(4)}\n`;
    };

    elements.arcs.forEach((a) => addArc(a.radius, a.startAngle, a.endAngle, 'CONTOUR'));
    elements.mantleLines.forEach((l) => addLine(l.x1, l.y1, l.x2, l.y2, 'CONTOUR'));
    elements.segmentLines.forEach((l) => addLine(l.x1, l.y1, l.x2, l.y2, 'BEND_LINES'));

    dxf += '0\nENDSEC\n0\nEOF\n';

    const blob = new Blob([dxf], { type: 'application/dxf' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'kegelstumpf_CNC.dxf';
    link.click();
  };

  // --- Info Text ---
  const getInfoText = (type: 'unten' | 'oben') => {
    const val = parseFloat((type === 'unten' ? radiusUnter : radiusOben).replace(',', '.'));
    if (isNaN(val)) return '';
    return inputMode[type] === 'radius'
      ? `Umfang: ${(val * 2 * Math.PI).toFixed(2)} cm`
      : `Radius: ${(val / (2 * Math.PI)).toFixed(2)} cm`;
  };

  // --- Legend Data ---
  const getLegendData = () => {
    if (!calculation) return { geometric: [], bending: [] };
    const d = calculation;
    const format = (val: number) => val.toFixed(2);

    return {
      geometric: [
        { color: COLORS.centerHelper, label: 'Zirkelpunkt (Z)', value: 'Mittelpunkt', type: 'centerPoint' },
        { color: COLORS.outerArc, label: 'Radius gr. Bogen (S1)', value: `${format(d.S1)} cm`, type: 'radius_S1' },
        { color: COLORS.innerArc, label: 'Radius kl. Bogen (S2)', value: d.S2 > 0 ? `${format(d.S2)} cm` : '–', type: 'radius_S2' },
        { color: COLORS.mantle, label: 'Mantellinie (s)', value: `${format(d.s)} cm`, type: 'mantleLine' },
        { color: COLORS.centerLine, label: 'Sektorwinkel (θ)', value: `${((d.theta * 180) / Math.PI).toFixed(2)}°`, type: 'centerLine' },
      ],
      bending: [
        { color: COLORS.outerArc, label: 'Äußere Bogenlänge (L1)', value: `${format(d.L1)} cm`, type: 'radius_S1' },
        { color: COLORS.innerArc, label: 'Innere Bogenlänge (L2)', value: d.L2 > 0 ? `${format(d.L2)} cm` : '–', type: 'radius_S2' },
        { color: COLORS.segmentLines, label: 'Abstand Abkantung (Gr.)', value: `${format(d.segDistL)} cm`, type: 'segmentLine' },
        { color: COLORS.segmentLines, label: 'Abstand Abkantung (Kl.)', value: d.segDistS > 0 ? `${format(d.segDistS)} cm` : '–', type: 'segmentLine' },
        { color: COLORS.helper, label: 'Hilfssehne Groß (c1)', value: `${format(d.chordLengthOuter)} cm`, type: 'helperPoint' },
        { color: COLORS.helper, label: 'Hilfssehne Klein (c2)', value: d.chordLengthInner > 0 ? `${format(d.chordLengthInner)} cm` : '–', type: 'helperPoint' },
        { color: COLORS.allowance, label: 'Falz-Zugabe', value: `${CONFIG.ALLOWANCE_1} & ${CONFIG.ALLOWANCE_2} cm`, type: 'allowance' },
      ],
    };
  };

  const legendData = getLegendData();

  // --- Render ---
  return (
    <div className="space-y-6">
      {/* Inputs */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Radius Unten */}
        <div className="bg-card border border-border rounded-xl p-4 space-y-3">
          <div className="flex gap-1 text-sm">
            <button
              onClick={() => toggleInputMode('unten', 'radius')}
              className={`flex-1 px-3 py-1.5 rounded-lg transition-colors ${
                inputMode.unten === 'radius' ? 'bg-primary text-primary-foreground' : 'bg-muted'
              }`}
            >
              Radius (R₁)
            </button>
            <button
              onClick={() => toggleInputMode('unten', 'umfang')}
              className={`flex-1 px-3 py-1.5 rounded-lg transition-colors ${
                inputMode.unten === 'umfang' ? 'bg-primary text-primary-foreground' : 'bg-muted'
              }`}
            >
              Umfang (U₁)
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleStepper(setRadiusUnter, radiusUnter, -1)}
              className="w-10 h-10 flex items-center justify-center rounded-lg border border-border hover:bg-muted"
            >
              <Minus className="h-4 w-4" />
            </button>
            <div className="relative flex-1">
              <input
                type="number"
                value={radiusUnter}
                onChange={(e) => setRadiusUnter(e.target.value)}
                onBlur={calculate}
                step="0.1"
                className="w-full h-10 px-3 text-center rounded-lg border border-border bg-background"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">cm</span>
            </div>
            <button
              onClick={() => handleStepper(setRadiusUnter, radiusUnter, 1)}
              className="w-10 h-10 flex items-center justify-center rounded-lg border border-border hover:bg-muted"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
          <p className="text-xs text-muted-foreground text-center">{getInfoText('unten')}</p>
        </div>

        {/* Radius Oben */}
        <div className="bg-card border border-border rounded-xl p-4 space-y-3">
          <div className="flex gap-1 text-sm">
            <button
              onClick={() => toggleInputMode('oben', 'radius')}
              className={`flex-1 px-3 py-1.5 rounded-lg transition-colors ${
                inputMode.oben === 'radius' ? 'bg-primary text-primary-foreground' : 'bg-muted'
              }`}
            >
              Radius (R₂)
            </button>
            <button
              onClick={() => toggleInputMode('oben', 'umfang')}
              className={`flex-1 px-3 py-1.5 rounded-lg transition-colors ${
                inputMode.oben === 'umfang' ? 'bg-primary text-primary-foreground' : 'bg-muted'
              }`}
            >
              Umfang (U₂)
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleStepper(setRadiusOben, radiusOben, -1)}
              className="w-10 h-10 flex items-center justify-center rounded-lg border border-border hover:bg-muted"
            >
              <Minus className="h-4 w-4" />
            </button>
            <div className="relative flex-1">
              <input
                type="number"
                value={radiusOben}
                onChange={(e) => setRadiusOben(e.target.value)}
                onBlur={calculate}
                step="0.1"
                className="w-full h-10 px-3 text-center rounded-lg border border-border bg-background"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">cm</span>
            </div>
            <button
              onClick={() => handleStepper(setRadiusOben, radiusOben, 1)}
              className="w-10 h-10 flex items-center justify-center rounded-lg border border-border hover:bg-muted"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
          <p className="text-xs text-muted-foreground text-center">{getInfoText('oben')}</p>
        </div>

        {/* Höhe */}
        <div className="bg-card border border-border rounded-xl p-4 space-y-3">
          <label className="text-sm font-medium">Höhe des Bauteils (H)</label>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleStepper(setHoehe, hoehe, -1)}
              className="w-10 h-10 flex items-center justify-center rounded-lg border border-border hover:bg-muted"
            >
              <Minus className="h-4 w-4" />
            </button>
            <div className="relative flex-1">
              <input
                type="number"
                value={hoehe}
                onChange={(e) => setHoehe(e.target.value)}
                onBlur={calculate}
                step="1"
                className="w-full h-10 px-3 text-center rounded-lg border border-border bg-background"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">cm</span>
            </div>
            <button
              onClick={() => handleStepper(setHoehe, hoehe, 1)}
              className="w-10 h-10 flex items-center justify-center rounded-lg border border-border hover:bg-muted"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Segmente */}
        <div className="bg-card border border-border rounded-xl p-4 space-y-3">
          <label className="text-sm font-medium">Anzahl Abkantungen</label>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleStepper(setSegmente, segmente, -1, 2)}
              className="w-10 h-10 flex items-center justify-center rounded-lg border border-border hover:bg-muted"
            >
              <Minus className="h-4 w-4" />
            </button>
            <input
              type="number"
              value={segmente}
              onChange={(e) => setSegmente(e.target.value)}
              onBlur={calculate}
              step="1"
              min="2"
              className="flex-1 h-10 px-3 text-center rounded-lg border border-border bg-background"
            />
            <button
              onClick={() => handleStepper(setSegmente, segmente, 1, 2)}
              className="w-10 h-10 flex items-center justify-center rounded-lg border border-border hover:bg-muted"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Anreißpunkte */}
        <div className="bg-card border border-border rounded-xl p-4 space-y-3">
          <label className="text-sm font-medium">Anreißpunkte (pro Bogenhälfte)</label>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleStepper(setAnzahlHilfssehnen, anzahlHilfssehnen, -1, 2)}
              className="w-10 h-10 flex items-center justify-center rounded-lg border border-border hover:bg-muted"
            >
              <Minus className="h-4 w-4" />
            </button>
            <input
              type="number"
              value={anzahlHilfssehnen}
              onChange={(e) => setAnzahlHilfssehnen(e.target.value)}
              onBlur={calculate}
              step="1"
              min="2"
              className="flex-1 h-10 px-3 text-center rounded-lg border border-border bg-background"
            />
            <button
              onClick={() => handleStepper(setAnzahlHilfssehnen, anzahlHilfssehnen, 1, 2)}
              className="w-10 h-10 flex items-center justify-center rounded-lg border border-border hover:bg-muted"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Calculate Button */}
        <div className="bg-card border border-border rounded-xl p-4 flex items-center justify-center">
          <button
            onClick={calculate}
            className="w-full px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
          >
            Berechnen
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-500">{error}</div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-3 justify-center">
        <button
          onClick={exportAsImage}
          disabled={!calculation}
          className="flex items-center gap-2 px-5 py-2.5 bg-muted rounded-lg font-medium hover:bg-muted/80 disabled:opacity-50"
        >
          <ImageIcon className="h-4 w-4" />
          Bild (PNG)
        </button>
        <button
          onClick={exportAsDXF}
          disabled={!calculation}
          className="flex items-center gap-2 px-5 py-2.5 bg-muted rounded-lg font-medium hover:bg-muted/80 disabled:opacity-50"
        >
          <Download className="h-4 w-4" />
          DXF (CNC)
        </button>
        <button
          onClick={centerView}
          className="flex items-center gap-2 px-5 py-2.5 bg-muted rounded-lg font-medium hover:bg-muted/80"
        >
          <RotateCcw className="h-4 w-4" />
          Reset Ansicht
        </button>
      </div>

      {/* Canvas */}
      <div
        ref={containerRef}
        className="relative w-full aspect-[4/3] bg-card border border-border rounded-xl overflow-hidden"
      >
        <canvas
          ref={canvasRef}
          className="w-full h-full cursor-grab active:cursor-grabbing"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onWheel={handleWheel}
        />
        {/* Zoom Controls */}
        <div className="absolute bottom-4 right-4 flex flex-col gap-2">
          <button
            onClick={handleZoomIn}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-card border border-border shadow-md hover:bg-muted"
            title="Vergrößern"
          >
            <Plus className="h-5 w-5" />
          </button>
          <button
            onClick={handleZoomOut}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-card border border-border shadow-md hover:bg-muted"
            title="Verkleinern"
          >
            <Minus className="h-5 w-5" />
          </button>
          <button
            onClick={centerView}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-card border border-border shadow-md hover:bg-muted"
            title="Einpassen"
          >
            <Maximize2 className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Legend */}
      {calculation && (
        <div className="grid md:grid-cols-2 gap-6">
          {/* Geometrie */}
          <div className="bg-card border border-border rounded-xl p-5">
            <h3 className="font-semibold mb-4 pb-2 border-b border-border">Geometrie & Radien</h3>
            <ul className="space-y-2">
              {legendData.geometric.map((item, i) => (
                <li
                  key={i}
                  className={`flex items-start gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
                    highlightedType === item.type ? 'bg-primary/10' : 'hover:bg-muted'
                  }`}
                  onMouseEnter={() => setHighlightedType(item.type)}
                  onMouseLeave={() => setHighlightedType(null)}
                >
                  <span
                    className="w-4 h-4 rounded flex-shrink-0 mt-0.5 border border-border"
                    style={{ backgroundColor: item.color }}
                  />
                  <div className="flex-1 flex justify-between">
                    <span className="text-sm">{item.label}</span>
                    <span className="text-sm font-medium">{item.value}</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {/* Abkantung */}
          <div className="bg-card border border-border rounded-xl p-5">
            <h3 className="font-semibold mb-4 pb-2 border-b border-border">Abkantung & Anriss</h3>
            <ul className="space-y-2">
              {legendData.bending.map((item, i) => (
                <li
                  key={i}
                  className={`flex items-start gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
                    highlightedType === item.type ? 'bg-primary/10' : 'hover:bg-muted'
                  }`}
                  onMouseEnter={() => setHighlightedType(item.type)}
                  onMouseLeave={() => setHighlightedType(null)}
                >
                  <span
                    className="w-4 h-4 rounded flex-shrink-0 mt-0.5 border border-border"
                    style={{ backgroundColor: item.color }}
                  />
                  <div className="flex-1 flex justify-between">
                    <span className="text-sm">{item.label}</span>
                    <span className="text-sm font-medium">{item.value}</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
