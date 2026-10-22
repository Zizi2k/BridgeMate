import {defineConfig} from 'drizzle-kit';
export default defineConfig({schema:'./db/schema.ts',out:'./mysql/migrations',dialect:'mysql'});
