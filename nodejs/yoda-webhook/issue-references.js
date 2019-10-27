module.exports = {checkEvent, processIssueUrl};

var log4js = require('log4js');
var logger = log4js.getLogger();

const configuration = require('./configuration.js');
const yoda = require('./yoda-utils.js');

const Octokit = require('@octokit/rest');

//Set-up authentication
var authString = "token " + configuration.getOption('password');
const octokit = new Octokit({
	userAgent: 'yoda-webhook',
	baseUrl: 'https://github.hpe.com/api/v3',
	log: logger,
	auth: authString
});


function readSingleChildAndUpdatePartOf(issueRefs, index) {
	return new Promise((resolve, reject) => {
		logger.debug("Reading issue # " + index);
		// Let's see about getting the issue.
		octokit.issues.get(issueRefs[index]).then((result) => {
			logger.trace(result);
			issueRefs[index].issue = result.data;
			
			// TODO: Check/update > partof. NOte. we don't need to wait for the result here.
			

			resolve();
		}).catch((err) => {
			logger.warn(err);
			issueRefs[index].issue = null;
			resolve();
		});
	});
}

//Helper function to query a list of issues, as given by their reference. The issue data will be populated in the issues field.
//If there is a problem, issue will be set to null, and a warning logger.
function readChildIssuesAndUpdatePartOf(childRefs) {
	return new Promise((resolve, reject) => {
		var childPromises = [];
		for (var i = 0; i < childRefs.issueRefs.length; i++) {
			childPromises.push(readSingleChildAndUpdatePartOf(childRefs.issueRefs, i));
		}
		// Wait for all children to complete reading and updating.
		Promise.all(childPromises).then(() => {
			logger.debug("Read all child issues.");
			resolve(childRefs);
		});
	});
}



// We will get the issue again to make sure we have a current picture.
//Furthermore, two lists can be supplied. A list of issues (by reference) that must present in the > subissues list , and
//a list of issues by references that should NOT be present in same list (either because a > parent has been removed, or because
//one or more issues have been removed from the > subissues list.
function processIssueAsParent(issueRef, includeRefs, excludeRefs) {
	return new Promise((resolve, reject) => {
		logger.debug("Processing issue as parent: " + yoda.getFullRef(issueRef));
		
		// Get the issue (possibly a refresh)
		octokit.issues.get(issueRef).then((response) => {
			logger.trace(response);
			var children = yoda.getChildren(issueRef, response.data.body);
			logger.debug("Child references:");
			logger.debug(children);
			
			yoda.insertDeleteRefs(children.issueRefs, includeRefs, excludeRefs);
			logger.trace(children.issueRefs);
			
			// Now, lets read all issues that we are referring to... 
			readChildIssuesAndUpdatePartOf(children).then((updatedChildren) => {
				logger.trace("Done reading and updating child issues");
				logger.trace(updatedChildren);
				
				// Now we are ready to update the issue itself
				// Note. Not waiting to complete.
				updateParentIssue(issueRef, updatedChildren, response.data); 
				
				resolve();
			});

		}).catch((err) => {
			logger.error(err);
		});
	});
}

//Here we'll update the a parent issue and it's children.
//ChildRefs is a structure containing the list of issue.
function updateParentIssue(issueRef, children, oldIssue) {
	logger.debug("updateParentIssue: " + yoda.getFullRef(issueRef) + " # of children: " + children.issueRefs.length);
	logger.debug(children);
//	logger.trace(oldIssue);

	var newBody = "";
	var blockStart = children.blockStart;
	var blockLength = children.blockLength;

	if (blockStart == -1) {
		if (children.issueRefs.length == 0) {
			logger.debug("No child block before and no issues now. Not doing anything..");
			return;
		}
		
		logger.debug("No block before, but we need one. Let's put at beginning");
		blockStart = 0;
	}
	
	var block = yoda.makeChildBlock(issueRef, children); 
	logger.debug(block); 


	logger.trace("BlockStart: " + blockStart + ", blockLength: " + blockLength);
	
	// Careful... we may not have an existing block!
	if (blockStart == undefined) {
		newBody = block + oldIssue.body;
	} else {
		newBody = oldIssue.body.slice(0, blockStart) + block + oldIssue.body.slice(blockStart + blockLength + 1);		
	}
	
	logger.trace(newBody);

	issueRef.body = newBody;
	logger.debug("oldBody length: " + oldIssue.body.length + ", new length: " + newBody.length);

	if (oldIssue.body == newBody) {
		logger.debug("Skipping update as body is already correct.");
	} else {

		octokit.issues.update(issueRef).then((result) => {
			logger.trace(result);
		}).catch((err) => {
			logger.error(err);
		});
	}
}



//Function/Loop to update structure. exclude boolean indicates if calling issue (issueRef) must be INCLUDED or EXCLUDED from the 
//child list (> contains list) into parent.
// Note: This is one way to use promises and sequentially execute list. TODO: Actually, this could be run in parallel...
function processParentRefIssues(issueRef, pList, exclude, index) {
	return new Promise(function(resolve, reject) {
		if (index == undefined)
			index = 0; // Let's get going...

		if (index < pList.length) {
			if (exclude) { 
				processIssueAsParent(pList[index], [], [issueRef]).then(() => {
					processParentRefIssues(issueRef, pList, exclude, index + 1).then(() => {
						resolve();
					});
				});
			}  else
				processIssueAsParent(pList[index], [issueRef], []).then(() => {
					processParentRefIssues(issueRef, pList, exclude, index + 1).then(() => {
						resolve();
					});
				});
		} else {
			resolve();
		}
	});
}

//This is the entry point for checking issues.
//The issue is assumed to be loaded and available in issue, coming either from a get call or the (new) issue part of an event.
function processIssue(issue) {
	return new Promise(function(resolve, reject) {
		var issueRef = yoda.getRefFromUrl(issue.url);
		// First handle issue as a child issue, i.e. examining any "> partof" lines, and doing appropriate updates to the referred parent issues.
		var parentRefs = yoda.getParentRefs(issueRef, issue.body);
		logger.debug("Parent references: ");
		logger.debug(parentRefs);
		processParentRefIssues(issueRef, parentRefs, false).then(() => {
			logger.info("Done processing issues references by issue: " + issue.url);
			processIssueAsParent(issueRef, [], []).then(() => {
				logger.info("Done processing issue: " + issue.url);
				resolve();
			});
		}).catch((err) => {
			reject(err);
		});
	});
}


//Main entry point for checking events.
function checkEvent(id, name, payload) {
	var issueUrl = payload.issue.url;
	var issueAction = payload.action;
	var issueRef = yoda.getRefFromUrl(issueUrl);

	logger.info("Checking issues event (" + issueAction + ") with id " + id + " by " + payload.sender.login + " for " + issueUrl);
	logger.trace(issueRef);
	logger.trace(payload);

	// First of, lets disgard events if they originate from us, i.e. the same user as used for doing the edit.
	if (issueAction == 'edited' && payload.sender.login == configuration.getOption('user')) {
		logger.info("Disgarding event as looks like we (" + configuration.getOption('user') + ") initiated it.");
		return;
	} 

	// Possible actions are: assigned, closed, deleted, demilestoned, edited, labeled, locked, milestoned, opened, pinned, reopened, transferred, unassigned, unlabeled, unlocked, unpinned
	// We will be potentially interested in any of them, just to make sure that we touch issues as and when appropriate.
	// For "edited" payload, we need to consider the old body text as well (in case an issue was removed either from "> parent" or "> subissues" section.
	if (issueAction == "edited" && payload.changes != undefined && payload.changes.body != undefined) {
		logger.debug("Found earlier body: " + payload.changes.body.from);

		// TODO: Handle deletions...... 
		var oldParentRefs = yoda.getParentRefs(issueRef, payload.changes.body.from);
		var newParentRefs = yoda.getParentRefs(issueRef, payload.issue.body);
		var deletedParentRefs = yoda.getRefsDiff(oldParentRefs, newParentRefs);
		logger.debug("deletedParentRefs:");
		logger.debug(deletedParentRefs);
		
		// Call to handle deletion of parents.
		processParentRefIssues(issueRef, deletedParentRefs, true).
		then(() => {
			// Any child deletions?
			var oldChildRefs = yoda.getChildren(issueRef, payload.changes.body.from).issueRefs;
			var newChildRefs = yoda.getChildren(issueRef, payload.issue.body).issueRefs;
			var deletedChildRefs = yoda.getRefsDiff(oldChildRefs, newChildRefs);
			logger.debug("deletedChildRefs:");
			logger.debug(deletedChildRefs);

			processIssueAsParent(issueRef, [], deletedChildRefs).
			then(() => {
				logger.info("Event - done with child deletions");
				processParentRefIssues(issueRef, newParentRefs, false).then(() => {
					logger.debug("Event - done with following parent refs.");
				});
			// ... Question is if we really need to call also processIssue again.. This would be for its potential role as a normal parent... I think we need to.
			});
		});
	} else {
		// Not an edit event involving body. Normal processing.
		processIssue(payload.issue);
	}
}

//Entry point for directly checking references based on input url
function processIssueUrl(url) {
	logger.info("Retriving issue from url: " + url);

	// Get the full issue, then process
	var issueRef = yoda.getRefFromUrl(url);
	octokit.issues.get(issueRef).then((result) => {
		logger.trace(result);
		processIssue(result.data).then(() => {
			logger.info("Succesfully processes: " + url);
		});
	}).catch((err) => {
		logger.error("Could not retrieve issue from url: " + url + ", err: " + err);
	});
}