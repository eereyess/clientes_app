import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';
import FileUpload from '../components/FileUpload';

export default function TicketNuevo() {
    const navigate = useNavigate();
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [fileLoading, setFileLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    // Step 1 - File lookup
    const [numFile, setNumFile] = useState('');
    const [fileData, setFileData] = useState(null);
    const [fileError, setFileError] = useState('');

    // Step 2 - Ticket info
    const [tipoSolicitud, setTipoSolicitud] = useState('');
    const [descripcion, setDescripcion] = useState('');
    const [selectedProveedor, setSelectedProveedor] = useState(null);
    const [monto, setMonto] = useState('');
    const [moneda, setMoneda] = useState('CLP');
    const [sernac, setSernac] = useState(false);
    const [archivos, setArchivos] = useState([]);
    const [listaTipos, setListaTipos] = useState([]);

    useEffect(() => {
        api.get('/parametricas/tipos_solicitud')
            .then(res => setListaTipos(res.data))
            .catch(console.error);
    }, []);

    const buscarFile = async () => {
        if (!numFile.trim()) return;
        setFileLoading(true);
        setFileError('');
        setFileData(null);
        try {
            const res = await api.get(`/oris/file/${numFile.trim()}`);
            setFileData(res.data);
            setStep(2);
        } catch (err) {
            setFileError(err.response?.data?.error || 'File no encontrado en Oris');
        } finally {
            setFileLoading(false);
        }
    };

    const handleSubmit = async () => {
        if (!tipoSolicitud || !descripcion.trim()) {
            setError('Complete todos los campos requeridos');
            return;
        }
        setLoading(true);
        setError('');
        try {
            const formData = new FormData();
            formData.append('num_file', numFile);
            formData.append('tipof', fileData?.tipof || '');
            formData.append('id_tipo_solicitud', tipoSolicitud);
            formData.append('descripcion', descripcion);
            formData.append('proveedor_id', selectedProveedor?.codigo || '');
            formData.append('proveedor_nombre', selectedProveedor?.nombre || '');
            formData.append('monto', monto || 0);
            formData.append('agencia', fileData?.agencia || '');
            formData.append('agente', fileData?.agente || '');
            formData.append('fecha_viaje', fileData?.fecha_viaje || '');
            formData.append('destino', fileData?.destino || '');
            formData.append('operador', fileData?.operador || '');
            formData.append('pasajero', fileData?.pasajero || '');
            formData.append('sernac', sernac);
            formData.append('moneda', moneda);

            Array.from(archivos).forEach(file => {
                formData.append('archivos', file);
            });

            const res = await api.post('/tickets', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setSuccess(`Caso ${res.data.numero_ticket} creado exitosamente`);
            setStep(3);
        } catch (err) {
            setError(err.response?.data?.error || 'Error al crear caso');
        } finally {
            setLoading(false);
        }
    };

    const getStepClass = (s) => {
        if (s === step) return 'step-item active';
        if (s < step) return 'step-item completed';
        return 'step-item';
    };

    return (
        <div className="page-container fade-in">
            <div className="page-header">
                <div>
                    <h1>Nuevo Caso</h1>
                    <p className="page-header-subtitle">Registrar nueva solicitud de reclamo o devolución</p>
                </div>
                <button className="btn btn-secondary" onClick={() => navigate('/tickets')}>← Ver Casos</button>
            </div>

            <div className="steps-container" style={{ maxWidth: 720 }}>
                {/* STEP 1: File Lookup */}
                <div className={getStepClass(1)}>
                    <div className="step-number">1</div>
                    <div className="step-content">
                        <div className="step-title">Paso 1: Identificar Reserva (File)</div>
                        <div className="step-description">
                            {step > 1 ? `${fileData?.tipof ? `[${fileData.tipof}] ` : ''}File #${numFile} - ${fileData?.agencia}` : 'Ingrese el número de File para obtener datos de Oris'}
                        </div>
                        {step === 1 && (
                            <div className="step-body">
                                <div className="form-inline">
                                    <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                                        <input
                                            type="text"
                                            className="form-input"
                                            placeholder="Ej: 15230"
                                            value={numFile}
                                            onChange={e => setNumFile(e.target.value)}
                                            onKeyDown={e => e.key === 'Enter' && buscarFile()}
                                        />
                                    </div>
                                    <button className="btn btn-primary" onClick={buscarFile} disabled={fileLoading || !numFile.trim()}>
                                        {fileLoading ? '⏳ Buscando...' : '🔍 Buscar File'}
                                    </button>
                                </div>
                                {fileError && <div className="form-error" style={{ marginTop: 8 }}>❌ {fileError}</div>}
                                {step === 1 && (
                                    <div className="step-progress-bar">
                                        <div className="step-progress-fill" style={{ width: numFile ? '50%' : '0%' }}></div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* STEP 2: Ticket Details */}
                <div className={getStepClass(2)}>
                    <div className="step-number">2</div>
                    <div className="step-content">
                        <div className="step-title">Paso 2: Detalles de la Solicitud</div>
                        <div className="step-description">
                            {step < 2 ? 'Complete el Paso 1 antes de continuar' : step > 2 ? 'Solicitud registrada' : 'Complete la información del caso'}
                        </div>
                        {step === 2 && fileData && (
                            <div className="step-body">
                                {/* File info display */}
                                <div className="file-lookup">
                                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-primary-dark)', marginBottom: 4 }}>
                                        ✅ Datos extraídos de Oris - File #{numFile}
                                    </div>
                                    <div className="file-info-grid">
                                        <div className="file-info-item">
                                            <label>Pasajero</label>
                                            <p>{fileData.pasajero}</p>
                                        </div>
                                        <div className="file-info-item">
                                            <label>Agencia</label>
                                            <p>{fileData.agencia}</p>
                                        </div>
                                        {fileData.agente && (
                                            <div className="file-info-item">
                                                <label>Agente</label>
                                                <p>{fileData.agente}</p>
                                            </div>
                                        )}
                                        <div className="file-info-item">
                                            <label>Fecha de Viaje</label>
                                            <p>{fileData.fecha_viaje ? new Date(fileData.fecha_viaje).toLocaleDateString('es-CL', { timeZone: 'UTC' }) : ''}</p>
                                        </div>
                                        <div className="file-info-item">
                                            <label>Destino</label>
                                            <p>{fileData.destino}</p>
                                        </div>
                                        <div className="file-info-item">
                                            <label>Operador</label>
                                            <p>{fileData.operador}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Form fields */}
                                <div style={{ marginTop: 20 }}>
                                    <div className="form-row">
                                        <div className="form-group">
                                            <label className="form-label">Tipo de Solicitud <span className="required">*</span></label>
                                            <select className="form-select" value={tipoSolicitud} onChange={e => setTipoSolicitud(e.target.value)}>
                                                <option value="">Seleccionar...</option>
                                                {listaTipos.map(t => (
                                                    <option key={t.id_tipo} value={t.id_tipo}>{t.icono ? t.icono + ' ' : ''}{t.nombre}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="form-group" style={{ display: 'flex', gap: '8px' }}>
                                            <div style={{ flex: 1 }}>
                                                <label className="form-label">Moneda</label>
                                                <select className="form-select" value={moneda} onChange={e => setMoneda(e.target.value)}>
                                                    <option value="CLP">CLP</option>
                                                    <option value="USD">USD</option>
                                                </select>
                                            </div>
                                            <div style={{ flex: 2 }}>
                                                <label className="form-label">Monto Solicitado</label>
                                                <input type="number" className="form-input" placeholder="0.00" value={monto} onChange={e => setMonto(e.target.value)} step="0.01" min="0" />
                                            </div>
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label">Caso Sernac</label>
                                            <div style={{ marginTop: 8 }}>
                                                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                                                    <input
                                                        type="checkbox"
                                                        checked={sernac}
                                                        onChange={e => setSernac(e.target.checked)}
                                                        style={{ width: 18, height: 18, accentColor: '#DE3C3C' }}
                                                    />
                                                    <span style={{ fontWeight: sernac ? 600 : 400, color: sernac ? '#DE3C3C' : 'inherit' }}>
                                                        Aplica Sernac
                                                    </span>
                                                </label>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="form-group">
                                        <label className="form-label">Descripción <span className="required">*</span></label>
                                        <textarea className="form-textarea" placeholder="Describa detalladamente la solicitud..." value={descripcion} onChange={e => setDescripcion(e.target.value)} rows={4} />
                                    </div>

                                    {/* Providers */}
                                    <div className="form-group">
                                        <label className="form-label">Proveedor Asociado</label>
                                        <div className="provider-list">
                                            {fileData.proveedores.map(p => (
                                                <div
                                                    key={p.codigo}
                                                    className={`provider-item${selectedProveedor?.codigo === p.codigo ? ' selected' : ''}`}
                                                    onClick={() => setSelectedProveedor(selectedProveedor?.codigo === p.codigo ? null : p)}
                                                >
                                                    <div className="provider-check">
                                                        {selectedProveedor?.codigo === p.codigo && '✓'}
                                                    </div>
                                                    <span className="provider-name">{p.nombre}</span>
                                                    <span className="provider-code">{p.codigo}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* Files */}
                                <div className="form-group" style={{ marginTop: 16 }}>
                                    <label className="form-label">Adjuntar Archivos (Opcional)</label>
                                    <FileUpload onFilesSelected={files => setArchivos(files)} />
                                </div>

                                {error && <div className="form-error">❌ {error}</div>}

                                <div className="btn-group" style={{ marginTop: 16 }}>
                                    <button className="btn btn-secondary" onClick={() => { setStep(1); setFileData(null); }}>
                                        ← Volver
                                    </button>
                                    <button className="btn btn-primary" onClick={handleSubmit} disabled={loading}>
                                        {loading ? '⏳ Creando...' : '🎫 Crear Caso'}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* STEP 3: Confirmation */}
                <div className={getStepClass(3)}>
                    <div className="step-number">3</div>
                    <div className="step-content">
                        <div className="step-title">Paso 3: Confirmación</div>
                        <div className="step-description">
                            {step < 3 ? 'Complete los pasos anteriores' : 'Caso creado exitosamente'}
                        </div>
                        {step === 3 && (
                            <div className="step-body">
                                <div style={{ textAlign: 'center', padding: '20px 0' }}>
                                    <div style={{ fontSize: 48, marginBottom: 12 }}>🎉</div>
                                    <h3 style={{ color: 'var(--color-success)', marginBottom: 8 }}>{success}</h3>
                                    <p style={{ color: 'var(--color-text-secondary)', fontSize: 14, marginBottom: 20 }}>
                                        El caso ha sido registrado y se ha notificado a los supervisores.
                                    </p>
                                    <div className="btn-group" style={{ justifyContent: 'center' }}>
                                        <button className="btn btn-primary" onClick={() => navigate('/tickets')}>
                                            📋 Ver Casos
                                        </button>
                                        <button className="btn btn-secondary" onClick={() => {
                                            setStep(1); setNumFile(''); setFileData(null);
                                            setTipoSolicitud(''); setDescripcion(''); setSelectedProveedor(null);
                                            setMonto(''); setSuccess(''); setError(''); setArchivos([]);
                                        }}>
                                            ➕ Crear Otro
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
