module.exports = {parseOptions, getOption};

// Main options array
var options;

var log4js = require('log4js');
var logger = log4js.getLogger();
logger.level = "INFO"; // To be sure we get some tracing during options parsing and final log level setting.

const commandLineArgs = require('command-line-args');
const commandLineUsage = require('command-line-usage');

//Command line defintions
const optionDefinitions = [
	{
		name: 'loglevel',
		alias: 'l',
		type: String,
		description: 'Debug mode. One of (in descending order): all, trace, debug, info, warn, error, fatal, mark, off',
		defaultValue: 'info'
	},
	{ 
		name: 'user',
		alias: 'u',
		type: String,
		description: 'The GitHub user name. We are assuming that this is a non-standard user. Events received from this user are ignored. Required (if not running as GitHub App)'
	},
	{
		name: 'password',
		alias: 'p',
		type: String,
		description: 'The GitHub password (a GitHub personal access token). Required (if not running as GitHub App).'
	},
	{
		name: 'port',
		type: Number,
		description: 'The port to listen to (default 8181).',
		defaultValue: 8181
	},
	{
		name: 'secret',
		alias: 's',
		type: String,
		description: 'The GitHub webhook secret. Default mysecret',
		defaultValue: 'mysecret'
	},
	{
		name: 'url',
		type: String,
		description: 'An optional GitHub Issue URL to trigger execution. In this case no service will be started and processing will terminate after handling the issue.'
	},
	{
		name: 'issuelistre',
		type: String,
		description: 'The regular expression that will preceed a list of references to child issues. Default ">[ ]*contains".',
		defaultValue: ">[ ]*contains"
	},
	{
		name: 'issuelist',
		type: String,
		description: 'The string to insert to preceed a list of references to child issues. Default "> contains".',
		defaultValue: "> contains"
	},
	{
		name: 'issuerefre',
		type: String,
		description: 'The regular expression that will preceed a references to containing (parent) issue. Default ">[ ]*partof".',
		defaultValue: ">[ ]*partof"
	},
	{
		name: 'issueref',
		type: String,
		description: 'The string to insert to preceed a references to containing (parent) issue. Default "> partof".',
		defaultValue: "> partof"
	},
	{
		name: 'labelre',
		type: String,
		description: 'Regular expression for matching labels to be included before issue title. Default "^T[1-9] -".',
		defaultValue: "^T[1-9] -"
	},
	{
		name: 'issuesearch',
		type: String,
		description: 'Issue search keyword for searching using GitHub search. Default "> issuesearch ".',
		defaultValue: "> issuesearch "
	},
	{
		name: 'webhookproxy',
		type: String,
		description: 'Development mode. Use an external services (smee.io is good) for proxying GitHub events. Give the URL. Optional.'
	},
	{
		name: 'baseurl',
		type: String,
		description: 'Base API endpoint. Default: https://github.hpe.com/api/v3',
		defaultValue: 'https://github.hpe.com/api/v3'
	},
	{
		name: 'logfile',
		type: String,
		description: 'Log file path. Default: /var/tmp/yoda-webhook/yoda-webhook.log',
		defaultValue: '/var/tmp/yoda-webhook/yoda-webhook.log'
	},
	{
		name: 'app-mode',
		type: Boolean,
		description: 'Run in GitHub App mode (i.e. using tokens retrieved from GitHub App Installation(s)).',
		defaultValue: false
	},
	{
		name: 'app-appid',
		type: String,
		description: 'The App app id. Required when running in App mode.'
	},
	{
		name: 'app-clientid',
		type: String,
		description: 'The App client id. Required when running in App mode.'
	},
	{
		name: 'app-clientsecret',
		type: String,
		description: 'The App secret. Required when running in App mode.'
	},
	{
		name: 'app-pemfile',
		type: String,
		description: 'Path to PEM permission for with private key. Required when running in App mode.'
	},
	{
		name: 'help',
		alias: 'h',
		type: Boolean,
		defaultValue: false,
		description: "Print help/usage message."
	}	
];

const sections = [
	  {
	    header: 'Yoda webhook',
	    content: 'Listens to GitHub Events in order to validate and/or transform issues on the fly.'
	  },
	  {
	    header: 'Options',
	    optionList: optionDefinitions
	  }
	]

const usage = commandLineUsage(sections);

function parseOptions() {
	try {
		// If env variable YODA_WEBHOOK_OPTIONS is set, use this instead.
		if (process.env.YODA_WEBHOOK_OPTIONS != undefined) {
			options = commandLineArgs(optionDefinitions, {argv: process.env.YODA_WEBHOOK_OPTIONS.split(" ")});
		} else {
			options = commandLineArgs(optionDefinitions);
		}
		
		if (options['help'] == true) {
			logger.info(usage);
			process.exit(0);
		}

		error = false;

		if (!options['app-mode'] && options['user'] == undefined) {
			logger.error("No --user or -u given");
			error = true;
		}

		if (!options['app-mode'] && options['password'] == undefined) {
			logger.error("No --password or -p given");
			error = true;
		}
		
		if (options['app-mode'] && options['app-appid'] == undefined) {
			logger.error("No --app-appid given");
			error = true;
		}
		
		if (options['app-mode'] && options['app-clientid'] == undefined) {
			logger.error("No --app-clientid given");
			error = true;
		}
		
		if (options['app-mode'] && options['app-clientsecret'] == undefined) {
			logger.error("No --app-clientsecret given");
			error = true;
		}

		if (options['app-mode'] && options['app-pemfile'] == undefined) {
			logger.error("No --app-pemfile given");
			error = true;
		}

		if (options['app-mode'] && options['url'] != undefined) {
			logger.error("--url not valid in GitHub App mode.");
			error = true;
		}

		if (error) {
			logger.error(usage);
			process.exit(1);
		}
	}
	catch(err) {
		logger.error(usage);
		process.exit(1);
	}

	// Initialize logging
	log4js.configure({
	  appenders: {
		out: { type: 'stdout' },
		app: { type: 'dateFile', filename: options['logfile'], daysToKeep: 7 } 
	  },
	  categories: {
		default: { appenders: [ 'out', 'app' ], level: options['loglevel'] }
	  }
	});

	// Derived detauls
	var url = new URL(options['baseurl']);
	options['baseurlui'] = url.protocol + "//" + url.hostname + "/"; 
	
	logger.info(options);
}

function getOption(option) {
	return options[option];
}
