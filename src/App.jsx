import React, { useState, useCallback, useMemo, createContext, useContext } from 'react';

// Theme Context
const ThemeContext = createContext();

const themes = {
  dark: {
    name: 'dark',
    bg: '#030712',
    bgSecondary: 'rgba(15, 23, 42, 0.6)',
    bgTertiary: 'rgba(0, 0, 0, 0.3)',
    bgHover: 'rgba(30, 41, 59, 0.8)',
    border: 'rgba(148, 163, 184, 0.08)',
    borderLight: 'rgba(148, 163, 184, 0.15)',
    text: '#e2e8f0',
    textSecondary: '#94a3b8',
    textMuted: '#64748b',
    textDim: '#475569',
    accent: '#6366f1',
    accentLight: 'rgba(99, 102, 241, 0.15)',
    success: '#22c55e',
    successLight: 'rgba(34, 197, 94, 0.1)',
    error: '#ef4444',
    errorLight: 'rgba(239, 68, 68, 0.1)',
    warning: '#f59e0b',
    warningLight: 'rgba(245, 158, 11, 0.1)',
    string: '#86efac',
    number: '#fde047',
    boolean: '#c4b5fd',
    null: '#94a3b8',
    key: '#7dd3fc',
    bracket: '#f0abfc',
  },
  light: {
    name: 'light',
    bg: '#f8fafc',
    bgSecondary: '#ffffff',
    bgTertiary: '#f1f5f9',
    bgHover: '#e2e8f0',
    border: 'rgba(51, 65, 85, 0.1)',
    borderLight: 'rgba(51, 65, 85, 0.2)',
    text: '#0f172a',
    textSecondary: '#334155',
    textMuted: '#64748b',
    textDim: '#94a3b8',
    accent: '#4f46e5',
    accentLight: 'rgba(79, 70, 229, 0.1)',
    success: '#16a34a',
    successLight: 'rgba(22, 163, 74, 0.1)',
    error: '#dc2626',
    errorLight: 'rgba(220, 38, 38, 0.1)',
    warning: '#d97706',
    warningLight: 'rgba(217, 119, 6, 0.1)',
    string: '#16a34a',
    number: '#ca8a04',
    boolean: '#7c3aed',
    null: '#64748b',
    key: '#0369a1',
    bracket: '#be185d',
  }
};

const sampleLeft = `{
  api: "v2.1",
  user: {
    id: 12345,
    name: "John Doe",
    email: "john@example.com",
    roles: ["admin", "editor"],
    settings: {
      theme: "dark",
      notifications: true,
      preferences: { language: "en", timezone: "UTC" }
    }
  },
  items: [
    { id: 1, name: "Item A", price: 29.99 },
    { id: 2, name: "Item B", price: 49.99 }
  ],
  meta: { timestamp: "2024-01-15T10:30:00Z", version: 1 }
}`;

const sampleRight = `{
  api: "v2.2",
  user: {
    id: 12345,
    name: "John Smith",
    email: "johnsmith@example.com",
    roles: ["admin", "editor", "viewer"],
    settings: {
      theme: "light",
      notifications: true,
      preferences: { language: "es", timezone: "PST", currency: "USD" }
    },
    lastLogin: "2024-01-20"
  },
  items: [
    { id: 1, name: "Item A", price: 34.99 },
    { id: 3, name: "Item C", price: 19.99 }
  ],
  meta: { timestamp: "2024-01-15T11:45:00Z", version: 2 },
  newFeature: { enabled: true }
}`;

const sampleVisualizer = `{
  "company": "TechCorp",
  "founded": 2015,
  "active": true,
  "headquarters": {
    "city": "San Francisco",
    "country": "USA",
    "coordinates": { "lat": 37.7749, "lng": -122.4194 }
  },
  "departments": [
    { "name": "Engineering", "headcount": 150, "teams": ["Frontend", "Backend", "DevOps"] },
    { "name": "Marketing", "headcount": 45, "teams": ["Content", "Growth", "Brand"] },
    { "name": "Sales", "headcount": 80, "teams": ["Enterprise", "SMB"] }
  ],
  "products": [
    { "id": "prod-001", "name": "CloudSync", "price": 99.99, "featured": true },
    { "id": "prod-002", "name": "DataVault", "price": 149.99, "featured": false }
  ],
  "metadata": {
    "lastUpdated": "2024-01-15T10:30:00Z",
    "version": "2.1.0",
    "tags": ["enterprise", "cloud", "saas"]
  }
}`;

const parseLooseJson = (str) => {
  if (!str.trim()) return { valid: true, data: null, error: null, line: null };
  try {
    return { valid: true, data: JSON.parse(str), error: null, line: null };
  } catch (e) {
    try {
      let fixed = str
        .replace(/([{,]\s*)([a-zA-Z_$][a-zA-Z0-9_$]*)\s*:/g, '$1"$2":')
        .replace(/:\s*'([^']*)'/g, ': "$1"')
        .replace(/,\s*([}\]])/g, '$1');
      return { valid: true, data: JSON.parse(fixed), error: null, line: null, wasFixed: true };
    } catch (e2) {
      const lineMatch = e.message.match(/position (\d+)/);
      let line = null;
      if (lineMatch) {
        const pos = parseInt(lineMatch[1]);
        line = str.substring(0, pos).split('\n').length;
      }
      return { valid: false, data: null, error: e.message, line };
    }
  }
};

const countJsonStats = (data, stats = { objects: 0, arrays: 0, strings: 0, numbers: 0, booleans: 0, nulls: 0, totalKeys: 0, maxDepth: 0 }, depth = 0) => {
  stats.maxDepth = Math.max(stats.maxDepth, depth);
  if (data === null) stats.nulls++;
  else if (Array.isArray(data)) { stats.arrays++; data.forEach(item => countJsonStats(item, stats, depth + 1)); }
  else if (typeof data === 'object') { stats.objects++; const keys = Object.keys(data); stats.totalKeys += keys.length; keys.forEach(key => countJsonStats(data[key], stats, depth + 1)); }
  else if (typeof data === 'string') stats.strings++;
  else if (typeof data === 'number') stats.numbers++;
  else if (typeof data === 'boolean') stats.booleans++;
  return stats;
};

export default function JsonToolkit() {
  const [theme, setTheme] = useState('dark');
  const [leftJson, setLeftJson] = useState('');
  const [rightJson, setRightJson] = useState('');
  const [visualizerJson, setVisualizerJson] = useState('');
  const [activeTab, setActiveTab] = useState('diff');
  const [expandedNodes, setExpandedNodes] = useState(new Set(['$']));
  const [searchTerm, setSearchTerm] = useState('');
  const [showOnlyDiffs, setShowOnlyDiffs] = useState(false);
  const [copied, setCopied] = useState(null);
  const [vizExpandedNodes, setVizExpandedNodes] = useState(new Set(['$']));
  const [vizSearchTerm, setVizSearchTerm] = useState('');
  const [vizHoveredPath, setVizHoveredPath] = useState(null);

  const t = themes[theme];
  const leftParsed = useMemo(() => parseLooseJson(leftJson), [leftJson]);
  const rightParsed = useMemo(() => parseLooseJson(rightJson), [rightJson]);
  const vizParsed = useMemo(() => parseLooseJson(visualizerJson), [visualizerJson]);
  const vizStats = useMemo(() => vizParsed.valid && vizParsed.data ? countJsonStats(vizParsed.data) : null, [vizParsed]);

  const getType = (val) => { if (val === null) return 'null'; if (Array.isArray(val)) return 'array'; return typeof val; };

  const buildDiffTree = useCallback((left, right, path = '$', key = 'root') => {
    const leftType = getType(left);
    const rightType = getType(right);
    const node = { key, path, leftType, rightType, leftValue: left, rightValue: right, children: [], status: 'unchanged' };

    if (left === undefined && right !== undefined) {
      node.status = 'added';
      if (rightType === 'object' || rightType === 'array') {
        const entries = rightType === 'array' ? right.map((v, i) => [i, v]) : Object.entries(right);
        entries.forEach(([k, v]) => node.children.push(buildDiffTree(undefined, v, `${path}.${k}`, k)));
      }
      return node;
    }
    if (left !== undefined && right === undefined) {
      node.status = 'removed';
      if (leftType === 'object' || leftType === 'array') {
        const entries = leftType === 'array' ? left.map((v, i) => [i, v]) : Object.entries(left);
        entries.forEach(([k, v]) => node.children.push(buildDiffTree(v, undefined, `${path}.${k}`, k)));
      }
      return node;
    }
    if (leftType !== rightType) { node.status = 'type_changed'; return node; }
    if (leftType === 'object' && left !== null) {
      const allKeys = [...new Set([...Object.keys(left || {}), ...Object.keys(right || {})])];
      allKeys.sort().forEach(k => {
        const child = buildDiffTree(left[k], right[k], `${path}.${k}`, k);
        node.children.push(child);
        if (child.status !== 'unchanged') node.status = 'modified';
      });
    } else if (leftType === 'array') {
      const maxLen = Math.max(left.length, right.length);
      for (let i = 0; i < maxLen; i++) {
        const child = buildDiffTree(left[i], right[i], `${path}[${i}]`, i);
        node.children.push(child);
        if (child.status !== 'unchanged') node.status = 'modified';
      }
    } else if (left !== right) node.status = 'modified';
    return node;
  }, []);

  const diffTree = useMemo(() => {
    if (!leftParsed.valid || !rightParsed.valid) return null;
    if (leftParsed.data === null && rightParsed.data === null) return null;
    return buildDiffTree(leftParsed.data, rightParsed.data);
  }, [leftParsed, rightParsed, buildDiffTree]);

  const countDiffs = useCallback((node) => {
    if (!node) return { added: 0, removed: 0, modified: 0, type_changed: 0 };
    let counts = { added: 0, removed: 0, modified: 0, type_changed: 0 };
    if (node.status === 'added' && node.children.length === 0) counts.added++;
    else if (node.status === 'removed' && node.children.length === 0) counts.removed++;
    else if (node.status === 'modified' && node.children.length === 0) counts.modified++;
    else if (node.status === 'type_changed') counts.type_changed++;
    node.children.forEach(child => {
      const cc = countDiffs(child);
      counts.added += cc.added; counts.removed += cc.removed; counts.modified += cc.modified; counts.type_changed += cc.type_changed;
    });
    return counts;
  }, []);

  const stats = useMemo(() => countDiffs(diffTree), [diffTree, countDiffs]);

  const toggleNode = (path) => setExpandedNodes(prev => { const next = new Set(prev); if (next.has(path)) next.delete(path); else next.add(path); return next; });
  const expandAll = () => { const paths = new Set(); const traverse = (node) => { if (!node) return; paths.add(node.path); node.children.forEach(traverse); }; traverse(diffTree); setExpandedNodes(paths); };
  const collapseAll = () => setExpandedNodes(new Set(['$']));
  const expandDiffs = () => { const paths = new Set(['$']); const traverse = (node) => { if (!node) return; if (node.status !== 'unchanged') { let p = node.path; while (p) { paths.add(p); p = p.includes('.') ? p.substring(0, p.lastIndexOf('.')) : (p === '$' ? null : '$'); } } node.children.forEach(traverse); }; traverse(diffTree); setExpandedNodes(paths); };

  const formatJson = (side) => {
    if (side === 'viz') { if (vizParsed.valid && vizParsed.data !== null) setVisualizerJson(JSON.stringify(vizParsed.data, null, 2)); return; }
    const parsed = side === 'left' ? leftParsed : rightParsed;
    const setter = side === 'left' ? setLeftJson : setRightJson;
    if (parsed.valid && parsed.data !== null) setter(JSON.stringify(parsed.data, null, 2));
  };

  const minifyJson = (side) => {
    if (side === 'viz') { if (vizParsed.valid && vizParsed.data !== null) setVisualizerJson(JSON.stringify(vizParsed.data)); return; }
    const parsed = side === 'left' ? leftParsed : rightParsed;
    const setter = side === 'left' ? setLeftJson : setRightJson;
    if (parsed.valid && parsed.data !== null) setter(JSON.stringify(parsed.data));
  };

  const sortKeys = (side) => {
    const sortObj = (obj) => { if (Array.isArray(obj)) return obj.map(sortObj); if (obj && typeof obj === 'object') return Object.keys(obj).sort().reduce((acc, key) => { acc[key] = sortObj(obj[key]); return acc; }, {}); return obj; };
    if (side === 'viz') { if (vizParsed.valid && vizParsed.data !== null) setVisualizerJson(JSON.stringify(sortObj(vizParsed.data), null, 2)); return; }
    const parsed = side === 'left' ? leftParsed : rightParsed;
    const setter = side === 'left' ? setLeftJson : setRightJson;
    if (parsed.valid && parsed.data !== null) setter(JSON.stringify(sortObj(parsed.data), null, 2));
  };

  const copyToClipboard = (text, id) => { navigator.clipboard.writeText(text); setCopied(id); setTimeout(() => setCopied(null), 2000); };

  const loadSample = () => { if (activeTab === 'visualizer' || activeTab === 'validate') setVisualizerJson(sampleVisualizer); else { setLeftJson(sampleLeft); setRightJson(sampleRight); } };
  const clearAll = () => { if (activeTab === 'visualizer' || activeTab === 'validate') setVisualizerJson(''); else { setLeftJson(''); setRightJson(''); } };
  const swapPanels = () => { const temp = leftJson; setLeftJson(rightJson); setRightJson(temp); };

  const toggleVizNode = (path) => setVizExpandedNodes(prev => { const next = new Set(prev); if (next.has(path)) next.delete(path); else next.add(path); return next; });
  const expandAllViz = () => { const paths = new Set(); const traverse = (data, path = '$') => { paths.add(path); if (Array.isArray(data)) data.forEach((item, i) => traverse(item, `${path}[${i}]`)); else if (data && typeof data === 'object') Object.keys(data).forEach(key => traverse(data[key], `${path}.${key}`)); }; if (vizParsed.data) traverse(vizParsed.data); setVizExpandedNodes(paths); };
  const collapseAllViz = () => setVizExpandedNodes(new Set(['$']));
  const expandToLevel = (level) => { const paths = new Set(); const traverse = (data, path = '$', currentLevel = 0) => { if (currentLevel <= level) paths.add(path); if (currentLevel >= level) return; if (Array.isArray(data)) data.forEach((item, i) => traverse(item, `${path}[${i}]`, currentLevel + 1)); else if (data && typeof data === 'object') Object.keys(data).forEach(key => traverse(data[key], `${path}.${key}`, currentLevel + 1)); }; if (vizParsed.data) traverse(vizParsed.data); setVizExpandedNodes(paths); };

  const statusConfig = {
    added: { bg: t.name === 'dark' ? '#052e16' : '#dcfce7', border: '#16a34a', color: t.name === 'dark' ? '#4ade80' : '#16a34a' },
    removed: { bg: t.name === 'dark' ? '#450a0a' : '#fee2e2', border: '#dc2626', color: t.name === 'dark' ? '#f87171' : '#dc2626' },
    modified: { bg: t.name === 'dark' ? '#422006' : '#fef3c7', border: '#d97706', color: t.name === 'dark' ? '#fbbf24' : '#d97706' },
    type_changed: { bg: t.name === 'dark' ? '#3b0764' : '#f3e8ff', border: '#9333ea', color: t.name === 'dark' ? '#c084fc' : '#9333ea' },
    unchanged: { bg: 'transparent', border: 'transparent', color: t.textMuted }
  };

  const formatValue = (val, type) => {
    if (val === undefined) return <span style={{ color: t.textDim }}>—</span>;
    if (val === null) return <span style={{ color: t.null, fontStyle: 'italic' }}>null</span>;
    if (type === 'string') return <span style={{ color: t.string }}>"{val.length > 35 ? val.slice(0, 35) + '...' : val}"</span>;
    if (type === 'number') return <span style={{ color: t.number }}>{val}</span>;
    if (type === 'boolean') return <span style={{ color: t.boolean }}>{String(val)}</span>;
    if (type === 'array') return <span style={{ color: t.bracket }}>[{val.length}]</span>;
    if (type === 'object') return <span style={{ color: t.bracket }}>{`{${Object.keys(val).length}}`}</span>;
    return String(val);
  };

  const TreeNode = ({ node, depth = 0 }) => {
    if (!node) return null;
    const isExpanded = expandedNodes.has(node.path);
    const hasChildren = node.children.length > 0;
    const config = statusConfig[node.status];
    const isLeaf = !hasChildren || (node.status === 'type_changed');

    if (searchTerm && !node.path.toLowerCase().includes(searchTerm.toLowerCase())) {
      const hasMatchingChild = node.children.some(c => c.path.toLowerCase().includes(searchTerm.toLowerCase()) || JSON.stringify(c.leftValue).toLowerCase().includes(searchTerm.toLowerCase()) || JSON.stringify(c.rightValue).toLowerCase().includes(searchTerm.toLowerCase()));
      if (!hasMatchingChild) return null;
    }
    if (showOnlyDiffs && node.status === 'unchanged' && !node.children.some(c => c.status !== 'unchanged')) return null;

    return (
      <div style={{ marginLeft: depth > 0 ? 18 : 0 }}>
        <div onClick={() => hasChildren && toggleNode(node.path)} style={{ display: 'flex', alignItems: 'stretch', padding: '5px 0', cursor: hasChildren ? 'pointer' : 'default', borderLeft: `3px solid ${config.border}`, marginBottom: 2, background: node.status !== 'unchanged' ? config.bg : 'transparent', borderRadius: '0 6px 6px 0', transition: 'background 0.15s' }}>
          <div style={{ width: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            {hasChildren && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={t.textMuted} strokeWidth="2" style={{ transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.15s' }}><path d="M9 18l6-6-6-6" /></svg>}
          </div>
          <div style={{ minWidth: 100, maxWidth: 180, paddingRight: 10, display: 'flex', alignItems: 'center' }}>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: node.status !== 'unchanged' ? t.text : t.textSecondary, fontWeight: node.status !== 'unchanged' ? 600 : 400 }}>{node.key}</span>
            {node.status !== 'unchanged' && <span style={{ marginLeft: 6, padding: '1px 5px', borderRadius: 3, fontSize: 8, fontWeight: 700, background: config.bg, color: config.color, border: `1px solid ${config.border}`, textTransform: 'uppercase', letterSpacing: '0.3px' }}>{node.status === 'added' ? '+' : node.status === 'removed' ? '−' : node.status === 'modified' ? '~' : '⇄'}</span>}
          </div>
          {isLeaf && (
            <div style={{ display: 'flex', flex: 1, gap: 12, alignItems: 'center', paddingRight: 10 }}>
              <div style={{ flex: 1, padding: '3px 8px', borderRadius: 4, fontFamily: "'JetBrains Mono', monospace", fontSize: 10, background: (node.status === 'removed' || node.status === 'modified' || node.status === 'type_changed') ? t.errorLight : t.bgTertiary, border: (node.status === 'removed' || node.status === 'modified' || node.status === 'type_changed') ? `1px solid ${t.error}20` : '1px solid transparent', minHeight: 24, display: 'flex', alignItems: 'center' }}>
                {formatValue(node.leftValue, node.leftType)}
              </div>
              <div style={{ color: t.textDim, fontSize: 12 }}>→</div>
              <div style={{ flex: 1, padding: '3px 8px', borderRadius: 4, fontFamily: "'JetBrains Mono', monospace", fontSize: 10, background: (node.status === 'added' || node.status === 'modified' || node.status === 'type_changed') ? t.successLight : t.bgTertiary, border: (node.status === 'added' || node.status === 'modified' || node.status === 'type_changed') ? `1px solid ${t.success}20` : '1px solid transparent', minHeight: 24, display: 'flex', alignItems: 'center' }}>
                {formatValue(node.rightValue, node.rightType)}
              </div>
            </div>
          )}
          {!isLeaf && <div style={{ flex: 1, display: 'flex', alignItems: 'center', color: t.textMuted, fontSize: 10, fontFamily: "'JetBrains Mono', monospace" }}>{node.leftType === 'array' ? `Array[${node.leftValue?.length || 0}]` : `Object{${Object.keys(node.leftValue || {}).length}}`}{node.status === 'modified' && <span style={{ marginLeft: 6, color: t.warning, fontSize: 9 }}>• changes</span>}</div>}
        </div>
        {hasChildren && isExpanded && <div style={{ borderLeft: `1px solid ${t.border}`, marginLeft: 10 }}>{node.children.map(child => <TreeNode key={child.path} node={child} depth={depth + 1} />)}</div>}
      </div>
    );
  };

  const VisualizerNode = ({ data, path = '$', keyName = 'root', depth = 0 }) => {
    const type = getType(data);
    const isExpanded = vizExpandedNodes.has(path);
    const isHovered = vizHoveredPath === path;
    const hasChildren = (type === 'object' && data !== null && Object.keys(data).length > 0) || (type === 'array' && data.length > 0);

    if (vizSearchTerm) {
      const searchLower = vizSearchTerm.toLowerCase();
      const matchesKey = String(keyName).toLowerCase().includes(searchLower);
      const matchesValue = type !== 'object' && type !== 'array' && String(data).toLowerCase().includes(searchLower);
      const matchesPath = path.toLowerCase().includes(searchLower);
      if (!matchesKey && !matchesValue && !matchesPath) {
        if (hasChildren) {
          let hasMatchingChild = false;
          if (type === 'array') hasMatchingChild = data.some((item, i) => { const childPath = `${path}[${i}]`; return childPath.toLowerCase().includes(searchLower) || JSON.stringify(item).toLowerCase().includes(searchLower); });
          else if (type === 'object') hasMatchingChild = Object.entries(data).some(([k, v]) => { const childPath = `${path}.${k}`; return k.toLowerCase().includes(searchLower) || childPath.toLowerCase().includes(searchLower) || JSON.stringify(v).toLowerCase().includes(searchLower); });
          if (!hasMatchingChild) return null;
        } else return null;
      }
    }

    const renderValue = () => {
      if (type === 'null') return <span style={{ color: t.null, fontStyle: 'italic' }}>null</span>;
      if (type === 'string') return <span style={{ color: t.string }}>"{data.length > 50 ? data.slice(0, 50) + '...' : data}"</span>;
      if (type === 'number') return <span style={{ color: t.number }}>{data}</span>;
      if (type === 'boolean') return <span style={{ color: t.boolean }}>{String(data)}</span>;
      if (type === 'array') return <span style={{ color: t.bracket }}>[</span>;
      if (type === 'object') return <span style={{ color: t.bracket }}>{'{'}</span>;
      return null;
    };

    const getChildCount = () => { if (type === 'array') return data.length; if (type === 'object' && data !== null) return Object.keys(data).length; return 0; };

    return (
      <div style={{ marginLeft: depth > 0 ? 16 : 0 }}>
        <div onClick={() => hasChildren && toggleVizNode(path)} onMouseEnter={() => setVizHoveredPath(path)} onMouseLeave={() => setVizHoveredPath(null)} style={{ display: 'flex', alignItems: 'center', padding: '4px 8px', marginBottom: 1, borderRadius: 6, cursor: hasChildren ? 'pointer' : 'default', background: isHovered ? t.bgHover : 'transparent', transition: 'all 0.1s' }}>
          <div style={{ width: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            {hasChildren && <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke={t.textMuted} strokeWidth="2.5" style={{ transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.15s' }}><path d="M9 18l6-6-6-6" /></svg>}
          </div>
          {depth > 0 && <span style={{ color: t.key, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, fontWeight: 500 }}>"{keyName}"</span>}
          {depth > 0 && <span style={{ color: t.textMuted, margin: '0 5px' }}>:</span>}
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11 }}>{renderValue()}</span>
          {hasChildren && !isExpanded && <span style={{ color: t.textDim, fontSize: 10, marginLeft: 4 }}>{type === 'array' ? `${getChildCount()} items` : `${getChildCount()} keys`}<span style={{ color: t.bracket, marginLeft: 3 }}>{type === 'array' ? ']' : '}'}</span></span>}
          {isHovered && (
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 3 }}>
              <button onClick={(e) => { e.stopPropagation(); copyToClipboard(JSON.stringify(data, null, 2), path); }} style={{ padding: '2px 5px', background: t.bgTertiary, border: 'none', borderRadius: 3, color: copied === path ? t.success : t.textMuted, cursor: 'pointer', fontSize: 9, fontWeight: 500 }}>{copied === path ? '✓' : 'Copy'}</button>
              <button onClick={(e) => { e.stopPropagation(); copyToClipboard(path, `path-${path}`); }} style={{ padding: '2px 5px', background: t.bgTertiary, border: 'none', borderRadius: 3, color: copied === `path-${path}` ? t.success : t.textMuted, cursor: 'pointer', fontSize: 9, fontWeight: 500 }}>{copied === `path-${path}` ? '✓' : 'Path'}</button>
            </div>
          )}
        </div>
        {hasChildren && isExpanded && (
          <div style={{ borderLeft: `1px dashed ${t.border}`, marginLeft: 9, paddingLeft: 4 }}>
            {type === 'array' ? data.map((item, i) => <VisualizerNode key={`${path}[${i}]`} data={item} path={`${path}[${i}]`} keyName={i} depth={depth + 1} />) : Object.entries(data).map(([key, value]) => <VisualizerNode key={`${path}.${key}`} data={value} path={`${path}.${key}`} keyName={key} depth={depth + 1} />)}
            <div style={{ padding: '2px 8px', marginLeft: 18 }}><span style={{ color: t.bracket, fontFamily: "'JetBrains Mono', monospace", fontSize: 11 }}>{type === 'array' ? ']' : '}'}</span></div>
          </div>
        )}
      </div>
    );
  };

  const InputPanel = ({ side, label, color, value, setter, parsed, height = 200 }) => (
    <div style={{ background: t.bgSecondary, borderRadius: 12, border: `1px solid ${!parsed.valid && value ? t.error + '60' : t.border}`, overflow: 'hidden' }}>
      <div style={{ padding: '10px 14px', background: t.bgTertiary, borderBottom: `1px solid ${t.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: color, boxShadow: `0 0 8px ${color}` }} />
          <span style={{ fontSize: 12, fontWeight: 600, color: t.text }}>{label}</span>
          {parsed.valid && value && <span style={{ fontSize: 10, color: t.success, background: t.successLight, padding: '2px 6px', borderRadius: 4 }}>✓ Valid</span>}
          {parsed.wasFixed && <span style={{ fontSize: 10, color: t.warning, background: t.warningLight, padding: '2px 6px', borderRadius: 4 }}>Auto-fixed</span>}
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          <button onClick={() => formatJson(side)} style={{ padding: '4px 8px', background: t.bgHover, border: 'none', borderRadius: 4, color: t.textSecondary, cursor: 'pointer', fontSize: 10, fontWeight: 500 }}>Format</button>
          <button onClick={() => minifyJson(side)} style={{ padding: '4px 8px', background: t.bgHover, border: 'none', borderRadius: 4, color: t.textSecondary, cursor: 'pointer', fontSize: 10, fontWeight: 500 }}>Minify</button>
          <button onClick={() => sortKeys(side)} style={{ padding: '4px 8px', background: t.bgHover, border: 'none', borderRadius: 4, color: t.textSecondary, cursor: 'pointer', fontSize: 10, fontWeight: 500 }}>Sort</button>
          <button onClick={() => copyToClipboard(parsed.valid ? JSON.stringify(parsed.data, null, 2) : value, side)} style={{ padding: '4px 8px', background: t.bgHover, border: 'none', borderRadius: 4, color: copied === side ? t.success : t.textSecondary, cursor: 'pointer', fontSize: 10, fontWeight: 500 }}>{copied === side ? '✓' : 'Copy'}</button>
        </div>
      </div>
      <textarea value={value} onChange={e => setter(e.target.value)} placeholder={`Paste JSON here...\n\nSupports:\n• Standard JSON\n• Unquoted keys { name: "value" }\n• Single quotes\n• Trailing commas`} style={{ width: '100%', height, padding: 14, background: 'transparent', border: 'none', color: t.text, fontSize: 12, fontFamily: "'JetBrains Mono', monospace", lineHeight: 1.6, resize: 'none', outline: 'none' }} spellCheck={false} />
      {!parsed.valid && value && <div style={{ padding: '10px 14px', background: t.errorLight, borderTop: `1px solid ${t.error}30`, color: t.error, fontSize: 11, display: 'flex', alignItems: 'center', gap: 8 }}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>{parsed.line && <span style={{ opacity: 0.8 }}>Line {parsed.line}:</span>}{parsed.error}</div>}
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: t.bg, fontFamily: "'Inter', -apple-system, sans-serif", color: t.text, transition: 'background 0.3s, color 0.3s' }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap');*{box-sizing:border-box;}::-webkit-scrollbar{width:8px;height:8px;}::-webkit-scrollbar-track{background:${t.bgTertiary};}::-webkit-scrollbar-thumb{background:${t.textDim};border-radius:4px;}::-webkit-scrollbar-thumb:hover{background:${t.textMuted};}textarea::placeholder,input::placeholder{color:${t.textDim};}`}</style>
      {theme === 'dark' && <div style={{ position: 'fixed', inset: 0, background: 'radial-gradient(ellipse at 20% 0%, rgba(99, 102, 241, 0.08) 0%, transparent 50%), radial-gradient(ellipse at 80% 100%, rgba(16, 185, 129, 0.06) 0%, transparent 50%)', pointerEvents: 'none' }} />}

      <header style={{ position: 'sticky', top: 0, zIndex: 50, padding: '12px 24px', background: theme === 'dark' ? 'rgba(3, 7, 18, 0.9)' : 'rgba(248, 250, 252, 0.95)', backdropFilter: 'blur(16px)', borderBottom: `1px solid ${t.border}` }}>
        <div style={{ maxWidth: 1600, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg, #6366f1 0%, #10b981 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 20px rgba(99, 102, 241, 0.3)' }}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" /></svg></div>
            <div><h1 style={{ margin: 0, fontSize: 16, fontWeight: 700, letterSpacing: '-0.3px', color: t.text }}>JSON Toolkit</h1><p style={{ margin: 0, fontSize: 9, color: t.textMuted, letterSpacing: '0.5px', textTransform: 'uppercase' }}>Diff • Visualize • Validate</p></div>
          </div>
          <div style={{ display: 'flex', gap: 2, background: t.bgTertiary, padding: 3, borderRadius: 8 }}>
            {[{ id: 'diff', label: 'Diff', icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 3H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V8l-5-5z"/><path d="M15 3v6h6"/></svg> }, { id: 'visualizer', label: 'Visualizer', icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M12 1v6m0 6v10M1 12h6m6 0h10"/></svg> }, { id: 'validate', label: 'Validate', icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg> }].map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 12px', background: activeTab === tab.id ? t.accentLight : 'transparent', border: 'none', borderRadius: 6, color: activeTab === tab.id ? t.accent : t.textMuted, cursor: 'pointer', fontSize: 11, fontWeight: 500, transition: 'all 0.15s' }}>{tab.icon}{tab.label}</button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} style={{ width: 34, height: 34, borderRadius: 8, background: t.bgTertiary, border: `1px solid ${t.border}`, color: t.textSecondary, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }} title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}>{theme === 'dark' ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg> : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>}</button>
            <button onClick={loadSample} style={{ padding: '7px 12px', background: t.accentLight, border: `1px solid ${t.accent}30`, borderRadius: 6, color: t.accent, cursor: 'pointer', fontSize: 11, fontWeight: 500 }}>Sample</button>
            {activeTab === 'diff' && <button onClick={swapPanels} style={{ padding: '7px 12px', background: t.successLight, border: `1px solid ${t.success}30`, borderRadius: 6, color: t.success, cursor: 'pointer', fontSize: 11, fontWeight: 500 }}>⇄ Swap</button>}
            <button onClick={clearAll} style={{ padding: '7px 12px', background: t.errorLight, border: `1px solid ${t.error}30`, borderRadius: 6, color: t.error, cursor: 'pointer', fontSize: 11, fontWeight: 500 }}>Clear</button>
          </div>
        </div>
      </header>

      <main style={{ position: 'relative', maxWidth: 1600, margin: '0 auto', padding: '20px 24px' }}>
        {activeTab === 'diff' && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
              <InputPanel side="left" label="Original / Base" color="#f87171" value={leftJson} setter={setLeftJson} parsed={leftParsed} />
              <InputPanel side="right" label="New / Compare" color="#4ade80" value={rightJson} setter={setRightJson} parsed={rightParsed} />
            </div>
            {diffTree && (stats.added + stats.removed + stats.modified + stats.type_changed) > 0 && (
              <div style={{ display: 'flex', gap: 12, padding: '12px 18px', background: `linear-gradient(135deg, ${t.accentLight} 0%, ${t.successLight} 100%)`, borderRadius: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', border: `1px solid ${t.accent}20` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 5 }}><span style={{ fontSize: 26, fontWeight: 800, color: t.accent }}>{stats.added + stats.removed + stats.modified + stats.type_changed}</span><span style={{ color: t.textMuted, fontSize: 12 }}>changes</span></div>
                  <div style={{ height: 22, width: 1, background: t.border }} />
                  <div style={{ display: 'flex', gap: 10 }}>{[{ count: stats.added, color: t.success, label: 'Added' }, { count: stats.removed, color: t.error, label: 'Removed' }, { count: stats.modified, color: t.warning, label: 'Changed' }, { count: stats.type_changed, color: '#c084fc', label: 'Type' }].filter(s => s.count > 0).map(s => <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}><div style={{ width: 7, height: 7, borderRadius: 2, background: s.color }} /><span style={{ color: s.color, fontWeight: 700, fontSize: 13 }}>{s.count}</span><span style={{ color: t.textMuted, fontSize: 10 }}>{s.label}</span></div>)}</div>
                </div>
              </div>
            )}
            {diffTree && (
              <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <button onClick={expandAll} style={{ padding: '5px 10px', background: t.bgSecondary, border: `1px solid ${t.border}`, borderRadius: 5, color: t.textSecondary, cursor: 'pointer', fontSize: 10, fontWeight: 500 }}>Expand All</button>
                  <button onClick={expandDiffs} style={{ padding: '5px 10px', background: t.accentLight, border: `1px solid ${t.accent}30`, borderRadius: 5, color: t.accent, cursor: 'pointer', fontSize: 10, fontWeight: 500 }}>Expand Changes</button>
                  <button onClick={collapseAll} style={{ padding: '5px 10px', background: t.bgSecondary, border: `1px solid ${t.border}`, borderRadius: 5, color: t.textSecondary, cursor: 'pointer', fontSize: 10, fontWeight: 500 }}>Collapse</button>
                  <div style={{ height: 18, width: 1, background: t.border }} />
                  <label style={{ display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer' }}><input type="checkbox" checked={showOnlyDiffs} onChange={e => setShowOnlyDiffs(e.target.checked)} style={{ accentColor: t.accent }} /><span style={{ fontSize: 10, color: t.textSecondary }}>Only changes</span></label>
                </div>
                <div style={{ position: 'relative' }}><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={t.textMuted} strokeWidth="2" style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)' }}><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg><input type="text" placeholder="Search..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} style={{ padding: '5px 10px 5px 28px', background: t.bgSecondary, border: `1px solid ${t.border}`, borderRadius: 5, color: t.text, fontSize: 10, width: 150, outline: 'none' }} /></div>
              </div>
            )}
            <div style={{ background: t.bgSecondary, borderRadius: 10, border: `1px solid ${t.border}`, overflow: 'hidden' }}>
              <div style={{ display: 'flex', padding: '9px 12px', background: t.bgTertiary, borderBottom: `1px solid ${t.border}`, fontSize: 9, fontWeight: 600, color: t.textMuted, textTransform: 'uppercase', letterSpacing: '0.5px' }}><div style={{ width: 22 }} /><div style={{ minWidth: 100, maxWidth: 180, paddingRight: 10 }}>Key</div><div style={{ flex: 1, display: 'flex', gap: 12 }}><div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 5 }}><div style={{ width: 5, height: 5, borderRadius: 2, background: t.error }} />Left</div><div style={{ width: 20 }} /><div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 5 }}><div style={{ width: 5, height: 5, borderRadius: 2, background: t.success }} />Right</div></div></div>
              <div style={{ padding: 10, maxHeight: 450, overflow: 'auto' }}>
                {!leftParsed.data && !rightParsed.data ? (
                  <div style={{ textAlign: 'center', padding: 50, color: t.textMuted }}><div style={{ width: 56, height: 56, borderRadius: 14, background: t.bgTertiary, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={t.textMuted} strokeWidth="1.5"><path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg></div><p style={{ fontSize: 13, fontWeight: 500, marginBottom: 5, color: t.text }}>Ready to Compare</p><p style={{ fontSize: 11, marginBottom: 14 }}>Paste JSON in both panels</p><button onClick={loadSample} style={{ padding: '8px 16px', background: `linear-gradient(135deg, ${t.accent} 0%, #10b981 100%)`, border: 'none', borderRadius: 6, color: 'white', cursor: 'pointer', fontSize: 11, fontWeight: 600 }}>Try Sample</button></div>
                ) : diffTree && (stats.added + stats.removed + stats.modified + stats.type_changed) === 0 ? (
                  <div style={{ textAlign: 'center', padding: 50 }}><div style={{ width: 56, height: 56, borderRadius: '50%', background: t.successLight, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={t.success} strokeWidth="2"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg></div><p style={{ fontSize: 15, fontWeight: 600, color: t.success }}>Identical!</p><p style={{ fontSize: 11, color: t.textMuted }}>Both JSON objects match</p></div>
                ) : diffTree ? <TreeNode node={diffTree} /> : null}
              </div>
            </div>
          </>
        )}

        {activeTab === 'visualizer' && (
          <>
            <div style={{ marginBottom: 18 }}><InputPanel side="viz" label="JSON Input" color={t.accent} value={visualizerJson} setter={setVisualizerJson} parsed={vizParsed} height={160} /></div>
            {vizParsed.valid && vizParsed.data && (
              <>
                {vizStats && <div style={{ display: 'flex', gap: 6, padding: '10px 14px', background: t.bgSecondary, borderRadius: 8, marginBottom: 14, flexWrap: 'wrap', alignItems: 'center', border: `1px solid ${t.border}` }}>{[{ label: 'Objects', value: vizStats.objects, color: t.bracket }, { label: 'Arrays', value: vizStats.arrays, color: '#7dd3fc' }, { label: 'Strings', value: vizStats.strings, color: t.string }, { label: 'Numbers', value: vizStats.numbers, color: t.number }, { label: 'Booleans', value: vizStats.booleans, color: t.boolean }, { label: 'Keys', value: vizStats.totalKeys, color: t.key }, { label: 'Depth', value: vizStats.maxDepth, color: t.accent }].map(stat => <div key={stat.label} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '3px 8px', background: t.bgTertiary, borderRadius: 5 }}><span style={{ color: stat.color, fontWeight: 700, fontSize: 12 }}>{stat.value}</span><span style={{ color: t.textMuted, fontSize: 9, textTransform: 'uppercase' }}>{stat.label}</span></div>)}</div>}
                <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                    <button onClick={expandAllViz} style={{ padding: '5px 10px', background: t.bgSecondary, border: `1px solid ${t.border}`, borderRadius: 5, color: t.textSecondary, cursor: 'pointer', fontSize: 10, fontWeight: 500 }}>Expand All</button>
                    <button onClick={collapseAllViz} style={{ padding: '5px 10px', background: t.bgSecondary, border: `1px solid ${t.border}`, borderRadius: 5, color: t.textSecondary, cursor: 'pointer', fontSize: 10, fontWeight: 500 }}>Collapse</button>
                    <div style={{ height: 18, width: 1, background: t.border }} />
                    <span style={{ fontSize: 10, color: t.textMuted }}>Level:</span>
                    {[1, 2, 3, 4, 5].map(level => <button key={level} onClick={() => expandToLevel(level)} style={{ width: 24, height: 24, padding: 0, background: t.bgSecondary, border: `1px solid ${t.border}`, borderRadius: 5, color: t.textSecondary, cursor: 'pointer', fontSize: 10, fontWeight: 600 }}>{level}</button>)}
                  </div>
                  <div style={{ position: 'relative' }}><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={t.textMuted} strokeWidth="2" style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)' }}><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg><input type="text" placeholder="Search keys, values..." value={vizSearchTerm} onChange={e => setVizSearchTerm(e.target.value)} style={{ padding: '5px 10px 5px 28px', background: t.bgSecondary, border: `1px solid ${t.border}`, borderRadius: 5, color: t.text, fontSize: 10, width: 180, outline: 'none' }} /></div>
                </div>
                <div style={{ background: t.bgSecondary, borderRadius: 10, border: `1px solid ${t.border}`, overflow: 'hidden' }}>
                  <div style={{ padding: '9px 12px', background: t.bgTertiary, borderBottom: `1px solid ${t.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}><span style={{ fontSize: 11, fontWeight: 600, color: t.text }}>JSON Tree</span><div style={{ display: 'flex', gap: 10, fontSize: 9, color: t.textMuted }}><span><span style={{ color: t.key }}>●</span> Key</span><span><span style={{ color: t.string }}>●</span> String</span><span><span style={{ color: t.number }}>●</span> Number</span><span><span style={{ color: t.boolean }}>●</span> Bool</span><span><span style={{ color: t.null }}>●</span> Null</span></div></div>
                  <div style={{ padding: 10, maxHeight: 500, overflow: 'auto' }}><VisualizerNode data={vizParsed.data} /></div>
                </div>
              </>
            )}
            {!vizParsed.data && <div style={{ background: t.bgSecondary, borderRadius: 10, border: `1px solid ${t.border}`, padding: 50, textAlign: 'center' }}><div style={{ width: 56, height: 56, borderRadius: 14, background: t.bgTertiary, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={t.textMuted} strokeWidth="1.5"><circle cx="12" cy="12" r="3"/><path d="M12 1v6m0 6v10M1 12h6m6 0h10"/></svg></div><p style={{ fontSize: 13, fontWeight: 500, marginBottom: 5, color: t.text }}>Visualize JSON</p><p style={{ fontSize: 11, marginBottom: 14, color: t.textMuted }}>Paste JSON to explore interactively</p><button onClick={loadSample} style={{ padding: '8px 16px', background: `linear-gradient(135deg, ${t.accent} 0%, #10b981 100%)`, border: 'none', borderRadius: 6, color: 'white', cursor: 'pointer', fontSize: 11, fontWeight: 600 }}>Load Sample</button></div>}
          </>
        )}

        {activeTab === 'validate' && (
          <div style={{ maxWidth: 700, margin: '0 auto' }}>
            <InputPanel side="viz" label="JSON to Validate" color={t.accent} value={visualizerJson} setter={setVisualizerJson} parsed={vizParsed} height={180} />
            <div style={{ marginTop: 18, background: t.bgSecondary, borderRadius: 10, border: `1px solid ${t.border}`, overflow: 'hidden' }}>
              <div style={{ padding: '10px 14px', background: t.bgTertiary, borderBottom: `1px solid ${t.border}` }}><span style={{ fontSize: 11, fontWeight: 600, color: t.text }}>Validation Result</span></div>
              <div style={{ padding: 20 }}>
                {!visualizerJson.trim() ? (
                  <div style={{ textAlign: 'center', padding: 35, color: t.textMuted }}><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ margin: '0 auto 14px' }}><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg><p style={{ fontSize: 12 }}>Enter JSON above to validate</p></div>
                ) : vizParsed.valid ? (
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ width: 70, height: 70, borderRadius: '50%', background: t.successLight, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px', border: `3px solid ${t.success}` }}><svg width="35" height="35" viewBox="0 0 24 24" fill="none" stroke={t.success} strokeWidth="2.5"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg></div>
                    <h3 style={{ margin: 0, color: t.success, fontSize: 20, fontWeight: 700 }}>Valid JSON!</h3>
                    {vizParsed.wasFixed && <p style={{ margin: '10px 0 0', color: t.warning, fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>Auto-corrected: Added quotes to keys</p>}
                    {vizStats && <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginTop: 22 }}>{[{ label: 'Objects', value: vizStats.objects, icon: '{ }' }, { label: 'Arrays', value: vizStats.arrays, icon: '[ ]' }, { label: 'Keys', value: vizStats.totalKeys, icon: '🔑' }, { label: 'Depth', value: vizStats.maxDepth, icon: '📊' }].map(stat => <div key={stat.label} style={{ padding: 14, background: t.bgTertiary, borderRadius: 8 }}><div style={{ fontSize: 20, marginBottom: 3 }}>{stat.icon}</div><div style={{ fontSize: 24, fontWeight: 700, color: t.text }}>{stat.value}</div><div style={{ fontSize: 10, color: t.textMuted, textTransform: 'uppercase' }}>{stat.label}</div></div>)}</div>}
                    <div style={{ marginTop: 20, padding: 14, background: t.bgTertiary, borderRadius: 8, textAlign: 'left' }}><div style={{ fontSize: 10, color: t.textMuted, textTransform: 'uppercase', marginBottom: 6 }}>Size Info</div><div style={{ display: 'flex', gap: 20, fontSize: 12 }}><div><span style={{ color: t.textMuted }}>Chars:</span> <span style={{ color: t.text, fontWeight: 600 }}>{JSON.stringify(vizParsed.data).length.toLocaleString()}</span></div><div><span style={{ color: t.textMuted }}>Lines:</span> <span style={{ color: t.text, fontWeight: 600 }}>{visualizerJson.split('\n').length}</span></div></div></div>
                  </div>
                ) : (
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: 18, background: t.errorLight, borderRadius: 10, border: `1px solid ${t.error}30`, marginBottom: 18 }}>
                      <div style={{ width: 50, height: 50, borderRadius: '50%', background: `${t.error}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: `2px solid ${t.error}` }}><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={t.error} strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></svg></div>
                      <div><h4 style={{ margin: 0, color: t.error, fontSize: 16, fontWeight: 600 }}>Invalid JSON</h4><p style={{ margin: '4px 0 0', color: theme === 'dark' ? '#fca5a5' : '#b91c1c', fontSize: 12 }}>{vizParsed.error}</p></div>
                    </div>
                    {vizParsed.line && (
                      <div><div style={{ fontSize: 10, color: t.textMuted, textTransform: 'uppercase', marginBottom: 6, fontWeight: 600 }}>Error Location</div>
                        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, background: t.bgTertiary, borderRadius: 6, overflow: 'hidden', border: `1px solid ${t.border}` }}>
                          {visualizerJson.split('\n').slice(Math.max(0, vizParsed.line - 3), vizParsed.line + 2).map((line, idx) => { const lineNum = Math.max(1, vizParsed.line - 2) + idx; const isErrorLine = lineNum === vizParsed.line; return <div key={idx} style={{ display: 'flex', background: isErrorLine ? t.errorLight : 'transparent' }}><span style={{ width: 45, padding: '5px 10px', color: isErrorLine ? t.error : t.textDim, background: t.bgTertiary, textAlign: 'right', borderRight: isErrorLine ? `3px solid ${t.error}` : `3px solid transparent`, fontWeight: isErrorLine ? 700 : 400 }}>{lineNum}</span><span style={{ padding: '5px 10px', color: isErrorLine ? t.error : t.textSecondary, flex: 1, whiteSpace: 'pre' }}>{line || ' '}</span></div>; })}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10, marginTop: 26 }}>
          {[{ icon: '🌳', title: 'Tree Diff', desc: 'Visual hierarchy comparison' }, { icon: '🔍', title: 'Visualizer', desc: 'Interactive JSON explorer' }, { icon: '✅', title: 'Validator', desc: 'Detailed error reporting' }, { icon: '🔧', title: 'Auto-Fix', desc: 'Handles loose JSON syntax' }, { icon: '🌓', title: 'Themes', desc: 'Dark & light modes' }].map((f, i) => <div key={i} style={{ padding: 12, background: t.bgSecondary, borderRadius: 8, border: `1px solid ${t.border}` }}><div style={{ fontSize: 18, marginBottom: 6 }}>{f.icon}</div><h3 style={{ margin: 0, fontSize: 11, fontWeight: 600, marginBottom: 3, color: t.text }}>{f.title}</h3><p style={{ margin: 0, fontSize: 9, color: t.textMuted, lineHeight: 1.4 }}>{f.desc}</p></div>)}
        </div>
      </main>

      <footer style={{ position: 'relative', padding: '14px 24px', borderTop: `1px solid ${t.border}`, marginTop: 28, textAlign: 'center' }}><p style={{ margin: 0, fontSize: 10, color: t.textDim }}>JSON Toolkit • Built for developers</p></footer>
    </div>
  );
}
