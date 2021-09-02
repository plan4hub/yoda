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
	params = addIfNotDefault(params, "fields");
	params = addIfNotDefault(params, "descfile");
	params = addIfNotDefault(params, "title");
	
	var outputFormat = $('input:radio[name="outputformat"]:checked').val();
	if (outputFormat != "html")
		params += "&outputformat=" + outputFormat;

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
    selection.removeAllRanges();
}

// Utility function
function accessAsString(object,properties){
   	for(var index=0; index < properties.length; index++){
    	// go to deeper into object until your reached time
		if (object[properties[index]] == undefined)
			return ""; 
		object = object[properties[index]];
	}
   	// here we have reached time and can do something with it or just returning it
   	var res = JSON.stringify(object);
	if (res.startsWith('"') && res[res.length - 1] == '"')
		res = res.substr(1, res.length - 2);
	return res;
}


function makeTable() {
	var rn = document.getElementById("REPOS");
	
	var repoList = $("#repolist").val();
	var repoText = "";
	
	// Get formatting
	var fields = $("#fields").val().split(",");

	// Headline
	if ($('input:radio[name="outputformat"]:checked').val() == "html") {
		repoText += "<h1>" + $("#title").val() + "</h1>";
	} else {
		repoText += "# " + $("#title").val() + "\n";
	}
	
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
		for (var b = 0; b < repoDetails[r].branches.length; b++) {
			// Need to handle the situation that there is NO descriptor file...
			if ($("#descfile").val() != "" && repoDetails[r].branches[b].file == undefined) {
				console.log("Skipping branch " + repoDetails[r].branches[b].name + " as there is no descriptor file.");
				continue; 
			}

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
					case '%b':
						repoText += repoDetails[r].branches[b].name;
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
						if (w.startsWith("%j-")) {
							// Need to go into JSON file. Let's hope it exists ... check that
							if (repoDetails[r].branches[b].file != undefined) {
								var aName = w.substr(3);
								var aValue = accessAsString(repoDetails[r].branches[b].file, aName.split("."));
								if (aValue.startsWith("http://") || aValue.startsWith("https://")) {
									// Lookslike a link... Let's be smart about that.
									if ($('input:radio[name="outputformat"]:checked').val() == "html") 
										repoText += '<a href="' + aValue + '" target="_blank">' + aValue + '</a>';
									else
										repoText += '[' + aValue + '](' + aValue + ')';
								} else {
									if ($('input:radio[name="outputformat"]:checked').val() == "html") {
										// Just add the value 
										repoText += aValue;
									} else {
										// For MD, need to protect against new lines. will not work.
										repoText += aValue.replace(/(\r\n|\n|\r)/gm, "");
									}
								}
							}
						}
						if (w.startsWith("%i-")) {
							var aName = w.substr(3);
							var aValue = accessAsString(repoDetails[r], aName.split("."));
							if (aValue.startsWith("http://") || aValue.startsWith("https://")) {
								// Lookslike a link... Let's be smart about that.
								if ($('input:radio[name="outputformat"]:checked').val() == "html") 
									repoText += '<a href="' + aValue + '" target="_blank">' + aValue + '</a>';
								else
									repoText += '[' + aValue + '](' + aValue + ')';
							} else {
								if ($('input:radio[name="outputformat"]:checked').val() == "html") {
									// Just add the value 
									repoText += aValue;
								} else {
									// For MD, need to protect against new lines. will not work.
									repoText += aValue.replace(/(\r\n|\n|\r)/gm, "");
								}
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
		
		
	}
	if ($('input:radio[name="outputformat"]:checked').val() == "html") 
		repoText += "</tbody></table>";

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
	// console.log("updateDescriptorLoop", repoIndex, branchIndex);
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
			
			// Get all branches?
			if ($('#allbranches').is(":checked")) {
				var getBranchUrl = yoda.getGithubUrl() + "repos/" + $("#owner").val() + "/" + repoDetails[repoIndex].name + "/branches";
				yoda.getLoop(getBranchUrl, 1, [], function(data) {
					repoDetails[repoIndex].branches = data;
					updateRepoDetails(repoIndex + 1);
				}, null);
			} else {
				// Not getting branches. BUT we do want to get the default branch always.
				var getBranchUrl = yoda.getGithubUrl() + "repos/" + $("#owner").val() + "/" + repoDetails[repoIndex].name + "/branches/" + repoDetails[repoIndex].default_branch;
				yoda.getLoop(getBranchUrl, 1, [], function(data) {
					repoDetails[repoIndex].branches = data;
					updateRepoDetails(repoIndex + 1);
				}, null);
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

