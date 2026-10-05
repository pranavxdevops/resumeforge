import fs from 'node:fs/promises';
import {randomBytes} from 'node:crypto';
const exists=await fs.access('.env').then(()=>true).catch(()=>false);
if(exists){console.log('.env already exists. Existing configuration preserved.');process.exit(0);}
const compose=process.argv.includes('--compose');
const content=`NODE_ENV=development\nAPP_URL=http://localhost:${compose?'8080':'5173'}\nSESSION_SECRET=${randomBytes(32).toString('hex')}\nPOSTGRES_PASSWORD=${randomBytes(24).toString('hex')}\nSTORAGE_ACCESS_KEY=resumeforge-local\nSTORAGE_SECRET_KEY=${randomBytes(32).toString('hex')}\nALLOW_INSECURE_LOCAL_COOKIES=${compose?'true':'false'}\nAI_API_KEY=\n`;
await fs.writeFile('.env',content,{mode:0o600});console.log('Created local .env with independent random secrets. Values were not printed.');
