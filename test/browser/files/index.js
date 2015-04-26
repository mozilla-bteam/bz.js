$(document).ready(function() {
  $.getJSON('./test-config.json', function(result) {
    console.log("result>", result);
    testBz(result);
  });
});

function testBz(testConfig) {
  var bugzilla = bz.createClient(testConfig);

  bugzilla.getBug(6000, function(error, bug) {
    if(error) {
      $("#get-bug .fail").addClass("true");
      throw error;
    } else if(bug.id) {
      $("#get-bug .pass").addClass("true");
    }
  });

  // bugzilla.getBug(9955, function(error, bug) {
  //   bug = {
  //      update_token: bug.update_token,
  //      summary: 'new summary'
  //   }
  //   bugzilla.updateBug(9955, bug, function(error, ok) {
  //     if(error)
  //       $("#update-bug .fail").addClass("true");
  //     else if(ok)
  //       $("#update-bug .pass").addClass("true");
  //   });
  // });

  var _bug = {
    "summary": "test bug",
    "product": "Firefox",
    "component": "Developer Tools"
  }

  /*
  1. get current User
  2. create a bug with minimum fields. new Class?
  3. submit
  */

  // bugzilla.createBug(_bug, {
  //     comment: "new comment"
  //   },
  //   function(error, ok) {
  //     if(error)
  //       $("#add-comment .fail").addClass("true");
  //     else if(ok)
  //       $("#add-comment .pass").addClass("true");
  //   }
  // );

  bugzilla.addComment(6000, {
      comment: "new comment"
    },
    function(error, ok) {
      if(error)
        $("#add-comment .fail").addClass("true");
      else if(ok)
        $("#add-comment .pass").addClass("true");
    }
  );
};