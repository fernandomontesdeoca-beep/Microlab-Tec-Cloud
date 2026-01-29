
import * as XLSX from 'xlsx';
import { Ticket, LogEntry, AppSettings } from '../types';

const formatDate = (date: Date) => {
    const days = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
    const d = date.getDate().toString().padStart(2, '0');
    const dayName = days[date.getDay()];
    return `${dayName} - ${d}`;
};

const getDaysArray = (start: Date, end: Date) => {
    for(var arr=[],dt=new Date(start); dt<=end; dt.setDate(dt.getDate()+1)){
        arr.push(new Date(dt));
    }
    return arr;
};

export const exportToExcel = (tickets: Ticket[], settings: AppSettings, startDate: string, endDate: string, userName: string) => {
    const start = new Date(startDate); // Debe ser día 16 mes anterior
    const end = new Date(endDate);     // Debe ser día 15 mes actual
    
    // 1. Preparar la estructura de datos por día
    const days = getDaysArray(start, end);
    const dataRows: any[] = [];
    
    // Variables para totales finales
    let totalKmGira = 0;
    let totalKmZona = 0;
    let totalDineroKm = 0;
    let totalPeaje = 0;
    let totalAlmuerzo = 0;
    let totalCena = 0;
    let totalDesayuno = 0;
    let totalAlojamiento = 0;
    let totalVarios = 0;
    let totalTransporte = 0;
    let totalCombustible = 0;
    let totalGastoEfectivo = 0;
    let totalTarjeta = 0;
    let totalHorasExtra = 0;
    let totalHorasGuardia = 0;
    let totalUSD = 0;

    // Precio KM
    const kmPrice = parseFloat(settings.km_personal || settings.kmPrice || '0');

    days.forEach(day => {
        const dateStr = day.toISOString().split('T')[0];
        
        // Buscar logs de este día en todos los tickets
        const dayLogs: { log: LogEntry, ticket: Ticket }[] = [];
        
        tickets.forEach(t => {
            if(t.logbook) {
                t.logbook.forEach(l => {
                    if (l.date === dateStr) {
                        dayLogs.push({ log: l, ticket: t });
                    }
                });
            }
        });

        // Agrupar información del día
        const uniqueClients = [...new Set(dayLogs.map(i => i.ticket.empresa).filter(Boolean))].join(', ');
        const locations = [...new Set(dayLogs.map(i => 'MVD'))].join(', '); // Por defecto MVD si no hay dato de localidad

        // Cálculo de KMs del día (Máximo Odómetro - Mínimo Odómetro del día)
        let kmDia = 0;
        const odometers = dayLogs
            .filter(i => i.log.type === 'move' && i.log.odo)
            .map(i => Number(i.log.odo))
            .sort((a,b) => a - b);
        
        if (odometers.length > 1) {
            kmDia = odometers[odometers.length - 1] - odometers[0];
        }

        // Categorización de Gastos
        let rowPeaje = 0;
        let rowAlmuerzo = 0;
        let rowCena = 0;
        let rowDesayuno = 0;
        let rowAlojamiento = 0;
        let rowVarios = 0;
        let rowTransporte = 0;
        let rowCombustible = 0;
        let rowUSD = 0;
        
        // Totales Fila
        let rowTotalEfectivo = 0;
        let rowTotalTarjeta = 0;

        dayLogs.forEach(({ log }) => {
            if (log.type === 'expense') {
                let amount = parseFloat(log.amount || '0');
                if (isNaN(amount)) amount = 0;

                // Lógica de Signos: Empresa = Negativo, Personal = Positivo
                const multiplier = log.paymentSource === 'Empresa' ? -1 : 1;
                const signedAmount = amount * multiplier;

                if (log.currency === 'U$D') {
                    rowUSD += amount; // U$S se suele sumar aparte en valor absoluto
                } else {
                    // Mapeo de Conceptos a Columnas
                    const c = (log.concept || '').toLowerCase();
                    
                    if (c.includes('peaje') || c.includes('estacionamiento')) rowPeaje += signedAmount;
                    else if (c.includes('almuerzo')) rowAlmuerzo += signedAmount;
                    else if (c.includes('cena')) rowCena += signedAmount;
                    else if (c.includes('desayuno') || c.includes('merienda') || c.includes('refrigerio')) rowDesayuno += signedAmount;
                    else if (c.includes('hotel') || c.includes('alojamiento')) rowAlojamiento += signedAmount;
                    else if (c.includes('combustible') || c.includes('nafta') || c.includes('gasoil')) rowCombustible += signedAmount;
                    else if (c.includes('transporte') || c.includes('taxi') || c.includes('uber')) rowTransporte += signedAmount;
                    else rowVarios += signedAmount;

                    // Sumarizadores Totales (Efectivo vs Tarjeta)
                    if (multiplier === 1) {
                        rowTotalEfectivo += amount;
                    } else {
                        rowTotalTarjeta += signedAmount; // Se suma el negativo
                    }
                }
            }
        });

        // Calcular $ por KMs (Si es Personal) -> Asumimos Gira por defecto si hay KMs, o Zona
        // Simplificación: Todo a Gira para el ejemplo, valor monetario calculado
        const dineroKm = kmDia * kmPrice;
        
        // Acumular Totales Generales
        totalKmGira += kmDia;
        totalDineroKm += dineroKm;
        totalPeaje += rowPeaje;
        totalAlmuerzo += rowAlmuerzo;
        totalCena += rowCena;
        totalDesayuno += rowDesayuno;
        totalAlojamiento += rowAlojamiento;
        totalVarios += rowVarios;
        totalTransporte += rowTransporte;
        totalCombustible += rowCombustible;
        totalGastoEfectivo += rowTotalEfectivo;
        totalTarjeta += rowTotalTarjeta;
        totalUSD += rowUSD;

        // Construir Fila (Array)
        // Indices basados en FO-8.5.5-03
        dataRows.push([
            formatDate(day),           // A: Día
            uniqueClients,             // B: Motivo
            locations,                 // C: Localidad
            kmDia || '',               // D: Kms Gira
            '',                        // E: Kms Zona
            dineroKm || '',            // F: $ (Dinero por KM)
            rowPeaje || '',            // G: Estacionamiento/Peaje
            rowAlmuerzo || '',         // H: Almuerzo
            rowCena || '',             // I: Cena
            rowDesayuno || '',         // J: Desayuno
            rowAlojamiento || '',      // K: Alojamiento
            rowVarios || '',           // L: Varios
            rowTransporte || '',       // M: Transporte
            rowCombustible || '',      // N: Combustible
            rowTotalEfectivo || '',    // O: Total Efectivo
            rowTotalTarjeta || '',     // P: Total Tarjeta (Negativo)
            '',                        // Q: Horas Extra
            '',                        // R: Hs Guardia
            rowUSD || '',              // S: U$S
            ''                         // T: Retiro Efectivo
        ]);
    });

    // 2. Construir Hoja Completa (Header + Data + Footer)
    const ws_data = [
        ["", "Microlab", "", "", "PLANILLA DE VIATICOS", "", "", "", "", "", "", "", "", "", "", "", "", "", "FO-8.5.5-03"],
        ["", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "Versión 08"],
        ["", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "2024-10-02"],
        [`Período: ${startDate}`, "", "", `Nombre: ${userName}`, "", "", "", "", "", "", `Valor Km: ${kmPrice}`, "", "", "", "", "", "", "", ""],
        ["", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""], // Espacio
        // Encabezados de Columna
        [
            "Día", 
            "Motivo del Viaje cliente", 
            "Localidad", 
            "Kms x Día.\nRecorridos Gira", 
            "Kms x Día.\nRecorridos Zona", 
            "$", 
            "Estacionamiento\n/ Peaje", 
            "Almuerzo", 
            "Cena", 
            "Desayuno/\nRefrigerio", 
            "Alojamiento", 
            "varios", 
            "Transporte", 
            "Combustible", 
            "Total de gastos\nefectivo", 
            "Total tarjeta\nMatercard $ .Que\nsea todo negativo", 
            "Horas Extra", 
            "Hs guardia\nefectivas", 
            "U$S", 
            "Retiro Efectivo"
        ],
        ...dataRows,
        // Fila Totalizadora
        [
            "Total por Trabajo :", 
            "", 
            "", 
            totalKmGira, 
            totalKmZona, 
            totalDineroKm, 
            totalPeaje, 
            totalAlmuerzo, 
            totalCena, 
            totalDesayuno, 
            totalAlojamiento, 
            totalVarios, 
            totalTransporte, 
            totalCombustible, 
            totalGastoEfectivo, 
            totalTarjeta, 
            totalHorasExtra, 
            totalHorasGuardia, 
            totalUSD, 
            ""
        ],
        ["", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
        // Cajas de Resumen Final
        ["", "HORAS EXTRA", totalHorasExtra, "", "Gastos\nen\nEfectivo", "", totalGastoEfectivo, "", "TOTAL Tarjeta\n$", "", totalTarjeta, "", "TOTAL Tarjeta U$S", "", totalUSD, "", "", "", ""],
        ["", "HORAS GUARDIA EFECTIVAS", totalHorasGuardia, "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
        ["", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
        ["", "FIRMA EMPLEADO", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""]
    ];

    // 3. Crear Workbook
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(ws_data);

    // Configurar anchos de columna aproximados
    ws['!cols'] = [
        { wch: 10 }, // A Día
        { wch: 30 }, // B Motivo
        { wch: 15 }, // C Localidad
        { wch: 10 }, // D Kms
        { wch: 10 }, // E Kms
        { wch: 10 }, // F $
        { wch: 12 }, // G Est/Peaje
        { wch: 10 }, // H Alm
        { wch: 10 }, // I Cena
        { wch: 10 }, // J Des
        { wch: 10 }, // K Aloj
        { wch: 10 }, // L Var
        { wch: 10 }, // M Trans
        { wch: 10 }, // N Comb
        { wch: 12 }, // O Tot Ef
        { wch: 12 }, // P Tot Tarj
        { wch: 8 },  // Q Extra
        { wch: 8 },  // R Guardia
        { wch: 8 },  // S USD
        { wch: 10 }  // T Retiro
    ];

    // Merge de celdas para el encabezado (Simulado, sheetjs basic a veces ignora esto sin Pro, pero lo intentamos)
    ws['!merges'] = [
        { s: { r: 0, c: 4 }, e: { r: 0, c: 10 } }, // Título
    ];

    XLSX.utils.book_append_sheet(wb, ws, "Viáticos");
    
    // Generar nombre de archivo: Planilla_Nombre_Mes.xlsx
    const monthName = start.toLocaleString('es-ES', { month: 'long' });
    const fileName = `Planilla_${userName.replace(/\s+/g, '_')}_${monthName}.xlsx`;
    
    XLSX.writeFile(wb, fileName);
};
