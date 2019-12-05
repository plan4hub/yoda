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
function getToken(payload) {
	return new Promise((resolve, reject) => {
		if (payload.installation == undefined || payload.installation.id == undefined) {
			logger.error("Received non GitHub APP event while running in App mode. Payload is:");
			logger.error(payload);
			reject("Received non GitHub APP event while running in App mode.");
		}

		auth({ type: "installation", installationId: payload.installation.id, permissions: "issues=write" }).then((authorization) => {
			logger.info(authorization);

			// Let's try to use our new token... just for fun...
			//Set-up authentication
			var authString = "token " + authorization.token;
			octokit = new Octokit({
				userAgent: 'yoda-webhook',
				baseUrl: configuration.getOption('baseurl'),
				log: logger,
				auth: authString
			});

			resolve(octokit);
		}).catch((err) => {
			reject(err);
		});
	});
}
