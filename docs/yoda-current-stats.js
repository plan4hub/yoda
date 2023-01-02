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
	params = addIfNotDefault(params, "labelfilter");	
	params = addIfNotDefault(params, "categorysplit");	
	params = addIfNotDefault(params, "labelsplit");	
	params = addIfNotDefault(params, "other");	
	params = addIfNotDefault(params, "title");
	if ($('#stacked').is(":checked")) {
		params += "&stacked=true";
	}
	if ($('#history').is(":checked")) {
		params += "&history=true";
	}
	if (!($('#righttotal').is(":checked"))) {
		params += "&righttotal=false";
	}
	if ($('#percentage').is(":checked")) {
		params += "&percentage=true";
	}

	if (yoda.getEstimateInIssues() != "inbody")
		params += "&estimate=" + yoda.getEstimateInIssues();

	var countType = $("#countradio input[type='radio']:checked").val();
	if (countType != "noissues") {
		params += "&count=" + countType;
	}
	
	return params;
}

function estimateClick(radio) {
	yoda.setEstimateInIssues(radio.value);
}

// Common function to be used for determing issues splitting for both category and bars. 
function issue_split(labelSplit) {
	var bars = new Array();
	
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
	return [bars, labelSplitUsingRegExp]
}

// ---------------------------------------
// Issues have been retrieved. Time to analyse data and draw the chart.
function createChart() {
	if ($('#righttotal').is(":checked")) {
		var rightTotal = true;
	} else {
		var rightTotal = false;
	}
	
	if ($('#percentage').is(":checked")) {
		var percentage = true;
	} else {
		var percentage = false;
	}
	
	// Let's set today as 0:0:0 time (so VERY start of the day)
	var today = new Date();
	today.setHours(0);
	today.setMinutes(0);
	today.setSeconds(0);
	
	var categorySplit = $("#categorysplit").val();
	console.log("Category split: " + categorySplit);

	var labelSplit = $("#labelsplit").val();
	console.log("Label split: " + labelSplit);
	
	var temp = $("#countradio input[type='radio']:checked");
	if (temp.length > 0) {
	    var countType = temp.val();
	}
	console.log("Count type read: " + countType);
	console.log("Got " + issues.length + " issues");
//	console.log(issues);

	// Label magic (splitting based on label split filter, if specified)
	// Let's build a map of labels
	// Let's see if this look like a regular expression, or if it is simply a list of labels with , between.
	[bars, labelSplitUsingRegExp] = issue_split(labelSplit);
	console.log("Bar Labels: " + bars);

	[categories, categorySplitUsingRegExp] = issue_split(categorySplit);
	console.log("Category Labels: " + categories);
	
	// Besides the bars for the data identified, possibly none if no label split, we will maintain
	// 1. A bar chart for others (i.e. issues not having labels matching the ones identified
	// 2. A line for total # issues (only if we have splitting)
	
	// Data arrays for issues.
	// 	Data array (two-dimentional) for issues matching the bar labels
	// 	Other for issues not match
	// 	Total for all issues (matching date interval)'
	//  TotalIssues for all issues (this extra total to be used for opened-total and closed-total options).
	var categoryArray = [];
	var dataArray = new Array(bars.length);
	for (i = 0; i < dataArray.length; i++) {
		dataArray[i] = new Array();
	}
	var otherArray = [];
	var totalArray = [];
	var totalAlwaysArray = [];
	var storyPointsPerDayArray = [];
	
	// Loop categories (X axis)
	for (var cat = 0; cat < categories.length; cat++) {
		category = categories[cat];
		console.log("Category:" + category);
		categoryArray.push(category);
		
		// Prepare data array
		var dataArrayForCat = new Array(bars.length);
		var dataDurationOpenForCat = new Array(bars.length);
		var dataECTDurationForCat = new Array(bars.length);
		for (var l=0; l<bars.length; l++) {
			dataArrayForCat[l] = 0;
			dataDurationOpenForCat[l] = 0;
			dataECTDurationForCat[l] = 0;
		};
		var otherForCat = 0;
		var totalForCat = 0;
		var otherDurationOpenForCat = 0;
		var otherETCDurationForCat = 0;
		var totalAlways = 0;
		
		var today = new Date();
		today.setHours(0);
		today.setMinutes(0);
		today.setSeconds(0);

		// Ok, now let's count issues
		for (var i=0; i < issues.length; i++) {
			// Already used?  THIS IS QUESTIONABLE..... TURNING OFF FOR NOW
//			if (issues[i]["used"] != undefined)
//				continue;
				
			var submitDateString = yoda.createDate(issues[i]);    
			var submitDate = new Date(submitDateString);

			// Issue in this category...  
			var catLabelList = issues[i].labels;
			// Trick: if we have special "repo" text into labelsplit, then we'll create an artificial labellist with just the repo name.
			// This will cause an immediate match.
			if (categorySplit == "repo") 
				catLabelList = [{name: yoda.getUrlRepo(issues[i].url)}];
				
			if (catLabelList.findIndex(label => label.name == category) == -1) 
				continue;

			// Ok, that matches this category. That is nice. Let's mark it with used so as to avoid to have it into several categories.
			issues[i]["used"] = true
			totalAlways++;
			
			if (countType == "velocity") {
				issueEstimate = yoda.issueEstimate(issues[i]);
//				console.log("Estimate for issue: " + issueEstimate);
			}

			// Issue in this category...  
			var labelList = issues[i].labels;
			// Trick: if we have special "repo" text into labelsplit, then we'll create an artificial labellist with just the repo name.
			// This will cause an immediate match.
			if (labelSplit == "repo") 
				labelList = [{name: yoda.getUrlRepo(issues[i].url)}];

			// Ok, relevant. Bar splitting logic
			var foundLabel = false;
			for (l = 0; l < labelList.length && foundLabel == false; l++) {
				var labelName = labelList[l].name;
				// Search bars array
				var index = bars.indexOf(labelName);
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
					var duration = yoda.dateDiff(submitDate, today);
					dataDurationOpenForCat[index] += duration;
				}
			}
			if (foundLabel == false &&	$("#other").val() != "") {
//				console.log("Could not find label for issue " + issues[i].url);
//				console.log(labelList);
				
				if (countType == "velocity") {
					otherForCat += issueEstimate;
					totalForCat += issueEstimate;
				} else {
					otherForCat++;
					totalForCat++;
				}
				
				// Add the total duration, we will divide by # of issues later.
				var duration = yoda.dateDiff(submitDate, today);
				otherDurationOpenForCat += duration;

				if (countType == "ect") 
					otherETCDurationForCat += yoda.getMilestoneIssueDuration(issues[i]); // cannot be null here;
				
//				console.log(" =>> Adding issue: " + issues[i].number + ", no label match, submitted: " + issues[i].created_at + 
//					", closed: " + issues[i].closed_at);
			}
		}
		
		// Switch to duration?
		if (countType == "durationopen" || countType == "ect") {
			if (countType == "durationopen") {
				// We now need to move to dataArrayForCat to contain instead of the # of issues the averation duration of the open time.
				for (var i=0; i < bars.length; i++) {
					var average = dataDurationOpenForCat[i] / dataArrayForCat[i];
	//				console.log("Adding average: " + average + ", calculated as " + dataDurationOpenForCat[i] + " days total div by " + dataArrayForCat[i] + " issues.");
					dataArray[i].push(average.toFixed(0));
				}
				otherArray.push((otherDurationOpenForCat / otherForCat).toFixed(0));
			} else { 
				// ect
				for (var i=0; i < bars.length; i++) {
					var average = dataECTDurationForCat[i] / dataArrayForCat[i];
	//				console.log("Adding average: " + average + ", calculated as " + dataDurationOpenForCat[i] + " days total div by " + dataArrayForCat[i] + " issues.");
					dataArray[i].push(average.toFixed(0));
				}
				
				otherArray.push((otherETCDurationForCat / otherForCat).toFixed(0));
			}
		} else {
			// Normal, i.e. not duration
			// We will push data to the data array
			
			// Are we doing percentages?
			if (percentage) {
				// Percentage. Let's first calc total.
				var total = otherForCat;
				for (var i=0; i < bars.length; i++)
					total += dataArrayForCat[i];   
							
				for (var i=0; i < bars.length; i++) { 
					dataArray[i].push((100.0 * dataArrayForCat[i] / total).toFixed(1));
				} 
				otherArray.push((100.0 * otherForCat / total).toFixed(1));

			} else {			
				// Normal case.			
				for (var i=0; i < bars.length; i++) 
					dataArray[i].push(dataArrayForCat[i]); 
				otherArray.push(otherForCat);
			}
		}
		
//		console.log(dataArrayForCat);
		totalArray.push(totalForCat);
		totalAlwaysArray.push(totalAlways);
		if (countType == "velocity") 
			storyPointsPerDayArray.push(totalForCat.toFixed(1)); 
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
			backgroundColor : 'rgb(191, 191, 191)', // grey'ish
			order: 2
		});
	}

	// What should we put on right axis
	// TBD: If velocity, play on right axis instead 
	if (rightTotal) {
		if (countType == "velocity") {
			// 
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
	
	// We will push data to a 
	var chartData = {
			labels : categoryArray,
			datasets : datasetArray
	};
	
	leftLabel = [];
	leftLabel["durationopen"] = "Average duration open (days)";
	leftLabel["noissues"] = "No of issues";
	leftLabel["velocity"] = "Story Points";

	var chartScales = {
		yleft: {
			title: {
				display: true,
				text: percentage?("Relative Percentage: ") + leftLabel[countType]:leftLabel[countType],
				font: {
	           		size: 16                    
				}
			},
			stacked: stacked,
			position: "left",
			ticks: {
				beginAtZero: true
			},
			grid: {
				color: yoda.getColor('gridColor')
			}
		},
		x: {
			stacked: stacked,
			grid: {
				color: yoda.getColor('gridColor')
			}
		}
	};
	// If percentage scale, make sure we go only to 100
	if (percentage)
		chartScales.yleft.max = 100;
	
	rightLabel = [];
	rightLabel["durationopen"] = "Total issues";
	rightLabel["noissues"] = "Total issues";
	rightLabel["velocity"] = "Story points per day";
	
	// Add second axis.
	if (rightTotal) {
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

	// -----------------------------------------------------------
	// DATA. Draw the chart
	var ctx = document.getElementById("canvas").getContext("2d");
	if (window.myMixedChart != null)
		window.myMixedChart.destroy();
	
	var chartTitle = "Github Issues " + $("#owner").val() + "/" + $("#repolist").val();
	if (countType == "velocity") 
		chartTitle = "Story points for " + $("#owner").val() + "/" + $("#repolist").val();
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


var issues = [];
function storeIssuesThenCreateChart(issuesResp) {
	issues = issuesResp;
	createChart();
}

function startChart() {
	if ($('#stacked').is(":checked")) {
		stacked = true;
	} else {
		stacked = false;
	}
	
	if ($("#repolist").val() == "") 
		yoda.updateGitHubIssuesOrg($("#owner").val(), $("#labelfilter").val(), "open", storeIssuesThenCreateChart, function(errorText) { yoda.showSnackbarError("Error getting issues: " + errorText, 3000);});
	else
		yoda.updateGitHubIssuesRepos($("#owner").val(), $("#repolist").val(), $("#labelfilter").val(), "open", null, storeIssuesThenCreateChart, function(errorText) { yoda.showSnackbarError("Error getting issues: " + errorText, 3000);});
}

// --------------

function githubAuth() {
	console.log("Github authentisation: " + $("#user").val() + ", token: " + $("#token").val());
	yoda.gitAuth($("#user").val(), $("#token").val());
}

// --------------

Chart.defaults.font.size = 16;
Chart.register({
	id: "yoda-label",
	afterDatasetsDraw: function(chartInstance, easing) {
		var ctx = chartInstance.ctx;

		chartInstance.data.datasets.forEach(function (dataset, i) {
			var meta = chartInstance.getDatasetMeta(i);
			if (!meta.hidden) {
				meta.data.forEach(function(element, index) {
					// Draw the text in black (line) or whitish (bar) with the specified font
					if (dataset.type == "bar" && stacked == true)
						ctx.fillStyle = yoda.getColor('fontAsBackground')
					else
						ctx.fillStyle = yoda.getColor('fontContrast')
					ctx.font = Chart.helpers.fontString(Chart.defaults.font.size, Chart.defaults.font.style, Chart.defaults.font.family);
				
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
				        	ctx.fillText(dataString, position.x, position.y - (Chart.defaults.font.size / 2) - padding);
				    	} else {
					        // Label inside bar ... gives a bit of trouble at buttom... 
				        	ctx.fillText(dataString, position.x, position.y + (Chart.defaults.font.size / 2) + padding);
				    	}
					}
				});
			}
		});
	}
});
			
Chart.register({
	id: "yoda-background",
	beforeDraw: function(c) {
		var ctx = c.ctx;
		ctx.fillStyle = yoda.getColor('htmlBackground');
		ctx.fillRect(0, 0, c.canvas.width, c.canvas.height);
	}
});
