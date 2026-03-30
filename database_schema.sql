-- Script para crear la base de datos y tablas de GClientes
-- Para Microsoft SQL Server

CREATE DATABASE gclientes;
GO

USE gclientes;
GO

-- 1. Tabla Roles
CREATE TABLE roles (
    id_rol INT PRIMARY KEY IDENTITY(1,1),
    nombre NVARCHAR(100) NOT NULL,
    descripcion NVARCHAR(255),
    activo BIT DEFAULT 1,
    accesos_menu NVARCHAR(MAX), -- JSON array de strings
    visibilidad_estados_tipo NVARCHAR(50),
    estados_permitidos NVARCHAR(MAX) -- JSON array de ints
);
GO

-- 2. Tabla Tipos de Solicitud
CREATE TABLE tipos_solicitud (
    id_tipo INT PRIMARY KEY IDENTITY(1,1),
    nombre NVARCHAR(100) NOT NULL,
    descripcion NVARCHAR(255),
    activo BIT DEFAULT 1
);
GO

-- 3. Tabla Estados
CREATE TABLE estados (
    id_estado INT PRIMARY KEY IDENTITY(1,1),
    nombre NVARCHAR(100) NOT NULL,
    color NVARCHAR(20) NOT NULL,
    orden INT NOT NULL,
    activo BIT DEFAULT 1
);
GO

-- 4. Tabla Usuarios
CREATE TABLE usuarios (
    id_usuario INT PRIMARY KEY IDENTITY(1,1),
    nombre NVARCHAR(150) NOT NULL,
    email NVARCHAR(150) UNIQUE NOT NULL,
    password_hash NVARCHAR(255) NOT NULL,
    id_rol INT FOREIGN KEY REFERENCES roles(id_rol),
    activo BIT DEFAULT 1,
    fecha_creacion DATETIME DEFAULT GETDATE(),
    visibilidad NVARCHAR(50) DEFAULT 'todos',
    usuarios_visibles NVARCHAR(MAX), -- JSON array
    recibe_notificaciones BIT DEFAULT 1,
    estados_notificacion NVARCHAR(MAX) -- JSON array
);
GO

-- 5. Tabla Tickets
CREATE TABLE tickets (
    id_ticket INT PRIMARY KEY IDENTITY(1,1),
    numero_ticket NVARCHAR(50) UNIQUE NOT NULL,
    num_file NVARCHAR(50),
    tipof NVARCHAR(100),
    id_tipo_solicitud INT FOREIGN KEY REFERENCES tipos_solicitud(id_tipo),
    descripcion NVARCHAR(MAX),
    proveedor_id NVARCHAR(50),
    proveedor_nombre NVARCHAR(255),
    agencia NVARCHAR(150),
    fecha_viaje DATE,
    destino NVARCHAR(150),
    operador NVARCHAR(150),
    pasajero NVARCHAR(200),
    monto DECIMAL(18,2) DEFAULT 0,
    moneda NVARCHAR(10),
    credito_proveedor BIT DEFAULT 0,
    cuentas_corrientes NVARCHAR(MAX), -- JSON
    nota_credito NVARCHAR(MAX),       -- JSON
    descripcion_html NVARCHAR(MAX),
    id_estado INT FOREIGN KEY REFERENCES estados(id_estado),
    anulado BIT DEFAULT 0,
    fecha_creacion DATETIME DEFAULT GETDATE(),
    id_usuario_creacion INT FOREIGN KEY REFERENCES usuarios(id_usuario),
    archivos NVARCHAR(MAX),           -- JSON
    sernac BIT DEFAULT 0
);
GO

-- 6. Tabla Historial Estados
CREATE TABLE historial_estados (
    id INT PRIMARY KEY IDENTITY(1,1),
    id_ticket INT FOREIGN KEY REFERENCES tickets(id_ticket),
    id_estado_anterior INT NULL FOREIGN KEY REFERENCES estados(id_estado),
    id_estado_nuevo INT FOREIGN KEY REFERENCES estados(id_estado),
    descripcion NVARCHAR(MAX),
    id_usuario INT FOREIGN KEY REFERENCES usuarios(id_usuario),
    fecha DATETIME DEFAULT GETDATE(),
    archivos NVARCHAR(MAX) -- JSON
);
GO

-- 7. Tabla Autorizaciones
CREATE TABLE autorizaciones (
    id_autorizacion INT PRIMARY KEY IDENTITY(1,1),
    id_ticket INT FOREIGN KEY REFERENCES tickets(id_ticket),
    id_usuario_autoriza INT FOREIGN KEY REFERENCES usuarios(id_usuario),
    fecha DATETIME DEFAULT GETDATE(),
    decision NVARCHAR(50),
    comentario NVARCHAR(MAX)
);
GO

-- 8. Tabla Mensajes
CREATE TABLE mensajes (
    id_mensaje INT PRIMARY KEY IDENTITY(1,1),
    id_usuario_destino INT FOREIGN KEY REFERENCES usuarios(id_usuario),
    id_usuario_origen INT NULL FOREIGN KEY REFERENCES usuarios(id_usuario),
    id_ticket INT NULL FOREIGN KEY REFERENCES tickets(id_ticket),
    asunto NVARCHAR(255),
    mensaje NVARCHAR(MAX),
    leido BIT DEFAULT 0,
    fecha DATETIME DEFAULT GETDATE()
);
GO

-- 9. Tabla Configuración Visual
CREATE TABLE configuracion_visual (
    id_config INT PRIMARY KEY IDENTITY(1,1),
    clave NVARCHAR(100) UNIQUE NOT NULL,
    valor NVARCHAR(MAX),
    descripcion NVARCHAR(255)
);
GO

-- 10. Tabla Plantillas Mail
CREATE TABLE plantillas_mail (
    id_plantilla INT PRIMARY KEY IDENTITY(1,1),
    id_estado INT FOREIGN KEY REFERENCES estados(id_estado),
    asunto NVARCHAR(255),
    cuerpo_html NVARCHAR(MAX)
);
GO

-- Insertar Configuración Visual por Defecto
INSERT INTO configuracion_visual (clave, valor, descripcion) VALUES
('color_primario', '#FFFFFF', 'Color principal (fondos/menús)'),
('color_secundario', '#f1f5f9', 'Color secundario (hovers)'),
('color_fondo', '#f5f7fb', 'Color de fondo general'),
('color_acento', '#d076c0', 'Color de acento (botones)'),
('color_borde', '#d076c0', 'Color de bordes de cuadros'),
('nombre_empresa', 'GClientes Tourism', 'Nombre empresa'),
('logo_url', '', 'URL del logo'),
('smtp_server', 'smtp.ejemplo.com', 'Servidor SMTP'),
('smtp_user', 'notificaciones@ejemplo.com', 'Usuario SMTP'),
('smtp_password', '', 'Contraseña SMTP'),
('smtp_port', '587', 'Puerto SMTP'),
('smtp_secure', 'false', 'Usar conexión segura (SSL/TLS)');
GO

-- Insertar Estados Base
INSERT INTO estados (nombre, color, orden, activo) VALUES
('Nuevo', '#3B82F6', 1, 1),
('En revisión', '#F59E0B', 2, 1),
('Pendiente autorización', '#8B5CF6', 3, 1),
('Aprobado', '#10B981', 4, 1),
('Rechazado', '#EF4444', 5, 1),
('Cerrado', '#6B7280', 6, 1),
('Anulado', '#991B1B', 7, 1);
GO

-- Insertar Tipos de Solicitud Base
INSERT INTO tipos_solicitud (nombre, descripcion, activo) VALUES
('Reclamo', 'Reclamo por servicio deficiente', 1),
('Devolución', 'Solicitud de devolución de dinero', 1),
('Otras', 'Otras solicitudes', 1);
GO

-- Insertar Rol Administrador
INSERT INTO roles (nombre, descripcion, activo, accesos_menu, visibilidad_estados_tipo, estados_permitidos) VALUES
('Administrador', 'Acceso total al sistema', 1, '["/dashboard", "/tickets", "/tickets/nuevo", "/mensajes", "/estadisticas", "/usuarios", "/parametricas", "/configuracion", "/plantillas"]', 'todos', '[]');
GO

-- Clave "admin123" usando Bcrypt:
INSERT INTO usuarios (nombre, email, password_hash, id_rol, activo, visibilidad, usuarios_visibles, recibe_notificaciones, estados_notificacion) VALUES
('Administrador', 'admin@gclientes.com', '$2a$10$wT3wYyI4ZXVw9Poy0nZ7P.jC2A2o2VjM4T7/4lMmVZXZYv3y5t7vK', 1, 1, 'todos', '[]', 1, '[4, 5, 7]');
GO
