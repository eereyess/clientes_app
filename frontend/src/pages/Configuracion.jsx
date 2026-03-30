import { useState, useEffect } from 'react';
import api from '../api/client';

export default function Configuracion() {
    const [config, setConfig] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    useEffect(() => {
        api.get('/configuracion/all')
            .then(res => {
                let data = res.data;
                // Auto-fill fallback variables just in case the backend hasn't been restarted safely
                if (!data.find(c => c.clave === 'color_acento')) {
                    data.push({ id_config: 31, clave: 'color_acento', valor: '#d076c0', descripcion: 'Color de acento (botones)' });
                }
                if (!data.find(c => c.clave === 'color_borde')) {
                    data.push({ id_config: 32, clave: 'color_borde', valor: '#d076c0', descripcion: 'Color de bordes de cuadros' });
                }
                setConfig(data);
            })
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    const updateConfig = (clave, valor) => {
        setConfig(prev => prev.map(c => c.clave === clave ? { ...c, valor } : c));
        setSaved(false);

        // Inject variables dynamically for live-preview
        if (clave === 'color_primario') {
            document.documentElement.style.setProperty('--color-primary', valor);
            document.documentElement.style.setProperty('--color-primary-light', `color-mix(in srgb, ${valor} 15%, #eff6ff)`);
            document.documentElement.style.setProperty('--color-primary-dark', `color-mix(in srgb, ${valor} 80%, black)`);
        }
        if (clave === 'color_secundario') document.documentElement.style.setProperty('--color-secondary', valor);
        if (clave === 'color_acento') {
            document.documentElement.style.setProperty('--color-accent', valor);
            document.documentElement.style.setProperty('--color-border-focus', valor);
        }
        if (clave === 'color_fondo') document.documentElement.style.setProperty('--color-bg', valor);
        if (clave === 'color_borde') {
            document.documentElement.style.setProperty('--color-border', valor);
            document.documentElement.style.setProperty('--color-border-card', valor);
        }
    };

    const saveAll = async () => {
        setSaving(true);
        try {
            for (const c of config) {
                await api.put(`/configuracion/${c.clave}`, { valor: c.valor });
            }
            setSaved(true);
            setTimeout(() => setSaved(false), 3000);
        } catch (err) {
            alert('Error al guardar configuración');
        } finally {
            setSaving(false);
        }
    };

    const getConfig = (clave) => config.find(c => c.clave === clave)?.valor || '';
    const colorConfig = config.filter(c => c.clave.startsWith('color_'));
    const otherConfig = config.filter(c => !c.clave.startsWith('color_') && !c.clave.startsWith('smtp_'));

    if (loading) return <div className="page-container"><div className="empty-state"><div className="empty-state-icon">⏳</div><h3>Cargando...</h3></div></div>;

    return (
        <div className="page-container fade-in">
            <div className="page-header">
                <div>
                    <h1>Configuración Visual</h1>
                    <p className="page-header-subtitle">Personalice la apariencia del sistema</p>
                </div>
                <div className="btn-group">
                    {saved && <span style={{ color: 'var(--color-success)', fontWeight: 600, fontSize: 14 }}>✅ Guardado</span>}
                    <button className="btn btn-primary" onClick={saveAll} disabled={saving}>
                        {saving ? '⏳...' : '💾 Guardar Cambios'}
                    </button>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, maxWidth: 900 }}>
                {/* Colors */}
                <div className="card">
                    <div className="card-header"><h2>🎨 Paleta de Colores</h2></div>
                    <div className="card-body">
                        {colorConfig.map(c => (
                            <div className="form-group" key={c.clave}>
                                <label className="form-label">{c.descripcion || c.clave}</label>
                                <div className="color-preview">
                                    <input
                                        type="color"
                                        className="color-swatch"
                                        value={c.valor || '#000000'}
                                        onChange={e => updateConfig(c.clave, e.target.value)}
                                    />
                                    <input
                                        className="form-input color-input-hex"
                                        value={c.valor || ''}
                                        onChange={e => updateConfig(c.clave, e.target.value)}
                                        placeholder="#000000"
                                    />
                                </div>
                            </div>
                        ))}

                        {/* Preview */}
                        <div style={{ marginTop: 20 }}>
                            <label className="form-label">Vista Previa</label>
                            <div style={{
                                padding: 20,
                                borderRadius: 'var(--radius-lg)',
                                background: `linear-gradient(135deg, ${getConfig('color_primario')}, ${getConfig('color_secundario')})`,
                                color: 'white',
                                textAlign: 'center'
                            }}>
                                <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>{getConfig('nombre_empresa') || 'GClientes'}</h3>
                                <p style={{ fontSize: 13, opacity: 0.8 }}>Sistema de Gestión de Casos</p>
                                <button style={{
                                    marginTop: 12,
                                    background: 'var(--color-accent)',
                                    color: 'white',
                                    border: 'none',
                                    padding: '8px 20px',
                                    borderRadius: 8,
                                    fontWeight: 600,
                                    fontSize: 13,
                                    cursor: 'pointer'
                                }}>
                                    Botón de ejemplo
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* General settings */}
                <div className="card">
                    <div className="card-header"><h2>⚙️ General</h2></div>
                    <div className="card-body">
                        {otherConfig.map(c => (
                            <div className="form-group" key={c.clave}>
                                <label className="form-label">{c.descripcion || c.clave}</label>
                                {c.clave === 'logo_url' ? (
                                    <>
                                        <input
                                            className="form-input"
                                            value={c.valor || ''}
                                            onChange={e => updateConfig(c.clave, e.target.value)}
                                            placeholder="https://ejemplo.com/logo.png"
                                        />
                                        {c.valor && (
                                            <div style={{ marginTop: 8, padding: 12, background: 'var(--color-bg)', borderRadius: 'var(--radius-md)', textAlign: 'center' }}>
                                                <img src={c.valor} alt="Logo" style={{ maxHeight: 60, maxWidth: '100%' }} onError={e => e.target.style.display = 'none'} />
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    <input
                                        className="form-input"
                                        value={c.valor || ''}
                                        onChange={e => updateConfig(c.clave, e.target.value)}
                                    />
                                )}
                            </div>
                        ))}

                        <div className="form-group" style={{ marginTop: 24 }}>
                            <label className="form-label">Información del Sistema</label>
                            <div style={{ background: 'var(--color-bg)', padding: 16, borderRadius: 'var(--radius-md)', fontSize: 13, color: 'var(--color-text-secondary)' }}>
                                <p>📌 <strong>Versión:</strong> 1.0.0</p>
                                <p>📌 <strong>Motor BD:</strong> SQL Server</p>
                                <p>📌 <strong>BD Aplicación:</strong> gclientes</p>
                                <p>📌 <strong>BD BackOffice:</strong> Oris1</p>
                                <p>📌 <strong>API:</strong> RESTful + JWT</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
