function getUrlParams() {
	var params = "owner=" + $("#owner").val() + "&repo=" + $("#repo").val() + "&noissues=" + $("#noissues").val();
	return params;
}
	
function logMessage(message) {
	$('#console').val($('#console').val() + message + "\n");
	$('#console').scrollTop($('#console')[0].scrollHeight);
}


// -----------

function showRepos(repos) {
	repos.sort(function(a,b) {
		if (a.name.toLowerCase() < b.name.toLowerCase()) 
			return -1;
		else
			return 1;
	});

	for (var r = 0; r < repos.length; r++) {
		$("#repolist").append($("<option></option>").attr("value", repos[r].name));
	}
}

function updateRepos() {
	console.log("Update repos");
	$("#repo").val("");
	$("#repolist").empty();
	
	var getReposUrl = yoda.getGithubUrl() + "orgs/" + $("#owner").val() + "/repos";
	yoda.getLoop(getReposUrl, 1, [], showRepos, null);
//	getReposUrl = yoda.getGithubUrl() + "users/" + $("#owner").val() + "/repos";
//	yoda.getLoop(getReposUrl, -1, [], showRepos, null);
}

// -----------------

function pickRandom(myArray) {
	var rand = myArray[Math.floor(Math.random() * myArray.length)];
	return rand;
}

// ----

var randomBody = [];
function makeBodyText(noTexts) {
	if (noTexts <= 0) {
		return;
	}
	console.log("No texts: " + noTexts);
	
	var randomUrl = "http://www.randomtext.me/api/lorem/p-4/15-20";
	$.ajax({
		dataType: 'json',
		url: randomUrl,
		type: 'GET',
		error: function() { console.log("Failed to get random text"); },
		success: function(data) {
			randomBody.push(data.text_out);
			console.log(data.text_out);
			setTimeout(function() {makeBodyText(noTexts - 1);}, 500);
		}
	});
}


function createEnhancementIssue() {
	var enhanceWords = ["Enhance", "Allow", "Prevent", "Update", "Discontinue", "Upgrade", "Expand"];
	var enhanceTargets = ["topic list", "system view", "multiple editors", "boot process", "firmware", "procedure"];
	var enhanceFinal = ["in editor.", "during startup.", "in Safari browser.", "during Tuesdays.", "on test systems."];
	var severities = ["S1 - Urgent", "S2 - High", "S3 - Medium", "S4 - Low"];
	
	var issueTitle = pickRandom(enhanceWords) + " " + pickRandom(enhanceTargets) + " " + pickRandom(enhanceFinal);
	var issueBody = pickRandom(randomBody) + "\n\n> estimate " + (Math.floor(Math.random() * 8) + 1) + "\n";
	var issueLabels = [];
	issueLabels.push({name: pickRandom(severities)});
	issueLabels.push({name: "T2 - Enhancement"});

	var urlData = {
			"title": issueTitle,
			"body": issueBody,
			"labels" : issueLabels
	};

	logMessage("Creating enhancement issue w/ title: " + issueTitle);
	
	return urlData;
}


function createDefectIssue() {
	var defectWords = ["Error", "Problem", "Issue", "Critical situation", "Unknown error"];
	var defectTargets = ["updating topic list", "entering new data", "while creating new objects", "rebooting PC", "drawing with mouse", "editing text"];
	var defectFinal = ["in editor.", "during startup.", "in Chrome browser.", "during weekends.", "on Mondays."];
	var severities = ["S1 - Urgent", "S2 - High", "S3 - Medium", "S4 - Low"];
	
	var issueTitle = pickRandom(defectWords) + " " + pickRandom(defectTargets) + " " + pickRandom(defectFinal);
	var issueBody = pickRandom(randomBody) + "\n\n> estimate " + (Math.floor(Math.random() * 6) + 1) + "\n";
	var issueLabels = [];
	issueLabels.push({name: pickRandom(severities)});
	issueLabels.push({name: "T1 - Defect"});

	var urlData = {
			"title": issueTitle,
			"body": issueBody,
			"labels" : issueLabels
	};

	logMessage("Creating defect issue w/ title: " + issueTitle);
	
	return urlData;
}


// --------------

function createIssues(noIssuesRemaining) {

	if (noIssuesRemaining == 0) {
		yoda.updateUrl(getUrlParams());
		logMessage("Creation done.");
		return;
	}
	
	// Let's create a new issue with 
	
	var createIssueUrl = yoda.getGithubUrl() + "repos/" + $("#owner").val() + "/" + $("#repo").val() + "/issues";
	console.log("createUrl: " + createIssueUrl);
	
	if (Math.random() < 0.7) {
		var urlData = createDefectIssue();
	} else {
		var urlData = createEnhancementIssue();
	}
		
	console.log(urlData);
	
	$.ajax({
		url: createIssueUrl,
		type: 'POST',
		data: JSON.stringify(urlData),
		success: function() { logMessage("  Succesfully created issue"); },
		error: function() { logMessage("  Failed to create issue"); },
		complete: function(jqXHR, textStatus) { createIssues(noIssuesRemaining - 1);}
	});
}


// --------------
// ------

function githubAuth() {
	console.log("Updating/setting github authentication for: " + $("#user"));
	yoda.gitAuth($("#user").val(), $("#token").val());
}

// --------------
