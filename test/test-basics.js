var assert = require('assert');
var bz = require('../build/node/index');
var authConfig = require('./browser/files/test-config.json');

var bugzilla;

// Bugs
describe('bz.js basic bug wrangling', function() {

  before(function() {
    bugzilla = bz.createClient(authConfig);


    bug_tpl = {
      product: 'Firefox',
      component: 'Distributions',
      summary: 'Test whiteboard bug',
      whiteboard: '[devedition-40]',
      op_sys: 'All',
      platform: 'All',
      version: '4.0 Branch'
    };

  });

  it('tests getting a bug', function(done) {
    bugzilla.getBug(6000, function(err, bug) {
      if (err) throw err;
      assert.ok(bug.summary);
      done();
    });
  });

  it('tests getting bug history field', function(done) {
    bugzilla.bugHistory(9955, function(err, bugs) {
      if (err) throw err;
      assert.equal(bugs.length, 1);
      assert.ok(bugs[0].history);
      done();
    });
  });

  // Note that the product name here assumes we're testing against the allizom instance and a copy of the production DB
  it('tests searching for a bug', function(done) {
    bugzilla.searchBugs({
        product: "Add-on SDK",
        limit: 1
      },
      function(err, bugs) {
        if (err) throw err;
        assert.ok(bugs.length);
        done();
      }
    );
  });

  // XXX this doesn't work, probably a bug in bugzilla. error is related
  // XXX to op_sys field:
  // XXX "Uncaught Error: You must select/enter a OS."
  it('tests creating a bug from scratch', function(done) {

    bugzilla.createBug(bug_tpl,
      function(err, id) {
        if (err) throw err;
        assert.equal(typeof id, "number");
        done();
      }
    );
  });

  // XXX this test needs to create a bug in order to update it.
  // it('tests updating a bug with a new whiteboard', function(done) {
  //   bug = {
  //     whiteboard: '[test-whiteboard]'
  //   }
  //   bugzilla.updateBug(9955, bug, function(err, ok) {
  //     if (err) throw err;
  //     assert.ok(ok);
  //     done();
  //   });
  // });

  it('tests getting bug comments', function(done) {
    bugzilla.bugComments(6000, function(err, comments) {
      if (err) throw err;
      assert.ok(comments.length);
      done();
    });
  });

  it('tests adding a comment to an existing bug', function(done) {
    bugzilla.addComment(6000, {
        comment: "new comment"
      },
      function(err, ok) {
        if (err) throw err;
        assert.ok(ok);
        done();
      }
    );
  });

  it('tests the bugHistory call', function(done) {
    bugzilla.bugHistory(9955, function(err, history) {
      if (err) throw err;
      assert.ok(history.length);
      done();
    });
  });

  it('tests getting bug attachments', function(done) {
    bugzilla.bugAttachments(9955, function(err, attachments) {
      if (err) throw err;
      assert.ok(attachments);
      done();
    });
  });
});
//
// // // Users
describe('bz.js users tests', function() {
  before(function() {
    bugzilla = bz.createClient(authConfig);
  });

  it('search users', function(done) {
    bugzilla.searchUsers("jwz@jwz.org", function(error, users) {
      if (error) throw error;
      assert.ok(users.length);
      done();
    });
  });

  it('gets a user', function(done) {
    bugzilla.getUser("jeff@burnitall.com", function(error, user) {
      if (error) throw error;
      assert.ok(user.id);
      done();
    });
  });


  // XXX currently there is no REST endpoint
  it('gets the server configuration', function(done) {
    bugzilla.getConfiguration(function(error, config) {
      if (error) throw error;
      assert.ok(config.version);
      done();
    });
  });
});

describe('tests attachments', function() {
  before(function() {
    bugzilla = bz.createClient(authConfig);
  });

  it('tests creating an attachment', function(done) {
    bugzilla.createBug(bug_tpl, (err, bugId) => {
      bugzilla.createAttachment(bugId, {
          file_name: 'test.diff',
          summary: "Test Attachment",
          data: "supposedtobeencoded",
          encoding: "base64",
          description: "this is a test patch",
          comment: "this is the comment",
          content_type: "text/plain"
        },
        function(err, result) {
          if (err) throw err;
          var a = result.attachments[Object.keys(result.attachments)[
            0]];

          assert.equal(bugId, a.bug_id);
          done();
        }
      );
    });
  });

  it('tests getting an attachment', function(done) {
    bugzilla.getAttachment(1785, function(err, attachment) {
      if (err) throw err;
      assert.ok(attachment.bug_id);
      done();
    });
  });

  it('tests updating an attachment', function(done) {
    bugzilla.getAttachment(1785, function(err, attachment) {
      if (err) throw err;

      attachment.is_patch = "1"
      bugzilla.updateAttachment(1785, attachment, function(error) {
        if (err) throw err;
        // console.log("updateAttachment>", [].slice.call(arguments));
        // assert.ok(error);
        done();
      });
    });
  });
});

describe('test product api', function() {
  before(function() {
    bugzilla = bz.createClient();
  });
  it("should get information about all selectable products", function testGetProducts(
    done) {
    bugzilla.getProducts("selectable")
      .then(function(products) {
        // TODO verify that only selectable bugs are returned
        assert.ok(products);
        assert.ok(products.ids);
        done();
      })
      .catch((error) => {
        console.log(error);
      });
  });

  it("should get information about all enterable products", function testGetProducts(
    done) {
    bugzilla.getProducts("enterable")
      .then(function(products) {
        // TODO verify that only enterable bugs are returned
        assert.ok(products);
        assert.ok(products.ids);
        done();
      })
      .catch((error) => {
        console.log(error);
      });
  });

  it("should get information about all accessible products", function testGetProducts(
    done) {
    bugzilla.getProducts("accessible")
      .then(function(products) {
        // TODO verify that only accessible bugs are returned
        assert.ok(products);
        assert.ok(products.ids);
        done();
      })
      .catch((error) => {
        console.log(error);
      });
  });

  // Note that the product ID here assumes we're testing against the allizom instance and a copy of the production DB
  it("should get information about a specfic product by id", function testGetProduct(
    done) {
    var testId = 63;
    bugzilla.getProduct(testId)
      .then(function(result) {
        assert.ok(result.products[0].id === testId);
        done();
      });
  });
  // Note that the product name here assumes we're testing against the allizom instance and a copy of the production DB
  it("should get information about a specfic product by name", function testGetProduct(
    done) {
    var testName = "Add-on SDK";
    bugzilla.getProduct(testName)
      .then(function(result) {
        assert.ok(result.products[0].name === testName);
        done();
      });
  });

  // https://bugzilla.readthedocs.io/en/latest/api/core/v1/product.html#list-products
  it("should get information about multiple products by id", function testGetProducts(
    done) {
    var testIds = [63, 31, 125]; // the first three returned from calling _selectable
    bugzilla.getProducts(testIds)
      .then((result) => {
        assert.equal(testIds[0], result.products[0].id);
        assert.equal('Add-on SDK', result.products[0].name);
        done();
      }, (err) => {
        console.error(err);
      });
  });

  it("should get information about multiple products by name", function testGetProducts(
    done) {
    var testProductNames = ["Add-on SDK", "addons.mozilla.org",
      "Firefox"
    ];
    bugzilla.getProduct(testProductNames)
      .then(function(result) {
        var returnedProductNames = [];
        result.products.forEach(function(currentValue, index, array) {
          returnedProductNames.push(currentValue.name);
        });
        returnedProductNames.sort(function(a, b) {
          return a > b;
        });
        testProductNames.sort(function(a, b) {
          return a > b;
        });
        assert.equal(JSON.stringify(returnedProductNames), JSON.stringify(
          testProductNames));
        done();
      }).catch((err) => {
        console.error(err);
        done();
      });
  });
});
