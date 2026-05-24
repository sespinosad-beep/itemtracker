import React, { useState, useEffect } from 'react';
import { FactoryItem, ItemType, ItemCategory, FactoryZone, CATEGORY_LABELS, ZONE_LABELS } from '../types';
import { Sparkles, Loader2, X, ArrowRight, ShieldAlert } from 'lucide-react';

interface ReportFormProps {
  onClose: () => void;
  onSubmitSuccess: (newItem: FactoryItem) => void;
}

export default function ReportForm({ onClose, onSubmitSuccess }: ReportFormProps) {
  const [type, setType] = useState<ItemType>('lost');
  const [name, setName] = useState('');
  const [category, setCategory] = useState<ItemCategory>('Tools');
  const [zone, setZone] = useState<FactoryZone>('warehouse');
  const [subLocation, setSubLocation] = useState('');
  const [description, setDescription] = useState('');
  const [reporterName, setReporterName] = useState('');
  const [reporterContact, setReporterContact] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  
  const [isGeneratingTags, setIsGeneratingTags] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Auto-generate tags using the Server API
  const generateAutomaticTags = async () => {
    if (!name) {
      setErrorMsg("Escribe el nombre del artículo antes de generar etiquetas.");
      return;
    }
    setErrorMsg(null);
    setIsGeneratingTags(true);
    try {
      const response = await fetch('/api/gemini/generate-tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description, category })
      });
      const data = await response.json();
      if (data.tags && Array.isArray(data.tags)) {
        setTags(data.tags);
      }
    } catch (err) {
      console.error(err);
      // Fallback tags
      setTags([category.toLowerCase(), "fábrica", name.split(' ')[0].toLowerCase()]);
    } finally {
      setIsGeneratingTags(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !description || !reporterName || !subLocation) {
      setErrorMsg("Completa todos los campos obligatorios (*).");
      return;
    }
    setErrorMsg(null);
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          name,
          category,
          zone,
          subLocation,
          description,
          reporterName,
          reporterContact,
          tags: tags.length > 0 ? tags : [category.toLowerCase()]
        })
      });

      if (!response.ok) {
        throw new Error("No se pudo registrar la alerta en el servidor.");
      }

      const newItem = await response.json();
      onSubmitSuccess(newItem);
    } catch (err: any) {
      setErrorMsg(err.message || "Ocurrió un error inesperado.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddCustomTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const val = e.currentTarget.value.trim().toLowerCase();
      if (val && !tags.includes(val)) {
        setTags([...tags, val]);
        e.currentTarget.value = '';
      }
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(t => t !== tagToRemove));
  };

  return (
    <div id="report-modal-backdrop" className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
      <div 
        id="report-modal-content" 
        className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <span>📝 Registrar Nueva Incidencia / Alerta</span>
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">Reporta un artículo perdido o pon en resguardo un artículo hallado.</p>
          </div>
          <button 
            id="close-report-modal"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-800/60 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content & Scroll Area */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {errorMsg && (
            <div className="bg-red-500/10 border border-red-500/25 p-3 rounded-xl flex items-center gap-2 text-xs text-red-400">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Type Selector (Tabs) */}
          <div>
            <label className="block text-[10.5px] font-bold text-slate-400 uppercase tracking-widest mb-2 font-mono">Tipo de Incidencia</label>
            <div className="grid grid-cols-2 gap-2 bg-slate-950 p-1 rounded-xl border border-slate-800">
              <button
                id="type-lost-btn"
                type="button"
                onClick={() => setType('lost')}
                className={`py-2 px-4 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  type === 'lost' 
                    ? 'bg-red-550 text-slate-100 shadow' 
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
                }`}
              >
                🔴 EXTRAVIADO (Se busca en fábrica)
              </button>
              <button
                id="type-found-btn"
                type="button"
                onClick={() => setType('found')}
                className={`py-2 px-4 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  type === 'found' 
                    ? 'bg-emerald-555 text-slate-100 shadow' 
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
                }`}
              >
                🟢 HALLADO (Resguardado / Guardado)
              </button>
            </div>
          </div>

          {/* Grid fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* Name */}
            <div>
              <label htmlFor="item-name" className="block text-[10.5px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 font-mono">Articulo *</label>
              <input
                id="item-name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej. Taladro Bosch GSB 20, Calibrador..."
                className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-lg px-3 py-2 text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none"
              />
            </div>

            {/* Category */}
            <div>
              <label htmlFor="item-category" className="block text-[10.5px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 font-mono font-bold">Categoría *</label>
              <select
                id="item-category"
                value={category}
                onChange={(e) => setCategory(e.target.value as ItemCategory)}
                className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none cursor-pointer"
              >
                {Object.entries(CATEGORY_LABELS).map(([key, value]) => (
                  <option key={key} value={key} className="bg-slate-900">{value}</option>
                ))}
              </select>
            </div>

            {/* Zone */}
            <div>
              <label htmlFor="item-zone" className="block text-[10.5px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 font-mono">Ubicación / Sector Planta *</label>
              <select
                id="item-zone"
                value={zone}
                onChange={(e) => setZone(e.target.value as FactoryZone)}
                className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none cursor-pointer"
              >
                {Object.entries(ZONE_LABELS).map(([key, value]) => (
                  <option key={key} value={key} className="bg-slate-900">{value}</option>
                ))}
              </select>
            </div>

            {/* Specific Sublocation */}
            <div>
              <label htmlFor="item-sub-location" className="block text-[10.5px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 font-mono">Detalle Exacto / Banco de Trabajo *</label>
              <input
                id="item-sub-location"
                type="text"
                required
                value={subLocation}
                onChange={(e) => setSubLocation(e.target.value)}
                placeholder="Ej. Junto a la fresadora CNC 3, Estación B-4"
                className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-lg px-3 py-2 text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none"
              />
            </div>

            {/* Reporter Name */}
            <div>
              <label htmlFor="item-reporter" className="block text-[10.5px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 font-mono">Reportado Por (Tu Nombre) *</label>
              <input
                id="item-reporter"
                type="text"
                required
                value={reporterName}
                onChange={(e) => setReporterName(e.target.value)}
                placeholder="Ej. Ing. Juan Pérez, Supervisor..."
                className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-lg px-3 py-2 text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none"
              />
            </div>

            {/* Reporter Contact */}
            <div>
              <label htmlFor="item-contact" className="block text-[10.5px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 font-mono">Contacto (Radio / Ext / Celular) *</label>
              <input
                id="item-contact"
                type="text"
                required
                value={reporterContact}
                onChange={(e) => setReporterContact(e.target.value)}
                placeholder="Ej. Canal de Radio 4, Ext 2110, Móvil..."
                className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-lg px-3 py-2 text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none"
              />
            </div>

          </div>

          {/* Description */}
          <div>
            <label htmlFor="item-description" className="block text-[10.5px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 font-mono">Descripción Física / Detalles Identificadores *</label>
            <textarea
              id="item-description"
              required
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Indica marcas distintivas, color del estuche, arañazos o pegatinas que ayuden a validar la pertenencia..."
              className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-lg px-3 py-2 text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none resize-none"
            />
          </div>

          {/* Intelligent Tags Block */}
          <div className="bg-slate-950/40 border border-slate-800/80 p-4 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5 font-mono">
                  <Sparkles className="w-3.5 h-3.5 text-blue-400 animate-pulse" />
                  <span>ETIQUETAS DEL CLASIFICADOR IA</span>
                </h4>
                <p className="text-[9.5px] text-slate-500 mt-0.5">La IA genera palabras clave asociadas para facilitar la búsqueda en lenguaje natural.</p>
              </div>
              <button
                id="generate-tags-btn"
                type="button"
                disabled={isGeneratingTags || !name}
                onClick={generateAutomaticTags}
                className="text-[10px] bg-blue-500/10 hover:bg-blue-500/20 active:bg-blue-500/30 border border-blue-500/20 disabled:border-slate-800 disabled:text-slate-600 text-blue-400 font-bold px-2.5 py-1 rounded-md transition-all flex items-center gap-1 cursor-pointer"
              >
                {isGeneratingTags ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin" />
                    <span>Clasificando...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3 h-3" />
                    <span>Auto-etiquetar</span>
                  </>
                )}
              </button>
            </div>

            {/* Display list of Tags */}
            <div className="flex flex-wrap gap-1.5 min-h-[26px]">
              {tags.map(tag => (
                <span 
                  key={tag} 
                  className="bg-slate-900 text-slate-300 border border-slate-800 hover:border-red-500/35 hover:text-red-400 text-[10px] pl-2 pr-1 py-0.5 rounded flex items-center gap-1.5 font-mono group transition-colors"
                >
                  <span>#{tag}</span>
                  <button 
                    type="button" 
                    onClick={() => removeTag(tag)}
                    className="p-0.5 rounded text-slate-500 group-hover:text-red-400 transition-colors"
                  >
                    <X className="w-2.5 h-2.5" />
                  </button>
                </span>
              ))}
              {tags.length === 0 && (
                <span className="text-[10.5px] text-slate-600 italic">No hay etiquetas asignadas aún. Pulsa auto-etiquetar o añade una abajo.</span>
              )}
            </div>

            {/* Manual Tag add input */}
            <div className="pt-1.5 border-t border-slate-900/40">
              <input
                id="manual-tag-input"
                type="text"
                placeholder="Escribe una etiqueta y pulsa Enter..."
                onKeyDown={handleAddCustomTag}
                className="w-full max-w-[280px] bg-slate-950 border border-slate-900 focus:border-slate-800 rounded px-2.5 py-1 text-[10.5px] text-slate-400 placeholder:text-slate-700 focus:outline-none"
              />
            </div>
          </div>
        </form>

        {/* Footer actions */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/40 flex items-center justify-end gap-3.5">
          <button
            id="cancel-report-btn"
            type="button"
            onClick={onClose}
            className="text-xs font-bold text-slate-400 hover:text-slate-200"
          >
            Cancelar
          </button>
          
          <button
            id="submit-report-btn"
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting || !name || !description}
            className="bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-slate-100 px-4 py-2.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow-lg shadow-blue-500/10 cursor-pointer disabled:bg-slate-800 disabled:text-slate-500 disabled:shadow-none"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Registrando...</span>
              </>
            ) : (
              <>
                <span>Registrar Reporte</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
