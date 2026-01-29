
import React from 'react';
import { Clipboard, Trash } from 'lucide-react';
import { Ticket } from '../types.ts';
import { theme } from '../theme.ts';

interface TicketListProps {
    tickets: Ticket[];
    onOpen: (id: string) => void;
    onDelete: (id: string) => void;
}

export const TicketList: React.FC<TicketListProps> = ({ tickets, onOpen, onDelete }) => {
    if (tickets.length === 0) return (
        <div className="text-center py-20 text-gray-400 flex flex-col items-center">
            <div className="bg-gray-100 p-6 rounded-full mb-4">
                <Clipboard className="w-10 h-10 opacity-30 text-gray-600"/>
            </div>
            <p className="font-bold text-gray-500">Sin registros</p>
            <p className="text-xs mt-1">Crea un nuevo servicio para comenzar</p>
        </div>
    );

    return (
        <div className="space-y-3 pb-20">
            {tickets.map((t: Ticket) => {
                let borderClass = 'border-l-4 border-yellow-400'; 
                let badgeClass = 'bg-yellow-100 text-yellow-800';
                
                if(t.status === 'Urgente') { borderClass = 'border-l-4 border-red-500'; badgeClass = 'bg-red-100 text-red-800'; }
                if(t.status === 'Terminado') { borderClass = 'border-l-4 border-green-500'; badgeClass = 'bg-green-100 text-green-800'; }
                if(t.status === 'Asignado') { borderClass = 'border-l-4 border-blue-500'; badgeClass = 'bg-blue-100 text-blue-800'; }

                return (
                    <div 
                        key={t.id} 
                        className={`group ${theme.colors.bg.card} p-4 ${theme.shapes.rounded} ${theme.shadows.card} flex justify-between items-start ${borderClass} cursor-pointer hover:shadow-md transition active:scale-[0.99]`} 
                        onClick={() => onOpen(t.id)}
                    >
                        <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap gap-2 text-xs mb-2 items-center">
                                <span className="font-bold bg-gray-100 px-2 py-0.5 rounded text-gray-600 flex items-center gap-1">
                                    {t.fechaAviso} <span className="text-gray-300">|</span> {t.horaAviso}
                                </span>
                                <span className={`px-2 py-0.5 rounded font-bold text-[10px] uppercase tracking-wide ${badgeClass}`}>
                                    {t.status || 'Pendiente'}
                                </span>
                                <span className={`px-2 py-0.5 rounded font-bold text-[10px] uppercase ${t.type === 'visita' ? 'text-orange-600 bg-orange-50 border border-orange-100' : 'text-blue-600 bg-blue-50 border border-blue-100'}`}>
                                    {t.type === 'visita' ? 'VISITA' : 'TEL.'}
                                </span>
                            </div>
                            
                            <h3 className={`font-bold ${theme.colors.text.main} text-sm flex flex-col`}>
                                <span className="text-base truncate">{t.empresa}</span>
                                <span className="text-gray-400 text-xs font-normal mt-0.5 truncate">{t.equipo}</span>
                            </h3>
                            
                            <p className="text-xs text-gray-500 mt-2 flex items-center gap-2">
                                <span className="bg-gray-50 px-1.5 py-0.5 rounded border border-gray-100 truncate max-w-[120px]">👤 {t.nombre}</span>
                                <span className="bg-gray-50 px-1.5 py-0.5 rounded border border-gray-100">📞 {t.telefono}</span>
                            </p>
                            
                            {t.problema && (
                                <div className="text-xs text-gray-600 mt-3 italic border-t pt-2 border-dashed border-gray-200 whitespace-pre-wrap line-clamp-2 hover:line-clamp-none transition-all">
                                    "{t.problema}"
                                </div>
                            )}
                        </div>
                        
                        <button 
                            onClick={(e) => {e.stopPropagation(); onDelete(t.id);}} 
                            className="p-2 -mr-2 -mt-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-full transition flex-shrink-0"
                        >
                            <Trash className="w-5 h-5"/>
                        </button>
                    </div>
                );
            })}
        </div>
    );
};
