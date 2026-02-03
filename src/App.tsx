import { useState, useEffect, useMemo } from 'react';
import { Package, Search, MapPin, Truck, History, Plus, Mic, Server, Trash2, QrCode, LogOut, RefreshCw } from 'lucide-react';
import { supabase } from './supabase'; // <--- ¡AQUÍ ESTÁ LA MAGIA!

export default function App() {
  const [activeTab, setActiveTab] = useState('inventario');
  const [items, setItems] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [truckCart, setTruckCart] = useState<number[]>([]); // IDs en el camión

  // --- CARGAR DATOS DE SUPABASE ---
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Cargar Equipos
      const { data: equipmentData, error: equipError } = await supabase
        .from('equipment')
        .select('*')
        .order('id', { ascending: true });
      
      if (equipError) console.error('Error cargando equipos:', equipError);
      else setItems(equipmentData || []);

      // 2. Cargar Ubicaciones
      const { data: locationData, error: locError } = await supabase
        .from('locations')
        .select('*');
      
      if (locError) console.error('Error cargando ubicaciones:', locError);
      else setLocations(locationData || []);

    } catch (error) {
      console.error("Error de conexión:", error);
    } finally {
      setLoading(false);
    }
  };

  // --- ACCIONES EN BASE DE DATOS ---

  // Borrar equipo real
  const deleteItem = async (id: number) => {
    if (confirm('¿Estás seguro de borrar este equipo de la base de datos?')) {
      const { error } = await supabase.from('equipment').delete().eq('id', id);
      if (!error) {
        setItems(prev => prev.filter(i => i.id !== id)); // Actualizar pantalla
      } else {
        alert('Error al borrar: ' + error.message);
      }
    }
  };

  // --- LÓGICA VISUAL ---
  const filteredItems = useMemo(() => {
    return items.filter(item => 
      (item.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.serial_number || '').includes(searchTerm)
    );
  }, [items, searchTerm]);

  const stats = {
    totalItems: items.length,
    inRepair: items.filter(i => i.status === 'reparacion').length,
    onTruck: truckCart.length
  };

  const toggleTruck = (id: number) => {
    setTruckCart(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  // --- UI ---
  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      
      {/* HEADER */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-red-600 p-2 rounded-lg text-white">
              <Package size={24} />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-800 tracking-tight">KINGSTON <span className="text-red-600">INVENTORY</span></h1>
              <p className="text-xs text-slate-500 font-medium">Conectado a Supabase 🟢</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="relative hidden md:block">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                <Truck size={18} />
              </div>
              <span className="pl-10 pr-4 py-2 bg-slate-100 rounded-full text-sm font-bold text-slate-600">
                {stats.onTruck} en Camión
              </span>
            </div>
          </div>
        </div>

        {/* TABS */}
        <div className="max-w-7xl mx-auto px-4 mt-2">
          <div className="flex gap-6 overflow-x-auto pb-2 sm:pb-0">
            {[
              { id: 'inventario', label: 'Inventario', icon: Package },
              { id: 'equipos', label: 'Equipos', icon: Mic },
              { id: 'ubicaciones', label: 'Ubicaciones', icon: MapPin },
              { id: 'historial', label: 'Historial', icon: History },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 pb-3 px-1 border-b-2 text-sm font-bold transition-colors whitespace-nowrap ${
                  activeTab === tab.id 
                    ? 'border-red-600 text-red-600' 
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <tab.icon size={18} />
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main className="max-w-7xl mx-auto p-4 sm:p-6">
        
        {/* STATS */}
        {activeTab === 'inventario' && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <StatCard label="Estado Conexión" value={loading ? "Cargando..." : "Online"} color={loading ? "text-orange-500" : "text-green-600"} />
            <StatCard label="Total Equipos" value={stats.totalItems} color="text-blue-600" />
            <StatCard label="En Reparación" value={stats.inRepair} color="text-red-600" />
            <StatCard label="En Camión" value={stats.onTruck} color="text-slate-800" />
          </div>
        )}

        {/* CONTROLS */}
        <div className="flex gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input 
              type="text" 
              placeholder="Buscar..." 
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500 shadow-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button onClick={fetchData} className="bg-slate-100 text-slate-600 p-3 rounded-xl hover:bg-slate-200 transition-colors">
            <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
          </button>
          <button className="bg-red-600 text-white px-4 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-red-700 transition-colors shadow-lg">
            <Plus size={20} /> <span className="hidden sm:inline">Nuevo</span>
          </button>
        </div>

        {/* LOADING STATE */}
        {loading ? (
           <div className="text-center py-20 text-slate-400">
             <RefreshCw size={40} className="animate-spin mx-auto mb-4"/>
             <p>Conectando con Kingston Database...</p>
           </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            {activeTab === 'ubicaciones' ? (
              <LocationsView items={items} locations={locations} />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-slate-50 border-b border-slate-100">
                    <tr>
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Equipo</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Categoría</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Ubicación</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Estado</th>
                      <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredItems.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50 transition-colors group">
                        <td className="px-6 py-4">
                          <div className="font-bold text-slate-900">{item.name}</div>
                          <div className="text-xs text-slate-500 font-mono">SN: {item.serial_number}</div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800 capitalize">
                            {item.category}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-600 flex items-center gap-2">
                          <MapPin size={14} className="text-slate-400" />
                          {item.location}
                        </td>
                        <td className="px-6 py-4">
                          <StatusBadge status={item.status} />
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-2">
                            <button 
                              onClick={() => toggleTruck(item.id)}
                              className={`p-2 rounded-lg transition-colors ${truckCart.includes(item.id) ? 'bg-green-100 text-green-700' : 'text-slate-400 hover:bg-slate-100'}`}
                            >
                              <Truck size={18} />
                            </button>
                            <button 
                              onClick={() => deleteItem(item.id)}
                              className="p-2 text-slate-400 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filteredItems.length === 0 && (
                    <div className="p-10 text-center text-slate-500">
                        No se encontraron equipos
                    </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

// --- COMPONENTES AUXILIARES ---

function StatCard({ label, value, color }: { label: string, value: string | number, color: string }) {
  return (
    <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
      <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">{label}</p>
      <h2 className={`text-2xl sm:text-3xl font-black mt-1 ${color}`}>{value}</h2>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles = status === 'operativo' 
    ? 'bg-green-100 text-green-700 border-green-200' 
    : 'bg-red-100 text-red-700 border-red-200';
  
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${styles} uppercase`}>
      <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${status === 'operativo' ? 'bg-green-500' : 'bg-red-500'}`}></span>
      {status}
    </span>
  );
}

function LocationsView({ items, locations }: { items: any[], locations: any[] }) {
  return (
    <div className="p-6 grid gap-6 sm:grid-cols-2">
      {locations.map(loc => {
        const itemsInLoc = items.filter(i => i.location === loc.name);
        return (
          <div key={loc.id} className="border border-slate-200 rounded-xl p-4 hover:border-red-200 hover:shadow-md transition-all cursor-pointer bg-slate-50/50">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="font-bold text-lg text-slate-800">{loc.name}</h3>
                <p className="text-sm text-slate-500 flex items-center gap-1"><MapPin size={12}/> {loc.address}</p>
              </div>
              <span className="bg-white border border-slate-200 px-3 py-1 rounded-full text-xs font-bold shadow-sm">
                {itemsInLoc.length} items
              </span>
            </div>
            <div className="space-y-2">
              {itemsInLoc.slice(0, 3).map(item => (
                <div key={item.id} className="text-sm text-slate-600 bg-white p-2 rounded border border-slate-100 flex justify-between">
                  <span>{item.name}</span>
                  <span className="font-mono text-xs text-slate-400">{item.serial_number}</span>
                </div>
              ))}
              {itemsInLoc.length === 0 && <p className="text-xs text-slate-400 italic">Sin equipos asignados</p>}
              {itemsInLoc.length > 3 && (
                <div className="text-xs text-center text-slate-400 font-medium pt-1">
                  + {itemsInLoc.length - 3} más...
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}