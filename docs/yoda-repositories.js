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

var repoDetails = []; // List of issues. Full structure as returned from github.

var download = false; // global - a bit of a hack.

function addIfNotDefault(params, field) {
	var defaultValue = $("#" + field).prop('defaultValue');
	// Hack. Make sure no real newlines into default value.
	defaultValue = defaultValue.replace(/\n/g, "");
	var value = $("#" + field).val();
	
	if (value != defaultValue) {
		console.log("value: " + value);
		console.log("defa : " + defaultValue);
		return params + "&" + field + "=" + value; 
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
	params = addIfNotDefault(params, "hlformat");
	params = addIfNotDefault(params, "sformat");
	params = addIfNotDefault(params, "ssformat");
	params = addIfNotDefault(params, "listformat");
	params = addIfNotDefault(params, "topicformat");
	params = addIfNotDefault(params, "repoformat");
	params = addIfNotDefault(params, "descfile");
	
	var outputFormat = $('input:radio[name="outputformat"]:checked').val();
	if (outputFormat != "html")
		params += "&outputformat=" + outputFormat;

	if ($('#tablelayout').is(":checked")) {
		params += "&tablelayout=true";
	}
	if ($('#allbranches').is(":checked")) {
		params += "&allbranches=true";
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

// Remove elements in array that have duplicates based on a given field.
function uniqueArray(arr, field) {
	return arr.filter(function(element, index, array, thisArg) {return array.findIndex(function(e, i, a, t) 
			{if (index != i && element[field] == e[field]) return true; else return false;}) == -1;});
}

// --------
// Add issues, making sure to avoid duplicates.
function addIssues(oldIssues, newIssues) {
	return uniqueArray(oldIssues.concat(newIssues), "url");
}

function getFormat(formatArray, index) {
	var f = formatArray[index]; 
	f = f.replace(/\\n/g, '\n');
	return f;
}

//Parse RN markdown to HTML (if any)
function parseRNMarkdown(markdown) {
//	console.log(markdown);
	var markdownUrl = yoda.getGithubUrl() + "markdown";
	markdown = markdown.replace(/<br>/g, '<br>\n');  // A bit of a hack, but best way to handle that sometimes people have done lists using markdown, other times with bullets. 
//	console.log("markdownUrl: " + markdownUrl);

	
	var urlData = {
			"text": markdown
	};
	
	var result = "";
	$.ajax({
		url: markdownUrl,
		type: 'POST',
		async: false, 
		data: JSON.stringify(urlData),
		success: function(data) { result = data;},
		error: function() { yoda.showSnackbarError("Failed to translate Markdown"); },
		complete: function(jqXHR, textStatus) { }
	});
	
//	console.log(result);
	return result;
}


//Create a List node to based on the given issue.
function formatRepo(repo) {
	var repoFormat = $("#repoformat").val();
	var repo = yoda.getUrlRepo(issue.url);
	
	if ($('input:radio[name="outputformat"]:checked').val()== "html") 
		var newLine = "<br>";
	else
		var newLine = "&lt;br&gt;";
	
	var repoText = "";
	
	// HTML?
	if ($('input:radio[name="outputformat"]:checked').val()== "html") {
		rnText = parseRNMarkdown(rnText);
	}
	
	// substitude into template
	repoText = repoFormat;
	repoText = repoText.replace(/%t/, repo.description);
	repoText = repoText.replace(/%d/, $('#owner').val() + "/" + repo.name);
	repoText = repoText.replace(/%n/, repo.name);
	repoText = repoText.replace(/%r/, rnText);

	
	repoText = repoText.replace(/%x/, "");
	repoText = repoText.replace(/%y/, title);
	
	return repoText;
}

function makeTable(headline, changesOrKnown, draw) {
	var rn = document.getElementById("RN");
	
	var repoList = $("#repolist").val();
	var rnText = "";
	
	// T2 - Enhancements|Added Features,T1 - Defect|Solved Issues
	if (draw == "known")
		var rnLabelTypes = $("#rnknownlabeltypes").val();
	else
		var rnLabelTypes = $("#rnlabeltypes").val();
	var rnLabelTypesList = rnLabelTypes.split(",");
	
	// Skip label
	var rnSkipLabel = $("#rnskiplabel").val();

//  Will be something like...
//	var issueTypeList = ["T2 - Enhancement", "T1 - Defect"];
//	var issueTypeHeading = ["Added Features", "Solved Issues"];
	
	// Get formatting
	var hlFormat = $("#hlformat").val().split(",");
	var sFormat = $("#sformat").val().split(",");
	var ssFormat = $("#ssformat").val().split(",");
	var listFormat = $("#listformat").val().split(",");
	var catFormat = $("#catformat").val();

	// Headline
	rnText += getFormat(hlFormat, 0) + headline + $("#milestonelist").val() + getFormat(hlFormat, 1);
	
	// Categories. First build list based on regular expression (if any)
	var categories = [];
	var catLabel = $("#catlabel").val().split(",");
	if (catLabel.length == 2) {
		var catReg = new RegExp(catLabel[1]);
		for (var i = 0; i < repoIssues.length; i++) {
			for (var l=0; l < repoIssues[i].labels.length; l++) {
				var labelName = repoIssues[i].labels[l].name;
				var res = labelName.match(catReg);
				if (res != null) {
					catName = labelName;
					if (res[1] != undefined)
						catName = res[1];
					if (categories.findIndex(function(c) {return (c.labelName == labelName)}) == -1) {
						console.log("Found new category: " + catName);
						categories.push({labelName: labelName, catName: catName});
					}
				}
			}
		}
		
		// Sort the labels (before generic) alphabetically
		categories = categories.sort(function(a,b) {return (a.catName < b.catName?-1:1);});
		
		// Add fallback category
		categories.push({labelName: "_FALLBACK_", catName: catLabel[0]});
		
		console.log("List of categories:");
		console.log(categories);
	} else {
		// Synthesize a category (hack to allow looping overit below).
		categories.push({labelName: "_DUMMY_"});
	}
			
	// Loop over repos
	for (var r = 0; r < repoList.length; r++) {
		rnText += getFormat(sFormat, 0) + changesOrKnown + repoList[r] + getFormat(sFormat, 1);

		// Loop over labelTypes (typically Defects, Fixes)
		for (var t = 0; t < rnLabelTypesList.length; t++) {
			var rnList = "";

			// Loop over categories (possibly the single _DUMMY_ entry - see above
			for (var c = 0; c < categories.length; c++) {
				var categoryEstimate = 0;
				var categoryHeader = "";
				if (categories[c].labelName != "_DUMMY_") {
					categoryHeader = getFormat(listFormat, 2) + catFormat + getFormat(listFormat, 3);
					categoryHeader = categoryHeader.replace(/%c/, categories[c].catName);
				}
				var issuesInCategory = 0;

				// Loop over the issues putting into the right categories.
				for (var i = 0; i < repoIssues.length; i++) {
					// Match repo?.
					var repository = repoIssues[i].repository_url.split("/").splice(-1); // Repo name is last element in the url
					if (repository != repoList[r])
						continue;

					// Match issue type (in label)
					if (!yoda.isLabelInIssue(repoIssues[i], rnLabelTypesList[t].split("|")[0]))
						continue;

					// Match category (if using categories at all)
					// What if several labels match- suggest we add them in both/all places where there is a match.
					if (!yoda.isLabelInIssue(repoIssues[i], categories[c].labelName) &&
							categories[c].labelName != "_FALLBACK_" && categories[c].labelName != "_DUMMY_")
						continue;

					// FALLBACK handling
					if (categories[c].labelName == "_FALLBACK_") {
						var otherFound = false;
						// Check if labels match any of the categories.
						for (var c1 = 0; c1 < categories.length; c1++)
							if (c != c1 && yoda.isLabelInIssue(repoIssues[i], categories[c1].labelName))
								otherFound = true;
						if (otherFound)
							continue;
					}

					// Should issue be skipped
					if (yoda.isLabelInIssue(repoIssues[i], rnSkipLabel))
						continue;

					if (issuesInCategory++ == 0)
						rnList += categoryHeader;
					
					var issueEstimate = yoda.getBodyEstimate(repoIssues[i].body);
					if (issueEstimate != null)
						categoryEstimate += issueEstimate;
					
					rnList += getFormat(listFormat, 2) + formatIssueRN(repoIssues[i]) + getFormat(listFormat, 3);
				}
				
				// Update category total
				rnList = rnList.replace(/%z/, categoryEstimate);
			}

			if (rnList != "") {
				// Put header and list, but only if non-empty.
				rnText += getFormat(ssFormat, 0) + rnLabelTypesList[t].split("|")[1] + getFormat(ssFormat, 1);
				rnText += getFormat(listFormat, 0) + rnList + getFormat(listFormat, 1);
			}
		}
	}

	if ($('input:radio[name="outputformat"]:checked').val() == "html") {
		rn.innerHTML = rnText;
	} else {
		rn.innerHTML = "<pre>" + rnText + "</pre>";
	}

	// Download?
	if (download) {
		var fileName = $("#filename").val() + "." + $('input:radio[name="outputformat"]:checked').val();
		console.log("Downloading to " + fileName);
		var appType = "application/" + $('input:radio[name="outputformat"]:checked').val() + ";charset=utf-8;";
		yoda.downloadFileWithType(appType, rnText, fileName);		
	}

	// Copy to clipboard
	copy_text("RN");
	yoda.updateUrl(getUrlParams() + "&draw=" + draw);
}

// -----------

function startTable(_download) {
	download = _download;
	updateRepoData();
}


// ---------------

function updateRepos() {
	yoda.updateReposAndGUI($("#owner").val(), "#repolist", "repolist", "yoda.repolist", null, null);
}

// -------------


function updateDescriptorLoop(repoIndex, branchIndex) {
	console.log("updateDescriptorLoop", repoIndex, branchIndex);
	if (repoIndex < repoList.length && $("#descfile").val() != "") {
		if (branchIndex < repoDetails[repoIndex].branches.length) {
			// Get file   - 		getGitFile(owner, repo, path, branch, finalFunc, errorFunc)
			yoda.getGitFile($("#owner").val(), repoDetails[repoIndex].name, $("#descfile").val(), repoDetails[repoIndex].branches[branchIndex].name, 
			function(data) {
				repoDetails[repoIndex].branches[branchIndex].file = JSON.parse(data);
				updateDescriptorLoop(repoIndex, branchIndex + 1);
			}, 
			function(err) {
				console.log(err);
				updateDescriptorLoop(repoIndex, branchIndex + 1);
			});
		} else {
			// Call for next repo
			updateDescriptorLoop(repoIndex + 1, 0);
		}
	} else {
		console.log("RepoDetails:");
		console.log(repoDetails);
	}
}




function updateRepoDetails(repoIndex) {
	if (repoIndex < repoDetails.length) {
		// Get topics
		var getTopicsUrl = yoda.getGithubUrl() + "repos/" + $("#owner").val() + "/" + repoDetails[repoIndex].name + "/topics";
		yoda.getLoop(getTopicsUrl, 1, [], function(data) {
			repoDetails[repoIndex].topics = data[0].names;
			
			// Get branches?
			if ($("#descfile").val() != "" && $('#allbranches').is(":checked")) {
				var getBranchUrl = yoda.getGithubUrl() + "repos/" + $("#owner").val() + "/" + repoDetails[repoIndex].name + "/branches";
				yoda.getLoop(getBranchUrl, 1, [], function(data) {
					repoDetails[repoIndex].branches = data;
					updateRepoDetails(repoIndex + 1);
				}, null);
			} else {
				updateRepoDetails(repoIndex + 1);
			}
		}, null);
	} else {
		// Now get descriptor info
		updateDescriptorLoop(0, 0);
	} 
}

function updateRepoData() {
	urlList = [];
	repoList.forEach(function(repo, index) {
		urlList.push(yoda.getGithubUrl() + "repos/" + $("#owner").val() + "/" + repo);
	});
	
	yoda.getUrlLoop(urlList, [], function(data) {
		repoDetails = data;
		
		// Requested (and received all repos).
		console.log("Received data for " + repoDetails.length + " repositories");
		console.log(repoDetails);
		
		// Further details
		updateRepoDetails(0);
	}, null);
}


// --------------

function githubAuth() {
	console.log("Github authentisation: " + $("#user").val() + ", token: " + $("#token").val());
	yoda.gitAuth($("#user").val(), $("#token").val());
}

// --------------

function setDefaultAndValue(id, value) {
	element = document.getElementById(id);
	element.defaultValue = value;
	element.value = value;
}

function changeOutput() {
	value = $('input:radio[name="outputformat"]:checked').val();
	
	switch (value) {
	case "html":
		if ($('#tablelayout').is(":checked")) {
			// HPE SA format
			setDefaultAndValue("hlformat", "<H1>,</H1>\\n");
			setDefaultAndValue("sformat", "<H2>,</H2>\\n");
			setDefaultAndValue("ssformat", "<H3>,</H3>\\n");
			setDefaultAndValue("listformat", "<table><thead><tr><th width=10%>Number</th><th width=90%>Description</th></tr></thead><tbody>\n,</tbody></table>\n,<tr>\n,</tr>\n");
			setDefaultAndValue("topicformat", "<td>" + "</td><td>%t%r</td>");
			setDefaultAndValue("repoformat", '<td colspan=2 class="ic"><b>' + '</b></td>');
			
		} else {
			setDefaultAndValue("hlformat", "<H1>,</H1>\\n");
			setDefaultAndValue("sformat", "<H2>,</H2>\\n");
			setDefaultAndValue("ssformat", "<H3>,</H3>\\n");
			setDefaultAndValue("listformat", "<UL>\\n,</UL>\\n,<LI>\\n,</LI>\\n");
			setDefaultAndValue("topicformat", "%t (" +  ")<BLOCKQUOTE>%r</BLOCKQUOTE>");
			setDefaultAndValue("repoformat", "<H4>" +  "</H4>");
		}
		break;

	case "md":
	case "rst":  // Note: for now same as md
		if ($('#tablelayout').is(":checked")) {
			setDefaultAndValue("hlformat", "# ,\\n\\n");
			setDefaultAndValue("sformat", "## ,\\n\\n");
			setDefaultAndValue("ssformat", "### ,\\n\\n");
			setDefaultAndValue("listformat", "Number | Description\\n--------|-------------\\n,\\n,,\\n");
			setDefaultAndValue("topicformat",  " | %t%x");
			setDefaultAndValue("repoformat", "*"  + "*");
		} else {
			setDefaultAndValue("hlformat", "# ,\\n\\n");
			setDefaultAndValue("sformat", "## ,\\n\\n");
			setDefaultAndValue("ssformat", "### ,\\n\\n");
			setDefaultAndValue("listformat", ",,-  ,\\n");
			setDefaultAndValue("topicformat", "%t (" + ")%x");
			setDefaultAndValue("repoformat", "*" + "*");
		}
		break;
	}
}