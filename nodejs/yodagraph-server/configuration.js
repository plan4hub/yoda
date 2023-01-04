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
		description: 'The port to listen to (default 8899).',
		defaultValue: 8899
	},
	{
		name: 'width',
		type: Number,
		description: 'Default width for graph window/canvas. Default1200.',
		defaultValue: 1200
	},
	{
		name: 'logfile',
		type: String,
		description: 'Log file path. Default: /var/tmp/yodagraph-server/yodagraph-server.log',
		defaultValue: '/var/tmp/yodagraph-server/yodagraph-server.log'
	},
	{
		name: 'cert',
		type: String,
		description: 'HTTPS certificate.'
	},
	{
		name: 'cert-key',
		type: String,
		description: 'HTTPS certificate key.'
	},
	{
		name: 'timeout',
		type: Number,
		description: 'Timeout in ms for waiting for graph to build. Default 90000 ms (1.5 min).',
		defaultValue: 90000
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
	    header: 'Yodagraph server',
	    content: 'Server process that may invoke youda tools to generate graphs and return result as PNG images.'
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
		if (process.env.YODAGRAPH_SERVER_OPTIONS != undefined) {
			options = commandLineArgs(optionDefinitions, {argv: process.env.YODAGRAPH_SERVER_OPTIONS.split(" ")});
		} else {
			options = commandLineArgs(optionDefinitions);
		}
		
		if (options['help'] == true) {
			logger.info(usage);
			process.exit(0);
		}

		error = false;

		if (options['--cert'] != undefined && options['--cert-key'] == undefined) {
			logger.error("Need --cert-key to match --cert");
			error = true;
		}
		if (options['--cert-key'] != undefined && options['--cert'] == undefined) {
			logger.error("Need --cert to match --cert-key");
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

	logger.info(options);
}

function getOption(option) {
	return options[option];
}
