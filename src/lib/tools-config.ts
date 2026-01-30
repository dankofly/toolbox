export type AccessLevel = 'free' | 'registered' | 'premium';

export interface Tool {
  slug: string;
  name: string;
  description: string;
  category: string;
  accessLevel: AccessLevel;
  htmlFile: string;
  icon: string;
  /** If true, use native React component instead of iframe */
  useNativeComponent?: boolean;
}

export const TOOLS: Tool[] = [
  {
    slug: 'sparrenlaengen-rechner',
    name: 'Sparrenlängen-Rechner',
    description: 'Berechnung von Sparrenlängen, Dachneigungen und Überständen für Zimmerleute',
    category: 'Dach',
    accessLevel: 'free',
    htmlFile: 'sparrenlaengen-rechner.html',
    icon: 'Ruler',
    useNativeComponent: true,
  },
  {
    slug: 'holz-tools',
    name: 'Holz-Tools',
    description: 'Festmeter-Rechner Pro und Balken-Stamm Pro für präzise Holzvolumenberechnungen',
    category: 'Holz',
    accessLevel: 'free',
    htmlFile: 'holz-tools.html',
    icon: 'TreePine',
    useNativeComponent: true,
  },
  {
    slug: 'kegelstumpf',
    name: 'Kegelstumpf Abwicklung',
    description: 'Präzise Zuschnittberechnungen für Kegelstümpfe in der Blechverarbeitung',
    category: 'Geometrie',
    accessLevel: 'registered',
    htmlFile: 'kegelstumpf.html',
    icon: 'Cone',
    useNativeComponent: true,
  },
  {
    slug: 'holz-schindel',
    name: 'Holz-Schindel Bedarf',
    description: 'Materialbedarfsberechnung für Holzschindeln nach DIN 68119',
    category: 'Dach',
    accessLevel: 'registered',
    htmlFile: 'holz-schindel.html',
    icon: 'LayoutGrid',
    useNativeComponent: true,
  },
  {
    slug: 'verschnittoptimierung',
    name: 'Verschnittoptimierung',
    description: 'Optimierte Zuschnittpläne zur Minimierung von Materialverschnitt',
    category: 'Planung',
    accessLevel: 'registered',
    htmlFile: 'verschnittoptimierung.html',
    icon: 'Scissors',
  },
  {
    slug: 'restauromap',
    name: 'RestauroMap',
    description: 'Professionelle Kartierung und Dokumentation für Restaurierungsprojekte',
    category: 'Dokumentation',
    accessLevel: 'premium',
    htmlFile: 'restauromap.html',
    icon: 'Map',
  },
  {
    slug: 'laser-entfernungsmesser',
    name: 'Laser-Entfernungsmesser',
    description: 'Flächen- und Volumenberechnung aus Laser-Messungen',
    category: 'Vermessung',
    accessLevel: 'premium',
    htmlFile: 'laser-entfernungsmesser.html',
    icon: 'Scan',
  },
];

export const CATEGORIES = [...new Set(TOOLS.map(t => t.category))];

export function getToolBySlug(slug: string): Tool | undefined {
  return TOOLS.find(t => t.slug === slug);
}

export function getToolsByAccessLevel(level: AccessLevel): Tool[] {
  return TOOLS.filter(t => t.accessLevel === level);
}

export function getToolsByCategory(category: string): Tool[] {
  return TOOLS.filter(t => t.category === category);
}

export function getFreeTools(): Tool[] {
  return TOOLS.filter(t => t.accessLevel === 'free');
}

export function getPremiumTools(): Tool[] {
  return TOOLS.filter(t => t.accessLevel === 'premium' || t.accessLevel === 'registered');
}
