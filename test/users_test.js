import assert from 'assert';
import { createClient } from '../src';
import authConfig from './test-config.json';

describe('bz.js users tests', () => {
  let bugzilla;

  before(() => {
    bugzilla = createClient(authConfig);
  });

  it('search users', async () => {
    const users = await bugzilla.searchUsers('jeff@burnitall.com');

    assert.ok(users.length);
  });

  it('gets a user', async () => {
    const user = await bugzilla.getUser('jeff@burnitall.com');

    assert.ok(user.id);
  });
});

describe('bz.js users tests api-dev', () => {
  let bugzilla;

  before(() => {
    bugzilla = createClient({
      url: 'https://api-dev.bugzilla.mozilla.org/test/latest/',
      username: 'testbzapi@gmail.com',
      password: 'password'
    });
  });

  it('search users', async () => {
    const users = await bugzilla.searchUsers('tom');

    assert.ok(users.length);
  });

  it('gets a user', async () => {
    const user = await bugzilla.getUser('testbzapi@gmail.com');

    assert.ok(user.id);
  });
});
