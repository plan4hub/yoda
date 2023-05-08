//  Copyright 2018-2023 Hewlett Packard Enterprise Development LP
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

// Global variable for any css overwrite
let css = "";

//Parse markdown to HTML (if any)
function parseMarkdown(markdown) {
//	console.log(markdown);
	let markdownUrl = yoda.getGithubUrl() + "markdown";
	markdown = markdown.replace(/<br>/g, '<br>\n');  // A bit of a hack, but best way to handle that sometimes people have done lists using markdown, other times with bullets. 
	
	const urlData = {
			"text": markdown
	};
	
	let result = "";
	$.ajax({
		url: markdownUrl,
		type: 'POST',
		async: false, 
		data: JSON.stringify(urlData),
		success: function(data) { result = data; },
		error: function() { yoda.showSnackbarError("Failed to translate Markdown"); },
		// eslint-disable-next-line no-unused-vars
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
	let params = "owner=" + $("#owner").val();
	if (yoda.decodeUrlParam(null, "repotopic") != null)
		params += "&repotopic=" + yoda.decodeUrlParam(null, "repotopic");
	else
		params += "&repolist=" + $("#repolist").val();

	["labelfilter", "milestonefilter", "splitlabeldef", "sharedlabeldef", "splitbodydef", "fields", "translation", "csvdelimiter", "labelindicator", 
	"epiclabel", "outputfile", "cssowner", "cssrepo", "csspath", "cssbranch", "exportevents"].forEach((p) => {
		params = yoda.addIfNotDefault(params, p); });

	params += "&estimate=" + yoda.getEstimateInIssues();
	if ($("#state").val() != "open")
		params += "&state=" + $("#state").val(); 
	return params;
}

function logMessage(message) {
	$('#console').val($('#console').val() + message + "\n");
}

function yodaTrim(str, exc) {
	if (str.length > 0 && str[0] == exc)
		return yodaTrim(str.substring(1), exc);
	else if (str.length > 0 && str[str.length - 1] == exc)
		return yodaTrim(str.substring(0, str.length - 1), exc);
	else
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
	const reg = /^[ ]*> partof [ ]*((([^ ~]*\/)?([^ ~]*))?#([1-9][0-9]*))[ ]*\[([^\]]*)\][ ]*(.*)$/mg;
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
		for (let i = 0; i < epicMatches.length; i++) {
			if (epicMatches.repo == undefined && epicMatches.length > 0) {
				epicMatches.splice(i, 1);
				i--;
			}
		}
	} 
	
	// Ok, we had no Epic matches. Did we have other matches?
	if (epicMatches.length == 0 && otherMatches.length > 0) {
		for (let m = 0; m < otherMatches.length; m++) {
			// console.log("HERE", otherMatches[m].index, issue.html_url, issues[otherMatches[m].index].html_url);
			const result = getEpicData(issues, issues[otherMatches[m].index], level + 1);
			if (result.length > 0)
				return result;
		}
	}
	
	return epicMatches;	
}


// -- Helper function for formatting RC comments (as also used in body)
function formatComment(oldComment, body, date, exportToCsv) {
	let comment = oldComment;
	let rcText;
	if (exportToCsv) 
		rcText = yoda.extractKeywordField(body, "RC", "paragraph", "::"); // \n won't work in CSV file. Cannot read it... 
	else
		rcText = yoda.extractKeywordField(body, "RC", "paragraph", "<br>");
	if (rcText == "")
		return comment;
					
	if (!exportToCsv && comment == "") 
		comment = '<ul style="padding-left: 1em; margin-top: 0; margin-bottom: 0">';
					
	if (exportToCsv) {
		if (comment != "")
			comment += " / ";
		comment += yoda.formatDate(date) + ": " + rcText;
	} else {
		let parsedText = parseMarkdown(rcText);
		// console.log("parsed text:" + parsedText + ":");
		comment += '<li style="margin-bottom: 5px">' + yoda.formatDate(date) + ": " + parsedText  + '</li>';
	}
	return comment;
}

// ---------------------------------------
// Issues have been retrieved. Time to analyse data and draw the chart.
function exportIssues(issues) {
	console.log("Exporting issues. No issues (after filtering out pull requests): " + issues.length);
	
	// Let's filter out issues based on milestoneFilter (if set)
	if ($("#milestonefilter").val() != "") {
		yoda.filterIssuesMilestone(issues, $("#milestonefilter").val());
		console.log("  Filtered issues based on milestone filter. Now # of issues: " + issues.length);
	}
	logMessage("Info: Received " + issues.length + " issues. Now analyzing and converting to CSV.");

	// Let's set today as 0:0:0 time (so VERY start of the day)
	let today = new Date();
	today.setHours(0);
	today.setMinutes(0);
	today.setSeconds(0);
	const todayDate = yoda.formatDate(today);

	const singleLabelDef = $("#singlelabeldef").val();
	const sharedLabelDef = $("#sharedlabeldef").val();
	const splitLabelDef = $("#splitlabeldef").val();
	let splitbodyDef;
	if ($("#splitbodydef").val() == "")
		splitbodyDef = [];
	else
		splitbodyDef = $("#splitbodydef").val().split(",");
  
	const fieldValue = $("#fields").val();
	const labelIndicator = $("#labelindicator").val();
	const csvDelimiter = $("#csvdelimiter").val();
	const outputFile = $("#outputfile").val();

	const singleLabels = singleLabelDef.split(",");
	
	// For split, we need to find all possible matching labels
	let splitLabels = [];
	const splitLabelTemp = splitLabelDef.split(",");
	for (let s = 0; s < splitLabelTemp.length; s++) {
		if (splitLabelTemp[s].trim() == "")
			continue;
		console.log(splitLabelTemp[s]);
		const splitReg = new RegExp(splitLabelTemp[s]);
		let splitEntry = [];
		for (let i = 0; i < issues.length; i++) {
			for (var l = 0; l < issues[i].labels.length; l++) {
				const labelName = issues[i].labels[l].name;
				const res = labelName.match(splitReg);
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
	let sharedLabels = [];
	const sharedLabelTemp = sharedLabelDef.split(",");
	for (let s = 0; s < sharedLabelTemp.length; s++) {
		console.log(sharedLabelTemp[s]);
		const t = sharedLabelTemp[s].split("=");
		const t2 = {name: t[0], regexp: t[1]};
		sharedLabels.push(t2);
	}
//	console.log(sharedLabels);
	
	// Now we are ready to iterator over the issues, yippee
	const fields = fieldValue.split(",");
	console.log("fields: " + fieldValue);
	let data = [];
	let fieldErrors = [];
	let numberRoll = 0;
	for (let i = 0; i < issues.length; i++) {
		let skipIssue = false;
		
//		console.log(issues[i]);
		let el = {};
		
		// Go over the fields
		for (let f = 0; f < fields.length; f++) {
			const fName = fields[f];
//			console.log("Field: " + fName);
			let result;

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
				for (let as = 0; as < issues[i].assignees.length; as++) {
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
					const date = new Date(issues[i].closed_at)
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
				if (issues[i].milestone != undefined && issues[i].milestone.due_on != null)
                    el["MilestoneDate"] = yoda.formatDate(new Date(issues[i].milestone.due_on), true);
                else
                    el["MilestoneDate"] = "";
                break;
            case "MilestoneStartDate":
				if (issues[i].milestone != undefined && issues[i].milestone.description != null)
                    el["MilestoneStartDate"] = yoda.getMilestoneStartdate(issues[i].milestone.description);
                else
                    el["MilestoneStartDate"] = "";
                break;
            case "MilestoneIssueDuration":
				var milestoneIssueDuration = yoda.getMilestoneIssueDuration(issues[i]);
				if (milestoneIssueDuration != null)
					el["MilestoneIssueDuration"] = milestoneIssueDuration;
                else
                    el["MilestoneIssueDuration"] = "";
                break;
            case "DurationMilestone": 
				if (issues[i].milestone != undefined && issues[i].state == "closed" && issues[i].milestone.due_on != null) {
                    const createdDate = yoda.formatDate(new Date(issues[i].created_at));
                    const milestoneDate = yoda.formatDate(new Date(issues[i].milestone.due_on));
                    el["DurationMilestone"] = yoda.dateDiff(createdDate, milestoneDate);
                } else {
                    el["DurationMilestone"] = "";
                }
                break;
            case "Duration":
				var createdDate = yoda.formatDate(new Date(issues[i].created_at));
				if (issues[i].closed_at != null) {
					const closedDate = yoda.formatDate(new Date(issues[i].closed_at));
					el["Duration"] = yoda.dateDiff(createdDate, closedDate);
				} else {
					el["Duration"] = yoda.dateDiff(createdDate, todayDate);
				}
				break;
			case "Epic URL":
				result = getEpicData(issues, issues[i]);
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
				result = getEpicData(issues, issues[i]);
				if (result.length > 0)
					el["Epic Title"] = result[0].title;
				else
					el["Epic Title"] = "";
				break;
			case "Epic Number":
				result = getEpicData(issues, issues[i]);
				if (result.length > 0)
					el["Epic Number"] = result[0].number;
				else
					el["Epic Number"] = "";
				break;
			case "Epic Repo":
				result = getEpicData(issues, issues[i]);
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
				{
					let comments = "";
					// Show comments newest first...
					for (let ca = issues[i].comments_array.length - 1; ca >= 0; ca--) {
						const date = new Date(issues[i].comments_array[ca].created_at);
						comments = formatComment(comments, issues[i].comments_array[ca].body, date, exportToCsv);
					}

					// Add (as last, being first as we are doing in reverse any comments into body field.)
					if (issues[i].body != null && issues[i].body != undefined)
						comments = formatComment(comments, issues[i].body, new Date(issues[i].created_at), exportToCsv);

					if (!exportToCsv && comments != "")
						comments += "</ul>";

					el["Comments"] = comments;
				}
				break;

			default:
				// Let's search between sharedLabels.
				for (let s = 0; s < sharedLabels.length; s++) {
					if (sharedLabels[s].name == fName) {
						el[fName] = "";
						let splitReg, mustMatch;
						if (sharedLabels[s].regexp.startsWith("!")) { 
							splitReg = new RegExp(sharedLabels[s].regexp.substring(1));
							mustMatch = true;
						} else {
							splitReg = new RegExp(sharedLabels[s].regexp);
							mustMatch = false;
						}
						for (let l = 0; l < issues[i].labels.length; l++) {
							const labelName = issues[i].labels[l].name;
							const res = labelName.match(splitReg);
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
		for (let s = 0; s < singleLabels.length; s++) {
			if (singleLabels[s] == "")
				continue;
			if (yoda.isLabelInIssue(issues[i], singleLabels[s]))
				el[singleLabels[s]] = labelIndicator;
			else
				el[singleLabels[s]] = "";
		}
		
		// Add splitLabels
		for (let s = 0; s < splitLabels.length; s++) {
			if (yoda.isLabelInIssue(issues[i], splitLabels[s]))
				el[splitLabels[s]] = labelIndicator;
			else
				el[splitLabels[s]] = "";
		}
		
		// Add splitbody fields
		for (let s = 0; s < splitbodyDef.length; s++) {
			let fieldRequired = false;
			// Right. Let's split into header and field
			const header = splitbodyDef[s].split(":")[0];
			let field = splitbodyDef[s].split(":")[1];
			let regExp = splitbodyDef[s].split(":")[2];
			
			if (field.startsWith("!")) {
				fieldRequired = true;
				field = field.substr(1);
			}

			if (regExp != undefined) {
				// special handling for regExp. Not only will we loop, but we will also do RegExp magic when extracting. Could in theory be merged with old/below handling, but
				// doing separately for now.

				let r = yoda.getAllBodyFields(issues[i].body, '^>[ ]*' + field + '[ ]+', regExp, 0);
				if (r.length > 0) {
					let result = [];
					r.forEach(element => {
						if (element.split(" ")[0].indexOf("#") != -1) {
							let url = null;
							// Ok. Let's be a bit smart here. IF the initial part of the string can be interpreted as a github issue, lets make sure it is shown as a link.
							// Ok, we have a #. Good enough to consider an issue reference.
							if (element.split(" ")[0][0] == "#")  // Local?
								url = issues[i].html_url.replace(issues[i].number, element.split(" "[0].substring(1)));
							else // Not local
								url = yoda.getGithubUrlHtml() + element.split(" ")[0].replace("#", "/issues/");
							result.push('<a href="' + url + '" target="_blank">' + element.split(" ")[0] + '</a> ' + element.split(" ").slice(1).join(" "));
						} else {
							result.push(element);
						}
					});

					el[header] = result.join("<br>");
				} else {
					if (fieldRequired)
						skipIssue = true;
					else
						el[header] = "";
				}
			} else {
				// No regexp, normal handling.
				let value = yoda.getLabelMatch(issues[i].body, ">[ ]*" + field + " ");
				if (value != null) {
					// Does this look like a date - from Javascript perspective? 
					if (yoda.isValidDate(value)) {
						console.log(value + "seems like a data to Javascript");
						let d = new Date();
						d.setTime(Date.parse(value.trim()));
						value = d.getUTCFullYear() + "-" + String(d.getUTCMonth() + 1).padStart(2, '0') + "-" + String(d.getUTCDate()).padStart(2, '0');
					} else if (value.split('/').length == 3) {
						console.log(value + " looks like a date.");
						// Does this look like a date - anyway?
						let [tDay, tMonth, tYear] = value.split(" ")[0].split("/");
						if (!isNaN(tDay) && !isNaN(tMonth) && !isNaN(tYear)) {
							let d = new Date();
							if (tYear < 2000)
								tYear = parseInt(tYear) + 2000;
							console.log(value, tYear, tMonth, tDay)
							d.setUTCFullYear(tYear, tMonth - 1, tDay);
							value = d.getUTCFullYear() + "-" + String(d.getUTCMonth() + 1).padStart(2, '0') + "-" + String(d.getUTCDate()).padStart(2, '0');
						}
					} else {
						// NOP - value is good
					}
					el[header] = value;
				} else {
					if (fieldRequired)
						skipIssue = true;
					else
						el[header] = "";
				}
			}
		}

		if (!skipIssue)
			data.push(el);
	}
	
	let translation;
	if ($("#translation").val() == "")
		translation = [];
	else
		translation = $("#translation").val().split(",");
	
	if (exportToCsv) {
		const config = {
			quotes: false,
			quoteChar: '"',
			delimiter: csvDelimiter,
			header: true,
			newline: "\r\n"
		};
	
		if (!$('#exportevents').is(":checked")) {
			// Normal case
			const result = Papa.unparse(data, config);
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
		let table = document.getElementById("issuesTable");
		table.innerHTML = css;
		$("#consoleframe").hide();
		const header = table.createTHead();
		const headerRow = header.insertRow();     

		if (data.length > 0) {
			for (let h in data[0]) {
				let cell = headerRow.insertCell();
				cell.innerHTML = h;

				// Translation overwrite?
				for (let t = 0; t < translation.length; t++) {
					if (translation[t].split(":")[0] == h)
						cell.innerHTML = translation[t].split(":")[1];											
				}				
			}
			
			table.appendChild(document.createElement('tbody'));
			let bodyRef = document.getElementById('issuesTable').getElementsByTagName('tbody')[0];

			for (let r = 0; r < data.length; r++) {
				let row = bodyRef.insertRow();
				for (var h in data[0]) {
					let cell = row.insertCell();
					cell.innerHTML = data[r][h];
				}
			}
		}
		yoda.updateUrl(getUrlParams() + "&table=true");
	}
}

// 
let issuesEvents = []; // Here we will store events against each issue, indexed by the issue URL. So will be a double-linked list (url, {events})
let issuesRemaining = []; // We will use this variable to store the remaining values. Otherwise we risk them becoming too big.
function getIssuesEventStart(issues) {
	issuesRemaining = [];
	issuesEvents = [];
	// First populate issuesRemaining list with urls. All we need to do to get events is then to append "/events" part.
	for (let i = 0; i < issues.length; i++)
		issuesRemaining.push(issues[i].url);
	getNextIssueEvent(null, null);
}

function storeEvents(storeUrl, events) {
	// Filter and process the events we want to store.
	for (let e = 0; e < events.length; e++) {
		let expEvent = {};
		if (events[e].event == "milestoned" || events[e].event == "demilestoned") {
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
		const issueUrl = issuesRemaining.pop();
		const issueUrlEvents = issueUrl + "/events";
		console.log("Issues event URL: " + issueUrlEvents);
		yoda.getLoop(issueUrlEvents, 1, [], 
				function(events) { getNextIssueEvent(issueUrl, events) }, 
				function(errorText) { yoda.showSnackbarError("Error getting issue events: " + errorText, 3000);});
	}
}

function exportIssueEvents() {
	const csvDelimiter = $("#csvdelimiter").val();
	const outputFile = $("#outputfile").val();

	console.log("Done. Showing events collected.");
	console.log(issuesEvents);

	const config = {
		quotes: false,
		quoteChar: '"',
		delimiter: csvDelimiter,
		header: true,
		newline: "\r\n"
	};

	const result = Papa.unparse(issuesEvents, config);
	yoda.downloadFile(result, outputFile);
	logMessage("Info: Events succesfully exported.");
}

// -------------------------
let exportToCsv = true;
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
			yoda.showSnackbarError("Error retriving CCS file: " + errorText);
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

export function init() {
	// Enable yodamenu
	yoda.enableMenu("#issue-exporter");

	yoda.getDefaultLocalStorage("#owner", "yoda.owner");
	yoda.decodeParamRadio('estimate', yoda.getDefaultLocalStorageValue("yoda.estimate"));
	yoda.decodeUrlParam("#owner", "owner");
	yoda.decodeUrlParam("#labelfilter", "labelfilter");
	yoda.decodeUrlParam("#milestonefilter", "milestonefilter");
	yoda.decodeUrlParam("#singlelabeldef", "singlelabeldef");
	yoda.decodeUrlParam("#sharedlabeldef", "sharedlabeldef");
	yoda.decodeUrlParam("#splitbodydef", "splitbodydef");
	yoda.decodeUrlParam("#splitlabeldef", "splitlabeldef");
	yoda.decodeUrlParam("#fields", "fields");
	yoda.decodeUrlParam("#translation", "translation");
	yoda.decodeUrlParam("#csvdelimiter", "csvdelimiter");
	yoda.decodeUrlParam("#labelindicator", "labelindicator");
	yoda.decodeUrlParam("#state", "state");
	yoda.decodeUrlParam("#outputfile", "outputfile");
	yoda.decodeUrlParamRadio("estimate", "estimate");
	yoda.updateEstimateRadio();
	yoda.decodeUrlParamBoolean("#exportevents", "exportevents");

	// CSS stuff
	yoda.decodeUrlParam("#cssowner", "cssowner");
	yoda.decodeUrlParam("#cssrepo", "cssrepo");
	yoda.decodeUrlParam("#csspath", "csspath");
	yoda.decodeUrlParam("#cssbranch", "cssbranch");

	// Local storage
	yoda.getUserTokenLocalStorage("#user", "#token");

	// Do it after getting from localStorage
	yoda.decodeUrlParam("#user", "user");
	yoda.decodeUrlParam("#token", "token");

	// login
	console.log("Github authentisation: " + $("#user").val() + ", token: " + $("#token").val());
	yoda.gitAuth($("#user").val(), $("#token").val());

	// Event listeners
	$("#hamburger").on("click", yoda.menuClick);
	$("#owner").on("change", function() { yoda.updateReposAndGUI($("#owner").val(), "#repolist", "repolist", "yoda.repolist"); });
	$("#estimateradio").on("click", function(event) { yoda.setEstimateInIssues(event.value); });
	$("#exportbutton").on("click", function() { startExport(true); });
	$("#tablebutton").on("click", function() { css=""; startExport(false); });
	
	// Rather complex updating of the defaults repos. Once complete, check if we should draw.
	yoda.updateReposAndGUI($("#owner").val(), "#repolist", "repolist", "yoda.repolist", function () {
		// Should we draw directly? Only check this after the repo updates complete.
		// Should we draw directly?
		// Should we start export directly?
		if (yoda.decodeUrlParamBoolean(null, "export") == "true")
			startExport(true);
		else if (yoda.decodeUrlParamBoolean(null, "table") == "true")
			startExport(false);
	}, null);

	$(document).ready(function () {
		$('#repolist').select2({
			// minimumInputLength: 2,
			sorter: yoda.select2Sorter,
			matcher: yoda.select2Matcher
		});
		$('#repolist').on('select2:select', yoda.select2SelectEvent('#repolist'));
	});

	if (yoda.decodeUrlParam(null, "hideheader") == "true")
		$(".frame").hide();
}