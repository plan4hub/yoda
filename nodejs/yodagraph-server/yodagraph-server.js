// Script to get yodagraph using Puppeteer (headless browser interface). Will trigger building of a Yoda graph based on full Yoda tool URL given
// and then wait for the "canvas" selector to product the graph. At this point it will be either saved to a file (command line version) OR 
// returned in an HTTP response (server version). 

// The server version will extend docker images as defined in https://pptr.dev/guides/docker) 

// This is the server version

// docker start command:  docker run -i --init --cap-add=SYS_ADMIN -p 8899:8899 -e YODAGRAPH_SERVER_OPTIONS="--loglevel debug" --rm yodagraph-server:latest

const puppeteer = require('puppeteer');
const http = require('http');
const https = require('https')
const fs = require('fs')

// First do config. This will get things rolling
const configuration = require('./configuration.js');
configuration.parseOptions();

// log4js
const log4js = require('log4js');
var logger = log4js.getLogger();

var browser;

async function init() {
    logger.info("Launching browser ...");
    browser = await puppeteer.launch({
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox'
        ],
        ignoreHTTPSErrors: true,

    });
    logger.info("Succesfully launched browser");

    browser.on('disconnected', init);  // restart on crash
}

async function stop() {
    logger.info("Closing browser .. ")
    await browser.close();
    logger.info("Succesfully closed browser.")
}


var usage = `<html>
<body>
    <h1>Yodagraph Server</h1>
    <p>Usage:</p>
    <p>width=(width of canvas in pixels). Optional</p>
    <p>url=(full Yoda url). MUST be last argument</p>
</body>
</html>`;


// The main listener
async function listener(req, res) {
    ui = req.url.indexOf('url=');
    if (ui == -1) {
        logger.warn("WARNING: Received request without url: " + req.url);
        res.writeHead(200,{'Content-type':'text/html'});
        res.end(usage);
        return
    } else {
        url = req.url.substring(ui + 4);
    }

    // Width?
    var w = req.url.match(/width=([0-9]*)/);
    if (w != undefined) 
        width = parseInt(w[1]);
    else
        width = configuration.getOption('width');

    logger.debug("Received url: " + url);

    // then we need to start a browser tab
    let page = await browser.newPage();

    await page.setViewport({
        width: width,
        height: 2000,
        deviceScaleFactor: 1,
      });

    try {
        await page.goto(url, {
            waitUntil: 'domcontentloaded'
        });
    } catch (err) {
        logger.error("Failed loading page for url: " + url);
        res.writeHead(404,{'Content-type':'text/html'});
        res.end("Error doing GET on specified url");
        return
    }

    var data = null;
    try {
        await page.evaluate('Chart.defaults.animation = false;'); // turn off Chartjs animations.

        await page.waitForFunction('document.querySelector("#canvas").height > 400', {
            timeOut: configuration.getOption('timeout')
        });
        data = await page.evaluate(() => {
            return document.querySelector('#canvas').toDataURL('image/png');
        });
    }  catch (err) {
        logger.error("Failed building or getting graph for url: " + url);
        res.writeHead(404,{'Content-type':'text/html'});
        res.end("Error waiting for graph - likely timeout");
        return
    }

    // strip off the data: url prefix to get just the base64-encoded bytes and then put as buffer
    var buf = Buffer.from(data.replace(/^data:image\/\w+;base64,/, ""), 'base64');
    res.writeHead(200,{'Content-type':'image/png'});
    res.end(buf);
    logger.debug("Succesfully responded with graph for url: " + url);

    // close page
    // Don't close last page as this will be keeping application storage stuff.
    var pages = await browser.pages();
    if (pages.length > 2)
        await page.close();
}

// Set things up
init();

//	Be prepared for shutdown
process.on('SIGINT', () => {
    logger.info("Received SIGINT. Shutting down.");
    server.close(function() {stop(); process.exit(0)});
});

const server = http.createServer(listener);
server.listen(8899);
