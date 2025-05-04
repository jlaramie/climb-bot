import esbuild from 'esbuild';

esbuild.build({
  entryPoints: {
    healthcheck: './src/functions/healthcheck.ts',
    interaction: './src/functions/interaction.ts'
  },
  outdir: './dist',
  bundle: true,
  splitting: false,
  platform: 'node',
  minify: true,
  treeShaking: true,
  sourcemap: true
});
