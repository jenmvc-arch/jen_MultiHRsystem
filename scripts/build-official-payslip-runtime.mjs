import { build } from 'esbuild';

await build({
  entryPoints: ['api/_lib/officialPayslipPdf.tsx'],
  bundle: true,
  format: 'esm',
  platform: 'node',
  target: 'es2022',
  jsx: 'automatic',
  external: ['node:*', 'react', '@react-pdf/renderer'],
  outfile: 'api/_lib/officialPayslipPdf.js',
});
