// This file contains utility functions for Yoda.
// Apart from some initial Date manipulation functions, the file exposes functions via
// a module named 'yoda'.


// Extra data functions. Keeping outside of module
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

// Yoda menu. Runs once
// Yoda menu




// -----------------------------------------------------
// Yoda module
var yoda = (function() {
	// ------------------------------
	// Yoda Private variables
	
	// Count snackbar to ensure proper updates.
	var snackbarCount = 0;
	
	// GitHub container lists. Retrieve only via access functions
	var yoda_repoList = [];
	var yoda_issues = [];
	
	var yoda_firstRepoUpdate = true;
	
	var yoda_userId = null;
	
	// GitHub call control variable. New calls will cancel existing calls.
	var yoda_gitHubCallNo = 0;
	
	// -------------------------------
	
	// UPDATE THESE TO FIT YOUR GITHUB...
	
	// Standard github.com settings.
	var gitHubApiBaseUrl = "https://api.github.com/";
	var gitHubBaseUrl = "https://www.github.com/";

	console.log("URL: " + window.location.href);
	console.log("URL hostname: " + window.location.hostname);
	
	// If page is served from github.hpe.com, then change URL defaults to HPE GitHub Enterprise Instance
	if (window.location.hostname.indexOf("github.hpe.com") != -1) {
		var gitHubApiBaseUrl = "https://github.hpe.com/api/v3/";
		var gitHubBaseUrl = "https://github.hpe.com/";
	}
	
	// Retrieve URL parameters
	GetURLParameter = function (sParam) {
		var sPageURL = window.location.search.substring(1);
		if (sPageURL.length == 0)
			return null;
		var sURLVariables = decodeURIComponent(sPageURL).split('&');
		for (var i = 0; i < sURLVariables.length; i++) {
			var sParameterName = sURLVariables[i].split('=');
			if (sParameterName[0] == sParam) {
				return sParameterName[1];
			}
		}
		return null;
	};
	
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
			var quoteStart = start.indexOf(">");
			if (quoteStart != -1)
				newString = res[index].substr(start.substr(quoteStart).length);
			
			var reg2 = new RegExp(data);
			var res2 = newString.match(reg2);
			return res2[0].trim();
		} else {
			return null;
		}
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

    // -----------------------------	
	// Interface functions
	return {
		strip2Digits: function(number) {
			places = 2;
			return +(Math.round(number + "e+" + places)  + "e-" + places);
		},
		
		// A mix of nice bar colors for bar charts. 
		// The first 4 are not random. Idea is to match
		// Severity Urgent, High, Medium, Low used in generating time issues statistics (time-stats.html)
		barColors: [
			'rgb(255, 80, 80)', // red
			'rgb(255, 153, 0)', // orange
			'rgb(102, 0, 255)', // blue
			'rgb(0, 204, 0)', // green
			'rgb(204, 255, 51)', // yellow
			'rgb(204, 102, 255)', // purple
			'rgb(153, 102, 0)', // brown
			'rgb(153, 153, 255)', // light blue
			'rgb(255, 102, 255)', // light purple
			'rgb(102, 255, 255)', // magenta
			'rgb(0, 204, 153)', // greenish
			'rgb(255, 153, 102)', // light orange
			'rgb(255, 153, 153)', // light pink
			'rgb(153, 51, 153)', // dark purple
			'rgb(51, 153, 102)', // stylish grey
			'rgb(153, 204, 0)', // orange-yellow
			'rgb(153, 214, 255)', // very light blue
			'rgb(179, 134, 0)', // dark orange
			'rgb(155, 80, 80)', // red'
			'rgb(155, 53, 0)', // orange'
			'rgb(50, 0, 150)', // blue'
			'rgb(0, 104, 0)', // green'
			'rgb(104, 155, 51)', // yellow'
			'rgb(104, 102, 155)', // purple'
			'rgb(53, 52, 0)', // brown'
			'rgb(53, 53, 155)' // light blue'
		],
		
		// Show snackbar (pop-up in bottom of page shown for short time only). Timeout in ms, default 1500 ms.
		// Assume presence of HTML element with id "snackbar".
		showSnackbar: function(message, backgroundColor, timeout) {
			snackbarCount++;
			if (timeout == undefined) {
				timeout = 1500;
			}
		    var x = document.getElementById("snackbar")
		    x.className = "show";
		    x.innerHTML = message;
		    x.style["background-color"] = backgroundColor;
		    setTimeout(function(){ snackbarCount--; if (snackbarCount == 0) x.className = x.className.replace("show", ""); }, timeout);
		},
		
		// Shows an informative (ok) message. Green background for 1500 ms.
		showSnackbarOk: function(message, timeout) {
			if (timeout == undefined) {
				timeout = 1500;
			}
			yoda.showSnackbar(message, '#01a982', timeout);
		},

		// Shows an error message for 3 seconds. Red background.
		showSnackbarError: function(message, timeout) {
			if (timeout == undefined) {
				timeout = 3000;
			}
			yoda.showSnackbar(message, '#cc0e24', timeout);
		},

		getEstimateInIssues: function() {
			return estimateInIssues;
		},
		
		setEstimateInIssues: function(newValue) {
			estimateInIssues = newValue;
			console.log("estimateInIssues now: " + estimateInIssues);
		},
		
		getGithubUrl: function() {
			var overwrite = yoda.getDefaultLocalStorageValue("gitHubApiBaseUrl");
			if (overwrite != null)
				return overwrite;
			else
				return gitHubApiBaseUrl;
		},
		
		getGithubUrlHtml: function() {
			var overwrite = yoda.getDefaultLocalStorageValue("gitHubBaseUrl");
			if (overwrite != null)
				return overwrite;
			else
				return gitHubBaseUrl;
		},
	
		// Decode URL parameter. If param is non-null, then set that component to the value obtained from the URL (if at all).
		decodeUrlParam: function(id, param) {
			var value = GetURLParameter(param);
			if (value != null && id != null) {
				$(id).val(value);
			}
			return value;
		},
		
		// Above, specialized for Boolean (i.e. understands true => checked, otherwise unchecked.
		decodeUrlParamBoolean: function(id, param) {
			var value = GetURLParameter(param);
			if (value != null && id != null) {
				if (value == "true") {
					$(id).attr('checked', true);
				} else {
					$(id).attr('checked', false);
				}
			}
			return value;
		},
		
		// Decode date. Add logic of +# / -# meaning days relative to today
		decodeUrlParamDate: function(id, param) {
			console.log("Decoding date: " + param);
			var value = GetURLParameter(param);
			if (value != null && id != null) {
				$(id).val(yoda.handleDateDelta(value));
			}
			return value;
		},
		
		decodeParamRadio: function(id, value) {
			if (value != null && id != null) {
			     $('input[name="' + id + '"][value="' + value + '"]').attr('checked',true);
			}
			return value;
		},
		
		decodeUrlParamRadio: function(id, param) {
			var value = GetURLParameter(param);
			return yoda.decodeParamRadio(id, value);
		},
		
		decodeUrlParamSelect: function(id, param) {
			var value = GetURLParameter(param);
			if (value != null && id != null) {
			     $(id).val(value).change();
			}
			return value;
		},
		
		updateUrl: function(searchParams) {
//			var baseUrl = window.location.origin + window.location.pathname;
			var baseUrl = window.location.pathname;
			console.log("Updating URL to " + baseUrl + "?" + searchParams);
			window.history.replaceState(null, null, baseUrl + "?" + searchParams);
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
				return (yoda.formatDate(deltaDate));
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
			res = removeFromBody(res, "^> info .*$");
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
			for (var index = 0; yoda.getFirstRemaining(issue.body, index) != null; index++) {
				var remainingEntry = yoda.getFirstRemaining(issue.body, index);
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
			var estimate = yoda.issueEstimate(issue);
			
			if (estimateInIssues == "inbody") {
				// We need to work on potential remaining.
				for (var index = 0; yoda.getFirstRemaining(issue.body, index) != null; index++) {
					var remainingEntry = yoda.getFirstRemaining(issue.body, index);
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
				var issueEstimate = yoda.getBodyEstimate(issue.body);
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
				return yoda.issueRemaining(issue, estimate);
				
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

		// Set radio button from URL
		updateEstimateRadio: function () {
			var temp = $("#estimateradio input[type='radio']:checked");
			if (temp.length > 0) {
				estimateInIssues = temp.val();
			}
			console.log("EstimateInIssues now: " + estimateInIssues);
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
		
		getMilestoneInfo: function(description) {
			var info = getBodyField(description, '> info ', '[A-Za-z0-9].*$');   
			if (info == null)
				info = "";
			return info;
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
		
		// Determine best foreground font color (white or black) depending on the background
		// Background color (argument) may be given either as hex rep. #aaaaaa or in rgb format, eg: rgb(102, 0, 255)
		bestForeground: function(color, whiteColor, blackColor) {
			if (whiteColor == undefined)
				whiteColor = 'rgb(255, 255,255)';
			if (blackColor == undefined)
				blackColor = 'rgb(0,0,0)';
			if (color == undefined) 
				return blackColor;

			if (color[0] == 'r') {
				// assume rgb format
			    colorsOnly = color.substring(color.indexOf('(') + 1, color.lastIndexOf(')')).split(/,\s*/);
			    var r = colorsOnly[0];
			    var g = colorsOnly[1];
			    var b = colorsOnly[2];


			} else {
			    var hex  = color.replace(/#/, '');
			    var r  = parseInt(hex.substr(0, 2), 16);
			    var g = parseInt(hex.substr(2, 2), 16);
			    var b = parseInt(hex.substr(4, 2), 16);
			}

		    var a = 1.0 - (0.299 * r + 0.587 * g + 0.114 * b) / 255.0;
//		    console.log(r, g, b, a);
		    if (a < 0.45) {
		    	return blackColor;
		    } else {
		    	return whiteColor;
		    }
		},

		// Search all issue labels looking for a given label. 
		isLabelInIssue: function(issue, label) {
			for (l = 0; l < issue.labels.length; l++) {
				var labelName = issue.labels[l].name;
				if (labelName == label)
					return true;
			}
			return false;
		},
		
		sortDates: function(issue_1, issue_2) {
			if (issue_1.closed_at == null || issue_2.closed_at == null) 
				return 0;
			else 
				return (issue_1.closed_at < issue_2.closed_at);
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

		getUserTokenLocalStorage: function(userField, tokenField) { 
			// May not work in ealier versions of IE
			try {
				var userId = window.localStorage.getItem("gitHubUserId");
				if (userId != null)
					$(userField).val(userId);
				var token = window.localStorage.getItem("gitHubAccessToken");
				if (token != null)
					$(tokenField).val(token);
			}
			catch(err) {
				console.log("Failed to set user-id and token into localStorage. Probably early version of IE.");
			}
		},
		
		getDefaultLocalStorageValue: function(localStorageId) {
			try {
				return window.localStorage.getItem(localStorageId);
			} 
			catch(err) {
				console.log("Failed to retrieve localStorage with id: " + localStorageId);
				return null;
			}
		},
		
		getDefaultLocalStorage: function(inputField, localStorageId) {
			value = yoda.getDefaultLocalStorageValue(localStorageId);
			if (value != null) {
				// Set the field both as value and default.
				$(inputField).data("defaultValue", value);
				$(inputField).val(value);
			}
		},
		
		// Login to github. Accept block accepts experimental API features.
		gitAuth: function (userId, accessToken, fullExport) {
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
		
		getAuthUser: function() {
			return yoda_userId;
		},
		
		// Download CSV data as file.
		downloadFileWithType: function(fileType, data, fileName) {
		    var csvData = data;
		    var blob = new Blob([ csvData ], {
		        type : fileType
		    });

		    if (window.navigator.msSaveBlob) {
		        // FOR IE BROWSER
		        navigator.msSaveBlob(blob, fileName);
		    } else {
		        // FOR OTHER BROWSERS
		        var link = document.createElement("a");
		        var csvUrl = URL.createObjectURL(blob);
		        link.href = csvUrl;
		        link.style = "visibility:hidden";
		        link.download = fileName;
		        document.body.appendChild(link);
		        link.click();
		        document.body.removeChild(link);
		    }
		},
		
		// CSV version
		downloadFile: function(data, fileName) {
			yoda.downloadFileWithType("application/csv;charset=utf-8;", data, fileName);
		},

		// Collect various information from the API. URL gives the requested info, the function does the
		// collection and concatenation, calling in the end the final function. 
		// Set page = 1 for first page, or set to -1 for get calls where per_page / page is not used.
		getLoop: function(url, page, collector, finalFunc, errorFunc, callNo) {
			// First call?
			if (callNo == undefined) {
				$("*").css("cursor", "wait");
				yoda_gitHubCallNo++;
				callNo = yoda_gitHubCallNo;
				console.log("Starting loop call no " + callNo + " with URL: " + url);
			} else {
				// Check if someone started a newer call. Then we will cancel.
				if ((callNo != -1) && (callNo) < yoda_gitHubCallNo) {
					console.log("getLoop detected newer call (" + yoda_gitHubCallNo + " > " + callNo + "). Cancelling.");
					return;
				}
			}
			
			if (page != -1) {
				var oldIndex = url.indexOf("per_page=100&page=");
				if (oldIndex != -1) { 
					url = url.substring(0, oldIndex) + "per_page=100&page=" + page;
				} else {
					// Do we have a ?
					if (url.indexOf("?") == -1) {
						url = url + "?per_page=100&page=" + page;
					} else {
						url = url + "&per_page=100&page=" + page;
					}
				}
			}
			
			$.getJSON(url, function(response, status){
				if (response.length == 100 && page != -1) {
					yoda.getLoop(url, page + 1, collector.concat(response), finalFunc, errorFunc, callNo);
				} else {
					$("*").css("cursor", "default");
					finalFunc(collector.concat(response));
				}
			}).done(function() { /* One call succeeded */ })
			.fail(function(jqXHR, textStatus, errorThrown) { 
				$("*").css("cursor", "default");
				if (errorFunc != null) {
					errorFunc(errorThrown + " " + jqXHR.status);
				}
				})
			.always(function() { /* One call ended */ });;          
		},
		
		// Collect various information from the API. URL gives the requested info, the function calls repeatedly
		// until no more data. partFunc callback is called for every response.
		// finalFunc is called on the final response.
		// Set page = 1 for first page, or set to -1 for get calls where per_page / page is not used.
		// No cursor changes.
		// Note, we are not using the callNo cancellation... 
		getLoopIterative: function(url, page, partFunc, finalFunc, errorFunc) {
			if (page != -1) {
				var oldIndex = url.indexOf("per_page=100&page=");
				if (oldIndex != -1) { 
					url = url.substring(0, oldIndex) + "per_page=100&page=" + page;
				} else {
					// Do we have a ?
					if (url.indexOf("?") == -1) {
						url = url + "?per_page=100&page=" + page;
					} else {
						url = url + "&per_page=100&page=" + page;
					}
				}
			}
			
			console.log("Iterative call URL: " + url);
			$.getJSON(url, function(response, status){
				if (partFunc != null)
					partFunc(response);
				
				if (response.length == 100 && page != -1) {
					yoda.getLoopIterative(url, page + 1, partFunc, finalFunc, errorFunc);
				} else {
					finalFunc();
				}
			}).done(function() { /* One call succeeded */ })
			.fail(function(jqXHR, textStatus, errorThrown) { 
				if (errorFunc != null) {
					errorFunc(errorThrown + " " + jqXHR.status);
				}
				})
			.always(function() { /* One call ended */ });;          
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
		
		// Functions to keep up-to-date list of repos based on owner.
		getRepoList: function() {
			return yoda_repoList;
		},
		
		// Update list of repositories for the given owner (organization or user).
		// user boolean is optional
		updateRepos: function(owner, okFunc, failFunc, user) {
			yoda_repoList = [];

			if (user == true) {
				// Ok, this is getting tricky. Ideally we would like to use the /users/:user/repos endpoint. However, this only returns the public repos.
				// IF we are indeed targetting our own repos, then we need to use instead the /user/repos end point with affiliation=owner set.
				if ($("#owner").val() == yoda.getAuthUser()) 				
					var getReposUrl = yoda.getGithubUrl() + "user/repos?affiliation=owner"; 
				else
					var getReposUrl = yoda.getGithubUrl() + "users/" + $("#owner").val() + "/repos";
			}
			else { 
				var getReposUrl = yoda.getGithubUrl() + "orgs/" + $("#owner").val() + "/repos";
			}
			
			yoda.getLoop(getReposUrl, 1, [],
				// Ok func
				function(data) {
					// Sort and store repos.
					data.sort(function(a,b) {
						if (a.name.toLowerCase() > b.name.toLowerCase()) {
							return 1;
						} else {
							return -1;
						}
					});
					yoda_repoList = data;
					
					if (okFunc != null)
						okFunc();
				}, 
				// fail func
				function() {
					if (user != true) {
						console.log("Did not find any repos for org named " + owner + ". Will try users");
						// In case we did not get any repos from organization, let's double check by trying on user.
						yoda.updateRepos(owner, okFunc, failFunc, true);
					} else { 
						if (failFunc != null)
							failFunc();
					}
				});
		},
		
		// Update list of repositories AND update GUI field,. Select repo(s) from URL if supplied.
		// If required, fallback to the localStorage defaults.
		updateReposAndGUI: function(owner, fieldId, URLId, localStorageId, okFunc, failFunc) {
			$(fieldId).empty();

			yoda.updateRepos(owner, function() {
				var selectRepos = [];
				if (yoda_firstRepoUpdate == true) {
					yoda_firstRepoUpdate = false;
				
					var urlRepoList = yoda.decodeUrlParam(null, URLId);
					if (urlRepoList != null) 
						selectRepos = urlRepoList.split(",");
					else {
						urlRepo = yoda.decodeUrlParam(null, "repo");
						if (urlRepo != null) {
							selectRepos = urlRepo;
						} else {
							// No values into either URLId or (repo), let's check the localStorage
							if (yoda.getDefaultLocalStorageValue(localStorageId) != null) {
								selectRepos = yoda.getDefaultLocalStorageValue(localStorageId);
							}
						} 
					}
				}
			
				var reposSelected = false;
				for (var r = 0; r < yoda_repoList.length; r++) {
					var selectRepo = false;
					if (selectRepos.indexOf(yoda_repoList[r].name) != -1) {
						selectRepo = true;
						reposSelected = true;
					}
					
					var newOption = new Option(yoda_repoList[r].name, yoda_repoList[r].name, selectRepo, selectRepo);
					$(fieldId).append(newOption);
				}
			
				if (reposSelected)
					$(fieldId).trigger('change');
				
				if (okFunc != null)
					okFunc();
			}, failFunc);
		},
		
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
			var getIssuesUrl = yoda.getGithubUrl() + "repos/" + owner + "/" + repoList[0] + "/issues?state=" + stateFilter + "&direction=asc";
			if (labelFilter != "") {
				getIssuesUrl += "&labels=" + labelFilter; 
			}
			
			// Do we need to add add filter (typically milestone as well)?
			if (addFilterFunc != null) {
				getIssuesUrl += addFilterFunc(repoList[0]);
			}

			console.log("Get Issues URL:" + getIssuesUrl);
			yoda.getLoop(getIssuesUrl, 1, [], function(issues) {
				yoda_issues = yoda_issues.concat(issues);
				
				if (repoList.length == 1) {
					// Last call completed.
					yoda.filterPullRequests(yoda_issues);
					if (okFunc != null)
						okFunc(yoda_issues);
				} else {
					yoda.updateGitHubIssuesRepos(owner, repoList.slice(1), labelFilter, stateFilter, addFilterFunc, okFunc, failFunc, true);
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
			var getIssuesUrl = yoda.getGithubUrl() + "orgs/" + owner + "/issues?filter=all&state=" + stateFilter + "&direction=asc";
			
			if (labelFilter != "") {
				getIssuesUrl += "&labels=" + labelFilter; 
			}
			console.log("Get Issues URL:" + getIssuesUrl);
			yoda.getLoop(getIssuesUrl, 1, [], function(issues) {
				yoda.filterPullRequests(issues);
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
		
		// Menu stuff
		enableMenu: function() {
			// Build the menu
			$("#yodamenu").append('<a href="index.html">Landing Page</a>');
			$("#yodamenu").append('<a href="yoda-time-stats.html">Time Statistics Report</a>');
			$("#yodamenu").append('<a href="yoda-cfd.html">CFD Report</a>');
			$("#yodamenu").append('<a href="yoda-burndown.html">Burndown Report</a>');
			$("#yodamenu").append('<a href="yoda-velocity.html">Velocity Report</a>');
			$("#yodamenu").append('<a href="yoda-kanban.html">Kanban Board</a>');
			$("#yodamenu").append('<a href="yoda-release-notes.html">Release Notes</a>');
			$("#yodamenu").append('<a href="yoda-milestone-manager.html">Milestone Manager</a>');
			$("#yodamenu").append('<a href="yoda-label-manager.html">Label Manager</a>');
			$("#yodamenu").append('<a href="yoda-exporter.html">Issue Exporter</a>');
			$("#yodamenu").append('<a href="yoda-copy-tasks.html">Task Copier</a>');
			$("#yodamenu").append('<a href="yoda-export-web.html">Export to Web Pages</a>');
			$("#yodamenu").append('<a href="MANUAL.html">User Manual</a>');
			$("#yodamenu").append('<a href="yoda-admin.html">Admin Settings</a>');

			// Close the dropdown menu if the user clicks outside of it
			window.onclick = function(event) {
				if (!event.target.matches('.dropimg')) {
					var dropdowns = document.getElementsByClassName("dropdown-content");
					var i;
					for (i = 0; i < dropdowns.length; i++) {
						var openDropdown = dropdowns[i];
						if (openDropdown.classList.contains('show')) {
							openDropdown.classList.remove('show');
						}
					}
				}
			}
		},
		
		/* When the user clicks on the button, 
		toggle between hiding and showing the dropdown content */
		menuClick: function() {
			document.getElementById("yodamenu").classList.toggle("show");
		},
	}

})();
