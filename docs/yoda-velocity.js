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


function estimateClick(radio) {
	yoda.setEstimateInIssues(radio.value);
}

// ---------------------------------------
// Data has been retrieved. Time to analyse data and draw the chart.
function addMilestone(milestoneTitle, milestoneStartdate, milestoneDuedate, milestoneCapacity, issues) {
	console.log("Adding milestone. " + milestoneTitle + ", No of issues: " + issues.length + ", startDate: " + milestoneStartdate + 
			", dueDate: " + milestoneDuedate + ", capacity: " + milestoneCapacity);
	yoda.filterPullRequests(issues);
	console.log("  No issues (after filtering out pull requests): " + issues.length);

	var estimate = 0;
	
	for (i=0; i<issues.length; i++) {
		console.log(" => adding: " + issues[i].number + ", estimate: " + (yoda.issueEstimate(issues[i])));
		estimate = estimate + (yoda.issueEstimate(issues[i]));
	}
	console.log("Total estimate: " + estimate);
	
	// If both start and duedate are defined, we can work out esimate/per day
	if (milestoneStartdate != "" && milestoneDuedate != "") {
		var days = yoda.dateDiff(milestoneStartdate, milestoneDuedate);
		console.log("Days = " + days);
		var average = (estimate / days).toFixed(1);
		window.myMixedChart.data.datasets[1].data.push(average);
	} else {
		window.myMixedChart.data.datasets[1].data.push(0); // We cannot work out estimate/day, put 0
	}

	// If we have a capacity number in the milestone, we may work out estimate/capacity
	if (milestoneCapacity != null) {
		var capacityFactor = (estimate/milestoneCapacity).toFixed(1);
		console.log("Capacity factor = " + capacityFactor);
		window.myMixedChart.data.datasets[2].data.push(capacityFactor);
	} else {
		window.myMixedChart.data.datasets[2].data.push(0); // We cannot work out estimate/day, put 0
	}
	
	// Update chart
	window.myMixedChart.data.labels.push(milestoneTitle);
	window.myMixedChart.data.datasets[0].data.push(estimate);
	window.myMixedChart.update();
}

// -------------------------------

// TODO: Improve
function errorFunc(errorText) {
	alert("ERROR: " + errorText);
}

// ------------------

function showMilestones(milestones) {
	$("#milestone").empty();

	for (var m = 0; m < milestones.length; m++) {
		$("#milestone").append($("<option></option>").attr("value", milestones[m].number).text(milestones[m].title));
	}
}

function updateMilestones() {
	var getMilestonesUrl = yoda.getGithubUrl() + "repos/" + $("#owner").val() + "/" + $("#repo").val() + "/milestones?state=all";
	yoda.getLoop(getMilestonesUrl, 1, [], showMilestones, null);
}

// ---------------

function enrichMilestoneData(milestone) {
	console.log("Updating milestone data for milestone " + milestone[0].number + ": " + milestone[0].title);
	var milestoneDueOn = yoda.formatDate(new Date(milestone[0].due_on));
	console.log("  Milestone due: " + milestoneDueOn);
	var milestoneStartdate = yoda.getMilestoneStartdate(milestone[0].description);
	if (milestoneStartdate == null) {
		console.log("  Unable to read milestone startdate.");
	}  else {
		console.log("  Milestone start: " + milestoneStartdate);
	}
	var milestoneTitle = milestone[0].title;
	
	var milestoneCapacity = yoda.getMilestoneCapacity(milestone[0].description);
	

	var getMilestoneIssuesUrl = yoda.getGithubUrl() + "repos/" + $("#owner").val() + "/" + $("#repo").val() + "/issues?state=all&milestone=" + milestone[0].number;
//	if ($("#labelfilter").val() != "") {
//		getMilestoneIssuesUrl += "&" + "labels=" + $("#labelfilter").val(); 
//	}
	yoda.getLoop(getMilestoneIssuesUrl, 1, [], 
			function(res) {
		addMilestone(milestoneTitle, milestoneStartdate, milestoneDueOn, milestoneCapacity, res); 
	}, errorFunc);
}

function getMilestoneData(milestones, index) {
	if (index < milestones.length) {
		var getMilestoneDataUrl = yoda.getGithubUrl() + "repos/" + $("#owner").val() + "/" + $("#repo").val() + "/milestones/" + milestones[index];
		console.log("Milestone URL: " + getMilestoneDataUrl);
		yoda.getLoop(getMilestoneDataUrl, 1, [], 
				function(res) {
			enrichMilestoneData(res);
			getMilestoneData(milestones, index+1);
		}, 
		errorFunc);
	}
}

//------------------


function enrichProjectData(project) {
	console.log("Updating project data for project " + project[0].number + ": " + project[0].name);
	
	console.log("Updating project data.");
	var milestoneStartdate = yoda.getMilestoneStartdate(project[0].body);
	var dueDate = yoda.getMilestoneBurndownDuedate(project[0].body);
	var capacity = yoda.getMilestoneCapacity(project[0].body);

	console.log("  Startdate: " + milestoneStartdate + ", dueDate: " + dueDate + ", capacity: " + capacity);

	console.log(project[0]);
	// Let's work from html_url, which will be something like: 
	// "https://github.hpe.com/jens-markussen/hpsa/projects/1"
	var urlSplit = project[0].html_url.split("/");
	console.log(urlSplit.length);
	if (urlSplit[3] == "orgs") {
		// org level project
		console.log("Org level project");
		var projectLink = urlSplit[4] + "/" + urlSplit[6];
	} else {
		// repo level project
		console.log("Repo level project");
		var projectLink = urlSplit[3] + "/" + urlSplit[4] + "/" + urlSplit[6];
	}
	
	console.log("Project link: " + projectLink);
	var getIssuesUrl = yoda.getGithubUrl() + "search/issues?q=type:issue+project:" + projectLink;
	yoda.getLoop(getIssuesUrl, 1, [], 
			function(res) {
		addMilestone(project[0].name, milestoneStartdate, dueDate, capacity, res[0].items); 
	}, errorFunc);
}


function getProjectData(projects, index) {
	if (index < projects.length) {
		var getProjectDataUrl = projects[index].split(',')[0]; // URL is into first part stored directly into the selection.
		console.log("getProjectDataUrl: " + getProjectDataUrl);
		yoda.getLoop(getProjectDataUrl, -1, [], enrichProjectData, errorFunc);

		getProjectData(projects, index + 1);
	}
}


//------------------

function addProjects(projects, prefix) {
	console.log("Project: " + prefix);
	console.log(projects);
	
	for (var p = 0; p < projects.length; p++) {
		// For value we will add a comma-separated list of:
		// 1: The API URL for the project
		// 2: The owner/org for the project 
		// 3: The repo for the project (can be empty)
		// 2 and 3 are in the prefix.
		// 4: The project number.
		var projectInfo = [projects[p].url, prefix, projects[p].number].join();
		console.log("ProjectInfo: " + projectInfo);
		
		var prefixSplit = prefix.split(',');
		var prefixPres = prefixSplit[0];
		if (prefixSplit[1] != "") {
			prefixPres += "/" + prefixSplit[1];
		}
		
		$("#project").append($("<option></option>").attr("value", projectInfo).text(prefixPres + ": " + projects[p].name));
	}
}

function updateProjects() {
	$("#project").empty();

	// Org level projects
	var getProjectsUrl = yoda.getGithubUrl() + "orgs/" + $("#owner").val() + "/projects?state=all";
	yoda.getLoop(getProjectsUrl, -1, [], function(data) {addProjects(data, $("#owner").val() + ",")}, null);
	
	// Repo level projects (if repo not blank)
	if ($("#repo") != "") {
		var getProjectsUrl = yoda.getGithubUrl() + "repos/" + $("#owner").val() + "/" + $("#repo").val() + "/projects?state=all";
		yoda.getLoop(getProjectsUrl, -1, [], function(data) {addProjects(data, $("#owner").val() + "," + $("#repo").val())}, null);
	}
}

// ----------¨


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


// -------------------------

function startChart() {
	var milestones = $("#milestone").val();
	console.log("Milestones: (" + milestones.length + "): " + milestones);
	var projects = $("#project").val();
	console.log("Projects: (" + projects.length + "): " + projects);
	
	// start Chart
	// We will do here the start of the chart definition. Then the addMilestone function will add data for specific milestones dynamically
	// -----------------------------------------------------------
	// Start drawing raw the chart
	//
	var ctx = document.getElementById("canvas").getContext("2d");
	
	if (window.myMixedChart != null)
		window.myMixedChart.destroy();
	
	// Axis legend depend on whether working from estimates in issues, or simply number of issues.
	var axis = "";
	if (yoda.getEstimateInIssues() == "noissues") {
		axis = "# of issues";
	} else {
		axis = "Story points";
	}

	window.myMixedChart = new Chart(ctx, {
		type : 'bar',	
		data : {
			labels : [],
			datasets : [ {
				type : 'bar',
				label : axis,
				borderWidth : 2,
				fill : false,
				data : [],
				yAxisID: "y-axis-left",
				backgroundColor : 'rgba(0,153,51,0.6)' 
			},
			{
				type : 'bar',
				label : axis + " per day",
				borderWidth : 2,
				fill : false,
				data : [],
				yAxisID: "y-axis-right",
				backgroundColor : 'rgb(255, 102, 0)' 
			},
			{
				type : 'bar',
				label : 'Storypoints / capacity',
				borderWidth : 2,
				fill : false,
				data : [],
				yAxisID: "y-axis-right",
				backgroundColor : 'rgb(255, 255, 26)' 
			}]
		},
		options : {
			responsive : true,
			title : {
				display : true,
				text : 'Velocity chart for ' + $("#owner").val() + "/" + $("#repo").val()
			},
			tooltips : {
				mode : 'index',
				intersect : true
			},
			scales: {
				yAxes: [{
					scaleLabel: {
						display: true,
						labelString: axis
					},
					position: "left",
					id: "y-axis-left",
					ticks: {
						beginAtZero: true
					}
				},{    
					scaleLabel: {
						display: true,
						labelString: axis + " per day & story points vs. capacity",
					},
					position: "right",
					id: "y-axis-right",
					ticks: {
						beginAtZero: true
					}
				}]
			},
			tooltips: {
				enabled: false
			},
		},
	});


	// Issue calls to get milestone data. Callback will collect the data, then issue call for the isues
	// which in turn will call addMilestone to update the graph with data for issues in that milestone.'
	// Consider raise...
	// First, sort milestones.. Hmm. this is numerically, not ideal..
	
	// Ok, needs to see if working from projects or milestones.
	if (milestones.length > 0) {
		milestones.sort();
		getMilestoneData(milestones, 0);
	} else {
		if (projects.length > 0) {
			// TODO:
			getProjectData(projects, 0);
		}
	}
}

// --------------
function githubAuth() {
	console.log("Updating/setting github authentication for: " + $("#user"));
	yoda.gitAuth($("#user").val(), $("#token").val());
}

// --------------

//Label drawing
Chart.plugins.register({
 afterDatasetsDraw: function(chartInstance, easing) {
     var ctx = chartInstance.chart.ctx;

     chartInstance.data.datasets.forEach(function (dataset, i) {
         var meta = chartInstance.getDatasetMeta(i);
         if (!meta.hidden && meta.type == 'bar') {
             meta.data.forEach(function(element, index) {
                 // Draw the text in black, with the specified font
                 ctx.fillStyle = 'rgb(0, 0, 0)';
                 ctx.font = Chart.helpers.fontString(Chart.defaults.global.defaultFontSize, Chart.defaults.global.defaultFontStyle, Chart.defaults.global.defaultFontFamily);

                 // Just naively convert to string for now
                 var dataString = dataset.data[index].toString();

                 // Make sure alignment settings are correct
                 ctx.textAlign = 'center';
                 ctx.textBaseline = 'middle';

                 var padding = 5;
                 var position = element.tooltipPosition();
                 ctx.fillText(dataString, position.x, position.y - (Chart.defaults.global.defaultFontSize / 2) - padding);
             });
         }
     });
 }
});

var backgroundColor = 'white';
Chart.plugins.register({
 beforeDraw: function(c) {
     var ctx = c.chart.ctx;
     ctx.fillStyle = backgroundColor;
     ctx.fillRect(0, 0, c.chart.width, c.chart.height);
 }
});
