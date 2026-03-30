import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import TicketNuevo from './pages/TicketNuevo';
import TicketLista from './pages/TicketLista';
import TicketDetalle from './pages/TicketDetalle';
import Mensajes from './pages/Mensajes';
import Usuarios from './pages/Usuarios';
import Parametricas from './pages/Parametricas';
import Estadisticas from './pages/Estadisticas';
import Configuracion from './pages/Configuracion';
import PlantillasMail from './pages/PlantillasMail';
import Sidebar from './components/Sidebar';

function ProtectedRoute({ children }) {
    const { user, loading } = useAuth();
    if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <div className="stat-icon primary" style={{ width: 60, height: 60, fontSize: 28 }}>⏳</div>
    </div>;
    if (!user) return <Navigate to="/login" />;
    return children;
}

function AppLayout() {
    const { user } = useAuth();
    const [isCollapsed, setIsCollapsed] = React.useState(false);
    const toggleSidebar = () => setIsCollapsed(!isCollapsed);

    return (
        <div className="app-layout">
            <Sidebar isCollapsed={isCollapsed} toggleSidebar={toggleSidebar} />
            <div className={`main-content ${isCollapsed ? 'collapsed' : ''}`}>
                <Routes>
                    <Route path="/" element={
                        (!user.accesos_menu || user.accesos_menu.length === 0 || user.accesos_menu.includes('/dashboard'))
                            ? <Navigate to="/dashboard" replace />
                            : <Navigate to="/tickets" replace />
                    } />
                    <Route path="/dashboard" element={
                        (!user.accesos_menu || user.accesos_menu.length === 0 || user.accesos_menu.includes('/dashboard'))
                            ? <Dashboard />
                            : <Navigate to="/tickets" replace />
                    } />
                    <Route path="/tickets/nuevo" element={<TicketNuevo />} />
                    <Route path="/tickets" element={<TicketLista />} />
                    <Route path="/tickets/:id" element={<TicketDetalle />} />
                    <Route path="/mensajes" element={<Mensajes />} />
                    <Route path="/usuarios" element={<Usuarios />} />
                    <Route path="/parametricas" element={<Parametricas />} />
                    <Route path="/estadisticas" element={<Estadisticas />} />
                    <Route path="/configuracion" element={<Configuracion />} />
                    <Route path="/plantillas" element={<PlantillasMail />} />
                </Routes>
            </div>
        </div>
    );
}

export default function App() {
    React.useEffect(() => {
        import('./api/client').then(mod => {
            mod.default.get('/configuracion/all').then(res => {
                const config = res.data;
                const getVal = key => config.find(c => c.clave === key)?.valor;

                const cPrimario = getVal('color_primario');
                const cSecundario = getVal('color_secundario');
                const cAcento = getVal('color_acento');
                const cFondo = getVal('color_fondo');
                const cBorde = getVal('color_borde');

                if (cPrimario) {
                    document.documentElement.style.setProperty('--color-primary', cPrimario);
                    document.documentElement.style.setProperty('--color-primary-light', `color-mix(in srgb, ${cPrimario} 15%, #eff6ff)`);
                    document.documentElement.style.setProperty('--color-primary-lighter', `color-mix(in srgb, ${cPrimario} 10%, #ffffff)`);
                    document.documentElement.style.setProperty('--color-primary-dark', `color-mix(in srgb, ${cPrimario} 80%, black)`);
                    document.documentElement.style.setProperty('--color-primary-darker', `color-mix(in srgb, ${cPrimario} 90%, black)`);
                }
                if (cSecundario) {
                    document.documentElement.style.setProperty('--color-secondary', cSecundario);
                }
                if (cAcento) {
                    document.documentElement.style.setProperty('--color-accent', cAcento);
                    document.documentElement.style.setProperty('--color-border-focus', cAcento);
                }
                if (cFondo) {
                    document.documentElement.style.setProperty('--color-bg', cFondo);
                }
                if (cBorde) {
                    document.documentElement.style.setProperty('--color-border', cBorde);
                    document.documentElement.style.setProperty('--color-border-card', cBorde);
                }
            }).catch(() => { });
        });
    }, []);

    return (
        <AuthProvider>
            <BrowserRouter>
                <Routes>
                    <Route path="/login" element={<Login />} />
                    <Route path="/*" element={
                        <ProtectedRoute>
                            <AppLayout />
                        </ProtectedRoute>
                    } />
                </Routes>
            </BrowserRouter>
        </AuthProvider>
    );
}
