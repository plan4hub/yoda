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

function buildMilestoneUrlData(description, startdate, burndownduedate, capacity, duedate, state, info) {
	var urlData = {};
	
	if ((info != "") && (info != null))
		description += "\n> info " + info;
	
	if ((startdate != "") && (startdate != null))
		description += "\n> startdate " + startdate;
	
	if ((burndownduedate != "") && (burndownduedate != null))
		description += "\n> burndownduedate " + burndownduedate;
	
	if ((capacity != "") && (capacity != null))
		description += "\n> capacity " + capacity;
	
	urlData["description"] = description;

	if (duedate != "")
		urlData["due_on"] = duedate + "T23:59:59Z";
	
	if (state != undefined)
		urlData["state"] = state;
	

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
	var state = $('#state' + index).val();
	var info = $('#info' + index).val();
	
	console.log("description: " + description + ", startdate: " + startdate + ", duedate: " + duedate + ", burndownduedate: " + burndownduedate + ", capacity: " + 
			capacity + ", state:" + state + ", info:" + info);
	
	// Ok, let's prepare a PATCH request to update the data.
	var updateMilestoneUrl = milestone.url;
	console.log("updateUrl: " + updateMilestoneUrl);

	var urlData = buildMilestoneUrlData(description, startdate, burndownduedate, capacity, duedate, state, info);
	
	$.ajax({
		url: updateMilestoneUrl,
		type: 'PATCH',
		data: JSON.stringify(urlData),
		success: function() { yoda.showSnackbarOk("Succesfully updated milestone"); milestoneListComplete[index].description = urlData.description;},
		error: function() { yoda.showSnackbarError("Failed to update milestone"); },
		complete: function(jqXHR, textStatus) {	/* NOP */ }
	});
}

function replicateMilestone(index) {
	var milestone = milestoneListComplete[index];
	console.log(milestone);
	
	var description = $("#description" + index).val();
	var startdate = $('#startdate' + index).val();
	var duedate = $('#duedate' + index).val();
	var burndownduedate = $('#burndownduedate' + index).val();
	var state = $('#state' + index).val();
	
	console.log("description: " + description + ", startdate: " + startdate + ", duedate: " + duedate + ", burndownduedate: " + burndownduedate + ", state:" + state);
	
	// Need to loop through selected repos, and look for milestone (based on title).
	// If it exists, we do a PATCH request to update description and dates (not capacity! and not info!)
	// If it does not exists, we will do a POST request to create milestone.
	var noCalls = 0;
	for (var r = 0; r < repoList.length; r++) {
		if (repoList[r] == yoda.getRepoFromMilestoneUrl(milestone.url)) {
			continue;
		}

		// Find the entry in completeMilestones.
		// Need to find the milestone (the number)..
		var existingIndex = -1;
		for (var m = 0; m < milestoneListComplete.length; m++) {
			if ((repoList[r] == yoda.getRepoFromMilestoneUrl(milestoneListComplete[m].url)) && (milestone.title == milestoneListComplete[m].title)) {
				existingIndex = m;
				break;
			}
		}

		// Need to keep capacity
		if (existingIndex != -1) {
			var capacity = yoda.getMilestoneCapacity(milestoneListComplete[m].description);
			var info = yoda.getMilestoneInfo(milestoneListComplete[m].description);
		} else {
			var capacity = null;
			var info = null;
		}
		var urlData = buildMilestoneUrlData(description, startdate, burndownduedate, capacity, duedate, state, info);
		console.log(urlData);

		// Ok, let's see. Does milestone already exist
		if (existingIndex == -1) {
			console.log("Need to create new milestone " + milestone.title + " in " + repoList[r] + " repository.");
			var operation = 'POST';
			var milestoneUrl = yoda.getGithubUrl() + "repos/" + $("#owner").val() + "/" + repoList[r] + "/milestones";
			urlData["title"] = milestone.title;
		} else {
			console.log("Need to update existing milestone " + milestone.title + " in " + repoList[r] + " repository.");
			var milestoneUrl = milestoneListComplete[existingIndex].url;
			var operation = 'PATCH';
		}
		
		console.log("milestoneURL: " + milestoneUrl);
		noCalls++;

		$.ajax({
			url: milestoneUrl,
			type: operation,
			data: JSON.stringify(urlData),
			success: function() { yoda.showSnackbarOk("Succesfully created/updated milestone"); },
			error: function() { yoda.showSnackbarError("Failed to create/update milestone"); },
			complete: function(jqXHR, textStatus) {	noCalls--; if (noCalls == 0) updateMilestones(); }
		});
	}
	
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
	cell.innerHTML = "<b>State</b>";
	
	var cell = headerRow.insertCell();
	cell.innerHTML = "<b>Description</b>";
	
	var cell = headerRow.insertCell();
	cell.innerHTML = "<b>Info</b>";

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
	cell.innerHTML = "";

	cell = row.insertCell();
	cell.innerHTML = '<input type="text" id="newdescription" size="30">';
	
	cell = row.insertCell();
	cell.innerHTML = "";

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
		cell.innerHTML = '<select id="state' + m + '" onchange="updateMilestoneData(' + m + ')"><option selected value="open">open</option><option value="closed">closed</option></select>';
		$('#state' + m ).val(milestone.state);
	
		cell = row.insertCell();
		cell.innerHTML = '<input type="text" id="description' + m + '" size="30" onchange="updateMilestoneData(' + m + ')" value="' + 
			yoda.getPureDescription(milestone.description) + '">';

		cell = row.insertCell();
		cell.innerHTML = '<input type="text" id="info' + m + '" size="30" onchange="updateMilestoneData(' + m + ')" value="' + 
			yoda.getMilestoneInfo(milestone.description) + '">';
			
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