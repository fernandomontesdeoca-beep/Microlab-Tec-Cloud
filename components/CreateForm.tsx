import React, { useState, useEffect, useMemo } from 'react';
import { ArrowLeft, Clock, Share } from 'lucide-react';
import { addData } from '../services/firebaseConfig.ts';
import { Contact } from '../types.ts';
import { Input, TextArea, SmartSelect, Button } from './UIComponents.tsx';
import { theme } from '../theme.ts';

export const CreateForm = ({ onCancel, onSubmit, inventory, contacts, setView, setCurrentSettingsTab, setUnsavedChanges, saveActionRef }: any) => {
    const now = new Date();
    const [form, setForm] = useState<any>({ 
        fechaAviso: now.toISOString().split('T')[0], 
        horaAviso: `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`, 
        empresa: '', 
        nombre: '', 
        telefono: '', 
        equipo: '', 
        problema: '', 
        status: 'Pendiente', 
        contactType: 'Corporativo', 
        type: 'telefono',
        ost: '',
        category: 'Pend.'
    });
    const [timer, setTimer] = useState(0);

    useEffect(() => { const i = setInterval(() => setTimer(t => t + 1), 1000); return () => clearInterval(i); }, []);
    useEffect(() => { setUnsavedChanges(form.empresa !== '' || form.problema !== ''); }, [form, setUnsavedChanges]);

    const handleSubmitWrapper = () => {
        if (!form.empresa && !form.problema) return alert("Ingrese Cliente o Motivo");
        const autoLog = { id: Date.now(), date: form.fechaAviso, start: form.horaAviso, end: `${String(new Date().getHours()).padStart(2,'0')}:${String(new Date().getMinutes()).padStart(2,'0')}`, note: "Generación de Aviso" };
        
        if (form.empresa && form.nombre && !contacts.find((c: Contact) => c.company === form.empresa && c.name === form.nombre)) {
            addData('contacts', { company: form.empresa, name: form.nombre, phone: form.telefono, type: 'Corporativo' });
        }
        onSubmit({ ...form, creationDuration: timer, phoneLog: [autoLog] });
    };

    useEffect(() => { if (saveActionRef) saveActionRef.current = handleSubmitWrapper; return () => { if (saveActionRef) saveActionRef.current = null; }; }, [form, timer]);

    const uniqueClients = useMemo(() => [...new Set([...inventory.map((i:any) => i.client), ...contacts.map((c:any) => c.company)])].sort(), [inventory, contacts]);
    const availableContacts = contacts.filter((c:any) => c.company === form.empresa).map((c: any) => c.name);
    const availableEquip = inventory.filter((i:any) => i.client === form.empresa).map((i: any) => `${i.equipment} - (${i.ref})`);

    const handleEquipChange = (val: string) => {
        const rawEquipName = val.split(' - (')[0]; 
        const f = inventory.find((i:any) => i.client === form.empresa && (i.equipment === val || i.equipment === rawEquipName || `${i.equipment} - (${i.ref})` === val));
        setForm((p:any) => ({ ...p, equipo: val, serial: f ? f.serial : '', passwordInfo: f ? f.password : '' }));
    };
    
    const formatTimer = (s: number) => `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;

    // Lógica para generar el texto de WhatsApp en tiempo real
    const waData = useMemo(() => {
        // Formato DD/MM
        const dayMonth = form.fechaAviso ? form.fechaAviso.split('-').reverse().slice(0, 2).join('/') : '';
        
        let text = `*${dayMonth}* *${form.horaAviso}* *${form.empresa || 'Sin Cliente'}*\n`;
        
        if (form.nombre || form.telefono) {
             const typeLabel = form.contactType === 'Personal' ? ' (Pers.)' : '';
             text += `${form.nombre || ''} ${form.telefono || ''}${typeLabel}\n`;
        }
        
        if (form.equipo) text += `${form.equipo}\n`;
        if (form.problema) text += `${form.problema}\n`;
        
        // Footer con OST y Categoría alineados visualmente
        text += `\nOST: ${form.ost || ''}         ${form.category || 'Pend.'}`;
        
        const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
        return { text, url };
    }, [form]);

    return (
        <div className={`bg-white ${theme.shapes.rounded} ${theme.shadows.floating} overflow-hidden ${theme.animation.fade} pb-2`}>
            {/* Header */}
            <div className="bg-gray-50 p-4 flex justify-between items-center border-b border-gray-100">
                <div className="flex items-center gap-2">
                    <button onClick={onCancel} className="text-gray-500 hover:text-gray-700 hover:bg-gray-200 p-2 rounded-full transition"><ArrowLeft/></button>
                    <h2 className="font-bold text-gray-700">Nuevo Servicio</h2>
                </div>
                <div className="flex items-center gap-1 text-red-600 font-mono text-sm font-bold bg-red-50 px-3 py-1 rounded-full border border-red-100 shadow-sm">
                    <Clock className="w-3 h-3" /> {formatTimer(timer)}
                </div>
            </div>

            {/* Empty State Warning */}
            {inventory.length===0 && (
                <div className="bg-blue-50 p-4 m-4 rounded-xl text-center border border-blue-100">
                    <p className="text-sm font-bold text-blue-900 mb-2">Base de datos vacía</p>
                    <Button variant="secondary" onClick={()=>{setCurrentSettingsTab('inventory'); setView('settings');}} className="text-xs py-2">
                        Configurar / Cargar CSV
                    </Button>
                </div>
            )}

            <div className="p-4 space-y-5">
                
                {/* Bloque Fecha/Hora (Estilo Azul de la imagen) */}
                <div className="flex gap-4 bg-blue-50/60 p-3 rounded-lg border border-blue-100">
                    <Input className="flex-1 !mb-0" label="📅 Fecha" type="date" val={form.fechaAviso} set={(v:any)=>setForm({...form, fechaAviso: v})} />
                    <Input className="flex-1 !mb-0" label="🕒 Hora" type="time" val={form.horaAviso} set={(v:any)=>setForm({...form, horaAviso: v})} />
                </div>

                {/* Cliente */}
                <SmartSelect 
                    label="🏢 Cliente" 
                    val={form.empresa} 
                    set={(v:any)=>setForm((p:any)=>({...p, empresa: v, nombre: '', telefono: '', equipo: ''}))} 
                    options={uniqueClients} 
                    title="Seleccionar Cliente"
                    placeholder="Seleccione..."
                />

                {/* Fila Contacto y Teléfono */}
                <div className="grid grid-cols-2 gap-4 border-b border-gray-100 pb-4">
                    <SmartSelect 
                        label="👤 Contacto" 
                        val={form.nombre} 
                        set={(val:string)=>{
                            const c = contacts.find((x:any) => x.company === form.empresa && x.name === val); 
                            setForm((p:any)=>({...p, nombre:val, telefono:c?c.phone:p.telefono}))
                        }} 
                        options={availableContacts}
                        title="Seleccionar Contacto"
                        placeholder="Nombre..."
                    />
                    
                    <div>
                        <div className="flex justify-between items-center mb-1">
                            <label className={theme.colors.text.label + " text-[10px] font-bold uppercase"}>📞 Teléfono</label>
                            <select 
                                className="text-[10px] bg-gray-100 border border-gray-200 rounded p-1 text-gray-700 focus:outline-none" 
                                value={form.contactType} 
                                onChange={e=>setForm({...form, contactType: e.target.value})}
                            >
                                <option value="Corporativo">Empresa</option>
                                <option value="Personal">Personal</option>
                            </select>
                        </div>
                        <input type="tel" className="w-full border-b border-gray-300 py-2 text-sm bg-transparent text-gray-900 focus:border-blue-500 focus:outline-none" value={form.telefono} onChange={e=>setForm({...form, telefono: e.target.value})} placeholder="Número..." />
                    </div>
                </div>

                {/* Equipo */}
                <div className="border-b border-gray-100 pb-4">
                    <SmartSelect 
                        label="⚙️ Equipo" 
                        val={form.equipo} 
                        set={handleEquipChange} 
                        options={availableEquip}
                        title="Seleccionar Equipo"
                        placeholder="Seleccionar equipo..."
                    />
                     {(form.serial || form.passwordInfo) && (
                        <div className="mt-2 flex gap-4 text-xs text-gray-500 bg-gray-50 p-2 rounded">
                            {form.serial && <span>SN: <span className="font-mono text-gray-800">{form.serial}</span></span>}
                            {form.passwordInfo && <span>Pass: <span className="font-mono text-gray-800">{form.passwordInfo}</span></span>}
                        </div>
                    )}
                </div>

                {/* Motivo */}
                <TextArea label="📝 Motivo" val={form.problema} set={(v:any)=>setForm({...form, problema: v})} rows={3} placeholder="Describa el problema..." />

                {/* Botones Tipo */}
                <div className="flex p-1 bg-white border border-gray-200 rounded-lg shadow-sm">
                    <button type="button" onClick={()=>setForm({...form, type: 'telefono'})} className={`flex-1 py-2 rounded-md text-sm font-bold transition ${form.type === 'telefono' ? 'bg-gray-100 text-blue-700 shadow-inner' : 'text-gray-400 hover:text-gray-600'}`}>Teléfono</button>
                    <div className="w-px bg-gray-200 my-2"></div>
                    <button type="button" onClick={()=>setForm({...form, type: 'visita'})} className={`flex-1 py-2 rounded-md text-sm font-bold transition ${form.type === 'visita' ? 'bg-gray-100 text-orange-600 shadow-inner' : 'text-gray-400 hover:text-gray-600'}`}>Visita</button>
                </div>

                {/* OST y Clasificación */}
                <div className="grid grid-cols-2 gap-4 bg-gray-50 p-3 rounded-lg border border-gray-100">
                    <Input label="🔢 OST" val={form.ost} set={(v:any)=>setForm({...form, ost: v})} type="text" placeholder="Nº OST" className="!mb-0" />
                    <SmartSelect 
                        label="🏷️ Clasificación" 
                        val={form.category} 
                        set={(v:string)=>setForm({...form, category: v})} 
                        options={['Pend.', 'STel.', 'SPres.']} 
                        allowCustom={false}
                        title="Categoría"
                        className="!mb-0"
                    />
                </div>

                {/* --- SECCIÓN WHATSAPP (Nueva) --- */}
                <div className="space-y-3 pt-2">
                    {/* Caja Verde de Previsualización */}
                    <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                        <pre className="text-xs font-mono text-green-900 whitespace-pre-wrap font-medium leading-relaxed">
                            {waData.text}
                        </pre>
                    </div>

                    {/* Botón Enviar WhatsApp */}
                    <Button 
                        variant="secondary" 
                        onClick={()=>window.open(waData.url, '_blank')} 
                        className="w-full text-green-700 border-green-500 hover:bg-green-50 font-bold"
                    >
                        <Share className="w-4 h-4 mr-2" /> Enviar Aviso WhatsApp
                    </Button>

                    {/* Botón Guardar (Principal) */}
                    <Button onClick={handleSubmitWrapper} className="w-full shadow-lg shadow-blue-200/50 py-4 text-base">
                        GUARDAR
                    </Button>
                </div>
            </div>
        </div>
    );
};
