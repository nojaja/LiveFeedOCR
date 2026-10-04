module.exports = {
  forbidden: [
    {
      name: 'domain-must-not-depend-on-other-layers',
      severity: 'error',
      from: { path: '^src/domain' },
      to: { pathNot: '^src/domain' },
    },
    {
      name: 'application-must-not-depend-on-adapters-or-ui',
      severity: 'error',
      from: { path: '^src/application' },
      to: { path: '^src/(infrastructure|composables|components)' },
    },
    {
      name: 'no-circular-dependencies',
      severity: 'error',
      from: {},
      to: { circular: true },
    },
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    tsPreCompilationDeps: true,
  },
};
