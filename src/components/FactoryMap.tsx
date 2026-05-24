import React from 'react';
import { FactoryZone, FactoryItem, ZONE_LABELS } from '../types';
import { MapPin, Info, CheckCircle, Search, HelpCircle, HardHat } from 'lucide-react';

interface FactoryMapProps {
  items: FactoryItem[];
  selectedZone: FactoryZone | null;
  onSelectZone: (zone: FactoryZone | null) => void;
}

export default function FactoryMap({ items, selectedZone, onSelectZone }: FactoryMapProps) {
  // Compute metrics per zone
  const getZoneStats = (zone: FactoryZone) => {
    const zoneItems = items.filter(i => i.zone === zone);
    const lostCount = zoneItems.filter(i => i.type === 'lost' && i.status === 'searching').length;
    const foundCount = zoneItems.filter(i => i.type === 'found' && i.status === 'stored').length;
    return { lostCount, foundCount, total: zoneItems.length };
  };

  const zonesConfig: { id: FactoryZone; name: string; style: string; icon: React.ReactNode; desc: string }[] = [
    {
      id: 'offices',
      name: ZONE_LABELS.offices,
      desc: 'Departamento de Ingeniería, TI y Salas de Planificación (Planta Alta).',
      style: 'bg-slate-900/40 border-slate-800/85 hover:bg-slate-900/80',
      icon: <Info className="w-4 h-4 text-slate-400" />
    },
    {
      id: 'breakroom',
      name: ZONE_LABELS.breakroom,
      desc: 'Comedor, casilleros del personal y máquinas expendedoras.',
      style: 'bg-amber-950/10 border-amber-900/30 hover:bg-amber-950/20',
      icon: <HelpCircle className="w-4 h-4 text-amber-400" />
    },
    {
      id: 'warehouse',
      name: ZONE_LABELS.warehouse,
      desc: 'Bahías de carga, estanterías pesadas y almacenamiento de repuestos.',
      style: 'bg-blue-950/20 border-blue-900/30 hover:bg-blue-950/30 col-span-1 sm:col-span-2 sm:row-span-2',
      icon: <MapPin className="w-4 h-4 text-blue-400" />
    },
    {
      id: 'assembly_a',
      name: ZONE_LABELS.assembly_a,
      desc: 'Línea de producción robotizada y estaciones de test de precisión.',
      style: 'bg-emerald-950/10 border-emerald-900/30 hover:bg-emerald-950/20',
      icon: <HardHat className="w-4 h-4 text-emerald-400" />
    },
    {
      id: 'assembly_b',
      name: ZONE_LABELS.assembly_b,
      desc: 'Montaje mecánico pesado y estaciones de embalado intermedio.',
      style: 'bg-cyan-950/10 border-cyan-900/30 hover:bg-cyan-950/20',
      icon: <HardHat className="w-4 h-4 text-cyan-400" />
    },
    {
      id: 'maintenance',
      name: ZONE_LABELS.maintenance,
      desc: 'Armarios de herramientas magnéticas, torno, fresadora y soldadura.',
      style: 'bg-indigo-950/10 border-indigo-900/30 hover:bg-indigo-950/20',
      icon: <CheckCircle className="w-4 h-4 text-indigo-400" />
    },
    {
      id: 'packaging',
      name: ZONE_LABELS.packaging,
      desc: 'Cintas de transporte final, área de flejado y paletizado de envíos.',
      style: 'bg-purple-950/10 border-purple-900/30 hover:bg-purple-950/20',
      icon: <Search className="w-4 h-4 text-purple-400" />
    }
  ];

  return (
    <div id="factory-map-container" className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
        <div>
          <h2 className="text-base font-bold text-slate-200 flex items-center gap-2">
            <span>🗺️ Plano Virtual de la Planta</span>
          </h2>
          <p className="text-[11px] text-slate-500 mt-0.5 font-normal">
            Haz clic en una zona del mapa para filtrar la lista de materiales y ver el estado de incidencias.
          </p>
        </div>
        {selectedZone && (
          <button
            id="clear-zone-filter"
            onClick={() => onSelectZone(null)}
            className="text-xs font-semibold text-blue-400 hover:text-blue-300 bg-blue-500/10 border border-blue-500/25 px-3 py-1.5 rounded-lg self-start transition-colors cursor-pointer"
          >
            Ver toda la fábrica
          </button>
        )}
      </div>

      {/* Grid Floorplan representation */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 min-h-[340px]">
        {zonesConfig.map((zone) => {
          const stats = getZoneStats(zone.id);
          const isSelected = selectedZone === zone.id;
          
          return (
            <button
              id={`zone-block-${zone.id}`}
              key={zone.id}
              onClick={() => onSelectZone(isSelected ? null : zone.id)}
              className={`text-left p-4 rounded-xl border transition-all relative flex flex-col justify-between group cursor-pointer ${zone.style} ${
                isSelected 
                  ? 'border-blue-500 ring-2 ring-blue-500/20 bg-blue-950/40 shadow-lg shadow-blue-500/5 hover:border-blue-400' 
                  : 'hover:border-slate-500/80 hover:shadow-2xs'
              }`}
            >
              {/* Pulse alert for active lost items */}
              {stats.lostCount > 0 && !isSelected && (
                <span className="absolute top-3 right-3 flex h-20 w-2 h-2">
                  <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                </span>
              )}

              <div className="w-full">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <span className="text-slate-400 group-hover:text-blue-400 transition-colors">
                    {zone.icon}
                  </span>
                  <h3 className="text-xs font-bold text-slate-200 group-hover:text-blue-400 transition-colors">
                    {zone.name}
                  </h3>
                </div>
                <p className="text-[10.5px] leading-tight text-slate-500 font-normal pr-1 mb-4 group-hover:text-slate-400 transition-colors">
                  {zone.desc}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-1.5 mt-auto">
                {stats.lostCount > 0 && (
                  <span className="bg-red-500/10 text-red-400 border border-red-500/25 text-[9.5px] px-2 py-0.5 rounded font-semibold tracking-tight">
                    🔴 {stats.lostCount} extraviado{stats.lostCount > 1 ? 's' : ''}
                  </span>
                )}
                {stats.foundCount > 0 && (
                  <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 text-[9.5px] px-2 py-0.5 rounded font-semibold tracking-tight">
                    🟢 {stats.foundCount} resguardado{stats.foundCount > 1 ? 's' : ''}
                  </span>
                )}
                {stats.lostCount === 0 && stats.foundCount === 0 && (
                  <span className="bg-slate-800/60 text-slate-400 border border-slate-800/80 text-[9px] px-2 py-0.5 rounded font-medium">
                    ✓ Limpio
                  </span>
                )}
              </div>

              {/* Floor badge styling */}
              <span className="absolute bottom-2 right-2 text-[8px] text-slate-650 uppercase font-mono tracking-wider opacity-30 select-none">
                {zone.id.substring(0, 5)}
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center mt-4 gap-x-6 gap-y-2 pt-4 border-t border-slate-800/80 text-[11px] text-slate-500">
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-2 h-2 rounded-full bg-red-500"></span>
          Búsqueda activa (Perdidos)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-550"></span>
          Resguardado (Encontrados)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-2 h-2 rounded-full bg-blue-500"></span>
          Filtro seleccionado
        </span>
      </div>
    </div>
  );
}
