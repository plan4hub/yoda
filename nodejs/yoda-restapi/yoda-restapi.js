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

function getOctokit(issueRef) {
	if (configuration.getOption("app-mode")) {
		const ok = yodaAppModule.getAppOctokit(issueRef);
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

	try {
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
			res.writeHeader(401);
			res.end();
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
			res.writeHeader(401);
			res.end();
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
			let products = [];
			for (let s in c.solutions)
				for (let p in c.solutions[s]["products"])
					products.push({ product: p, product_name: c.solutions[s]["products"][p]["product_name"], solution: s, solution_family: c.solutions[s]["solution_family"] });
			res.writeHead(200, { 'Content-type': 'application/json' });
			res.end(JSON.stringify(products));
		} else if (q.pathname == "/queries") {
			// queries
			let queries = [];
			for (let q in c.queries)
				queries.push({ query: q, description: c.queries[q]["description"], parameters: c.queries[q]["parameters"] });
			res.writeHead(200, { 'Content-type': 'application/json' });
			res.end(JSON.stringify(queries));
		} else {
			// /issues query

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
					if (allFields[fieldArray[fi]] == undefined) {
						res.writeHead(400, { 'Content-type': 'application/json' });
						res.end('{"message": "Unsupported field requested: ' + fieldArray[fi] + '"}');
						return
					}
				}
			} else
				fields = Object.keys(allFields).join(",")

			let products = null;
			if (q.query["product"] != undefined) {
				products = q.query["product"].split(",");
				logger.info("Searching for product(s): " + products);
			}

			// Step 1: Determine products to be addressed, extra repos (may contain topic based search)
			let repos = []
			let c = configuration.getConfig();
			for (let s in c.solutions)
				for (let p in c.solutions[s]["products"]) {
					// Include this product?
					if (products == null || products.indexOf(p) != -1) { // Yes, we include
						// Include all components
						for (let comp in c.solutions[s]["products"][p]["components"]) {
							// Include all repos
							for (let i = 0; i < c.solutions[s]["products"][p]["components"][comp]["repositories"].length; i++) {
								let repo = c.solutions[s]["products"][p]["components"][comp]["repositories"][i];
								logger.debug(s, p, comp, repo);
								repos.push({ repospec: repo, component: comp, component_name: c.solutions[s]["products"][p]["components"][comp]["component_name"], product: p, product_name: c.solutions[s]["products"][p]["product_name"], solution: s, solution_family: c.solutions[s]["solution_family"] });
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
					const topicRepos = await getOctokit().paginate(
						getOctokit().rest.search.repos,
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
				const issues = await getOctokit().paginate(
					getOctokit().rest.issues.listForRepo,
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
								res.writeHead(500, { 'Content-type': 'application/json' });
								res.end('{"message": "Internal error occurred. Check log file."}');
								return;
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

					let resultIssue = {};
					for (let fi in fieldArray) {
						let f = fieldArray[fi];
						let v;
						if (['product', 'product_name', 'component', 'solution', 'solution_family'].indexOf(f) != -1)
							v = repos[ri][f];
						else
							v = issues[i][f];
						if (v != undefined)
							resultIssue[f] = v;
						else
							resultIssue[f] = null;
					}
					result.push(resultIssue);
				}
				logger.debug("Adding " + issues.length + " issues from " + repos[ri].owner + "/" + repos[ri].repo);
			}
			logger.debug("Final # of issues is: " + result.length);

			res.writeHead(200, { 'Content-type': 'application/json' });
			res.end(JSON.stringify(result));
		}
	} catch (e) {
		logger.error(e);
		res.writeHead(500, { 'Content-type': 'application/json' });
		res.end('{"message": "Internal error occurred. Check log file."}');
	}
}

let server;

if (configuration.getOption('cert') == undefined) {
    // HTTP
    // Start the server.
    logger.info("Bringing up server in HTTP mode.");
    server = http.createServer(listener);
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
    server.listen(configuration.getOption('port'));
}

//	Be prepared for shutdown
process.on('SIGINT', () => {
    logger.info("Received SIGINT. Shutting down.");
    server.close(function() {stop(); process.exit(0)});
});

logger.info("Server running. Accepting connections on port: " + configuration.getOption('port'));
