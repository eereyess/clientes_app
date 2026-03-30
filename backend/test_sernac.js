import axios from 'axios';

async function test() {
    try {
        const login = await axios.post('http://localhost:3000/api/auth/login', {
            email: 'ejecutivo@gclientes.com',
            password: 'admin' // wait, mock.js has password_hash. Is it admin123? Let me test admin123.
        });

        const token = login.data.token;
        console.log('Logged in', token.slice(0, 10));

        // Use FormData as TicketNuevo uses it
        const FormData = require('form-data');
        const form = new FormData();
        form.append('num_file', '15230');
        form.append('id_tipo_solicitud', '1');
        form.append('descripcion', 'test sernac true');
        form.append('sernac', 'true');

        const res = await axios.post('http://localhost:3000/api/tickets', form, {
            headers: {
                ...form.getHeaders(),
                Authorization: `Bearer ${token}`
            }
        });

        console.log('Created ticket:', res.data.numero_ticket);

        const getRes = await axios.get(`http://localhost:3000/api/tickets/${res.data.id_ticket}`, {
            headers: { Authorization: `Bearer ${token}` }
        });

        console.log('Ticket Sernac?', getRes.data.sernac);
    } catch (err) {
        console.error(err.response?.data || err.message);
    }
}
test();
