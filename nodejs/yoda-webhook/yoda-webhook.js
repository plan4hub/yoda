// First do config. This will get things rolling
const configuration = require('./configuration.js');
configuration.parseOptions();

// log4js
const log4js = require('log4js');
var logger = log4js.getLogger();

logger.info("Server starting ...");

const yodaRefModule = require('./issue-references.js');

// install with: npm install @octokit/webhooks
const WebhooksApi = require('@octokit/webhooks')
const webhooks = new WebhooksApi({
  secret: 'mysecret'
})

const EventSource = require('eventsource');
var source;
// Testing using web proxy smee.io
if (configuration.getOption('webhookproxy') != undefined) {
	logger.info('Adding webhookproxy EventSource with url: ' + configuration.getOption('webhookproxy'));
	source = new EventSource(configuration.getOption('webhookproxy')); //, {proxy: 'http://web-proxy.sdc.hpecorp.net:8080'});
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

webhooks.on('issues', ({id, name, payload}) => {
	yodaRefModule.checkEvent(id, name, payload);
});

webhooks.on('*', ({id, name, payload}) => {
	logger.trace("Event received: " + id + ", " + name);
});


require('http').createServer(webhooks.middleware).listen(configuration.getOption('port'));

logger.info("Server running ...");
