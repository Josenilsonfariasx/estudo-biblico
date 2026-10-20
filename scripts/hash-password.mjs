// Gera as variáveis de login para o .env / Easypanel.
// Uso: npm run auth:setup -- <usuario> <senha>
import { randomBytes, scrypt } from "node:crypto";
import { promisify } from "node:util";

const [username, password] = process.argv.slice(2);
if (!username || !password) {
  console.error("Uso: npm run auth:setup -- <usuario> <senha>");
  process.exit(1);
}

// Mesmo formato de src/lib/password.ts.
const salt = randomBytes(16);
const hash = await promisify(scrypt)(password, salt, 64);

console.log(`AUTH_USERNAME="${username}"`);
console.log(`AUTH_PASSWORD_HASH="scrypt:${salt.toString("base64url")}:${hash.toString("base64url")}"`);
console.log(`AUTH_SECRET="${randomBytes(32).toString("base64url")}"`);
