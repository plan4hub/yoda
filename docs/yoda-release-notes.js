//  Copyright 2018-2023 Hewlett Packard Enterprise Development LP
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

// Global variable controlling whether bars should be stacked or not.
// If stacked, then tool will not do a "totals" line and a corresponding right axis.
let ALL_MILESTONES = -1;

let repoList = [];  // selected repos
let repoMilestones = []; // Double-array of repos,milestone (full structure) for selected repos

let commonMilestones = []; // Options for milestone selection (milestones in all repos).
let milestoneList = []; // selected milestones just the title
let milestoneListComplete = []; // selected milestones, full structure.

let repoIssues = []; // List of issues. Full structure as returned from github.
let download = false; // global - a bit of a hack.
let css = "";

function addIfNotDefault(params, field) {
	const fname = "#" + field;
	if ($(fname).prop('type') == 'checkbox') {
		// Checkbox case
		if ($(fname).prop('defaultChecked') && !$(fname).prop('checked'))
			params += "&" + field + "=false";
		else if (!$(fname).prop('defaultChecked') && $(fname).prop('checked'))
			params += "&" + field + "=true";
	} else {
		// Normal field
		// Newlines may have been added. Ignore those.
		if ($(fname).val() != $(fname).prop('defaultValue'))
			params += "&" + field + "=" + $(fname).val().replace(/\n/g, "");
	}
	return params;
}

function getUrlParams() {
	let params = "owner=" + $("#owner").val();
	if (yoda.decodeUrlParam(null, "repotopic") != null)
		params += "&repotopic=" + yoda.decodeUrlParam(null, "repotopic");
	else
		if ($("#repolist").val() != "")
			params += "&repolist=" + $("#repolist").val();
	if ($("#milestonelist").val() != "")
		params += "&milestonelist=" + $("#milestonelist").val();

	["labelfilter", "rnlabeltypes", "rnknownlabeltypes", "rnskiplabel", "rnmetalabel", "rnknownlabel", "hlformat", "sformat", "ssformat", 
	"listformat", "catformat", "rnformat", "catlabel", "cssowner", "cssrepo", "csspath", "cssbranch", "closedmilestones", "tablelayout", 
	"estimatecategory", "estimateissue"].forEach((p) => {
		params = addIfNotDefault(params, p); });
	
	if (yoda.getEstimateInIssues() != "inbody")
		params += "&estimate=" + yoda.getEstimateInIssues();
	
	const outputFormat = $('input:radio[name="outputformat"]:checked').val();
	if (outputFormat != "html")
		params += "&outputformat=" + outputFormat;
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
    // selection.removeAllRanges();
}

// Remove elements in array that have duplicates based on a given field.
function uniqueArray(arr, field) {
	// eslint-disable-next-line no-unused-vars
	return arr.filter(function(element, index, array, thisArg) {return array.findIndex(function(e, i, a, t) 
			{if (index != i && element[field] == e[field]) return true; else return false;}) == -1;});
}

// --------
// Add issues, making sure to avoid duplicates.
function addIssues(oldIssues, newIssues) {
	return uniqueArray(oldIssues.concat(newIssues), "url");
}

function getFormat(formatArray, index) {
	let f = formatArray[index]; 
	f = f.replace(/\\n/g, '\n');
	return f;
}

//Parse RN markdown to HTML (if any)
function parseRNMarkdown(markdown) {
//	console.log(markdown);
	let markdownUrl = yoda.getGithubUrl() + "markdown";
	markdown = markdown.replace(/<br>/g, '<br>\n');  // A bit of a hack, but best way to handle that sometimes people have done lists using markdown, other times with bullets. 
//	console.log("markdownUrl: " + markdownUrl);

	const urlData = {
		"text": markdown
	};
	
	let result = "";
	$.ajax({
		url: markdownUrl,
		type: 'POST',
		async: false, 
		data: JSON.stringify(urlData),
		success: function(data) { result = data;},
		error: function() { yoda.showSnackbarError("Failed to translate Markdown"); },
		// eslint-disable-next-line no-unused-vars
		complete: function(jqXHR, textStatus) { }
	});
	
//	console.log(result);
	return result;
}


//Create a List node to based on the given issue.
function formatIssueRN(issue) {
	const rnFormat = $("#rnformat").val();
	const repo = yoda.getUrlRepo(issue.url);
	
	let newLine;
	if ($('input:radio[name="outputformat"]:checked').val()== "html") 
		newLine = "<br>";
	else 
		newLine = "&lt;br&gt;";
	
	let issueText = "";
	const line = yoda.extractKeywordField(issue.body, "RNT", "single", newLine);
	let title;
	if (line != "")
		title = line;
	else
		title = issue.title;

	let rnText = yoda.extractKeywordField(issue.body, "RN", "paragraph", newLine);
//	console.log("rnText:" + rnText + ":");
	
	// HTML?
	const mdChars = /[*`_~>]+/;
	if ($('input:radio[name="outputformat"]:checked').val()== "html" && rnText != "" && mdChars.test(rnText)) { 
		rnText = parseRNMarkdown(rnText);
		
		// If <p> formatted, let's get rid of any bottom or top margin.
		rnText = rnText.replaceAll('<p>', '<p style="margin: 0">');
	}
	console.log("rnText:" + rnText);
		
	if ($('input:radio[name="outputformat"]:checked').val()== "html" && title != "" && mdChars.test(title)) { 
		title = parseRNMarkdown(title);

		// If <p> formatted, let's get rid of any top margin.
		title = title.replaceAll('<p>', '<p style="margin-top: 0">');
	}
	console.log("title:" + title);

	// substitude into template
	issueText = rnFormat;
//	issueText = issueText.replaceAll(/\\n/g, "\n");
	issueText = issueText.replace(/%t/, title);
	issueText = issueText.replace(/%d/, repo + "#" + issue.number);
	issueText = issueText.replace(/%n/, issue.number);
	issueText = issueText.replace(/%r/, rnText);

	let estimate = yoda.getBodyEstimate(issue.body);
	if (estimate == null)
		estimate = "";
	issueText = issueText.replace(/%e/, estimate);

	if (rnText != "") {
		issueText = issueText.replace(/%y/, rnText);
		// Don't add newLines if there is already a paragraph.
		if (issueText.indexOf("<p") == -1)
			issueText = issueText.replace(/%x/, newLine + newLine + rnText);
		else
			issueText = issueText.replace(/%x/, rnText);
		console.log(":" + issueText + ":");
	} else { 
		issueText = issueText.replace(/%x/, "");
		issueText = issueText.replace(/%y/, title);
	}
	
	return issueText;
}

function makeRN(headline, changesOrKnown, draw) {
	const rn = document.getElementById("RN");
	const repoList = $("#repolist").val();
	let rnText = "";
	
	// T2 - Enhancements|Added Features,T1 - Defect|Solved Issues
	let rnLabelTypes;
	if (draw == "known")
		rnLabelTypes = $("#rnknownlabeltypes").val();
	else
		rnLabelTypes = $("#rnlabeltypes").val();
	const rnLabelTypesList = rnLabelTypes.split(",");
	
	// Skip label
	const rnSkipLabel = $("#rnskiplabel").val();

//  Will be something like...
//	var issueTypeList = ["T2 - Enhancement", "T1 - Defect"];
//	var issueTypeHeading = ["Added Features", "Solved Issues"];
	
	// Get formatting
	const hlFormat = $("#hlformat").val().split(",");
	const sFormat = $("#sformat").val().split(",");
	const ssFormat = $("#ssformat").val().split(",");
	const listFormat = $("#listformat").val().split(",");
	const catFormat = $("#catformat").val();

	// Headline - if present. Otherwise skip.
	if ($("#hlformat").val().indexOf(",") != -1)
		rnText += getFormat(hlFormat, 0) + headline + $("#milestonelist").val() + getFormat(hlFormat, 1);
	
	// Categories. First build list based on regular expression (if any)
	let categories = [];
	const catLabel = $("#catlabel").val().split(",");
	if (catLabel.length == 2) {
		const catReg = new RegExp(catLabel[1]);
		for (let i = 0; i < repoIssues.length; i++) {
			for (let l=0; l < repoIssues[i].labels.length; l++) {
				const labelName = repoIssues[i].labels[l].name;
				const res = labelName.match(catReg);
				let catName;
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
		categories = categories.sort(function(a,b) {return a.catName < b.catName? -1 : 1;});
		
		// Add fallback category
		categories.push({labelName: "_FALLBACK_", catName: catLabel[0]});
		
		console.log("List of categories:");
		console.log(categories);
	} else {
		// Synthesize a category (hack to allow looping overit below).
		categories.push({labelName: "_DUMMY_"});
	}
			
	// Loop over repos
	for (let r = 0; r < repoList.length; r++) {
		// Section - if present. Otherwise skip.
		if ($("#sformat").val().indexOf(",") != -1)
			rnText += getFormat(sFormat, 0) + changesOrKnown + repoList[r] + getFormat(sFormat, 1);

		// Loop over labelTypes (typically Defects, Fixes)
		for (let t = 0; t < rnLabelTypesList.length; t++) {
			var rnList = "";

			// Loop over categories (possibly the single _DUMMY_ entry - see above
			for (let c = 0; c < categories.length; c++) {
				let categoryEstimate = 0;
				let categoryHeader = "";
				if (categories[c].labelName != "_DUMMY_") {
					categoryHeader = getFormat(listFormat, 2) + catFormat + getFormat(listFormat, 3);
					categoryHeader = categoryHeader.replace(/%c/, categories[c].catName);
				}
				let issuesInCategory = 0;

				// Loop over the issues putting into the right categories.
				for (let i = 0; i < repoIssues.length; i++) {
					// Match repo?.
					const repository = repoIssues[i].repository_url.split("/").splice(-1); // Repo name is last element in the url
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
						let otherFound = false;
						// Check if labels match any of the categories.
						for (let c1 = 0; c1 < categories.length; c1++)
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
					
					let issueEstimate = yoda.getBodyEstimate(repoIssues[i].body);
					if (issueEstimate != null)
						categoryEstimate += issueEstimate;
					
					rnList += getFormat(listFormat, 2) + formatIssueRN(repoIssues[i]) + getFormat(listFormat, 3);
				}
				
				// Update category total
				rnList = rnList.replace(/%z/, categoryEstimate);
			}

			if (rnList != "" ) {
				// Put header and list, but only if non-empty.  
				// If ssformat is blank, forget starting over, skip the header
				if ($("#ssformat").val().indexOf(",") != -1)
					rnText += getFormat(ssFormat, 0) + rnLabelTypesList[t].split("|")[1] + getFormat(ssFormat, 1);
				rnText += getFormat(listFormat, 0) + rnList + getFormat(listFormat, 1);
			}
		}
	}

	if ($('input:radio[name="outputformat"]:checked').val() == "html") {
		if (css != "")
			rn.innerHTML = "<style>" + css + "</style>" + rnText;
		else
			rn.innerHTML = rnText;
	} else {
		rn.innerHTML = "<pre>" + rnText + "</pre>";
	}

	// Download?
	if (download) {
		const fileName = $("#filename").val() + "." + $('input:radio[name="outputformat"]:checked').val();
		console.log("Downloading to " + fileName);
		const appType = "application/" + $('input:radio[name="outputformat"]:checked').val() + ";charset=utf-8;";
		yoda.downloadFileWithType(appType, rnText, fileName);		
	}

	// Copy to clipboard
	copy_text("RN");
	yoda.updateUrl(getUrlParams() + "&draw=" + draw);
}

// -----------

function startRN(_download) {
	download = _download;
	css = "";
	
	// Custom CSS stuff
	if ($('input:radio[name="outputformat"]:checked').val()== "html" && $("#cssowner").val() != "" && $("#cssrepo").val() != "" && $("#csspath").val() != "") {
		// Let's get the css
		yoda.getGitFile($("#cssowner").val(), $("#cssrepo").val(), $("#csspath").val(), $("#cssbranch").val(), 
		function(data) {
			css = "<style>" + data + "</style>";
			updateIssuesForRN();
		}, 
		function(errorText) {
			yoda.showSnackbarError("Error retriving CSS file: " + errorText);
		});
	} else {
		updateIssuesForRN();
	}
}

function startKnown(_download) {
	download = _download;
	css = "";
	
	// Custom CSS stuff
	if ($('input:radio[name="outputformat"]:checked').val()== "html" && $("#cssowner").val() != "" && $("#cssrepo").val() != "" && $("#csspath").val() != "") {
		// Let's get the css
		yoda.getGitFile($("#cssowner").val(), $("#cssrepo").val(), $("#csspath").val(), $("#cssbranch").val(), 
		function(data) {
			css = "<style>" + data + "</style>";
			updateIssuesKnown();
		}, 
		function(errorText) {
			yoda.showSnackbarError("Error retriving CSS file: " + errorText);
		});
	} else {
			updateIssuesKnown();
	}
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
	console.log("updateMilestones " + repoIndex);
	if (repoIndex == undefined)
		repoIndex = 0;
	
	if (repoIndex < repoList.length) {
		let getMilestonesUrl;
		if ($('#closedmilestones').is(":checked"))
			getMilestonesUrl = yoda.getGithubUrl() + "repos/" + $("#owner").val() + "/" + repoList[repoIndex] + "/milestones?state=all";
		else
			getMilestonesUrl = yoda.getGithubUrl() + "repos/" + $("#owner").val() + "/" + repoList[repoIndex] + "/milestones?state=open";
		console.log("Milestone get URL: " + getMilestonesUrl);
		
		yoda.getLoop(getMilestonesUrl, 1, [], function(data) {storeMilestones(data, repoIndex);}, null);
	} else {
		let selectMilestones = [];
		if (firstMilestoneShow) {
			firstMilestoneShow = false;
			const urlMilestoneList = yoda.decodeUrlParam(null, "milestonelist");
			if (urlMilestoneList != null) 
				selectMilestones = urlMilestoneList.split(",");
		}
		
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
		let milestonesSelected = false;
		for (let c = 0; c < commonMilestones.length; c++) {
			let selectMilestone = false;
			if (selectMilestones.indexOf(commonMilestones[c]) != -1) { 
				selectMilestone = true;
				milestonesSelected = true;
			}
			
			const newOption = new Option(commonMilestones[c], commonMilestones[c], selectMilestone, selectMilestone);
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
	
//	repoIssues = repoIssues.concat(issues);
	repoIssues = addIssues(repoIssues, issues);
	console.log("total number of issues now: "  + repoIssues.length);
	updateIssueLoop(milestoneIndex + 1, myUpdateIssueActiveNo);
}

function updateMetaIssuesThenRN(metaIssuesList) {
	if (metaIssuesList.length > 0) {
		const getIssueUrl = metaIssuesList[0];
		yoda.getLoop(getIssueUrl, -1, [], function(data) {repoIssues = addIssues(repoIssues, data); metaIssuesList.splice(0, 1); updateMetaIssuesThenRN(metaIssuesList);}, null);
	} else {
		// Let's sort issues on number. This may be required as we allow to retrieve issues from different milestones.
		// Sort by repository, number
		repoIssues.sort(function(a,b) {
			if (a.repository_url == b.repository_url)
				return a.number - b.number; 
			return a.repository_url > b.repository_url? 1 : -1;
		});
	
		console.log("No issues (after filtering out pull requests): " + repoIssues.length);
		yoda.showSnackbarOk("Succesfully retrived " + repoIssues.length + " issues.");
		makeRN("Release notes for ", "Changes for ", "rn");
	}
}

let updateIssueActiveNo = 0;
function updateIssueLoop(milestoneIndex, myUpdateIssueActiveNo) {
	if (myUpdateIssueActiveNo < updateIssueActiveNo) {
		console.log("Update is not latest. Cancelling...");
		// I'm out of date. cancel
		return;
	}
	
	console.log("UpdateIssueLoop: " + milestoneIndex);
	if (milestoneIndex < milestoneListComplete.length) {
		const milestone = milestoneListComplete[milestoneIndex];
		const repo = yoda.getRepoFromMilestoneUrl(milestone.url);
	
		let milestoneSearch = "&milestone=" + milestone.number;
		console.log("milestone.number: " + milestone.number);
		
		// Special situaton for milestone -1 (all milestones)
		if (milestone.number == ALL_MILESTONES)
			milestoneSearch = "";
		
		let filterSearch = "";
		if  ($("#labelfilter").val() != "")
			filterSearch = "&labels=" + $("#labelfilter").val();

		const getIssuesUrl = yoda.getGithubUrl() + "repos/" + $("#owner").val() + "/" + repo + "/issues?state=all&direction=asc" + milestoneSearch + filterSearch;
		yoda.getLoop(getIssuesUrl, 1, [], function(data) {storeIssues(data, milestoneIndex, myUpdateIssueActiveNo)}, null);
	} else {
		// Requested (and received all issues).
		console.log("All issues (before filtering out pull requests): " + repoIssues.length);
		yoda.filterPullRequests(repoIssues);
		
		// Is this a good place to handle Meta-issues?
		let metaIssuesList = [];
		const rnMetaLabel = $("#rnmetalabel").val();
		for (let i = 0; i < repoIssues.length; i++) {
			// Meta issue? Special handling required
			if (yoda.isLabelInIssue(repoIssues[i], rnMetaLabel)) {
				console.log("Meta issue: " + repoIssues[i].number);
			
				const metaStart = repoIssues[i].body.indexOf('> META ');
				if (metaStart == -1) {
					// No Meta-tag, let's try with '> contains'
					// eslint-disable-next-line no-useless-escape
					const refLineReg = '(^([ ]*)-( \\[([ xX])\\])?[ ]*(((.*\/)?.*)?#[1-9][0-9]*)[ ]*(.*)|(..*)$)';

					// Regexp for full block, ie. starting with e.g. "> contains (data, will be updated)" followed directly by n lines
					// ^> contains[ ]*(.*)$((\r?\n)+^- \[([ xX])\][ ]*(((.*\/)?.*)?#[1-9][0-9]*)[ ]*(.*)$)*
					const issueStart = new RegExp("^[ ]*> contains[ ]*(.*)$([\r]?[\n]?" + refLineReg + ")*", "mg");
					const blockStart = issueStart.exec(repoIssues[i].body);
					if (blockStart != null) {
						const block = blockStart[0];

						// Extract just the child part, i.e. take way contains issue reference lines (or text to remember).
						const startChildBlock = block.indexOf('\n');
						const childBlock = block.substr(startChildBlock);

						// Let's loop the issues using the refLineReg regular expression..
						const reg = new RegExp(refLineReg, 'mg');
						let res;
						do {
							res = reg.exec(childBlock);
							if (res != null) {
								// Did we match a LOCAL issue reference? 
								if (res[0].trim().startsWith("-") && res[0].indexOf("#") != -1) {
									const ref = res[5];
									if (ref.startsWith("#")) {
										const urlRef = repoIssues[i].url.replace(/\/[0-9]+$/g, "/" + ref.substr(1));
										console.log("urlRef = " + urlRef);
										metaIssuesList.push(urlRef);
									} else {
										// Non local.
										const repoSearch = "/repos/";
										let rI = repoIssues[i].url.indexOf(repoSearch);
										if (rI != -1) {
											rI += repoSearch.length;
											var urlRef = repoIssues[i].url.substr(0, rI) + ref.replace(/#/, "/issues/");
											console.log("urlRef = " + urlRef);
											metaIssuesList.push(urlRef);
										}
									}
								} 
							}
						} while (res != null);
					}					
				} else {
					// > META format...
					let lineEnd = repoIssues[i].body.indexOf('\n', metaStart);
					if (lineEnd == -1)
						lineEnd = repoIssues[i].body.length;

					const metaLine = repoIssues[i].body.substr(metaStart + 7, lineEnd);
					const issuesRawList = metaLine.split(/\s+/);
					console.log(issuesRawList);

					for (let j = 0; j < issuesRawList.length; j++) {
						if (issuesRawList[j].indexOf("#") == -1)
							continue;
						const ref = issuesRawList[j].trim().replace(/#/g, "");
						const urlRef = repoIssues[i].url.replace(/\/[0-9]+$/g, "/" + ref);
						console.log("urlRef = " + urlRef);
						metaIssuesList.push(urlRef);
					}
				}
			}
		}
		updateMetaIssuesThenRN(metaIssuesList);
	}
}

function updateIssuesForRN() {
	updateIssueActiveNo++;
	console.log("UpdateIssueActive: " + updateIssueActiveNo);
		
	// Ok, here we go. This is the tricky part.
	// We will get issues for all selected milestones for all selected repos.
	milestoneListComplete = [];
	
	// Handle situation where no milestones are specified, but we do have a labelFilter. In this case, we will take all issues based on the filter
	if (milestoneList.length == 0 && $("#labelfilter").val() != "") {
		console.log("No milestones selected, but filter present. Getting all issues based on filter only.");
		for (let r = 0; r < repoList.length; r++) {
//			console.log("  For repo: " + repoList[r]);
			milestoneListComplete.push({number: ALL_MILESTONES, url:  yoda.getGithubUrl() + "repos/" + $("#owner").val() + "/" + repoList[r] + "/milestone/-1"}); // Dummy value
		}
	} else {
		// Normal handling
		for (let m = 0; m < milestoneList.length; m++) {
//			console.log("Updating issues for milestone: " + milestoneList[m]);

			for (let r = 0; r < repoList.length; r++) {
//				console.log("  For repo: " + repoList[r]);
				// Need to find the milestone (the number)..
				for (let m1 = 0; m1 < repoMilestones[r].length; m1++) {
//					console.log(repoMilestones[r][m1].title);
					if (repoMilestones[r][m1].title == milestoneList[m]) {
						console.log("Need to get issues for " + repoList[r] + ", " + milestoneList[m] + ", which has number: " + repoMilestones[r][m1].number);
						milestoneListComplete.push(repoMilestones[r][m1]);
					}
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

function updateIssuesKnownLoop(repoRemainList, issues) {
	repoIssues = addIssues(repoIssues, issues);

	console.log(repoRemainList);
	if (repoRemainList.length == 0) {
		makeRN("Known limitations and issues ", "Known issues for ", "known");
		return;
	}
	
	const repo = repoRemainList[0];
	let newRemain = repoRemainList.slice(0);
	newRemain.splice(0, 1);
	console.log(newRemain);
	
	const getIssuesUrl = yoda.getGithubUrl() + "repos/" + $("#owner").val() + "/" + repo + "/issues?state=open&labels=" + $("#rnknownlabel").val();
	yoda.getLoop(getIssuesUrl, 1, [], function(data) {updateIssuesKnownLoop(newRemain, data)}, null);
}

function updateIssuesKnown() {
	repoIssues = [];
	updateIssuesKnownLoop(repoList, []);
} 


function setDefaultAndValue(id, value) {
	let element = document.getElementById(id);
	element.defaultValue = value;
	element.value = value;
}

function changeOutput() {
	const value = $('input:radio[name="outputformat"]:checked').val();
	let cat;
	if ($('#estimatecategory').is(":checked"))
		cat = "%c (total %z)";
	else
		cat = "%c";
	let iss;
	if ($('#estimateissue').is(":checked"))
		iss = "%d (%e)"
	else
		iss = "%d";
	
	switch (value) {
	case "html":
		if ($('#tablelayout').is(":checked")) {
			// HPE SA format
			setDefaultAndValue("hlformat", "<H1>,</H1>\\n");
			setDefaultAndValue("sformat", "<H2>,</H2>\\n");
			setDefaultAndValue("ssformat", "<H3>,</H3>\\n");
			setDefaultAndValue("listformat", "<table><thead><tr><th width=10%>Number</th><th width=90%>Description</th></tr></thead><tbody>\n,</tbody></table>\n,<tr>\n,</tr>\n");
			setDefaultAndValue("rnformat", "<td>" + iss + "</td><td>%t%x</td>");
			setDefaultAndValue("catformat", '<td colspan=2 class="ic"><b>' + cat + '</b></td>');
			
		} else {
			setDefaultAndValue("hlformat", "<H1>,</H1>\\n");
			setDefaultAndValue("sformat", "<H2>,</H2>\\n");
			setDefaultAndValue("ssformat", "<H3>,</H3>\\n");
			setDefaultAndValue("listformat", "<UL>\\n,</UL>\\n,<LI>\\n,</LI>\\n");
			setDefaultAndValue("rnformat", "%t (" + iss + ")<BLOCKQUOTE>%r</BLOCKQUOTE>");
			setDefaultAndValue("catformat", "<H4>" + cat + "</H4>");
		}
		break;

	case "md":
	case "rst":  // Note: for now same as md
		if ($('#tablelayout').is(":checked")) {
			setDefaultAndValue("hlformat", "# ,\\n\\n");
			setDefaultAndValue("sformat", "## ,\\n\\n");
			setDefaultAndValue("ssformat", "### ,\\n\\n");
			setDefaultAndValue("listformat", "Number | Description\\n--------|-------------\\n,\\n,,\\n");
			setDefaultAndValue("rnformat", iss + " | %t%x");
			setDefaultAndValue("catformat", "*" + cat + "*");
		} else {
			setDefaultAndValue("hlformat", "# ,\\n\\n");
			setDefaultAndValue("sformat", "## ,\\n\\n");
			setDefaultAndValue("ssformat", "### ,\\n\\n");
			setDefaultAndValue("listformat", ",,-  ,\\n\\n");
			setDefaultAndValue("rnformat", "%t (" + iss + ")%x");
			setDefaultAndValue("catformat", "*" + cat + "*");
		}
		break;
	}
}

export function init() {
	// Enable yodamenu
	yoda.enableMenu("#release-notes");

	yoda.getDefaultLocalStorage("#owner", "yoda.owner");
	yoda.getDefaultLocalStorage("#repolist", "yoda.repolist");

	yoda.getDefaultLocalStorage("#rnlabeltypes", "yoda.burndown.rnlabeltypes");
	yoda.getDefaultLocalStorage("#rnknownlabeltypes", "yoda.burndown.rnknownlabeltypes");
	yoda.getDefaultLocalStorage("#rnskiplabel", "yoda.burndown.rnskiplabel");
	yoda.getDefaultLocalStorage("#rnmetalabel", "yoda.burndown.rnmetalabel");
	yoda.getDefaultLocalStorage("#rnknownlabel", "yoda.burndown.rnknownlabel");

	yoda.decodeUrlParam("#owner", "owner");
	yoda.decodeUrlParam("#labelfilter", "labelfilter");
	yoda.decodeUrlParam("#rnlabeltypes", "rnlabeltypes");
	yoda.decodeUrlParam("#rnknownlabeltypes", "rnknownlabeltypes");
	yoda.decodeUrlParam("#rnskiplabel", "rnskiplabel");
	yoda.decodeUrlParam("#rnmetalabel", "rnmetalabel");
	yoda.decodeUrlParam("#rnknownlabel", "rnknownlabel");
	yoda.decodeUrlParam("#catlabel", "catlabel");

	yoda.decodeUrlParamBoolean("#closedmilestones", "closedmilestones");
	yoda.decodeUrlParamBoolean("#tablelayout", "tablelayout");
	yoda.decodeUrlParamBoolean("#estimatecategory", "estimatecategory");
	yoda.decodeUrlParamBoolean("#estimateissue", "estimateissue");

	yoda.decodeUrlParamRadio("estimate", "estimate");
	yoda.updateEstimateRadio();

	yoda.decodeUrlParamRadio("outputformat", "outputformat");
	yoda.decodeUrlParam("#filename", "filename");

	changeOutput(); // this will set defaults. Now they may be overwritten below
	yoda.decodeUrlParam("#hlformat", "hlformat");
	yoda.decodeUrlParam("#sformat", "sformat");
	yoda.decodeUrlParam("#ssformat", "ssformat");
	yoda.decodeUrlParam("#listformat", "listformat");
	yoda.decodeUrlParam("#catformat", "catformat");
	yoda.decodeUrlParam("#rnformat", "rnformat");

	// CSS stuff
	yoda.decodeUrlParam("#cssowner", "cssowner");
	yoda.decodeUrlParam("#cssrepo", "cssrepo");
	yoda.decodeUrlParam("#csspath", "csspath");
	yoda.decodeUrlParam("#cssbranch", "cssbranch");

	// Local storage
	yoda.getUserTokenLocalStorage("#user", "#token");

	// Do it after getting from localStorage
	yoda.decodeUrlParam("#user", "user");
	yoda.decodeUrlParam("#token", "token");

	if (yoda.decodeUrlParam(null, "hideheader") == "true") {
		$(".frame").hide();
	}

	// Login
	console.log("Github authentisation: " + $("#user").val() + ", token: " + $("#token").val());
	yoda.gitAuth($("#user").val(), $("#token").val());

	// Event listeners
	$("#hamburger").on("click", yoda.menuClick);
	$("#owner").on("change", function() { yoda.updateReposAndGUI($("#owner").val(), "#repolist", "repolist", "yoda.repolist"); });
	$("#outputformatradio").on("change", changeOutput);
	$("#tablelayout").on("change", changeOutput);
	$("#estimatern").on("change", changeOutput);
	$("#closedmilestones").on("change", function() { updateMilestones(); });
	$("#estimateradio").on("click", function(event) { yoda.setEstimateInIssues(event.value); });
	$("#drawRNbutton").on("click", function() { startRN(false); });
	$("#downloadRNbutton").on("click", function() { startRN(true); });
	$("#drawKnownbutton").on("click", function() { startKnown(false); });
	$("#downloadKnownbutton").on("click", function() { startKnown(true); });

	var firstMilestoneShowData = true;
	$(document).ready(function () {
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

		// eslint-disable-next-line no-unused-vars
		$('#repolist').on('change.select2', function (e) {
			repoList = $("#repolist").val();
			console.log("List of selected repos is now: " + repoList);

			if (yoda.decodeUrlParamBoolean(null, "draw") == "known") {
				startKnown(false);
			}

			updateMilestones();
		});

		// eslint-disable-next-line no-unused-vars
		$('#milestonelist').on('change.select2', function (e) {
			milestoneList = $("#milestonelist").val();

			console.log("List of selected milestones is now: " + milestoneList);

			if (firstMilestoneShowData) {
				firstMilestoneShowData = false;
				if (yoda.decodeUrlParamBoolean(null, "draw") == "rn") {
					startRN(false);
				}
			}
		});

		updateRepos();
	});
}