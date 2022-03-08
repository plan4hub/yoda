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

var repoList = [];  // selected repos
var repoMilestones = []; // Double-array of repos,milestone (full structure) for selected repos

var commonMilestones = []; // Options for milestone selection (milestones in all repos, just title).

function addIfNotDefault(params, field) {
	if ($("#" + field).val() != $("#" + field).prop('defaultValue')) {
		return params + "&" + field + "=" + $("#" + field).val(); 
	} else {
		return params;
	}
}

function getUrlParams() {
	var params = "owner=" + $("#owner").val() + "&repolist=" + $("#repolist").val();
	if (yoda.getEstimateInIssues() != "inbody")
		params += "&estimate=" + yoda.getEstimateInIssues();
	params = addIfNotDefault(params, "labelsplit");	
	params = addIfNotDefault(params, "labelfilter");	
	params = addIfNotDefault(params, "assignee");	
	params = addIfNotDefault(params, "additionaldata");
	params = addIfNotDefault(params, "tentative");	
	params = addIfNotDefault(params, "inprogress");
	if ($("#milestonelist").val() != "") {
		params += "&milestone=" + $("#milestonelist").val(); 
	}
	if (!$('#showclosed').is(":checked")) {
		params += "&showclosed=false";
	}
	if ($('#closedmilestones').is(":checked")) {
		params += "&closedmilestones=true";
	}
	if ($('#trendline').is(":checked")) {
		params += "&trendline=true";
	}
	var capacity = yoda.decodeUrlParam(null, "capacity");
	if (capacity != null) {
		params += "&capacity=" + capacity;
	}
	if ($("#title").val() != "") {
		params += "&title=" + $("#title").val();
	}


	return params;
}
	
function estimateClick(radio) {
	yoda.setEstimateInIssues(radio.value);
}

//---------------------------------------
function clearTable() {
	var table = document.getElementById("issuesTable");
	table.innerHTML = "";
}

// -----------

function prepareSums(sums, labelItem) {
	if (sums[labelItem] == undefined) {
		var entry = {
				totalEstimate: 0,
				totalRemaining: 0,
				totalTentative: 0,
				totalTasks: 0,
				totalCompletedTasks: 0,
				totalIssues: 0
		};
		sums[labelItem] = [];
		sums[labelItem]["open"] = yoda.deepCopy(entry);
		sums[labelItem]["closed"] = yoda.deepCopy(entry);
		sums[labelItem]["inprogress"] = yoda.deepCopy(entry);
		sums[labelItem]["all"] = yoda.deepCopy(entry);
	}
}


function splitValues(sums, assigneeList, field, subField, value) {
	// Ok, we need to split the value, but not into too smart parts
	var noAssignees = assigneeList.length;
	var valueSplit = value / noAssignees;
	
	for (var as = 0; as < assigneeList.length; as++) {
		sums[assigneeList[as]][subField][field] += valueSplit;
	}
}

// -----------
// Example call: 	incrementCount(sums, "Grand Total", labelItem, assignee, "totalEstimate", est, issues[i]);
function incrementCount(sums, l1, l2, assigneeList, field, value, issue) {
	sums[l1]["all"][field] += value;
	sums[l2]["all"][field] += value;
	splitValues(sums, assigneeList, field, "all", value);

	sums[l1][issue.state][field] += value;
	sums[l2][issue.state][field] += value;
	splitValues(sums, assigneeList, field, issue.state, value);
	
	// and maybe into inprogress state as well.
	var inprogressLabel = $("#inprogress").val();
	if (yoda.isLabelInIssue(issue, inprogressLabel)) {
		sums[l1]["inprogress"][field] += value;
		sums[l2]["inprogress"][field] += value;
		splitValues(sums, assigneeList, field, "inprogress", value);
	}
}

function round(value, precision) {
    var multiplier = Math.pow(10, precision || 0);
    return Math.round(value * multiplier) / multiplier;
}

// ---

function insertTotalsRow(bodyRef, sums, labelItem, c1, c2, c3, c4, c5, issueState) {
	if (issueState == undefined)
		issueState = "all";

	row = bodyRef.insertRow();
	var cell = row.insertCell();
	cell.innerHTML = c1;

	var cell = row.insertCell();
	cell.innerHTML = c2;

	var cell = row.insertCell();
	cell.innerHTML = c3;

	var cell = row.insertCell();
	cell.innerHTML = c4;

	var cell = row.insertCell();
	cell.innerHTML = c5;
	
	// AdditonalData

	if ($("#additionaldata").val() != "") {
		var cell = row.insertCell();
		cell.innerHTML = "";
	}

	var cell = row.insertCell();
	cell.innerHTML = "<b>" + round(sums[labelItem][issueState].totalEstimate, 1) + "</b>";
	cell.style.textAlign = "right";

	var cell = row.insertCell();
	cell.innerHTML = "<b>" + round(sums[labelItem][issueState].totalRemaining, 1) + "</b>";
	cell.style.textAlign = "right";

	var cell = row.insertCell();
	cell.innerHTML = "<b>" + round(sums[labelItem][issueState].totalTasks, 1) + "</b>";
	cell.style.textAlign = "right";

	var cell = row.insertCell();
	cell.innerHTML = "<b>" + round(sums[labelItem][issueState].totalCompletedTasks, 1) + "</b>";
	cell.style.textAlign = "right";

	var cell = row.insertCell();
	cell.innerHTML = "<b>" + round(sums[labelItem][issueState].totalTentative, 1) + "</b>";
	cell.style.textAlign = "right";

	var cell = row.insertCell();
	cell.innerHTML = "<b>" + round(sums[labelItem][issueState].totalIssues, 1) + "</b>";
	cell.style.textAlign = "right";
}

function insertBlankRow(bodyRef, firstField) { 
	var row = bodyRef.insertRow();
	for (var i = 0; i < 11; i++) {
		cell = row.insertCell();
		if (i == 0 && firstField != undefined) {
			cell.innerHTML = firstField;
		}
	}
	if ($("#additionaldata").val() != "") {
		row.insertCell();
	}
}

// ----------

function saveTableToCSV() {
	var header = $("#issuesTable thead")[0].rows[0];
	var data = []; 
	var headers = [];
	for (var i=0; i<header.cells.length; i++) {
		headers[i] = header.cells[i].innerHTML.replace(/<(?:.|\n)*?>/gm, ''); 
	} 

	var tableRows = $("#issuesTable tbody")[0].rows;
	for (var i=0; i<tableRows.length; i++) { 
		var tableRow = tableRows[i]; var rowData = {}; 
		for (var j=0; j<tableRow.cells.length; j++) { 
			rowData[headers[j]] = tableRow.cells[j].innerHTML.replace(/<(?:.|\n)*?>/gm, '').replace(/&nbsp;/gm, ' '); 
		} 
		data.push(rowData); 
	} 
	
	config = {
			quotes: false,
			quoteChar: '"',
			delimiter: $("#csvdelimiter").val(),
			header: true,
			newline: "\r\n"
		};
	
	result = Papa.unparse(data, config);
	var repoName = String($("#repolist").val()).split(",").join("-");
	var fileName = $("#owner").val() + "-" + repoName + "-burndown.csv"; 
	yoda.downloadFile(result, fileName);
}

//---------------------------------------

// SORT ISSUES SMARTLY, taking into account possible "ObiWan" parent
// Go by current order. For each issue x
// Determine of there are children (anywhere in the list, could be earlier) of the current issue. If so, move them as x+1, x+2, ....
// Two problems: 1) This will not sort in one iteration if multiple levels (e.g. Epic->Enhancement->SubTask), 2) could loop potentially
// Ref 1), we can run 2-3 iterations, no bigs deal. For looping, need some form of gap-stop


function issueCompare(a, b) {
	if (a.repository_url == b.repository_url) {
		return (a.number - b.number); 
	}
	if (a.repository_url > b.repository_url) {
		return 1;
	} else {
		return -1;
	}
}

// Main helper function. Is issue1 a parent of issue2?
function isParentOf(issue1, issue2) {
	var owner1 = yoda.getUrlOwner(issue1.url); 
	var repo1 = yoda.getUrlRepo(issue1.url);
	var owner2 = yoda.getUrlOwner(issue2.url); 
	var repo2 = yoda.getUrlRepo(issue2.url);
	var number1 = yoda.getUrlNumber(issue1.url);
	var number2 = yoda.getUrlNumber(issue2.url);
	
	var refOption1 = "> partof " + owner1 + "/" + repo1 + "#" + number1 +" ";
	var refOption2 = "> partof #" + number1 + " ";
	
	if ((issue2.body != undefined && issue2.body != null) && ((issue2.body.indexOf(refOption1) != -1) ||
		((owner1 == owner2) && (repo1 == repo2) && issue2.body.indexOf(refOption2) != -1))) {
//		console.log(issue1.url + " is a parent of " + issue2.url);
		return true;
	} 
	
	return false;
}

// Iteration to sort
function sortParent(issues) {
	// First let's identify children.
	for (var i = 0; i < issues.length; i++) {
		for (var j = 0; j < issues.length; j++) {
			if ((i != j) && isParentOf(issues[i], issues[j])) {
				if (issues[i].children == undefined)
					issues[i].children = [];
				issues[i].children.push(issues[j].url)
				issues[j].parent = issues[i].url;
			}
		}
	}

	// Push child issues until the end
	for (var i = issues.length - 1; i >= 0; i--) {
		if (issues[i].parent != undefined) {
//			console.log("moving " + issues[i].url + " to the end");
			issues.splice(issues.length, 0, issues.splice(i, 1)[0]);
		} 
	}
	
	for (var i = 0; i < issues.length; i++) {
		if (issues[i].children == undefined && issues[i].parent == undefined) {
			// Neither a parent nor a child
			console.log("Issue " + issues[i].url + " is neither a child nor a parent - all good.");
			continue;
		}

		if (issues[i].children != undefined) {
			console.log("Issue " + issues[i].url + " is a parent");
			for (var k = issues[i].children.length - 1; k >= 0; k--) {
				// Where in the list is the issue?
				var j = issues.findIndex(function(element) {
					return (element.url == issues[i].children[k]);
				});
				if (j == -1) {
					console.log("Cannot find child " + childList[k]);
					continue;
				}
				if (j < i) {
					console.log("Child index " + j + " too low. ignoring. issue is: " + issues[j].url);
					continue;
				}

				console.log("  Issue " + issues[j].url + " is a child inserted here. j = " + j);
				if (issues[i].indent != undefined)
					issues[j].indent = issues[i].indent  + "&nbsp;&nbsp;&nbsp;&nbsp;";
				else
					issues[j].indent = "&nbsp;&nbsp;&nbsp;&nbsp;";
				issues.splice((i + 1), 0, issues.splice(j, 1)[0]);
			}
		}
	}
}

function sortTable(issues) {
	// First sort by repository, number
	// Sort by repository, number
	issues.sort(issueCompare);
	
	sortParent(issues);
}

function makeTable(issues) {
	if ($('#showclosed').is(":checked")) {
		var showClosed = true;
	} else {
		var showClosed = false;
	}

	clearAreas();
	
	// Filter out pull requests
	yoda.filterPullRequests(issues);
	
	sortTable(issues);
	
	var tentativeLabel = $("#tentative").val();
	var inprogressLabel = $("#inprogress").val();
	var notcodefreezeLabel = $("#notcodefreeze").val();

	var labelSplit = $("#labelsplit").val();
	console.log("Label split: " + labelSplit);
	
	var additionalData = $("#additionaldata").val();
	console.log("Additonal data: " + additionalData);
	var additionalReg = "";
	var additionalHL = "";
	if (additionalData != "") {
		var additionalSplit = additionalData.split(",");
		if (additionalSplit.length == 2) {
			additionalHL = additionalSplit[0];
			additionalReg = new RegExp(additionalSplit[1]);
			console.log("AdditonalReg: " + additionalReg);
		}
	}

	// Start setting up sums array
	var sums = [];
	prepareSums(sums, "Grand Total");
	prepareSums(sums, "");
	
	// Label magic (splitting based on label split filter, if specified)
	// Let's build a map of labels
	// Let's see if this look like a regular expression, or if it is simply a list of labels with , between.
	var labels = [];
	if (labelSplit.split(",").length > 1) {
		var ls = labelSplit.split(",");
		for (l = 0; l < ls.length; l++) {
			labels.push(ls[l].trim());
		}
	} else {
		if (labelSplit != "") {
			var splitReg = new RegExp(labelSplit);
			if (labelSplit != "") {
				for (i=0; i<issues.length; i++) {
					for (var l=0; l<issues[i].labels.length; l++) {
						var labelName = issues[i].labels[l].name;
						var res = labelName.match(splitReg);
						if (res != null) {
							if (labels.indexOf(labelName) == -1) {
								console.log("Found label: " + labelName);
								labels.push(labelName);
							}
						}
					}
				}
			}
			labels = labels.sort();
			console.log("Number of distinct labels: " + labels.length);
		}
	}
	// Note, let's push a special phantom label for unknown type.
	labels.push("Unknown Type");
	console.log("Labels: " + labels);
	for (var l = 0; l < labels.length; l++) {
		prepareSums(sums, labels[l]);
	}


	// Find table
	var table = document.getElementById("issuesTable");
	var header = table.createTHead();
	var headerRow = header.insertRow();     

	var cell = headerRow.insertCell();
	cell.innerHTML = "<u><b onclick=\"saveTableToCSV()\">Issue Id</b></u>" + " (" + issues.length + ")";

	var cell = headerRow.insertCell();
	cell.innerHTML = "<b>Assignee</b>";

	var cell = headerRow.insertCell();
	cell.innerHTML = "<b>Tentative?</b>";

	var cell = headerRow.insertCell();
	cell.innerHTML = "<b>Type</b>";

	if (additionalHL != "") {
		var cell = headerRow.insertCell();
		cell.innerHTML = "<b>" + additionalHL + "</b>";
	}

	var cell = headerRow.insertCell();
	cell.innerHTML = "<b>Issue Title</b>";

	var cell = headerRow.insertCell();
	cell.innerHTML = "<b>Estimate</b>";

	var cell = headerRow.insertCell();
	cell.innerHTML = "<b>Remaining</b>";
	
	var cell = headerRow.insertCell();
	cell.innerHTML = "<b># Tasks</b>";
	
	var cell = headerRow.insertCell();
	cell.innerHTML = "<b># Tasks done</b>";
	
	var cell = headerRow.insertCell();
	cell.innerHTML = "<b>Tentative</b>";

	var cell = headerRow.insertCell();
	cell.innerHTML = "<b>State</b>";
	
	table.appendChild(document.createElement('tbody'));
	var bodyRef = document.getElementById('issuesTable').getElementsByTagName('tbody')[0];
	
	var assigneeSet = new Set();
	for (var i = 0; i < issues.length; i++) {
		if (showClosed == false && issues[i].state == 'closed')
			continue;
		
//		console.log(issues[i]);
		
		var row = bodyRef.insertRow();
		
		cell = row.insertCell();
		// Link
		var repository = issues[i].repository_url.split("/").splice(-1); // Repo name is last element in the url
		cell.innerHTML = "<a href=\"" + issues[i].html_url + "\" target=\"_blank\">" + repository + "/" + issues[i].number + "</a>";
		
		var assigneeList = [];
		var assigneeString = "";
		cell = row.insertCell();
		if (issues[i].assignees.length > 0) {
			for (var as = 0; as < issues[i].assignees.length; as++) {
				var assignee = issues[i].assignees[as].login;
				prepareSums(sums, assignee);
				assigneeSet.add(assignee);
				assigneeList.push(assignee);
				if (assigneeString != "") 
					assigneeString += ",<br>";
				assigneeString += assignee;
			}
		} else {
			var assignee = "unassigned";
			assigneeString = assignee;
			prepareSums(sums, assignee);
			assigneeSet.add(assignee);
			assigneeList.push(assignee);
		}
		cell.innerHTML = assigneeString;
		console.log("Assignee: " + assignee);
		
		cell = row.insertCell();
		if (yoda.isLabelInIssue(issues[i], tentativeLabel)) {
			cell.innerHTML = "Yes";
		} else {
			cell.innerHTML = "";
		}

		cell = row.insertCell();
		var labelItem = "";
		// Loop through labels to find match
		for (var l = 0; l < labels.length; l++) {
			if (yoda.isLabelInIssue(issues[i], labels[l])) {
				labelItem = labels[l];
			}
		}
		cell.innerHTML = labelItem;
		if (labelItem == "")
			labelItem = "Unknown Type";
		
		// AdditionalData
		if (additionalHL != "") {
			var addData = "";
			for (var l=0; l<issues[i].labels.length; l++) {
				var labelName = issues[i].labels[l].name;
				if (labelName.match(additionalReg) != null) {
					if (addData != "")
						addData = addData + ",<br>";
					addData = addData + labelName;
				}
			}

			cell = row.insertCell();
			cell.innerHTML = addData;
		}
		
		cell = row.insertCell();
		if (issues[i].indent != undefined)
			cell.innerHTML = issues[i].indent + issues[i].title;
		else
			cell.innerHTML = issues[i].title;

		// # of issues
		incrementCount(sums, "Grand Total", labelItem, assigneeList, "totalIssues", 1, issues[i]);
		
		// Estimate
		cell = row.insertCell();
		cell.style.textAlign = "right";
		if (yoda.isLabelInIssue(issues[i], tentativeLabel)) {
			console.log("  Estimate for isue " + issues[i].number + " = 0 (tentative)");
			cell.innerHTML = "0";
		} else {
			var est = yoda.issueEstimate(issues[i]);
			console.log("  Estimate for isue " + issues[i].number + " = " + est);
			cell.innerHTML = est;
			incrementCount(sums, "Grand Total", labelItem, assigneeList, "totalEstimate", est, issues[i]);
		}
		
		// Remaining
		cell = row.insertCell();
		cell.style.textAlign = "right";
		if (issues[i].closed_at != null || (yoda.isLabelInIssue(issues[i], tentativeLabel))) {
			console.log("  Remaining for isue " + issues[i].number + " = 0");
			cell.innerHTML = "0";
		} else {
			var remaining = yoda.issueRemainingMeta(issues[i], yoda.issueEstimate(issues[i]), issues[i]);
			console.log("  Remaining for isue " + issues[i].number + " = " + remaining);
			cell.innerHTML = remaining;
			incrementCount(sums, "Grand Total", labelItem, assigneeList, "totalRemaining", remaining, issues[i]);
		}
		
		// # tasks
		cell = row.insertCell();
		cell.style.textAlign = "right";
		var noTasks = yoda.getbodyTasks(issues[i].body);
		incrementCount(sums, "Grand Total", labelItem, assigneeList, "totalTasks", noTasks, issues[i]);
		cell.innerHTML = noTasks;
		
		// # tasks completed
		cell = row.insertCell();
		cell.style.textAlign = "right";
		var noCompletedTasks = yoda.getbodyCompletedTasks(issues[i].body);
		incrementCount(sums, "Grand Total", labelItem, assigneeList, "totalCompletedTasks", noCompletedTasks, issues[i]);
		cell.innerHTML = noCompletedTasks;
		
		// Tentative
		cell = row.insertCell();
		cell.style.textAlign = "right";
		if (yoda.isLabelInIssue(issues[i], tentativeLabel)) {
			var remaining = yoda.issueRemaining(issues[i], yoda.issueEstimate(issues[i]));
			cell.innerHTML = remaining;
			incrementCount(sums, "Grand Total", labelItem, assigneeList, "totalTentative", remaining, issues[i]);
			console.log("For tentative issue: " + issues[i].number + " added remaining: " + remaining);
		} else {
			cell.innerHTML = "0";
		}
		
		cell = row.insertCell();
		if (issues[i].closed_at != null) {
			cell.innerHTML = "closed";
		} else {
			if (yoda.isLabelInIssue(issues[i], inprogressLabel)) {
				if (yoda.isLabelInIssue(issues[i], notcodefreezeLabel)) 
					cell.innerHTML = "<b><i>open</i></b>";
				else
					cell.innerHTML = "<b>open</b>";
			} else {
				if (yoda.isLabelInIssue(issues[i], notcodefreezeLabel)) 
					cell.innerHTML = "<i>open</i>";
				else
					cell.innerHTML = "open";
			}
		}
	}
	
	insertTotalsRow(bodyRef, sums, "Grand Total", "<b>Grand Total</b>", "", "", "", "");
	insertTotalsRow(bodyRef, sums, "Grand Total", "<i>Subtotal</i>", "open", "", "", "", "open");
	insertTotalsRow(bodyRef, sums, "Grand Total", "<i>Subtotal</i>", "closed", "", "", "", "closed");
	insertTotalsRow(bodyRef, sums, "Grand Total", "<i>Subtotal</i>", "In progress", "", "", "", "inprogress");

	// Spkit by labels 
	if (labels.length > 0) {
		insertBlankRow(bodyRef);
		insertBlankRow(bodyRef, "<b>Label subtotals</b>");
	}
	for (var l = 0; l < labels.length; l++) {
		insertTotalsRow(bodyRef, sums, labels[l], "<i>Subtotal</i>", "", "", labels[l], "");
		
		insertTotalsRow(bodyRef, sums, labels[l], "<i>Subtotal</i>", "open", "", "", "", "open");
		insertTotalsRow(bodyRef, sums, labels[l], "<i>Subtotal</i>", "closed", "", "", "", "closed");
		insertTotalsRow(bodyRef, sums, labels[l], "<i>Subtotal</i>", "In progress", "", "", "", "inprogress");
		insertBlankRow(bodyRef);
	}
	
	insertBlankRow(bodyRef, "<b>Assignee subtotals</b>");
	assigneeSet.forEach(function(assignee) {
		if (assignee != "unassigned") {
			var assigneeLink = '<a href="' + yoda.getGithubUrlHtml() + 'issues?q= is:issue assignee:' + assignee + ' milestone:&quot;' + $("#milestonelist").val() +'&quot;" target="_blank">' + assignee + '</a>';
			insertTotalsRow(bodyRef, sums, assignee, "<i>Subtotal</i>", assigneeLink, "", "", "");
		} else {
			insertTotalsRow(bodyRef, sums, assignee, "<i>Subtotal</i>", assignee, "", "", "");
		}
	});
	
	yoda.updateUrl(getUrlParams() + "&draw=table");
}

// Align person
function AP(issue, est) {
	if ($("#assignee").val() == "")
		return est;
	return est / issue.assignees.length;
}

// ---------------------------------------
// Milestone issues have been retrieved. Time to analyse data and draw the chart.
function burndown(issues) {
	clearAreas();
	
	console.log("Creating burndown. No of issues retrieved: " + issues.length);
	yoda.filterPullRequests(issues);
	console.log("Creating burndown. No issues (after filtering out pull requests): " + issues.length);
	
	var tentativeLabel = $("#tentative").val();
	var notcodefreezeLabel = $("#notcodefreeze").val();

	// Filtering by person - then let's clear capacity
	if ($("#assignee").val() != "")
		$("#capacity").val("");
	


	// 3 arrays we will create. 
	// Labels (x axis - days)
	var labels = [];
	// Remaining array are values for the bar chart.
	var remainingArray = [];
	var remainingNoFreezeArray = [];
	var remainingTentativeArray = [];
	
	// Data for the ideal line. This will actually only hold initial and final value, rest will be NaN.
	// Tool will draw a straight line between these two points.
	var remainingIdealArray = [];
	var remainingIdealFullArray = [];
	var remainingTrendArray = [];

	// sort issues by closed_date
	issues.sort(yoda.SortDates);
	
	// Will hold total estimate (sum of > estimate, or # of issues)
	var estimate = 0;
	var estimateNoFreeze = 0;
	var estimateTentative = 0;
	
	// Work on dates
	var milestoneStartdateString = $("#milestone_start").val();
	console.log("Milestone start date: " + milestoneStartdateString);
	var milestoneStartdate = new Date(milestoneStartdateString);
	
	var milestoneDuedateString = $("#milestone_due").val();
	console.log("Milestone due date: " + milestoneDuedateString);

	// Start starts at milestone start
	var date = new Date(milestoneStartdateString);

	var dueDate = new Date(milestoneDuedateString);
	console.log("initial dueDate = " + dueDate);
	// Add one to dueDate to ensure that we show entire sprint effort (as burndown is only shown the day after)
	dueDate.setDate(dueDate.getDate() + 1);
	console.log("adjusted dueDate = " + dueDate);
	
	var nextDay = new Date(date);
	var today = new Date();
	var todayString = yoda.formatDate(today);

	var tomorrow = new Date(today);
	tomorrow.setDate(tomorrow.getDate() + 1);
	var tomorrowString = yoda.formatDate(tomorrow);

	// First calculate the sum of (either # of sum of estimates) of all issues associated with the
	// milestone
	for (i = 0; i < issues.length; i++) {
		// If assignee filter given, then continue if person not assigned here.
		if ($("#assignee").val() != "" && !yoda.isPersonAssigned(issues[i], $("#assignee").val()))
			continue;
		
		var closedAt = new Date(issues[i].closed_at);
		if (issues[i].state == "closed" && closedAt < milestoneStartdate) {
			// Issue was already been closed BEFORE the milestone start date.
			// Issue (estimate or count) will NOT be included.
			// NOTE: This can be debated. Issue is after all in the milestone...
		}  else {
			var issueEstimateValue = AP(issues[i], yoda.issueEstimateBeforeDate(issues[i], yoda.formatDate(milestoneStartdate)));    

			if (yoda.isLabelInIssue(issues[i], tentativeLabel)) {
				console.log(" => adding TENTATIVE : " + issues[i].number + ", estimate: " + issueEstimateValue);
				estimateTentative = estimateTentative + issueEstimateValue;
			} else {
				if (yoda.isLabelInIssue(issues[i], notcodefreezeLabel)) {
					console.log(" => adding NOFREEZE: " + issues[i].number + ", estimate: " + issueEstimateValue);
					estimateNoFreeze = estimateNoFreeze + issueEstimateValue;
				} else {
					console.log(" => adding: " + issues[i].number + ", estimate: " + issueEstimateValue);
					estimate = estimate + issueEstimateValue;
				}
			}
		}
	}
	console.log("Total estimate: " + estimate + ", Total nofreeze: " + estimateNoFreeze + ", Total tentative: " + estimateTentative);
	
	
	// Start remaining at estimate, then decrease as issues are closed.
	var remaining = estimate;
	var remainingNoFreeze = estimateNoFreeze;
	var remainingTentative = estimateTentative;
	
	var burndownDateIndex = -1;

	// Now, run from milestone_startdate to milestone_duedate one day at a time...
	// HACK1: We are running on purpose one day extra, in order to show the effects of burndown on the last day.
	// HACK2: In the end we will push the labels one day to the right, thus causing burndown to take effort ON the day (before it was after).
	console.log(milestoneStartdate);
	for (; date <= dueDate; date.setDate(date.getDate() + 1)) {
		console.log("Date: " + date);
		nextDay.setDate(date.getDate() + 1);

		var dateString = yoda.formatDate(date);
		
		// Burndown due date? If so, set index.
		// console.log("dateString: " + dateString + ", burndown_due: " + $("#burndown_due").val());
		if (dateString == $("#burndown_due").val())
			burndownDateIndex = labels.length; 

		labels.push(dateString);
		remainingIdealArray.push(NaN);
		remainingIdealFullArray.push(NaN);
		remainingTrendArray.push(NaN);

		// Make bar for day, but not if later than current date!
		// BUT, we must have at least one entry if looking at a future sprint!
		if (date <= tomorrow || remainingArray.length == 0) {
			console.log("Adding bar value for: " + dateString + ", value: " + remaining);
			remainingArray.push(yoda.strip2Digits(remaining));
			remainingNoFreezeArray.push(yoda.strip2Digits(remainingNoFreeze));
			remainingTentativeArray.push(yoda.strip2Digits(remainingTentative));
		} else {
			console.log("Skipping bar as in future: " + dateString);
			remainingArray.push(NaN);
			remainingNoFreezeArray.push(NaN);
			remainingTentativeArray.push(NaN);
		}

		// Now check which (if any) issues where closed during this day. Decrease remaining.
		for (i=0; i<issues.length; i++) {
			// If assignee filter given, then continue if person not assigned here.
			if ($("#assignee").val() != "" && !yoda.isPersonAssigned(issues[i], $("#assignee").val()))
				continue;

			if (issues[i].closed_at != null) {
				var closedAt = new Date(issues[i].closed_at);
				closedAt.setHours(12); // avoid problems if closed near midnight
				if (date < closedAt && closedAt < nextDay) {
					
					if (yoda.isLabelInIssue(issues[i], tentativeLabel)) {
						console.log("Tentative Issue " + issues[i].number + " was closed: " + closedAt);
						remainingTentative -= AP(issues[i], yoda.issueEstimateBeforeDate(issues[i], yoda.formatDate(milestoneStartdate))); 
					} else {
						if (yoda.isLabelInIssue(issues[i], notcodefreezeLabel)) {
							console.log("Issue " + issues[i].number + " was closed: " + closedAt);
							remainingNoFreeze -= AP(issues[i], yoda.issueEstimateBeforeDate(issues[i], yoda.formatDate(milestoneStartdate))); 
						} else {
							console.log("Issue " + issues[i].number + " was closed: " + closedAt);
							remaining -= AP(issues[i], yoda.issueEstimateBeforeDate(issues[i], yoda.formatDate(milestoneStartdate))); 
						}
					}
				}
			}
		}
	}
	
	// Now for the - really - complex bit, namely handling of "> remaining (date) (number)" syntax
	if (yoda.getEstimateInIssues() == "inbody") {
		for (i = 0; i < issues.length; i++) {
			// If assignee filter given, then continue if person not assigned here.
			if ($("#assignee").val() != "" && !yoda.isPersonAssigned(issues[i], $("#assignee").val()))
				continue;

			// console.log("Looking at issue index " + i + ": " + issues[i].url);
			// First, let's get the estimate at start
			var issueEstimate = AP(issues[i], yoda.issueEstimateBeforeDate(issues[i], yoda.formatDate(milestoneStartdate)));
			if (issueEstimate != null) {
				var issueWorkDoneBefore = 0;
				var lastRemainingNumber = 9999;
				for (var index = 0; yoda.getFirstRemaining(issues[i].body, index) != null; index++) {
					var remainingEntry = yoda.getFirstRemaining(issues[i].body, index); 
					var remainingDate = yoda.getDateFromEntry(remainingEntry);
					var remainingNumber = AP(issues[i], yoda.getRemainingFromEntry(remainingEntry));
					
					if (remainingNumber > lastRemainingNumber)
						console.log("  NOTE: Below remainingNumber represents in increase vs last.");
					if (remainingNumber > issueEstimate)
						console.log("  NOTE: Below remaining is higher than estimate.");
					lastRemainingNumber = remainingNumber;
				//	console.log("  Remaining entry (" + index + "): " + remainingDate + ", " + remainingNumber);

					var closedAtString = null;
					if (issues[i].closed_at != null)
						closedAtString = yoda.formatDate(new Date(issues[i].closed_at));
					
					// Is the remaining entry for the date where the issue was closed? This is unnecessary and could even be bad.
					if ( remainingDate >= closedAtString ) {
						console.log("  NOTE: Remaining entry on or after at close date (" + closedAtString + "). Ignoring");
						continue;
					}
					
					// We also need to know if the issue has been closed. If so, we should only adjust up to the point of
					// closure. The graph already has the effect of the closure (going to 0).
					for (var d = 0; d < labels.length; d++) {
						if (remainingDate == labels[d]) {
						//	console.log("  Starting reduction from date: " + labels[d] + ", remaining: " + remainingArray[d]);
							// Loop for future estimates, but only until either closed date (if issue was closed OR current date).
							for (var e = d + 1; e < labels.length; e++) {
								if (closedAtString != null && labels[e] > closedAtString) 
									continue;
								
								if (labels[e] > tomorrowString)
									continue;
								
								var delta = (issueEstimate - remainingNumber - issueWorkDoneBefore);
							//	console.log("    For date: " + labels[e] + ", remaining: " + remainingArray[e] + ", delta: " + delta);
								
								if (yoda.isLabelInIssue(issues[i], tentativeLabel)) {
									remainingTentativeArray[e] -= delta;
									remainingTentativeArray[e] = yoda.strip2Digits(remainingTentativeArray[e]);
								} else {
									if (yoda.isLabelInIssue(issues[i], notcodefreezeLabel)) {
										remainingNoFreezeArray[e] -= delta;                                                
										remainingNoFreezeArray[e] = yoda.strip2Digits(remainingNoFreezeArray[e]);
									} else {
										remainingArray[e] -= delta;                                                
										remainingArray[e] = yoda.strip2Digits(remainingArray[e]);
									}
								}
							}
							issueWorkDoneBefore = issueEstimate - remainingNumber;
						}
					}
				}
			}
		}
	}

	// HACK3: Let's hack the labels. We will remove the last one and insert an empty label to start.
	labels.splice(-1);
	labels.unshift("Estimate");

	// remainingIdealArray & remainingIdealFullArray needs values.
	// remainingIdealArray will always start at estimate
	
	// The start point for the ideal line will either
	// start at the total estimate OR overridden by the capacity field (which in turn may have 
	// been retrieved from the milestone description field).
	
	console.log("estimateNoFreeze = " + estimateNoFreeze + ", estimate = " + estimate);

	remainingIdealArray[0] = estimate;
	remainingIdealFullArray[0] = estimateNoFreeze + estimate;	
	
	if ($("#capacity").val() != "") {
//		remainingIdealArray[0] = parseInt($("#capacity").val());
		remainingIdealFullArray[0] = parseInt($("#capacity").val());
	}
	

	remainingIdealFullArray[remainingIdealArray.length - 1] = 0;
	if (burndownDateIndex != -1) {
		if (burndownDateIndex + 1 < remainingIdealArray.length)
			remainingIdealArray[burndownDateIndex + 1] = 0;
		else 
			remainingIdealArray[burndownDateIndex] = 0;
	} else {
		// Burndown to second to last day
		remainingIdealArray[remainingIdealArray.length - 1] = 0;
	}
	console.log("RemainingIdealArray = ");
	console.log(remainingIdealArray);
	console.log("RemainingIdealFullArray = ");
	console.log(remainingIdealFullArray);

//	console.log("Length of remainingArray: " + remainingArray.length);
	
	// -----------------------------------------------------------
	// READY - Draw the chart
	var chartData = {
			labels : labels,
			datasets : [ {
				type : 'bar',
				label : 'Burndown',
				fill : false,
				data : remainingArray,
				backgroundColor : 'rgba(0,153,51,0.6)',  // Green
				barPercentage: 1,
				borderWidth : 2,
				categoryPercentage: 1,
				yAxisID: "yleft",
				order: 1
			},
			{
				type : 'line',
				label : 'Ideal',
				fill : false,
				data : remainingIdealArray,
				borderColor: '#004d1a',
				pointRadius: 0,
				spanGaps: true,
				yAxisID: "yline",
				borderColor: yoda.getColor("lineBackground")
			}]
	};
	
	// 
	// If there was nofreeze data, need to add extra data series
//	if (estimateNoFreeze > 0) {
		chartData.datasets.push({
			type : 'bar',
			label : 'NotCodeFreeze',
			fill : false,
			borderWidth : 2,
			data : remainingNoFreezeArray,
			backgroundColor : 'rgb(0, 100, 38, 0.6)',  // some color - TODO
			barPercentage: 1,
			categoryPercentage: 1,
			order: 1
		});
		
		chartData.datasets.push({
			type : 'line',
			label : 'Ideal Full Sprint',
			fill : false,
			data : remainingIdealFullArray,
			// borderColor: '#004d1a',
			pointRadius: 0,
			spanGaps: true,
			yAxisID: "yline",
			borderColor: yoda.getColor("lineBackground")
		});
//	}
	
	// If there were tentative data, need to add extra data series
	if (estimateTentative > 0) {
		chartData.datasets.push({
			type : 'bar',
			label : 'Tentative',
			fill : false,
			data : remainingTentativeArray,
			borderWidth : 2,
			backgroundColor : 'rgb(255, 255, 51)',  // Yellow
			barPercentage: 1,
			categoryPercentage: 1,
			order: 1
		});
	}

	// Let's add an trendline for burndown using remaining estimates (not considering burndownData / notforcodefreeze), so simply remainingArray
	if ($('#trendline').is(":checked")) {
		console.log("Calculating trendline. remainingArray (length " + remainingArray.length + ") = " + remainingArray);
		remainingTrendArray[0] = remainingArray[0];
		console.log("Starting at " + remainingTrendArray[0]);
		
	    // To start, let's just play within the available length of the remainingArray. We may have to extend it (if the line runs longer). 
		// Let's accept to couble the duration
		for (tryIndex = 0; tryIndex < remainingArray.length && !isNaN(remainingArray[tryIndex + 1]) && remainingArray[tryIndex + 1] != 0; tryIndex++);
		if (tryIndex > 0) {
			var slope = (remainingArray[0] - remainingArray[tryIndex]) / tryIndex;
			console.log("tryIndex: " + tryIndex + ", remainingArray[tryIndex]:" + remainingArray[tryIndex] + ", slope:" + slope);
			remainingTrendArray[tryIndex] = remainingArray[tryIndex];
			for (; tryIndex < remainingIdealFullArray.length - 1; tryIndex++) {
				if (remainingTrendArray[tryIndex] - slope < 0)
					break;
				remainingTrendArray[tryIndex + 1] = remainingTrendArray[tryIndex] - slope;
			}
	
			// Add the trendLine end date (the tryIndex) to trendline legend, if later than duedate
			var trendLabel = "TrendLine";
			
			console.log(remainingTrendArray);
			
			chartData.datasets.push({
				type : 'line',
				label : trendLabel,
				borderColor: '#414d8a',
				borderDash: [15, 5],
				fill : false,
				data : remainingTrendArray,
				pointRadius: 0,
				spanGaps: true,
				yAxisID: "yline"
			});
		}
	}

	// Axis legend depend on whether working from estimates in issues, or simply number of issues.
	var axis = "";
	if (yoda.getEstimateInIssues() == "noissues") {
		axis = "# of issues";
	} else {
		axis = "Story points";
	}
	
	// Chart title
	if ($("#title").val() != "")
		var titleText = $("#title").val();
	else {
		var titleText = "Burndown chart for ";
		if ($("#milestonelist").val() != "") 
			titleText +=  $("#owner").val() + "/" + $("#repolist").val() + " for milestone " + $("#milestonelist").val();
	}
	
	// Find yMaxValue
	var yMaxValue = -1;
	if ($("#capacity").val() != "") {
		yMaxValue = parseInt($("#capacity").val());
	}
	yMaxValue = Math.max(yMaxValue, (estimateNoFreeze + estimate + estimateTentative));

	var ctx = document.getElementById("canvas").getContext("2d");
	window.myMixedChart = new Chart(ctx, {
		type : 'bar',	
		data : chartData,
		options : {
			responsive : true,
			plugins: {
				title : {
					display : true,
					text : titleText,
					font: {
		           		size: 20                    
					}
				},
			},
			tooltips : {
				mode : 'index',
				intersect : true
			},
			scales: {
				yleft: {
					title: {
						display: true,
						text: axis,
						font: {
			           		size: 16                    
						}
					},
					stacked: true,
					beginAtZero: true,
					min: 0,
					max: yMaxValue,
					position: "left",
					grid: {
						color: yoda.getColor('gridColor')
					}
				},
				yline: {
					stacked: false,
					beginAtZero: true,
					min: 0,
					max: yMaxValue,
					position: "left",
					display: false
				},
				x: {
					stacked: true,
					grid: {
						color: yoda.getColor('gridColor')
					}
				}
			},
			tooltips: {
				enabled: false
			},
		},
	});
	
	yoda.updateUrl(getUrlParams() + "&draw=chart");
}

// ------------------


function clearAreas() {
	clearTable();
	// Destroy old graph, if any
	if (window.myMixedChart != null)
		window.myMixedChart.destroy();
}

function clearFields() {
	$("#milestonelist").empty();
	$("#milestone_start").val("");
	$("#milestone_due").val("");
	$("#capacity").val("");
	clearAreas();
}

// ------------------

function storeMilestones(milestones, repoIndex) {
	repoMilestones[repoIndex] = milestones;
	updateMilestones(repoIndex + 1);
}

var firstMilestoneShow = true;
function updateMilestones(repoIndex) {
	if (repoIndex == undefined) {
		// Clear milestone data
		repoIndex = 0;
		repoMilestones = []; 
		commonMilestones = [];
		
	}
	
	if (repoIndex < repoList.length) {
		if ($('#closedmilestones').is(":checked")) {
			var getMilestonesUrl = yoda.getGithubUrl() + "repos/" + $("#owner").val() + "/" + repoList[repoIndex] + "/milestones?state=all";
		} else {
			var getMilestonesUrl = yoda.getGithubUrl() + "repos/" + $("#owner").val() + "/" + repoList[repoIndex] + "/milestones?state=open";
		}

		console.log("Milestone get URL: " + getMilestonesUrl);
		
		yoda.getLoop(getMilestonesUrl, 1, [], function(data) {storeMilestones(data, repoIndex);}, null);
	} else {
		console.log("Read all milestones:");
		console.log(repoMilestones);
		
		// Done getting milestones for all selected repos
		// Next, find common milestones and update milestones selector.
		$("#milestonelist").empty();
		commonMilestones = [];
		
		for (var r = 0; r < repoList.length; r++) {
			for (var m = 0; m < repoMilestones[r].length; m++) {
				var repoTitle = repoMilestones[r][m].title;
				
//				if (commonMilestones.indexOf(repoTitle) == -1) {
				if (!commonMilestones.find(function(element) {return (element.title == repoTitle);})) {
					commonMilestones.push({title: repoTitle, duedate: yoda.formatDate(new Date(repoMilestones[r][m].due_on)), startdate: yoda.getMilestoneStartdate(repoMilestones[r][m].description)});
				}
			}
		}
		
		// Sort and add. If URL argument has specified the milestone, select it.
		commonMilestones.sort(function(a,b) {return (a.title < b.title);});
		console.log("The common milestones are: ");
		console.log(commonMilestones);
		var milestonesSelected = false;
		
		var urlMilestone = yoda.decodeUrlParam(null, "milestone");
		console.log("URL milestone: " + urlMilestone);
		for (var c = 0; c < commonMilestones.length; c++) {
			var selectMilestone = false;
			if (firstMilestoneShow && commonMilestones[c].title == urlMilestone) { 
				console.log("Selecting milestone as: " + commonMilestones[c].title);
				selectMilestone = true;
				milestonesSelected = true;
			}

			// Handle _CURRENT_ milestone 
			var today = yoda.formatDate(new Date());
			if (firstMilestoneShow && urlMilestone != null && urlMilestone.startsWith("_CURRENT_") && today >= commonMilestones[c].startdate && today <= commonMilestones[c].duedate) {
				// Check if we have more string matching to do
				var matchMilestone = urlMilestone.substr("_CURRENT_".length);
				console.log("Matching _CURRENT_ milestone with milestone beginning with: " + matchMilestone);
				if (commonMilestones[c].title.startsWith(matchMilestone)) {
					console.log("Selecting _CURRENT_ milestone as: " + commonMilestones[c].title);
					selectMilestone = true;
					milestonesSelected = true;
				}
			}

			var newOption = new Option(commonMilestones[c].title, commonMilestones[c].title, selectMilestone, selectMilestone);
			$('#milestonelist').append(newOption);
		}
		
		if (milestonesSelected)
			$('#milestonelist').trigger('change');
		
		firstMilestoneShow = false;
	}
}

// ------------

// Helper function to build the list of all milestones to query.
function addMilestoneFilter(repo) {
	// Need to find the milestone # for that repo
	console.log("Searching milestone definition for " + repo);

	for (var r = 0; r < repoList.length; r++) {
		if (repoList[r] != repo)
			continue;
		
		// Need to find the milestone (the number)..
		for (var m = 0; m < repoMilestones[r].length; m++) {
			console.log("Checking " + $("#milestonelist").val() + " against " + repoMilestones[r][m].title);
			if (repoMilestones[r][m].title == $("#milestonelist").val()) {
				var filter = "&milestone=" + repoMilestones[r][m].number;
				console.log("Adding to filter for repo: " + repo + ":" + filter);
				return filter;
			}
		}
	}
	// We did not find the milestone for this repo. It may not exist. In this case, we'll set an "impossible filter"
	return "&milestone=none&labels=im_pos_sible";
}

// ---------------

var firstMilestoneShowData = true;
function showMilestoneData() {
	console.log("Updating milestone data.");
	
	var selected = $("#milestonelist").val();
	// First we have to find it all matching milestones within the list and add the capacity
	// Concering the dates,
	
	var totalCapacity = 0;
	
	// This is a bit tricky. We will look across all selected repos and consider matching milestones.
	// We will pick up any capacity value and add to a total. We will assume that dates are set 
	// equally, so will just pick up what is there.... Warnings could be another option... 
	for (var r = 0; r < repoList.length; r++) {
		for (var m = 0; m < repoMilestones[r].length; m++) {
			var title = repoMilestones[r][m].title;
			
			if (selected == title) {
				var milestone = repoMilestones[r][m];

				var milestoneDueOn = yoda.formatDate(new Date(milestone.due_on));
				console.log("  Milestone due: " + milestoneDueOn);
				$("#milestone_due").val(milestoneDueOn);
				var milestoneStartdate = yoda.getMilestoneStartdate(milestone.description);
				if (milestoneStartdate == null) {
					$("#milestone_start").val("2017-xx-xx");
					console.log("  Unable to read milestone startdate.");
				}  else {
					$("#milestone_start").val(milestoneStartdate);
					console.log("  Milestone start: " + milestoneStartdate);
				}
				// Override due date?
				var overrideDue = yoda.getMilestoneBurndownDuedate(milestone.description);
				if (overrideDue != null) {
					$("#burndown_due").val(overrideDue);
				} else {
					$("#burndown_due").val("");
				}

				var subteamCapacity = yoda.getAllBodyFields(milestone.description, "> subteam-capacity ", ".*$");
				console.log("subteamCapacity:");
				console.log(subteamCapacity);
				if (subteamCapacity.length > 0 && $("#labelfilter").val() != "" && 
					(si = subteamCapacity.findIndex(function(e) {	return (e.split(",")[1] == $("#labelfilter").val())})) != -1) {
					// Use that
					var capacity = subteamCapacity[si].split(",")[0];
					console.log("Adding sub-team capacity " + capacity + " from repo " + repoList[r]);
					totalCapacity += parseInt(capacity);
				} else {
					// Normal case (not subteam)
					var capacity = yoda.getMilestoneCapacity(milestone.description);
					if (capacity != null) {
						console.log("Adding capacity " + capacity + " from repo " + repoList[r]);
						totalCapacity += parseInt(capacity);
					}
				}
			}
		}
	}
	if (totalCapacity != 0 && !(firstMilestoneShowData && $("#capacity").val() != "")) {
		$("#capacity").val(totalCapacity);
	}
	
	if (firstMilestoneShowData) {
		firstMilestoneShowData = false;
		
		if (yoda.decodeUrlParamBoolean(null, "draw") == "chart") {
			startBurndown();
		} else {
			if (yoda.decodeUrlParamBoolean(null, "draw") == "table") {
				startTable();
			} else {
				if (yoda.decodeUrlParamBoolean(null, "draw") == "rn") {
					startRN();
				} else {
					if (yoda.decodeUrlParamBoolean(null, "draw") == "rnknown") {
						startRNKnown();
					}
				}
			}
		}
	}
}


function copy_text(element) {
    //Before we copy, we are going to select the text.
    var text = document.getElementById(element);
    var selection = window.getSelection();
    selection.removeAllRanges();
    var range = document.createRange();
    range.selectNodeContents(text);

    selection.addRange(range);

    // Now that we've selected element, execute the copy command  
    try {  
        var successful = document.execCommand('copy');  
        var msg = successful ? 'successful' : 'unsuccessful';  
        console.log('Copy to clipboard command was ' + msg);  
      } catch(err) {  
        console.log('Oops, unable to copy to clipboard');  
      }

    // Remove selection. TBD: Remove, when copy works.
    // selection.removeAllRanges();
}

//-------------- START FUNCTIONS ---

function startBurndown() {
	console.log("Milestone based chart...");
	yoda.updateGitHubIssuesRepos($("#owner").val(), $("#repolist").val(), $("#labelfilter").val(), "all", addMilestoneFilter, burndown, function(errorText) { yoda.showSnackbarError("Error getting issues: " + errorText, 3000);});
}

function startTable() {
	console.log("Milestone based table...");
	yoda.updateGitHubIssuesRepos($("#owner").val(), $("#repolist").val(), $("#labelfilter").val(), "all", addMilestoneFilter, makeTable, function(errorText) { yoda.showSnackbarError("Error getting issues: " + errorText, 3000);});
}

//--------------

function githubAuth() {
	yoda.gitAuth($("#user").val(), $("#token").val());
}

// --------------

//Label drawing
Chart.defaults.font.size = 14;
Chart.register({
 id: "yoda-label",
 afterDatasetsDraw: function(chartInstance, easing) {
     var ctx = chartInstance.ctx;

     chartInstance.data.datasets.forEach(function (dataset, i) {
         var meta = chartInstance.getDatasetMeta(i);
         if (!meta.hidden && meta.type == 'bar') {
             meta.data.forEach(function(element, index) {
                 // Draw the text in black, with the specified font
				 ctx.fillStyle = yoda.bestForeground(dataset.backgroundColor, yoda.getColor('fontContrast'), yoda.getColor('htmlBackgound'));
                 // ctx.fillStyle = yoda.getColor('fontContrast');
                 ctx.font = Chart.helpers.fontString(Chart.defaults.font.size, Chart.defaults.font.style, Chart.defaults.font.family);

                 // Just naively convert to string for now
                 var dataString = dataset.data[index].toString();
                 
                 // skip 0 label
                 if (dataString != "0" && dataString != "NaN") { 

                	 // Make sure alignment settings are correct
                	 ctx.textAlign = 'center';
                	 ctx.textBaseline = 'middle';

                	 var padding = 5;
                	 var position = element.tooltipPosition();
                	 ctx.fillText(dataString, position.x, position.y + (Chart.defaults.font.size / 2) + padding);
                 }
             });
         }
     });
 }
});

Chart.register({
	id: "yoda-background",
	beforeDraw: function(c) {
		var ctx = c.ctx;
		ctx.fillStyle = yoda.getColor('htmlBackground');
		ctx.fillRect(0, 0, c.canvas.width, c.canvas.height);
	}
});
