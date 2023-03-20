module.exports = {parseOptions, getOption, getConfig, getAPI, getAPIYAML};

// Main options array
let options;

// Config, api
let config, api, apiYAML;

const log4js = require('log4js');
const logger = log4js.getLogger();
logger.level = "INFO"; // To be sure we get some tracing during options parsing and final log level setting.

const commandLineArgs = require('command-line-args');
const commandLineUsage = require('command-line-usage');

const yaml = require('js-yaml');
const fs   = require('fs');

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
		description: 'The GitHub user name.'
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
		description: 'The port to listen to (default 8183).',
		defaultValue: 8183
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
		description: 'Log file path. Default: /var/tmp/yoda-restapi/yoda-restapi.log',
		defaultValue: '/var/tmp/yoda-restapi/yoda-restapi.log'
	},
	{
		name: 'config',
		type: String,
		description: 'Config file path. Default: /var/tmp/yoda-restapi/config.yaml',
		defaultValue: '/var/tmp/yoda-restapi/config.yaml'
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
		name: 'help',
		alias: 'h',
		type: Boolean,
		defaultValue: false,
		description: "Print help/usage message."
	}	
];

const sections = [
	{
		header: 'Yoda REST API',
		content: 'Simplified REST API towards issues in multiple repos and does high level filtering and aggregation according to configurable rules.'
	},
	{
		header: 'Options',
		optionList: optionDefinitions
	}
]

const usage = commandLineUsage(sections);

function parseOptions() {
	try {
		// If env variable YODA_RESTAPI_OPTIONS is set, use this instead.
		if (process.env.YODA_RESTAPI_OPTIONS != undefined)
			options = commandLineArgs(optionDefinitions, {argv: process.env.YODA_RESTAPI_OPTIONS.split(" ")});
		else
			options = commandLineArgs(optionDefinitions);
		
		if (options['help'] == true) {
			logger.info(usage);
			process.exit(0);
		}

		let error = false;
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

	// Derived detauls
	if (options['baseurlui'] == "") {
		var url = new URL(options['baseurl']);
		options['baseurlui'] = url.protocol + "//" + url.hostname + "/";
	} 

	// Read config file.
	try {
		config = yaml.load(fs.readFileSync(options['config'], 'utf8'));
  	} catch (e) {
		logger.error("Could not read config file. Error: " + e);
		process.exit(1);
  	}

	// Read OpenAPI spec
	try {
		apiYAML = fs.readFileSync('yoda-restapi-swagger.yaml', 'utf8');
		api = yaml.load(apiYAML);
  	} catch (e) {
		logger.error("Could not read OpenAPI spec. Error: " + e);
		process.exit(1);
  	}
  
	logger.info("Options: " + JSON.stringify(options));
	logger.info("Config: " + JSON.stringify(config));
	logger.info("OpenAPI: " + JSON.stringify(api));
}

function getOption(option) {
	return options[option];
}

function getConfig() {
	return config;
}

function getAPI() {
	return api;
}

function getAPIYAML() {
	return apiYAML;
}
