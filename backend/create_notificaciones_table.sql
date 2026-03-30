CREATE TABLE [dbo].[notificaciones] (
    [id_notificacion] INT IDENTITY(1,1) PRIMARY KEY,
    [id_usuario_destino] INT NOT NULL,
    [id_usuario_origen] INT NULL,
    [id_ticket] INT NULL,
    [titulo] NVARCHAR(255) NOT NULL,
    [mensaje] NVARCHAR(MAX) NOT NULL,
    [tipo] NVARCHAR(50) DEFAULT 'info', -- 'info', 'warning', 'success', 'error'
    [leido] BIT DEFAULT 0,
    [fecha_creacion] DATETIME DEFAULT GETDATE(),
    -- FKs if needed, assuming id_usuario exists in usuarios, id_ticket in tickets
);
