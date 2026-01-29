
import React, { useState, useEffect, useRef } from 'react';
import { Settings, Plus, Home, Database } from 'lucide-react';
import { subscribeToCollection, updateData, deleteData, addData } from './services/firebaseConfig.ts';
import { Ticket, InventoryItem, Contact, AppSettings } from './types.ts';
import { ReportView } from './components/ReportView.tsx';
import { TicketList } from './components/TicketList.tsx';
import { CreateForm } from './components/CreateForm.tsx';
import { SettingsView } from './components/SettingsView.tsx';
import { ConfirmationModal } from './components/UIComponents.tsx';

const App = () => {
    // Hardcoded local user
    const activeUser = { uid: 'local-tech', displayName: 'Técnico Local', email: 'offline@system' };

    const [view, setView] = useState('list');
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [inventory, setInventory] = useState<InventoryItem[]>([]);
    const [contacts, setContacts] = useState<Contact[]>([]);
    const [settings, setSettings] = useState<AppSettings>({ id: 'config', tollPrice: '135', kmPrice: '25' });
    
    const [activeTicketId, setActiveTicketId] = useState<string | null>(null);
    const [initialReportTab, setInitialReportTab] = useState<any>(null);
    const [currentSettingsTab, setCurrentSettingsTab] = useState('db');
    const [unsavedChanges, setUnsavedChanges] = useState(false); 
    const [deleteId, setDeleteId] = useState<string|null>(null);
    const saveActionRef = useRef<any>(null); 

    useEffect(() => {
        try {
            const unsubTickets = subscribeToCollection('tickets', (data) => setTickets(data.sort((a: any, b: any) => (b.timestamp || 0) - (a.timestamp || 0))));
            const unsubInv = subscribeToCollection('inventory', setInventory);
            const unsubContacts = subscribeToCollection('contacts', setContacts);
            const unsubSettings = subscribeToCollection('settings', (data) => {
                const config = data.find(d => d.id === 'config');
                if(config) setSettings(config);
            });

            return () => { unsubTickets(); unsubInv(); unsubContacts(); unsubSettings(); };
        } catch (e) {
            console.error("Error suscribiendo a colecciones locales:", e);
        }
    }, []);

    const handleUpdate = async (id: string, data: Partial<Ticket>) => { await updateData('tickets', id, data); };
    const handleCreate = async (data: any) => { 
        await addData('tickets', { ...data, timestamp: Date.now() }); 
        setView('list'); 
    };
    
    const handleDelete = async () => {
        if (deleteId) {
            await deleteData('tickets', deleteId);
            setDeleteId(null);
        }
    }
    
    const handleOpenReport = (id: string) => { setActiveTicketId(id); setInitialReportTab(null); setView('report'); setUnsavedChanges(false); };

    return (
        <div className="min-h-screen pb-6 max-w-lg mx-auto bg-gray-100 shadow-xl relative font-sans">
            <header className="bg-blue-800 text-white p-4 shadow-lg sticky top-0 z-20 h-16 flex items-center justify-between">
                <div>
                    <h1 className="text-lg font-black tracking-tight flex items-center gap-2">
                        Microlab
                        <span title="Modo Local"><Database className="w-4 h-4 text-green-300" /></span>
                    </h1>
                    <span className="text-[10px] opacity-70 font-medium uppercase tracking-widest">Local Offline v2.0</span>
                </div>
                <div className="flex gap-3">
                    {(view==='report'||view==='create') && unsavedChanges && (
                        <button onClick={() => saveActionRef.current && saveActionRef.current()} className="bg-orange-500 hover:bg-orange-400 px-4 py-1.5 rounded-full text-xs font-bold animate-pulse shadow-md transition">
                            GUARDAR
                        </button>
                    )}
                    {view=== 'list' ? (
                        <>
                            <button onClick={()=>setView('settings')} className="p-2 hover:bg-white/10 rounded-full transition"><Settings className="w-6 h-6"/></button>
                            <button onClick={()=>setView('create')} className="bg-white text-blue-800 px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1 shadow hover:bg-blue-50 transition active:scale-95">
                                <Plus className="w-4 h-4"/> Nuevo
                            </button>
                        </>
                    ) : (
                        <button onClick={()=>setView('list')} className="p-2 hover:bg-white/10 rounded-full transition"><Home className="w-6 h-6"/></button>
                    )}
                </div>
            </header>
            
            <main className="p-4">
                {view === 'list' && <TicketList tickets={tickets} onOpen={handleOpenReport} onDelete={setDeleteId} />}
                {view === 'create' && <CreateForm onCancel={()=>setView('list')} onSubmit={handleCreate} inventory={inventory} contacts={contacts} setView={setView} setCurrentSettingsTab={setCurrentSettingsTab} setUnsavedChanges={setUnsavedChanges} saveActionRef={saveActionRef} />}
                {view === 'report' && tickets.find(t=>t.id===activeTicketId) && <ReportView ticket={tickets.find(t=>t.id===activeTicketId)!} onBack={()=>setView('list')} onUpdate={handleUpdate} inventory={inventory} contacts={contacts} initialTab={initialReportTab} settings={settings} setUnsavedChanges={setUnsavedChanges} saveActionRef={saveActionRef} />}
                {view === 'settings' && <SettingsView onBack={()=>setView('list')} inventory={inventory} contacts={contacts} settings={settings} initialTab={currentSettingsTab} user={activeUser} />}
            </main>

            {deleteId && (
                <ConfirmationModal 
                    message="¿Estás seguro de que quieres eliminar este servicio?" 
                    onYes={handleDelete} 
                    onNo={() => setDeleteId(null)} 
                />
            )}
        </div>
    );
};

export default App;
