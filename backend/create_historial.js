const sql = require('mssql');
require('dotenv').config();

async function run() {
    try {
        const pool = await sql.connect({
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
            server: process.env.DB_SERVER,
            options: { trustServerCertificate: true, encrypt: false }
        });

        await pool.request().query(`
            IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'historial_estados') AND type in (N'U'))
            BEGIN
                CREATE TABLE historial_estados (
                    id INT IDENTITY(1,1) PRIMARY KEY,
                    id_ticket INT NOT NULL,
                    id_estado_anterior INT NULL,
                    id_estado_nuevo INT NOT NULL,
                    descripcion NVARCHAR(MAX) NOT NULL,
                    archivos NVARCHAR(MAX),
                    id_usuario INT NOT NULL,
                    fecha DATETIME DEFAULT GETDATE(),
                    CONSTRAINT FK_historial_ticket FOREIGN KEY (id_ticket) REFERENCES tickets(id_ticket),
                    CONSTRAINT FK_historial_usuario FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario),
                    CONSTRAINT FK_historial_estado_ant FOREIGN KEY (id_estado_anterior) REFERENCES estados(id_estado),
                    CONSTRAINT FK_historial_estado_nuevo FOREIGN KEY (id_estado_nuevo) REFERENCES estados(id_estado)
                )
                PRINT 'Table historial_estados created'
            END
            ELSE
            BEGIN
                PRINT 'Table historial_estados already exists'
            END
        `);
        console.log('Done');
    } catch (err) {
        console.error(err);
    } finally {
        process.exit();
    }
}
run();
