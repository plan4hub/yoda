module.exports = {getMatchingLabels, compareRefs, getShortRef, getRefFromUrl, getFullRef, getParentRefs, getChildrenFromBody, makeChildBlock, insertDeleteRefs, getRefsDiff, findRefIndex, findAllRefIndex, makeIssuesUnique, noChildRefs, isRef};

var log4js = require('log4js');
var logger = log4js.getLogger();

const configuration = require('./configuration.js');

//---------------
// FUNCTIONS FOR MANIPULATION ISSUE REFERENCES

//The main datastructure for child issue list (lines following > contains) will be a children structure read from the body text.
// The structure will contain a struct with {blockStart: <startvalue, -1 if not there>, blockLength: <length of block>, issueRefs: <array of childRef>
// A childRef will have onwer, repo, issue_number set (and if ready from body also indent and index). If owner not set, then considered to be of type line and line 
// field will hold the text line.

// The functions below will work either on the overall Children structure, or the lines directly (typically looking only at the entries of real child references.

//We need to maintain lists of issues (issue references) for comparison purposes, e.g. new issues in subissues list, removed issues.
//We will maintain the lists as arrays of (owner, repo, issue_number) structures, as these are anyway what will be used to
//First a few functions to construct such elements.

// Crude way of determining if a line is indeed a reference. If the line is set, it is not.....
function isRef(ref) {
	if (ref.line == undefined)
		return true;
	else 
		return false;
}

//Make reference construct from issue url, e.g. "https://github.hpe.com/api/v3/repos/jens-markussen/obt-migrate/issues/721" 
function getRefFromUrl(url) {
	var temp = url.split("/");
	return {
		owner: temp[temp.length - 4], 
		repo: temp[temp.length - 3],
		issue_number: temp[temp.length - 1]
	};
}

//Make refernce from ShortRef i.e. [[owner]/][repository]#number
function getRefFromShortRef(ownRef, reference) {
	var result = {};
	Object.assign(result, ownRef);
	reference = reference.trim();
	if (reference.charAt(0) == "#") {
		// Local reference, i.e. #number
		result.issue_number = reference.substr(1);
	} else {
		if (reference.indexOf("/") == -1) {
			// Assume repository and number, i.s. repository#number
			var temp = reference.split("#");
			result.repo = temp[0];
			result.issue_number = temp[1];
		} else {
			// Assume full reference, i.e. owner/repository#number
			var ownerTemp = reference.split("/");
			var temp = ownerTemp[1].split("#");
			result.repo = temp[0];
			result.issue_number = temp[1];
			result.owner = ownerTemp[0];
		}
	}
	
	logger.trace("getRefFromShortRef. ownRef: " + getFullRef(ownRef) + ", reference: " + reference + " => " + result.owner + "/" + result.repo + "#" + result.issue_number);
	return result;
}  

//Build a full reference. Note, we take special care to make this work even if the ref is not a childRef structure....
function getFullRef(ref) {
	return ref.owner + "/" + ref.repo + "#" + ref.issue_number;
}

//Make an issue reference in GitHub style, using only #number if same repo, or owner/repo#number if not.
function getShortRef(fromReference, toReference) {
	if (fromReference.owner == toReference.owner && fromReference.repo == toReference.repo) {
		return "#" + toReference.issue_number;
	} else {
		return getFullRef(toReference);
	} 
}

//A function to compare two references
function compareRefs(a, b) {
	// If either a or b are a line, then lines do not compare.
	if (!isRef(a) || !isRef(b))
		return 1;
	
	var aFull = getFullRef(a);
	var bFull = getFullRef(b);
	if (aFull == bFull)
		return 0;
	if (aFull < bFull)
		return -1;
	else
		return 1;
}

// Search for a given issue, skip search if not a child ref, but just a text line.
function findRefIndex(aList, b) {
	for (var i = 0; i < aList.length; i++) {
		// Note, take care not to search in not childRef things...
		if (isRef(aList[i]) && compareRefs(aList[i], b) == 0)
			return i;
	}
	return -1;
}

// Find all matches
function findAllRefIndex(aList, b) {
	var result = [];
	for (var i = 0; i < aList.length; i++) {
		// Note, take care not to search in not childRef things...
		if (isRef(aList[i]) && compareRefs(aList[i], b) == 0)
			result.push(i);
	}
	return result;
}


//Search for a given issue, skip search if not a child ref, but just a text line.
function findRef(aList, b) {
	for (var i = 0; i < aList.length; i++) {
		if (isRef(aList[i]) && compareRefs(aList[i], b) == 0)
			return true;
	}
	return false;
}

// handle includes and excluces to list. modifies the issueRefs list inside the children construct 
function insertDeleteRefs(children, includeRefs, excludeRefs) {
	for (var i = 0; i < includeRefs.length; i++) {
		if (!findRef(children.issueRefs, includeRefs[i])) {
			children.issueRefs.push(includeRefs[i]); // insert it.
		}
	}
	for (var d = 0; d < excludeRefs.length; d++) {
		var pos = findRefIndex(children.issueRefs, excludeRefs[d]);  
		if (pos != -1) {
			children.issueRefs.splice(pos, 1); // Delete it.
		}
	}
}

// find deleted items, i.e. items in list1, while NOT in list2
function getRefsDiff(refList1, refList2) {
	var result = [];
	for (var i = 0; i < refList1.length; i++) {
		if (isRef(refList1[i]) && !findRef(refList2, refList1[i])) {
			result.push(refList1[i]);
		}
	}
	return result;
}

function makeIssuesUnique(children) {
	for (var i = 0; i < children.issueRefs.length; i++) {
		for (var j = 0; j < children.issueRefs.length; j++) {
			if (i != j && compareRefs(children.issueRefs[i], children.issueRefs[j]) == 0) {
				children.issueRefs.splice(i, 1);
			}
		}
	}
}

// ------------------
// FUNCTIONS to help with labels
function getMatchingLabels(issue, labelRegExp) {
	var result = "";
	var reg = new RegExp(labelRegExp);
	for (var l = 0; l < issue.labels.length; l++) {
		if (issue.labels[l].name.match(reg)) {
			if (result != "")
				result += ", ";
			result += issue.labels[l].name;
		}
	}
	if (result != "")
		result = "[" + result + "]";
	return result;
}

// Count number of childReferences in list
function noChildRefs(refList) {
	var total = 0;
	for (var i = 0; i < refList.length; i++) {
		if (isRef(refList[i]))
			total++;
	}
	return total;
}


// ----------------------
// FUNCTION for building reference lines. Assumes issueRef has a structure with both owner/repo/issue_number, as well 
// as the issue itself in the issue field. The return value will be the aggregated string for the section, summming up
// estimates, remaining, # of open/closed


function getEstimate(issue) {
	var estimate = getBodyField(issue.body, '^>[ ]?estimate ', '[ ]*[0-9][0-9]*(\.[0-9])?([0-9])?[ ]*$');
	if (estimate == null) {
		return 0;
	} else {
		return parseFloat(estimate);
	}
}


// We will be really! pragmatic here. The remaining estimate will be simply the last "> remaining" line in the body...
function getRemaining(issue) {
	var reg = new RegExp('^>[ ]?remaining [ ]*2[0-9][0-9][0-9]-[0-1]?[0-9]-[0-3]?[0-9][ ]([0-9][0-9]*(\.[0-9])?)[ ]*$', 'mg');
	var remaining = getEstimate(issue);
	
	do {
		var res = reg.exec(issue.body);
		if (res != null) {
			logger.trace(res);
			remaining = res[1];
		}
	} while (res != null);
	return parseFloat(remaining);
}

// This will build the childBlock, i.e. the block with "> contains (summary)" followed by a list of issues according to the defined format.
function makeChildBlock(ownRef, childIssues) {
	issueRefs = childIssues.issueRefs;
//	if (issueRefs.length == 0) {
//		return ""; // No issue means empty block. This can be debated... 
//	}
	
	var totalEstimate = 0;
	var totalRemaining = 0;
	var totalOpen = 0;
	var totalClosed = 0;
	var result = "";
	for (var i = 0; i < issueRefs.length; i++) {
		// Is this a text line (rather than a child reference?
		if (issueRefs[i].line != undefined) {
			// Add line
			result = result + issueRefs[i].line + "\n";
		} else {
			var shortRef = getShortRef(ownRef, issueRefs[i]);
			var refLine = "";
			if (issueRefs[i].indent != undefined)
				refLine += issueRefs[i].indent; // respect indentation.

			if (issueRefs[i].issue == null) {
				refLine = refLine + "- [ ] " + shortRef + " **Unable to get issue details - non-existing issue/access right problem?**";
			} else {
				refLine += "- [";

				if (issueRefs[i].issue.state == "closed") {
					refLine += "x] ";
					totalClosed++;
				} else {
					refLine += " ] ";
					totalOpen++;
				}
				refLine += shortRef; 
				var issueType = getMatchingLabels(issueRefs[i].issue, configuration.getOption("labelre"));
				logger.trace("'" + issueType + "'");
				if (issueType != "")
					refLine += " " + issueType + " ";

				// Get estimate, remaining.
				var estimate = getEstimate(issueRefs[i].issue);
				totalEstimate += estimate;
				var remaining = getRemaining(issueRefs[i].issue);
				if (issueRefs[i].issue.state == "closed")
					remaining = 0;
				totalRemaining += remaining;

				// If no estimate given, forget about estimates.
				if (estimate != 0)
					refLine += " (" +  estimate + " / " + remaining + ")";

				refLine += " *" + issueRefs[i].issue.title.trim() + "*";
			}
			logger.debug("refline: '" + refLine + "'");
			issueRefs[i].refLine = refLine;
			result = result + refLine + "\n";
		}
	}
	
	result = configuration.getOption('issuelist') + " (total estimate: " + totalEstimate + ", total remaining: " + totalRemaining + ", # open issues: " + totalOpen + ", # closed issues: " + totalClosed + ")\n" + result;
	if (result.endsWith("\n")) {
		result = result.substring(0, result.length - 1);
	}
	
	return result;
}


//---------------
// FUNCTIONS FOR EXTRACTING ISSUE REFERNCES FROM BODY TEXT



// Function to get a field from the body text.
// index is used to point to the instance
// Concatenation of start and data values indicates a regular expression to search for
// The data part is returned.
// Optional parameter index is used to indicate that subsequent matches should be returned.
function getBodyField(body, start, data, index) {
	if (index == undefined) {
		index = 0;
	}
	if (body == null) {
		return null;
	}
	var reg = new RegExp(start + data, 'mg');
	var res = body.match(reg);

	if (res != null) {
		if (index >= res.length) {
			return null;
		}

		// Return the match requested. First lets find out how long the start part is
		var regStart = new RegExp(start);
		var resStart = res[index].match(regStart);
		if (resStart.length == 0)
			return null; // strange.
		// And extract the remaining part.
		newString = res[index].substr(resStart[0].length);

		var reg2 = new RegExp(data);
		var res2 = newString.match(reg2);
		return res2[0].trim();
	} else {
		return null;
	}
}


// This function will attempt to get into an array of issue references (as per above) a list of issue references. i.e. 
// per default a list of lines in the body of form "> partof (issue_references) data". We will insert into each reference as well
// the starting position. This will be useful for when we have to update this data.
function getParentRefs(ownRef, body) {
	logger.trace("Getting parent references from body: " + body);
	var issueRefs = [];
	
	// We are going to need a loop cutting the the body text as we go along
	var reg = new RegExp("(^[ ]*" + configuration.getOption("issuerefre") + ')[ ]*(((.*/)?.*)?#[1-9][0-9]*)[ ]*(.*)$', 'mg');
	logger.trace(reg);
	do {
		var res = reg.exec(body);
		logger.trace(res);
		if (res != null) {
			var ref = res[2];
			var data = res[5];
			logger.trace("Reference: " + ref + ", data: " + data);

			var refEntry = getRefFromShortRef(ownRef, ref);
			refEntry.data = data;
			refEntry.index = res.index;
			refEntry.length = res[0].length;
			issueRefs.push(refEntry);
		}
	} while (res != null);
	
	logger.debug("Got parent reference(s):");
	logger.debug(issueRefs);
	return issueRefs;
}

// This function will attempt to get into an array of issue references (as per above) a list of issue references. i.e. 
// per default a list of lines in the body following a line starting with "> contains". We will insert into each reference as well
// the starting position. This will be useful for when we have to update this data.
// Lines within the contains block (up to a blank line) that are not issue references will be includes with data the "line" item.
function getChildrenFromBody(ownRef, body) {
	logger.trace("Getting child references from body: " + body);
	var result = { blockStart: -1, blockLength: 0, issueRefs: []};
	
	// Regexp matching one reference line. Format should be like e.g. "- [ ] hpsp#22 (whatever data, will be updated anyway)" 
	var refLineReg = '(^([ ]*)-( \\[([ xX])\\])?[ ]*((([^ ]*\/)?[^ ]*)?#[1-9][0-9]*)[ ]*(.*)|(..*)$)';
	
	// Regexp for full block, ie. starting with e.g. "> contains (data, will be updated)" followed directly by n lines
	// with entries as per above.
	// ^> contains[ ]*(.*)$((\r?\n)+^- \[([ xX])\][ ]*(((.*\/)?.*)?#[1-9][0-9]*)[ ]*(.*)$)*
	var issueStart = new RegExp("^[ ]*" + configuration.getOption("issuelistre") + "[ ]*(.*)$([\r]?[\n]?" + refLineReg + ")*", "mg");
	logger.trace(issueStart);
	var blockStart = issueStart.exec(body);
	logger.trace("blockStart:");
	logger.trace(blockStart);
	if (blockStart == null) {
		logger.debug("No (child) issue list found for " + getFullRef(ownRef));
		logger.trace("  .. in body: " + body);
		return result;
	}
	
	var block = blockStart[0];
	result.blockStart = blockStart.index;
	result.blockLength = blockStart[0].length;
	logger.trace("Found child reference block at blockStart: " + result.blockStart + ", length: " + result.blockLength);
	
	// Extract just the child part, i.e. take way contains issue reference lines (or text to remember).
	var startChildBlock = block.indexOf('\n');
	if (startChildBlock == -1) {
		// completely empty block!
		logger.trace("Child block is empty");
		return result;
	}
	var childBlock = block.substr(startChildBlock);
	logger.trace("Child block:");
	logger.trace(childBlock);
	
	// Let's loop the issues using the refLineReg regular expression..
	var reg = new RegExp(refLineReg, 'mg');
	logger.trace(reg);
	do {
		var res = reg.exec(childBlock);
		logger.trace(res);
		if (res != null) {
			var refEntry = {};
			// Did we match an issue reference? 
			if (res[0].trim().startsWith("-") && res[5] != undefined) {
				var ref = res[5];
				var data = res[8];
				logger.trace("Reference: " + ref + ", data: " + data);

				refEntry = getRefFromShortRef(ownRef, ref);
				
				refEntry.indent = res[2];
				refEntry.data = data;
				refEntry.index = res.index;
			} else {
				logger.trace("Text line: " + res[0]);
				refEntry.line = res[0];
			}
			result.issueRefs.push(refEntry);

		}
	} while (res != null);
	logger.debug("Got child references:");
	logger.debug(result);
	return result;
}

