'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Plus, FileSpreadsheet, ChevronDown, ChevronUp, Trash2, Edit2, Save, Moon, Sun } from 'lucide-react';

// Types
interface Measurement {
  id: string;
  l: string;
  b: string;
  h: string;
  form: string;
  name: string;
  collapsed: boolean;
  editing: boolean;
}

type Unit = 'm' | 'cm' | 'mm';

// Form configurations
const formConfig: Record<string, string> = {
  '': 'LBH',
  'Länge': 'L',
  'Rechteck': 'LB',
  'Dreieck': 'L-H',
  'Trapez': 'LB-H',
  'Parallelogramm': 'L-H',
  'Kreisfläche': 'R',
  'Ellipse': 'LB',
  'Quader (Volumen)': 'LBH',
  'Quader (Oberfläche)': 'LBH',
  'Zylinder (Volumen)': 'R-H',
  'Zylinder (Oberfläche)': 'R-H',
  'Kegel (Volumen)': 'R-H',
  'Kegel (Oberfläche)': 'R-H',
  'Kugel (Volumen)': 'R',
  'Kugel (Oberfläche)': 'R',
  'Pyramide (Volumen)': 'LB-H',
  'Pyramide (Oberfläche)': 'LB-H',
};

const labelConfig: Record<string, Record<string, string>> = {
  'Länge': { l: 'Länge' },
  'Dreieck': { l: 'Grundlinie', h: 'Höhe' },
  'Trapez': { l: 'Grundlinie a', b: 'Grundlinie c', h: 'Höhe' },
  'Parallelogramm': { l: 'Grundlinie', h: 'Höhe' },
  'Kreisfläche': { l: 'Radius' },
  'Ellipse': { l: 'Halbachse a', b: 'Halbachse b' },
  'Zylinder (Volumen)': { l: 'Radius', h: 'Höhe' },
  'Zylinder (Oberfläche)': { l: 'Radius', h: 'Höhe' },
  'Kegel (Volumen)': { l: 'Radius', h: 'Höhe' },
  'Kegel (Oberfläche)': { l: 'Radius', h: 'Höhe' },
  'Kugel (Volumen)': { l: 'Radius' },
  'Kugel (Oberfläche)': { l: 'Radius' },
  'Pyramide (Volumen)': { l: 'Länge (Grund.)', b: 'Breite (Grund.)', h: 'Höhe' },
  'Pyramide (Oberfläche)': { l: 'Länge (Grund.)', b: 'Breite (Grund.)', h: 'Höhe' },
};

const unitConversion: Record<Unit, number> = { m: 1, cm: 100, mm: 1000 };
const LS_KEY = 'laserApp-react';

export function LaserEntfernungsmesser() {
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [unit, setUnit] = useState<Unit>('m');
  const [projectName, setProjectName] = useState('');
  const [darkMode, setDarkMode] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const canvasRefs = useRef<Map<string, HTMLCanvasElement>>(new Map());

  // Toast helper
  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  // Calculation function
  const calculateGeometry = useCallback((form: string, l: number, b: number, h: number): number => {
    const calculations: Record<string, () => number> = {
      'Länge': () => l,
      'Rechteck': () => l * b,
      'Dreieck': () => 0.5 * l * h,
      'Trapez': () => 0.5 * (l + b) * h,
      'Parallelogramm': () => l * h,
      'Kreisfläche': () => Math.PI * l * l,
      'Ellipse': () => Math.PI * l * b,
      'Quader (Volumen)': () => l * b * h,
      'Quader (Oberfläche)': () => 2 * (l * b + l * h + b * h),
      'Zylinder (Volumen)': () => Math.PI * l * l * h,
      'Zylinder (Oberfläche)': () => 2 * Math.PI * l * h + 2 * Math.PI * l * l,
      'Kegel (Volumen)': () => (Math.PI * l * l * h) / 3,
      'Kegel (Oberfläche)': () => Math.PI * l * (l + Math.sqrt(h * h + l * l)),
      'Kugel (Volumen)': () => (4 / 3) * Math.PI * Math.pow(l, 3),
      'Kugel (Oberfläche)': () => 4 * Math.PI * l * l,
      'Pyramide (Volumen)': () => (l * b * h) / 3,
      'Pyramide (Oberfläche)': () => {
        const sPyramid = l * Math.sqrt(Math.pow(b / 2, 2) + h * h) + b * Math.sqrt(Math.pow(l / 2, 2) + h * h);
        return l * b + sPyramid;
      },
    };
    return calculations[form] ? calculations[form]() : 0;
  }, []);

  const getUnitSuffix = useCallback((form: string): string => {
    if (form.includes('(Volumen)')) return `${unit}³`;
    if (form === 'Länge') return unit;
    return `${unit}²`;
  }, [unit]);

  const getFieldConfig = useCallback((form: string) => {
    const config = formConfig[form] || '';
    return {
      showL: true,
      showB: config.includes('B'),
      showH: config.includes('H'),
      needsL: config.includes('L') || config.includes('R'),
      needsB: config.includes('B'),
      needsH: config.includes('H'),
    };
  }, []);

  const getLabels = useCallback((form: string) => {
    const labels = labelConfig[form] || {};
    return {
      l: labels.l || 'Länge',
      b: labels.b || 'Breite',
      h: labels.h || 'Höhe',
    };
  }, []);

  // Load from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(LS_KEY);
      if (saved) {
        const data = JSON.parse(saved);
        if (data.theme === 'dark') setDarkMode(true);
        if (data.projectName) setProjectName(data.projectName);
        if (data.unit && unitConversion[data.unit as Unit]) setUnit(data.unit as Unit);
        if (data.measurements?.length > 0) {
          setMeasurements(data.measurements.map((m: Partial<Measurement>) => ({
            ...m,
            id: m.id || crypto.randomUUID(),
            collapsed: false,
            editing: false,
          })));
        }
      }
    } catch {
      localStorage.removeItem(LS_KEY);
    }
  }, []);

  // Save to localStorage
  useEffect(() => {
    try {
      const data = {
        theme: darkMode ? 'dark' : 'light',
        projectName,
        unit,
        measurements: measurements.map(({ id, l, b, h, form, name }) => ({ id, l, b, h, form, name })),
      };
      localStorage.setItem(LS_KEY, JSON.stringify(data));
    } catch {
      // Ignore
    }
  }, [measurements, projectName, unit, darkMode]);

  // Draw visualizations
  useEffect(() => {
    measurements.forEach((m) => {
      const canvas = canvasRefs.current.get(m.id);
      if (canvas) {
        drawVisualization(canvas, m.form, parseFloat(m.l) || 0, parseFloat(m.b) || 0, parseFloat(m.h) || 0);
      }
    });
  }, [measurements, darkMode]);

  const drawVisualization = useCallback((canvas: HTMLCanvasElement, form: string, l: number, b: number, h: number) => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const cssWidth = 120;
    const cssHeight = 90;
    canvas.width = cssWidth * dpr;
    canvas.height = cssHeight * dpr;
    canvas.style.width = `${cssWidth}px`;
    canvas.style.height = `${cssHeight}px`;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, cssWidth, cssHeight);

    if (!form || (!l && !h && !b)) return;

    const c = {
      base: darkMode ? '#5a5a5e' : '#c2c2c7',
      light: darkMode ? '#7a7a7e' : '#e5e5ea',
      dark: darkMode ? '#3a3a3c' : '#a2a2a7',
      stroke: darkMode ? '#d1d1d6' : '#636366',
      highlight: darkMode ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.7)',
      fill2d: darkMode ? 'rgba(158,158,163,0.5)' : 'rgba(142,142,147,0.5)',
    };

    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.lineWidth = 1.2;
    ctx.strokeStyle = c.stroke;

    const centerX = cssWidth / 2;
    const centerY = cssHeight / 2;
    const maxDim = Math.max(l, b, h, 1);
    const scale = Math.min(cssWidth * 0.8, cssHeight * 0.8) / maxDim;

    const drawPoly = (points: { x: number; y: number }[], color: string | CanvasGradient) => {
      if (!points || points.length < 3) return;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
      ctx.closePath();
      ctx.fill();
    };

    const strokePoly = (points: { x: number; y: number }[]) => {
      if (!points || points.length < 2) return;
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
      if (points.length > 2) ctx.closePath();
      ctx.stroke();
    };

    const baseForm = form.split(' (')[0];

    switch (baseForm) {
      case 'Länge':
        strokePoly([{ x: centerX - (l * scale) / 2, y: centerY }, { x: centerX + (l * scale) / 2, y: centerY }]);
        break;
      case 'Rechteck': {
        const sw = l * scale, sh = b * scale;
        ctx.fillStyle = c.fill2d;
        ctx.fillRect(centerX - sw / 2, centerY - sh / 2, sw, sh);
        ctx.strokeRect(centerX - sw / 2, centerY - sh / 2, sw, sh);
        break;
      }
      case 'Dreieck': {
        const points = [
          { x: centerX - (l * scale) / 2, y: centerY + (h * scale) / 2 },
          { x: centerX + (l * scale) / 2, y: centerY + (h * scale) / 2 },
          { x: centerX, y: centerY - (h * scale) / 2 },
        ];
        drawPoly(points, c.fill2d);
        strokePoly(points);
        break;
      }
      case 'Trapez': {
        const sw1 = l * scale, sw2 = b * scale, sh = h * scale;
        const points = [
          { x: centerX - sw1 / 2, y: centerY + sh / 2 },
          { x: centerX + sw1 / 2, y: centerY + sh / 2 },
          { x: centerX + sw2 / 2, y: centerY - sh / 2 },
          { x: centerX - sw2 / 2, y: centerY - sh / 2 },
        ];
        drawPoly(points, c.fill2d);
        strokePoly(points);
        break;
      }
      case 'Parallelogramm': {
        const sw = l * scale, sh = h * scale, skew = sw * 0.25;
        const points = [
          { x: centerX - sw / 2, y: centerY + sh / 2 },
          { x: centerX + sw / 2, y: centerY + sh / 2 },
          { x: centerX + sw / 2 - skew, y: centerY - sh / 2 },
          { x: centerX - sw / 2 - skew, y: centerY - sh / 2 },
        ];
        drawPoly(points, c.fill2d);
        strokePoly(points);
        break;
      }
      case 'Kreisfläche': {
        const r = (l * scale) / 2;
        ctx.fillStyle = c.fill2d;
        ctx.beginPath();
        ctx.arc(centerX, centerY, r, 0, 2 * Math.PI);
        ctx.fill();
        ctx.stroke();
        break;
      }
      case 'Ellipse': {
        const rx = (l * scale) / 2, ry = (b * scale) / 2;
        ctx.fillStyle = c.fill2d;
        ctx.beginPath();
        ctx.ellipse(centerX, centerY, rx, ry, 0, 0, 2 * Math.PI);
        ctx.fill();
        ctx.stroke();
        break;
      }
      case 'Kugel': {
        const r = (l * scale) / 2;
        const grad = ctx.createRadialGradient(centerX - r / 2, centerY - r / 2, r / 10, centerX, centerY, r);
        grad.addColorStop(0, c.light);
        grad.addColorStop(1, c.dark);
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(centerX, centerY, r, 0, 2 * Math.PI);
        ctx.fill();
        ctx.fillStyle = c.highlight;
        ctx.beginPath();
        ctx.arc(centerX - r / 3, centerY - r / 3, r / 5, 0, 2 * Math.PI);
        ctx.fill();
        break;
      }
      case 'Quader': {
        const sw = l * scale, sh = h * scale, sd = b * scale * 0.5;
        const offX = sd * 0.707, offY = sd * 0.4;
        const p = [
          { x: centerX - sw / 2, y: centerY + sh / 2 },
          { x: centerX + sw / 2, y: centerY + sh / 2 },
          { x: centerX + sw / 2, y: centerY - sh / 2 },
          { x: centerX - sw / 2, y: centerY - sh / 2 },
          { x: centerX - sw / 2 + offX, y: centerY + sh / 2 - offY },
          { x: centerX + sw / 2 + offX, y: centerY + sh / 2 - offY },
          { x: centerX + sw / 2 + offX, y: centerY - sh / 2 - offY },
          { x: centerX - sw / 2 + offX, y: centerY - sh / 2 - offY },
        ];
        drawPoly([p[0], p[1], p[5], p[4]], c.base);
        drawPoly([p[4], p[5], p[6], p[7]], c.light);
        drawPoly([p[1], p[2], p[6], p[5]], c.base);
        drawPoly([p[3], p[2], p[6], p[7]], c.light);
        drawPoly([p[0], p[1], p[2], p[3]], c.base);
        strokePoly([p[0], p[1], p[2], p[3], p[0]]);
        strokePoly([p[4], p[5], p[6], p[7], p[4]]);
        strokePoly([p[0], p[4]]);
        strokePoly([p[1], p[5]]);
        strokePoly([p[2], p[6]]);
        strokePoly([p[3], p[7]]);
        break;
      }
      case 'Zylinder': {
        const r = (l * scale) / 2, sh = h * scale;
        const eH = Math.max(r * 0.3, 2);
        const grad = ctx.createLinearGradient(centerX - r, centerY, centerX + r, centerY);
        grad.addColorStop(0, c.dark);
        grad.addColorStop(0.5, c.light);
        grad.addColorStop(1, c.dark);
        ctx.fillStyle = c.dark;
        ctx.beginPath();
        ctx.ellipse(centerX, centerY + sh / 2 - eH, r, eH, 0, 0, 2 * Math.PI);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = grad;
        ctx.fillRect(centerX - r, centerY - sh / 2 + eH, r * 2, sh - eH * 2);
        strokePoly([{ x: centerX - r, y: centerY - sh / 2 + eH }, { x: centerX - r, y: centerY + sh / 2 - eH }]);
        strokePoly([{ x: centerX + r, y: centerY - sh / 2 + eH }, { x: centerX + r, y: centerY + sh / 2 - eH }]);
        ctx.fillStyle = c.light;
        ctx.beginPath();
        ctx.ellipse(centerX, centerY - sh / 2 + eH, r, eH, 0, 0, 2 * Math.PI);
        ctx.fill();
        ctx.stroke();
        break;
      }
      case 'Pyramide': {
        const sw = l * scale, sd = b * scale * 0.5, sh = h * scale;
        const offX = sd * 0.707, offY = sd * 0.4;
        const apex = { x: centerX + offX / 2, y: centerY - sh / 2 };
        const base = [
          { x: centerX - sw / 2, y: centerY + sh / 2 },
          { x: centerX + sw / 2, y: centerY + sh / 2 },
          { x: centerX + sw / 2 + offX, y: centerY + sh / 2 - offY },
          { x: centerX - sw / 2 + offX, y: centerY + sh / 2 - offY },
        ];
        drawPoly([apex, base[3], base[0]], c.dark);
        drawPoly([apex, base[0], base[1]], c.base);
        drawPoly([apex, base[1], base[2]], c.light);
        strokePoly([apex, base[0]]);
        strokePoly([apex, base[1]]);
        strokePoly([apex, base[2]]);
        strokePoly([base[0], base[1], base[2], base[3], base[0]]);
        break;
      }
      case 'Kegel': {
        const r = (l * scale) / 2, sh = h * scale;
        const eH = Math.max(r * 0.3, 2);
        const apex = { x: centerX, y: centerY - sh / 2 + eH };
        const grad = ctx.createLinearGradient(centerX - r, centerY, centerX + r, centerY);
        grad.addColorStop(0, c.dark);
        grad.addColorStop(0.5, c.light);
        grad.addColorStop(1, c.dark);
        ctx.fillStyle = c.dark;
        ctx.beginPath();
        ctx.ellipse(centerX, centerY + sh / 2 - eH, r, eH, 0, 0, 2 * Math.PI);
        ctx.fill();
        ctx.stroke();
        drawPoly([apex, { x: centerX - r, y: centerY + sh / 2 - eH }, { x: centerX + r, y: centerY + sh / 2 - eH }], grad);
        strokePoly([apex, { x: centerX - r, y: centerY + sh / 2 - eH }]);
        strokePoly([apex, { x: centerX + r, y: centerY + sh / 2 - eH }]);
        break;
      }
    }
  }, [darkMode]);

  // Handlers
  const addMeasurement = () => {
    const newMeasurement: Measurement = {
      id: crypto.randomUUID(),
      l: '',
      b: '',
      h: '',
      form: '',
      name: '',
      collapsed: false,
      editing: true,
    };
    setMeasurements([newMeasurement, ...measurements]);
    showToast('Neue Messung hinzugefügt', 'success');
  };

  const updateMeasurement = (id: string, field: keyof Measurement, value: string | boolean) => {
    setMeasurements(measurements.map((m) => (m.id === id ? { ...m, [field]: value } : m)));
  };

  const deleteMeasurement = (id: string) => {
    if (confirm('Diese Messung wirklich löschen?')) {
      setMeasurements(measurements.filter((m) => m.id !== id));
      canvasRefs.current.delete(id);
      showToast('Messung gelöscht', 'success');
    }
  };

  const toggleEdit = (id: string) => {
    setMeasurements(measurements.map((m) => {
      if (m.id === id) {
        if (m.editing) showToast('Änderungen gespeichert', 'success');
        return { ...m, editing: !m.editing };
      }
      return m;
    }));
  };

  const toggleCollapse = (id: string) => {
    setMeasurements(measurements.map((m) => (m.id === id ? { ...m, collapsed: !m.collapsed } : m)));
  };

  const collapseAll = () => {
    setMeasurements(measurements.map((m) => ({ ...m, collapsed: true })));
  };

  const expandAll = () => {
    setMeasurements(measurements.map((m) => ({ ...m, collapsed: false })));
  };

  const clearAll = () => {
    if (confirm('Wirklich alle Daten löschen?')) {
      setMeasurements([]);
      setProjectName('');
      localStorage.removeItem(LS_KEY);
      showToast('Alle Daten gelöscht', 'error');
    }
  };

  const changeUnit = (newUnit: Unit) => {
    const factor = unitConversion[newUnit] / unitConversion[unit];
    setMeasurements(measurements.map((m) => ({
      ...m,
      l: m.l ? (parseFloat(m.l) * factor).toPrecision(15) : '',
      b: m.b ? (parseFloat(m.b) * factor).toPrecision(15) : '',
      h: m.h ? (parseFloat(m.h) * factor).toPrecision(15) : '',
    })));
    setUnit(newUnit);
    showToast(`Einheit auf ${newUnit.toUpperCase()} geändert`, 'success');
  };

  const exportToCSV = () => {
    try {
      const headers = ['Länge/Radius', 'Breite', 'Höhe', 'Form', 'Bezeichnung', 'Ergebnis', 'Einheit'];
      const rows = measurements.map((m) => {
        const l = parseFloat(m.l) || 0;
        const b = parseFloat(m.b) || 0;
        const h = parseFloat(m.h) || 0;
        return [l, b, h, m.form, m.name, calculateGeometry(m.form, l, b, h).toFixed(2), getUnitSuffix(m.form)];
      });

      const csvContent = [
        headers.join(';'),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(';'))
      ].join('\n');

      const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `${projectName || 'Messungen'}.csv`;
      a.click();
      URL.revokeObjectURL(a.href);
      showToast('CSV exportiert', 'success');
    } catch {
      showToast('Export fehlgeschlagen', 'error');
    }
  };

  // Calculate totals
  const totals = measurements.reduce(
    (acc, m) => {
      const l = parseFloat(m.l) || 0;
      const b = parseFloat(m.b) || 0;
      const h = parseFloat(m.h) || 0;
      const value = calculateGeometry(m.form, l, b, h);
      if (value > 0) {
        const suffix = getUnitSuffix(m.form);
        if (suffix.includes('³')) acc.volume += value;
        else if (suffix.includes('²')) acc.area += value;
        else acc.length += value;
      }
      return acc;
    },
    { area: 0, length: 0, volume: 0 }
  );

  return (
    <div className={`min-h-[600px] p-4 md:p-6 ${darkMode ? 'bg-black text-gray-100' : 'bg-gray-100 text-gray-900'}`}>
      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-5 left-1/2 -translate-x-1/2 px-6 py-3 rounded-xl text-white font-medium z-50 transition-all ${
          toast.type === 'success' ? 'bg-green-500' : 'bg-red-500'
        }`}>
          {toast.message}
        </div>
      )}

      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl md:text-3xl font-semibold text-center mb-6">Laser Entfernungsmesser</h1>

        {/* Controls */}
        <div className={`p-4 md:p-5 rounded-xl mb-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 ${
          darkMode ? 'bg-[#1c1c1e] border border-gray-700' : 'bg-white shadow-md'
        }`}>
          <div>
            <label className="block text-sm text-gray-500 mb-1">Maßeinheit</label>
            <select
              value={unit}
              onChange={(e) => changeUnit(e.target.value as Unit)}
              className={`w-full p-3 rounded-lg border ${
                darkMode ? 'bg-[#2c2c2e] border-gray-600' : 'bg-white border-gray-200'
              }`}
            >
              <option value="m">Meter (m)</option>
              <option value="cm">Zentimeter (cm)</option>
              <option value="mm">Millimeter (mm)</option>
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-500 mb-1">Projektname</label>
            <input
              type="text"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="z.B. Wohnzimmer"
              className={`w-full p-3 rounded-lg border ${
                darkMode ? 'bg-[#2c2c2e] border-gray-600' : 'bg-white border-gray-200'
              }`}
            />
          </div>
          <button
            onClick={addMeasurement}
            className="flex items-center justify-center gap-2 p-3 bg-[#8f1d1d] text-white rounded-lg hover:bg-[#7a1919] transition-all"
          >
            <Plus className="w-5 h-5" /> Neue Messung
          </button>
          <button
            onClick={exportToCSV}
            className="flex items-center justify-center gap-2 p-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-all"
          >
            <FileSpreadsheet className="w-5 h-5" /> Excel Export
          </button>
          <div className="flex gap-2">
            <button
              onClick={collapseAll}
              className={`flex-1 p-3 rounded-lg transition-all ${
                darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'
              }`}
            >
              <ChevronDown className="w-5 h-5 mx-auto" />
            </button>
            <button
              onClick={expandAll}
              className={`flex-1 p-3 rounded-lg transition-all ${
                darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'
              }`}
            >
              <ChevronUp className="w-5 h-5 mx-auto" />
            </button>
          </div>
          <button
            onClick={clearAll}
            className="flex items-center justify-center gap-2 p-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-all"
          >
            <Trash2 className="w-5 h-5" /> Löschen
          </button>
        </div>

        {/* Measurements */}
        <div className="space-y-4">
          {measurements.length === 0 ? (
            <div className={`text-center py-12 rounded-xl ${darkMode ? 'bg-[#1c1c1e]' : 'bg-white'}`}>
              <p className="text-gray-500">Keine Messungen vorhanden. Klicken Sie auf &quot;Neue Messung&quot; um zu beginnen.</p>
            </div>
          ) : (
            measurements.map((m) => {
              const config = getFieldConfig(m.form);
              const labels = getLabels(m.form);
              const l = parseFloat(m.l) || 0;
              const b = parseFloat(m.b) || 0;
              const h = parseFloat(m.h) || 0;
              const result = calculateGeometry(m.form, l, b, h);
              const hasAllValues = (!config.needsL || l) && (!config.needsB || b) && (!config.needsH || h);

              return (
                <div
                  key={m.id}
                  className={`rounded-xl overflow-hidden transition-all ${
                    darkMode ? 'bg-[#1c1c1e] border border-gray-700' : 'bg-white shadow-md'
                  } ${m.editing ? 'ring-2 ring-[#8f1d1d]' : ''}`}
                >
                  {m.collapsed ? (
                    <div className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <span className="font-medium text-lg">{m.name || 'Unbenannt'}</span>
                        {m.form && result > 0 && hasAllValues && (
                          <span className="text-[#8f1d1d] font-semibold">
                            {result.toFixed(2)} {getUnitSuffix(m.form)}
                          </span>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => toggleEdit(m.id)}
                          className={`p-2 rounded-lg border ${darkMode ? 'border-gray-600' : 'border-gray-200'}`}
                        >
                          {m.editing ? <Save className="w-5 h-5" /> : <Edit2 className="w-5 h-5" />}
                        </button>
                        <button
                          onClick={() => toggleCollapse(m.id)}
                          className={`p-2 rounded-lg border ${darkMode ? 'border-gray-600' : 'border-gray-200'}`}
                        >
                          <ChevronUp className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => deleteMeasurement(m.id)}
                          className={`p-2 rounded-lg border text-red-500 ${darkMode ? 'border-gray-600' : 'border-gray-200'}`}
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4">
                      <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                        {/* Form Select */}
                        <div>
                          <label className="block text-sm text-gray-500 mb-1">Form</label>
                          <select
                            value={m.form}
                            onChange={(e) => updateMeasurement(m.id, 'form', e.target.value)}
                            disabled={!m.editing}
                            className={`w-full p-3 rounded-lg border ${
                              darkMode ? 'bg-[#2c2c2e] border-gray-600' : 'bg-white border-gray-200'
                            } ${!m.editing ? 'opacity-60 cursor-not-allowed' : ''}`}
                          >
                            <option value="">Form wählen...</option>
                            {Object.keys(formConfig).filter(f => f).map((f) => (
                              <option key={f} value={f}>{f}</option>
                            ))}
                          </select>
                        </div>

                        {/* Length/Radius */}
                        <div>
                          <label className="block text-sm text-gray-500 mb-1">{labels.l}</label>
                          <input
                            type="number"
                            value={m.l}
                            onChange={(e) => updateMeasurement(m.id, 'l', e.target.value)}
                            placeholder="0.00"
                            step="0.01"
                            min="0"
                            readOnly={!m.editing}
                            className={`w-full p-3 rounded-lg border ${
                              darkMode ? 'bg-[#2c2c2e] border-gray-600' : 'bg-white border-gray-200'
                            } ${!m.editing ? 'opacity-60 cursor-not-allowed' : ''} ${
                              config.needsL && !l && m.form ? 'border-red-500' : ''
                            }`}
                          />
                        </div>

                        {/* Width */}
                        {config.showB && (
                          <div>
                            <label className="block text-sm text-gray-500 mb-1">{labels.b}</label>
                            <input
                              type="number"
                              value={m.b}
                              onChange={(e) => updateMeasurement(m.id, 'b', e.target.value)}
                              placeholder="0.00"
                              step="0.01"
                              min="0"
                              readOnly={!m.editing}
                              className={`w-full p-3 rounded-lg border ${
                                darkMode ? 'bg-[#2c2c2e] border-gray-600' : 'bg-white border-gray-200'
                              } ${!m.editing ? 'opacity-60 cursor-not-allowed' : ''} ${
                                config.needsB && !b && m.form ? 'border-red-500' : ''
                              }`}
                            />
                          </div>
                        )}

                        {/* Height */}
                        {config.showH && (
                          <div>
                            <label className="block text-sm text-gray-500 mb-1">{labels.h}</label>
                            <input
                              type="number"
                              value={m.h}
                              onChange={(e) => updateMeasurement(m.id, 'h', e.target.value)}
                              placeholder="0.00"
                              step="0.01"
                              min="0"
                              readOnly={!m.editing}
                              className={`w-full p-3 rounded-lg border ${
                                darkMode ? 'bg-[#2c2c2e] border-gray-600' : 'bg-white border-gray-200'
                              } ${!m.editing ? 'opacity-60 cursor-not-allowed' : ''} ${
                                config.needsH && !h && m.form ? 'border-red-500' : ''
                              }`}
                            />
                          </div>
                        )}

                        {/* Name */}
                        <div className={config.showB && config.showH ? '' : 'md:col-span-2'}>
                          <label className="block text-sm text-gray-500 mb-1">Bezeichnung</label>
                          <input
                            type="text"
                            value={m.name}
                            onChange={(e) => updateMeasurement(m.id, 'name', e.target.value)}
                            placeholder="Beschreibung..."
                            readOnly={!m.editing}
                            className={`w-full p-3 rounded-lg border ${
                              darkMode ? 'bg-[#2c2c2e] border-gray-600' : 'bg-white border-gray-200'
                            } ${!m.editing ? 'opacity-60 cursor-not-allowed' : ''}`}
                          />
                        </div>
                      </div>

                      {/* Result & Visualization */}
                      <div className="mt-4 flex flex-col md:flex-row items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                          <canvas
                            ref={(el) => {
                              if (el) canvasRefs.current.set(m.id, el);
                            }}
                            className="rounded-lg"
                            style={{ width: 120, height: 90 }}
                          />
                          <div className="text-center md:text-left">
                            <div className="text-sm text-gray-500">Ergebnis</div>
                            <div className="text-2xl font-bold text-[#8f1d1d]">
                              {!m.form
                                ? 'Form wählen...'
                                : result > 0 && hasAllValues
                                ? `${result.toFixed(2)} ${getUnitSuffix(m.form)}`
                                : 'Werte eingeben...'}
                            </div>
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <button
                            onClick={() => toggleEdit(m.id)}
                            className={`p-2 rounded-lg border transition-all hover:border-[#8f1d1d] hover:text-[#8f1d1d] ${
                              darkMode ? 'border-gray-600' : 'border-gray-200'
                            }`}
                            title={m.editing ? 'Speichern' : 'Bearbeiten'}
                          >
                            {m.editing ? <Save className="w-5 h-5" /> : <Edit2 className="w-5 h-5" />}
                          </button>
                          <button
                            onClick={() => toggleCollapse(m.id)}
                            className={`p-2 rounded-lg border transition-all hover:border-[#8f1d1d] hover:text-[#8f1d1d] ${
                              darkMode ? 'border-gray-600' : 'border-gray-200'
                            }`}
                            title="Einklappen"
                          >
                            <ChevronDown className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => deleteMeasurement(m.id)}
                            className={`p-2 rounded-lg border text-red-500 transition-all hover:bg-red-50 ${
                              darkMode ? 'border-gray-600 hover:bg-red-900/20' : 'border-gray-200'
                            }`}
                            title="Löschen"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          <div className={`p-4 rounded-xl text-center ${darkMode ? 'bg-[#1c1c1e] border border-gray-700' : 'bg-white shadow-md'}`}>
            <div className="text-2xl font-bold text-[#8f1d1d]">{totals.area.toFixed(2)} {unit}²</div>
            <div className="text-sm text-gray-500">Gesamtfläche</div>
          </div>
          <div className={`p-4 rounded-xl text-center ${darkMode ? 'bg-[#1c1c1e] border border-gray-700' : 'bg-white shadow-md'}`}>
            <div className="text-2xl font-bold text-[#8f1d1d]">{totals.length.toFixed(2)} {unit}</div>
            <div className="text-sm text-gray-500">Gesamtlänge</div>
          </div>
          <div className={`p-4 rounded-xl text-center ${darkMode ? 'bg-[#1c1c1e] border border-gray-700' : 'bg-white shadow-md'}`}>
            <div className="text-2xl font-bold text-[#8f1d1d]">{totals.volume.toFixed(2)} {unit}³</div>
            <div className="text-sm text-gray-500">Gesamtvolumen</div>
          </div>
          <div className={`p-4 rounded-xl text-center ${darkMode ? 'bg-[#1c1c1e] border border-gray-700' : 'bg-white shadow-md'}`}>
            <div className="text-2xl font-bold text-[#8f1d1d]">{measurements.length}</div>
            <div className="text-sm text-gray-500">Messungen</div>
          </div>
        </div>

        {/* Footer */}
        <footer className="mt-8 text-center text-sm text-gray-500 flex items-center justify-center gap-4">
          <span>© Kofler e.U. | Laser Entfernungsmesser Tool</span>
          <button
            onClick={() => {
              setDarkMode(!darkMode);
            }}
            className={`p-2 rounded-full ${darkMode ? 'bg-[#2c2c2e]' : 'bg-white shadow'}`}
            title="Design wechseln"
          >
            {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
        </footer>
      </div>
    </div>
  );
}
