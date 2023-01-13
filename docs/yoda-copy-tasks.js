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

import * as yoda from './yoda-utils.js'

let srcIssues = [];
let dstIssues = [];
let issuesToCopy = [];

function getUrlParams() {
	let params = "srcowner=" + $("#srcowner").val() + "&dstowner=" + $("#dstowner").val() + "&srcrepo=" + $("#srcrepo").val() + "&dstrepo=" + $("#dstrepo").val();
	["recurring", "bodyremove"].forEach((p) => {
		params = yoda.addIfNotDefault(params, p); });
	return params;
}
	
function logMessage(message) {
	$('#console').val($('#console').val() + message + "\n");
	$('#console').scrollTop($('#console')[0].scrollHeight);
}

// ---------------------------------------
// Milestone issues have been retrieved. Time to analyse data and draw the chart.
export function doCopy(issues) {
	yoda.updateUrl(getUrlParams());

	console.log("No of issues retrieved: " + issues.length);
	copySingleIssue(issues);
}

//------------------
// Note special logic to allow URL override of milestone. ONLY for first selection.
export function showSrcMilestones(milestones) {
	$("#srcmilestone").empty();
	$("#srcmilestone").append($("<option></option>").attr("value", 0).text("Select milestone ... "));
	for (let m = 0; m < milestones.length; m++)
		$("#srcmilestone").append($("<option></option>").attr("value", milestones[m].number).text(milestones[m].title));
}

export function showDstMilestones(milestones) {
	$("#dstmilestone").empty();
	$("#dstmilestone").append($("<option></option>").attr("value", 0).text("Select milestone ... "));
	for (let m = 0; m < milestones.length; m++)
		$("#dstmilestone").append($("<option></option>").attr("value", milestones[m].number).text(milestones[m].title));
}

export function updateSrcMilestones() {
	const getMilestonesUrl = yoda.getGithubUrl() + "repos/" + $("#srcowner").val() + "/" + $("#srcrepo").val() + "/milestones?state=all";
	yoda.getLoop(getMilestonesUrl, 1, [], showSrcMilestones, null);
}

export function updateDstMilestones() {
	const getMilestonesUrl = yoda.getGithubUrl() + "repos/" + $("#dstowner").val() + "/" + $("#dstrepo").val() + "/milestones?state=all";
	yoda.getLoop(getMilestonesUrl, 1, [], showDstMilestones, null);
}

// -----------

export function showSrcRepos(repos) {
	repos.sort(function(a,b) {
		return a.name.toLowerCase() < b.name.toLowerCase()? -1 : 1;
	});

	for (let r = 0; r < repos.length; r++)
		$("#srcrepolist").append($("<option></option>").attr("value", repos[r].name));
}

export function updateSrcRepos() {
	console.log("Update repos");
	$("#srcrepo").val("");
	$("#srcrepolist").empty();
	
	const getReposUrl = yoda.getGithubUrl() + "orgs/" + $("#srcowner").val() + "/repos";
	yoda.getLoop(getReposUrl, 1, [], showSrcRepos, null);
}

// -------------

export function showDstRepos(repos) {
	repos.sort(function(a,b) {
		return a.name.toLowerCase() < b.name.toLowerCase()? -1 : 1;
	});

	for (let r = 0; r < repos.length; r++)
		$("#dstrepolist").append($("<option></option>").attr("value", repos[r].name));
}

export function updateDstRepos() {
	console.log("Update repos");
	$("#dstrepo").val("");
	$("#dstrepolist").empty();
	
	const getReposUrl = yoda.getGithubUrl() + "orgs/" + $("#dstowner").val() + "/repos";
	yoda.getLoop(getReposUrl, 1, [], showDstRepos, null);
}

export function showIssues() {
	let brackets = false;
	if ($('#brackets').is(":checked")) {
		brackets = true;
	}
	
	const srcMilestone = $("#srcmilestone option:selected").text();
	const dstMilestone = $("#dstmilestone option:selected").text();
	issuesToCopy = [];
	
	for (let i = 0; i < srcIssues.length; i++) {
		logMessage(srcIssues[i].number + ": " + srcIssues[i].title);
		
		if (brackets==false || srcIssues[i].title.startsWith("[" + srcMilestone + "]")) {
			const srcIssueTitle = srcIssues[i].title;
			
			let dstIssueSearch;
			if (brackets)
				dstIssueSearch = "[" + dstMilestone + "]" + srcIssueTitle.substring(srcMilestone.length + 2);
			else
				dstIssueSearch = srcIssueTitle;
			
			console.log("Searching for '" + dstIssueSearch + "'");
			// Now, let's check if this issue (minus the initial part) can be found into the destination milestone.
			let foundIssue = 0;
			for (let j = 0; j < dstIssues.length; j++) {
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

export function showSrcIssues(issues) {
	yoda.filterPullRequests(issues);
	console.log("No issues (after filtering out pull requests): " + issues.length);
	logMessage("Retrieved " + issues.length + " source issues.");
	srcIssues = issues;
	refreshState++;
	if (refreshState == 2)
		showIssues();
}

export function showDstIssues(issues) {
	yoda.filterPullRequests(issues);
	console.log("No issues (after filtering out pull requests): " + issues.length);
	logMessage("Retrieved " + issues.length + " destination issues.");
	dstIssues = issues;
	refreshState++;
	if (refreshState == 2)
		showIssues();
}

//-------------- 

let refreshState = 0;
export function refreshIssues() {
	yoda.updateUrl(getUrlParams());
	$("#console").val("");
	refreshState = 0;
	srcIssues = [];
	dstIssues = [];

	// Get source issues
	let getSrcIssuesUrl = yoda.getGithubUrl() + "repos/" + $("#srcowner").val() + "/" + $("#srcrepo").val() + "/issues?state=all&direction=asc";
	if ($("#recurring").val() != "")
		getSrcIssuesUrl  += "&labels=" + $("#recurring").val();
	if ($("#srcmilestone").val() != "0")
		getSrcIssuesUrl  += "&milestone=" + $("#srcmilestone").val();
	logMessage("Getting source issues using URL: " + getSrcIssuesUrl);
	yoda.getLoop(getSrcIssuesUrl, 1, [], showSrcIssues, function(errorText) { yoda.showSnackbarError("Error getting source issues: " + errorText, 3000);});

	// Get destination issues
	let getDstIssuesUrl = yoda.getGithubUrl() + "repos/" + $("#dstowner").val() + "/" + $("#dstrepo").val() + 
	"/issues?state=all&direction=asc";
	if ($("#recurring").val() != "")
		getDstIssuesUrl  += "&labels=" + $("#recurring").val();
	if ($("#dstmilestone").val() != "0")
		getDstIssuesUrl  += "&milestone=" + $("#dstmilestone").val();

	logMessage("Getting destination issues using URL: " + getDstIssuesUrl);
	yoda.getLoop(getDstIssuesUrl, 1, [], showDstIssues, function(errorText) { yoda.showSnackbarError("Error getting destination issues: " + errorText, 3000);});
}

// --------------

export function copySingleIssue(issues) {
	let brackets = false;
	if ($('#brackets').is(":checked"))
		brackets = true;

	if (issues.length == 0) {
		// done
		issuesToCopy = [];
		logMessage("Copy done.");
//		setTimeout(function() { refreshIssues(); }, 10000);
		return;
	}
	
	const srcMilestone = $("#srcmilestone option:selected").text();
	const dstMilestone = $("#dstmilestone option:selected").text();
	
	logMessage("Copying " + issues[0].number + ": " + issues[0].title);
	
	const srcIssueTitle = issues[0].title;
	let newTitle;
	if (brackets) 
		newTitle = "[" + dstMilestone + "]" + srcIssueTitle.substring(srcMilestone.length + 2);
	else
		newTitle = srcIssueTitle;
	
	let newBody = issues[0].body;
	
	// Need to to regexp substitution as per arg.
	const regExpList = $("#bodyremove").val().split(",");
	for (let r = 0; r < regExpList.length; r++) {
		const search = regExpList[r].split("/")[0];
		const rep = regExpList[r].split("/")[1];
		
		console.log("Search: '" + search + "', rep: '" + rep + "'");
//		console.log("Before: " + newBody);
		const regExpSearch = new RegExp(search, "gm");

		newBody = newBody.replace(regExpSearch, rep);
//		console.log("After: " + newBody);
	}
	
	const createIssueUrl = yoda.getGithubUrl() + "repos/" + $("#dstowner").val() + "/" + $("#dstrepo").val() + "/issues";
	console.log("createUrl: " + createIssueUrl);

	let copiedFrom;
	if ($("#srcowner").val() == $("#dstowner").val() && $("#srcrepo").val() == $("#dstrepo").val())
		copiedFrom = "\n*Issue copied from #" + issues[0].number + " " + issues[0].title + "*\n"; 
	else
		copiedFrom = "\n*Issue copied from " + $("#srcowner").val() + "/" + $("#srcrepo").val() + "#" + issues[0].number + " " + issues[0].title + "*\n"; 
	console.log(":" + copiedFrom + ":");
	newBody += copiedFrom;

	const urlData = {
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
		success: function(resp) { logMessage("  Succesfully created issue " + resp.number + ": " + resp.title); },
		error: function() { logMessage("  Failed to create issue"); },
		// eslint-disable-next-line no-unused-vars
		complete: function(jqXHR, textStatus) { copySingleIssue(issues.splice(1));}
	});
}

export function copyIssues() {
	if (issuesToCopy.length == 0) {
		logMessage("No issues to copy.");
		return;
	}
	
	logMessage("");
	logMessage("Will attempt to copy " + issuesToCopy.length + " issues.");
	copySingleIssue(issuesToCopy);
}

// --------------

export function openSprint() {
	let gitHubUrl;
	if ($("#dstmilestone").val() != "0") {
		const milestone = $("#dstmilestone").val();
		gitHubUrl = yoda.getGithubUrlHtml() + $("#dstowner").val() + "/" + $("#dstrepo").val() + "/milestone/" + milestone;
		console.log("Open milestone.." + milestone + ", url: " + gitHubUrl);
	} else {
		gitHubUrl = yoda.getGithubUrlHtml() + $("#dstowner").val() + "/" + $("#dstrepo").val();
	}
	window.open(gitHubUrl);
}

// --------------

export function init() {
	// Enable yodamenu
	yoda.enableMenu("#task-copier");

	yoda.getDefaultLocalStorage("#srcowner", "yoda.owner");
	yoda.getDefaultLocalStorage("#dstowner", "yoda.owner");

	yoda.decodeUrlParam("#srcowner", "srcowner");
	yoda.decodeUrlParam("#dstowner", "dstowner");
	yoda.decodeUrlParam("#srcrepo", "srcrepo");
	yoda.decodeUrlParam("#dstrepo", "dstrepo");
	yoda.decodeUrlParam("#recurring", "recurring");
	yoda.decodeUrlParam("#bodyremove", "bodyremove");
	
	// Does not work in IE
	try {
		$("#user").val(localStorage.getItem("gitHubUserId"));
		$("#token").val(localStorage.getItem("gitHubAccessToken"));
	}
	catch (err) {
		console.error("Failed to set user-id and token into localStorage. Probably IE.");
	}

	// Do it after getting from localStorage
	yoda.decodeUrlParam("#user", "user");
	yoda.decodeUrlParam("#token", "token");

	// We do not want caching here. 
	$.ajaxSetup({ cache: false });

	// login
	console.log("Updating/setting github authentication for: " + $("#user"));
	yoda.gitAuth($("#user").val(), $("#token").val());

	// Event listeners
	$("#hamburger").on("click", yoda.menuClick);

	if ($("#srcrepo").val() == "") {
		updateSrcRepos();
	}
	if ($("#dstrepo").val() == "") {
		updateDstRepos();
	}
	updateSrcMilestones();
	updateDstMilestones();
}