// Script to get yodagraph using Puppeteer (headless browser interface). Will trigger building of a Yoda graph based on full Yoda tool URL given
// and then wait for the "canvas" selector to product the graph. At this point it will be either saved to a file (command line version) OR 
// returned in an HTTP response (server version). 

// As the server version will make use of Puppeteer in container build (https://pptr.dev/guides/docker) that script (yodagraph-server.js) will
// not include several additional libraries (like command line parsing) as that would require the docker image to be modified. KISS.

// This is the server version

// docker start command: docker run -i --init --cap-add=SYS_ADMIN -p 8899:8899 --rm ghcr.io/puppeteer/puppeteer:latest node -e "$(cat yodagraph-server.js)"

const puppeteer = require('puppeteer');
const http = require('http');
const https = require('https')
const fs = require('fs')

var browser;

async function init() {
    console.log("INFO: Launching browser ...")
    browser = await puppeteer.launch({
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox'
        ],
        ignoreHTTPSErrors: true,

    });
    console.log("INFO: Succesfully launched browser")

    browser.on('disconnected', init);  // restart on crash
}

async function stop() {
    console.log("INFO: Puppetteer stopping .. ")
    await browser.close();
}

// The main listener
async function listener(req, res) {
    ui = req.url.indexOf('url=');
    if (ui == -1) {
        console.log("WARNING: Received request without url: " + req.url);
        res.writeHead(404,{'Content-type':'text/html'});
        res.end("No url argument given.");
        return
    } else {
        url = req.url.substring(ui + 4);
    }

    // then we need to start a browser tab
    let page = await browser.newPage();

    await page.setViewport({
        width: 1200,
        height: 1000,
        deviceScaleFactor: 1,
      });

    try {
        await page.goto(url, {
            waitUntil: 'domcontentloaded'
        });
    } catch (err) {
        console.log("ERROR failed loading page for url: " + url);
        res.writeHead(404,{'Content-type':'text/html'});
        res.end("Error doing GET on specified url");
        return
    }

    var data = null;
    try {
        await page.evaluate('Chart.defaults.animation = false;'); // turn off Chartjs animations.

        await page.waitForFunction('document.querySelector("#canvas").height > 400', {
            timeOut: 90000
        });
        data = await page.evaluate(() => {
            return document.querySelector('#canvas').toDataURL('image/png');
        });
    }  catch (err) {
        console.log("ERROR: Error building or getting graph for url: " + url);
        res.writeHead(404,{'Content-type':'text/html'});
        res.end("Error waiting for graph - likely timeout");
        return
    }

    // strip off the data: url prefix to get just the base64-encoded bytes and then put as buffer
    var buf = Buffer.from(data.replace(/^data:image\/\w+;base64,/, ""), 'base64');
    res.writeHead(200,{'Content-type':'image/png'});
    res.end(buf);
    console.log("DEBUG: Succesfully responded with graph for url: " + url);

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
    console.log('INFO: Received SIGINT. Shutting down.');
    server.close(function() {stop(); process.exit(0)});
});

const server = http.createServer(listener);
server.listen(8899);
