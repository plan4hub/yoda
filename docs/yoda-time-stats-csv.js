//  Copyright 2018-2023 Hewlett Packard Enterprise Development LP
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

import * as yoda from './yoda-utils.js'

// Don't like it, but hey
var issues = []; 
var bars = []; 

function getUrlParams() {
	var params = "owner=" + $("#owner").val();

	["startdate", "enddate", "interval", "maxage", "repo", "path", "branch", "datecolumn", "axiscolumn", "groupcolumns", "barsplit", "countfield", "title", "axiscategory", "stacked", "percentage"].forEach((p) => {
		params = yoda.addIfNotDefault(params, p); });
	var filters = getFilters();
	if (filters.length > 0)
		params += "&filters=" + JSON.stringify(filters);
	
	return params;
}

function sevSort(arr) {
	var sevOrder = ["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO"];
	arr.sort(function (a, b) {
		if (sevOrder.indexOf(a) == -1 && sevOrder.indexOf(b) == -1)
			return (a < b);
		if (sevOrder.indexOf(a) == -1 && sevOrder.indexOf(b) != -1)
			return 1;
		if (sevOrder.indexOf(a) != -1 && sevOrder.indexOf(b) == -1)
			return -1;
		return (sevOrder.indexOf(a) - sevOrder.indexOf(b));
	});
}

// Sorts bars, but take special attention to Severity sorting
function barSort() {
	var barSplit = $("#barsplit").val();

	// Special sorting for severities
	if (barSplit == "Severity") 
		sevSort(bars);
	else
		bars.sort();
	console.log("Sorted bars:");
	console.log(bars);
}

// ---------------------------------------
// Issues have been retrieved. Time to analyse data and draw the chart.
function createChart() {
	if ($('#axiscolumn').val() != "") 
		return createChartNonDate();
	
	// Check date fields for possible +/- notations.
	$("#startdate").val(yoda.handleDateDelta($("#startdate").val()));
	$("#enddate").val(yoda.handleDateDelta($("#enddate").val()));

	var maxAge = $('#maxage').val();
	var axisCategory = $('#axiscategory').val();
	
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
	if (startDateString == "") 
		var startDate = yoda.twoMonthsEarlier(interval, today);
	else
		var startDate = new Date(startDateString);
	console.log("Start date: " + startDate);
	
	var endDateString = $("#enddate").val();
	if (endDateString == "") 
		var endDate = new Date(today);
	else
		var endDate = new Date(endDateString);
	console.log("End date: " + endDate);
	endDate.setHours(23);
	endDate.setMinutes(59);
	endDate.setSeconds(59);

	const barSplit = $("#barsplit").val();
	console.log("Label split: " + barSplit);

	const countField = $("#countfield").val();
	
	// Let's get the filters
	var filters = getFilters();
	
	// Label magic (splitting based on label split filter, if specified)
	// Let's build a map of labels
	// Let's see if this look like a regular expression, or if it is simply a list of labels with , between.
	bars = [];

	if (barSplit != "" && issues[0][barSplit] != undefined) {
		console.log("Splitting by field: " + barSplit);
		for (var i = 0; i < issues.length; i++) {
			if (!filterIssue(filters, issues[i]))
				continue;

			if (countField != "" && parseInt(issues[i][countField]) == 0)
				continue;
			
			var v = issues[i][barSplit];
			if (bars.indexOf(v) == -1)
				bars.push(v);
		}
		barSort();
	}
		
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
	for (i = 0; i < dataArray.length; i++)
		dataArray[i] = new Array();
	var totalArray = [];

	// For security reports, we will be targetting the following fields.

	// We want to count entries based on a given date.
	const dateColumn = $("#datecolumn").val();
	console.log("dateColumn: " + dateColumn);
	
	var groupColumns = $("#groupcolumns").val().split(",");
	console.log("Group:");
	console.log(groupColumns);
	
	// scans is a double linked array, indexed by mText.. Add to that then the dates.
	var scans = [];
	for (var i = 0; i < issues.length; i++) {
		var mText = "";
		for (var m = 0; m < groupColumns.length; m++)
			mText += issues[i][groupColumns[m]] + ",";
		if (scans[mText] == undefined)
			scans[mText] = [];
		if (scans[mText].findIndex(element => element.date == issues[i][dateColumn]) == -1) 
			scans[mText].push({date: issues[i][dateColumn]});
	}
	for (const s in scans)
		scans[s].sort(function(a, b) { if (a.date < b.date) return -1; else return 1;});
	
	// date loop
	// Start at startDate
	// Need to consider previous date, so that we can observe interval. Go back one interval
    var previousDate = new Date(startDate);
    var startDay = previousDate.getDate(); // Hack, need to keep startDay when advancing using month (m) syntax.
    yoda.advanceDate(previousDate, "-" + interval, startDay);
    console.log("Initial previousDate: " + previousDate);
	for (var date = new Date(startDate); date <= endDate; previousDate = new Date(date), yoda.advanceDate(date, interval, startDay)) {
		date.setHours(23);
		date.setMinutes(59);
		date.setSeconds(59);
		var dateString = yoda.formatDate(date);
		console.log("Date: " + date + ", previousDate: " + previousDate + ", dateString: " + dateString);
		
		dateArray.push(yoda.formatDate(date));
		
		// Prepare data array
		var dataArrayForDay = new Array(bars.length);
		for (var l=0; l<bars.length; l++)
			dataArrayForDay[l] = 0;
		var totalForDay = 0;
		
		// Ok, now let's count issues
		for (var i=0; i < issues.length; i++) {
			if (!filterIssue(filters, issues[i]))
				continue;
				
			// Let's see if we should add just 1 for the entry, or if there is a count field
			var count = 1;
			if (countField != "")
				count = parseInt(issues[i][countField]);
			
			// Is issue reported after current date. If so, skip immediately
			if (issues[i][dateColumn] > dateString)
				continue;

			var mText = "";
			for (var m = 0; m < groupColumns.length; m++)
				mText += issues[i][groupColumns[m]] + ",";
			var sIndex = scans[mText].findIndex(element => element.date == issues[i][dateColumn]);
			if (sIndex == -1) {
				console.log("AHHHH. Could not find scan report. That is bad: i=" + i);
				console.log(issues[i]);
				return;
			}
			// Right. We found the report that the issue belongs to. Now the question(s) is if there are more recent reports
			// which are still done before (or on) this date. If so, skip issue.
//			console.log("Found scan: " + sIndex);
			if (scans[mText].findIndex((element, index) => index > sIndex && element.date <= dateString) != -1) {
//				console.log("Ignoring issue from date. " + issues[i][dateColumn]);
				continue;
			}
			
			// We now know that this issue is part of most recent scanReport (done for this category). However, the scan report 
			// could be REALLY OLD. In this case, we want to ignore as well.
			const issueDate = new Date(issues[i][dateColumn]);
			var issueAge = (date.getTime() - issueDate.getTime()) /(24*3600*1000);
			if (issueAge > maxAge) {
//  				console.log("Ignoring issue due to age in days: " + issueAge);
				continue;
			}
			
			totalForDay += count;
			// Let's find the right bar.
			if (bars.length > 0) {
				var index = bars.indexOf(issues[i][barSplit]);
				if (index != -1) {
					// Got a match. Make sure we don't continue search
					dataArrayForDay[index] = dataArrayForDay[index] + count;
				}
			} 
		}
		
		// Are we doing percentages?
		if (percentage.checked) {
			var total = 0;
			// Percentage. Let's first calc total.
			for (var i=0; i < bars.length; i++)
				total += dataArrayForDay[i];   
							
			for (var i=0; i < bars.length; i++)
				dataArray[i].push((100.0 * dataArrayForDay[i] / total).toFixed(1));
		} else {
			// Normal case			
			// We will push data to the data array
			for (var b=0; b < bars.length; b++)
				dataArray[b].push(dataArrayForDay[b]); 
		}
		
//		console.log(dataArrayForDay);
		totalArray.push(totalForDay);
	}
	
	// Ready, let's push the bars. If we don't have any bars, let's use the total bar.
	var datasetArray = [];
	if (bars.length > 0) {
		for (var b = 0; b < bars.length; b++) {
			// Here, we want to try again with the regular expression to see if we can come up with a better name for the bar into the legend.
			datasetArray.push({
				type : 'bar',
				label : bars[b],
				yAxisID: "yleft",
				fill : false,
				data : dataArray[b],
				backgroundColor : yoda.barColors[b],
				order: 1
			});
		}
	} else {
		// Just make a bar from the total
		datasetArray.push({
			type : 'bar',
			label : 'Total',
			yAxisID: "yleft",
			fill : false,
			data : totalArray,
			backgroundColor : yoda.barColors[0],
			order: 1
		});
	}

	// Total line
	console.log("BAR LENGTH " + bars.length)
	if (!percentage.checked && bars.length > 1) {
		if (!stacked.checked) {
			// Normal case. Right total line against right axis.
			datasetArray.push({
				type : 'line',
				label : 'Total',
				fill : false,
				yAxisID: "yright",
				data : totalArray,
				lineTension: 0,
				borderColor: yoda.getColor("lineBackground")
			});
		} else {
			datasetArray.push({
				type : 'line',
				label : 'Total',
				fill : false,
				yAxisID: "yleft",
				data : totalArray,
				lineTension: 0,
				borderColor: yoda.getColor("lineBackground")
			});
		}
	} 
	
	// We will push data to a 
	var chartData = {
			labels : dateArray,
			datasets : datasetArray
	};

	console.log(chartData);
	
	var chartScales = {
		yleft: {
			title: {
				display: true,
				text: percentage.checked?"Relative Percentage: " +axisCategory: ("# " + axisCategory),
				font: {
	           		size: 16                    
				}
			},
			stacked: stacked.checked,
			position: "left",
			ticks: {
				beginAtZero: true
			},
			grid: {
				color: yoda.getColor('gridColor')
			}
		},
		x: {
			stacked: stacked.checked,
			grid: {
				color: yoda.getColor('gridColor')
			}
		}
	};
	
	// If percentage scale, make sure we go only to 100
	if (percentage.checked)
		chartScales.yleft.max = 100;

	
	// Add second axis.
	if ((bars.length > 1 && !stacked.checked && !percentage.checked)) {
		chartScales["yright"] = {    
			title: {
				display: true,
				text: "Total " + axisCategory,
				font: {
	           		size: 16                    
				}
			},
			position: "right",
			ticks: {
				beginAtZero: true
			},
			grid: {
				display: false
			}
		};		
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
			plugins: {
				title : {
					display : true,
					text : chartTitle,
					font: {
		           		size: 20                    
					}
				}
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

// NonDate versions. We neeed to plot all values.
function createChartNonDate() {
	var axisCategory = $('#axiscategory').val();
	var axisColumn = $('#axiscolumn').val();

	const barSplit = $("#barsplit").val();
	console.log("Label split: " + barSplit);

	const countField = $("#countfield").val();
	
	// Let's get the filters
	var filters = getFilters();
	
	// Label magic (splitting based on label split filter, if specified)
	// Let's build a map of labels
	// Let's see if this look like a regular expression, or if it is simply a list of labels with , between.
	bars = [];

	if (barSplit != "" && issues[0][barSplit] != undefined) {
		console.log("Splitting by field: " + barSplit);
		for (var i = 0; i < issues.length; i++) {
			if (!filterIssue(filters, issues[i]))
				continue;

			if (countField != "" && parseFloat(issues[i][countField]) == 0)
				continue;
			
			const v = issues[i][barSplit];
			if (bars.indexOf(v) == -1)
				bars.push(v);
		}
	}
	barSort();

	// We will be looping through the issues (entries) of the CSV file. 
	const axisValue = "";
	var axisArray = [];
	var dataArray = new Array(bars.length);
	for (var l = 0; l < bars.length; l++)
		dataArray[l] = [];

	var totalArray = [];
	//  First run - create axisArray and prepare for values.
	for (var i = 0; i < issues.length; i++) {
		if (!filterIssue(filters, issues[i]))
			continue;
			
		const axisValue = issues[i][axisColumn];
		const axisIndex = axisArray.indexOf(axisValue);
		if (axisIndex == -1) {
			// New axis entry
			axisArray.push(axisValue);
			for (var l=0; l<bars.length; l++)
				dataArray[l].push(0);
			totalArray.push(0);
		}
	}
	
	// Sort? If severity, then yes.
	if (axisColumn == "Severity") 
		sevSort(axisArray);
	
	// Second run. Add data
	for (var i = 0; i < issues.length; i++) {
		if (!filterIssue(filters, issues[i]))
			continue;
			
		const axisValue = issues[i][axisColumn];
		const axisIndex = axisArray.indexOf(axisValue);

		// Let's add to the relevant bars.
		for (var l = 0; l < bars.length; l++) {
			if (bars[l] == issues[i][barSplit]) 
				dataArray[l][axisIndex] = dataArray[l][axisIndex] + (countField == ""? 1: parseFloat(issues[i][countField]));
		}
		totalArray[axisIndex] = totalArray[axisIndex] + (countField == ""? 1: parseFloat(issues[i][countField]));
	}

	// Percentage? If so, we need to adjust all values.
	if (percentage.checked) {
		for (var ai = 0; ai < totalArray.length; ai++) {
			for (var l = 0; l < bars.length; l++) 
				dataArray[l][ai] = (100.0 * dataArray[l][ai] / totalArray[ai]).toFixed(1); 
			totalArray[ai] = 100.0;
		}
	}
	
	var datasetArray = [];
	// Ready, let's push the bars. If we don't have any bars, let's use the total bar.
	if (bars.length > 0) {
		for (var b = 0; b < bars.length; b++) {
			datasetArray.push({
				type : 'bar',
				label : bars[b],
				yAxisID: "yleft",
				fill : false,
				data : dataArray[b],
				backgroundColor : yoda.barColors[b],
				order: 1
			});
		}
	} else {
		// Just make a bar from the total
		datasetArray.push({
			type : 'bar',
			label : 'Total',
			yAxisID: "yleft",
			fill : false,
			data : totalArray,
			backgroundColor : yoda.barColors[0],
			order: 1
		});
	}

	// We will push data to a 
	var chartData = {
			labels : axisArray,
			datasets : datasetArray
	};
	
	var chartScales = {
		yleft: {
			title: {
				display: true,
				text: percentage?"Relative Percentage: " +axisCategory: axisCategory,
				font: {
	           		size: 16                    
				}
			},
			stacked: stacked.checked,
			position: "left",
			ticks: {
				beginAtZero: true
			},
			grid: {
				color: yoda.getColor('gridColor')
			}
		},
		x: {
			stacked: stacked.checked,
			grid: {
				color: yoda.getColor('gridColor')
			}
		}
	};
	
	// If percentage scale, make sure we go only to 100
	if (percentage.checked)
		chartScales.yleft.max = 100;
	
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
			plugins: {
				title : {
					display : true,
					text : chartTitle,
					font: {
		           		size: 20                    
					}
				}
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


var firstFilterUpdate = true;
function updateFilterColumns() {
	var filters = JSON.parse(yoda.decodeUrlParam(null, "filters"));
	// Let's start by clearing filters
	$("#filters").val(null).empty();
	
	// Let's update the filters based on the columns
	var columns = Object.keys(issues[0]);
	for (var c = 0; c < columns.length; c++) {
		if (columns[c] == $("#datecolumn").val() || columns[c] == "count")
			continue;

		if (firstFilterUpdate && filters != null && filters.findIndex(element => element.id == columns[c]) != -1) {
			var newOption = new Option(columns[c], columns[c], true, true);
			$("#filters").append(newOption);			
			var i = filters.findIndex(element => element.id == columns[c]);
			addFilter(columns[c], filters[i].values);
		} else {
			var newOption = new Option(columns[c], columns[c], false, false);
			$("#filters").append(newOption);			
		}
		
	}
	$("#filters").trigger('change');
	firstFilterUpdate = false;
}

function addFilter(column, selectedValues) {
	const columnId = column.replace(/ /g,"_");

	console.log("Add filter column: " + column);
	console.log(selectedValues);
	if (selectedValues == undefined)
		selectedValues = [];
	var ff = document.getElementById("filterframe");
	
//		<div class="field">
//			<label>Filters</label>
//			<select id="filters" style="width: 350px" class="select2" multiple></select>
//			<span class="tooltip">Columns to filter</span>
//		</div>
	var div = document.createElement("div");
	div.className = "field";
	div.id = "f-" + columnId;
	
	var label = document.createElement("label");
	label.innerText = column + " filter";
	div.appendChild(label);
	
	var select = document.createElement("select");
	select.id = "sel-" + columnId;
	select.class = "select2 colfilter";
	select.style = "width: 300px";
	select.multiple = true;
	div.appendChild(select);
	
	ff.appendChild(div);
	$("#sel-" + columnId).select2({
		sorter: yoda.select2Sorter,
	    matcher: yoda.select2Matcher
	});
	
	// Now, add the possible values.
	var values = [];
	for (var i = 0; i < issues.length; i++) {
		var v = issues[i][column];
		if (v == undefined || v == "")
			continue;
		if (values.indexOf(v) == -1) {
			values.push(v);
			
			if (selectedValues.indexOf(v) != -1)
				var newOption = new Option(v, v, true, true);
			else
				var newOption = new Option(v, v, false, false);
			$("#sel-" + columnId).append(newOption);		
		}
	}
	$("#sel-" + columnId).trigger('change');	
	$("#sel-" + columnId).on('select2:select', yoda.select2SelectEvent("#sel-" + columnId));
} 

function removeFilter(column) {
	console.log("Remove filter column: " + column);
	const columnId = column.replace(/ /g,"_");
	
	var ff = document.getElementById("f-" + columnId);
	if (ff != null)
		ff.remove();
} 

function removeAllFilters() {
	if (issues.length > 0) {
		var columns = Object.keys(issues[0]);
		for (var c = 0; c < columns.length; c++)
			removeFilter(columns[c]); // Surely, most will not be there. But that is ok.
	}
}

// $("#sel-Product").find(':selected')[0].value
function getFilters() {
	var filterArray = [];
	// First, we need to get the filters. They all have the "colfilter" class
	var selectDoms = document.getElementsByTagName("SELECT");
	for (var f = 0; f < selectDoms.length; f++) {
		var sel = selectDoms[f];
		if (sel.id.startsWith("sel-")) {
			var selections = $("#" + sel.id).find(":selected");
			var values = [];
			for (var s = 0; s < selections.length; s++)
				values.push(selections[s].value);
			if (values.length > 0)  // Ignore of nothing is selected. That filter would be stupid, as it would just discard everything.
				filterArray.push({id: selectDoms[f].id.substr(4).replace(/_/g," "), values: values});
		}
	} 
	console.log(filterArray);
	return filterArray;
}

// Based on filter (as retrieved by getFilters) 
function filterIssue(filters, issue) {
	// Loop filters. For each filter, we evaluate OR (i.e. need at least match for one of the values) and across filters we do AND (match have to be in all)
	for (var f = 0; f < filters.length; f++) {
		var filterOk = false; // Need to find at least one match
		for (var v = 0; v < filters[f].values.length; v++) {
			if (issue[filters[f].id] == filters[f].values[v]) {
				filterOk = true;
				break;
			}
		}
		if (!filterOk)
			return false;
	}
	return true;
}

var firstBarUpdate = true;
function updateBarSplit() {
	$("#barsplit").val(null).empty();
	
	// We need to include a blank for the first option. Otherwise, the first option will be selected per default.
	var newOption = new Option("", "", true, true);
	$("#barsplit").append(newOption);			
	
	var barSplit = yoda.decodeUrlParam(null, "barsplit");
	var columns = Object.keys(issues[0]);
	for (var c = 0; c < columns.length; c++) {
		if (columns[c] == $("#datecolumn").val() || columns[c] == "count")
			continue;

		// Must NOT be an integer field
		// Hmm... versions are like integers.... 
//		if (!isNaN(parseInt(issues[0][columns[c]])))
//			continue;
			
		if (firstBarUpdate && barSplit != null && columns[c] == barSplit) {
			var newOption = new Option(columns[c], columns[c], true, true);
			$("#barsplit").append(newOption);			
		} else {
			var newOption = new Option(columns[c], columns[c], false, false);
			$("#barsplit").append(newOption);			
		}
	}
	$('#barsplit').trigger('change');	
	firstBarUpdate = false;
}

var firstAxisUpdate = true;
function updateAxisColumn() {
	$("#axiscolumn").val(null).empty();
	
	// We need to include a blank for the first option. Otherwise, the first option will be selected per default.
	var newOption = new Option("", "", true, true);
	$("#axiscolumn").append(newOption);			
	
	var axisColumn = yoda.decodeUrlParam(null, "axiscolumn");
	var columns = Object.keys(issues[0]);
	for (var c = 0; c < columns.length; c++) {
		if (columns[c] == $("#datecolumn").val() || columns[c] == "count")
			continue;

		// Must NOT be an integer field
		// Hmm... versions are like integers.... 
//		if (!isNaN(parseInt(issues[0][columns[c]])))
//			continue;
			
		if (firstAxisUpdate && axisColumn != null && columns[c] == axisColumn) {
			var newOption = new Option(columns[c], columns[c], true, true);
			$("#axiscolumn").append(newOption);			
		} else {
			var newOption = new Option(columns[c], columns[c], false, false);
			$("#axiscolumn").append(newOption);			
		}
	}
	$('#axiscolumn').trigger('change');	
	firstAxisUpdate = false;
}


var firstCountUpdate = true;
function updateCountField() {
	$("#countfield").val(null).empty();
	
	// We will include blank option. This means 
	var newOption = new Option("", "", true, true);
	$("#countfield").append(newOption);			
	
	var countField = yoda.decodeUrlParam(null, "countfield");
	var columns = Object.keys(issues[0]);
	for (var c = 0; c < columns.length; c++) {
		if (columns[c] == $("#datecolumn").val())
			continue;
			
		// Must be an integer field
		if (isNaN(parseInt(issues[0][columns[c]])))
			continue;
		
		if (firstCountUpdate && ((countField != null && columns[c] == countField) || (countField == null && columns[c] == "count"))) {
			var newOption = new Option(columns[c], columns[c], true, true);
			$("#countfield").append(newOption);			
		} else {
			var newOption = new Option(columns[c], columns[c], false, false);
			$("#countfield").append(newOption);			
		}
	}
	$('#countfield').trigger('change');	
	firstCountUpdate = false;
}

// repo=orchestration&path=Security_report_aggregator/aggregation/globalReport.csv&branch=49_full_maven_security_report_collector
var firstCSVRead = true;
function readCSV() {
	removeAllFilters();
	
	console.log("readCSV");
	yoda.getGitFile($("#owner").val(), $("#repo").val(), $("#path").val(), $("#branch").val(), function(data) {
		const config = {
//			quotes: false,
//			quoteChar: '"',
//			delimiter: $("#csvDelimiter"),
			header: true,
//			newline: "\r\n"
		};

		// Convert to CSV, the download
		issues = Papa.parse(data, config).data;
		
		if (issues.length == 0) {
			console.log("Empty CSV file / wrong format");
			yoda.showSnackbarError("Empty CSV file / wrong format", 3000);
		} else {
			var noCols = Object.keys(issues[0]).length;
			console.log("Number of columns: " + noCols);
			// Fix. Remove any trailing issues with different # of columns
			while (issues.length > 0 && Object.keys(issues[issues.length - 1]).length < noCols)
				issues.splice(-1, 1);

			console.log("Read CSV file. No entries: " + issues.length);
			$("#entries").val(issues.length);
			console.log("Sample issue:");
			console.log(issues[0]);
			console.log("Last issue:");
			console.log(issues[issues.length - 1]);
			
			updateBarSplit();
			updateCountField();
			updateFilterColumns();
			updateAxisColumn();
			
			if (firstCSVRead && yoda.decodeUrlParamBoolean(null, "draw") == "true") {
				setTimeout(createChart, 0);
			}

			firstCSVRead = false;				
		}
	}, function(err) {
		console.log("ERROR: " + err);
		yoda.showSnackbarError("Error retriving CSV file: " + err, 3000);
	});
}

export function init() {
	// Enable yodamenu
	yoda.enableMenu("#csv-statistics-report");

	yoda.getDefaultLocalStorage("#owner", "yoda.owner");
	yoda.getDefaultLocalStorage("#csvdelimiter", "yoda.csvdelimiter");
	yoda.getDefaultLocalStorage("#interval", "yoda.time.interval");
	yoda.getDefaultLocalStorage("#other", "yoda.time.other");

	yoda.decodeUrlParam("#owner", "owner");
	yoda.decodeUrlParam("#repo", "repo");
	yoda.decodeUrlParam("#path", "path");
	yoda.decodeUrlParam("#branch", "branch");
	yoda.decodeUrlParam("#datecolumn", "datecolumn");
	yoda.decodeUrlParam("#axiscolumn", "axiscolumn");

	yoda.decodeUrlParam("#groupcolumns", "groupcolumns");

	yoda.decodeUrlParam("#csvdelimiter", "csvdelimiter");
	yoda.decodeUrlParamDate("#startdate", "startdate");
	yoda.decodeUrlParamDate("#enddate", "enddate");
	yoda.decodeUrlParam("#interval", "interval");
	yoda.decodeUrlParam("#maxage", "maxage");

	yoda.decodeUrlParam("#title", "title");
	yoda.decodeUrlParam("#axiscategory", "axiscategory");
	yoda.decodeUrlParamBoolean("#stacked", "stacked");
	yoda.decodeUrlParamBoolean("#percentage", "percentage");

	// Local storage
	yoda.getUserTokenLocalStorage("#user", "#token");

	// Do it after getting from localStorage
	yoda.decodeUrlParam("#user", "user");
	yoda.decodeUrlParam("#token", "token");

	if (yoda.decodeUrlParam(null, "hideheader") == "true") {
		$(".frame").hide();
	}

	$('#countfield').select2();
	$('#barsplit').select2();
	$('#axiscolumn').select2();
	$('#filters').select2();

	// Login
	console.log("Github authentisation: " + $("#user").val() + ", token: " + $("#token").val());
	yoda.gitAuth($("#user").val(), $("#token").val());

	// Event listeners
	$("#hamburger").on("click", yoda.menuClick);
	$("#owner").on("change", function() { yoda.updateReposAndGUI($("#owner").val(), "#repolist", "repolist", "yoda.repolist"); });
	$("#readcsv").on("click", readCSV);
	$("#drawbutton").on("click", createChart);
	$("#estimateradio").on("click", function(event) { yoda.setEstimateInIssues(event.value); });
	$("#canvas").on("click", function(event) { yoda.chartCSVExport($("#csvdelimiter").val(), event); });

	// ChartJS default stuff
	yoda.registerChartJS();

	$(document).ready(function () {
		// If path is set (via argument), we will assume that we are ready to load CSV and do so directly
		if ($("#path").val() != "")
			readCSV();

		$('#filters').on('select2:select', function (e) {
			addFilter(e.params.data.id);
		});
		$('#filters').on('select2:unselect', function (e) {
			removeFilter(e.params.data.id);
		});

	});

}