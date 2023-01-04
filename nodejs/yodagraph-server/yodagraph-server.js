// Script to get yodagraph using Puppeteer (headless browser interface). Will trigger building of a Yoda graph based on full Yoda tool URL given
// and then wait for the "canvas" selector to product the graph. At this point it will be either saved to a file (command line version) OR 
// returned in an HTTP response (server version). 

// As the server version will make use of Puppeteer in container build (https://pptr.dev/guides/docker) that script (yodagraph-server.js) will
// not include several additional libraries (like command line parsing) as that would require the docker image to be modified.

// This is the server version

const puppeteer = require('puppeteer');
const http = require('http');

var browser;

async function init() {
    // First, we must launch a browser instance
    browser = await puppeteer.launch({
        // Headless option allows us to disable visible GUI, so the browser runs in the "background"
        // for development lets keep this to true so we can see what's going on but in
        // on a server we must set this to true
        headless: false,
        // This setting allows us to scrape non-https websites easier
        ignoreHTTPSErrors: true,
    })
    browser.on('disconnected', init);  // restart on crash
}

async function stop() {
    console.log("Puppetteer stopping .. ")
    await browser.close();
}

//    res.writeHead(200);
//    res.end('Hello, World!');
async function listener(req, res) {
    ui = req.url.indexOf('url=');
//    console.log(req.url, ui);
    if (ui == -1) {
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
        res.writeHead(404,{'Content-type':'text/html'});
        res.end("Error doing GET on specified url");
        return
    }

    var data = null;
    // const watchDog = page.waitForFunction('document.querySelector("#canvas").height > 400');
    try {
        await page.evaluate('Chart.defaults.animation = false;'); // turn off Chartjs animations.
        await page.waitForFunction('document.querySelector("#canvas").height > 400', {
            timeOut: 90000
        });
        data = await page.evaluate(() => {
            return document.querySelector('#canvas').toDataURL('image/png');
        });
    }  catch (err) {
        res.writeHead(404,{'Content-type':'text/html'});
        res.end("Error waiting for graph - likely timeout");
        return
    }

    // strip off the data: url prefix to get just the base64-encoded bytes and then put as buffer
    var buf = Buffer.from(data.replace(/^data:image\/\w+;base64,/, ""), 'base64');
    res.writeHead(200,{'Content-type':'image/png'});
    res.end(buf);

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
    console.log('Received SIGINT. Shutting down.');
    server.close(function() {stop(); process.exit(0)});
});

const server = http.createServer(listener);
server.listen(8899);
