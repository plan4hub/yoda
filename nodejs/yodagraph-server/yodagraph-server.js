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
const { url } = require('inspector');
var logger = log4js.getLogger();

// The queryCache.
const queryCache = new Map();

var browser;

async function init() {
    args = ['--no-sandbox']; // '--disable-setuid-sandbox'
    if (configuration.getOption('proxy') != undefined) {
        args.push('--proxy-server=' + configuration.getOption('proxy'));
    }

    logger.info("Launching browser with args:");
    logger.info(args);
    browser = await puppeteer.launch({
        args: args,
//        headless: false,
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

// Usage
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
        res.writeHead(200, { 'Content-type': 'text/html' });
        res.end(usage);
        return
    } else {
        var url = req.url.substring(ui + 4);
    }

    let promise;
    let resusePromise;
    if (queryCache.has(req.url)) {
        logger.info("Reusing query promise for " + req.url);
        promise = queryCache.get(req.url);
        resusePromise = true;
    } else {
        logger.info("Building new query promise for " + req.url);
        resusePromise = false;
        promise = new Promise(async resolve => {
            try {
                // Width?
                var w = req.url.match(/width=([0-9]*)/);
                if (w != undefined)
                    width = parseInt(w[1]);
                else
                    width = configuration.getOption('width');
                logger.trace("Width set at " + width);

                // Add user/token?
                if (url.indexOf("user=") == -1 && configuration.getOption('user') != undefined) {
                    logger.trace("Added default user and password");
                    url += "&user=" + configuration.getOption('user') + "&token=" + configuration.getOption('password');
                }
                logger.debug("Url: " + url);

                // then we need to start a browser tab
                let page = await browser.newPage();
                logger.trace("New page created");

                await page.setViewport({
                    width: width,
                    height: 2000,
                    deviceScaleFactor: 1,
                });
                logger.trace("View port set.");

                try {
                    await page.goto(url, {
                        //            waitUntil: 'domcontentloaded'
                        //            waitUntil: 'networkidle0'
                    });
                } catch (err) {
                    logger.error("Failed loading page for url: " + url);
                    logger.error(err);
                    resolve([404, { 'Content-type': 'text/html' }, "Error doing GET on specified url"]);
                }

                var data = null;
                try {
                    await page.evaluate('Chart.defaults.animation = false;'); // turn off Chartjs animations.

                    await page.waitForFunction('document.querySelector("#canvas").height > 400', {
                        timeout: configuration.getOption('timeout')
                    });
                    data = await page.evaluate(() => {
                        return document.querySelector('#canvas').toDataURL('image/png');
                    });
                } catch (err) {
                    logger.error("Failed building or getting graph for url: " + url);
                    resolve([404, { 'Content-type': 'text/html' }, "Error waiting for graph - likely timeout"]);
                }

                // strip off the data: url prefix to get just the base64-encoded bytes and then put as buffer
                var buf = Buffer.from(data.replace(/^data:image\/\w+;base64,/, ""), 'base64');

                // close page
                // Don't close last page as this will be keeping application storage stuff.
                var pages = await browser.pages();
                if (pages.length > 2)
                    await page.close();

                logger.info("Succesfully responded with graph for url: " + url);
                resolve([200, { 'Content-type': 'image/png' }, buf]);
            } catch (e) {
                logger.error(e);
                resolve([500, { 'Content-type': 'text/html' }, 'Error: Check log file.']);
            }
        });
        // Store the promise in the cache 
        queryCache.set(req.url, promise);
    }
    [httpCode, header, result] = await promise;

    // If new promise, start the timer
    if (!resusePromise)
        setTimeout(() => {
            logger.info("Clearing cache for: " + req.url);
            queryCache.delete(req.url);
        }, configuration.getOption('cache-timeout') * 1000);

    res.writeHead(httpCode, header);
    res.end(result);
}

// Set things up
init();

//	Be prepared for shutdown
process.on('SIGINT', () => {
    logger.info("Received SIGINT. Shutting down.");
    server.close(function() {stop(); process.exit(0)});
});

if (configuration.getOption('cert') == undefined) {
    // HTTP
    // Start the server.
    logger.info("Bringing up server in HTTP mode.");
    const server = http.createServer(listener);
    server.listen(configuration.getOption('port'));
    logger.trace(server);
} else {
    // HTTPS
    // Start the server. 
    logger.info("Bringing up server in HTTPS mode.");

    const options = {
      key: fs.readFileSync(configuration.getOption('cert-key')),
      cert: fs.readFileSync(configuration.getOption('cert'))
    };

    const server = https.createServer(options, listener);
    server.listen(configuration.getOption('port'));
}

