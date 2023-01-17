// First do config. This will get things rolling
const configuration = require('./configuration.js');
configuration.parseOptions();

// log4js
const log4js = require('log4js');
const logger = log4js.getLogger();

const yodaRefModule = require('./issue-references.js');
const yodaAppModule = require('./github-app.js');

// Run as GitHub App?
if (configuration.getOption("app-mode"))
	yodaAppModule.init();

yodaRefModule.init();

// Are we being asked to process just a single issue. If so, no need for server stuff.
if (configuration.getOption('url') != undefined) {
	logger.info("Processing url: " + configuration.getOption('url'));
	yodaRefModule.processIssueUrl(configuration.getOption('url')); 
} else {
	logger.info("Server starting ...");

	//	install with: npm install @octokit/webhooks
	const { Webhooks, createNodeMiddleware } = require('@octokit/webhooks')
	const webhooks = new Webhooks({
		secret: configuration.getOption('secret')
	});

	//	Use EventSource trick for dev purposes, i.e. where direct webhook from GitHub to server not possibly for example for own laptop.
	//	Testing using web proxy smee.io
	const EventSource = require('eventsource');
	let source;
	if (configuration.getOption('webhookproxy') != undefined) {
		logger.debug('Adding webhookproxy EventSource with url: ' + configuration.getOption('webhookproxy'));
		source = new EventSource(configuration.getOption('webhookproxy')); // ,  {proxy: 'http://web-proxy.sdc.hpecorp.net:8080'}); // ); //
		source.onmessage = (event) => {
			logger.trace("Event received.");
			const webhookEvent = JSON.parse(event.data)
			webhooks.verifyAndReceive({
				id: webhookEvent['x-request-id'],
				name: webhookEvent['x-github-event'],
				signature: webhookEvent['x-hub-signature'],
				payload: webhookEvent.body
			});
		};
	}

	//	Register for issues events
	webhooks.on('issues', ({id, name, payload}) => {
		yodaRefModule.checkEvent(id, name, payload);
	});
	
	webhooks.onError(({id, name, payload}) => {
		logger.debug("ERORR during event", id, name);
		logger.debug(payload);
	});

	//	If we are running in GitHub App mode, let's listen as well for installation events. They are interesting....
	if (configuration.getOption('app-mode')) {
		webhooks.on('installation', ({id, name, payload}) => {
			yodaAppModule.checkEvent(id, name, payload);
		});
	}

	let server;
	if (configuration.getOption('cert') == undefined) {
		// HTTP
		// Start the server.
		logger.info("Bringing up server in HTTP mode.");
		server = require('http').createServer(createNodeMiddleware(webhooks, {path: "/"})).listen(configuration.getOption('port'));
		logger.trace(server);
	} else {
		// HTTPS
		// Start the server. 
		logger.info("Bringing up server in HTTPS mode.");
		const https = require("https"),
		fs = require("fs");

		const options = {
			key: fs.readFileSync(configuration.getOption('cert-key')),
			cert: fs.readFileSync(configuration.getOption('cert'))
		};

		server = https.createServer(options, createNodeMiddleware(webhooks, {path: "/"})).listen(configuration.getOption('port'));
		logger.trace(server);
	}

	//	Be prepared for shutdown
	process.on('SIGINT', () => {
		logger.info('Received SIGINT. Shutting down.');
		server.close(function() {process.exit(0)});
	});

	if (configuration.getOption('webhookproxy') == undefined)
		logger.info("Server running. Accepting connections on port: " + configuration.getOption('port'));
	else
		logger.info("Server running. Accepting via webhook proxy at: " + configuration.getOption('webhookproxy'));
}
