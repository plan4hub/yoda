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

var repoList = [];  // selected repos
var repoMilestones = []; // Double-array of repos,milestone (full structure) for selected repos

var commonMilestones = []; // Options for milestone selection (milestones in all repos, just title).
var noStoryBars = 0;
var splitLabels = [];

function addIfNotDefault(params, field) {
	if ($("#" + field).val() != $("#" + field).prop('defaultValue')) {
		return params + "&" + field + "=" + $("#" + field).val(); 
	} else {
		return params;
	}
}

function getUrlParams() {
	var params = "owner=" + $("#owner").val() + "&repolist=" + $("#repolist").val();
	params += "&estimate=" + yoda.getEstimateInIssues();
	params = addIfNotDefault(params, "splitlabels");
	params = addIfNotDefault(params, "splitother");
	if ($("#milestonelist").val() != "") {
		params += "&milestonelist=" + $("#milestonelist").val(); 
	}
	if (!$('#closedmilestones').is(":checked")) {
		params += "&closedmilestones=false";
	}
	if ($('#showpercent').is(":checked")) {
		params += "&showpercent=true";
	}

	return params;
}


function estimateClick(radio) {
	yoda.setEstimateInIssues(radio.value);
}


// -------------------------------

// TODO: Improve
function errorFunc(errorText) {
	alert("ERROR: " + errorText);
}

// ------------------


function storeMilestones(milestones, repoIndex) {
	repoMilestones[repoIndex] = milestones;
	updateMilestones(repoIndex + 1);
}

var firstMilestoneShow = true;
function updateMilestones(repoIndex) {
	console.log("Updatemilestones called");
	if (repoIndex == undefined) {
		// Clear milestone data
		repoIndex = 0;
		repoMilestones = []; 
		commonMilestones = [];
		
	}
	
	if (repoIndex < repoList.length) {
		if ($('#closedmilestones').is(":checked")) {
			var getMilestonesUrl = yoda.getGithubUrl() + "repos/" + $("#owner").val() + "/" + repoList[repoIndex] + "/milestones?state=all";
		} else {
			var getMilestonesUrl = yoda.getGithubUrl() + "repos/" + $("#owner").val() + "/" + repoList[repoIndex] + "/milestones?state=open";
		}

		console.log("Milestone get URL: " + getMilestonesUrl);
		
		yoda.getLoop(getMilestonesUrl, 1, [], function(data) {storeMilestones(data, repoIndex);}, null);
	} else {
		console.log("Read all milestones:");
		console.log(repoMilestones);
		
		// Done getting milestones for all selected repos
		// Next, find common milestones and update milestones selector.
		$("#milestonelist").empty();
		commonMilestones = [];
		
		for (var r = 0; r < repoList.length; r++) {
			for (var m = 0; m < repoMilestones[r].length; m++) {
				var repoTitle = repoMilestones[r][m].title;
				
				if (commonMilestones.indexOf(repoTitle) == -1) {
					commonMilestones.push(repoTitle);
				}
			}
		}
		
		// Sort and add. If URL argument has specified the milestone, select it.
		commonMilestones.sort();
		console.log("The common milestones are: " + commonMilestones);
		
		var milestoneListUrl = yoda.decodeUrlParam(null, "milestonelist");
		var milestonesSelected = false;
		for (var c = 0; c < commonMilestones.length; c++) {
			var selectMilestone = false;
			if (firstMilestoneShow && milestoneListUrl != null && milestoneListUrl.indexOf(commonMilestones[c]) != -1) { 
				selectMilestone = true;
				milestonesSelected = true;
			}

			var newOption = new Option(commonMilestones[c], commonMilestones[c], selectMilestone, selectMilestone);
			$('#milestonelist').append(newOption);
		}
		
		if (milestonesSelected)
			$('#milestonelist').trigger('change');
		
		if (firstMilestoneShow) {
			firstMilestoneShow = false;
			if (yoda.decodeUrlParamBoolean(null, "draw") == "true") {
				startChart();
			}
		}
	}
}

// ------------

// Helper function to build the list of all milestones to query.
var milestoneFilter = "";
function addMilestoneFilter(repo) {
	// Need to find the milestone # for that repo
	console.log("Searching milestone definition for " + repo);

	for (var r = 0; r < repoList.length; r++) {
		if (repoList[r] != repo)
			continue;
		
		// Need to find the milestone (the number)..
		for (var m = 0; m < repoMilestones[r].length; m++) {
			console.log("Checking " + $("#milestonelist").val() + " against " + repoMilestones[r][m].title);
			if (repoMilestones[r][m].title == milestoneFilter) {
				var filter = "&milestone=" + repoMilestones[r][m].number;
				console.log("Adding to filter for repo: " + repo + ":" + filter);
				return filter;
			}
		}
	}
	// We did not find the milestone for this repo. It may not exist. In this case, we'll set an "impossible filter"
	return "&milestone=none&labels=im_pos_sible";
}

//---------------------------------------
//Data has been retrieved. Time to analyse data and draw the chart.
function addMilestone(issues) {
	// Need to loop over milestones for selected repos and determine these basic data.
	
	var milestoneTitle = milestoneFilter;
	var milestoneStartdate = null;
	var milestoneDuedate = null;
	
	// This is a bit tricky. We will look across all selected repos and consider matching milestones.
	// We will pick up any capacity value and add to a total. We will assume that dates are set 
	// equally, so will just pick up what is there.... Warnings could be another option...
	var totalCapacity = 0;
	for (var r = 0; r < repoList.length; r++) {
		for (var m = 0; m < repoMilestones[r].length; m++) {
			var title = repoMilestones[r][m].title;
			
			if (milestoneTitle == title) {
				
				var milestone = repoMilestones[r][m];

				milestoneDuedate = yoda.formatDate(new Date(milestone.due_on));
				console.log("  Milestone due: " + milestoneDuedate);
				milestoneStartdate = yoda.getMilestoneStartdate(milestone.description);

				var capacity = yoda.getMilestoneCapacity(milestone.description);
				if (capacity != null) {
					console.log("Adding capacity " + capacity + " from repo " + repoList[r]);
					totalCapacity += parseInt(capacity);
				}
			}
		}
	}

	var milestoneCapacity = totalCapacity;
	console.log("Adding milestone. " + milestoneTitle + ", No of issues: " + issues.length + ", startDate: " + milestoneStartdate + 
			", dueDate: " + milestoneDuedate + ", capacity: " + milestoneCapacity);

	var estimateArray = [];
	for (var b = 0; b < noStoryBars; b++) {
		estimateArray.push(0);
	}
	var estimate = 0;
	
	for (i=0; i<issues.length; i++) {
		if (milestoneStartdate != null)
			var issueEstimate = yoda.issueEstimateBeforeDate(issues[i], milestoneStartdate);
		else
			var issueEstimate = yoda.issueEstimate(issues[i]);
		
		console.log(" => adding: " + issues[i].number + ", estimate: " + issueEstimate);
		
		var foundBar = false;
		for (var b = 0; b < noStoryBars - 1; b++) {
			if (yoda.isLabelInIssue(issues[i], splitLabels[b])) {
				foundBar = true;
				estimateArray[b] += issueEstimate;
				break;
			}
        }
        

		if (!foundBar && $("#splitother").val() != "") {
			estimateArray[noStoryBars - 1] += issueEstimate; 
		}
		
		estimate += issueEstimate;
	}
	console.log("Total estimate: " + estimate);
	
	// If both start and duedate are defined, we can work out esimate/per day
	if (milestoneStartdate != null && milestoneDuedate != null) {
		var days = yoda.dateDiff(milestoneStartdate, milestoneDuedate);
		console.log("Days = " + days);
		var average = (estimate / days).toFixed(1);
		window.myMixedChart.data.datasets[noStoryBars].data.push(average);
	} else {
		window.myMixedChart.data.datasets[noStoryBars].data.push(0); // We cannot work out estimate/day, put 0
	}

	// If we have a capacity number in the milestone, we may work out estimate/capacity
	if (milestoneCapacity != null && yoda.getEstimateInIssues() != "noissues") {
 		var capacityFactor = (estimate/milestoneCapacity).toFixed(1);
		console.log("Capacity factor = " + capacityFactor);
		window.myMixedChart.data.datasets[noStoryBars + 1].data.push(capacityFactor);
	} else {
		window.myMixedChart.data.datasets[noStoryBars + 1].data.push(0); // We cannot work out estimate/capacity, put 0
	}
	
	// Update chart
	window.myMixedChart.data.labels.push(milestoneTitle);
	for (var b = 0; b < noStoryBars; b++) {
		if ($('#showpercent').is(":checked")) {
			if (estimate == 0)
				window.myMixedChart.data.datasets[b].data.push(0);
			else
				window.myMixedChart.data.datasets[b].data.push(Math.round(1000 * estimateArray[b] / estimate) / 10.0);
		} else {
			window.myMixedChart.data.datasets[b].data.push(estimateArray[b]);
		}
	}
 
	window.myMixedChart.update();
}

// ---------------


function getMilestoneData(milestones, index) {
	if (index < milestones.length) {
		milestoneFilter = milestones[index];
		yoda.updateGitHubIssuesRepos($("#owner").val(), $("#repolist").val(), "", "all", addMilestoneFilter, 
		function(res) {
			addMilestone(res);
			getMilestoneData(milestones, index+1);
		}, function(errorText) { yoda.showSnackbarError("Error getting issues: " + errorText, 3000);});
	} else {
		// done
		yoda.updateUrl(getUrlParams() + "&draw=true");
	}
}

//------------------


// -------------------------
function startChart() {
	var milestones = $("#milestonelist").val();
	console.log("Milestones: (" + milestones.length + "): " + milestones);
	
	splitLabels = [];
	if ($("#splitlabels").val() != "") {
		splitLabels = $("#splitlabels").val().split(",");
	}
	var splitOther = $("#splitother").val();
	
	noStoryBars = splitLabels.length + 1; // Assume other bar always.
	console.log("NoStoryBars = " + noStoryBars);
	
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
	if ($('#showpercent').is(":checked")) 
		axis = "Story Point Relative Percentage";

	// Push bars
	var datasets = [];
	var labels = [];
	for (var b = 0; b < noStoryBars - 1; b++) {
		datasets.push({
			stack: 'storyPoints',
			type : 'bar',
			label : splitLabels[b],
			borderWidth : 2,
			fill : false,
			data : [],
			yAxisID: "y-axis-left",
			backgroundColor : yoda.barColors[b + 4]
		});
	}
	datasets.push({
		stack: 'storyPoints',
		type : 'bar',
		label : axis,
		borderWidth : 2,
		fill : false,
		data : [],
		yAxisID: "y-axis-left",
		backgroundColor : 'rgb(0, 155, 0, 0.6)'
	});
	
	// Now remaining bars. First average
	datasets.push({
		type : 'bar',
		stack : 'average',
		label : axis + " per day",
		borderWidth : 2,
		fill : false,
		data : [],
		yAxisID: "y-axis-right",
		backgroundColor : 'rgb(255, 102, 0)' 
	});
	labels.push("Average / day");
	
	// Then vs. capacity
	datasets.push({
		type : 'bar',
		stack : 'capacity',
		label : 'Storypoints / capacity',
		borderWidth : 2,
		fill : false,
		data : [],
		yAxisID: "y-axis-right",
		backgroundColor : 'rgb(255, 255, 26)' 
	});
	labels.push("Storypoints / capacity");
	
	var stacked = true; 
	window.myMixedChart = new Chart(ctx, {
		type : 'bar',	
		data : {
			labels : [],
			datasets : datasets, 
		},
		options : {
			responsive : true,
			title : {
				display : true,
				text : 'Velocity chart for ' + $("#owner").val() + "/" + $("#repolist").val()
			},
			tooltips : {
				mode : 'index',
				intersect : true
			},
			scales: {
				yAxes: [{
					scaleLabel: {
						display: true,
						labelString: axis,
						stacked: stacked
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
				}],
				xAxes: [{
					stacked: stacked
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

	getMilestoneData(milestones, 0);
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
//                 if (dataset.label == $("#splitother").val())
//                	 ctx.fillText(dataString, position.x, position.y - (Chart.defaults.global.defaultFontSize / 2) - padding);   // above bar
//                 else
                	 ctx.fillText(dataString, position.x, position.y + (Chart.defaults.global.defaultFontSize / 2) + padding);   // inside bar
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
