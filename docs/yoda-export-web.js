//  Copyright 2018 Hewlett Packard Enterprise Development LP
//
// Permission is hereby granted, free of charge, to any person obtaining a copy of this software 
// and associated documentation files (the "Software"), to deal in the Software without restriction, 
// including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, 
// and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, 
// subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in all copies or 
// substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, 
// INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR 
// PURPOSE AND NONINFRINGEMENT.
//
// IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR 
// OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF 
// OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.


function addIfNotDefault(params, field) {
	if ($("#" + field).val() != $("#" + field).prop('defaultValue')) {
		return params + "&" + field + "=" + $("#" + field).val(); 
	} else {
		return params;
	}
}

function getUrlParams() {
	var params = addIfNotDefault("", "owner");
	params += "&repolist=" + $("#repolist").val();
	params = addIfNotDefault(params, "outputfile");
	params = addIfNotDefault(params, "outputfile");
	params += "&estimate=" + yoda.getEstimateInIssues();
	if ($("#labelfilter").val() != "") 
		params += "&labelfilter=" + $("#labelfilter").val();
	if ($("#state").val() != "open") {
		params += "&state=" + $("#state").val(); 
	}

	return params;
}

function estimateClick(radio) {
	yoda.setEstimateInIssues(radio.value);
}

function logMessage(message) {

	$('#console').val($('#console').val() + message + "\n");
	bottom = $('#console').prop('scrollHeight') - $('#console').height()
	$('#console').scrollTop(bottom);
}

// ---------------------------------------
// Issues have been retrieved. Time to analyse data and draw the chart.
// Global object for ZIP file.
var issueZipRoot = null;
var noIssuesActive = 0;
var globIssues = null;
function exportIssues(issues) {
	// Prepare new run (zip, parallel#, etc.)
	issueZipRoot = new JSZip();
	addCSSFile();
	noIssuesActive = 0;
	globIssues = issues;
	
	console.log("Exporting issues. No issues: " + issues.length);
	logMessage("Info: Received " + issues.length + " issues. Now getting detailed data and building ZIP file for download.");

	// Now we are ready to iterator over the issues, yippee. For each issue will call call on to a number of extra processing steps:
	// STEP 0: If number of active issues is below "max # of parallel", increment number of active issues, proceed to STEP 1.  
	// STEP 1: Get issue comments, then call on to step 2
	// STEP 2: Investigate issue body and comments. For each image, download image, return to STEP 2 while still images to be downloaded. Index comment#
	// STEP 3: Get issue events, then call on to step 4
	// STEP 4: Format data into HTML file. Call GitHub markdown converter on result, rest in STEP 5
	// STEP 5: Add to ZIP FILE. Then to step 0.
	
	issueProcessLoop();
	
	// Generate overview pages here (can be done in parallel, we have the information - maybe except label coloring ...
	// TBD
}

// STEP 0: If number of active issues is below "max # of parallel", increment number of active issues, proceed to STEP 1 / repeat STEP 0
var maxParallelIssues = 1;
function issueProcessLoop() {
	console.log("issueProcessLoop. noIssuesActive: " + noIssuesActive + ", issues.length: " + globIssues.length);
	if (noIssuesActive == 0 && globIssues.length == 0) {
		// We are done, download ZIP file.
		issueZipRoot.generateAsync({type:"blob"})
		.then(function(content) {
		    // see FileSaver.js
			yoda.downloadFileWithType('application/zip', content, $("#outputfile").val());
		});

		logMessage("Succesfully downloaded ZIP file with issues.");
		yoda.updateUrl(getUrlParams() + "&export=true");
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

// STEP 1: Get issue comments, then call on to step 2
function issueComments(issue) {
	console.log("issueComments: " + issue.url);
	
	var issueUrlComments = issue.url + "/comments";
	console.log("Issues Comments URL: " + issueUrlComments);
	yoda.getLoop(issueUrlComments, 1, [], 
			function(comments) { processComments(issue, comments); }, 
			function(errorText) { yoda.showSnackbarError("Error getting issue comments: " + errorText, 3000);});
}

// STEP 2: Investigate issue body and comments. For each image, download image, return to STEP 2 while still images to be downloaded. Index comment#
function processComments(issue, comments) {
	console.log("issueComments for: " + issue.url + ", no of comments: " + comments.length);

	// Download images.
	
	issueEvents(issue, comments);
	
}

// STEP 3: Get issue events, then call on to step 4
function issueEvents(issue, comments) {
	var issueUrlEvents = issue.url + "/events";
	console.log("Issues Events URL: " + issueUrlEvents);
	yoda.getLoop(issueUrlEvents, 1, [], 
			function(events) { formatIssue(issue, comments, events); }, 
			function(errorText) { yoda.showSnackbarError("Error getting issue events: " + errorText, 3000);});
}

// STEP 4: Format data into HTML file. Call GitHub markdown converter on result, rest in STEP 5
function formatIssue(issue, comments, events) {
	console.log("formatIssue for: " + issue.url + ", no of comments: " + comments.length, ", no of events: " + events.length);
	
	// Let's prepare the issue HTML
	var title = yoda.getUrlRepo(issue.repository_url) + '/' + issue.number + ': ' + issue.title; 
	var issueHTML = '<!DOCTYPE html><html><head><meta charset="ISO-8859-1"><title>' + title + '</title>';
	issueHTML += '<link rel="stylesheet" type="text/css" href="../../css/issues.css"></head>';
	issueHTML += '<body class="issuelayout">';
	
	// Title
	issueHTML += '<div class="issuetitle">' + title + '</div>';
	
	// Creator, date
	issueHTML += '<div class="issuebasefield">' + 'Created on ' + formatTime(issue.created_at) + ' by ' + formatUser(issue.user.login) + '</div>\n';

	// State (open/closed)
	issueHTML += '<div class="issuebasefield">' + 'Issue state: ' + formatField(issue.state) + '</div>\n';

	// Labels
	issueHTML += '<div class="issuebasefield">' + 'Labels: ';
	var labels = "";
	for (var l = 0; l < issue.labels.length; l++) {
		if (labels != "")
			labels += ", ";
		labels += formatField(issue.labels[l].name);
	}
	issueHTML += labels + '</div>\n';
	
	// TBD
	
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
	
	// Body
	issueHTML += '<div class="issuebody">' + issue.body_html + '</div>\n';
	
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
				issueHTML += '<div class="issueevent">' + formatUser(events[eventPtr].actor.login) + ' added label ' + formatField(events[eventPtr].label.name) + ' on ' + formatTime(events[eventPtr].created_at) + '</div>\n';
				break;

			case "unlabeled":
				issueHTML += '<div class="issueevent">' + formatUser(events[eventPtr].actor.login) + ' removed label ' + formatField(events[eventPtr].label.name) + ' on ' + formatTime(events[eventPtr].created_at) + '</div>\n';
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
	var issueImages = [];
	var urlHack = document.createElement('a');

	console.log(urlHack.pathname);
	for (; imgRef != -1; imgRef = issueHTML.indexOf(searchImg, imgRef + 1)) {
		// Get full path... will end with quote..
		var endQuote = issueHTML.indexOf('"' , imgRef + searchImg.length);
		var fullPath = issueHTML.substring(imgRef + searchImg.length, endQuote);
		console.log("Full path is: " + fullPath);
		urlHack.href = fullPath;
		
		issueImage = { fullPath: fullPath, path: urlHack.pathname, localPath: "../.." + urlHack.pathname };
		// We will store different paths into imageUrls
		
		issueImages.push(issueImage);
	}
	console.log("Images:");
	console.log(issueImages);

	// Next, let's replace the image strings.
	for (var i = 0; i < issueImages.length; i++) {
		var re = new RegExp(issueImages[i].fullPath, "g");
		issueHTML = issueHTML.replace(re, issueImages[i].localPath);
	}
	
	// HTML COMPLETE ----------------------
	writeToZip(issue, issueHTML);
}


//STEP 5: Add to ZIP FILE. Then to step 0.
function writeToZip(issue, issueHTML) {
	fileName = $("#owner").val() + "/" + yoda.getUrlRepo(issue.repository_url) + "/" + issue.number + ".html";
	issueZipRoot.file(fileName, issueHTML);
	
	noIssuesActive--;
	logMessage("Added file " + fileName + ". Remaining # of issues: " + (globIssues.length + noIssuesActive));
	issueProcessLoop();
}


function addCSSFile() {
	// TODO: Maybe more this content to separate file that tool will get... 
	var css = "";
	css += '.issuelayout {width:75%;}\n';
	css += '.issuetitle { margin:0px 0px 15px 15px; font-size:20px; font-weight:bold;}\n';
	css += '.issuebody { border-style:dotted; border-color:blue; border-width:2px; margin:15px 0 15px 0; padding:5px 15px 5px 15px;}\n';
	css += '.issuebasefield { margin:0px 0px 15px 15px;}\n';
	
	css += '.issueevent { margin:15px 0px 15px 0px;}\n';
	css += '.issuecommentheader { color: #586069; border-style:solid; background-color: #f6f8fa; border-color: grey; border-width: thin; border-bottom: 1px solid #d1d5da; border-top-left-radius: 3px; border-top-right-radius: 3px; margin-top: 15px; padding:5px 15px 5px 15px;}\n';
	css += '.issuecomment { line-height: 1.5; border-style:solid; border-color: grey; border-width: thin; word-wrap: break-word;margin-bottom:15px; padding:5px 15px 5px 15px;}\n';
	
	css += '.issuetime { font-weight:bold;}\n';
	css += '.issueuser { color:darkblue; font-weight:bold;}\n';
	css += '.issuefield { font-weight:bold;}\n';

	console.log(issueZipRoot.file("css/issues.css", css));
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

// -------------------------------

// TODO: Enhance this
function errorFunc(errorText) {
	alert("ERROR: " + errorText);
}

// ----------------

function showRepos(repos) {
	repos.sort(function(a,b) {
		if (a.name.toLowerCase() < b.name.toLowerCase()) 
			return -1;
		else
			return 1;
	});

	for (var r = 0; r < repos.length; r++) {
		$("#repolist").append($("<option></option>").attr("value", repos[r].name));
	}
}


// -------------------------

function startExport() {
	$("#console").val("");
	
	if ($("#repolist").val() == "") 
		yoda.updateGitHubIssuesOrg($("#owner").val(), $("#labelfilter").val(), $("#state").val(), exportIssues, function(errorText) { yoda.showSnackbarError("Error getting issues: " + errorText, 3000);});
	else
		yoda.updateGitHubIssuesRepos($("#owner").val(), $("#repolist").val(), $("#labelfilter").val(), $("#state").val(), null, exportIssues, function(errorText) { yoda.showSnackbarError("Error getting issues: " + errorText, 3000);});

	logMessage("Info: Initiated Github request.");
}

// --------------
function githubAuth() {
	console.log("Github authentisation: " + $("#user").val() + ", token: " + $("#token").val());
	yoda.gitAuth($("#user").val(), $("#token").val());
}

// --------------
