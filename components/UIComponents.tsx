
import React, { useState, useEffect } from 'react';
import { Clock, X, Search, ChevronRight, Check, AlertTriangle } from 'lucide-react';
import { theme, inputStyles, buttonStyles } from '../theme.ts';

// --- ELEMENTOS BÁSICOS ---

export const Button = ({ children, variant = 'primary', onClick, className = '', disabled = false, title }: any) => {
    // @ts-ignore
    const style = buttonStyles[variant] || buttonStyles.primary;
    return (
        <button onClick={onClick} className={`${style} ${className}`} disabled={disabled} title={title}>
            {children}
        </button>
    );
};

export const Modal = ({ children, title, onClose, footer }: any) => (
    <div className={`fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 ${theme.colors.bg.modalOverlay} ${theme.animation.fade}`}>
        <div className={`bg-white w-full max-w-lg sm:rounded-2xl rounded-t-2xl shadow-2xl flex flex-col max-h-[90vh] ${theme.animation.slide}`}>
            <div className="flex justify-between items-center p-4 border-b border-gray-100">
                <h3 className={`font-bold text-lg ${theme.colors.text.main}`}>{title}</h3>
                <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full text-gray-500">
                    <X className="w-5 h-5" />
                </button>
            </div>
            <div className="p-4 overflow-y-auto flex-1 custom-scrollbar">
                {children}
            </div>
            {footer && (
                <div className="p-4 border-t border-gray-100 bg-gray-50 sm:rounded-b-2xl">
                    {footer}
                </div>
            )}
        </div>
    </div>
);

export const Toast = ({ message, type = 'success', onClose }: any) => {
    useEffect(() => { const t = setTimeout(onClose, 4000); return () => clearTimeout(t); }, []);
    const bg = type === 'success' ? 'bg-green-600' : 'bg-red-600';
    // Cambiado de 'fixed' a 'absolute' para que se mantenga dentro del contenedor de la app móvil
    // Agregado z-50 para que esté por encima de otros elementos
    return (
        <div className={`absolute top-4 left-4 right-4 z-[100] text-white px-4 py-3 rounded-xl shadow-2xl flex items-center justify-between ${theme.animation.slide} ${bg}`}>
            <div className="flex items-center gap-3 overflow-hidden">
                {type === 'success' ? <Check className="w-5 h-5 flex-shrink-0"/> : <AlertTriangle className="w-5 h-5 flex-shrink-0"/>}
                <span className="font-bold text-sm truncate">{message}</span>
            </div>
            <button onClick={onClose} className="ml-2 opacity-70 hover:opacity-100 p-1 bg-black/10 rounded-full"><X className="w-4 h-4"/></button>
        </div>
    );
};

// --- INPUTS & FORMULARIOS ---

export const Input = ({ label, type="text", val, set, placeholder, readOnly, className }: any) => (
    <div className={`${inputStyles.wrapper} ${className || ''}`}>
        {label && <label className={inputStyles.label}>{label}</label>}
        <input 
            type={type}
            step={type === 'number' ? "0.01" : undefined}
            className={inputStyles.field}
            value={val || ''} 
            onChange={e=>set(e.target.value)} 
            placeholder={placeholder} 
            readOnly={readOnly}
        />
    </div>
);

export const TextArea = ({ label, val, set, placeholder, rows=3 }: any) => (
    <div className={inputStyles.wrapper}>
        {label && <label className={inputStyles.label}>{label}</label>}
        <textarea
            className={`w-full border border-gray-200 p-3 text-sm ${theme.colors.text.main} focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 ${theme.shapes.input} bg-gray-50 focus:bg-white resize-y`}
            value={val || ''}
            onChange={e=>set(e.target.value)}
            placeholder={placeholder}
            rows={rows}
        />
    </div>
);

export const InputWithNow = ({ label, val, set }: any) => (
    <div className={inputStyles.wrapper}>
        {label && <label className={inputStyles.label}>{label}</label>}
        <div className="flex items-center gap-2">
            <input 
                type="time" 
                className={inputStyles.field} 
                value={val || ''} 
                onChange={e=>set(e.target.value)} 
            />
            <button 
                onClick={()=>{const n=new Date(); set(`${String(n.getHours()).padStart(2,'0')}:${String(n.getMinutes()).padStart(2,'0')}`)}} 
                className="text-blue-600 hover:bg-blue-50 p-2 rounded-full transition"
                title="Usar hora actual"
            >
                <Clock className="w-4 h-4"/>
            </button>
        </div>
    </div>
);

// --- COMPONENTES AVANZADOS ---

/**
 * Reemplazo de <datalist> y <select>.
 * Permite seleccionar de una lista O escribir un valor personalizado si `allowCustom` es true.
 */
export const SmartSelect = ({ label, val, set, options = [], placeholder = "Seleccionar...", title = "Seleccionar Opción", allowCustom = true }: any) => {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');

    const filteredOptions = options.filter((opt: string) => 
        opt.toLowerCase().includes(search.toLowerCase())
    );

    const handleSelect = (value: string) => {
        set(value);
        setIsOpen(false);
        setSearch('');
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            // Si se permite valor personalizado y hay texto escrito, usarlo
            if (allowCustom && search.trim()) {
                handleSelect(search);
            }
        }
    };

    return (
        <div className={inputStyles.wrapper}>
            {label && <label className={inputStyles.label}>{label}</label>}
            
            <div onClick={() => setIsOpen(true)} className={inputStyles.selectTrigger}>
                <span className={val ? theme.colors.text.main : 'text-gray-400'}>
                    {val || placeholder}
                </span>
                <ChevronRight className="w-4 h-4 text-gray-400" />
            </div>

            {isOpen && (
                <Modal title={title} onClose={() => setIsOpen(false)}>
                    <div className="sticky top-0 bg-white pb-2 z-10">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input 
                                type="text" 
                                autoFocus
                                className="w-full bg-gray-100 rounded-xl py-3 pl-10 pr-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                                placeholder="Buscar o escribir nuevo..."
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                onKeyDown={handleKeyDown}
                            />
                        </div>
                    </div>

                    <div className="space-y-1 mt-2">
                        {/* Opción de usar lo que se escribió si no está en la lista y se permite custom */}
                        {allowCustom && search && !options.includes(search) && (
                            <button 
                                onClick={() => handleSelect(search)}
                                className="w-full text-left p-3 rounded-xl bg-blue-50 text-blue-700 font-bold flex items-center gap-2"
                            >
                                <Check className="w-4 h-4" /> Usar: "{search}"
                            </button>
                        )}

                        {filteredOptions.length > 0 ? (
                            filteredOptions.map((opt: string, i: number) => (
                                <button 
                                    key={i} 
                                    onClick={() => handleSelect(opt)}
                                    className={`w-full text-left p-3 rounded-xl flex items-center justify-between transition ${val === opt ? 'bg-blue-100 text-blue-800 font-bold' : 'hover:bg-gray-50 text-gray-700'}`}
                                >
                                    {opt}
                                    {val === opt && <Check className="w-4 h-4 text-blue-600" />}
                                </button>
                            ))
                        ) : (
                            !search && <div className="text-center py-8 text-gray-400 text-sm">No hay opciones disponibles</div>
                        )}
                    </div>
                </Modal>
            )}
        </div>
    );
};

export const ConfirmationModal = ({ message, onYes, onNo }: any) => (
    <Modal title="Confirmación" onClose={onNo}>
        <div className="text-center py-4">
            <p className="text-lg text-gray-700 font-medium">{message}</p>
        </div>
        <div className="flex gap-3 mt-4">
            <Button variant="secondary" onClick={onNo} className="flex-1">Cancelar</Button>
            <Button variant="primary" onClick={onYes} className="flex-1">Confirmar</Button>
        </div>
    </Modal>
);
