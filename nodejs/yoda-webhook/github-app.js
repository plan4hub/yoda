module.exports = {checkEvent, init, getToken};

var log4js = require('log4js');
var logger = log4js.getLogger();

const configuration = require('./configuration.js');

var fs = require('fs');

const Octokit = require('@octokit/rest');

const { request } = require("@octokit/request");
const { createAppAuth } = require('@octokit/auth-app');

auth = null;

// init
function init() {
	logger.info("Initializing GitHub App ...");

	var pem = fs.readFileSync(configuration.getOption("app-pemfile"));	
	
	auth = createAppAuth({
		  id: configuration.getOption('app-appid'),
		  privateKey: pem,
		  clientId: configuration.getOption('app-clientid'),
		  clientSecret: configuration.getOption('app-clientsecret'),
		  request: request.defaults({
			  baseUrl: configuration.getOption('baseurl')
		  })  
	});
	
	logger.debug(auth);
}

//Main entry point for checking installation events.
function checkEvent(id, name, payload) {
	var issueAction = payload.action;

	logger.info("Checking installation event (" + issueAction + ") for installation id " + payload.installation.id);
	logger.info("Access token url: " + payload.installation.access_tokens_url);
}

// Function to get an access token
function getToken(id, name, payload) {

	// Let's try it.., i.e. get an access token...
	
	
	
	// Retrieve installation access token

	
	var jens = auth({ type: "installation", installationId: payload.installation.id, permissions: "issues=write" }).then((authorization) => {
		logger.info(authorization);
		
		// Let's try to use our new token... just for fun...
		//Set-up authentication
		var authString = "token " + authorization.token;
		const octokit = new Octokit({
			userAgent: 'yoda-webhook',
			baseUrl: configuration.getOption('baseurl'),
			log: logger,
			auth: authString
		});
		
		issueRef = { owner: "jens-markussen", repo: "peter", issue_number: 6};
		octokit.issues.get(issueRef).then((result) => {
			logger.trace(result);
			
			// Ok, let's go all in and CHANGE the body. Adding a line at start
			issueRef.body = "More data: " + result.data.body;
			octokit.issues.update(issueRef).then((upd) => {
				logger.info("YES");
			}).catch((err) => {
				logger.error("OH NO");
			});

		}).catch((err) => {
			logger.error(err);
		});
		

		
	}).catch((err) => {
		logger.error(err);
	});

	// resolves with
	// {
	//   type: 'token',
	//   tokenType: 'installation',
	//   token: 'token123',
	//   installationId: 123,
	//   expiresAt: '2018-07-07T00:59:00.000Z'
	// }	
	
//	logger.trace(payload);
}
