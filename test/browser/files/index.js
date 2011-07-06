$(document).ready(function() {
  testBz();
});

function testBz() {
  var bugzilla = bz.createClient({
    url: "https://api-dev.bugzilla.mozilla.org/test/0.9/",
    username: "testbzapi@gmail.com",
    password: "password"
  });

  bugzilla.getBug(6000, function(error, bug) {
    if(error)
      $("#get-bug .fail").addClass("true");
    else if(bug.id)
      $("#get-bug .pass").addClass("true");
  });

  bugzilla.getBug(9955, function(error, bug) {
    bug = {
       update_token: bug.update_token,
       summary: 'new summary'
    }
    bugzilla.updateBug(9955, bug, function(error, ok) {
      if(error)
        $("#update-bug .fail").addClass("true");
      else if(ok)
        $("#update-bug .pass").addClass("true");
    });
  });

  bugzilla.addComment(6000, {
      text: "new comment"
    },
    function(error, ok) {
      if(error)
        $("#add-comment .fail").addClass("true");
      else if(ok)
        $("#add-comment .pass").addClass("true");
    }
  );
};