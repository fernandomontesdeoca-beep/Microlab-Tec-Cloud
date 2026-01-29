
export type TicketStatus = 'Pendiente' | 'Urgente' | 'Asignado' | 'Terminado';
export type TicketType = 'telefono' | 'visita';

export interface LogEntry {
  id: number;
  type: 'move' | 'task' | 'expense' | 'note';
  date: string;
  time: string;
  description: string;
  action?: string;
  odo?: string;
  amount?: string;
  concept?: string;
  note?: string;
  parts?: string;
  currency?: string;
  currencyOther?: string;
  paymentMethod?: string;
  paymentSource?: string;
  expenseType?: string;
}

export interface PhoneLogEntry {
  id: number;
  date: string;
  start: string;
  end: string;
  note: string;
}

export interface Ticket {
  id: string; // Firebase uses string IDs
  fechaAviso: string;
  horaAviso: string;
  empresa: string;
  nombre: string;
  telefono: string;
  equipo: string;
  problema: string;
  status: TicketStatus;
  contactType: string;
  type?: TicketType;
  ost?: string;
  category?: string;
  serial?: string;
  passwordInfo?: string;
  creationDuration?: number;
  phoneLog?: PhoneLogEntry[];
  logbook?: LogEntry[];
}

export interface InventoryItem {
  id: string;
  client: string;
  equipment: string;
  serial: string;
  ref: string;
  password?: string;
}

export interface Contact {
  id: string;
  company: string;
  name: string;
  phone: string;
  type: string;
}

export interface AppSettings {
  id: string; // Usually 'config'
  // Combustibles
  fuel_super95?: string;
  fuel_premium97?: string;
  fuel_gasoil50s?: string;
  fuel_gasoil10s?: string;
  fuel_updated?: string;
  fuel_source?: 'auto' | 'manual';
  
  // Carga AC
  ev_ac_base?: string;
  ev_ac_energy?: string;
  ev_ac_idle?: string;
  // Carga DC
  ev_dc_base?: string;
  ev_dc_energy?: string;
  ev_dc_idle?: string;
  ute_updated?: string;
  ute_source?: 'auto' | 'manual';

  // Peajes
  toll_telepeaje?: string;
  toll_basic?: string;
  toll_sucive?: string;
  mtop_updated?: string;
  mtop_source?: 'auto' | 'manual';

  // Reintegro KM
  km_company_fuel?: string;
  km_company_ev?: string;
  km_personal?: string;
  km_other?: string;
  
  // Legacy support
  tollPrice?: string;
  kmPrice?: string;
}
