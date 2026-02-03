import { useState, useEffect } from 'react';
import { Package, Mic, MapPin, History, Truck, LogOut, Search, Plus, Trash2, CheckCircle2, Circle, Pencil, User, Layers, Monitor, Lightbulb, Armchair, Box, X } from 'lucide-react';
import { supabase } from './supabase';
import { Button, Input, Dialog, DialogContent, DialogHeader, DialogTitle, Badge } from './ui';
import { QRCodeCanvas } from 'qrcode.react';

// Categorías fijas
const CATEGORIES = [
  { id: 'audio', label: 'Audio', icon: Mic, color: 'text-blue-400 bg-blue-400/10' },
  { id: 'video', label: 'Video', icon: Monitor, color: 'text-purple-400 bg-purple-400/10' },
  { id: 'iluminacion', label: 'Iluminación', icon: Lightbulb, color: 'text-yellow-400 bg-yellow-400/10' },
  { id: 'soportes', label: 'Soportes', icon: Armchair, color: 'text-orange-400 bg-orange-400/10' },
  { id: 'mobiliario', label: 'Mobiliario', icon: Armchair, color: 'text-green-400 bg-green-400/10' },
  { id: 'rack', label: 'Rack', icon: Layers, color: 'text-pink-400 bg-pink-400/10' },
  { id: 'varios', label: 'Varios', icon: Box, color: 'text-gray-400 bg-gray-400/10' },
];

// Definimos el tipo para el estado de nuevo item
interface ItemState {
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
  const [items, setItems] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('Todas');

  // Estados de acción
  const [truckCart, setTruckCart] = useState<number[]>([]);
  const [isNewOpen, setIsNewOpen] = useState(false);
  const [isMoveOpen, setIsMoveOpen] = useState(false);
  const [isLocManagerOpen, setIsLocManagerOpen] = useState(false);
  const [moveDestination, setMoveDestination] = useState('');
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  
  // Estado para nueva ubicación
  const [newLocName, setNewLocName] = useState('');
  const [newLocAddress, setNewLocAddress] = useState('');

  // Formulario Nuevo Equipo (Con tipo explícito para evitar error de null)
  const [newItem, setNewItem] = useState<ItemState>({ 
    name: '', serial_number: '', category: 'audio', location: '', status: 'operativo', description: '', notes: '', parent_id: null 
  });

  // Estado Rack Expandido (para ver qué lleva dentro)
  const [expandedRack, setExpandedRack] = useState<number | null>(null);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const { data: equip } = await supabase.from('equipment').select('*').order('id', { ascending: false });
      const { data: locs } = await supabase.from('locations').select('*').order('id');
      
      if (equip) setItems(equip);
      if (locs) {
        setLocations(locs);
        // Si hay ubicaciones y el nuevo item no tiene, asignar la primera por defecto
        if (locs.length > 0) {
            setNewItem(prev => ({...prev, location: prev.location || locs[0].name}));
        }
      }
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  // --- GENERADOR DE Nº SERIE ---
  const generateSerial = () => {
    const random = Math.floor(100000 + Math.random() * 900000); // 6 dígitos
    return `${random}`;
  };

  // --- DESCARGAR QR ---
  const downloadQR = (id: number, serial: string) => {
    const canvas = document.getElementById(`qr-${id}`) as HTMLCanvasElement;
    if (canvas) {
      const pngUrl = canvas.toDataURL("image/png");
      const downloadLink = document.createElement("a");
      downloadLink.href = pngUrl;
      downloadLink.download = `QR_${serial}.png`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
    }
  };

  // --- CRUD EQUIPOS ---
  const handleCreate = async () => {
    if (!newItem.name) return alert("El nombre es obligatorio");
    
    // Si no hay serie, generar uno
    const finalSerial = newItem.serial_number || generateSerial();
    
    const payload = { ...newItem, serial_number: finalSerial };
    
    const { error } = await supabase.from('equipment').insert([payload]);
    if (error) alert('Error: ' + error.message);
    else {
      fetchData();
      setIsNewOpen(false);
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
        location: editingItem.location, // Permitir cambio rápido
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
    if (confirm('¿Eliminar este equipo definitivamente?')) {
      await supabase.from('equipment').delete().eq('id', id);
      fetchData();
    }
  };

  // --- CRUD UBICACIONES ---
  const createLocation = async () => {
    if (!newLocName) return;
    const { error } = await supabase.from('locations').insert([{ name: newLocName, address: newLocAddress }]);
    if (!error) { fetchData(); setNewLocName(''); setNewLocAddress(''); }
  };

  const deleteLocation = async (id: number) => {
    if (confirm('¿Borrar ubicación? Los equipos allí perderán su referencia.')) {
      await supabase.from('locations').delete().eq('id', id);
      fetchData();
    }
  };

  // --- LOGICA CAMIÓN ---
  const handleBulkMove = async () => {
    if (truckCart.length === 0) return;
    if (confirm(`¿Mover ${truckCart.length} equipos a "${moveDestination}"?`)) {
      const movedItemsNames = items.filter(i => truckCart.includes(i.id)).map(i => i.name).join(', ');
      await supabase.from('history').insert([{
        user_email: 'admin@kingston.es',
        destination: moveDestination,
        items_summary: `${truckCart.length} equipos: ${movedItemsNames}`,
        date: new Date().toISOString()
      }]);
      await supabase.from('equipment').update({ location: moveDestination }).in('id', truckCart);
      fetchData();
      setTruckCart([]);
      setIsMoveOpen(false);
    }
  };

  const toggleTruck = (id: number) => {
    setTruckCart(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  // --- FILTROS ---
  const filteredItems = items.filter(item => {
    const matchesSearch = item.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          item.serial_number?.includes(searchTerm) ||
                          item.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'Todas' || item.category === categoryFilter;
    const isNotChild = !item.parent_id; // Solo mostramos padres en la lista principal (los hijos van dentro del rack)
    
    return matchesSearch && matchesCategory && isNotChild;
  });

  const getCategoryData = (catId: string) => CATEGORIES.find(c => c.id === catId) || CATEGORIES[6];

  if (loading) return <div className="flex h-screen items-center justify-center bg-slate-900 text-white">Cargando Sistema Kingston...</div>;

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-200 font-sans pb-20">
      
      {/* --- HEADER --- */}
      <header className="sticky top-0 z-50 border-b border-slate-800 bg-[#0f172a]/95 backdrop-blur">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">Sistema de Inventario</h1>
            <p className="text-xs text-slate-400">Bienvenido, <span className="text-blue-400">ruben@kingston.es</span></p>
          </div>
          <div className="flex gap-3">
             {truckCart.length > 0 && (
                <Button onClick={() => setIsMoveOpen(true)} className="bg-red-600 hover:bg-red-700 text-white animate-pulse">
                  <Truck className="mr-2 h-4 w-4" /> Mover ({truckCart.length})
                </Button>
             )}
             <Button variant="outline" size="sm" className="border-slate-700 text-slate-300 hover:bg-slate-800"><LogOut className="mr-2 h-4 w-4" /> Salir</Button>
          </div>
        </div>
      </header>

      {/* --- MENU PRINCIPAL (TABS SIMULADOS) --- */}
      <div className="container mx-auto px-4 mt-6">
        <div className="flex gap-2 overflow-x-auto pb-2 mb-6">
          <Button className="bg-slate-800 text-white hover:bg-slate-700 border border-slate-700"><Package className="mr-2 h-4 w-4"/> Equipos</Button>
          <Button variant="ghost" className="text-slate-400 hover:text-white" onClick={() => setIsLocManagerOpen(true)}><MapPin className="mr-2 h-4 w-4"/> Ubicaciones</Button>
          <Button variant="ghost" className="text-slate-400 hover:text-white"><History className="mr-2 h-4 w-4"/> Historial</Button>
          <Button variant="ghost" className="text-slate-400 hover:text-white"><User className="mr-2 h-4 w-4"/> Usuarios</Button>
        </div>

        {/* --- BARRA DE HERRAMIENTAS --- */}
        <div className="flex flex-col md:flex-row gap-4 justify-between items-end md:items-center mb-6">
            <h2 className="text-2xl font-bold text-white hidden md:block">Detalle de Equipos</h2>
            
            <div className="flex flex-col md:flex-row gap-2 w-full md:w-auto">
                {/* BUSCADOR */}
                <div className="relative w-full md:w-80">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                    <input 
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg py-2 pl-9 pr-4 text-sm text-white focus:ring-2 focus:ring-blue-500 outline-none" 
                      placeholder="Buscar por nombre, descripción o S/N..." 
                      value={searchTerm}
                      onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
                
                {/* FILTRO CATEGORÍA */}
                <select 
                  className="bg-slate-900 border border-slate-700 rounded-lg py-2 px-3 text-sm text-white outline-none"
                  value={categoryFilter}
                  onChange={e => setCategoryFilter(e.target.value)}
                >
                    <option value="Todas">Todas</option>
                    {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                </select>

                {/* BOTÓN NUEVO */}
                <Button onClick={() => setIsNewOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white">
                    <Plus className="mr-2 h-4 w-4" /> Nuevo
                </Button>
            </div>
        </div>

        {/* --- LISTADO DE TARJETAS (NUEVO DISEÑO) --- */}
        <div className="grid gap-4">
          {filteredItems.map(item => {
            const CatData = getCategoryData(item.category);
            const isSelected = truckCart.includes(item.id);
            const childItems = items.filter(i => i.parent_id === item.id); // Items dentro de este rack

            return (
              <div key={item.id} className={`relative rounded-xl border transition-all ${isSelected ? 'bg-blue-900/20 border-blue-500' : 'bg-slate-800/50 border-slate-700 hover:border-slate-600'}`}>
                <div className="p-5 flex flex-col md:flex-row gap-6">
                    
                    {/* COLUMNA IZQUIERDA: Check y Icono */}
                    <div className="flex items-start gap-4">
                        <button onClick={() => toggleTruck(item.id)} className="mt-1">
                            {isSelected ? <CheckCircle2 className="text-blue-500 h-6 w-6" /> : <Circle className="text-slate-600 h-6 w-6" />}
                        </button>
                        <div className={`p-3 rounded-lg ${CatData.color}`}>
                            <CatData.icon className="h-6 w-6" />
                        </div>
                    </div>

                    {/* COLUMNA CENTRAL: Datos */}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-1">
                            <h3 className="text-lg font-bold text-white truncate">{item.name}</h3>
                            <Badge className={`${item.status === 'operativo' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'} border-0`}>
                                {item.status}
                            </Badge>
                            <Badge variant="outline" className="border-slate-600 text-slate-400">{CatData.label}</Badge>
                        </div>
                        <p className="text-sm text-slate-400 mb-2">{item.description || "Sin descripción detallada"}</p>
                        
                        <div className="flex flex-wrap gap-4 text-sm mt-3">
                            <div className="flex flex-col">
                                <span className="text-xs text-slate-500 uppercase font-bold">Nº Serie</span>
                                <span className="font-mono text-white">{item.serial_number}</span>
                            </div>
                            <div className="flex flex-col min-w-[150px]">
                                <span className="text-xs text-slate-500 uppercase font-bold">Ubicación</span>
                                <div className="flex items-center gap-1 text-white">
                                    <MapPin className="h-3 w-3 text-blue-400"/>
                                    <select 
                                        className="bg-transparent border-none p-0 outline-none cursor-pointer hover:text-blue-400"
                                        value={item.location}
                                        onChange={(e) => {
                                            setEditingItem({...item, location: e.target.value}); // Hack rápido para actualizar solo ubicación
                                            setTimeout(handleUpdate, 100);
                                        }}
                                    >
                                        {locations.map(l => <option key={l.id} value={l.name} className="bg-slate-900">{l.name}</option>)}
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* RACK CONTENT (Si es un rack) */}
                        {item.category === 'rack' && (
                            <div className="mt-4 bg-[#0f172a] rounded-lg border border-slate-700 overflow-hidden">
                                <button 
                                    className="w-full flex justify-between items-center p-3 text-sm font-medium text-purple-300 hover:bg-slate-800 transition-colors"
                                    onClick={() => setExpandedRack(expandedRack === item.id ? null : item.id)}
                                >
                                    <span className="flex items-center gap-2">
                                        <Layers className="h-4 w-4"/> Contiene {childItems.length} equipos
                                    </span>
                                    <span>{expandedRack === item.id ? 'Ocultar' : 'Ver contenido'}</span>
                                </button>
                                
                                {expandedRack === item.id && (
                                    <div className="p-2 space-y-1 border-t border-slate-700">
                                        {childItems.map(child => (
                                            <div key={child.id} className="flex justify-between items-center p-2 bg-slate-800/50 rounded text-sm">
                                                <span className="text-slate-300">{child.name}</span>
                                                <Badge className="bg-green-500/10 text-green-500 text-xs">{child.status}</Badge>
                                            </div>
                                        ))}
                                        {childItems.length === 0 && <p className="text-xs text-slate-500 p-2 text-center">Rack vacío</p>}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* COLUMNA DERECHA: QR y Acciones */}
                    <div className="flex flex-col items-center gap-3 border-l border-slate-700 pl-6 min-w-[140px]">
                        <div className="bg-white p-2 rounded-lg">
                            <QRCodeCanvas id={`qr-${item.id}`} value={`${item.name} | SN:${item.serial_number}`} size={80} level={"H"} />
                        </div>
                        <span className="text-[10px] font-mono text-slate-500">SN: {item.serial_number}</span>
                        
                        <Button variant="outline" size="sm" className="w-full h-7 text-xs border-slate-600 text-slate-300" onClick={() => downloadQR(item.id, item.serial_number)}>
                            Descargar
                        </Button>
                        
                        <div className="flex gap-2 w-full mt-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-white hover:bg-slate-700" onClick={() => { setEditingItem(item); setIsEditOpen(true); }}>
                                <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500/70 hover:text-red-500 hover:bg-red-500/10" onClick={() => deleteItem(item.id)}>
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>

                </div>
              </div>
            );
          })}

          {filteredItems.length === 0 && (
             <div className="text-center py-20 text-slate-500">
                <Search className="h-12 w-12 mx-auto mb-4 opacity-20" />
                <p>No se encontraron equipos con esos filtros</p>
             </div>
          )}
        </div>
      </div>

      {/* --- MODAL CREAR NUEVO --- */}
      <Dialog open={isNewOpen} onOpenChange={setIsNewOpen}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-2xl">
          <DialogHeader><DialogTitle>Añadir Nuevo Equipo</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-4">
             <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><label className="text-xs font-bold text-slate-400 uppercase">Nombre</label><Input className="bg-slate-800 border-slate-700" value={newItem.name} onChange={e => setNewItem({...newItem, name: e.target.value})} placeholder="Ej: Micrófono Shure" /></div>
                <div className="space-y-2"><label className="text-xs font-bold text-slate-400 uppercase">Nº Serie (Auto si está vacío)</label><Input className="bg-slate-800 border-slate-700" value={newItem.serial_number} onChange={e => setNewItem({...newItem, serial_number: e.target.value})} placeholder="Generar Automático" /></div>
             </div>
             
             <div className="space-y-2"><label className="text-xs font-bold text-slate-400 uppercase">Descripción</label><Input className="bg-slate-800 border-slate-700" value={newItem.description} onChange={e => setNewItem({...newItem, description: e.target.value})} placeholder="Modelo exacto, color..." /></div>
             
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
                 <select 
                    className="w-full h-10 rounded-md border border-slate-700 bg-slate-800 px-3 text-sm text-white" 
                    value={newItem.parent_id || 'none'} 
                    onChange={e => setNewItem({...newItem, parent_id: e.target.value === 'none' ? null : Number(e.target.value)})}
                 >
                     <option value="none">No, es independiente</option>
                     {items.filter(i => i.category === 'rack').map(rack => (
                         <option key={rack.id} value={rack.id}>Dentro de: {rack.name}</option>
                     ))}
                 </select>
             </div>

             <div className="space-y-2"><label className="text-xs font-bold text-slate-400 uppercase">Observaciones</label><textarea className="w-full min-h-[80px] rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white" value={newItem.notes} onChange={e => setNewItem({...newItem, notes: e.target.value})} placeholder="Golpe en la esquina, falta cable..." /></div>
             
             <Button onClick={handleCreate} className="w-full bg-blue-600 hover:bg-blue-700">Guardar Equipo</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* --- MODAL EDITAR --- */}
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
                    <div className="space-y-2"><label className="text-xs font-bold text-slate-400 uppercase">Estado</label>
                        <select className="w-full h-10 rounded-md border border-slate-700 bg-slate-800 px-3 text-sm text-white" value={editingItem.status} onChange={e => setEditingItem({...editingItem, status: e.target.value})}>
                            <option value="operativo">Operativo</option>
                            <option value="reparacion">Reparación</option>
                        </select>
                    </div>
                </div>
                <div className="space-y-2">
                 <label className="text-xs font-bold text-slate-400 uppercase">Ubicación (o Rack Padre)</label>
                 <select 
                    className="w-full h-10 rounded-md border border-slate-700 bg-slate-800 px-3 text-sm text-white" 
                    value={editingItem.parent_id || 'none'} 
                    onChange={e => setEditingItem({...editingItem, parent_id: e.target.value === 'none' ? null : Number(e.target.value)})}
                 >
                     <option value="none">Independiente (Usar ubicación normal)</option>
                     {items.filter(i => i.category === 'rack' && i.id !== editingItem.id).map(rack => (
                         <option key={rack.id} value={rack.id}>Dentro de: {rack.name}</option>
                     ))}
                 </select>
                </div>
                <div className="space-y-2"><label className="text-xs font-bold text-slate-400 uppercase">Observaciones</label><textarea className="w-full min-h-[80px] rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white" value={editingItem.notes} onChange={e => setEditingItem({...editingItem, notes: e.target.value})} /></div>
                <Button onClick={handleUpdate} className="bg-blue-600 hover:bg-blue-700 w-full">Guardar Cambios</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* --- MODAL MOVER CAMIÓN --- */}
      <Dialog open={isMoveOpen} onOpenChange={setIsMoveOpen}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white">
            <DialogHeader><DialogTitle>Mover {truckCart.length} equipos</DialogTitle></DialogHeader>
            <div className="py-4 space-y-4">
                <select className="w-full h-10 rounded-md border border-slate-700 bg-slate-800 px-3 text-white" value={moveDestination} onChange={e => setMoveDestination(e.target.value)}>
                    {locations.map(l => <option key={l.id} value={l.name}>{l.name}</option>)}
                </select>
                <Button onClick={handleBulkMove} className="w-full bg-red-600 hover:bg-red-700">Confirmar Movimiento</Button>
            </div>
        </DialogContent>
      </Dialog>

      {/* --- MODAL GESTOR UBICACIONES --- */}
      <Dialog open={isLocManagerOpen} onOpenChange={setIsLocManagerOpen}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white">
            <DialogHeader><DialogTitle>Gestión de Ubicaciones</DialogTitle></DialogHeader>
            <div className="space-y-6 pt-4">
                {/* Crear */}
                <div className="flex gap-2 items-end">
                    <div className="flex-1 space-y-1">
                        <label className="text-xs text-slate-400">Nueva Ubicación</label>
                        <Input className="bg-slate-800 border-slate-700" placeholder="Nombre (ej: Almacén B)" value={newLocName} onChange={e => setNewLocName(e.target.value)} />
                    </div>
                    <Button onClick={createLocation}><Plus className="h-4 w-4"/></Button>
                </div>
                
                {/* Listar */}
                <div className="border rounded-md border-slate-700 divide-y divide-slate-700 max-h-[300px] overflow-y-auto">
                    {locations.map(loc => (
                        <div key={loc.id} className="p-3 flex justify-between items-center bg-slate-800/50">
                            <div>
                                <p className="font-medium text-sm">{loc.name}</p>
                                <p className="text-xs text-slate-500">{items.filter(i => i.location === loc.name).length} equipos aquí</p>
                            </div>
                            <Button variant="ghost" size="icon" className="text-red-400 hover:bg-red-900/20" onClick={() => deleteLocation(loc.id)}>
                                <X className="h-4 w-4"/>
                            </Button>
                        </div>
                    ))}
                </div>
            </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}