import { useState, useEffect } from 'react';
import { Mic, MapPin, Truck, LogOut, Search, Plus, Trash2, CheckCircle2, Circle, Pencil, Layers, Monitor, Lightbulb, Armchair, Box, ChevronDown, ChevronUp, Download, Copy, QrCode, AlertTriangle, ShieldCheck } from 'lucide-react';
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
  const [user, setUser] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState('inventario');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Lógica de Selección y Camión
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [truckItems, setTruckItems] = useState<number[]>([]);
  
  // Modales
  const [isNewOpen, setIsNewOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isTruckOpen, setIsTruckOpen] = useState(false);
  const [isQRModalOpen, setIsQRModalOpen] = useState(false);
  const [isLocModalOpen, setIsLocModalOpen] = useState(false);
  const [reportModal, setReportModal] = useState<any>(null);

  const [editingItem, setEditingItem] = useState<any>(null);
  const [editingLoc, setEditingLoc] = useState<any>(null);
  const [moveDestination, setMoveDestination] = useState('');
  const [newItem, setNewItem] = useState<any>({ 
    name: '', serial_number: '', category: 'audio', location: '', status: 'operativo', description: '', notes: '', parent_id: null 
  });

  useEffect(() => {
    checkUser();
    fetchData();
  }, []);

  const checkUser = async () => {
    const { data } = await supabase.auth.getUser();
    setUser(data.user);
  };

  const fetchData = async () => {
    const { data: equip } = await supabase.from('equipment').select('*').order('id', { ascending: false });
    const { data: locs } = await supabase.from('locations').select('*').order('id');
    const { data: hist } = await supabase.from('history').select('*').order('date', { ascending: false });
    if (equip) setItems(equip);
    if (locs) {
        setLocations(locs);
        setMoveDestination(locs[0]?.name || '');
    }
    if (hist) setHistory(hist);
  };

  // --- LÓGICA DE ESTADO DE RACK ---
  const getRackStatus = (rackId: number) => {
    const children = items.filter(i => i.parent_id === rackId);
    if (children.some(c => c.status === 'reparacion')) return 'reparacion';
    return 'operativo';
  };

  // --- ACCIONES DEL CAMIÓN ---
  const addToTruck = () => {
    setTruckItems(prev => [...new Set([...prev, ...selectedIds])]);
    setSelectedIds([]);
  };

  const handleTransport = async () => {
    const itemsInTruck = items.filter(i => truckItems.includes(i.id));
    const hasRepairs = itemsInTruck.some(i => i.status === 'reparacion');

    if (hasRepairs) {
      if (!confirm("ADVERTENCIA: Hay equipos en reparación en el camión. ¿Desea moverlos de todos modos?")) return;
    }

    const { error } = await supabase.from('equipment').update({ location: moveDestination }).in('id', truckItems);
    
    if (!error) {
      await supabase.from('history').insert([{
        user_email: user?.email || 'ruben@kingston.es',
        destination: moveDestination,
        items_summary: itemsInTruck.map(i => i.name).join(', '),
        device_info: navigator.userAgent.slice(0, 50),
        date: new Date().toISOString()
      }]);
      
      setReportModal({ dest: moveDestination, count: truckItems.length });
      setTruckItems([]);
      setIsTruckOpen(false);
      fetchData();
    }
  };

  const handleCreate = async () => {
    const payload = { ...newItem, serial_number: newItem.serial_number || Math.random().toString(36).substr(2, 9).toUpperCase() };
    await supabase.from('equipment').insert([payload]);
    fetchData();
    setIsNewOpen(false);
  };

  const downloadQR = (id: number, serial: string) => {
    const canvas = document.getElementById(`qr-${id}`) as HTMLCanvasElement;
    if (canvas) {
      const link = document.createElement("a");
      link.href = canvas.toDataURL("image/png");
      link.download = `QR_${serial}.png`;
      link.click();
    }
  };

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-200 font-sans pb-20">
      <header className="sticky top-0 z-50 border-b border-slate-800 bg-[#0f172a]/95 backdrop-blur px-4 py-4 flex justify-between items-center">
        <div><h1 className="text-xl font-bold text-white">Sistema de Inventario</h1><p className="text-xs text-blue-400">{user?.email || 'ruben@kingston.es'}</p></div>
        <div className="flex gap-3">
          <Button onClick={() => setIsTruckOpen(true)} className={`relative ${truckItems.length > 0 ? 'bg-green-600' : 'bg-slate-800'}`}>
            <Truck size={18} className="mr-2"/> Camión {truckItems.length > 0 && <Badge className="absolute -top-2 -right-2 bg-red-500">{truckItems.length}</Badge>}
          </Button>
          <Button variant="ghost" size="sm" className="text-slate-400"><LogOut size={18}/></Button>
        </div>
      </header>

      <nav className="container mx-auto px-4 mt-4 flex gap-2 border-b border-slate-800 overflow-x-auto">
        {['Equipos', 'Ubicaciones', 'Historial', 'Usuarios'].map(tab => {
          if (tab === 'Usuarios' && user?.email !== 'ruben@kingston.es') return null;
          return (
            <button key={tab} onClick={() => setActiveTab(tab.toLowerCase())} className={`px-4 py-2 text-sm font-medium transition-colors ${activeTab === tab.toLowerCase() ? 'text-white border-b-2 border-blue-500' : 'text-slate-500'}`}>{tab}</button>
          );
        })}
      </nav>

      <main className="container mx-auto px-4 mt-6">
        {activeTab === 'inventario' && (
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row gap-4 justify-between">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
                <input className="w-full bg-slate-900 border border-slate-700 rounded-lg py-2 pl-9 pr-4 text-sm text-white" placeholder="Buscar..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
              </div>
              <div className="flex gap-2">
                {selectedIds.length > 0 && <Button onClick={addToTruck} className="bg-blue-600 animate-bounce">Pasar al Camión ({selectedIds.length})</Button>}
                <Button onClick={() => setIsNewOpen(true)} className="bg-blue-600"><Plus size={18} className="mr-2"/> Nuevo</Button>
              </div>
            </div>

            <div className="grid gap-4">
              {items.filter(i => !i.parent_id && i.name.toLowerCase().includes(searchTerm.toLowerCase())).map(item => {
                const isInTruck = truckItems.includes(item.id);
                const displayStatus = item.category === 'rack' ? getRackStatus(item.id) : item.status;
                const isSelected = selectedIds.includes(item.id);

                return (
                  <div key={item.id} className={`p-5 rounded-xl border transition-all ${isInTruck ? 'bg-green-900/20 border-green-500 opacity-80' : isSelected ? 'border-blue-500 bg-blue-900/10' : 'bg-slate-800/50 border-slate-700'}`}>
                    <div className="flex flex-col md:flex-row gap-6">
                      <div className="flex items-start gap-4">
                        <button disabled={isInTruck} onClick={() => setSelectedIds(prev => isSelected ? prev.filter(id => id !== item.id) : [...prev, item.id])}>
                          {isSelected ? <CheckCircle2 className="text-blue-500" /> : <Circle className="text-slate-600" />}
                        </button>
                        <div className={`p-3 rounded-lg bg-slate-700`}><Package size={24}/></div>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <h3 className="text-lg font-bold">{item.name}</h3>
                          <Badge className={displayStatus === 'operativo' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}>{displayStatus}</Badge>
                        </div>
                        <p className="text-sm text-slate-400 mt-1">{item.description}</p>
                        <div className="flex gap-4 mt-4 text-xs font-mono">
                          <div className="text-slate-500">SN: <span className="text-white">{item.serial_number}</span></div>
                          <div className="text-slate-500">UBICACIÓN: <span className="text-white">{item.location}</span></div>
                        </div>
                      </div>
                      <div className="flex flex-col items-center gap-2 border-l border-slate-700 pl-6">
                        <div className="bg-white p-1 rounded"><QRCodeCanvas id={`qr-${item.id}`} value={item.serial_number} size={60}/></div>
                        <div className="flex gap-2 mt-2">
                           <button onClick={() => {setEditingItem(item); setIsEditOpen(true)}} className="p-1 hover:text-white"><Pencil size={16}/></button>
                           <button onClick={() => downloadQR(item.id, item.serial_number)} className="p-1 hover:text-blue-400"><Download size={16}/></button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* --- PESTAÑA UBICACIONES --- */}
        {activeTab === 'ubicaciones' && (
          <div className="space-y-4">
            <Button onClick={() => setIsLocModalOpen(true)} className="bg-blue-600"><Plus size={18} className="mr-2"/> Nueva Ubicación</Button>
            {locations.map(loc => (
              <div key={loc.id} className="bg-slate-800/50 border border-slate-700 rounded-lg overflow-hidden">
                <div className="p-4 flex justify-between items-center cursor-pointer hover:bg-slate-800">
                  <div className="flex gap-3 items-center">
                    <MapPin className="text-blue-400"/>
                    <div><h3 className="font-bold">{loc.name}</h3><p className="text-xs text-slate-500">{loc.address}</p></div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => {setEditingLoc(loc); setIsLocModalOpen(true)}} className="p-2 hover:bg-slate-700 rounded"><Pencil size={16}/></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* --- PESTAÑA HISTORIAL --- */}
        {activeTab === 'historial' && (
          <div className="space-y-3">
            {history.map(log => (
              <div key={log.id} className="p-4 bg-slate-800/40 border-l-4 border-blue-500 rounded-r-lg">
                <div className="flex justify-between text-xs text-slate-500 mb-2">
                  <span>{new Date(log.date).toLocaleString()}</span>
                  <span className="flex items-center gap-1"><User size={12}/> {log.user_email}</span>
                </div>
                <p className="text-sm font-medium">Destino: <span className="text-blue-400">{log.destination}</span></p>
                <p className="text-xs text-slate-400 mt-1">Equipos: {log.items_summary}</p>
                <p className="text-[10px] text-slate-600 mt-2 italic">Dispositivo: {log.device_info}</p>
              </div>
            ))}
          </div>
        )}

        {/* --- PESTAÑA USUARIOS (ADMIN) --- */}
        {activeTab === 'usuarios' && (
          <div className="p-10 border-2 border-dashed border-slate-800 rounded-xl text-center">
            <ShieldCheck size={48} className="mx-auto mb-4 text-blue-500"/>
            <h2 className="text-xl font-bold">Gestión de Usuarios Kingston</h2>
            <p className="text-slate-500 mt-2">Solo accesible para administradores.</p>
            <Button className="mt-6 bg-blue-600">Crear Nuevo Usuario</Button>
          </div>
        )}
      </main>

      {/* --- MODAL DEL CAMIÓN --- */}
      <Dialog open={isTruckOpen} onOpenChange={setIsTruckOpen}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-lg">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Truck/> Equipos en el Camión</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="max-h-60 overflow-y-auto space-y-2 border-b border-slate-800 pb-4">
              {items.filter(i => truckItems.includes(i.id)).map(i => (
                <div key={i.id} className="flex justify-between p-2 bg-slate-800 rounded">
                  <span>{i.name}</span>
                  {i.status === 'reparacion' && <Badge className="bg-red-500/20 text-red-500"><AlertTriangle size={12} className="mr-1"/> REPARACIÓN</Badge>}
                </div>
              ))}
            </div>
            <div className="space-y-2">
              <label className="text-xs text-slate-500">UBICACIÓN DE DESTINO</label>
              <select className="w-full bg-slate-800 border-slate-700 rounded h-10 p-2" value={moveDestination} onChange={e => setMoveDestination(e.target.value)}>
                {locations.map(l => <option key={l.id} value={l.name}>{l.name}</option>)}
              </select>
            </div>
            <Button onClick={handleTransport} className="w-full bg-green-600 py-6 text-lg">TRANSPORTAR EQUIPOS</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* --- MODAL NUEVO EQUIPO --- */}
      <Dialog open={isNewOpen} onOpenChange={setIsNewOpen}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white">
          <DialogHeader><DialogTitle>Nuevo Equipo</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-4">
            <Input className="bg-slate-800" placeholder="Nombre" value={newItem.name} onChange={e => setNewItem({...newItem, name: e.target.value})} />
            <div className="flex flex-col gap-1">
              <label className="text-[10px] text-slate-500">OBSERVACIONES (Máx 300 caracteres)</label>
              <textarea maxLength={300} className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-sm" value={newItem.notes} onChange={e => setNewItem({...newItem, notes: e.target.value})} />
            </div>
            <Button onClick={handleCreate} className="bg-blue-600">Guardar Equipo</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* --- REPORTE DE MOVIMIENTO --- */}
      {reportModal && (
        <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4">
          <Card className="bg-slate-900 border-green-500 p-8 text-center max-w-sm">
            <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4 text-green-500"><CheckCircle2 size={32}/></div>
            <h2 className="text-2xl font-bold">¡Transporte Éxitoso!</h2>
            <p className="text-slate-400 mt-2">Se han movido {reportModal.count} equipos a <span className="text-white font-bold">{reportModal.dest}</span> correctamente.</p>
            <Button onClick={() => setReportModal(null)} className="mt-6 w-full">Cerrar</Button>
          </Card>
        </div>
      )}
    </div>
  );
}