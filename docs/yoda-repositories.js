7//  Copyright 2018 Hewlett Packard Enterprise Development LP
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

var repoList = [];  // selected repos

var repoDetails = []; // List of issues. Full structure as returned from github.

var download = false; // global - a bit of a hack.

function addIfNotDefault(params, field) {
	let defaultValue = $("#" + field).prop('defaultValue');
	// Hack. Make sure no real newlines into default value.
	defaultValue = defaultValue.replace(/\n/g, "");
	let value = $("#" + field).val();
	
	if (value != defaultValue) {
		console.log("value: " + value);
		console.log("defa : " + defaultValue);
		return params + "&" + field + "=" + value; 
	} else {
		return params;
	}
}

function getUrlParams() {
	let params = "owner=" + $("#owner").val();
	if ($("#repolist").val() != "")
		params += "&repolist=" + $("#repolist").val();
	params = addIfNotDefault(params, "fields");
	params = addIfNotDefault(params, "descfile");
	params = addIfNotDefault(params, "title");
	
	const outputFormat = $('input:radio[name="outputformat"]:checked').val();
	if (outputFormat != "html")
		params += "&outputformat=" + outputFormat;

	if ($('#allbranches').is(":checked")) {
		params += "&allbranches=true";
	}
	
	return params;
}

function copy_text(element) {
    //Before we copy, we are going to select the text.
    const text = document.getElementById(element);
    let selection = window.getSelection();
    selection.removeAllRanges();
    let range = document.createRange();
    range.selectNodeContents(text);

    selection.addRange(range);

    // Now that we've selected element, execute the copy command  
    try {  
        const successful = document.execCommand('copy');  
        const msg = successful ? 'successful' : 'unsuccessful';  
        console.log('Copy to clipboard command was ' + msg);  
      } catch(err) {  
        console.log('Oops, unable to copy to clipboard');  
      }

    // Remove selection. TBD: Remove, when copy works.
    selection.removeAllRanges();
}


function stripQuotes(str) {
	if (str.startsWith('"') && str.length > 1 && str[str.length - 1] == '"')
		return str.substr(1, str.length - 2);
	else
		return str;
}

// Utility function
function accessAsString(object,properties){
	for(let index=0; index < properties.length; index++){
		// go to deeper into object until your reached time
		if (object[properties[index]] == undefined)
			return ""; 
		object = object[properties[index]];
	}
	
	// If end result is an Array, we can do better than JSON.stringify.
	let res = "";
	if (Array.isArray(object)) {
		for (let i = 0; i < object.length; i++) {
			if (res != "")
				res += ", ";
			res += stripQuotes(JSON.stringify(object[i]));
		}
	} else {
		res = stripQuotes(JSON.stringify(object));
	}
	return res;
}

export function makeTable() {
	const rn = document.getElementById("REPOS");
	
	const repoList = $("#repolist").val();
	let repoText = "";
	
	// Get formatting
	const fields = $("#fields").val().split(",");

	// Headline
	if ($('input:radio[name="outputformat"]:checked').val() == "html")
		repoText += "<h1>" + $("#title").val() + "</h1>";
	else
		repoText += "# " + $("#title").val() + "\n";
	
	if ($('input:radio[name="outputformat"]:checked').val() == "html") {
		repoText += "<table><thead><tr>";
		fields.forEach((f) => {
			repoText += "<th>" + f.split(":")[0] + "</th>";
		});
		repoText += "</tr><thead>";
		repoText += "<tbody>";	
	} else {
		fields.forEach((f) => {
			repoText += f.split(":")[0] + " | ";
		});
		repoText += "\n";
		fields.forEach((f) => {
			repoText += '-'.repeat(f.split(":")[0].length) + " | ";
		});
		repoText += "\n";
	}
	
	// Loop over repos
	for (let r = 0; r < repoList.length; r++) {
		for (let b = 0; b < repoDetails[r].branches.length; b++) {
			// Need to handle the situation that there is NO descriptor file...
			if ($("#descfile").val() != "" && repoDetails[r].branches[b].file == undefined) {
				console.log("Skipping branch " + repoDetails[r].branches[b].name + " as there is no descriptor file.");
				continue; 
			}

			if ($('input:radio[name="outputformat"]:checked').val() == "html") 
				repoText += "<tr>";
			
			fields.forEach((f) => {
				if ($('input:radio[name="outputformat"]:checked').val() == "html") 
					repoText += "<td>";
				
				// Value
				const w = f.split(":")[1];
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
								const aName = w.substr(3);
								const aValue = accessAsString(repoDetails[r].branches[b].file, aName.split("."));
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
							const aName = w.substr(3);
							const aValue = accessAsString(repoDetails[r], aName.split("."));
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

	if ($('input:radio[name="outputformat"]:checked').val() == "html")
		rn.innerHTML = repoText;
	else
		rn.innerHTML = "<pre>" + repoText + "</pre>";

	// Download?
	if (download) {
		const fileName = $("#filename").val() + "." + $('input:radio[name="outputformat"]:checked').val();
		console.log("Downloading to " + fileName);
		const appType = "application/" + $('input:radio[name="outputformat"]:checked').val() + ";charset=utf-8;";
		yoda.downloadFileWithType(appType, repoText, fileName);		
	}

	// Copy to clipboard
	copy_text("REPOS");
	yoda.updateUrl(getUrlParams() + "&draw=table");
}

// -----------

export function startTable(_download) {
	download = _download;
	updateRepoData();
}

export function updateRepos() {
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
		const getTopicsUrl = yoda.getGithubUrl() + "repos/" + $("#owner").val() + "/" + repoDetails[repoIndex].name + "/topics";
		yoda.getLoop(getTopicsUrl, 1, [], function(data) {
			repoDetails[repoIndex].topics = data[0].names;
			
			// Get all branches?
			if ($('#allbranches').is(":checked")) {
				const getBranchUrl = yoda.getGithubUrl() + "repos/" + $("#owner").val() + "/" + repoDetails[repoIndex].name + "/branches";
				yoda.getLoop(getBranchUrl, 1, [], function(data) {
					repoDetails[repoIndex].branches = data;
					updateRepoDetails(repoIndex + 1);
				}, null);
			} else {
				// Not getting branches. BUT we do want to get the default branch always (IF there is a branch at all)
				const getBranchUrl = yoda.getGithubUrl() + "repos/" + $("#owner").val() + "/" + repoDetails[repoIndex].name + "/branches/" + repoDetails[repoIndex].default_branch;
				yoda.getLoop(getBranchUrl, 1, [], function(data) {
					repoDetails[repoIndex].branches = data;
					updateRepoDetails(repoIndex + 1);
				}, function() {
					console.log("PROBLEMS GETTING BRANCH" + getBranchUrl);
					repoDetails[repoIndex].branches = [];
					updateRepoDetails(repoIndex + 1);	
				});
			}
		}, null);
	} else {
		// Now get descriptor info
		updateDescriptorLoop(0, 0);
	} 
}

export function updateRepoData() {
	let urlList = [];
	repoList.forEach(function(repo) {
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

export function init() {
	// Enable yodamenu
	yoda.enableMenu("#repositories");

	yoda.getDefaultLocalStorage("#owner", "yoda.owner");
	yoda.getDefaultLocalStorage("#repolist", "yoda.repolist");
	
	yoda.decodeUrlParam("#owner", "owner");
	
	yoda.decodeUrlParamBoolean("#closedmilestones", "closedmilestones");

	yoda.decodeUrlParamRadio("outputformat", "outputformat");
	yoda.decodeUrlParam("#filename", "filename");
	
	yoda.decodeUrlParam("#descfile", "descfile");
	yoda.decodeUrlParamBoolean("#allbranches", "allbranches");

	yoda.decodeUrlParam("#title", "title");
	yoda.decodeUrlParam("#fields", "fields");
	
	// Local storage
	yoda.getUserTokenLocalStorage("#user", "#token");

	// Do it after getting from localStorage
	yoda.decodeUrlParam("#user", "user");
	yoda.decodeUrlParam("#token", "token");
			
	// Login
	console.log("Github authentisation: " + $("#user").val() + ", token: " + $("#token").val());
	yoda.gitAuth($("#user").val(), $("#token").val());

	// Event listeners
	$("#hamburger").on("click", yoda.menuClick);

	$(document).ready(function() {
		$('#repolist').select2({
			// minimumInputLength: 2,
			sorter: yoda.select2Sorter,
			matcher: yoda.select2Matcher
		});
		$('#repolist').on('select2:select', yoda.select2SelectEvent('#repolist')); 

		// eslint-disable-next-line no-unused-vars
		$('#repolist').on('change.select2', function (e) {
			repoList = 	$("#repolist").val();			
			console.log("List of selected repos is now: " + repoList);
			
			if (yoda.decodeUrlParamBoolean(null, "draw") == "table") {
				startTable(false)
			} 
		});
		
		updateRepos();
	});

	if (yoda.decodeUrlParam(null, "hideheader") == "true")
	$(".frame").hide();
}