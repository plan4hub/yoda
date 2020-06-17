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


// Global storage of the labels currently on the screen.
var globalLabels = [];
globalLabels["srclabels"] = {};
globalLabels["dstlabels"] = {};

function showLabels(labelTag, labels, operationFunc) {
	$("#" + labelTag).html("");
	globalLabels[labelTag] = labels;
	
	var labelsHtml = "";
	
	for (var l = 0; l < labels.length; l++) {
		var operation =  operationFunc(labels[l]);
		var foreground = yoda.bestForeground(labels[l].color);
		var description = labels[l].description;
		if (description == undefined)
			description = "Description not set";
		
		console.log("Label: " + labels[l].id + ", name: " + labels[l].name + ", color: " + labels[l].color + ", operation: " + operation + ", foreground: " + foreground);
		var html = "<button id=\"" + labels[l].id + "\" class=\"gitlabel\" style=\"background: #" + labels[l].color + "; color: " + foreground + "\" " + 
				"onclick=\"" + operation + "\" title=\"" + description + "\">" + labels[l].name + "</button>";
		console.log(html);
		labelsHtml += html;
	}
	$("#" + labelTag).html(labelsHtml);
//	console.log(globalLabels);
	$("#" + labelTag + "number").val(labels.length);
//	yoda.showSnackbarOk("Read " + labels.length + " labels.");
}

function clearSrcLabels() {
	$("#srclabels").html("");
	globalLabels["srclabels"] = {};
}

function clearDstLabels() {
	$("#dstlabels").html("");
	globalLabels["dstlabels"] = {};
}

function showSrcRepos(repos) {
	console.log("Got " + repos.length + " repos.");
	repos.sort(function(a,b) {
		if (a.name.toLowerCase() < b.name.toLowerCase()) 
			return -1;
		else
			return 1;
	});

	for (var r = 0; r < repos.length; r++) {
		$("#srcrepolist").append($("<option></option>").attr("value", repos[r].name));
	}
	
	updateDstRepos();
}

function updateSrcRepos() {
	console.log("Update repos");
	$("#srcrepolist").empty();
	
	var getReposUrl = yoda.getGithubUrl() + "orgs/" + $("#srcowner").val() + "/repos";
	yoda.getLoop(getReposUrl, 1, [], showSrcRepos, null);
	
}

// -------
function showDstRepos(repos) {
	console.log("Got " + repos.length + " repos.");
	repos.sort(function(a,b) {
		if (a.name.toLowerCase() < b.name.toLowerCase()) 
			return -1;
		else
			return 1;
	});

	for (var r = 0; r < repos.length; r++) {
		$("#dstrepolist").append($("<option></option>").attr("value", repos[r].name));
	}
	
}

function updateDstRepos() {
	console.log("Update repos");
	$("#dstrepolist").empty();
	
	var getReposUrl = yoda.getGithubUrl() + "orgs/" + $("#dstowner").val() + "/repos";
	yoda.getLoop(getReposUrl, 1, [], showDstRepos, null);
}


// Create / update label in dst
// Argument is an array of label (name, color). Calls itself recursively, cutting off one label name at a time.
function copyLabels(nameColorArray) {
	$("*").css("cursor", "wait");
	if (nameColorArray.length == 0) {
		$("*").css("cursor", "default");
		// Done deleting. Let's refresh
		getDstLabels();
		return;
	}
	name = nameColorArray[0].name;
	color = nameColorArray[0].color;
	description = nameColorArray[0].description;
	
//	console.log("copyLabels. Name: " + name + ", color: " + color);
	
	// Let's check if the label is present in dstArray.
	for (var l = 0; l < globalLabels["dstlabels"].length; l++) {
		if (name == globalLabels["dstlabels"][l].name) {
			
			if (color != globalLabels["dstlabels"][l].color || description != globalLabels["dstlabels"][l].description) {
				var patchLabelUrl = yoda.getGithubUrl() + "repos/" + $("#dstowner").val() + "/" + $("#dstrepo").val() + "/labels/" + encodeURIComponent(name);
				console.log("patchUrl: " + patchLabelUrl);

				var urlData = {
						"name": name,
						"color": color,
                };
                if (description != null)
                    urlData["description"] = description;
				
				$.ajax({
					url: patchLabelUrl,
					type: 'PATCH',
					data: JSON.stringify(urlData),
					success: function() { yoda.showSnackbarOk("Succesfully updated existing label: " + name); },
					error: function() { yoda.showSnackbarError("Failed to update existing label: " + name); },
					complete: function(jqXHR, textStatus) { copyLabels(nameColorArray.splice(1)); return;}
				});
			} else {
				yoda.showSnackbarError("Label " + name + " already exists.");
			}
			
			copyLabels(nameColorArray.splice(1));
			return;
		}
	}
			
	// Create it.
	var createLabelUrl = yoda.getGithubUrl() + "repos/" + $("#dstowner").val() + "/" + $("#dstrepo").val() + "/labels";
	console.log("createUrl: " + createLabelUrl);

	var urlData = {
			"name": name,
			"color": color,
	};
    if (description != null)
        urlData["description"] = description;
	
	$.ajax({
		url: createLabelUrl,
		type: 'POST',
		data: JSON.stringify(urlData),
		success: function() { yoda.showSnackbarOk("Succesfully created label: " + name); },
		error: function() { yoda.showSnackbarError("Failed to create label: " + name); },
		complete: function(jqXHR, textStatus) { copyLabels(nameColorArray.splice(1));}
	});
}

// Delete labels as indicated by the names in the array. Calls itself recursively, cutting off one label name at a time.
function deleteLabels(nameArray) {
	$("*").css("cursor", "wait");
	if (nameArray.length == 0) {
		$("*").css("cursor", "default");
		// Done deleting. Let's refresh
		getDstLabels();
		return;
	}
	
	var name = nameArray[0];
	console.log("deleteLabel. Name: " + name);

	// We will only delete if no issues associated.
	// So, let's query the repo to see if any such issues exist.
	var getIssuesUrl = yoda.getGithubUrl() + "repos/" + $("#dstowner").val() + "/" + $("#dstrepo").val() + "/issues?state=all&labels=" + encodeURIComponent(name);
	console.log(getIssuesUrl);

	$.getJSON(getIssuesUrl, function(response, status) {
		if (response.length > 0) {
			console.log("    Got " + response.length + " issues for " + name + ", will not delete.");
			yoda.showSnackbarError("Error deleting label: " + name + " as issues are using it.");
			deleteLabels(nameArray.splice(1));
		} else {
			var deleteLabelUrl = yoda.getGithubUrl() + "repos/" + $("#dstowner").val() + "/" + $("#dstrepo").val() + "/labels/" + encodeURIComponent(name);
			console.log("deleteUrl: " + deleteLabelUrl);

			$.ajax({
				url: deleteLabelUrl,
				type: 'DELETE',
				success: function() { yoda.showSnackbarOk("Succesfully deleted " + name); },
				error: function() { yoda.showSnackbarError("Failed to delete label " + name); },
				complete: function(jqXHR, textStatus) { deleteLabels(nameArray.splice(1)); }
			});
		}
	});
}

function copyAllLabels() {
	var nameColorArray = [];
	for (var l = 0; l < globalLabels["srclabels"].length; l++) {
		var nameColorEntry = {
				name: globalLabels["srclabels"][l].name, 
				color: globalLabels["srclabels"][l].color,
				description: globalLabels["srclabels"][l].description
		};
		nameColorArray.push(nameColorEntry);
	}
	copyLabels(nameColorArray);
}

function deleteAllLabels() {
	var nameArray = [];
	for (var l = 0; l < globalLabels["dstlabels"].length; l++) {
		nameArray.push(globalLabels["dstlabels"][l].name);
	}
	deleteLabels(nameArray);
}

// Get all source repo labels. Build a button for each, which calls copyLabels with an array of length one containing
// an object with name and color.
function getSrcLabels() {
	var getLabelsUrl = yoda.getGithubUrl() + "repos/" + $("#srcowner").val() + "/" + $("#srcrepo").val() + "/labels";
	yoda.getLoop(getLabelsUrl, 1, [], function(labels) {
		showLabels("srclabels", labels, function(label) {
			return "copyLabels([{ name: \'" + label.name + "\', color: \'"+ label.color + "\'}]);";
		})
	}, 	clearSrcLabels);
}

// Get all destination repo labels. Build a button for each, which calls deleteLabels with an array of length one
// containing the name of the label to be deleted. Delete functions checks that no issues exists for the label before
// deleting.
function getDstLabels() {
	var getLabelsUrl = yoda.getGithubUrl() + "repos/" + $("#dstowner").val() + "/" + $("#dstrepo").val() + "/labels";
	yoda.getLoop(getLabelsUrl, 1, [], function(labels) {
		showLabels("dstlabels", labels, function(label) {
			return "deleteLabels([\'" + label.name + "\']);";
		})
	}, 	clearDstLabels);
}

function openSrcRepo() {
	var gitHubUrl = yoda.getGithubUrlHtml() + $("#srcowner").val() + "/" + $("#srcrepo").val() + "/issues/labels";
	console.log("Open url: " + gitHubUrl);
	window.open(gitHubUrl);
}

function openDstRepo() {
	var gitHubUrl = yoda.getGithubUrlHtml() + $("#dstowner").val() + "/" + $("#dstrepo").val() + "/issues/labels";
	console.log("Open url: " + gitHubUrl);
	window.open(gitHubUrl);
}

// --------------

function githubAuth() {
	console.log("Updating/setting github authentication for: " + $("#user"));
	yoda.gitAuth($("#user").val(), $("#token").val());
}
