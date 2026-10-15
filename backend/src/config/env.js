import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';

// Carga backend/.env sin importar desde dónde se ejecute node
dotenv.config({ path: fileURLToPath(new URL('../../.env', import.meta.url)) });
