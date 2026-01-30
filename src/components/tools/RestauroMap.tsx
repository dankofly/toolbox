'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ArrowLeft, Plus, Download, Upload, Building2, Trash2, Camera, Image as ImageIcon, FileText, ZoomIn, ZoomOut, Maximize2, Edit2 } from 'lucide-react';

// Types
interface Project {
  id: number;
  name: string;
  ort: string;
  imageUrl: string;
  created_at: string;
}

interface Area {
  id: number;
  projekt_id: number;
  name: string;
  wichtigkeit: 'high' | 'medium' | 'low';
  coords: { x: number; y: number }[];
  created_at: string;
}

interface Entry {
  id: number;
  area_id: number;
  typ: 'foto' | 'notiz';
  inhalt: string;
  source?: string;
  created_at: string;
}

interface Company {
  id: string;
  name?: string;
  email?: string;
  phone?: string;
  website?: string;
  logoDataUrl?: string;
}

interface AnnotatorShape {
  type: 'line' | 'ellipse' | 'pen';
  color: string;
  width: number;
  x1?: number;
  y1?: number;
  x2?: number;
  y2?: number;
  points?: { x: number; y: number }[];
}

type PageId = 'projects' | 'cockpit' | 'details';

// IndexedDB Helper
const DB_NAME = 'RestauroMapDB_React';
const DB_VERSION = 1;

const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains('firmendaten')) {
        db.createObjectStore('firmendaten', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('projekte')) {
        db.createObjectStore('projekte', { keyPath: 'id', autoIncrement: true });
      }
      if (!db.objectStoreNames.contains('areas')) {
        const areaStore = db.createObjectStore('areas', { keyPath: 'id', autoIncrement: true });
        areaStore.createIndex('projekt_id_idx', 'projekt_id');
      }
      if (!db.objectStoreNames.contains('eintraege')) {
        const entryStore = db.createObjectStore('eintraege', { keyPath: 'id', autoIncrement: true });
        entryStore.createIndex('area_id_idx', 'area_id');
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

const dbOperation = async <T,>(
  storeName: string,
  mode: IDBTransactionMode,
  operation: (store: IDBObjectStore) => IDBRequest
): Promise<T> => {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, mode);
    const store = tx.objectStore(storeName);
    const request = operation(store);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

// Helper to check dark mode from website theme
const isDarkMode = () => {
  if (typeof document !== 'undefined') {
    return document.documentElement.classList.contains('dark');
  }
  return false;
};

export function RestauroMap() {
  // State
  const [currentPage, setCurrentPage] = useState<PageId>('projects');
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentProjectId, setCurrentProjectId] = useState<number | null>(null);
  const [currentAreaId, setCurrentAreaId] = useState<number | null>(null);
  const [areas, setAreas] = useState<Area[]>([]);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [currentArea, setCurrentArea] = useState<Area | null>(null);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Modals
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [showNewAreaModal, setShowNewAreaModal] = useState(false);
  const [showNewEntryModal, setShowNewEntryModal] = useState(false);
  const [showCompanyModal, setShowCompanyModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState<{ message: string; onConfirm: () => void } | null>(null);
  const [showAreaListModal, setShowAreaListModal] = useState(false);
  const [showAnnotatorModal, setShowAnnotatorModal] = useState(false);
  const [annotatorEntry, setAnnotatorEntry] = useState<Entry | null>(null);

  // Form state
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectOrt, setNewProjectOrt] = useState('');
  const [newProjectImage, setNewProjectImage] = useState<string | null>(null);
  const [newAreaName, setNewAreaName] = useState('');
  const [newAreaWichtigkeit, setNewAreaWichtigkeit] = useState<'high' | 'medium' | 'low'>('medium');
  const [newEntryContent, setNewEntryContent] = useState('');
  const [company, setCompany] = useState<Company>({ id: 'company' });
  const [editingEntryId, setEditingEntryId] = useState<number | null>(null);
  const [editingEntryContent, setEditingEntryContent] = useState('');

  // Canvas state
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [activeImage, setActiveImage] = useState<HTMLImageElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawingPoints, setDrawingPoints] = useState<{ x: number; y: number }[]>([]);
  const [transform, setTransform] = useState<DOMMatrix>(() => {
    // DOMMatrix is only available in the browser
    if (typeof window !== 'undefined') {
      return new DOMMatrix();
    }
    // Return a placeholder for SSR that matches DOMMatrix shape
    return { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0, toString: () => 'matrix(1, 0, 0, 1, 0, 0)' } as unknown as DOMMatrix;
  });
  const [hoveredAreaId, setHoveredAreaId] = useState<number | null>(null);
  const pointerState = useRef({
    isDown: false,
    mode: 'none' as 'none' | 'pan' | 'pinch',
    startDist: 0,
    startClient: { x: 0, y: 0 },
    lastClient: { x: 0, y: 0 },
    pointers: new Map<number, { x: number; y: number }>(),
    didMove: false,
  });

  // Annotator state
  const annotatorCanvasRef = useRef<HTMLCanvasElement>(null);
  const [annotatorShapes, setAnnotatorShapes] = useState<AnnotatorShape[]>([]);
  const [annotatorTool, setAnnotatorTool] = useState<'line' | 'ellipse' | 'pen' | 'select'>('line');
  const [annotatorColor, setAnnotatorColor] = useState('#ff3b30');
  const [annotatorWidth, setAnnotatorWidth] = useState(12);
  const [annotatorSelectedIdx, setAnnotatorSelectedIdx] = useState(-1);
  const [annotatorBaseImage, setAnnotatorBaseImage] = useState<HTMLImageElement | null>(null);
  const [annotatorOverwrite, setAnnotatorOverwrite] = useState(true);
  const annotatorCurrentShape = useRef<AnnotatorShape | null>(null);

  // File input refs
  const projectImageInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const importInputRef = useRef<HTMLInputElement>(null);
  const companyLogoInputRef = useRef<HTMLInputElement>(null);

  // Toast helper
  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  }, []);

  // Database operations
  const loadProjects = useCallback(async () => {
    try {
      const result = await dbOperation<Project[]>('projekte', 'readonly', (store) => store.getAll());
      setProjects(result || []);
    } catch {
      showToast('Fehler beim Laden der Projekte', 'error');
    }
  }, [showToast]);

  const loadAreas = useCallback(async (projektId: number) => {
    try {
      const db = await openDB();
      return new Promise<Area[]>((resolve, reject) => {
        const tx = db.transaction('areas', 'readonly');
        const store = tx.objectStore('areas');
        const index = store.index('projekt_id_idx');
        const request = index.getAll(projektId);
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);
      });
    } catch {
      return [];
    }
  }, []);

  const loadEntries = useCallback(async (areaId: number) => {
    try {
      const db = await openDB();
      return new Promise<Entry[]>((resolve, reject) => {
        const tx = db.transaction('eintraege', 'readonly');
        const store = tx.objectStore('eintraege');
        const index = store.index('area_id_idx');
        const request = index.getAll(areaId);
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);
      });
    } catch {
      return [];
    }
  }, []);

  const loadCompany = useCallback(async () => {
    try {
      const result = await dbOperation<Company>('firmendaten', 'readonly', (store) => store.get('company'));
      if (result) setCompany(result);
    } catch {
      // Ignore
    }
  }, []);

  // Initialize
  useEffect(() => {
    loadProjects();
    loadCompany();
  }, [loadProjects, loadCompany]);

  // Navigation
  const navigateTo = useCallback(async (page: PageId, id?: number) => {
    setLoading(true);
    try {
      if (page === 'projects') {
        await loadProjects();
        setCurrentProjectId(null);
        setCurrentAreaId(null);
        setCurrentProject(null);
        setCurrentArea(null);
        setIsDrawing(false);
        setDrawingPoints([]);
      } else if (page === 'cockpit' && id) {
        const project = await dbOperation<Project>('projekte', 'readonly', (store) => store.get(id));
        if (!project) throw new Error('Projekt nicht gefunden');
        setCurrentProjectId(id);
        setCurrentProject(project);
        const projectAreas = await loadAreas(id);
        setAreas(projectAreas);

        // Load image
        const img = new Image();
        img.onload = () => {
          setActiveImage(img);
        };
        img.src = project.imageUrl;
      } else if (page === 'details' && id) {
        const area = await dbOperation<Area>('areas', 'readonly', (store) => store.get(id));
        if (!area) throw new Error('Bereich nicht gefunden');
        setCurrentAreaId(id);
        setCurrentArea(area);
        setCurrentProjectId(area.projekt_id);
        const areaEntries = await loadEntries(id);
        setEntries(areaEntries);
      }
      setCurrentPage(page);
    } catch (err) {
      showToast((err as Error).message || 'Navigation fehlgeschlagen', 'error');
    } finally {
      setLoading(false);
    }
  }, [loadProjects, loadAreas, loadEntries, showToast]);

  // Project operations
  const createProject = async () => {
    if (!newProjectName.trim() || !newProjectOrt.trim() || !newProjectImage) {
      showToast('Bitte alle Felder ausfüllen', 'error');
      return;
    }
    setLoading(true);
    try {
      const newProject = {
        name: newProjectName.trim(),
        ort: newProjectOrt.trim(),
        imageUrl: newProjectImage,
        created_at: new Date().toISOString(),
      };
      const id = await dbOperation<number>('projekte', 'readwrite', (store) => store.add(newProject));
      showToast('Projekt erstellt', 'success');
      setShowNewProjectModal(false);
      setNewProjectName('');
      setNewProjectOrt('');
      setNewProjectImage(null);
      await navigateTo('cockpit', id);
    } catch {
      showToast('Fehler beim Erstellen', 'error');
    } finally {
      setLoading(false);
    }
  };

  const deleteProject = async (id: number, name: string) => {
    setShowConfirmModal({
      message: `Wollen Sie das Projekt "${name}" wirklich löschen?`,
      onConfirm: async () => {
        setLoading(true);
        try {
          const projectAreas = await loadAreas(id);
          for (const area of projectAreas) {
            const areaEntries = await loadEntries(area.id);
            for (const entry of areaEntries) {
              await dbOperation('eintraege', 'readwrite', (store) => store.delete(entry.id));
            }
            await dbOperation('areas', 'readwrite', (store) => store.delete(area.id));
          }
          await dbOperation('projekte', 'readwrite', (store) => store.delete(id));
          showToast('Projekt gelöscht', 'success');
          await navigateTo('projects');
        } catch {
          showToast('Löschen fehlgeschlagen', 'error');
        } finally {
          setLoading(false);
          setShowConfirmModal(null);
        }
      },
    });
  };

  // Area operations
  const createArea = async () => {
    if (!newAreaName.trim() || drawingPoints.length < 3) {
      showToast('Name eingeben und mindestens 3 Punkte setzen', 'error');
      return;
    }
    try {
      const newArea = {
        projekt_id: currentProjectId!,
        name: newAreaName.trim(),
        wichtigkeit: newAreaWichtigkeit,
        coords: drawingPoints,
        created_at: new Date().toISOString(),
      };
      const id = await dbOperation<number>('areas', 'readwrite', (store) => store.add(newArea));
      showToast('Bereich erstellt', 'success');
      setShowNewAreaModal(false);
      setNewAreaName('');
      setNewAreaWichtigkeit('medium');
      setIsDrawing(false);
      setDrawingPoints([]);
      await navigateTo('details', id);
    } catch {
      showToast('Fehler beim Erstellen', 'error');
    }
  };

  const deleteArea = async () => {
    if (!currentAreaId) return;
    setShowConfirmModal({
      message: 'Soll dieser Bereich mit allen Einträgen gelöscht werden?',
      onConfirm: async () => {
        setLoading(true);
        try {
          const areaEntries = await loadEntries(currentAreaId);
          for (const entry of areaEntries) {
            await dbOperation('eintraege', 'readwrite', (store) => store.delete(entry.id));
          }
          await dbOperation('areas', 'readwrite', (store) => store.delete(currentAreaId));
          showToast('Bereich gelöscht', 'success');
          await navigateTo('cockpit', currentProjectId!);
        } catch {
          showToast('Löschen fehlgeschlagen', 'error');
        } finally {
          setLoading(false);
          setShowConfirmModal(null);
        }
      },
    });
  };

  // Entry operations
  const addNote = async () => {
    if (!newEntryContent.trim() || !currentAreaId) {
      showToast('Notiz darf nicht leer sein', 'error');
      return;
    }
    try {
      await dbOperation('eintraege', 'readwrite', (store) =>
        store.add({
          area_id: currentAreaId,
          typ: 'notiz',
          inhalt: newEntryContent.trim(),
          created_at: new Date().toISOString(),
        })
      );
      showToast('Notiz gespeichert', 'success');
      setShowNewEntryModal(false);
      setNewEntryContent('');
      const updatedEntries = await loadEntries(currentAreaId);
      setEntries(updatedEntries);
    } catch {
      showToast('Fehler beim Speichern', 'error');
    }
  };

  const handleFotoUpload = async (file: File, source: string) => {
    if (!file || !currentAreaId) return;
    setLoading(true);
    try {
      const dataUrl = await compressImage(file);
      await dbOperation('eintraege', 'readwrite', (store) =>
        store.add({
          area_id: currentAreaId,
          typ: 'foto',
          inhalt: dataUrl,
          source,
          created_at: new Date().toISOString(),
        })
      );
      showToast('Foto gespeichert', 'success');
      const updatedEntries = await loadEntries(currentAreaId);
      setEntries(updatedEntries);
    } catch {
      showToast('Fehler beim Hochladen', 'error');
    } finally {
      setLoading(false);
    }
  };

  const deleteEntry = async (id: number) => {
    setShowConfirmModal({
      message: 'Soll dieser Eintrag gelöscht werden?',
      onConfirm: async () => {
        try {
          await dbOperation('eintraege', 'readwrite', (store) => store.delete(id));
          showToast('Eintrag gelöscht', 'success');
          const updatedEntries = await loadEntries(currentAreaId!);
          setEntries(updatedEntries);
        } catch {
          showToast('Löschen fehlgeschlagen', 'error');
        }
        setShowConfirmModal(null);
      },
    });
  };

  const updateEntry = async (id: number, newContent: string) => {
    if (!newContent.trim()) {
      showToast('Notiz darf nicht leer sein', 'error');
      return;
    }
    try {
      const entry = await dbOperation<Entry>('eintraege', 'readonly', (store) => store.get(id));
      if (entry) {
        await dbOperation('eintraege', 'readwrite', (store) =>
          store.put({ ...entry, inhalt: newContent.trim() })
        );
        showToast('Notiz aktualisiert', 'success');
        const updatedEntries = await loadEntries(currentAreaId!);
        setEntries(updatedEntries);
        setEditingEntryId(null);
      }
    } catch {
      showToast('Aktualisierung fehlgeschlagen', 'error');
    }
  };

  // Company operations
  const saveCompany = async () => {
    try {
      await dbOperation('firmendaten', 'readwrite', (store) => store.put(company));
      showToast('Firmendaten gespeichert', 'success');
      setShowCompanyModal(false);
    } catch {
      showToast('Fehler beim Speichern', 'error');
    }
  };

  // Export/Import
  const exportBackup = async () => {
    setLoading(true);
    try {
      const data = {
        projekte: await dbOperation<Project[]>('projekte', 'readonly', (store) => store.getAll()),
        areas: await dbOperation<Area[]>('areas', 'readonly', (store) => store.getAll()),
        eintraege: await dbOperation<Entry[]>('eintraege', 'readonly', (store) => store.getAll()),
        firmendaten: await dbOperation<Company[]>('firmendaten', 'readonly', (store) => store.getAll()),
      };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `restauromap-backup-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(a.href);
      showToast('Backup heruntergeladen', 'success');
    } catch {
      showToast('Export fehlgeschlagen', 'error');
    } finally {
      setLoading(false);
    }
  };

  const importBackup = async (file: File) => {
    setLoading(true);
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (!data.projekte || !data.areas || !data.eintraege) {
        throw new Error('Ungültige Datei');
      }

      const db = await openDB();
      await Promise.all(['projekte', 'areas', 'eintraege', 'firmendaten'].map(
        (storeName) =>
          new Promise<void>((resolve, reject) => {
            const tx = db.transaction(storeName, 'readwrite');
            const request = tx.objectStore(storeName).clear();
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
          })
      ));

      for (const item of data.projekte) {
        await dbOperation('projekte', 'readwrite', (store) => store.put(item));
      }
      for (const item of data.areas) {
        await dbOperation('areas', 'readwrite', (store) => store.put(item));
      }
      for (const item of data.eintraege) {
        await dbOperation('eintraege', 'readwrite', (store) => store.put(item));
      }
      if (data.firmendaten) {
        for (const item of data.firmendaten) {
          await dbOperation('firmendaten', 'readwrite', (store) => store.put(item));
        }
      }

      showToast('Daten importiert', 'success');
      await navigateTo('projects');
    } catch (err) {
      showToast(`Import fehlgeschlagen: ${(err as Error).message}`, 'error');
    } finally {
      setLoading(false);
      if (importInputRef.current) importInputRef.current.value = '';
    }
  };

  // Image compression
  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const MAX_WIDTH = 4096;
          let { width, height } = img;
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d')!;
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.92));
        };
        img.onerror = () => reject(new Error('Bild konnte nicht geladen werden'));
        img.src = e.target?.result as string;
      };
      reader.onerror = () => reject(new Error('Datei konnte nicht gelesen werden'));
      reader.readAsDataURL(file);
    });
  };

  // Canvas drawing
  useEffect(() => {
    if (currentPage !== 'cockpit' || !canvasRef.current || !activeImage) return;

    const canvas = canvasRef.current;
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.parentElement!.getBoundingClientRect();

    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;
    canvas.width = Math.floor(rect.width * dpr);
    canvas.height = Math.floor(rect.height * dpr);

    const cw = canvas.width / dpr;
    const ch = canvas.height / dpr;
    const scale = Math.min(cw / activeImage.naturalWidth, ch / activeImage.naturalHeight);
    const newTransform = new DOMMatrix();
    newTransform.translateSelf(
      (cw - activeImage.naturalWidth * scale) / 2,
      (ch - activeImage.naturalHeight * scale) / 2
    );
    newTransform.scaleSelf(scale, scale);
    setTransform(newTransform);
  }, [currentPage, activeImage]);

  // Draw canvas
  const drawCanvas = useCallback(() => {
    if (!canvasRef.current || !activeImage) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d', { alpha: false })!;
    const dpr = window.devicePixelRatio || 1;
    const dark = isDarkMode();

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = dark ? '#1c1c1e' : '#f5f5f5';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.setTransform(
      transform.a * dpr,
      transform.b * dpr,
      transform.c * dpr,
      transform.d * dpr,
      transform.e * dpr,
      transform.f * dpr
    );
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = transform.a > 1 ? 'high' : 'medium';
    ctx.drawImage(activeImage, 0, 0);

    // Draw areas
    areas.forEach((area, i) => {
      if (!area.coords || area.coords.length === 0) return;
      const scale = transform.a;
      const lineWidth = Math.max(2, 3 / scale);
      ctx.lineWidth = hoveredAreaId === area.id ? lineWidth * 1.5 : lineWidth;

      const colors: Record<string, string> = {
        high: 'rgba(255,59,48,0.8)',
        medium: 'rgba(255,149,0,0.8)',
        low: 'rgba(52,199,89,0.8)',
      };
      const color = colors[area.wichtigkeit] || colors.medium;
      ctx.strokeStyle = color;
      ctx.fillStyle = hoveredAreaId === area.id ? color.replace('0.8', '0.3') : color.replace('0.8', '0.15');

      ctx.beginPath();
      area.coords.forEach((p, j) => {
        if (j === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      });
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Draw number
      const centroid = getPolygonCentroid(area.coords);
      const size = Math.max(16, activeImage.naturalWidth * 0.02) / scale;
      ctx.font = `bold ${size}px system-ui, -apple-system, sans-serif`;
      ctx.fillStyle = 'white';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = 'rgba(0,0,0,0.8)';
      ctx.shadowBlur = 6 / scale;
      ctx.fillText(String(i + 1), centroid.x, centroid.y);
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
    });

    // Draw current drawing
    if (drawingPoints.length > 0) {
      const scale = transform.a;
      const lineWidth = Math.max(2, 3 / scale);
      ctx.lineWidth = lineWidth;
      ctx.strokeStyle = 'rgba(255,149,0,0.8)';
      ctx.fillStyle = 'rgba(255,149,0,0.15)';

      ctx.beginPath();
      drawingPoints.forEach((p, i) => {
        if (i === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      });
      ctx.stroke();

      // Draw first point marker
      if (drawingPoints.length > 0) {
        const p = drawingPoints[0];
        ctx.fillStyle = '#8f1d1d';
        ctx.beginPath();
        ctx.arc(p.x, p.y, 10 / scale, 0, 2 * Math.PI);
        ctx.fill();
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 2 / scale;
        ctx.stroke();
      }
    }
  }, [activeImage, areas, drawingPoints, transform, hoveredAreaId]);

  useEffect(() => {
    if (currentPage === 'cockpit') {
      requestAnimationFrame(drawCanvas);
    }
  }, [currentPage, drawCanvas]);

  // Canvas event handlers
  const getWorldCoords = (clientX: number, clientY: number): { x: number; y: number } => {
    if (!canvasRef.current) return { x: 0, y: 0 };
    const rect = canvasRef.current.getBoundingClientRect();
    const inv = transform.inverse();
    const point = inv.transformPoint({ x: clientX - rect.left, y: clientY - rect.top });
    return { x: point.x, y: point.y };
  };

  const isPointInPolygon = (p: { x: number; y: number }, poly: { x: number; y: number }[]): boolean => {
    let inside = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      if (
        poly[i].y > p.y !== poly[j].y > p.y &&
        p.x < ((poly[j].x - poly[i].x) * (p.y - poly[i].y)) / (poly[j].y - poly[i].y) + poly[i].x
      ) {
        inside = !inside;
      }
    }
    return inside;
  };

  const getPolygonCentroid = (pts: { x: number; y: number }[]): { x: number; y: number } => {
    if (!pts || pts.length === 0) return { x: 0, y: 0 };
    let x = 0, y = 0, a = 0;
    for (let i = 0; i < pts.length; i++) {
      const p1 = pts[i];
      const p2 = pts[(i + 1) % pts.length];
      const c = p1.x * p2.y - p2.x * p1.y;
      a += c;
      x += (p1.x + p2.x) * c;
      y += (p1.y + p2.y) * c;
    }
    const f = a / 2;
    return f === 0 ? pts[0] : { x: x / (6 * f), y: y / (6 * f) };
  };

  const handleCanvasPointerDown = (e: React.PointerEvent) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    pointerState.current.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    canvas.setPointerCapture(e.pointerId);
    pointerState.current.isDown = true;
    pointerState.current.didMove = false;
    pointerState.current.startClient = { x: e.clientX, y: e.clientY };

    if (pointerState.current.pointers.size === 1) {
      pointerState.current.mode = 'pan';
      pointerState.current.lastClient = { x: e.clientX, y: e.clientY };
    } else if (pointerState.current.pointers.size === 2) {
      pointerState.current.mode = 'pinch';
      const pts = [...pointerState.current.pointers.values()];
      pointerState.current.startDist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
    }
  };

  const handleCanvasPointerMove = (e: React.PointerEvent) => {
    if (!pointerState.current.isDown || !pointerState.current.pointers.has(e.pointerId)) {
      // Handle hover
      if (!isDrawing && !pointerState.current.isDown) {
        const p = getWorldCoords(e.clientX, e.clientY);
        const hovered = areas.find((area) => isPointInPolygon(p, area.coords));
        setHoveredAreaId(hovered?.id || null);
      }
      return;
    }
    if (isDrawing) return;

    e.preventDefault();
    pointerState.current.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

    const dx = e.clientX - pointerState.current.startClient.x;
    const dy = e.clientY - pointerState.current.startClient.y;
    if (Math.abs(dx) > 6 || Math.abs(dy) > 6) {
      pointerState.current.didMove = true;
    }

    if (pointerState.current.mode === 'pan' && pointerState.current.pointers.size === 1) {
      const newTransform = new DOMMatrix(transform.toString());
      newTransform.e += e.clientX - pointerState.current.lastClient.x;
      newTransform.f += e.clientY - pointerState.current.lastClient.y;
      setTransform(newTransform);
      pointerState.current.lastClient = { x: e.clientX, y: e.clientY };
    } else if (pointerState.current.mode === 'pinch' && pointerState.current.pointers.size === 2) {
      const pts = [...pointerState.current.pointers.values()];
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      const scaleFactor = dist / pointerState.current.startDist;
      const midpoint = { x: (pts[0].x + pts[1].x) / 2, y: (pts[0].y + pts[1].y) / 2 };
      const rect = canvasRef.current!.getBoundingClientRect();
      zoomCanvas(scaleFactor, midpoint.x - rect.left, midpoint.y - rect.top);
      pointerState.current.startDist = dist;
    }
  };

  const handleCanvasPointerUp = (e: React.PointerEvent) => {
    const canvas = canvasRef.current;
    if (canvas) canvas.releasePointerCapture(e.pointerId);
    pointerState.current.pointers.delete(e.pointerId);

    if (!pointerState.current.didMove) {
      const p = getWorldCoords(e.clientX, e.clientY);
      if (isDrawing) {
        if (drawingPoints.length >= 3) {
          const first = drawingPoints[0];
          const dist = Math.hypot(p.x - first.x, p.y - first.y);
          if (dist < 32 / transform.a) {
            setShowNewAreaModal(true);
            return;
          }
        }
        setDrawingPoints([...drawingPoints, p]);
      } else {
        const clicked = [...areas].reverse().find((area) => isPointInPolygon(p, area.coords));
        if (clicked) navigateTo('details', clicked.id);
      }
    }

    if (pointerState.current.pointers.size < 2) pointerState.current.mode = 'pan';
    if (pointerState.current.pointers.size < 1) {
      pointerState.current.isDown = false;
      pointerState.current.mode = 'none';
    } else {
      pointerState.current.lastClient = [...pointerState.current.pointers.values()][0];
    }
  };

  const handleCanvasWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const scaleFactor = e.deltaY > 0 ? 0.9 : 1.1;
    const rect = canvasRef.current!.getBoundingClientRect();
    zoomCanvas(scaleFactor, e.clientX - rect.left, e.clientY - rect.top);
  };

  const zoomCanvas = (factor: number, x: number, y: number) => {
    const newScale = Math.max(0.02, Math.min(transform.a * factor, 40));
    const p = getWorldCoords(x + canvasRef.current!.getBoundingClientRect().left, y + canvasRef.current!.getBoundingClientRect().top);
    const actualFactor = newScale / transform.a;
    const newTransform = new DOMMatrix(transform.toString());
    newTransform.translateSelf(p.x, p.y);
    newTransform.scaleSelf(actualFactor, actualFactor);
    newTransform.translateSelf(-p.x, -p.y);
    setTransform(newTransform);
  };

  const fitToScreen = () => {
    if (!canvasRef.current || !activeImage) return;
    const canvas = canvasRef.current;
    const dpr = window.devicePixelRatio || 1;
    const cw = canvas.width / dpr;
    const ch = canvas.height / dpr;
    const scale = Math.min(cw / activeImage.naturalWidth, ch / activeImage.naturalHeight);
    const newTransform = new DOMMatrix();
    newTransform.translateSelf(
      (cw - activeImage.naturalWidth * scale) / 2,
      (ch - activeImage.naturalHeight * scale) / 2
    );
    newTransform.scaleSelf(scale, scale);
    setTransform(newTransform);
    showToast('Bild angepasst', 'info');
  };

  // Annotator functions
  const openAnnotator = (entry: Entry) => {
    setAnnotatorEntry(entry);
    setAnnotatorShapes([]);
    setAnnotatorSelectedIdx(-1);
    setAnnotatorTool('line');

    const img = new Image();
    img.onload = () => {
      setAnnotatorBaseImage(img);
      setShowAnnotatorModal(true);
    };
    img.src = entry.inhalt;
  };

  const drawAnnotator = useCallback(() => {
    if (!annotatorCanvasRef.current || !annotatorBaseImage) return;
    const canvas = annotatorCanvasRef.current;
    const ctx = canvas.getContext('2d')!;

    canvas.width = annotatorBaseImage.naturalWidth;
    canvas.height = annotatorBaseImage.naturalHeight;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(annotatorBaseImage, 0, 0);

    annotatorShapes.forEach((shape, i) => {
      drawAnnotatorShape(ctx, shape, i === annotatorSelectedIdx);
    });

    if (annotatorCurrentShape.current) {
      drawAnnotatorShape(ctx, annotatorCurrentShape.current, false);
    }
  }, [annotatorBaseImage, annotatorShapes, annotatorSelectedIdx]);

  useEffect(() => {
    if (showAnnotatorModal) {
      requestAnimationFrame(drawAnnotator);
    }
  }, [showAnnotatorModal, drawAnnotator]);

  const drawAnnotatorShape = (ctx: CanvasRenderingContext2D, shape: AnnotatorShape, selected: boolean) => {
    ctx.save();
    ctx.lineWidth = shape.width;
    ctx.strokeStyle = shape.color;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (shape.type === 'line') {
      ctx.beginPath();
      ctx.moveTo(shape.x1!, shape.y1!);
      ctx.lineTo(shape.x2!, shape.y2!);
      ctx.stroke();
    } else if (shape.type === 'ellipse') {
      const rx = Math.abs(shape.x2! - shape.x1!) / 2;
      const ry = Math.abs(shape.y2! - shape.y1!) / 2;
      const cx = Math.min(shape.x1!, shape.x2!) + rx;
      const cy = Math.min(shape.y1!, shape.y2!) + ry;
      ctx.beginPath();
      ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
      ctx.stroke();
    } else if (shape.type === 'pen' && shape.points) {
      ctx.beginPath();
      shape.points.forEach((p, i) => {
        if (i === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      });
      ctx.stroke();
    }

    if (selected) {
      ctx.setLineDash([6, 4]);
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#8f1d1d';
      const bounds = getShapeBounds(shape);
      ctx.strokeRect(bounds.x - 4, bounds.y - 4, bounds.width + 8, bounds.height + 8);
    }

    ctx.restore();
  };

  const getShapeBounds = (shape: AnnotatorShape) => {
    if (shape.type === 'pen' && shape.points) {
      const xs = shape.points.map(p => p.x);
      const ys = shape.points.map(p => p.y);
      return {
        x: Math.min(...xs),
        y: Math.min(...ys),
        width: Math.max(...xs) - Math.min(...xs),
        height: Math.max(...ys) - Math.min(...ys),
      };
    }
    return {
      x: Math.min(shape.x1!, shape.x2!),
      y: Math.min(shape.y1!, shape.y2!),
      width: Math.abs(shape.x2! - shape.x1!),
      height: Math.abs(shape.y2! - shape.y1!),
    };
  };

  const getAnnotatorPoint = (e: React.PointerEvent): { x: number; y: number } => {
    const canvas = annotatorCanvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (canvas.width / rect.width),
      y: (e.clientY - rect.top) * (canvas.height / rect.height),
    };
  };

  const handleAnnotatorPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    const p = getAnnotatorPoint(e);

    if (annotatorTool === 'select') {
      let found = -1;
      for (let i = annotatorShapes.length - 1; i >= 0; i--) {
        if (hitTestShape(annotatorShapes[i], p)) {
          found = i;
          break;
        }
      }
      setAnnotatorSelectedIdx(found);
      return;
    }

    if (annotatorTool === 'pen') {
      annotatorCurrentShape.current = { type: 'pen', color: annotatorColor, width: annotatorWidth, points: [p] };
    } else {
      annotatorCurrentShape.current = { type: annotatorTool, color: annotatorColor, width: annotatorWidth, x1: p.x, y1: p.y, x2: p.x, y2: p.y };
    }
    annotatorCanvasRef.current?.setPointerCapture(e.pointerId);
  };

  const handleAnnotatorPointerMove = (e: React.PointerEvent) => {
    if (!annotatorCurrentShape.current) return;
    const p = getAnnotatorPoint(e);

    if (annotatorCurrentShape.current.type === 'pen') {
      annotatorCurrentShape.current.points!.push(p);
    } else {
      annotatorCurrentShape.current.x2 = p.x;
      annotatorCurrentShape.current.y2 = p.y;
    }
    drawAnnotator();
  };

  const handleAnnotatorPointerUp = (e: React.PointerEvent) => {
    if (!annotatorCurrentShape.current) return;
    const p = getAnnotatorPoint(e);

    if (annotatorCurrentShape.current.type !== 'pen') {
      annotatorCurrentShape.current.x2 = p.x;
      annotatorCurrentShape.current.y2 = p.y;
    }

    setAnnotatorShapes([...annotatorShapes, annotatorCurrentShape.current]);
    annotatorCurrentShape.current = null;
    annotatorCanvasRef.current?.releasePointerCapture(e.pointerId);
  };

  const hitTestShape = (shape: AnnotatorShape, p: { x: number; y: number }): boolean => {
    const margin = Math.max(10, (shape.width || 12) * 0.8);

    if (shape.type === 'line') {
      return distPointToSegment(p, { x: shape.x1!, y: shape.y1! }, { x: shape.x2!, y: shape.y2! }) <= margin;
    } else if (shape.type === 'ellipse') {
      const rx = Math.abs(shape.x2! - shape.x1!) / 2;
      const ry = Math.abs(shape.y2! - shape.y1!) / 2;
      if (rx < 1 || ry < 1) return false;
      const cx = Math.min(shape.x1!, shape.x2!) + rx;
      const cy = Math.min(shape.y1!, shape.y2!) + ry;
      const nx = (p.x - cx) / rx;
      const ny = (p.y - cy) / ry;
      const val = nx * nx + ny * ny;
      const distToPerimeter = Math.abs(val - 1) * Math.max(rx, ry);
      return distToPerimeter <= margin || val <= 1;
    } else if (shape.type === 'pen' && shape.points) {
      for (let i = 1; i < shape.points.length; i++) {
        if (distPointToSegment(p, shape.points[i - 1], shape.points[i]) <= margin) return true;
      }
    }
    return false;
  };

  const distPointToSegment = (p: { x: number; y: number }, a: { x: number; y: number }, b: { x: number; y: number }): number => {
    const vx = b.x - a.x, vy = b.y - a.y;
    const wx = p.x - a.x, wy = p.y - a.y;
    const c1 = vx * wx + vy * wy;
    if (c1 <= 0) return Math.hypot(p.x - a.x, p.y - a.y);
    const c2 = vx * vx + vy * vy;
    if (c2 <= c1) return Math.hypot(p.x - b.x, p.y - b.y);
    const t = c1 / c2;
    return Math.hypot(p.x - (a.x + t * vx), p.y - (a.y + t * vy));
  };

  const saveAnnotation = async () => {
    if (!annotatorCanvasRef.current || !annotatorBaseImage || !annotatorEntry) return;

    try {
      const canvas = document.createElement('canvas');
      canvas.width = annotatorBaseImage.naturalWidth;
      canvas.height = annotatorBaseImage.naturalHeight;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(annotatorBaseImage, 0, 0);
      annotatorShapes.forEach(shape => drawAnnotatorShape(ctx, shape, false));

      const dataUrl = canvas.toDataURL('image/jpeg', 0.95);

      if (annotatorOverwrite && annotatorEntry.id) {
        await dbOperation('eintraege', 'readwrite', (store) =>
          store.put({
            id: annotatorEntry.id,
            area_id: annotatorEntry.area_id,
            typ: 'foto',
            inhalt: dataUrl,
            source: 'annotated',
            created_at: new Date().toISOString(),
          })
        );
      } else {
        await dbOperation('eintraege', 'readwrite', (store) =>
          store.add({
            area_id: annotatorEntry.area_id,
            typ: 'foto',
            inhalt: dataUrl,
            source: 'annotated',
            created_at: new Date().toISOString(),
          })
        );
      }

      showToast('Annotation gespeichert', 'success');
      setShowAnnotatorModal(false);
      const updatedEntries = await loadEntries(currentAreaId!);
      setEntries(updatedEntries);
    } catch {
      showToast('Speichern fehlgeschlagen', 'error');
    }
  };

  // Color palette for annotator
  const colorPalette = ['#ff3b30', '#ff9500', '#ffcc00', '#34c759', '#8f1d1d', '#5856d6', '#ff2d55', '#000000', '#ffffff'];

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[2000]">
          <div className={`px-5 py-3 rounded-2xl text-white font-medium shadow-lg ${
            toast.type === 'success' ? 'bg-green-500' : toast.type === 'error' ? 'bg-red-500' : 'bg-primary'
          }`}>
            {toast.message}
          </div>
        </div>
      )}

      {/* Loading Overlay */}
      {loading && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[3000]">
          <div className="w-12 h-12 border-4 border-muted border-b-primary rounded-full animate-spin" />
        </div>
      )}

      {/* Projects Page */}
      {currentPage === 'projects' && (
        <div className="space-y-4">
          <div className="bg-card border border-border rounded-xl p-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Projekte</h2>
            <div className="flex items-center gap-2">
              <input type="file" ref={importInputRef} className="hidden" accept=".json" onChange={(e) => e.target.files?.[0] && importBackup(e.target.files[0])} />
              <button onClick={() => importInputRef.current?.click()} className="p-2 rounded-lg hover:bg-muted" title="Import">
                <Upload className="w-5 h-5 text-primary" />
              </button>
              <button onClick={exportBackup} className="p-2 rounded-lg hover:bg-muted" title="Backup">
                <Download className="w-5 h-5 text-primary" />
              </button>
              <button onClick={() => setShowCompanyModal(true)} className="p-2 rounded-lg hover:bg-muted" title="Firmendaten">
                <Building2 className="w-5 h-5 text-primary" />
              </button>
              <button
                onClick={() => setShowNewProjectModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
              >
                <Plus className="w-4 h-4" /> Neues Projekt
              </button>
            </div>
          </div>

          {projects.length === 0 ? (
            <div className="bg-card border border-border rounded-xl p-10 text-center">
              <div className="text-5xl mb-4 opacity-50">📋</div>
              <p className="text-muted-foreground">Keine Projekte vorhanden.<br />Erstellen Sie ein neues Projekt um zu beginnen.</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {projects.map((p) => (
                <div
                  key={p.id}
                  className="bg-card border border-border rounded-xl p-4 cursor-pointer hover:border-primary transition-colors"
                  onClick={() => navigateTo('cockpit', p.id)}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold text-lg">{p.name}</h3>
                      <p className="text-muted-foreground text-sm">{p.ort}</p>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteProject(p.id, p.name); }}
                      className="px-3 py-1.5 bg-red-500 text-white text-sm rounded-lg hover:bg-red-600"
                    >
                      Löschen
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Cockpit Page */}
      {currentPage === 'cockpit' && (
        <div className="space-y-4">
          <div className="bg-card border border-border rounded-xl p-4 flex items-center justify-between flex-wrap gap-2">
            <button onClick={() => navigateTo('projects')} className="p-2 rounded-lg hover:bg-muted">
              <ArrowLeft className="w-5 h-5 text-primary" />
            </button>
            <span className="font-semibold flex-1 text-center truncate">{currentProject?.name}</span>
            <div className="flex items-center gap-2 flex-wrap">
              <button onClick={() => setShowAreaListModal(true)} className="px-3 py-1.5 text-sm rounded-lg bg-muted hover:bg-muted/80">
                📋 Bereiche
              </button>
              <button
                onClick={() => {
                  if (isDrawing) {
                    setIsDrawing(false);
                    setDrawingPoints([]);
                  } else {
                    setIsDrawing(true);
                    showToast('Tippen Sie um Punkte zu setzen', 'info');
                  }
                }}
                className={`px-3 py-1.5 text-sm rounded-lg ${isDrawing ? 'bg-orange-500 text-white' : 'bg-primary text-primary-foreground'}`}
              >
                {isDrawing ? 'Abbrechen' : '[+] Bereich'}
              </button>
              {isDrawing && drawingPoints.length >= 3 && (
                <button onClick={() => setShowNewAreaModal(true)} className="px-3 py-1.5 text-sm rounded-lg bg-green-500 text-white">
                  Fertig
                </button>
              )}
              <button onClick={fitToScreen} className="p-2 rounded-lg hover:bg-muted">
                <Maximize2 className="w-4 h-4 text-primary" />
              </button>
              <button onClick={() => zoomCanvas(1 / 1.3, canvasRef.current!.width / 2, canvasRef.current!.height / 2)} className="p-2 rounded-lg hover:bg-muted">
                <ZoomOut className="w-4 h-4 text-primary" />
              </button>
              <button onClick={() => zoomCanvas(1.3, canvasRef.current!.width / 2, canvasRef.current!.height / 2)} className="p-2 rounded-lg hover:bg-muted">
                <ZoomIn className="w-4 h-4 text-primary" />
              </button>
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl overflow-hidden aspect-[4/3]">
            <canvas
              ref={canvasRef}
              className={`w-full h-full ${isDrawing ? 'cursor-crosshair' : hoveredAreaId ? 'cursor-pointer' : 'cursor-grab'}`}
              onPointerDown={handleCanvasPointerDown}
              onPointerMove={handleCanvasPointerMove}
              onPointerUp={handleCanvasPointerUp}
              onPointerCancel={handleCanvasPointerUp}
              onWheel={handleCanvasWheel}
              onContextMenu={(e) => {
                e.preventDefault();
                if (isDrawing && drawingPoints.length > 0) {
                  setDrawingPoints(drawingPoints.slice(0, -1));
                  showToast('Letzter Punkt entfernt', 'info');
                }
              }}
            />
          </div>
        </div>
      )}

      {/* Details Page */}
      {currentPage === 'details' && currentArea && (
        <div className="space-y-4">
          <div className="bg-card border border-border rounded-xl p-4 flex items-center justify-between">
            <button onClick={() => navigateTo('cockpit', currentProjectId!)} className="p-2 rounded-lg hover:bg-muted">
              <ArrowLeft className="w-5 h-5 text-primary" />
            </button>
            <span className="font-semibold flex-1 text-center truncate">{currentArea.name}</span>
            <button onClick={deleteArea} className="px-3 py-1.5 bg-red-500 text-white text-sm rounded-lg hover:bg-red-600">
              Löschen
            </button>
          </div>

          <div className="flex flex-wrap gap-3 justify-center">
            <input type="file" ref={cameraInputRef} className="hidden" accept="image/*" capture="environment" onChange={(e) => e.target.files?.[0] && handleFotoUpload(e.target.files[0], 'camera')} />
            <input type="file" ref={galleryInputRef} className="hidden" accept="image/*" onChange={(e) => e.target.files?.[0] && handleFotoUpload(e.target.files[0], 'gallery')} />
            <button onClick={() => cameraInputRef.current?.click()} className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90">
              <Camera className="w-5 h-5" /> Kamera
            </button>
            <button onClick={() => galleryInputRef.current?.click()} className="flex items-center gap-2 px-5 py-2.5 bg-muted rounded-lg hover:bg-muted/80">
              <ImageIcon className="w-5 h-5" /> Galerie
            </button>
            <button onClick={() => setShowNewEntryModal(true)} className="flex items-center gap-2 px-5 py-2.5 bg-muted rounded-lg hover:bg-muted/80">
              <FileText className="w-5 h-5" /> Notiz
            </button>
          </div>

          {entries.length === 0 ? (
            <div className="bg-card border border-border rounded-xl p-10 text-center">
              <div className="text-5xl mb-4 opacity-50">📝</div>
              <p className="text-muted-foreground">Keine Einträge.<br />Fügen Sie Fotos oder Notizen hinzu.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {[...entries].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).map((entry, index, arr) => (
                <div key={entry.id} className="bg-card border border-border rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{entry.typ === 'foto' ? '📷' : '📝'}</span>
                      <span className="font-medium">
                        {entry.typ === 'foto' ? 'Foto' : 'Notiz'} #{arr.length - index}
                        {entry.source && ` (${entry.source === 'camera' ? 'Kamera' : entry.source === 'gallery' ? 'Galerie' : 'annot.'})`}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        {new Date(entry.created_at).toLocaleString('de-DE')}
                      </span>
                      {entry.typ === 'notiz' && (
                        <button
                          onClick={() => {
                            setEditingEntryId(entry.id);
                            setEditingEntryContent(entry.inhalt);
                          }}
                          className="p-1.5 text-primary hover:bg-muted rounded"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      )}
                      {entry.typ === 'foto' && (
                        <button
                          onClick={() => openAnnotator(entry)}
                          className="p-1.5 text-primary hover:bg-muted rounded"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      )}
                      <button onClick={() => deleteEntry(entry.id)} className="p-1.5 text-red-500 hover:bg-red-500/10 rounded">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  {entry.typ === 'notiz' ? (
                    editingEntryId === entry.id ? (
                      <div>
                        <textarea
                          value={editingEntryContent}
                          onChange={(e) => setEditingEntryContent(e.target.value)}
                          className="w-full p-2 rounded-lg border border-border bg-background"
                          rows={4}
                        />
                        <div className="flex gap-2 mt-2">
                          <button onClick={() => setEditingEntryId(null)} className="px-3 py-1.5 text-sm rounded-lg bg-muted">
                            Abbrechen
                          </button>
                          <button onClick={() => updateEntry(entry.id, editingEntryContent)} className="px-3 py-1.5 text-sm rounded-lg bg-primary text-primary-foreground">
                            Speichern
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-muted-foreground">{entry.inhalt}</p>
                    )
                  ) : (
                    <img src={entry.inhalt} alt="Foto" className="max-w-full max-h-48 rounded-lg object-cover" />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* New Project Modal */}
      {showNewProjectModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[1000] p-4">
          <div className="w-full max-w-md bg-card border border-border rounded-2xl p-6">
            <h3 className="text-xl font-semibold mb-4">Neues Projekt anlegen</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Projektname</label>
                <input
                  type="text"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  className="w-full p-3 rounded-lg border border-border bg-background"
                  placeholder="z.B. Villa Müller"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Ort</label>
                <input
                  type="text"
                  value={newProjectOrt}
                  onChange={(e) => setNewProjectOrt(e.target.value)}
                  className="w-full p-3 rounded-lg border border-border bg-background"
                  placeholder="z.B. Wien, Österreich"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Übersichtsbild</label>
                <input
                  type="file"
                  ref={projectImageInputRef}
                  accept="image/*"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const dataUrl = await compressImage(file);
                      setNewProjectImage(dataUrl);
                    }
                  }}
                />
                <button
                  onClick={() => projectImageInputRef.current?.click()}
                  className="w-full p-3 rounded-lg border border-border bg-background text-left hover:bg-muted"
                >
                  {newProjectImage ? 'Bild ausgewählt' : 'Bild auswählen...'}
                </button>
                {newProjectImage && (
                  <img src={newProjectImage} alt="Preview" className="mt-2 max-h-32 rounded-lg object-cover" />
                )}
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => { setShowNewProjectModal(false); setNewProjectName(''); setNewProjectOrt(''); setNewProjectImage(null); }} className="flex-1 py-3 rounded-lg bg-muted">
                Abbrechen
              </button>
              <button onClick={createProject} className="flex-1 py-3 bg-primary text-primary-foreground rounded-lg">
                Speichern
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Area Modal */}
      {showNewAreaModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[1000] p-4">
          <div className="w-full max-w-md bg-card border border-border rounded-2xl p-6">
            <h3 className="text-xl font-semibold mb-4">Neuen Bereich benennen</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Name des Bereichs</label>
                <input
                  type="text"
                  value={newAreaName}
                  onChange={(e) => setNewAreaName(e.target.value)}
                  className="w-full p-3 rounded-lg border border-border bg-background"
                  placeholder="z.B. Wand Süden"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Wichtigkeit</label>
                <select
                  value={newAreaWichtigkeit}
                  onChange={(e) => setNewAreaWichtigkeit(e.target.value as 'high' | 'medium' | 'low')}
                  className="w-full p-3 rounded-lg border border-border bg-background"
                >
                  <option value="high">Hoch</option>
                  <option value="medium">Mittel</option>
                  <option value="low">Niedrig</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => { setShowNewAreaModal(false); setIsDrawing(false); setDrawingPoints([]); }} className="flex-1 py-3 rounded-lg bg-muted">
                Abbrechen
              </button>
              <button onClick={createArea} className="flex-1 py-3 bg-primary text-primary-foreground rounded-lg">
                Speichern
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Entry Modal */}
      {showNewEntryModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[1000] p-4">
          <div className="w-full max-w-md bg-card border border-border rounded-2xl p-6">
            <h3 className="text-xl font-semibold mb-4">Neue Notiz</h3>
            <textarea
              value={newEntryContent}
              onChange={(e) => setNewEntryContent(e.target.value)}
              className="w-full p-3 rounded-lg border border-border bg-background h-32"
              placeholder="Beschreiben Sie Ihre Beobachtung..."
            />
            <div className="flex gap-3 mt-6">
              <button onClick={() => { setShowNewEntryModal(false); setNewEntryContent(''); }} className="flex-1 py-3 rounded-lg bg-muted">
                Abbrechen
              </button>
              <button onClick={addNote} className="flex-1 py-3 bg-primary text-primary-foreground rounded-lg">
                Speichern
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Company Modal */}
      {showCompanyModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[1000] p-4">
          <div className="w-full max-w-md bg-card border border-border rounded-2xl p-6">
            <h3 className="text-xl font-semibold mb-4">Firmendaten</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Firmenname</label>
                <input
                  type="text"
                  value={company.name || ''}
                  onChange={(e) => setCompany({ ...company, name: e.target.value })}
                  className="w-full p-3 rounded-lg border border-border bg-background"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">E-Mail</label>
                <input
                  type="email"
                  value={company.email || ''}
                  onChange={(e) => setCompany({ ...company, email: e.target.value })}
                  className="w-full p-3 rounded-lg border border-border bg-background"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Telefon</label>
                <input
                  type="tel"
                  value={company.phone || ''}
                  onChange={(e) => setCompany({ ...company, phone: e.target.value })}
                  className="w-full p-3 rounded-lg border border-border bg-background"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Website</label>
                <input
                  type="url"
                  value={company.website || ''}
                  onChange={(e) => setCompany({ ...company, website: e.target.value })}
                  className="w-full p-3 rounded-lg border border-border bg-background"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Logo</label>
                <input
                  type="file"
                  ref={companyLogoInputRef}
                  accept="image/*"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = (ev) => setCompany({ ...company, logoDataUrl: ev.target?.result as string });
                      reader.readAsDataURL(file);
                    }
                  }}
                />
                <button
                  onClick={() => companyLogoInputRef.current?.click()}
                  className="w-full p-3 rounded-lg border border-border bg-background text-left hover:bg-muted"
                >
                  Logo auswählen...
                </button>
                {company.logoDataUrl && (
                  <img src={company.logoDataUrl} alt="Logo" className="mt-2 max-h-24 object-contain" />
                )}
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowCompanyModal(false)} className="flex-1 py-3 rounded-lg bg-muted">
                Abbrechen
              </button>
              <button onClick={saveCompany} className="flex-1 py-3 bg-primary text-primary-foreground rounded-lg">
                Speichern
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[1000] p-4">
          <div className="w-full max-w-sm bg-card border border-border rounded-2xl p-6">
            <h3 className="text-xl font-semibold mb-4">Löschen bestätigen</h3>
            <p className="text-muted-foreground">{showConfirmModal.message}</p>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowConfirmModal(null)} className="flex-1 py-3 rounded-lg bg-muted">
                Abbrechen
              </button>
              <button onClick={showConfirmModal.onConfirm} className="flex-1 py-3 bg-red-500 text-white rounded-lg">
                Ja, löschen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Area List Modal */}
      {showAreaListModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[1000] p-4">
          <div className="w-full max-w-md bg-card border border-border rounded-2xl p-6">
            <h3 className="text-xl font-semibold mb-4">Bereiche</h3>
            <div className="max-h-[60vh] overflow-y-auto space-y-2">
              {areas.length === 0 ? (
                <p className="text-muted-foreground">Keine Bereiche vorhanden.</p>
              ) : (
                areas.map((area) => (
                  <button
                    key={area.id}
                    onClick={() => { setShowAreaListModal(false); navigateTo('details', area.id); }}
                    className="w-full p-3 rounded-lg text-left bg-muted hover:bg-muted/80"
                  >
                    {area.name} — <span className="text-muted-foreground text-sm">{area.wichtigkeit}</span>
                  </button>
                ))
              )}
            </div>
            <button onClick={() => setShowAreaListModal(false)} className="w-full py-3 mt-4 rounded-lg bg-muted">
              Schließen
            </button>
          </div>
        </div>
      )}

      {/* Annotator Modal */}
      {showAnnotatorModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[1000] p-4">
          <div className="w-full max-w-4xl h-[90vh] bg-card border border-border rounded-2xl p-4 flex flex-col">
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <div className="inline-flex rounded-lg overflow-hidden border border-border">
                {(['line', 'ellipse', 'pen'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => { setAnnotatorTool(t); setAnnotatorSelectedIdx(-1); }}
                    className={`px-3 py-2 text-sm ${annotatorTool === t ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}
                  >
                    {t === 'line' ? '— Linie' : t === 'ellipse' ? '○ Ellipse' : 'Freihand'}
                  </button>
                ))}
                <button
                  onClick={() => setAnnotatorTool('select')}
                  className={`px-3 py-2 text-sm ${annotatorTool === 'select' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}
                >
                  Auswählen
                </button>
              </div>
              <input type="color" value={annotatorColor} onChange={(e) => setAnnotatorColor(e.target.value)} className="w-8 h-8 rounded cursor-pointer" />
              <div className="flex gap-1">
                {colorPalette.map((c) => (
                  <button
                    key={c}
                    onClick={() => setAnnotatorColor(c)}
                    className={`w-7 h-7 rounded-full ${annotatorColor === c ? 'ring-2 ring-primary' : ''}`}
                    style={{ backgroundColor: c, border: c === '#ffffff' ? '1px solid #ccc' : 'none' }}
                  />
                ))}
              </div>
              <select
                value={annotatorWidth}
                onChange={(e) => setAnnotatorWidth(parseInt(e.target.value))}
                className="p-2 rounded-lg border border-border bg-background"
              >
                {[8, 12, 16, 24, 32, 40, 48].map((w) => (
                  <option key={w} value={w}>{w}</option>
                ))}
              </select>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={annotatorOverwrite} onChange={(e) => setAnnotatorOverwrite(e.target.checked)} className="w-4 h-4" />
                Original überschreiben
              </label>
              <button
                onClick={() => { if (annotatorSelectedIdx > -1) { setAnnotatorShapes(annotatorShapes.filter((_, i) => i !== annotatorSelectedIdx)); setAnnotatorSelectedIdx(-1); } }}
                className="px-3 py-2 text-sm rounded-lg bg-muted hover:bg-muted/80"
              >
                Löschen
              </button>
              <button
                onClick={() => { if (annotatorShapes.length > 0) { setAnnotatorShapes(annotatorShapes.slice(0, -1)); if (annotatorSelectedIdx >= annotatorShapes.length - 1) setAnnotatorSelectedIdx(-1); } }}
                className="px-3 py-2 text-sm rounded-lg bg-muted hover:bg-muted/80"
              >
                Rückgängig
              </button>
            </div>
            <div className="flex-1 border border-border rounded-lg overflow-hidden flex items-center justify-center bg-muted/30">
              <canvas
                ref={annotatorCanvasRef}
                className="max-w-full max-h-full"
                style={{ touchAction: 'none' }}
                onPointerDown={handleAnnotatorPointerDown}
                onPointerMove={handleAnnotatorPointerMove}
                onPointerUp={handleAnnotatorPointerUp}
              />
            </div>
            <div className="flex justify-end gap-3 mt-3">
              <button onClick={() => setShowAnnotatorModal(false)} className="px-4 py-2 rounded-lg bg-muted">
                Abbrechen
              </button>
              <button onClick={saveAnnotation} className="px-4 py-2 bg-primary text-primary-foreground rounded-lg">
                Speichern
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
