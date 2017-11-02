import { createClient } from '../src';

describe('test using an api_key', function() {
  this.timeout(10000);

  let bugzilla;

  before(() => {
    bugzilla = createClient({
      apiKey: 'zWHkdtvzAwoG2AfQMcTfyJdIWRUPVyJzgszM3g1Z',
      url: 'https://landfill.bugzilla.org/bugzilla-tip/rest/'
    });
  });

  it('tests changing a bug using only an api_key', () => {
    return bugzilla.updateBug(27114, {
      url: 'https://landfill.bugzilla.org/bugzilla-tip/show_bug.cgi?id=27114'
    });
  });
});
