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

var download = false; // global - a bit of a hack.

function addIfNotDefault(params, field) {
	if ($("#" + field).val() != $("#" + field).prop('defaultValue')) {
		return params + "&" + field + "=" + $("#" + field).val(); 
	} else {
		return params;
	}
}

function getUrlParams() {
	var params = "owner=" + $("#owner").val();
	params = addIfNotDefault(params, "kmlabel");
	
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

function getFormat(formatArray, index) {
	var f = formatArray[index];
	f = f.replace(/\\n/g, '\n');
	return f;
}


//Create a List node to based on the given issue.
function formatIssueKM(issue) {
	var repo = yoda.getUrlRepo(issue.repository_url);


	return issueText;
}

function makeKM(result) {
	console.log(result);
	var issues = result[0].items;
	console.log("Finally " + issues.length + " issues");
	console.log(issues);

	for (var i = 0; i < issues.length; i++) {
		var card = createCard(issues[i]);
		$("#KM").append(card);
	}

	// Copy to clipboard
//	copy_text("RN");
	yoda.updateUrl(getUrlParams() + "&action=search");
}

// Collect various information from the API. URL gives the requested info, the function does the
// collection and concatenation, calling in the end the final function. 
// Set page = 1 for first page, or set to -1 for get calls where per_page / page is not used.
function getLoop(url, page, collector, finalFunc, errorFunc, callNo) {
	if (page != -1) {
		var oldIndex = url.indexOf("per_page=100&page=");
		if (oldIndex != -1) { 
			url = url.substring(0, oldIndex) + "per_page=100&page=" + page;
		} else {
			// Do we have a ?
			if (url.indexOf("?") == -1) {
				url = url + "?per_page=100&page=" + page;
			} else {
				url = url + "&per_page=100&page=" + page;
			}
		}
	}
	
	$.getJSON(url, function(response, status){
		if (response.items != undefined && response.items.length == 100 && page != -1) {
			getLoop(url, page + 1, collector.concat(response), finalFunc, errorFunc, callNo);
		} else {
			$("*").css("cursor", "default");
			finalFunc(collector.concat(response));
		}
	}).done(function() { /* One call succeeded */ })
	.fail(function(jqXHR, textStatus, errorThrown) { 
		$("*").css("cursor", "default");
		if (errorFunc != null) {
			errorFunc(errorThrown + " " + jqXHR.status);
		}
		})
	.always(function() { /* One call ended */ });;          
};

//Create the HTML card representation for a given issue.
function createCard(issue) {
//	console.log(issue);
	var card = $('<div class="card"></div>');
	card.attr("url", issue.url);
//	if (issue.closed_at != null) {
//		var cardRef = $('<a class="cardlink" style="text-decoration: line-through;" target="_blank" href="' + issue.html_url + '">' + issue.title + '</a>');		
//	} else {
		var cardRef = $('<a class="cardlink" target="_blank" href="' + issue.html_url + '">' + issue.title + '</a>');
//	}
	card.append(cardRef);
	
	var owner = yoda.getUrlOwner(issue.repository_url);
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

	issueRef = '<a href="' + issue.html_url + '" target="_blank">' + owner + "/" + repo + "#" + issue.number + '</a>';
	
//	var smallRef = $('<small>' + issueRef + ' ' + getMilestoneTitle(issue) + ' ' + assignText + '</small>');
	var smallRef = $('<small>' + issueRef + ' ' +  assignText + ' ' + '</small>');
	card.append(smallRef);

	var cardLabels = $('<span class="cardlabels"></span>');
	
	for (var l = 0; l < issue.labels.length; l++) {
		var cardLabel = $('<span class="cardlabel">' + issue.labels[l].name + '</span>');
		cardLabel.css('background', '#' + issue.labels[l].color);  
		cardLabel.css('color', yoda.bestForeground(issue.labels[l].color));
		cardLabels.append(cardLabel);
	}
	card.append(cardLabels);
	
	// Extract KM line(s) from body and show nicely.... 
	var kmLine = $('<small>' + yoda.getLabelMatch(issue.body, "> KM") + '</small>');
	card.append(kmLine);
	
	return card;
}


function startKM(_download) {
	download = _download;	
	repoIssues = [];
	$("#KM").html("");
	
	var getIssuesUrl = yoda.getGithubUrl() + "search/issues?q=";
	if ($("#kmsearch").val() != "")
		getIssuesUrl += $("#kmsearch").val();
	if ($("kmlabel").val() != "")
		getIssuesUrl += "+" + $("#kmlabel").val();
	getIssuesUrl += "+type:issue";
	var saveUrl = getIssuesUrl;
	if ($("#owner").val() != "") 
		getIssuesUrl += "+org:" + $("#owner").val();

//	var getIssuesUrl = yoda.getGithubUrl() + "search/issues?q=" + $("#kmsearch").val() + "+org:" + $("#owner").val() + "+type:issue+label:" + $("#kmlabel").val();
	yoda.getLoop(getIssuesUrl, 1, [], function(data) { makeKM(data)}, null);
}

// --------------

function githubAuth() {
	console.log("Github authentisation: " + $("#user").val() + ", token: " + $("#token").val());
	yoda.gitAuth($("#user").val(), $("#token").val(), "textMatch");
}

// --------------
