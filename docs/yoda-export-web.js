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
	// STEP 4: Format data into HTML file. Call GitHub markdown converter on result, when finished, add to ZIP FILE. Then to step 0.
	
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

// STEP 4: Format data into HTML file. Call GitHub markdown converter on result, when finished, add to ZIP FILE.
function formatIssue(issue, comments, events) {
	console.log("formatIssue for: " + issue.url + ", no of comments: " + comments.length, ", no of events: " + events.length);
	
	// Let's prepare the issue HTML
	var title = yoda.getUrlRepo(issue.repository_url) + '/' + issue.number + ': ' + issue.title; 
	var issueHTML = '<!DOCTYPE html><html><head><meta charset="ISO-8859-1"><title>' + title + '</title>';
	issueHTML += '<link rel="stylesheet" type="text/css" href="../../../css/issues.css"></head><body>';
	
	// Title
	issueHTML += '<div class="issuetitle">' + title + '</div>';
	
	// Labels
	// TBD
	
	// Assignee
	// TBD
	
	// Creator, date
	// TBD
	
	// Body
	issueHTML += '<p>' + issue.body + '</p>';
	issueHTML += "</body>";
	
	fileName = $("#owner").val() + "/" + yoda.getUrlRepo(issue.repository_url) + "/" + issue.number + "/issue.html";
	issueZipRoot.file(fileName, issueHTML);
	
	noIssuesActive--;
	logMessage("Added file " + fileName + ". Remaining # of issues: " + (globIssues.length + noIssuesActive));
	issueProcessLoop();

//		case "":
//			// Never mind, not a field.
//			break;
//		case "Owner":
//			el["Owner"] = $("#owner").val();
//			break;
//		case "Repo":
//			el["Repo"] = yoda.getUrlRepo(issues[i].repository_url);
//			break;
//		case "Number":
//			el["Number"] = issues[i].number;
//			break;
//		case "URL":
//			el["URL"] = issues[i].html_url;
//			break;
//		case "State":
//			el["State"] = issues[i].state;
//			break;
//		case "Submitter":
//			el["Submitter"] = issues[i].user.login;
//			break;
//		case "Assignee":
//			el["Assignee"] = "";
//			if (issues[i].assignee != null) {
//				el["Assignee"] = issues[i].assignee.login;
//			}
//			break;
//		case "Assignees":
//			el["Assignees"] = "";
//			for (var as = 0; as < issues[i].assignees.length; as++) {
//				if (el["Assignees"] != "")
//					el["Assignees"] += ",";
//				el["Assignees"] += issues[i].assignees[as].login;
//			}
//			break;
//		case "Milestone":
//			if (issues[i].milestone != undefined) {
//				el["Milestone"] = issues[i].milestone.title;
//			} else {
//				el["Milestone"] = "";
//			}
//			break;
//		case "Created at":
//			var date = new Date(issues[i].created_at)
//			el["Created at"] = yoda.formatDate(date);
//			break;
//		case "Closed at":
//			el["Closed at"] = "";
//			if (issues[i].closed_at != null) {
//				var date = new Date(issues[i].closed_at)
//				el["Closed at"] = yoda.formatDate(date);
//			}
//			break;
//		case "Title":
//			el["Title"] = issues[i].title;
//			break;
//		case "Estimate":
//			el["Estimate"] = yoda.issueEstimate(issues[i]);
//			break;
//		case "Remaining":
//			el["Remaining"] = yoda.issueRemainingMeta(issues[i], yoda.issueEstimate(issues[i]));
//			break;
//		case "Body":
//			el["Body"] = issues[i].body;
//			break;
//			// Syntethized fields
//		case "Report Date":
//			el["Report Date"] = yoda.formatDate(today);
//			break;
//		case "Duration":
//			var createdDate = yoda.formatDate(new Date(issues[i].created_at));
//			if (issues[i].closed_at != null) {
//				var closedDate = yoda.formatDate(new Date(issues[i].closed_at));
//				el["Duration"] = yoda.dateDiff(createdDate, closedDate);
//			} else {
//				el["Duration"] = yoda.dateDiff(createdDate, todayDate);
//			}
//			break;
//		default:
//			// Let's search between sharedLabels.
//			for (var s = 0; s < sharedLabels.length; s++) {
//				if (sharedLabels[s].name == fName) {
//					el[fName] = "";
//					var splitReg = new RegExp(sharedLabels[s].regexp);
//					for (var l=0; l<issues[i].labels.length; l++) {
//						var labelName = issues[i].labels[l].name;
//						var res = labelName.match(splitReg);
////						console.log(issues[i].number + ", " + labelName + ", " + fName + ", " + res);
//						if (res != null) {
//							if (el[fName] != "") {
//								// Ups. Value already set. Several labels matching expression
//								logMessage("Warning: Issue " + issues[i].html_url + " has several labels matching '" + sharedLabels[s].regexp);
//							}
//							el[fName] = labelName;
//						}
//					}
//				}
//			}
//			if (el[fName] == undefined) {
//				if (fieldErrors.indexOf(fName) == -1) {
//					logMessage("Error: Found no way to interpret field: " + fName);
//					fieldErrors.push(fName);
//				}
//			}
//		}
//	}
////	console.log(el);

	
}


function addCSSFile() {
	var css = "";
	css += ".issuetitle { float: left; box-sizing: border-box;  margin: 0 0 3px 0px;  position: relative;  display: inline-block; }";

	console.log(issueZipRoot.file("css/issues.css", css));
}


function storeEvents(storeUrl, events) {
	// Filter and process the events we want to store.
	for (var e = 0; e < events.length; e++) {
		if (events[e].event == "milestoned" || events[e].event == "demilestoned") {
			var expEvent = {};
			// https://github.hpe.com/api/v3/repos/hpsd/yoda/issues/20
			expEvent["Owner"] = storeUrl.split("/").slice(-4, -3)[0];
			expEvent["Repo"] = storeUrl.split("/").slice(-3, -2)[0];
			expEvent["Number"] = storeUrl.split("/").slice(-1)[0];
			expEvent["TimeStamp"] = events[e].created_at;
			expEvent["EventActor"] = events[e].actor.login;
			expEvent["EventType"] = events[e].event;
			expEvent["EventTarget"] = events[e].milestone.title;
			console.log(expEvent);
			issuesEvents.push(expEvent);
		}
		if (events[e].event == "labeled" || events[e].event == "unlabeled") {
			var expEvent = {};
			expEvent["Owner"] = storeUrl.split("/").slice(-4, -3)[0];
			expEvent["Repo"] = storeUrl.split("/").slice(-3, -2)[0];
			expEvent["Number"] = storeUrl.split("/").slice(-1)[0];
			expEvent["TimeStamp"] = events[e].created_at;
			expEvent["EventActor"] = events[e].actor.login;
			expEvent["EventType"] = events[e].event;
			expEvent["EventTarget"] = events[e].label.name;
			console.log(expEvent);
			issuesEvents.push(expEvent);
		}
	}
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
