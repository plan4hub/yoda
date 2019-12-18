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


// Global variable controlling whether bars should be stacked or not.
// If stacked, then tool will not do a "totals" line and a corresponding right axis.
var stacked = false;

var repoList = [];

function addIfNotDefault(params, field) {
	if ($("#" + field).val() != $("#" + field).prop('defaultValue')) {
		return params + "&" + field + "=" + $("#" + field).val(); 
	} else {
		return params;
	}
}

function getUrlParams() {
	var params = "owner=" + $("#owner").val();
	params += "&repolist=" + $("#repolist").val();
	if ($("#startdate").val() != "") {
		params += "&startdate=" + $("#startdate").val(); 
	}
	if ($("#enddate").val() != "") {
		params += "&enddate=" + $("#enddate").val(); 
	}
	params = addIfNotDefault(params, "interval");	
	params = addIfNotDefault(params, "labelfilter");	
	params = addIfNotDefault(params, "labelsplit");	
	params = addIfNotDefault(params, "other");	
	params = addIfNotDefault(params, "title");
	if ($('#stacked').is(":checked")) {
		params += "&stacked=true";
	}
	if ($('#history').is(":checked")) {
		params += "&history=true";
	}
	if ($('#righttotal').is(":checked")) {
		params += "&righttotal=true";
	}
	var countType = $("#countradio input[type='radio']:checked").val();
	if (countType != "noissues") {
		params += "&count=" + countType;
	}
	
	return params;
}


// Helper functions for analyzing issues. These are introduced to be able to have an abstraction for
// using - or not using - history issue information based on events information.
// Will return open, closed, unknown
function issueState(issue, date) {
	// TBD
} 




// Global array. Issue URL (API style) is the key
var labelEventsReceived = false;
var labelEvents = [];
function issuesLabels(issue, date) {
	if ($('#history').is(":checked") && labelEventsReceived) {
		// We start by the current set of labels. Then we will work backwards performing label adjustments
		// in reverse form.
		var labelsAtTime = issue.labels.slice();

		if (labelEvents[issue.url] != undefined) {
			// sort by create date
			labelEvents[issue.url].sort(function(a, b) {return a.created_at < b.created_at;});
			// Run through the events in reverse order
			for (var e = 0; e < labelEvents[issue.url].length; e++) {
				var eventDate = new Date(labelEvents[issue.url][e].created_at);
				
				if (eventDate < date)
					continue; // Don't care about earlier changes.
				
				if (labelEvents[issue.url][e].event == "labeled") {
					// Remove label (as we are working reverse) 

					for (var i = 0; i < labelsAtTime.length; i++) {
						if (labelsAtTime[i].name == labelEvents[issue.url][e].label.name) { 
							labelsAtTime.splice(i, 1);
							break;
						}
					}
					
				}
				if (labelEvents[issue.url][e].event == "unlabeled") {
					// Add label (as we are working in reverse)
					labelsAtTime.push(labelEvents[issue.url][e].label);
				} 
			}
		}
		return labelsAtTime;
	} else {
		// 	Just return current state
		return issue.labels;
	}
} 

// ---------------------------------------
// Issues have been retrieved. Time to analyse data and draw the chart.
var bars = [];
//var barsIds = [];
function createChart() {
	// Check date fields for possible +/- notations.
	$("#startdate").val(yoda.handleDateDelta($("#startdate").val()));
	$("#enddate").val(yoda.handleDateDelta($("#enddate").val()));
	
	if ($('#righttotal').is(":checked")) {
		var rightTotal = true;
	} else {
		var rightTotal = false;
	}
	
	// Let's set today as 0:0:0 time (so VERY start of the day)
	var today = new Date();
	today.setHours(0);
	today.setMinutes(0);
	today.setSeconds(0);
	
	var interval = $("#interval").val();
	console.log("Interval: " + interval);

	var startDateString = $("#startdate").val();
	if (startDateString == "") {
		var startDate = yoda.twoMonthsEarlier(interval, today);
	} else {
		var startDate = new Date(startDateString);
	}
	console.log("Start date: " + startDate);
	
	var endDateString = $("#enddate").val();
	if (endDateString == "") {
		var endDate = new Date(today);
	} else {
		endDate = new Date(endDateString);
	}
	console.log("End date: " + endDate);
	endDate.setHours(23);
	endDate.setMinutes(59);
	endDate.setSeconds(59);

	var labelSplit = $("#labelsplit").val();
	console.log("Label split: " + labelSplit);
	
	var temp = $("#countradio input[type='radio']:checked");
	if (temp.length > 0) {
	    var countType = temp.val();
	}
	console.log("Count type read: " + countType);

	// Label magic (splitting based on label split filter, if specified)
	// Let's build a map of labels
	// Let's see if this look like a regular expression, or if it is simply a list of labels with , between.
	bars = [];
	barsIds = [];
	var labelSplitUsingRegExp = false;
	
	// Special handling for "repo"
	if (labelSplit == "repo") {
		// This is a special situation. We will create a bar for each repo. Useful only when doing organization level graph.
		for (i=0; i<issues.length; i++) {
			var repo = yoda.getUrlRepo(issues[i].url);
			if (bars.indexOf(repo) == -1)
				bars.push(repo);
		}
		bars.sort();
	} else {
		if (labelSplit.split(",").length > 1) {
			// Explicit list of labels
			var ls = labelSplit.split(",");
			for (l = 0; l < ls.length; l++) {
				bars.push(ls[l].trim());
			}
		} else {
			// Regular expression
			if (labelSplit != "") {
				labelSplitUsingRegExp = true;
				var splitReg = new RegExp(labelSplit);
				if (labelSplit != "") {
					for (i=0; i<issues.length; i++) {
						for (var l=0; l<issues[i].labels.length; l++) {
							var labelName = issues[i].labels[l].name;
							var res = labelName.match(splitReg);
							if (res != null) {
								if (bars.indexOf(labelName) == -1) {
									console.log("Found label: " + labelName);
									bars.push(labelName);
//									barsIds.push(issues[i].labels[l].id);
								}
							}
						}
					}
				}
				bars = bars.sort();
				console.log("Number of distinct labels: " + bars.length);
			}
		}
	}
	console.log("Labels: " + bars);
	
	// Besides the bars for the data identified, possibly none if no label split, we will maintain
	// 1. A bar chart for others (i.e. issues not having labels matching the ones identified
	// 2. A line for total # issues (only if we have splitting)
	
	// Data arrays for issues.
	// 	Data array (two-dimentional) for issues matching the bar labels
	// 	Other for issues not match
	// 	Total for all issues (matching date interval)'
	//  TotalIssues for all issues (this extra total to be used for opened-total and closed-total options).
	var dateArray = [];
	var dataArray = new Array(bars.length);
	for (i = 0; i < dataArray.length; i++) {
		dataArray[i] = new Array();
	}
	var otherArray = [];
	var totalArray = [];
	var totalAlwaysArray = [];
	
	// date loop
	// Start at startDate
	
	// Need to consider previous date, so that we can observe interval.
    var previousDate = new Date(startDate);
    var startDay = previousDate.getDate(); // Hack, need to keep startDay when advancing using month (m) syntax.
	for (var date = new Date(startDate); date <= endDate; previousDate = new Date(date), yoda.advanceDate(date, interval, startDay)) {
		console.log("Date: " + date + ", previousDate: " + previousDate);
		date.setHours(23);
		date.setMinutes(59);
		date.setSeconds(59);
		
		// Push to date array
		dateArray.push(yoda.formatDate(date));
		
		// Prepare data array
		var dataArrayForDay = new Array(bars.length);
		var dataDurationOpenForDay = new Array(bars.length);
		var dataDurationClosedForDay = new Array(bars.length);
		for (var l=0; l<bars.length; l++) {
			dataArrayForDay[l] = 0;
			dataDurationOpenForDay[l] = 0;
			dataDurationClosedForDay[l] = 0;
		};
		var otherForDay = 0;
		var totalForDay = 0;
		var otherDurationOpenForDay = 0;
		var totalAlways = 0;
		
		// Ok, now let's count issues
		for (var i=0; i < issues.length; i++) {
			// We must consider issues which have been opened BEFORE date, but  
			// NOT closed before date
			var submitDateString = yoda.createDate(issues[i]);    
			var submitDate = new Date(submitDateString);
			
			if (submitDate > date) {
				// Submitted later - forget it.
				continue;
			}
			
			// Closed, and closed before OR DURING date?
			var closedString = yoda.closeDate(issues[i]); 
			if (closedString != null) {
				var closedDate = new Date(closedString);

				// Check if open now, all cases.
				if (closedDate > date)
					totalAlways++;

				// Don't want this issue if closed ahead of this
				if ((countType == "noissues" || countType == "durationopen") && closedDate <= date) {
					continue;
				}
				
				// Closed before previous date
				if (countType == "closed" && closedDate <= previousDate) {
					continue;
			 	}
					
				// Closed later
				if (countType == "closed" && closedDate > date) {
					continue;
				}
			} else {
				totalAlways++;
				if (countType == "closed")
					continue;
			}
			
			// Ok, it is open, IF we are counting opened, we are only interested if it was opened during this period.
			if (countType == "opened" && submitDate < previousDate) {
				// Earlier period, forget it.
				continue;
			}
			
			// Ok, relevant
			var foundLabel = false;
			var labelList = issuesLabels(issues[i], date);
			
			// Trick: if we have special "repo" text into labelsplit, then we'll create an artificial labellist with just the repo name.
			// This will cause an immediate match.
			if (labelSplit == "repo") 
				labelList = [{name: yoda.getUrlRepo(issues[i].url)}];
			
			// Log's look at the labels.
			for (l = 0; l < labelList.length; l++) {
				var labelName = labelList[l].name;
				// Search bars array
				var index = bars.indexOf(labelName);
				if (index != -1) {
//					console.log(" =>> Adding issue: " + issues[i].number + ", label: " + issues[i].labels[l].name + ", submitted: " + 
//							issues[i].created_at + ", closed: " + issues[i].closed_at);

					// Got a match. Make sure we don't continue search
					dataArrayForDay[index] = dataArrayForDay[index] + 1;
					totalForDay++;
					l = labelList.length;
					foundLabel = true;
					
					// Add the total duration, we will divide by # of issues later.
					var duration = yoda.dateDiff(submitDate, date);
//					console.log("For issue: " + issues[i].number + ", submit: " + submitDate + ", duration at " + date + " is " + duration);
					dataDurationOpenForDay[index] += duration;

				}
			}
			if (foundLabel == false && 	$("#other").val() != "") {
//				console.log("Could not find label for issue " + issues[i].url);
//				console.log(labelList);
				
				otherForDay++;
				totalForDay++;
				
				// Add the total duration, we will divide by # of issues later.
				var duration = yoda.dateDiff(submitDate, date);
				otherDurationOpenForDay += duration;
				
//				console.log(" =>> Adding issue: " + issues[i].number + ", no label match, submitted: " + issues[i].created_at + 
//					", closed: " + issues[i].closed_at);
			}
		}
		
		// Switch to duration?
		if (countType == "durationopen") {
			// We now need to move to dataArrayForDay to contain instead of the # of issues the averation duration of the open time.
			for (var i=0; i < bars.length; i++) {
				var average = dataDurationOpenForDay[i] / dataArrayForDay[i];
//				console.log("Adding average: " + average + ", calculated as " + dataDurationOpenForDay[i] + " days total div by " + dataArrayForDay[i] + " issues.");
				dataArray[i].push(average.toFixed(0));
			}
			otherArray.push((otherDurationOpenForDay / otherForDay).toFixed(0));
		} else {
			// Normal, i.e. not duration
			// We will push data to the data array
			for (var i=0; i < bars.length; i++) {
				dataArray[i].push(dataArrayForDay[i]);
			}
			otherArray.push(otherForDay);
		}
		
//		console.log(dataArrayForDay);
		totalArray.push(totalForDay);
		totalAlwaysArray.push(totalAlways);
	}
	
	// Ready, let's push the bars
	var datasetArray = [];
	for (var b = 0; b < bars.length; b++) {
		// Here, we want to try again with the regular expression to see if we can come up with a better name for the bar into the legend.
		actualBar = bars[b];
		if (labelSplitUsingRegExp && labelSplit.indexOf('(') != -1) {  // We have a parentesis, that means we have to try to change label name.
			var splitReg = new RegExp(labelSplit);
			actualBar = bars[b].replace(splitReg, '$1');
		}
//		console.log("actualBar = '" + actualBar + "'");
		
		datasetArray.push({
			type : 'bar',
			label : actualBar,
			borderWidth : 2,
			fill : false,
			data : dataArray[b],
			backgroundColor : yoda.barColors[b]
		});
	}

	// Other's bar (if not blank)
	if ($("#other").val() != "") {
		datasetArray.push({
			type : 'bar',
			label : $("#other").val(),
			borderWidth : 2,
			fill : false,
			data : otherArray,
			yAxisID: "y-axis-left",
			backgroundColor : 'rgb(191, 191, 191)' // grey'ish
		});
	}

	// What should we put on right acis 
	if (rightTotal) {
		datasetArray.push({
			type : 'line',
			label : 'Total',
			borderWidth : 2,
			fill : false,
			yAxisID: "y-axis-right",
			data : totalAlwaysArray,
			lineTension: 0
		});
	} else {	
		// Add line for total, but only if bars (and not stacked)
		if (bars.length > 0 && stacked == false) {
			datasetArray.push({
				type : 'line',
				label : 'Total',
				borderWidth : 2,
				fill : false,
				yAxisID: "y-axis-right",
				data : totalArray,
				lineTension: 0
			});
		}
	}
	
	// We will push data to a 
	var chartData = {
			labels : dateArray,
			datasets : datasetArray
	};
	
	leftLabel = [];
	leftLabel["durationopen"] = "Average duration open (days)";
	leftLabel["noissues"] = "No of issues";
	leftLabel["opened"] = "No of issues opened";
	leftLabel["closed"] = "No of issues closed";

	var chartScales = {
			yAxes: [{
				scaleLabel: {
					display: true,
					labelString: leftLabel[countType],
				},
				stacked: stacked,
				position: "left",
				id: "y-axis-left",
				ticks: {
					beginAtZero: true
				}
			}],
			xAxes: [{
				stacked: stacked
			}]
	};
	
	rightLabel = [];
	rightLabel["durationopen"] = "Total issues";
	rightLabel["noissues"] = "Total issues";
	if (rightTotal) { 
		rightLabel["opened"] = "No open issues";
		rightLabel["closed"] = "No open issues";
	} else {
		rightLabel["opened"] = "Total issues opened";
		rightLabel["closed"] = "Total issues closed";
	}
	
	// Add second axis.
	if ((bars.length > 0 && stacked == false) || rightTotal) {
		chartScales.yAxes.push({    
			scaleLabel: {
				display: true,
				labelString: rightLabel[countType],
			},
			position: "right",
			id: "y-axis-right",
			ticks: {
				beginAtZero: true
			}
		});		
	}

	// -----------------------------------------------------------
	// DATA. Draw the chart
	var ctx = document.getElementById("canvas").getContext("2d");
	if (window.myMixedChart != null)
		window.myMixedChart.destroy();
	
	var chartTitle = "Github Issues " + $("#owner").val() + "/" + $("#repolist").val();
	if ($("#title").val() != "") {
		chartTitle = $("#title").val(); 
	}
	
	window.myMixedChart = new Chart(ctx, {
		type : 'bar',	
		data : chartData,
		options : {
			showDatapoints: true,
			responsive : true,
			title : {
				display : true,
				text : chartTitle
			},
			tooltips : {
				mode : 'index',
				intersect : true
			},
			scales: chartScales,
		},
	});
	
	yoda.updateUrl(getUrlParams() + "&draw=true");
}

// ----------------

	
// -------------------------
// Double array

function storeEvents(events) {
	console.log("Analyzing events: " + events.length);
	for (var e = 0; e < events.length; e++) {
		if (events[e].event == "labeled" ||
			events[e].event == "unlabeled") {
			var labelEvent = {
				"event": events[e].event,
				"created_at": events[e].created_at,
				"label": events[e].label
			};

			var url = events[e].issue.url;
			if (labelEvents[url] == undefined) {
				labelEvents[url] = [];
			} 
			labelEvents[url].push(labelEvent);
//			console.log("Now " + labelEvents[url].length + " events for " + url);
		}

		if (events[e].event == "closed" || 
			events[e].event == "reopened") {
//			console.log("When: " + events[e].created_at + ", Issue: " + events[e].issue.url + ", event: " + events[e].event);
//			console.log(events[e]);
		}
	}
}


//This function will retrieve all lables from the labelfilter filter field that are NOT prefixed by a minus. These will instead be used for later filtering 
function getFilterLabels() {
	allFilters = $("#labelfilter").val().split(",");
	positiveFilter = [];
	for (var i = 0; i < allFilters.length; i++) {
		if (allFilters[i].charAt(0) != "-")
			positiveFilter.push(allFilters[i]);
	}
	
	return positiveFilter.join(",");
}

// This function will return the reverse of above, i.e. array of labels to be ignored. So, this one returns an array.
function getFilterLabelsReverse() {
	allFilters = $("#labelfilter").val().split(",");
	negativeFilter = [];
	for (var i = 0; i < allFilters.length; i++) {
		if (allFilters[i].charAt(0) == "-")
			negativeFilter.push(allFilters[i].substr(1));
	}
	
	return negativeFilter;
}

var issues = [];
function storeIssuesThenCreateChart(issuesResp) {
	issues = [];
	negativeFilter = getFilterLabelsReverse();
	
	for (var i = 0; i < issuesResp.length; i++) {
		if (yoda.isAnyLabelInIssue(issuesResp[i], negativeFilter)) {
			// drop it
		}  else {
			issues.push(issuesResp[i]);
		}
	}
	
	createChart();
}


var lastRepoEvents = "";
function startChart() {
	if ($('#stacked').is(":checked")) {
		stacked = true;
	} else {
		stacked = false;
	}
	
	if ($("#repolist").val() == "") 
		yoda.updateGitHubIssuesOrg($("#owner").val(), getFilterLabels(), "all", storeIssuesThenCreateChart, function(errorText) { yoda.showSnackbarError("Error getting issues: " + errorText, 3000);});
	else
		yoda.updateGitHubIssuesRepos($("#owner").val(), $("#repolist").val(), getFilterLabels(), "all", null, storeIssuesThenCreateChart, function(errorText) { yoda.showSnackbarError("Error getting issues: " + errorText, 3000);});

	// Get events as well. ONLY DO THIS ONCE PER REPO. Very heavy
	if ($('#history').is(":checked") && lastRepoEvents != $("#repolist").val()) {
		labelEvents = [];
		labelEventsReceived = false;
 
		if ($("#repolist").val() != "") { // Note, label getting does not work across entire org. No such API!
			var repoList = $("#repolist").val();
			yoda.showSnackbar("Started retrieving all events");
			for (var r = 0; r < repoList.length; r++) {
				var getEventsUrl = yoda.getGithubUrl() + "repos/" + $("#owner").val() + "/" + repoList[r] + "/issues/events";
				console.log("Label URL:" + getEventsUrl);

				yoda.getLoopIterative(getEventsUrl, 1, storeEvents, function() { 
					lastRepoEvents = $("#repolist").val(); 
					yoda.showSnackbar("Retrieved all events for repo. Redrawing");
					labelEventsReceived = true;
					console.log("Retrieved all events for repo. Redrawing");

					// redraw chart
					createChart();
				}, 
				function(errorText) { 
					yoda.showSnackbarError("Error getting events: " + errorText, 3000);
				});
			}
		}
	}
}

// --------------

function githubAuth() {
	console.log("Github authentisation: " + $("#user").val() + ", token: " + $("#token").val());
	yoda.gitAuth($("#user").val(), $("#token").val());
}

// --------------

//Label drawing
Chart.plugins.register({
 afterDatasetsDraw: function(chartInstance, easing) {
     var ctx = chartInstance.chart.ctx;

     chartInstance.data.datasets.forEach(function (dataset, i) {
         var meta = chartInstance.getDatasetMeta(i);
         if (!meta.hidden) {
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
                 
                 if (stacked == false) { 
                	 // Label above bar
                	 ctx.fillText(dataString, position.x, position.y - (Chart.defaults.global.defaultFontSize / 2) - padding);
                 } else {
                	 // Label inside bar ... gives a bit of trouble at buttom... 
                	 ctx.fillText(dataString, position.x, position.y + (Chart.defaults.global.defaultFontSize / 2) + padding);
                 }
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
