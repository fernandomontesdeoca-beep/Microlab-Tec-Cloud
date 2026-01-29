
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { ArrowLeft, Share, Car, Wrench, DollarSign, Edit2, X, Trash, Phone, Navigation, Moon, Sun, MapPin, Coffee, Hotel, AlertCircle, Play, Square, CheckCircle } from 'lucide-react';
import { Ticket, LogEntry, InventoryItem, Contact, AppSettings } from '../types.ts';
import { Input, InputWithNow, TextArea, ConfirmationModal, SmartSelect, Modal, Button } from './UIComponents.tsx';
import { PhoneLog } from './PhoneLog.tsx';
import { theme } from '../theme.ts';

interface ReportViewProps {
    ticket: Ticket;
    onBack: () => void;
    onUpdate: (id: string, data: Partial<Ticket>) => Promise<void>;
    inventory: InventoryItem[];
    contacts: Contact[];
    initialTab?: 'datos' | 'telefono' | 'visita';
    settings: AppSettings;
    setUnsavedChanges: (v: boolean) => void;
    saveActionRef: React.MutableRefObject<any>;
}

const Utils = {
    getTodayISO: () => new Date().toISOString().split('T')[0],
    getTimeString: (d: Date) => `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`,
    formatEquipmentDisplay: (e: InventoryItem) => {
        const name = e.equipment ? e.equipment.trim() : '';
        const ref = e.ref ? e.ref.trim() : '';
        return ref ? `${name} - (${ref})` : name;
    },
    getWaData: (data: Ticket) => {
        const dayMonth = data.fechaAviso; 
        const time = data.horaAviso || '00:00';
        let text = `*${dayMonth}* *${time}* *${data.empresa || 'Sin Cliente'}*\n`;
        const typeLabel = data.contactType === 'Personal' ? ' (Pers.)' : '';
        text += `${data.nombre || ''} ${data.telefono || ''}${typeLabel}\n`;
        text += `${data.equipo || ''}\n${data.problema || ''}`;
        text += `\nOST: ${data.ost || ''}         ${data.category || 'Pend.'}`;
        const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
        return { text, url };
    }
};

const EventModal = ({ onSave, onClose, lastOdo, eventToEdit, initialAction, initialType, initialConcept, initialAmount }: any) => {
    const now = new Date();
    const [type, setType] = useState(eventToEdit?.type || initialType || 'move');
    const [f, setF] = useState({
        date: eventToEdit?.date || Utils.getTodayISO(),
        time: eventToEdit?.time || Utils.getTimeString(now),
        action: eventToEdit?.action || initialAction || 'Salida de Casa',
        odo: eventToEdit?.odo || '',
        amount: eventToEdit?.amount || initialAmount || '',
        concept: eventToEdit?.concept || initialConcept || '',
        note: eventToEdit?.note || '',
        taskDescription: eventToEdit?.description || '',
        partsUsed: eventToEdit?.parts || '',
        currency: eventToEdit?.currency || 'UYU',
        currencyOther: eventToEdit?.currencyOther || '',
        paymentMethod: eventToEdit?.paymentMethod || 'Efectivo',
        paymentSource: eventToEdit?.paymentSource || 'Personal',
        expenseType: eventToEdit?.expenseType || 'Empresa'
    });

    useEffect(() => {
        if(!eventToEdit) {
            if(initialType) setType(initialType);
            setF(prev => ({
                ...prev,
                action: initialAction || prev.action,
                concept: initialConcept || prev.concept,
                amount: initialAmount || prev.amount
            }));
        }
    }, [initialType, initialAction, initialConcept, initialAmount, eventToEdit]);

    const submit = () => {
        // Validación Odómetro
        if (type === 'move' && f.odo && lastOdo) {
             if (Number(f.odo) < Number(lastOdo)) {
                 if (!confirm(`⚠️ ATENCIÓN: El odómetro ingresado (${f.odo}) es MENOR al anterior (${lastOdo}). ¿Es correcto?`)) {
                     return;
                 }
             }
        }

        let desc = f.action;
        if(type === 'expense') desc = `${f.concept}`;
        if(type === 'note') desc = f.note;
        if(type === 'task') desc = f.taskDescription;
        onSave({
            id: eventToEdit ? eventToEdit.id : Date.now(), type, date: f.date, time: f.time, description: desc,
            action: f.action, odo: f.odo, amount: f.amount, concept: f.concept, note: f.note, parts: f.partsUsed,
            currency: f.currency, currencyOther: f.currencyOther, 
            paymentMethod: f.paymentMethod, 
            paymentSource: f.paymentSource,
            expenseType: f.expenseType
        });
    };

    const footer = (
        <Button onClick={submit} className="w-full">
            GUARDAR REGISTRO
        </Button>
    );

    return (
        <Modal title={eventToEdit ? 'Editar Evento' : 'Nuevo Evento'} onClose={onClose} footer={footer}>
            {!eventToEdit && (
                <div className="flex bg-gray-100 p-1 rounded-xl mb-4 overflow-x-auto">
                    {[{id:'move',label:'Auto',icon:Car},{id:'task',label:'Tarea',icon:Wrench},{id:'expense',label:'$',icon:DollarSign},{id:'note',label:'Nota',icon:Edit2}].map(t => (
                        <button key={t.id} onClick={()=>setType(t.id)} className={`flex-1 py-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition min-w-[60px] ${type===t.id?'bg-white shadow text-blue-600':'text-gray-500'}`}><t.icon className="w-4 h-4"/>{t.label}</button>
                    ))}
                </div>
            )}
            
            <div className="grid grid-cols-2 gap-4 mb-4">
                <Input label="📅 Fecha" type="date" val={f.date} set={(v:any)=>setF({...f, date:v})} />
                <InputWithNow label="🕒 Hora" val={f.time} set={(v:any)=>setF({...f, time:v})} />
            </div>

            {type === 'move' && (
                <div className="space-y-4">
                    <SmartSelect 
                        label="Movimiento" 
                        val={f.action} 
                        set={(v:any)=>setF({...f, action:v})} 
                        options={['Salida de Casa','Salida Taller','Salida Cliente','Salida por Repuesto','Búsqueda Repuesto','Llegada por Repuesto','Llegada A Casa','Llegada Taller','Llegada a Cliente']} 
                        allowCustom={true}
                        title="Seleccionar Movimiento"
                    />
                    <div>
                        <Input label="🔢 Odómetro Actual" type="number" val={f.odo} set={(v:any)=>setF({...f, odo:v})} placeholder="Ej: 123456" />
                        {lastOdo && <p className="text-[10px] text-gray-400 text-right mt-1">Anterior: {lastOdo} km</p>}
                    </div>
                </div>
            )}
            
            {type === 'task' && (
                <div className="space-y-4">
                    <TextArea label="🛠️ Trabajo Realizado" val={f.taskDescription} set={(v:any)=>setF({...f, taskDescription:v})} placeholder="Describa la tarea..." />
                    <TextArea label="📦 Repuestos Utilizados" val={f.partsUsed} set={(v:any)=>setF({...f, partsUsed:v})} placeholder="Ej: Fuente 500W, Cable HDMI..." rows={2} />
                </div>
            )}
            
            {type === 'expense' && (
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <SmartSelect label="Moneda" val={f.currency} set={(v:string)=>setF({...f, currency:v})} options={['UYU', 'U$D', 'Otro']} allowCustom={true} title="Moneda"/>
                        <Input label="Monto" type="number" val={f.amount} set={(v:any)=>setF({...f, amount:v})} />
                    </div>
                    <SmartSelect label="Concepto" val={f.concept} set={(v:any)=>setF({...f, concept:v})} options={['Estacionamiento','Peaje','Desayuno','Almuerzo','Merienda','Cena','Combustible','Hotel','Herramientas']} title="Concepto Gasto"/>
                    
                    <SmartSelect 
                        label="Forma de Pago" 
                        val={f.paymentMethod} 
                        set={(v:string)=>setF({...f, paymentMethod:v})} 
                        options={['Efectivo', 'Débito', 'Crédito', 'Transferencia']} 
                        title="Medio de Pago"
                    />
                    
                    <div className="grid grid-cols-2 gap-4 pt-1">
                        <div>
                            <label className={theme.colors.text.label + " block text-[10px] font-bold uppercase mb-2"}>Origen de Fondos</label>
                            <div className="flex flex-col gap-2 p-2 bg-gray-50 rounded-lg border border-gray-100">
                                <label className="flex items-center gap-2 text-xs text-gray-800 cursor-pointer hover:bg-white rounded p-1 transition"><input type="radio" name="pSource" checked={f.paymentSource === 'Personal'} onChange={()=>setF({...f, paymentSource:'Personal'})} className="accent-blue-600"/> Personal</label>
                                <label className="flex items-center gap-2 text-xs text-gray-800 cursor-pointer hover:bg-white rounded p-1 transition"><input type="radio" name="pSource" checked={f.paymentSource === 'Empresa'} onChange={()=>setF({...f, paymentSource:'Empresa'})} className="accent-blue-600"/> Empresa</label>
                            </div>
                        </div>
                        <div>
                            <label className={theme.colors.text.label + " block text-[10px] font-bold uppercase mb-2"}>Tipo de Gasto</label>
                            <div className="flex flex-col gap-2 p-2 bg-gray-50 rounded-lg border border-gray-100">
                                <label className="flex items-center gap-2 text-xs text-gray-800 cursor-pointer hover:bg-white rounded p-1 transition"><input type="radio" name="eType" checked={f.expenseType === 'Personal'} onChange={()=>setF({...f, expenseType:'Personal'})} className="accent-blue-600"/> Personal</label>
                                <label className="flex items-center gap-2 text-xs text-gray-800 cursor-pointer hover:bg-white rounded p-1 transition"><input type="radio" name="eType" checked={f.expenseType === 'Empresa'} onChange={()=>setF({...f, expenseType:'Empresa'})} className="accent-blue-600"/> Empresa</label>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            
            {type === 'note' && (
                <div>
                     <TextArea label="Nota Simple" val={f.note} set={(v:any)=>setF({...f, note:v})} placeholder="Nota general..." />
                </div>
            )}
        </Modal>
    );
};

export const ReportView: React.FC<ReportViewProps> = ({ ticket, onBack, onUpdate, inventory, contacts, initialTab, settings, setUnsavedChanges, saveActionRef }) => {
    const [tab, setTab] = useState(initialTab || (ticket.type === 'visita' ? 'visita' : 'datos'));
    const [data, setData] = useState<Ticket>({ ...ticket, category: ticket.category || 'Pend.', status: ticket.status || 'Pendiente' });
    const [logbook, setLogbook] = useState<LogEntry[]>(ticket.logbook || []);
    const [showModal, setShowModal] = useState(false);
    const [editingEvent, setEditingEvent] = useState<LogEntry | null>(null);
    const [wizardAction, setWizardAction] = useState<string | null>(null);
    const [wizardType, setWizardType] = useState<string | null>(null);
    const [wizardConcept, setWizardConcept] = useState<string | null>(null);
    const [wizardAmount, setWizardAmount] = useState<string | null>(null);
    const [confirmModal, setConfirmModal] = useState<any>(null);
    const [pendingDeparture, setPendingDeparture] = useState(false);
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
    const [travelMode, setTravelMode] = useState(false); // Dark Mode for driving

    const useReportCalculations = (logbook: LogEntry[]) => {
        return useMemo(() => {
            const sorted = [...logbook].sort((a, b) => new Date(`${a.date}T${a.time}`).getTime() - new Date(`${b.date}T${b.time}`).getTime());
            let costP = 0, costC = 0, km = 0;
            const odometers: number[] = [];
            let lastOdoVal = '';
            sorted.forEach(item => {
                if (item.type === 'expense') {
                    const amt = Number(item.amount || 0);
                    if (item.paymentSource === 'Personal') costP += amt; else costC += amt;
                }
                if (item.type === 'move' && item.odo) {
                    const val = Number(item.odo);
                    odometers.push(val);
                    lastOdoVal = item.odo; 
                }
            });
            if (odometers.length > 1) km = odometers[odometers.length - 1] - odometers[0];
            return { sortedLog: sorted, totalCostPersonal: costP, totalCostCompany: costC, totalKm: km, lastRecordedOdo: lastOdoVal };
        }, [logbook]);
    };

    const { sortedLog, totalCostPersonal, totalCostCompany, totalKm, lastRecordedOdo } = useReportCalculations(logbook);
    const kmValue = totalKm * (Number(settings?.kmPrice) || 0);
    const isSavingRef = useRef(false);

    useEffect(() => {
        setData({ ...ticket, category: ticket.category || 'Pend.', status: ticket.status || 'Pendiente' });
        setLogbook(ticket.logbook || []);
    }, [ticket]);

    useEffect(() => {
        if (isSavingRef.current) return;
        const isDirty = JSON.stringify(data) !== JSON.stringify(ticket) || JSON.stringify(logbook) !== JSON.stringify(ticket.logbook || []);
        setUnsavedChanges(isDirty);
    }, [data, logbook, ticket, setUnsavedChanges]);

    const handleSave = async () => {
        isSavingRef.current = true; setUnsavedChanges(false);
        await onUpdate(ticket.id, { ...data, logbook });
        setTimeout(() => { isSavingRef.current = false; }, 500);
    };

    useEffect(() => { if (saveActionRef) saveActionRef.current = handleSave; return () => { if (saveActionRef) saveActionRef.current = null; }; }, [handleSave, data, logbook]);

    // Lógica de Estado de Viaje
    const getJourneyState = () => {
        if (sortedLog.length === 0) return 'IDLE';
        let lastMove = sortedLog[sortedLog.length - 1];
        // Buscamos el último evento relevante para el estado (movimiento o tarea)
        for (let i = sortedLog.length - 1; i >= 0; i--) { 
            if (sortedLog[i].type === 'move' || sortedLog[i].type === 'task') { 
                lastMove = sortedLog[i]; 
                break; 
            } 
        }
        
        // Si lo último fue una Tarea -> Estamos en sitio (trabajando o terminamos)
        if (lastMove.type === 'task') return 'ON_SITE'; 
        
        if (!lastMove.action) return 'IDLE';
        const a = lastMove.action;
        
        // Si llegamos a algún lado -> Estamos en sitio
        if (a.includes('Llegada')) return 'ON_SITE';
        // Si salimos -> Estamos viajando
        if (a.includes('Salida') || a.includes('Búsqueda')) return 'TRAVELLING';
        
        return 'IDLE';
    };
    const journeyState = getJourneyState();

    const handleSmartAction = () => {
        let nextAction = 'Salida de Casa', nextType = 'move';
        
        // Flujo: Estoy TRABAJANDO -> Voy a SALIR
        if (journeyState === 'ON_SITE') {
            setConfirmModal({ 
                message: "¿Hubo gasto de Estacionamiento?", 
                onYes: () => { 
                    setWizardAction('Pago Estacionamiento'); 
                    setWizardType('expense'); 
                    setWizardConcept('Estacionamiento');
                    setWizardAmount('');
                    setPendingDeparture(true); // Flag para encadenar la salida después del gasto
                    setConfirmModal(null); 
                    setShowModal(true); 
                }, 
                onNo: handleDepartureSequence 
            });
            return;
        }
        
        // Flujo: Estoy VIAJANDO -> Voy a LLEGAR
        if (journeyState === 'TRAVELLING') {
             let lastMove = [...sortedLog].reverse().find(l => l.type === 'move');
             if (lastMove && lastMove.action) {
                 if (lastMove.action.includes('Salida por Repuesto')) nextAction = 'Llegada Taller'; 
                 else if (lastMove.action.includes('Salida Cliente')) nextAction = 'Llegada A Casa'; 
                 else nextAction = 'Llegada a Cliente';
             } else {
                 nextAction = 'Llegada a Cliente';
             }
        }
        
        setWizardAction(nextAction); setWizardType(nextType); setShowModal(true);
    };
    
    const handleToll = () => {
        setWizardAction('Pago Peaje');
        setWizardType('expense');
        setWizardConcept('Peaje');
        setWizardAmount(settings?.toll_telepeaje || '162');
        setShowModal(true);
    };
    
    const handleFuel = () => {
        setWizardAction('Carga Combustible');
        setWizardType('expense');
        setWizardConcept('Combustible');
        setWizardAmount('');
        setShowModal(true);
    };

    const handleSaveEvent = (event: LogEntry) => {
         const exists = logbook.find(e => e.id === event.id);
         const newLogbook = exists ? logbook.map(e => e.id === event.id ? event : e) : [...logbook, event];
         setLogbook(newLogbook);
         setShowModal(false);
         setEditingEvent(null);
         setWizardAction(null);
         setWizardType(null);
         setWizardConcept(null);
         setWizardAmount(null);

         if (pendingDeparture) {
             setPendingDeparture(false);
             setTimeout(() => handleDepartureSequence(), 300);
         }
    };

    const handleDepartureSequence = () => {
         setConfirmModal(null); // Limpiar previos
         setConfirmModal({
            message: "¿A dónde te diriges?",
            onYes: () => { // "Buscar Repuesto / Taller"
                setWizardAction('Salida por Repuesto');
                setWizardType('move');
                setConfirmModal(null);
                setShowModal(true);
            },
            onNo: () => { // "Casa / Siguiente Cliente" -> Generic Exit
                setWizardAction('Salida Cliente');
                setWizardType('move');
                setConfirmModal(null);
                setShowModal(true);
            }
        });
    };

    const uniqueClients = [...new Set([...inventory.map(i => i.client), ...contacts.map(c => c.company)])].sort();
    const availableEquip = inventory.filter(i => i.client === data.empresa).map(e => Utils.formatEquipmentDisplay(e));
    const waData = Utils.getWaData(data);

    const TabButton = ({ id, label }: any) => (
        <button onClick={() => setTab(id)} className={`flex-1 py-2 text-xs font-bold rounded-lg transition ${tab===id ? 'bg-white shadow text-blue-800' : 'text-gray-500 hover:text-gray-700'}`}>{label}</button>
    );

    return (
        <div className={`pb-24 ${theme.animation.fade} ${travelMode ? 'travel-mode min-h-screen -m-4 p-4' : ''}`}>
            
            {/* Header especial para modo viaje */}
            {travelMode ? (
                <div className="flex justify-between items-center mb-6">
                    <button onClick={() => setTravelMode(false)} className="bg-gray-800 p-2 rounded-full text-white"><ArrowLeft /></button>
                    <h2 className="text-xl font-black uppercase tracking-wider text-yellow-500">Asistente de Viaje</h2>
                    <div className="w-10"></div>
                </div>
            ) : (
                <div className="bg-white p-4 rounded-xl shadow-sm mb-4 flex justify-between items-center">
                    <button onClick={onBack} className="text-gray-500 hover:bg-gray-100 p-2 rounded-full"><ArrowLeft/></button>
                    <div className="flex-1 ml-3 overflow-hidden">
                        <div className="flex justify-between items-center mb-1 gap-2">
                            <h2 className="font-bold text-lg text-blue-900 truncate">{data.empresa}</h2>
                            <select className="text-xs font-bold border rounded px-2 py-1 bg-gray-100 text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500" value={data.status} onChange={e => setData({...data, status: e.target.value as any})}>
                                <option value="Pendiente">Pendiente</option>
                                <option value="Urgente">Urgente</option>
                                <option value="Asignado">Asignado</option>
                                <option value="Terminado">Terminado</option>
                            </select>
                        </div>
                        <p className="text-sm text-gray-600 truncate">{data.equipo}</p>
                    </div>
                </div>
            )}
            
            {!travelMode && (
                <div className="flex bg-gray-200 p-1 rounded-xl mb-4">
                    <TabButton id="datos" label="Aviso" />
                    <TabButton id="telefono" label="Teléfono" />
                    <TabButton id="visita" label="Visita / Viaje" />
                </div>
            )}
            
            {tab === 'datos' && !travelMode && (
                <div className="bg-white p-4 rounded-xl shadow-sm space-y-4">
                    <SmartSelect label="Cliente" val={data.empresa} set={(v:any)=>setData({...data, empresa:v})} options={uniqueClients} title="Seleccionar Cliente"/>
                    
                    <div className="grid grid-cols-2 gap-4">
                        <Input label="Contacto" val={data.nombre} set={(v:any)=>setData({...data, nombre:v})} />
                        <Input label="Teléfono" val={data.telefono} set={(v:any)=>setData({...data, telefono:v})} />
                    </div>
                    
                    <SmartSelect label="Equipo" val={data.equipo} set={(v:any)=>setData({...data, equipo:v})} options={availableEquip} title="Seleccionar Equipo"/>
                    
                    {(data.serial || data.passwordInfo) && <div className="bg-yellow-50 p-3 rounded-xl border border-yellow-200 grid grid-cols-2 gap-4 text-xs"><div><span className="font-bold block text-yellow-800 uppercase text-[10px]">Nro. Serie</span> <Input val={data.serial} set={(v:any)=>setData({...data, serial:v})} className="!mb-0" /></div><div><span className="font-bold block text-yellow-800 uppercase text-[10px]">Password</span> <Input val={data.passwordInfo} set={(v:any)=>setData({...data, passwordInfo:v})} className="!mb-0" /></div></div>}
                    
                    <TextArea label="Motivo" val={data.problema} set={(v:any)=>setData({...data, problema:v})} />
                    
                    <div className="grid grid-cols-2 gap-4 bg-gray-50 p-3 rounded-xl border border-gray-100">
                        <Input label="OST" val={data.ost} set={(v:any)=>setData({...data, ost:v})} type="number" />
                        <SmartSelect label="Clasificación" val={data.category} set={(v:string)=>setData({...data, category:v})} options={['Pend.', 'STel.', 'SPres.']} allowCustom={false} title="Categoría"/>
                    </div>
                    
                    <div className="pt-2">
                        <div className="bg-green-50 p-3 rounded-xl text-xs font-mono text-green-800 mb-3 border border-green-200 whitespace-pre-wrap">{waData.text}</div>
                        <Button variant="secondary" onClick={()=>window.open(waData.url, '_blank')} className="w-full text-green-700 border-green-200 bg-green-50 hover:bg-green-100">
                            <Share className="w-4 h-4" /> Reenviar WhatsApp
                        </Button>
                    </div>
                </div>
            )}

            {tab === 'telefono' && !travelMode && <PhoneLog data={data} setData={setData} />}

            {(tab === 'visita' || travelMode) && (
                <div>
                    {!travelMode && (
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold text-gray-700">Bitácora de Visita</h3>
                            <button onClick={()=>setTravelMode(true)} className="flex items-center gap-1 bg-gray-900 text-white px-3 py-1.5 rounded-full text-xs font-bold shadow hover:bg-black transition">
                                <Moon className="w-3 h-3" /> Modo Viaje
                            </button>
                        </div>
                    )}

                    {/* DASHBOARD PRINCIPAL VIAJE */}
                    <div className={`mb-6 relative ${travelMode ? 'mt-4' : ''}`}>
                        <div className="flex gap-2">
                            <button onClick={handleSmartAction} className={`flex-1 p-6 rounded-2xl shadow-xl font-bold text-white flex flex-col items-center justify-center active:scale-95 transition-all relative overflow-hidden ${journeyState==='IDLE'?'bg-blue-600':journeyState==='TRAVELLING'?'bg-green-600':'bg-orange-500'}`}>
                                {/* Animation Ripple Effect */}
                                <div className="absolute inset-0 bg-white/10 animate-pulse"></div>
                                
                                <div className="text-3xl mb-2 flex items-center gap-3 relative z-10">
                                    {journeyState==='IDLE' ? <Play className="w-8 h-8 fill-current"/> : journeyState==='TRAVELLING' ? <Navigation className="w-8 h-8"/> : <Square className="w-8 h-8 fill-current"/>}
                                    {journeyState==='IDLE' ? 'INICIAR' : journeyState==='TRAVELLING' ? 'LLEGAR' : 'SALIR'}
                                </div>
                                <div className="text-xs opacity-80 font-bold uppercase tracking-widest relative z-10">
                                    {journeyState==='IDLE' ? 'Comenzar Recorrido' : journeyState==='TRAVELLING' ? 'En Tránsito...' : 'En Sitio / Trabajando'}
                                </div>
                            </button>
                        </div>
                        
                        {/* Accesos rápidos durante el viaje */}
                        {journeyState === 'TRAVELLING' && (
                            <div className="grid grid-cols-2 gap-3 mt-3">
                                <button onClick={handleToll} className="bg-yellow-400 hover:bg-yellow-500 text-yellow-900 p-4 rounded-xl shadow-lg font-bold flex items-center justify-center gap-2 active:scale-95 transition">
                                    <DollarSign className="w-5 h-5"/> PEAJE
                                </button>
                                <button onClick={handleFuel} className="bg-red-500 hover:bg-red-600 text-white p-4 rounded-xl shadow-lg font-bold flex items-center justify-center gap-2 active:scale-95 transition">
                                    <Car className="w-5 h-5"/> COMBUSTIBLE
                                </button>
                            </div>
                        )}
                        
                        {/* Accesos rápidos durante el trabajo */}
                        {journeyState === 'ON_SITE' && (
                            <div className="mt-3">
                                <button onClick={()=>{setWizardType('task'); setWizardAction('Trabajo Realizado'); setShowModal(true)}} className="w-full bg-blue-500 hover:bg-blue-600 text-white p-4 rounded-xl shadow-lg font-bold flex items-center justify-center gap-2 active:scale-95 transition">
                                    <Wrench className="w-5 h-5"/> REGISTRAR TAREA / REPUESTO
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Resumen Métricas */}
                    <div className={`grid grid-cols-2 gap-3 mb-4 ${travelMode ? 'opacity-80' : ''}`}>
                        <div className={`${travelMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'} p-3 rounded-xl text-center border shadow-sm`}>
                            <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1">Recorrido</div>
                            <div className={`text-xl font-black ${travelMode ? 'text-white' : 'text-gray-800'}`}>{totalKm} <span className="text-sm font-normal text-gray-500">km</span></div>
                            <div className="text-xs text-blue-500 font-bold mt-1">Odómetro: {lastRecordedOdo || '---'}</div>
                        </div>
                        <div className={`${travelMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'} p-3 rounded-xl text-center border shadow-sm flex flex-col justify-center`}>
                            <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-2">Gastos (P / E)</div>
                            <div className="flex justify-around text-xs">
                                <div><span className={`font-bold text-sm ${travelMode ? 'text-green-400' : 'text-gray-800'}`}>${totalCostPersonal}</span></div>
                                <div className="w-px bg-gray-600 mx-1"></div>
                                <div><span className={`font-bold text-sm ${travelMode ? 'text-red-400' : 'text-gray-800'}`}>${totalCostCompany}</span></div>
                            </div>
                        </div>
                    </div>

                    {/* Lista de Eventos */}
                    <div className={`${travelMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'} rounded-xl shadow-sm overflow-hidden border mb-20`}>
                        {sortedLog.length === 0 && <div className="p-6 text-center text-gray-500 text-sm">No hay eventos registrados</div>}
                        {sortedLog.map(item => (
                            <div key={item.id} className={`px-4 py-3 border-b flex items-start text-sm last:border-0 ${travelMode ? 'border-gray-700 hover:bg-gray-700' : 'border-gray-50 hover:bg-gray-50'}`}>
                                <div className="w-14 text-gray-400 text-xs font-bold pt-1">{item.time}</div>
                                <div className="flex-1 px-2">
                                    <div className={`font-bold ${travelMode ? 'text-gray-200' : 'text-gray-800'}`}>{item.description}</div>
                                    {item.type==='task' && item.parts && <div className="text-xs text-yellow-600 mt-1 inline-block">Rep: {item.parts}</div>}
                                </div>
                                <div className="w-16 text-right font-mono text-xs text-blue-500 font-bold pt-1">
                                    {item.odo && <div>{item.odo}km</div>}
                                    {item.amount && <div>${item.amount}</div>}
                                </div>
                                <div className="w-12 flex justify-end gap-1 ml-1">
                                    <button onClick={()=>{setEditingEvent(item); setShowModal(true);}} className="text-gray-400 hover:text-blue-500 p-1"><Edit2 className="w-4 h-4"/></button>
                                    <button onClick={()=>{setDeleteConfirm(String(item.id))}} className="text-gray-400 hover:text-red-500 p-1"><Trash className="w-4 h-4"/></button>
                                </div>
                            </div>
                        ))}
                    </div>

                    {!travelMode && (
                        <div className="fixed bottom-20 left-0 right-0 max-w-lg mx-auto px-4 w-full z-10 pointer-events-none">
                            <Button onClick={() => { setEditingEvent(null); setWizardAction(null); setWizardType(null); setShowModal(true); }} className="w-full bg-gray-900 text-white shadow-xl pointer-events-auto">
                                AGREGAR REGISTRO MANUAL
                            </Button>
                        </div>
                    )}

                    {showModal && <EventModal onSave={handleSaveEvent} onClose={()=>{setShowModal(false); setEditingEvent(null); setPendingDeparture(false);}} lastOdo={lastRecordedOdo} eventToEdit={editingEvent} initialAction={wizardAction} initialType={wizardType} initialConcept={wizardConcept} initialAmount={wizardAmount} />}
                    
                    {confirmModal && <ConfirmationModal message={confirmModal.message} onYes={confirmModal.onYes} onNo={confirmModal.onNo} />}
                    
                    {deleteConfirm && (
                        <ConfirmationModal 
                            message="¿Estás seguro de que quieres eliminar este evento?" 
                            onYes={() => { setLogbook(logbook.filter(x => String(x.id) !== deleteConfirm)); setDeleteConfirm(null); }} 
                            onNo={() => setDeleteConfirm(null)} 
                        />
                    )}
                </div>
            )}
        </div>
    );
};
