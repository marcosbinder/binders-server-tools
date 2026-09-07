const { Client } = require('pg');
require('dotenv').config();

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
    console.error('[ERRO] DATABASE_URL não definida nas variáveis de ambiente (.env).');
    process.exit(1);
}

async function seedOwner() {
    const client = new Client({
        connectionString,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        const ownerId = process.env.OWNER_ID || '659214571634032667';

        await client.query(`
            INSERT INTO public.users ("userId", "tosVersion", "language", "isDeveloper")
            VALUES ($1, 2, 'pt_BR', 1)
            ON CONFLICT ("userId") DO UPDATE 
            SET "isDeveloper" = 1, "tosVersion" = 2, "language" = 'pt_BR';
        `, [ownerId]);

        const res = await client.query(`SELECT * FROM public.users WHERE "userId" = $1`, [ownerId]);
        console.log('[Supabase] Owner registrado e verificado com sucesso:');
        console.log(res.rows[0]);
    } catch (err) {
        console.error('[Supabase] Erro ao registrar owner:', err.message);
    } finally {
        await client.end();
    }
}

seedOwner();
