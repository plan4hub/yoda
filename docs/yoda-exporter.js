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
	params = addIfNotDefault(params, "repo");
	params = addIfNotDefault(params, "singlelabeldef");
	params = addIfNotDefault(params, "sharedlabeldef");
	params = addIfNotDefault(params, "splitlabeldef");
	params = addIfNotDefault(params, "fields");
	params = addIfNotDefault(params, "csvdelimiter");
	params = addIfNotDefault(params, "labelindicator");
	params = addIfNotDefault(params, "outputfile");
	if ($("#state").val() != "open") {
		params += "&state=" + $("#state").val(); 
	}
	return params;
}

function logMessage(message) {
	$('#console').val($('#console').val() + message + "\n");
}

// ---------------------------------------
// Issues have been retrieved. Time to analyse data and draw the chart.
function exportIssues(issues) {
	console.log("Exporting issues. No issues (before filtering out pull requests): " + issues.length);
	yoda.filterPullRequests(issues);
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
				el["Remaining"] = yoda.issueRemaining(issues[i], yoda.issueEstimate(issues[i]));
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

	result = Papa.unparse(data, config);
	yoda.downloadFile(result, outputFile);
	logMessage("Info: Data succesfully exported.");
	
	yoda.updateUrl(getUrlParams() + "&export=true");
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

function updateRepos() {
	console.log("Update repos");
	$("#repo").val("");
	$("#repolist").empty();
	
	var getReposUrl = yoda.getGithubUrl() + "orgs/" + $("#owner").val() + "/repos/";
	yoda.getLoop(getReposUrl, 1, [], showRepos, null);
//	getReposUrl = yoda.getGithubUrl() + "users/" + $("#owner").val() + "/repos";
//	yoda.getLoop(getReposUrl, -1, [], showRepos, null);
}

	
// -------------------------

function startExport() {
	$("#console").val("");
	
	// We are able to get either all issues into a given repo, or all issues for an entire org/owner
	// The value of #repo decides what we do.
	if ($("#repo").val() == "") {
		// All issues into org.
		var getIssuesUrl = yoda.getGithubUrl() + "orgs/" + $("#owner").val() + 
		"/issues?filter=all&state=" + $("#state").val() + "&direction=asc";
	} else {
		// Specific repo only. 
		var getIssuesUrl = yoda.getGithubUrl() + "repos/" + $("#owner").val() + "/" + $("#repo").val() +
		"/issues?state=" + $("#state").val() + "&direction=asc";
	}
	
	if ($("#labelfilter").val() != "") {
		getIssuesUrl += "&" + "labels=" + $("#labelfilter").val(); 
	}
	console.log("URL:" + getIssuesUrl);
	logMessage("Info: Initiating Github request: " + getIssuesUrl);
	yoda.getLoop(getIssuesUrl, 1, [], exportIssues, errorFunc);
}

// --------------
function githubAuth() {
	console.log("Github authentisation: " + $("#user").val() + ", token: " + $("#token").val());
	yoda.gitAuth($("#user").val(), $("#token").val());
}

// --------------
