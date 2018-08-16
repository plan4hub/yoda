// This file contains Yoda base utility functions, i.e. Yoda utility functions NOT related or assuming a Yoda browser session.

// Either by prototype extentions to existing types, or as part of a new 'yodaBase' module.

// -----------------------------------------------------
// Useful prototype extentions
// -----------------------------------------------------
Date.isLeapYear = function (year) { 
    return (((year % 4 === 0) && (year % 100 !== 0)) || (year % 400 === 0)); 
};

Date.getDaysInMonth = function (year, month) {
    return [31, (Date.isLeapYear(year) ? 29 : 28), 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month];
};

Date.prototype.isLeapYear = function () { 
    return Date.isLeapYear(this.getFullYear()); 
};

Date.prototype.getDaysInMonth = function () { 
    return Date.getDaysInMonth(this.getFullYear(), this.getMonth());
};

Date.prototype.addMonths = function (value) {
    var n = this.getDate();
    this.setDate(1);
    this.setMonth(this.getMonth() + value);
    this.setDate(Math.min(n, this.getDaysInMonth()));
    return this;
};

// -----------------------------------------------------
// Yoda module
//-----------------------------------------------------
var yodaBase = (function() {
	// ------------------------------
	// Private/non-exposed functions/variables.
	
	// -------------------------------
	// UPDATE THESE TO FIT YOUR GITHUB...
	// -------------------------------
	// Standard github.com settings.
	var gitHubApiBaseUrl = "https://api.github.com/";
	var gitHubBaseUrl = "https://www.github.com/";

	var yoda_userId = null;
	
	// GitHub call control variable. New calls will cancel existing calls.
	var yoda_gitHubCallNo = 0;
	
	// busy, ready callsbacks (for UI)
	var yoda_busy_func = null;
	var yoda_ready_func = null;
	
	// Simple function to get a field from the body text.
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
			// Return the match requested. 
			// Now we have to look at just the data part..
			var newString = res[index];
			var reg2 = new RegExp(data);
			var res2 = newString.match(reg2);
			return res2[0].trim();
		} else {
			return null;
		}
	};
	
	function parse_link_header(header) {
		if (header == undefined || header == null)
			return {};

	    // Split parts by comma
	    var parts = header.split(',');
	    var links = {};
	    // Parse each part into a named link
	    for(var i=0; i<parts.length; i++) {
	        var section = parts[i].split(';');
	        if (section.length !== 2) {
	            throw new Error("section could not be split on ';'");
	        }
	        var url = section[0].replace(/<(.*)>/, '$1').trim();
	        var name = section[1].replace(/rel="(.*)"/, '$1').trim();
	        links[name] = url;
	    }
	    return links;
	};
	
	
	// Remove reg
	function removeFromBody(body, regexp) {
		var reg = new RegExp(regexp, 'mg');
		return body.replace(reg, "");
	};

	// Private method for UTF-8 encoding. Use for GitHub authentication using personal token.
	function _utf8_encode(string) {
	    string = string.replace(/\r\n/g,"\n");
	    var utftext = "";

	    for (var n = 0; n < string.length; n++) {
	        var c = string.charCodeAt(n);

	        if (c < 128) {
	            utftext += String.fromCharCode(c);
	        }
	        else if((c > 127) && (c < 2048)) {
	            utftext += String.fromCharCode((c >> 6) | 192);
	            utftext += String.fromCharCode((c & 63) | 128);
	        }
	        else {
	            utftext += String.fromCharCode((c >> 12) | 224);
	            utftext += String.fromCharCode(((c >> 6) & 63) | 128);
	            utftext += String.fromCharCode((c & 63) | 128);
	        }
	    }
	    return utftext;
	}

	// Standard base64 encoding. Used for GitHub authentisation.
	function base64_encode(input) {
		var _keyStr = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";

		var output = "";
		var chr1, chr2, chr3, enc1, enc2, enc3, enc4;
		var i = 0;

		input = _utf8_encode(input);

		while (i < input.length) {
			chr1 = input.charCodeAt(i++);
			chr2 = input.charCodeAt(i++);
			chr3 = input.charCodeAt(i++);

			enc1 = chr1 >> 2;
			enc2 = ((chr1 & 3) << 4) | (chr2 >> 4);
			enc3 = ((chr2 & 15) << 2) | (chr3 >> 6);
			enc4 = chr3 & 63;

			if (isNaN(chr2)) {
				enc3 = enc4 = 64;
			} else if (isNaN(chr3)) {
				enc4 = 64;
			}

			output = output +
			_keyStr.charAt(enc1) + _keyStr.charAt(enc2) +
			_keyStr.charAt(enc3) + _keyStr.charAt(enc4);
		}
		return output;
	}
	
	//Either "noissues", "inbody", "inlabels". Default is "inbody", ie. estimate is given by an "> estimate (number)" line.
	var estimateInIssues = "inbody";

	// Collect various information from the API.  
	function getLoopInternal(url, collector, finalFunc, partFunc, errorFunc, callNo) {
		// First call?
		if (callNo == undefined) {
			yoda_busy_func();
			yoda_gitHubCallNo++;
			callNo = yoda_gitHubCallNo;
			console.log("getLoop: Starting call no " + callNo + " with URL: " + url);
			if (url.indexOf('?') == -1)
				url += "?per_page=100";
			else	
				url += "&per_page=100";
		} else {
			console.log("getLoop: Continuing call no " + callNo + " with URL: " + url);
			// Check if someone started a newer call. Then we will cancel. Is this really necessary ???
			if ((callNo != -1) && (callNo) < yoda_gitHubCallNo) {
				console.log("getLoop: detected newer call (" + yoda_gitHubCallNo + " > " + callNo + "). Cancelling.");
				return;
			}
		}
		
		$.ajax({
			type: 'GET',
			url: url,
			success: function(response, status, request){
				var parsedLink = parse_link_header(request.getResponseHeader('link'));

				if (parsedLink.next == undefined) {
					// Done!
					yoda_ready_func();
					
					if (partFunc == null) {
						console.log("getLoop: Done with call no " + callNo + ", no of results: " + (collector.length + response.length));
						finalFunc(collector.concat(response));
					} else {
						console.log("getLoop: Done with call no " + callNo + " (partial callbacks)");
						finalFunc();
					}
				} else {
					if (partFunc != null) {
						partFunc(response);
						getLoopInternal(parsedLink.next, [], finalFunc, partFunc, errorFunc, callNo);
					} else {
						getLoopInternal(parsedLink.next, collector.concat(response), finalFunc, partFunc, errorFunc, callNo);
					}
				}
			},
			error: function (response, status, errorThrown) {
				yoda_ready_func();
				errorFunc(errorThrown);
			}
		});
	};

	// -----------------------------	
	// Exposed functions/variables.
	return {
		strip2Digits: function(number) {
			places = 2;
			return +(Math.round(number + "e+" + places)  + "e-" + places);
		},
		
		getEstimateInIssues: function() {
			return estimateInIssues;
		},
		
		setEstimateInIssues: function(newValue) {
			estimateInIssues = newValue;
			console.log("estimateInIssues now: " + estimateInIssues);
		},
		
		setGitHubUrl: function(url) {
			gitHubApiBaseUrl = url;
		},
		
		setGitHubUrlHtml: function(url) {
			gitHubBaseUrl = url;
		},
		
		getGitHubUrl: function() {
				return gitHubApiBaseUrl;
		},
		
		getGitHubUrlHtml: function() {
			return gitHubBaseUrl;
		},

		setBusyReadyFunc: function(busyFunc, readyFunc) {
			yoda_busy_func = busyFunc;
			yoda_ready_func = readyFunc;
		},
		
		// Look at date field. Here a "+/- # of days vs current date" notation is allowed.
		// Also +/-(m) notation for adding/subtracting months.
		handleDateDelta: function(value) {
			console.log(value);
			if (value.charAt(0) == "+" || value.charAt(0) == "-") {
				var today = new Date();
				today.setHours(0);
				today.setMinutes(0);
				today.setSeconds(0);
				var deltaDate = new Date(today);

				if (value.slice(-1) == 'm') {
					// Assume month(s)

					deltaDate.addMonths(parseInt(value));
				} else {
					// Days.
					var delta = parseInt(value.slice(1));

					console.log("Subtracting: " + delta + " days from " + deltaDate);
					if (value.charAt(0) == "+") {
						deltaDate.setTime(deltaDate.getTime() + (delta*24*60*60*1000)); 
					} else {
						deltaDate.setTime(deltaDate.getTime() - (delta*24*60*60*1000)); 
					}
				}
				return (yodaBase.formatDate(deltaDate));
			} else {
				return value;
			}
		},
		
		// Calculate a date two months earlier.
		twoMonthsEarlier: function(interval, today) {
			var startDate = new Date(today);
			// Summer time. Be careful. Let's set hours to 10AM for calculations. Then set
			var saveHours = startDate.getHours();
			startDate.setHours(10);
			if (interval.slice(-1) == 'm') {
				// If interval is in months, then let's prepare to span default of 8 intervals 
				startDate.addMonths(0-parseInt(interval)*8);
			} else {
				// If blank, start 2 months before (aprox by with interval matching)
				var noIntervals = Math.ceil(62 / interval);
				var dateOffset = (24*60*60*1000) * noIntervals * interval;
				startDate.setTime(startDate.getTime() - dateOffset);
			}
			startDate.setHours(saveHours);
			return startDate;
		},
		
		dateDiff: function(ds1, ds2) {
			var d1 = new Date(ds1);
			var d2 = new Date(ds2);
			var t2 = d2.getTime();
			var t1 = d1.getTime();

			return parseInt((t2-t1)/(24*3600*1000));
		},
		
		getLabelMatch: function (label, start) {
			return getBodyField(label, start, ".*$");
		},
		
		// Extract "> estimate (value)" from body
		getBodyEstimate: function(body) {
			var estimate = getBodyField(body, '^> estimate ', '[ ]*[0-9][0-9]*(\.[0-9])?([0-9])?[ ]*$');
			if (estimate == null) {
				// Try old format as well
				estimate = getBodyField(body, '^/estimate ', '[ ]*[0-9][0-9]*(\.[0-9])?[ ]*$');
			}
			if (estimate == null) {
				return null;
			} else {
				return parseFloat(estimate);
			}
		},
		
		// Get the milestone or project description filed without any annotations, ie. "> (keyworkd) (value)"
		getPureDescription: function(description) {
			res = removeFromBody(description, "^> startdate .*$");
			res = removeFromBody(res, "^> burndownduedate .*$");
			res = removeFromBody(res, "^> capacity .*$");
			return res;
		},
		
		// Extract "> remaining (date) (value)" entries.
		// Should be run in a loop with index = 0 first.  
		getFirstRemaining: function(body, index) {
			var remaining = getBodyField(body, '^> remaining ', '[ ]*2[0-9][0-9][0-9]-[0-1][0-9]-[0-3][0-9][ ][0-9][0-9]*(\.[0-9])?[ ]*$', index);
			return remaining;
		},
		
		// Get the last > remaining (date) (number) entry and return that number
		// If no entry found, then return estimate.
		issueRemaining: function(issue, estimate) {
			var remaining = estimate;
			for (var index = 0; yodaBase.getFirstRemaining(issue.body, index) != null; index++) {
				var remainingEntry = yodaBase.getFirstRemaining(issue.body, index);
				// 	Ok, we now have a > remaining entry
				var remainingDate = remainingEntry.slice(0, 10);
				remaining = remainingEntry.slice(11);
//				console.log("Remaining entry (" + index + ") for issue: " + issue.number + ": " + remainingDate + ", " + remaining);
			}
			
//			console.log(" =>> last remaining: " + remaining);
			return parseFloat(remaining);
		},
		
		// Return the estimate for the issue, taking into account any remaining annotation (> remaining) ahead of the given date. 
		issueEstimateBeforeDate: function(issue, startdate) {
			var estimate = yodaBase.issueEstimate(issue);
			
			if (estimateInIssues == "inbody") {
				// We need to work on potential remaining.
				for (var index = 0; yodaBase.getFirstRemaining(issue.body, index) != null; index++) {
					var remainingEntry = yodaBase.getFirstRemaining(issue.body, index);
					// 	Ok, we now have a > remaining entry
					var remainingDate = remainingEntry.slice(0, 10);
					remaining = remainingEntry.slice(11);
					if (remainingDate < startdate) {
						estimate = parseFloat(remaining);
						console.log("Reducing initial estimate to " + estimate + " as ahead of " + startdate + ", index(" + index + ") for issue: " + issue.number + ": " + remainingDate + ", " + remaining);
					} else {
						console.log("NOT reducing initial estimate as after " + startdate + ", index(" + index + ") for issue: " + issue.number + ": " + remainingDate + ", " + remaining);
					}
				}
			}
			
			return estimate;
		},
		
		//Small helper function to evaluate estimate for an issue. If estimate_in_issues global is set to true
		//then will attempt to extract estimate (> estimate or /estimate format). Otherwise, all issues will simply
		//be counted with 1. If trying to extract estimates, and not possible, estimate set to 0.
		issueEstimate: function (issue) {
			switch (estimateInIssues) {
			case "inbody": 
				var issueEstimate = yodaBase.getBodyEstimate(issue.body);
//				console.log(issue.number + ": " + issue_estimate);
				if (issueEstimate == null) 
					return 0;
				else
					return issueEstimate;
				break;
				
			case "noissues":
				// Counting issues, so 1
				return 1;
				
			case "inlabels":
				// Ok, let's look at the labels
				// We will consider all labels with a pure numerical form.
				for (var l = 0; l < issue.labels.length; l++) {
					var labelText = issue.labels[l].name;
					if (labelText.match(/^[1-9][0-9]*$/) != null) {
						var estimate = parseInt(labelText);
						console.log("Estimate was: " + estimate);
						return estimate;
					}
				}
				return 0;
			}
		},
		
		issueRemainingMeta: function(issue, estimate) {
			if (issue.closed_at != null ) 
				return 0;
			
			switch (estimateInIssues) {
			case "inbody": 
				return yodaBase.issueRemaining(issue, estimate);
				
			case "noissues":
				return 1;
				
			case "inlabels":
				return estimate;
			}
			return 0;
		},
		
		// Count number of completed tasks (lines in body starting with "- [x]" or "- [X]"
		getbodyCompletedTasks: function(body) {
			var res = body.match(/^- \[(x|X)\]/mg);
			if (res != null) {
				return res.length;
			} else {
				return 0;
			}
		},
		
		// Retrieve # of tasks (including completed)
		// Count number of tasks (lines in body starting with "- [x]" or "- [X]" or "- [ ]"
		getbodyTasks: function(body) {
			var res = body.match(/^- \[(x|X| )\]/mg);
			if (res != null) {
				return res.length;
			} else {
				return 0;
			}
		},

		getBodyParent: function(body) {
			return getBodyField(body, '^> parent ', '[ ]*(.*/.*)?#[0-9]+[ ]*$');
		},

		getMilestoneStartdate: function(description) {
			return getBodyField(description, '> startdate ', '[ ]*20[0-9][0-9]-[01][0-9]-[0-3][0-9]');
		},

		getMilestoneCapacity: function(description) {
			return getBodyField(description, '> capacity ', '[ ]*[1-9][0-9]*');
		},
		
		getMilestoneBurndownDuedate: function(description) {
			return getBodyField(description, '> burndownduedate ', '[ ]*20[0-9][0-9]-[01][0-9]-[0-3][0-9]');
		},

		// Format date as YYYY-MM-DD
		formatDate: function(date) {
			var result = date.getFullYear() + "-";
			if (date.getMonth() + 1 < 10)
				result += "0";
			result += (date.getMonth() + 1) + "-";
			if (date.getDate() < 10)
				result += "0";
			result += (date.getDate());
			return result;
		},
		

		// Get owner (org or user) from repo fullname
		getFullnameOwner: function(fullname) {
			var temp = fullname.split("/");
			if (temp == null) {
				return null;
			} else {
				return temp[0];
			}
		},

		// Get repo name from fullname
		getFullnameRepo: function(fullname) {
			var temp = fullname.split("/");
			if (temp == null || temp.length == 1) {
				return null;
			} else {
				return temp[1];
			}
		},

		// get owner part of issue. If short form, use the owner from argument.
		getIssueOwner: function(issueRef, issueOwner) {
			var issueRefSplit = issueRef.split("/");
			if (issueRefSplit.length == 1) {
				return issueOwner;
			} else {
				return issueRefSplit[0];
			}
		},

		// get owner part of issue. If short form, use the owner from argument.
		getIssueRepo: function(issueRef, issueRepo) {
			var issueRefSplit = issueRef.split("/");
			if (issueRefSplit.length == 1) {
				return issueRepo;
			} else {
				return issueRefSplit[1].split("#")[0];
			}
		},

		// get owner part of issue. If short form, use the owner from argument.
		getIssueNumber: function(issueRef) {
			var issueRefSplit = issueRef.split("/");
			if (issueRefSplit.length == 1) {
				return issueRefSplit[0].split("#")[1];
			} else {
				return issueRefSplit[1].split("#")[1];
			}
		},
		
		// get repo from url
		getUrlRepo: function(url) {
			return (url.split("/").slice(-1)[0]);
		},
		
		getRepoFromMilestoneUrl: function(url) {
			return (url.split("/").slice(-3)[0]);
		},

		// Login to github. Accept block accepts experimental API features.
		gitAuth: function (userId, accessToken, fullExport) {
			console.log("Logging in. userId: " + userId + ", accessToken: " + accessToken + ", fullExport: " + fullExport);
			yoda_userId = userId;
			
			var headers = [];
			if (fullExport != undefined) {
				headers['Accept'] = 'application/vnd.github.symmetra-preview.full+json';
			} else {
				headers['Accept'] = 'application/vnd.github.symmetra-preview+json';
			}

			if (userId == "" || accessToken == "") {
				console.log("Empty userId/accessToken.");
			} else {
				var authdata = base64_encode(userId  + ':' + accessToken);
				headers['Authorization'] = 'Basic ' + authdata;
//				headers['PRIVATE-TOKEN'] = accessToken;  // Gitlab play. API is differnet anyhow
			}
			
			$.ajaxSetup({
				headers : headers
			});
		},
		
		// Return authorized user (as given to last gitAuth call)
		getAuthUser: function() {
			return yoda_userId;
		},
		
		// Collect various information from the API. URL gives the requested info, the function does the
		// collection and concatenation, calling in the end the final function. 
		getLoop: function(url, finalFunc, errorFunc) {
			getLoopInternal(url, [], finalFunc, null, errorFunc);
		},
		
		// Collect various information from the API. URL gives the requested info, the function calls repeatedly
		// until no more data. partFunc callback is called for every response.
		// finalFunc is called on the final response.
		// Set page = 1 for first page, or set to -1 for get calls where per_page / page is not used.
		// No cursor changes.
		// Note, we are not using the callNo cancellation... 
		getLoopIterative: function(url, partFunc, finalFunc, errorFunc) {
			getLoopInternal(url, [], finalFunc, partFunc, errorFunc);
		},
		
		// Filter out pull requests. Don't want them.
		filterPullRequests: function(issues) {
			for (var i = 0; i < issues.length;) {
//				console.log("Filter" + issues[i].number + ", pull: " + issues[i].pull_request);
				if (issues[i].pull_request != null) {
					issues.splice(i, 1);
				} else {
					i++;
				}
			}
		},
		
		// ----GITHUB REPO FUNCTIONS --------------------------------------
		
		
		// ----------- GITHUB ISSUE FUNCTIONS ------------------------
		getIssues: function() {
			return yoda_issues;
		},
		
		// Generic function to retrieve issues across multiple repos.
		// labelFilter can be empty
		// stateFilter should be "all", "open" or "closed".
		// Update the issues. Note, that this will result in multiple GitHub calls.
		// Note, that this call will automatically filter out pull requests.
		// Do NOT set _internalStarted value
		// An addFilterFunc may be specified. This will be called back with the repo as argument. It is possible this function
		// to return "notthere" in which case the call will be skipped.
		updateGitHubIssuesRepos: function (owner, repoList, labelFilter, stateFilter, addFilterFunc, okFunc, failFunc, _internalStarted) {
			if (_internalStarted != true) {
				// Clear issues on first call.
				yoda_issues = [];
			}

			// Specific repo only. 
			var getIssuesUrl = yodaBase.getGitHubUrl() + "repos/" + owner + "/" + repoList[0] + "/issues?state=" + stateFilter + "&direction=asc";
			if (labelFilter != "") {
				getIssuesUrl += "&labels=" + labelFilter; 
			}
			
			// Do we need to add add filter (typically milestone as well)?
			if (addFilterFunc != null) {
				getIssuesUrl += addFilterFunc(repoList[0]);
			}

			console.log("Get Issues URL:" + getIssuesUrl);
			yodaBase.getLoop(getIssuesUrl, function(issues) {
				yoda_issues = yoda_issues.concat(issues);
				
				if (repoList.length == 1) {
					// Last call completed.
					yodaBase.filterPullRequests(yoda_issues);
					if (okFunc != null)
						okFunc(yoda_issues);
				} else {
					yodaBase.updateGitHubIssuesRepos(owner, repoList.slice(1), labelFilter, stateFilter, addFilterFunc, okFunc, failFunc, true);
				}
			}, failFunc);
		},

		// Generic function to retrieve issues across an organization.
		// labelFilter can be empty
		// stateFilter should be "all", "open" or "closed".
		// Note, that this call will automatically filter out pull requests.
		updateGitHubIssuesOrg: function (owner, labelFilter, stateFilter, okFunc, failFunc) {
			// Clear old issues.
			yoda_issues = [];
			
			// All issues into org.
			var getIssuesUrl = yodaBase.getGitHubUrl() + "orgs/" + owner + "/issues?filter=all&state=" + stateFilter + "&direction=asc";
			
			if (labelFilter != "") {
				getIssuesUrl += "&labels=" + labelFilter; 
			}
			console.log("Get Issues URL:" + getIssuesUrl);
			yodaBase.getLoop(getIssuesUrl, function(issues) {
				yodaBase.filterPullRequests(issues);
				yoda_issues = issues;

				if (okFunc != null)
					okFunc(yoda_issues)
			}, failFunc);
		},

		// ----------------------------------
		
		// Deep copy an object by making an intermediate JSON object.
		deepCopy: function(o) {
		    return JSON.parse(JSON.stringify( o ));
		},
	}
})();
