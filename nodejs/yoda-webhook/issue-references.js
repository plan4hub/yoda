module.exports = {checkEvent};

var log4js = require('log4js');
var logger = log4js.getLogger();

const configuration = require('./configuration.js');

const Octokit = require('@octokit/rest');

var authString = "token " + configuration.getOption('password');
const octokit = new Octokit({
	userAgent: 'yoda-webhook',
	baseUrl: 'https://github.hpe.com/api/v3',
	log: logger,
	auth: authString
});

//octokit.authenticate({
//	type: 'token',
//	username: 'jens-markussen',
//	token: "8dd4d417cb9121d6eb802199f181560752920e5f",
//});

// Keep track of modified issues (in order to ignore events received from those.
var issuesEdited = [];

function checkEvent(id, name, payload) {
	var issueUrl = payload.issue.url;
	var issueAction = payload.action;
	
	logger.info("Checking issues event (" + issueAction + ") with id " + id + " for " + issueUrl);
	logger.trace(payload);
	
	// Check actions from list: assigned, closed, deleted, demilestoned, edited, labeled, locked, milestoned, opened, pinned, reopened, transferred, unassigned, unlabeled, unlocked, unpinned
	
	// Let's do a test.
	if (issueAction == "labeled") {
		var updateBlock = {
//				org: payload.repository.owner.login,
				owner: payload.repository.owner.login,
				repo: payload.repository.name,
				issue_number: payload.issue.number,
				// As a test, let's try to add this label to the body
				body: payload.issue.body +  "\nNew label added: " + payload.label.name
		};
		logger.debug(updateBlock);
		octokit.issues.update(updateBlock).then((result) => {
			logger.debug(result);
		}).catch((err) => {
			logger.error(err);
		});
	}
	
//	logger.debug(payload);
}
