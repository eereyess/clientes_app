import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import api from '../api/client';
import FileUpload from './FileUpload';

export default function EditarValores({ ticket, onCancel, onSuccess }) {
    const [saving, setSaving] = useState(false);
    const [confirming, setConfirming] = useState(false);

    // Devolución
    const [monto, setMonto] = useState(ticket.monto || '');
    const [moneda, setMoneda] = useState(ticket.moneda || 'CLP');
    const [proveedorId, setProveedorId] = useState(ticket.proveedor_id || '');
    const [proveedorNombre, setProveedorNombre] = useState(ticket.proveedor_nombre || '');
    const [creditoProveedor, setCreditoProveedor] = useState(!!ticket.credito_proveedor);

    // NUEVO: Detalle de Devolución Table State
    const getInitialDetalle = () => {
        if (ticket.detalle_devolucion) {
            try {
                return typeof ticket.detalle_devolucion === 'string'
                    ? JSON.parse(ticket.detalle_devolucion)
                    : ticket.detalle_devolucion;
            } catch (e) { console.error("Error parsing detalle_devolucion", e); }
        }
        // Intentar cargar de las columnas individuales si están disponibles
        if (ticket.prog_pax !== undefined && ticket.prog_pax !== null) {
            return {
                prog: { pax: ticket.prog_pax, valor: ticket.prog_valor },
                tasas: { pax: ticket.tasas_pax, valor: ticket.tasas_valor },
                qseg: { pax: ticket.qseg_pax, valor: ticket.qseg_valor },
                retencion_pct: ticket.retencion_pct
            };
        }
        return {
            prog: { pax: 1, valor: 0 },
            tasas: { pax: 0, valor: 0 },
            qseg: { pax: 0, valor: 0 },
            retencion_pct: 0
        };
    };

    const [detDev, setDetDev] = useState(getInitialDetalle());

    // Auxiliar para cálculos Table 1
    const calcRow = (row) => (parseFloat(row?.pax) || 0) * (parseFloat(row?.valor) || 0);
    const t1 = calcRow(detDev.prog);
    const t2 = calcRow(detDev.tasas);
    const t3 = calcRow(detDev.qseg);
    const sumatoria = t1 + t2 + t3;
    const retencionCalculada = sumatoria * (parseFloat(detDev.retencion_pct) / 100);
    const totalDescontada = sumatoria - retencionCalculada;

    const handleDetalleChange = (rowKey, field, value) => {
        setDetDev(prev => ({
            ...prev,
            [rowKey]: { ...prev[rowKey], [field]: value }
        }));
    };

    // NUEVO: SECCIÓN 3 (Nota de Crédito) State
    const [cambio, setCambio] = useState(ticket.cambio !== undefined && ticket.cambio !== null ? ticket.cambio : 850);
    const [ncPct, setNcPct] = useState(ticket.nc_pct !== undefined && ticket.nc_pct !== null ? ticket.nc_pct : 0);

    // Cálculos Tabla 3
    // Lógica: Total a devolver descontada retención * % * TC (si moneda es USD).
    let ncNetoCLP = 0;
    if (moneda === 'USD') {
        ncNetoCLP = totalDescontada * (parseFloat(ncPct) / 100) * cambio;
    } else {
        ncNetoCLP = totalDescontada * (parseFloat(ncPct) / 100);
    }

    const ncNetoUSD = moneda === 'USD' ? (totalDescontada * (parseFloat(ncPct) / 100)) : 0;
    const ivaCLP = ncNetoCLP * 0.19;
    const ivaUSD = moneda === 'USD' ? (ncNetoUSD * 0.19) : 0;
    const totalNCCLP = ncNetoCLP + ivaCLP;
    const totalNCUSD = ncNetoUSD + ivaUSD;

    const montoFinalDevolucion = totalDescontada - (moneda === 'USD' ? totalNCUSD : totalNCCLP);

    // Formatting Helpers
    const formatValue = (val) => {
        if (moneda === 'CLP') {
            return Math.round(val).toLocaleString('es-CL');
        } else {
            return val.toLocaleString('es-CL', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        }
    };

    const formatNC = (val, isUSD) => {
        if (!isUSD) {
            return Math.round(val).toLocaleString('es-CL');
        }
        if (moneda === 'CLP') return '-';
        return val.toLocaleString('es-CL', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    const cur = moneda === 'USD' ? 'U$' : '$';

    // Cuentas Corrientes (Array of 2)
    const [cuentas, setCuentas] = useState(ticket.cuentas_corrientes?.length ? ticket.cuentas_corrientes : [
        { nombre: '', rut: '', banco: '', cuenta: '', mail: '' },
        { nombre: '', rut: '', banco: '', cuenta: '', mail: '' }
    ]);

    // Antiguos estados NC (se mantienen por compatibilidad si se desea, pero ocultos tras la nueva tabla)
    const [ncTc, setNcTc] = useState(ticket.nota_credito?.tc || cambio);
    const [ncArchivo, setNcArchivo] = useState(null);

    // Descripción HTML
    const [descripcionHtml, setDescripcionHtml] = useState(ticket.descripcion_html || `<p>${ticket.descripcion || ''}</p>`);
    const editorRef = useRef(null);

    const handleCuentaChange = (index, field, value) => {
        const newCuentas = [...cuentas];
        newCuentas[index][field] = value;
        setCuentas(newCuentas);
    };

    const handleFormat = (command) => {
        document.execCommand(command, false, null);
        editorRef.current.focus();
    };

    const handlePreSubmit = () => setConfirming(true);

    const handleSubmit = async () => {
        if (!ticket.id_ticket) {
            alert("Error: ID del ticket no encontrado.");
            return;
        }
        console.log("Enviando valores para ticket ID:", ticket.id_ticket);
        setConfirming(false);
        setSaving(true);
        try {
            const formData = new FormData();

            const roundVal = (v) => {
                if (moneda === 'CLP') return Math.round(parseFloat(v) || 0);
                return parseFloat(v) || 0;
            };

            // Valores Financieros
            formData.append('monto', roundVal(monto));
            formData.append('moneda', moneda);

            // Proveedor lógico (Si está vacío, fuerza PAN)
            const finalProvId = proveedorId || 'PAN';
            const finalProvNombre = proveedorNombre || 'Panam';
            formData.append('proveedor_id', finalProvId);
            formData.append('proveedor_nombre', finalProvNombre);

            formData.append('credito_proveedor', creditoProveedor);
            formData.append('cuentas_corrientes', JSON.stringify(cuentas));

            // Detalle Devolución (JSON + Columnas)
            formData.append('detalle_devolucion', JSON.stringify(detDev));
            formData.append('prog_pax', detDev.prog.pax);
            formData.append('prog_valor', roundVal(detDev.prog.valor));
            formData.append('prog_total', roundVal(t1));
            formData.append('tasas_pax', detDev.tasas.pax);
            formData.append('tasas_valor', roundVal(detDev.tasas.valor));
            formData.append('tasas_total', roundVal(t2));
            formData.append('qseg_pax', detDev.qseg.pax);
            formData.append('qseg_valor', roundVal(detDev.qseg.valor));
            formData.append('qseg_total', roundVal(t3));
            formData.append('retencion_pct', detDev.retencion_pct);
            formData.append('retencion_valor', roundVal(retencionCalculada));
            formData.append('total_con_retencion', roundVal(totalDescontada));

            // Sección 3 (Nota de Crédito)
            formData.append('cambio', cambio);
            formData.append('nc_pct', ncPct);
            formData.append('nc_clp', Math.round(ncNetoCLP));
            formData.append('nc_usd', moneda === 'USD' ? ncNetoUSD : 0);
            formData.append('nc_iva_clp', Math.round(ivaCLP));
            formData.append('nc_iva_usd', moneda === 'USD' ? ivaUSD : 0);
            formData.append('nc_total_clp', Math.round(totalNCCLP));
            formData.append('nc_total_usd', moneda === 'USD' ? totalNCUSD : 0);
            formData.append('monto_final_devolucion', roundVal(montoFinalDevolucion));

            // Archivo NC (si existe)
            if (ncArchivo) formData.append('nc_archivo', ncArchivo);

            // Text HTML (recoger estado actual del editor libre)
            formData.append('descripcion_html', editorRef.current?.innerHTML || descripcionHtml);

            const token = localStorage.getItem('gclientes_token');
            const resFetch = await fetch(`/api/tickets/${ticket.id_ticket}/valores`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            });
            if (!resFetch.ok) {
                let errText = 'Error en servidor';
                try {
                    const errorObj = await resFetch.json();
                    errText = errorObj.error || errText;
                } catch (e) { }
                throw new Error(errText);
            }

            onSuccess();
        } catch (err) {
            console.error('Save error:', err);
            alert('Error al guardar: ' + (err.message || String(err)));
        } finally {
            setSaving(false);
        }
    };

    const nonEditableStyle = { background: '#f9fafb', border: '1px solid #2d5a27', padding: '8px', textAlign: 'right', fontWeight: 600, color: '#4b5563' };
    const labelStyle = { background: '#f3f4f6', border: '1px solid #2d5a27', padding: '8px', fontWeight: 600, color: '#111827' };

    return (
        <div className="card" style={{ marginTop: 20 }}>
            <style>{`
                input[type=number]::-webkit-inner-spin-button, 
                input[type=number]::-webkit-outer-spin-button { 
                  -webkit-appearance: none; 
                  margin: 0; 
                }
                input[type=number] { -moz-appearance: textfield; }
                .table-finance { width: 100%; border-collapse: collapse; border: 2px solid #2d5a27; font-family: inherit; font-size: 13px; }
            `}</style>
            <div className="card-header" style={{ background: 'var(--color-bg-alt)' }}>
                <h2>📝 Editar Valores y Detalles</h2>
            </div>

            <div className="card-body">
                {/* 1. SECCIÓN DEVOLUCIÓN */}
                <h3 style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: 8, marginBottom: 16 }}>1. Devolución</h3>
                <div className="form-row">
                    <div className="form-group" style={{ flex: 1 }}>
                        <label className="form-label">Monto solicitado a Devolución</label>
                        <div style={{ display: 'flex', gap: 8 }}>
                            <select className="form-select" style={{ width: 100 }} value={moneda} onChange={e => setMoneda(e.target.value)}>
                                <option value="CLP">CLP</option>
                                <option value="USD">USD</option>
                            </select>
                            <input type="number" className="form-input" value={monto} onChange={e => setMonto(e.target.value)} />
                        </div>
                    </div>
                    <div className="form-group" style={{ flex: 1 }}>
                        <label className="form-label">Con cargo a (Proveedor)</label>
                        <div style={{ display: 'flex', gap: 8 }}>
                            <input type="text" className="form-input" placeholder="Código (ej. PAN)" value={proveedorId} onChange={e => setProveedorId(e.target.value)} style={{ width: '30%', background: '#f1f5f9' }} disabled />
                            <input type="text" className="form-input" placeholder="Nombre (ej. Panam)" value={proveedorNombre} onChange={e => setProveedorNombre(e.target.value)} style={{ width: '70%', background: '#f1f5f9' }} disabled />
                        </div>
                        <p style={{ fontSize: 11, color: '#ef4444', marginTop: 4 }}>El proveedor no puede ser cambiado desde esta sección.</p>
                    </div>
                </div>

                {/* TABLA DETALLE DEVOLUCIÓN (Screenshot Request) */}
                <div style={{ marginTop: 20, marginBottom: 24, overflowX: 'auto' }}>
                    <table className="table-finance">
                        <thead>
                            <tr style={{ background: '#e2efda', textAlign: 'left' }}>
                                <th style={{ padding: '8px', border: '1px solid #2d5a27', color: '#000', width: '35%' }}>Detalle de Devolución:</th>
                                <th style={{ padding: '8px', border: '1px solid #2d5a27', color: '#000', textAlign: 'center', width: '10%' }}>Nº de Pax</th>
                                <th style={{ padding: '8px', border: '1px solid #2d5a27', color: '#000', textAlign: 'center', width: '25%' }}>Valor x Pax</th>
                                <th style={{ padding: '8px', border: '1px solid #2d5a27', color: '#000', textAlign: 'center', width: '30%' }}>Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td style={labelStyle}>Valor Programa por pax</td>
                                <td style={{ padding: '0', border: '1px solid #2d5a27', background: '#fff2cc' }}>
                                    <input
                                        type="number"
                                        value={detDev.prog.pax}
                                        onChange={e => handleDetalleChange('prog', 'pax', e.target.value)}
                                        style={{ width: '100%', border: 'none', padding: '8px', textAlign: 'center', background: 'transparent', outline: 'none' }}
                                    />
                                </td>
                                <td style={{ padding: '0', border: '1px solid #2d5a27', background: '#fff2cc' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', paddingLeft: 8 }}>
                                        <span>{cur}</span>
                                        <input
                                            type="number"
                                            value={detDev.prog.valor}
                                            onChange={e => handleDetalleChange('prog', 'valor', e.target.value)}
                                            style={{ width: '100%', border: 'none', padding: '8px', textAlign: 'right', background: 'transparent', outline: 'none' }}
                                        />
                                    </div>
                                </td>
                                <td style={nonEditableStyle}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <span>{cur}</span>
                                        <span>{formatValue(t1)}</span>
                                    </div>
                                </td>
                            </tr>
                            <tr>
                                <td style={labelStyle}>Tasas de Embarque</td>
                                <td style={{ padding: '0', border: '1px solid #2d5a27', background: '#fff2cc' }}>
                                    <input
                                        type="number"
                                        value={detDev.tasas.pax}
                                        onChange={e => handleDetalleChange('tasas', 'pax', e.target.value)}
                                        style={{ width: '100%', border: 'none', padding: '8px', textAlign: 'center', background: 'transparent', outline: 'none' }}
                                    />
                                </td>
                                <td style={{ padding: '0', border: '1px solid #2d5a27', background: '#fff2cc' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', paddingLeft: 8 }}>
                                        <span>{cur}</span>
                                        <input
                                            type="number"
                                            value={detDev.tasas.valor}
                                            onChange={e => handleDetalleChange('tasas', 'valor', e.target.value)}
                                            style={{ width: '100%', border: 'none', padding: '8px', textAlign: 'right', background: 'transparent', outline: 'none' }}
                                        />
                                    </div>
                                </td>
                                <td style={nonEditableStyle}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <span>{cur}</span>
                                        <span>{formatValue(t2)}</span>
                                    </div>
                                </td>
                            </tr>
                            <tr>
                                <td style={labelStyle}>Q de seguridad</td>
                                <td style={{ padding: '0', border: '1px solid #2d5a27', background: '#fff2cc' }}>
                                    <input
                                        type="number"
                                        value={detDev.qseg.pax}
                                        onChange={e => handleDetalleChange('qseg', 'pax', e.target.value)}
                                        style={{ width: '100%', border: 'none', padding: '8px', textAlign: 'center', background: 'transparent', outline: 'none' }}
                                    />
                                </td>
                                <td style={{ padding: '0', border: '1px solid #2d5a27', background: '#fff2cc' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', paddingLeft: 8 }}>
                                        <span>{cur}</span>
                                        <input
                                            type="number"
                                            value={detDev.qseg.valor}
                                            onChange={e => handleDetalleChange('qseg', 'valor', e.target.value)}
                                            style={{ width: '100%', border: 'none', padding: '8px', textAlign: 'right', background: 'transparent', outline: 'none' }}
                                        />
                                    </div>
                                </td>
                                <td style={nonEditableStyle}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <span>{cur}</span>
                                        <span>{formatValue(t3)}</span>
                                    </div>
                                </td>
                            </tr>
                            <tr>
                                <td style={labelStyle}>Retención</td>
                                <td style={{ padding: '0', border: '1px solid #2d5a27', background: '#fff2cc' }}>
                                    <select
                                        value={detDev.retencion_pct}
                                        onChange={e => setDetDev(prev => ({ ...prev, retencion_pct: e.target.value }))}
                                        style={{ width: '100%', border: 'none', padding: '8px', textAlign: 'center', background: 'transparent', outline: 'none', textAlignLast: 'center' }}
                                    >
                                        <option value="0">0%</option>
                                        <option value="5">5%</option>
                                        <option value="10">10%</option>
                                        <option value="30">30%</option>
                                        <option value="50">50%</option>
                                        <option value="70">70%</option>
                                    </select>
                                </td>
                                <td style={labelStyle}></td>
                                <td style={nonEditableStyle}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <span>{cur}</span>
                                        <span>{retencionCalculada > 0 ? `- ${formatValue(retencionCalculada)}` : formatValue(0)}</span>
                                    </div>
                                </td>
                            </tr>
                        </tbody>
                        <tfoot>
                            <tr style={{ background: '#f9fafb' }}>
                                <td colSpan="3" style={{ padding: '8px', border: '1px solid #2d5a27', fontWeight: 800, textAlign: 'left' }}>Total descontada la retención</td>
                                <td style={{ ...nonEditableStyle, background: '#f3f4f6', fontSize: '15px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <span>{cur}</span>
                                        <span>{formatValue(totalDescontada)}</span>
                                    </div>
                                </td>
                            </tr>
                        </tfoot>
                    </table>
                </div>

                <div className="form-group" style={{ marginBottom: 24 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                        <input type="checkbox" checked={creditoProveedor} onChange={e => setCreditoProveedor(e.target.checked)} style={{ width: 16, height: 16, accentColor: 'var(--color-primary)' }} />
                        <span style={{ fontWeight: 600 }}>Crédito Con Proveedor</span>
                    </label>
                </div>

                {/* 2. SECCIÓN CUENTAS CORRIENTES */}
                <h3 style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: 8, marginTop: 24, marginBottom: 16 }}>2. Cuentas Corrientes para depósito</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
                    {[0, 1].map(index => (
                        <div key={index} style={{ padding: 16, border: '1px solid var(--color-border)', borderRadius: 8, background: '#f8fafc' }}>
                            <h4 style={{ margin: '0 0 12px 0', fontSize: 13, color: 'var(--color-text-secondary)' }}>Opción {index + 1}</h4>
                            <div className="form-group" style={{ marginBottom: 8 }}><input className="form-input" placeholder="Nombre" value={cuentas[index].nombre} onChange={e => handleCuentaChange(index, 'nombre', e.target.value)} /></div>
                            <div className="form-group" style={{ marginBottom: 8 }}><input className="form-input" placeholder="RUT" value={cuentas[index].rut} onChange={e => handleCuentaChange(index, 'rut', e.target.value)} /></div>
                            <div className="form-group" style={{ marginBottom: 8 }}><input className="form-input" placeholder="Banco" value={cuentas[index].banco} onChange={e => handleCuentaChange(index, 'banco', e.target.value)} /></div>
                            <div className="form-group" style={{ marginBottom: 8 }}><input className="form-input" placeholder="N° de Cuenta Corriente" value={cuentas[index].cuenta} onChange={e => handleCuentaChange(index, 'cuenta', e.target.value)} /></div>
                            <div className="form-group" style={{ marginBottom: 0 }}><input className="form-input" placeholder="Mail" type="email" value={cuentas[index].mail} onChange={e => handleCuentaChange(index, 'mail', e.target.value)} /></div>
                        </div>
                    ))}
                </div>

                {/* 3. NOTA DE CRÉDITO (REWRITTEN AS TABLE) */}
                <h3 style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: 8, marginTop: 32, marginBottom: 16 }}>3. Nota de Crédito</h3>
                <div style={{ marginBottom: 24, overflowX: 'auto' }}>
                    <table className="table-finance" style={{ border: '2px solid #000' }}>
                        <thead>
                            <tr style={{ background: '#fff', textAlign: 'center' }}>
                                <th style={{ padding: '8px', border: '1px solid #000', width: '50%' }}></th>
                                <th style={{ padding: '8px', border: '1px solid #000', width: '25%', fontWeight: 'bold' }}>$</th>
                                <th style={{ padding: '8px', border: '1px solid #000', width: '25%', fontWeight: 'bold' }}>U$</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td style={{ padding: '8px', border: '1px solid #000', fontWeight: 'bold' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span>Tipo de Cambio File</span>
                                        <input
                                            type="number"
                                            value={cambio}
                                            onChange={e => setCambio(e.target.value)}
                                            style={{ width: '80px', border: '2px solid #2d5a27', padding: '4px', textAlign: 'center', background: '#fff2cc', borderRadius: '4px' }}
                                        />
                                    </div>
                                </td>
                                <td style={{ padding: '8px', border: '1px solid #000', background: '#f9fafb' }}></td>
                                <td style={{ padding: '8px', border: '1px solid #000', background: '#f9fafb' }}></td>
                            </tr>
                            <tr>
                                <td style={{ padding: '8px', border: '1px solid #000', fontWeight: 'bold' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span>Nota de Crédito (%)</span>
                                        <select
                                            value={ncPct}
                                            onChange={e => setNcPct(e.target.value)}
                                            style={{ width: '80px', border: '2px solid #2d5a27', padding: '4px', textAlign: 'right', background: '#fff2cc', borderRadius: '4px' }}
                                        >
                                            {[0, 10, 11, 12, 13, 14, 15].map(v => <option key={v} value={v}>{v}%</option>)}
                                        </select>
                                    </div>
                                </td>
                                <td style={{ padding: '8px', border: '1px solid #000', background: '#f9fafb', textAlign: 'right' }}>
                                    {formatNC(ncNetoCLP, false)}
                                </td>
                                <td style={{ padding: '8px', border: '1px solid #000', background: '#f9fafb', textAlign: 'right' }}>
                                    {formatNC(ncNetoUSD, true)}
                                </td>
                            </tr>
                            <tr>
                                <td style={{ padding: '8px', border: '1px solid #000', fontWeight: 'normal' }}>IVA 19%</td>
                                <td style={{ padding: '8px', border: '1px solid #000', background: '#f9fafb', textAlign: 'right' }}>
                                    {formatNC(ivaCLP, false)}
                                </td>
                                <td style={{ padding: '8px', border: '1px solid #000', background: '#f9fafb', textAlign: 'right' }}>
                                    {formatNC(ivaUSD, true)}
                                </td>
                            </tr>
                            <tr style={{ fontWeight: 'bold' }}>
                                <td style={{ padding: '8px', border: '1px solid #000' }}>Total Nota de Crédito $</td>
                                <td style={{ padding: '8px', border: '1px solid #000', background: '#f9fafb', textAlign: 'right' }}>
                                    {formatNC(totalNCCLP, false)}
                                </td>
                                <td style={{ padding: '8px', border: '1px solid #000', background: '#f9fafb', textAlign: 'right' }}>
                                    {formatNC(totalNCUSD, true)}
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                {/* NUEVO: MONTO FINAL A DEVOLVER */}
                <div style={{ marginTop: 24, padding: '16px 24px', background: '#fefce8', border: '2px solid #eab308', borderRadius: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 18, fontWeight: 'bold', color: '#854d0e', textTransform: 'uppercase' }}>
                        Monto Final a Devolver ({moneda}):
                    </span>
                    <span style={{ fontSize: 24, fontWeight: '900', color: '#a16207' }}>
                        {moneda === 'USD' ? 'US$' : '$'}
                        {moneda === 'USD'
                            ? montoFinalDevolucion.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                            : Math.round(montoFinalDevolucion).toLocaleString()
                        }
                    </span>
                </div>

                <div className="form-group" style={{ marginTop: 24 }}>
                    <label className="form-label">Adjuntar Nota de Crédito (PDF/JPG)</label>
                    {ticket.nota_credito?.archivo && (
                        <div style={{ marginBottom: 8, fontSize: 13 }}>
                            Archivo actual: <a href={'https://app-clientes-backend-521751525588.us-central1.run.app' + ticket.nota_credito.archivo} target="_blank" rel="noreferrer">Ver Documento</a>
                        </div>
                    )}
                    <FileUpload
                        multiple={false}
                        accept={{ 'application/pdf': ['.pdf'], 'image/*': ['.jpg', '.jpeg', '.png'] }}
                        onFilesSelected={files => setNcArchivo(files[0])}
                    />
                </div>

                {/* 4. DESCRIPCIÓN RICA */}
                <h3 style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: 8, marginTop: 32, marginBottom: 16 }}>4. Descripción (Formato)</h3>
                <div className="form-group">
                    <div style={{ border: '1px solid var(--color-border)', borderBottom: 'none', borderTopLeftRadius: 6, borderTopRightRadius: 6, padding: '8px', background: '#f8fafc', display: 'flex', gap: 8 }}>
                        <button type="button" onClick={() => handleFormat('bold')} style={{ padding: '4px 8px', background: 'white', border: '1px solid #ccc', borderRadius: 4, cursor: 'pointer', fontWeight: 'bold' }}>B</button>
                        <button type="button" onClick={() => handleFormat('italic')} style={{ padding: '4px 8px', background: 'white', border: '1px solid #ccc', borderRadius: 4, cursor: 'pointer', fontStyle: 'italic' }}>I</button>
                        <button type="button" onClick={() => handleFormat('underline')} style={{ padding: '4px 8px', background: 'white', border: '1px solid #ccc', borderRadius: 4, cursor: 'pointer', textDecoration: 'underline' }}>U</button>
                        <div style={{ width: 1, background: '#ccc', margin: '0 4px' }}></div>
                        <button type="button" onClick={() => handleFormat('insertUnorderedList')} style={{ padding: '4px 8px', background: 'white', border: '1px solid #ccc', borderRadius: 4, cursor: 'pointer' }}>• Lista</button>
                        <button type="button" onClick={() => handleFormat('insertOrderedList')} style={{ padding: '4px 8px', background: 'white', border: '1px solid #ccc', borderRadius: 4, cursor: 'pointer' }}>1. Lista</button>
                    </div>
                    <div
                        ref={editorRef}
                        contentEditable
                        style={{ border: '1px solid var(--color-border)', borderBottomLeftRadius: 6, borderBottomRightRadius: 6, padding: 16, minHeight: 150, outline: 'none', background: 'white' }}
                        dangerouslySetInnerHTML={{ __html: descripcionHtml }}
                    ></div>
                </div>

                <div style={{ marginTop: 32, display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                    <button className="btn btn-secondary" onClick={onCancel}>Cancelar</button>
                    <button className="btn btn-primary" onClick={handlePreSubmit} disabled={saving}>{saving ? '⏳ Guardando...' : '💾 Guardar Valores'}</button>
                </div>
            </div>

            {/* Custom Confirm Modal for EditarValores */}
            {confirming && createPortal(
                <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
                    <div style={{ background: 'white', padding: '32px', borderRadius: '16px', width: '90%', maxWidth: '400px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
                            <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#e0e7ff', color: '#4f46e5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>💾</div>
                            <h3 style={{ margin: 0, fontSize: '18px', color: '#0f172a', fontWeight: '700' }}>Confirmar Guardado</h3>
                        </div>
                        <p style={{ margin: '0 0 24px 0', color: '#475569', fontSize: '14.5px', lineHeight: '1.5' }}>
                            ¿Está seguro de que desea guardar todos los cambios en los valores financieros de este ticket?
                        </p>
                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                            <button className="btn btn-secondary" onClick={() => setConfirming(false)}>Cancelar</button>
                            <button className="btn btn-primary" onClick={handleSubmit}>Sí, Guardar</button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}
