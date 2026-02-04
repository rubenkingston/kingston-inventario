import { useState, useEffect } from 'react';
import { Package, Mic, MapPin, Truck, LogOut, Search, Plus, Trash2, CheckCircle2, Circle, Pencil, Layers, Monitor, Lightbulb, Armchair, Box, ChevronDown, ChevronUp, Download, Copy, QrCode } from 'lucide-react';
import { supabase } from './supabase';
import { Button, Input, Dialog, DialogContent, DialogHeader, DialogTitle, Badge } from './ui';
import { QRCodeCanvas } from 'qrcode.react';

const CATEGORIES = [
  { id: 'audio', label: 'Audio', icon: Mic, color: 'text-blue-400 bg-blue-400/10' },
  { id: 'video', label: 'Video', icon: Monitor, color: 'text-purple-400 bg-purple-400/10' },
  { id: 'iluminacion', label: 'Iluminación', icon: Lightbulb, color: 'text-yellow-400 bg-yellow-400/10' },
  { id: 'soportes', label: 'Soportes', icon: Armchair, color: 'text-orange-400 bg-orange-400/10' },
  { id: 'mobiliario', label: 'Mobiliario', icon: Armchair, color: 'text-green-400 bg-green-400/10' },
  { id: 'rack', label: 'Rack', icon: Layers, color: 'text-pink-400 bg-pink-400/10' },
  { id: 'varios', label: 'Varios', icon: Box, color: 'text-gray-400 bg-gray-400/10' },
];

export default function App() {
  const [items, setItems] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState('inventario');
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('Todas');
  const [expandedRack, setExpandedRack] = useState<number | null>(null);
  const [expandedLocation, setExpandedLocation] = useState<number | null>(null);
  const [truckCart, setTruckCart] = useState<number[]>([]);
  const [isNewOpen, setIsNewOpen] = useState(false);
  const [isMoveOpen, setIsMoveOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isQRModalOpen, setIsQRModalOpen] = useState(false);
  const [selectedQR, setSelectedQR] = useState<any>(null);
  const [moveDestination, setMoveDestination] = useState('');
  const [editingItem, setEditingItem] = useState<any>(null);
  const [newItem, setNewItem] = useState<any>({ 
    name: '', serial_number: '', category: 'audio', location: '', status: 'operativo', description: '', notes: '', parent_id: null 
  });

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const { data: equip } = await supabase.from('equipment').select('*').order('id', { ascending: false });
      const { data: locs } = await supabase.from('locations').select('*').order('id');
      if (equip) setItems(equip);
      if (locs) {
        setLocations(locs);
        if (locs.length > 0) {
            setNewItem((prev: any) => ({...prev, location: prev.location || locs[0].name}));
            setMoveDestination((prev: any) => prev || locs[0].name);
        }
      }
    } catch (e) { console.error(e); }
  };

  const generateSerial = () => Math.floor(100000 + Math.random() * 900000).toString();

  const handleCreate = async () => {
    if (!newItem.name) return alert("El nombre es obligatorio");
    const payload = { ...newItem, serial_number: newItem.serial_number || generateSerial() };
    const { error } = await supabase.from('equipment').insert([payload]);
    if (error) alert('Error: ' + error.message);
    else {
      fetchData();
      setIsNewOpen(false);
      setNewItem({ name: '', serial_number: '', category: 'audio', location: locations[0]?.name || '', status: 'operativo', description: '', notes: '', parent_id: null });
    }
  };

  const handleDuplicate = (item: any) => {
    setNewItem({
      ...item,
      id: undefined,
      serial_number: '',
    });
    setIsNewOpen(true);
  };

  const handleUpdate = async () => {
    if (!editingItem) return;
    const { error } = await supabase.from('equipment').update({
        name: editingItem.name, serial_number: editingItem.serial_number, category: editingItem.category,
        status: editingItem.status, description: editingItem.description, notes: editingItem.notes,
        location: editingItem.location, parent_id: editingItem.parent_id
      }).eq('id', editingItem.id);
    if (error) alert('Error: ' + error.message);
    else { fetchData(); setIsEditOpen(false); setEditingItem(null); }
  };

  const deleteItem = async (id: number) => {
    if (confirm('¿Eliminar equipo?')) { await supabase.from('equipment').delete().eq('id', id); fetchData(); }
  };

  const handleBulkMove = async () => {
    if (truckCart.length === 0) return;
    await supabase.from('equipment').update({ location: moveDestination }).in('id', truckCart);
    fetchData(); setTruckCart([]); setIsMoveOpen(false);
  };

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

  const filteredItems = items.filter(item => {
    const search = searchTerm.toLowerCase();
    const matchSearch = item.name?.toLowerCase().includes(search) || item.serial_number?.includes(search) || item.description?.toLowerCase().includes(search);
    const matchCat = categoryFilter === 'Todas' || item.category === categoryFilter;
    return matchSearch && matchCat && !item.parent_id;
  });

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-200 font-sans pb-20">
      <header className="sticky top-0 z-50 border-b border-slate-800 bg-[#0f172a]/95 backdrop-blur">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div><h1 className="text-xl font-bold text-white">Sistema de Inventario</h1><p className="text-xs text-blue-400">ruben@kingston.es</p></div>
          <div className="flex gap-2">
            {truckCart.length > 0 && <Button onClick={() => setIsMoveOpen(true)} className="bg-red-600 hover:bg-red-700 text-white text-xs"><Truck className="mr-2 h-4 w-4" /> Mover ({truckCart.length})</Button>}
            <Button variant="outline" size="sm" className="border-slate-700 text-slate-300 hover:bg-slate-800"><LogOut className="h-4 w-4" /> Salir</Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 mt-6">
        <div className="flex gap-2 overflow-x-auto pb-2 mb-6 border-b border-slate-800">
            {[{id: 'inventario', label: 'Equipos'}, {id: 'ubicaciones', label: 'Ubicaciones'}].map(tab => (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex items-center px-4 py-2 rounded-t-lg transition-colors ${activeTab === tab.id ? 'bg-slate-800 text-white border-b-2 border-blue-500' : 'text-slate-500 hover:text-slate-300'}`}>{tab.label}</button>
            ))}
        </div>

        {activeTab === 'inventario' && (
            <div className="animate-in fade-in duration-300">
                <div className="flex flex-col md:flex-row gap-4 justify-between items-end md:items-center mb-6">
                    <h2 className="text-2xl font-bold text-white">Detalle de Equipos</h2>
                    <div className="flex flex-col md:flex-row gap-2 w-full md:w-auto">
                        <div className="relative w-full md:w-72">
                            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                            <input className="w-full bg-slate-900 border border-slate-700 rounded-lg py-2 pl-9 pr-4 text-sm text-white outline-none" placeholder="Buscar..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
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
                        const CatData = CATEGORIES.find(c => c.id === item.category) || CATEGORIES[6];
                        const childItems = items.filter(i => i.parent_id === item.id);
                        return (
                            <div key={item.id} className="rounded-xl border bg-slate-800/50 border-slate-700 p-5 flex flex-col md:flex-row gap-6">
                                <div className="flex items-start gap-4">
                                    <button onClick={() => toggleTruck(item.id)}>{truckCart.includes(item.id) ? <CheckCircle2 className="text-blue-500 h-6 w-6"/> : <Circle className="text-slate-600 h-6 w-6"/>}</button>
                                    <div className={`p-3 rounded-lg ${CatData.color}`}><CatData.icon className="h-6 w-6" /></div>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-3 mb-1">
                                        <h3 className="text-lg font-bold text-white truncate">{item.name}</h3>
                                        <Badge className={item.status === 'operativo' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}>{item.status}</Badge>
                                    </div>
                                    <p className="text-sm text-slate-400 mb-2">{item.description}</p>
                                    <div className="flex flex-wrap gap-4 text-sm mt-3 font-mono text-white">
                                        <div><p className="text-[10px] text-slate-500 uppercase font-bold">SN</p>{item.serial_number}</div>
                                        <div><p className="text-[10px] text-slate-500 uppercase font-bold">Ubicación</p>{item.location}</div>
                                    </div>
                                    {item.category === 'rack' && (
                                        <div className="mt-4 bg-[#0f172a] rounded-lg border border-slate-700">
                                            <button onClick={() => setExpandedRack(expandedRack === item.id ? null : item.id)} className="w-full flex justify-between p-3 text-sm text-purple-300">
                                                <span>Contiene {childItems.length} equipos</span> {expandedRack === item.id ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}
                                            </button>
                                            {expandedRack === item.id && (
                                                <div className="divide-y divide-slate-800 border-t border-slate-800">
                                                    {childItems.map(child => (
                                                        <div key={child.id} className="flex justify-between items-center p-3 text-sm">
                                                            <div><p className="text-slate-200">{child.name}</p><p className="text-[10px] text-slate-500">SN: {child.serial_number}</p></div>
                                                            <div className="flex gap-3">
                                                                <button onClick={() => { setSelectedQR(child); setIsQRModalOpen(true); }} className="text-slate-500 hover:text-blue-400"><QrCode size={16}/></button>
                                                                <button onClick={() => { setEditingItem(child); setIsEditOpen(true); }} className="text-slate-500 hover:text-white"><Pencil size={14}/></button>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                                <div className="flex flex-col items-center gap-2 min-w-[140px] border-l border-slate-700 pl-6">
                                    <div className="bg-white p-1 rounded"><QRCodeCanvas id={`qr-${item.id}`} value={item.serial_number} size={70} /></div>
                                    <Button variant="ghost" size="sm" className="h-7 text-[10px] text-slate-400" onClick={() => downloadQR(item.id, item.serial_number)}><Download size={12}/> QR</Button>
                                    <div className="flex gap-2 mt-2">
                                        <button onClick={() => handleDuplicate(item)} className="p-2 text-slate-400 hover:text-blue-400"><Copy size={16}/></button>
                                        <button onClick={() => { setEditingItem(item); setIsEditOpen(true); }} className="p-2 text-slate-400 hover:text-white"><Pencil size={16}/></button>
                                        <button onClick={() => deleteItem(item.id)} className="p-2 text-slate-400 hover:text-red-500"><Trash2 size={16}/></button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        )}

        {activeTab === 'ubicaciones' && (
            <div className="grid gap-3">
                {locations.map(loc => (
                    <div key={loc.id} className="border border-slate-700 bg-slate-800/50 rounded-lg">
                        <div className="p-4 flex justify-between items-center cursor-pointer" onClick={() => setExpandedLocation(expandedLocation === loc.id ? null : loc.id)}>
                            <div className="flex items-center gap-4">
                                <MapPin className="text-blue-400"/>
                                <div><h3 className="font-bold text-white">{loc.name}</h3><p className="text-xs text-slate-500">{loc.address}</p></div>
                            </div>
                            <Badge variant="secondary">{items.filter(i => i.location === loc.name).length} items</Badge>
                        </div>
                        {expandedLocation === loc.id && (
                            <div className="p-4 bg-slate-900/50 border-t border-slate-700 grid grid-cols-1 md:grid-cols-2 gap-2">
                                {items.filter(i => i.location === loc.name).map(i => (
                                    <div key={i.id} className="text-xs p-2 bg-slate-800 rounded border border-slate-700 flex justify-between">
                                        <span className="text-slate-300">{i.name}</span><span className="text-slate-500">{i.serial_number}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        )}
      </div>

      <Dialog open={isQRModalOpen} onOpenChange={setIsQRModalOpen}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-xs text-center">
            <DialogHeader><DialogTitle>{selectedQR?.name}</DialogTitle></DialogHeader>
            <div className="flex flex-col items-center py-6 gap-4">
                <div className="bg-white p-3 rounded-xl"><QRCodeCanvas id={`qr-${selectedQR?.id}`} value={selectedQR?.serial_number || ''} size={180} /></div>
                <Button className="w-full" onClick={() => downloadQR(selectedQR.id, selectedQR.serial_number)}><Download className="mr-2"/> Descargar PNG</Button>
            </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isNewOpen} onOpenChange={setIsNewOpen}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-2xl">
          <DialogHeader><DialogTitle>Nuevo Equipo</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-4">
             <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1"><label className="text-[10px] uppercase font-bold text-slate-500">Nombre</label><Input className="bg-slate-800 border-slate-700" value={newItem.name} onChange={e => setNewItem({...newItem, name: e.target.value})} /></div>
                <div className="space-y-1"><label className="text-[10px] uppercase font-bold text-slate-500">Nº Serie</label><Input className="bg-slate-800 border-slate-700" value={newItem.serial_number} onChange={e => setNewItem({...newItem, serial_number: e.target.value})} placeholder="Auto" /></div>
             </div>
             <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1"><label className="text-[10px] uppercase font-bold text-slate-500">Categoría</label>
                    <select className="w-full h-10 rounded-md border border-slate-700 bg-slate-800 px-3 text-sm text-white" value={newItem.category} onChange={e => setNewItem({...newItem, category: e.target.value})}>{CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}</select>
                </div>
                <div className="space-y-1"><label className="text-[10px] uppercase font-bold text-slate-500">RACK</label>
                    <select className="w-full h-10 rounded-md border border-slate-700 bg-slate-800 px-3 text-sm text-white" value={newItem.parent_id || 'none'} onChange={e => setNewItem({...newItem, parent_id: e.target.value === 'none' ? null : Number(e.target.value)})}>
                        <option value="none">No</option>{items.filter(i => i.category === 'rack').map(r => (<option key={r.id} value={r.id}>{r.name}</option>))}
                    </select>
                </div>
             </div>
             <Button onClick={handleCreate} className="w-full bg-blue-600 hover:bg-blue-700">Guardar</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-2xl">
          <DialogHeader><DialogTitle>Editar Equipo</DialogTitle></DialogHeader>
          {editingItem && (
            <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1"><label className="text-[10px] uppercase font-bold text-slate-500">Nombre</label><Input className="bg-slate-800 border-slate-700" value={editingItem.name} onChange={e => setEditingItem({...editingItem, name: e.target.value})} /></div>
                    <div className="space-y-1"><label className="text-[10px] uppercase font-bold text-slate-500">Nº Serie</label><Input className="bg-slate-800 border-slate-700" value={editingItem.serial_number} onChange={e => setEditingItem({...editingItem, serial_number: e.target.value})} /></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1"><label className="text-[10px] uppercase font-bold text-slate-500">Categoría</label>
                        <select className="w-full h-10 rounded-md border border-slate-700 bg-slate-800 px-3 text-sm text-white" value={editingItem.category} onChange={e => setEditingItem({...editingItem, category: e.target.value})}>{CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}</select>
                    </div>
                    <div className="space-y-1"><label className="text-[10px] uppercase font-bold text-slate-500">RACK</label>
                        <select className="w-full h-10 rounded-md border border-slate-700 bg-slate-800 px-3 text-sm text-white" value={editingItem.parent_id || 'none'} onChange={e => setEditingItem({...editingItem, parent_id: e.target.value === 'none' ? null : Number(e.target.value)})}>
                            <option value="none">No</option>{items.filter(i => i.category === 'rack' && i.id !== editingItem.id).map(r => (<option key={r.id} value={r.id}>{r.name}</option>))}
                        </select>
                    </div>
                </div>
                <Button onClick={handleUpdate} className="bg-blue-600 hover:bg-blue-700 w-full">Guardar Cambios</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isMoveOpen} onOpenChange={setIsMoveOpen}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white">
            <DialogHeader><DialogTitle>Mover Equipos</DialogTitle></DialogHeader>
            <div className="py-4 space-y-4">
                <select className="w-full h-10 rounded-md border border-slate-700 bg-slate-800 px-3 text-white" value={moveDestination} onChange={e => setMoveDestination(e.target.value)}>{locations.map(l => <option key={l.id} value={l.name}>{l.name}</option>)}</select>
                <Button onClick={handleBulkMove} className="w-full bg-red-600 hover:bg-red-700">Confirmar</Button>
            </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}