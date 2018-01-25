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

var commonMilestones = []; // Options for milestone selection (milestones in all repos).
var milestoneList = []; // selected milestones just the title
var milestoneListComplete = []; // selected milestones, full structure.


function getUrlParams() {
	var params = "owner=" + $("#owner").val();
	params += "&repolist=" + $("#repolist").val();
	return params;
}


// --------------
function githubAuth() {
	console.log("Github authentisation: " + $("#user").val() + ", token: " + $("#token").val());
	yoda.gitAuth($("#user").val(), $("#token").val());
}

// --------------

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
		// Clear milestone data
		repoIndex = 0;
		repoMilestones = []; 
		commonMilestones = []; 
		milestoneList = []; 
		milestoneListComplete = [];
		
		// Clear table here as well.
		var table = document.getElementById("milestonetable");
		table.innerHTML = "";
		
		$("newmilestonetitle").val("");
		$("newstartdate").val("YYYY-MM-DD");
		$("newduedate").val("YYYY-MM-DD");
		$("newburndownduedate").val("");
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
		console.log(repoMilestones);
		
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
		
		updateCompleteMilestoneList();
	}
}

function updateCompleteMilestoneList() {
	milestoneListComplete = [];

	for (var m = 0; m < milestoneList.length; m++) {
		for (var r = 0; r < repoList.length; r++) {
			// Need to find the milestone (the number)..
			for (var m1 = 0; m1 < repoMilestones[r].length; m1++) {
//				console.log(repoMilestones[r][m1].title);
				if (repoMilestones[r][m1].title == milestoneList[m]) {
//					console.log("Need to get issues for " + repoList[r] + ", " + milestoneList[m] + ", which has number: " + repoMilestones[r][m1].number);
					milestoneListComplete.push(repoMilestones[r][m1]);
				}
			}
		}
	}
}

// ---------

// Create a new milestone across all selected repositories.
function createMilestone() {
	// First a few basic checks.
	var title = $("#newmilestonetitle").val();
	if (title == "") {
		yoda.showSnackbarError("Title not set");
		return;
	}
	
	var startdate = $("#newstartdate").val();
	if (startdate == "YYYY-MM-DD") {
		yoda.showSnackbarError("Start date not set");
		return;
	}

	var duedate = $("#newduedate").val();
	if (duedate == "YYYY-MM-DD") {
		yoda.showSnackbarError("Due date not set");
		return;
	}


	// Note: Burndown due date not mandatory
	var burndownduedate = $("#burndownduedate").val();
	var description = "> startdate " + startdate;
	if (burndownduedate != "")
		description += "\n>burndownduedate " + burndownduedate;
	
	// Ok, now we are ready. We will create a milestone per repo.
	// Create it.
	for (var r = 0; r < repoList.length; r++) {
		var repoName = repoList[r];
		var createMilestoneUrl = yoda.getGithubUrl() + "repos/" + $("#owner").val() + "/" + repoName + "/milestones";
		console.log("createUrl: " + createMilestoneUrl);

		// example: { "title": "v1.0",  "description": "Tracking milestone for version 1.0",  "due_on": "2012-10-09T23:39:01Z"}

		var urlData = {
				"title": title,
				"description": description,
				due_on: duedate + "T23:59:59Z"
		};
	
		
		$.ajax({
			url: createMilestoneUrl,
			type: 'POST',
			data: JSON.stringify(urlData),
			success: function() { yoda.showSnackbarOk("Succesfully created milestone in " + repoName); },
			error: function() { yoda.showSnackbarError("Failed to create milestone in " + repoName); },
			complete: function(jqXHR, textStatus) {	updateMilestones(); }// update again, TBD
		});
	}
	
	selectMilestones += "," + title;
}

function displayRepoMilestones() {
	console.log("Redraw table");
	
	updateCompleteMilestoneList();
	
	// Idea is to draw table with fields:
	// Repository | milestone | Start-date | Due-date | Burnddown date | Capacity | Actions
	// ------------------------------------------------------------------------------
	// hpsp         SD 2.1.3    2018-01-01   2018-02-04 2018-01-31         80        (Update) (Copy/update to other repos).
	//
	// Total                                             sum
	
	// Start-date / due-date 
	
	// Start-date, due-date are capacity are input fields. You can input new data, then push (Update).
	
	// How to create new milestone (should copy to other repos create if not there? yes.).
	
	// Should we include description field as well? If so, of course capacity can be different, otherwise can be same, or?
	// Probably best NOT to!
	
	// Another question is whether the burndownduedate should be copied across along with start/due dates? It could be argued
	// that this is per repo... It should be aligned!
		
	// Find table
	var table = document.getElementById("milestonetable");
	table.innerHTML = "";

	var header = table.createTHead();
	var headerRow = header.insertRow();     

	var cell = headerRow.insertCell();
	cell.innerHTML = "<b>Repository</b>";

	var cell = headerRow.insertCell();
	cell.innerHTML = "<b>Milestone</b>";

	var cell = headerRow.insertCell();
	cell.innerHTML = "<b>Start Date</b>";

	var cell = headerRow.insertCell();
	cell.innerHTML = "<b>Due Date</b>";

	var cell = headerRow.insertCell();
	cell.innerHTML = "<b>Burndown Date</b>";

	var cell = headerRow.insertCell();
	cell.innerHTML = '<span id="capacityheader"></span>';

	var cell = headerRow.insertCell();
	cell.innerHTML = "<b>Actions</b>";
	
	table.appendChild(document.createElement('tbody'));
	var bodyRef = document.getElementById('milestonetable').getElementsByTagName('tbody')[0];
	
	// Build a special row for creating new milestones.
	var row = bodyRef.insertRow();

	cell = row.insertCell(); // repo, blank
	cell.innerHTML = "<i>All</i>";
	
	cell = row.insertCell();
	cell.innerHTML = '<input type="text" id="newmilestonetitle" size="20">';
	
	cell = row.insertCell();
	cell.innerHTML = '<input type="text" id="newstartdate" size="10" value="YYYY-MM-DD">';

	cell = row.insertCell();
	cell.innerHTML = '<input type="text" id="newduedate" size="10" value="YYYY-MM-DD">';
	
	cell = row.insertCell();
	cell.innerHTML = '<input type="text" id="newburndownduedate" size="10" value="">';

	cell = row.insertCell();
	cell.innerHTML = "";
	
	cell = row.insertCell();
	cell.innerHTML = '<button id="createbutton" onclick="createMilestone()" class="tablebutton">Create milestone</button>';
	
	var totalCapacity = 0;
	for (var m = 0; m < milestoneListComplete.length; m++) {
		var milestone = milestoneListComplete[m];
		var row = bodyRef.insertRow();
		
		var repo = yoda.getRepoFromMilestoneUrl(milestone.url);
		cell = row.insertCell();
		cell.innerHTML = repo;
		
		var title = milestone.title;
		cell = row.insertCell();
		cell.innerHTML = '<a href="' + milestone.html_url + '" target="_blank">' + title + '</a>';
		
		var startdate = yoda.getMilestoneStartdate(milestone.description);
		if (startdate == null)
			startdate = "";
		cell = row.insertCell();
		cell.innerHTML = '<input type="text" id="startdate" size="10" value="' + startdate + '">';

		var duedate = yoda.formatDate(new Date(milestone.due_on));
		cell = row.insertCell();
		cell.innerHTML = '<input type="text" id="duedate" size="10" value="' + duedate + '">';
		
		var burndownduedate = yoda.getMilestoneBurndownDuedate(milestone.description);
		if (burndownduedate == null)
			burndownduedate = "";
		cell = row.insertCell();
		cell.innerHTML = '<input type="text" id="burndownduedate" size="10" value="' + burndownduedate + '">';

		var capacity = yoda.getMilestoneCapacity(milestone.description);
		if (capacity != null)
			totalCapacity += parseInt(capacity);
		cell = row.insertCell();
		cell.innerHTML = "(capacity)";
		if (capacity != null)
			cell.innerHTML = '<input type="number" id="capacity" size="10" value="' + capacity + '">';
		else
			cell.innerHTML = '<input type="number" id="capacity" size="10">';
		
		cell = row.insertCell();
		cell.innerHTML = "(actions)";

	}
	$("#capacityheader").html('<span id="capacityheader"><b>Capacity (total ' + totalCapacity + ')</b></span>');
}