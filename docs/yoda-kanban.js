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


// Kanban issues datamodel
// Here we will store issues per repo
var repoList = [];  // selected repos
var repoMilestones = []; // Double-array of repos,milestone (full structure) for selected repos

var commonMilestones = []; // Options for milestone selection (milestones in all repos).
var milestoneList = []; // selected milestones just the title
var milestoneListComplete = []; // selected milestones, full structure.

var repoIssues = []; // List of issues. Full structure as returned from github.

var issueLabels = []; // List of labels found for all issues. (full structure)
var issueLabelFiltered = []; // selected labels (just names)

var issueAssignees = []; // List of assignee found for all issues. (just names)
var issueAssigneesFiltered = []; // selected assignees (just names)

// Currently drawn board columns and definitions
var issues = []; // currently drawn issues.
var columnDefs = [];
var columnNameList = [];
var columnDefList = [];

function getUrlParams() {
	var params = "owner=" + $("#owner").val() + "&repolist=" + $("#repolist").val();
	if (yoda.getEstimateInIssues() != "inbody") 
		params += "&estimate=" + yoda.getEstimateInIssues();
	if ($("#milestonelist").val() != "")
		params += "&milestonelist=" + $("#milestonelist").val();
	if ($("#columns").val() != "[Urgent]open:S1 - Urgent,[High]open:S2 - High,[Medium]open:S3 - Medium,[Low]open:S4 - Low,[Other]open:*,[Closed]closed:*") 
		params += "&columns=" + $("#columns").val();
	if ($("#labellist").val() != "") 
		params += "&labellist=" + $("#labellist").val();
	if ($("#assigneelist").val() != "")
		params += "&assigneelist=" + $("#assigneelist").val();
	if ($('#closedmilestones').is(":checked")) {
		params += "&closedmilestones=true";
	}
	if (!$('#closedissues').is(":checked")) {
		params += "&closedissues=false";
	}
	if (!$('#locked').is(":checked")) {
		params += "&locked=false";
	}
	
	return params;
}

function estimateClick(radio) {
	yoda.setEstimateInIssues(radio.value);
	drawKanban();
}


// Not called for now...
function formatLabel(label) {
	if (!label.id) {
		return label.text;
	}
	
	for (var is = 0; is < issueLabels.length; is++) {
		if (label.text == issueLabels[is].name) {
			var background = issueLabels[is].color;
		}
	}
	var foreground = yoda.bestForeground(background);
	// 
	var newLabel = $(
			'<span style="background: #' + background + '; color: ' + foreground + '">' + label.text + '</span>'
	);
//	return newLabel;
	// It doesn't look nice, so disabled for now.
	return label.text;
};	

var firstLabelShow = true;
var urlLabelList = yoda.decodeUrlParam(null, "labellist");
function updateIssueLabelList() {
	issueLabels = [];
	issueLabelFiltered = [];
	for (var i = 0; i < repoIssues.length; i++) {
		for (var l = 0; l < repoIssues[i].labels.length; l++) {
			var name = repoIssues[i].labels[l].name;
			var foundName = false;
			for (var is = 0; is < issueLabels.length; is++) {
				if (name == issueLabels[is].name) {
					foundName = true;
					break;
				}
			}
			if (foundName == false) {
				issueLabels.push(repoIssues[i].labels[l]);
			}
		}
	}

	issueLabels.sort(function(a,b) {
		if (a.name > b.name)
			return 1;
		else 
			return -1;
	});
	console.log(issueLabels);
	
	var selectLabels = [];
	if (firstLabelShow) {
		firstLabelShow = false;
	
		if (urlLabelList != null) 
			selectLabels = urlLabelList.split(",");
	}
	
	// Now add to selection list
	$("#labellist").empty();
	var labelsSelected = false;
	for (var is = 0; is < issueLabels.length; is++) {
		var selectLabel = false;
		if (selectLabels.indexOf(issueLabels[is].name) != -1) {
			selectLabel = true;
			labelsSelected = true;
		}
		var newOption = new Option(issueLabels[is].name, issueLabels[is].name, selectLabel, selectLabel);
		$('#labellist').append(newOption);
	}
	
	if (labelsSelected) 
		$("#labellist").trigger('change');
	
//	$("#labellist").select2({
//		  templateResult: formatLabel
//	});
}

var firstAssigneeShow = true;
var urlAssigneeList = yoda.decodeUrlParam(null, "assigneelist");
function updateAssigneeList() {
	console.log("updateAssigneeList. first=" + firstAssigneeShow);
	issueAssignees = []; 
	issueAssigneesFiltered = []; 
	
	for (var i = 0; i < repoIssues.length; i++) {
		for (var as = 0; as < repoIssues[i].assignees.length; as++) {
			assignee = repoIssues[i].assignees[as].login;
			
			if (issueAssignees.indexOf(assignee) == -1) {
				issueAssignees.push(assignee);
			}
		}
	}
	
	issueAssignees.sort();
	$("#assigneelist").empty();
	
	var selectAssigneeList = [];
	if (firstAssigneeShow) {
		firstAssigneeShow = false;

		console.log("url input: " + urlAssigneeList)
		if (urlAssigneeList != null) 
			selectAssigneeList = urlAssigneeList.split(",");
	}
	console.log(selectAssigneeList);
	
	
//	var newOption = new Option("unassigned", "unassigned", false, false);
	issueAssignees.unshift("unassigned");
	var assigneeSelected = false;
	for (var a = 0; a < issueAssignees.length; a++) {
		var selectAssignee = false;
		if (selectAssigneeList.indexOf(issueAssignees[a]) != -1) {
			selectAssignee = true;
			assigneeSelected = true;
		}
		
		var newOption = new Option(issueAssignees[a], issueAssignees[a], selectAssignee, selectAssignee);
		$('#assigneelist').append(newOption);
	}
	
	if (assigneeSelected)
		$('#assigneelist').trigger('change');
}


function getMilestoneTitle(issue) {
	if (issue.milestone == null) {
		return "";
	}
	
	for (var r = 0; r < repoList.length; r++) {
		for (var m = 0; m < repoMilestones[r].length; m++) {
//			console.log(repoMilestones[r][m].title);
			
			if (issue.milestone.url == repoMilestones[r][m].url) {
				var milestoneWithLink = '<a href="' + repoMilestones[r][m].html_url + '" target="_blank">' + repoMilestones[r][m].title + '</a>'; 
				return milestoneWithLink;
			}
		}
	}
	return "";
}

// Create the HTML card representation for a given issue.
function createCard(issue) {
//	console.log(issue);
	var card = $('<div class="card"></div>');
	card.attr("url", issue.url);
	if (issue.closed_at != null) {
		var cardRef = $('<a class="cardlink" style="text-decoration: line-through;" target="_blank" href="' + issue.html_url + '">' + issue.title + '</a>');		
	} else {
		var cardRef = $('<a class="cardlink" target="_blank" href="' + issue.html_url + '">' + issue.title + '</a>');
	}
	card.append(cardRef);
	
	var repo = yoda.getUrlRepo(issue.repository_url);

	if (issue.assignees.length > 0) {
		var assignText = "";
		for (var as = 0; as < issue.assignees.length; as++) {
			var assignee = issue.assignees[as].login;
			if (assignText != "") 
				assignText += " ";
			assignText += '<a href="' + issue.assignees[as].html_url + '" target="_blank">' + issue.assignees[as].login + '</a>';
		}
	} else {
		var assignText = "<i>unassigned</i>";
	}

	// TODO: Enhance graphically.. 
	var estimateText = "";
	if (yoda.getEstimateInIssues() != "noissues") {
		var estimate = yoda.issueEstimate(issue);
		var remaining = 0;
		if (estimate != 0) {
			var remaining = yoda.issueRemaining(issue, estimate);
			if (remaining != estimate) {
				estimateText = " (" + estimate + "/" + remaining + ")";
			} else {
				estimateText = " (" + estimate + ")";
			}
		}
	}
	
	issueRef = '<a href="' + issue.html_url + '" target="_blank">' + repo + "#" + issue.number + '</a>';
	
	var smallRef = $('<small>' + issueRef + ' ' + getMilestoneTitle(issue) + ' ' + assignText + ' ' + estimateText + '</small>');
	card.append(smallRef);

	var cardLabels = $('<span class="cardlabels"></span>');
	
	for (var l = 0; l < issue.labels.length; l++) {
		var cardLabel = $('<span class="cardlabel">' + issue.labels[l].name + '</span>');
		cardLabel.css('background', '#' + issue.labels[l].color);  
		cardLabel.css('color', yoda.bestForeground(issue.labels[l].color));
		cardLabels.append(cardLabel);
	}
	card.append(cardLabels);
	return [card, estimate, remaining];
}

// Create the HTML representation for a new column
function createColumn(columnId, columnName) {
	var column = $(
			'<div class="cardcolumn">' +
				'<div id="' + columnId + '" class="cardsincolumn">' +
					'<div id ="' + columnId + '-header" class="columnheader">' + columnName +
					   '<div id ="' + columnId + '-total" style="float: right"></div>' + 
					'</div>' +
				'</div>' +
			'</div>');
	return column;
}

function enableDisableSortable() {
	if ($('#locked').is(":checked")) {
		$( ".cardsincolumn" ).sortable("disable");
	} else {
		$( ".cardsincolumn" ).sortable("enable");
	}
	yoda.updateUrl(getUrlParams());
}

function handleIssueMove(url, fromColumn, toColumn) {
	var fromColumnNo = parseInt(fromColumn.substring(6));
	var toColumnNo = parseInt(toColumn.substring(6));
	console.log("Move card " + url + " from " + fromColumn + " (" + fromColumnNo + ") to " + toColumn + " (" + toColumnNo + ")");
	
	var toColumnState = columnDefList[toColumnNo].split(":")[0];
	if (toColumnState != "open" && toColumnState != "closed")
		toColumnState = ""; // then it is not the open/closed state.
	
	// First, let's find the issue in our list.
	for (var i = 0; i < issues.length; i++) {
		if (issues[i].url == url) {
			console.log("Found issue. It is at index " + i);
			
			console.log("Labels:");
			console.log(issues[i].labels);

			var newLabels = [];
			for (var l = 0; l < issues[i].labels.length; l++) {
				newLabels.push(issues[i].labels[l].name);
			}
			
			// We need to potentially remove label for the column we come from (unless final is *)
			var fromDef = columnDefList[fromColumnNo];
			var fromLabel = fromDef.split(":").splice(-1)[0];
			console.log(fromDef + "," + fromLabel);
			
			// Then we need to potentially add label for the column we are moving to (unless final is *)
			var toDef = columnDefList[toColumnNo];
			var toLabel = toDef.split(":").splice(-1)[0];
			console.log(toDef + "," + toLabel);

			if (fromLabel != "*" && toLabel != "*") {
				var fromIndex = newLabels.indexOf(fromLabel);
				console.log("Fromindex: " + fromIndex);
				if (fromIndex != -1) {
					console.log("Remove issues from index " + fromIndex);
					newLabels.splice(fromIndex, 1);
				}
				newLabels.push(toLabel);
			}
			
			// Now, the complex case of moving from a "*" column to a label, ie. non "*" column
			if (fromLabel == "*" && toLabel != "*") {
				// Check all other labels.
				for (var c = 0; c < columnDefs.length; c++) {
					if (c == toColumnNo)
						continue;
					var cDef = columnDefs[c].split("]")[1];
					var cLabel = cDef.split(":").splice(-1)[0];
					
					lIndex = newLabels.indexOf(cLabel);
					if (lIndex != -1) {
						console.log("Removing label " + cLabel);
						newLabels.splice(lIndex, 1);
					}
				}
				newLabels.push(toLabel);
			}
			
			// We should also handle case were moving from a label column to a "*" column. In this case, the labels
			// should be removed.
			if (fromLabel != "*" && toLabel == "*") {
				var fromIndex = newLabels.indexOf(fromLabel);
				console.log("Fromindex: " + fromIndex);
				if (fromIndex != -1) {
					console.log("Remove issues from index " + fromIndex);
					newLabels.splice(fromIndex, 1);
				}
			}
			
			console.log("New labels:");
			console.log(newLabels);

			var data = {"labels": newLabels};

			// Let's analyze if the to-column defined an issue state (open/closed) and the issue is currently into a different state
			// If this case, we will close or re-open the issue.
			if (toColumnState != "" && issues[i].state != toColumnState) {
				// Ok, this is the case now.
				data = {"labels": newLabels, "state": toColumnState};
			}
			
			$.ajax({
				url: url,
				type: 'PATCH',
				data: JSON.stringify(data),
				success: function() { yoda.showSnackbarOk('Succesfully moved issue from "' + columnNameList[fromColumnNo] + '" to "' + columnNameList[toColumnNo] + '"', 5000); },
				error: function() { yoda.showSnackbarError("Failed to update issue."); },
				complete: function(jqXHR, textStatus) { updateIssues(); }
			});
			
			break;
		}
	}
}

function setupSortable() {
	$( ".cardsincolumn" ).sortable({
		items: '.card',
		connectWith: ".cardsincolumn",
		receive: function( event, ui ) {
			var url = ui.item[0].attributes.url.nodeValue;
			var fromColumn = ui.sender.attr('id');
			var toColumn = $(this).attr('id');
			handleIssueMove(url, fromColumn, toColumn);
		},
		start: function (event, ui) {
			console.log("Start drag");
		},
		stop:  function (event, ui) {
			console.log("Stop drag");
		},
		dropOnEmpty: true,
		helper: function(event, element) {
			return $(element).clone().addClass('dragging');
		},
	}).disableSelection();

	enableDisableSortable();
}

function drawKanban() {
	console.log("Draw kanban");

	// Clear any previous board info.
	$("#kanban").html("");
	
	issues = [];
	// Filter the issues based on labels
	// Look at all issues. For each issue, it must match all labels in the selected list of labels.
	for (var ri = 0; ri < repoIssues.length; ri++) {
		var labelsMatch = true;
		for (var il = 0; il < issueLabelFiltered.length; il++) {
			if (yoda.isLabelInIssue(repoIssues[ri], issueLabelFiltered[il]) == false) {
				labelsMatch = false;
				break;
			}
		}

		if (!labelsMatch)
			continue;

		// Ok, labels ok. What about assigee? Need to check full list....
		var assigneeMatch = false;
		var assignee = "unassigned";
		for (var as = 0; as < repoIssues[ri].assignees.length; as++) {
			assignee = repoIssues[ri].assignees[as].login;

			if (issueAssigneesFiltered.length == 0 || issueAssigneesFiltered.indexOf(assignee) != -1) {
				assigneeMatch = true;
				break;
			}
		}
		if (assigneeMatch || repoIssues[ri].assignees.length == 0) {
			// Ok, push it.
			issues.push(repoIssues[ri]);
		} else {
//			console.log("Dropping because of lack of assignee match.");
		}
	}
	
	// Ok, now we have into issues array the issues we would like to draw. Let's get them into appropriate columns.
	columnDefs = $("#columns").val().split(',');
	columnNameList = [];
	columnDefList = [];
	for (var c = 0; c < columnDefs.length; c++) {
		var columnName = columnDefs[c].split("]")[0].split("[")[1];
		columnNameList.push(columnName);
		var columnDef = columnDefs[c].split("]")[1];
		columnDefList.push(columnDef);
	}
	console.log(columnNameList);
	
	var columnTotalNoIssues = [];
	var columnTotalEstimate = [];
	var columnTotalRemaining = [];
	for (var c = 0; c < columnNameList.length; c++) {
		columnTotalEstimate[c] = 0;
		columnTotalNoIssues[c] = 0;
		columnTotalRemaining[c] = 0;
		
		$("#kanban").append(createColumn("column" + c, columnNameList[c]));
		console.log("Added column: column" + c + ", name: " + columnNameList[c]);
	}
	// Adjust width of kanban board
	$("#kanban").css("width", columnNameList.length * 310);
	
	// The createElement() method creates an Element Node with the specified name.
	//	Tip: Use the createTextNode() method to create a text node.
	for (var i = 0; i < issues.length; i++) {
		var cardResult = createCard(issues[i]);
		var card = cardResult[0];
		var estimate = cardResult[1];
		var remaining = cardResult[2];
		// Determine column to put card
		// In run 0, we will consider only full label match
		// In run 1, we will consider as well * label match
		for (var run = 0; run < 2; run++) {
			for (var c = 0; c < columnDefList.length; c++) {
				var columnLabel = columnDefList[c].split(":").splice(-1);

				var columnState = columnDefList[c].split(":")[0];
//				console.log("Columnstate = " + columnState + ", columnLabel: " + columnLabel + ",  issueState: " + issues[i].state);
				if (columnState != "open" && columnState != "closed")
					columnState = ""; // then it is not the open/closed state.

				// Does issue belong in this column? 
				if (((run == 1 && columnLabel == "*") || yoda.isLabelInIssue(issues[i], columnLabel)) && (columnState == "" || (columnState == issues[i].state))) {
					columnTotalNoIssues[c]++;
					columnTotalEstimate[c] += estimate;
					columnTotalRemaining[c] += remaining;

					switch (yoda.getEstimateInIssues()) {
					case 'inbody':
						$("#column" + c + "-total").html(columnTotalNoIssues[c] + " (" + columnTotalEstimate[c] + "/" + 	columnTotalRemaining[c] + ")");
						break;
					case 'noissues':
						$("#column" + c + "-total").html(columnTotalNoIssues[c]);
						break;
					case 'inlabels':
						$("#column" + c + "-total").html(columnTotalNoIssues[c] + " (" + columnTotalEstimate[c] + ")");
						break;
					}
						
					$("#column" + c).append(card);
					
					run = 2;
					break;
				}
			}
		}
	}
	
	setupSortable();
	yoda.updateUrl(getUrlParams());
}

// ----------------

function storeIssues(issues, milestoneIndex, myUpdateIssueActiveNo) {
	if (myUpdateIssueActiveNo < updateIssueActiveNo) {
		console.log("Update is not latest. Cancelling...");
		// I'm out of date. cancel
		return;
	}
	
	repoIssues = repoIssues.concat(issues);
	console.log("total number of issues now: "  + repoIssues.length);
	updateIssueLoop(milestoneIndex + 1, myUpdateIssueActiveNo);
}

var updateIssueActiveNo = 0;
function updateIssueLoop(milestoneIndex, myUpdateIssueActiveNo) {
	if (myUpdateIssueActiveNo < updateIssueActiveNo) {
		console.log("Update is not latest. Cancelling...");
		// I'm out of date. cancel
		return;
	}
	
	console.log("UpdateIssueLoop: " + milestoneIndex);
	if (milestoneIndex < milestoneListComplete.length) {
		var milestone = milestoneListComplete[milestoneIndex];
		var repo = yoda.getRepoFromMilestoneUrl(milestone.url);
	
		// Fixed. We let "All Milestones" => * retrieve all issues, even the ones without ANY milestone. 
		// We simply remove the milestone search parameter.
		var milestoneSearch = "&milestone=" + milestone.number;
		console.log("milestone.number: " + milestone.number);
		if (milestone.number == "*")
			milestoneSearch = "";

		if ($('#closedissues').is(":checked")) {		
			var getIssuesUrl = yoda.getGithubUrl() + "repos/" + $("#owner").val() + "/" + repo +
			"/issues?state=all" + milestoneSearch;
		} else {
			var getIssuesUrl = yoda.getGithubUrl() + "repos/" + $("#owner").val() + "/" + repo +
			"/issues?state=open" + milestoneSearch;
		}
//		console.log(getIssuesUrl);
		
		yoda.getLoop(getIssuesUrl, 1, [], function(data) {storeIssues(data, milestoneIndex, myUpdateIssueActiveNo)}, null);
	} else {
		// Requested (and received all issues).
		console.log("All issues (before filtering out pull requests): " + repoIssues.length);
		yoda.filterPullRequests(repoIssues);
		console.log("No issues (after filtering out pull requests): " + repoIssues.length);
		
		// Update list of possible labels
		updateIssueLabelList();
		
		// Update list of possible assignees 
		updateAssigneeList();

		drawKanban();
		updateIssueActiveNo;
	}
}

function updateIssues() {
	updateIssueActiveNo++;
	console.log("UpdateIssueActive: " + updateIssueActiveNo);
		
//	console.log("updateissues");
	// Ok, here we go. This is the tricky part.
	// We will get issues for all selected milestones for all selected repos.
	milestoneListComplete = [];
	
	for (var m = 0; m < milestoneList.length; m++) {
//		console.log("Updating issues for milestone: " + milestoneList[m]);

		for (var r = 0; r < repoList.length; r++) {
			if (milestoneList[m] == "All milestones") {
				var cheatMilestone = { url: "something/" + repoList[r] + "/milestone/1", number: "*"};
				milestoneListComplete.push(cheatMilestone);
			} else if (milestoneList[m] == "No milestone") {
				var cheatMilestone = { url: "something/" + repoList[r] + "/milestone/1", number: "none"};
				milestoneListComplete.push(cheatMilestone);
			} else {
//				console.log("  For repo: " + repoList[r]);
				// Need to find the milestone (the number)..
				for (var m1 = 0; m1 < repoMilestones[r].length; m1++) {
//					console.log(repoMilestones[r][m1].title);
					if (repoMilestones[r][m1].title == milestoneList[m]) {
						console.log("Need to get issues for " + repoList[r] + ", " + milestoneList[m] + ", which has number: " + repoMilestones[r][m1].number);
						milestoneListComplete.push(repoMilestones[r][m1]);
					}
				}
			}
		}
	}
	
	console.log("Total list of milestones for which to get issues");
	console.log(milestoneListComplete);
	
	repoIssues = [];
	
	updateIssueLoop(0, updateIssueActiveNo);
}

//----------------

function updateRepos() {
	yoda.updateReposAndGUI($("#owner").val(), "#repolist", "repolist", "yoda.repolist", null, null);
}

// -------------

function storeMilestones(milestones, repoIndex) {
	repoMilestones[repoIndex] = milestones;
	updateMilestones(repoIndex + 1);
}

var firstMilestoneShow = true;
function updateMilestones(repoIndex) {
	if (repoIndex == undefined) {
		repoIndex = 0;
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
		var selectMilestones = [];
		if (firstMilestoneShow) {
			firstMilestoneShow = false;
			var urlMilestoneList = yoda.decodeUrlParam(null, "milestonelist");
			if (urlMilestoneList != null) 
				selectMilestones = urlMilestoneList.split(",");
		}
		
		// Done getting milestones for all selected repos
		// Next, find common milestones and update milestones selector.
		$("#milestonelist").empty();
		commonMilestones = [];
		
		for (var r = 0; r < repoList.length; r++) {
			for (var m = 0; m < repoMilestones[r].length; m++) {
				var repoTitle = repoMilestones[r][m].title;
				
				if (commonMilestones.indexOf(repoTitle) == -1) {
					commonMilestones.push(repoTitle);
				}
			}
		}
		
		// Sort and add
		commonMilestones.sort();
		commonMilestones.unshift("All milestones");
		commonMilestones.unshift("No milestone");
		console.log("The common milestones are: " + commonMilestones);
		var milestonesSelected = false;
		for (var c = 0; c < commonMilestones.length; c++) {
			var selectMilestone = false;
			if (selectMilestones.indexOf(commonMilestones[c]) != -1) { 
				selectMilestone = true;
				milestonesSelected = true;
			}
			
			var newOption = new Option(commonMilestones[c], commonMilestones[c], selectMilestone, selectMilestone);
			$('#milestonelist').append(newOption);
		}
		
		if (milestonesSelected)
			$('#milestonelist').trigger('change');
	}
}

// --------------

function githubAuth() {
	console.log("Github authentisation: " + $("#user").val() + ", token: " + $("#token").val());
	yoda.gitAuth($("#user").val(), $("#token").val());
}

// --------------

