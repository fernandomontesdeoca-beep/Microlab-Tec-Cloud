
import React, { useState, useRef } from 'react';
import { ArrowLeft, Settings, Upload, User as UserIcon, LogOut, Fuel, Zap, Map, Route, Trash, Loader, AlertTriangle, RefreshCw, ChevronDown, ChevronUp, Eye, Globe, FileSpreadsheet, Download } from 'lucide-react';
import { addData, setData, importDataBatch, clearCollectionData, deleteData, subscribeToCollection } from '../services/firebaseConfig.ts';
import { Input, Button, Toast, ConfirmationModal } from './UIComponents.tsx';
import { theme } from '../theme.ts';
import { exportToExcel } from '../services/excelExport.ts';

export const SettingsView = ({ onBack, inventory, contacts, settings, initialTab, user }: any) => {
    const [tab, setTab] = useState(initialTab || 'db');
    const [importing, setImporting] = useState(false);
    const [toast, setToast] = useState<{msg: string, type: 'success' | 'error'} | null>(null);
    const [tickets, setTickets] = useState<any[]>([]);
    
    // Estado para cargas de precios oficiales
    const [loadingSection, setLoadingSection] = useState<string | null>(null);
    const [showTollCategories, setShowTollCategories] = useState(false);

    // Estado Exportación
    const [exportRange, setExportRange] = useState({ start: '', end: '' });

    // Cargar tickets para exportación si es necesario
    React.useEffect(() => {
        if(tab === 'db') {
            // Suscribirse temporalmente para tener datos frescos para el reporte
            const unsub = subscribeToCollection('tickets', (data) => setTickets(data));
            return () => unsub();
        }
    }, [tab]);

    // Calcular fechas por defecto (16 mes anterior al 15 mes actual)
    React.useEffect(() => {
        const today = new Date();
        let startMonth = today.getMonth() - 1;
        let startYear = today.getFullYear();
        if (startMonth < 0) { startMonth = 11; startYear--; }
        
        const start = new Date(startYear, startMonth, 16).toISOString().split('T')[0];
        const end = new Date(today.getFullYear(), today.getMonth(), 15).toISOString().split('T')[0];
        
        setExportRange({ start, end });
    }, []);

    // Estado para manejar modales de confirmación
    const [confirmAction, setConfirmAction] = useState<{
        type: 'delete_one' | 'delete_all',
        collection: string,
        id?: string,
        message: string
    } | null>(null);

    // Valores por defecto definidos por el usuario
    const defaultPricing = {
        // Combustibles
        fuel_super95: '77.79',
        fuel_premium97: '80.30',
        fuel_gasoil50s: '49.77',
        fuel_gasoil10s: '56.77',
        // Carga AC
        ev_ac_base: '54.8',
        ev_ac_energy: '10.4',
        ev_ac_idle: '9.6',
        // Carga DC
        ev_dc_base: '132.9',
        ev_dc_energy: '11.8',
        ev_dc_idle: '12.3',
        // Peajes (Cat 1 por defecto en inputs)
        toll_telepeaje: '162.00',
        toll_basic: '190.20',
        toll_sucive: '207.00',
        // Reintegro KM
        km_company_fuel: '8.72',
        km_company_ev: '1.03',
        km_personal: '14.24',
        km_other: '0.00'
    };

    const [localSettings, setLocalSettings] = useState({ ...defaultPricing, ...settings });
    
    // Referencia de datos de peajes para visualización
    const [tollTableData, setTollTableData] = useState([
        { cat: 1, desc: 'Autos / Camionetas', telepeaje: 142.50, efectivo: 185.00 },
        { cat: 2, desc: 'Omnibus Expr. / Micro', telepeaje: 142.50, efectivo: 185.00 },
        { cat: 3, desc: 'Vehículos 2 ejes', telepeaje: 205.00, efectivo: 265.00 },
        { cat: 4, desc: 'Vehículos 3 ejes', telepeaje: 285.00, efectivo: 370.00 },
        { cat: 5, desc: 'Vehículos 4 ejes', telepeaje: 490.00, efectivo: 635.00 },
        { cat: 6, desc: 'Carga 3 ejes', telepeaje: 490.00, efectivo: 635.00 },
        { cat: 7, desc: 'Carga 4+ ejes', telepeaje: 965.00, efectivo: 1250.00 },
    ]);

    const fileInputInv = useRef<HTMLInputElement>(null);
    const fileInputCont = useRef<HTMLInputElement>(null);

    // --- MANEJO DE ACTUALIZACIONES MANUALES CON TIMESTAMP ---
    const updateSection = (section: 'fuel'|'ute'|'mtop', key: string, value: string) => {
        setLocalSettings((prev: any) => ({
            ...prev,
            [key]: value,
            [`${section}_updated`]: new Date().toISOString(),
            [`${section}_source`]: 'manual'
        }));
    };

    const handleSaveSettings = async () => {
        await setData('settings', 'config', localSettings);
        setToast({ msg: 'Configuración guardada correctamente.', type: 'success' });
    };

    const handleExport = () => {
        try {
            // Pasamos user.displayName y localSettings a la función de exportación
            exportToExcel(tickets, localSettings, exportRange.start, exportRange.end, user?.displayName || 'Técnico');
            setToast({ msg: 'Reporte generado correctamente.', type: 'success' });
        } catch (e: any) {
            console.error(e);
            setToast({ msg: 'Error generando reporte: ' + e.message, type: 'error' });
        }
    };

    // --- UTILIDADES DE SCRAPING ---
    const fetchHtmlContent = async (url: string) => {
        if (!navigator.onLine) {
            throw new Error("Sin conexión a internet. No se pueden obtener precios actualizados.");
        }

        // Lista de proxies para intentar
        const proxies = [
            {
                url: (u: string) => `https://api.allorigins.win/get?url=${encodeURIComponent(u)}&disableCache=true`,
                transform: async (res: Response) => (await res.json()).contents
            },
            {
                url: (u: string) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(u)}`,
                transform: async (res: Response) => await res.text()
            }
        ];

        for (const proxy of proxies) {
            try {
                const proxyUrl = proxy.url(url);
                const response = await fetch(proxyUrl);
                if (response.ok) {
                    return await proxy.transform(response);
                }
            } catch (e) {
                console.warn(`Proxy failed:`, e);
                // Continua al siguiente proxy
            }
        }
        
        throw new Error("No se pudo conectar a los sitios oficiales (Proxies inalcanzables). Verifique su conexión o intente más tarde.");
    };

    const parsePrice = (text: string, regex: RegExp): string | null => {
        const match = text.match(regex);
        if (match && match[1]) {
            // Normalizar formato: eliminar puntos de mil, reemplazar coma decimal por punto
            let price = match[1].replace(/\./g, '').replace(',', '.');
            return parseFloat(price).toFixed(2);
        }
        return null;
    };

    // --- FUNCIONES DE ACTUALIZACIÓN OFICIAL (EN VIVO) ---

    const fetchAncapData = async () => {
        setLoadingSection('fuel');
        try {
            // Intentamos obtener datos de ANCAP (URL pública de precios)
            const html = await fetchHtmlContent('https://www.ancap.com.uy/');
            
            const super95 = parsePrice(html, /Súper 95.*?\$?\s*(\d{2,3}[,.]\d{2})/i);
            const premium97 = parsePrice(html, /Premium 97.*?\$?\s*(\d{2,3}[,.]\d{2})/i);
            const gasoil50 = parsePrice(html, /Gasoil 50S.*?\$?\s*(\d{2,3}[,.]\d{2})/i);
            const gasoil10 = parsePrice(html, /Gasoil 10S.*?\$?\s*(\d{2,3}[,.]\d{2})/i);

            if (super95 || gasoil50) {
                setLocalSettings((prev: any) => ({
                    ...prev,
                    fuel_super95: super95 || prev.fuel_super95,
                    fuel_premium97: premium97 || prev.fuel_premium97,
                    fuel_gasoil50s: gasoil50 || prev.fuel_gasoil50s,
                    fuel_gasoil10s: gasoil10 || prev.fuel_gasoil10s,
                    fuel_updated: new Date().toISOString(),
                    fuel_source: 'auto'
                }));
                setToast({ msg: 'Precios obtenidos de ANCAP exitosamente.', type: 'success' });
            } else {
                throw new Error("No se encontraron los precios en el sitio de ANCAP.");
            }
        } catch (e: any) {
            setToast({ msg: e.message, type: 'error' });
        } finally {
            setLoadingSection(null);
        }
    };

    const fetchUteData = async () => {
        setLoadingSection('ute');
        try {
            const html = await fetchHtmlContent('https://movilidad.ute.com.uy/');
            
            const acEnergy = parsePrice(html, /Alterna.*?Energía.*?\$?\s*(\d{1,3}[,.]\d{2})/i);
            const dcEnergy = parsePrice(html, /Continua.*?Energía.*?\$?\s*(\d{1,3}[,.]\d{2})/i);

            if (acEnergy || dcEnergy) {
                setLocalSettings((prev: any) => ({
                    ...prev,
                    ev_ac_energy: acEnergy || prev.ev_ac_energy,
                    ev_dc_energy: dcEnergy || prev.ev_dc_energy,
                    ute_updated: new Date().toISOString(),
                    ute_source: 'auto'
                }));
                setToast({ msg: 'Tarifas parciales obtenidas de UTE Movilidad.', type: 'success' });
            } else {
                 throw new Error("No se pudo leer la estructura de precios de UTE.");
            }
        } catch (e: any) {
            console.warn(e);
            setToast({ msg: "No se pudieron obtener precios automáticos de UTE. Ingrese manualmente.", type: 'error' });
        } finally {
            setLoadingSection(null);
        }
    };

    const fetchMtopData = async () => {
        setLoadingSection('mtop');
        try {
            const html = await fetchHtmlContent('https://www.gub.uy/ministerio-transporte-obras-publicas/politicas-y-gestion/tarifas-peajes');
            
            const telepeajeMatch = parsePrice(html, /Autos.*?camionetas.*?Telepeaje.*?\$?\s*(\d{3,4}[,.]\d{2}|\d{3,4})/i);
            const efectivoMatch = parsePrice(html, /Autos.*?camionetas.*?Sucive.*?\$?\s*(\d{3,4}[,.]\d{2}|\d{3,4})/i);

            if (telepeajeMatch) {
                const telVal = parseFloat(telepeajeMatch);
                const efVal = efectivoMatch ? parseFloat(efectivoMatch) : telVal * 1.3;

                setLocalSettings((prev: any) => ({
                    ...prev,
                    toll_telepeaje: telVal.toFixed(2),
                    toll_basic: efVal.toFixed(2),
                    toll_sucive: efVal.toFixed(2),
                    mtop_updated: new Date().toISOString(),
                    mtop_source: 'auto'
                }));

                setTollTableData([
                    { cat: 1, desc: 'Autos / Camionetas', telepeaje: telVal, efectivo: efVal },
                    { cat: 2, desc: 'Omnibus Expr. / Micro', telepeaje: telVal, efectivo: efVal },
                    { cat: 3, desc: 'Vehículos 2 ejes', telepeaje: telVal * 1.45, efectivo: efVal * 1.45 },
                    { cat: 4, desc: 'Vehículos 3 ejes', telepeaje: telVal * 2, efectivo: efVal * 2 },
                    { cat: 5, desc: 'Vehículos 4 ejes', telepeaje: telVal * 3.45, efectivo: efVal * 3.45 },
                    { cat: 6, desc: 'Carga 3 ejes', telepeaje: telVal * 3.45, efectivo: efVal * 3.45 },
                    { cat: 7, desc: 'Carga 4+ ejes', telepeaje: telVal * 6.8, efectivo: efVal * 6.8 },
                ].map(r => ({
                    ...r, 
                    telepeaje: Number(r.telepeaje.toFixed(2)), 
                    efectivo: Number(r.efectivo.toFixed(2))
                })));

                setToast({ msg: 'Tarifas base obtenidas de MTOP/GUB.UY.', type: 'success' });
            } else {
                throw new Error("Estructura de web MTOP no reconocida.");
            }
        } catch (e: any) {
            setToast({ msg: "Error obteniendo datos MTOP: " + e.message, type: 'error' });
        } finally {
            setLoadingSection(null);
        }
    };

    // --- FIN FUNCIONES ---

    const handleFile = (e: any, type: string) => {
        const file = e.target.files[0];
        if (!file) return;
        
        setImporting(true);
        const reader = new FileReader();
        reader.onload = async (evt) => {
            try {
                let text = evt.target?.result as string;
                if (text.charCodeAt(0) === 0xFEFF) {
                    text = text.substr(1);
                }

                const lines = text.split(/\r?\n/).filter(l => l.trim());
                const dataToAdd: any[] = [];
                let separator = ',';
                if (lines.length > 0 && lines[0].includes(';')) separator = ';';
                
                const parseLine = (line: string) => {
                    const regex = new RegExp(`(?:${separator}|\\r?\\n|^)(?:"([^"]*)"|([^"${separator}]*))`, 'g');
                    const matches: string[] = [];
                    let match;
                    while ((match = regex.exec(line))) {
                        let val = match[1] ? match[1] : match[2];
                        if (val) val = val.trim().replace(/^"|"$/g, '');
                        if (val !== undefined) matches.push(val);
                    }
                    return matches;
                };

                if (type === 'contacts') {
                    for(const line of lines) {
                        const p = parseLine(line);
                        if(p[0] || p[1]) {
                            dataToAdd.push({ 
                                company: p[0] || 'Sin Empresa', 
                                name: p[1]||'', 
                                phone: p[2]||'', 
                                type: p[3]||'Corporativo' 
                            });
                        }
                    }
                } else if (type === 'inventory') {
                    for(const line of lines) {
                        const p = parseLine(line);
                        if(p[0]) {
                            dataToAdd.push({ 
                                client: p[0], 
                                equipment: p[1]||'', 
                                serial: p[2]||'', 
                                ref: p[3]||'', 
                                password: p[4]||'' 
                            });
                        }
                    }
                }
                
                if (dataToAdd.length > 0) {
                    await importDataBatch(type, dataToAdd);
                    setToast({ msg: `Importados ${dataToAdd.length} registros exitosamente.`, type: 'success' });
                } else {
                    setToast({ msg: "El archivo parece estar vacío o tiene un formato incorrecto.", type: 'error' });
                }
            } catch (e: any) { 
                console.error(e);
                setToast({ msg: "Error al importar: " + e.message, type: 'error' });
            } finally {
                setImporting(false);
                if (e.target) e.target.value = ''; 
            }
        };
        reader.readAsText(file, 'ISO-8859-1');
    };
    
    // Inicia el flujo de borrado masivo
    const handleClear = (type: string) => {
        setConfirmAction({
            type: 'delete_all',
            collection: type,
            message: `⚠️ ¿PELIGRO: Estás seguro de BORRAR TODO el contenido de ${type === 'inventory' ? 'Inventario' : 'Contactos'}?\n\nEsta acción NO se puede deshacer.`
        });
    };

    // Inicia el flujo de borrado individual
    const handleDeleteRow = (collection: string, id: string) => {
        setConfirmAction({
            type: 'delete_one',
            collection,
            id,
            message: "¿Eliminar este registro permanentemente?"
        });
    };

    // Ejecuta la acción confirmada
    const executeConfirmAction = async () => {
        if (!confirmAction) return;

        if (confirmAction.type === 'delete_all') {
            setImporting(true);
            try {
                await clearCollectionData(confirmAction.collection);
                setToast({ msg: "Base de datos limpiada correctamente.", type: 'success' });
            } catch (e: any) {
                setToast({ msg: "Error: " + e.message, type: 'error' });
            } finally {
                setImporting(false);
            }
        } else if (confirmAction.type === 'delete_one' && confirmAction.id) {
            try {
                await deleteData(confirmAction.collection, confirmAction.id);
                setToast({ msg: "Registro eliminado.", type: 'success' });
            } catch (e: any) {
                setToast({ msg: "Error al eliminar.", type: 'error' });
            }
        }
        setConfirmAction(null);
    };

    const tabs = [
        { id: 'db', label: 'General' },
        { id: 'contacts', label: 'Contactos' },
        { id: 'inventory', label: 'Inventario' },
        { id: 'user', label: 'Cuenta' }
    ];

    const SectionHeader = ({ icon: Icon, title, date, onUpdate, loadingKey }: any) => (
        <div className="flex justify-between items-center mb-3 border-b border-gray-100 pb-2">
            <h4 className="font-bold text-gray-700 flex items-center gap-2 text-sm uppercase tracking-wide">
                <Icon className="w-4 h-4 text-blue-600"/> {title}
            </h4>
            {onUpdate && (
                <button 
                    onClick={onUpdate}
                    disabled={!!loadingSection}
                    className="flex items-center gap-1 text-[10px] bg-blue-50 text-blue-700 px-2 py-1 rounded hover:bg-blue-100 transition disabled:opacity-50 border border-blue-200"
                    title="Obtener precios online (Web Oficial)"
                >
                    {loadingSection === loadingKey ? <Loader className="w-3 h-3 animate-spin"/> : <Globe className="w-3 h-3"/>}
                    {loadingSection === loadingKey ? 'Conectando...' : 'Obtener Online'}
                </button>
            )}
        </div>
    );
    
    const SectionFooter = ({ updated, source, sourceLabel }: any) => {
        const formatDate = (iso: string) => {
            if(!iso) return '';
            const d = new Date(iso);
            const pad = (n: number) => String(n).padStart(2,'0');
            return `${d.getFullYear()}/${pad(d.getMonth()+1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
        };

        if (!updated) return <p className="text-[9px] text-gray-400 mt-2 text-right">{sourceLabel}</p>;
        
        const label = source === 'auto' ? 'Actualizado' : 'Editado';
        return (
            <div className="flex justify-between items-end mt-2">
                <p className="text-[10px] text-gray-500 font-medium">{label} {formatDate(updated)}</p>
                <p className="text-[9px] text-gray-400">{sourceLabel}</p>
            </div>
        );
    };

    const LoadingOverlay = () => (
        <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center rounded-xl">
            <Loader className="w-10 h-10 text-blue-600 animate-spin mb-2" />
            <p className="text-blue-800 font-bold text-sm animate-pulse">Procesando datos...</p>
        </div>
    );

    return (
        <div className={`pb-24 ${theme.animation.fade} relative min-h-[500px]`}>
            {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
            
            <div className="bg-white p-4 rounded-xl shadow-sm mb-4 flex items-center gap-3">
                <button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-gray-100"><ArrowLeft className="text-gray-500"/></button>
                <h2 className="font-bold text-lg text-gray-900">Configuración</h2>
            </div>
            
            <div className="flex bg-gray-200 p-1 rounded-xl mb-4 overflow-x-auto">
                {tabs.map((t) => (
                    <button 
                        key={t.id}
                        type="button"
                        onClick={()=>setTab(t.id)} 
                        className={`flex-1 py-2 text-xs font-bold rounded-lg capitalize transition whitespace-nowrap px-2 ${tab===t.id ? 'bg-white shadow text-blue-800' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        {t.label}
                    </button>
                ))}
            </div>
            
            {tab === 'db' && (
                <div className="space-y-4 fade-in">
                    
                    {/* Sección Exportación Reporte */}
                    <div className="bg-green-50 p-4 rounded-xl shadow-sm border border-green-100">
                        <SectionHeader icon={FileSpreadsheet} title="Reporte Mensual (FO-8.5.5-03)" />
                        <div className="text-xs text-gray-600 mb-3">
                            Selecciona el rango de fechas para generar el Excel de gastos y horas.
                        </div>
                        <div className="flex gap-2 mb-3">
                            <Input label="Desde" type="date" val={exportRange.start} set={(v:any)=>setExportRange({...exportRange, start: v})} className="!mb-0 flex-1" />
                            <Input label="Hasta" type="date" val={exportRange.end} set={(v:any)=>setExportRange({...exportRange, end: v})} className="!mb-0 flex-1" />
                        </div>
                        <Button onClick={handleExport} variant="success" className="w-full font-bold">
                            <Download className="w-4 h-4" /> DESCARGAR EXCEL
                        </Button>
                    </div>

                    {/* Combustibles */}
                    <div className="bg-white p-4 rounded-xl shadow-sm relative">
                        <SectionHeader icon={Fuel} title="Combustibles" onUpdate={fetchAncapData} loadingKey="fuel" />
                        <div className="grid grid-cols-2 gap-4">
                            <Input label="Nafta Súper 95" type="number" val={localSettings.fuel_super95} set={(v:any) => updateSection('fuel', 'fuel_super95', v)} />
                            <Input label="Nafta Premium 97" type="number" val={localSettings.fuel_premium97} set={(v:any) => updateSection('fuel', 'fuel_premium97', v)} />
                            <Input label="Gasoil 50-S" type="number" val={localSettings.fuel_gasoil50s} set={(v:any) => updateSection('fuel', 'fuel_gasoil50s', v)} />
                            <Input label="Gasoil 10-S" type="number" val={localSettings.fuel_gasoil10s} set={(v:any) => updateSection('fuel', 'fuel_gasoil10s', v)} />
                        </div>
                        <SectionFooter updated={localSettings.fuel_updated} source={localSettings.fuel_source} sourceLabel="Fuente: ancap.com.uy" />
                    </div>

                    {/* Carga Eléctrica */}
                    <div className="bg-white p-4 rounded-xl shadow-sm relative">
                        <SectionHeader icon={Zap} title="Carga Alterna (AC)" onUpdate={fetchUteData} loadingKey="ute" />
                        <div className="grid grid-cols-3 gap-2 mb-4">
                            <Input label="Base ($/carga)" type="number" val={localSettings.ev_ac_base} set={(v:any) => updateSection('ute', 'ev_ac_base', v)} />
                            <Input label="Energía ($/kWh)" type="number" val={localSettings.ev_ac_energy} set={(v:any) => updateSection('ute', 'ev_ac_energy', v)} />
                            <Input label="Multa ($/min)" type="number" val={localSettings.ev_ac_idle} set={(v:any) => updateSection('ute', 'ev_ac_idle', v)} />
                        </div>
                        
                        <div className="flex justify-between items-center mb-2 border-b border-gray-100 pb-1">
                            <h4 className="font-bold text-gray-700 flex items-center gap-2 text-sm uppercase tracking-wide"><Zap className="w-4 h-4 text-orange-500"/> Carga Continua (DC)</h4>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                            <Input label="Base ($/carga)" type="number" val={localSettings.ev_dc_base} set={(v:any) => updateSection('ute', 'ev_dc_base', v)} />
                            <Input label="Energía ($/kWh)" type="number" val={localSettings.ev_dc_energy} set={(v:any) => updateSection('ute', 'ev_dc_energy', v)} />
                            <Input label="Multa ($/min)" type="number" val={localSettings.ev_dc_idle} set={(v:any) => updateSection('ute', 'ev_dc_idle', v)} />
                        </div>
                        <div className="flex justify-between items-center mt-2">
                            <p className="text-[10px] text-gray-400 italic">* 20 minutos de tolerancia en multa.</p>
                        </div>
                        <SectionFooter updated={localSettings.ute_updated} source={localSettings.ute_source} sourceLabel="Fuente: movilidad.ute.com.uy" />
                    </div>

                    {/* Peajes */}
                    <div className="bg-white p-4 rounded-xl shadow-sm relative">
                        <SectionHeader icon={Map} title="Peajes (Cat. 1)" onUpdate={fetchMtopData} loadingKey="mtop" />
                        <div className="grid grid-cols-3 gap-2 mb-4">
                            <Input label="Telepeaje" type="number" val={localSettings.toll_telepeaje} set={(v:any) => updateSection('mtop', 'toll_telepeaje', v)} />
                            <Input label="Tarifa BÁSICA" type="number" val={localSettings.toll_basic} set={(v:any) => updateSection('mtop', 'toll_basic', v)} />
                            <Input label="SUCIVE" type="number" val={localSettings.toll_sucive} set={(v:any) => updateSection('mtop', 'toll_sucive', v)} />
                        </div>
                        
                        {/* Dropdown Categorías 1-7 */}
                        <div className="border border-gray-100 rounded-lg overflow-hidden">
                            <button 
                                onClick={() => setShowTollCategories(!showTollCategories)}
                                className="w-full bg-gray-50 p-2 flex justify-between items-center text-xs font-bold text-gray-600 hover:bg-gray-100 transition"
                            >
                                <span className="flex items-center gap-2"><Eye className="w-3 h-3"/> Ver Categorías 1 a 7</span>
                                {showTollCategories ? <ChevronUp className="w-4 h-4"/> : <ChevronDown className="w-4 h-4"/>}
                            </button>
                            
                            {showTollCategories && (
                                <div className="p-2 bg-white overflow-x-auto">
                                    <table className="w-full text-[10px] text-left">
                                        <thead>
                                            <tr className="border-b border-gray-100 text-gray-400">
                                                <th className="py-1">Cat</th>
                                                <th className="py-1">Descripción</th>
                                                <th className="py-1 text-right">Telepeaje</th>
                                                <th className="py-1 text-right">Efectivo</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {tollTableData.map((row) => (
                                                <tr key={row.cat} className="border-b border-gray-50 last:border-0 hover:bg-blue-50">
                                                    <td className="py-1 font-bold text-blue-600">{row.cat}</td>
                                                    <td className="py-1 text-gray-600 truncate max-w-[120px]">{row.desc}</td>
                                                    <td className="py-1 text-right font-mono">${row.telepeaje.toFixed(2)}</td>
                                                    <td className="py-1 text-right font-mono">${row.efectivo.toFixed(2)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                        <SectionFooter updated={localSettings.mtop_updated} source={localSettings.mtop_source} sourceLabel="Fuente: gub.uy/mtop" />
                    </div>

                    {/* Reintegro KM */}
                    <div className="bg-white p-4 rounded-xl shadow-sm">
                        <SectionHeader icon={Route} title="Reintegro por KM" />
                        <div className="grid grid-cols-2 gap-4">
                            <Input label="Empresa Combustible" type="number" val={localSettings.km_company_fuel} set={(v:any) => setLocalSettings({...localSettings, km_company_fuel: v})} />
                            <Input label="Empresa Eléctrico" type="number" val={localSettings.km_company_ev} set={(v:any) => setLocalSettings({...localSettings, km_company_ev: v})} />
                            <Input label="Personal" type="number" val={localSettings.km_personal} set={(v:any) => setLocalSettings({...localSettings, km_personal: v})} />
                            <Input label="Otro" type="number" val={localSettings.km_other} set={(v:any) => setLocalSettings({...localSettings, km_other: v})} />
                        </div>
                    </div>

                    <Button variant="warning" onClick={handleSaveSettings} className="w-full mt-4">
                        Guardar Valores Globales
                    </Button>
                </div>
            )}

            {tab === 'inventory' && (
                <div className="bg-white p-4 rounded-xl shadow-sm fade-in relative min-h-[300px]">
                    {importing && <LoadingOverlay />}
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-bold text-blue-800">Inventario ({inventory.length})</h3>
                        {inventory.length > 0 && (
                            <button onClick={()=>handleClear('inventory')} className="text-red-500 hover:bg-red-50 p-2 rounded-full transition" title="Borrar TODO">
                                <Trash className="w-5 h-5" />
                            </button>
                        )}
                    </div>
                    
                    <button onClick={()=>fileInputInv.current?.click()} className="w-full border-2 border-dashed border-blue-200 p-6 rounded-xl text-blue-600 font-bold flex flex-col items-center gap-2 mb-4 hover:bg-blue-50 transition active:scale-[0.98]">
                        <Upload className="w-8 h-8"/> Cargar CSV
                        <span className="text-xs font-normal text-gray-400">Cliente, Equipo, Serie, Ref, Password</span>
                    </button>
                    <input type="file" ref={fileInputInv} className="hidden" accept=".csv,.txt" onChange={(e) => handleFile(e, 'inventory')} />
                    
                    <div className="max-h-[500px] overflow-y-auto bg-gray-50 p-2 rounded-xl text-xs text-gray-600 border border-gray-100 custom-scrollbar">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-gray-200 text-gray-400">
                                    <th className="pb-2 pl-2 font-medium">Cliente</th>
                                    <th className="pb-2 font-medium">Equipo</th>
                                    <th className="pb-2 w-8"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {inventory.map((i:any)=>(
                                    <tr key={i.id} className="border-b border-gray-100 last:border-0 hover:bg-white transition group">
                                        <td className="py-2 pl-2 font-bold text-gray-800">{i.client}</td>
                                        <td className="py-2 text-gray-500">
                                            {i.equipment}
                                            {i.ref && <span className="ml-1 text-[10px] bg-blue-100 text-blue-800 px-1 rounded">{i.ref}</span>}
                                        </td>
                                        <td className="py-2 text-right">
                                            <button 
                                                onClick={()=>handleDeleteRow('inventory', i.id)} 
                                                className="text-gray-400 hover:text-red-500 p-2 rounded-full hover:bg-red-50 transition"
                                            >
                                                <Trash className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {inventory.length === 0 && (
                                    <tr><td colSpan={3} className="text-center py-8 text-gray-400">Sin datos</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {tab === 'contacts' && (
                <div className="bg-white p-4 rounded-xl shadow-sm fade-in relative min-h-[300px]">
                    {importing && <LoadingOverlay />}
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-bold text-blue-800">Contactos ({contacts.length})</h3>
                        {contacts.length > 0 && (
                            <button onClick={()=>handleClear('contacts')} className="text-red-500 hover:bg-red-50 p-2 rounded-full transition" title="Borrar TODO">
                                <Trash className="w-5 h-5" />
                            </button>
                        )}
                    </div>
                    
                    <button onClick={()=>fileInputCont.current?.click()} className="w-full border-2 border-dashed border-blue-200 p-6 rounded-xl text-blue-600 font-bold flex flex-col items-center gap-2 mb-4 hover:bg-blue-50 transition active:scale-[0.98]">
                        <Upload className="w-8 h-8"/> Cargar CSV
                        <span className="text-xs font-normal text-gray-400">Empresa, Nombre, Teléfono, Tipo</span>
                    </button>
                    <input type="file" ref={fileInputCont} className="hidden" accept=".csv,.txt" onChange={(e) => handleFile(e, 'contacts')} />
                    
                    <div className="max-h-[500px] overflow-y-auto bg-gray-50 p-2 rounded-xl text-xs text-gray-600 border border-gray-100 custom-scrollbar">
                        {contacts.map((c:any)=>(
                            <div key={c.id} className="border-b border-gray-200 last:border-0 py-2 px-2 flex justify-between items-center group hover:bg-white transition rounded">
                                <div>
                                    <span className="font-bold text-gray-800 block">{c.company}</span>
                                    <span className="text-gray-500">{c.name} ({c.phone})</span>
                                </div>
                                <button 
                                    onClick={()=>handleDeleteRow('contacts', c.id)} 
                                    className="text-gray-400 hover:text-red-500 p-2 rounded-full hover:bg-red-50 transition"
                                >
                                    <Trash className="w-4 h-4" />
                                </button>
                            </div>
                        ))}
                        {contacts.length === 0 && <div className="text-center py-8 text-gray-400">Sin contactos</div>}
                    </div>
                </div>
            )}

            {tab === 'user' && (
                <div className="bg-white p-8 rounded-xl shadow-sm text-center fade-in">
                    <div className="w-24 h-24 rounded-full mx-auto mb-4 bg-blue-100 flex items-center justify-center border-4 border-white shadow-xl overflow-hidden">
                        {user?.photoURL ? <img src={user.photoURL} alt="Avatar" className="w-full h-full object-cover" /> : <UserIcon className="w-10 h-10 text-blue-600" />}
                    </div>
                    <h3 className="font-bold text-xl text-gray-800">{user?.displayName || 'Usuario'}</h3>
                    <p className="text-sm text-gray-500 mb-8">{user?.email}</p>
                    
                    <div className="bg-blue-50 rounded-xl p-4 mb-6 text-left">
                        <h4 className="font-bold text-blue-900 text-xs uppercase mb-2">Estado del Sistema</h4>
                        <div className="flex justify-between text-sm text-blue-800 border-b border-blue-100 pb-2 mb-2">
                            <span>Versión</span>
                            <span className="font-bold">1.4.0 (PWA Field Tech)</span>
                        </div>
                         <div className="flex justify-between text-sm text-blue-800">
                            <span>Modo</span>
                            <span className="font-bold">Local Offline</span>
                        </div>
                    </div>
                </div>
            )}

            {confirmAction && (
                <ConfirmationModal 
                    message={confirmAction.message}
                    onYes={executeConfirmAction}
                    onNo={() => setConfirmAction(null)}
                />
            )}
        </div>
    );
};
