import assert from 'assert';
import { createClient } from '../src';

describe('api-dev configuration', () => {
  let bugzilla;

  before(() => {
    bugzilla = createClient({
      url: 'https://api-dev.bugzilla.mozilla.org/test/latest/',
      username: 'testbzapi@gmail.com',
      password: 'password'
    });
  });

  it('search users', async () => {
    const config = await bugzilla.getConfiguration({});

    assert.ok(config.version);
  });
});
