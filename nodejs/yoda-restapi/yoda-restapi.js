// First do config. This will get things rolling
const configuration = require('./configuration.js');
configuration.parseOptions();

const http = require('http');
const https = require('https')

const url = require('url');

const fs = require('fs');

// log4js
const log4js = require('log4js');
const logger = log4js.getLogger();

const { Octokit } = require('@octokit/rest');

const yodaAppModule = require('./github-app.js');
const yoda = require('./yoda-utils.js');

const { debug } = require('console');

let userOctokit = null;
let fallbackOctokit = null;

// The /issues queryCache.
const queryCache = new Map();

function init() {
	// We will built a userOctokit IF a password (token) is given
//	if (!configuration.getOption("app-mode")) {
	if (configuration.getOption('password') != undefined) {
		const authString = "token " + configuration.getOption('password');
		userOctokit = new Octokit({
			userAgent: 'yoda-restapi',
			baseUrl: configuration.getOption('baseurl'),
			log: logger,
			auth: authString
		});
	} else {
		fallbackOctokit = new Octokit({
			userAgent: 'yoda-restapi',
			baseUrl: configuration.getOption('baseurl'),
			log: logger
		});
	}
}

init();

// Run as GitHub App?
if (configuration.getOption("app-mode"))
	yodaAppModule.init();

logger.info("Server starting ...");

//	If we are running in GitHub App mode, let's listen as well for installation events. They are interesting....
/* if (configuration.getOption('app-mode')) {
	webhooks.on('installation', ({ id, name, payload }) => {
		yodaAppModule.checkEvent(id, name, payload);
	});
} */

function getOctokit(owner) {
	if (configuration.getOption("app-mode")) {
		const ok = yodaAppModule.getAppOctokit(owner);
		if (ok != null)
			return ok;
		if (userOctokit != null)
			return userOctokit;
		else
			return fallbackOctokit;			
	} else {
		return userOctokit;
	}
}

// The main listener
// https://nodejs.org/en/docs/guides/anatomy-of-an-http-transaction/
async function listener(req, res) {
	// Let's prepare some common headers which must always be set.
	res.setHeader('Access-Control-Allow-Origin', '*');  // To allow CORS stuff in e.g. swagger UI

	const pre_q = url.parse(req.url, true);

	// First a special check. Is the client asking for our docs via the docs endpoint; then let's give it.
	if (pre_q.pathname == "/docs") {
		logger.info("Serving OpenAPI spec via /docs endpoint");
		const apiYAML = configuration.getAPIYAML();
		res.writeHead(200, { 'Content-type': 'text/yaml' });
		res.end(apiYAML);
		return;
	}

	// Get handle for config. Will be used extensively below.
	const c = configuration.getConfig();

	// First cause of action is to validate that user is authorized to even talk to us.
	// token can be in either the header or the URL as query param.
	let token = "";
	if (req.headers["authorization"] != undefined) {
		logger.debug("Found Authorization in header");
		token = req.headers["authorization"].split(" ")[1];
	} else if (pre_q.query["Authorization"] != undefined) {
		logger.debug("Found Authorization in query");
		token = pre_q.query["Authorization"];
	}
	if (token == "") {
		logger.info("Rejecting request. No token");
		res.writeHeader(401, { 'Content-type': 'application/json' });
		res.end('{"message": "No token supplied"}');
		return;
	}
	let validToken = false;
	for (let t in c.tokens) {
		if (c.tokens[t]["token"] == token) {
			logger.info("Token match: " + t);
			validToken = true;
			break;
		}
	}
	if (!validToken) {
		logger.info("Rejecting request. Invalid token");
		res.writeHeader(401, { 'Content-type': 'application/json' });
		res.end('{"message": "Invalid token supplied"}');
		return;
	}

	// Second cause of action is to see if we have a reference to (one or more) stored queries.
	let extraQ = "";
	if (pre_q.query["query"] != undefined) {
		const qArr = pre_q.query["query"].split(",");
		for (let qi = 0; qi < qArr.length; qi++) {
			if (c.queries[qArr[qi]] == undefined) {
				res.writeHead(400, { 'Content-type': 'application/json' });
				res.end('{"message": "No such stored query: ' + qArr[qi] + '"}');
				return
			}
			extraQ += "&" + c.queries[qArr[qi]]["parameters"];
			logger.info("Added query: " + qArr[qi] + ". Parameters now: " + extraQ);
		}
	}

	let q = url.parse(req.url + extraQ, true);
	if (req.method != "GET" || ["/issues", "/products", "/queries"].indexOf(q.pathname) == -1) {
		res.writeHead(400, { 'Content-type': 'application/json' });
		res.end('{"message": "Unsupported method/endpoint: ' + req.method + ' ' + q.pathname + '"}');
		return
	}

	logger.debug("query:", q.search);
	if (q.pathname == "/products") {
		// products query
		logger.info("Serving product search: " + req.url);
		let products = [];
		for (let p in c.products) {
			let components = [];
			for (let comp in c.products[p]["components"])
				components.push({ component: comp, component_name: c.products[p]["components"][comp]["component_name"]});
			products.push({ product: p, product_name: c.products[p]["product_name"], product_family: c.products[p]["product_family"], components: components });
		}
		res.writeHead(200, { 'Content-type': 'application/json' });
		res.end(JSON.stringify(products));
	} else if (q.pathname == "/queries") {
		// queries
		logger.info("Serving queries search: " + req.url);
		let queries = [];
		for (let q in c.queries)
			queries.push({ query: q, description: c.queries[q]["description"], parameters: c.queries[q]["parameters"] });
		res.writeHead(200, { 'Content-type': 'application/json' });
		res.end(JSON.stringify(queries));
	} else {
		// issues query
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
					// First let's get all fields. 
					// Fields. First get all fields from Swagger UI
					const allFields = configuration.getAPI()["paths"]["/issues"]["get"]["responses"]["200"]["content"]["application/json"]["schema"]["items"]["properties"];
					logger.trace("All fields:");
					logger.trace(allFields);

					// Then, lets determine the fields for this query. If no field argument given, that means all of them.
					let fields;
					if (q.query["fields"] != undefined) {
						fields = q.query["fields"];
						// Make sure that all fields mentioned are indeed one of the allowed fields.
						const fieldArray = fields.split(",");
						for (let fi = 0; fi < fieldArray.length; fi++) {
							let f;
							if (fieldArray[fi].indexOf(":"))
								[f, _] = fieldArray[fi].split(":");
							else
								f = fieldArray[fi];
							if (allFields[f] == undefined)
								resolve([400, { 'Content-type': 'application/json' }, '{"message": "Unsupported field requested: ' + fieldArray[fi] + '"}']);
						}
					} else
						fields = Object.keys(allFields).join(",")

					let products = null;
					if (q.query["product"] != undefined) {
						products = q.query["product"].split(",");
						logger.info("Searching for product(s): " + products);
					}

					let components = null;
					if (q.query["component"] != undefined) {
						components = q.query["component"].split(",");
						logger.info("Searching for components(s): " + components);
					}

					// Step 1: Determine products to be addressed, extra repos (may contain topic based search)
					let repos = []
					let c = configuration.getConfig();
					for (let p in c.products) {
						// Include this product?
						if ((products == null && c.products[p]["exclude_from_all"] != true) || (products != null && products.indexOf(p) != -1)) { // Yes, we include  
							for (let comp in c.products[p]["components"]) {
								// Include this component?
								if (components == null || (components != null && components.indexOf(comp) != -1)) { // Yes, we include  
									// Include all repos
									for (let i = 0; i < c.products[p]["components"][comp]["repositories"].length; i++) {
										let repo = c.products[p]["components"][comp]["repositories"][i];
										logger.debug(p, comp, repo, i);
										repos.push({ repospec: repo, component: comp, component_name: c.products[p]["components"][comp]["component_name"], product: p, product_name: c.products[p]["product_name"], product_family: c.products[p]["product_family"] });
									}
								}
							}
						}
					}

					// Step 2: Expand repos / do repo search as required.
					let ri = repos.length;
					while (ri--) {
						let [owner, repo] = repos[ri].repospec.split("/");
						repos[ri].owner = owner;

						if (repo[0] == "@") { // topic
							let q = "org:" + owner + "+archived:false";

							let topics = repo.substring(1).split(",");
							let negative_topic = [];
							for (let t = 0; t < topics.length; t++)
								if (topics[t].charAt(0) == "-")
									negative_topic.push(topics[t].substring(1))
								else
									q += "+topic:" + topics[t];

							logger.debug("Doing repo search: " + q);
							const topicRepos = await getOctokit(owner).paginate(
								getOctokit(owner).rest.search.repos,
								{
									q: q,
									per_page: 100
								},
								(response) => response.data
							);

							// Handle any negative matches
							if (negative_topic.length > 0) {
								r = topicRepos.length;
								while (r--)
									for (let t = 0; t < topicRepos[r].topics.length; t++)
										if (negative_topic.indexOf(topicRepos[r].topics[t]) != -1) {
											topicRepos.splice(r, 1);
											break;
										}
							}
							logger.debug(topicRepos.map(x => x.name));

							// Now we need to update repos list (the list we are iterating...), duplicating the search entry with all it's values x times.
							for (let t = 0; t < topicRepos.length; t++) {
								let newRepo = yoda.deepCopy(repos[ri]);
								newRepo.repo = topicRepos[t].name;
								delete newRepo.repospec;
								repos.push(newRepo);
							}
							// Remove the "search entry"
							repos.splice(ri, 1);
						} else {
							repos[ri].repo = repo; // direct repo spec
						}
					}
					logger.debug("Extracting product repos to scope: ")
					logger.trace(repos);

					// Step 3: Loop products/repos, getting all relevant issues (taking into account any filtering)
					// First, let's investigate the query paramters and pass directly to the GitHub request.
					let params = { state: 'open' };
					for (let p in q.query)
						if (["state", "labels", "since"].indexOf(p) != -1)
							params[p] = q.query[p];
					logger.debug("Query parameters:");
					logger.debug(params);

					let result = [];
					for (let ri = 0; ri < repos.length; ri++) {
						// Let's get'em...
						const issues = await getOctokit(repos[ri].owner).paginate(
							getOctokit(repos[ri].owner).rest.issues.listForRepo,
							{
								owner: repos[ri].owner,
								repo: repos[ri].repo,
								per_page: 100,
								direction: "asc",
								...params
							},
							(response) => response.data
						);

						// Filter out Pull requests. They are always return alongside issues - a bit annoying...
						let i = issues.length;
						while (i--)
							if (issues[i].pull_request != null)
								issues.splice(i, 1);

						// Step 4: Now time for the really difficult - and interesting - part. Let's bring extra fields as defined by "extra_fields" in the config file.
						for (let i = 0; i < issues.length; i++) {
							for (let ef in c.extra_fields) {
								let rule = c.extra_fields[ef]["rule"];
								let pattern = c.extra_fields[ef]["pattern"];
								switch (rule) {
									case 'extract_label':
										let result = yoda.getMatchingLabels(issues[i], pattern, c.extra_fields[ef]["separator"], c.extra_fields[ef]["none_value"]);
										// Mapping?
										if (c.extra_fields[ef]["mapping"] != undefined)
											result = eval('let map = [];' + c.extra_fields[ef]["mapping"] + 'map[result] != undefined?map[result]:result;')
										issues[i][ef] = result;
										break;
									case 'binary_label':
										if (yoda.labelMatch(issues[i], pattern))
											issues[i][ef] = c.extra_fields[ef]["value_match"];
										else
											issues[i][ef] = c.extra_fields[ef]["value_nomatch"];
										break;
									case 'extract_issue':
										issues[i][ef] = yoda.extractFromIssue(issues[i], c.extra_fields[ef]["field"], pattern, c.extra_fields[ef]["none_value"]);
										break;
									// Should we have also "extract_body" for "> XX" fields?
									default:
										logger.error("Encountered unknown rule: " + rule);
										resolve([500, { 'Content-type': 'application/json' }, '{"message": "Internal error occurred. Check log file."}']);
								}
							}
						}

						// Step 5: Issue filtering based on regexp (or more?)
						if (q.query["regexp_filter"] != undefined) {
							let i = issues.length;
							while (i--)
								if (!yoda.filterIssueReqExp(issues[i], q.query["regexp_filter"]))
									issues.splice(i, 1);
						}

						// Step 6: Add issue to result using specified fields
						const fieldArray = fields.split(",");
						for (let i = 0; i < issues.length; i++) {
							// Synthetize fields...
							issues[i]["id"] = repos[ri]["owner"] + "/" + repos[ri]["repo"] + "#" + issues[i]["number"];
							issues[i]["repository"] = repos[ri]["owner"] + "/" + repos[ri]["repo"];

							let resultIssue = {};
							for (let fi in fieldArray) {
								let f, alias;
								if (fieldArray[fi].indexOf(":") != -1)
									[f, alias] = fieldArray[fi].split(":");
								else
									f = alias = fieldArray[fi];
								let v;
								if (['product', 'product_name', 'component', 'product_family'].indexOf(f) != -1)
									v = repos[ri][f];
								else
									v = issues[i][f];
								if (v != undefined)
									resultIssue[alias] = v;
								else
									resultIssue[alias] = null;
							}
							result.push(resultIssue);
						}
						logger.debug("Adding " + issues.length + " issues from " + repos[ri].owner + "/" + repos[ri].repo);
					}
					logger.info("Final # of issues for query: " + req.url + " is " + result.length);

					resolve([200, {'Content-type': 'application/json'}, JSON.stringify(result)]); 
				} catch (e) {
					logger.error(e);
					resolve([500, { 'Content-type': 'application/json' }, '{"message": "Internal error occurred. Check log file."}']);
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
}

let server;

if (configuration.getOption('cert') == undefined) {
    // HTTP
    // Start the server.
    logger.info("Bringing up server in HTTP mode.");
    server = http.createServer(listener);
	server.timeout = 0;
    server.listen(configuration.getOption('port'));
} else {
    // HTTPS
    // Start the server. 
    logger.info("Bringing up server in HTTPS mode.");

    const options = {
      key: fs.readFileSync(configuration.getOption('cert-key')),
      cert: fs.readFileSync(configuration.getOption('cert'))
    };

    server = https.createServer(options, listener);
	server.timeout = 0;
    server.listen(configuration.getOption('port'));
}

//	Be prepared for shutdown
process.on('SIGINT', () => {
    logger.info("Received SIGINT. Shutting down.");
    server.close(function() {stop(); process.exit(0)});
});

logger.info("Server running. Accepting connections on port: " + configuration.getOption('port'));
