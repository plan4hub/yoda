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
	var params = "owner=" + $("#owner").val() + "&repo=" + $("#repo").val();
	params += "&estimate=" + yoda.getEstimateInIssues();
	params = addIfNotDefault(params, "labelsplit");	
	params = addIfNotDefault(params, "tentative");	
	params = addIfNotDefault(params, "inprogress");	
	if ($("#milestone").val() != "0") {
		params += "&milestone=" + $("#milestone :selected").text();
	}
	if ($("#project").val() != "0") {
		params += "&project=" + $("#project :selected").text().split(":")[1].trim();
	}
	if (!$('#showclosed').is(":checked")) {
		params += "&showclosed=false";
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

// -----------

function incrementCount(sums, l1, l2, l3, field, value, issue) {
	sums[l1]["all"][field] += value;
	sums[l2]["all"][field] += value;
	sums[l3]["all"][field] += value;

	sums[l1][issue.state][field] += value;
	sums[l2][issue.state][field] += value;
	sums[l3][issue.state][field] += value;
	
	// and maybe into inprogress state as well.
	var inprogressLabel = $("#inprogress").val();
	if (yoda.isLabelInIssue(issue, inprogressLabel)) {
		sums[l1]["inprogress"][field] += value;
		sums[l2]["inprogress"][field] += value;
		sums[l3]["inprogress"][field] += value;
	}
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

	var cell = row.insertCell();
	cell.innerHTML = "<b>" + sums[labelItem][issueState].totalEstimate + "</b>";
	cell.style.textAlign = "right";

	var cell = row.insertCell();
	cell.innerHTML = "<b>" + sums[labelItem][issueState].totalRemaining + "</b>";
	cell.style.textAlign = "right";

	var cell = row.insertCell();
	cell.innerHTML = "<b>" + sums[labelItem][issueState].totalTasks + "</b>";
	cell.style.textAlign = "right";

	var cell = row.insertCell();
	cell.innerHTML = "<b>" + sums[labelItem][issueState].totalCompletedTasks + "</b>";
	cell.style.textAlign = "right";

	var cell = row.insertCell();
	cell.innerHTML = "<b>" + sums[labelItem][issueState].totalTentative + "</b>";
	cell.style.textAlign = "right";

	var cell = row.insertCell();
	cell.innerHTML = "<b>" + sums[labelItem][issueState].totalIssues + "</b>";
	cell.style.textAlign = "right";
}

function insertBlankRow(bodyRef, firstField) { 
	var row = bodyRef.insertRow();
	for (var i = 0; i < 10; i++) {
		cell = row.insertCell();
		if (i == 0 && firstField != undefined) {
			cell.innerHTML = firstField;
		}
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
	for (var i=1; i<tableRows.length; i++) { 
		var tableRow = tableRows[i]; var rowData = {}; 
		for (var j=0; j<tableRow.cells.length; j++) { 
			rowData[headers[j]] = tableRow.cells[j].innerHTML.replace(/<(?:.|\n)*?>/gm, ''); 
		} data.push(rowData); 
	} 
	
	config = {
			quotes: false,
			quoteChar: '"',
			delimiter: ";",
			header: true,
			newline: "\r\n"
		};
	
	result = Papa.unparse(data, config);
	var fileName = $("#owner").val() + "-" + $("#repo").val() + "-burndown.csv"; 
	yoda.downloadFile(result, fileName);
}

//---------------------------------------

function makeTable(issues) {
	if ($('#showclosed').is(":checked")) {
		var showClosed = true;
	} else {
		var showClosed = false;
	}

	// Destroy graph if there.
	if (window.myMixedChart != null)
		window.myMixedChart.destroy();

	// Clear table
	clearTable();
	
	// Filter out pull requests
	yoda.filterPullRequests(issues);
	
	// Sort by repository, number
	issues.sort(function(a,b) {
		if (a.repository_url == b.repository_url) {
			return (a.number - b.number); 
		}
		if (a.repository_url > b.repository_url) {
			return 1;
		} else {
			return -1;
		}
	});
	var tentativeLabel = $("#tentative").val();
	var inprogressLabel = $("#inprogress").val();

	var labelSplit = $("#labelsplit").val();
	console.log("Label split: " + labelSplit);

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
		
		var assignee = "unassigned";
		console.log("Assignee: " + assignee);
		cell = row.insertCell();
		if (issues[i].assignee != null) {
			assignee = issues[i].assignee.login;
			cell.innerHTML = assignee;
		}
		prepareSums(sums, assignee);
		assigneeSet.add(assignee);
		
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
		
		cell = row.insertCell();
		cell.innerHTML = issues[i].title;

		// # of issues
		incrementCount(sums, "Grand Total", labelItem, assignee, "totalIssues", 1, issues[i]);
		
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
			incrementCount(sums, "Grand Total", labelItem, assignee, "totalEstimate", est, issues[i]);
		}
		
		// Remaining
		cell = row.insertCell();
		cell.style.textAlign = "right";
		if (issues[i].closed_at != null || (yoda.isLabelInIssue(issues[i], tentativeLabel))) {
			console.log("  Remaining for isue " + issues[i].number + " = 0");
			cell.innerHTML = "0";
		} else {
			var remaining = yoda.issueRemaining(issues[i], yoda.issueEstimate(issues[i]), issues[i]);
			console.log("  Remaining for isue " + issues[i].number + " = " + remaining);
			cell.innerHTML = remaining;
			incrementCount(sums, "Grand Total", labelItem, assignee, "totalRemaining", remaining, issues[i]);
		}
		
		// # tasks
		cell = row.insertCell();
		cell.style.textAlign = "right";
		var noTasks = yoda.getbodyTasks(issues[i].body);
		incrementCount(sums, "Grand Total", labelItem, assignee, "totalTasks", noTasks, issues[i]);
		cell.innerHTML = noTasks;
		
		// # tasks completed
		cell = row.insertCell();
		cell.style.textAlign = "right";
		var noCompletedTasks = yoda.getbodyCompletedTasks(issues[i].body);
		incrementCount(sums, "Grand Total", labelItem, assignee, "totalCompletedTasks", noCompletedTasks, issues[i]);
		cell.innerHTML = noCompletedTasks;
		
		// Tentative
		cell = row.insertCell();
		cell.style.textAlign = "right";
		if (yoda.isLabelInIssue(issues[i], tentativeLabel)) {
			var remaining = yoda.issueRemaining(issues[i], yoda.issueEstimate(issues[i]));
			cell.innerHTML = remaining;
			incrementCount(sums, "Grand Total", labelItem, assignee, "totalTentative", remaining, issues[i]);
			console.log("For tentative issue: " + issues[i].number + " added remaining: " + remaining);
		} else {
			cell.innerHTML = "0";
		}
		
		cell = row.insertCell();
		if (issues[i].closed_at != null) {
			cell.innerHTML = "closed";
		} else {
			if (yoda.isLabelInIssue(issues[i], inprogressLabel)) {
				cell.innerHTML = "<b>open</b>";
			} else {
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
		insertTotalsRow(bodyRef, sums, assignee, "<i>Subtotal</i>", assignee, "", "", "");
	});
	
	yoda.updateUrl(getUrlParams() + "&draw=table");
}

// ------------------



// ---------------------------------------
// Milestone issues have been retrieved. Time to analyse data and draw the chart.
function burndown(issues) {
	clearTable();
	// Destroy old graph, if any
	if (window.myMixedChart != null)
		window.myMixedChart.destroy();

	console.log("Creating burndown. No of issues retrieved: " + issues.length);
	yoda.filterPullRequests(issues);
	console.log("Creating burndown. No issues (after filtering out pull requests): " + issues.length);
	
	var tentativeLabel = $("#tentative").val();

	// 3 arrays we will create. 
	// Labels (x axis - days)
	var labels = [];
	// Remaining array are values for the bar chart. 
	var remainingArray = [];
	var remainingTentativeArray = [];
	
	// Data for the ideal line. This will actually only hold initial and final value, rest will be NaN.
	// Tool will draw a straight line between these two points.
	var remainingIdealArray = [];

	// sort issues by closed_date
	issues.sort(yoda.SortDates);
	
	// Will hold total estimate (sum of > estimate, or # of issues)
	var estimate = 0;
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
	console.log(milestoneDuedateString);
	
	var nextDay = new Date(date);
	var today = new Date();
	var todayString = yoda.formatDate(today);

	var tomorrow = new Date(today);
	tomorrow.setDate(tomorrow.getDate() + 1);
	var tomorrowString = yoda.formatDate(tomorrow);

	// First calculate the sum of (either # of sum of estimates) of all issues associated with the
	// milestone
	for (i = 0; i < issues.length; i++) {
		var closedAt = new Date(issues[i].closed_at);
		if (issues[i].state == "closed" && closedAt < milestoneStartdate) {
			// Issue was already been closed BEFORE the milestone start date.
			// Issue (estimate or count) will NOT be included.
			// NOTE: This can be debated. Issue is after all in the milestone...
		}  else {
			if (yoda.isLabelInIssue(issues[i], tentativeLabel)) {
				console.log(" => adding TENTATIVE : " + issues[i].number + ", estimate: " + (yoda.issueEstimate(issues[i])));
				estimateTentative = estimateTentative + (yoda.issueEstimate(issues[i]));
			} else {
				console.log(" => adding: " + issues[i].number + ", estimate: " + (yoda.issueEstimate(issues[i])));
				estimate = estimate + (yoda.issueEstimate(issues[i]));
			}
		}
	}
	console.log("Total estimate: " + estimate + ", Total tentative: " + estimateTentative);
	
	// Start remaining at estimate, then decrease as issues are closed.
	var remaining = estimate;
	var remainingTentative = estimateTentative;

	// Now, run from milestone_startdate to milestone_duedate one day at a time...
	console.log(milestoneStartdate);
	for (; date <= dueDate; date.setDate(date.getDate() + 1)) {
		nextDay.setDate(date.getDate() + 1);

		// Push label (x-axis) and NaN for line.
		var dateString = yoda.formatDate(date);
		labels.push(dateString);
		remainingIdealArray.push(NaN);

		// Make bar for day, but not if later than current date!
		// BUT, we must have at least one entry if looking at a future sprint!
		if (date <= tomorrow || remainingArray.length == 0) {
			console.log("Adding bar value for: " + dateString + ", value: " + remaining);
			remainingArray.push(remaining);
			remainingTentativeArray.push(remainingTentative);
		} else {
			console.log("Skipping bar as in future: " + dateString);
			remainingArray.push(NaN);
			remainingTentativeArray.push(NaN);
		}

		// Now check which (if any) issues where closed during this day. Decrease remaining.
		for (i=0; i<issues.length; i++) {
			if (issues[i].closed_at != null) {
				var closedAt = new Date(issues[i].closed_at);
				if (date < closedAt && closedAt < nextDay) {
					if (yoda.isLabelInIssue(issues[i], tentativeLabel)) {
						console.log("Tentative Issue " + issues[i].number + " was closed: " + closedAt);
						remainingTentative -= yoda.issueEstimate(issues[i]);
					} else {
						console.log("Issue " + issues[i].number + " was closed: " + closedAt);
						remaining -= yoda.issueEstimate(issues[i]);
					}
				}
			}
		}
	}
	
	// Now for the - really - complex bit, namely handling of "> remaining (date) (number)" syntax
	if (yoda.getEstimateInIssues() == "inbody") {
		for (i = 0; i < issues.length; i++) {
			// First, let's get the estimate
			var issueEstimate = yoda.getBodyEstimate(issues[i].body);
			if (issueEstimate != null) {
				var issueWorkDoneBefore = 0;
				for (var index = 0; yoda.getFirstRemaining(issues[i].body, index) != null; index++) {
					var remainingEntry = yoda.getFirstRemaining(issues[i].body, index);
					//      Ok, we now have a /remaining entry
					var remainingDate = remainingEntry.slice(0, 10);
					var remainingNumber = remainingEntry.slice(11);
					console.log("Remaining entry (" + index + ") for issue: " + issues[i].number + ": " + remainingDate + ", " + remainingNumber);

					if (issues[i].closed_at == null) {
						var closedAtString = null;
					} else {
						closedAtString = yoda.formatDate(new Date(issues[i].closed_at));
					}

					// We also need to know if the issue has been closed. If so, we should only adjust up to the point of
					// closure. The graph already has the effect of the closure (going to 0).
					for (var d = 0; d < labels.length; d++) {
						if (remainingDate == labels[d]) {
							console.log(" XXXXX " + labels[d] + ", remaining: " + remainingArray[d]);
							// Loop for future estimates, but only until either closed date (if issue was closed OR current date).
							for (var e = d + 1; e < labels.length; e++) {
								if (closedAtString != null && labels[e] > closedAtString) 
									continue;
								
								if (labels[e] > tomorrowString)
									continue;

								console.log(" YYYY " + labels[e] + ", remaining: " + remainingArray[e]);
								if (yoda.isLabelInIssue(issues[i], tentativeLabel)) {
									remainingTentativeArray[e] -= (issueEstimate - remainingNumber - issueWorkDoneBefore);
								} else {
									remainingArray[e] -= (issueEstimate - remainingNumber - issueWorkDoneBefore);                                                               
								}
							}
							issueWorkDoneBefore = issueEstimate - remainingNumber;
						}
					}
				}
			}
		}
	}


	// remaining_ideal_array needs some values. The start point for the ideal line will either
	// start at the total estimate OR overridden by the capacity field (which in turn may have 
	// been retrieved from the milestone description field).
	if ($("#capacity").val() != "") {
		remainingIdealArray[0] = parseInt($("#capacity").val());
	} else {
		remainingIdealArray[0] = estimate;
	}
	remainingIdealArray[remainingIdealArray.length - 1] = 0;

//	console.log("Length of remainingArray: " + remainingArray.length);
	
	// -----------------------------------------------------------
	// READY - Draw the chart
	var chartData = {
			labels : labels,
			datasets : [ {
				type : 'bar',
				label : 'Burndown',
				borderWidth : 2,
				fill : false,
				data : remainingArray,
				backgroundColor : 'rgba(0,153,51,0.6)'  // Green 
			},
			{
				type : 'line',
				label : 'Ideal',
				borderWidth : 2,
				fill : false,
				data : remainingIdealArray,
				borderColor: '#004d1a',
				pointRadius: 0,
				spanGaps: true
			}]
	};
	
	// If there were tentative data, need to add extra data series
	if (estimateTentative > 0) {
		chartData.datasets.push({
			type : 'bar',
			label : 'Tentative',
			borderWidth : 2,
			fill : false,
			data : remainingTentativeArray,
			backgroundColor : 'rgb(255, 255, 51)'  // Yellow
		});
	}

	// Axis legend depend on whether working from estimates in issues, or simply number of issues.
	var axis = "";
	if (yoda.getEstimateInIssues() == "noissues") {
		axis = "# of issues";
	} else {
		axis = "Story points";
	}
	
	// Chart title
	var titleText = "Burndown chart for ";
	if ($("#milestone").val() != "0") {
		titleText +=  $("#owner").val() + "/" + $("#repo").val() + "/" + $("#milestone :selected").text();
	} else {
		titleText += $("#project :selected").text();
	}

	var ctx = document.getElementById("canvas").getContext("2d");
	window.myMixedChart = new Chart(ctx, {
		type : 'bar',	
		data : chartData,
		options : {
			responsive : true,
			title : {
				display : true,
				text : titleText
			},
			tooltips : {
				mode : 'index',
				intersect : true
			},
			scales: {
				yAxes: [{
					scaleLabel: {
						display: true,
						labelString: axis
					},
					stacked: true,
					ticks: {
						beginAtZero: true
					}
				
				}],
				xAxes: [{
					barPercentage: 1,
					categoryPercentage: 1,
					stacked: true
				}]
			},
			tooltips: {
				enabled: false
			},
		},
	});
	
	yoda.updateUrl(getUrlParams() + "&draw=chart");
}

// ------------------

//Note special logic to allow URL override of project. ONLY for first selection.
var firstProjectUpdate = true;
function addProjects(projects, prefix) {
	console.log("Project: " + prefix);
	console.log(projects);
	var selectProject = 0;
	
	for (var p = 0; p < projects.length; p++) {
		// For value we will add a comma-separated list of:
		// 1: The API URL for the project
		// 2: The owner/org for the project 
		// 3: The repo for the project (can be empty)
		// 2 and 3 are in the prefix.
		// 4: The project number.
		var projectInfo = [projects[p].url, prefix, projects[p].number].join();
		console.log("ProjectInfo: " + projectInfo);
		
		var prefixSplit = prefix.split(',');
		var prefixPres = prefixSplit[0];
		if (prefixSplit[1] != "") {
			prefixPres += "/" + prefixSplit[1];
		}
		
		$("#project").append($("<option></option>").attr("value", projectInfo).text(prefixPres + ": " + projects[p].name));
		
		if (firstProjectUpdate && projects[p].name == yoda.decodeUrlParam(null, "project")) {
			selectProject = projectInfo;
		}
	}
	
	if (selectProject != 0) {
		$("#project").val(selectProject).change();
		checkDraw();
	}
	firstProjectUpdate = false;
}

function updateProjects() {
	$("#project").empty();
	$("#project").append($("<option></option>").attr("value", 0).text("Select project ... "));

	// Org level projects
	var getProjectsUrl = yoda.getGithubUrl() + "orgs/" + $("#owner").val() + "/projects?state=all";
	yoda.getLoop(getProjectsUrl, -1, [], function(data) {addProjects(data, $("#owner").val() + ",")}, null);
	
	// Repo level projects (if repo not blank)
	if ($("#repo") != "") {
		var getProjectsUrl = yoda.getGithubUrl() + "repos/" + $("#owner").val() + "/" + $("#repo").val() + "/projects?state=all";
		yoda.getLoop(getProjectsUrl, -1, [], function(data) {addProjects(data, $("#owner").val() + "," + $("#repo").val())}, null);
	}
}

//------------------
// Note special logic to allow URL override of milestone. ONLY for first selection.
var firstMilestoneUpdate = true;
function showMilestones(milestones) {
	var selectMilestone = 0;
	for (var m = 0; m < milestones.length; m++) {
		$("#milestone").append($("<option></option>").attr("value", milestones[m].number).text(milestones[m].title));
		if (firstMilestoneUpdate && milestones[m].title == yoda.decodeUrlParam(null, "milestone")) {
			selectMilestone = milestones[m].number;
		}
	}
	if (selectMilestone != 0) {
		$("#milestone").val(selectMilestone).change();
		checkDraw();
	}
	firstMilestoneUpdate = false;
}

function updateMilestones() {
	$("#milestone").empty();
	$("#milestone").append($("<option></option>").attr("value", 0).text("Select milestone ... "));
	var getMilestonesUrl = yoda.getGithubUrl() + "repos/" + $("#owner").val() + "/" + $("#repo").val() + "/milestones?state=all";
	yoda.getLoop(getMilestonesUrl, 1, [], showMilestones, null);
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
	
	var getReposUrl = yoda.getGithubUrl() + "orgs/" + $("#owner").val() + "/repos";
	yoda.getLoop(getReposUrl, 1, [], showRepos, null);
//	getReposUrl = yoda.getGithubUrl() + "users/" + $("#owner").val() + "/repos";
//	yoda.getLoop(getReposUrl, -1, [], showRepos, null);
}

// ---------------

function showMilestoneData(milestone) {
	console.log("Updating milestone data.");
	var milestoneDueOn = yoda.formatDate(new Date(milestone[0].due_on));
	console.log("  Milestone due: " + milestoneDueOn);
	$("#milestone_due").val(milestoneDueOn);
	var milestoneStartdate = yoda.getMilestoneStartdate(milestone[0].description);
	if (milestoneStartdate == null) {
		$("#milestone_start").val("2017-xx-xx");
		console.log("  Unable to read milestone startdate.");
	}  else {
		$("#milestone_start").val(milestoneStartdate);
		console.log("  Milestone start: " + milestoneStartdate);
	}
	// Override due date?
	var overrideDue = yoda.getMilestoneBurndownDuedate(milestone[0].description);
	if (overrideDue != null) {
		$("#milestone_due").val(overrideDue);
	}
	
	var capacity = yoda.getMilestoneCapacity(milestone[0].description);
	if (capacity != "") {
		$("#capacity").val(capacity);
	}
}

function getMilestoneData() {
	// Deselect any project to avoid confusion. We run using milestones now!
	$("#project").val("0");
	if ($("#milestone").val() == "0") {
		return; // NOP
	}
	
	var getMilestoneDataUrl = yoda.getGithubUrl() + "repos/" + $("#owner").val() + "/" + $("#repo").val() + "/milestones/" + $("#milestone").val();
	yoda.getLoop(getMilestoneDataUrl, 1, [], showMilestoneData, function(errorText) { yoda.showSnackbarError("Error getting issues: " + errorText, 3000);});
}
	
//---------------

function showProjectData(project) {
	console.log(project);
	
	console.log("Updating project data.");
	var milestoneStartdate = yoda.getMilestoneStartdate(project[0].body);
	if (milestoneStartdate == null) {
		$("#milestone_start").val("2017-xx-xx");
		console.log("  Unable to read milestone startdate.");
	}  else {
		$("#milestone_start").val(milestoneStartdate);
		console.log("  Milestone start: " + milestoneStartdate);
	}
	
	// Override due date?
	var dueDate = yoda.getMilestoneBurndownDuedate(project[0].body);
	if (dueDate != null) {
		$("#milestone_due").val(dueDate);
	} else {
		$("#milestone_due").val("2017-xx-xx");
		console.log("  Unable to read milestone duedate.");
	}
	
	var capacity = yoda.getMilestoneCapacity(project[0].body);
	if (capacity != "") {
		$("#capacity").val(capacity);
	}
}

function getProjectData() {
	// Deselect any milestone to avoid confusion. We run using milestones now!
	$("#milestone").val("0");
	if ($("#project").val() == "0") {
		return; // NOP
	}
	
	var getProjectDataUrl = $("#project").val().split(',')[0]; // URL is into first part stored directly into the selection.
	console.log("getProjectDataUrl: " + getProjectDataUrl);
	yoda.getLoop(getProjectDataUrl, 1, [], showProjectData, function(errorText) { yoda.showSnackbarError("Error getting issues: " + errorText, 3000);});
}
	
//-------------- START FUNCTIONS ---

function buildMilestoneIssuesURL() {
	console.log("Milestone: " + $("#milestone").val());

	var getIssuesUrl = yoda.getGithubUrl() + "repos/" + $("#owner").val() + "/" + $("#repo").val() +
	"/issues?state=all&milestone=" + $("#milestone").val();
	return getIssuesUrl;
}

function buildProjectIssuesURL() {
	// val() can be something like: https://github.hpe.com/api/v3/projects/2847,jens-markussen,hpsa,1
	var projectInfo = $("#project").val();
	
	// Ower
	var owner = projectInfo.split(',')[1];
	var repo = projectInfo.split(',')[2];
	var number = projectInfo.split(',')[3];
	console.log("Project info: " + projectInfo + ", owner: " + owner + ", repo: " + repo + ", number: " + number);
	
	var projectLink = owner + "/";
	if (repo != "") {
		projectLink += repo + "/";
	}
	projectLink += number;
	console.log("Project link: " + projectLink);
	
	var getIssuesUrl = yoda.getGithubUrl() + "search/issues?q=type:issue+project:" + projectLink;
	console.log("Issues url: " + getIssuesUrl);

	return getIssuesUrl;
}

function startBurndown() {
	if ($("#milestone").val() != "0") {
		// Milestone based
		console.log("Milestone based chart...");
		var getIssuesUrl = buildMilestoneIssuesURL();
		yoda.getLoop(getIssuesUrl, 1, [], burndown, function(errorText) { yoda.showSnackbarError("Error getting issues: " + errorText, 3000);});	
	} else {
		if ($("#project").val() != "0") {
			console.log("Project based chart...");
			var getIssuesUrl = buildProjectIssuesURL();
			yoda.getLoop(getIssuesUrl, 1, [], function(data) {burndown(data[0].items);}, function(errorText) { yoda.showSnackbarError("Error getting issues: " + errorText, 3000);});		
		}
	}
}

function startTable() {
	if ($("#milestone").val() != "0") {
		// Milestone based
		console.log("Milestone based table...");
		var getIssuesUrl = buildMilestoneIssuesURL();
		yoda.getLoop(getIssuesUrl, 1, [], makeTable, function(errorText) { yoda.showSnackbarError("Error getting issues: " + errorText, 3000);});	
	} else {
		if ($("#project").val() != "0") {
			console.log("Project based table...");
			var getIssuesUrl = buildProjectIssuesURL();
			yoda.getLoop(getIssuesUrl, 1, [], function(data) {makeTable(data[0].items);}, function(errorText) { yoda.showSnackbarError("Error getting issues: " + errorText, 3000);});		
		}
	}
}

//this function is called if milestone or project argument has been given. In this case, we'll check
//if draw argument has been given, and - if so - activate a burndown or table
function checkDraw() {
	if (yoda.decodeUrlParamBoolean(null, "draw") == "chart") {
		startBurndown();
	} else {
		if (yoda.decodeUrlParamBoolean(null, "draw") == "table") {
			startTable();
		}
	}
}

//--------------

function openSprint() {
	if ($("#milestone").val() != "0") {
		var milestone = $("#milestone").val();
		var gitHubUrl = yoda.getGithubUrlHtml() + $("#owner").val() + "/" + $("#repo").val() + "/milestone/" + milestone;
		console.log("Open milestone.." + milestone + ", url: " + gitHubUrl);
		window.open(gitHubUrl);
	} else {
		if ($("#project").val() != "0") {
			var projectInfo = $("#project").val(); 
			
			var owner = projectInfo.split(',')[1];
			var repo = projectInfo.split(',')[2];
			var number = projectInfo.split(',')[3];
			console.log("Project info: " + projectInfo + ", owner: " + owner + ", repo: " + repo + ", number: " + number);

			var gitHubUrl = yoda.getGithubUrlHtml();
			
			if (repo != "") {
				gitHubUrl += owner + "/" + repo + "/projects/" + number;
			} else {
				gitHubUrl += "orgs/" + owner + "/projects/" + number;
			}
			console.log("Open project using url: " + gitHubUrl);
			window.open(gitHubUrl);
		}
	}
}

// --------------

function githubAuth() {
	yoda.gitAuth($("#user").val(), $("#token").val());
}

// --------------

//Label drawing
Chart.plugins.register({
 afterDatasetsDraw: function(chartInstance, easing) {
     var ctx = chartInstance.chart.ctx;

     chartInstance.data.datasets.forEach(function (dataset, i) {
         var meta = chartInstance.getDatasetMeta(i);
         if (!meta.hidden && meta.type == 'bar') {
             meta.data.forEach(function(element, index) {
                 // Draw the text in black, with the specified font
                 ctx.fillStyle = 'rgb(0, 0, 0)';
                 ctx.font = Chart.helpers.fontString(Chart.defaults.global.defaultFontSize, Chart.defaults.global.defaultFontStyle, Chart.defaults.global.defaultFontFamily);

                 // Just naively convert to string for now
                 var dataString = dataset.data[index].toString();
                 
                 // skip 0 label
                 if (dataString != "0") { 

                	 // Make sure alignment settings are correct
                	 ctx.textAlign = 'center';
                	 ctx.textBaseline = 'middle';

                	 var padding = 5;
                	 var position = element.tooltipPosition();
                	 ctx.fillText(dataString, position.x, position.y + (Chart.defaults.global.defaultFontSize / 2) + padding);
                 }
             });
         }
     });
 }
});

var backgroundColor = 'white';
Chart.plugins.register({
 beforeDraw: function(c) {
     var ctx = c.chart.ctx;
     ctx.fillStyle = backgroundColor;
     ctx.fillRect(0, 0, c.chart.width, c.chart.height);
 }
});
