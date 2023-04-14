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

function getUrlParams() {
	let params = "owner=" + $("#owner").val();
	if (yoda.decodeUrlParam(null, "repotopic") != null)
		params += "&repotopic=" + yoda.decodeUrlParam(null, "repotopic");
	else
		params += "&repolist=" + $("#repolist").val();
	["labelfilter", "categorysplit", "labelsplit", "other", "title", "stacked", "righttotal", "percentage"].forEach((p) => {
		params = yoda.addIfNotDefault(params, p); });
	if (yoda.getEstimateInIssues() != "inbody")
		params += "&estimate=" + yoda.getEstimateInIssues();

	const countType = $("#countradio input[type='radio']:checked").val();
	if (countType != "noissues")
		params += "&count=" + countType;

	const scope = $("#scoperadio input[type='radio']:checked").val();
	if (scope != "open")
		params += "&scope=" + scope;

	return params;
}

// ---------------------------------------
// Issues have been retrieved. Time to analyse data and draw the chart.
function createChart() {
	// get reference to the issues (not deep copy, so cheap)
	const issues = yoda.getIssues();
	console.log("Got " + issues.length + " issues");

	// Let's do a trick. We will add a synthesized label containing the state.
	for (let i = 0; i < issues.length; i++) 
		issues[i].labels.push({name: 'State - ' + issues[i].state});
	
	// Let's set today as 0:0:0 time (so VERY start of the day)
	let today = new Date();
	today.setHours(0);
	today.setMinutes(0);
	today.setSeconds(0);
	
	console.log("Category split: " + $("#categorysplit").val());
	console.log("Label split: " + $("#labelsplit").val());
	
	const countType = $("#countradio input[type='radio']:checked").val();
	console.log("Count type read: " + countType);

	// Label magic (splitting based on label split filter, if specified)
	// Let's build a map of labels
	// Let's see if this look like a regular expression, or if it is simply a list of labels with , between.
	const [bars, labelSplitUsingRegExp] = yoda.issue_split($("#labelsplit").val(), issues);
	console.log("Bar Labels: " + bars);

	let [categories, categorySplitUsingRegExp] = yoda.issue_split($("#categorysplit").val(), issues);
	if (categories.length == 0)
		categories = ["All Issues"]
	console.log("Category Labels: " + categories);
	
	// Data arrays for issues.
	// 	Data array (two-dimentional) for issues matching the bar labels
	// 	Other for issues not match
	// 	Total for all issues (matching date interval)'
	//  TotalIssues for all issues (this extra total to be used for opened-total and closed-total options).
	let categoryArray = [];
	let dataArray = new Array(bars.length);
	for (let i = 0; i < dataArray.length; i++)
		dataArray[i] = new Array();
	let otherArray = [];
	let totalArray = [];
	let storyPointsPerDayArray = [];
	
	// Loop categories (X axis)
	for (let cat = 0; cat < categories.length; cat++) {
		var category = categories[cat];
		console.log("Category:" + category);
		categoryArray.push(category);
		
		// Prepare data array
		let dataArrayForCat = new Array(bars.length);
		let dataDurationOpenForCat = new Array(bars.length);
		let dataECTDurationForCat = new Array(bars.length);
		for (let l = 0; l < bars.length; l++) {
			dataArrayForCat[l] = 0;
			dataDurationOpenForCat[l] = 0;
			dataECTDurationForCat[l] = 0;
		}
		let otherForCat = 0;
		let totalForCat = 0;
		let otherDurationOpenForCat = 0;
		let otherETCDurationForCat = 0;
		
		// Ok, now let's count issues
		for (let i = 0; i < issues.length; i++) {
			let submitDateString = yoda.createDate(issues[i]);    
			let submitDate = new Date(submitDateString);

			// Issue in this category...  
			let catLabelList = issues[i].labels;
			// Trick: if we have special "repo" text into labelsplit, then we'll create an artificial labellist with just the repo name.
			// This will cause an immediate match.
			if ($("#categorysplit").val() == "repo") 
				catLabelList = [{name: yoda.getUrlRepo(issues[i].url)}];
				
			if (category != "All Issues" && catLabelList.findIndex(label => label.name == category) == -1) 
				continue;

			if (countType == "velocity")
				var issueEstimate = yoda.issueEstimate(issues[i]);

			// Issue in this category...  
			let labelList = issues[i].labels;
			// Trick: if we have special "repo" text into labelsplit, then we'll create an artificial labellist with just the repo name.
			// This will cause an immediate match.
			if ($("#labelsplit").val() == "repo") 
				labelList = [{name: yoda.getUrlRepo(issues[i].url)}];

			// Ok, relevant. Bar splitting logic
			let foundLabel = false;
			const duration = yoda.dateDiff(submitDate, today);
			for (let l = 0; l < labelList.length && foundLabel == false; l++) {
				// Search bars array
				let index = bars.indexOf(labelList[l].name);
				if (index != -1) {
					// Got a match. Make sure we don't continue search
					if (countType == "velocity") {
						dataArrayForCat[index] = dataArrayForCat[index] + issueEstimate;
						totalForCat += issueEstimate;
					} else {
						// All other.. 
						dataArrayForCat[index] = dataArrayForCat[index] + 1;
						totalForCat++;
					}
					foundLabel = true;
					
					// Add the total duration, we will divide by # of issues later.
					dataDurationOpenForCat[index] += duration;
				}
			}

			if (foundLabel == false &&	$("#other").val() != "") {
				if (countType == "velocity") {
					otherForCat += issueEstimate;
					totalForCat += issueEstimate;
				} else {
					otherForCat++;
					totalForCat++;
				}
				
				// Add the total duration, we will divide by # of issues later.
				otherDurationOpenForCat += duration;

				if (countType == "ect") 
					otherETCDurationForCat += yoda.getMilestoneIssueDuration(issues[i]); // cannot be null here;
			}
		}
		
		// Switch to duration?
		if (countType == "durationopen" || countType == "ect") {
			if (countType == "durationopen") {
				// We now need to move to dataArrayForCat to contain instead of the # of issues the averation duration of the open time.
				for (let i = 0; i < bars.length; i++) {
					let average = dataDurationOpenForCat[i] / dataArrayForCat[i];
					dataArray[i].push(average.toFixed(0));
				}
				otherArray.push((otherDurationOpenForCat / otherForCat).toFixed(0));
			} else { 
				// ect
				for (let i = 0; i < bars.length; i++) {
					let average = dataECTDurationForCat[i] / dataArrayForCat[i];
					dataArray[i].push(average.toFixed(0));
				}
				otherArray.push((otherETCDurationForCat / otherForCat).toFixed(0));
			}
		} else {
			// Normal, i.e. not duration
			// We will push data to the data array
			
			// Are we doing percentages?
			if ($("#percentage").is(":checked")) {
				// Percentage. Let's first calc total.
				let total = otherForCat;
				for (let i = 0; i < bars.length; i++)
					total += dataArrayForCat[i];   
							
				for (let i = 0; i < bars.length; i++)  
					dataArray[i].push((100.0 * dataArrayForCat[i] / total).toFixed(1));
				otherArray.push((100.0 * otherForCat / total).toFixed(1));
			} else {			
				// Normal case.			
				for (let i = 0; i < bars.length; i++) 
					dataArray[i].push(dataArrayForCat[i]); 
				otherArray.push(otherForCat);
			}
		}
		
		totalArray.push(totalForCat);
		if (countType == "velocity") 
			storyPointsPerDayArray.push(totalForCat.toFixed(1)); 
	}
	
	// Ready, let's push the bars
	let datasetArray = [];
	for (let b = 0; b < bars.length; b++) {
		// Here, we want to try again with the regular expression to see if we can come up with a better name for the bar into the legend.
		let actualBar = bars[b];
		if (labelSplitUsingRegExp && $("#labelsplit").val().indexOf('(') != -1) {  // We have a parentesis, that means we have to try to change label name.
			let splitReg = new RegExp($("#labelsplit").val());
			actualBar = bars[b].replace(splitReg, '$1');
		}
		
		datasetArray.push({
			type : 'bar',
			label : actualBar,
			fill : false,
			data : dataArray[b],
			backgroundColor : yoda.barColors[b],
			yAxisID: "yleft",
			order: 2
		});
	}

	// Other's bar (if not blank)
	if ($("#other").val() != "") {
		datasetArray.push({
			type : 'bar',
			label : $("#other").val(),
			fill : false,
			data : otherArray,
			yAxisID: "yleft",
//			backgroundColor : 'rgb(191, 191, 191)', // grey'ish
			backgroundColor : 'rgb(200, 191, 231)',
			order: 2
		});
	}

	// What should we put on right axis
	if ($("#righttotal").is(":checked")) {
		if (countType == "velocity") {
			datasetArray.push({
				type : 'line',
				label : 'Story points per day',
				fill : false,
				yAxisID: "yright",
				data : storyPointsPerDayArray,
				lineTension: 0,
				pointRadius: 5,
				pointBackgroundColor: yoda.getColor("lineBackground"), 
				showLine: false,
				order: 1
			});
		} else {
			// Normal case. Right total line against right axis.
			datasetArray.push({
				type : 'line',
				label : 'Total',
				fill : false,
				yAxisID: "yright",
				data : totalArray,
				lineTension: 0,
				pointRadius: 5,
				pointBackgroundColor: yoda.getColor("lineBackground"), 
				showLine: false,
				order: 1
			});
		}
	}
	
	if (categorySplitUsingRegExp && $("#categorysplit").val().indexOf('(') != -1) {  // We have a parentesis, that means we have to try to change label name.
		let splitReg = new RegExp($("#categorysplit").val());
		for (let c = 0; c < categoryArray.length; c++)
			categoryArray[c] = categoryArray[c].replace(splitReg, '$1');
	}

	// We will push data to a 
	let chartData = {
			labels : categoryArray,
			datasets : datasetArray
	};
	
	let leftLabel = [];
	leftLabel["durationopen"] = "Average duration open (days)";
	leftLabel["noissues"] = "No of issues";
	leftLabel["velocity"] = "Story Points";

	let chartScales = {
		yleft: {
			title: {
				display: true,
				text: $("#percentage").is(":checked")? ("Relative Percentage: ") + leftLabel[countType] : leftLabel[countType],
				font: {
					size: 16                    
				}
			},
			stacked: $("#stacked").is(":checked"),
			position: "left",
			ticks: {
				beginAtZero: true
			},
			grid: {
				color: yoda.getColor('gridColor')
			}
		},
		x: {
			stacked: $("#stacked").is(":checked"),
			grid: {
				color: yoda.getColor('gridColor')
			}
		}
	};

	// If percentage scale, make sure we go only to 100
	if ($("#percentage").is(":checked"))
		chartScales.yleft.max = 100;
	
	let rightLabel = [];
	rightLabel["durationopen"] = "Total issues";
	rightLabel["noissues"] = "Total issues";
	rightLabel["velocity"] = "Story points per day";
	
	// Add second axis.
	if ($("#righttotal").is(":checked")) {
		chartScales["yright"] = {    
			title: {
				display: true,
				text: rightLabel[countType],
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

	// DRAW
	let ctx = document.getElementById("canvas").getContext("2d");
	if (window.myMixedChart != null)
		window.myMixedChart.destroy();
	
	let chartTitle = "Github Issues " + $("#owner").val() + "/" + $("#repolist").val();
	if (countType == "velocity") 
		chartTitle = "Story points for " + $("#owner").val() + "/" + $("#repolist").val();
	if ($("#title").val() != "")
		chartTitle = $("#title").val(); 
	
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
				},
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

function startChart() {
	if ($("#repolist").val() == "") 
		yoda.updateGitHubIssuesOrg($("#owner").val(), $("#labelfilter").val(), $("#scoperadio input[type='radio']:checked").val(), createChart, function(errorText) { yoda.showSnackbarError("Error getting issues: " + errorText, 3000);});
	else
		yoda.updateGitHubIssuesRepos($("#owner").val(), $("#repolist").val(), $("#labelfilter").val(), $("#scoperadio input[type='radio']:checked").val(), null, createChart, function(errorText) { yoda.showSnackbarError("Error getting issues: " + errorText, 3000);});
}

// --------------

export function init() {
	// Enable yodamenu
	yoda.enableMenu("#issue-statistics-report");

	yoda.getDefaultLocalStorage("#owner", "yoda.owner");
	yoda.getDefaultLocalStorage("#csvdelimiter", "yoda.csvdelimiter");
	yoda.getDefaultLocalStorage("#labelsplit", "yoda.current.labelsplit");
	yoda.getDefaultLocalStorage("#categorysplit", "yoda.current.categorysplit");
	yoda.getDefaultLocalStorage("#other", "yoda.current.other");
	if ($("#other").val() == "blank")
		$("#other").val("");

	yoda.decodeUrlParam("#owner", "owner");
	yoda.decodeUrlParamRadio("count", "count");

	// repo and repoList handled later, both are supported.
	yoda.decodeUrlParam("#csvdelimiter", "csvdelimiter");
	yoda.decodeUrlParam("#labelfilter", "labelfilter");
	yoda.decodeUrlParam("#categorysplit", "categorysplit");
	yoda.decodeUrlParam("#labelsplit", "labelsplit");
	yoda.decodeUrlParam("#other", "other");
	yoda.decodeUrlParam("#title", "title");
	yoda.decodeUrlParamBoolean("#stacked", "stacked");
	yoda.decodeUrlParamBoolean("#righttotal", "righttotal");
	yoda.decodeUrlParamBoolean("#percentage", "percentage");

	yoda.decodeUrlParamRadio("estimate", "estimate");
	yoda.updateEstimateRadio();

	yoda.decodeUrlParamRadio("scope", "scope");

	// Local storage
	yoda.getUserTokenLocalStorage("#user", "#token");

	// Do it after getting from localStorage
	yoda.decodeUrlParam("#user", "user");
	yoda.decodeUrlParam("#token", "token");

	if (yoda.decodeUrlParam(null, "hideheader") == "true")
		$(".frame").hide();

		// Login
	console.log("Github authentisation: " + $("#user").val() + ", token: " + $("#token").val());
	yoda.gitAuth($("#user").val(), $("#token").val());

	// Event listeners
	$("#hamburger").on("click", yoda.menuClick);
	$("#owner").on("change", function() { yoda.updateReposAndGUI($("#owner").val(), "#repolist", "repolist", "yoda.repolist"); });
	$("#drawbutton").on("click", startChart);
	$("#estimateradio").on("click", function(event) { yoda.setEstimateInIssues(event.value); });
	$("#canvas").on("click", function(event) { yoda.chartCSVExport($("#csvdelimiter").val(), event); });

	// ChartJS default stuff
	yoda.registerChartJS();

	$(document).ready(function () {
		$('#repolist').select2({
			sorter: yoda.select2Sorter,
			matcher: yoda.select2Matcher
		});
		$('#repolist').on('select2:select', yoda.select2SelectEvent('#repolist'));

		// Rather complex updating of the defaults repos. Once complete, check if we should draw.
		yoda.updateReposAndGUI($("#owner").val(), "#repolist", "repolist", "yoda.repolist", function () {
			// Should we draw directly? Only check this after the repo updates complete.
			if (yoda.decodeUrlParamBoolean(null, "draw") == "true")
				startChart();
		}, null);
	});
}