import { useState, useEffect } from 'react';
import { Mic, MapPin, Truck, LogOut, Search, Plus, CheckCircle2, Circle, Pencil, Layers, Monitor, Lightbulb, Armchair, Box, ChevronDown, ChevronUp, Download, Copy, QrCode, ShieldCheck } from 'lucide-react';
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
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [truckIds, setTruckIds] = useState<number[]>([]);
  const [isNewOpen, setIsNewOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isTruckOpen, setIsTruckOpen] = useState(false);
  const [isQRModalOpen, setIsQRModalOpen] = useState(false);
  const [isLocModalOpen, setIsLocModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [selectedQR, setSelectedQR] = useState<any>(null);
  const [expandedRack, setExpandedRack] = useState<number | null>(null);
  const [expandedLocation, setExpandedLocation] = useState<number | null>(null);
  const [report, setReport] = useState<any>(null);
  const [moveDest, setMoveDest] = useState('');
  const [newItem, setNewItem] = useState<any>({ name: '', serial_number: '', category: 'audio', location: '', status: 'operativo', description: '', notes: '', parent_id: null });
  const [newLoc, setNewLoc] = useState({ name: '', address: '' });

  const adminEmail = "ruben@kingston.es";

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    const { data: equip } = await supabase.from('equipment').select('*').order('id', { ascending: false });
    const { data: locs } = await supabase.from('locations').select('*').order('id');
    if (equip) setItems(equip);
    if (locs) { setLocations(locs); if (locs.length > 0) { setMoveDest(locs[0].name); setNewItem((p: any) => ({...p, location: p.location || locs[0].name})); } }
  };

  const getRackStatus = (rackId: number) => {
    const children = items.filter(i => i.parent_id === rackId);
    return children.some(c => c.status === 'reparacion') ? 'reparacion' : 'operativo';
  };

  const handleCreate = async () => {
    if (!newItem.name) return alert("Nombre obligatorio");
    const { error } = await supabase.from('equipment').insert([{...newItem, serial_number: newItem.serial_number || Math.floor(100000 + Math.random() * 900000).toString()}]);
    if (!error) { fetchData(); setIsNewOpen(false); setNewItem({ name: '', serial_number: '', category: 'audio', location: locations[0]?.name || '', status: 'operativo', description: '', notes: '', parent_id: null }); }
  };

  const handleUpdate = async () => {
    if (!editingItem) return;
    const { error } = await supabase.from('equipment').update(editingItem).eq('id', editingItem.id);
    if (!error) { fetchData(); setIsEditOpen(false); setEditingItem(null); }
  };

  const handleTransport = async () => {
    const inTruck = items.filter(i => truckIds.includes(i.id));
    if (inTruck.some(i => i.status === 'reparacion') && !confirm("Equipos en reparación. ¿Mover?")) return;
    await supabase.from('equipment').update({ location: moveDest }).in('id', truckIds);
    await supabase.from('history').insert([{ user_email: adminEmail, destination: moveDest, items_summary: inTruck.map(i => i.name).join(', '), device_info: navigator.platform, date: new Date().toISOString() }]);
    setReport({ count: truckIds.length, dest: moveDest }); setTruckIds([]); setIsTruckOpen(false); fetchData();
  };

  const downloadQR = (id: number, serial: string) => {
    const canvas = document.getElementById(`qr-${id}`) as HTMLCanvasElement;
    if (canvas) { const link = document.createElement("a"); link.href = canvas.toDataURL("image/png"); link.download = `QR_${serial}.png`; link.click(); }
  };

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-200 font-sans pb-20">
      <header className="sticky top-0 z-50 border-b border-slate-800 bg-[#0f172a]/95 backdrop-blur p-4 flex justify-between items-center">
        <div><h1 className="text-xl font-bold text-white">Sistema de Inventario</h1><p className="text-xs text-blue-400">{adminEmail}</p></div>
        <div className="flex gap-2">
            <Button onClick={() => setIsTruckOpen(true)} className={`relative ${truckIds.length > 0 ? 'bg-green-600' : 'bg-slate-800'}`}><Truck size={18} className="mr-2"/> Camión {truckIds.length > 0 && <Badge className="absolute -top-2 -right-2 bg-red-500 border-0">{truckIds.length}</Badge>}</Button>
            <Button variant="ghost" className="text-slate-500" onClick={() => window.location.reload()}><LogOut size={18}/></Button>
        </div>
      </header>

      <nav className="container mx-auto px-4 mt-4 flex gap-4 border-b border-slate-800 overflow-x-auto">
        {['Equipos', 'Ubicaciones', 'Usuarios'].map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab.toLowerCase())} className={`pb-2 text-sm font-medium ${activeTab === tab.toLowerCase() ? 'text-white border-b-2 border-blue-500' : 'text-slate-500'}`}>{tab}</button>
        ))}
      </nav>

      <main className="container mx-auto px-4 mt-6">
        {activeTab === 'equipos' || activeTab === 'inventario' ? (
          <div className="space-y-4">
            <div className="flex gap-4 items-center">
                <div className="relative flex-1"><Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" /><input className="w-full bg-slate-900 border border-slate-700 rounded-lg py-2 pl-9 pr-4 text-sm outline-none" placeholder="Buscar..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} /></div>
                {selectedIds.length > 0 && <Button onClick={() => { setTruckIds([...truckIds, ...selectedIds]); setSelectedIds([]); }} className="bg-blue-600">Al Camión ({selectedIds.length})</Button>}
                <Button onClick={() => setIsNewOpen(true)} className="bg-blue-600"><Plus size={18}/></Button>
            </div>
            <div className="grid gap-4">
              {items.filter(i => !i.parent_id && i.name.toLowerCase().includes(searchTerm.toLowerCase())).map(item => {
                const isInTruck = truckIds.includes(item.id);
                const isSelected = selectedIds.includes(item.id);
                const status = item.category === 'rack' ? getRackStatus(item.id) : item.status;
                const CatIcon = CATEGORIES.find(c => c.id === item.category)?.icon || Box;
                return (
                  <div key={item.id} className={`p-5 rounded-xl border transition-all ${isInTruck ? 'bg-green-900/20 border-green-500' : isSelected ? 'border-blue-500 bg-blue-900/10' : 'bg-slate-800/50 border-slate-700'}`}>
                    <div className="flex flex-col md:flex-row gap-6">
                      <div className="flex items-start gap-4">
                        <button disabled={isInTruck} onClick={() => setSelectedIds(p => isSelected ? p.filter(id => id !== item.id) : [...p, item.id])}>
                          {isSelected ? <CheckCircle2 className="text-blue-500" /> : <Circle className="text-slate-600" />}
                        </button>
                        <div className="p-3 rounded-lg bg-slate-700 text-slate-300"><CatIcon size={24}/></div>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-3"><h3 className="text-lg font-bold text-white truncate">{item.name}</h3><Badge className={status === 'operativo' ? 'bg-green-500/20 text-green-400 border-0' : 'bg-red-500/20 text-red-400 border-0'}>{status}</Badge></div>
                        <p className="text-sm text-slate-400 mt-1 truncate">{item.description}</p>
                        <div className="flex gap-4 mt-4 text-[10px] font-mono text-slate-500 uppercase"><span>SN: <span className="text-white">{item.serial_number}</span></span><span>UBICACIÓN: <span className="text-white">{item.location}</span></span></div>
                        {item.category === 'rack' && (
                            <div className="mt-4 bg-[#0f172a] rounded-lg border border-slate-700 overflow-hidden">
                                <button onClick={() => setExpandedRack(expandedRack === item.id ? null : item.id)} className="w-full flex justify-between p-3 text-xs text-purple-300"><span>Contiene {items.filter(c => c.parent_id === item.id).length} equipos</span>{expandedRack === item.id ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}</button>
                                {expandedRack === item.id && <div className="divide-y divide-slate-800 border-t border-slate-800">{items.filter(c => c.parent_id === item.id).map(c => (<div key={c.id} className="flex justify-between p-3 text-xs"><span>{c.name}</span><div className="flex gap-3"><button onClick={() => {setSelectedQR(c); setIsQRModalOpen(true)}} className="text-slate-400 hover:text-white"><QrCode size={14}/></button><button onClick={() => {setEditingItem(c); setIsEditOpen(true)}} className="text-slate-400 hover:text-white"><Pencil size={14}/></button></div></div>))}</div>}
                            </div>
                        )}
                      </div>
                      <div className="flex flex-col items-center gap-2 border-l border-slate-700 pl-6"><div className="bg-white p-1 rounded"><QRCodeCanvas id={`qr-${item.id}`} value={item.serial_number} size={60}/></div><div className="flex gap-2"><button onClick={() => {setEditingItem(item); setIsEditOpen(true)}} className="p-1 text-slate-400 hover:text-white"><Pencil size={14}/></button><button onClick={() => {setNewItem({...item, id: undefined, serial_number: ''}); setIsNewOpen(true)}} className="p-1 text-slate-400 hover:text-blue-400"><Copy size={14}/></button><button onClick={() => downloadQR(item.id, item.serial_number)} className="p-1 text-slate-400 hover:text-blue-400"><Download size={14}/></button></div></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : activeTab === 'ubicaciones' ? (
          <div className="space-y-4">
            <Button onClick={() => {setNewLoc({name: '', address: ''}); setIsLocModalOpen(true)}} className="bg-blue-600 mb-2"><Plus size={18} className="mr-2"/> Nueva Ubicación</Button>
            {locations.map(loc => (
              <div key={loc.id} className="bg-slate-800/50 border border-slate-700 rounded-lg overflow-hidden">
                <div className="p-4 flex justify-between items-center cursor-pointer hover:bg-slate-800" onClick={() => setExpandedLocation(expandedLocation === loc.id ? null : loc.id)}>
                    <div className="flex gap-4 items-center"><MapPin className="text-blue-400"/><div><h3 className="font-bold text-white">{loc.name}</h3><p className="text-xs text-slate-500">{loc.address}</p></div></div>
                    <div className="flex gap-3 items-center"><Badge variant="secondary" className="bg-slate-700 border-0">{items.filter(i => i.location === loc.name).length} items</Badge>{expandedLocation === loc.id ? <ChevronUp size={16} className="text-slate-500"/> : <ChevronDown size={16} className="text-slate-500"/>}</div>
                </div>
                {expandedLocation === loc.id && <div className="p-4 bg-slate-900/50 border-t border-slate-700 grid grid-cols-1 md:grid-cols-2 gap-2">{items.filter(i => i.location === loc.name).map(i => (<div key={i.id} className="text-xs p-2 bg-slate-800 rounded border border-slate-700 flex justify-between"><span>{i.name}</span><span className="text-slate-500">{i.serial_number}</span></div>))}</div>}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center p-12 border-2 border-dashed border-slate-800 rounded-xl"><ShieldCheck size={48} className="mx-auto text-blue-500 mb-4 opacity-50"/><h2 className="text-xl font-bold">Panel Admin Kingston</h2></div>
        )}
      </main>

      {/* MODAL GESTION EQUIPO */}
      <Dialog open={isNewOpen} onOpenChange={setIsNewOpen}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-2xl">
          <DialogHeader><DialogTitle>Gestionar Equipo</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-4 overflow-y-auto max-h-[80vh]">
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1"><label className="text-[10px] uppercase font-bold text-slate-500">Nombre</label><Input className="bg-slate-800 border-slate-700" value={newItem.name} onChange={e => setNewItem({...newItem, name: e.target.value})} /></div>
                <div className="space-y-1"><label className="text-[10px] uppercase font-bold text-slate-500">Nº Serie</label><Input className="bg-slate-800 border-slate-700" value={newItem.serial_number} onChange={e => setNewItem({...newItem, serial_number: e.target.value})} placeholder="Auto" /></div>
            </div>
            <div className="space-y-1"><label className="text-[10px] uppercase font-bold text-slate-500">Descripción</label><Input className="bg-slate-800 border-slate-700" value={newItem.description} onChange={e => setNewItem({...newItem, description: e.target.value})} /></div>
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1"><label className="text-[10px] uppercase font-bold text-slate-500">Categoría</label><select className="w-full h-10 rounded-md border border-slate-700 bg-slate-800 px-3 text-sm text-white" value={newItem.category} onChange={e => setNewItem({...newItem, category: e.target.value})}>{CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}</select></div>
                <div className="space-y-1"><label className="text-[10px] uppercase font-bold text-slate-500">RACK</label><select className="w-full h-10 rounded-md border border-slate-700 bg-slate-800 px-3 text-sm text-white" value={newItem.parent_id || 'none'} onChange={e => setNewItem({...newItem, parent_id: e.target.value === 'none' ? null : Number(e.target.value)})}>
                    <option value="none">No</option>{items.filter(i => i.category === 'rack').map(r => (<option key={r.id} value={r.id}>{r.name}</option>))}
                </select></div>
            </div>
            <div className="space-y-1"><label className="text-[10px] uppercase font-bold text-slate-500">Ubicación</label><select className="w-full h-10 rounded-md border border-slate-700 bg-slate-800 px-3 text-sm text-white" value={newItem.location} onChange={e => setNewItem({...newItem, location: e.target.value})}>{locations.map(l => <option key={l.id} value={l.name}>{l.name}</option>)}</select></div>
            <div className="space-y-1"><label className="text-[10px] uppercase font-bold text-slate-500">Observaciones (Máx 300)</label><textarea maxLength={300} className="w-full bg-slate-800 border-slate-700 rounded p-3 text-sm outline-none" value={newItem.notes} onChange={e => setNewItem({...newItem, notes: e.target.value})} /></div>
            <Button onClick={handleCreate} className="bg-blue-600">Guardar</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-2xl">
          <DialogHeader><DialogTitle>Editar Equipo</DialogTitle></DialogHeader>
          {editingItem && (
            <div className="grid gap-4 py-4">
              <Input className="bg-slate-800 border-slate-700" value={editingItem.name} onChange={e => setEditingItem({...editingItem, name: e.target.value})} />
              <select className="bg-slate-800 p-2 rounded text-white border border-slate-700" value={editingItem.status} onChange={e => setEditingItem({...editingItem, status: e.target.value})}><option value="operativo">Operativo</option><option value="reparacion">En Reparación</option></select>
              <Button onClick={handleUpdate} className="bg-blue-600">Actualizar</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isTruckOpen} onOpenChange={setIsTruckOpen}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white"><DialogHeader><DialogTitle><Truck className="inline mr-2"/>Camión</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="max-h-60 overflow-y-auto space-y-2">{items.filter(i => truckIds.includes(i.id)).map(i => (
              <div key={i.id} className="p-3 bg-slate-800 rounded flex justify-between text-sm"><span>{i.name}</span>{i.status === 'reparacion' && <Badge className="bg-red-500 text-white border-0">REPARACIÓN</Badge>}</div>
            ))}</div>
            <select className="w-full bg-slate-800 border-slate-700 rounded h-10 p-2 text-white outline-none" value={moveDest} onChange={e => setMoveDest(e.target.value)}>{locations.map(l => <option key={l.id} value={l.name}>{l.name}</option>)}</select>
            <Button onClick={handleTransport} className="w-full bg-green-600 py-6 text-lg font-bold">TRANSPORTAR</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isLocModalOpen} onOpenChange={setIsLocModalOpen}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white"><DialogHeader><DialogTitle>Ubicación</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-4"><Input className="bg-slate-800 border-slate-700" placeholder="Nombre" value={newLoc.name} onChange={e => setNewLoc({...newLoc, name: e.target.value})} /><Button onClick={async () => { await supabase.from('locations').upsert([newLoc]); fetchData(); setIsLocModalOpen(false); }} className="bg-blue-600">Guardar</Button></div>
        </DialogContent>
      </Dialog>

      <Dialog open={isQRModalOpen} onOpenChange={setIsQRModalOpen}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-xs text-center"><DialogHeader><DialogTitle>{selectedQR?.name}</DialogTitle></DialogHeader>
            <div className="flex flex-col items-center py-6 gap-4"><div className="bg-white p-3 rounded-xl"><QRCodeCanvas id={`qr-${selectedQR?.id}`} value={selectedQR?.serial_number || ''} size={180} /></div><Button className="w-full" onClick={() => downloadQR(selectedQR.id, selectedQR.serial_number)}><Download size={16} className="mr-2"/> Descargar PNG</Button></div>
        </DialogContent>
      </Dialog>

      {report && (
        <div className="fixed inset-0 bg-black/90 z-[100] flex items-center justify-center p-4 backdrop-blur-sm"><div className="bg-slate-900 border-2 border-green-500 p-8 rounded-xl text-center max-w-sm animate-in zoom-in"><CheckCircle2 size={48} className="text-green-500 mx-auto mb-4"/><h2 className="text-xl font-bold text-white">Movimiento Éxitoso</h2><p className="text-slate-400 mt-2 text-sm">Movidos {report.count} equipos a {report.dest}.</p><Button onClick={() => setReport(null)} className="mt-6 w-full">Cerrar</Button></div></div>
      )}
    </div>
  );
}