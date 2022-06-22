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
	
	// Color Scheme stuff.
	var currentColorScheme = "default";
	var colorSchemes = { 
		default: {
			htmlBackground: 'white',
			fontContrast: 'black',
			fontAsBackground: 'white',
			lineBackground: (typeof Chart !== 'undefined')? Chart.defaults.backgroundColor: 'black',
			gridColor: (typeof Chart !== 'undefined')? Chart.defaults.backgroundColor: 'black'		
		},
		dark: {
			htmlBackground: 'black',
			fontContrast: 'white',
			// fontAsBackground: 'black',
			fontAsBackground: 'white',
			lineBackground: 'white',
			gridColor: 'grey'		
		}
	};
	
	// Retrieve URL parameters
	GetURLParameter = function (sParam) {
		var sPageURL = window.location.search.substring(1);
		if (sPageURL.length == 0)
			return null;
		var sURLVariables = decodeURIComponent(sPageURL).split('&');
		
		for (var i = 0; i < sURLVariables.length; i++) {
			var sParameterName = sURLVariables[i].split('=');
			if (sParameterName[0] == sParam) {
				return sURLVariables[i].substr(sParameterName[0].length + 1);
			}
		}
		return null;
	};
	
	// Get last page. Given Link response header like "// <https://github.hpe.com/api/v3/repositories/12598/comments?per_page=100&page=2>; rel="next", <https://github.hpe.com/api/v3/repositories/12598/comments?per_page=100&page=6>; rel="last""
	// return the last page, 6 in this case.
	getLastPage = function (link) {
		if (link == undefined || link == null)
			return -1;
		
		var parts = link.split(",");
		for (var p = 0; p < parts.length; p++) {
			if (parts[p].indexOf('rel="last"') == -1)
				continue;

			var search = "&page=";
			var lastIndex = parts[p].indexOf(search);
			if (lastIndex == -1)
				return -1;
			lastIndex += search.length;
			
			var untilIndex = parts[p].indexOf(">;");
			if (untilIndex == -1)
				return -1;
		
			var lastPage = parts[p].substr(lastIndex, untilIndex - lastIndex);
			return lastPage;
		}
		return -1;
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
		if (body == undefined || body == null) 
				return null;

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
		
		
		// Color scheme I/F functions
		getColor: function(attribute) {
			return colorSchemes[currentColorScheme][attribute];
		},
		 
		getColorScheme() {
			return currentColorScheme;
		},
	
		setDarkColorScheme: function() {
			console.log("Changing to dark color scheme");
			currentColorScheme = "dark";
			if (typeof Chart !== 'undefined')
				Chart.defaults.color = 'white';
		},

		setDefaultColorScheme: function() {
			console.log("Changing to default color scheme");
			currentColorScheme = "default";
			if (typeof Chart !== 'undefined')
				Chart.defaults.color = '#666';
		},
		
		// A mix of nice bar colors for bar charts. 
		// The first 4 are not random. Idea is to match
		// Severity Urgent, High, Medium, Low used in generating time issues statistics (time-stats.html)
		barColors: [
			'rgb(255, 80, 80)', // red
			'rgb(255, 153, 0)', // orange
//			'rgb(102, 0, 255)', // blue .... too blue
			'rgb(102, 102, 255)', // blue .... too blue
			'rgb(0, 204, 0)', // green
			'rgb(13, 82, 101)',
			'rgb(50,218,200)',
			'rgb(118,48,234)',
			'rgb(254, 201, 1)', // yellow
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
		
		// Select2 utils
		// Sorter is not really a sorter, but called as such. It add the menu option to select all matches (including all entries if no search)
		select2Sorter: function (matches) {
			if (matches.length > 0) {
			// Insert a special "Select all matches" item at the start of the 
			// list of matched items.
				return [{ id: 'selectAll', text: 'Select all matches', matchIds: matches.map(match => match.id) }, ...matches];
			}
		},
		
		select2MatchHelper: function(term, text) {
			var termReg = new RegExp("^" + term.replaceAll("*", ".*").toUpperCase() + "$");
			return (text.toUpperCase().match(termReg) != null);	
		},
		
		select2Matcher: function(params, data) {
    		// If there are no search terms, return all of the data
    		if ($.trim(params.term) === '') {
    			return data;
    		}

    		// Do not display the item if there is no 'text' property
    		if (typeof data.text === 'undefined') {
    			return null;
    		}

    		// `params.term` should be the term that is used for searching
    		// `data.text` is the text that is displayed for the data object
			// If search *, we will assume use it as "mini" regular expression
			if ((params.term.includes("*") && yoda.select2MatchHelper(params.term, data.text)) || (data.text.toUpperCase().indexOf(params.term.toUpperCase()) == 0)) {
    			var modifiedData = $.extend({}, data, true);
    		    return modifiedData;
    		}

	       // Return `null` if the term should not be displayed
    		return null;
    	},

		select2SelectEvent: function(field) { return function (e) {
			if (e.params.data.id === 'selectAll') {
		  		$(field).val(e.params.data.matchIds);
		  	 	$(field).trigger('change');
		  	 };
		}},

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
			if (yoda.topPanelHidden)
				searchParams += "&hidepanel=true";
			if (yoda.getColorScheme() == "dark")
				searchParams += "&dark=true";
			
//			var baseUrl = window.location.origin + window.location.pathname;
			var baseUrl = window.location.pathname;
			searchParams = searchParams.replace(/%/g, "%25");
			console.log("Updating URL to " + baseUrl + "?" + searchParams);
			window.history.replaceState(null, null, baseUrl + "?" + searchParams);
        },
        
        // Return a copy of an array containing only attributes mentioned in fields array
        reduceArray: function(data, fields) {
        	return data.map(function(item) {
        		var newItem = {};
        		fields.forEach(function(field) {
        			newItem[field] = item[field];
        		});
        		return newItem;
        	});
        },
        
        advanceDate: function (date, interval, startDay) {
            if (interval.slice(-1) == 'm') {
                // Assume month
                date.addMonths(parseInt(interval));
                date.setDate(Math.min(startDay, date.getDaysInMonth()));
            } else {
                date.setDate(date.getDate() + parseInt(interval));
            }
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
			var estimate = getBodyField(body, '^>[ ]?estimate ', '[ ]*[0-9][0-9]*(\.[0-9])?([0-9])?[ ]*$');
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
			if (description == null)
				return "";
			res = removeFromBody(description, "^> startdate .*$");
			res = removeFromBody(res, "^> burndownduedate .*$");
			res = removeFromBody(res, "^> capacity .*$");
			res = removeFromBody(res, "^> ed .*$");
			res = removeFromBody(res, "^> info .*$");
			res = removeFromBody(res, "^> subteam-capacity .*$");
			res = removeFromBody(res, "^> subteam-ed .*$");
			return res;
		},
		
		
		// get date part of remaining entry.
		getDateFromEntry: function(remainingEntry) {
			var dateEnd = remainingEntry.indexOf(" ");
			if (dateEnd == -1) {
				console.log("ERROR: Cannot interpret remaining entry: " + remainingEntry);
				return "2000-00-00";
			} 
			var remainingDate = remainingEntry.slice(0, dateEnd);
			
			// Date checks + make the date perfectly formatted as YYYY-MM-DD
			var firstDash = remainingDate.indexOf("-");
			if (firstDash != 4) {
				console.log("ERROR: Cannot interpret date in remaining entry: " + remainingEntry);
				return "2000-00-00";
			}
			var secondDash = remainingDate.indexOf("-", firstDash + 1);
			if (secondDash != 7 && secondDash != 6) {
				console.log("ERROR: Cannot interpret date in remaining entry: " + remainingEntry);
				return "2000-00-00";
			}
			
			if (secondDash == 6) {
				// Month < 10
				remainingDate = remainingDate.slice(0, firstDash + 1) + "0" + remainingDate.slice(firstDash + 1);
				secondDash = remainingDate.indexOf("-", firstDash + 1);
//				console.log("Adjusted date (month < 10): '" + remainingDate + "'");
			}
			
			if (remainingDate.length == 9) {
				// Day < 10
				remainingDate = remainingDate.slice(0, secondDash + 1) + "0" + remainingDate.slice(secondDash + 1);
//				console.log("Adjusted date (day < 10): '" + remainingDate + "'");
			}
			
			// console.log("remainingEntry='" + remainingEntry + "' dateEnd = " + dateEnd + ", reaminingDate='" + remainingDate + "' firstDash = " + firstDash + ", secondDash=" + secondDash);
			return remainingDate;
		},
		
		// get estimate part from remaining entry.
		getRemainingFromEntry: function(remainingEntry) {
			var dateEnd = remainingEntry.indexOf(" ");
			if (dateEnd == -1) {
				console.log("ERROR: Cannot interpret date in remaining entry: " + remainingEntry);
				return 0;
			}
			remaining = remainingEntry.slice(dateEnd + 1);
//			console.log("remainingEntry='" + remainingEntry + "' dateEnd = " + dateEnd + ", reamining='" + remaining + "'");
			return parseFloat(remaining);
		},
		
		// Extract "> remaining (date) (value)" entries.
		// Should be run in a loop with index = 0 first.  
		getFirstRemaining: function(body, index) {
			var remaining = getBodyField(body, '^>[ ]?remaining ', '[ ]*2[0-9][0-9][0-9]-[0-1]?[0-9]-[0-3]?[0-9][ ][0-9][0-9]*(\.[0-9])?([0-9])?[ ]*$', index);
			console.log(remaining);
			return remaining;
		},
		
		// Get the last > remaining (date) (number) entry and return that number
		// If no entry found, then return estimate.
		issueRemaining: function(issue, estimate) {
			var remaining = estimate;
			for (var index = 0; yoda.getFirstRemaining(issue.body, index) != null; index++) {
				var remainingEntry = yoda.getFirstRemaining(issue.body, index);
				var remainingDate = yoda.getDateFromEntry(remainingEntry);
				var remaining = yoda.getRemainingFromEntry(remainingEntry);
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
					var remainingDate = yoda.getDateFromEntry(remainingEntry);
					var remaining = yoda.getRemainingFromEntry(remainingEntry);
					if (remainingDate < startdate) {
						estimate = parseFloat(remaining);
				//		console.log("Reducing initial estimate to " + estimate + " as ahead of " + startdate + ", index(" + index + ") for issue: " + issue.number + ": " + remainingDate + ", " + remaining);
					} else {
				//		console.log("NOT reducing initial estimate as after " + startdate + ", index(" + index + ") for issue: " + issue.number + ": " + remainingDate + ", " + remaining);
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
		
		// Get all data from getBodyFields (by iterating)
		getAllBodyFields: function(body, start, data) {
			var result = [];
			if (body == undefined || body == null) 
				return result;
			for (var i = 0; (r = getBodyField(body, start, data, i)) != null; i++) {
				result.push(r);
			}
			return result;
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
			if (body == undefined || body == null) 
				return 0;
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
			if (body == undefined || body == null) 
				return 0;
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
		
		getMilestoneED: function(description) {
			return getBodyField(description, '> ed ', '[ ]*[1-9][0-9]*');
		},

		getMilestoneBurndownDuedate: function(description) {
			return getBodyField(description, '> burndownduedate ', '[ ]*20[0-9][0-9]-[01][0-9]-[0-3][0-9]');
		},
		
		getMilestoneInfo: function(description) {
			var info = getBodyField(description, '> info ', '[#A-Za-z0-9].*$');   
			if (info == null)
				info = "";
			return info;
		},
		
		// Format date as YYYY-MM-DD. If UTC argument given (as true), will go by UTC dates
		formatDate: function(date, utc) {
			if (utc == true)
				var day = date.getUTCDate();
			else
				var day = date.getDate();
				
			var result = date.getFullYear() + "-";
			if (date.getMonth() + 1 < 10)
				result += "0";
			result += (date.getMonth() + 1) + "-";
			if (day  < 10)
				result += "0";
			result += day;
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
		
		// search all issue labels look for one of the labels in a list.
		isAnyLabelInIssue: function(issue, labelList) {
			for (ll = 0; ll < labelList.length; ll++) {
				if (yoda.isLabelInIssue(issue, labelList[ll]))
					return true;
			}
			return false;
		},
		
		// Is person assigned to this issue?
		isPersonAssigned: function(issue, person) {
			for (var as = 0; as < issue.assignees.length; as++) {
				if (issue.assignees[as].login == person)
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

		// get repo part of issue. If short form, use the owner from argument.
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
		
		// get owner from url
		getUrlOwner: function(url) {
			return (url.split("/").slice(-4)[0]);
		},
		
		// get repo from url
		getUrlRepo: function(url) {
			return (url.split("/").slice(-3)[0]);
		},
		
		// get issue_number from url
		getUrlNumber: function(url) {
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
		
		clearLocalStorageWild: function(keyWild) {
			Object.entries(localStorage).map(
					x => x[0] 
			).filter(
					x => x.indexOf(keyWild) != -1
			).map(
					x => localStorage.removeItem(x));
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
		
		// Helper function to set a given localStorage item
		// If value is set to blank, the item is removed. 
		setLocalStorage: function(item, value) {
			if (value == "") {
				try {
					localStorage.removeItem(item);
					console.log("Succesfully cleared local storage with id: " + item);

				}
				catch (err) {
					console.log("Failed to clear local storage for id: " + item);
				}
			} else {
				try {
					localStorage.setItem(item, value);
					console.log("Succesfully updated local storage with id: " + item + ". Value length is: " + value.length);
				}
				catch (err) {
					console.log("Failed to update local storage for id: " + item);
				}
			}	
		},

		// Login to github. Accept block accepts experimental API features.
		gitAuth: function (userId, accessToken, fullExport) {
			yoda_userId = userId;
			
			var headers = [];
			if (fullExport == "fullExport" ) {
				headers['Accept'] = 'application/vnd.github.symmetra-preview.full+json';
			} else if (fullExport == "textMatch") {
				headers['Accept'] = 'application/vnd.github.symmetra-preview.text-match+json';
			} else {
				headers['Accept'] = 'application/vnd.github.mercy-preview+json';
			}

			if (userId == "" || accessToken == "") {
				console.log("Empty userId/accessToken.");
			} else {
				// Review this part!
				headers['Authorization'] = 'token ' + accessToken;
//				headers['PRIVATE-TOKEN'] = accessToken;  // Gitlab play. API is differnet anyhow
			}
			
//			headers['Access-Control-Max-Age'] = 86400; // 10 min, which is the maximum allowed for Chrome. 
			
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
		
		// Loop function to collect information across different URLs. It is the users reponsibility to ensure that the collected
		// data is compatible in terms of format. It will be concatenated.
		getUrlLoop: function(urlList, collector, finalFunc, errorFunc, callNo) {
			// Final call?
			if (urlList.length == 0) {
				$("*").css("cursor", "default");
				finalFunc(collector);
				return;
			}
			
			// First call?
			if (callNo == undefined) {
				$("*").css("cursor", "wait");
				yoda_gitHubCallNo++;
				callNo = yoda_gitHubCallNo;
				console.log("Starting url loop call no " + callNo + " (list of URLs): " + urlList.length);
			} else {
				// Check if someone started a newer call. Then we will cancel.
				if ((callNo != -1) && (callNo) < yoda_gitHubCallNo) {
					console.log("getUrlLoop detected newer call (" + yoda_gitHubCallNo + " > " + callNo + "). Cancelling.");
					return;
				}
			}
			
			$.getJSON(urlList[0], function(response, status) {
				yoda.getUrlLoop(urlList.slice(1), collector.concat(response), finalFunc, errorFunc, callNo);
			}).done(function() { /* One call succeeded */ })
			.fail(function(jqXHR, textStatus, errorThrown) { 
				$("*").css("cursor", "default");
				if (errorFunc != null) {
					errorFunc(errorThrown + " " + jqXHR.status);
				}
				})
			.always(function() { /* One call ended */ });;          
		},
		
		// Return number of results for a given (get/search) url. This is done by executing the query once, then retriving the last page indicated
		// This will allow us to gauge the number of results with just two calls (instead of one call per 100)...
		// Set page to 1 when calling.
		getCount: function(url, userArg, page, finalFunc, errorFunc, callNo) {
			// First call?
			if (callNo == undefined) {
				$("*").css("cursor", "wait");
				yoda_gitHubCallNo++;
				callNo = yoda_gitHubCallNo;
				console.log("Starting loop call no " + callNo + " with URL: " + url);
			} 

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

			$.getJSON(url, function(response, status, xhr) {
				if ((response != undefined && page == 1)) {
					// First response, get the lastPage
					var lastPage = getLastPage(xhr.getResponseHeader("Link"));
					if (lastPage == -1) {
						$("*").css("cursor", "default");
						finalFunc(userArg, response.length);
					} else 
						yoda.getCount(url, userArg, lastPage, finalFunc, errorFunc, callNo);
				} else {
					$("*").css("cursor", "default");
					// Final response, calculate and callback with total number.
					finalFunc(userArg, (page - 1) * 100 + response.length);
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
			
			$.getJSON(url, function(response, status) {
				if ((response.items != undefined && response.items.length == 100 && page != -1) || (response.length == 100 && page != -1)) {
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
		
		// Retrieve GitHub file contents for a file under github control. 
		getGitFile(owner, repo, path, branch, finalFunc, errorFunc) {
			console.log(owner, repo, path, branch);
			var directory = path.split("/").slice(0, -1).join("/"); 
			var file = path.split("/").slice(-1);
			console.log("owner: " + owner + ", repo: " + repo + ", path: " + path + ", branch: " + branch + ", directory: " + directory + ", file: " + file);
			
			// First we will get the directory information in order to retrieve the git_url (blob) reference for the file
			var getFileUrl = yoda.getGithubUrl() + "repos/" + owner + "/" + repo + "/contents/" + directory;
			if (branch != "" && branch != null)
				getFileUrl += "?ref=" + branch;
			console.log("getFileUrl: " + getFileUrl);
 			$("*").css("cursor", "wait");
			$.get(getFileUrl, function(response, status) {
				$("*").css("cursor", "default");

				console.log(response);
				
				// Now, let's search the response / directory entries looking for the filename requested.
				var blobUrl = null;
				for (var i = 0; i < response.length; i++)
					if (response[i].name == file)
						blobUrl = response[i].git_url;
				if (blobUrl == null || blobUrl == "null") {
					errorFunc("No such file");
					return; 
				}
				console.log("blob_url: " + blobUrl);
				
				$.ajax({
					url: blobUrl,
					type: "GET",
					processData: false,
					success: function(response, status){
						console.log(response);
						console.log("Succesfully got file. Status: " + status + ", length: " + response.content.length);
						finalFunc(atob(response.content));
					},
					error: function(jqXHR, textStatus, errorThrown) {
						console.log("Failed to download " + blobUrl + ": " + textStatus);
					}
				});
			}).fail(function(jqXHR, textStatus, errorThrown) { 
				if (errorFunc != null) 
					errorFunc(errorThrown + " " + jqXHR.status);
			});
		},
		
		// ----GITHUB REPO FUNCTIONS --------------------------------------
		
		// Functions to keep up-to-date list of repos based on owner.
		getRepoList: function() {
			return yoda_repoList;
		},
		
		// Update list of repositories for the given owner (organization or user).
		// user boolean is optional
		updateRepos: function(owner, okFunc, failFunc, user) {
			// Quick check. Do we already have a value in localStorage that we may use
			var localStorageKey = "yoda.cache.repolist." + owner;
			var localRepoList = yoda.getDefaultLocalStorageValue(localStorageKey);
			if (localRepoList != null) {
				// Check case age
				var repoListTime = yoda.getDefaultLocalStorageValue(localStorageKey + ".time");
				var currentTime = new Date().getTime();
				var elapsedMinutes = (currentTime - repoListTime) / 60000;
				console.log("Elapsed minutes since repoList stored:" + elapsedMinutes);
				
				var cacheLiveTime = yoda.getDefaultLocalStorageValue("yoda.repolistcache");
				if (cacheLiveTime == null)
					cacheLiveTime = 60;
				if (elapsedMinutes < cacheLiveTime) { 
					console.log("  .. reusing repoList. Newer than interval.");
					// Let's use that
					yoda_repoList = JSON.parse(localRepoList);
					okFunc();
					return;
				}
			}
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
					// 	This would be a good place to remove any archieved repos.
					var r = data.length;
					while (r--) {
						if (data[r] == null || (typeof data[r].archived !== 'undefined' && data[r].archived == true))
							data.splice(r, 1);
					}

					// Sort and store repos.
					data.sort(function(a,b) {
						if (a.name.toLowerCase() > b.name.toLowerCase()) {
							return 1;
						} else {
							return -1;
						}
					});
					
					yoda_repoList = data;
					
					yoda.setLocalStorage(localStorageKey, JSON.stringify(yoda.reduceArray(data, ["name"])));
					yoda.setLocalStorage(localStorageKey + ".time", new Date().getTime());
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
		//Special Topic version. Ignore cache.
		updateReposAndGUITopic: function(owner, fieldId, okFunc, failFunc) {
			yoda_repoList = [];
			var topics = yoda.decodeUrlParam(null, "repotopic").split(",");
			console.log("Topics: " + topics);
			var getReposUrl = yoda.getGithubUrl() + "search/repositories?q=org:" + $("#owner").val() + "+archived:false";
			
			var negative_topic = [];
			for (var t = 0; t < topics.length; t++)
				if (topics[t].charAt(0) == "-")
					negative_topic.push(topics[t].substring(1))
				else
					getReposUrl += "+topic:" + topics[t];
			console.log("Url: " + getReposUrl);
			yoda.getLoop(getReposUrl, 1, [],
				// Ok func
				function(d) {
					// For some strange reason the response here is container within an array structure in the "items" part. Must concatenate.
					data = [];
					for (var i = 0; i < d.length; i++)
						data = data.concat(d[i].items);
					// 	This would be a good place to remove any archieved repos.
					var r = data.length;
					while (r--) {
						if (data[r].archived != null && data[r].archived == true)
							data.splice(r, 1);
					}

					// Handle any negative matches
					if (negative_topic.length > 0) {
						r = data.length;
						while (r--) {
							for (var t = 0; t < data[r].topics.length; t++) {
								if (negative_topic.indexOf(data[r].topics[t]) != -1) {
									data.splice(r, 1);
									break;
								}
							}				
						}
					}

					// Sort and store repos.
					data.sort(function(a,b) {
						if (a.name.toLowerCase() > b.name.toLowerCase()) {
							return 1;
						} else {
							return -1;
						}
					});
					
					yoda_repoList = data;

					for (var r = 0; r < yoda_repoList.length; r++) {
						var newOption = new Option(yoda_repoList[r].name, yoda_repoList[r].name, true, true);
						$(fieldId).append(newOption);
					}
				
					$(fieldId).trigger('change');
						
					if (okFunc != null)
						okFunc();
				}, 
				// fail func
				function() {
					if (failFunc != null)
							failFunc();
				});
		},
		
		// Update list of repositories AND update GUI field,. Select repo(s) from URL if supplied.
		// If required, fallback to the localStorage defaults.
		updateReposAndGUI: function(owner, fieldId, URLId, localStorageId, okFunc, failFunc) {
			$(fieldId).empty();

			// Delegate handling to special "Tag" variant if we have repotag URL param and first time.
			if (yoda_firstRepoUpdate == true && yoda.decodeUrlParam(null, "repotopic") != null) {
				yoda_firstRepoUpdate = false;
				yoda.updateReposAndGUITopic(owner, fieldId, okFunc, failFunc);
				return;
			}

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
								selectRepos = yoda.getDefaultLocalStorageValue(localStorageId).split(",");
							}
						} 
					}
				}
			
				var reposSelected = false;
				console.log("SelectRepos: " + selectRepos);
				
				for (var r = 0; r < yoda_repoList.length; r++) {
					var selectRepo = false;
					if (selectRepos.indexOf(yoda_repoList[r].name) != -1 || 
					    (selectRepos.length == 1 && selectRepos[0].includes("*") && yoda.select2MatchHelper(selectRepos[0], yoda_repoList[r].name))) { 
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
		
		// Support functions for update functions below. First to get labels which can be directly given to the API. These are issues
		// which are do NOT start with "-" (negative filter) or "^" (regular expression)
		getFullLabelFilters(labelFilter) {
			var filter = "";
			var filterArray = labelFilter.split(",");
			for (var f = 0; f < filterArray.length; f++) {
				if (filterArray[f].charAt(0) != '^' && filterArray[f].charAt(0) != '-') {
					if (filter != "")
						filter += ",";
					filter += filterArray[f];
				}
			}
			return filter;
		},
		
		// Filter issues with regexp (i.e. filtering done explicitly by specifying some fields using "^"
		// OR filter which are negative (starting with -, normal or regexp).
		// Issues without any labels matching the regexp will be removed from list.
		// The function will work on the yoda_issues variable.
		filterIssuesReqExp: function(labelFilter) {
			var filterArray = labelFilter.split(",");
			for (var f = 0; f < filterArray.length; f++) {
				if (filterArray[f].charAt(0) == '^' || filterArray[f].charAt(0) == '-') {
					if (filterArray[f].charAt(0) == "-") {
						var positiveMatch = false;
						var labelReg = new RegExp(filterArray[f].substr(1));
					} else {
						var positiveMatch = true;
						var labelReg = new RegExp(filterArray[f]);	
					}
					
					// We have a regexp filter. Let's run through the issues.
					console.log("Applying regexp filter (positive " + positiveMatch + "): " + filterArray[f]);
					
					// Note, special for loop. i is incremented below... 
					for (var i = 0; i < yoda_issues.length;) {
						var match = false;
						for (var l = 0; l < yoda_issues[i].labels.length; l++) {
							var labelName = yoda_issues[i].labels[l].name;
							if (labelName.match(labelReg) != null) {
								match = true;
								break;
							}
						}

						if ((positiveMatch && !match) || (!positiveMatch && match)) {
							yoda_issues.splice(i, 1);
						} else {
							i++;
						}
					}
				}
			}
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
			var fullFilter = yoda.getFullLabelFilters(labelFilter);
			if (fullFilter != "") {
				getIssuesUrl += "&labels=" + fullFilter; 
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
					yoda.filterIssuesReqExp(labelFilter);
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
			
			var fullFilter = yoda.getFullLabelFilters(labelFilter);
			if (fullFilter != "") {
				getIssuesUrl += "&labels=" + fullFilter; 
			}

			console.log("Get Issues URL:" + getIssuesUrl);
			yoda.getLoop(getIssuesUrl, 1, [], function(issues) {
				yoda.filterPullRequests(issues);
				yoda.filterIssuesReqExp(labelFilter);
				yoda_issues = issues;

				if (okFunc != null)
					okFunc(yoda_issues)
			}, failFunc);
		},

		updateIssueCommentsLoop: function(issues, okFunc, failFunc, index) {
			if (index == undefined)
				index = 0;
			if (index == issues.length) {
				okFunc(issues);
			} else {
				// Let's look at the issue. Maybe it doesn't have any comments and we can safe doing a dummy call.
				if (issues[index].comments == 0) {
					issues[index].comments_array = [];
					yoda.updateIssueCommentsLoop(issues, okFunc, failFunc, index + 1);
				} else {
					yoda.getLoop(issues[index].comments_url, 1, [], 
						function(comments) {
							issues[index].comments_array = comments; 
							yoda.updateIssueCommentsLoop(issues, okFunc, failFunc, index + 1); 
						}, 
						function(errorText) { 
							failFunc(errorText); 
					});
				}
			}
		},
		
		updateGitHubIssuesReposWithComments: function (owner, repoList, labelFilter, stateFilter, addFilterFunc, okFunc, failFunc) {
			yoda.updateGitHubIssuesRepos(owner, repoList, labelFilter, stateFilter, addFilterFunc, function(issues) {
				// Now retrive comments for all issues. Can be time consuming!
				yoda.updateIssueCommentsLoop(issues, okFunc, failFunc);
			}, failFunc);
        },

		updateGitHubIssuesOrgWithComments: function (owner, labelFilter, stateFilter, okFunc, failFunc) {
			yoda.updateGitHubIssuesOrg(owner, labelFilter, stateFilter, function(issues) {
				// Now retrive comments for all issues. Can be time consuming!
				yoda.updateIssueCommentsLoop(issues, okFunc, failFunc);
			}, failFunc); 
		},

		// ----------------------------------
		
		// Deep copy an object by making an intermediate JSON object.
		deepCopy: function(o) {
		    return JSON.parse(JSON.stringify( o ));
		},
		
		openYodaTool: function(url, copyOwnerRepo) {
			var params = "";
			// If we have owner and/or repolist set, let's put these as parameters to new tool so we don't have to put them again.
			if (copyOwnerRepo && $("#owner").val() != undefined &&	 $("#owner").val() != "") {
				params += "?owner=" + $("#owner").val();
				if ($("#repolist").val() != undefined && $("#repolist").val() != "")
					params += "&repolist=" + $("#repolist").val();
			}
			
			window.open(url + params);
		},
		
		topPanelHidden: false,
		hideTopPanel: function() {
			$("#yodamenu").closest(".frame").children().hide();
			$("#yodamenu").parent().show(); // Leave the Hamburger there
			yoda.topPanelHidden = true;
		},
		
		showTopPanel: function() {
			$("#yodamenu").closest(".frame").children().show();
			// A bit of a hack, but don't know of better way to address user and token fields which should remain hidden.
			try {
				$("#user").closest("div").hide();
				$("#token").closest("div").hide();
			} catch(e) {
				// Ignore
			} 
			yoda.topPanelHidden = false;
			
			// Show CSS frame if there?
			try {	
				$("#cssowner").closest(".frame").show();
			} catch(e) {
				// Ignore
			}
		},
		
		// Menu stuff
		enableMenu: function(helpTarget) {
			// Build the menu
			$("#yodamenu").append('<a href="index.html">Landing Page</a>');
			$("#yodamenu").append("<a href='javascript:yoda.openYodaTool(\"yoda-time-stats.html\", true)'>Time Statistics Report</a>");
			$("#yodamenu").append("<a href='javascript:yoda.openYodaTool(\"yoda-cfd.html\", true)'>CFD Report</a>");
			$("#yodamenu").append("<a href='javascript:yoda.openYodaTool(\"yoda-burndown.html\", true)'>Burndown Report</a>");
			$("#yodamenu").append("<a href='javascript:yoda.openYodaTool(\"yoda-velocity.html\", true)'>Velocity Report</a>");
			$("#yodamenu").append("<a href='javascript:yoda.openYodaTool(\"yoda-kanban.html\", true)'>Kanban Board</a>");
			$("#yodamenu").append("<a href='javascript:yoda.openYodaTool(\"yoda-release-notes.html\", true)'>Release Notes</a>");
			$("#yodamenu").append("<a href='javascript:yoda.openYodaTool(\"yoda-milestone-manager.html\", true)'>Milestone Manager</a>");
			$("#yodamenu").append("<a href='javascript:yoda.openYodaTool(\"yoda-label-manager.html\", false)'>Label Manager</a>");
			$("#yodamenu").append("<a href='javascript:yoda.openYodaTool(\"yoda-exporter.html\", true)'>Issue Exporter</a>");
			$("#yodamenu").append("<a href='javascript:yoda.openYodaTool(\"yoda-copy-tasks.html\", false)'>Task Copier</a>");
			$("#yodamenu").append("<a href='javascript:yoda.openYodaTool(\"yoda-export-web.html\", true)'>Export to Web Pages</a>");
			$("#yodamenu").append("<a href='javascript:yoda.openYodaTool(\"yoda-time-stats-csv.html\", true)'>CSV based Statistics</a>");
			$("#yodamenu").append("<a href='javascript:yoda.openYodaTool(\"yoda-repositories.html\", true)'>Repository Overview</a>");
//			$("#yodamenu").append('<a href="MANUAL.html">User Manual</a>');
			if (helpTarget != undefined)
				$("#yodamenu").append('<a href="https://hewlettpackard.github.io/yoda/MANUAL.html' + helpTarget + '" target="_blank">User Manual</a>');
			else
				$("#yodamenu").append('<a href="https://hewlettpackard.github.io/yoda/MANUAL.html" target="_blank">User Manual</a>');
			$("#yodamenu").append("<a href='javascript:yoda.openYodaTool(\"yoda-admin.html\", false)'>Admin Settings</a>");
			$("#yodamenu").append("<a href='javascript:yoda.hideTopPanel()'>Hide Panel</a>");
			$("#yodamenu").append("<a href='javascript:yoda.showTopPanel()'>Show Panel</a>");
			
			if (typeof Chart !== 'undefined') {
				$("#yodamenu").append("<a href='javascript:yoda.setDarkColorScheme();'>Dark Theme</a>");
				$("#yodamenu").append("<a href='javascript:yoda.setDefaultColorScheme();'>Default Theme</a>");
			}
			
			if (yoda.decodeUrlParam(null, "hidepanel") == "true") {
				yoda.hideTopPanel();
			}
			
			if (yoda.decodeUrlParam(null, "dark") == "true") {
				yoda.setDarkColorScheme("dark");
			}

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
			
			// Adjust frame, menu, etc. background color?
			var background = yoda.getDefaultLocalStorageValue("yoda.global.framebackground");
			if (background != "") {
					let root = document.documentElement;
  					root.style.setProperty("--main-bg-color", background);
			}
			
			// A slight hack to put here, but this is where everything goes.
			try {
				Chart.defaults.global.defaultFontSize = 14;
			}
			catch(e) {
				// ignore
			} 
		},
		
		/* When the user clicks on the button, 
		toggle between hiding and showing the dropdown content */
		menuClick: function() {
			document.getElementById("yodamenu").classList.toggle("show");
		},
		
		// Helper function for Jira/ALM migrated issues
		//Finds an entry in an existing body. Returns null is not present
		extractFieldFromBodyTable: function(body, key) {
			var fieldStart = body.indexOf("**" + key + "**");
			if (fieldStart == -1)
				return null;
			
			var valueStart = body.indexOf("|", fieldStart);
			var valueEnd = body.indexOf("\n", fieldStart);
			return body.substring(valueStart + 1, valueEnd);
		},
		
		// Extract fields from body which are positioned after a keyword line, e.g. "> RN", "> RNT", "> RC"
		// lineMode can be "single", "paragraph", "rest"
		extractKeywordField: function(body, key, lineMode, newLine) {
			var reg = new RegExp(">[ ]?" + key + "[^A-Za-z]");
			var res = body.match(reg);
			if (res == null)
				return "";
				
			var start = res.index;
			var lineStart = body.indexOf('\n', start) + 1;
			
			if (lineMode == 'rest') {
				// Simply return the rest
				return body.substr(lineStart).replaceAll("\n", newLine);
			}
				
			if (lineMode == 'single') {
				var lineEnd = body.indexOf('\n', lineStart);
				if (lineEnd == -1)
					var line = body.substr(lineStart);
				else
					var line = body.substr(lineStart, lineEnd - lineStart - 1);
				return line;
			}
					
			// Now multiline, which will be the default.	
			var text = "";
			do {
				var lineEnd = body.indexOf('\n', lineStart);
				if (lineEnd == -1)
					var line = body.substr(lineStart);
				else
					var line = body.substr(lineStart, lineEnd - lineStart);
				if (line.length == 0 || (line.length == 1 && line.charCodeAt(0) == 13))
					break;
				if (text != "") 
					text += newLine;
				text += line;
				if (lineEnd == -1)
					break;
				lineStart = lineEnd + 1;
			} while (true);
			return text;
		},
		
		// Remove offending part of date ("+0000" at end).
		cleanDate: function(dateString) {
			if (dateString == null)
				return dateString;
			var p = dateString.indexOf('+0000');
			if (p != -1)
				return dateString.substr(0, p);
			else
				return dateString;
		},

		// Helper function. Create date (to taken into account as well migrated issues from other systems.
		// For now, hacking and hard-coding "Jira Migrated"..
		createDate: function(issue) {
			if (yoda.isLabelInIssue(issue, "Jira Migrated")) {
				// Created	2019-09-05T06:52:20.096+0000
				return yoda.cleanDate(yoda.extractFieldFromBodyTable(issue.body, "Created"));
			} else {
				return yoda.cleanDate(issue.created_at);
			}
		},
		
		// Helper function for closed date
		closedDate: function(issue) {
			return yoda.cleanDate(issue.closed_at);
		},

		//Helper function for delete date (to taken into account as well migrated issues from other systems.
		//For now, hacking and hard-coding "Jira Migrated"..
		closeDate: function(issue) {
			if (issue.state == "open")
				return null;
			
			if (yoda.isLabelInIssue(issue, "Jira Migrated")) {
				return yoda.cleanDate(yoda.extractFieldFromBodyTable(issue.body, "Updated"));  // This may be a simplification
			} else {	
				return issue.closed_at;
			}
		},
		
		// Generic chart data export. A bit rudamentary, but will get you the data in the graph.
		chartCSVExport: function(csvDelimiter) {
			console.log("Exporting graph data to csv. Delimiter: " + csvDelimiter);
			if (window.myMixedChart == undefined || window.myMixedChart == null) {
				yoda.showSnackbarError("No current chart", 3000);
				return;
			}
			var chartData = window.myMixedChart.data;
			
			var data = []; 
			var fields = [];
			fields.push("Label");
			for (var i = 0; i < chartData.datasets.length; i++) {
				fields.push(chartData.datasets[i].label); 
			} 

			for (var j = 0; j < chartData.labels.length; j++) {
				var row = [];
				
				// First label
				row.push(chartData.labels[j]);
				
				// Then data sets
				for (var i = 0; i < chartData.datasets.length; i++) {
					row.push(chartData.datasets[i].data[j]); 
				} 
				data.push(row);
			} 

			config = {
					quotes: false,
					quoteChar: '"',
					delimiter: csvDelimiter,
					header: true,
					newline: "\r\n"
			};
			
			// Convert to CSV, the download
			result = Papa.unparse({data: data, fields: fields}, config);
			var fileName = "yoda-data.csv"; 
			yoda.downloadFile(result, fileName);
		}
	}
})();
