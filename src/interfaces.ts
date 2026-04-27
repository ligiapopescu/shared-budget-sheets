// Barrel re-export. Domain types live in src/interfaces/<domain>.ts.
// Existing call sites import from '@/interfaces' — keep that working.
export * from './interfaces/category';
export * from './interfaces/expense';
export * from './interfaces/income';
