#bz.js
A JavaScript wrapper for the [Bugzilla REST API](https://wiki.mozilla.org/Bugzilla:REST_API).

# install
For [node](http://nodejs.org) install with [npm](http://npmjs.org):
	npm install bz --dev
	
and use with `var bz = require("bz")`

For the browser, download the lastest [bz.js](http://github.com/harthur/bz/downloads).

For use with Mozilla's [Addon SDK](https://github.com/mozilla/addon-sdk): clone the repo into your packages folder with the name bz, add "bz" as a dependency to your package.json, and use with `var bz = require('bz')`

# usage
	var bugzilla = bz.createClient();

	bugzilla.getBug(678223, function(error, bug) {
	  if(!error)
	    alert(bug.summary);
	});

# API
`bz.createClient(options)`  
creates a new Bugzilla API client, optionally takes options like the REST API url and username + password:

	var bugzilla = bz.createClient({
	  url: "https://api-dev.bugzilla.mozilla.org/test/0.9/",
	  username: 'bugs@bugmail.com',
	  password: 'secret'
	});

### Client methods
Each method takes a callback that takes an error message (if any kind of error occurs) as its first argument, and the expected return data as its second.

`getBug(id, callback)`  
retrieves a [bug](https://wiki.mozilla.org/Bugzilla:REST_API:Objects#Bug) given a bug id.

`searchBugs(searchParams, callback)`  
searches with given [search parameters](https://wiki.mozilla.org/Bugzilla:REST_API:Search) and fetches an array of [bugs](https://wiki.mozilla.org/Bugzilla:REST_API:Objects#Bug).

`countBugs(searchParams, callback)`  
searches with given [search parameters](https://wiki.mozilla.org/Bugzilla:REST_API:Search) and gets a integer count of bugs matching that query.

`createBug(bug, callback)`  
creates a [bug](https://wiki.mozilla.org/Bugzilla:REST_API:Objects#Bug) and returns the id of the newly created bug.

`updateBug(id, bug, callback)`  
updates a [bug](https://wiki.mozilla.org/Bugzilla:REST_API:Objects#Bug) with new bug info.

`bugComments(id, callback)`  
retrieves the [comments](https://wiki.mozilla.org/Bugzilla:REST_API:Objects#Comment) for a bug.

`addComment(id, comment, callback)`  
adds a [comment](https://wiki.mozilla.org/Bugzilla:REST_API:Objects#Comment) to a bug.

`bugHistory(id, callback)`  
retrieves array of [changes](https://wiki.mozilla.org/Bugzilla:REST_API:Objects#ChangeSet) for a bug.

`bugFlags(id, callback)`  
retrieves array of [flags](https://wiki.mozilla.org/Bugzilla:REST_API:Objects#Flag) for a bug.

`bugAttachments(id, callback)`  
retrieves array of [attachments](https://wiki.mozilla.org/Bugzilla:REST_API:Objects#Attachment) for a bug.

`createAttachment(bugId, attachment, callback)`  
creates an [attachment](https://wiki.mozilla.org/Bugzilla:REST_API:Objects#Attachment) on a bug, and returns the id of the newly created attachment.

`getAttachment(attachId, callback)`  
gets an [attachment](https://wiki.mozilla.org/Bugzilla:REST_API:Objects#Attachment) given an attachment id.

`updateAttachment(attachId, attachment, callback)`  
updates the [attachment](https://wiki.mozilla.org/Bugzilla:REST_API:Objects#Attachment).

`searchUsers(match, callback)`  
searches for [users](https://wiki.mozilla.org/Bugzilla:REST_API:Objects#User) by string, matching against users' names or real names.
 
`getUser(userId, callback)`  
retrieves a [user](https://wiki.mozilla.org/Bugzilla:REST_API:Objects#User) given a user id.

`getConfiguration(callback)`  
gets the [configuration](https://wiki.mozilla.org/Bugzilla:REST_API:Objects:Configuration) of this Bugzilla server.

