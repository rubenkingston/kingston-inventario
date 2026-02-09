import { useState, useEffect } from 'react';
import { Mic, MapPin, Truck, LogOut, Search, Plus, CheckCircle2, Circle, Pencil, Layers, Monitor, Lightbulb, Armchair, Box, ChevronDown, ChevronUp, Download, Copy, QrCode, ShieldCheck, Trash2, History as HistoryIcon, LayoutDashboard, Package, AlertCircle, User as UserIcon, X } from 'lucide-react';
import { supabase } from './supabase';
import { Button, Input, Dialog, DialogContent, DialogHeader, DialogTitle, Badge } from './ui';
import { QRCodeCanvas } from 'qrcode.react';
import { QRScanner } from './Scanner';

const CATEGORIES = [
  { id: 'audio', label: 'Audio', icon: Mic },
  { id: 'video', label: 'Video', icon: Monitor },
  { id: 'iluminacion', label: 'Iluminación', icon: Lightbulb },
  { id: 'soportes', label: 'Soportes', icon: Armchair },
  { id: 'mobiliario', label: 'Mobiliario', icon: Armchair },
  { id: 'rack', label: 'Rack', icon: Layers },
  { id: 'varios', label: 'Varios', icon: Box },
];

export default function App() {
  const [items, setItems] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [historyLog, setHistoryLog] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState('inventario');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [truckIds, setTruckIds] = useState<number[]>([]);
  
  const [isNewOpen, setIsNewOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isTruckOpen, setIsTruckOpen] = useState(false);
  const [isLocModalOpen, setIsLocModalOpen] = useState(false);
  const [isQRModalOpen, setIsQRModalOpen] = useState(false);
  const [showScanner, setShowScanner] = useState(false);

  const [editingItem, setEditingItem] = useState<any>(null);
  const [selectedQR, setSelectedQR] = useState<any>(null);
  const [expandedRack, setExpandedRack] = useState<number | null>(null);
  const [expandedLocation, setExpandedLocation] = useState<number | null>(null);
  const [report, setReport] = useState<any>(null);
  const [moveDest, setMoveDest] = useState('');
  const [newItem, setNewItem] = useState<any>({ name: '', serial_number: '', category: 'audio', location: '', status: 'operativo', notes: '' });
  const [newLoc, setNewLoc] = useState({ name: '', address: '' });

  const adminEmail = "ruben@kingston.es";

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    const { data: equip } = await supabase.from('equipment').select('*').order('id', { ascending: false });
    const { data: locs } = await supabase.from('locations').select('*').order('id');
    const { data: hist } = await supabase.from('history').select('*').order('date', { ascending: false });
    if (equip) setItems(equip);
    if (locs) { 
      setLocations(locs); 
      if (locs.length > 0) {
        setMoveDest(locs[0].name);
        setNewItem((p: any) => ({...p, location: p.location || locs[0].name}));
      }
    }
    if (hist) setHistoryLog(hist);
  };

  const generateSerial = () => Math.floor(100000 + Math.random() * 900000).toString();

  const handleScan = (serial: string) => {
    const item = items.find(i => i.serial_number === serial);
    if (item) {
      setTruckIds(prev => prev.includes(item.id) ? prev : [...prev, item.id]);
      alert(`Añadido al camión: ${item.name}`);
    } else {
      alert("Equipo no reconocido");
    }
  };

  const handleUpdate = async () => {
    if (!editingItem) return;
    const { error } = await supabase.from('equipment').update(editingItem).eq('id', editingItem.id);
    if (!error) { fetchData(); setIsEditOpen(false); setEditingItem(null); }
  };

  const handleCreate = async () => {
    if (!newItem.name) return alert("Nombre obligatorio");
    const { error } = await supabase.from('equipment').insert([{...newItem, serial_number: newItem.serial_number || generateSerial()}]);
    if (!error) { fetchData(); setIsNewOpen(false); setNewItem({ name: '', serial_number: '', category: 'audio', location: locations[0]?.name || '', status: 'operativo', notes: '' }); }
  };

  const handleTransport = async () => {
    const inTruck = items.filter(i => truckIds.includes(i.id));
    const names = inTruck.map(i => i.name).join(', ');
    await supabase.from('equipment').update({ location: moveDest }).in('id', truckIds);
    await supabase.from('history').insert([{ user_email: adminEmail, destination: moveDest, items_summary: names, device_info: navigator.platform, date: new Date().toISOString() }]);
    setReport({ count: truckIds.length, dest: moveDest, summary: names }); setTruckIds([]); setIsTruckOpen(false); fetchData();
  };

  const deleteLocation = async (loc: any) => {
    const count = items.filter(i => i.location === loc.name).length;
    if (count > 0) return alert(`BLOQUEADO: No puedes borrar "${loc.name}" porque tiene ${count} equipos. Muévelos primero.`);
    if (confirm(`¿Borrar ubicación?`)) { await supabase.from('locations').delete().eq('id', loc.id); fetchData(); }
  };

  const downloadQR = (id: number, serial: string) => {
    const canvas = document.getElementById(`qr-${id}`) as HTMLCanvasElement;
    if (canvas) { const link = document.createElement("a"); link.href = canvas.toDataURL("image/png"); link.download = `QR_${serial}.png`; link.click(); }
  };

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-200 font-sans pb-20">
      {showScanner && <QRScanner onScan={handleScan} onClose={() => setShowScanner(false)} />}
      
      <header className="sticky top-0 z-50 border-b border-slate-800 bg-[#0f172a]/95 backdrop-blur p-4 flex justify-between items-center">
        <div><h1 className="text-xl font-bold text-white tracking-tight">Sistema de Inventario</h1><p className="text-xs text-blue-400">{adminEmail}</p></div>
        <div className="flex gap-2">
            <Button onClick={() => setIsTruckOpen(true)} className={`relative ${truckIds.length > 0 ? 'bg-green-600' : 'bg-slate-800'}`}>
                <Truck size={18} className="mr-2"/> Camión {truckIds.length > 0 && <Badge className="absolute -top-2 -right-2 bg-red-500 border-0">{truckIds.length}</Badge>}
            </Button>
            <Button variant="ghost" className="text-slate-500" onClick={() => window.location.reload()}><LogOut size={18}/></Button>
        </div>
      </header>

      <nav className="container mx-auto px-4 mt-4 flex gap-2 border-b border-slate-800 overflow-x-auto">
        {[
          { id: 'inventario', label: 'Inventario', icon: LayoutDashboard },
          { id: 'equipos', label: 'Equipos', icon: Package },
          { id: 'ubicaciones', label: 'Ubicaciones', icon: MapPin },
          { id: 'historial', label: 'Historial', icon: HistoryIcon },
          { id: 'usuarios', label: 'Usuarios', icon: ShieldCheck }
        ].map(tab => {
          const NavIcon = tab.icon;
          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-all ${activeTab === tab.id ? 'text-white border-b-2 border-blue-500 bg-slate-800/50' : 'text-slate-500'}`}>
              <NavIcon size={16}/> {tab.label}
            </button>
          );
        })}
      </nav>

      <main className="container mx-auto px-4 mt-6">
        {activeTab === 'inventario' && (
          <div className="space-y-8 animate-in fade-in">
            <button onClick={() => setShowScanner(true)} className="w-full aspect-[16/5] bg-blue-600 hover:bg-blue-500 rounded-3xl flex flex-col items-center justify-center gap-2 shadow-xl transition-all active:scale-95 group">
                <QrCode size={48} className="text-white group-hover:scale-110 transition-transform"/><span className="text-lg font-bold uppercase tracking-widest text-white">Escanear para Camión</span>
            </button>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {locations.map(loc => {
                    const count = items.filter(i => i.location === loc.name).length;
                    return count > 0 ? (
                        <div key={loc.id} className="bg-slate-800/40 border border-slate-700 p-6 rounded-2xl text-center"><span className="text-4xl font-black text-white">{count}</span><p className="text-[10px] text-slate-400 font-bold uppercase mt-1">{loc.name}</p></div>
                    ) : null;
                })}
            </div>
            <section><h2 className="text-sm font-bold text-red-400 uppercase mb-4 flex items-center gap-2"><AlertCircle size={16}/> Equipos en Reparación</h2>
                <div className="space-y-2">{items.filter(i => i.status === 'reparacion').map(item => (
                    <div key={item.id} className="bg-red-500/5 border border-red-500/10 p-4 rounded-xl flex justify-between items-center"><div><p className="font-bold text-white">{item.name}</p><p className="text-[10px] text-slate-500">{item.location}</p></div><Badge className="bg-red-500/20 text-red-500 border-0">REPARANDO</Badge></div>
                ))}</div>
            </section>
          </div>
        )}

        {activeTab === 'equipos' && (
          <div className="space-y-4">
            <div className="flex gap-4 items-center">
                <div className="relative flex-1"><Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" /><input className="w-full bg-slate-900 border border-slate-700 rounded-lg py-2 pl-9 pr-4 text-sm outline-none" placeholder="Buscar..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} /></div>
                <Button variant="outline" onClick={() => setShowScanner(true)} className="border-slate-700 p-2"><QrCode size={20}/></Button>
                {selectedIds.length > 0 && <Button onClick={() => { setTruckIds([...truckIds, ...selectedIds]); setSelectedIds([]); }} className="bg-blue-600 animate-pulse">Al Camión ({selectedIds.length})</Button>}
                <Button onClick={() => setIsNewOpen(true)} className="bg-blue-600"><Plus size={18}/></Button>
            </div>
            <div className="grid gap-4">{items.filter(i => !i.parent_id && i.name.toLowerCase().includes(searchTerm.toLowerCase())).map(item => {
                const isInTruck = truckIds.includes(item.id);
                const isSelected = selectedIds.includes(item.id);
                return (
                  <div key={item.id} className={`p-5 rounded-xl border transition-all ${isInTruck ? 'bg-green-900/20 border-green-500' : isSelected ? 'border-blue-500 bg-blue-900/10' : 'bg-slate-800/50 border-slate-700'}`}>
                    <div className="flex flex-col md:flex-row gap-6">
                      <div className="flex items-start gap-4"><button disabled={isInTruck} onClick={() => setSelectedIds(p => isSelected ? p.filter(id => id !== item.id) : [...p, item.id])}>{isSelected ? <CheckCircle2 className="text-blue-500" /> : <Circle className="text-slate-600" />}</button><div className="p-3 rounded-lg bg-slate-700"><Package size={24}/></div></div>
                      <div className="flex-1"><div className="flex items-center gap-3"><h3 className="text-lg font-bold text-white truncate">{item.name}</h3><Badge className={item.status === 'operativo' ? 'bg-green-500/20 text-green-400 border-0' : 'bg-red-500/20 text-red-400 border-0'}>{item.status}</Badge></div>
                        <div className="flex items-center gap-2 mt-1 text-blue-400 font-bold text-xs"><MapPin size={12}/> {item.location}</div>
                        {item.category === 'rack' && (
                            <div className="mt-4 bg-[#0f172a] rounded-lg border border-slate-700 overflow-hidden">
                                <button onClick={() => setExpandedRack(expandedRack === item.id ? null : item.id)} className="w-full flex justify-between p-3 text-xs text-purple-300"><span>Equipos: {items.filter(c => c.parent_id === item.id).length}</span>{expandedRack === item.id ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}</button>
                                {expandedRack === item.id && <div className="divide-y divide-slate-800 border-t border-slate-800">{items.filter(c => c.parent_id === item.id).map(c => (<div key={c.id} className="flex justify-between p-3 text-xs"><span>{c.name}</span><div className="flex gap-3"><button onClick={() => {setSelectedQR(c); setIsQRModalOpen(true)}} className="text-slate-400"><QrCode size={14}/></button><button onClick={() => {setEditingItem(c); setIsEditOpen(true)}} className="text-slate-400"><Pencil size={14}/></button></div></div>))}</div>}
                            </div>
                        )}
                      </div>
                      <div className="flex flex-col items-center gap-2 border-l border-slate-700 pl-6"><div className="bg-white p-1 rounded"><QRCodeCanvas id={`qr-${item.id}`} value={item.serial_number} size={60}/></div><div className="flex gap-2"><button onClick={() => {setEditingItem(item); setIsEditOpen(true)}} className="p-1 hover:text-white"><Pencil size={14}/></button><button onClick={() => {setNewItem({...item, id: undefined, serial_number: ''}); setIsNewOpen(true)}} className="p-1 hover:text-blue-400"><Copy size={14}/></button><button onClick={() => downloadQR(item.id, item.serial_number)} className="p-1 hover:text-blue-400"><Download size={14}/></button></div></div>
                    </div>
                  </div>
                );
              })}</div>
          </div>
        )}

        {activeTab === 'ubicaciones' && (
          <div className="space-y-4">
            <Button onClick={() => {setNewLoc({name: '', address: ''}); setIsLocModalOpen(true)}} className="bg-blue-600 mb-2"><Plus size={18} className="mr-2"/> Nueva Ubicación</Button>
            {locations.map(loc => (
              <div key={loc.id} className="bg-slate-800/50 border border-slate-700 rounded-lg overflow-hidden transition-all">
                <div className="p-4 flex justify-between items-center cursor-pointer hover:bg-slate-800" onClick={() => setExpandedLocation(expandedLocation === loc.id ? null : loc.id)}>
                    <div className="flex gap-4 items-center"><MapPin className="text-blue-400"/><div><h3 className="font-bold text-white">{loc.name}</h3><p className="text-xs text-slate-500">{loc.address}</p></div></div>
                    <div className="flex gap-3 items-center">
                      <Badge variant="secondary" className="bg-slate-700 border-0">{items.filter(i => i.location === loc.name).length} items</Badge>
                      <button onClick={(e) => {e.stopPropagation(); setNewLoc(loc); setIsLocModalOpen(true);}} className="text-slate-400 hover:text-white"><Pencil size={16}/></button>
                      <button onClick={(e) => {e.stopPropagation(); deleteLocation(loc);}} className="text-red-500/70 hover:text-red-500"><Trash2 size={16}/></button>
                      {expandedLocation === loc.id ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}
                    </div>
                </div>
                {expandedLocation === loc.id && <div className="p-4 bg-slate-900/50 border-t border-slate-700 grid grid-cols-1 md:grid-cols-2 gap-2">{items.filter(i => i.location === loc.name).map(i => (<div key={i.id} className="text-xs p-2 bg-slate-800 rounded border border-slate-700 flex justify-between"><span>{i.name}</span><span className="text-slate-500">{i.serial_number}</span></div>))}</div>}
              </div>
            ))}
          </div>
        )}

        {activeTab === 'historial' && (
          <div className="space-y-3">{historyLog.map(log => (
              <div key={log.id} className="p-4 bg-slate-800/40 border-l-4 border-blue-500 rounded">
                <div className="flex justify-between text-[10px] text-slate-500 mb-2">
                  <span>{new Date(log.date).toLocaleString()}</span>
                  <span className="font-bold flex items-center gap-1"><UserIcon size={10}/> {log.user_email}</span>
                </div>
                <p className="text-sm font-bold">A: <span className="text-blue-400 uppercase">{log.destination}</span></p>
                <p className="text-xs text-slate-400 mt-1 italic">{log.items_summary}</p>
              </div>
          ))}</div>
        )}

        {activeTab === 'usuarios' && (
          <div className="text-center p-12 border-2 border-dashed border-slate-800 rounded-3xl"><ShieldCheck size={48} className="mx-auto text-blue-500 mb-4 opacity-50"/><h2 className="text-xl font-bold text-white">Panel Admin Kingston</h2></div>
        )}
      </main>

      <Dialog open={isTruckOpen} onOpenChange={setIsTruckOpen}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white">
          <DialogHeader>
            <DialogTitle className="flex justify-between items-center">
              <span>Camión</span>
              <Button variant="ghost" size="sm" className="text-red-400" onClick={() => { setTruckIds([]); setIsTruckOpen(false); }}>Vaciar</Button>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="bg-slate-950/50 rounded-lg border border-slate-800 p-3 max-h-48 overflow-y-auto space-y-2">
              {items.filter(i => truckIds.includes(i.id)).map(i => (<div key={i.id} className="flex justify-between text-xs border-b border-slate-800 pb-1"><span>{i.name}</span><span className="text-slate-500">{i.serial_number}</span></div>))}
            </div>
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-slate-500">Mover a:</label>
              <select className="w-full bg-slate-800 border-slate-700 rounded h-10 p-2 text-white outline-none" value={moveDest} onChange={e => setMoveDest(e.target.value)}>
                {locations.map(l => <option key={l.id} value={l.name}>{l.name}</option>)}
              </select>
            </div>
            <Button onClick={handleTransport} className="w-full bg-green-600">TRANSPORTAR</Button>
          </div>
        </DialogContent>
      </Dialog>

      {report && (
        <div className="fixed inset-0 bg-black/90 z-[100] flex items-center justify-center p-4">
          <div className="bg-[#1e293b] border border-blue-500 p-8 rounded-3xl text-center max-w-sm animate-in zoom-in">
            <h2 className="text-xl font-bold text-white mb-2 uppercase">Movimiento Exitoso</h2>
            <div className="bg-slate-900 p-4 mb-6 rounded-xl text-left"><p className="text-xs text-blue-400 font-bold mb-1">Destino: {report.dest}</p><p className="text-xs text-slate-300 italic">{report.summary}</p></div>
            <Button onClick={() => setReport(null)} className="w-full bg-blue-600">Cerrar</Button>
          </div>
        </div>
      )}

      <Dialog open={isNewOpen} onOpenChange={setIsNewOpen}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-2xl">
          <DialogHeader><DialogTitle className="flex justify-between items-center"><span>Nuevo Equipo</span><button onClick={() => setIsNewOpen(false)}><X size={18}/></button></DialogTitle></DialogHeader>
          <div className="grid gap-4 py-4 overflow-y-auto max-h-[70vh] px-1">
            <Input className="bg-slate-800 border-slate-700" placeholder="Nombre" value={newItem.name} onChange={e => setNewItem({...newItem, name: e.target.value})} />
            <Input className="bg-slate-800 border-slate-700" placeholder="Nº Serie" value={newItem.serial_number} onChange={e => setNewItem({...newItem, serial_number: e.target.value})} />
            <select className="w-full h-10 rounded-md border border-slate-700 bg-slate-800 px-3 text-sm text-white outline-none" value={newItem.category} onChange={e => setNewItem({...newItem, category: e.target.value})}>
              {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
            <textarea className="w-full bg-slate-800 border-slate-700 rounded p-3 text-sm outline-none" placeholder="Notas" value={newItem.notes} onChange={e => setNewItem({...newItem, notes: e.target.value})} />
            <Button onClick={handleCreate} className="bg-blue-600">Guardar</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white">
          <DialogHeader><DialogTitle className="flex justify-between items-center"><span>Editar Equipo</span><button onClick={() => setIsEditOpen(false)}><X size={18}/></button></DialogTitle></DialogHeader>
          {editingItem && (
            <div className="grid gap-4 py-4">
              <Input className="bg-slate-800 border-slate-700" value={editingItem.name} onChange={e => setEditingItem({...editingItem, name: e.target.value})} />
              <select className="bg-slate-800 p-2 rounded text-white outline-none" value={editingItem.status} onChange={e => setEditingItem({...editingItem, status: e.target.value})}><option value="operativo">Operativo</option><option value="reparacion">En Reparación</option></select>
              <Button onClick={handleUpdate} className="bg-blue-600">Actualizar</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isLocModalOpen} onOpenChange={setIsLocModalOpen}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white">
          <DialogHeader><DialogTitle className="flex justify-between items-center"><span>Ubicación</span><button onClick={() => setIsLocModalOpen(false)}><X size={18}/></button></DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <Input className="bg-slate-800 border-slate-700" placeholder="Nombre" value={newLoc.name} onChange={e => setNewLoc({...newLoc, name: e.target.value})} />
            <Input className="bg-slate-800 border-slate-700" placeholder="Dirección" value={newLoc.address} onChange={e => setNewLoc({...newLoc, address: e.target.value})} />
            <Button onClick={async () => { await supabase.from('locations').upsert([newLoc]); fetchData(); setIsLocModalOpen(false); }} className="bg-blue-600 w-full">Guardar</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isQRModalOpen} onOpenChange={setIsQRModalOpen}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-xs text-center">
          <DialogHeader><DialogTitle className="flex justify-between items-center"><span>{selectedQR?.name}</span><button onClick={() => setIsQRModalOpen(false)}><X size={18}/></button></DialogTitle></DialogHeader>
            <div className="flex flex-col items-center py-6 gap-4">
              <div className="bg-white p-3 rounded-xl"><QRCodeCanvas id={`qr-${selectedQR?.id}`} value={selectedQR?.serial_number || ''} size={180} /></div>
              <Button className="w-full" onClick={() => downloadQR(selectedQR.id, selectedQR.serial_number)}><Download size={16} className="mr-2"/> Descargar PNG</Button>
            </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}