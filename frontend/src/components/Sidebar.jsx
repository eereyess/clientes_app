import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useState, useEffect } from 'react';
import api from '../api/client';
import {
    LayoutDashboard, Ticket, PlusCircle, Mail, BarChart3,
    Users, SlidersHorizontal, Palette, FileText, LogOut, Menu, ChevronLeft
} from 'lucide-react';

export default function Sidebar({ isCollapsed, toggleSidebar }) {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [unreadCount, setUnreadCount] = useState(0);

    useEffect(() => {
        api.get('/mensajes/unread-count')
            .then(res => setUnreadCount(res.data.count))
            .catch(() => { });
        const interval = setInterval(() => {
            api.get('/mensajes/unread-count')
                .then(res => setUnreadCount(res.data.count))
                .catch(() => { });
        }, 30000);
        return () => clearInterval(interval);
    }, []);

    const isActive = (path) => {
        const current = location.pathname;
        if (path === '/dashboard' || path === '/') return current === '/' || current === '/dashboard';
        if (path === '/tickets') {
            return current.startsWith('/tickets') && !current.startsWith('/tickets/nuevo');
        }
        return current.startsWith(path);
    };

    const handleLogout = () => { logout(); navigate('/login'); };

    const navItems = [
        {
            section: 'Principal', items: [
                { path: '/dashboard', Icon: LayoutDashboard, label: 'Inicio' },
                { path: '/tickets', Icon: Ticket, label: 'Casos' },
                { path: '/tickets/nuevo', Icon: PlusCircle, label: 'Nuevo Caso' },
            ]
        },
        {
            section: 'Gestión', items: [
                { path: '/mensajes', Icon: Mail, label: 'Mensajes', badge: unreadCount },
                { path: '/estadisticas', Icon: BarChart3, label: 'Estadísticas' },
            ]
        },
        {
            section: 'Administración', items: [
                { path: '/usuarios', Icon: Users, label: 'Usuarios' },
                { path: '/parametricas', Icon: SlidersHorizontal, label: 'Paramétricas' },
                { path: '/configuracion', Icon: Palette, label: 'Configuración' },
                { path: '/plantillas', Icon: FileText, label: 'Plantillas Mail' },
            ]
        },
    ];

    const initials = user?.nombre?.split(' ').map(n => n[0]).join('').substring(0, 2) || 'U';

    const filteredNavItems = navItems.map(section => ({
        ...section,
        items: section.items.filter(item => {
            if (!user?.accesos_menu || user.accesos_menu.length === 0) return true;
            return user.accesos_menu.includes(item.path);
        })
    })).filter(section => section.items.length > 0);

    return (
        <nav className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}>
            <div className="sidebar-logo" style={{ background: '#fff', padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: isCollapsed ? 'center' : 'space-between' }}>
                <img src="/logopanam.png" alt="Panam Logo" style={{ maxWidth: isCollapsed ? '40px' : '150px', transition: 'max-width 0.3s' }} />
                <button className="sidebar-toggle" style={{ color: '#000', margin: isCollapsed ? '0' : '0 0 0 10px', display: isCollapsed ? 'none' : 'flex' }} onClick={toggleSidebar}>
                    <ChevronLeft size={20} />
                </button>
            </div>
            {isCollapsed && (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '15px 0', borderBottom: '1px solid #e2e8f0' }}>
                    <button
                        onClick={toggleSidebar}
                        style={{
                            background: 'var(--color-primary)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            padding: '10px 14px',
                            fontSize: '20px',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}
                        title="Abrir menú"
                    >
                        <Menu size={20} />
                    </button>
                </div>
            )}

            <div className="sidebar-nav">
                {filteredNavItems.map(section => (
                    <div key={section.section} className="sidebar-section">
                        <div className="sidebar-section-title">{section.section}</div>
                        {section.items.map(item => (
                            <button
                                key={item.path}
                                className={`sidebar-link${isActive(item.path) ? ' active' : ''}`}
                                onClick={() => navigate(item.path)}
                            >
                                <span className="icon"><item.Icon size={18} strokeWidth={1.8} /></span>
                                <span className="sidebar-link-label">{item.label}</span>
                                {item.badge > 0 && <span className="sidebar-badge">{item.badge}</span>}
                            </button>
                        ))}
                    </div>
                ))}
            </div>

            <div className="sidebar-user">
                <div className="sidebar-avatar">{initials}</div>
                <div className="sidebar-user-info">
                    <div className="sidebar-user-name">{user?.nombre}</div>
                    <div className="sidebar-user-role">{user?.rol}</div>
                </div>
                <button className="sidebar-logout" onClick={handleLogout} title="Cerrar sesión">
                    <LogOut size={18} />
                </button>
            </div>
        </nav>
    );
}
