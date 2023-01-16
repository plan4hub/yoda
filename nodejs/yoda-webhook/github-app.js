module.exports = {checkEvent, init, getAppOctokit};

const log4js = require('log4js');
const logger = log4js.getLogger();

const configuration = require('./configuration.js');

const fs = require('fs');

const { Octokit } = require('@octokit/rest');

const { request } = require("@octokit/request");
const { createAppAuth } = require('@octokit/auth-app');

let appInstallations = [];

// init - can also be used to reinit ... 
function init() {
	logger.info("Initializing GitHub App ...");

	const pem = fs.readFileSync(configuration.getOption("app-pemfile"));
	
	const options = {
		appId: configuration.getOption('app-appid'),
		privateKey: pem,
		clientId: configuration.getOption('app-clientid'),
		clientSecret: configuration.getOption('app-clientsecret'),
		request: request.defaults({
			baseUrl: configuration.getOption('baseurl')
	})}; 
	logger.debug(options);
	
	const auth = createAppAuth(options);	
	logger.debug(auth);
	
	auth({ type: "app" }).then((authorization) => {
		logger.debug(authorization);

        //Set-up authentication and store for later use if needed.
        const authString = "token " + authorization.token;
        const appOctokit = new Octokit({
                userAgent: 'yoda-webhook',
				baseUrl: configuration.getOption('baseurl'),
                log: logger,
                auth: authString
         });

		logger.debug("Requesting list of app installations");

		// Let's get the list of installations
        appOctokit.request('GET /app/installations', {}).then((installations) => {
			const appInstallations = installations.data;	
			logger.info("List of installations:");
			logger.info(appInstallations.map(inst => inst.id + "/" + inst.account.login).join(", "));
		
			// Let's create - auto renewable - octokit instances for each installation and store them. 
			for (let i = 0; i < appInstallations.length; i++) {
				appInstallations[i].octokit = new Octokit({
					authStrategy: createAppAuth,
					auth: {
						appId: configuration.getOption('app-appid'),
						privateKey: pem,
						installationId: appInstallations[i].id,
					},
					baseUrl: configuration.getOption('baseurl'),
					log: logger
				});
				logger.debug("Created Octokit for app installation id: " + appInstallations[i].id);
			}
		}).catch((err) => {
			logger.error(err);
		});
	}).catch((err) => {
		logger.error(err);
	});
}

//Main entry point for checking installation events.
function checkEvent(id, name, payload) {
	var issueAction = payload.action;

	logger.info("Checking installation event (" + issueAction + ") for installation id " + payload.installation.id);
	logger.info(payload); // This is too important to keep at debug :-)
	
	// Because of this we will reinit stuff by simply calling init again. 
	init();
}

// Retrieve an octokit instance
function getAppOctokit(issueRef) {
	// We need to find a match for issueRef owner based on account.login
	const r = appInstallations.findIndex(inst => inst.account.login.toLowerCase() == issueRef.owner.toLowerCase());
	if (r != -1) {
		logger.debug("Found installation. Installation Id: " + appInstallations[r].id);
		return appInstallations[r].octokit;
	} else {
		logger.warn("Could not find app installation for owner: " + issueRef.owner);
		// Let's return an anonymous .
		return null;
	}
}