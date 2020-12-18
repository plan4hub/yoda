


// -----------------------------------------------------
// Yoda module
var jira = (function() {
	// ------------------------------
	// Yoda Private variables
	
	var jiraApiBaseUrl = "https://pro.jira.g4ihos.itcs.hpecorp.net:8443/rest/api/2/";
	var jiraBaseUrl = "https://pro.jira.g4ihos.itcs.hpecorp.net:8443/";

    // -----------------------------	
	// Interface functions
	return {
		auth: function (userId, accessToken) {
			// NOP for now. Assume session cookie will handle. Must try
		},
		
		
		getJiraUrl: function() {
			return jiraApiBaseUrl;
		},
		
		// page = 0 is first page. Must be set in call. page = -1 means no paging
		getLoop: function(url, page, collector, finalFunc, errorFunc) {
			// First call?
			if (page <= 0) {
				$("*").css("cursor", "busy");
			} 
			
			// Update paging
			if (page != -1) {
				var oldIndex = url.indexOf("maxResults=1000&startAt=");
				if (oldIndex != -1) { 
					url = url.substring(0, oldIndex) + "maxResults=1000&startAt=" + (page * 1000);
				} else {
					// Do we have a ?
					if (url.indexOf("?") == -1) {
						url = url + "maxResults=1000&startAt=0";
					} else {
						url = url + "&maxResults=1000&startAt=0";
					}
				}
			}
			
			console.log("Calling with url: " + url);
			
			$.ajax({
			    url: url,
			    type: 'GET',
			    dataType: 'jsonp',
			    crossDomain: true,
			    headers: {
			    	'Accept': 'application/jsonp'
			    },
			    success: function(response, status, xhr) {
					if ((response.items != undefined && response.items.length == 1000 && page != -1) || (response.length == 1000 && page != -1)) {
						jira.getLoop(url, page + 1, collector.concat(response), finalFunc, errorFunc, callNo);
					} else {
						$("*").css("cursor", "default");
						finalFunc(collector.concat(response));
					}
			    },
			    error: function(xhr, status, error) { 
					$("*").css("cursor", "default");
					if (errorFunc != null) {
						errorMessage = error + " " + xhr.status;
						console.log(errorMessage);
						errorFunc(errorMessage);
					}
		    	},
//			    beforeSend: setHeader
			});
		},

		
	};
	
	
})();


