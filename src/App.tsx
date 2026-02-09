import { useState, useEffect } from 'react';
import { Mic, MapPin, Truck, Search, Plus, CheckCircle2, Circle, Pencil, Layers, Monitor, Lightbulb, Armchair, Box, ChevronDown, ChevronUp, QrCode, ShieldCheck, Trash2, History as HistoryIcon, LayoutDashboard, Package, AlertCircle, Copy, User as UserIcon, LogOut, X } from 'lucide-react';
import { supabase } from './supabase';
import { Button, Input, Dialog, DialogContent, DialogHeader, DialogTitle, Badge } from './ui';
import { QRCodeCanvas } from 'qrcode.react';
import { QRScanner } from './Scanner';

// Variable CATEGORIES usada en renderizado
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
  const [historyLog, setHistoryLog] = useState<any[]>([]); //
  const [activeTab, setActiveTab] = useState('inventario');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [truckIds, setTruckIds] = useState<number[]>([]);
  
  const [isNewOpen, setIsNewOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isTruckOpen, setIsTruckOpen] = useState(false);
  const [isLocModalOpen, setIsLocModalOpen] = useState(false); //
  const [showScanner, setShowScanner] = useState(false);

  const [editingItem, setEditingItem] = useState<any>(null);
  const [expandedRack, setExpandedRack] = useState<number | null>(null); //
  const [expandedLocation, setExpandedLocation] = useState<number | null>(null); //
  const [report, setReport] = useState<any>(null); //
  const [moveDest, setMoveDest] = useState('');
  const [newItem, setNewItem] = useState<any>({ name: '', serial_number: '', category: 'audio', location: '', status: 'operativo', notes: '' });
  const [newLoc, setNewLoc] = useState({ name: '', address: '' }); //

  const adminEmail = "ruben@kingston.es";

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    const { data: equip } = await supabase.from('equipment').select('*').order('id', { ascending: false });
    const { data: locs } = await supabase.from('locations').select('*').order('id');
    const { data: hist } = await supabase.from('history').select('*').order('date', { ascending: false });
    if (equip) setItems(equip);
    if (locs) { 
      setLocations(locs); 
      if (locs.length > 0) setMoveDest(locs[0].name); 
    }
    if (hist) setHistoryLog(hist);
  };

  const handleScan = (serial: string) => {
    const item = items.find(i => i.serial_number === serial);
    if (item) {
      setTruckIds(prev => prev.includes(item.id) ? prev : [...prev, item.id]);
      alert(`✅ ${item.name} añadido`);
    } else { alert("❌ No encontrado"); }
    setShowScanner(false);
  };

  const handleUpdate = async () => {
    if (!editingItem) return;
    await supabase.from('equipment').update(editingItem).eq('id', editingItem.id);
    fetchData(); setIsEditOpen(false); setEditingItem(null);
  };

  const handleCreate = async () => {
    if (!newItem.name) return alert("Nombre obligatorio");
    const sn = newItem.serial_number || Math.floor(100000 + Math.random() * 900000).toString();
    await supabase.from('equipment').insert([{...newItem, serial_number: sn}]);
    fetchData(); setIsNewOpen(false);
  };

  // Función deleteLocation usada en render
  const deleteLocation = async (loc: any) => {
    const count = items.filter(i => i.location === loc.name).length;
    if (count > 0) return alert(`BLOQUEADO: "${loc.name}" tiene ${count} equipos.`);
    if (confirm(`¿Borrar ubicación?`)) { await supabase.from('locations').delete().eq('id', loc.id); fetchData(); }
  };

  const handleTransport = async () => {
    const inTruck = items.filter(i => truckIds.includes(i.id));
    const names = inTruck.map(i => i.name).join(', ');
    await supabase.from('equipment').update({ location: moveDest }).in('id', truckIds);
    await supabase.from('history').insert([{ user_email: adminEmail, destination: moveDest, items_summary: names, device_info: navigator.platform, date: new Date().toISOString() }]);
    setReport({ count: truckIds.length, dest: moveDest, summary: names }); setTruckIds([]); setIsTruckOpen(false); fetchData();
  };

  const downloadLabel = (item: any) => {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    canvas.width = 472; canvas.height = 354;
    ctx.fillStyle = "white"; ctx.fillRect(0, 0, 472, 354);
    const logo = new Image();
    logo.src = "/logo_kingston.png";
    logo.onload = () => {
      ctx.drawImage(logo, (472-250)/2, 20, 250, 60);
      const qrCanvas = document.getElementById(`qr-${item.id}`) as HTMLCanvasElement;
      if (qrCanvas) ctx.drawImage(qrCanvas, (472-200)/2, 95, 200, 200);
      ctx.fillStyle = "black"; ctx.font = "bold 28px Arial"; ctx.textAlign = "center";
      ctx.fillText(`SN: ${item.serial_number}`, 236, 330);
      const link = document.createElement("a");
      link.href = canvas.toDataURL("image/jpeg", 1.0);
      link.download = `Tag_${item.serial_number}.jpg`; link.click();
    };
  };

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-200 font-sans pb-20">
      {showScanner && <QRScanner onScan={handleScan} onClose={() => setShowScanner(false)} />}
      
      <header className="sticky top-0 z-50 border-b border-slate-800 bg-[#0f172a]/95 backdrop-blur p-4 flex justify-between items-center">
        <div><h1 className="text-xl font-bold text-white tracking-tight">Sistema Inventario</h1><p className="text-xs text-blue-400">{adminEmail}</p></div>
        <div className="flex gap-2">
            <Button onClick={() => setIsTruckOpen(true)} className={`relative ${truckIds.length > 0 ? 'bg-green-600' : 'bg-slate-800'}`}><Truck size={18}/> {truckIds.length > 0 && <Badge className="absolute -top-2 -right-2 bg-red-500">{truckIds.length}</Badge>}</Button>
            <Button variant="ghost" onClick={() => window.location.reload()}><LogOut size={18}/></Button>
        </div>
      </header>

      <nav className="container mx-auto px-4 mt-4 flex gap-2 border-b border-slate-800 overflow-x-auto">
        {[{ id: 'inventario', label: 'Dash', icon: LayoutDashboard }, { id: 'equipos', label: 'Stock', icon: Package }, { id: 'ubicaciones', label: 'Ubi', icon: MapPin }, { id: 'historial', label: 'Hist', icon: HistoryIcon }, { id: 'usuarios', label: 'Admin', icon: ShieldCheck }].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex items-center gap-2 px-3 py-2 text-xs transition-all ${activeTab === tab.id ? 'text-white border-b-2 border-blue-500' : 'text-slate-500'}`}><tab.icon size={14}/> {tab.label}</button>
        ))}
      </nav>

      <main className="container mx-auto px-4 mt-6">
        {activeTab === 'inventario' && (
          <div className="space-y-6">
            <button onClick={() => setShowScanner(true)} className="w-full bg-blue-600 h-32 rounded-3xl flex flex-col items-center justify-center gap-2 shadow-xl active:scale-95 transition-all"><QrCode size={48} className="text-white"/><span className="font-bold text-white uppercase">Escanear para Camión</span></button>
            <div className="grid grid-cols-2 gap-4">{locations.map(loc => {
              const count = items.filter(i => i.location === loc.name).length;
              return count > 0 && <div key={loc.id} className="bg-slate-800/40 p-6 rounded-2xl text-center"><span className="text-4xl font-black text-white">{count}</span><p className="text-[10px] text-slate-500 font-bold uppercase">{loc.name}</p></div>;
            })}</div>
            <section><h2 className="text-sm font-bold text-red-400 uppercase mb-4 flex items-center gap-2"><AlertCircle size={16}/> Reparaciones</h2>
              {items.filter(i => i.status === 'reparacion').map(item => (<div key={item.id} className="bg-red-500/5 border border-red-500/10 p-4 rounded-xl flex justify-between mb-2"><div><p className="font-bold text-white">{item.name}</p><p className="text-[10px] text-slate-500">{item.location}</p></div><Badge className="bg-red-500/20 text-red-500 border-0 text-[10px]">REPARANDO</Badge></div>))}
            </section>
          </div>
        )}

        {activeTab === 'equipos' && (
          <div className="space-y-4">
            <div className="flex gap-2"><div className="relative flex-1"><Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500"/><input className="w-full bg-slate-900 border border-slate-700 rounded-lg py-2 pl-9 text-sm outline-none" placeholder="Buscar..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}/></div><Button onClick={() => setIsNewOpen(true)} className="bg-blue-600"><Plus size={18}/></Button></div>
            {items.filter(i => !i.parent_id && i.name.toLowerCase().includes(searchTerm.toLowerCase())).map(item => {
              const CatIcon = CATEGORIES.find(c => c.id === item.category)?.icon || Box;
              return (
                <div key={item.id} className={`p-5 rounded-xl border ${truckIds.includes(item.id) ? 'bg-green-900/20 border-green-500' : 'bg-slate-800/50 border-slate-700'}`}>
                  <div className="flex gap-4">
                    <button onClick={() => setSelectedIds(p => p.includes(item.id) ? p.filter(id => id !== item.id) : [...p, item.id])}>{selectedIds.includes(item.id) ? <CheckCircle2 className="text-blue-500" /> : <Circle className="text-slate-600" />}</button>
                    <div className="flex-1">
                      <div className="flex items-center gap-2"><CatIcon size={16} className="text-blue-400"/><h3 className="font-bold text-white">{item.name}</h3></div>
                      <p className="text-blue-400 font-bold text-xs mt-1 uppercase"><MapPin size={10} className="inline mr-1"/>{item.location}</p>
                      <div className="flex gap-4 mt-3">
                          <button onClick={() => {setEditingItem(item); setIsEditOpen(true);}} className="text-slate-500 hover:text-white flex items-center gap-1 text-[10px] uppercase font-bold"><Pencil size={14}/> Editar</button>
                          <button onClick={() => {setNewItem({...item, id: undefined, serial_number: ''}); setIsNewOpen(true);}} className="text-slate-500 hover:text-blue-400 flex items-center gap-1 text-[10px] uppercase font-bold"><Copy size={14}/> Clonar</button>
                      </div>
                      {item.category === 'rack' && (
                        <div className="mt-3 bg-black/20 p-2 rounded-lg"><button onClick={() => setExpandedRack(expandedRack === item.id ? null : item.id)} className="text-[10px] text-purple-300 flex items-center justify-between w-full"><span>Ver componentes</span>{expandedRack === item.id ? <ChevronUp size={12}/> : <ChevronDown size={12}/>}</button>
                          {expandedRack === item.id && <div className="mt-2 space-y-1">{items.filter(c => c.parent_id === item.id).map(c => (<div key={c.id} className="text-[10px] border-l border-purple-500 pl-2 text-slate-400">{c.name}</div>))}</div>}
                        </div>
                      )}
                    </div>
                    <div onClick={() => downloadLabel(item)} className="bg-white p-1 rounded cursor-pointer self-start flex flex-col items-center"><QRCodeCanvas id={`qr-${item.id}`} value={item.serial_number} size={50}/><span className="text-[7px] text-black mt-1 font-bold">DESCARGAR</span></div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {activeTab === 'ubicaciones' && (
          <div className="space-y-4">
            <Button onClick={() => setIsLocModalOpen(true)} className="bg-blue-600 w-full mb-2 font-bold uppercase tracking-widest"><Plus size={18} className="mr-2"/> Nueva Ubicación</Button>
            {locations.map(loc => (
              <div key={loc.id} className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 flex justify-between items-center" onClick={() => setExpandedLocation(expandedLocation === loc.id ? null : loc.id)}>
                <div className="flex gap-4 items-center cursor-pointer"><MapPin className="text-blue-400"/><div><h3 className="font-bold text-white text-sm">{loc.name}</h3><p className="text-[10px] text-slate-500">{loc.address}</p></div></div>
                <div className="flex gap-3 items-center"><Badge variant="secondary" className="bg-slate-700 text-[10px]">{items.filter(i => i.location === loc.name).length} items</Badge><button onClick={(e) => {e.stopPropagation(); deleteLocation(loc);}} className="text-red-500/70 hover:text-red-500"><Trash2 size={16}/></button>{expandedLocation === loc.id ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}</div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'historial' && (
          <div className="space-y-3">{historyLog.map(log => (
            <div key={log.id} className="p-4 bg-slate-800/40 border-l-4 border-blue-500 rounded"><div className="flex justify-between text-[10px] text-slate-500 mb-2"><span>{new Date(log.date).toLocaleString()}</span><span className="font-bold flex items-center gap-1"><UserIcon size={10}/> {log.user_email}</span></div><p className="text-sm font-bold text-blue-400 uppercase">{log.destination}</p><p className="text-xs text-slate-400 mt-1 italic">{log.items_summary}</p></div>
          ))}</div>
        )}

        {activeTab === 'usuarios' && (
          <div className="text-center p-12 border-2 border-dashed border-slate-800 rounded-3xl"><ShieldCheck size={48} className="mx-auto text-blue-500 mb-4 opacity-50"/><h2 className="text-xl font-bold text-white">Panel Admin Kingston</h2><p className="text-slate-500 text-xs mt-2">Acceso restringido a administración.</p></div>
        )}
      </main>

      <Dialog open={isTruckOpen} onOpenChange={setIsTruckOpen}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white"><DialogHeader className="flex justify-between items-center"><DialogTitle>Camión de Carga</DialogTitle><button onClick={() => { setTruckIds([]); setIsTruckOpen(false); }} className="text-red-400 text-[10px] font-bold uppercase flex items-center"><Trash2 size={14} className="mr-1"/> Vaciar</button></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="bg-slate-950 p-3 rounded-lg max-h-40 overflow-y-auto space-y-2">{items.filter(i => truckIds.includes(i.id)).map(i => (<div key={i.id} className="flex justify-between text-xs border-b border-slate-800 pb-1"><span>{i.name}</span><span className="text-slate-500 font-mono">{i.serial_number}</span></div>))}</div>
            <select className="w-full bg-slate-800 border-slate-700 rounded h-12 p-2 text-sm text-white outline-none" value={moveDest} onChange={e => setMoveDest(e.target.value)}>{locations.map(l => <option key={l.id} value={l.name}>{l.name}</option>)}</select>
            <Button onClick={handleTransport} className="w-full bg-green-600 font-bold h-12 uppercase tracking-widest">Confirmar Traslado</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isNewOpen || isEditOpen} onOpenChange={() => { setIsNewOpen(false); setIsEditOpen(false); }}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white max-w-2xl"><DialogHeader className="flex justify-between items-center"><DialogTitle>{isEditOpen ? "Editar" : "Nuevo"}</DialogTitle><button onClick={() => {setIsNewOpen(false); setIsEditOpen(false);}}><X size={20}/></button></DialogHeader>
          <div className="grid gap-4 py-4">
            <Input className="bg-slate-800 border-slate-700" placeholder="Nombre" value={isEditOpen ? editingItem?.name : newItem.name} onChange={e => isEditOpen ? setEditingItem({...editingItem, name: e.target.value}) : setNewItem({...newItem, name: e.target.value})} />
            <Input className="bg-slate-800 border-slate-700" placeholder="S/N" value={isEditOpen ? editingItem?.serial_number : newItem.serial_number} onChange={e => isEditOpen ? setEditingItem({...editingItem, serial_number: e.target.value}) : setNewItem({...newItem, serial_number: e.target.value})} />
            <Button onClick={isEditOpen ? handleUpdate : handleCreate} className="bg-blue-600 font-bold uppercase">{isEditOpen ? "Actualizar" : "Guardar"}</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isLocModalOpen} onOpenChange={setIsLocModalOpen}>
        <DialogContent className="bg-slate-900 border-slate-700 text-white"><DialogHeader className="flex justify-between items-center"><DialogTitle>Gestión Ubicación</DialogTitle><button onClick={() => setIsLocModalOpen(false)}><X size={20}/></button></DialogHeader>
          <div className="space-y-4 py-4"><Input className="bg-slate-800 border-slate-700" placeholder="Nombre" value={newLoc.name} onChange={e => setNewLoc({...newLoc, name: e.target.value})} /><Input className="bg-slate-800 border-slate-700" placeholder="Dirección" value={newLoc.address} onChange={e => setNewLoc({...newLoc, address: e.target.value})} /><Button onClick={async () => { await supabase.from('locations').upsert([newLoc]); fetchData(); setIsLocModalOpen(false); }} className="bg-blue-600 w-full font-bold uppercase">Guardar</Button></div>
        </DialogContent>
      </Dialog>

      {report && (
        <div className="fixed inset-0 bg-black/90 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-[#1e293b] border border-blue-500 p-8 rounded-3xl text-center max-w-sm animate-in zoom-in shadow-2xl">
            <h2 className="text-xl font-bold text-white mb-2 uppercase tracking-tighter">Movimiento OK</h2>
            <div className="bg-slate-900 p-4 mb-6 rounded-xl text-left"><p className="text-xs text-blue-400 font-bold mb-1">A: {report.dest}</p><p className="text-xs text-slate-300 italic line-clamp-3">{report.summary}</p></div>
            <Button onClick={() => setReport(null)} className="w-full bg-blue-600 font-bold h-12 rounded-xl">Cerrar</Button>
          </div>
        </div>
      )}
    </div>
  );
}