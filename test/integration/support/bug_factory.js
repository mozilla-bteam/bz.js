function factory(overrides) {
  var base = {
    // these are BMO specific
    product: 'Testing',
    component: 'Marionette',
    summary: 'test bug!',
    version: 'unspecified', // this is a made up number
    op_sys: 'All',
    priority: 'P1',
    platform: 'All'
  };

  if (overrides) {
    for (var key in overrides) base[key] = overrides[key];
  }

  return base;
}

module.exports = factory;
