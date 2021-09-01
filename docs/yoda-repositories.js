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
	params = addIfNotDefault(params, "title");
	params = addIfNotDefault(params, "branchfilter");
	
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

//Create a List node to based on the given issue.
function formatRepo(repo) {
	var repoFormat = $("#repoformat").val();
	
	if ($('input:radio[name="outputformat"]:checked').val()== "html") 
		var newLine = "<br>";
	else
		var newLine = "&lt;br&gt;";
	
	var repoText = "";
	
	
	// substitude into template
	repoText = repoFormat;
	repoText = repoText.replace(/%t/, repo.description);
	repoText = repoText.replace(/%d/, $('#owner').val() + "/" + repo.name);
	repoText = repoText.replace(/%n/, repo.name);

	
//	repoText = repoText.replace(/%x/, "");
//	repoText = repoText.replace(/%y/, title);
	
	return repoText;
}

function makeTable() {
	var rn = document.getElementById("REPOS");
	
	var repoList = $("#repolist").val();
	var repoText = "";
	
	// Get formatting
	var hlFormat = $("#hlformat").val().split(",");
	var sFormat = $("#sformat").val().split(",");
	var ssFormat = $("#ssformat").val().split(",");
	var listFormat = $("#listformat").val().split(",");

	// Headline
	repoText += getFormat(hlFormat, 0) + $("#title").val() + getFormat(hlFormat, 1);
	
	// Loop over repos
	for (var r = 0; r < repoList.length; r++) {
		repoText += getFormat(sFormat, 0) + repoDetails[r].name + " "  + getFormat(sFormat, 1);
//		repoText += getFormat(ssFormat, 0) + rnLabelTypesList[t].split("|")[1] + getFormat(ssFormat, 1);
//		repoText += getFormat(listFormat, 0) + rnList + getFormat(listFormat, 1);
	}

	if ($('input:radio[name="outputformat"]:checked').val() == "html") {
		rn.innerHTML = repoText;
	} else {
		rn.innerHTML = "<pre>" + repoText + "</pre>";
	}

	// Download?
	if (download) {
		var fileName = $("#filename").val() + "." + $('input:radio[name="outputformat"]:checked').val();
		console.log("Downloading to " + fileName);
		var appType = "application/" + $('input:radio[name="outputformat"]:checked').val() + ";charset=utf-8;";
		yoda.downloadFileWithType(appType, repoText, fileName);		
	}

	// Copy to clipboard
	copy_text("REPOS");
	yoda.updateUrl(getUrlParams() + "&draw=table");
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
			// Get file- 
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
		makeTable();
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