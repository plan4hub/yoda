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

// Kanban issues datamodel
// Here we will store issues per repo
let repoList = [];  // selected repos
let repoMilestones = []; // Double-array of repos,milestone (full structure) for selected repos

let commonMilestones = []; // Options for milestone selection (milestones in all repos).
let milestoneList = []; // selected milestones just the title
let milestoneListComplete = []; // selected milestones, full structure.

let repoIssues = []; // List of issues. Full structure as returned from github.

let issueLabels = []; // List of labels found for all issues. (full structure)
let issueLabelFiltered = []; // selected labels (just names)
let issueLabelFilteredOr = []; // selected labels (just names)

let issueAssignees = []; // List of assignee found for all issues. (just names)
let issueAssigneesFiltered = []; // selected assignees (just names)

// Currently drawn board columns and definitions
let issues = []; // currently drawn issues.
let columnDefs = [];
let columnNameList = [];
let columnDefList = [];

function getUrlParams() {
	let params = "owner=" + $("#owner").val() + "&repolist=" + $("#repolist").val();
	if (yoda.getEstimateInIssues() != "inbody") 
		params += "&estimate=" + yoda.getEstimateInIssues();
	if ($("#milestonelist").val() != "")
		params += "&milestonelist=" + $("#milestonelist").val();
	if ($("#columns").val() != "[Urgent]open:S1 - Urgent,[High]open:S2 - High,[Medium]open:S3 - Medium,[Low]open:S4 - Low,[Other]open:*,[Closed]closed:*") 
		params += "&columns=" + $("#columns").val();
	if ($("#labellist").val() != "") 
		params += "&labellist=" + $("#labellist").val();
	if ($("#labellistor").val() != "") 
		params += "&labellistor=" + $("#labellistor").val();
	if ($("#assigneelist").val() != "")
		params += "&assigneelist=" + $("#assigneelist").val();

	["closedmilestones", "closedissues", "locked"].forEach((p) => {
		params = yoda.addIfNotDefault(params, p); });
	
	return params;
}

export function estimateClick(radio) {
	yoda.setEstimateInIssues(radio.value);
	drawKanban();
}

let firstLabelShow = true;
const urlLabelList = yoda.decodeUrlParam(null, "labellist");
const urlLabelOrList = yoda.decodeUrlParam(null, "labellistor");
export function updateIssueLabelList() {
	issueLabels = [];
	issueLabelFiltered = [];
	for (let i = 0; i < repoIssues.length; i++) {
		for (let l = 0; l < repoIssues[i].labels.length; l++) {
			const name = repoIssues[i].labels[l].name;
			let foundName = false;
			for (let is = 0; is < issueLabels.length; is++) {
				if (name == issueLabels[is].name) {
					foundName = true;
					break;
				}
			}
			if (foundName == false)
				issueLabels.push(repoIssues[i].labels[l]);
		}
	}

	issueLabels.sort(function(a,b) {
		return a.name > b.name? 1 : -1;
	});
	console.log(issueLabels);
	
	let selectLabels = [];
	let selectLabelsOr = [];
	if (firstLabelShow) {
		firstLabelShow = false;
	
		if (urlLabelList != null) 
			selectLabels = urlLabelList.split(",");
		if (urlLabelOrList != null)
			selectLabelsOr = urlLabelOrList.split(",");
	}
	
	// Now add to selection list (AND)
	$("#labellist").empty();
	let labelsSelected = false;
	for (let is = 0; is < issueLabels.length; is++) {
		let selectLabel = false;
		if (selectLabels.indexOf(issueLabels[is].name) != -1) {
			selectLabel = true;
			labelsSelected = true;
		}
		const newOption = new Option(issueLabels[is].name, issueLabels[is].name, selectLabel, selectLabel);
		$('#labellist').append(newOption);
	}
	
	if (labelsSelected) 
		$("#labellist").trigger('change');

	// Now add to selection list (OR)
	$("#labellistor").empty();
	labelsSelected = false;
	for (let is = 0; is < issueLabels.length; is++) {
		let selectLabel = false;
		if (selectLabelsOr.indexOf(issueLabels[is].name) != -1) {
			selectLabel = true;
			labelsSelected = true;
		}
		const newOption = new Option(issueLabels[is].name, issueLabels[is].name, selectLabel, selectLabel);
		$('#labellistor').append(newOption);
	}
	
	if (labelsSelected) 
		$("#labellistor").trigger('change');
}

let firstAssigneeShow = true;
const urlAssigneeList = yoda.decodeUrlParam(null, "assigneelist");
export function updateAssigneeList() {
	console.log("updateAssigneeList. first=" + firstAssigneeShow);
	issueAssignees = []; 
	issueAssigneesFiltered = []; 
	
	for (let i = 0; i < repoIssues.length; i++) {
		for (let as = 0; as < repoIssues[i].assignees.length; as++) {
			const assignee = repoIssues[i].assignees[as].login;
			
			if (issueAssignees.indexOf(assignee) == -1)
				issueAssignees.push(assignee);
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
	let assigneeSelected = false;
	for (let a = 0; a < issueAssignees.length; a++) {
		let selectAssignee = false;
		if (selectAssigneeList.indexOf(issueAssignees[a]) != -1) {
			selectAssignee = true;
			assigneeSelected = true;
		}
		
		const newOption = new Option(issueAssignees[a], issueAssignees[a], selectAssignee, selectAssignee);
		$('#assigneelist').append(newOption);
	}
	
	if (assigneeSelected)
		$('#assigneelist').trigger('change');
}

export function getMilestoneTitle(issue) {
	if (issue.milestone == null)
		return "";
	
	for (let r = 0; r < repoList.length; r++) {
		for (let m = 0; m < repoMilestones[r].length; m++) {
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
	let card = $('<div class="card"></div>');
	card.attr("url", issue.url);
	let cardRef;
	if (issue.closed_at != null)
		cardRef = $('<a class="cardlink" style="text-decoration: line-through;" target="_blank" href="' + issue.html_url + '">' + issue.title + '</a>');		
	else
		cardRef = $('<a class="cardlink" target="_blank" href="' + issue.html_url + '">' + issue.title + '</a>');
	card.append(cardRef);
	
	const repo = yoda.getUrlRepo(issue.url);
	let assignText;
	if (issue.assignees.length > 0) {
		assignText = "";
		for (let as = 0; as < issue.assignees.length; as++) {
			if (assignText != "") 
				assignText += " ";
			assignText += '<a href="' + issue.assignees[as].html_url + '" target="_blank">' + issue.assignees[as].login + '</a>';
		}
	} else {
		assignText = "<i>unassigned</i>";
	}

	// TODO: Enhance graphically.. 
	let estimateText = "";
	let estimate = 0;
	let remaining = 0;
	if (yoda.getEstimateInIssues() != "noissues") {
		estimate = yoda.issueEstimate(issue);
		if (estimate != 0) {
			remaining = yoda.issueRemaining(issue, estimate);
			if (remaining != estimate)
				estimateText = " (" + estimate + "/" + remaining + ")";
			else
				estimateText = " (" + estimate + ")";
		}
	}
	const issueRef = '<a href="' + issue.html_url + '" target="_blank">' + repo + "#" + issue.number + '</a>';
	
	const smallRef = $('<small>' + issueRef + ' ' + getMilestoneTitle(issue) + ' ' + assignText + ' ' + estimateText + '</small>');
	card.append(smallRef);

	let cardLabels = $('<span class="cardlabels"></span>');
	for (let l = 0; l < issue.labels.length; l++) {
		const cardLabel = $('<span class="cardlabel">' + issue.labels[l].name + '</span>');
		cardLabel.css('background', '#' + issue.labels[l].color);  
		cardLabel.css('color', yoda.bestForeground(issue.labels[l].color));
		cardLabels.append(cardLabel);
	}
	card.append(cardLabels);
	return [card, estimate, remaining];
}

let issueTabs = [];
export function tabOpenCloseIssues(c) {
	console.log("tabOpenCloseIssues: " + c);

	if (issueTabs[c].length > 0) {
		// Close
		for (let i = 0; i < issueTabs[c].length; i++)
			issueTabs[c][i].close();
		issueTabs[c] = [];
	} else {
		// Open
		for (let i = 0; i < columnUrls[c].length; i++) {
			console.log("  Opening " + columnUrls[c][i])
			const tabId = window.open(columnUrls[c][i]);
			issueTabs[c].push(tabId);
		}
	}
}

// Create the HTML representation for a new column
export function createColumn(c, columnId, columnName) {
	const openFunc = 'tabOpenCloseIssues(' + c + ')';
	console.log(openFunc);
	const column = $(
			'<div class="cardcolumn">' +
				'<div id="' + columnId + '" class="cardsincolumn">' +
					'<div id ="' + columnId + '-header" class="columnheader"><button onclick=' + openFunc + '>' + columnName + '</button>' +
					'<div id ="' + columnId + '-total" style="float: right"></div>' + 
					'</div>' +
				'</div>' +
			'</div>');
	return column;
}

export function enableDisableSortable() {
	if ($('#locked').is(":checked"))
		$( ".cardsincolumn" ).sortable("disable");
	else
		$( ".cardsincolumn" ).sortable("enable");
	yoda.updateUrl(getUrlParams());
}

export function handleIssueMove(url, fromColumn, toColumn) {
	const fromColumnNo = parseInt(fromColumn.substring(6));
	const toColumnNo = parseInt(toColumn.substring(6));
	console.log("Move card " + url + " from " + fromColumn + " (" + fromColumnNo + ") to " + toColumn + " (" + toColumnNo + ")");
	
	let toColumnState = columnDefList[toColumnNo].split(":")[0];
	if (toColumnState != "open" && toColumnState != "closed")
		toColumnState = ""; // then it is not the open/closed state.
	
	// First, let's find the issue in our list.
	for (let i = 0; i < issues.length; i++) {
		if (issues[i].url == url) {
			console.log("Found issue. It is at index " + i);
			
			console.log("Labels:");
			console.log(issues[i].labels);

			let newLabels = [];
			for (let l = 0; l < issues[i].labels.length; l++)
				newLabels.push(issues[i].labels[l].name);
			
			// We need to potentially remove label for the column we come from (unless final is *)
			const fromDef = columnDefList[fromColumnNo];
			const fromLabel = fromDef.split(":").splice(-1)[0];
			console.log(fromDef + "," + fromLabel);
			
			// Then we need to potentially add label for the column we are moving to (unless final is *)
			const toDef = columnDefList[toColumnNo];
			const toLabel = toDef.split(":").splice(-1)[0];
			console.log(toDef + "," + toLabel);

			if (fromLabel != "*" && toLabel != "*") {
				const fromIndex = newLabels.indexOf(fromLabel);
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
				for (let c = 0; c < columnDefs.length; c++) {
					if (c == toColumnNo)
						continue;
					const cDef = columnDefs[c].split("]")[1];
					const cLabel = cDef.split(":").splice(-1)[0];
					
					const lIndex = newLabels.indexOf(cLabel);
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
				const fromIndex = newLabels.indexOf(fromLabel);
				console.log("Fromindex: " + fromIndex);
				if (fromIndex != -1) {
					console.log("Remove issues from index " + fromIndex);
					newLabels.splice(fromIndex, 1);
				}
			}
			
			console.log("New labels:");
			console.log(newLabels);

			let data = {"labels": newLabels};

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
				// eslint-disable-next-line no-unused-vars
				complete: function(jqXHR, textStatus) { updateIssues(); }
			});
			
			break;
		}
	}
}

export function setupSortable() {
	$( ".cardsincolumn" ).sortable({
		items: '.card',
		connectWith: ".cardsincolumn",
		receive: function( event, ui ) {
			const url = ui.item[0].attributes.url.nodeValue;
			const fromColumn = ui.sender.attr('id');
			const toColumn = $(this).attr('id');
			handleIssueMove(url, fromColumn, toColumn);
		},
		// eslint-disable-next-line no-unused-vars
		start: function (event, ui) {
			console.log("Start drag");
		},
		// eslint-disable-next-line no-unused-vars
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

let columnUrls = [];
export function drawKanban() {
	console.log("Draw kanban");

	// Clear any previous board info.
	$("#kanban").html("");
	
	issues = [];
	// Filter the issues based on labels
	// Look at all issues. For each issue, it must match all labels in the selected list of labels.
	for (let ri = 0; ri < repoIssues.length; ri++) {
		let labelsMatch = true;
		for (let il = 0; il < issueLabelFiltered.length; il++) {
			if (yoda.isLabelInIssue(repoIssues[ri], issueLabelFiltered[il]) == false) {
				labelsMatch = false;
				break;
			}
		}

		if (!labelsMatch)
			continue;
			
		// Ok, if we have labels for OR filtering?
		if (issueLabelFilteredOr.length > 0) {
			labelsMatch = false;
			for (let il = 0; il < issueLabelFilteredOr.length; il++) {
				if (yoda.isLabelInIssue(repoIssues[ri], issueLabelFilteredOr[il]) == true) {
					labelsMatch = true;
					break;
				}
			}
		}
		if (!labelsMatch)
			continue;
			
		// Ok, labels ok. What about assigee? Need to check full list....
		let assigneeMatch = false;
		let assignee = "unassigned";
		for (let as = 0; as < repoIssues[ri].assignees.length; as++) {
			assignee = repoIssues[ri].assignees[as].login;

			if (issueAssigneesFiltered.length == 0 || issueAssigneesFiltered.indexOf(assignee) != -1) {
				assigneeMatch = true;
				break;
			}
		}
		if (assigneeMatch || issueAssigneesFiltered.length == 0) {
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
	for (let c = 0; c < columnDefs.length; c++) {
		const columnName = columnDefs[c].split("]")[0].split("[")[1];
		columnNameList.push(columnName);
		const columnDef = columnDefs[c].split("]")[1];
		columnDefList.push(columnDef);
	}
	console.log(columnNameList);
	
	let columnTotalNoIssues = [];
	let columnTotalEstimate = [];
	let columnTotalRemaining = [];
	for (let c = 0; c < columnNameList.length; c++) {
		columnTotalEstimate[c] = 0;
		columnTotalNoIssues[c] = 0;
		columnTotalRemaining[c] = 0;
		columnUrls[c] = [];
		issueTabs[c] = [];
		
		$("#kanban").append(createColumn(c, "column" + c, columnNameList[c]));
		console.log("Added column: column" + c + ", name: " + columnNameList[c]);
	}
	// Adjust width of kanban board
	$("#kanban").css("width", columnNameList.length * 310);
	
	// The createElement() method creates an Element Node with the specified name.
	//	Tip: Use the createTextNode() method to create a text node.
	for (let i = 0; i < issues.length; i++) {
		const cardResult = createCard(issues[i]);
		const card = cardResult[0];
		const estimate = cardResult[1];
		const remaining = cardResult[2];
		// Determine column to put card
		// In run 0, we will consider only full label match
		// In run 1, we will consider as well * label match
		for (let run = 0; run < 2; run++) {
			for (let c = 0; c < columnDefList.length; c++) {
				const columnLabel = columnDefList[c].split(":").splice(-1);
				let columnState = columnDefList[c].split(":")[0];
//				console.log("Columnstate = " + columnState + ", columnLabel: " + columnLabel + ",  issueState: " + issues[i].state);
				if (columnState != "open" && columnState != "closed")
					columnState = ""; // then it is not the open/closed state.

				// Does issue belong in this column? 
				if (((run == 1 && columnLabel == "*") || yoda.isLabelInIssue(issues[i], columnLabel)) && (columnState == "" || (columnState == issues[i].state))) {
					columnTotalNoIssues[c]++;
					columnTotalEstimate[c] += estimate;
					columnTotalRemaining[c] += remaining;
					columnUrls[c].push(issues[i].html_url);
					
					columnTotalEstimate[c] = yoda.strip2Digits(columnTotalEstimate[c]);
					columnTotalRemaining[c] = yoda.strip2Digits(columnTotalRemaining[c]);

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

	// Set-up scroll / sticky stuff
	window.onscroll = function () {
		if (window.pageYOffset > 141)
			$(".columnheader").addClass("stickycolheader")
		else
			$(".columnheader").removeClass("stickycolheader")
	};

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
		const milestone = milestoneListComplete[milestoneIndex];
		const repo = yoda.getRepoFromMilestoneUrl(milestone.url);
	
		// Fixed. We let "All Milestones" => * retrieve all issues, even the ones without ANY milestone. 
		// We simply remove the milestone search parameter.
		let milestoneSearch = "&milestone=" + milestone.number;
		console.log("milestone.number: " + milestone.number);
		if (milestone.number == "*")
			milestoneSearch = "";

		let getIssuesUrl;
		if ($('#closedissues').is(":checked"))
			getIssuesUrl = yoda.getGithubUrl() + "repos/" + $("#owner").val() + "/" + repo + "/issues?state=all" + milestoneSearch;
		else
			getIssuesUrl = yoda.getGithubUrl() + "repos/" + $("#owner").val() + "/" + repo + "/issues?state=open" + milestoneSearch;
		
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

export function updateIssues() {
	updateIssueActiveNo++;
	console.log("UpdateIssueActive: " + updateIssueActiveNo);
		
//	console.log("updateissues");
	// Ok, here we go. This is the tricky part.
	// We will get issues for all selected milestones for all selected repos.
	milestoneListComplete = [];
	
	for (let m = 0; m < milestoneList.length; m++) {
//		console.log("Updating issues for milestone: " + milestoneList[m]);

		for (let r = 0; r < repoList.length; r++) {
			let cheatMilestone;
			if (milestoneList[m] == "All milestones") {
				cheatMilestone = { url: "something/" + repoList[r] + "/milestone/1", number: "*"};
				milestoneListComplete.push(cheatMilestone);
			} else if (milestoneList[m] == "No milestone") {
				cheatMilestone = { url: "something/" + repoList[r] + "/milestone/1", number: "none"};
				milestoneListComplete.push(cheatMilestone);
			} else {
//				console.log("  For repo: " + repoList[r]);
				// Need to find the milestone (the number)..
				for (let m1 = 0; m1 < repoMilestones[r].length; m1++) {
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

export function updateRepos() {
	yoda.updateReposAndGUI($("#owner").val(), "#repolist", "repolist", "yoda.repolist", null, null);
}

// -------------

export function storeMilestones(milestones, repoIndex) {
	repoMilestones[repoIndex] = milestones;
	updateMilestones(repoIndex + 1);
}

var firstMilestoneShow = true;
export function updateMilestones(repoIndex) {
	if (repoIndex == undefined)
		repoIndex = 0;
	
	if (repoIndex < repoList.length) {
		let getMilestonesUrl;
		if ($('#closedmilestones').is(":checked"))
			getMilestonesUrl = yoda.getGithubUrl() + "repos/" + $("#owner").val() + "/" + repoList[repoIndex] + "/milestones?state=all";
		else
			getMilestonesUrl = yoda.getGithubUrl() + "repos/" + $("#owner").val() + "/" + repoList[repoIndex] + "/milestones?state=open";
		console.log("Milestone get URL: " + getMilestonesUrl);
		
		yoda.getLoop(getMilestonesUrl, 1, [], function(data) {storeMilestones(data, repoIndex);}, null);
	} else {
		let selectMilestones = [];
		if (firstMilestoneShow) {
			firstMilestoneShow = false;
			let urlMilestoneList = yoda.decodeUrlParam(null, "milestonelist");
			if (urlMilestoneList != null) 
				selectMilestones = urlMilestoneList.split(",");
		}
		
		// Done getting milestones for all selected repos
		// Next, find common milestones and update milestones selector.
		$("#milestonelist").empty();
		commonMilestones = [];
		
		for (let r = 0; r < repoList.length; r++) {
			for (let m = 0; m < repoMilestones[r].length; m++) {
				const repoTitle = repoMilestones[r][m].title;
				if (commonMilestones.indexOf(repoTitle) == -1)
					commonMilestones.push(repoTitle);
			}
		}
		
		// Sort and add
		commonMilestones.sort();
		commonMilestones.unshift("All milestones");
		commonMilestones.unshift("No milestone");
		console.log("The common milestones are: " + commonMilestones);
		let milestonesSelected = false;
		for (let c = 0; c < commonMilestones.length; c++) {
			let selectMilestone = false;
			if (selectMilestones.indexOf(commonMilestones[c]) != -1) { 
				selectMilestone = true;
				milestonesSelected = true;
			}
			
			const newOption = new Option(commonMilestones[c], commonMilestones[c], selectMilestone, selectMilestone);
			$('#milestonelist').append(newOption);
		}
		
		if (milestonesSelected)
			$('#milestonelist').trigger('change');
	}
}


// --------------

export function init() {
	// Enable yodamenu
	yoda.enableMenu("#kanban-board");

	yoda.getDefaultLocalStorage("#owner", "yoda.owner");
	// yoda.getDefaultLocalStorage("#repo", "yoda.repo");
	yoda.decodeParamRadio('estimate', yoda.getDefaultLocalStorageValue("yoda.estimate"));

	yoda.decodeUrlParam("#owner", "owner");
	// yoda.decodeUrlParam("#repo", "repo");
	yoda.decodeUrlParamRadio("estimate", "estimate");
	yoda.updateEstimateRadio();

	// Local storage
	yoda.getUserTokenLocalStorage("#user", "#token");

	// Do it after getting from localStorage
	yoda.decodeUrlParam("#user", "user");
	yoda.decodeUrlParam("#token", "token");
	
	yoda.decodeUrlParamBoolean("#closedmilestones", "closedmilestones");
	yoda.decodeUrlParamBoolean("#closedissues", "closedissues");
	yoda.decodeUrlParamBoolean("#locked", "locked");
			
	// Login
	console.log("Github authentisation: " + $("#user").val() + ", token: " + $("#token").val());
	yoda.gitAuth($("#user").val(), $("#token").val());

	// Event listeners
	$("#hamburger").on("click", yoda.menuClick);

	// We do not want caching here. 
	$.ajaxSetup({ cache: false });
	
	$(document).ready(function() {
		$('#repolist').select2({
			// minimumInputLength: 2,
			sorter: yoda.select2Sorter,
			matcher: yoda.select2Matcher
		});
		$('#repolist').on('select2:select', yoda.select2SelectEvent('#repolist')); 
		$('#milestonelist').select2();
		$('#assigneelist').select2();
		$('#labellist').select2();
		$('#labellistor').select2();
		$('#columns').select2({tags:true});

		// Special handling for columns URL arg
		let columns = yoda.GetURLParameter("columns");
		if (columns == null) 
			columns = yoda.getDefaultLocalStorageValue("yoda.kanban.columns");
		if (columns != null) {
			// Set the value, creating a new option if necessary
			if ($('#columns').find("option[value='" + columns + "']").length) {
				$('#columns').val(columns).trigger('change');
			} else { 
				var newOption = new Option(columns, columns, true, true);
				$('#columns').append(newOption).trigger('change');
			} 
		}
					
		// eslint-disable-next-line no-unused-vars
		$('#repolist').on('change.select2', function (e) {
			repoList = 	$("#repolist").val();			
			console.log("List of selected repos is now: " + repoList);
			updateMilestones();
		});
		
		// eslint-disable-next-line no-unused-vars
		$('#milestonelist').on('change.select2', function (e) {
			milestoneList = $("#milestonelist").val();
			
			console.log("List of selected milestones is now: " + milestoneList);
			updateIssues();
		});
		
		$('#milestonelist').on('select2:select', function (e) {
			let data = e.params.data;
			console.log("selected item: " + data.text);
			
			// If "All milestones" or "No milestones" option selected, clear all other milestones. 
			if (data.text == "All milestones") {
				$("#milestonelist").val(["All milestones"]);
				$("#milestonelist").trigger("change");
			}
			
			if (data.text == "No milestone") {
				$("#milestonelist").val(["No milestone"]);
				$("#milestonelist").trigger("change");
			}
		});
		
		// eslint-disable-next-line no-unused-vars
		$('#labellist').on('change.select2', function (e) {
			issueLabelFiltered = $("#labellist").val();			
			console.log("List of selected labels is now: " + issueLabelFiltered);
			drawKanban();
		});
		
		// eslint-disable-next-line no-unused-vars
		$('#labellistor').on('change.select2', function (e) {
			issueLabelFilteredOr = $("#labellistor").val();			
			console.log("List of selected labels (OR) is now: " + issueLabelFilteredOr);
			drawKanban();
		});

		// eslint-disable-next-line no-unused-vars
		$('#assigneelist').on('change.select2', function (e) {
			issueAssigneesFiltered = $("#assigneelist").val();			
			console.log("List of selected assignees: " + issueAssigneesFiltered);
			drawKanban();
		});

		// eslint-disable-next-line no-unused-vars
		$('#columns').on('change.select2', function (e) {
			drawKanban();
		});
		
		updateRepos();
	});
}
