import React, { useState, useEffect, useRef } from 'react';
import { FactoryItem, FactoryZone, ItemCategory, ItemType, ZONE_LABELS, CATEGORY_LABELS } from './types';
import FactoryMap from './components/FactoryMap';
import StatsDashboard from './components/StatsDashboard';
import ReportForm from './components/ReportForm';
import QRScannerModal from './components/QRScannerModal';
import { QRCodeSVG } from 'qrcode.react';
import { 
  HardHat, 
  Search, 
  MapPin, 
  Plus, 
  MessageSquare, 
  Filter, 
  CheckCircle, 
  AlertTriangle, 
  Clock, 
  RefreshCw, 
  User, 
  Phone, 
  HelpCircle, 
  Sparkles, 
  Send, 
  Box, 
  ChevronRight, 
  CornerDownRight, 
  ArrowLeft,
  Settings,
  X,
  Database,
  Loader2,
  Camera,
  Printer,
  QrCode
} from 'lucide-react';

export default function App() {
  const [items, setItems] = useState<FactoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Filtering states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedZone, setSelectedZone] = useState<FactoryZone | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<ItemCategory | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'searching' | 'stored' | 'recovered'>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'lost' | 'found'>('all');

  // Interactive modes
  const [showReportModal, setShowReportModal] = useState(false);
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [selectedItem, setSelectedItem] = useState<FactoryItem | null>(null);
  const [activeTab, setActiveTab] = useState<'map' | 'stats'>('map');

  // Claim states & storage update toggles
  const [tempStoragePlace, setTempStoragePlace] = useState('');
  const [tempClaimantName, setTempClaimantName] = useState('');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  // Gemini Assistant states
  const [chatMessages, setChatMessages] = useState<{ id: string; sender: 'user' | 'assistant'; text: string; timestamp: string; predictedItems?: any[] }[]>([
    {
      id: 'init-1',
      sender: 'assistant',
      text: '¡Hola! Soy **TrackerIA**, el detector inteligente de activos de la fábrica. ¿Qué artículo estás tratando de localizar, o qué material has puesto en resguardo? Descríbeme las características para cotejarlo con el registro civil de la planta.',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [userQuery, setUserQuery] = useState('');
  const [isAssistantLoading, setIsAssistantLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Load items
  const fetchItems = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/items');
      const data = await response.json();
      if (Array.isArray(data)) {
        setItems(data);
      }
    } catch (err) {
      console.error("Error fetching items:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  // Scroll to bottom of chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, isAssistantLoading]);

  // Handle status changes (Claim item / resguard item)
  const handleUpdateItemStatus = async (itemId: string, status: 'searching' | 'stored' | 'recovered', extra: { storagePlace?: string; recoveredBy?: string }) => {
    setIsUpdatingStatus(true);
    try {
      const response = await fetch(`/api/items/${itemId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status,
          storagePlace: extra.storagePlace,
          recoveredBy: extra.recoveredBy
        })
      });

      if (response.ok) {
        const updated = await response.json();
        setItems(prev => prev.map(i => i.id === itemId ? updated : i));
        setSelectedItem(updated);
        setTempStoragePlace('');
        setTempClaimantName('');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // Submit search query directly to AI Assistant
  const handleSendQuery = async (e?: React.FormEvent, customString?: string) => {
    if (e) e.preventDefault();
    const query = customString || userQuery;
    if (!query.trim()) return;

    const userMsgId = `user-${Date.now()}`;
    const userMsg = {
      id: userMsgId,
      sender: 'user' as const,
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setChatMessages(prev => [...prev, userMsg]);
    if (!customString) setUserQuery('');
    setIsAssistantLoading(true);

    try {
      const response = await fetch('/api/gemini/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: chatMessages,
          userQuery: query
        })
      });

      const data = await response.json();
      
      const assistantMsg = {
        id: `assistant-${Date.now()}`,
        sender: 'assistant' as const,
        text: data.text || "Disculpa, no recibí respuesta coherente del procesador logístico.",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        predictedItems: data.predictedItems || []
      };

      setChatMessages(prev => [...prev, assistantMsg]);

      // Smart behavior: If Gemini suggested high-relevance map zones, auto-select the first one to help the worker!
      if (data.suggestedZones && data.suggestedZones.length > 0) {
        setSelectedZone(data.suggestedZones[0]);
      }
    } catch (err) {
      console.error(err);
      setChatMessages(prev => [...prev, {
        id: `err-${Date.now()}`,
        sender: 'assistant',
        text: '❌ Lo siento, se produjo un fallo en el servidor de enlace IA. Por favor, asegúrate de verificar tus variables de entorno o registrar manualmente el objeto.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }]);
    } finally {
      setIsAssistantLoading(false);
    }
  };

  // Quick prompt bubbles for work crew
  const quickSearches = [
    { label: "🔍 ¿Qué herramientas se perdieron hoy?", query: "busca herramientas perdidas recientemente" },
    { label: "📦 ¿Dónde se guardan los objetos encontrados?", query: "cuáles son los lugares habituales de resguardo de objetos" },
    { label: "🛡️ ¿Hay equipos de protección (EPPs) perdidos?", query: "casco arnés gafas equipo seguridad perdido" }
  ];

  // Filters logic
  const filteredItems = items.filter(item => {
    // 1. Text Query
    const queryLower = searchQuery.toLowerCase();
    const matchesText = 
      item.name.toLowerCase().includes(queryLower) ||
      item.description.toLowerCase().includes(queryLower) ||
      item.reporterName.toLowerCase().includes(queryLower) ||
      item.subLocation.toLowerCase().includes(queryLower) ||
      item.id.toLowerCase().includes(queryLower) ||
      item.tags.some(t => t.toLowerCase().includes(queryLower));

    // 2. Zone
    const matchesZone = selectedZone ? item.zone === selectedZone : true;

    // 3. Category
    const matchesCategory = selectedCategory ? item.category === selectedCategory : true;

    // 4. Status
    const matchesStatus = 
      statusFilter === 'all' ? true :
      statusFilter === 'searching' ? item.status === 'searching' :
      statusFilter === 'stored' ? item.status === 'stored' :
      item.status === 'recovered';

    // 5. Type
    const matchesType = 
      typeFilter === 'all' ? true :
      typeFilter === 'lost' ? item.type === 'lost' :
      item.type === 'found';

    return matchesText && matchesZone && matchesCategory && matchesStatus && matchesType;
  });

  // Simple Markdown translation helper to format TrackerIA responses nicely
  const parseMarkdownText = (text: string) => {
    const lines = text.split('\n');
    return lines.map((line, idx) => {
      let isBullet = line.trim().startsWith('-') || line.trim().startsWith('•');
      let cleaned = line;
      if (isBullet) {
        cleaned = line.replace(/^[-•]\s*/, '');
      }

      // Handle bold keys
      const parts = cleaned.split('**');
      const processBold = parts.map((part, i) => {
        if (i % 2 === 1) {
          return <strong key={i} className="text-yellow-450 font-extrabold">{part}</strong>;
        }
        
        // Handle italic keys
        const italicParts = part.split('_');
        return italicParts.map((subPart, j) => {
          if (j % 2 === 1) {
            return <em key={j} className="text-slate-300 italic">{subPart}</em>;
          }
          return subPart;
        });
      });

      if (isBullet) {
        return (
          <li key={idx} className="ml-4 list-disc text-xs text-slate-350 py-0.5 leading-relaxed">
            {processBold}
          </li>
        );
      }

      // Check for headings
      if (line.trim().startsWith('###')) {
        return <h5 key={idx} className="text-xs font-bold text-slate-200 uppercase tracking-wide mt-3 mb-1">{line.replace('###', '')}</h5>;
      }
      if (line.trim().startsWith('##')) {
        return <h4 key={idx} className="text-sm font-bold text-blue-400 mt-4 mb-2">{line.replace('##', '')}</h4>;
      }
      if (line.trim().startsWith('#')) {
        return <h3 key={idx} className="text-base font-bold text-slate-100 mt-4 mb-2">{line.replace('#', '')}</h3>;
      }

      return <p key={idx} className="text-xs text-slate-300 leading-relaxed mb-2 min-h-[12px]">{processBold}</p>;
    });
  };

  return (
    <div id="app-root-container" className="w-full h-screen bg-slate-950 text-slate-200 font-sans flex overflow-hidden">
      
      {/* SIDEBAR NAVIGATION - Sleek high-tech sidebar matching instructions exactly */}
      <nav id="sidebar-navigation" className="w-20 hidden md:flex flex-col items-center py-6 bg-slate-900 border-r border-slate-800 shrink-0">
        {/* App Logo */}
        <div id="sidebar-logo" className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center mb-10 shadow-lg shadow-blue-500/10 border border-blue-500/20">
          <HardHat className="w-6 h-6 text-slate-100 animate-pulse" />
        </div>

        {/* Action icons menu list */}
        <div id="sidebar-icons-list" className="space-y-6 flex-1 flex flex-col items-center">
          
          <button 
            id="tab-map-btn"
            onClick={() => { setActiveTab('map'); setSelectedZone(null); }}
            title="Plano de Fábrica"
            className={`p-3 rounded-xl transition-all cursor-pointer ${
              activeTab === 'map' && !selectedZone
                ? 'text-blue-400 bg-blue-500/10 border border-blue-500/20' 
                : 'text-slate-500 hover:text-slate-350 hover:bg-slate-800/40'
            }`}
          >
            <MapPin className="w-5 h-5" />
          </button>

          <button 
            id="tab-stats-btn"
            onClick={() => { setActiveTab('stats'); }}
            title="Métricas de Pérdida"
            className={`p-3 rounded-xl transition-all cursor-pointer ${
              activeTab === 'stats'
                ? 'text-blue-400 bg-blue-500/10 border border-blue-500/20' 
                : 'text-slate-500 hover:text-slate-350 hover:bg-slate-800/40'
            }`}
          >
            <Database className="w-5 h-5" />
          </button>

          {/* Spacer */}
          <div className="w-8 h-px bg-slate-800 my-4"></div>

          <button 
            id="clear-filters-shortcut"
            onClick={() => {
              setSelectedZone(null);
              setSelectedCategory(null);
              setSearchQuery('');
              setStatusFilter('all');
              setTypeFilter('all');
            }}
            title="Limpiar Filtros"
            className="p-3 rounded-xl text-slate-500 hover:text-white hover:bg-slate-800/50 transition-all cursor-pointer"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>

        {/* User profile details at footer */}
        <div id="sidebar-footer" className="mt-auto flex flex-col items-center gap-4">
          <div className="p-2.5 rounded-xl text-slate-600 hover:text-slate-400 cursor-pointer">
            <Settings className="w-5 h-5" />
          </div>
          <div id="user-profile-avatar" className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold text-slate-300 shadow-inner" title="cespinosad@gmail.com">
            SE
          </div>
        </div>
      </nav>

      {/* DETAILED BODY CONTENT */}
      <div id="main-content-layout" className="flex-1 flex flex-col overflow-hidden">
        
        {/* HEADER AREA */}
        <header id="primary-header" className="h-20 shrink-0 flex items-center justify-between px-6 bg-slate-950/70 backdrop-blur-md border-b border-slate-800">
          <div id="header-brand">
            <h1 className="text-base md:text-lg font-bold tracking-tight text-white flex items-center gap-2">
              <span className="md:hidden">🏭</span>
              <span>Localizador de Activos de Fábrica</span>
              <span className="hidden sm:inline-block bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[10px] uppercase font-bold px-2 py-0.5 rounded tracking-widest font-mono">Planta Central</span>
            </h1>
            <p className="text-[11px] text-slate-500 font-medium">Logística Inteligente de Objetos Perdidos y Devueltos</p>
          </div>

          <div id="header-actions" className="flex items-center gap-3">
            {/* Scan QR button */}
            <button
              id="qr-scan-header-btn"
              onClick={() => setShowQRScanner(true)}
              className="bg-slate-900 hover:bg-slate-800 active:bg-slate-950 text-slate-200 border border-slate-700/60 px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Camera className="w-4 h-4 text-blue-400" />
              <span>Escanear QR de Activo</span>
            </button>

            {/* Rapid reporting button */}
            <button
              id="report-lost-header-btn"
              onClick={() => setShowReportModal(true)}
              className="bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-slate-100 px-4 py-2 rounded-lg text-xs font-bold transition-all shadow-lg shadow-blue-500/15 flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Reportar Incidencia</span>
            </button>
          </div>
        </header>

        {/* SCROLLABLE GRID CONTAINER SPLIT IN COLUMN AND SIDE CHAT PANEL */}
        <div id="workspace-grid" className="flex-1 flex overflow-hidden">
          
          {/* LEFT-SIDE MASTER CONTROLS & GRID TABLE */}
          <div id="main-scroller-area" className="flex-1 overflow-y-auto p-6 space-y-6">
            
            {/* Active Tab options (Mobile and Quick Switching) */}
            <div className="flex items-center justify-between bg-slate-900/40 p-1 rounded-xl border border-slate-800/70">
              <div className="flex gap-1.5">
                <button
                  id="tab-view-map-btn"
                  onClick={() => setActiveTab('map')}
                  className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    activeTab === 'map' 
                      ? 'bg-slate-800 text-slate-100 border border-slate-700/60' 
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <MapPin className="w-3.5 h-3.5" />
                  <span>Plano del Piso</span>
                </button>
                <button
                  id="tab-view-stats-btn"
                  onClick={() => setActiveTab('stats')}
                  className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    activeTab === 'stats' 
                      ? 'bg-slate-800 text-slate-100 border border-slate-700/60' 
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Database className="w-3.5 h-3.5" />
                  <span>Métricas y Estadísticas</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button 
                  id="refresh-database-btn"
                  onClick={fetchItems}
                  className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800/40 transition-colors cursor-pointer"
                  title="Sincronizar base de datos"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>

            {/* CONDITIONAL TAB RENDER (Map layout or stats charts bento) */}
            {activeTab === 'map' ? (
              <FactoryMap 
                items={items} 
                selectedZone={selectedZone} 
                onSelectZone={(zone) => {
                  setSelectedZone(zone);
                  // Highlight zone in list filters too
                }} 
              />
            ) : (
              <StatsDashboard 
                items={items} 
                selectedCategory={selectedCategory} 
                onSelectCategory={setSelectedCategory} 
              />
            )}

            {/* MASTER DATABASE REGISTER SECTION (Filters + Database Table) */}
            <div id="assets-management-section" className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
              <div className="p-5 border-b border-slate-800 bg-slate-900/60 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                    <Box className="w-4 h-4 text-slate-400" />
                    <span>Registro Oficial de Movimientos e Incidencias</span>
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5 font-normal">Inventario activo de herramientas extraviadas y resguardos seguros.</p>
                </div>

                {/* Reset Filters alert */}
                {(selectedZone || selectedCategory || searchQuery || statusFilter !== 'all' || typeFilter !== 'all') && (
                  <button
                    id="reset-filters-table-btn"
                    onClick={() => {
                      setSelectedZone(null);
                      setSelectedCategory(null);
                      setSearchQuery('');
                      setStatusFilter('all');
                      setTypeFilter('all');
                    }}
                    className="text-[10.5px] font-bold text-blue-400 hover:underline px-2.5 py-1 rounded bg-blue-500/5 border border-blue-500/10 cursor-pointer self-start"
                  >
                    X Limpiar filtros activos
                  </button>
                )}
              </div>

              {/* SEARCH BAR & GENERAL ADVANCED FILTERS TRAY */}
              <div className="p-4 bg-slate-950/40 border-b border-slate-800 grid grid-cols-1 sm:grid-cols-12 gap-3">
                {/* Search Bar Input */}
                <div className="sm:col-span-4 relative">
                  <span className="absolute inset-y-0 left-3 flex items-center text-slate-500 pointer-events-none">
                    <Search className="w-3.5 h-3.5" />
                  </span>
                  <input
                    id="search-assets-input"
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Buscar por ID, nombre, etiqueta..."
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-9 pr-4 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-200 placeholder:text-slate-650"
                  />
                  {searchQuery && (
                    <button 
                      onClick={() => setSearchQuery('')}
                      className="absolute inset-y-0 right-3 flex items-center text-slate-500 hover:text-slate-350"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>

                {/* Type Filter selector */}
                <div className="sm:col-span-3">
                  <select
                    id="type-filter-select"
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value as any)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-300 focus:outline-none cursor-pointer"
                  >
                    <option value="all">Filtro: Todo Tipo</option>
                    <option value="lost">🔴 Solo Perdidos (Extraviados)</option>
                    <option value="found">🟢 Solo Encontrados (En Resguardo)</option>
                  </select>
                </div>

                {/* Status Filter selector */}
                <div className="sm:col-span-3">
                  <select
                    id="status-filter-select"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as any)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-300 focus:outline-none cursor-pointer"
                  >
                    <option value="all">Filtro: Cualquier Estado</option>
                    <option value="searching">🔍 En Búsqueda Activa</option>
                    <option value="stored">📦 Guardado en Custodia</option>
                    <option value="recovered">✅ Devuelto al Dueño</option>
                  </select>
                </div>

                {/* Stats categories label list */}
                <div className="sm:col-span-2 flex items-center justify-end text-right">
                  <span className="text-[10px] text-slate-500 font-bold font-mono">
                    Filtrados: {filteredItems.length} / {items.length}
                  </span>
                </div>
              </div>

              {/* LIST CONTROLS FOR ACTIVE SELECTED PILLS */}
              {(selectedZone || selectedCategory) && (
                <div className="px-5 py-2.5 bg-slate-900/20 border-b border-slate-800/80 flex flex-wrap gap-2 items-center">
                  <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider font-mono">Pills de filtro:</span>
                  {selectedZone && (
                    <span className="bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded text-[10.5px] font-semibold flex items-center gap-1.5">
                      <span>Planta: {ZONE_LABELS[selectedZone]}</span>
                      <button onClick={() => setSelectedZone(null)}><X className="w-2.5 h-2.5" /></button>
                    </span>
                  )}
                  {selectedCategory && (
                    <span className="bg-purple-500/10 text-purple-400 border border-purple-500/20 px-2 py-0.5 rounded text-[10.5px] font-semibold flex items-center gap-1.5">
                      <span>Categoría: {CATEGORY_LABELS[selectedCategory]}</span>
                      <button onClick={() => setSelectedCategory(null)}><X className="w-2.5 h-2.5" /></button>
                    </span>
                  )}
                </div>
              )}

              {/* TABLE CONTAINER REPRESENTATION */}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="text-[10.5px] font-bold text-slate-500 uppercase border-b border-slate-800 bg-slate-950/30">
                    <tr>
                      <th className="px-5 py-3.5">ID / Código</th>
                      <th className="px-5 py-3.5">Artículo / Categoría</th>
                      <th className="px-5 py-3.5">Planta / Ubicación</th>
                      <th className="px-5 py-3.5">Fecha Reporte</th>
                      <th className="px-5 py-3.5">Persona a Contactar</th>
                      <th className="px-5 py-3.5 text-center">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 text-xs">
                    {filteredItems.map((item) => {
                      let statusBadge = null;
                      if (item.status === 'searching') {
                        statusBadge = <span className="px-2 py-1 rounded bg-red-950/50 text-red-400 border border-red-900/30 text-[9.5px] font-extrabold uppercase font-mono">BÚSQUEDA</span>;
                      } else if (item.status === 'stored') {
                        statusBadge = <span className="px-2 py-1 rounded bg-amber-950/50 text-amber-400 border border-amber-900/30 text-[9.5px] font-extrabold uppercase font-mono">RESGUARDADO</span>;
                      } else {
                        statusBadge = <span className="px-2 py-1 rounded bg-emerald-990/40 text-emerald-400 border border-emerald-900/20 text-[9.5px] font-extrabold uppercase font-mono">DEVUELTO</span>;
                      }

                      const rowSelected = selectedItem?.id === item.id;

                      return (
                        <tr 
                          key={item.id}
                          onClick={() => setSelectedItem(item)}
                          className={`hover:bg-slate-850/40 transition-colors cursor-pointer ${
                            rowSelected ? 'bg-slate-800/50 border-l-2 border-l-blue-500' : ''
                          }`}
                        >
                          <td className="px-5 py-4 font-mono font-bold text-slate-300">
                            {item.id}
                          </td>
                          <td className="px-5 py-4">
                            <div className="font-semibold text-slate-200">{item.name}</div>
                            <div className="text-[10px] text-slate-500 mt-0.5">{CATEGORY_LABELS[item.category]}</div>
                          </td>
                          <td className="px-5 py-4">
                            <div className="font-medium text-slate-300">{ZONE_LABELS[item.zone]}</div>
                            <div className="text-[10px] text-slate-500 mt-0.5 truncate max-w-[180px]">{item.subLocation}</div>
                          </td>
                          <td className="px-5 py-4 text-slate-450 font-mono text-[11px]">
                            {new Date(item.date).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                          </td>
                          <td className="px-5 py-4">
                            <div className="font-medium text-slate-300">{item.reporterName}</div>
                            {item.reporterContact && <div className="text-[10.5px] text-slate-550 font-mono mt-0.5">{item.reporterContact}</div>}
                          </td>
                          <td className="px-5 py-4 text-center">
                            {statusBadge}
                          </td>
                        </tr>
                      );
                    })}

                    {filteredItems.length === 0 && (
                      <tr id="empty-state-row">
                        <td colSpan={6} className="px-5 py-12 text-center">
                          <div className="max-w-xs mx-auto space-y-2">
                            <HelpCircle className="w-8 h-8 text-slate-650 mx-auto" />
                            <h4 className="text-xs font-bold text-slate-350 uppercase">No hay registros coincidentes</h4>
                            <p className="text-[11px] text-slate-550">Prueba ajustando los filtros superiores o consulta con nuestro asistente virtual TrackerIA.</p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>

          {/* RIGHT SIDEBAR PANEL - Gemini Chat Log Assistant TrackerIA */}
          <div 
            id="assistant-sidebar" 
            className="w-full lg:w-96 border-l border-slate-800 bg-slate-900/90 flex flex-col shrink-0 overflow-hidden relative z-10"
          >
            {/* Header of Asistente */}
            <div className="px-5 py-4 border-b border-slate-800 bg-slate-950/30 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/25 flex items-center justify-center text-blue-400">
                  <Sparkles className="w-4 h-4 text-blue-400 animate-pulse" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-100 uppercase tracking-widest font-mono">TrackerIA CO-PILOTO</h4>
                  <p className="text-[10px] text-emerald-400 flex items-center gap-1 mt-0.5 font-bold">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                    <span>Gemini 3.5 Flash Activo</span>
                  </p>
                </div>
              </div>
              
              <button 
                id="reset-chat-btn" 
                onClick={() => setChatMessages([
                  {
                    id: 'init-1',
                    sender: 'assistant',
                    text: '¡Hola! Soy **TrackerIA**, el detector inteligente de activos de la fábrica. ¿Qué artículo estás tratando de localizar, o qué material has puesto en resguardo? Descríbeme las características para cotejarlo con el registro civil de la planta.',
                    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                  }
                ])}
                title="Limpiar Conversación"
                className="text-slate-500 hover:text-slate-350 hover:bg-slate-800 p-1 rounded transition-colors cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* MESSAGE ROOM STREAM */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {chatMessages.map((msg) => (
                <div 
                  key={msg.id} 
                  className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
                >
                  <div className={`text-[10px] text-slate-500 font-mono mb-1 ${msg.sender === 'user' ? 'mr-1' : 'ml-1'}`}>
                    {msg.sender === 'user' ? 'Trabajador' : 'TrackerIA'} • {msg.timestamp}
                  </div>
                  
                  <div className={`p-3.5 rounded-2xl max-w-[90%] text-xs shadow ${
                    msg.sender === 'user' 
                      ? 'bg-blue-600 text-slate-100 rounded-tr-none' 
                      : 'bg-slate-950 border border-slate-800 rounded-tl-none text-slate-205'
                  }`}>
                    {parseMarkdownText(msg.text)}

                    {/* Grounded matches blocks triggered inside Gemini Assistant message */}
                    {msg.predictedItems && msg.predictedItems.length > 0 && (
                      <div className="mt-3.5 pt-3 border-t border-slate-850 space-y-2">
                        <div className="text-[10.5px] font-bold text-slate-400 flex items-center gap-1">
                          <Search className="w-3 h-3 text-yellow-400" />
                          <span>COINCIDENCIAS ENCONTRADAS EN CUSTODIA:</span>
                        </div>
                        
                        <div className="space-y-2">
                          {msg.predictedItems.map((pi: any, idx: number) => {
                            const matchItem = pi.item as FactoryItem;
                            
                            return (
                              <button
                                key={idx}
                                onClick={() => setSelectedItem(matchItem)}
                                className="w-full text-left p-2.5 bg-slate-900 hover:bg-slate-850/60 transition-all border border-slate-800 rounded-lg flex items-start justify-between gap-2.5 cursor-pointer group"
                              >
                                <div>
                                  <div className="font-semibold text-slate-100 group-hover:text-blue-400 transition-colors text-xs">{matchItem.name}</div>
                                  <div className="text-[10px] text-slate-500 mt-0.5">Ubicado en: {ZONE_LABELS[matchItem.zone]}</div>
                                  {matchItem.storagePlace && (
                                    <div className="text-[10px] text-emerald-400 mt-1 font-semibold flex items-center gap-1">
                                      <span>✅ Resguardado en:</span>
                                      <span className="underline">{matchItem.storagePlace}</span>
                                    </div>
                                  )}
                                </div>
                                <span className={`text-[9px] font-bold uppercase font-mono px-1.5 py-0.5 rounded ${
                                  pi.confidence === 'high' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'
                                }`}>
                                  {pi.confidence === 'high' ? 'Alta' : 'Media'}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {isAssistantLoading && (
                <div className="flex items-center gap-2.5 text-xs text-slate-500 pl-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-400" />
                  <span>TrackerIA está cotejando la base de datos de la fábrica...</span>
                </div>
              )}
              
              <div ref={chatEndRef} />
            </div>

            {/* QUICK PRE-SET SHORTCUTS */}
            <div className="p-3 border-t border-slate-800 space-y-1 bg-slate-950/15">
              <div className="text-[9.5px] font-bold text-slate-550 uppercase tracking-widest font-mono select-none">Consultas rápidas:</div>
              <div className="flex flex-col gap-1.5">
                {quickSearches.map((qs, i) => (
                  <button
                    key={i}
                    onClick={() => handleSendQuery(undefined, qs.query)}
                    className="text-left text-[10.5px] bg-slate-950 hover:bg-slate-900 border border-slate-800/60 px-2.5 py-1.5 rounded-lg text-slate-400 hover:text-slate-200 transition-colors cursor-pointer block truncate"
                  >
                    {qs.label}
                  </button>
                ))}
              </div>
            </div>

            {/* ENTER SEARCH CHAT CONSOLE */}
            <form onSubmit={handleSendQuery} className="p-3 border-t border-slate-800 bg-slate-950/40">
              <div className="relative">
                <input
                  id="assistant-chat-input"
                  type="text"
                  value={userQuery}
                  onChange={(e) => setUserQuery(e.target.value)}
                  placeholder="Escribe al asistente (ej. Busco mi calibre de precisión)..."
                  className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-lg pl-3 pr-10 py-2.5 text-xs text-slate-200 placeholder:text-slate-650 focus:outline-none"
                />
                <button
                  id="send-chat-message-btn"
                  type="submit"
                  disabled={!userQuery.trim() || isAssistantLoading}
                  className="absolute inset-y-1.5 right-1.5 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-650 text-slate-100 p-1.5 rounded-md transition-colors cursor-pointer flex items-center justify-center"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>
            </form>
          </div>

        </div>

        {/* DETAILED MODAL / DRAWER FOR SELECTED ITEM DETAILS (CLAIMING OPTIONS) */}
        {selectedItem && (
          <div id="item-details-drawer-overlay" className="fixed inset-0 z-40 flex justify-end bg-slate-950/60 backdrop-blur-xs">
            <div 
              id="item-details-drawer" 
              className="w-full max-w-md bg-slate-900 border-l border-slate-850 h-full p-6 shadow-2xl overflow-y-auto flex flex-col animate-in slide-in-from-right duration-250 text-slate-200"
            >
              
              {/* Drawer Top Navigation */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <span className="font-mono text-xs font-bold text-slate-500 uppercase tracking-widest">
                  Ficha de Activo {selectedItem.id}
                </span>
                <button 
                  id="close-drawer-btn"
                  onClick={() => { setSelectedItem(null); setTempStoragePlace(''); setTempClaimantName(''); }}
                  className="text-slate-400 hover:text-slate-100 p-1 rounded-lg hover:bg-slate-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Status Indicator */}
              <div className="mt-5">
                <div className="flex items-center gap-2">
                  <span className={`inline-block w-2.5 h-2.5 rounded-full ${
                    selectedItem.status === 'searching' 
                      ? 'bg-red-500 animate-pulse' 
                      : (selectedItem.status === 'stored' ? 'bg-amber-500 animate-pulse' : 'bg-emerald-555')
                  }`}></span>
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-300 font-mono">
                    Estado: {
                      selectedItem.status === 'searching' ? '⚠️ extraviado / búsqueda activa' :
                      selectedItem.status === 'stored' ? '📦 resguardado en custodia' : '✅ entregado y resuelto'
                    }
                  </p>
                </div>
              </div>

              {/* core details */}
              <div className="mt-6 space-y-4">
                <div>
                  <h3 className="text-base font-extrabold text-white">{selectedItem.name}</h3>
                  <p className="text-xs text-blue-400 font-medium">{CATEGORY_LABELS[selectedItem.category]}</p>
                </div>

                <div className="bg-slate-950/55 border border-slate-850 p-3.5 rounded-xl space-y-2.5">
                  <div className="text-xs text-slate-400">
                    <span className="font-bold text-slate-500 font-mono block uppercase text-[10px] tracking-widest mb-0.5">Lugar de pérdida / hallazgo:</span>
                    <span className="font-semibold text-slate-200 text-xs block">{ZONE_LABELS[selectedItem.zone]}</span>
                    <span className="text-slate-400 leading-relaxed block mt-0.5">Detalle: {selectedItem.subLocation}</span>
                  </div>

                  {selectedItem.storagePlace && (
                    <div className="text-xs border-t border-slate-900/60 pt-2 bg-emerald-950/10 p-2 rounded border border-emerald-990/30">
                      <span className="font-bold text-emerald-400 font-mono block uppercase text-[9px] tracking-widest mb-0.5">Lugar de resguardo seguro:</span>
                      <span className="font-bold text-slate-205">{selectedItem.storagePlace}</span>
                    </div>
                  )}

                  {selectedItem.recoveredBy && (
                    <div className="text-xs border-t border-slate-900/60 pt-2 bg-blue-950/10 p-2 rounded border border-blue-995/30">
                      <span className="font-bold text-blue-400 font-mono block uppercase text-[9px] tracking-widest mb-0.5">Entregado a:</span>
                      <span className="font-bold text-slate-205">{selectedItem.recoveredBy}</span>
                      {selectedItem.recoveryDate && (
                        <span className="block text-[10px] text-slate-500 mt-0.5 font-mono">
                          Fecha de entrega: {new Date(selectedItem.recoveryDate).toLocaleString()}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <div>
                  <span className="font-bold text-slate-500 font-mono block uppercase text-[9.5px] tracking-widest mb-1">Descripción:</span>
                  <p className="text-xs text-slate-350 bg-slate-950/20 p-3 rounded-lg border border-slate-850/80 leading-relaxed italic">
                    "{selectedItem.description}"
                    {!selectedItem.description && "Sin descripción detallada disponible."}
                  </p>
                </div>

                {/* Metadata tags */}
                <div>
                  <span className="font-bold text-slate-500 font-mono block uppercase text-[9.5px] tracking-widest mb-1.5">Metadatos / Tags del clasificador:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedItem.tags.map((tag) => (
                      <span key={tag} className="text-[10px] font-mono font-semibold bg-slate-950 text-slate-400 px-2 py-0.5 border border-slate-850 rounded">
                        #{tag}
                      </span>
                    ))}
                    {selectedItem.tags.length === 0 && <span className="text-[10px] text-slate-600">Sin etiquetas</span>}
                  </div>
                </div>

                {/* QR Code and Tag Printing Block */}
                <div className="bg-slate-950/60 border border-slate-850 p-4 rounded-xl space-y-3.5">
                  <div>
                    <h4 className="text-[10px] font-bold text-slate-350 uppercase tracking-widest font-mono flex items-center gap-1.5">
                      <QrCode className="w-4 h-4 text-blue-400" />
                      <span>Etiqueta Física QR de Activo</span>
                    </h4>
                    <p className="text-[9.5px] text-slate-500 mt-1 leading-normal">Lleva el registro digital contigo e identifica el activo adhiriéndole un código QR impreso.</p>
                  </div>
                  
                  <div className="flex items-center gap-4 bg-slate-950 p-3 rounded-lg border border-slate-900/40">
                    <div className="bg-white p-2 rounded-lg shrink-0">
                      <QRCodeSVG value={selectedItem.id} size={76} />
                    </div>
                    <div className="flex-1 space-y-1 overflow-hidden">
                      <span className="block text-[10.5px] font-mono font-bold text-yellow-405">{selectedItem.id}</span>
                      <span className="block text-xs font-bold text-slate-250 truncate">{selectedItem.name}</span>
                      <span className="block text-[9.5px] text-slate-500 leading-tight">Sector: {ZONE_LABELS[selectedItem.zone]}</span>
                      
                      <button
                        onClick={() => {
                          const printWindow = window.open('', '_blank');
                          if (printWindow) {
                            printWindow.document.write(`
                              <html>
                                <head>
                                  <title>Etiqueta QR - ${selectedItem.id}</title>
                                  <style>
                                    body {
                                      font-family: 'Courier New', Courier, monospace;
                                      padding: 20px;
                                      text-align: center;
                                      background-color: #fff;
                                      color: #000;
                                    }
                                    .container {
                                      border: 3px double #000;
                                      padding: 15px;
                                      display: inline-block;
                                      text-align: left;
                                      max-width: 320px;
                                    }
                                    .title {
                                      font-size: 14px;
                                      font-weight: bold;
                                      text-transform: uppercase;
                                      border-bottom: 2px solid #000;
                                      padding-bottom: 5px;
                                      margin-bottom: 10px;
                                    }
                                    .id-badge {
                                      font-size: 20px;
                                      font-weight: bold;
                                      margin-bottom: 8px;
                                      letter-spacing: 2px;
                                    }
                                    .field {
                                      font-size: 11px;
                                      margin: 4px 0;
                                    }
                                    .qr-container {
                                      text-align: center;
                                      margin-top: 15px;
                                    }
                                    .footer {
                                      font-size: 9px;
                                      text-align: center;
                                      border-top: 1px dashed #000;
                                      margin-top: 12px;
                                      padding-top: 5px;
                                    }
                                    svg {
                                      max-width: 140px;
                                    }
                                  </style>
                                </head>
                                <body>
                                  <div class="container">
                                    <div class="title">Rastreador de Activos G10</div>
                                    <div class="id-badge">${selectedItem.id}</div>
                                    <div class="field"><b>ELEMENTO:</b> ${selectedItem.name}</div>
                                    <div class="field"><b>SECTOR:</b> ${ZONE_LABELS[selectedItem.zone]}</div>
                                    <div class="field"><b>AÑO REG.:</b> ${new Date().getFullYear()}</div>
                                    <div class="qr-container">
                                      <div id="qr-target"></div>
                                    </div>
                                    <div class="footer">Escanear para actualizar estado • Planta Central</div>
                                  </div>
                                  <script>
                                    document.getElementById('qr-target').innerHTML = '${document.getElementById('drawer-active-qr')?.innerHTML || ""}';
                                    window.onload = function() { window.print(); window.close(); }
                                  </script>
                                </body>
                              </html>
                            `);
                            printWindow.document.close();
                          } else {
                            alert("Habilita las ventanas emergentes en tu navegador para poder imprimir la etiqueta del QR.");
                          }
                        }}
                        className="bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-350 text-[10px] font-bold px-2.5 py-1 rounded transition-colors inline-flex items-center gap-1 cursor-pointer mt-1"
                      >
                        <Printer className="w-3 h-3 text-slate-400" />
                        <span>Imprimir Etiqueta</span>
                      </button>
                    </div>
                  </div>
                  
                  {/* Embedded high resolution QR SVG for cloning inside print window */}
                  <div className="hidden" id="drawer-active-qr">
                    <QRCodeSVG value={selectedItem.id} size={150} level="H" />
                  </div>
                </div>

                {/* Contact Card */}
                <div className="pt-4 border-t border-slate-850 space-y-2">
                  <span className="font-bold text-slate-400 font-mono block uppercase text-[9.5px] tracking-widest">Información de Enlace:</span>
                  
                  <div className="grid grid-cols-2 gap-2 bg-slate-950 p-3 rounded-xl border border-slate-850/50">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-slate-550" />
                      <div>
                        <span className="text-[9.5px] text-slate-500 font-mono block uppercase">Reportero</span>
                        <span className="text-xs font-bold text-slate-300">{selectedItem.reporterName}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-slate-550" />
                      <div>
                        <span className="text-[9.5px] text-slate-500 font-mono block uppercase">Contacto</span>
                        <span className="text-xs font-bold text-slate-300">{selectedItem.reporterContact || "No proveído"}</span>
                      </div>
                    </div>
                  </div>
                </div>

              </div>

              {/* ACTION CENTER - Dynamic status transition controls */}
              <div className="mt-8 pt-5 border-t border-slate-850 space-y-4">
                
                {/* Scenario 1: Item is Lost -> Transition into Stored (Found by someone) */}
                {selectedItem.status === 'searching' && (
                  <div className="bg-amber-950/15 border border-amber-900/30 p-4 rounded-xl space-y-3.5">
                    <div className="text-xs">
                      <h4 className="font-bold text-amber-400 flex items-center gap-1.5 font-mono text-[10px] uppercase">
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span>¿Lo has encontrado tú?</span>
                      </h4>
                      <p className="text-slate-400 text-[10.5px] mt-1">Si tienes esta herramienta o artículo contigo, por favor resguárdala e ingresa el casillero o estante específico para avisar a su reportero.</p>
                    </div>

                    <div className="space-y-2">
                      <input
                        id="drawer-storage-input"
                        type="text"
                        value={tempStoragePlace}
                        onChange={(e) => setTempStoragePlace(e.target.value)}
                        placeholder="Ej. Oficina de Almacén, Bandeja 4"
                        className="w-full bg-slate-950 border border-slate-850 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 placeholder:text-slate-650 focus:outline-none"
                      />
                      <button
                        id="confirm-found-action-btn"
                        onClick={() => handleUpdateItemStatus(selectedItem.id, 'stored', { storagePlace: tempStoragePlace || 'Recepción General de Fábrica' })}
                        disabled={isUpdatingStatus}
                        className="w-full bg-amber-600 hover:bg-amber-500 active:bg-amber-700 disabled:opacity-50 text-slate-100 font-bold py-2 rounded-lg text-xs transition-colors cursor-pointer text-center"
                      >
                        {isUpdatingStatus ? 'Guardándolo...' : 'Sí, lo encontré y lo he resguardado'}
                      </button>
                    </div>
                  </div>
                )}

                {/* Scenario 2: Item is Stored -> Transition into Recovered (Owner picked it up) */}
                {selectedItem.status === 'stored' && (
                  <div className="bg-emerald-950/10 border border-emerald-900/20 p-4 rounded-xl space-y-3.5">
                    <div className="text-xs">
                      <h4 className="font-bold text-emerald-400 flex items-center gap-1.5 font-mono text-[10px] uppercase">
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span>Devolver al propietario</span>
                      </h4>
                      <p className="text-slate-400 text-[10.5px] mt-1">Confirma que el propietario legítimo ha venido a retirar el objeto del resguardo.</p>
                    </div>

                    <div className="space-y-2">
                      <input
                        id="drawer-owner-claimant-input"
                        type="text"
                        value={tempClaimantName}
                        onChange={(e) => setTempClaimantName(e.target.value)}
                        placeholder="Escribe el nombre de quien lo retira"
                        className="w-full bg-slate-950 border border-slate-850 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 placeholder:text-slate-650 focus:outline-none"
                      />
                      <button
                        id="confirm-devuelto-action-btn"
                        onClick={() => handleUpdateItemStatus(selectedItem.id, 'recovered', { recoveredBy: tempClaimantName || 'Empleado en Planta' })}
                        disabled={isUpdatingStatus}
                        className="w-full bg-emerald-600 hover:bg-emerald-555 active:bg-emerald-700 disabled:opacity-50 text-slate-100 font-bold py-2 rounded-lg text-xs transition-colors cursor-pointer text-center"
                      >
                        {isUpdatingStatus ? 'Procesando...' : 'Confirmar entrega realizada'}
                      </button>
                    </div>
                  </div>
                )}

                {/* Info and helper details */}
                <div className="text-[10.5px] text-slate-500 text-center font-mono">
                  Sincronizado con TrackerIA de Planta G10
                </div>

              </div>

            </div>
          </div>
        )}

      </div>

      {/* REPORT FORM MODAL (lost or found dialog) */}
      {showReportModal && (
        <ReportForm 
          onClose={() => setShowReportModal(false)} 
          onSubmitSuccess={(newItem) => {
            setItems(prev => [newItem, ...prev]);
            setShowReportModal(false);
            setSelectedItem(newItem); // focus on newly reported tool
          }}
        />
      )}

      {/* QR SCANNER & SIMULATOR MODAL */}
      {showQRScanner && (
        <QRScannerModal 
          onClose={() => setShowQRScanner(false)} 
          items={items}
          onSelectItem={(item) => setSelectedItem(item)}
        />
      )}

    </div>
  );
}
