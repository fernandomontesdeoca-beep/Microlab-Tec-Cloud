import React, { useState, useEffect } from 'react';
import { Phone, PhoneOff, Edit, Trash } from 'lucide-react';
import { Input, InputWithNow, TextArea, Button, ConfirmationModal } from './UIComponents';
import { Ticket, PhoneLogEntry } from '../types';
import { theme } from '../theme';

interface PhoneLogProps {
    data: Ticket;
    setData: (d: Ticket) => void;
}

const Utils = {
    getTodayISO: () => new Date().toISOString().split('T')[0],
    getTimeString: (d: Date) => `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`,
    formatTimer: (s: number) => `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`,
    fmtMins: (m: number) => { const h = Math.floor(m/60); const min = m%60; return h>0 ? `${h}h ${min}m` : `${min}m`; },
    calcMins: (s: string, e: string) => {
        if(!s || !e) return 0;
        const [h1, m1] = s.split(':').map(Number);
        const [h2, m2] = e.split(':').map(Number);
        let diff = (h2 * 60 + m2) - (h1 * 60 + m1);
        return diff < 0 ? diff + 1440 : diff;
    },
    formatDateShort: (iso: string) => {
        if(!iso) return 'DD/MM';
        if(iso.includes('-')) { const p = iso.split('-'); if(p.length===3) return `${p[2]}/${p[1]}`; }
        return iso;
    },
};

export const PhoneLog: React.FC<PhoneLogProps> = ({ data, setData }) => {
    const STORAGE_KEY_TIME = `microlab_call_${data.id}`;
    const STORAGE_KEY_NOTE = `microlab_call_note_${data.id}`;
    const [editingId, setEditingId] = useState<number | null>(null);
    const [activeCall, setActiveCall] = useState<{startTime: Date} | null>(() => { const stored = localStorage.getItem(STORAGE_KEY_TIME); return stored ? { startTime: new Date(stored) } : null; });
    const [callTimer, setCallTimer] = useState(0);
    const [form, setForm] = useState<any>({ date: Utils.getTodayISO(), start: '', end: '', note: localStorage.getItem(STORAGE_KEY_NOTE) || '' });
    const [deleteId, setDeleteId] = useState<number|null>(null);
    
    const list = data.phoneLog || [];
    
    useEffect(() => {
        let interval: any;
        if (activeCall) { 
            const update = () => setCallTimer(Math.floor((new Date().getTime() - activeCall.startTime.getTime()) / 1000)); 
            update(); 
            interval = setInterval(update, 1000); 
        } else { 
            setCallTimer(0); 
        }
        return () => clearInterval(interval);
    }, [activeCall]);

    const handleToggleCall = () => {
        if (activeCall) {
            const newLog: PhoneLogEntry = { id: Date.now(), date: Utils.getTodayISO(), start: Utils.getTimeString(activeCall.startTime), end: Utils.getTimeString(new Date()), note: form.note || "Llamada finalizada" };
            setData({...data, phoneLog: [...list, newLog]}); 
            localStorage.removeItem(STORAGE_KEY_TIME); 
            localStorage.removeItem(STORAGE_KEY_NOTE); 
            setActiveCall(null); 
            setForm({ ...form, note: '' });
        } else {
            const start = new Date(); 
            setActiveCall({ startTime: start }); 
            localStorage.setItem(STORAGE_KEY_TIME, start.toISOString());
        }
    };

    const handleSave = () => { 
        if(!form.start) return; 
        const updatedList = editingId ? list.map(i => i.id === editingId ? { ...form, id: editingId } : i) : [...list, { ...form, id: Date.now() }]; 
        setData({...data, phoneLog: updatedList}); 
        setForm({ date: Utils.getTodayISO(), start:'', end:'', note:'' }); 
        setEditingId(null); 
    };
    
    const getLogDuration = (s: string, e: string) => { const m = Utils.calcMins(s, e); return m < 1 ? 1 : m; };
    const totalMins = list.reduce((acc, i) => acc + getLogDuration(i.start, i.end), 0);

    return (
        <div className="space-y-4">
            <button 
                onClick={handleToggleCall} 
                className={`w-full py-4 rounded-xl shadow-lg font-bold text-lg flex flex-col items-center justify-center transition-all active:scale-95 ${activeCall ? 'bg-red-500 text-white pulse-red' : 'bg-green-100 text-green-800 hover:bg-green-200 border border-green-300'}`}
            >
                <div className="flex items-center gap-2">
                    {activeCall ? <PhoneOff className="w-6 h-6"/> : <Phone className="w-6 h-6"/>}
                    <span>{activeCall ? 'FINALIZAR LLAMADA' : 'INICIAR LLAMADA AHORA'}</span>
                </div>
                {activeCall && <span className="text-3xl font-mono mt-1 font-black">{Utils.formatTimer(callTimer)}</span>}
            </button>

            <div className="bg-blue-600 text-white p-4 rounded-xl flex justify-between font-bold shadow-md items-center">
                <span className="text-sm opacity-90 uppercase tracking-wide">Total Tiempo Teléfono</span>
                <span className="text-xl">{Utils.fmtMins(totalMins)}</span>
            </div>

            <div className={`bg-white p-4 rounded-xl shadow-sm border ${editingId ? 'border-yellow-400 ring-2 ring-yellow-100' : 'border-gray-200'}`}>
                <h4 className="text-xs font-bold text-gray-400 uppercase mb-3">{editingId ? 'Editando Registro' : 'Agregar Manualmente'}</h4>
                <div className="grid grid-cols-3 gap-3 mb-3">
                    <Input type="date" val={form.date} set={(v:string)=>setForm({...form, date:v})} readOnly={!!activeCall} className="!mb-0" />
                    <InputWithNow val={form.start} set={(v:string)=>setForm({...form, start:v})} className="!mb-0" />
                    <InputWithNow val={form.end} set={(v:string)=>setForm({...form, end:v})} className="!mb-0" />
                </div>
                <TextArea placeholder="Detalle de la conversación..." val={form.note} set={(v:any)=>{setForm({...form, note:v}); if(activeCall) localStorage.setItem(STORAGE_KEY_NOTE, v);}} rows={2} />
                
                {!activeCall && (
                    <Button onClick={handleSave} variant={editingId ? 'warning' : 'secondary'} className="w-full mt-3 text-sm">
                        {editingId ? 'ACTUALIZAR REGISTRO' : 'AGREGAR AL HISTORIAL'}
                    </Button>
                )}
            </div>

            <div className="space-y-3">
                {list.map(i => { const d = getLogDuration(i.start, i.end); return (
                    <div key={i.id} className="bg-white p-4 rounded-xl shadow-sm border-l-4 border-blue-300 flex justify-between items-start">
                        <div>
                            <div className="font-bold text-xs text-gray-400 flex items-center gap-2 mb-1">
                                <span>{Utils.formatDateShort(i.date)}</span>
                                <span className="text-gray-300">|</span>
                                <span>{i.start} - {i.end}</span>
                                <span className="text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded text-[10px] font-bold border border-blue-100">{Utils.fmtMins(d)}</span>
                            </div>
                            <div className="text-sm text-gray-800">{i.note}</div>
                        </div>
                        <div className="flex gap-1 ml-2">
                            <button onClick={()=>{setForm(i); setEditingId(i.id);}} className="text-gray-400 hover:text-blue-500 p-2 rounded-full hover:bg-gray-100 transition"><Edit className="w-4 h-4"/></button>
                            <button onClick={()=>setDeleteId(i.id)} className="text-gray-400 hover:text-red-500 p-2 rounded-full hover:bg-gray-100 transition"><Trash className="w-4 h-4"/></button>
                        </div>
                    </div>
                )})}
            </div>

            {deleteId && (
                <ConfirmationModal 
                    message="¿Borrar este registro telefónico?" 
                    onYes={() => { setData({...data, phoneLog: list.filter(x => x.id !== deleteId)}); setDeleteId(null); }} 
                    onNo={() => setDeleteId(null)}
                />
            )}
        </div>
    )
};
