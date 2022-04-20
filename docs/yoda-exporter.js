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


// Global variable for any css overwrite
var css = "";

function addIfNotDefault(params, field) {
	if ($("#" + field).val() != $("#" + field).prop('defaultValue')) {
		return params + "&" + field + "=" + $("#" + field).val(); 
	} else {
		return params;
	}
}

//Parse markdown to HTML (if any)
function parseMarkdown(markdown) {
//	console.log(markdown);
	var markdownUrl = yoda.getGithubUrl() + "markdown";
	markdown = markdown.replace(/<br>/g, '<br>\n');  // A bit of a hack, but best way to handle that sometimes people have done lists using markdown, other times with bullets. 
	
	var urlData = {
			"text": markdown
	};
	
	var result = "";
	$.ajax({
		url: markdownUrl,
		type: 'POST',
		async: false, 
		data: JSON.stringify(urlData),
		success: function(data) { result = data;},
		error: function() { yoda.showSnackbarError("Failed to translate Markdown"); },
		complete: function(jqXHR, textStatus) { }
	});

	// Let's remove initial <p> and ending </p>'
	if (result.indexOf("<p>") == 0)
		result = result.substring(3);
	if (result.indexOf("</p>") != -1)
		result = result.substring(0, result.indexOf("</p>"));
	
	return result;
}

function getUrlParams() {
	var params = addIfNotDefault("", "owner");
	params += "&repolist=" + $("#repolist").val();
	params = addIfNotDefault(params, "labelfilter");	
	params = addIfNotDefault(params, "singlelabeldef");
	params = addIfNotDefault(params, "sharedlabeldef");
	params = addIfNotDefault(params, "splitlabeldef");
	params = addIfNotDefault(params, "splitbodydef");
	params = addIfNotDefault(params, "fields");
	params = addIfNotDefault(params, "translation");
	params = addIfNotDefault(params, "csvdelimiter");
	params = addIfNotDefault(params, "labelindicator");
	params = addIfNotDefault(params, "epiclabel");
	params = addIfNotDefault(params, "outputfile");
	
	params = addIfNotDefault(params, "cssowner");
	params = addIfNotDefault(params, "cssrepo");
	params = addIfNotDefault(params, "csspath");
	params = addIfNotDefault(params, "cssbranch");
	
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

function yodaTrim(str, exc) {
	if (str.length > 0 && str[0] == exc) {
		return yodaTrim(str.substring(1), exc);
	} else if (str.length > 0 && str[str.length - 1] == exc) {
		return yodaTrim(str.substring(0, str.length - 1), exc);
	} else
		return str;
}

function getEpicData(issues, issue, level) {
	if (level == undefined)
		level = 0;
		
	if (level > 5)
		return [];
	
	// Search for lines in the issue description matching something like below:
	// > partof #3638 [Co - FF, T6 - Epic]  *ETSILifeCycle Suite split in base+functionallity*
	// If found will return a structure. Otherwise null.
	var reg = /^[ ]*> partof [ ]*((([^ ~]*\/)?([^ ~]*))?#([1-9][0-9]*))[ ]*\[([^\]]*)\][ ]*(.*)$/mg;
	// console.log(reg);
	
	var epicMatches = [];
	var otherMatches = [];
	do {
		var res = reg.exec(issue.body);
		
		if (res != null) {
			var labels = res[6].split(", ");
			var url = issue.html_url; // Let's build URL starting from the issue
			var urlParts = url.split("/");
			urlParts[urlParts.length - 1] = res[5]; // Replace issue #
			if (res[4] != undefined) {
				urlParts[urlParts.length - 3] = res[4]; // Repo.
			}
			url = urlParts.join("/");

			if (labels.indexOf($("#epiclabel").val()) != -1) {
				// We got our baby.... Let's build data to support it.
				epicMatches.push({number: res[5], title: yodaTrim(res[7], "*"), repo: res[4], url: url});  
			} else {
				// console.log("Issue " + issue.html_url + ", sSearching for: " + url);
				// Ok, let's see if we have this non-Epic issue as part of the export?
				for (var i = 0; i < issues.length; i++) {
					if (issues[i].html_url == url) {
						otherMatches.push({index: i});
						break;				
					}
				}
			}
		}
	} while (res != null);

	if (epicMatches.length > 1) {
		// Hmm.. Let's favor local if more than one epic match.
		for (var i = 0; i < epicMatches.length; i++) {
			if (epicMatches.repo == undefined && epicMatches.length > 0) {
				epicMatches.splice(i, 1);
				i--;
			}
		}
	} 
	
	// Ok, we had no Epic matches. Did we have other matches?
	if (epicMatches.length == 0 && otherMatches.length > 0) {
		for (var m = 0; m < otherMatches.length; m++) {
			// console.log("HERE", otherMatches[m].index, issue.html_url, issues[otherMatches[m].index].html_url);
			var result = getEpicData(issues, issues[otherMatches[m].index], level + 1);
			if (result.length > 0)
				return result;
		}
	}
	
	return epicMatches;	
}


// -- Helper function for formatting RC comments (as also used in body)
function formatComment(oldComment, body, date, exportToCsv) {
	var comment = oldComment;
	if (exportToCsv) 
		var rcText = yoda.extractKeywordField(body, "RC", "paragraph", "::"); // \n won't work in CSV file. Cannot read it... 
	else
		var rcText = yoda.extractKeywordField(body, "RC", "paragraph", "<br>");
	if (rcText == "")
		return comment;
					
	if (!exportToCsv && comment == "") 
		comment = '<ul style="padding-left: 1em; margin-top: 0; margin-bottom: 0">';
					
	if (exportToCsv) {
		if (comment != "")
			comment += " / ";
		comment += yoda.formatDate(date) + ": " + rcText;
	} else {
		var parsedText = parseMarkdown(rcText);
		// console.log("parsed text:" + parsedText + ":");
		comment += '<li style="margin-bottom: 5px">' + yoda.formatDate(date) + ": " + parsedText  + '</li>';
	}
	return comment;
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
	if ($("#splitbodydef").val() == "")
		var splitbodyDef = [];
	else
		var splitbodyDef = $("#splitbodydef").val().split(",");
  
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
	var numberRoll = 0;
	for (var i = 0; i < issues.length; i++) {
		var skipIssue = false;
		
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
			case "Index":
				el["Index"] = ++numberRoll;
				break;
			case "Owner":
				el["Owner"] = $("#owner").val();
				break;
			case "Repo":
				el["Repo"] = yoda.getUrlRepo(issues[i].url);
				break;
			case "Number":
				el["Number"] = issues[i].number;
				break;
			case "URL":
				if (exportToCsv)
					el["URL"] = '=HYPERLINK("' + issues[i].html_url + '")';
				else
					el["URL"] = '<a href="' + issues[i].html_url + '" target="_blank">' + issues[i].html_url + '</a>';
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
            case "MilestoneDate":
				if (issues[i].milestone != undefined && issues[i].milestone.due_on != null) {
                    el["MilestoneDate"] = yoda.formatDate(new Date(issues[i].milestone.due_on), true);
                } else {
                    el["MilestoneDate"] = "";
                }
                break;
            case "DurationMilestone": 
				if (issues[i].milestone != undefined && issues[i].state == "closed" && issues[i].milestone.due_on != null) {
                    var createdDate = yoda.formatDate(new Date(issues[i].created_at));
                    var milestoneDate = yoda.formatDate(new Date(issues[i].milestone.due_on));
                    el["DurationMilestone"] = yoda.dateDiff(createdDate, milestoneDate);
                } else {
                    el["DurationMilestone"] = "";
                }
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
			case "Epic URL":
				var result = getEpicData(issues, issues[i]);
				if (result.length > 0) {
					if (exportToCsv)
						el["Epic URL"] = '=HYPERLINK("' + result[0].url + '")';
					else
						el["Epic URL"] = '<a href="' + result[0].url + '" target="_blank">' + result[0].url + '</a>';
				} else {
					el["Epic URL"] = "";
				}
				break;
			case "Epic Title":
				var result = getEpicData(issues, issues[i]);
				if (result.length > 0) {
					el["Epic Title"] = result[0].title;
				} else {
					el["Epic Title"] = "";
				}
				break;
			case "Epic Number":
				var result = getEpicData(issues, issues[i]);
				if (result.length > 0) {
					el["Epic Number"] = result[0].number;
				} else {
					el["Epic Number"] = "";
				}
				break;
			case "Epic Repo":
				var result = getEpicData(issues, issues[i]);
				if (result.length > 0) {
					if (result[0].repo == undefined) 
						el["Epic Repo"] = yoda.getUrlRepo(issues[i].url); // Same as issue. Local ref.
					else
						el["Epic Repo"] = result[0].repo;
				} else {
					el["Epic Repo"] = "";
				}
				break;
			case "Comments":
				var comments = "";
//				for (var ca = 0; ca < issues[i].comments_array.length; ca++) {
				// Show comments newest first...
				for (var ca = issues[i].comments_array.length - 1; ca >= 0; ca--) {  
					var date = new Date(issues[i].comments_array[ca].created_at);
					comments = formatComment(comments, issues[i].comments_array[ca].body, date, exportToCsv);
				}
				
				// Add (as last, being first as we are doing in reverse any comments into body field.)
				var date = new Date(issues[i].created_at);
				if (issues[i].body != null && issues[i].body != undefined)
					comments = formatComment(comments, issues[i].body, date, exportToCsv);
				
				if (!exportToCsv && comments != "") 
					comments += "</ul>";
				
				el["Comments"] = comments;
				break;

			default:
				// Let's search between sharedLabels.
				for (var s = 0; s < sharedLabels.length; s++) {
					if (sharedLabels[s].name == fName) {
						el[fName] = "";
						if (sharedLabels[s].regexp.startsWith("!")) { 
							var splitReg = new RegExp(sharedLabels[s].regexp.substring(1));
							var mustMatch = true;
						} else {
							var splitReg = new RegExp(sharedLabels[s].regexp);
							var mustMatch = false;
						}
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
						if (el[fName] == "" && mustMatch)
							skipIssue = true;
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
			if (singleLabels[s] == "")
				continue;
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
		
		// Add splitbody fields
		for (var s = 0; s < splitbodyDef.length; s++) {
			var fieldRequired = false;
			// Right. Let's split into header and field
			var header = splitbodyDef[s].split(":")[0];
			var field = splitbodyDef[s].split(":")[1];
			
			if (field.startsWith("!")) {
				fieldRequired = true;
				field = field.substr(1);
			}
			
			var value = yoda.getLabelMatch(issues[i].body, ">[ ]*" + field + " ");
			if (value != null) {
				if (value.indexOf("GMT") != -1) { 
					// This looks like a date. Let's assume that it has format DD/MM/YY HH:MM GMT+1
					// new Date(year, monthIndex, day, hours, minut
					day = parseInt(value.substr(0, 2));
					month =  parseInt(value.substr(3, 2));
					year =  parseInt(value.substr(6, 2)) + 2000;
					value = year + "-" + String(month).padStart(2, '0') + "-" + String(day).padStart(2, '0'); 
				}
				el[header] = value;
			} else {
				if (fieldRequired)
					skipIssue = true;
				else
					el[header] = "";
			}
		}

		if (!skipIssue)
			data.push(el);
	}
	
	if ($("#translation").val() == "")
		var translation = [];
	else
		var translation = $("#translation").val().split(",");
	
	if (exportToCsv) {
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
	} else {
		// Export to table instead
		var table = document.getElementById("issuesTable");
		table.innerHTML = css;
		$("#consoleframe").hide();
		var header = table.createTHead();
		var headerRow = header.insertRow();     

		if (data.length > 0) {
			for (var h in data[0]) {
				var cell = headerRow.insertCell();
				
				cell.innerHTML = h;

				// Translation overwrite?
				for (var t = 0; t < translation.length; t++) {
					if (translation[t].split(":")[0] == h)
						cell.innerHTML = translation[t].split(":")[1];											
				}				
			}
			
			table.appendChild(document.createElement('tbody'));
			var bodyRef = document.getElementById('issuesTable').getElementsByTagName('tbody')[0];

			for (var r = 0; r < data.length; r++) {
				var row = bodyRef.insertRow();
				for (var h in data[0]) {
					cell = row.insertCell();
					cell.innerHTML = data[r][h];
				}
			}
		}
		yoda.updateUrl(getUrlParams() + "&table=true");
	}
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
		if (events[e].event == "closed" || events[e].event == "reopened" || events[e].event == "assigned" || events[e].event == "unassigned") {
			var expEvent = {};
			expEvent["Owner"] = storeUrl.split("/").slice(-4, -3)[0];
			expEvent["Repo"] = storeUrl.split("/").slice(-3, -2)[0];
			expEvent["Number"] = storeUrl.split("/").slice(-1)[0];
			expEvent["TimeStamp"] = events[e].created_at;
			expEvent["EventActor"] = events[e].actor.login;
			expEvent["EventType"] = events[e].event;
// 			expEvent["EventTarget"] = events[e].label.name;
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
var exportToCsv = true;
function startExport(exp) {
	exportToCsv = exp;
	$("#console").val("");
	
	if (exportToCsv == false && $("#cssowner").val() != "" && $("#cssrepo").val() != "" && $("#csspath").val() != "" && css == "") {
		// Let's get the css, then call again.
		yoda.getGitFile($("#cssowner").val(), $("#cssrepo").val(), $("#csspath").val(), $("#cssbranch").val(), 
		function(data) {
			css = "<style>" + data + "</style>";
			startExport(exp);
		}, 
		function(errorText) {
			yoda.showSnackbarError(errorText);
		});
	} else {
		// Get the issues - and maybe comments as well.
		 
		// Need comments?
		if ($("#fields").val().indexOf("Comments") != -1) {
			// Yes, need comments
			if ($("#repolist").val() == "") 
				yoda.updateGitHubIssuesOrgWithComments($("#owner").val(), $("#labelfilter").val(), $("#state").val(), exportIssues, function(errorText) { yoda.showSnackbarError("Error getting issues: " + errorText, 3000);});
			else
				yoda.updateGitHubIssuesReposWithComments($("#owner").val(), $("#repolist").val(), $("#labelfilter").val(), $("#state").val(), null, exportIssues, function(errorText) { yoda.showSnackbarError("Error getting issues: " + errorText, 3000);});
		} else {
			// No not need comments
			if ($("#repolist").val() == "") 
				yoda.updateGitHubIssuesOrg($("#owner").val(), $("#labelfilter").val(), $("#state").val(), exportIssues, function(errorText) { yoda.showSnackbarError("Error getting issues: " + errorText, 3000);});
			else
				yoda.updateGitHubIssuesRepos($("#owner").val(), $("#repolist").val(), $("#labelfilter").val(), $("#state").val(), null, exportIssues, function(errorText) { yoda.showSnackbarError("Error getting issues: " + errorText, 3000);});
		}
		logMessage("Info: Initiated Github request.");
	}
}

//-------------------------


function getLoopOrg(url, lastOrgId, collector, finalFunc, errorFunc, callNo) {
	if (lastOrgId != -1) {
		var oldIndex = url.indexOf("since=");
		if (oldIndex != -1) { 
			url = url.substring(0, oldIndex) + "per_page=100&since=" + lastOrgId;
		} else {
			// Do we have a ?
			if (url.indexOf("?") == -1) {
				url = url + "?per_page=100&since=" + lastOrgId;
			} else {
				url = url + "&per_page=100&since=" + lastOrgId;
			}
		}
	}
	
	$.getJSON(url, function(response, status) {
		if (response != undefined && response.length > 0) {
			getLoopOrg(url, response[response.length - 1].id, collector.concat(response), finalFunc, errorFunc, callNo);
		} else {
			$("*").css("cursor", "default");
			finalFunc(collector.concat(response));
		}
	}).done(function() { /* One call succeeded */ })
	.fail(function(jqXHR, textStatus, errorThrown) { 
		$("*").css("cursor", "default");
		if (errorFunc != null) {
			errorFunc(errorThrown + " " + jqXHR.status);
		}
	})
	.always(function() { /* One call ended */ });;          
}


var orgsGlob = [];
function countOrgRepos(orgRepos) {
	if (orgRepos.length > 0) {
		console.log(orgRepos[0][1]);
		yoda.getLoop(orgRepos[0][1], -1, [], 
				function(data) { orgsGlob[orgRepos[0][0]] = data[0]; countOrgRepos(orgRepos.slice(1)); }, 
				function(errorText) { yoda.showSnackbarError("Error getting repositories: " + errorText, 3000);}
				);
	} else {
		// Sort
		orgsGlob.sort(function(a, b) {return Object.keys(a).length > Object.keys(b).length;});
		
		for (var o = 0; o < orgsGlob.length; o++) {
			logMessage((o + 1) + ":" + orgsGlob[o].id + " / " + orgsGlob[o].login + " / " + orgsGlob[o].number_repos + " / " + orgsGlob[o].description);
		}
		
		// Get number of repos for each org.
		var csvDelimiter = $("#csvdelimiter").val();
		var outputFile = $("#outputfile").val();

		config = {
				quotes: false,
				quoteChar: '"',
				delimiter: csvDelimiter,
				header: true,
				newline: "\r\n"
			};

		result = Papa.unparse(orgsGlob, config);
		yoda.downloadFile(result, outputFile);
	}
}

function startExportOrg() {
	$("#console").val("");
	orgsRepos = [];

	// Specific repo only. 
	var getOrganizationsUrl = yoda.getGithubUrl() + "organizations";
	getLoopOrg(getOrganizationsUrl, -1, [], function(orgs) {
		orgsGlob = orgs;
		for (var o = 0; o < orgs.length; o++) {
// 			logMessage((o + 1) + ":" + orgs[o].id + " / " + orgs[o].login + " / " + orgs[o].description);
			orgsRepos.push([o, orgs[o].url]);
		}
		countOrgRepos(orgsRepos);
	}, null);
}

// --------------
function githubAuth() {
	console.log("Github authentisation: " + $("#user").val() + ", token: " + $("#token").val());
	yoda.gitAuth($("#user").val(), $("#token").val());
}

// --------------
