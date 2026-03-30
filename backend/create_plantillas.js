const { getConnection } = require('./config/db');

async function createTable() {
    try {
        const pool = await getConnection();
        await pool.request().query(`
            IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='plantillas_mail' and xtype='U')
            BEGIN
                CREATE TABLE [dbo].[plantillas_mail] (
                    [id_plantilla] INT IDENTITY(1,1) PRIMARY KEY,
                    [id_estado] INT NOT NULL,
                    [asunto] NVARCHAR(255) NOT NULL,
                    [cuerpo_html] NVARCHAR(MAX) NOT NULL,
                    [fecha_creacion] DATETIME DEFAULT GETDATE(),
                    [activo] BIT DEFAULT 1
                )
                PRINT 'Tabla plantillas_mail creada';
            END
            ELSE
            BEGIN
                PRINT 'Tabla plantillas_mail ya existe';
            END
        `);
        console.log('Migración completada');
    } catch (error) {
        console.error('Error:', error);
    }
    process.exit(0);
}

createTable();
