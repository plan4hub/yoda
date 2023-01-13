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

import * as yoda from './yoda-utils.js'

let repoList = [];  // selected repos
let repoMilestones = []; // Double-array of repos,milestone (full structure) for selected repos

let commonMilestones = []; // Options for milestone selection (milestones in all repos).
let milestoneList = []; // selected milestones just the title
let milestoneListComplete = []; // selected milestones, full structure.
// eslint-disable-next-line no-unused-vars
let selectMilestones = [];

function getUrlParams() {
	let params = "owner=" + $("#owner").val();
	params += "&repolist=" + $("#repolist").val();
	params += "&milestonelist=" + $("#milestonelist").val();
	if ($('#closedmilestones').is(":checked")) 
		params += "&closedmilestones=true";
	return params;
}

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
		const table = document.getElementById("milestonetable");
		table.innerHTML = "";
		
		$("newmilestonetitle").val("");
		$("newstartdate").val("");
		$("newduedate").val("");
		$("newburndownduedate").val("");
	}
	
	if (repoIndex < repoList.length) {
		let getMilestonesUrl;
		if ($('#closedmilestones').is(":checked")) 
			getMilestonesUrl = yoda.getGithubUrl() + "repos/" + $("#owner").val() + "/" + repoList[repoIndex] + "/milestones?state=all";
		else 
			getMilestonesUrl = yoda.getGithubUrl() + "repos/" + $("#owner").val() + "/" + repoList[repoIndex] + "/milestones?state=open";
		console.log("Milestone get URL: " + getMilestonesUrl);
		
		yoda.getLoop(getMilestonesUrl, 1, [], function(data) {storeMilestones(data, repoIndex);}, null);
	} else {
		console.log(repoMilestones);
		
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
		console.log("The common milestones are: " + commonMilestones);
		
		const milestoneListUrl = yoda.decodeUrlParam(null, "milestonelist");
		console.log("milestoneListUrl: " + milestoneListUrl);

		let milestonesSelected = false;
		for (let c = 0; c < commonMilestones.length; c++) {
			let selectMilestone = false;
			if (firstMilestoneShow && 
				((milestoneListUrl != null && milestoneListUrl.indexOf("*") != -1 && yoda.select2MatchHelper(milestoneListUrl, commonMilestones[c])) ||
				(milestoneListUrl != null && milestoneListUrl.indexOf("*") == -1 && milestoneListUrl.indexOf(commonMilestones[c]) != -1))) {
				selectMilestone = true;
				milestonesSelected = true;
			}
			
			const newOption = new Option(commonMilestones[c], commonMilestones[c], selectMilestone, selectMilestone);
			$('#milestonelist').append(newOption);
		}
		
		if (milestonesSelected)
			$('#milestonelist').trigger('change');
		
		updateCompleteMilestoneList();
		displayRepoMilestones();
		
		firstMilestoneShow = false;
	}
}

function updateCompleteMilestoneList() {
	milestoneListComplete = [];

	for (let m = 0; m < milestoneList.length; m++) {
		for (let r = 0; r < repoList.length; r++) {
			// Need to find the milestone (the number)..
			for (let m1 = 0; m1 < repoMilestones[r].length; m1++) {
				if (repoMilestones[r][m1].title == milestoneList[m])
					milestoneListComplete.push(repoMilestones[r][m1]);
			}
		}
	}
}

// Create a new milestone across all selected repositories.
// eslint-disable-next-line no-unused-vars
function createMilestone() {
	// First a few basic checks.
	const title = $("#newmilestonetitle").val();
	if (title == "") {
		yoda.showSnackbarError("Title not set");
		return;
	}
	
	const startdate = $("#newstartdate").val();
	const duedate = $("#newduedate").val();

	// Note: Burndown due date not mandatory
	const burndownduedate = $("#newburndownduedate").val();
	const description = $("#newdescription").val();
	
	let urlData = buildMilestoneUrlData(description, startdate, burndownduedate, "", "", duedate);
	urlData["title"] = title;
	
	// Ok, now we are ready. We will create a milestone per repo.
	// Create it.
	for (let r = 0; r < repoList.length; r++) {
		const repoName = repoList[r];
		const createMilestoneUrl = yoda.getGithubUrl() + "repos/" + $("#owner").val() + "/" + repoName + "/milestones";
		console.log("createUrl: " + createMilestoneUrl);

		$.ajax({
			url: createMilestoneUrl,
			type: 'POST',
			data: JSON.stringify(urlData),
			success: function() { yoda.showSnackbarOk("Succesfully created milestone in " + repoName); },
			error: function() { yoda.showSnackbarError("Failed to create milestone in " + repoName); },
			// eslint-disable-next-line no-unused-vars
			complete: function(jqXHR, textStatus) {	updateMilestones(); }// update again, TBD
		});
	}
	
	selectMilestones += "," + title;
}

function buildMilestoneUrlData(description, startdate, burndownduedate, capacity, ed, duedate, state, info, subteamCapacity, subteamED) {
	let urlData = {};
	
	if (!description.endsWith("\n"))
		description += "\n";
	
	if ((info != "") && (info != null))
		description += "> info " + info + "\n";
	
	if ((startdate != "") && (startdate != null))
		description += "> startdate " + startdate + "\n";
	
	if ((burndownduedate != "") && (burndownduedate != null))
		description += "> burndownduedate " + burndownduedate + "\n";
	
	if ((capacity != "") && (capacity != null))
		description += "> capacity " + capacity + "\n";
	
	if ((ed != "") && (ed != null))
		description += "> ed " + ed + "\n";
		
	if ((subteamCapacity != "") && (subteamCapacity != null))
		description += subteamCapacity.replace(/^$/mg, "").replace(/^(.+)$/mg, "> subteam-capacity $1");
	
	if ((subteamED != "") && (subteamED != null)) {
		if (!description.endsWith("\n"))
			description += "\n";
		description += subteamED.replace(/^$/mg, "").replace(/^(.+)$/mg, "> subteam-ed $1");
	}
	
	urlData["description"] = description;
	if (duedate != "")
		urlData["due_on"] = duedate + "T23:59:59Z";
	
	if (state != undefined)
		urlData["state"] = state;

	return urlData;
}

export function updateMilestoneData(index) {
	const milestone = milestoneListComplete[index];
	console.log(milestone);
	const description = $("#description" + index).val();
	const startdate = $('#startdate' + index).val();
	const duedate = $('#duedate' + index).val();
	const burndownduedate = $('#burndownduedate' + index).val();
	const capacity = $('#capacity' + index).val();
	const ed = $('#ed' + index).val();
	const state = $('#state' + index).val();
	const info = $('#info' + index).val();
	const subteamCapacity = $('#subteamcap' + index).val();
	const subteamED = $('#subteamed' + index).val();
	
	console.log("description: " + description + ", startdate: " + startdate + ", duedate: " + duedate + ", burndownduedate: " + burndownduedate + ", capacity: " + 
			capacity + ", ed: " + ed + ", state:" + state + ", info:" + info + ", subteamCapacity: " + subteamCapacity + ", subteamED: " + subteamED);
	
	// Ok, let's prepare a PATCH request to update the data.
	const updateMilestoneUrl = milestone.url;
	console.log("updateUrl: " + updateMilestoneUrl);

	const urlData = buildMilestoneUrlData(description, startdate, burndownduedate, capacity, ed, duedate, state, info, subteamCapacity, subteamED);
	$.ajax({
		url: updateMilestoneUrl,
		type: 'PATCH',
		data: JSON.stringify(urlData),
		success: function() { yoda.showSnackbarOk("Succesfully updated milestone"); milestoneListComplete[index].description = urlData.description;},
		error: function() { yoda.showSnackbarError("Failed to update milestone"); },
		// eslint-disable-next-line no-unused-vars
		complete: function(jqXHR, textStatus) {	/* NOP */ }
	});
}

// This will act as open/close by clicking on the magnifying class. Opening will show the field. Closing it will update the main field (total capacity) and update the milestone itself, then refresh.
export function subteamMilestone(index, fieldId, totalField) {
	console.log("subteamMilestone called. ", index, fieldId, totalField);
	console.log(milestoneListComplete);  
	const milestone = milestoneListComplete[index];
	console.log(milestone);
	
	// Are we visible? Then work on totals.
	if ($(fieldId).is(":visible")) {
		const f = $(fieldId).val();
		console.log($(fieldId).val())

		if (f != "") {
			let total = 0;
			const entries = f.split("\n");
			console.log(entries);
			for (let e = 0; e < entries.length; e++) {
				if (entries[e] == "")
					continue;
				total += parseInt(entries[e].split(",")[0]);
			}
			console.log("Setting total:", total);
			$(totalField).val(total);
			updateMilestoneData(index); 
		}
		
		// Validate, then Edit should finish off by calling updateMilestoneData.
		$(fieldId).hide();

	} else {
		$(fieldId).show();
	}
}

export function replicateMilestone(index) {
	const milestone = milestoneListComplete[index];
	console.log(milestone);
	
	const description = $("#description" + index).val();
	const startdate = $('#startdate' + index).val();
	const duedate = $('#duedate' + index).val();
	const burndownduedate = $('#burndownduedate' + index).val();
	const state = $('#state' + index).val();
	
	console.log("description: " + description + ", startdate: " + startdate + ", duedate: " + duedate + ", burndownduedate: " + burndownduedate + ", state:" + state);
	
	// Need to loop through selected repos, and look for milestone (based on title).
	// If it exists, we do a PATCH request to update description and dates (not capacity! and not info!)
	// If it does not exists, we will do a POST request to create milestone.
	let noCalls = 0;
	for (let r = 0; r < repoList.length; r++) {
		if (repoList[r] == yoda.getRepoFromMilestoneUrl(milestone.url))
			continue;

		// Find the entry in completeMilestones.
		// Need to find the milestone (the number)..
		let existingIndex = -1;
		for (let m = 0; m < milestoneListComplete.length; m++) {
			if ((repoList[r] == yoda.getRepoFromMilestoneUrl(milestoneListComplete[m].url)) && (milestone.title == milestoneListComplete[m].title)) {
				existingIndex = m;
				break;
			}
		}

		// Need to keep capacity
		let capacity, ed, info
		if (existingIndex != -1) {
			capacity = yoda.getMilestoneCapacity(milestoneListComplete[existingIndex].description);
			ed = yoda.getMilestoneED(milestoneListComplete[existingIndex].description);
			info = yoda.getMilestoneInfo(milestoneListComplete[existingIndex].description);
		} else {
			capacity = null;
			ed = null;
			info = null;
		}
		const urlData = buildMilestoneUrlData(description, startdate, burndownduedate, capacity, ed, duedate, state, info);
		console.log(urlData);

		let operation, milestoneUrl;
		// Ok, let's see. Does milestone already exist
		if (existingIndex == -1) {
			console.log("Need to create new milestone " + milestone.title + " in " + repoList[r] + " repository.");
			operation = 'POST';
			milestoneUrl = yoda.getGithubUrl() + "repos/" + $("#owner").val() + "/" + repoList[r] + "/milestones";
			urlData["title"] = milestone.title;
			
			// Note, if the milestone we are replicating FROM is closed, do NOT create new repositories in the other repos.
			if (state == 'closed') {
				yoda.showSnackbarError("Skipping milestone creation in " + repoList[r] + " as milestone closed.");
				console.log("Skipping milestone creation in " + repoList[r] + " as milestone closed.");
				continue;
			}
		} else {
			console.log("Need to update existing milestone " + milestone.title + " in " + repoList[r] + " repository.");
			milestoneUrl = milestoneListComplete[existingIndex].url;
			operation = 'PATCH';
		}
		
		console.log("milestoneURL: " + milestoneUrl);
		noCalls++;

		$.ajax({
			url: milestoneUrl,
			type: operation,
			data: JSON.stringify(urlData),
			success: function() { yoda.showSnackbarOk("Succesfully created/updated milestone"); },
			error: function() { yoda.showSnackbarError("Failed to create/update milestone"); },
			// eslint-disable-next-line no-unused-vars
			complete: function(jqXHR, textStatus) {	noCalls--; if (noCalls == 0) updateMilestones(); }
		});
	}
}

function displayRepoMilestones() {
	console.log("Redraw table");
	
	updateCompleteMilestoneList();
	
	// Find table
	const table = document.getElementById("milestonetable");
	table.innerHTML = "";

	const header = table.createTHead();
	const headerRow = header.insertRow();     

	let cell = headerRow.insertCell();
	cell.innerHTML = "<b>Repository</b>";

	cell = headerRow.insertCell();
	cell.innerHTML = "<b>Milestone</b>";
	
	cell = headerRow.insertCell();
	cell.innerHTML = "<b>State</b>";
	
	cell = headerRow.insertCell();
	cell.innerHTML = "<b>Description</b>";
	
	cell = headerRow.insertCell();
	cell.innerHTML = "<b>Info</b>";

	cell = headerRow.insertCell();
	cell.innerHTML = "<b>Start Date</b>";

	cell = headerRow.insertCell();
	cell.innerHTML = "<b>Due Date</b>";

	cell = headerRow.insertCell();
	cell.innerHTML = "<b>Burndown Date</b>";

	cell = headerRow.insertCell();
	cell.innerHTML = '<span id="capacityheader"></span>';

	cell = headerRow.insertCell();
	cell.innerHTML = '<span id="edheader"></span>';

	cell = headerRow.insertCell();
	cell.innerHTML = "<b>Actions</b>";
	
	table.appendChild(document.createElement('tbody'));
	const bodyRef = document.getElementById('milestonetable').getElementsByTagName('tbody')[0];
	
	// Build a special row for creating new milestones.
	const row = bodyRef.insertRow();

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
	cell.innerHTML = "";

	cell = row.insertCell();
	cell.innerHTML = '<button id="createbutton" onclick="createMilestone()" class="tablebutton">Create milestone</button>';
	
	let totalCapacity = 0;
	let totalED = 0;
	for (let m = 0; m < milestoneListComplete.length; m++) {
		const milestone = milestoneListComplete[m];
		const row = bodyRef.insertRow();
		const repo = yoda.getRepoFromMilestoneUrl(milestone.url);
		cell = row.insertCell();
		cell.innerHTML = repo;
		
		const title = milestone.title;
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
			
		let startdate = yoda.getMilestoneStartdate(milestone.description);
		if (startdate == null)
			startdate = "";
		cell = row.insertCell();
		cell.innerHTML = '<input type="text" id="startdate' + m + '" size="10" onchange="updateMilestoneData(' + m + ')" value="' + startdate + '">';

		const duedate = yoda.formatDate(new Date(milestone.due_on));
		cell = row.insertCell();
		cell.innerHTML = '<input type="text" id="duedate' + m + '" size="10" onchange="updateMilestoneData(' + m + ')" value="' + duedate + '">';
		
		let burndownduedate = yoda.getMilestoneBurndownDuedate(milestone.description);
		if (burndownduedate == null)
			burndownduedate = "";
		cell = row.insertCell();
		cell.innerHTML = '<input type="text" id="burndownduedate' + m + '" size="10" onchange="updateMilestoneData(' + m + ')" value="' + burndownduedate + '">';

		let capacity = yoda.getMilestoneCapacity(milestone.description);
		if (capacity != null)
			totalCapacity += parseInt(capacity);
		cell = row.insertCell();
		if (capacity == null)
			capacity = "";
			
		const subteamCapacity = yoda.getAllBodyFields(milestone.description, "> subteam-capacity ", ".*$").join("\n");
		console.log(subteamCapacity); 
		cell.innerHTML = '<span><input type="number" id="capacity' + m + '" size="3" style="float: left" onchange="updateMilestoneData(' + m + ')" value="' + capacity + '">' + 
						'<img id="subteamc-' + m + '" src="yoda-magni.png" style="float: right"></span>' +
						'<div><span class="tooltip">Enter subteam capacity. One team each line as capacity,team label</span><textarea id="subteamcap' + m + '" rows=5 style="display:none;width:200px">' + subteamCapacity + '</textarea></div>';

		$('#subteamc-' + m).click(function(e) {
			const index = e.target.id.split("-")[1];
			subteamMilestone(index, "#subteamcap" + index, "#capacity" + index);
		});

		let ed = yoda.getMilestoneED(milestone.description);
		if (ed != null)
			totalED += parseInt(ed);
		else
			ed = "";
			
		const subteamED = yoda.getAllBodyFields(milestone.description, "> subteam-ed ", ".*$").join("\n");
		console.log(subteamED); 
			
		cell = row.insertCell();
		cell.innerHTML = '<span><input type="number" id="ed' + m + '" size="3" style="float: left" onchange="updateMilestoneData(' + m + ')" value="' + ed + '">' +
						'<img id="subteamed-' + m + '" src="yoda-magni.png" style="float: right"></span>' +
						'<textarea id="subteamed' + m + '" rows=5 style="display:none;width:200px">' + subteamED + '</textarea>';
		$('#subteamed-' + m).click(function(e) {
			const index = e.target.id.split("-")[1];
			subteamMilestone(index, "#subteamed" + index, "#ed" + index);
		});
		
		cell = row.insertCell();
		const html = '<button id="replicate" onclick="replicateMilestone(' + m + ')" class="tablebutton">Copy/Update</button>'; 
		cell.innerHTML = html;

	}
	$("#capacityheader").html('<span id="capacityheader"><b>Capacity (total ' + totalCapacity + ')</b></span>');
	$("#edheader").html('<span id="edheader"><b>ED (total ' + totalED + ')</b></span>');
	
	yoda.updateUrl(getUrlParams());
}

export function init() {
	// Enable yodamenu
	yoda.enableMenu("#milestone-manager");
	
	yoda.getDefaultLocalStorage("#owner", "yoda.owner");
	selectMilestones = [];
	
	yoda.decodeUrlParamBoolean("#closedmilestones", "closedmilestones");

	yoda.decodeUrlParam("#owner", "owner");
	
	// Local storage
	yoda.getUserTokenLocalStorage("#user", "#token");

	// Do it after getting from localStorage
	yoda.decodeUrlParam("#user", "user");
	yoda.decodeUrlParam("#token", "token");
			
	// We do not want caching here. 
	$.ajaxSetup({ cache: false });

	console.log("Github authentisation: " + $("#user").val() + ", token: " + $("#token").val());
	yoda.gitAuth($("#user").val(), $("#token").val());

	// Event listeners
	$("#hamburger").on("click", yoda.menuClick);
	$("#owner").on("change", function () { yoda.updateReposAndGUI($("#owner").val(), "#repolist", "repolist", "yoda.repolist"); });
	$("#closedmilestones").on("change", function() { updateMilestones(); });
	$("#refreshbutton").on("click", function() { updateMilestones(); });

	$(document).ready(function() {
		$('#repolist').select2({
			// minimumInputLength: 2,
			sorter: yoda.select2Sorter,
			matcher: yoda.select2Matcher
		});
		$('#repolist').on('select2:select', yoda.select2SelectEvent('#repolist')); 
		$('#milestonelist').select2({
			sorter: yoda.select2Sorter,
			matcher: yoda.select2Matcher
		});	
		$('#milestonelist').on('select2:select', yoda.select2SelectEvent('#milestonelist')); 
		
		$('#repolist').on('change.select2', function () {
			repoList = 	$("#repolist").val();			
			console.log("List of selected repos is now: " + repoList);
			updateMilestones();
		});
		
		$('#milestonelist').on('change.select2', function () {
			milestoneList = $("#milestonelist").val();
			
			console.log("Selected milestones is : " + milestoneList);
			selectMilestones = milestoneList;
			displayRepoMilestones();
		});

		// Rather complex updating of the defaults repos. 
		yoda.updateReposAndGUI($("#owner").val(), "#repolist", "repolist", "yoda.repolist", function() {
			// Potential automatic startup actions can go here.
		}, null);
	});
}