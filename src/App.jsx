import React, { useState, useCallback, useMemo } from 'react';

// Simple YAML Parser (handles common cases)
const yamlParse = (str) => {
  const lines = str.split('\n');
  const result = {};
  const stack = [{ indent: -1, obj: result, isArray: false }];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    
    // Skip empty lines and comments
    if (!trimmed || trimmed.startsWith('#')) continue;
    
    // Calculate indent
    const indent = line.search(/\S/);
    
    // Pop stack until we find parent
    while (stack.length > 1 && stack[stack.length - 1].indent >= indent) {
      stack.pop();
    }
    
    const parent = stack[stack.length - 1];
    
    // Array item
    if (trimmed.startsWith('- ')) {
      const content = trimmed.slice(2).trim();
      
      if (!parent.isArray) {
        const arr = [];
        if (parent.currentKey) {
          parent.obj[parent.currentKey] = arr;
        }
        stack.push({ indent, obj: arr, isArray: true });
      }
      
      const currentParent = stack[stack.length - 1];
      
      if (content.includes(': ')) {
        const obj = {};
        const [key, ...valueParts] = content.split(': ');
        const value = valueParts.join(': ');
        obj[key.trim()] = parseValue(value.trim());
        currentParent.obj.push(obj);
        stack.push({ indent: indent + 2, obj, isArray: false });
      } else if (content) {
        currentParent.obj.push(parseValue(content));
      } else {
        const obj = {};
        currentParent.obj.push(obj);
        stack.push({ indent: indent + 2, obj, isArray: false });
      }
      continue;
    }
    
    // Key-value pair
    const colonIndex = trimmed.indexOf(':');
    if (colonIndex > 0) {
      const key = trimmed.slice(0, colonIndex).trim();
      const value = trimmed.slice(colonIndex + 1).trim();
      
      if (value) {
        parent.obj[key] = parseValue(value);
      } else {
        // Nested object or array coming
        parent.obj[key] = {};
        parent.currentKey = key;
        stack.push({ indent, obj: parent.obj, isArray: false, currentKey: key });
      }
    }
  }
  
  return result;
};

const parseValue = (value) => {
  if (value === 'true') return true;
  if (value === 'false') return false;
  if (value === 'null' || value === '~') return null;
  if (value.startsWith('"') && value.endsWith('"')) return value.slice(1, -1);
  if (value.startsWith("'") && value.endsWith("'")) return value.slice(1, -1);
  if (/^-?\d+$/.test(value)) return parseInt(value, 10);
  if (/^-?\d*\.\d+$/.test(value)) return parseFloat(value);
  return value;
};

// Convert to YAML string
const toYamlString = (data, indent = 0) => {
  const spaces = '  '.repeat(indent);
  
  if (data === null) return 'null';
  if (typeof data === 'boolean') return String(data);
  if (typeof data === 'number') return String(data);
  if (typeof data === 'string') {
    if (data.includes('\n') || data.includes(':') || data.includes('#')) {
      return `"${data.replace(/"/g, '\\"')}"`;
    }
    return data;
  }
  
  if (Array.isArray(data)) {
    if (data.length === 0) return '[]';
    return data.map(item => {
      if (typeof item === 'object' && item !== null) {
        const inner = toYamlString(item, indent + 1);
        const firstLine = inner.split('\n')[0];
        const rest = inner.split('\n').slice(1).join('\n');
        return `${spaces}- ${firstLine}${rest ? '\n' + rest : ''}`;
      }
      return `${spaces}- ${toYamlString(item, indent)}`;
    }).join('\n');
  }
  
  if (typeof data === 'object') {
    const entries = Object.entries(data);
    if (entries.length === 0) return '{}';
    return entries.map(([key, value]) => {
      if (typeof value === 'object' && value !== null) {
        const inner = toYamlString(value, indent + 1);
        return `${spaces}${key}:\n${inner}`;
      }
      return `${spaces}${key}: ${toYamlString(value, indent)}`;
    }).join('\n');
  }
  
  return String(data);
};

// Theme definitions
const themes = {
  dark: {
    name: 'dark',
    bg: '#0a0a0f',
    bgSecondary: 'rgba(15, 23, 42, 0.8)',
    bgTertiary: 'rgba(0, 0, 0, 0.4)',
    bgHover: 'rgba(30, 41, 59, 0.8)',
    border: 'rgba(148, 163, 184, 0.1)',
    text: '#e2e8f0',
    textSecondary: '#94a3b8',
    textMuted: '#64748b',
    textDim: '#475569',
    accent: '#6366f1',
    accentLight: 'rgba(99, 102, 241, 0.15)',
    success: '#22c55e',
    successLight: 'rgba(34, 197, 94, 0.12)',
    error: '#ef4444',
    errorLight: 'rgba(239, 68, 68, 0.12)',
    warning: '#f59e0b',
    warningLight: 'rgba(245, 158, 11, 0.12)',
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
    border: 'rgba(51, 65, 85, 0.12)',
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

const sampleJson = {
  left: `{
  "api": "v2.1",
  "user": {
    "id": 12345,
    "name": "John Doe",
    "roles": ["admin", "editor"],
    "settings": {
      "theme": "dark",
      "notifications": true
    }
  },
  "items": [
    { "id": 1, "name": "Item A", "price": 29.99 },
    { "id": 2, "name": "Item B", "price": 49.99 }
  ]
}`,
  right: `{
  "api": "v2.2",
  "user": {
    "id": 12345,
    "name": "John Smith",
    "roles": ["admin", "editor", "viewer"],
    "settings": {
      "theme": "light",
      "notifications": true,
      "language": "es"
    }
  },
  "items": [
    { "id": 1, "name": "Item A", "price": 34.99 },
    { "id": 3, "name": "Item C", "price": 19.99 }
  ]
}`,
  visualizer: `{
  "company": "TechCorp",
  "founded": 2015,
  "active": true,
  "headquarters": {
    "city": "San Francisco",
    "country": "USA"
  },
  "departments": [
    { "name": "Engineering", "headcount": 150 },
    { "name": "Marketing", "headcount": 45 }
  ]
}`,
  yaml: `# Company Configuration
company: TechCorp
founded: 2015
active: true

headquarters:
  city: San Francisco
  country: USA

departments:
  - name: Engineering
    headcount: 150
  - name: Marketing
    headcount: 45

features:
  - analytics
  - reporting
  - exports`,
  jwt: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyLCJleHAiOjE5MTYyMzkwMjIsInJvbGVzIjpbImFkbWluIiwiZWRpdG9yIl0sImVtYWlsIjoiam9obkBleGFtcGxlLmNvbSJ9.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c`
};

// Format detection
const detectFormat = (str) => {
  const trimmed = str.trim();
  if (!trimmed) return 'unknown';
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) return 'json';
  return 'yaml';
};

// Parse JSON with loose syntax support
const parseJson = (str) => {
  if (!str.trim()) return { valid: true, data: null, error: null, line: null, format: 'json' };
  try {
    return { valid: true, data: JSON.parse(str), error: null, line: null, format: 'json' };
  } catch (e) {
    try {
      let fixed = str
        .replace(/([{,]\s*)([a-zA-Z_$][a-zA-Z0-9_$]*)\s*:/g, '$1"$2":')
        .replace(/:\s*'([^']*)'/g, ': "$1"')
        .replace(/,\s*([}\]])/g, '$1');
      return { valid: true, data: JSON.parse(fixed), error: null, line: null, format: 'json', wasFixed: true };
    } catch (e2) {
      const match = e.message.match(/position (\d+)/);
      const line = match ? str.substring(0, parseInt(match[1])).split('\n').length : null;
      return { valid: false, data: null, error: e.message, line, format: 'json' };
    }
  }
};

// Parse YAML
const parseYamlStr = (str) => {
  if (!str.trim()) return { valid: true, data: null, error: null, line: null, format: 'yaml' };
  try {
    const data = yamlParse(str);
    return { valid: true, data, error: null, line: null, format: 'yaml' };
  } catch (e) {
    return { valid: false, data: null, error: e.message, line: null, format: 'yaml' };
  }
};

// Smart parse
const smartParse = (str) => {
  if (!str.trim()) return { valid: true, data: null, error: null, line: null, format: 'unknown' };
  return detectFormat(str) === 'json' ? parseJson(str) : parseYamlStr(str);
};

// JSON stringify helper
const toJson = (data, pretty = true) => JSON.stringify(data, null, pretty ? 2 : 0);

// Stats counter
const countStats = (data, stats = { objects: 0, arrays: 0, strings: 0, numbers: 0, booleans: 0, nulls: 0, totalKeys: 0, maxDepth: 0 }, depth = 0) => {
  stats.maxDepth = Math.max(stats.maxDepth, depth);
  if (data === null) stats.nulls++;
  else if (Array.isArray(data)) { stats.arrays++; data.forEach(item => countStats(item, stats, depth + 1)); }
  else if (typeof data === 'object') { stats.objects++; const keys = Object.keys(data); stats.totalKeys += keys.length; keys.forEach(key => countStats(data[key], stats, depth + 1)); }
  else if (typeof data === 'string') stats.strings++;
  else if (typeof data === 'number') stats.numbers++;
  else if (typeof data === 'boolean') stats.booleans++;
  return stats;
};

// JWT Utilities
const base64UrlDecode = (str) => {
  try {
    let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) base64 += '=';
    return decodeURIComponent(atob(base64).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''));
  } catch (e) {
    return null;
  }
};

const base64UrlEncode = (str) => {
  return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (_, p1) => String.fromCharCode('0x' + p1)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

const decodeJWT = (token) => {
  const parts = token.trim().split('.');
  if (parts.length !== 3) return { valid: false, error: 'Invalid JWT format: must have 3 parts separated by dots' };
  
  const headerStr = base64UrlDecode(parts[0]);
  const payloadStr = base64UrlDecode(parts[1]);
  
  if (!headerStr) return { valid: false, error: 'Failed to decode header (invalid Base64URL)' };
  if (!payloadStr) return { valid: false, error: 'Failed to decode payload (invalid Base64URL)' };
  
  try {
    const header = JSON.parse(headerStr);
    const payload = JSON.parse(payloadStr);
    return { valid: true, header, payload, signature: parts[2], parts };
  } catch (e) {
    return { valid: false, error: 'Invalid JSON in header or payload: ' + e.message };
  }
};

const analyzeJWT = (header, payload) => {
  const analysis = { claims: [], warnings: [], status: 'valid' };
  const now = Math.floor(Date.now() / 1000);
  
  // Check algorithm
  if (header.alg) {
    analysis.claims.push({ key: 'Algorithm', value: header.alg, type: 'header' });
    if (header.alg === 'none') {
      analysis.warnings.push('⚠️ Unsigned token (alg: none) - Not secure for production!');
      analysis.status = 'warning';
    }
  }
  if (header.typ) analysis.claims.push({ key: 'Type', value: header.typ, type: 'header' });
  
  // Standard claims
  if (payload.iss) analysis.claims.push({ key: 'Issuer (iss)', value: payload.iss, type: 'claim' });
  if (payload.sub) analysis.claims.push({ key: 'Subject (sub)', value: payload.sub, type: 'claim' });
  if (payload.aud) analysis.claims.push({ key: 'Audience (aud)', value: Array.isArray(payload.aud) ? payload.aud.join(', ') : payload.aud, type: 'claim' });
  if (payload.jti) analysis.claims.push({ key: 'JWT ID (jti)', value: payload.jti, type: 'claim' });
  
  // Time claims
  if (payload.exp) {
    const expDate = new Date(payload.exp * 1000);
    const isExpired = payload.exp < now;
    analysis.claims.push({ key: 'Expires (exp)', value: expDate.toLocaleString(), timestamp: payload.exp, type: 'time', status: isExpired ? 'expired' : 'valid' });
    if (isExpired) { analysis.warnings.push('🔴 Token has expired!'); analysis.status = 'expired'; }
  }
  if (payload.iat) {
    const iatDate = new Date(payload.iat * 1000);
    analysis.claims.push({ key: 'Issued At (iat)', value: iatDate.toLocaleString(), timestamp: payload.iat, type: 'time' });
  }
  if (payload.nbf) {
    const nbfDate = new Date(payload.nbf * 1000);
    const notYetValid = payload.nbf > now;
    analysis.claims.push({ key: 'Not Before (nbf)', value: nbfDate.toLocaleString(), timestamp: payload.nbf, type: 'time', status: notYetValid ? 'not_yet_valid' : 'valid' });
    if (notYetValid) { analysis.warnings.push('🟡 Token not yet valid!'); if (analysis.status === 'valid') analysis.status = 'not_yet_valid'; }
  }
  
  return analysis;
};

const createJWT = (header, payload) => {
  try {
    const headerB64 = base64UrlEncode(JSON.stringify(header));
    const payloadB64 = base64UrlEncode(JSON.stringify(payload));
    return { valid: true, token: `${headerB64}.${payloadB64}.` };
  } catch (e) {
    return { valid: false, error: e.message };
  }
};

export default function JsonToolkit() {
  const [theme, setTheme] = useState('dark');
  const [leftJson, setLeftJson] = useState('');
  const [rightJson, setRightJson] = useState('');
  const [visualizerJson, setVisualizerJson] = useState('');
  const [converterInput, setConverterInput] = useState('');
  const [converterOutput, setConverterOutput] = useState('');
  const [outputFormat, setOutputFormat] = useState('yaml');
  const [activeTab, setActiveTab] = useState('diff');
  const [expandedNodes, setExpandedNodes] = useState(new Set(['$']));
  const [searchTerm, setSearchTerm] = useState('');
  const [showOnlyDiffs, setShowOnlyDiffs] = useState(false);
  const [copied, setCopied] = useState(null);
  const [vizExpanded, setVizExpanded] = useState(new Set(['$']));
  const [vizSearch, setVizSearch] = useState('');
  const [vizHover, setVizHover] = useState(null);
  const [editingPath, setEditingPath] = useState(null);
  const [editingValue, setEditingValue] = useState('');
  const [editingKeyPath, setEditingKeyPath] = useState(null);
  const [editingKeyValue, setEditingKeyValue] = useState('');
  
  // JWT State
  const [jwtInput, setJwtInput] = useState('');
  const [jwtMode, setJwtMode] = useState('decode');
  const [jwtHeader, setJwtHeader] = useState('{\n  "alg": "HS256",\n  "typ": "JWT"\n}');
  const [jwtPayload, setJwtPayload] = useState('{\n  "sub": "1234567890",\n  "name": "John Doe",\n  "iat": 1516239022\n}');

  const t = themes[theme];
  
  const leftParsed = useMemo(() => smartParse(leftJson), [leftJson]);
  const rightParsed = useMemo(() => smartParse(rightJson), [rightJson]);
  const vizParsed = useMemo(() => smartParse(visualizerJson), [visualizerJson]);
  const convParsed = useMemo(() => smartParse(converterInput), [converterInput]);
  const vizStats = useMemo(() => vizParsed.valid && vizParsed.data ? countStats(vizParsed.data) : null, [vizParsed]);
  
  // JWT parsing
  const jwtDecoded = useMemo(() => jwtInput.trim() ? decodeJWT(jwtInput) : null, [jwtInput]);
  const jwtAnalysis = useMemo(() => jwtDecoded?.valid ? analyzeJWT(jwtDecoded.header, jwtDecoded.payload) : null, [jwtDecoded]);
  const jwtHeaderParsed = useMemo(() => { try { return { valid: true, data: JSON.parse(jwtHeader) }; } catch (e) { return { valid: false, error: e.message }; } }, [jwtHeader]);
  const jwtPayloadParsed = useMemo(() => { try { return { valid: true, data: JSON.parse(jwtPayload) }; } catch (e) { return { valid: false, error: e.message }; } }, [jwtPayload]);
  const jwtEncoded = useMemo(() => {
    if (jwtHeaderParsed.valid && jwtPayloadParsed.valid) return createJWT(jwtHeaderParsed.data, jwtPayloadParsed.data);
    return null;
  }, [jwtHeaderParsed, jwtPayloadParsed]);

  // Auto-convert
  useMemo(() => {
    if (convParsed.valid && convParsed.data !== null) {
      try {
        setConverterOutput(outputFormat === 'yaml' ? toYamlString(convParsed.data) : toJson(convParsed.data));
      } catch { setConverterOutput(''); }
    } else {
      setConverterOutput('');
    }
  }, [convParsed, outputFormat]);

  const getType = (v) => v === null ? 'null' : Array.isArray(v) ? 'array' : typeof v;

  // Build diff tree
  const buildDiff = useCallback((left, right, path = '$', key = 'root') => {
    const lt = getType(left), rt = getType(right);
    const node = { key, path, lt, rt, lv: left, rv: right, children: [], status: 'unchanged' };

    if (left === undefined && right !== undefined) {
      node.status = 'added';
      if (rt === 'object' || rt === 'array') {
        (rt === 'array' ? right.map((v, i) => [i, v]) : Object.entries(right))
          .forEach(([k, v]) => node.children.push(buildDiff(undefined, v, `${path}.${k}`, k)));
      }
      return node;
    }
    if (left !== undefined && right === undefined) {
      node.status = 'removed';
      if (lt === 'object' || lt === 'array') {
        (lt === 'array' ? left.map((v, i) => [i, v]) : Object.entries(left))
          .forEach(([k, v]) => node.children.push(buildDiff(v, undefined, `${path}.${k}`, k)));
      }
      return node;
    }
    if (lt !== rt) { node.status = 'type_changed'; return node; }
    
    if (lt === 'object' && left !== null) {
      [...new Set([...Object.keys(left || {}), ...Object.keys(right || {})])].sort().forEach(k => {
        const child = buildDiff(left[k], right[k], `${path}.${k}`, k);
        node.children.push(child);
        if (child.status !== 'unchanged') node.status = 'modified';
      });
    } else if (lt === 'array') {
      for (let i = 0; i < Math.max(left.length, right.length); i++) {
        const child = buildDiff(left[i], right[i], `${path}[${i}]`, i);
        node.children.push(child);
        if (child.status !== 'unchanged') node.status = 'modified';
      }
    } else if (left !== right) {
      node.status = 'modified';
    }
    return node;
  }, []);

  const diffTree = useMemo(() => {
    if (!leftParsed.valid || !rightParsed.valid || (!leftParsed.data && !rightParsed.data)) return null;
    return buildDiff(leftParsed.data, rightParsed.data);
  }, [leftParsed, rightParsed, buildDiff]);

  const countDiffs = useCallback((node) => {
    if (!node) return { added: 0, removed: 0, modified: 0, type_changed: 0 };
    const c = { added: 0, removed: 0, modified: 0, type_changed: 0 };
    if (!node.children.length) {
      if (node.status === 'added') c.added++;
      else if (node.status === 'removed') c.removed++;
      else if (node.status === 'modified') c.modified++;
      else if (node.status === 'type_changed') c.type_changed++;
    }
    node.children.forEach(ch => {
      const x = countDiffs(ch);
      c.added += x.added; c.removed += x.removed; c.modified += x.modified; c.type_changed += x.type_changed;
    });
    return c;
  }, []);

  const stats = useMemo(() => countDiffs(diffTree), [diffTree, countDiffs]);

  const toggle = (path, setter) => setter(p => { const n = new Set(p); n.has(path) ? n.delete(path) : n.add(path); return n; });
  
  const expandAll = () => {
    const paths = new Set();
    const traverse = n => { if (!n) return; paths.add(n.path); n.children.forEach(traverse); };
    traverse(diffTree);
    setExpandedNodes(paths);
  };

  const expandDiffs = () => {
    const paths = new Set(['$']);
    const traverse = n => {
      if (!n) return;
      if (n.status !== 'unchanged') {
        let p = n.path;
        while (p) { paths.add(p); p = p.includes('.') ? p.substring(0, p.lastIndexOf('.')) : p === '$' ? null : '$'; }
      }
      n.children.forEach(traverse);
    };
    traverse(diffTree);
    setExpandedNodes(paths);
  };

  const expandVizAll = () => {
    const paths = new Set();
    const traverse = (d, p = '$') => {
      paths.add(p);
      if (Array.isArray(d)) d.forEach((x, i) => traverse(x, `${p}[${i}]`));
      else if (d && typeof d === 'object') Object.keys(d).forEach(k => traverse(d[k], `${p}.${k}`));
    };
    if (vizParsed.data) traverse(vizParsed.data);
    setVizExpanded(paths);
  };

  const expandToLevel = (lvl) => {
    const paths = new Set();
    const traverse = (d, p = '$', l = 0) => {
      if (l <= lvl) paths.add(p);
      if (l >= lvl) return;
      if (Array.isArray(d)) d.forEach((x, i) => traverse(x, `${p}[${i}]`, l + 1));
      else if (d && typeof d === 'object') Object.keys(d).forEach(k => traverse(d[k], `${p}.${k}`, l + 1));
    };
    if (vizParsed.data) traverse(vizParsed.data);
    setVizExpanded(paths);
  };

  // Update value at path in visualizer data
  const updateValueAtPath = useCallback((path, newValue) => {
    if (!vizParsed.valid || !vizParsed.data) return;
    
    const data = JSON.parse(JSON.stringify(vizParsed.data)); // Deep clone
    const pathParts = path.replace(/\[(\d+)\]/g, '.$1').split('.').filter(p => p && p !== '$');
    
    if (pathParts.length === 0) {
      // Root level - replace entire data
      setVisualizerJson(vizParsed.format === 'yaml' ? toYamlString(newValue) : toJson(newValue));
      return;
    }
    
    let current = data;
    for (let i = 0; i < pathParts.length - 1; i++) {
      const key = pathParts[i];
      current = Array.isArray(current) ? current[parseInt(key)] : current[key];
    }
    
    const lastKey = pathParts[pathParts.length - 1];
    if (Array.isArray(current)) {
      current[parseInt(lastKey)] = newValue;
    } else {
      current[lastKey] = newValue;
    }
    
    setVisualizerJson(vizParsed.format === 'yaml' ? toYamlString(data) : toJson(data));
  }, [vizParsed]);

  // Update key at path in visualizer data
  const updateKeyAtPath = useCallback((path, oldKey, newKey) => {
    if (!vizParsed.valid || !vizParsed.data || oldKey === newKey) return;
    
    const data = JSON.parse(JSON.stringify(vizParsed.data));
    const pathParts = path.replace(/\[(\d+)\]/g, '.$1').split('.').filter(p => p && p !== '$');
    
    // Navigate to parent
    let parent = data;
    for (let i = 0; i < pathParts.length - 1; i++) {
      const key = pathParts[i];
      parent = Array.isArray(parent) ? parent[parseInt(key)] : parent[key];
    }
    
    // Can't rename array indices
    if (Array.isArray(parent)) return;
    
    // Rename key while preserving order
    const newObj = {};
    for (const k of Object.keys(parent)) {
      if (k === oldKey) {
        newObj[newKey] = parent[k];
      } else {
        newObj[k] = parent[k];
      }
    }
    
    // Replace parent content
    if (pathParts.length === 1) {
      // Direct child of root
      const rootKeys = Object.keys(data);
      const newData = {};
      for (const k of rootKeys) {
        if (k === oldKey) {
          newData[newKey] = data[k];
        } else {
          newData[k] = data[k];
        }
      }
      setVisualizerJson(vizParsed.format === 'yaml' ? toYamlString(newData) : toJson(newData));
    } else {
      // Nested - navigate to grandparent
      let grandparent = data;
      for (let i = 0; i < pathParts.length - 2; i++) {
        const key = pathParts[i];
        grandparent = Array.isArray(grandparent) ? grandparent[parseInt(key)] : grandparent[key];
      }
      const parentKey = pathParts[pathParts.length - 2];
      if (Array.isArray(grandparent)) {
        grandparent[parseInt(parentKey)] = newObj;
      } else {
        grandparent[parentKey] = newObj;
      }
      setVisualizerJson(vizParsed.format === 'yaml' ? toYamlString(data) : toJson(data));
    }
  }, [vizParsed]);

  // Delete node at path
  const deleteAtPath = useCallback((path) => {
    if (!vizParsed.valid || !vizParsed.data) return;
    
    const data = JSON.parse(JSON.stringify(vizParsed.data));
    const pathParts = path.replace(/\[(\d+)\]/g, '.$1').split('.').filter(p => p && p !== '$');
    
    if (pathParts.length === 0) return; // Can't delete root
    
    let parent = data;
    for (let i = 0; i < pathParts.length - 1; i++) {
      const key = pathParts[i];
      parent = Array.isArray(parent) ? parent[parseInt(key)] : parent[key];
    }
    
    const lastKey = pathParts[pathParts.length - 1];
    if (Array.isArray(parent)) {
      parent.splice(parseInt(lastKey), 1);
    } else {
      delete parent[lastKey];
    }
    
    setVisualizerJson(vizParsed.format === 'yaml' ? toYamlString(data) : toJson(data));
  }, [vizParsed]);

  // Add new key-value pair to object or item to array
  const addAtPath = useCallback((path, isArray) => {
    if (!vizParsed.valid || !vizParsed.data) return;
    
    const data = JSON.parse(JSON.stringify(vizParsed.data));
    const pathParts = path.replace(/\[(\d+)\]/g, '.$1').split('.').filter(p => p && p !== '$');
    
    let target = data;
    for (const key of pathParts) {
      target = Array.isArray(target) ? target[parseInt(key)] : target[key];
    }
    
    if (isArray && Array.isArray(target)) {
      target.push(null);
    } else if (!isArray && target && typeof target === 'object' && !Array.isArray(target)) {
      let newKey = 'newKey';
      let i = 1;
      while (target.hasOwnProperty(newKey)) {
        newKey = `newKey${i++}`;
      }
      target[newKey] = null;
    }
    
    setVisualizerJson(vizParsed.format === 'yaml' ? toYamlString(data) : toJson(data));
  }, [vizParsed]);

  // Parse edited value to correct type
  const parseEditedValue = (val) => {
    const trimmed = val.trim();
    if (trimmed === 'null') return null;
    if (trimmed === 'true') return true;
    if (trimmed === 'false') return false;
    if (trimmed === '') return '';
    if (/^-?\d+$/.test(trimmed)) return parseInt(trimmed, 10);
    if (/^-?\d*\.\d+$/.test(trimmed)) return parseFloat(trimmed);
    // Check if it's a quoted string
    if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
      return trimmed.slice(1, -1);
    }
    return val;
  };

  const copy = (text, id) => { navigator.clipboard.writeText(text); setCopied(id); setTimeout(() => setCopied(null), 2000); };

  const loadSample = () => {
    if (activeTab === 'converter') setConverterInput(sampleJson.yaml);
    else if (activeTab === 'visualizer' || activeTab === 'validate') setVisualizerJson(sampleJson.visualizer);
    else if (activeTab === 'jwt') setJwtInput(sampleJson.jwt);
    else { setLeftJson(sampleJson.left); setRightJson(sampleJson.right); }
  };

  const clear = () => {
    if (activeTab === 'converter') { setConverterInput(''); setConverterOutput(''); }
    else if (activeTab === 'visualizer' || activeTab === 'validate') setVisualizerJson('');
    else if (activeTab === 'jwt') { setJwtInput(''); setJwtHeader('{\n  "alg": "HS256",\n  "typ": "JWT"\n}'); setJwtPayload('{\n  "sub": "1234567890",\n  "name": "John Doe",\n  "iat": 1516239022\n}'); }
    else { setLeftJson(''); setRightJson(''); }
  };

  const swap = () => { const tmp = leftJson; setLeftJson(rightJson); setRightJson(tmp); };

  const format = (side) => {
    const map = { left: [leftParsed, setLeftJson], right: [rightParsed, setRightJson], viz: [vizParsed, setVisualizerJson], conv: [convParsed, setConverterInput] };
    const [p, s] = map[side];
    if (p.valid && p.data) s(p.format === 'yaml' ? toYamlString(p.data) : toJson(p.data));
  };

  const minify = (side) => {
    const map = { left: [leftParsed, setLeftJson], right: [rightParsed, setRightJson], viz: [vizParsed, setVisualizerJson], conv: [convParsed, setConverterInput] };
    const [p, s] = map[side];
    if (p.valid && p.data) s(toJson(p.data, false));
  };

  const toJsonFmt = (side) => {
    const map = { left: [leftParsed, setLeftJson], right: [rightParsed, setRightJson], viz: [vizParsed, setVisualizerJson], conv: [convParsed, setConverterInput] };
    const [p, s] = map[side];
    if (p.valid && p.data) s(toJson(p.data));
  };

  const toYamlFmt = (side) => {
    const map = { left: [leftParsed, setLeftJson], right: [rightParsed, setRightJson], viz: [vizParsed, setVisualizerJson], conv: [convParsed, setConverterInput] };
    const [p, s] = map[side];
    if (p.valid && p.data) s(toYamlString(p.data));
  };

  const sortKeys = (side) => {
    const sortObj = o => Array.isArray(o) ? o.map(sortObj) : o && typeof o === 'object' ? Object.keys(o).sort().reduce((a, k) => { a[k] = sortObj(o[k]); return a; }, {}) : o;
    const map = { left: [leftParsed, setLeftJson], right: [rightParsed, setRightJson], viz: [vizParsed, setVisualizerJson], conv: [convParsed, setConverterInput] };
    const [p, s] = map[side];
    if (p.valid && p.data) s(p.format === 'yaml' ? toYamlString(sortObj(p.data)) : toJson(sortObj(p.data)));
  };

  const statusCfg = {
    added: { bg: t.name === 'dark' ? '#052e16' : '#dcfce7', border: '#16a34a', color: t.name === 'dark' ? '#4ade80' : '#16a34a' },
    removed: { bg: t.name === 'dark' ? '#450a0a' : '#fee2e2', border: '#dc2626', color: t.name === 'dark' ? '#f87171' : '#dc2626' },
    modified: { bg: t.name === 'dark' ? '#422006' : '#fef3c7', border: '#d97706', color: t.name === 'dark' ? '#fbbf24' : '#d97706' },
    type_changed: { bg: t.name === 'dark' ? '#3b0764' : '#f3e8ff', border: '#9333ea', color: t.name === 'dark' ? '#c084fc' : '#9333ea' },
    unchanged: { bg: 'transparent', border: 'transparent', color: t.textMuted }
  };

  const fmtVal = (v, type) => {
    if (v === undefined) return <span style={{ color: t.textDim }}>—</span>;
    if (v === null) return <span style={{ color: t.null, fontStyle: 'italic' }}>null</span>;
    if (type === 'string') return <span style={{ color: t.string }}>"{v.length > 30 ? v.slice(0, 30) + '...' : v}"</span>;
    if (type === 'number') return <span style={{ color: t.number }}>{v}</span>;
    if (type === 'boolean') return <span style={{ color: t.boolean }}>{String(v)}</span>;
    if (type === 'array') return <span style={{ color: t.bracket }}>[{v.length}]</span>;
    if (type === 'object') return <span style={{ color: t.bracket }}>{`{${Object.keys(v).length}}`}</span>;
    return String(v);
  };

  const Badge = ({ format }) => (
    <span style={{ fontSize: 9, padding: '2px 6px', borderRadius: 4, fontWeight: 600, textTransform: 'uppercase', background: format === 'yaml' ? 'rgba(250, 204, 21, 0.15)' : 'rgba(96, 165, 250, 0.15)', color: format === 'yaml' ? '#facc15' : '#60a5fa', border: `1px solid ${format === 'yaml' ? 'rgba(250, 204, 21, 0.3)' : 'rgba(96, 165, 250, 0.3)'}` }}>
      {format}
    </span>
  );

  // Tree Node for Diff
  const DiffNode = ({ node, depth = 0 }) => {
    if (!node) return null;
    const exp = expandedNodes.has(node.path);
    const hasKids = node.children.length > 0;
    const cfg = statusCfg[node.status];
    const isLeaf = !hasKids || node.status === 'type_changed';

    if (searchTerm && !node.path.toLowerCase().includes(searchTerm.toLowerCase())) {
      const match = node.children.some(c => c.path.toLowerCase().includes(searchTerm.toLowerCase()));
      if (!match) return null;
    }
    if (showOnlyDiffs && node.status === 'unchanged' && !node.children.some(c => c.status !== 'unchanged')) return null;

    return (
      <div style={{ marginLeft: depth > 0 ? 16 : 0 }}>
        <div onClick={() => hasKids && toggle(node.path, setExpandedNodes)} style={{ display: 'flex', alignItems: 'center', padding: '4px 0', cursor: hasKids ? 'pointer' : 'default', borderLeft: `3px solid ${cfg.border}`, marginBottom: 2, background: node.status !== 'unchanged' ? cfg.bg : 'transparent', borderRadius: '0 6px 6px 0' }}>
          <div style={{ width: 20, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {hasKids && <span style={{ transform: exp ? 'rotate(90deg)' : '', transition: 'transform 0.15s', color: t.textMuted }}>▶</span>}
          </div>
          <div style={{ minWidth: 90, maxWidth: 160, paddingRight: 8, display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ fontFamily: 'monospace', fontSize: 11, color: node.status !== 'unchanged' ? t.text : t.textSecondary, fontWeight: node.status !== 'unchanged' ? 600 : 400 }}>{node.key}</span>
            {node.status !== 'unchanged' && <span style={{ padding: '1px 4px', borderRadius: 3, fontSize: 8, fontWeight: 700, background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}>{node.status === 'added' ? '+' : node.status === 'removed' ? '−' : node.status === 'modified' ? '~' : '⇄'}</span>}
          </div>
          {isLeaf && (
            <div style={{ display: 'flex', flex: 1, gap: 8, alignItems: 'center', paddingRight: 8 }}>
              <div style={{ flex: 1, padding: '2px 6px', borderRadius: 4, fontFamily: 'monospace', fontSize: 10, background: ['removed', 'modified', 'type_changed'].includes(node.status) ? t.errorLight : t.bgTertiary }}>{fmtVal(node.lv, node.lt)}</div>
              <span style={{ color: t.textDim }}>→</span>
              <div style={{ flex: 1, padding: '2px 6px', borderRadius: 4, fontFamily: 'monospace', fontSize: 10, background: ['added', 'modified', 'type_changed'].includes(node.status) ? t.successLight : t.bgTertiary }}>{fmtVal(node.rv, node.rt)}</div>
            </div>
          )}
          {!isLeaf && <span style={{ color: t.textMuted, fontSize: 10, fontFamily: 'monospace' }}>{node.lt === 'array' ? `[${node.lv?.length || 0}]` : `{${Object.keys(node.lv || {}).length}}`}{node.status === 'modified' && <span style={{ color: t.warning, marginLeft: 4 }}>•</span>}</span>}
        </div>
        {hasKids && exp && <div style={{ borderLeft: `1px solid ${t.border}`, marginLeft: 9 }}>{node.children.map(c => <DiffNode key={c.path} node={c} depth={depth + 1} />)}</div>}
      </div>
    );
  };

  // Tree Node for Visualizer (Interactive)
  const VizNode = ({ data, path = '$', keyName = 'root', depth = 0, parentIsArray = false }) => {
    const type = getType(data);
    const exp = vizExpanded.has(path);
    const hover = vizHover === path;
    const hasKids = (type === 'object' && data && Object.keys(data).length > 0) || (type === 'array' && data.length > 0);
    const isEditingValue = editingPath === path;
    const isEditingKey = editingKeyPath === path;

    if (vizSearch) {
      const s = vizSearch.toLowerCase();
      const match = String(keyName).toLowerCase().includes(s) || (type !== 'object' && type !== 'array' && String(data).toLowerCase().includes(s));
      if (!match && hasKids) {
        let childMatch = false;
        if (type === 'array') childMatch = data.some((x, i) => JSON.stringify(x).toLowerCase().includes(s));
        else if (type === 'object') childMatch = Object.entries(data).some(([k, v]) => k.toLowerCase().includes(s) || JSON.stringify(v).toLowerCase().includes(s));
        if (!childMatch) return null;
      } else if (!match) return null;
    }

    const startEditValue = (e) => {
      e.stopPropagation();
      if (type === 'object' || type === 'array') return;
      setEditingPath(path);
      setEditingValue(data === null ? 'null' : type === 'string' ? data : String(data));
    };

    const startEditKey = (e) => {
      e.stopPropagation();
      if (parentIsArray || depth === 0) return; // Can't edit array indices or root
      setEditingKeyPath(path);
      setEditingKeyValue(String(keyName));
    };

    const saveValue = () => {
      const parsed = parseEditedValue(editingValue);
      updateValueAtPath(path, parsed);
      setEditingPath(null);
      setEditingValue('');
    };

    const saveKey = () => {
      updateKeyAtPath(path, String(keyName), editingKeyValue);
      setEditingKeyPath(null);
      setEditingKeyValue('');
    };

    const cancelEdit = () => {
      setEditingPath(null);
      setEditingValue('');
      setEditingKeyPath(null);
      setEditingKeyValue('');
    };

    const handleValueKeyDown = (e) => {
      if (e.key === 'Enter') saveValue();
      if (e.key === 'Escape') cancelEdit();
    };

    const handleKeyKeyDown = (e) => {
      if (e.key === 'Enter') saveKey();
      if (e.key === 'Escape') cancelEdit();
    };

    const renderVal = () => {
      if (isEditingValue) {
        return (
          <input
            autoFocus
            value={editingValue}
            onChange={e => setEditingValue(e.target.value)}
            onBlur={saveValue}
            onKeyDown={handleValueKeyDown}
            onClick={e => e.stopPropagation()}
            style={{ 
              padding: '1px 4px', 
              background: t.bgTertiary, 
              border: `1px solid ${t.accent}`, 
              borderRadius: 3, 
              color: t.text, 
              fontSize: 11, 
              fontFamily: 'monospace',
              outline: 'none',
              minWidth: 60,
              maxWidth: 200
            }}
          />
        );
      }
      if (type === 'null') return <span style={{ color: t.null, fontStyle: 'italic', cursor: 'pointer' }} onDoubleClick={startEditValue}>null</span>;
      if (type === 'string') return <span style={{ color: t.string, cursor: 'pointer' }} onDoubleClick={startEditValue}>"{data.length > 40 ? data.slice(0, 40) + '...' : data}"</span>;
      if (type === 'number') return <span style={{ color: t.number, cursor: 'pointer' }} onDoubleClick={startEditValue}>{data}</span>;
      if (type === 'boolean') return <span style={{ color: t.boolean, cursor: 'pointer' }} onDoubleClick={startEditValue}>{String(data)}</span>;
      if (type === 'array') return <span style={{ color: t.bracket }}>[</span>;
      if (type === 'object') return <span style={{ color: t.bracket }}>{'{'}</span>;
      return null;
    };

    const renderKey = () => {
      if (isEditingKey) {
        return (
          <input
            autoFocus
            value={editingKeyValue}
            onChange={e => setEditingKeyValue(e.target.value)}
            onBlur={saveKey}
            onKeyDown={handleKeyKeyDown}
            onClick={e => e.stopPropagation()}
            style={{ 
              padding: '1px 4px', 
              background: t.bgTertiary, 
              border: `1px solid ${t.accent}`, 
              borderRadius: 3, 
              color: t.key, 
              fontSize: 11, 
              fontFamily: 'monospace',
              outline: 'none',
              minWidth: 40,
              maxWidth: 150
            }}
          />
        );
      }
      return (
        <span 
          style={{ color: t.key, fontFamily: 'monospace', fontSize: 11, cursor: parentIsArray ? 'default' : 'pointer' }} 
          onDoubleClick={startEditKey}
          title={parentIsArray ? 'Array index (read-only)' : 'Double-click to edit key'}
        >
          "{keyName}"
        </span>
      );
    };

    return (
      <div style={{ marginLeft: depth > 0 ? 14 : 0 }}>
        <div onClick={() => hasKids && toggle(path, setVizExpanded)} onMouseEnter={() => setVizHover(path)} onMouseLeave={() => setVizHover(null)} style={{ display: 'flex', alignItems: 'center', padding: '3px 6px', borderRadius: 4, cursor: hasKids ? 'pointer' : 'default', background: hover ? t.bgHover : 'transparent' }}>
          <div style={{ width: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {hasKids && <span style={{ transform: exp ? 'rotate(90deg)' : '', transition: 'transform 0.15s', color: t.textMuted, fontSize: 10 }}>▶</span>}
          </div>
          {depth > 0 && renderKey()}
          {depth > 0 && <span style={{ color: t.textMuted, margin: '0 4px' }}>:</span>}
          <span style={{ fontFamily: 'monospace', fontSize: 11 }}>{renderVal()}</span>
          {hasKids && !exp && <span style={{ color: t.textDim, fontSize: 10, marginLeft: 4 }}>{type === 'array' ? `${data.length}]` : `${Object.keys(data).length}}`}</span>}
          {hover && (
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 2 }}>
              {(type === 'object' || type === 'array') && (
                <button onClick={e => { e.stopPropagation(); addAtPath(path, type === 'array'); }} style={{ padding: '1px 4px', background: t.successLight, border: 'none', borderRadius: 3, color: t.success, cursor: 'pointer', fontSize: 9 }} title={type === 'array' ? 'Add item' : 'Add key'}>+</button>
              )}
              {type !== 'object' && type !== 'array' && (
                <button onClick={startEditValue} style={{ padding: '1px 4px', background: t.warningLight, border: 'none', borderRadius: 3, color: t.warning, cursor: 'pointer', fontSize: 9 }} title="Edit value">✎</button>
              )}
              {depth > 0 && (
                <button onClick={e => { e.stopPropagation(); if (confirm('Delete this item?')) deleteAtPath(path); }} style={{ padding: '1px 4px', background: t.errorLight, border: 'none', borderRadius: 3, color: t.error, cursor: 'pointer', fontSize: 9 }} title="Delete">×</button>
              )}
              <button onClick={e => { e.stopPropagation(); copy(JSON.stringify(data, null, 2), path); }} style={{ padding: '1px 4px', background: t.bgTertiary, border: 'none', borderRadius: 3, color: copied === path ? t.success : t.textMuted, cursor: 'pointer', fontSize: 9 }}>{copied === path ? '✓' : 'Copy'}</button>
              <button onClick={e => { e.stopPropagation(); copy(path, `p-${path}`); }} style={{ padding: '1px 4px', background: t.bgTertiary, border: 'none', borderRadius: 3, color: copied === `p-${path}` ? t.success : t.textMuted, cursor: 'pointer', fontSize: 9 }}>{copied === `p-${path}` ? '✓' : 'Path'}</button>
            </div>
          )}
        </div>
        {hasKids && exp && (
          <div style={{ borderLeft: `1px dashed ${t.border}`, marginLeft: 7, paddingLeft: 2 }}>
            {type === 'array' ? data.map((x, i) => <VizNode key={`${path}[${i}]`} data={x} path={`${path}[${i}]`} keyName={i} depth={depth + 1} parentIsArray={true} />) : Object.entries(data).map(([k, v]) => <VizNode key={`${path}.${k}`} data={v} path={`${path}.${k}`} keyName={k} depth={depth + 1} parentIsArray={false} />)}
            <div style={{ padding: '2px 6px', marginLeft: 16, fontFamily: 'monospace', fontSize: 11, color: t.bracket }}>{type === 'array' ? ']' : '}'}</div>
          </div>
        )}
      </div>
    );
  };

  // Input Panel
  const InputPanel = ({ side, label, color, value, setter, parsed, height = 180 }) => (
    <div style={{ background: t.bgSecondary, borderRadius: 10, border: `1px solid ${!parsed.valid && value ? t.error + '60' : t.border}`, overflow: 'hidden' }}>
      <div style={{ padding: '8px 12px', background: t.bgTertiary, borderBottom: `1px solid ${t.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: color, boxShadow: `0 0 6px ${color}` }} />
          <span style={{ fontSize: 11, fontWeight: 600, color: t.text }}>{label}</span>
          {parsed.valid && value && parsed.format !== 'unknown' && <Badge format={parsed.format} />}
          {parsed.valid && value && <span style={{ fontSize: 9, color: t.success, background: t.successLight, padding: '1px 5px', borderRadius: 3 }}>✓</span>}
          {parsed.wasFixed && <span style={{ fontSize: 9, color: t.warning, background: t.warningLight, padding: '1px 5px', borderRadius: 3 }}>Fixed</span>}
        </div>
        <div style={{ display: 'flex', gap: 3 }}>
          <button onClick={() => format(side)} style={{ padding: '3px 6px', background: t.bgHover, border: 'none', borderRadius: 3, color: t.textSecondary, cursor: 'pointer', fontSize: 9 }}>Format</button>
          <button onClick={() => minify(side)} style={{ padding: '3px 6px', background: t.bgHover, border: 'none', borderRadius: 3, color: t.textSecondary, cursor: 'pointer', fontSize: 9 }}>Minify</button>
          <button onClick={() => toJsonFmt(side)} style={{ padding: '3px 6px', background: 'rgba(96, 165, 250, 0.1)', border: 'none', borderRadius: 3, color: '#60a5fa', cursor: 'pointer', fontSize: 9 }}>→JSON</button>
          <button onClick={() => toYamlFmt(side)} style={{ padding: '3px 6px', background: 'rgba(250, 204, 21, 0.1)', border: 'none', borderRadius: 3, color: '#facc15', cursor: 'pointer', fontSize: 9 }}>→YAML</button>
          <button onClick={() => sortKeys(side)} style={{ padding: '3px 6px', background: t.bgHover, border: 'none', borderRadius: 3, color: t.textSecondary, cursor: 'pointer', fontSize: 9 }}>Sort</button>
          <button onClick={() => copy(value, side)} style={{ padding: '3px 6px', background: t.bgHover, border: 'none', borderRadius: 3, color: copied === side ? t.success : t.textSecondary, cursor: 'pointer', fontSize: 9 }}>{copied === side ? '✓' : 'Copy'}</button>
        </div>
      </div>
      <textarea value={value} onChange={e => setter(e.target.value)} placeholder="Paste JSON or YAML here..." style={{ width: '100%', height, padding: 10, background: 'transparent', border: 'none', color: t.text, fontSize: 11, fontFamily: 'monospace', lineHeight: 1.5, resize: 'none', outline: 'none' }} spellCheck={false} />
      {!parsed.valid && value && <div style={{ padding: '8px 12px', background: t.errorLight, borderTop: `1px solid ${t.error}30`, color: t.error, fontSize: 10 }}>⚠ {parsed.line && `Line ${parsed.line}: `}{parsed.error}</div>}
    </div>
  );

  const Btn = ({ children, onClick, active, color }) => (
    <button onClick={onClick} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 10px', background: active ? t.accentLight : 'transparent', border: 'none', borderRadius: 5, color: active ? t.accent : color || t.textMuted, cursor: 'pointer', fontSize: 10, fontWeight: 500 }}>{children}</button>
  );

  return (
    <div style={{ minHeight: '100vh', background: t.bg, fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", color: t.text }}>
      <style>{`*{box-sizing:border-box}::-webkit-scrollbar{width:6px;height:6px}::-webkit-scrollbar-track{background:${t.bgTertiary}}::-webkit-scrollbar-thumb{background:${t.textDim};border-radius:3px}textarea::placeholder{color:${t.textDim}}`}</style>

      {/* Header */}
      <header style={{ position: 'sticky', top: 0, zIndex: 50, padding: '10px 20px', background: t.name === 'dark' ? 'rgba(10, 10, 15, 0.95)' : 'rgba(248, 250, 252, 0.95)', backdropFilter: 'blur(12px)', borderBottom: `1px solid ${t.border}` }}>
        <div style={{ maxWidth: 1400, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg, #6366f1, #10b981)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>⚡</div>
            <div>
              <h1 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: t.text }}>JSON/YAML Toolkit</h1>
              <p style={{ margin: 0, fontSize: 9, color: t.textMuted }}>Diff • Convert • Visualize • Validate • JWT</p>
            </div>
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', gap: 2, background: t.bgTertiary, padding: 3, borderRadius: 6 }}>
            {[{ id: 'diff', label: 'Diff' }, { id: 'converter', label: 'Convert' }, { id: 'visualizer', label: 'Visualize' }, { id: 'validate', label: 'Validate' }, { id: 'jwt', label: '🔐 JWT' }].map(tab => (
              <Btn key={tab.id} onClick={() => setActiveTab(tab.id)} active={activeTab === tab.id}>{tab.label}</Btn>
            ))}
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <button onClick={loadSample} style={{ padding: '5px 10px', background: t.bgSecondary, border: `1px solid ${t.border}`, borderRadius: 5, color: t.textSecondary, cursor: 'pointer', fontSize: 10 }}>Sample</button>
            <button onClick={clear} style={{ padding: '5px 10px', background: t.bgSecondary, border: `1px solid ${t.border}`, borderRadius: 5, color: t.textSecondary, cursor: 'pointer', fontSize: 10 }}>Clear</button>
            {activeTab === 'diff' && <button onClick={swap} style={{ padding: '5px 10px', background: t.bgSecondary, border: `1px solid ${t.border}`, borderRadius: 5, color: t.textSecondary, cursor: 'pointer', fontSize: 10 }}>⇄ Swap</button>}
            <button onClick={() => setTheme(th => th === 'dark' ? 'light' : 'dark')} style={{ padding: '5px 10px', background: t.bgSecondary, border: `1px solid ${t.border}`, borderRadius: 5, color: t.textSecondary, cursor: 'pointer', fontSize: 10 }}>{t.name === 'dark' ? '☀️' : '🌙'}</button>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: 1400, margin: '0 auto', padding: '16px 20px' }}>
        {/* DIFF TAB */}
        {activeTab === 'diff' && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
              <InputPanel side="left" label="Left (Original)" color={t.error} value={leftJson} setter={setLeftJson} parsed={leftParsed} />
              <InputPanel side="right" label="Right (Modified)" color={t.success} value={rightJson} setter={setRightJson} parsed={rightParsed} />
            </div>

            {diffTree && stats && (stats.added > 0 || stats.removed > 0 || stats.modified > 0) && (
              <div style={{ display: 'flex', gap: 10, padding: '10px 14px', background: t.accentLight, borderRadius: 8, marginBottom: 12, alignItems: 'center', border: `1px solid ${t.accent}20` }}>
                <span style={{ fontSize: 22, fontWeight: 800, color: t.accent }}>{stats.added + stats.removed + stats.modified + stats.type_changed}</span>
                <span style={{ color: t.textMuted, fontSize: 11 }}>changes</span>
                <div style={{ width: 1, height: 20, background: t.border, margin: '0 8px' }} />
                {[{ n: stats.added, c: t.success, l: 'Added' }, { n: stats.removed, c: t.error, l: 'Removed' }, { n: stats.modified, c: t.warning, l: 'Changed' }].filter(x => x.n > 0).map(x => (
                  <div key={x.l} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <div style={{ width: 6, height: 6, borderRadius: 2, background: x.c }} />
                    <span style={{ color: x.c, fontWeight: 700, fontSize: 12 }}>{x.n}</span>
                    <span style={{ color: t.textMuted, fontSize: 10 }}>{x.l}</span>
                  </div>
                ))}
              </div>
            )}

            {diffTree && (
              <div style={{ display: 'flex', gap: 6, marginBottom: 10, alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                  <button onClick={expandAll} style={{ padding: '4px 8px', background: t.bgSecondary, border: `1px solid ${t.border}`, borderRadius: 4, color: t.textSecondary, cursor: 'pointer', fontSize: 9 }}>Expand All</button>
                  <button onClick={expandDiffs} style={{ padding: '4px 8px', background: t.accentLight, border: `1px solid ${t.accent}30`, borderRadius: 4, color: t.accent, cursor: 'pointer', fontSize: 9 }}>Expand Changes</button>
                  <button onClick={() => setExpandedNodes(new Set(['$']))} style={{ padding: '4px 8px', background: t.bgSecondary, border: `1px solid ${t.border}`, borderRadius: 4, color: t.textSecondary, cursor: 'pointer', fontSize: 9 }}>Collapse</button>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 4, marginLeft: 8, cursor: 'pointer' }}>
                    <input type="checkbox" checked={showOnlyDiffs} onChange={e => setShowOnlyDiffs(e.target.checked)} style={{ accentColor: t.accent }} />
                    <span style={{ fontSize: 9, color: t.textSecondary }}>Only changes</span>
                  </label>
                </div>
                <input type="text" placeholder="Search..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} style={{ padding: '4px 8px', background: t.bgSecondary, border: `1px solid ${t.border}`, borderRadius: 4, color: t.text, fontSize: 9, width: 120, outline: 'none' }} />
              </div>
            )}

            <div style={{ background: t.bgSecondary, borderRadius: 8, border: `1px solid ${t.border}`, overflow: 'hidden' }}>
              <div style={{ display: 'flex', padding: '8px 10px', background: t.bgTertiary, borderBottom: `1px solid ${t.border}`, fontSize: 9, fontWeight: 600, color: t.textMuted }}>
                <div style={{ width: 20 }} />
                <div style={{ minWidth: 90, maxWidth: 160, paddingRight: 8 }}>Key</div>
                <div style={{ flex: 1, display: 'flex', gap: 8 }}>
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 4 }}><div style={{ width: 4, height: 4, borderRadius: 1, background: t.error }} />Left</div>
                  <div style={{ width: 16 }} />
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 4 }}><div style={{ width: 4, height: 4, borderRadius: 1, background: t.success }} />Right</div>
                </div>
              </div>
              <div style={{ padding: 8, maxHeight: 400, overflow: 'auto' }}>
                {!leftParsed.data && !rightParsed.data ? (
                  <div style={{ textAlign: 'center', padding: 40, color: t.textMuted }}>
                    <p style={{ fontSize: 12, fontWeight: 500, color: t.text, marginBottom: 4 }}>Ready to Compare</p>
                    <p style={{ fontSize: 10, marginBottom: 12 }}>Paste JSON or YAML in both panels</p>
                    <button onClick={loadSample} style={{ padding: '8px 14px', background: `linear-gradient(135deg, ${t.accent}, #10b981)`, border: 'none', borderRadius: 5, color: 'white', cursor: 'pointer', fontSize: 10, fontWeight: 600 }}>Try Sample</button>
                  </div>
                ) : diffTree && !stats.added && !stats.removed && !stats.modified && !stats.type_changed ? (
                  <div style={{ textAlign: 'center', padding: 40 }}>
                    <div style={{ fontSize: 32, marginBottom: 8 }}>✅</div>
                    <p style={{ fontSize: 14, fontWeight: 600, color: t.success }}>Identical!</p>
                    <p style={{ fontSize: 10, color: t.textMuted }}>Both objects match</p>
                  </div>
                ) : diffTree ? <DiffNode node={diffTree} /> : null}
              </div>
            </div>
          </>
        )}

        {/* CONVERTER TAB */}
        {activeTab === 'converter' && (
          <>
            <div style={{ background: 'linear-gradient(135deg, rgba(96, 165, 250, 0.1), rgba(250, 204, 21, 0.1))', border: `1px solid ${t.border}`, borderRadius: 6, padding: '10px 14px', marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 11, color: t.text }}>🔄 Convert between <span style={{ color: '#60a5fa', fontWeight: 600 }}>JSON</span> and <span style={{ color: '#facc15', fontWeight: 600 }}>YAML</span></span>
              <div style={{ display: 'flex', gap: 4 }}>
                <button onClick={() => setOutputFormat('json')} style={{ padding: '5px 10px', background: outputFormat === 'json' ? 'rgba(96, 165, 250, 0.2)' : t.bgTertiary, border: `1px solid ${outputFormat === 'json' ? 'rgba(96, 165, 250, 0.4)' : t.border}`, borderRadius: 5, color: outputFormat === 'json' ? '#60a5fa' : t.textMuted, cursor: 'pointer', fontSize: 10, fontWeight: 600 }}>→ JSON</button>
                <button onClick={() => setOutputFormat('yaml')} style={{ padding: '5px 10px', background: outputFormat === 'yaml' ? 'rgba(250, 204, 21, 0.2)' : t.bgTertiary, border: `1px solid ${outputFormat === 'yaml' ? 'rgba(250, 204, 21, 0.4)' : t.border}`, borderRadius: 5, color: outputFormat === 'yaml' ? '#facc15' : t.textMuted, cursor: 'pointer', fontSize: 10, fontWeight: 600 }}>→ YAML</button>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <InputPanel side="conv" label="Input (JSON or YAML)" color={t.accent} value={converterInput} setter={setConverterInput} parsed={convParsed} height={300} />
              <div style={{ background: t.bgSecondary, borderRadius: 10, border: `1px solid ${t.border}`, overflow: 'hidden' }}>
                <div style={{ padding: '8px 12px', background: t.bgTertiary, borderBottom: `1px solid ${t.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: outputFormat === 'yaml' ? '#facc15' : '#60a5fa' }} />
                    <span style={{ fontSize: 11, fontWeight: 600, color: t.text }}>Output</span>
                    <Badge format={outputFormat} />
                  </div>
                  <button onClick={() => copy(converterOutput, 'out')} style={{ padding: '3px 6px', background: t.bgHover, border: 'none', borderRadius: 3, color: copied === 'out' ? t.success : t.textSecondary, cursor: 'pointer', fontSize: 9 }}>{copied === 'out' ? '✓' : 'Copy'}</button>
                </div>
                <textarea value={converterOutput} readOnly placeholder="Converted output..." style={{ width: '100%', height: 300, padding: 10, background: 'transparent', border: 'none', color: t.text, fontSize: 11, fontFamily: 'monospace', lineHeight: 1.5, resize: 'none', outline: 'none' }} />
              </div>
            </div>
          </>
        )}

        {/* VISUALIZER TAB */}
        {activeTab === 'visualizer' && (
          <>
            {/* Interactive hint banner */}
            <div style={{ background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(16, 185, 129, 0.1))', border: `1px solid ${t.border}`, borderRadius: 6, padding: '10px 14px', marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
              <span style={{ fontSize: 11, color: t.text }}>✨ <strong>Interactive Editor</strong> — Double-click values or keys to edit. Hover for <span style={{ color: t.success }}>+</span> <span style={{ color: t.warning }}>✎</span> <span style={{ color: t.error }}>×</span> actions.</span>
              <div style={{ display: 'flex', gap: 6, fontSize: 9, color: t.textMuted }}>
                <span style={{ padding: '2px 6px', background: t.bgTertiary, borderRadius: 3 }}>Double-click = Edit</span>
                <span style={{ padding: '2px 6px', background: t.bgTertiary, borderRadius: 3 }}>Enter = Save</span>
                <span style={{ padding: '2px 6px', background: t.bgTertiary, borderRadius: 3 }}>Esc = Cancel</span>
              </div>
            </div>
            <div style={{ marginBottom: 14 }}>
              <InputPanel side="viz" label="JSON or YAML Input" color={t.accent} value={visualizerJson} setter={setVisualizerJson} parsed={vizParsed} height={140} />
            </div>
            {vizParsed.valid && vizParsed.data && (
              <>
                {vizStats && (
                  <div style={{ display: 'flex', gap: 5, padding: '8px 12px', background: t.bgSecondary, borderRadius: 6, marginBottom: 12, flexWrap: 'wrap', border: `1px solid ${t.border}` }}>
                    {[{ l: 'Objects', v: vizStats.objects, c: t.bracket }, { l: 'Arrays', v: vizStats.arrays, c: '#7dd3fc' }, { l: 'Strings', v: vizStats.strings, c: t.string }, { l: 'Numbers', v: vizStats.numbers, c: t.number }, { l: 'Keys', v: vizStats.totalKeys, c: t.key }, { l: 'Depth', v: vizStats.maxDepth, c: t.accent }].map(s => (
                      <div key={s.l} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '2px 6px', background: t.bgTertiary, borderRadius: 4 }}>
                        <span style={{ color: s.c, fontWeight: 700, fontSize: 11 }}>{s.v}</span>
                        <span style={{ color: t.textMuted, fontSize: 8, textTransform: 'uppercase' }}>{s.l}</span>
                      </div>
                    ))}
                  </div>
                )}
                <div style={{ display: 'flex', gap: 4, marginBottom: 10, alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                    <button onClick={expandVizAll} style={{ padding: '4px 8px', background: t.bgSecondary, border: `1px solid ${t.border}`, borderRadius: 4, color: t.textSecondary, cursor: 'pointer', fontSize: 9 }}>Expand All</button>
                    <button onClick={() => setVizExpanded(new Set(['$']))} style={{ padding: '4px 8px', background: t.bgSecondary, border: `1px solid ${t.border}`, borderRadius: 4, color: t.textSecondary, cursor: 'pointer', fontSize: 9 }}>Collapse</button>
                    <span style={{ fontSize: 9, color: t.textMuted, marginLeft: 4 }}>Level:</span>
                    {[1, 2, 3, 4].map(l => <button key={l} onClick={() => expandToLevel(l)} style={{ width: 22, height: 22, background: t.bgSecondary, border: `1px solid ${t.border}`, borderRadius: 4, color: t.textSecondary, cursor: 'pointer', fontSize: 9, fontWeight: 600 }}>{l}</button>)}
                  </div>
                  <input type="text" placeholder="Search..." value={vizSearch} onChange={e => setVizSearch(e.target.value)} style={{ padding: '4px 8px', background: t.bgSecondary, border: `1px solid ${t.border}`, borderRadius: 4, color: t.text, fontSize: 9, width: 140, outline: 'none' }} />
                </div>
                <div style={{ background: t.bgSecondary, borderRadius: 8, border: `1px solid ${t.border}`, overflow: 'hidden' }}>
                  <div style={{ padding: '8px 10px', background: t.bgTertiary, borderBottom: `1px solid ${t.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 10, fontWeight: 600, color: t.text }}>Interactive Tree View</span>
                      <span style={{ fontSize: 8, padding: '2px 5px', background: t.accentLight, color: t.accent, borderRadius: 3, fontWeight: 600 }}>EDITABLE</span>
                    </div>
                    <div style={{ display: 'flex', gap: 8, fontSize: 9, color: t.textMuted }}>
                      <span><span style={{ color: t.key }}>●</span> Key</span>
                      <span><span style={{ color: t.string }}>●</span> String</span>
                      <span><span style={{ color: t.number }}>●</span> Number</span>
                      <span><span style={{ color: t.boolean }}>●</span> Bool</span>
                    </div>
                  </div>
                  <div style={{ padding: 8, maxHeight: 400, overflow: 'auto' }}><VizNode data={vizParsed.data} /></div>
                </div>
              </>
            )}
            {!vizParsed.data && (
              <div style={{ background: t.bgSecondary, borderRadius: 8, border: `1px solid ${t.border}`, padding: 40, textAlign: 'center' }}>
                <p style={{ fontSize: 12, fontWeight: 500, color: t.text, marginBottom: 4 }}>Interactive Data Editor</p>
                <p style={{ fontSize: 10, color: t.textMuted, marginBottom: 12 }}>Paste JSON or YAML to explore and edit</p>
                <button onClick={loadSample} style={{ padding: '8px 14px', background: `linear-gradient(135deg, ${t.accent}, #10b981)`, border: 'none', borderRadius: 5, color: 'white', cursor: 'pointer', fontSize: 10, fontWeight: 600 }}>Load Sample</button>
              </div>
            )}
          </>
        )}

        {/* VALIDATE TAB */}
        {activeTab === 'validate' && (
          <div style={{ maxWidth: 600, margin: '0 auto' }}>
            <InputPanel side="viz" label="JSON or YAML to Validate" color={t.accent} value={visualizerJson} setter={setVisualizerJson} parsed={vizParsed} height={160} />
            <div style={{ marginTop: 14, background: t.bgSecondary, borderRadius: 8, border: `1px solid ${t.border}`, overflow: 'hidden' }}>
              <div style={{ padding: '8px 12px', background: t.bgTertiary, borderBottom: `1px solid ${t.border}` }}>
                <span style={{ fontSize: 10, fontWeight: 600, color: t.text }}>Validation Result</span>
              </div>
              <div style={{ padding: 16 }}>
                {!visualizerJson.trim() ? (
                  <div style={{ textAlign: 'center', padding: 30, color: t.textMuted }}>
                    <p style={{ fontSize: 11 }}>Enter JSON or YAML to validate</p>
                  </div>
                ) : vizParsed.valid ? (
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 48, marginBottom: 8 }}>✅</div>
                    <h3 style={{ margin: 0, color: t.success, fontSize: 18, fontWeight: 700 }}>Valid {vizParsed.format === 'yaml' ? 'YAML' : 'JSON'}!</h3>
                    {vizParsed.wasFixed && <p style={{ margin: '8px 0 0', color: t.warning, fontSize: 11 }}>⚠ Auto-corrected: Added quotes to keys</p>}
                    {vizStats && (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginTop: 16 }}>
                        {[{ l: 'Objects', v: vizStats.objects }, { l: 'Arrays', v: vizStats.arrays }, { l: 'Keys', v: vizStats.totalKeys }, { l: 'Depth', v: vizStats.maxDepth }].map(s => (
                          <div key={s.l} style={{ padding: 10, background: t.bgTertiary, borderRadius: 6 }}>
                            <div style={{ fontSize: 20, fontWeight: 700, color: t.text }}>{s.v}</div>
                            <div style={{ fontSize: 9, color: t.textMuted, textTransform: 'uppercase' }}>{s.l}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 14, background: t.errorLight, borderRadius: 8, border: `1px solid ${t.error}30` }}>
                      <div style={{ fontSize: 32 }}>❌</div>
                      <div>
                        <h4 style={{ margin: 0, color: t.error, fontSize: 14, fontWeight: 600 }}>Invalid {detectFormat(visualizerJson) === 'yaml' ? 'YAML' : 'JSON'}</h4>
                        <p style={{ margin: '4px 0 0', color: t.error, fontSize: 11, opacity: 0.8 }}>{vizParsed.error}</p>
                      </div>
                    </div>
                    {vizParsed.line && (
                      <div style={{ marginTop: 12 }}>
                        <div style={{ fontSize: 9, color: t.textMuted, marginBottom: 4, fontWeight: 600 }}>ERROR LOCATION</div>
                        <div style={{ fontFamily: 'monospace', fontSize: 10, background: t.bgTertiary, borderRadius: 4, overflow: 'hidden', border: `1px solid ${t.border}` }}>
                          {visualizerJson.split('\n').slice(Math.max(0, vizParsed.line - 3), vizParsed.line + 2).map((line, i) => {
                            const num = Math.max(1, vizParsed.line - 2) + i;
                            const isErr = num === vizParsed.line;
                            return (
                              <div key={i} style={{ display: 'flex', background: isErr ? t.errorLight : 'transparent' }}>
                                <span style={{ width: 36, padding: '4px 8px', color: isErr ? t.error : t.textDim, background: t.bgTertiary, textAlign: 'right', borderRight: isErr ? `2px solid ${t.error}` : '2px solid transparent', fontWeight: isErr ? 700 : 400 }}>{num}</span>
                                <span style={{ padding: '4px 8px', color: isErr ? t.error : t.textSecondary, whiteSpace: 'pre' }}>{line || ' '}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* JWT TAB */}
        {activeTab === 'jwt' && (
          <div style={{ maxWidth: 900, margin: '0 auto' }}>
            {/* Mode Toggle */}
            <div style={{ background: 'linear-gradient(135deg, rgba(236, 72, 153, 0.1), rgba(168, 85, 247, 0.1))', border: `1px solid ${t.border}`, borderRadius: 6, padding: '10px 14px', marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 11, color: t.text }}>🔐 <span style={{ color: '#ec4899', fontWeight: 600 }}>JWT</span> Token Decoder & Encoder</span>
              <div style={{ display: 'flex', gap: 4 }}>
                <button onClick={() => setJwtMode('decode')} style={{ padding: '5px 10px', background: jwtMode === 'decode' ? 'rgba(236, 72, 153, 0.2)' : t.bgTertiary, border: `1px solid ${jwtMode === 'decode' ? 'rgba(236, 72, 153, 0.4)' : t.border}`, borderRadius: 5, color: jwtMode === 'decode' ? '#ec4899' : t.textMuted, cursor: 'pointer', fontSize: 10, fontWeight: 600 }}>Decode</button>
                <button onClick={() => setJwtMode('encode')} style={{ padding: '5px 10px', background: jwtMode === 'encode' ? 'rgba(168, 85, 247, 0.2)' : t.bgTertiary, border: `1px solid ${jwtMode === 'encode' ? 'rgba(168, 85, 247, 0.4)' : t.border}`, borderRadius: 5, color: jwtMode === 'encode' ? '#a855f7' : t.textMuted, cursor: 'pointer', fontSize: 10, fontWeight: 600 }}>Encode</button>
              </div>
            </div>

            {/* DECODE MODE */}
            {jwtMode === 'decode' && (
              <>
                {/* JWT Input */}
                <div style={{ background: t.bgSecondary, borderRadius: 10, border: `1px solid ${!jwtDecoded?.valid && jwtInput ? t.error + '60' : t.border}`, overflow: 'hidden', marginBottom: 14 }}>
                  <div style={{ padding: '8px 12px', background: t.bgTertiary, borderBottom: `1px solid ${t.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#ec4899', boxShadow: '0 0 6px #ec4899' }} />
                      <span style={{ fontSize: 11, fontWeight: 600, color: t.text }}>JWT Token</span>
                      {jwtDecoded?.valid && <span style={{ fontSize: 9, color: t.success, background: t.successLight, padding: '1px 5px', borderRadius: 3 }}>✓ Valid</span>}
                    </div>
                    <div style={{ display: 'flex', gap: 3 }}>
                      <button onClick={() => copy(jwtInput, 'jwt-input')} style={{ padding: '3px 6px', background: t.bgHover, border: 'none', borderRadius: 3, color: copied === 'jwt-input' ? t.success : t.textSecondary, cursor: 'pointer', fontSize: 9 }}>{copied === 'jwt-input' ? '✓' : 'Copy'}</button>
                    </div>
                  </div>
                  <textarea value={jwtInput} onChange={e => setJwtInput(e.target.value)} placeholder="Paste your JWT token here (e.g., eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...)" style={{ width: '100%', height: 80, padding: 10, background: 'transparent', border: 'none', color: t.text, fontSize: 11, fontFamily: 'monospace', lineHeight: 1.5, resize: 'none', outline: 'none', wordBreak: 'break-all' }} spellCheck={false} />
                  {!jwtDecoded?.valid && jwtInput && <div style={{ padding: '8px 12px', background: t.errorLight, borderTop: `1px solid ${t.error}30`, color: t.error, fontSize: 10 }}>⚠ {jwtDecoded?.error}</div>}
                </div>

                {/* Empty State */}
                {!jwtInput.trim() && (
                  <div style={{ background: t.bgSecondary, borderRadius: 8, border: `1px solid ${t.border}`, padding: 40, textAlign: 'center' }}>
                    <p style={{ fontSize: 12, fontWeight: 500, color: t.text, marginBottom: 4 }}>Decode JWT Token</p>
                    <p style={{ fontSize: 10, color: t.textMuted, marginBottom: 12 }}>Paste a JWT to decode and analyze its contents</p>
                    <button onClick={loadSample} style={{ padding: '8px 14px', background: 'linear-gradient(135deg, #ec4899, #a855f7)', border: 'none', borderRadius: 5, color: 'white', cursor: 'pointer', fontSize: 10, fontWeight: 600 }}>Load Sample</button>
                  </div>
                )}

                {/* Decoded Output */}
                {jwtDecoded?.valid && (
                  <>
                    {/* Token Structure Display */}
                    <div style={{ background: t.bgSecondary, borderRadius: 8, border: `1px solid ${t.border}`, overflow: 'hidden', marginBottom: 14 }}>
                      <div style={{ padding: '8px 12px', background: t.bgTertiary, borderBottom: `1px solid ${t.border}` }}>
                        <span style={{ fontSize: 10, fontWeight: 600, color: t.text }}>Token Structure</span>
                      </div>
                      <div style={{ padding: 12, fontFamily: 'monospace', fontSize: 10, lineHeight: 1.6, wordBreak: 'break-all' }}>
                        <span style={{ color: '#f472b6', background: 'rgba(244, 114, 182, 0.1)', padding: '2px 4px', borderRadius: 3 }}>{jwtDecoded.parts[0]}</span>
                        <span style={{ color: t.textMuted }}>.</span>
                        <span style={{ color: '#c084fc', background: 'rgba(192, 132, 252, 0.1)', padding: '2px 4px', borderRadius: 3 }}>{jwtDecoded.parts[1]}</span>
                        <span style={{ color: t.textMuted }}>.</span>
                        <span style={{ color: '#4ade80', background: 'rgba(74, 222, 128, 0.1)', padding: '2px 4px', borderRadius: 3 }}>{jwtDecoded.parts[2] || '(empty)'}</span>
                      </div>
                      <div style={{ padding: '8px 12px', background: t.bgTertiary, borderTop: `1px solid ${t.border}`, display: 'flex', gap: 12, fontSize: 9 }}>
                        <span><span style={{ color: '#f472b6' }}>●</span> Header</span>
                        <span><span style={{ color: '#c084fc' }}>●</span> Payload</span>
                        <span><span style={{ color: '#4ade80' }}>●</span> Signature</span>
                      </div>
                    </div>

                    {/* Status Banner */}
                    {jwtAnalysis && (
                      <div style={{ 
                        padding: '10px 14px', 
                        background: jwtAnalysis.status === 'expired' ? t.errorLight : jwtAnalysis.status === 'warning' || jwtAnalysis.status === 'not_yet_valid' ? t.warningLight : t.successLight, 
                        borderRadius: 8, 
                        marginBottom: 14, 
                        border: `1px solid ${jwtAnalysis.status === 'expired' ? t.error : jwtAnalysis.status === 'warning' || jwtAnalysis.status === 'not_yet_valid' ? t.warning : t.success}30` 
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 18 }}>{jwtAnalysis.status === 'expired' ? '🔴' : jwtAnalysis.status === 'warning' || jwtAnalysis.status === 'not_yet_valid' ? '🟡' : '🟢'}</span>
                          <span style={{ fontSize: 12, fontWeight: 600, color: jwtAnalysis.status === 'expired' ? t.error : jwtAnalysis.status === 'warning' || jwtAnalysis.status === 'not_yet_valid' ? t.warning : t.success }}>
                            {jwtAnalysis.status === 'expired' ? 'Token Expired' : jwtAnalysis.status === 'not_yet_valid' ? 'Token Not Yet Valid' : jwtAnalysis.status === 'warning' ? 'Token Has Warnings' : 'Token Valid'}
                          </span>
                        </div>
                        {jwtAnalysis.warnings.length > 0 && (
                          <div style={{ marginTop: 8, fontSize: 10, color: t.textSecondary }}>
                            {jwtAnalysis.warnings.map((w, i) => <div key={i}>{w}</div>)}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Header & Payload */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
                      {/* Header */}
                      <div style={{ background: t.bgSecondary, borderRadius: 8, border: `1px solid ${t.border}`, overflow: 'hidden' }}>
                        <div style={{ padding: '8px 12px', background: 'rgba(244, 114, 182, 0.1)', borderBottom: `1px solid ${t.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#f472b6' }} />
                            <span style={{ fontSize: 11, fontWeight: 600, color: t.text }}>Header</span>
                            <span style={{ fontSize: 9, padding: '1px 5px', background: t.bgTertiary, borderRadius: 3, color: t.textMuted }}>ALGORITHM & TOKEN TYPE</span>
                          </div>
                          <button onClick={() => copy(JSON.stringify(jwtDecoded.header, null, 2), 'jwt-header')} style={{ padding: '3px 6px', background: t.bgHover, border: 'none', borderRadius: 3, color: copied === 'jwt-header' ? t.success : t.textSecondary, cursor: 'pointer', fontSize: 9 }}>{copied === 'jwt-header' ? '✓' : 'Copy'}</button>
                        </div>
                        <pre style={{ margin: 0, padding: 12, fontSize: 10, color: t.text, fontFamily: 'monospace', overflow: 'auto', maxHeight: 150 }}>{JSON.stringify(jwtDecoded.header, null, 2)}</pre>
                      </div>

                      {/* Payload */}
                      <div style={{ background: t.bgSecondary, borderRadius: 8, border: `1px solid ${t.border}`, overflow: 'hidden' }}>
                        <div style={{ padding: '8px 12px', background: 'rgba(192, 132, 252, 0.1)', borderBottom: `1px solid ${t.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#c084fc' }} />
                            <span style={{ fontSize: 11, fontWeight: 600, color: t.text }}>Payload</span>
                            <span style={{ fontSize: 9, padding: '1px 5px', background: t.bgTertiary, borderRadius: 3, color: t.textMuted }}>DATA</span>
                          </div>
                          <button onClick={() => copy(JSON.stringify(jwtDecoded.payload, null, 2), 'jwt-payload')} style={{ padding: '3px 6px', background: t.bgHover, border: 'none', borderRadius: 3, color: copied === 'jwt-payload' ? t.success : t.textSecondary, cursor: 'pointer', fontSize: 9 }}>{copied === 'jwt-payload' ? '✓' : 'Copy'}</button>
                        </div>
                        <pre style={{ margin: 0, padding: 12, fontSize: 10, color: t.text, fontFamily: 'monospace', overflow: 'auto', maxHeight: 150 }}>{JSON.stringify(jwtDecoded.payload, null, 2)}</pre>
                      </div>
                    </div>

                    {/* Claims Analysis */}
                    {jwtAnalysis && jwtAnalysis.claims.length > 0 && (
                      <div style={{ background: t.bgSecondary, borderRadius: 8, border: `1px solid ${t.border}`, overflow: 'hidden' }}>
                        <div style={{ padding: '8px 12px', background: t.bgTertiary, borderBottom: `1px solid ${t.border}` }}>
                          <span style={{ fontSize: 10, fontWeight: 600, color: t.text }}>Claims Analysis</span>
                        </div>
                        <div style={{ padding: 12 }}>
                          <div style={{ display: 'grid', gap: 8 }}>
                            {jwtAnalysis.claims.map((claim, i) => (
                              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', background: t.bgTertiary, borderRadius: 6 }}>
                                <span style={{ fontSize: 10, color: t.textMuted, minWidth: 120 }}>{claim.key}</span>
                                <span style={{ fontSize: 10, color: t.text, fontFamily: 'monospace', flex: 1, wordBreak: 'break-all' }}>{claim.value}</span>
                                {claim.status === 'expired' && <span style={{ fontSize: 9, padding: '1px 5px', background: t.errorLight, color: t.error, borderRadius: 3 }}>Expired</span>}
                                {claim.status === 'not_yet_valid' && <span style={{ fontSize: 9, padding: '1px 5px', background: t.warningLight, color: t.warning, borderRadius: 3 }}>Not Yet</span>}
                                {claim.status === 'valid' && claim.type === 'time' && <span style={{ fontSize: 9, padding: '1px 5px', background: t.successLight, color: t.success, borderRadius: 3 }}>Valid</span>}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </>
            )}

            {/* ENCODE MODE */}
            {jwtMode === 'encode' && (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
                  {/* Header Input */}
                  <div style={{ background: t.bgSecondary, borderRadius: 10, border: `1px solid ${!jwtHeaderParsed.valid ? t.error + '60' : t.border}`, overflow: 'hidden' }}>
                    <div style={{ padding: '8px 12px', background: 'rgba(244, 114, 182, 0.1)', borderBottom: `1px solid ${t.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#f472b6' }} />
                        <span style={{ fontSize: 11, fontWeight: 600, color: t.text }}>Header</span>
                        {jwtHeaderParsed.valid && <span style={{ fontSize: 9, color: t.success, background: t.successLight, padding: '1px 5px', borderRadius: 3 }}>✓</span>}
                      </div>
                    </div>
                    <textarea value={jwtHeader} onChange={e => setJwtHeader(e.target.value)} placeholder='{"alg": "HS256", "typ": "JWT"}' style={{ width: '100%', height: 100, padding: 10, background: 'transparent', border: 'none', color: t.text, fontSize: 11, fontFamily: 'monospace', lineHeight: 1.5, resize: 'none', outline: 'none' }} spellCheck={false} />
                    {!jwtHeaderParsed.valid && <div style={{ padding: '8px 12px', background: t.errorLight, borderTop: `1px solid ${t.error}30`, color: t.error, fontSize: 10 }}>⚠ {jwtHeaderParsed.error}</div>}
                  </div>

                  {/* Payload Input */}
                  <div style={{ background: t.bgSecondary, borderRadius: 10, border: `1px solid ${!jwtPayloadParsed.valid ? t.error + '60' : t.border}`, overflow: 'hidden' }}>
                    <div style={{ padding: '8px 12px', background: 'rgba(192, 132, 252, 0.1)', borderBottom: `1px solid ${t.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#c084fc' }} />
                        <span style={{ fontSize: 11, fontWeight: 600, color: t.text }}>Payload</span>
                        {jwtPayloadParsed.valid && <span style={{ fontSize: 9, color: t.success, background: t.successLight, padding: '1px 5px', borderRadius: 3 }}>✓</span>}
                      </div>
                    </div>
                    <textarea value={jwtPayload} onChange={e => setJwtPayload(e.target.value)} placeholder='{"sub": "1234567890", "name": "John Doe"}' style={{ width: '100%', height: 100, padding: 10, background: 'transparent', border: 'none', color: t.text, fontSize: 11, fontFamily: 'monospace', lineHeight: 1.5, resize: 'none', outline: 'none' }} spellCheck={false} />
                    {!jwtPayloadParsed.valid && <div style={{ padding: '8px 12px', background: t.errorLight, borderTop: `1px solid ${t.error}30`, color: t.error, fontSize: 10 }}>⚠ {jwtPayloadParsed.error}</div>}
                  </div>
                </div>

                {/* Warning */}
                <div style={{ padding: '10px 14px', background: t.warningLight, borderRadius: 8, marginBottom: 14, border: `1px solid ${t.warning}30` }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 14 }}>⚠️</span>
                    <span style={{ fontSize: 10, color: t.warning }}>This creates an <strong>unsigned</strong> token for testing only. For production, sign tokens server-side with a secret key.</span>
                  </div>
                </div>

                {/* Generated Token */}
                {jwtEncoded?.valid && (
                  <div style={{ background: t.bgSecondary, borderRadius: 8, border: `1px solid ${t.border}`, overflow: 'hidden' }}>
                    <div style={{ padding: '8px 12px', background: t.bgTertiary, borderBottom: `1px solid ${t.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#a855f7' }} />
                        <span style={{ fontSize: 11, fontWeight: 600, color: t.text }}>Generated Token (Unsigned)</span>
                      </div>
                      <button onClick={() => copy(jwtEncoded.token, 'jwt-encoded')} style={{ padding: '3px 6px', background: t.bgHover, border: 'none', borderRadius: 3, color: copied === 'jwt-encoded' ? t.success : t.textSecondary, cursor: 'pointer', fontSize: 9 }}>{copied === 'jwt-encoded' ? '✓' : 'Copy'}</button>
                    </div>
                    <div style={{ padding: 12, fontFamily: 'monospace', fontSize: 10, lineHeight: 1.6, wordBreak: 'break-all', color: t.text }}>{jwtEncoded.token}</div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Features */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 8, marginTop: 20 }}>
          {[{ i: '🔄', t: 'JSON↔YAML', d: 'Convert formats' }, { i: '🌳', t: 'Tree Diff', d: 'Visual compare' }, { i: '✏️', t: 'Editor', d: 'Edit in tree' }, { i: '✅', t: 'Validate', d: 'Check syntax' }, { i: '🔐', t: 'JWT', d: 'Decode tokens' }, { i: '🌓', t: 'Themes', d: 'Dark & light' }].map((f, i) => (
            <div key={i} style={{ padding: 10, background: t.bgSecondary, borderRadius: 6, border: `1px solid ${t.border}` }}>
              <div style={{ fontSize: 16, marginBottom: 4 }}>{f.i}</div>
              <h3 style={{ margin: 0, fontSize: 10, fontWeight: 600, color: t.text }}>{f.t}</h3>
              <p style={{ margin: 0, fontSize: 8, color: t.textMuted }}>{f.d}</p>
            </div>
          ))}
        </div>
      </main>

      <footer style={{ padding: '12px 20px', borderTop: `1px solid ${t.border}`, marginTop: 20, textAlign: 'center' }}>
        <p style={{ margin: 0, fontSize: 9, color: t.textDim }}>JSON/YAML Toolkit • Built for developers</p>
      </footer>
    </div>
  );
}
