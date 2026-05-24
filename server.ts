import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import { FactoryItem, FactoryZone, ItemCategory } from "./src/types";

const app = express();
const PORT = 3000;

app.use(express.json());

// In-memory array initialized with rich initial factory data
let items: FactoryItem[] = [
  {
    id: "FAC-1001",
    type: "lost",
    name: "Calibrador Digital Mitutoyo",
    category: "Tools",
    zone: "assembly_a",
    subLocation: "Mesa de control de calidad, sección norte",
    description: "Estuche negro de plástico con letras amarillas. El calibrador tiene una pequeña raya en la pantalla LCD.",
    reporterName: "Carlos Gómez",
    reporterContact: "Ext 204 / Turno Mañana",
    date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days ago
    status: "searching",
    tags: ["calibrador", "mitutoyo", "medición", "estuche negro", "metal"]
  },
  {
    id: "FAC-1002",
    type: "lost",
    name: "Plano Técnico Hidráulico NS-2026",
    category: "Documents",
    zone: "offices",
    subLocation: "Sala de reuniones B",
    description: "Plano enrollado de gran formato con sello azul de aprobación estructural, firmado por el Ingeniero Jefe.",
    reporterName: "Elena Rivas",
    reporterContact: "elena.rivas@fabrica.com",
    date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
    status: "searching",
    tags: ["plano", "hidráulico", "dibujo", "papel", "azul", "turbina"]
  },
  {
    id: "FAC-1003",
    type: "found",
    name: "Gafas de Seguridad Uvex",
    category: "PPE",
    zone: "breakroom",
    subLocation: "Mesa junto a las máquinas expendedoras",
    description: "Montura protectora negra con lentes transparentes y patillas regulables de goma azul. Muy buen estado.",
    reporterName: "Marcos Torres (Limpieza)",
    reporterContact: "Personal de limpieza",
    date: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(), // 5 hours ago
    status: "stored",
    storagePlace: "Armario de objetos perdidos en Recepción",
    tags: ["gafas", "seguridad", "protección", "uvex", "lentes", "negro", "azul"]
  },
  {
    id: "FAC-1004",
    type: "lost",
    name: "Radio de Comunicación Motorola PRO",
    category: "Electronics",
    zone: "maintenance",
    subLocation: "Cerca de la fresadora CNC 2",
    description: "Canal 4 sintonizado. Lleva una etiqueta roja identificadora con el número 'MTTO-08' en la parte trasera.",
    reporterName: "Julio Ortiz",
    reporterContact: "Radio canal 4",
    date: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(), // 12 hours ago
    status: "searching",
    tags: ["radio", "motorola", "comunicación", "antena", "rojo", "negro"]
  },
  {
    id: "FAC-1005",
    type: "found",
    name: "Arnés de Seguridad con Amortiguador de Impactos",
    category: "PPE",
    zone: "warehouse",
    subLocation: "Pasillo 4, estantería C de carga pesada",
    description: "Arnés marca Steelpro de color verde flúor, tiene marcas de grasa negra en las correas de los muslos.",
    reporterName: "Alfonso Pérez",
    reporterContact: "Almacén Central Ext 110",
    date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    status: "stored",
    storagePlace: "Oficina del Supervisor de Almacén (Estante Superior)",
    tags: ["arnés", "seguridad", "altura", "trabajo", "verde flúor", "Steelpro"]
  },
  {
    id: "FAC-1006",
    type: "found",
    name: "Tablet Rugerizada Getac",
    category: "Electronics",
    zone: "assembly_b",
    subLocation: "Cajón de herramientas móvil N° 14",
    description: "Tablet táctil industrial de alta resistencia con funda protectora gris oscuro. Está encendida con pantalla de login.",
    reporterName: "Juan Moreno",
    reporterContact: "Línea B - Estación de ensamblaje final",
    date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    status: "recovered",
    storagePlace: "Soporte de Sistemas de Información (IT)",
    recoveredBy: "Luis Espinoza (Supervisor de Turno B)",
    recoveryDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    tags: ["tablet", "getac", "industrial", "pantalla", "electrónico", "it"]
  },
  {
    id: "FAC-1007",
    type: "lost",
    name: "Caja de Llaves de Vaso Stanley",
    category: "Tools",
    zone: "packaging",
    subLocation: "Estación de embalaje y paletizado principal",
    description: "Caja de metal color amarillo con 24 piezas de vasos métricos. Falta la llave de carraca de 1/2 pulgada.",
    reporterName: "Sebastián Sanz",
    reporterContact: "Turno Tarde",
    date: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    status: "searching",
    tags: ["llaves", "vaso", "herramientas", "stanley", "caja metal", "amarillo", "enchufe"]
  }
];

// Lazy Gemini API initialization helper matching exact directives
let aiClient: any = null;
function getGeminiClient() {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn("ADVERTENCIA: GEMINI_API_KEY no se encontró en las variables de entorno.");
      return null;
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

// REST endpoints
app.get("/api/items", (req, res) => {
  res.json(items);
});

app.post("/api/items", (req, res) => {
  try {
    const { type, name, category, zone, subLocation, description, reporterName, reporterContact, tags } = req.body;
    
    if (!name || !category || !zone || !description || !reporterName) {
      return res.status(400).json({ error: "Faltan campos obligatorios en el reporte." });
    }

    const nextNumber = items.length > 0 
      ? Math.max(...items.map(i => parseInt(i.id.replace("FAC-", "")))) + 1 
      : 1001;
    
    const newItem: FactoryItem = {
      id: `FAC-${nextNumber}`,
      type,
      name,
      category,
      zone,
      subLocation,
      description,
      reporterName,
      reporterContact,
      date: new Date().toISOString(),
      status: type === 'lost' ? 'searching' : 'stored',
      tags: Array.isArray(tags) ? tags : [],
    };

    items.unshift(newItem); // Add to beginning of array
    res.status(201).json(newItem);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Update item status (Mark as Found, Stored, Recovered)
app.post("/api/items/:id/status", (req, res) => {
  try {
    const { id } = req.params;
    const { status, storagePlace, recoveredBy } = req.body;

    const itemIndex = items.findIndex(i => i.id === id);
    if (itemIndex === -1) {
      return res.status(404).json({ error: "Artículo no encontrado." });
    }

    const item = items[itemIndex];
    item.status = status;
    
    if (storagePlace) {
      item.storagePlace = storagePlace;
    }
    if (recoveredBy) {
      item.recoveredBy = recoveredBy;
      item.recoveryDate = new Date().toISOString();
    }

    res.json(item);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// AI Autotag Generator endpoint
app.post("/api/gemini/generate-tags", async (req, res) => {
  const { name, description, category } = req.body;
  if (!name) return res.json({ tags: [] });

  const ai = getGeminiClient();
  if (!ai) {
    // Generate simple local tags of keywords if Gemini is not available
    const keywords = (name + " " + (description || "") + " " + (category || ""))
      .toLowerCase()
      .split(/[\s,.\-_/]+/)
      .filter(w => w.length > 3)
      .slice(0, 6);
    return res.json({ tags: Array.from(new Set(keywords)) });
  }

  try {
    const prompt = `Genera exactamente entre 4 y 6 etiquetas de metadatos (un solo concepto/palabra cada una en minúsculas) separadas por comas que describan este artículo físico de fábrica. 
Nombre: ${name}
Categoría: ${category || "Otros"}
Descripción: ${description || ""}
Etiquetas recomendadas (ejemplo: 'herramienta, metal, negro, calibrador'):`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
    });

    const text = response.text || "";
    const tags = text
      .split(",")
      .map((t: string) => t.trim().toLowerCase())
      .filter((t: string) => t.length > 0 && t.length < 20);

    res.json({ tags });
  } catch (err) {
    console.error("Error generating tags:", err);
    res.json({ tags: [category?.toLowerCase() || 'general', name.toLowerCase().split(' ')[0]] });
  }
});

// AI Search and Location Assistant Endpoint
app.post("/api/gemini/assistant", async (req, res) => {
  const { messages, userQuery } = req.body;
  if (!userQuery) {
    return res.status(400).json({ error: "Consulta vacía." });
  }

  const ai = getGeminiClient();

  // Step 1: Internal database heuristics matching
  // Let's find semantic similarities in the current reports to alert users.
  const activeLostItems = items.filter(i => i.type === 'lost' && i.status === 'searching');
  const activeFoundItems = items.filter(i => i.type === 'found' && i.status === 'stored');

  // Let's run a simple keyword score for items matching the user inquiry
  const searchWords = userQuery.toLowerCase().split(/[\s,.]+/).filter((w: string) => w.length > 2);
  
  const matches: { item: FactoryItem; score: number }[] = [];
  
  items.forEach(item => {
    let score = 0;
    const nameLower = item.name.toLowerCase();
    const descLower = item.description.toLowerCase();
    const subLower = item.subLocation.toLowerCase();
    
    searchWords.forEach((word: string) => {
      if (nameLower.includes(word)) score += 4;
      if (descLower.includes(word)) score += 2;
      if (subLower.includes(word)) score += 1;
      if (item.tags.some(t => t.toLowerCase() === word)) score += 3;
    });
    
    if (score > 1) {
      matches.push({ item, score });
    }
  });

  // Sort matched items by score descend
  matches.sort((a, b) => b.score - a.score);
  const potentialMatches = matches.slice(0, 3).map(m => ({
    item: m.item,
    confidence: m.score > 6 ? 'high' as const : (m.score > 3 ? 'medium' as const : 'low' as const)
  }));

  // Step 2: Use Gemini if available, otherwise fallback gracefully
  if (!ai) {
    // Elegant fallback guidance based on keywords
    let textResult = `Hola, veo que estás buscando un objeto relacionado con "${userQuery}".\n\n`;
    textResult += `Actualmente, la Inteligencia Artificial de Gemini no tiene instalada la clave API en este entorno, pero he escaneado nuestro inventario:\n\n`;
    
    if (potentialMatches.length > 0) {
      textResult += `🔍 **Posibles coincidencias detectadas en el sistema:**\n`;
      potentialMatches.forEach(pm => {
        const typeStr = pm.item.type === 'lost' ? '🔴 Reportado como EXTRAVIADO' : '🟢 Reportado como ENCONTRADO/RESGUARDADO';
        textResult += `- **${pm.item.name}** [ID: ${pm.item.id}]- (${typeStr})\n`;
        textResult += `  • Ubicación original: _${pm.item.subLocation}_ en **${pm.item.zone}**.\n`;
        if (pm.item.storagePlace) {
          textResult += `  • Lugar de resguardo: **${pm.item.storagePlace}** ✅\n`;
        }
      });
    } else {
      textResult += `❌ No hemos encontrado coincidencias textuales inmediatas en la base de datos de objetos perdidos o encontrados.\n\n`;
      textResult += `💡 **Procedimiento de Búsqueda Recomendado:**\n`;
      textResult += `1. Revisa las áreas más concurridas de las líneas de producción.\n`;
      textResult += `2. Consulta con los encargados de turno y el supervisor de seguridad.\n`;
      textResult += `3. Registra el artículo como 'Extraviado' en la pestaña superior para alertar a todo el equipo de la fábrica.`;
    }

    // Try to guess recommended zones based on keywords
    const suggestedZones: FactoryZone[] = [];
    if (userQuery.toLowerCase().includes('llave') || userQuery.toLowerCase().includes('taladro') || userQuery.toLowerCase().includes('calibrador') || userQuery.toLowerCase().includes('herramienta')) {
      suggestedZones.push('maintenance', 'assembly_a', 'assembly_b');
    }
    if (userQuery.toLowerCase().includes('plano') || userQuery.toLowerCase().includes('document') || userQuery.toLowerCase().includes('papel') || userQuery.toLowerCase().includes('oficina')) {
      suggestedZones.push('offices', 'breakroom');
    }
    if (userQuery.toLowerCase().includes('arnés') || userQuery.toLowerCase().includes('casco') || userQuery.toLowerCase().includes('lente') || userQuery.toLowerCase().includes('gafa') || userQuery.toLowerCase().includes('bota')) {
      suggestedZones.push('warehouse', 'breakroom');
    }
    if (suggestedZones.length === 0) {
      suggestedZones.push('warehouse', 'maintenance');
    }

    return res.json({
      text: textResult,
      suggestedZones: Array.from(new Set(suggestedZones)),
      predictedItems: potentialMatches
    });
  }

  try {
    // Setup Context of current inventory items to supply to the prompt
    // This allows Gemini to perform smart data comparisons of active lost & found items.
    const inventoryContext = activeLostItems.map(i => ({
      id: i.id,
      type: "lost",
      name: i.name,
      category: i.category,
      zone: i.zone,
      subLocation: i.subLocation,
      description: i.description,
      tags: i.tags
    })).concat(activeFoundItems.map(i => ({
      id: i.id,
      type: "found",
      name: i.name,
      category: i.category,
      zone: i.zone,
      subLocation: i.subLocation,
      description: i.description,
      tags: i.tags
    })));

    const chatHistory = messages ? messages.slice(-5).map((m: any) => `${m.sender === 'user' ? 'Trabajador' : 'Asistente'}: ${m.text}`).join('\n') : "";

    const systemInstruction = `Eres "TrackerIA", un asistente experto en logística, orden y gestión de objetos perdidos para una fábrica industrial compleja.
Tu objetivo es ayudar a los obreros y supervisores a encontrar herramientas, equipos, EPPs u objetos personales extraviados.

INFORMACIÓN DE LA FÁBRICA:
Contamos con las siguientes zonas de trabajo:
- warehouse: Almacén Central (Zona de carga, estanterías altas de repuestos y materias primas).
- assembly_a: Línea de Ensamblaje A (Producción robotizada de precisión, bancos de calibración).
- assembly_b: Línea de Ensamblaje B (Embalado intermedio y ensamblajes mecánicos grandes).
- packaging: Zona de Embalaje (Embarque, cintas transportadoras, palets de carga y flejado).
- maintenance: Taller de Mantenimiento (Armarios de herramientas maestras, tornos, fresadoras, material de soldadura).
- breakroom: Comedor / Vestuarios (Casilleros, mesas de almuerzo, café y descanso).
- offices: Oficinas Administrativas (Plano superior, despachos de ingeniería, salas de planificación y TI).

INVENTARIO ACTUAL EN SISTEMA:
${JSON.stringify(inventoryContext, null, 2)}

INSTRUCCIONES DE RESPUESTA:
1. SÉ MUY PRÁCTICO, CONCISO Y DIRECTO (evita explicaciones largas). Háblale al trabajador del sector industrial en tono profesional y de apoyo.
2. Analiza la consulta sobre el objeto extraviado/visto. Compara con el INVENTARIO ACTUAL.
3. Si lo que describe coincide o se parece mucho a un artículo en el inventario reportado por otros:
   - Resáltalo claramente de manera proactiva diciendo cosas como "¡Buenas noticias! Se reportó un objeto muy similar en..." o "Revisa el registro del artículo ID...".
4. Recomienda las 1 o 2 zonas más lógicas donde el operario debe ir a buscar en la fábrica según la naturaleza física del objeto (herramientas en taller, papeles en oficinas o comedor, arneses en almacén, etc.) y explica por qué.
5. Da consejos rápidos para evitar pérdidas.
6. Tu respuesta final debe estar formateada en Markdown limpio. No menciones detalles de bases de datos internas de manera técnica, habla de 'nuestro registro de la fábrica'.`;

    const prompt = `HISTORIAL DE CHAT RECIENTE:
${chatHistory}

PREGUNTA DEL TRABAJADOR: 
"${userQuery}"

Por favor, ayúdame respondiendo al trabajador dándole instrucciones de búsqueda muy claras y cotejándolo con los objetos actuales.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.3,
      }
    });

    const responseText = response.text || "No se pudo generar respuesta lógica.";

    // Predict recommended zones using second simple structured logic or extracting it using simple rules
    const suggestedZones: FactoryZone[] = [];
    const lowerText = responseText.toLowerCase() + " " + userQuery.toLowerCase();
    
    if (lowerText.includes('warehouse') || lowerText.includes('almacén') || lowerText.includes('almacen')) suggestedZones.push('warehouse');
    if (lowerText.includes('assembly_a') || lowerText.includes('ensamblaje a') || lowerText.includes('línea a') || lowerText.includes('linea a')) suggestedZones.push('assembly_a');
    if (lowerText.includes('assembly_b') || lowerText.includes('ensamblaje b') || lowerText.includes('línea b') || lowerText.includes('linea b')) suggestedZones.push('assembly_b');
    if (lowerText.includes('packaging') || lowerText.includes('embalaje') || lowerText.includes('cintas')) suggestedZones.push('packaging');
    if (lowerText.includes('maintenance') || lowerText.includes('taller') || lowerText.includes('mantenimiento') || lowerText.includes('herramientas')) suggestedZones.push('maintenance');
    if (lowerText.includes('breakroom') || lowerText.includes('comedor') || lowerText.includes('descanso') || lowerText.includes('vestuario')) suggestedZones.push('breakroom');
    if (lowerText.includes('offices') || lowerText.includes('oficina') || lowerText.includes('oficinas') || lowerText.includes('plano')) suggestedZones.push('offices');

    if (suggestedZones.length === 0) {
      // Default guess
      if (lowerText.includes('herramienta') || lowerText.includes('llave')) suggestedZones.push('maintenance');
      else if (lowerText.includes('papel') || lowerText.includes('plano') || lowerText.includes('documento')) suggestedZones.push('offices');
      else suggestedZones.push('warehouse');
    }

    res.json({
      text: responseText,
      suggestedZones: Array.from(new Set(suggestedZones)),
      predictedItems: potentialMatches
    });
  } catch (err: any) {
    console.error("Gemini context error:", err);
    res.status(500).json({ error: "No se pudo procesar la consulta con el asistente de IA.", details: err.message });
  }
});

// Vite server implementation configuration
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Serve production build files
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Rastreador] Backend + Frontend corriendo en http://0.0.0.0:${PORT}`);
  });
}

startServer();
