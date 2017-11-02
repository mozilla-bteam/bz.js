import assert from 'assert';
import { createClient } from '../src';
import authConfig from './test-config.json';

describe('tests attachments', () => {
  let bugzilla;

  before(() => {
    bugzilla = createClient(authConfig);
  });

  it('tests adding an attachment', async () => {
    const id = await bugzilla.createAttachment(9955, {
      file_name: 'test.diff',
      summary: 'Test Attachment',
      data: 'supposedtobeencoded',
      encoding: 'base64',
      description: 'this is a test patch',
      comment: 'this is the comment',
      content_type: 'text/plain'
    });

    assert.equal(typeof id, 'string');
  });

  it('tests creating attachment in api-dev', async () => {
    const client = createClient({
      url: 'https://api-dev.bugzilla.mozilla.org/test/latest/',
      username: 'testbzapi@gmail.com',
      password: 'password'
    });
    const id = await client.createAttachment(9955, {
      file_name: 'test.diff',
      data: 'supposedtobeencoded',
      encoding: 'base64',
      description: 'test patch',
      content_type: 'text/plain'
    });

    assert.equal(typeof id, 'number');
  });

  it('tests getting an attachment in api-dev', async () => {
    const client = createClient({
      url: 'https://api-dev.bugzilla.mozilla.org/test/latest/',
      username: 'testbzapi@gmail.com',
      password: 'password'
    });
    const attachment = await client.getAttachment(1785);

    assert.ok(attachment.bug_id);
  });

  it('tests updating an attachment in api-dev', async () => {
    const client = createClient({
      url: 'https://api-dev.bugzilla.mozilla.org/test/latest/',
      username: 'testbzapi@gmail.com',
      password: 'password'
    });
    const attachment = await client.getAttachment(1785);

    attachment.is_patch = '1';

    return bugzilla.updateAttachment(1785, attachment);
  });

  it('tests getting an attachment', async () => {
    const attachment = await bugzilla.getAttachment(1785);

    assert.ok(attachment.bug_id);
  });

  it('tests updating an attachment', async () => {
    const attachment = await bugzilla.getAttachment(1785);

    attachment.is_patch = '1';
    return bugzilla.updateAttachment(1785, attachment);
  });
});
