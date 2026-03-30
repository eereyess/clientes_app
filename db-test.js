const { getConnection, sql } = require('./backend/config/db');
async function test() {
  const pool = await getConnection();
  const request = pool.request();
  request.input('p0', '[1, 2]');
  request.input('p1', 'especificos');
  request.input('id', sql.Int, 1);
  await request.query(`UPDATE roles SET estados_permitidos = @p0, visibilidad_estados_tipo = @p1 WHERE id_rol = @id`);
  console.log('Update Success');
  process.exit(0);
}
test().catch(console.error);
