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


var srcIssues = [];
var dstIssues = [];
var issuesToCopy = [];

function addIfNotDefault(params, field) {
	if ($("#" + field).val() != $("#" + field).prop('defaultValue')) {
		return params + "&" + field + "=" + $("#" + field).val(); 
	} else {
		return params;
	}
}

function getUrlParams() {
	var params = "srcowner=" + $("#srcowner").val() + "&dstowner=" + $("#dstowner").val() + "&srcrepo=" + $("#srcrepo").val() + "&dstrepo=" + $("#dstrepo").val();
	params = addIfNotDefault(params, "recurring");
	params = addIfNotDefault(params, "bodyremove");
	return params;
}
	
function logMessage(message) {
	$('#console').val($('#console').val() + message + "\n");
	$('#console').scrollTop($('#console')[0].scrollHeight);
}


// ---------------------------------------
// Milestone issues have been retrieved. Time to analyse data and draw the chart.
function doCopy(issues) {
	yoda.updateUrl(getUrlParams());

	console.log("No of issues retrieved: " + issues.length);
	copySingleIssue(issues);
}


//------------------
// Note special logic to allow URL override of milestone. ONLY for first selection.
function showSrcMilestones(milestones) {
	$("#srcmilestone").empty();
	$("#srcmilestone").append($("<option></option>").attr("value", 0).text("Select milestone ... "));
	for (var m = 0; m < milestones.length; m++) {
		$("#srcmilestone").append($("<option></option>").attr("value", milestones[m].number).text(milestones[m].title));
	}
}

function showDstMilestones(milestones) {
	$("#dstmilestone").empty();
	$("#dstmilestone").append($("<option></option>").attr("value", 0).text("Select milestone ... "));
	for (var m = 0; m < milestones.length; m++) {
		$("#dstmilestone").append($("<option></option>").attr("value", milestones[m].number).text(milestones[m].title));
	}
}

function updateSrcMilestones() {
	var getMilestonesUrl = yoda.getGithubUrl() + "repos/" + $("#srcowner").val() + "/" + $("#srcrepo").val() + "/milestones?state=all";
	yoda.getLoop(getMilestonesUrl, 1, [], showSrcMilestones, null);
}

function updateDstMilestones() {
	var getMilestonesUrl = yoda.getGithubUrl() + "repos/" + $("#dstowner").val() + "/" + $("#dstrepo").val() + "/milestones?state=all";
	yoda.getLoop(getMilestonesUrl, 1, [], showDstMilestones, null);
}

// -----------

function showSrcRepos(repos) {
	repos.sort(function(a,b) {
		if (a.name.toLowerCase() < b.name.toLowerCase()) 
			return -1;
		else
			return 1;
	});

	for (var r = 0; r < repos.length; r++) {
		$("#srcrepolist").append($("<option></option>").attr("value", repos[r].name));
	}
}

function updateSrcRepos() {
	console.log("Update repos");
	$("#srcrepo").val("");
	$("#srcrepolist").empty();
	
	var getReposUrl = yoda.getGithubUrl() + "orgs/" + $("#srcowner").val() + "/repos";
	yoda.getLoop(getReposUrl, 1, [], showSrcRepos, null);
//	getReposUrl = yoda.getGithubUrl() + "users/" + $("#owner").val() + "/repos";
//	yoda.getLoop(getReposUrl, -1, [], showRepos, null);
}

// -------------

function showDstRepos(repos) {
	repos.sort(function(a,b) {
		if (a.name.toLowerCase() < b.name.toLowerCase()) 
			return -1;
		else
			return 1;
	});

	for (var r = 0; r < repos.length; r++) {
		$("#dstrepolist").append($("<option></option>").attr("value", repos[r].name));
	}
}

function updateDstRepos() {
	console.log("Update repos");
	$("#dstrepo").val("");
	$("#dstrepolist").empty();
	
	var getReposUrl = yoda.getGithubUrl() + "orgs/" + $("#dstowner").val() + "/repos";
	yoda.getLoop(getReposUrl, 1, [], showDstRepos, null);
//	getReposUrl = yoda.getGithubUrl() + "users/" + $("#owner").val() + "/repos";
//	yoda.getLoop(getReposUrl, -1, [], showRepos, null);
}

// ------------

function showIssues() {
	var brackets = false;
	if ($('#brackets').is(":checked")) {
		var brackets = true;
	}
	
	var srcMilestone = $("#srcmilestone option:selected").text();
	var dstMilestone = $("#dstmilestone option:selected").text();
	issuesToCopy = [];
	
	for (var i = 0; i < srcIssues.length; i++) {
		logMessage(srcIssues[i].number + ": " + srcIssues[i].title);
		
		if (brackets==false || srcIssues[i].title.startsWith("[" + srcMilestone + "]")) {
			var srcIssueTitle = srcIssues[i].title;
			
			if (brackets)
				var dstIssueSearch = "[" + dstMilestone + "]" + srcIssueTitle.substring(srcMilestone.length + 2);
			else
				var dstIssueSearch = srcIssueTitle;
			
			console.log("Searching for '" + dstIssueSearch + "'");
			// Now, let's check if this issue (minus the initial part) can be found into the destination milestone.
			var foundIssue = 0;
			for (var j = 0; j < dstIssues.length; j++) {
				if (dstIssues[j].title == dstIssueSearch) {
					logMessage("  WARNING: This issue already exists in the destination.");
					foundIssue = 1;
					break;
				}
			}
			if (foundIssue == 0) {
				// Ok, let's add this issue to list of issues to be copied.
				issuesToCopy.push(srcIssues[i]);
				logMessage("  OK: This issue will be copied.");
			}
		} else {
			logMessage("  WARNING: Did not find milestone in brackets at title start");
		}
	}
	
	logMessage("A total of " + issuesToCopy.length + " issues are ready to be copied.");
}

function showSrcIssues(issues) {
	yoda.filterPullRequests(issues);
	console.log("No issues (after filtering out pull requests): " + issues.length);
	logMessage("Retrieved " + issues.length + " source issues.");
	srcIssues = issues;
	refreshState++;
	if (refreshState == 2) {
		showIssues();
	}
}

function showDstIssues(issues) {
	yoda.filterPullRequests(issues);
	console.log("No issues (after filtering out pull requests): " + issues.length);
	logMessage("Retrieved " + issues.length + " destination issues.");
	dstIssues = issues;
	refreshState++;
	if (refreshState == 2) {
		showIssues();
	}
}

//-------------- 

var refreshState = 0;
function refreshIssues() {
	yoda.updateUrl(getUrlParams());
	$("#console").val("");
	refreshState = 0;
	srcIssues = [];
	dstIssues = [];
	var srcMilestone = $("#srcmilestone").val(); 
	var dstMilestone = $("#dstmilestone").val();
	
	

//	if (dstMilestone == srcMilestone) {
//		yoda.showSnackbarError("Source and Destination milestone identical.", 3000);
//		return;
//	}

	// Get source issues
	var getSrcIssuesUrl = yoda.getGithubUrl() + "repos/" + $("#srcowner").val() + "/" + $("#srcrepo").val() + 
	"/issues?state=all&direction=asc";
	if ($("#recurring").val() != "")
		getSrcIssuesUrl  += "&labels=" + $("#recurring").val();
	if ($("#srcmilestone").val() != "0")
		getSrcIssuesUrl  += "&milestone=" + $("#srcmilestone").val();
	logMessage("Getting source issues using URL: " + getSrcIssuesUrl);
	yoda.getLoop(getSrcIssuesUrl, 1, [], showSrcIssues, function(errorText) { yoda.showSnackbarError("Error getting source issues: " + errorText, 3000);});

	// Get destination issues
	var getDstIssuesUrl = yoda.getGithubUrl() + "repos/" + $("#dstowner").val() + "/" + $("#dstrepo").val() + 
	"/issues?state=all&direction=asc";
	if ($("#recurring").val() != "")
		getDstIssuesUrl  += "&labels=" + $("#recurring").val();
	if ($("#dstmilestone").val() != "0")
		getDstIssuesUrl  += "&milestone=" + $("#dstmilestone").val();

	logMessage("Getting destination issues using URL: " + getDstIssuesUrl);
	yoda.getLoop(getDstIssuesUrl, 1, [], showDstIssues, function(errorText) { yoda.showSnackbarError("Error getting destination issues: " + errorText, 3000);});
}

// --------------

function copySingleIssue(issues) {
	var brackets = false;
	if ($('#brackets').is(":checked")) {
		var brackets = true;
	}

	if (issues.length == 0) {
		// done
		issuesToCopy = [];
		logMessage("Copy done.");
//		setTimeout(function() { refreshIssues(); }, 10000);
		return;
	}
	
	var srcMilestone = $("#srcmilestone option:selected").text();
	var dstMilestone = $("#dstmilestone option:selected").text();
	
	logMessage("Copying " + issues[0].number + ": " + issues[0].title);
	
	var srcIssueTitle = issues[0].title;
	if (brackets) 
		var newTitle = "[" + dstMilestone + "]" + srcIssueTitle.substring(srcMilestone.length + 2);
	else
		var newTitle = srcIssueTitle;
	
	var newBody = issues[0].body;
	
	// Need to to regexp substitution as per arg.
	var regExpList = $("#bodyremove").val().split(",");
	for (var r = 0; r < regExpList.length; r++) {
		var search = regExpList[r].split("/")[0];
		var rep = regExpList[r].split("/")[1];
		
		console.log("Search: '" + search + "', rep: '" + rep + "'");
//		console.log("Before: " + newBody);
		var regExpSearch = new RegExp(search, "gm");

		var newBody = newBody.replace(regExpSearch, rep);
//		console.log("After: " + newBody);
	}
	
	var createIssueUrl = yoda.getGithubUrl() + "repos/" + $("#dstowner").val() + "/" + $("#dstrepo").val() + "/issues";
	console.log("createUrl: " + createIssueUrl);

	var urlData = {
			"title": newTitle,
			"body": newBody,
			"labels" : issues[0].labels
	};
	if ($("#dstmilestone").val() != "0")
		urlData["milestone"] = $("#dstmilestone").val();
//	console.log(urlData);
	
	$.ajax({
		url: createIssueUrl,
		type: 'POST',
		data: JSON.stringify(urlData),
		success: function() { logMessage("  Succesfully created issue"); },
		error: function() { logMessage("  Failed to create issue"); },
		complete: function(jqXHR, textStatus) { copySingleIssue(issues.splice(1));}
	});
}


function copyIssues() {
	if (issuesToCopy.length == 0) {
		logMessage("No issues to copy.");
		return;
	}
	
	
	logMessage("");
	logMessage("Will attempt to copy " + issuesToCopy.length + " issues.");
	copySingleIssue(issuesToCopy);
}


// --------------

function openSprint() {
	if ($("#dstmilestone").val() != "0") {
		var milestone = $("#dstmilestone").val();
		var gitHubUrl = yoda.getGithubUrlHtml() + $("#dstowner").val() + "/" + $("#dstrepo").val() + "/milestone/" + milestone;
		console.log("Open milestone.." + milestone + ", url: " + gitHubUrl);
	} else {
		var gitHubUrl = yoda.getGithubUrlHtml() + $("#dstowner").val() + "/" + $("#dstrepo").val();
	}
	window.open(gitHubUrl);
}


// ------

function githubAuth() {
	console.log("Updating/setting github authentication for: " + $("#user"));
	yoda.gitAuth($("#user").val(), $("#token").val());
}

// --------------
