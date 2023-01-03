// Script to get yodagraph using Puppeteer (headless browser interface). Will trigger building of a Yoda graph based on full Yoda tool URL given
// and then wait for the "canvas" selector to product the graph. At this point it will be either saved to a file (command line version) OR 
// returned in an HTTP response (server version). 

// As the server version will make use of Puppeteer in container build (https://pptr.dev/guides/docker) that script (yodagraph-server.js) will
// not include several additional libraries (like command line parsing) as that would require the docker image to be modified.

// This is the command line version.

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
		description: "Full Yoda URL for building the graph. Including user/owner. You may need to quote/double-quote the URL.",
	},
	{
		name: 'file',
		alias: 'f',
		type: String,
		description: "File name to use when storing graph (png format). Default yoda.png.",
        defaultValue: 'yoda.png'
	},
	{ 
		name: 'width',
		type: Number,
		description: 'Graph width. Height will come automatically based on this. Default 1200',
        defaultValue: 1200
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
      header: 'yodagraph',
      content: 'Build a Yoda graph (any graph) using a headless browser and save the image to a file.'
    },
    {
      header: 'Options',
      optionList: optionDefinitions
    }
  ]

const usage = commandLineUsage(sections);

async function run(options){
    // First, we must launch a browser instance
    const browser = await puppeteer.launch({
        // Headless option allows us to disable visible GUI, so the browser runs in the "background"
        // for development lets keep this to true so we can see what's going on but in
        // on a server we must set this to true
        headless: true,
        // This setting allows us to scrape non-https websites easier
        ignoreHTTPSErrors: true,
    })
    // then we need to start a browser tab
    let page = await browser.newPage();

    await page.setViewport({
        width: options["width"],
        height: 1000,
        deviceScaleFactor: 1,
      });

    // and tell it to go to some URL
    await page.goto(options['url'], {
        waitUntil: 'domcontentloaded',
    });

    const watchDog = page.waitForFunction('document.querySelector("#canvas").height > 400');
    await watchDog;

    const data = await page.evaluate(() => {
        return document.querySelector('#canvas').toDataURL('image/png');
      });

    // strip off the data: url prefix to get just the base64-encoded bytes and then put as buffer
    var buf = Buffer.from(data.replace(/^data:image\/\w+;base64,/, ""), 'base64');
    fs.writeFile(options['file'], buf, function(err) {
        if (err) throw err;
    });

    if (options["verbose"])
        console.log("File " + options['file'] + " succesfully written.");

    // close everything
    await page.close();
    await browser.close();
}

var options;
try {
  options = commandLineArgs(optionDefinitions);

  if (options['help'] == true) {
      console.log(usage);
      
      console.log("Example:");
      console.log('node yodagraph.js --file mygraph1.png --url "https://pages.github.hpe.com/hpsd/yoda/yoda-cfd.html?owner=hpsd&repolist=hpsd&interval=7&labelfilter=T1%20-%20Defect,^C%20-&title=NFV-D%20Customer%20Encountered%20Defects&draw=cfd&dark=true&user=(github-user)&token=(github-token)"');
      
      process.exit(0);
  }
  
  error = false;
  if (options['url'] == undefined) {
      console.log("No --url or -u given");
      error = true;
  }

  if (error) {
      console.log(usage);
      process.exit(1);
  }
}
catch(err) {
  console.log(usage);
  process.exit(1);
}

verbose = options['verbose'];
if (verbose)
  console.log(options);

run(options);
