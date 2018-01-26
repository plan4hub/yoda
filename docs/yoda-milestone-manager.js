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
	params += "&milestonelist=" + $("#milestonelist").val();
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
		$("newstartdate").val("");
		$("newduedate").val("");
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
		displayRepoMilestones();
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
	var duedate = $("#newduedate").val();

	// Note: Burndown due date not mandatory
	var burndownduedate = $("#newburndownduedate").val();
	var description = $("#newdescription").val();
	
	var urlData = buildMilestoneUrlData(description, startdate, burndownduedate, "", duedate);
	urlData["title"] = title;
	
	// Ok, now we are ready. We will create a milestone per repo.
	// Create it.
	for (var r = 0; r < repoList.length; r++) {
		var repoName = repoList[r];
		var createMilestoneUrl = yoda.getGithubUrl() + "repos/" + $("#owner").val() + "/" + repoName + "/milestones";
		console.log("createUrl: " + createMilestoneUrl);

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

function buildMilestoneUrlData(description, startdate, burndownduedate, capacity, duedate) {
	var urlData = {};
	
	if (startdate != "")
		description += "\n> startdate " + startdate;
	
	if (burndownduedate != "")
		description += "\n> burndownduedate " + burndownduedate;
	
	if (capacity != "")
		description += "\n> capacity " + capacity;
	
	urlData["description"] = description;

	if (duedate != "")
		urlData["due_on"] = duedate + "T23:59:59Z";

	return urlData;
}

function updateMilestoneData(index) {
	var milestone = milestoneListComplete[index];
	console.log(milestone);
	var description = $("#description" + index).val();
	var startdate = $('#startdate' + index).val();
	var duedate = $('#duedate' + index).val();
	var burndownduedate = $('#burndownduedate' + index).val();
	var capacity = $('#capacity' + index).val();
	
	console.log("description: " + description + ", startdate: " + startdate + ", duedate: " + duedate + ", burndownduedate: " + burndownduedate + ", capacity: " + capacity);
	
	// Ok, let's prepare a PATCH request to update the data.
	
	var updateMilestoneUrl = milestone.url;
	console.log("updateUrl: " + updateMilestoneUrl);

	var urlData = buildMilestoneUrlData(description, startdate, burndownduedate, capacity, duedate);
	
	$.ajax({
		url: updateMilestoneUrl,
		type: 'PATCH',
		data: JSON.stringify(urlData),
		success: function() { yoda.showSnackbarOk("Succesfully updated milestone"); },
		error: function() { yoda.showSnackbarError("Failed to update milestone"); },
		complete: function(jqXHR, textStatus) {	/* NOP */ }
	});
}

function replicateMilestone(index) {
	var milestone = milestoneListComplete[index];
	console.log(milestone);
}

function displayRepoMilestones() {
	console.log("Redraw table");
	
	updateCompleteMilestoneList();
	
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
	cell.innerHTML = "<b>Description</b>";

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
	cell.innerHTML = '<input type="text" id="newdescription" size="60">';
	
	cell = row.insertCell();
	cell.innerHTML = '<input type="text" id="newstartdate" size="10" value="">';

	cell = row.insertCell();
	cell.innerHTML = '<input type="text" id="newduedate" size="10" value="">';
	
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
		
		cell = row.insertCell();
		cell.innerHTML = '<input type="text" id="description' + m + '" size="60" onchange="updateMilestoneData(' + m + ')" value="' + 
			yoda.getPureDescription(milestone.description) + '">';;

		var startdate = yoda.getMilestoneStartdate(milestone.description);
		if (startdate == null)
			startdate = "";
		cell = row.insertCell();
		cell.innerHTML = '<input type="text" id="startdate' + m + '" size="10" onchange="updateMilestoneData(' + m + ')" value="' + startdate + '">';

		var duedate = yoda.formatDate(new Date(milestone.due_on));
		cell = row.insertCell();
		cell.innerHTML = '<input type="text" id="duedate' + m + '" size="10" onchange="updateMilestoneData(' + m + ')" value="' + duedate + '">';
		
		var burndownduedate = yoda.getMilestoneBurndownDuedate(milestone.description);
		if (burndownduedate == null)
			burndownduedate = "";
		cell = row.insertCell();
		cell.innerHTML = '<input type="text" id="burndownduedate' + m + '" size="10" onchange="updateMilestoneData(' + m + ')" value="' + burndownduedate + '">';

		var capacity = yoda.getMilestoneCapacity(milestone.description);
		if (capacity != null)
			totalCapacity += parseInt(capacity);
		cell = row.insertCell();
		if (capacity == null)
			capacity = "";
		cell.innerHTML = '<input type="number" id="capacity' + m + '" size="5" onchange="updateMilestoneData(' + m + ')" value="' + capacity + '">';
		
		cell = row.insertCell();
		var html = '<button id="replicate" onclick="replicateMilestone(' + m + ')" class="tablebutton">Copy/Update</button>';
		console.log(html);
		cell.innerHTML = html;

	}
	$("#capacityheader").html('<span id="capacityheader"><b>Capacity (total ' + totalCapacity + ')</b></span>');
	
	yoda.updateUrl(getUrlParams());

}