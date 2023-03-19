module.exports = {getMatchingLabels, labelMatch, extractFromIssue, filterIssueReqExp, deepCopy, accessAsString};

const log4js = require('log4js');
const logger = log4js.getLogger();

const configuration = require('./configuration.js');


// Deep copy an object by making an intermediate JSON object.
function deepCopy(o) {
	return JSON.parse(JSON.stringify(o));
}

function stripQuotes(str) {
	if (str.startsWith('"') && str.length > 1 && str[str.length - 1] == '"')
		return str.substr(1, str.length - 2);
	else
		return str;
}

// Utility function
function accessAsString(object, ref) {
	let properties = ref.split(".");
	if (properties.length == 0 || object[properties[0]] == undefined)
		return undefined;

	for (let index=0; index < properties.length; index++){
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

// ------------------
// FUNCTIONS to help with labels
function getMatchingLabels(issue, labelRegExp, separator, none_value) {
	let result = "";
	const reg = new RegExp(labelRegExp);
	for (let l = 0; l < issue.labels.length; l++) {
		let m = issue.labels[l].name.match(reg);
		if (m) {
			if (result != "")
				result += separator;
			if (m[1] != undefined)
				result += m[1];
			else
				result += issue.labels[l].name;
			if (separator == "")  // only return 1?
				return result;
		}
	}

	if (result == "")
		return none_value
	else
		return result;
}

function labelMatch(issue, labelRegExp) {
	const reg = new RegExp(labelRegExp);
	for (let l = 0; l < issue.labels.length; l++) 
		if (issue.labels[l].name.match(reg)) 
			return true;
	return false;
}

function extractFromIssue(issue, field, labelRegExp, none_value) {
	let result = "";
	const reg = new RegExp(labelRegExp);
	let issueField = issue[field];   // TBD: Or use access function?
	if (issueField == undefined)
		return none_value;
	let m = issueField.match(reg);
	if (!m || m[1] == undefined)
		return none_value;
	return m[1];
}

// Check that issue has ALL labels in list. true => ok
function labelListPos(issue, labelList) {
	for (let c = 0; c < labelList.length; c++) {
		let found = false;
		for (let l = 0; l < issue.labels.length; l++)
			if (labelList[c] == issue.labels[l].name) {
				found = true;
				break;
			}
		if (!found)
			return false;
	}
	return true;
}

// Check that issue has NONE the labels in list. true => ok
function labelListNeg(issue, labelList) {
	for (let l = 0; l < issue.labels.length; l++)
		if (labelList.indexOf(issue.labels[l].name) != -1)
			return false;
	return true;
}


// ----------------------
// FUNCTION for building reference lines. Assumes issueRef has a structure with both owner/repo/issue_number, as well 
// as the issue itself in the issue field. The return value will be the aggregated string for the section, summming up
// estimates, remaining, # of open/closed


function getEstimate(issue) {
	// eslint-disable-next-line no-useless-escape
	let estimate = getBodyField(issue.body, '^>[ ]?estimate ', '[ ]*[0-9][0-9]*(\.[0-9])?([0-9])?[ ]*$');
	if (estimate == null)
		return 0;
	else
		return parseFloat(estimate);
}


// We will be really! pragmatic here. The remaining estimate will be simply the last "> remaining" line in the body...
function getRemaining(issue) {
	// eslint-disable-next-line no-useless-escape
	let reg = new RegExp('^>[ ]?remaining [ ]*2[0-9][0-9][0-9]-[0-1]?[0-9]-[0-3]?[0-9][ ]([0-9][0-9]*(\.[0-9])?)[ ]*$', 'mg');
	let remaining = getEstimate(issue);
	
	let res;
	do {
		res = reg.exec(issue.body);
		if (res != null) {
			logger.trace(res);
			remaining = res[1];
		}
	} while (res != null);
	return parseFloat(remaining);
}


//---------------
// FUNCTIONS FOR EXTRACTING ISSUE REFERNCES FROM BODY TEXT


// Function to get a field from the body text.
// index is used to point to the instance
// Concatenation of start and data values indicates a regular expression to search for
// The data part is returned.
// Optional parameter index is used to indicate that subsequent matches should be returned.
function getBodyField(body, start, data, index) {
	if (index == undefined)
		index = 0;
	if (body == null)
		return null;
	const reg = new RegExp(start + data, 'mg');
	const res = body.match(reg);

	if (res != null) {
		if (index >= res.length)
			return null;

		// Return the match requested. First lets find out how long the start part is
		const regStart = new RegExp(start);
		const resStart = res[index].match(regStart);
		if (resStart.length == 0)
			return null; // strange.
		// And extract the remaining part.
		const newString = res[index].substr(resStart[0].length);
		const reg2 = new RegExp(data);
		const res2 = newString.match(reg2);
		return res2[0].trim();
	} else {
		return null;
	}
}

// Filter issues with regexp (i.e. filtering done explicitly by specifying some fields using "^"
// OR filter which are negative (starting with -, normal or regexp).
function filterIssueReqExp(issue, labelFilter) {
	const filterArray = labelFilter.split(",");
	for (let f = 0; f < filterArray.length; f++) {
		let positiveMatch, labelReg;
		if (filterArray[f].charAt(0) == "-") {
			positiveMatch = false;
			labelReg = new RegExp(filterArray[f].substring(1));
		} else {
			positiveMatch = true;
			labelReg = new RegExp(filterArray[f]);
		}

		let match = false;
		for (let l = 0; l < issue.labels.length; l++) {
			const labelName = issue.labels[l].name;
			if (labelName.match(labelReg) != null) {
				match = true;
				break;
			}
		}

		if ((positiveMatch && !match) || (!positiveMatch && match))
			return false;
	}
	return true;
}
