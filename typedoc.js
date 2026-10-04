module.exports = {
  entryPoints: ['src/**/*.ts'],
  entryPointStrategy: 'expand',
  tsconfig: 'tsconfig.json',
  plugin: ['typedoc-plugin-markdown'],
  out: 'docs/typedoc-md',
  excludePrivate: true,
  excludeProtected: true,
  excludeExternals: true,
};
