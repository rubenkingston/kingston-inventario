import { useState, useEffect } from 'react';
import { Package, Mic, MapPin, History, Truck, LogOut, Search, Plus, Trash2, CheckCircle2, Circle, Pencil, User, Layers, Monitor, Lightbulb, Armchair, Box, ChevronDown, ChevronUp, Download } from 'lucide-react';
import { supabase } from './supabase';
import { Button, Input, Dialog, DialogContent, DialogHeader, DialogTitle, Badge } from './ui';
import { QRCodeCanvas } from 'qrcode.react';

// --- CONFIGURACIÓN DE CATEGORÍAS ---
const CATEGORIES = [
  { id: 'audio', label: 'Audio', icon: Mic, color: 'text-blue-400 bg-blue-400/10' },
  { id: 'video', label: 'Video', icon: Monitor, color: 'text-purple-400 bg-purple-400/10' },
  { id: 'iluminacion', label: 'Iluminación', icon: Lightbulb, color: 'text-yellow-400 bg-yellow-400/10' },
  { id: 'soportes', label: 'Soportes', icon: Armchair, color: 'text-orange-400 bg-orange-400/10' },
  { id: 'mobiliario', label: 'Mobiliario', icon: Armchair, color: 'text-green-400 bg-green-400/10' },
  { id: 'rack', label: 'Rack', icon: Layers, color: 'text-pink-400 bg-pink-400/10' },
  { id: 'varios', label: 'Varios', icon: Box, color: 'text-gray-400 bg-gray-400/10' },
];

interface ItemState {
  id?: number;
  name: string;
  serial_number: string;
  category: string;
  location: string;
  status: string;
  description: string;
  notes: string;
  parent_id: number | null;
}

export default function App() {
  // --- ESTADOS DE DATOS ---
  const [items, setItems] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // --- ESTADOS DE INTERFAZ ---
  const [activeTab, setActiveTab] = useState('inventario'); // Control de pestañas
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('Todas');
  const [expandedRack, setExpandedRack] = useState<number | null>(null);     // Qué rack está abierto
  const [expandedLocation, setExpandedLocation] = useState<number | null>(null); // Qué ubicación está abierta

  // --- ESTADOS DE ACCIÓN ---
  const [truckCart, setTruckCart] = useState<number[]>([]);
  
  // Modales
  const [isNewOpen, setIsNewOpen] = useState(false);
  const [isMoveOpen, setIsMoveOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isNewLocOpen, setIsNewLocOpen] = useState(false); // Modal nueva ubicación

  const [moveDestination, setMoveDestination] = useState('');
  
  // Estado para Edición/Creación
  const [editingItem, setEditingItem] = useState<any>(null);
  const [newItem, setNewItem] = useState<ItemState>({ 
    name: '', serial_number: '', category: 'audio', location: '', status: 'operativo', description: '', notes: '', parent_id: null 
  });
  
  // Estado para Ubicaciones
  const [newLocName, setNewLocName] = useState('');
  const [newLocAddress, setNewLocAddress] = useState('');

  // --- CARGA INICIAL ---
  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const { data: equip } = await supabase.from('equipment').select('*').order('id', { ascending: false });
      const { data: locs } = await supabase.from('locations').select('*').order('id');
      
      if (equip) setItems(equip);
      if (locs) {
        setLocations(locs);
        // Asignar ubicación por defecto al formulario nuevo si existe
        if (locs.length > 0) {
            setNewItem(prev => ({...prev, location: prev.location || locs[0].name}));
            setMoveDestination(prev => prev || locs[0].name);
        }
      }
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  // --- LOGICA DE NEGOCIO ---
  const generateSerial = () => Math.floor(100000 + Math.random() * 900000).toString();

  const handleCreate = async () => {
    if (!newItem.name) return alert("El nombre es obligatorio");
    const finalSerial = newItem.serial_number || generateSerial();
    const payload = { ...newItem, serial_number: finalSerial };
    
    const { error } = await supabase.from('equipment').insert([payload]);
    if (error) alert('Error: ' + error.message);
    else {
      fetchData();
      setIsNewOpen(false);
      // Resetear formulario
      setNewItem({ name: '', serial_number: '', category: 'audio', location: locations[0]?.name || '', status: 'operativo', description: '', notes: '', parent_id: null });
    }
  };

  const handleUpdate = async () => {
    if (!editingItem) return;
    const { error } = await supabase.from('equipment').update({
        name: editingItem.name,
        serial_number: editingItem.serial_number,
        category: editingItem.category,
        status: editingItem.status,
        description: editingItem.description,
        notes: editingItem.notes,
        location: editingItem.location,
        parent_id: editingItem.parent_id
      }).eq('id', editingItem.id);
    
    if (error) alert('Error: ' + error.message);
    else {
      fetchData();
      setIsEditOpen(false);
      setEditingItem(null);
    }
  };

  const deleteItem = async (id: number) => {
    if (confirm('¿Eliminar equipo?')) {
      await supabase.from('equipment').delete().eq('id', id);
      fetchData();
    }
  };

  const handleCreateLocation = async () => {
    if (!newLocName) return alert("Ponle nombre al menos");
    const { error } = await supabase.from('locations').insert([{ name: newLocName, address: newLocAddress }]);
    if (error) alert('Error: ' + error.message);
    else {
        fetchData();
        setIsNewLocOpen(false);
        setNewLocName(''); setNewLocAddress('');
    }
  };

  const deleteLocation = async (id: number) => {
    if (confirm('¿Seguro? Si borras la ubicación, los equipos ahí quedarán "en el limbo".')) {
      await supabase.from('locations').delete().eq('id', id);
      fetchData();
    }
  };

  const handleBulkMove = async () => {
    if (truckCart.length === 0) return;
    if (confirm(`¿Mover ${truckCart.length} equipos a "${moveDestination}"?`)) {
        // Registramos en historial (simplificado)
        const summary = `${truckCart.length} equipos movidos`;
        await supabase.from('history').insert([{
            user_email: 'ruben@kingston.es',
            destination: moveDestination,
            items_summary: summary,
            date: new Date().toISOString()
        }]);
        
        // Movemos
        await supabase.from('equipment').update({ location: moveDestination }).in('id', truckCart);
        fetchData();
        setTruckCart([]);
        setIsMoveOpen(false);
    }
  };

  // --- HELPERS ---
  const toggleTruck = (id: number) => setTruckCart(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  
  const downloadQR = (id: number, serial: string) => {
    const canvas = document.getElementById(`qr-${id}`) as HTMLCanvasElement;
    if (canvas) {
      const link = document.createElement("a");
      link.href = canvas.toDataURL("image/png");
      link.download = `QR_${serial}.png`;
      link.click();
    }
  };

  const getCategoryData = (catId: string) => CATEGORIES.find(c => c.id === catId) || CATEGORIES[6];

  // Filtros principales (excluye hijos para no duplicar en lista principal)
  const filteredItems = items.filter(item => {
    const search = searchTerm.toLowerCase();
    const matchSearch = item.name?.toLowerCase().includes(search) || item.serial_number?.includes(search) || item.description?.toLowerCase().includes(search);
    const matchCat = categoryFilter === 'Todas' || item.category === categoryFilter;
    return matchSearch && matchCat && !item.parent_id;
  });

  if (loading) return <div className="min-h-screen bg-[#0f172a] text-white flex items-center justify-center">Cargando Sistema...</div>;

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-200 font-sans pb-20">
      
      {/* HEADER */}
      <header className="sticky top-0 z-50 border-b border-slate-800 bg-[#0f172a]/95 backdrop-blur">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white">Sistema de Inventario</h1>
            <p className="text-xs text-blue-400">ruben@kingston.es</p>
          </div>
          <div className="flex gap-2">
            {truckCart.length > 0 && (
                <Button onClick={() => setIsMoveOpen(true)} className="bg-red-600 hover:bg-red-700 text-white text-xs">
                  <Truck className="mr-2 h-4 w-4" /> Mover ({truckCart.length})
                </Button>
            )}
            <Button variant="outline" size="sm" className="border-slate-700 text-slate-300 hover:bg-slate-800"><LogOut className="h-4 w-4" /> Salir</Button>
          </div>
        </div>
      </header>

      {/* NAVEGACIÓN (TABS) */}
      <div className="container mx-auto px-4 mt-6">
        <div className="flex gap-2 overflow-x-auto pb-2 mb-6 border-b border-slate-800">
            {[
                {id: 'inventario', label: 'Equipos', icon: Package},
                {id: 'ubicaciones', label: 'Ubicaciones', icon: MapPin},
                {id: 'historial', label: 'Historial', icon: History},
                {id: 'usuarios', label: 'Usuarios', icon: User}
            ].map(tab => (
                <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center px-4 py-2 rounded-t-lg transition-colors ${activeTab === tab.id ? 'bg-slate-800 text-white border-b-2 border-blue-500' : 'text-slate-500 hover:text-slate-300'}`}
                >
                    <tab.icon className="mr-2 h-4 w-4"/> {tab.label}
                </button>
            ))}
        </div>

        {/* --- CONTENIDO PESTAÑA: EQUIPOS --- */}
        {activeTab === 'inventario' && (
            <div className="animate-in fade-in duration-300">
                <div className="flex flex-col md:flex-row gap-4 justify-between items-end md:items-center mb-6">
                    <h2 className="text-2xl font-bold text-white">Detalle de Equipos</h2>
                    <div className="flex flex-col md:flex-row gap-2 w-full md:w-auto">
                        <div className="relative w-full md:w-72">
                            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                            <input className="w-full bg-slate-900 border border-slate-700 rounded-lg py-2 pl-9 pr-4 text-sm text-white focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Buscar por nombre, S/N..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                        </div>
                        <select className="bg-slate-900 border border-slate-700 rounded-lg py-2 px-3 text-sm text-white" value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}>
                            <option value="Todas">Todas</option>
                            {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                        </select>
                        <Button onClick={() => setIsNewOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white"><Plus className="mr-2 h-4 w-4" /> Nuevo</Button>
                    </div>
                </div>

                <div className="grid gap-4">
                    {filteredItems.map(item => {
                        const CatData = getCategoryData(item.category);
                        const isSelected = truckCart.includes(item.id);
                        const childItems = items.filter(i => i.parent_id === item.id);
                        
                        return (
                            <div key={item.id} className={`rounded-xl border transition-all ${isSelected ? 'bg-blue-900/20 border-blue-500' : 'bg-slate-800/50 border-slate-700 hover:border-slate-600'}`}>
                                <div className="p-5 flex flex-col md:flex-row gap-6">
                                    <div className="flex items-start gap-4">
                                        <button onClick={() => toggleTruck(item.id)}>{isSelected ? <CheckCircle2 className="text-blue-500 h-6 w-6"/> : <Circle className="text-slate-600 h-6 w-6"/>}</button>
                                        <div className={`p-3 rounded-lg ${CatData.color}`}><CatData.icon className="h-6 w-6" /></div>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-3 mb-1">
                                            <h3 className="text-lg font-bold text-white truncate">{item.name}</h3>
                                            <Badge className={item.status === 'operativo' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}>{item.status}</Badge>
                                            <Badge variant="outline" className="border-slate-600 text-slate-400">{CatData.label}</Badge>
                                        </div>
                                        <p className="text-sm text-slate-400 mb-2">{item.description}</p>
                                        <div className="flex flex-wrap gap-4 text-sm mt-3">
                                            <div className="flex flex-col"><span className="text-[10px] text-slate-500 uppercase font-bold">Nº Serie</span><span className="font-mono text-white">{item.serial_number}</span></div>
                                            <div className="flex flex-col"><span className="text-[10px] text-slate-500 uppercase font-bold">Ubicación</span><div className="flex items-center gap-1 text-white"><MapPin className="h-3 w-3 text-blue-400"/> {item.location}</div></div>
                                        </div>
                                        {item.notes && <div className="mt-3 text-xs text-slate-500 bg-slate-900/50 p-2 rounded border border-slate-700/50">📝 {item.notes}</div>}

                                        {/* RACK EXPANDIBLE */}
                                        {item.category === 'rack' && (
                                            <div className="mt-4 bg-[#0f172a] rounded-lg border border-slate-700 overflow-hidden">
                                                <button onClick={() => setExpandedRack(expandedRack === item.id ? null : item.id)} className="w-full flex justify-between items-center p-3 text-sm font-medium text-purple-300 hover:bg-slate-800">
                                                    <span className="flex items-center gap-2"><Layers className="h-4 w-4"/> Contiene {childItems.length} equipos</span>
                                                    {expandedRack === item.id ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}
                                                </button>
                                                {expandedRack === item.id && (
                                                    <div className="divide-y divide-slate-800 border-t border-slate-800">
                                                        {childItems.map(child => (
                                                            <div key={child.id} className="flex justify-between items-center p-3 bg-slate-900/50 text-sm hover:bg-slate-800 transition-colors group">
                                                                <div>
                                                                    <p className="text-slate-200 font-medium">{child.name}</p>
                                                                    <p className="text-xs text-slate-500 font-mono">SN: {child.serial_number}</p>
                                                                </div>
                                                                <div className="flex gap-2">
                                                                    <Badge className="bg-green-500/10 text-green-500 text-[10px]">{child.status}</Badge>
                                                                    <button onClick={() => { setEditingItem(child); setIsEditOpen(true); }} className="text-slate-500 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"><Pencil size={14}/></button>
                                                                </div>
                                                            </div>
                                                        ))}
                                                        {childItems.length === 0 && <p className="text-xs text-slate-500 p-3 text-center">Rack vacío</p>}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {/* QR Y ACCIONES */}
                                    <div className="flex flex-col items-center gap-3 border-l border-slate-700 pl-6 min-w-[140px]">
                                        <div className="bg-white p-2 rounded-lg"><QRCodeCanvas id={`qr-${item.id}`} value={`${item.name}|${item.serial_number}`} size={80} level={"H"} /></div>
                                        <span className="text-[10px] font-mono text-slate-500">{item.serial_number}</span>
                                        <Button variant="outline" size="sm" className="w-full h-7 text-xs border-slate-600 text-slate-300" onClick={() => downloadQR(item.id, item.serial_number)}><Download className="mr-2 h-3 w-3"/> Descargar</Button>
                                        <div className="flex gap-2 w-full mt-1 justify-center">
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-white" onClick={() => { setEditingItem(item); setIsEditOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500/70 hover:text-red-500" onClick={() => deleteItem(item.id)}><Trash2 className="h-4 w-4" /></Button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        )}

        {/* --- CONTENIDO PESTAÑA: UBICACIONES (EXPANDIBLE) --- */}
        {activeTab === 'ubicaciones' && (
            <div className="animate-in fade-in duration-300">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-white">Ubicaciones</h2>
                    <Button onClick={() => setIsNewLocOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white"><Plus className="mr-2 h-4 w-4" /> Nueva Ubicación</Button>
                </div>
                
                <div className="grid gap-3">
                    {locations.map(loc => {
                        const itemsInLoc = items.filter(i => i.location === loc.name); // Items en esta ubicación (incluyendo racks)
                        const isExpanded = expandedLocation === loc.id;

                        return (
                            <div key={loc.id} className="border border-slate-700 bg-slate-800/50 rounded-lg overflow-hidden transition-all">
                                <div className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-800" onClick={() => setExpandedLocation(isExpanded ? null : loc.id)}>
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 bg-blue-500/10 rounded-full text-blue-400"><MapPin size={20}/></div>
                                        <div>
                                            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                                {loc.name} 
                                                <Badge variant="secondary" className="bg-slate-700 text-slate-300 border-0">{itemsInLoc.length} equipos</Badge>
                                            </h3>
                                            <p className="text-sm text-slate-400">{loc.address || "Sin dirección registrada"}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                                            <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white"><Pencil size={16}/></Button>
                                            <Button variant="ghost" size="icon" className="text-red-500/70 hover:text-red-500" onClick={() => deleteLocation(loc.id)}><Trash2 size={16}/></Button>
                                        </div>
                                        {isExpanded ? <ChevronUp className="text-slate-500"/> : <ChevronDown className="text-slate-500"/>}
                                    </div>
                                </div>

                                {isExpanded && (
                                    <div className="border-t border-slate-700 bg-[#0f172a] p-4 animate-in slide-in-from-top-2">
                                        {itemsInLoc.length > 0 ? (
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                                {itemsInLoc.map(item => (
                                                    <div key={item.id} className="p-3 border border-slate-700 rounded bg-slate-800/30 flex justify-between items-center">
                                                        <div className="flex items-center gap-3 overflow-hidden">
                                                            <div className={`w-2 h-8 rounded-full ${item.status === 'operativo' ? 'bg-green-500' : 'bg-red-500'}`}></div>
                                                            <div className="min-w-0">
                                                                <p className="text-sm font-medium text-white truncate">{item.name}</p>
                                                                <p className="text-xs text-slate-500 truncate">{item.category}</p>
                                                            </div>
                                                        </div>
                                                        <Button variant="ghost" size="icon" className="h-6 w-6 text-slate-500 hover:text-white" onClick={() => { setEditingItem(item); setIsEditOpen(true); }}><Pencil size={12}/></Button>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="text-center text-slate-500 py-4">No hay equipos asignados a esta ubicación.</p>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        )}

        {/* --- CONTENIDO PESTAÑA: HISTORIAL (Placeholder) --- */}
        {activeTab === 'historial' && (
            <div className="text-center py-20 text-slate-500">
                <History className="h-16 w-16 mx-auto mb-4 opacity-20" />
                <h3 className="text-xl font-bold text-white">Historial de Movimientos</h3>
                <p>Aquí verás todos los registros (Próximamente mejorado)</p>
            </div>
        )}
      </div>

      {/* --- MODALES --- */}

      {/* NUEVO EQUIPO */}
      <Dialog open={isNewOpen} onOpenChange={setIsNewOpen}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-2xl">
          <DialogHeader><DialogTitle>Nuevo Equipo</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-4">
             <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><label className="text-xs font-bold text-slate-400 uppercase">Nombre</label><Input className="bg-slate-800 border-slate-700" value={newItem.name} onChange={e => setNewItem({...newItem, name: e.target.value})} placeholder="Ej: Micrófono Shure" /></div>
                <div className="space-y-2"><label className="text-xs font-bold text-slate-400 uppercase">Nº Serie</label><Input className="bg-slate-800 border-slate-700" value={newItem.serial_number} onChange={e => setNewItem({...newItem, serial_number: e.target.value})} placeholder="Auto" /></div>
             </div>
             <div className="space-y-2"><label className="text-xs font-bold text-slate-400 uppercase">Descripción</label><Input className="bg-slate-800 border-slate-700" value={newItem.description} onChange={e => setNewItem({...newItem, description: e.target.value})} /></div>
             <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><label className="text-xs font-bold text-slate-400 uppercase">Categoría</label>
                    <select className="w-full h-10 rounded-md border border-slate-700 bg-slate-800 px-3 text-sm text-white" value={newItem.category} onChange={e => setNewItem({...newItem, category: e.target.value})}>
                        {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                    </select>
                </div>
                <div className="space-y-2"><label className="text-xs font-bold text-slate-400 uppercase">Ubicación</label>
                    <select className="w-full h-10 rounded-md border border-slate-700 bg-slate-800 px-3 text-sm text-white" value={newItem.location} onChange={e => setNewItem({...newItem, location: e.target.value})}>
                        {locations.map(l => <option key={l.id} value={l.name}>{l.name}</option>)}
                    </select>
                </div>
             </div>
             <div className="space-y-2">
                 <label className="text-xs font-bold text-slate-400 uppercase">¿Pertenece a un Rack?</label>
                 <select className="w-full h-10 rounded-md border border-slate-700 bg-slate-800 px-3 text-sm text-white" value={newItem.parent_id || 'none'} onChange={e => setNewItem({...newItem, parent_id: e.target.value === 'none' ? null : Number(e.target.value)})}>
                     <option value="none">No, independiente</option>
                     {items.filter(i => i.category === 'rack').map(rack => (<option key={rack.id} value={rack.id}>Dentro de: {rack.name}</option>))}
                 </select>
             </div>
             <div className="space-y-2"><label className="text-xs font-bold text-slate-400 uppercase">Observaciones</label><textarea className="w-full min-h-[80px] rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white" value={newItem.notes} onChange={e => setNewItem({...newItem, notes: e.target.value})} /></div>
             <Button onClick={handleCreate} className="w-full bg-blue-600 hover:bg-blue-700">Guardar</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* EDITAR EQUIPO */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-2xl">
          <DialogHeader><DialogTitle>Editar Equipo</DialogTitle></DialogHeader>
          {editingItem && (
            <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2"><label className="text-xs font-bold text-slate-400 uppercase">Nombre</label><Input className="bg-slate-800 border-slate-700" value={editingItem.name} onChange={e => setEditingItem({...editingItem, name: e.target.value})} /></div>
                    <div className="space-y-2"><label className="text-xs font-bold text-slate-400 uppercase">Nº Serie</label><Input className="bg-slate-800 border-slate-700" value={editingItem.serial_number} onChange={e => setEditingItem({...editingItem, serial_number: e.target.value})} /></div>
                </div>
                <div className="space-y-2"><label className="text-xs font-bold text-slate-400 uppercase">Descripción</label><Input className="bg-slate-800 border-slate-700" value={editingItem.description} onChange={e => setEditingItem({...editingItem, description: e.target.value})} /></div>
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2"><label className="text-xs font-bold text-slate-400 uppercase">Categoría</label>
                        <select className="w-full h-10 rounded-md border border-slate-700 bg-slate-800 px-3 text-sm text-white" value={editingItem.category} onChange={e => setEditingItem({...editingItem, category: e.target.value})}>
                            {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                        </select>
                    </div>
                    <div className="space-y-2"><label className="text-xs font-bold text-slate-400 uppercase">Ubicación (o Rack Padre)</label>
                        <select className="w-full h-10 rounded-md border border-slate-700 bg-slate-800 px-3 text-sm text-white" value={editingItem.parent_id || 'none'} onChange={e => setEditingItem({...editingItem, parent_id: e.target.value === 'none' ? null : Number(e.target.value)})}>
                            <option value="none">Independiente (Usar ubicación)</option>
                            {items.filter(i => i.category === 'rack' && i.id !== editingItem.id).map(rack => (<option key={rack.id} value={rack.id}>Dentro de: {rack.name}</option>))}
                        </select>
                    </div>
                </div>
                
                {/* Si NO está en un rack, mostramos selector de ubicación */}
                {!editingItem.parent_id && (
                    <div className="space-y-2"><label className="text-xs font-bold text-slate-400 uppercase">Ubicación Física</label>
                        <select className="w-full h-10 rounded-md border border-slate-700 bg-slate-800 px-3 text-sm text-white" value={editingItem.location} onChange={e => setEditingItem({...editingItem, location: e.target.value})}>
                            {locations.map(l => <option key={l.id} value={l.name}>{l.name}</option>)}
                        </select>
                    </div>
                )}

                <div className="space-y-2"><label className="text-xs font-bold text-slate-400 uppercase">Observaciones</label><textarea className="w-full min-h-[80px] rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white" value={editingItem.notes} onChange={e => setEditingItem({...editingItem, notes: e.target.value})} /></div>
                <Button onClick={handleUpdate} className="bg-blue-600 hover:bg-blue-700 w-full">Guardar Cambios</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* NUEVA UBICACIÓN */}
      <Dialog open={isNewLocOpen} onOpenChange={setIsNewLocOpen}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white">
            <DialogHeader><DialogTitle>Nueva Ubicación</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-4">
                <div className="space-y-1"><label className="text-xs text-slate-400">Nombre</label><Input className="bg-slate-800 border-slate-700" placeholder="Ej: Teatro Real" value={newLocName} onChange={e => setNewLocName(e.target.value)} /></div>
                <div className="space-y-1"><label className="text-xs text-slate-400">Dirección</label><Input className="bg-slate-800 border-slate-700" placeholder="Calle Mayor, 10" value={newLocAddress} onChange={e => setNewLocAddress(e.target.value)} /></div>
                <Button onClick={handleCreateLocation} className="w-full bg-blue-600 hover:bg-blue-700">Crear</Button>
            </div>
        </DialogContent>
      </Dialog>

      {/* MOVER CAMIÓN */}
      <Dialog open={isMoveOpen} onOpenChange={setIsMoveOpen}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white">
            <DialogHeader><DialogTitle>Mover Equipos</DialogTitle></DialogHeader>
            <div className="py-4 space-y-4">
                <p>Elige el destino para los {truckCart.length} equipos seleccionados:</p>
                <select className="w-full h-10 rounded-md border border-slate-700 bg-slate-800 px-3 text-white" value={moveDestination} onChange={e => setMoveDestination(e.target.value)}>
                    {locations.map(l => <option key={l.id} value={l.name}>{l.name}</option>)}
                </select>
                <Button onClick={handleBulkMove} className="w-full bg-red-600 hover:bg-red-700">Confirmar Movimiento</Button>
            </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}