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
	params = addIfNotDefault(params, "titleformat");
	params = addIfNotDefault(params, "fields");
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
	var titleFormat = $("#titleformat").val().split(",");
	var fields = $("#fields").val().split(",");

	// Headline
	repoText += getFormat(titleFormat, 0) + $("#title").val() + getFormat(titleFormat, 1);
	
	if ($('input:radio[name="outputformat"]:checked').val() == "html") {
		repoText += "<table><thead><tr>";
		fields.forEach((f, fIndex) => {
			repoText += "<td>" + f.split(":")[0] + "</td>";
		});
		repoText += "</tr><thead>";
		repoText += "<tbody>";	
	} else {
		fields.forEach((f, fIndex) => {
			repoText += f.split(":")[0] + " | ";
		});
		repoText += "\n";
		fields.forEach((f, fIndex) => {
			repoText += '-'.repeat(f.split(":")[0].length) + " | ";
		});
		repoText += "\n";
	}
	
	
	// Loop over repos
	for (var r = 0; r < repoList.length; r++) {
		if ($('input:radio[name="outputformat"]:checked').val() == "html") 
			repoText += "<tr>";
		
		fields.forEach((f, fIndex) => {
			if ($('input:radio[name="outputformat"]:checked').val() == "html") 
				repoText += "<td>";
			
			// Value
			var w = f.split(":")[1];
			switch (w) {
				case '%r':
					repoText += repoDetails[r].name;
					break;
				case '%d':
					repoText += (repoDetails[r].description == null)? "" : repoDetails[r].description;
					break;
				case '%u':
					if ($('input:radio[name="outputformat"]:checked').val() == "html") 
						repoText += '<a href="' + repoDetails[r].html_url + '" target="_blank">' + repoDetails[r].owner.login + "/" +  repoDetails[r].name + '</a>';
					else
						repoText += "[" + repoDetails[r].owner.login + "/" +  repoDetails[r].name + "](" + repoDetails[r].html_url + ")"; 
					break;
				case '%t':
					repoText += repoDetails[r].topics.join(",");
					break;
				default:
					if (w.startsWith("%o-")) {
						var topic = w.substr(3);
						if (repoDetails[r].topics.indexOf(topic) != -1) {
							repoText += "Yes";
						}
					}
					break;
			}
			
			if ($('input:radio[name="outputformat"]:checked').val() == "html") 
				repoText += "</td>";
			else
				repoText += " | ";
		});
		
		if ($('input:radio[name="outputformat"]:checked').val() == "html") 
			repoText += "</tr>";
		else
			repoText += "\n";
		
	}
	repoText += "</tbody>";

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
		// HPE SA format
		setDefaultAndValue("titleformat", "<H1>,</H1>\\n");
		setDefaultAndValue("fields", "Repository:%r,Description:%d,URL:%u,Topics:%t");
		break;

	case "md":
	case "rst":  // Note: for now same as md
		setDefaultAndValue("titleformat", "# ,\\n\\n");
		setDefaultAndValue("fields", "Repository:%r,Description:%d,URL:%u,Topics:%t");
		break;
	}
}