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
	params = addIfNotDefault(params, "labelfilter");
	params = addIfNotDefault(params, "splitother");
	if ($('#showpercent').is(":checked")) {
		params += "&showpercent=true";
	}
	if ($("#startdate").val() != "") {
		params += "&startdate=" + $("#startdate").val(); 
	}
	if ($("#enddate").val() != "") {
		params += "&enddate=" + $("#enddate").val(); 
	}
//	params = addIfNotDefault(params, "interval");	

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

function getAndPlotInterval(currentMonth, endMonth, repoIndex, issues) {
	console.log("Current month = " + currentMonth);
	// is:issue is:closed repo:hpsd/REPO closed:2020-01-01..2020-01-31
	
	// Need to work out last day of month
	var startDate = new Date(currentMonth + "-01");
	console.log(startDate);
	console.log(startDate.getFullYear());
	console.log(startDate.getMonth());
	var endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0).getDate();
	console.log("endDate = " + endDate);
	
	var getIssuesUrl = yoda.getGithubUrl() + "search/issues?q=is:issue+estimate+in:body+repo:" + $("#owner").val() + "/" + repoList[repoIndex] + 
	   "+closed:" + currentMonth + "-01.." + currentMonth + "-" + endDate;
	console.log(getIssuesUrl);
	yoda.getLoop(getIssuesUrl, 1, [], function(data) {
		console.log(data[0].items);
		if (repoIndex == repoList.length -1) {
			// This was the last one. We are ready to draw stuff.
			issues = issues.concat(data[0].items);
			console.log("Drawing for " + currentMonth + ". No of issues: " + issues.length);
		
			// Let's draw
			var estimateArray = [];
			for (var b = 0; b < noStoryBars; b++) {
				estimateArray.push(0);
			}
			var estimate = 0;
			
			for (i=0; i<issues.length; i++) {
					
				// TBD: Check for Jira migrated issue. IF issues has been created on same day as closed and has "Jira migrated" label,
				//      then skip issue!
				// Alternatively, just check if the issue was closed within X seconds (e.g. 60). Then it was a migration...
				
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
			
			// Update chart
			window.myMixedChart.data.labels.push(currentMonth);
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
			
			var days = endDate; 
			console.log("Days = " + days);
			var average = (estimate / days).toFixed(1);
			window.myMixedChart.data.datasets[noStoryBars].data.push(average);
		 
			window.myMixedChart.update();
			
			// Now, next month
			if (currentMonth != endMonth) {
				startDate.setMonth(startDate.getMonth() + 1);
				getAndPlotInterval(startDate.getFullYear() + "-" + ('0' + (startDate.getMonth() + 1)).slice(-2), endMonth, 0, []);
			}
		} else {
			// Next repo.
			getAndPlotInterval(currentMonth, endMonth, repoIndex + 1, issues.concat(data[0].items));
		}
	}, null);

}




//------------------


// -------------------------
function startChart() {
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
						labelString: axis + " per day",
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
	// Let's set today as 0:0:0 time (so VERY start of the day)
	var startMonth = $("#startmonth").val();
	if (startMonth == "") {
		// TBD - 6 month before
	} 
	console.log("Start month: " + startMonth);
	
	var endMonth = $("#endmonth").val();
	if (endMonth == "") {
		// TBD. Set current month
	}
	console.log("End month: " + endMonth);
	
	getAndPlotInterval(startMonth, endMonth, 0, []);
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
