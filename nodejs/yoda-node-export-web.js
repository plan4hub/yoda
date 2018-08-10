//Copyright 2018 Hewlett Packard Enterprise Development LP

//Permission is hereby granted, free of charge, to any person obtaining a copy of this software 
//and associated documentation files (the "Software"), to deal in the Software without restriction, 
//including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, 
//and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, 
//subject to the following conditions:

//The above copyright notice and this permission notice shall be included in all copies or 
//substantial portions of the Software.

//THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, 
//INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR 
//PURPOSE AND NONINFRINGEMENT.

//IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR 
//OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF 
//OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

//API URL
var gitHubApiBaseUrl = "https://github.hpe.com/api/v3/";
//var gitHubApiBaseUrl = "https://api.github.com/";

const commandLineArgs = require('command-line-args');
const request = require('request');
const fs = require('fs');
const path = require('path');
const urlF = require('url');


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
		name: 'owner', 
		alias: 'o', 
		type: String, 
		description: 'The owner (GitHub organization or user). Required.' 
	},
	{ 
		name: 'repo',
		alias: 'r',
		type: String, 
		description: 'Repository to scope. Required.'
	},
	{ 
		name: 'user',
		alias: 'u',
		type: String,
		description: 'The GitHub user name. Required.'
	},
	{
		name: 'password',
		alias: 'p',
		type: String,
		description: 'The GitHub password (typically a GitHub personal access token). Required.'
	},
	{
		name: 'output-dir',
		alias: 'd',
		type: String,
		description: 'The output directory where files should be placed. Will be created if non-existing. If not supplied, the value of owner will be used.'
	},
	{
		name: 'label-filter',
		alias: 'f',
		type: String,
		defaultValue: '',
		description: 'Issue label filter to apply.'
	},
	{
		name: 'state',
		alias: 's',
		type: String,
		defaultValue: 'open',
		description: "Issue state to scope. Either 'open' (default), 'closed', or 'all'" 
	},
	{
		name: 'image-filter',
		alias: 'i',
		type: String,
		defaultValue: 'media.github.hpe.com',
		description: "Download images that match this pattern."
	}];

const options = commandLineArgs(optionDefinitions);
verbose = options['verbose'];
if (verbose)
	console.log(options);

//Determine best foreground color, given background. For use in label coloring.
function bestForeground(color, whiteColor, blackColor) {
	if (whiteColor == undefined)
		whiteColor = 'rgb(255, 255,255)';
	if (blackColor == undefined)
		blackColor = 'rgb(0,0,0)';
	if (color == undefined) 
		return blackColor;

	if (color[0] == 'r') {
		// assume rgb format
		colorsOnly = color.substring(color.indexOf('(') + 1, color.lastIndexOf(')')).split(/,\s*/);
		var r = colorsOnly[0];
		var g = colorsOnly[1];
		var b = colorsOnly[2];


	} else {
		var hex  = color.replace(/#/, '');
		var r  = parseInt(hex.substr(0, 2), 16);
		var g = parseInt(hex.substr(2, 2), 16);
		var b = parseInt(hex.substr(4, 2), 16);
	}

	var a = 1.0 - (0.299 * r + 0.587 * g + 0.114 * b) / 255.0;
	if (a < 0.45) {
		return blackColor;
	} else {
		return whiteColor;
	}
};

//get repo from url
function getUrlRepo(url) {
	return (url.split("/").slice(-1)[0]);
};


fs.isDir = function(dpath) {
    try {
        return fs.lstatSync(dpath).isDirectory();
    } catch(e) {
        return false;
    }
};
fs.mkdirp = function(dirname) {
    dirname = path.normalize(dirname).split(path.sep);
    dirname.forEach((sdir,index)=>{
        var pathInQuestion = dirname.slice(0,index+1).join(path.sep);
        if((!fs.isDir(pathInQuestion)) && pathInQuestion) fs.mkdirSync(pathInQuestion);
    });
};

// Write a file. Will write a file to the file system. fileName supplies the name relative to the --output-dir. 
// The contents will be written.
// fileName may contain directories. If there are not present, they will be automatically created.
function writeFile(fileName, contents) {
	fullFileName = options['output-dir'] + '/' + fileName;
	if (verbose)
		console.log("Full fill name to be created: " + fullFileName);
	fs.mkdirp(path.dirname(fullFileName));
	
	// Now write file
	fs.writeFileSync(fullFileName, contents);
}

//---------------------------------------
//Issues have been retrieved. Time to analyse data and draw the chart.
var noIssuesActive = 0;
var globIssues = null;
var issueImages = [];
var globLabels = [];
function exportIssues(issues) {
	// Prepare new run (zip, parallel#, etc.)
	addCSSFile();
	noIssuesActive = 0;
	globIssues = issues;
	issueImages = [];
	globLabels = [];

	console.log("Received " + issues.length + " issues. Now getting and dumping detailed data.");

	// STEP I1: Retrieve labels for all repos. This will be used for nice coloring of labels. Call iteratively, goto step I2 when done.

	// STEP I2: Generate overview pages here (can be done in parallel, we have the information - maybe except label coloring ...
	// We will build one overview page per respository and put into the root folder. When done on to STEP 0.


	// STEP 0: If number of active issues is below "max # of parallel", increment number of active issues, proceed to STEP 1.
	// STEP 1: Get issue comments, then call on to step 2
	// STEP 2: Investigate issue body and comments. For each image, download image, return to STEP 2 while still images to be downloaded. Index comment#
	// STEP 3: Get issue events, then call on to step 4
	// STEP 4: Format data into HTML file. Call GitHub markdown converter on result, rest in STEP 5
	// STEP 5: Add to ZIP FILE. Then to step 0.

	// STEP F1: Download image files collected during the issue processing, call resursively self until no more images. Then call STEP F2
	// STEP F2: Write/download zip file

	// Call to get labels.
	getLabels([options['repo']]);

}

//STEP I1: Retrieve labels for all repos. This will be used for nice coloring of labels. Call iteratively, goto step 0 when done.
function getLabels(repoLeft) {
	if (repoLeft.length == 0) {
		// Done. Call on
		console.log("All labels retrieved.");
		console.log(globLabels);
		console.log("Succesfully retrieved all repository labels ...");

		// Call I2
		buildIndex();

	} else {
		var repo = repoLeft.pop();
		var getLabelsUrl = gitHubApiBaseUrl + "repos/" + options['owner'] + "/" + repo + "/labels";
		getLoop(getLabelsUrl, 1, [], function(labels) {
			console.log("Retrieve labels for " + repo);
			globLabels[repo] = labels;
			getLabels(repoLeft);
		});
	}

}


//STEP I2: Index generation, one file per repository
function buildIndex() {
	var repoList = [options['repo']];
	console.log("List of repositories: " + repoList);
	for (var repInd = 0; repInd < repoList.length; repInd++) {
		console.log("Building index file for: " + repoList[repInd]);
		var title = "Issue index for " + options['owner'] + '/' + repoList[repInd];
		var indexHTML = '<!DOCTYPE html><html><head><meta charset="utf-8"><title>' + title + '</title>';
		indexHTML += '<link rel="stylesheet" type="text/css" href="css/issues.css"></head>';
		indexHTML += '<body class="indexlayout">';
		indexHTML += '<div class="indextitle">' + title + '</div>';
		indexHTML += '<table class="indextable">';
		indexHTML += '<tr class="indexheader"><th align="left">Issue Id</th><th align="left">State</th><th width="20%" align="left">Labels</th><th width="65%" align="left">Title</th></tr>';
		for (var i = 0; i < globIssues.length; i++) {
			issue = globIssues[i];
			var issueRepo = getUrlRepo(issue.repository_url);
			if (issueRepo != repoList[repInd])
				continue; // Issue belongs to different repo;
			indexHTML += '<tr class="indexrow">';
			indexHTML += '<td align="left">' + '<a href="' + options['owner'] + '/' + issueRepo + '/' + issue.number + '.html" target="_blank">' + issue.number + '</td>';
			indexHTML += '<td align="left">' + issue.state + '</td>';
			var labels = "";
			for (var l = 0; l < issue.labels.length; l++) {
				labels += formatLabel(issueRepo, issue.labels[l].name);
			}
			indexHTML += '<td align="left">' + labels + '</td>';
			indexHTML += '<td align="left">' + issue.title + '</td>';
			indexHTML += '</tr>';
		}
		indexHTML += '</table></body>';

		fileName = repoList[repInd] + ".html";
		writeFile(fileName, indexHTML);
	}

	// Call on.
	issueProcessLoop();
}


//STEP 0: If number of active issues is below "max # of parallel", increment number of active issues, proceed to STEP 1 / repeat STEP 0
var maxParallelIssues = 1;
function issueProcessLoop() {
	console.log("issueProcessLoop. noIssuesActive: " + noIssuesActive + ", issues.length: " + globIssues.length);
	if (noIssuesActive == 0 && globIssues.length == 0) {
		// We are done with issues, now turn attention to download of images before downloading ZIP file.
		downloadImages();
		return;
	}

	if (noIssuesActive < maxParallelIssues && globIssues.length > 0) {
		// Let's do some work!
		noIssuesActive++;
		issue = globIssues[0];
		globIssues.splice(0, 1);
		issueComments(issue);
		return issueProcessLoop();
	}

	if (noIssuesActive > 0 && globIssues.length == 0) {
		console.log("We just need to wait for the remaining to complete...");
		// NOP
		return;
	}
}

//STEP F1: Download images, call on to write ZIP
function downloadImages() {
	if (issueImages.length == 0) {
		// Done
		finish();
	} else {
		// Download file, then call recursive.
		image = issueImages.pop();

		request(image.fullPath).pipe(fs.createWriteStream(image.path));
		
//		$.ajax({
//			url: image.fullPath,
//			type: "GET",
//			dataType: 'binary',
//			headers:{'Content-Type':'image/png','X-Requested-With':'XMLHttpRequest'},
//			processData: false,
//			success: function(data){
//				console.log("Downloaded image file " + image.fullPath);
//				console.log("Downloading " + image.fullPath + " to " + image.path);
//				issueZipRoot.file(image.path, data);
//				downloadImages();
//			}
//		}); 
	}
}

//STEP F2: Write ZIP. Finalize things. 
function finish() {
	console.log("Succesfully downloaded issues.");
	process.exit(0);
}

//STEP 1: Get issue comments, then call on to step 2
function issueComments(issue) {
	console.log("issueComments: " + issue.url);

	var issueUrlComments = issue.url + "/comments";
	console.log("Issues Comments URL: " + issueUrlComments);
	getLoop(issueUrlComments, 1, [], function(comments) { processComments(issue, comments); }); 

}

//STEP 2: Investigate issue body and comments. For each image, download image, return to STEP 2 while still images to be downloaded. Index comment#
function processComments(issue, comments) {
	console.log("issueComments for: " + issue.url + ", no of comments: " + comments.length);

	// Download images.

	issueEvents(issue, comments);

}

//STEP 3: Get issue events, then call on to step 4
function issueEvents(issue, comments) {
	var issueUrlEvents = issue.url + "/events";
	console.log("Issues Events URL: " + issueUrlEvents);
	getLoop(issueUrlEvents, 1, [], 
			function(events) { formatIssue(issue, comments, events); }); 
	
}

//STEP 4: Format data into HTML file. Call GitHub markdown converter on result, rest in STEP 5
function formatIssue(issue, comments, events) {
	console.log("formatIssue for: " + issue.url + ", no of comments: " + comments.length, ", no of events: " + events.length);

	// Let's prepare the issue HTML
	var repo = getUrlRepo(issue.repository_url);
	var title = repo + '#' + issue.number + ': ' + issue.title; 
	var issueHTML = '<!DOCTYPE html><html><head><meta charset="utf-8"><title>' + title + '</title>';
	issueHTML += '<link rel="stylesheet" type="text/css" href="../../css/issues.css"></head>';
	issueHTML += '<body class="issuelayout">';

	// State and Title
	issueHTML += '<div>';
	if (issue.state == "open")
		issueHTML += '<span class="issueopen">Open</span>';
	else
		issueHTML += '<span class="issueclosed">Closed</span>';
	issueHTML += '<span class="issuetitle">' + title + '</span></div>';

	// Labels
	issueHTML += '<div class="issuebasefield">' + 'Labels: ';
	var labels = "";
	for (var l = 0; l < issue.labels.length; l++) {
		labels += formatLabel(repo, issue.labels[l].name);
	}
	issueHTML += labels + '</div>\n';

	// Milestone
	issueHTML += '<div class="issuebasefield">' + 'Milestone: ';
	if (issue.milestone != undefined) 
		issueHTML += formatField(issue.milestone.title);
	else	
		issueHTML += formatField("no milestone set");
	issueHTML += '</div>\n';

	// Assignee(s)
	issueHTML += '<div class="issuebasefield">' + "Assignee(s): ";
	if (issue.assignees.length == 0) 
		issueHTML += "none";
	else {
		assignees = "";
		for (var as = 0; as < issue.assignees.length; as++) {
			if (assignees != "")
				assignees += ",";
			assignees += formatUser(issue.assignees[as].login)
		}
		issueHTML += assignees;
	}
	issueHTML += '</div>';

	// Creator, date

	// Body
	issueHTML += '<div class="issuecommentheader">' + formatUser(issue.user.login) + ' created issue on ' + formatTime(issue.created_at) + '</div>\n';
	issueHTML += '<div class="issuecomment">' + issue.body_html + '</div>\n';

	// Comments and events. To be sorted in date order.
	var commentPtr = 0;
	var eventPtr = 0;

	while (commentPtr < comments.length || eventPtr < events.length) {
//		console.log("commentPtr = " + commentPtr + ", comments.length = " + comments.length + ", eventPtr = " + eventPtr + ", events.length = " + events.length);
		if ((commentPtr == comments.length) || (commentPtr < comments.length && eventPtr < events.length && events[eventPtr].created_at < comments[commentPtr].created_at) ) {
			// We do the event.
			switch (events[eventPtr].event) {
			case "milestoned":
				issueHTML += '<div class="issueevent">' + formatUser(events[eventPtr].actor.login) + ' set milestone ' + formatField(events[eventPtr].milestone.title) + ' on ' + formatTime(events[eventPtr].created_at) + '</div>\n';
				break;

			case "demilestoned":
				issueHTML += '<div class="issueevent">' + formatUser(events[eventPtr].actor.login) + ' removed milestone ' + formatField(events[eventPtr].milestone.title) + ' on ' + formatTime(events[eventPtr].created_at) + '</div>\n';
				break;

			case "labeled":
				issueHTML += '<div class="issueevent">' + formatUser(events[eventPtr].actor.login) + ' added label ' + formatLabel(repo, events[eventPtr].label.name) + ' on ' + formatTime(events[eventPtr].created_at) + '</div>\n';
				break;

			case "unlabeled":
				issueHTML += '<div class="issueevent">' + formatUser(events[eventPtr].actor.login) + ' removed label ' + formatLabel(repo, events[eventPtr].label.name) + ' on ' + formatTime(events[eventPtr].created_at) + '</div>\n';
				break;
			}
			eventPtr++;
		} else {
			// We do the comment.
			issueHTML += '<div class="issuecommentheader">' + formatUser(comments[commentPtr].user.login) + ' commented on ' + formatTime(comments[commentPtr].created_at) + '</div>\n';
			issueHTML += '<div class="issuecomment">' + comments[commentPtr].body_html + '</div>\n';

			commentPtr++;
		}
	}

	// Close off things.
	issueHTML += "</body>\n";

	// Replace any references to picture files. These are stored into e.g. 
	// https://media.github.hpe.com/user/3552/files/01f4b4e0-3c7d-11e6-887a-845324166c0d  (HPE)
	// For github.com:
	// https://user-images.githubusercontent.com/35253007/43787869-50bc2ab4-9a6c-11e8-8f78-5bae137cdb0d.png
	// Actually, we probablyl have full control over images, so why don't we just get all image files?
	console.log("Extracting image references...");
	var searchImg = '<img src="';
	var imgRef = issueHTML.indexOf(searchImg, 0);
	downloadFilter = options['image-filter'];
	for (; imgRef != -1; imgRef = issueHTML.indexOf(searchImg, imgRef + 1)) {
		// Get full path... will end with quote..
		var endQuote = issueHTML.indexOf('"' , imgRef + searchImg.length);
		var fullPath = issueHTML.substring(imgRef + searchImg.length, endQuote);
		
		if (verbose) {
			console.log("  Full path is: " + fullPath);
		}
			
		issueImage = { fullPath: fullPath, path: urlF.parse(fullPath).path, localPath: "../.." + urlF.parse(fullPath).path};

		if (downloadFilter == "" || urlF.parse(fullPath).host.indexOf(downloadFilter) != -1) {
			console.log("  Added " + fullPath + " to download queue ...");
			issueImages.push(issueImage);
		}  else {
			console.log("Skipping image: " + fullPath);
		}
	}

	// Next, let's replace the image strings.
	for (var i = 0; i < issueImages.length; i++) {
		var re = new RegExp(issueImages[i].fullPath, "g");
		issueHTML = issueHTML.replace(re, issueImages[i].localPath);
	}

	// HTML COMPLETE ----------------------
	writeIssueToFile(issue, issueHTML);
}

//STEP 5: Add to ZIP FILE. Then to step 0.
function writeIssueToFile(issue, issueHTML) {
	fileName = options['owner'] + "/" + getUrlRepo(issue.repository_url) + "/" + issue.number + ".html";
	writeFile(fileName, issueHTML);

	noIssuesActive--;
	console.log("Added file " + fileName + ". Remaining # of issues: " + (globIssues.length + noIssuesActive));
	issueProcessLoop();
}


function addCSSFile() {
	var css = "";
	// Issue stuff
	css += '.issuelayout {width: 900px; margin-left: 100px;}\n';
	css += '.issuetitle { margin:15px 0px 15px 20px; font-size:32px; font-weight:400;}\n';
	css += '.issueopen { padding: 5px 10px 5px 10px; background-color: green; color: white; border-radius: 5px; font-size: 18px;}\n';
	css += '.issueclosed { padding: 5px 10px 5px 10px; background-color: red; color: white; border-radius: 5px; font-size: 18px;}\n';
	css += '.issuebasefield { margin:15px 0px 15px 0px;}\n';
	css += '.issueevent { margin:15px 0px 15px 15px;}\n';
	css += '.issuecommentheader { color: #586069; border-style:solid; background-color: #f6f8fa; border-color: grey; border-width: thin; border-bottom: 1px solid #d1d5da; border-top-left-radius: 3px; border-top-right-radius: 3px; margin-top: 15px; padding:5px 15px 5px 15px; line-height: 1.5;}\n';
	css += '.issuecomment { line-height: 1.5; border-style:solid; border-color: grey; border-width: thin; word-wrap: break-word;margin-bottom:15px; padding:5px 15px 5px 15px; overflow: auto;}\n';
	css += '.issuetime { font-weight:bold;}\n';
	css += '.issueuser { color:darkblue; font-weight:bold;}\n';
	css += '.issuefield { font-weight:bold;}\n';

	// Index page stuff
	css += '.indexlayout {}\n';
	css += '.indextitle { margin:15px 0px 15px 20px; font-size:32px; font-weight:400;}\n';
	css += '.indextable { }\n';
	css += '.indexheader { background-color: #f6f8fa; padding: 15px 0px 15px 0px;}\n';
	css += '.indexrow { }\n';
	css += 'td, th { border: 1px solid lightgrey; padding: 10px 5px 10px 5px;}\n';

	writeFile("css/issues.css", css);
}

function formatTime(ts) {
	var tsDate = new Date(ts);
	return '<span class="issuetime">' + tsDate.toString().replace(/ \(.*\)/, "") + '</span>';
}

function formatUser(user) {
	return '<span class="issueuser">' + user + '</span>';
}

function formatField(field) {
	return '<span class="issuefield">' + field + '</span>';
}

function formatLabel(repo, label) {
	// TODO: no-break + margins.

	// Find the label
	for (var l = 0; l < globLabels[repo].length; l++) {
		if (globLabels[repo][l].name == label) {
			var foreground = bestForeground(globLabels[repo][l].color);
			// Got it.
			return '<span style="background-color: #' + globLabels[repo][l].color + '; color:' + foreground + '; margin: 2px; 10px; 2px; 0px; white-space: nowrap; padding: 4px 8px 4px 8px; border-radius: 5px;">' + label + '</span>'; 
		}
	}
	return label; // Strange... 
}

//-------------------------------

//TODO: Enhance this
function errorFunc(errorText) {
	alert("ERROR: " + errorText);
}

//----------------


//-------------------------



//--------------


//--------------

//Collect various information from the API. URL gives the requested info, the function does the
//collection and concatenation, calling in the end the final function. 
//Set page = 1 for first page, or set to -1 for get calls where per_page / page is not used.
function getLoop(url, page, collector, finalFunc) {
	if (page != -1) {
		var oldIndex = url.indexOf("per_page=100&page=");
		if (oldIndex != -1) { 
			url = url.substring(0, oldIndex) + "per_page=100&page=" + page;
		} else {
			// Do we have a ?
			if (url.indexOf("?") == -1) {
				url = url + "?per_page=100&page=" + page;
			} else {
				url = url + "&per_page=100&page=" + page;
			}
		}
	}

	request(
			{ 
				method: 'GET',
				uri: url, 
				auth: {
					'user': options['user'],
					'pass': options['password'],
					'sendImmediately': true
				},
				headers: 
				{
					Accept: 'application/vnd.github.symmetra-preview.full+json'
				}
			},
			function (error, response, body) {
				if (error != null) {
					console.log("Error received: " + error);
					process.exit(1);
				}
				console.log('statusCode:', response && response.statusCode); // Print the response status code if a response was received

				var obj = JSON.parse(body);

				if (obj.length == 100 && page != -1) {
					getLoop(url, page + 1, collector.concat(obj), finalFunc);
				} else {
					finalFunc(collector.concat(obj));
				}
			}
	);
}





//Note, that we can stream directly to file... We will use this for picture download


//---------- "main"

var error = false;
if (options['owner'] == undefined) {
	console.log("No --owner or -o given");
	error = true;
}

if (options['repo'] == undefined) {
	console.log("No --repo or -r given");
	error = true;
}

if (options['user'] == undefined) {
	console.log("No --user or -u given");
	error = true;
}

if (options['password'] == undefined) {
	console.log("No --password or -p given");
	error = true;
}

if (error) {
	console.log("Exiting");
	process.exit(1);
}

if (options['output-dir'] == undefined) {
	console.log("No --output-dir supplied. Defaulting to '" + options['owner'] + "'.");
	options['output-dir'] = options['owner'];
}

// Let's go....
var url = gitHubApiBaseUrl + 'repos/' + options['owner'] + '/' + options['repo'] + '/issues';
if (verbose)
	console.log("Issue request URL: '" + url + "'");

// Call!
getLoop(url, -1, [], exportIssues);


console.log("Info: Initiated Github request for issues.");


