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

$.ajaxTransport("+binary", function(options, originalOptions, jqXHR){
	// check for conditions and support for blob / arraybuffer response type
	if (window.FormData && ((options.dataType && (options.dataType == 'binary')) || (options.data && ((window.ArrayBuffer && options.data instanceof ArrayBuffer) || (window.Blob && options.data instanceof Blob)))))
	{
		return {
			// create new XMLHttpRequest
			send: function(headers, callback){
				// setup all variables
				var xhr = new XMLHttpRequest(),
				url = options.url,
				type = options.type,
				async = options.async || true,
				// blob or arraybuffer. Default is blob
				dataType = options.responseType || "blob",
				data = options.data || null,
				username = options.username || null,
				password = options.password || null;

				xhr.addEventListener('load', function(){
					var data = {};
					data[options.dataType] = xhr.response;
					// make callback and send data
					callback(xhr.status, xhr.statusText, data, xhr.getAllResponseHeaders());
				});

				xhr.open(type, url, async, username, password);

				// setup custom headers
				for (var i in headers ) {
					xhr.setRequestHeader(i, headers[i] );
				}

				xhr.responseType = dataType;
				xhr.send(data);
			},
			abort: function(){
				jqXHR.abort();
			}
		};
	}
});





var issues = [];

function addIfNotDefault(params, field) {
	if ($("#" + field).val() != $("#" + field).prop('defaultValue')) {
		return params + "&" + field + "=" + $("#" + field).val(); 
	} else {
		return params;
	}
}

function getUrlParams() {
	var params = "owner=" + $("#owner").val() + "&repo=" + $("#repo").val();
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


// -----------

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

function updateRepos() {
	console.log("Update repos");
	$("#repo").val("");
	$("#repolist").empty();
	
//	var getReposUrl = yoda.getGithubUrl() + "orgs/" + $("#owner").val() + "/repos";
//	yoda.getLoop(getReposUrl, 1, [], showRepos, null);
	getReposUrl = yoda.getGithubUrl() + "users/" + $("#owner").val() + "/repos";
	yoda.getLoop(getReposUrl, -1, [], showRepos, null);
}

// -------------


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



function showIssues(issues) {
	for (var i = 0; i < issues.length; i++) {
		logMessage(issues[i]);
		console.log(issues[i]);
	}
}

function importIssues() {
	getIssuesUrl = jira.getJiraUrl() + "search?jql=project=" + $("#jiraproject").val() + "&fields=id";
	jira.getLoop(getIssuesUrl, 0, [], showIssues, function(errorText) { yoda.showSnackbarError("Error getting source issues: " + errorText, 3000);});
}


// --------------

function openGitHub() {
	var gitHubUrl = yoda.getGithubUrlHtml() + $("#owner").val() + "/" + $("#repo").val() + "/issues";
	window.open(gitHubUrl);
}

// ------

function githubAuth() {
	console.log("Updating/setting github authentication for: " + $("#user"));
	yoda.gitAuth($("#user").val(), $("#token").val());
}

// --------------
