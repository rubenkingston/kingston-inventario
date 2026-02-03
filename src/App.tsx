import { useState, useEffect } from 'react';
// He quitado los iconos que no se usaban para que no te salga el aviso amarillo
import { Package, Mic, MapPin, History, Truck, LogOut, Search, Plus, Trash2, Wrench, CheckCircle2, Circle, Pencil, QrCode, User, ArrowRight } from 'lucide-react';
import { supabase } from './supabase';
import { Button, Input, Card, CardContent, CardHeader, CardTitle, Badge, Tabs, TabsContent, TabsList, TabsTrigger, Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui';
import { QRScanner } from './Scanner';

export default function App() {
  // Usamos <any[]> para evitar errores de tipo si la lista viene vacía al principio
  const [items, setItems] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [historyLog, setHistoryLog] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Estados de la aplicación
  const [truckCart, setTruckCart] = useState<number[]>([]);
  const [isNewOpen, setIsNewOpen] = useState(false);
  const [isMoveOpen, setIsMoveOpen] = useState(false);
  const [moveDestination, setMoveDestination] = useState('');
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [newItem, setNewItem] = useState({ name: '', serial_number: '', category: 'varios', location: 'Almacén Central', status: 'operativo' });
  const [showScanner, setShowScanner] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const { data: equip } = await supabase.from('equipment').select('*').order('id', { ascending: false });
      const { data: locs } = await supabase.from('locations').select('*');
      const { data: hist } = await supabase.from('history').select('*').order('date', { ascending: false });

      if (equip) setItems(equip);
      if (locs) {
        setLocations(locs);
        if (locs.length > 0) setMoveDestination(locs[0].name);
      }
      if (hist) setHistoryLog(hist);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!newItem.name) return alert("Ponle nombre al menos");
    const { error } = await supabase.from('equipment').insert([newItem]);
    if (error) alert('Error: ' + error.message);
    else {
      fetchData();
      setIsNewOpen(false);
      setNewItem({ name: '', serial_number: '', category: 'varios', location: 'Almacén Central', status: 'operativo' });
    }
  };

  const openEditModal = (item: any) => {
    setEditingItem(item);
    setIsEditOpen(true);
  };

  const handleUpdate = async () => {
    if (!editingItem) return;
    const { error } = await supabase.from('equipment').update({
        name: editingItem.name,
        serial_number: editingItem.serial_number,
        category: editingItem.category,
        status: editingItem.status
      }).eq('id', editingItem.id);
    if (error) alert('Error: ' + error.message);
    else {
      fetchData();
      setIsEditOpen(false);
      setEditingItem(null);
    }
  };

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
      const { error } = await supabase.from('equipment').update({ location: moveDestination }).in('id', truckCart);
      if (error) alert('Error: ' + error.message);
      else {
        fetchData();
        setTruckCart([]);
        setIsMoveOpen(false);
      }
    }
  };

  const deleteItem = async (id: number) => {
    if (confirm('¿Eliminar?')) {
      await supabase.from('equipment').delete().eq('id', id);
      setItems(prev => prev.filter(i => i.id !== id));
    }
  };

  const toggleTruck = (id: number) => {
    setTruckCart(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const handleSelectAll = () => {
    if (truckCart.length === filteredItems.length && filteredItems.length > 0) setTruckCart([]);
    else setTruckCart(filteredItems.map(i => i.id));
  };

  const handleScanResult = (result: string) => {
    setSearchTerm(result);
    setShowScanner(false);
    // Sonido simple sin importar librería externa para evitar errores
    console.log("Escaneado:", result);
  };

  const filteredItems = items.filter(item => 
    item.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    item.serial_number?.includes(searchTerm)
  );

  const formatDate = (dateString: string) => new Date(dateString).toLocaleString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

  if (loading) return <div className="flex h-screen items-center justify-center bg-background text-primary animate-pulse">Cargando Sistema Kingston...</div>;

  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      
      {showScanner && (
        <QRScanner onScan={handleScanResult} onClose={() => setShowScanner(false)} />
      )}

      {/* MODAL EDITAR */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Editar Equipo</DialogTitle></DialogHeader>
          {editingItem && (
            <div className="grid gap-4 py-4">
              <div className="grid gap-2"><label>Nombre</label><Input value={editingItem.name} onChange={(e) => setEditingItem({...editingItem, name: e.target.value})} /></div>
              <div className="grid gap-2"><label>S/N</label><Input value={editingItem.serial_number} onChange={(e) => setEditingItem({...editingItem, serial_number: e.target.value})} /></div>
              <div className="grid grid-cols-2 gap-4">
                 <div className="grid gap-2"><label>Categoría</label><select className="flex h-10 w-full rounded-md border border-input bg-background px-3" value={editingItem.category} onChange={(e) => setEditingItem({...editingItem, category: e.target.value})}><option value="varios">Varios</option><option value="audio">Audio</option><option value="video">Video</option><option value="iluminacion">Iluminación</option><option value="rack">Rack</option></select></div>
                 <div className="grid gap-2"><label>Estado</label><select className="flex h-10 w-full rounded-md border border-input bg-background px-3" value={editingItem.status} onChange={(e) => setEditingItem({...editingItem, status: e.target.value})}><option value="operativo">Operativo 🟢</option><option value="reparacion">Reparación 🔴</option></select></div>
              </div>
              <Button onClick={handleUpdate} className="w-full mt-2">Guardar</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <header className="sticky top-0 z-50 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3"><h1 className="text-xl sm:text-2xl font-bold truncate">Sistema de Inventario</h1></div>
          <div className="flex items-center gap-4">
            <Dialog open={isMoveOpen} onOpenChange={setIsMoveOpen}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="relative h-12 w-12" disabled={truckCart.length === 0}>
                  <Truck className={`h-8 w-8 ${truckCart.length > 0 ? 'text-primary' : 'text-muted-foreground'}`} />
                  {truckCart.length > 0 && <Badge variant="destructive" className="absolute -top-1 -right-1 h-6 w-6 flex items-center justify-center p-0 text-sm font-bold animate-in zoom-in">{truckCart.length}</Badge>}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Mover Equipos ({truckCart.length})</DialogTitle></DialogHeader>
                <div className="py-4 space-y-4">
                  <p className="text-sm text-muted-foreground">Mover a:</p>
                  <select className="flex h-10 w-full rounded-md border border-input bg-background px-3" value={moveDestination} onChange={(e) => setMoveDestination(e.target.value)}>{locations.map(loc => (<option key={loc.id} value={loc.name}>{loc.name}</option>))}</select>
                  <Button onClick={handleBulkMove} className="w-full">MOVER Y REGISTRAR</Button>
                </div>
              </DialogContent>
            </Dialog>
            <Button variant="outline" size="sm"><LogOut className="mr-2 h-4 w-4" /> Salir</Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <Tabs defaultValue="inventario" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid bg-muted/20">
            <TabsTrigger value="inventario" className="gap-2"><Package className="h-4 w-4" /> Inventario</TabsTrigger>
            <TabsTrigger value="equipos" className="gap-2"><Mic className="h-4 w-4" /> Equipos</TabsTrigger>
            <TabsTrigger value="ubicaciones" className="gap-2"><MapPin className="h-4 w-4" /> Ubicaciones</TabsTrigger>
            <TabsTrigger value="historial" className="gap-2"><History className="h-4 w-4" /> Historial</TabsTrigger>
          </TabsList>

          <TabsContent value="inventario" className="space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <h2 className="text-3xl font-bold">Inventario</h2>
              <div className="flex w-full sm:w-auto gap-2">
                 <div className="relative flex-1 sm:w-64 flex gap-2">
                    <div className="relative flex-1">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input placeholder="Buscar o escanear..." className="pl-8 bg-muted/10 border-input/50" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                    </div>
                    <Button variant="outline" size="icon" onClick={() => setShowScanner(true)} title="Abrir Cámara">
                        <QrCode className="h-4 w-4" />
                    </Button>
                 </div>
                 
                 <Dialog open={isNewOpen} onOpenChange={setIsNewOpen}>
                    <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" /> Nuevo</Button></DialogTrigger>
                    <DialogContent>
                      <DialogHeader><DialogTitle>Nuevo Equipo</DialogTitle></DialogHeader>
                      <div className="grid gap-4 py-4">
                        <div className="grid gap-2"><label>Nombre</label><Input value={newItem.name} onChange={(e) => setNewItem({...newItem, name: e.target.value})} placeholder="Ej: Altavoz JBL" /></div>
                        <div className="grid gap-2"><label>S/N</label><Input value={newItem.serial_number} onChange={(e) => setNewItem({...newItem, serial_number: e.target.value})} placeholder="Ej: SN-9999" /></div>
                        <div className="grid gap-2"><label>Ubicación</label><select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={newItem.location} onChange={(e) => setNewItem({...newItem, location: e.target.value})}>{locations.map(loc => (<option key={loc.id} value={loc.name}>{loc.name}</option>))}</select></div>
                      </div>
                      <Button onClick={handleCreate} className="w-full">Guardar</Button>
                    </DialogContent>
                 </Dialog>
              </div>
            </div>

            <div className="grid gap-3">
              {filteredItems.map(item => (
                <Card key={item.id} className={`transition-all border ${truckCart.includes(item.id) ? 'border-primary bg-primary/5' : 'bg-card/50 hover:border-primary/50'}`}>
                  <CardContent className="p-4 flex items-center justify-between gap-4">
                     <div className="flex items-center gap-4 overflow-hidden">
                        <div className={`p-2 rounded-lg ${item.status === 'reparacion' ? 'bg-red-500/20' : 'bg-primary/20'}`}>
                           {item.status === 'reparacion' ? <Wrench className="h-5 w-5 text-red-500" /> : <Package className="h-5 w-5 text-primary" />}
                        </div>
                        <div className="min-w-0">
                           <h4 className="font-semibold truncate text-lg">{item.name}</h4>
                           <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                              <span className="font-mono text-xs bg-muted px-1 rounded">SN: {item.serial_number}</span>
                              <span className="flex items-center gap-1 truncate"><MapPin className="h-3 w-3" /> {item.location}</span>
                           </div>
                        </div>
                     </div>
                     <div className="flex gap-2">
                        <Button variant={truckCart.includes(item.id) ? "default" : "secondary"} size="icon" onClick={() => toggleTruck(item.id)}><Truck className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => openEditModal(item)}><Pencil className="h-4 w-4 text-muted-foreground" /></Button>
                     </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="equipos">
            <Card className="border-border/50 bg-card/50 backdrop-blur"><CardHeader className="flex flex-row items-center justify-between"><CardTitle>Listado Maestro ({filteredItems.length})</CardTitle>{truckCart.length > 0 && <Button variant="destructive" size="sm" onClick={() => setIsMoveOpen(true)} className="animate-in fade-in slide-in-from-right-5"><Truck className="mr-2 h-4 w-4" /> Mover {truckCart.length}</Button>}</CardHeader><CardContent><div className="rounded-md border border-border overflow-hidden"><table className="w-full text-sm text-left"><thead className="bg-muted/50 text-muted-foreground uppercase text-xs tracking-wider"><tr><th className="p-4 w-[50px]"><button onClick={handleSelectAll} className="flex items-center justify-center text-muted-foreground hover:text-primary transition-colors">{filteredItems.length > 0 && truckCart.length === filteredItems.length ? <CheckCircle2 className="h-5 w-5 text-primary" /> : <Circle className="h-5 w-5" />}</button></th><th className="p-4 font-bold">Equipo</th><th className="p-4 font-bold hidden md:table-cell">Categoría</th><th className="p-4 font-bold hidden sm:table-cell">S/N</th><th className="p-4 font-bold">Ubicación</th><th className="p-4 font-bold text-center">Estado</th><th className="p-4 font-bold text-right">Acciones</th></tr></thead><tbody className="divide-y divide-border/50 bg-card/40">{filteredItems.map((item) => { const isSelected = truckCart.includes(item.id); return (<tr key={item.id} className={`transition-colors cursor-pointer ${isSelected ? 'bg-primary/10 hover:bg-primary/15' : 'hover:bg-muted/30'}`} onClick={() => toggleTruck(item.id)}><td className="p-4"><div className="flex items-center justify-center">{isSelected ? <CheckCircle2 className="h-5 w-5 text-primary fill-primary/20" /> : <Circle className="h-5 w-5 text-muted-foreground" />}</div></td><td className="p-4 font-medium"><div className="flex items-center gap-3">{item.name}</div></td><td className="p-4 hidden md:table-cell"><Badge variant="outline" className="capitalize font-normal text-muted-foreground">{item.category}</Badge></td><td className="p-4 hidden sm:table-cell font-mono text-xs text-muted-foreground">{item.serial_number}</td><td className="p-4 text-muted-foreground"><div className="flex items-center gap-2"><MapPin className="h-3 w-3" />{item.location}</div></td><td className="p-4 text-center"><span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${item.status === 'operativo' ? 'bg-green-500/10 text-green-500 border-green-500/20' : 'bg-red-500/10 text-red-500 border-red-500/20'}`}>{item.status}</span></td><td className="p-4 text-right"><div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}><Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => openEditModal(item)}><Pencil size={16} /></Button><Button variant="ghost" size="icon" className="h-8 w-8 text-red-500/70 hover:text-red-500 hover:bg-red-500/10" onClick={() => deleteItem(item.id)}><Trash2 size={16} /></Button></div></td></tr>)})}</tbody></table>{filteredItems.length === 0 && <div className="p-12 text-center text-muted-foreground">No se encontraron equipos</div>}</div></CardContent></Card>
          </TabsContent>

          <TabsContent value="ubicaciones" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{locations.map(loc => (<Card key={loc.id} className="bg-card/50"><CardHeader><CardTitle className="text-lg flex items-center gap-2"><MapPin className="h-5 w-5 text-primary" /> {loc.name}</CardTitle></CardHeader><CardContent><p className="text-sm text-muted-foreground">{loc.address}</p><p className="text-sm mt-2 font-bold">{items.filter(i => i.location === loc.name).length} items aquí</p></CardContent></Card>))}</TabsContent>

          <TabsContent value="historial">
            <Card className="bg-card/50 border-border/50"><CardHeader><CardTitle className="flex items-center gap-2"><History className="h-5 w-5 text-primary"/> Registro de Movimientos</CardTitle></CardHeader><CardContent><div className="space-y-6 relative border-l border-border/50 ml-3 pl-6 py-2">{historyLog.map((log: any) => (<div key={log.id} className="relative group"><div className="absolute -left-[31px] top-1 h-4 w-4 rounded-full bg-primary border-4 border-background group-hover:scale-125 transition-transform"></div><div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1"><span className="text-xs font-mono text-primary font-bold">{formatDate(log.date)}</span><span className="text-xs text-muted-foreground flex items-center gap-1"><User size={12}/> {log.user_email}</span></div><div className="bg-muted/30 p-3 rounded-md border border-border/50 hover:bg-muted/50 transition-colors"><div className="flex items-center gap-2 text-sm font-medium mb-1"><span className="text-green-500 flex items-center"><Truck size={14} className="mr-1"/> Movimiento Confirmado</span><ArrowRight size={14} className="text-muted-foreground"/><span className="text-foreground">{log.destination}</span></div><p className="text-sm text-muted-foreground italic">{log.items_summary || "Sin detalles"}</p></div></div>))}{historyLog.length === 0 && <div className="text-center text-muted-foreground py-10">No hay movimientos registrados aún.</div>}</div></CardContent></Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}