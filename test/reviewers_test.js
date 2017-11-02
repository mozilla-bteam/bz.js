import assert from 'assert';
import { createClient } from '../src';

describe('suggested reviewers', () => {
  let bugzilla;

  before(() => {
    bugzilla = createClient({
      url: 'https://bugzilla.mozilla.org/rest/'
    });
  });

  it('tests getting suggested reviewers', () => {
    const reviewers = bugzilla.getSuggestedReviewers(921296);

    assert(Array.isArray(reviewers));
  });
});
