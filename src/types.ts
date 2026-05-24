export type ItemType = 'lost' | 'found';

export type ItemCategory = 
  | 'Tools' // Herramientas
  | 'PPE' // EPPs (Protección)
  | 'Electronics' // Electrónicos
  | 'Documents' // Planos/Documentos
  | 'Material' // Componentes / Materia Prima
  | 'Personal' // Objetos Personales (móvil, llaves)
  | 'Other'; // Otros

export type FactoryZone = 
  | 'warehouse' // Almacén Central
  | 'assembly_a' // Línea de Ensamblaje A
  | 'assembly_b' // Línea de Ensamblaje B
  | 'packaging' // Zona de Embalaje
  | 'maintenance' // Taller de Mantenimiento
  | 'breakroom' // Comedor / Vestuarios
  | 'offices'; // Oficinas Administrativas

export interface FactoryItem {
  id: string; // e.g. "FAC-1025"
  type: ItemType;
  name: string;
  category: ItemCategory;
  zone: FactoryZone;
  subLocation: string; // Specific location detail
  description: string;
  reporterName: string;
  reporterContact?: string;
  date: string; // ISO date
  status: 'searching' | 'stored' | 'recovered';
  storagePlace?: string; // Where it is being stored safetly if found
  recoveredBy?: string; // Who claimed it
  recoveryDate?: string; // When was it claimed
  tags: string[];
}

export interface AssistantMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  suggestedZones?: FactoryZone[];
  predictedItems?: { item: FactoryItem; confidence: 'high' | 'medium' | 'low' }[];
}

export const ZONE_LABELS: Record<FactoryZone, string> = {
  warehouse: 'Almacén Central',
  assembly_a: 'Línea de Ensamblaje A',
  assembly_b: 'Línea de Ensamblaje B',
  packaging: 'Zona de Embalaje',
  maintenance: 'Taller de Mantenimiento',
  breakroom: 'Comedor / Vestuarios',
  offices: 'Oficinas Administrativas',
};

export const CATEGORY_LABELS: Record<ItemCategory, string> = {
  Tools: 'Herramientas / Equipos',
  PPE: 'EPPs / Seguridad',
  Electronics: 'Dispositivos Electrónicos',
  Documents: 'Planos / Documentación',
  Material: 'Materia Prima / Componentes',
  Personal: 'Objetos Personales',
  Other: 'Otros / Varios',
};
