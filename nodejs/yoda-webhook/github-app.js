module.exports = {checkEvent, init};

var log4js = require('log4js');
var logger = log4js.getLogger();

const configuration = require('./configuration.js');

const Octokit = require('@octokit/rest');


const { request } = require("@octokit/request");
const { createAppAuth } = require('@octokit/auth-app');


var auth = null;

const PRIVATE_KEY = "-----BEGIN RSA PRIVATE KEY-----\n" +
"MIIEowIBAAKCAQEA5n2pvJAB0qvm71icZxHLwGMUBhWOkoFF0msO5dgU9qbzUkts\n" +
"m41HVyT+cPz31BxRLBqqZu873Ueb19PpERH683GQA0CynLNK8VqQxi5WaqGWxQir\n" +
"VVWCWwKMnZ7vEk7y03VeYPzN3F1/y+N/pBZQoK2EjBR0Lte7Poh/FCFK5GpQDh+0\n" +
"iTKASq8kMVDHNWnyi2oeq68ujIBVJC5CfDoOIAWqwpfu7U/dWFdpNF/albjUBZEn\n" +
"U3QfBaqI71MrKvnbgz6WmM5vaoSB45myPQ+2wgYWmqPy35JUa3kjgdnvVcbbq6p3\n" +
"gXcK6XF2XlBc9bJ1otakAA0lQ48Ojz5GTRJ+4QIDAQABAoIBAFTeIliG4dTzbNXm\n" +
"V7hvygktshrHZza0mMPwnYyt8pIbSO6dTQE9lO4WdgWeb5ZPUugdbW73WaCRlGV0\n" +
"5pVdfHyU7QT1lo6ySb7yrOn799/NXdlw5r1F/fiKyMHk2nxwS2LnDXhCvX4Ng1fM\n" +
"jZwah1eSbIKzqU/yKUTON5Ru6ceOVqesEhfl08hPewcGkXEFHtWKuziFxu3ZuYUN\n" +
"N0HiPjQcZ6Tz758AEBO86JxopOZbo3mh4HVe+CNX3/JPm0wLA1QV51qjcEdq+KXw\n" +
"pVzf/ES+QMDuzEB65P/DWy1vjJ3G9uWWi7XZYa5UaQlgTQsIsJMneznmVDUfH9wG\n" +
"OOY+br0CgYEA/CAmsJzabGIlb8Oy6fBFS3qK+g4SQepUozqBWTg4c0sSRKKMMU2/\n" +
"rtYGekIODa6vmHaS+H2h9Bwgz9w29ezNGN9yyd8Th1cFz1UtJmQyUWZSkWh753f6\n" +
"a+6Th7pYEHhcdVLsvU5XtrifSuAJ2FqZhJ3EKvxlGHK/HcHNzZce28sCgYEA6ghm\n" +
"7LC7+SbO/K3YrKIffNi8FWZnr07lRSS/cQDxZ4C+GmVjoNI5MGOPvoDrdwu3J4l2\n" +
"Re2JoVA1nRY2cpYg+FRohKz4T5kT6LRTdA6H5f4H7c6TpbIOAqnPhY5hzLsnXdJr\n" +
"PbZaDaf3jSDBcqb7aS0hV5e3jxYjEjKCFTeDUoMCgYATEOtcF8B8yb9DAG2bO0xC\n" +
"NPYlisLesTXNUjNN5+586YRsJE6tu89vDUhYHn6pkjg9M1pR6E5DA42HqoONfWbV\n" +
"JrCri28SoQYTc8GCUblsZmyACoK0MmKBnv0RGopmVHPJe4fjmPURIE0LgH2+GrvZ\n" +
"R4T6KzQJ8UN6oJlLns36mQKBgFDHl6cpFajZMWbcJsbnqtCwCrOkRjOnmtFz7rR1\n" +
"q92a/YMk7e+LwHuoUeximWPc4lo+Q1m9tNy+T9Mp4J9KnJS6pdzty0PGRa3z2D5d\n" +
"6aCEP35g6Guv+tAGhv/FdpJxIxRqVePWNl0yVesbnEoTwwG5tyGB17UG4hIc5vOl\n" +
"1qk7AoGBANRCeii9YgX7oLMl9AAPBLqnfoJ3Kqjz8OjHR+SUZtUznMmDSWlpZpcd\n" +
"aiZR1yvOHg06WnICoZX60I49J/jQSIK9rPynCSvjsnJ8WFTzQJ84zJFi8EFeV2Tj\n" +
"1BFAevJnXAlY+60Uk+QQg/3opXRRkULeaFBJQ/4cBv+Cxj3EVcN0\n" +
"-----END RSA PRIVATE KEY-----\n";



// init
function init() {
}



//Main entry point for checking installation events.
function checkEvent(id, name, payload) {
	var issueAction = payload.action;

	logger.info("Checking installation event (" + issueAction + ") for installation id " + payload.installation.id);
	logger.info("Access token url: " + payload.installation.access_tokens_url);
	
	// Let's try it.., i.e. get an access token...
	
	logger.info("Initializing..");
	
	const auth = createAppAuth({
		  id: 34,
		  privateKey: PRIVATE_KEY,
		  clientId: "Iv1.8fa5264d8674a03a",
		  clientSecret: "b299affb833c8960a745f4e5a4d61d4b2ab8540a",
		  request: request.defaults({
			  baseUrl: configuration.getOption('baseurl')
		  })  
	});
	
	logger.info(auth);
	
	// Retrieve installation access token

	
	var jens = auth({ type: "installation", installationId: payload.installation.id, permissions: "issues=write" }).then((authorization) => {
		logger.info(authorization);
		
		// Let's try to use our new token... just for fun...
		//Set-up authentication
		var authString = "token " + authorization.token;
		const octokit = new Octokit({
			userAgent: 'yoda-webhook',
			baseUrl: configuration.getOption('baseurl'),
			log: logger,
			auth: authString
		});
		
		issueRef = { owner: "jens-markussen", repo: "peter", issue_number: 6};
		octokit.issues.get(issueRef).then((result) => {
			logger.trace(result);
			
			// Ok, let's go all in and CHANGE the body. Adding a line at start
			issueRef.body = "More data: " + result.data.body;
			octokit.issues.update(issueRef).then((upd) => {
				logger.info("YES");
			}).catch((err) => {
				logger.error("OH NO");
			});

		}).catch((err) => {
			logger.error(err);
		});
		

		
	}).catch((err) => {
		logger.error(err);
	});

	// resolves with
	// {
	//   type: 'token',
	//   tokenType: 'installation',
	//   token: 'token123',
	//   installationId: 123,
	//   expiresAt: '2018-07-07T00:59:00.000Z'
	// }	
	
//	logger.trace(payload);
}
