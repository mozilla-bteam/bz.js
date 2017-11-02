module.exports = {
  use: [
    ['@neutrinojs/library', {
      name: 'bz',
      externals: {
        whitelist: ['r2', 'query-string']
      }
    }],
    'neutrino-preset-mocha'
  ]
};
