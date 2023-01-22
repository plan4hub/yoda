// Script to get a specified HTML using Puppeteer (headless browser interface). Will trigger building of the URL given
// and then wait for the supplied selector to change data. At this point it will be either saved to a file or returned to standard out.

// While the tool can be run locally a container version based on Puppeteer in container build (https://pptr.dev/guides/docker) may be
// a bit smarter.


const puppeteer = require('puppeteer')
const commandLineArgs = require('command-line-args');
const commandLineUsage = require('command-line-usage');
const fs = require('fs');

//Command line defintions
const optionDefinitions = [
	{
		name: 'verbose',
		alias: 'v',
		type: Boolean,
		description: 'Verbose mode.',
		defaultValue: false
	},
	{
		name: 'url',
		alias: 'u',
		type: String,
		description: "Full URL to run, including any arguments. You may need to quote/double-quote the URL.",
	},
	{
		name: 'id',
		type: String,
		description: "The HTML id to watch for changes. Mandatory."
	},
	{
		name: 'gettag',
		type: String,
		description: "The HTML tag (not id) to retrieve. For HTML default is html (i.e. the full page)."
	},
	{
		name: 'getid',
		type: String,
		description: "The HTML id. For png files, default is to get using id."
	},
	{
		name: 'poll',
		type: Number,
		description: "Number of ms to wait between polling to see if HTML id rendered. Default 500 ms.",
		defaultValue: 500
	},
	{
		name: 'file',
		alias: 'f',
		type: String,
		description: "File name to use when storing graph. If not supplied, will write to standard out."
	},
	{
		name: 'width',
		alias: 'w',
		type: Number,
		description: 'Browser window width. Default 1200.',
		defaultValue: 1200
	},
	{
		name: 'type',
		alias: 't',
		type: String,
		description: 'Type of element to retrieve. Support are png, html. Default: html',
		defaultValue: 'html'
	},
	{
		name: 'template',
		type: String,
		description: 'Merge result into a specified (typically HTML) template doc. Will replace <_HTMLGET_> tag.'
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
		header: 'html-get',
		content: 'Build web page for specified HTML Retrieve element (html, png types supported).'
	},
	{
		header: 'Options',
		optionList: optionDefinitions
	}
]

const usage = commandLineUsage(sections);

async function run(options) {
	// First, we must launch a browser instance
	const browser = await puppeteer.launch({
		// Headless option allows us to disable visible GUI, so the browser runs in the "background"
		// for development lets keep this to true so we can see what's going on but in
		// on a server we must set this to true
		headless: true,
		// This setting allows us to scrape non-https websites easier
		ignoreHTTPSErrors: true,
		args: ['--no-sandbox', '--disable-setuid-sandbox']
	})
	// then we need to start a browser tab
	let page = await browser.newPage();

	if (options["verbose"])
		page.on('console', async (msg) => {
			const msgArgs = msg.args();
			for (let i = 0; i < msgArgs.length; ++i)
				console.log(await msgArgs[i].jsonValue());
		});

	// Set the viewport (windows size)
	await page.setViewport({
		width: options["width"],
		height: 1000, // TBD, maybe do something smarter. Eg. ratio to width with a minimum.
		deviceScaleFactor: 1
	});

	// and tell it to go to some URL
	await page.goto(options['url'], {
		waitUntil: 'domcontentloaded',
	});

	const type = options['type'];
	if (options['type'] == 'png')
		await page.evaluate('try { Chart.defaults.animation = false; } catch (e) { }'); // Could be a chartjs page, let's turn off animation and ignore any errors doing so

	// Get content now
	const selector = options['id'];
	const [status, beforeContent] = await page.evaluate((selector, type) => {
		let before;
		try {
			let element = document.querySelector(selector);
			if (element == null)
				return [false, "No such id"];
			if (type == 'html')
				before = document.querySelector(selector).getInnerHTML();
			else if (type == 'png')
				before = document.querySelector(selector).toDataURL('image/png');
		} catch (error) {
			return [false, error];
		}
		return [true, before];
	}, selector, type);

	if (status == false) {
		console.log("Problem during setup: " + beforeContent);
		process.exit(1);
	}

	await page.waitForFunction((selector, beforeContent, type) => {
		if (type == 'html')
			return document.querySelector(selector).getInnerHTML() != beforeContent
		else if (type == 'png')
			return document.querySelector(selector).toDataURL('image/png') != beforeContent
	}, { polling: /* options['poll'] */ 1000 }, selector, beforeContent, type);

	// Get the data
	let result = await page.evaluate((selectorId, selectorTag, type) => {
		if (type == 'html') {
			if (selectorId != undefined)
				return document.querySelector(selectorId).outerHTML;
			else
				return document.getElementsByTagName(selectorTag)[0].outerHTML;
		} else if (type == 'png') {
			if (selectorId != undefined)
				return document.querySelector(selectorId).toDataURL('image/png');
			else
				return document.getElementsByTagName(selectorTag)[0].toDataURL('image/png');
		}
	}, options['getid'], options['gettag'], type);

	// Template?
	if (options['template'] != undefined) {
		let template = fs.readFileSync(options['template'], 'utf8');
		result = template.replace("<_HTMLGET_>", result);
	}

	if (options['type'] == 'png')
		result = Buffer.from(result.replace(/^data:image\/\w+;base64,/, ""), 'base64');

	if (options['file'] != undefined) {
		fs.writeFile(options['file'], result, function (err) {
			if (err) throw err;
		});
	} else {
		// Write to stdout
		fs.write(process.stdout.fd, result, function (err) {
			if (err) throw err;
		});
	}

	// close everything
	await page.close();
	await browser.close();
}

var options;
try {
	options = commandLineArgs(optionDefinitions);

	if (options['help'] == true) {
		console.log(usage);

		console.log("Examples:");
		console.log('node html-get.js --file mygraph1.png -t png -id canvas --url "https://pages.github.hpe.com/hpsd/yoda/yoda-cfd.html?owner=hpsd&repolist=hpsd&interval=7&labelfilter=T1%20-%20Defect,^C%20-&title=NFV-D%20Customer%20Encountered%20Defects&draw=cfd&dark=true&user=(github-user)&token=(github-token)"');
		console.log('');
		console.log('node html-get.js -id RN --url (release notes URL incl. user/token)');
		console.log('');
		console.log('node html-get.js --url "https://pages.github.hpe.com/hpsd/yoda/yoda-exporter.html?owner=hpsd&repolist=yoda&estimate=inbody&table=true&user=(github-user)&token=(github-token)" --id "#issuesTable" --file issues.html --template yoda-template.html --getid "#issuesTable"');
		console.log('');
		console.log('docker run -i --init --cap-add=SYS_ADMIN html-get --url "https://pages.github.hpe.com/hpsd/yoda/yoda-current-stats.html?owner=hpsd&repolist=yoda&draw=true&user=(github-user)&token=(github-token)" --type png --id "#canvas" > yoda.png');
		console.log('');
		console.log('docker run -i --init --cap-add=SYS_ADMIN html-get --url "https://pages.github.hpe.com/hpsd/yoda/yoda-exporter.html?owner=hpsd&repolist=yoda&estimate=inbody&table=true&user=(github-user)&token=(github-token)" --id "#issuesTable" --getid "#issuesTable" --template yoda-template.html');
		process.exit(0);
	}

	let error = false;
	if (options['url'] == undefined) {
		console.log("No --url or -u given");
		error = true;
	}

	if (options['id'] == undefined) {
		console.log("No --id given");
		error = true;
	}

	if (options['type'] != 'html' && options['type'] != 'png') {
		console.log("Unsupported type");
		error = true;
	}

	if (error) {
		console.log(usage);
		process.exit(1);
	}
}
catch (err) {
	console.log(usage);
	process.exit(1);
}


if (options['type'] == 'html') {
	if (options['gettag'] == undefined && options['getid'] == undefined) 
		options['gettag'] = 'html';
} else if (options['type'] == 'png') {
	if (options['gettag'] == undefined && options['getid'] == undefined) 
		options['getid'] = options['id'];
}	

var verbose = options['verbose'];
if (verbose)
	console.log(options);


run(options);
