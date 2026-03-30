const { getConnection } = require('./config/db');

async function createTable() {
    try {
        const pool = await getConnection();
        await pool.request().query(`
            IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='notificaciones' and xtype='U')
            BEGIN
                CREATE TABLE [dbo].[notificaciones] (
                    [id_notificacion] INT IDENTITY(1,1) PRIMARY KEY,
                    [id_usuario_destino] INT NOT NULL,
                    [id_usuario_origen] INT NULL,
                    [id_ticket] INT NULL,
                    [titulo] NVARCHAR(255) NOT NULL,
                    [mensaje] NVARCHAR(MAX) NOT NULL,
                    [tipo] NVARCHAR(50) DEFAULT 'info',
                    [leido] BIT DEFAULT 0,
                    [fecha_creacion] DATETIME DEFAULT GETDATE()
                )
                PRINT 'Tabla creada';
            END
            ELSE
            BEGIN
                PRINT 'Tabla ya existe';
            END
        `);
        console.log('Migración completada');
    } catch (error) {
        console.error('Error:', error);
    }
    process.exit(0);
}

createTable();
