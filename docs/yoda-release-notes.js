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


// Global variable controlling whether bars should be stacked or not.
// If stacked, then tool will not do a "totals" line and a corresponding right axis.

var repoList = [];  // selected repos
var repoMilestones = []; // Double-array of repos,milestone (full structure) for selected repos

var commonMilestones = []; // Options for milestone selection (milestones in all repos).
var milestoneList = []; // selected milestones just the title
var milestoneListComplete = []; // selected milestones, full structure.

var repoIssues = []; // List of issues. Full structure as returned from github.

function addIfNotDefault(params, field) {
	if ($("#" + field).val() != $("#" + field).prop('defaultValue')) {
		return params + "&" + field + "=" + $("#" + field).val(); 
	} else {
		return params;
	}
}

function getUrlParams() {
	var params = "owner=" + $("#owner").val();
	if ($("#repolist").val() != "")
		params += "&repolist=" + $("#repolist").val();
	if ($("#milestonelist").val() != "")
		params += "&milestonelist=" + $("#milestonelist").val();
	params = addIfNotDefault(params, "rnlabeltypes");
	params = addIfNotDefault(params, "rnskiplabel");
	params = addIfNotDefault(params, "rnknownlabel");

	if ($('#closedmilestones').is(":checked")) {
		params += "&closedmilestones=true";
	}
	
	return params;
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

// --------

//Create a List node to based on the given issue.
function formatIssueRN(issue) {
	var issueText = "";
	
	var issueRNTStart = issue.body.indexOf('> RNT');
	if (issueRNTStart != -1) {
		var lineStart = issue.body.indexOf('\n', issueRNTStart) + 1;
		var lineEnd = issue.body.indexOf('\n', lineStart);
		if (lineEnd == -1)
			var line = issue.body.substr(lineStart);
		else
			var line = issue.body.substr(lineStart, lineEnd - lineStart - 1);
		var title = line;
	} else {
		var title = issue.title;
	}
	var titleLine = title + " (#" + issue.number + ")";
	issueText += "- " + titleLine + "\n";
	
	var issueRNSearchStart = 0;
	if (issueRNTStart != -1)
		issueRNSearchStart = issueRNTStart + 1;
	var issueRNStart = issue.body.indexOf('> RN', issueRNSearchStart);
	if (issueRNStart != -1) {
		issueText += "\n";
		var lineStart = issue.body.indexOf('\n', issueRNStart) + 1;

		var lineAdded = false;
		do {
			var lineEnd = issue.body.indexOf('\n', lineStart);
			if (lineEnd == -1)
				var line = issue.body.substr(lineStart);
			else
				var line = issue.body.substr(lineStart, lineEnd - lineStart - 1);
			if (line.length == 0)
				break;
//			console.log("Line: " + line);
			
			issueText += "   " + line + "\n";
			lineAdded = true;
			
			if (lineEnd == -1) {
				if (lineAdded)
					issueText += "\n";
				break;
			}
			
			lineStart = lineEnd + 1;
		} while (true);
	}

	return issueText;
}


function makeRN() {
	var rn = document.getElementById("RN");
	
	var repoList = $("#repolist").val();
	var rnText = "";
	
	// T2 - Enhancements|Added Features,T1 - Defect|Solved Issues
	var rnLabelTypes = $("#rnlabeltypes").val();
	var rnLabelTypesList = rnLabelTypes.split(",");
	
	// Skip label
	var rnSkipLabel = $("#rnskiplabel").val();
	
//  Will be something like...
//	var issueTypeList = ["T2 - Enhancement", "T1 - Defect"];
//	var issueTypeHeading = ["Added Features", "Solved Issues"];
	
	// Headline
	rnText += "# Release Notes for " + $("#milestonelist").val() + "\n\n";
	
	for (var r = 0; r < repoList.length; r++) {
		rnText += "# " + "Changes for " + repoList[r] + "\n\n";
		
		for (var t = 0; t < rnLabelTypesList.length; t++) {
			rnText += "## " + rnLabelTypesList[t].split("|")[1] + "\n\n";
			
			for (var i = 0; i < repoIssues.length; i++) {
				// Match repo?.
				var repository = repoIssues[i].repository_url.split("/").splice(-1); // Repo name is last element in the url
				if (repository != repoList[r])
					continue;
				
				// Match issue type (in label)
				if (!yoda.isLabelInIssue(repoIssues[i], rnLabelTypesList[t].split("|")[0]))
					continue;
				
				// Should issue be skipped
				if (yoda.isLabelInIssue(repoIssues[i], rnSkipLabel))
					continue;
				
				rnText += formatIssueRN(repoIssues[i]);
			}
		}
	}
	
	rn.innerHTML = "<pre>" + rnText + "</pre>";

	// Copy to clipboard
	copy_text("RN");
	yoda.updateUrl(getUrlParams() + "&draw=rn");
}


function startRN() {
	updateIssuesForRN();
}

function startKnown() {
	updateIssuesKnown();
}

// ---------------

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

// -------------

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
	
		var milestoneSearch = "&milestone=" + milestone.number;
		console.log("milestone.number: " + milestone.number);

		var getIssuesUrl = yoda.getGithubUrl() + "repos/" + $("#owner").val() + "/" + repo + "/issues?state=all" + milestoneSearch;
//		console.log(getIssuesUrl);
		
		yoda.getLoop(getIssuesUrl, 1, [], function(data) {storeIssues(data, milestoneIndex, myUpdateIssueActiveNo)}, null);
	} else {
		// Requested (and received all issues).
		console.log("All issues (before filtering out pull requests): " + repoIssues.length);
		yoda.filterPullRequests(repoIssues);
		console.log("No issues (after filtering out pull requests): " + repoIssues.length);
		yoda.showSnackbarOk("Succesfully retrived " + repoIssues.length + " issues.");
		makeRN();
	}
}

function updateIssuesForRN() {
	updateIssueActiveNo++;
	console.log("UpdateIssueActive: " + updateIssueActiveNo);
		
	// Ok, here we go. This is the tricky part.
	// We will get issues for all selected milestones for all selected repos.
	milestoneListComplete = [];
	
	for (var m = 0; m < milestoneList.length; m++) {
//		console.log("Updating issues for milestone: " + milestoneList[m]);

		for (var r = 0; r < repoList.length; r++) {
//			console.log("  For repo: " + repoList[r]);
			// Need to find the milestone (the number)..
			for (var m1 = 0; m1 < repoMilestones[r].length; m1++) {
//				console.log(repoMilestones[r][m1].title);
				if (repoMilestones[r][m1].title == milestoneList[m]) {
					console.log("Need to get issues for " + repoList[r] + ", " + milestoneList[m] + ", which has number: " + repoMilestones[r][m1].number);
					milestoneListComplete.push(repoMilestones[r][m1]);
				}
			}
		}
	}
	
	console.log("Total list of milestones for which to get issues");
	console.log(milestoneListComplete);
	
	repoIssues = [];
	
	updateIssueLoop(0, updateIssueActiveNo);
}

// --------------

function githubAuth() {
	console.log("Github authentisation: " + $("#user").val() + ", token: " + $("#token").val());
	yoda.gitAuth($("#user").val(), $("#token").val());
}

// --------------
