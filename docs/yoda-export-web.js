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


 /**
 *
 * jquery.binarytransport.js
 *
 * @description. jQuery ajax transport for making binary data type requests.
 * @version 1.0 
 * @author Henry Algus <henryalgus@gmail.com>
 *
 */

//use this transport for "binary" data type
$.ajaxTransport("+binary", function(options, originalOptions, jqXHR){
	// check for conditions and support for blob / arraybuffer response type
	if (window.FormData && ((options.dataType && (options.dataType == 'binary')) || (options.data && ((window.ArrayBuffer && options.data instanceof ArrayBuffer) || (window.Blob && options.data instanceof Blob)))))
	{
		return {
			// create new XMLHttpRequest
			send: function(headers, callback){
				// setup all variables
				var xhr = new XMLHttpRequest(),
				url = options.url,
				type = options.type,
				async = options.async || true,
				// blob or arraybuffer. Default is blob
				dataType = options.responseType || "blob",
				data = options.data || null,
				username = options.username || null,
				password = options.password || null;

				xhr.addEventListener('load', function(){
					var data = {};
					data[options.dataType] = xhr.response;
					// make callback and send data
					callback(xhr.status, xhr.statusText, data, xhr.getAllResponseHeaders());
				});

				xhr.open(type, url, async, username, password);

				// setup custom headers
				for (var i in headers ) {
					xhr.setRequestHeader(i, headers[i] );
				}

				xhr.responseType = dataType;
				xhr.send(data);
			},
			abort: function(){
				jqXHR.abort();
			}
		};
	}
});

function addIfNotDefault(params, field) {
	if ($("#" + field).val() != $("#" + field).prop('defaultValue')) {
		return params + "&" + field + "=" + $("#" + field).val(); 
	} else {
		return params;
	}
}

function getUrlParams() {
	var params = addIfNotDefault("", "owner");
	params += "&repolist=" + $("#repolist").val();
	params = addIfNotDefault(params, "outputfile");
	params = addIfNotDefault(params, "downloadimages");
	params += "&estimate=" + yoda.getEstimateInIssues();
	if ($("#labelfilter").val() != "") 
		params += "&labelfilter=" + $("#labelfilter").val();
	if ($("#state").val() != "open") {
		params += "&state=" + $("#state").val(); 
	}
	if ($('#onlyoverview').is(":checked")) {
		params += "&onlyoverview=true";
	}
	if (!$('#showmilestone').is(":checked")) {
		params += "&showmilestone=false";
	}
	if ($('#showcomment').is(":checked")) {
		params += "&showcomment=true";
	}
	
	return params;
}

function estimateClick(radio) {
	yoda.setEstimateInIssues(radio.value);
}

function logMessage(message) {

	$('#console').val($('#console').val() + message + "\n");
	bottom = $('#console').prop('scrollHeight') - $('#console').height()
	$('#console').scrollTop(bottom);
}


// ---------------------------------------
// Issues have been retrieved. Time to analyse data and draw the chart.
// Global object for ZIP file.
var issueZipRoot = null;
var noIssuesActive = 0;
var globIssues = null;
var globIndex = 0;
var issueImages = [];
var globLabels = [];
function exportIssues(issues) {
	// Prepare new run (zip, parallel#, etc.)
	issueZipRoot = new JSZip();
	addCSSFile();
	noIssuesActive = 0;
	globIssues = issues;
	globIndex = 0;
	issueImages = [];
	globLabels = [];
	
	console.log("Exporting issues. No issues: " + issues.length);
	logMessage("Info: Received " + issues.length + " issues. Now getting detailed data and building ZIP file for download.");

	// NOTE: Some steps below are skipped if only doing index pages (especially if not doing last comment)
	
	// STEP I1: Retrieve labels for all repos. This will be used for nice coloring of labels. Call iteratively, goto step 0 when done.

	// STEP 0: Extract first issue from list, then proceed to step 1 (if we need to get comments at all)1.
	// STEP 1: Get issue comments, then call on to step 2
	// STEP 2: Investigate issue body and comments. For each image, download image, return to STEP 2 while still images to be downloaded. Index comment#
	// STEP 3: Get issue events, then call on to step 4
	// STEP 4: Format data into HTML file. Call GitHub markdown converter on result, rest in STEP 5
	// STEP 5: Add to ZIP FILE. Then to step 0.

	// ISSUE: Right now globIssues are being consumed by algorithm... messy..
	
	// STEP I2: Generate overview pages here (can be done in parallel, we have the information - maybe except label coloring ...
	// We will build one overview page per respository and put into the root folder. When done on to STEP 0.

	// STEP F1: Download image files collected during the issue processing, call resursively self until no more images. Then call STEP F2
	// STEP F2: Write/download zip file
	
	// Call to get labels.
	getLabels($("#repolist").val());

}

//STEP I1: Retrieve labels for all repos. This will be used for nice coloring of labels. Call iteratively, goto step 0 when done.
function getLabels(repoLeft) {
	if (repoLeft.length == 0) {
		// Done. Call on
		console.log("All labels retrieved.");
		console.log(globLabels);
		logMessage("Succesfully retrieved all repository labels ...");

		// Call on.
		// Copy a copy of all issues before...
		issueProcessLoop(0);
	} else {
		var repo = repoLeft.pop();
		var getLabelsUrl = yoda.getGithubUrl() + "repos/" + $("#owner").val() + "/" + repo + "/labels";
		yoda.getLoop(getLabelsUrl, 1, [], function(labels) {
			console.log("Retrieve labels for " + repo);
			globLabels[repo] = labels;
			getLabels(repoLeft);
		});
	}
}

// STEP I2: Index generation, one file per repository
function buildIndex() {
	var repoList = $("#repolist").val();
	console.log("List of repositories: " + repoList);
	for (var repInd = 0; repInd < repoList.length; repInd++) {
		console.log("Building index file for: " + repoList[repInd]);
		var title = "Issue index for " + $("#owner").val() + '/' + repoList[repInd];
		var indexHTML = '<!DOCTYPE html><html><head><meta charset="utf-8"><title>' + title + '</title>';
		indexHTML += '<style>' + cssIndex() + '</style>';
		indexHTML += '<body>';
		indexHTML += '<div class="indextitle">' + title + '</div>';
		indexHTML += '<table class="indextable">';
		indexHTML += '<tr><th align="left">Id</th><th align="left">State</th><th align="left">Labels</th>';
		if ($('#showmilestone').is(":checked")) {
			indexHTML += '<th align="left">Milestone</th>';
		}
		indexHTML += '<th width="50%" align="left">Title</th>';
		
		if ($('#showcomment').is(":checked")) {
			indexHTML += '<th align="left" width="25%">Last comment</th>';
		}
		indexHTML += '</tr>\n';
		
		for (var i = 0; i < globIssues.length; i++) {
			issue = globIssues[i];
			var issueRepo = yoda.getUrlRepo(issue.url);
			if (issueRepo != repoList[repInd])
				continue; // Issue belongs to different repo;
			indexHTML += '<tr>';
			
			if ($('#onlyoverview').is(":checked")) {
				indexHTML += '<td align="left">' + issue.number + '</td>';
			} else {
				indexHTML += '<td align="left">' + '<a href="' + $("#owner").val() + '/' + issueRepo + '/' + issue.number + '.html" target="_blank">' + issue.number + '</td>';
			}
				
			indexHTML += '<td align="left">' + issue.state + '</td>';
			var labels = "";
			for (var l = 0; l < issue.labels.length; l++) {
				labels += formatLabel(issueRepo, issue.labels[l].name);
			}
			indexHTML += '<td align="left">' + labels + '</td>';

			if ($('#showmilestone').is(":checked")) {
				if (issue.milestone != null) {
					indexHTML += '<td align="left">' + issue.milestone.title + '</td>';
				} else {
					indexHTML += '<td align="left"></td>';
				}
			}

			indexHTML += '<td align="left">' + issue.title + '</td>';
			
			if ($('#showcomment').is(":checked")) {
				if (issue.last_comment == null)
					indexHTML += '<td align="left"></td>';
				else
					indexHTML += '<td align="left">' + issue.last_comment.body_html + '</td>';
			}
			
			indexHTML += '</tr>\n';
		}
		indexHTML += '</table></body>';
		
		fileName = repoList[repInd] + ".html";
		issueZipRoot.file(fileName, indexHTML);
	}
	console.log("Done building indexes");
}

// STEP 0: If number of active issues is below "max # of parallel", increment number of active issues, proceed to STEP 1 / repeat STEP 0
function issueProcessLoop() {
	console.log("issueProcessLoop. index " + globIndex + " / " + globIssues.length);
	if (globIndex == globIssues.length) {
		// We are done with issues, now turn attention to index and download of images before downloading ZIP file.
		buildIndex();
		if ($('#onlyoverview').is(":checked")) {
			console.log("Only index, so writing ZIP now.");
			writeZip();
		} else {
			downloadImages();
		}
	} else {
		// Let's do some work!
		issue = globIssues[globIndex];
		globIndex++;

		// Call on for comments.
		if ($('#onlyoverview').is(":checked") && !$('#showcomment').is(":checked"))
			issueProcessLoop();
		else
			issueComments(issue);
	}
}

// STEP F1: Download images, call on to write ZIP
function downloadImages() {
	if (issueImages.length == 0) {
		// Done
		console.log("Done with images.");
		writeZip();
	} else {
		// Download file, then call recursive.
		image = issueImages.pop();
		logMessage("Starting download of " + image.fullPath);

		// Header to accept all.
		var headers = [];
		headers['Accept'] = '*/*';
		
		$.ajax({
			url: image.fullPath,
			type: "GET",
			dataType: 'binary',
			headers : headers,
			processData: false,
			success: function(data){
				logMessage("  Success");
				console.log("Downloaded " + image.fullPath + " to " + image.path);
				issueZipRoot.file(image.path, data);
				downloadImages();
			},
			error: function(jqXHR, textStatus, errorThrown) {
				logMessage("  Failure: " + textStatus);
				consoel.log("Failed to download " + image.fullPath + ": " + textStatus);
			}
		}); 
	}
}

// STEP F2: Write ZIP. Finalize things. 
function writeZip() {
	console.log("Writing ZIP file.");
	issueZipRoot.generateAsync({type:"blob"})
	.then(function(content) {
		yoda.downloadFileWithType('application/zip', content, $("#outputfile").val());
	});

	logMessage("Succesfully downloaded ZIP file with issues.");
	yoda.updateUrl(getUrlParams() + "&export=true");
}

// STEP 1: Get issue comments, then call on to step 2
function issueComments(issue) {
	console.log("issueComments: " + issue.url);
	
	var issueUrlComments = issue.url + "/comments";
	console.log("Issues Comments URL: " + issueUrlComments);
	yoda.getLoop(issueUrlComments, 1, [], 
			function(comments) { processComments(issue, comments); }, 
			function(errorText) { yoda.showSnackbarError("Error getting issue comments: " + errorText, 3000);});
}

// STEP 2: Investigate issue body and comments. For each image, download image, return to STEP 2 while still images to be downloaded. Index comment#
function processComments(issue, comments) {
	console.log("issueComments for: " + issue.url + ", no of comments: " + comments.length);
	
	// Ok, here we will get the last comment and put into issue.
	issue.last_comment = null;
	if (comments.length > 0) {
		issue.last_comment = comments[comments.length - 1];
//		console.log(issue.last_comment);
	}

	issueEvents(issue, comments);
}

// STEP 3: Get issue events, then call on to step 4
function issueEvents(issue, comments) {
	if ($('#onlyoverview').is(":checked")) {
		formatIssue(issue, comments, []);
	} else {
		var issueUrlEvents = issue.url + "/events";
		console.log("Issues Events URL: " + issueUrlEvents);
		yoda.getLoop(issueUrlEvents, 1, [], 
			function(events) { formatIssue(issue, comments, events); }, 
			function(errorText) { yoda.showSnackbarError("Error getting issue events: " + errorText, 3000);});
	}
}

// STEP 4: Format data into HTML file. Call GitHub markdown converter on result, rest in STEP 5
function formatIssue(issue, comments, events) {
	console.log("formatIssue for: " + issue.url + ", no of comments: " + comments.length, ", no of events: " + events.length);
	
	// Let's prepare the issue HTML
	var repo = yoda.getUrlRepo(issue.url);
	var title = repo + '#' + issue.number + ': ' + issue.title; 
	var issueHTML = '<!DOCTYPE html><html><head><meta charset="utf-8"><title>' + title + '</title>';
	issueHTML += '<link rel="stylesheet" type="text/css" href="../../css/issues.css"></head>';
	issueHTML += '<body class="issuelayout">';
	
	// State and Title
	issueHTML += '<div>';
	if (issue.state == "open")
		issueHTML += '<span class="issueopen">Open</span>';
	else
		issueHTML += '<span class="issueclosed">Closed</span>';
	issueHTML += '<span class="issuetitle">' + title + '</span></div>';

	// Labels
	issueHTML += '<div class="issuebasefield">' + 'Labels: ';
	var labels = "";
	for (var l = 0; l < issue.labels.length; l++) {
		labels += formatLabel(repo, issue.labels[l].name);
	}
	issueHTML += labels + '</div>\n';
	
	// Milestone
	issueHTML += '<div class="issuebasefield">' + 'Milestone: ';
	if (issue.milestone != undefined) 
		issueHTML += formatField(issue.milestone.title);
	else	
		issueHTML += formatField("no milestone set");
	issueHTML += '</div>\n';
	
	// Assignee(s)
	issueHTML += '<div class="issuebasefield">' + "Assignee(s): ";
	if (issue.assignees.length == 0) 
		issueHTML += "none";
	else {
		assignees = "";
		for (var as = 0; as < issue.assignees.length; as++) {
			if (assignees != "")
				assignees += ",";
			assignees += formatUser(issue.assignees[as].login)
		}
		issueHTML += assignees;
	}
	issueHTML += '</div>';
	
	// Creator, date

	// Body
	issueHTML += '<div class="issuecommentheader">' + formatUser(issue.user.login) + ' created issue on ' + formatTime(issue.created_at) + '</div>\n';
	issueHTML += '<div class="issuecomment">' + issue.body_html + '</div>\n';
	
	// Comments and events. To be sorted in date order.
	var commentPtr = 0;
	var eventPtr = 0;
	
	while (commentPtr < comments.length || eventPtr < events.length) {
//		console.log("commentPtr = " + commentPtr + ", comments.length = " + comments.length + ", eventPtr = " + eventPtr + ", events.length = " + events.length);
		if ((commentPtr == comments.length) || (commentPtr < comments.length && eventPtr < events.length && events[eventPtr].created_at < comments[commentPtr].created_at) ) {
			// We do the event.
			switch (events[eventPtr].event) {
			case "milestoned":
				issueHTML += '<div class="issueevent">' + formatUser(events[eventPtr].actor.login) + ' set milestone ' + formatField(events[eventPtr].milestone.title) + ' on ' + formatTime(events[eventPtr].created_at) + '</div>\n';
				break;
				
			case "demilestoned":
				issueHTML += '<div class="issueevent">' + formatUser(events[eventPtr].actor.login) + ' removed milestone ' + formatField(events[eventPtr].milestone.title) + ' on ' + formatTime(events[eventPtr].created_at) + '</div>\n';
				break;
				
			case "labeled":
				issueHTML += '<div class="issueevent">' + formatUser(events[eventPtr].actor.login) + ' added label ' + formatLabel(repo, events[eventPtr].label.name) + ' on ' + formatTime(events[eventPtr].created_at) + '</div>\n';
				break;

			case "unlabeled":
				issueHTML += '<div class="issueevent">' + formatUser(events[eventPtr].actor.login) + ' removed label ' + formatLabel(repo, events[eventPtr].label.name) + ' on ' + formatTime(events[eventPtr].created_at) + '</div>\n';
				break;
			}
			eventPtr++;
		} else {
			// We do the comment.
			issueHTML += '<div class="issuecommentheader">' + formatUser(comments[commentPtr].user.login) + ' commented on ' + formatTime(comments[commentPtr].created_at) + '</div>\n';
			issueHTML += '<div class="issuecomment">' + comments[commentPtr].body_html + '</div>\n';
			
			commentPtr++;
		}
	}
	
	// Close off things.
	issueHTML += "</body>\n";
	
	// Replace any references to picture files. These are stored into e.g. 
	// https://media.github.hpe.com/user/3552/files/01f4b4e0-3c7d-11e6-887a-845324166c0d  (HPE)
	// For github.com:
	// https://user-images.githubusercontent.com/35253007/43787869-50bc2ab4-9a6c-11e8-8f78-5bae137cdb0d.png
	// Actually, we probablyl have full control over images, so why don't we just get all image files?
	console.log("Extracting image references...");
	var searchImg = '<img src="';
	var imgRef = issueHTML.indexOf(searchImg, 0);
	var urlHack = document.createElement('a');

	console.log(urlHack.pathname);
	downloadFilter = $("#downloadimages").val();
	for (; imgRef != -1; imgRef = issueHTML.indexOf(searchImg, imgRef + 1)) {
		// Get full path... will end with quote..
		var endQuote = issueHTML.indexOf('"' , imgRef + searchImg.length);
		var fullPath = issueHTML.substring(imgRef + searchImg.length, endQuote);
		console.log("Full path is: " + fullPath);
		urlHack.href = fullPath;
		
		issueImage = { fullPath: fullPath, path: urlHack.pathname.substring(1), localPath: "../.." + urlHack.pathname };

		if (downloadFilter == "" || urlHack.hostname.indexOf(downloadFilter) != -1) {
			logMessage("  Added " + fullPath + " to download queue ...");
			issueImages.push(issueImage);
		}  else {
			console.log("Skipping image: " + fullPath);
		}
	}

	// Next, let's replace the image strings.
	for (var i = 0; i < issueImages.length; i++) {
		var re = new RegExp(issueImages[i].fullPath, "g");
		issueHTML = issueHTML.replace(re, issueImages[i].localPath);
	}
	
	// HTML COMPLETE ----------------------
	writeToZip(issue, issueHTML);
}

//STEP 5: Add to ZIP FILE. Then to step 0.
function writeToZip(issue, issueHTML) {
	fileName = $("#owner").val() + "/" + yoda.getUrlRepo(issue.url) + "/" + issue.number + ".html";
	if (!$('#onlyoverview').is(":checked")) {
		issueZipRoot.file(fileName, issueHTML);
		logMessage("  Added file " + fileName + " to zip"); 
	}
	
	issueProcessLoop();
}


function addCSSFile() {
	var css = "";
	// Issue stuff
	css += '.issuelayout {width: 900px; margin-left: 100px;}\n';
	css += '.issuetitle { margin:15px 0px 15px 20px; font-size:32px; font-weight:400;}\n';
	css += '.issueopen { padding: 5px 10px 5px 10px; background-color: green; color: white; border-radius: 5px; font-size: 18px;}\n';
	css += '.issueclosed { padding: 5px 10px 5px 10px; background-color: red; color: white; border-radius: 5px; font-size: 18px;}\n';
	css += '.issuebasefield { margin:15px 0px 15px 0px;}\n';
	css += '.issueevent { margin:15px 0px 15px 15px;}\n';
	css += '.issuecommentheader { color: #586069; border-style:solid; background-color: #f6f8fa; border-color: grey; border-width: thin; border-bottom: 1px solid #d1d5da; border-top-left-radius: 3px; border-top-right-radius: 3px; margin-top: 15px; padding:5px 15px 5px 15px; line-height: 1.5;}\n';
	css += '.issuecomment { line-height: 1.5; border-style:solid; border-color: grey; border-width: thin; word-wrap: break-word;margin-bottom:15px; padding:5px 15px 5px 15px; overflow: auto;}\n';
	css += '.issuetime { font-weight:bold;}\n';
	css += '.issueuser { color:darkblue; font-weight:bold;}\n';
	css += '.issuefield { font-weight:bold;}\n';
 	css += '.issuelabel { margin: 2px; 10px; 2px; 0px; white-space: nowrap; padding: 4px 8px 4px 8px; border-radius: 5px; }\n';
	
	if (!$('#onlyoverview').is(":checked")) {
		console.log(issueZipRoot.file("css/issues.css", css));
	}
}

function cssIndex() {
	var css = "";

	// Index page stuff
	css += '.indextitle { font-size:30px; }\n';
	css += '.indextable { font-size:14px; border-collapse: collapse; }\n';
	css += 'th { border-bottom: 5px solid #01a982; }\n';
	css += 'td { border-bottom: 1px solid black; }\n';
	css += 'th, td { padding: 10px; }\n';

	return css;
}

function formatTime(ts) {
	var tsDate = new Date(ts);
	return '<span class="issuetime">' + tsDate.toString().replace(/ \(.*\)/, "") + '</span>';
}

function formatUser(user) {
	return '<span class="issueuser">' + user + '</span>';
}

function formatField(field) {
	return '<span class="issuefield">' + field + '</span>';
}


function formatLabel(repo, label) {
	// TODO: no-break + margins.
	
	// Find the label
	for (var l = 0; l < globLabels[repo].length; l++) {
		if (globLabels[repo][l].name == label) {
			var foreground = yoda.bestForeground(globLabels[repo][l].color);
			// Got it.
			return '<span style="background-color: #' + globLabels[repo][l].color + '; color:' + foreground + '; margin: 2px; 10px; 2px; 0px; white-space: nowrap; padding: 4px 8px 4px 8px; border-radius: 5px;">' + label + '</span>'; 

//			return '<span class="issuelabel" style="background-color: #' + globLabels[repo][l].color + '; color:' + foreground + '; ">' + label + '</span>'; 
		}
	}
	return label; // Strange... 
}

// -------------------------------

// TODO: Enhance this
function errorFunc(errorText) {
	alert("ERROR: " + errorText);
}

// ----------------

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

// -------------------------

function startExport() {
	$("#console").val("");
	
	if ($("#repolist").val() == "") 
		yoda.updateGitHubIssuesOrg($("#owner").val(), $("#labelfilter").val(), $("#state").val(), exportIssues, function(errorText) { yoda.showSnackbarError("Error getting issues: " + errorText, 3000);});
	else
		yoda.updateGitHubIssuesRepos($("#owner").val(), $("#repolist").val(), $("#labelfilter").val(), $("#state").val(), null, exportIssues, function(errorText) { yoda.showSnackbarError("Error getting issues: " + errorText, 3000);});

	logMessage("Info: Initiated Github request.");
}

// --------------
function githubAuth() {
	console.log("Github authentisation: " + $("#user").val() + ", token: " + $("#token").val());
	yoda.gitAuth($("#user").val(), $("#token").val(), "fullExport");
}

// --------------
