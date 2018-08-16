// This file contains Yoda UI utility functions. This encompasses all functions related to driving Yoda into the browser context.

// Either by prototype extentions to existing types, or as part of a new 'yodaUI' module.



// Questions: Where to keep repolist and issues? Both should be handled at UI + script and not Base ?  

// -----------------------------------------------------
// Yoda module
//-----------------------------------------------------
var yodaUI = (function() {
	// ------------------------------
	// Private/non-exposed functions/variables.
	
	// Count snackbar to ensure proper updates.
	var snackbarCount = 0;

	// First invocation for repositories
	var yoda_firstRepoUpdate = true;
	
	// GitHub container lists. Retrieve only via access functions
	var yoda_repoList = [];
	var yoda_issues = [];
	
	// Retrieve URL parameters
	var GetURLParameter = function (sParam) {
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

	// Menu stuff
	var enableMenu = function() {
		// Build the menu
		$("#yodamenu").append('<a href="index.html">Landing Page</a>');
		$("#yodamenu").append('<a href="yoda-time-stats.html">Time Statistics Report</a>');
		$("#yodamenu").append('<a href="yoda-cfd.html">CFD Report</a>');
		$("#yodamenu").append('<a href="yoda2-sprint-cockpit.html">Sprint Cockpit</a>');
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
	};

	//Either "noissues", "inbody", "inlabels". Default is "inbody", ie. estimate is given by an "> estimate (number)" line.
	var estimateInIssues = "inbody";

    // -----------------------------	
	// Exposed functions/variables.
	return {
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
			yodaUI.showSnackbar(message, '#01a982', timeout);
		},

		// Shows an error message for 3 seconds. Red background.
		showSnackbarError: function(message, timeout) {
			if (timeout == undefined) {
				timeout = 3000;
			}
			yodaUI.showSnackbar(message, '#cc0e24', timeout);
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
				$(id).val(yodaUI.handleDateDelta(value));
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
			return yodaUI.decodeParamRadio(id, value);
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
		
		// Set radio button from URL
		updateEstimateRadio: function () {
			var temp = $("#estimateradio input[type='radio']:checked");
			if (temp.length > 0) {
				estimateInIssues = temp.val();
			}
			console.log("EstimateInIssues now: " + estimateInIssues);
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
			value = yodaUI.getDefaultLocalStorageValue(localStorageId);
			if (value != null) {
				// Set the field both as value and default.
				$(inputField).data("defaultValue", value);
				$(inputField).val(value);
			}
		},
		
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
				if ($("#owner").val() == yodaBase.getAuthUser()) 				
					var getReposUrl = yodaBase.getGitHubUrl() + "user/repos?affiliation=owner"; 
				else
					var getReposUrl = yodaBase.getGitHubUrl() + "users/" + $("#owner").val() + "/repos";
			}
			else { 
				var getReposUrl = yodaBase.getGitHubUrl() + "orgs/" + $("#owner").val() + "/repos";
			}
			
			yodaBase.getLoop(getReposUrl, 1, [],
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
						yodaBase.updateRepos(owner, okFunc, failFunc, true);
					} else { 
						if (failFunc != null)
							failFunc();
					}
				});
		},
		
		// Update list of repositories AND update GUI field,. Select repo(s) from URL if supplied.
		// If required, fallback to the localStorage defaults.
		updateReposAndGUI: function(owner, fieldId, URLId, localStorageId, okFunc, failFunc) {
			console.log("updateReposAndGUI: " + owner + ", fieldId: " + fieldId);
			
			$(fieldId).empty();

			yodaUI.updateRepos(owner, function() {
				var selectRepos = [];
				if (yoda_firstRepoUpdate == true) {
					console.log("  updateReposAndGUI, first update");
					yoda_firstRepoUpdate = false;
				
					var urlRepoList = yodaUI.decodeUrlParam(null, URLId);
					if (urlRepoList != null) 
						selectRepos = urlRepoList.split(",");
					else {
						urlRepo = yodaUI.decodeUrlParam(null, "repo");
						if (urlRepo != null) {
							selectRepos = urlRepo;
						} else {
							// No values into either URLId or (repo), let's check the localStorage
							if (yodaUI.getDefaultLocalStorageValue(localStorageId) != null) {
								selectRepos = yodaUI.getDefaultLocalStorageValue(localStorageId);
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
					
					var newOption = new Option(owner + ' / ' + yoda_repoList[r].name, owner + '/' + yoda_repoList[r].name, selectRepo, selectRepo);
					$(fieldId).append(newOption);

				}
			
				if (reposSelected)
					$(fieldId).trigger('change');
				
				if (okFunc != null)
					okFunc();
			}, failFunc);
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
			yodaUI.downloadFileWithType("application/csv;charset=utf-8;", data, fileName);
		},

		// Init function. Yoda tools must call this.
		init: function() {
			console.log("Yoda2 ... ");
			console.log("URL: " + window.location.href);
			console.log("URL hostname: " + window.location.hostname);

			yodaBase.setBusyReadyFunc(function() {$("*").css("cursor", "wait");}, function() {$("*").css("cursor", "default");});
			
			// If page is served from github.hpe.com, then change URL defaults to HPE GitHub Enterprise Instance
			if (window.location.hostname.indexOf("github.hpe.com") != -1) {
				var gitHubApiBaseUrl = "https://github.hpe.com/api/v3/";
				var gitHubBaseUrl = "https://github.hpe.com/";
			}

			var overwrite = yodaUI.getDefaultLocalStorageValue("gitHubApiBaseUrl");
			if (overwrite != null)
				yodaBase.setGitHubUrl(overwrite);

			var overwrite = yodaUI.getDefaultLocalStorageValue("gitHubBaseUrl");
			if (overwrite != null)
				yodaBase.setGitHubUrlHtml(overwrite);
			
			if (yodaUI.decodeUrlParam(null, "hideheader") == "true") {
				$(".frame").hide();
			} else {
				enableMenu();
			}
		},
		
		/* When the user clicks on the button, 
		toggle between hiding and showing the dropdown content */
		menuClick: function() {
			document.getElementById("yodamenu").classList.toggle("show");
		},
	}

})();
