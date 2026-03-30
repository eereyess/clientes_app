-- =============================================
-- BASE DE DATOS: gclientes
-- Sistema de Gestión de Tickets de Devoluciones y Reclamos
-- =============================================

-- USE master;
-- GO
-- CREATE DATABASE gclientes;
-- GO
-- USE gclientes;
-- GO

-- =============================================
-- TABLAS PARAMÉTRICAS
-- =============================================

CREATE TABLE roles (
    id_rol INT IDENTITY(1,1) PRIMARY KEY,
    nombre NVARCHAR(50) NOT NULL UNIQUE,
    descripcion NVARCHAR(200),
    activo BIT DEFAULT 1,
    fecha_creacion DATETIME DEFAULT GETDATE()
);

CREATE TABLE tipos_solicitud (
    id_tipo INT IDENTITY(1,1) PRIMARY KEY,
    nombre NVARCHAR(100) NOT NULL UNIQUE,
    descripcion NVARCHAR(200),
    activo BIT DEFAULT 1,
    fecha_creacion DATETIME DEFAULT GETDATE()
);

CREATE TABLE estados (
    id_estado INT IDENTITY(1,1) PRIMARY KEY,
    nombre NVARCHAR(50) NOT NULL UNIQUE,
    color NVARCHAR(7) DEFAULT '#6B7280',
    orden INT DEFAULT 0,
    activo BIT DEFAULT 1,
    fecha_creacion DATETIME DEFAULT GETDATE()
);

CREATE TABLE configuracion_visual (
    id_config INT IDENTITY(1,1) PRIMARY KEY,
    clave NVARCHAR(50) NOT NULL UNIQUE,
    valor NVARCHAR(500),
    descripcion NVARCHAR(200),
    fecha_modificacion DATETIME DEFAULT GETDATE()
);

-- =============================================
-- TABLA USUARIOS
-- =============================================

CREATE TABLE usuarios (
    id_usuario INT IDENTITY(1,1) PRIMARY KEY,
    nombre NVARCHAR(100) NOT NULL,
    email NVARCHAR(150) NOT NULL UNIQUE,
    password_hash NVARCHAR(255) NOT NULL,
    id_rol INT NOT NULL,
    activo BIT DEFAULT 1,
    fecha_creacion DATETIME DEFAULT GETDATE(),
    ultimo_acceso DATETIME,
    FOREIGN KEY (id_rol) REFERENCES roles(id_rol)
);

-- =============================================
-- TABLA TICKETS
-- =============================================

CREATE TABLE tickets (
    id_ticket INT IDENTITY(1,1) PRIMARY KEY,
    numero_ticket NVARCHAR(20) NOT NULL UNIQUE,
    num_file NVARCHAR(20) NOT NULL,
    id_tipo_solicitud INT NOT NULL,
    descripcion NVARCHAR(MAX),
    proveedor_id NVARCHAR(20),
    proveedor_nombre NVARCHAR(200),
    agencia NVARCHAR(200),
    fecha_viaje DATE,
    destino NVARCHAR(200),
    operador NVARCHAR(200),
    monto DECIMAL(18,2) DEFAULT 0,
    id_estado INT NOT NULL,
    fecha_creacion DATETIME DEFAULT GETDATE(),
    fecha_actualizacion DATETIME DEFAULT GETDATE(),
    id_usuario_creacion INT NOT NULL,
    FOREIGN KEY (id_tipo_solicitud) REFERENCES tipos_solicitud(id_tipo),
    FOREIGN KEY (id_estado) REFERENCES estados(id_estado),
    FOREIGN KEY (id_usuario_creacion) REFERENCES usuarios(id_usuario)
);

-- =============================================
-- TABLA AUTORIZACIONES
-- =============================================

CREATE TABLE autorizaciones (
    id_autorizacion INT IDENTITY(1,1) PRIMARY KEY,
    id_ticket INT NOT NULL,
    id_usuario_autoriza INT NOT NULL,
    fecha DATETIME DEFAULT GETDATE(),
    decision NVARCHAR(20) NOT NULL, -- 'aprobado' | 'rechazado'
    comentario NVARCHAR(MAX),
    FOREIGN KEY (id_ticket) REFERENCES tickets(id_ticket),
    FOREIGN KEY (id_usuario_autoriza) REFERENCES usuarios(id_usuario)
);

-- =============================================
-- TABLA MENSAJES
-- =============================================

CREATE TABLE mensajes (
    id_mensaje INT IDENTITY(1,1) PRIMARY KEY,
    id_usuario_destino INT NOT NULL,
    id_usuario_origen INT,
    id_ticket INT,
    asunto NVARCHAR(200),
    mensaje NVARCHAR(MAX) NOT NULL,
    leido BIT DEFAULT 0,
    fecha DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (id_usuario_destino) REFERENCES usuarios(id_usuario),
    FOREIGN KEY (id_usuario_origen) REFERENCES usuarios(id_usuario),
    FOREIGN KEY (id_ticket) REFERENCES tickets(id_ticket)
);

-- =============================================
-- DATOS INICIALES
-- =============================================

-- Roles
INSERT INTO roles (nombre, descripcion) VALUES
('Administrador', 'Acceso total al sistema'),
('Supervisor', 'Supervisión y autorización de tickets'),
('Ejecutivo', 'Creación y gestión de tickets'),
('Autorizador', 'Autorización de solicitudes');

-- Tipos de solicitud
INSERT INTO tipos_solicitud (nombre, descripcion) VALUES
('Reclamo', 'Reclamo por servicio deficiente o incumplimiento'),
('Devolución', 'Solicitud de devolución de dinero'),
('Otras', 'Otras solicitudes no categorizadas');

-- Estados
INSERT INTO estados (nombre, color, orden) VALUES
('Nuevo', '#3B82F6', 1),
('En revisión', '#F59E0B', 2),
('Pendiente autorización', '#8B5CF6', 3),
('Aprobado', '#10B981', 4),
('Rechazado', '#EF4444', 5),
('Cerrado', '#6B7280', 6);

-- Configuración visual
INSERT INTO configuracion_visual (clave, valor, descripcion) VALUES
('color_primario', '#0D9488', 'Color principal de la aplicación'),
('color_secundario', '#134E4A', 'Color secundario'),
('color_acento', '#14B8A6', 'Color de acento'),
('nombre_empresa', 'GClientes Tourism', 'Nombre de la empresa'),
('logo_url', '', 'URL del logo institucional');

-- Usuario administrador por defecto (password: admin123)
INSERT INTO usuarios (nombre, email, password_hash, id_rol) VALUES
('Administrador', 'admin@gclientes.com', '$2b$10$defaulthashplaceholder', 1);
