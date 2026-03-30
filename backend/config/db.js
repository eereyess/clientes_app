const sql = require('mssql');
require('dotenv').config();

const config = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    server: process.env.DB_SERVER,
    pool: {
        max: 10,
        min: 0,
        idleTimeoutMillis: 30000
    },
    options: {
        encrypt: false,
        trustServerCertificate: true // Importante para conexiones remotas a Google VM
    }
};

let poolPromise = null;

const getConnection = async () => {
    try {
        if (!poolPromise) {
            console.log(`📡 Conectando a Base de Datos SQL Server en ${process.env.DB_SERVER}...`);
            poolPromise = sql.connect(config);
        }
        return await poolPromise;
    } catch (err) {
        console.error('❌ Error de conexión a Base de Datos:', err);
        poolPromise = null;
        throw err;
    }
}

module.exports = {
    getConnection,
    sql
};
