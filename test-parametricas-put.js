const dotenv = require('dotenv');
dotenv.config({ path: './backend/.env' });
const { getConnection, sql } = require('./backend/config/db');

async function testPut() {
    try {
        const pool = await getConnection();
        const request = pool.request();
        
        const body = {
            nombre: "Autorizador devoluciones",
            descripcion: "Autoriza devoluciones",
            accesos_menu: '["/dashboard"]',
            visibilidad_estados_tipo: "especificos",
            estados_permitidos: '[1,2]'
        };

        const updatePoints = Object.keys(body).map((k, i) => `${k} = @p${i}`).join(', ');
        Object.values(body).forEach((v, i) => request.input('p' + i, v));
        request.input('id', sql.Int, 4); 

        const queryStr = `UPDATE roles SET ${updatePoints} WHERE id_rol = @id`;
        console.log("EXECUTING:", queryStr);

        await request.query(queryStr);
        console.log("SUCCESS!");
        
    } catch (err) {
        console.error("ERROR:");
        console.error(err);
    } finally {
        process.exit();
    }
}
testPut();
