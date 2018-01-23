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


function getUrlParams() {
	var params = "owner=" + $("#owner").val();
	if ($("#repolist").val() != "") 
		params += "&repolist=" + $("#repolist").val();

	if ($("#startdate").val() != "") {
		params += "&startdate=" + $("#startdate").val(); 
	}
	if ($("#enddate").val() != "") {
		params += "&enddate=" + $("#enddate").val(); 
	}
	if ($("#interval").val() != "") {
		params += "&interval=" + $("#interval").val(); 
	}
	if ($("#labelfilter").val() != "") {
		params += "&labelfilter=" + $("#labelfilter").val(); 
	}
	if ($("#title").val() != "") {
		params += "&title=" + $("#title").val(); 
	}
	return params;
}

function advanceDate(date, interval) {
//	console.log('AdvancedDate 1: ' + date + ", interval: " + interval);
	if (interval.slice(-1) == 'm') {
		// Assume month
		date.addMonths(parseInt(interval));
	} else {
		date.setDate(date.getDate() + parseInt(interval));
	}
//	console.log('AdvancedDate 2: ' + date + ", interval: " + interval);
}

function determineStartAndInterval(firstIssueDate, interval) {
	var today = new Date();
	today.setHours(0);
	today.setMinutes(0);
	today.setSeconds(0);
	
	var days = (today - firstIssueDate) / (24*60*60*1000);
	console.log("Days: " + days);
	
	// Do we need to play with interval?
	if (interval.slice(-1) != 'm' && (days/interval) > 25) {
		// shift to monthly
		interval = '1m';
	}
	
	// Ok, let's determine startdate
	for (var startDate = today; startDate >= firstIssueDate; advanceDate(startDate, '-' + interval));

	return {
		startDate: startDate,
		interval: interval
	};
}

//---------------------------------------
//Issues have been retrieved. Time to analyse data and draw the chart.
function createChartLT(issues) {
	// Check date fields for possible +/- notations.
	$("#startdate").val(yoda.handleDateDelta($("#startdate").val()));
	$("#enddate").val(yoda.handleDateDelta($("#enddate").val()));

	console.log("Creating LT. No issues (after filtering out pull requests): " + issues.length);
	
	// Issue analysis loop.
	// First, let's sort issues by submit date
	issues.sort(function(issue_1, issue_2) {
		if (issue_1.created_at < issue_2.created_at)
			return -1;
		else 
			return 1;
	});

	// Let's set today as 0:0:0 time (so VERY start of the day)
	var today = new Date();
	today.setHours(0);
	today.setMinutes(0);
	today.setSeconds(0);
	
	var interval = $("#interval").val();
	console.log("Interval: " + interval);

	var startDateString = $("#startdate").val();
	if (startDateString == "") {
		// If blank, makes sense to start with the date of the first issue.
		var firstIssueDate = new Date(issues[0].created_at); 
		var update = determineStartAndInterval(firstIssueDate, interval);
		interval = update.interval;
		var startDate = update.startDate;
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
	endDate.setHours(23);
	endDate.setMinutes(59);
	endDate.setSeconds(59);
	console.log("End date: " + endDate);
	
	
	// Then, let's run through the issues to build a date array.
	
	
	// Then, let's loop the dates.
	var firstIssueDate = issues[0].created_at;
	console.log("first: " + firstIssueDate);
	var lastIssueDate = issues.slice(-1)[0].created_at;
	console.log("last: " + lastIssueDate);
	var endIssueDate = new Date(lastIssueDate);
	
	// date loop
	// Start at startDate
	var openArray = [];
	var closedArray = [];
	for (var date = new Date(firstIssueDate); date <= endIssueDate; date.setDate(date.getDate() + 1)) {
		var d = yoda.formatDate(date);
		openArray[d] = 0;
		closedArray[d] = 0;
	}
	
	for (var i = 0; i < issues.length; i++) {
		// Add to open and/or closed item.
		var createdAt = issues[i].created_at;
		var dTemp = new Date(createdAt);
		var d = yoda.formatDate(dTemp);
		openArray[d]++;
		
		var closedAt = issues[i].closed_at;
		if (closedAt != null) {
			var dTemp = new Date(closedAt);
			var d = yoda.formatDate(dTemp);
			closedArray[d]++;
		}
	}
	
	// Debug
//	for (var date = new Date(firstIssueDate); date <= today; date.setDate(date.getDate() + 1)) {
//		var d = yoda.formatDate(date);
//		console.log(d + ", " + openArray[d] + ", " + closedArray[d]);
//	}

	// Data arrays for issue lead times.
	var leadTimeArray = [];
	var dateArray = [];

	for (var date = new Date(startDate); date <= endDate; advanceDate(date, interval)) {
		var endOfDate = new Date(date);
		endOfDate.setHours(23);
		endOfDate.setMinutes(59);
		endOfDate.setSeconds(59);
		
		// Push to date array
		dateArray.push(yoda.formatDate(date));
		
		// Prepare data array
		var noOpen = 0;
		var noClosed = 0;
		
		// Ok, now let's count issues
		for (var i=0; i < issues.length; i++) {
			// We count all issues. Just a matter of splitting them into either one of the data pools.
			// closed => index 0
			// open => index 1
			var submitDateString = issues[i].created_at;
			var submitDate = new Date(submitDateString);
			
			if (submitDate > endOfDate) {
				// Submitted later - forget it.
				continue;
			}
			
			// Closed, and closed before OR DURING date?
			var closedString = issues[i].closed_at;
			if (closedString != null) {
				var closedDate = new Date(closedString);

				// was it open at date?
				if (closedDate < endOfDate) {
					// closed before, so closed
					noClosed++; // count as closed
				} else {
					noOpen++;   // count as open
				}
			} else {
				// still open
				noOpen++;   // count as open
			}
		}
		
		// Ok, now we know number of open and no of closed.
		// Need to look into array to find a good ponit.
		var cumClosed = 0;
		var cumOpen = 0;
		var duration = NaN;
		for (var backDate = new Date(firstIssueDate); backDate <= endOfDate; backDate.setDate(backDate.getDate() + 1)) {
			var d = yoda.formatDate(backDate);
			cumOpen += (openArray[d] - closedArray[d]);
			cumClosed += closedArray[d];
//			console.log(backDate, cumOpen, cumClosed);
			if (cumOpen + cumClosed >= noClosed) {

				duration = Math.ceil((endOfDate - backDate) / (1000 * 60 * 60 * 24));
//				console.log(">> BREAK", cumOpen, cumClosed, noClosed, d, date, duration);				
				break;
			}
		}
		
		// TBD
//		console.log("For date: " + date + " pushing value " + duration);
		leadTimeArray.push(duration);
	}
	
	// -----------------------------------------------------------
	// DATA. Draw the chart
	var ctx = document.getElementById("canvas").getContext("2d");
	if (window.myMixedChart != null)
		window.myMixedChart.destroy();
	
	var chartTitle = "CFD / Lead time / GitHub Issues " + $("#owner").val() + "/" + $("#repolist").val();
	if ($("#title").val() != "") {
		chartTitle = $("#title").val(); 
	}
	
	console.log(leadTimeArray.length, dateArray.length);
	
	window.myMixedChart = new Chart(ctx, {
		type : 'line',	
		data : {
			labels : dateArray,
			datasets : [{ 
				type : 'line',
				label : 'Lead time',
				borderWidth : 3,
				fill : false,
				data : leadTimeArray
			}]
		},
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
			scales: {
				yAxes: [{
					scaleLabel: {
						display: true,
						labelString: 'days',
					},
					stacked: true,
					position: "left",
					id: "y-axis-left",
					ticks: {
						beginAtZero: true
					}
				}],
				xAxes: [{
					stacked: true
				}]
			}
		}
	});
	
	yoda.updateUrl(getUrlParams() + "&draw=lt");
}



// ---------------------------------------
// Issues have been retrieved. Time to analyse data and draw the chart.
function createChartCFD(issues) {
	// Check date fields for possible +/- notations.
	$("#startdate").val(yoda.handleDateDelta($("#startdate").val()));
	$("#enddate").val(yoda.handleDateDelta($("#enddate").val()));

	console.log("Creating chart. No issues (after filtering out pull requests): " + issues.length);

	// Let's set today as 0:0:0 time (so VERY start of the day)
	var today = new Date();
	today.setHours(0);
	today.setMinutes(0);
	today.setSeconds(0);
	
	// First, let's sort issues by submit date
	issues.sort(function(issue_1, issue_2) {
		if (issue_1.created_at < issue_2.created_at)
			return -1;
		else 
			return 1;
	});

	var interval = $("#interval").val();
	console.log("Interval: " + interval);

	var startDateString = $("#startdate").val();
	if (startDateString == "") {
		// If blank, makes sense to start with the date of the first issue.
		var firstIssueDate = new Date(issues[0].created_at); 
		var update = determineStartAndInterval(firstIssueDate, interval);
		interval = update.interval;
		var startDate = update.startDate;
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
	endDate.setHours(23);
	endDate.setMinutes(59);
	endDate.setSeconds(59);
	console.log("End date: " + endDate);

	// Data arrays for issues. For now contains closed and open. Later can be expanded to more substates.
	var dataArraySize = 2;
	var dateArray = [];
	var dataArray = new Array(dataArraySize);
	for (i = 0; i < dataArray.length; i++) {
		dataArray[i] = new Array();
	}
	var bars = [];
	bars[0] = "closed";
	bars[1] = "open";
	
	// date loop
	// Start at startDate
	
	// Need to consider previous date, so that we can observe interval.
	for (var date = new Date(startDate); date <= endDate; advanceDate(date, interval)) {
//		console.log('date: ' +  date + ", enddate: " + endDate );
		var endOfDate = new Date(date);
		endOfDate.setHours(23);
		endOfDate.setMinutes(59);
		endOfDate.setSeconds(59);
		
		// Push to date array
		dateArray.push(yoda.formatDate(date));
		
		// Prepare data array
		var dataArrayForDay = new Array(dataArraySize);
		for (var l=0; l<dataArraySize; l++) {
			dataArrayForDay[l] = 0;
		};
		
		// Ok, now let's count issues
		for (var i=0; i < issues.length; i++) {
			// We count all issues. Just a matter of splitting them into either one of the data pools.
			// closed => index 0
			// open => index 1
			var submitDateString = issues[i].created_at;
			var submitDate = new Date(submitDateString);
			
			if (submitDate > endOfDate) {
				// Submitted later - forget it.
				continue;
			}
			
			// Closed, and closed before OR DURING date?
			var closedString = issues[i].closed_at;
			if (closedString != null) {
				var closedDate = new Date(closedString);

				// was it open at date?
				if (closedDate < endOfDate) {
					// closed before, so closed
					dataArrayForDay[0]++;  // count as closed
				} else {
					dataArrayForDay[1]++;  // count as open
				}
			} else {
				// still open
				dataArrayForDay[1]++;     // count as open
			}
		}			
		for (var i=0; i < dataArraySize; i++) {
			dataArray[i].push(dataArrayForDay[i]);
		}
	}
	
	// Ready, let's push the bars
	var datasetArray = [];
	for (var b = 0; b < dataArraySize; b++) {
		datasetArray.push({
			type : 'line',
			label : bars[b],
			borderWidth : 2,
			fill : true,
			data : dataArray[b],
			backgroundColor : yoda.barColors[b+2]
		});
	}

	
	// We will push data to a 
	var chartData = {
			labels : dateArray,
			datasets : datasetArray
	};
	
	var chartScales = {
			yAxes: [{
				scaleLabel: {
					display: true,
					labelString: '# of issues',
				},
				stacked: true,
				position: "left",
				id: "y-axis-left",
				ticks: {
					beginAtZero: true
				}
			}],
			xAxes: [{
				stacked: true
			}]
	};
	
	// -----------------------------------------------------------
	// DATA. Draw the chart
	var ctx = document.getElementById("canvas").getContext("2d");
	if (window.myMixedChart != null)
		window.myMixedChart.destroy();
	
	var chartTitle = "CFD / Github Issues " + $("#owner").val() + "/" + $("#repolist").val();
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
	
	yoda.updateUrl(getUrlParams() + "&draw=cfd");
}

// -------------------------------

// TODO: Enhance this
function errorFunc(errorText) {
	alert("ERROR: " + errorText);
}

// ----------------
var _chartType = "";
function storeIssuesThenCreateChart(issues) {
	if (_chartType == "CFD") {
		createChartCFD(issues);
	} else {
		createChartLT(issues);
	}
}
	
// -------------------------

function startChart(chartType) {
	_chartType = chartType
	if ($("#repolist").val() == "") 
		yoda.updateGitHubIssuesOrg($("#owner").val(), $("#labelfilter").val(), "all", storeIssuesThenCreateChart, function(errorText) { yoda.showSnackbarError("Error getting issues: " + errorText, 3000);});
	else
		yoda.updateGitHubIssuesRepos($("#owner").val(), $("#repolist").val(), $("#labelfilter").val(), "all", storeIssuesThenCreateChart, function(errorText) { yoda.showSnackbarError("Error getting issues: " + errorText, 3000);});
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
            	 ctx.fillStyle = yoda.bestForeground(dataset.backgroundColor, 'rgb(230,230,230', 'rgb(0,0,0)');
                 ctx.font = Chart.helpers.fontString(Chart.defaults.global.defaultFontSize, Chart.defaults.global.defaultFontStyle, Chart.defaults.global.defaultFontFamily);

                 // Just naively convert to string for now
                 var dataString = dataset.data[index].toString();

                 // Make sure alignment settings are correct
                 ctx.textAlign = 'center';
                 ctx.textBaseline = 'middle';

                 var padding = 5;
                 var position = element.tooltipPosition();
                 
                 // Label inside bar ... gives a bit of trouble at buttom... 
                 ctx.fillText(dataString, position.x, position.y + (Chart.defaults.global.defaultFontSize / 2) + padding);
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
