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

// Testing using smee.io
const EventSource = require('eventsource');
const webhookProxyUrl = 'https://smee.io/VPLzPA2WsdskT29M' // replace with your own Webhook Proxy URL
const source = new EventSource(webhookProxyUrl)
source.onmessage = (event) => {
  const webhookEvent = JSON.parse(event.data)
  webhooks.verifyAndReceive({
    id: webhookEvent['x-request-id'],
    name: webhookEvent['x-github-event'],
    signature: webhookEvent['x-hub-signature'],
    payload: webhookEvent.body
  }).catch(console.error)
}

webhooks.on('issues', ({id, name, payload}) => {
	yodaRefModule.checkEvent(id, name, payload);
});

require('http').createServer(webhooks.middleware).listen(3000)
// can now receive webhook events at port 3000

logger.info("Server running ...");
