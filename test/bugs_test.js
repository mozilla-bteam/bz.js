import assert from 'assert';
import { createClient } from '../src';
import authConfig from './test-config.json';

describe('bz.js basic bug wrangling', () => {
  let bugzilla;

  before(() => {
    bugzilla = createClient(authConfig);
  });

  it('tests getting a bug', async () => {
    const bug = await bugzilla.getBug(6000);

    assert.ok(bug.summary);
  });

  it('tests getting bug history field', async () => {
    const bugs = await bugzilla.bugHistory(9955);

    assert.equal(bugs.length, 1);
    assert.ok(bugs[0].history);
  });

  it('tests searching for a bug', async () => {
    const bugs = await bugzilla.searchBugs({
      summary: 'window',
      summary_type: 'contains_all_words'
    });

    assert.ok(bugs.length);
  });

  // XXX this doesn't work, probably a bug in bugzilla. error is related
  // XXX to op_sys field:
  // XXX "Uncaught Error: You must select/enter a OS."
  it('tests creating a bug from scratch', async () => {
    const id = await bugzilla.createBug({
      product: 'FoodReplicator',
      component: 'SaltSprinkler',
      summary: 'Test whiteboard bug',
      whiteboard: '[devedition-40]',
      op_sys: 'Linux',
      platform: 'PC',
      version: '1.0'
    });

    assert.equal(typeof id, 'number');
  });

  // XXX this test needs to create a bug in order to update it.
  it('tests updating a bug with a new whiteboard', () => {
    return bugzilla.updateBug(9955, { whiteboard: '[test-whiteboard]' });
  });

  it('tests getting bug comments', async () => {
    const comments = await bugzilla.bugComments(6000);

    assert.ok(comments.length);
  });

  it('tests adding a comment to an existing bug', () => {
    return bugzilla.addComment(6000, { comment: 'new comment' });
  });

  it('tests the bugHistory call', async () => {
    const history = await bugzilla.bugHistory(9955);

    assert.ok(history.length);
  });

  it('tests getting bug attachments', async () => {
    const attachments = await bugzilla.bugAttachments(9955);

    assert.ok(attachments);
  });
});

describe('bz.js basic bug wrangling for api-dev', () => {
  let bugzilla;

  before(() => {
    bugzilla = createClient({
      url: 'https://api-dev.bugzilla.mozilla.org/test/latest/',
      username: 'testbzapi@gmail.com',
      password: 'password'
    });
  });

  it('should fail fetching non-existent bug number', () => {
    return bugzilla
      .getBug(100000000000)
      .then(
        () => assert.fail('Expected request to fail'),
        err => assert.ok(err)
      );
  });

  it('should fail creating empty bug', () => {
    return bugzilla
      .createBug({ /* empty bug */ })
      .then(
        () => assert.fail('Expected request to fail'),
        err => assert.ok(err)
      );
  });

  it('should get bug', async () => {
    const bug = await bugzilla.getBug(6000);

    assert.ok(bug.summary);
  });

  it('should get bug with query parameters', async () => {
    const bug = await bugzilla.getBug(6000, { include_fields: 'history' });

    assert.ok(bug.history);
  });

  it('should search for bugs', async () => {
    const bugs = bugzilla.searchBugs({
      summary: 'window',
      summary_type: 'contains_all_words'
    });

    assert.ok(bugs.length);
  });

  it('should create bug', async () => {
    const id = await bugzilla.createBug({
      product: 'FoodReplicator',
      component: 'Salt',
      summary: 'it is broken',
      version: '1.0',
      platform: 'All',
      op_sys: 'All'
    });

    assert.equal(typeof id, 'number');
  });

  it('should update bug', async () => {
    const bug = await bugzilla.getBug(9955);

    return bugzilla.updateBug(9955, {
      update_token: bug.update_token,
      summary: 'new summary'
    });
  });

  it('should count bugs', async () => {
    const count = await bugzilla.countBugs({
      summary: 'windowvane',
      summary_type: 'contains_all_words'
    });

    assert.equal(count, 1);
  });

  it('should get comments', async () => {
    const comments = await bugzilla.bugComments(6000);

    assert.ok(comments.length);
  });

  it('should add comment', () => {
    return bugzilla.addComment(6000, { text: 'new comment' });
  });

  it('should get bug history', async () => {
    const history = await bugzilla.bugHistory(9955);

    assert.ok(history.length);
  });

  it('should get bug flags', async () => {
    const flags = await bugzilla.bugFlags(9955);

    assert.ok(flags.length);
  });

  it('should get bug attachments', async () => {
    const attachments = await bugzilla.bugAttachments(9955);

    assert.ok(attachments);
  });
});
