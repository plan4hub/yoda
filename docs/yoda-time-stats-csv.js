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
	if ($("#startdate").val() != "") {
		params += "&startdate=" + $("#startdate").val(); 
	}
	if ($("#enddate").val() != "") {
		params += "&enddate=" + $("#enddate").val(); 
	}
	params = addIfNotDefault(params, "interval");	
	params = addIfNotDefault(params, "repo");	
	params = addIfNotDefault(params, "path");
	params = addIfNotDefault(params, "branch");

	params = addIfNotDefault(params, "barsplit");	
	params = addIfNotDefault(params, "other");	
	params = addIfNotDefault(params, "title");
	if ($('#stacked').is(":checked")) {
		params += "&stacked=true";
	}
	if ($('#righttotal').is(":checked")) {
		params += "&righttotal=true";
	}
	
	return params;
}

// ---------------------------------------
// Issues have been retrieved. Time to analyse data and draw the chart.
var bars = [];
function createChart() {
	// Check date fields for possible +/- notations.
	$("#startdate").val(yoda.handleDateDelta($("#startdate").val()));
	$("#enddate").val(yoda.handleDateDelta($("#enddate").val()));

	if ($('#stacked').is(":checked")) {
		stacked = true;
	} else {
		stacked = false;
	}
	
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
	if (interval == "" || parseInt(interval) == 0) {
		yoda.showSnackbarError("Interval cannot be empty or zero", 3000);
		return;
	}

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

	var barSplit = $("#barsplit").val();
	console.log("Label split: " + barSplit);
	
	// If we don't split bars, then we'll put in Other. If Other has no value, put Total.
	if (barSplit == "" && $("#other").val() == "")
		$("#other").val("Total");
	
	// Label magic (splitting based on label split filter, if specified)
	// Let's build a map of labels
	// Let's see if this look like a regular expression, or if it is simply a list of labels with , between.
	bars = [];
	barsIds = [];

	if (barSplit != "" && issues[0][barSplit] != undefined) {
		console.log("Splitting by field: " + barSplit);
		for (var i = 0; i < issues.length; i++) {
			v = issues[i][barSplit];
			if (bars.indexOf(v) == -1)
				bars.push(v);
		}
		bars.sort();
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

	// We want to count entries based on a given date.  
	dateField ="scanDate";

	// TBD: Need to rebuild a list of scans with a date index in order. This will allow us to choose the right dates...
	var matchFields = ["Family", "Product", "Repository", "Tool"];
	var scans = [];
	// We will simply represent the scans by putting one of the issues. If not there. (we may decide maybe to add a counter)
	for (var i = 0; i < issues.length; i++) {
		var mText = "";
		for (var m = 0; m < matchFields.length; m++) {
			mText += issues[i][matchFields[m]] + ",";
		}
		if (scans.find(element => element.mText == mText && element.date == issues[i][dateField]) == undefined)
			scans.push({date: issues[i][dateField], mText: mText});
	}
	scans.sort(function(a, b) { if (a.date < b.date) return -1; else return 1;});
	console.log("# of unique scans: " + scans.length);
	
	// date loop
	// Start at startDate
	// Need to consider previous date, so that we can observe interval. Go back one interval
    var previousDate = new Date(startDate);
    var startDay = previousDate.getDate(); // Hack, need to keep startDay when advancing using month (m) syntax.
    yoda.advanceDate(previousDate, "-" + interval, startDay);
    console.log("Initial previousDate: " + previousDate);
	for (var date = new Date(startDate); date <= endDate; previousDate = new Date(date), yoda.advanceDate(date, interval, startDay)) {
		console.log("Date: " + date + ", previousDate: " + previousDate);
		date.setHours(23);
		date.setMinutes(59);
		date.setSeconds(59);
		
		dateArray.push(yoda.formatDate(date));
		
		// Prepare data array
		var dataArrayForDay = new Array(bars.length);
		for (var l=0; l<bars.length; l++) {
			dataArrayForDay[l] = 0;
		};
		var otherForDay = 0;
		var totalForDay = 0;
		var totalAlways = 0;
		
		// Ok, now let's count issues
		for (var i=0; i < issues.length; i++) {
			// TOTO: skip issue if it does not meet TBD filtering criteria. We will do this later.
			
			// We need to select the most recent based on date, but ignore later/others. TBD
			issueDate = new Date(issues[i][dateField]);
			if (issueDate > date) {
				// report is later
				continue;
			}

			var mText = "";
			for (var m = 0; m < matchFields.length; m++) {
				mText += issues[i][matchFields[m]] + ",";
			}
			var sIndex = scans.find(element => element.mText == mText && element.date == issues[i][dateField]);
			// Right. We found the report that the issue belongs to. Now the question(s) is if there are more recent reports
			// which are still done before (or on) this date. If so, skip issue.
			if (scans.find((element, index) => element.mText = mText && index > sIndex && element.date <= date) != undefined)
				continue;
			
			
			totalAlways++;
			foundBar = false;

			// Let's find the right bar'
			if (bars.length > 0) {
				var index = bars.indexOf(issues[i][barSplit]);
				if (index != -1) {
					// Got a match. Make sure we don't continue search
					// All other.. 
					dataArrayForDay[index] = dataArrayForDay[index] + 1;
					totalForDay++;
					foundBar = true;
				}
			}

			if (foundBar == false && $("#other").val() != "") {
				otherForDay++;
				totalForDay++;
			}
		}
		
		// Normal, i.e. not duration
		// We will push data to the data array
		for (var i=0; i < bars.length; i++) {
			dataArray[i].push(dataArrayForDay[i]); 
		}
		otherArray.push(otherForDay);
		
//		console.log(dataArrayForDay);
		totalArray.push(totalForDay);
		totalAlwaysArray.push(totalAlways);
	}
	
	// Ready, let's push the bars
	var datasetArray = [];
	for (var b = 0; b < bars.length; b++) {
		// Here, we want to try again with the regular expression to see if we can come up with a better name for the bar into the legend.
		actualBar = bars[b];
		
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

	// What should we put on right axis
	if (rightTotal) {
		// Normal case. Right total line against right axis.
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
	
	var chartScales = {
			yAxes: [{
				scaleLabel: {
					display: true,
					labelString: "# vulnerabilities",
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
	
	// Add second axis.
	if ((bars.length > 0 && stacked == false) || rightTotal) {
		chartScales.yAxes.push({    
			scaleLabel: {
				display: true,
				labelString: "Total vulnerabilities",
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
	
	var chartTitle = "Plot of " + $("#path").val();
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

// repo=orchestration&path=Security_report_aggregator/aggregation/globalReport.csv&branch=49_full_maven_security_report_collector
issues = [];
function readCSV() {
	console.log("readCSV");
	yoda.getGitFile($("#owner").val(), $("#repo").val(), $("#path").val(), $("#branch").val(), function(data) {
		config = {
//			quotes: false,
//			quoteChar: '"',
//			delimiter: $("#csvDelimiter"),
			header: true,
//			newline: "\r\n"
		};

		// Convert to CSV, the download
		issues = Papa.parse(data, config).data;
		
		if (issues.length == 0)
			console.log("Empty CSV file / wrong format");
		else {
			console.log("Read CSV file. No entries: " + issues.length);
			$("#entries").val(issues.length);
			console.log("Sample issue");
			console.log(issues[0]);
		}
	}, function(err) {
		console.log("ERROR: " + err);
	});
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
                 // Draw the text in black (line) or whitish (bar) with the specified font
            	 if (dataset.type == "bar" && stacked == true)
            		 ctx.fillStyle = 'rgb(255, 255, 255)';
            	 else
            		 ctx.fillStyle = 'rgb(0, 0, 0)';
                 ctx.font = Chart.helpers.fontString(Chart.defaults.global.defaultFontSize, Chart.defaults.global.defaultFontStyle, Chart.defaults.global.defaultFontFamily);

	             // Just naively convert to string for now
	             if (typeof(dataset.data[index]) == "number") {
					// Make sure we do rounding if we have to.
					var dataString = dataset.data[index].toFixed().toString();						
                 } else {
					var dataString = dataset.data[index].toString();	
				 } 

                 // Make sure alignment settings are correct
                 ctx.textAlign = 'center';
                 ctx.textBaseline = 'middle';

                 var padding = 5;
                 var position = element.tooltipPosition();

            	 // Don't draw zeros in stacked bar chart
            	 if (!(dataset.type == "bar" && stacked == true && dataset.data[index] == 0)) { 
            		 if (stacked == false || dataset.type == "line") { 
            			 // Label above bar
            			 ctx.fillText(dataString, position.x, position.y - (Chart.defaults.global.defaultFontSize / 2) - padding);
            		 } else {
            			 // Label inside bar ... gives a bit of trouble at buttom... 
            			 ctx.fillText(dataString, position.x, position.y + (Chart.defaults.global.defaultFontSize / 2) + padding);
            		 }
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
