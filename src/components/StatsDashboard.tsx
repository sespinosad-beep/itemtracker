import React from 'react';
import { FactoryItem, CATEGORY_LABELS, ItemCategory, FactoryZone, ZONE_LABELS } from '../types';
import { Package, AlertTriangle, CheckSquare, Layers, Sparkles, TrendingUp } from 'lucide-react';

interface StatsDashboardProps {
  items: FactoryItem[];
  onSelectCategory: (category: ItemCategory | null) => void;
  selectedCategory: ItemCategory | null;
}

export default function StatsDashboard({ items, onSelectCategory, selectedCategory }: StatsDashboardProps) {
  // Metrics calculation
  const totalReports = items.length;
  const lostSearching = items.filter(i => i.type === 'lost' && i.status === 'searching').length;
  const foundStored = items.filter(i => i.type === 'found' && i.status === 'stored').length;
  const recoveredCount = items.filter(i => i.status === 'recovered').length;

  const recoveryRate = totalReports > 0 
    ? Math.round(((recoveredCount + (totalReports - lostSearching - foundStored - recoveredCount)) / totalReports) * 100) 
    : 0;

  // Group by Category helper
  const categoryStats = Object.keys(CATEGORY_LABELS).map((catKey) => {
    const key = catKey as ItemCategory;
    const catItems = items.filter(i => i.category === key);
    const lost = catItems.filter(i => i.type === 'lost' && i.status === 'searching').length;
    const found = catItems.filter(i => i.type === 'found' && i.status === 'stored').length;
    const recovered = catItems.filter(i => i.status === 'recovered').length;
    
    return {
      key,
      name: CATEGORY_LABELS[key],
      total: catItems.length,
      lost,
      found,
      recovered,
      percentage: totalReports > 0 ? Math.round((catItems.length / totalReports) * 100) : 0,
    };
  }).sort((a, b) => b.total - a.total);

  // Group by Zone helper
  const zoneStats = Object.keys(ZONE_LABELS).map((zoneKey) => {
    const key = zoneKey as FactoryZone;
    const zoneItems = items.filter(i => i.zone === key);
    const total = zoneItems.length;
    const active = zoneItems.filter(i => i.status !== 'recovered').length;
    return {
      key,
      name: ZONE_LABELS[key],
      total,
      active,
    };
  }).sort((a, b) => b.active - a.active);

  return (
    <div id="stats-dashboard-container" className="space-y-6">
      {/* 4-Column Key Metric Counters */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Card 1: Lost - Searching */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex items-center gap-4 shadow-md">
          <div className="p-3.5 bg-red-950/45 text-red-400 rounded-xl border border-red-900/30">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Búsqueda Activa</p>
            <p className="text-2xl font-bold mt-1 text-slate-100">{lostSearching}</p>
            <p className="text-[10.5px] text-red-400 font-medium">Bienes extraviados</p>
          </div>
        </div>

        {/* Card 2: Found - Stored */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex items-center gap-4 shadow-md">
          <div className="p-3.5 bg-emerald-950/40 text-emerald-400 rounded-xl border border-emerald-990/30">
            <Package className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">En Resguardo</p>
            <p className="text-2xl font-bold mt-1 text-slate-100">{foundStored}</p>
            <p className="text-[10.5px] text-emerald-400 font-medium">Listos para devolución</p>
          </div>
        </div>

        {/* Card 3: Recovered */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex items-center gap-4 shadow-md">
          <div className="p-3.5 bg-blue-950/40 text-blue-400 rounded-xl border border-blue-900/30">
            <CheckSquare className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Localizados</p>
            <p className="text-2xl font-bold mt-1 text-slate-100">{recoveredCount}</p>
            <p className="text-[10.5px] text-blue-400 font-medium">Devueltos con éxito</p>
          </div>
        </div>

        {/* Card 4: Recovery Efficiency Rate */}
        <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex items-center gap-4 shadow-md">
          <div className="p-3.5 bg-indigo-950/40 text-indigo-400 rounded-xl border border-indigo-900/30">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Rendimiento</p>
            <p className="text-2xl font-bold mt-1 text-slate-100">{recoveryRate}%</p>
            <p className="text-[10.5px] text-indigo-400 font-medium">Eficiencia de búsqueda</p>
          </div>
        </div>
      </div>

      {/* Bento-grid: Distribution by Categories and Incident Heatmap */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Category Breakdown list */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-bold text-slate-350 uppercase tracking-wider flex items-center gap-1.5 font-mono">
              <Layers className="w-4 h-4 text-blue-400" />
              <span>Distribución por Categoría</span>
            </h3>
            {selectedCategory && (
              <button 
                onClick={() => onSelectCategory(null)}
                className="text-xs text-blue-400 hover:text-blue-300 font-bold transition-all cursor-pointer"
              >
                Limpiar filtro
              </button>
            )}
          </div>
          
          <div className="space-y-3">
            {categoryStats.map((stat) => {
              const isActive = selectedCategory === stat.key;
              return (
                <div 
                  key={stat.key} 
                  onClick={() => onSelectCategory(isActive ? null : stat.key)}
                  className={`p-3 rounded-xl border transition-all cursor-pointer ${
                    isActive 
                      ? 'bg-slate-850 border-blue-500/50 shadow-md shadow-blue-500/5' 
                      : 'border-slate-800/65 bg-slate-950/20 hover:bg-slate-900/40 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="font-semibold text-slate-200">{stat.name}</span>
                    <span className="text-slate-400 font-medium text-[11px]">
                      {stat.total} {stat.total === 1 ? 'objeto' : 'objetos'} ({stat.percentage}%)
                    </span>
                  </div>
                  
                  {/* Progress bar representing proportion */}
                  <div className="w-full bg-slate-950 rounded-full h-1.5 overflow-hidden flex">
                    <div 
                      className="bg-red-550 h-full transition-all duration-500" 
                      style={{ width: `${stat.total > 0 ? (stat.lost / stat.total) * 100 : 0}%` }}
                      title={`Extraviados: ${stat.lost}`}
                    />
                    <div 
                      className="bg-emerald-500 h-full transition-all duration-500" 
                      style={{ width: `${stat.total > 0 ? (stat.found / stat.total) * 105 : 0}%` }}
                      title={`En resguardo: ${stat.found}`}
                    />
                    <div 
                      className="bg-blue-550 h-full transition-all duration-500" 
                      style={{ width: `${stat.total > 0 ? (stat.recovered / stat.total) * 100 : 0}%` }}
                      title={`Devueltos: ${stat.recovered}`}
                    />
                  </div>
                  
                  {/* Small sub-counters */}
                  <div className="flex gap-4 mt-2 text-[10px] text-slate-500 font-semibold pl-0.5">
                    <span className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                      {stat.lost} extraviado{stat.lost !== 1 ? 's' : ''}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                      {stat.found} resguardado{stat.found !== 1 ? 's' : ''}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                      {stat.recovered} entregado{stat.recovered !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Heatmap/List of Zones Active incidents */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
          <h3 className="text-xs font-bold text-slate-350 uppercase tracking-wider flex items-center gap-1.5 mb-4 font-mono">
            <Sparkles className="w-4 h-4 text-indigo-400" />
            <span>Mapa de Calor de Incidencias Activas</span>
          </h3>
          
          <div className="space-y-3">
            {zoneStats.map((stat, idx) => {
              const activeCount = stat.active;
              // Compute visual intensity of red bg for heatmap feel
              let weightClass = "bg-slate-950/20 border-slate-800/80 text-slate-300";
              if (activeCount >= 3) {
                weightClass = "bg-red-950/15 border-red-500/20 text-red-200";
              } else if (activeCount > 0) {
                weightClass = "bg-amber-950/10 border-amber-500/20 text-amber-205";
              }

              return (
                <div key={stat.key} className={`flex items-center justify-between p-3 rounded-xl border transition-all ${weightClass}`}>
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono text-[9px] w-5 h-5 flex items-center justify-center rounded-lg bg-slate-900 border border-slate-800 text-slate-400 font-extrabold shadow-inner select-none">
                      {idx + 1}
                    </span>
                    <span className="text-xs font-bold">{stat.name}</span>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] text-slate-500 font-medium">
                      Total histórico: {stat.total}
                    </span>
                    <span className={`text-[10.5px] font-bold px-2.5 py-0.5 rounded-lg border ${
                      activeCount > 2 
                        ? 'bg-red-500/10 text-red-400 border-red-500/20' 
                        : (activeCount > 0 ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-slate-800/50 text-slate-400 border-slate-705')
                    }`}>
                      {activeCount} Pendiente{activeCount !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}
