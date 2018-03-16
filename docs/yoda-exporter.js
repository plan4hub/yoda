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
	params = addIfNotDefault(params, "singlelabeldef");
	params = addIfNotDefault(params, "sharedlabeldef");
	params = addIfNotDefault(params, "splitlabeldef");
	params = addIfNotDefault(params, "fields");
	params = addIfNotDefault(params, "csvdelimiter");
	params = addIfNotDefault(params, "labelindicator");
	params = addIfNotDefault(params, "outputfile");
	params += "&estimate=" + yoda.getEstimateInIssues();
	if ($("#state").val() != "open") {
		params += "&state=" + $("#state").val(); 
	}
	if ($('#exportevents').is(":checked")) {
		params += "&exportevents=true";
	}

	return params;
}

function estimateClick(radio) {
	yoda.setEstimateInIssues(radio.value);
}

function logMessage(message) {
	$('#console').val($('#console').val() + message + "\n");
}

// ---------------------------------------
// Issues have been retrieved. Time to analyse data and draw the chart.
function exportIssues(issues) {
	console.log("Exporting issues. No issues (after filtering out pull requests): " + issues.length);
	logMessage("Info: Received " + issues.length + " issues. Now analyzing and converting to CSV.");

	// Let's set today as 0:0:0 time (so VERY start of the day)
	var today = new Date();
	today.setHours(0);
	today.setMinutes(0);
	today.setSeconds(0);
	var todayDate = yoda.formatDate(today);

	var singleLabelDef = $("#singlelabeldef").val();
	var sharedLabelDef = $("#sharedlabeldef").val();
	var splitLabelDef = $("#splitlabeldef").val();
	var fieldValue = $("#fields").val();
	var labelIndicator = $("#labelindicator").val();
	var csvDelimiter = $("#csvdelimiter").val();
	var outputFile = $("#outputfile").val();

	var singleLabels = singleLabelDef.split(",");
	
	// For split, we need to find all possible matching labels
	var splitLabels = [];
	var splitLabelTemp = splitLabelDef.split(",");
	for (var s = 0; s < splitLabelTemp.length; s++) {
		if (splitLabelTemp[s].trim() == "")
			continue;
		console.log(splitLabelTemp[s]);
		var splitReg = new RegExp(splitLabelTemp[s]);
		var splitEntry = [];
		for (i=0; i<issues.length; i++) {
			for (var l=0; l<issues[i].labels.length; l++) {
				var labelName = issues[i].labels[l].name;
				var res = labelName.match(splitReg);
				if (res != null) {
					if (splitEntry.indexOf(labelName) == -1) {
//						console.log("Found label: " + labelName);
						splitEntry.push(labelName);
					}
				}
			}
		}
		splitEntry = splitEntry.sort();
		splitLabels = splitLabels.concat(splitEntry);
	}
	console.log("Split labels: " + splitLabels);

	// Also do a bit of preparation work on shared columns
	var sharedLabels = [];
	var sharedLabelTemp = sharedLabelDef.split(",");
	for (var s = 0; s < sharedLabelTemp.length; s++) {
		console.log(sharedLabelTemp[s]);
		var t = sharedLabelTemp[s].split("=");
		var t2 = {name: t[0], regexp: t[1]};
		sharedLabels.push(t2);
	}
//	console.log(sharedLabels);
	
	// Now we are ready to iterator over the issues, yippee
	var fields = fieldValue.split(",");
	console.log("fields: " + fieldValue);
	var data = [];
	var fieldErrors = [];
	for (var i = 0; i < issues.length; i++) {
//		console.log(issues[i]);
		var el = {};
		
		// Go over the fields
		for (var f = 0; f < fields.length; f++) {
			var fName = fields[f];
//			console.log("Field: " + fName);

			// First handle the built-in fields
			switch (fName) {
			case "":
				// Never mind, not a field.
				break;
			case "Owner":
				el["Owner"] = $("#owner").val();
				break;
			case "Repo":
				el["Repo"] = yoda.getUrlRepo(issues[i].repository_url);
				break;
			case "Number":
				el["Number"] = issues[i].number;
				break;
			case "URL":
				el["URL"] = issues[i].html_url;
				break;
			case "State":
				el["State"] = issues[i].state;
				break;
			case "Submitter":
				el["Submitter"] = issues[i].user.login;
				break;
			case "Assignee":
				el["Assignee"] = "";
				if (issues[i].assignee != null) {
					el["Assignee"] = issues[i].assignee.login;
				}
				break;
			case "Assignees":
				el["Assignees"] = "";
				for (var as = 0; as < issues[i].assignees.length; as++) {
					if (el["Assignees"] != "")
						el["Assignees"] += ",";
					el["Assignees"] += issues[i].assignees[as].login;
				}
				break;
			case "Milestone":
				if (issues[i].milestone != undefined) {
					el["Milestone"] = issues[i].milestone.title;
				} else {
					el["Milestone"] = "";
				}
				break;
			case "Created at":
				var date = new Date(issues[i].created_at)
				el["Created at"] = yoda.formatDate(date);
				break;
			case "Closed at":
				el["Closed at"] = "";
				if (issues[i].closed_at != null) {
					var date = new Date(issues[i].closed_at)
					el["Closed at"] = yoda.formatDate(date);
				}
				break;
			case "Title":
				el["Title"] = issues[i].title;
				break;
			case "Estimate":
				el["Estimate"] = yoda.issueEstimate(issues[i]);
				break;
			case "Remaining":
				el["Remaining"] = yoda.issueRemainingMeta(issues[i], yoda.issueEstimate(issues[i]));
				break;
			case "Body":
				el["Body"] = issues[i].body;
				break;
				// Syntethized fields
			case "Report Date":
				el["Report Date"] = yoda.formatDate(today);
				break;
			case "Duration":
				var createdDate = yoda.formatDate(new Date(issues[i].created_at));
				if (issues[i].closed_at != null) {
					var closedDate = yoda.formatDate(new Date(issues[i].closed_at));
					el["Duration"] = yoda.dateDiff(createdDate, closedDate);
				} else {
					el["Duration"] = yoda.dateDiff(createdDate, todayDate);
				}
				break;
			default:
				// Let's search between sharedLabels.
				for (var s = 0; s < sharedLabels.length; s++) {
					if (sharedLabels[s].name == fName) {
						el[fName] = "";
						var splitReg = new RegExp(sharedLabels[s].regexp);
						for (var l=0; l<issues[i].labels.length; l++) {
							var labelName = issues[i].labels[l].name;
							var res = labelName.match(splitReg);
//							console.log(issues[i].number + ", " + labelName + ", " + fName + ", " + res);
							if (res != null) {
								if (el[fName] != "") {
									// Ups. Value already set. Several labels matching expression
									logMessage("Warning: Issue " + issues[i].html_url + " has several labels matching '" + sharedLabels[s].regexp);
								}
								el[fName] = labelName;
							}
						}
					}
				}
				if (el[fName] == undefined) {
					if (fieldErrors.indexOf(fName) == -1) {
						logMessage("Error: Found no way to interpret field: " + fName);
						fieldErrors.push(fName);
					}
				}
			}
		}
//		console.log(el);

		// Add singlelabels
		for (var s = 0; s < singleLabels.length; s++) {
			if (yoda.isLabelInIssue(issues[i], singleLabels[s])) {
				el[singleLabels[s]] = labelIndicator;
			} else {
				el[singleLabels[s]] = "";
			}
		}
		
		// Add splitLabels
		for (var s = 0; s < splitLabels.length; s++) {
			if (yoda.isLabelInIssue(issues[i], splitLabels[s])) {
				el[splitLabels[s]] = labelIndicator;
			} else {
				el[splitLabels[s]] = "";
			}
		}
		data.push(el);
	}
	
	config = {
			quotes: false,
			quoteChar: '"',
			delimiter: csvDelimiter,
			header: true,
			newline: "\r\n"
		};

	if (!$('#exportevents').is(":checked")) {
		// Normal case
		result = Papa.unparse(data, config);
		yoda.downloadFile(result, outputFile);
		logMessage("Info: Issues succesfully exported.");
	} else {
		// Events case
		// Ok, now we may want to continue doing the historic events per issue...
		getIssuesEventStart(issues);
	} 
		
	yoda.updateUrl(getUrlParams() + "&export=true");
}

// 
var issuesEvents = []; // Here we will store events against each issue, indexed by the issue URL. So will be a double-linked list (url, {events})
var issuesRemaining = []; // We will use this variable to store the remaining values. Otherwise we risk them becoming too big.
function getIssuesEventStart(issues) {
	issuesRemaining = [];
	issuesEvents = [];
	// First populate issuesRemaining list with urls. All we need to do to get events is then to append "/events" part.
	for (var i = 0; i < issues.length; i++) {
		issuesRemaining.push(issues[i].url);
	}
	getNextIssueEvent(null, null);
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

function getNextIssueEvent(storeUrl, events) {
	if (storeUrl != null) {  // we have data to store
//		console.log("Storing for " + storeUrl + " events");
		console.log(events);
		logMessage(" ... processed events for " + storeUrl);
		storeEvents(storeUrl, events);
	}
	
	if (issuesRemaining.length == 0) {
		exportIssueEvents();
	} else {
		var issueUrl = issuesRemaining.pop();
		var issueUrlEvents = issueUrl + "/events";
		console.log("Issues event URL: " + issueUrlEvents);
		yoda.getLoop(issueUrlEvents, 1, [], 
				function(events) { getNextIssueEvent(issueUrl, events) }, 
				function(errorText) { yoda.showSnackbarError("Error getting issue events: " + errorText, 3000);});
	}
}

function exportIssueEvents() {
	var csvDelimiter = $("#csvdelimiter").val();
	var outputFile = $("#outputfile").val();

	console.log("Done. Showing events collected.");
	console.log(issuesEvents);

	config = {
			quotes: false,
			quoteChar: '"',
			delimiter: csvDelimiter,
			header: true,
			newline: "\r\n"
		};

	result = Papa.unparse(issuesEvents, config);
	yoda.downloadFile(result, outputFile);
	logMessage("Info: Events succesfully exported.");
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
