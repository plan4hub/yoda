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
	params += "&repolist=" + $("#repolist").val();
	["startdate", "enddate", "interval", "labelfilter", "labelsplit", "other", "title", "stacked", "righttotal", "percentage"].forEach((p) => {
		params = yoda.addIfNotDefault(params, p); });

	if (yoda.getEstimateInIssues() != "inbody")
		params += "&estimate=" + yoda.getEstimateInIssues();

	const countType = $("#countradio input[type='radio']:checked").val();
	if (countType != "noissues")
		params += "&count=" + countType;
	
	return params;
}

function countChanged(e) {
	if (e.target.value == "velocity") {
		console.log("Velocity selected. Let's set some solid defaults.");
		let sixMAgo = new Date();
		sixMAgo.setMonth(sixMAgo.getMonth() - 6, 1);
		if ($('#startdate').val() == "")
			$('#startdate').val(yoda.formatDate(sixMAgo));
		$('#interval').val('1m');
		$('#labelsplit').val('^T[1-9][0-9]? -');
		$('#other').val('');
		$('#stacked').attr('checked', true);
		$('#righttotal').attr('checked', true);
	} else if (e.target.value == "ect") {
		console.log("ECT selected. Let's set some solid defaults.");
		let sixMAgo = new Date();
		sixMAgo.setMonth(sixMAgo.getMonth() - 6, 1);
		if ($('#startdate').val() == "")
			$('#startdate').val(yoda.formatDate(sixMAgo));
		//	$('#enddate').val(''); 
		$('#interval').val('1m');
		$('#labelsplit').val('^T[1-9][0-9]? -');
		$('#other').val('');
		$('#stacked').attr('checked', false);
		$('#righttotal').attr('checked', false);
	} else if (e.target.value == "comments") {
		console.log("Comments selected. Let's deselect some fields.");
		let sixMAgo = new Date();
		sixMAgo.setMonth(sixMAgo.getMonth() - 6, 1);
		if ($('#startdate').val() == "")
			$('#startdate').val(yoda.formatDate(sixMAgo));
		$('#interval').val('1m');

		$('#labelsplit').val('repo');
		$('#stacked').attr('checked', true);
	}
}

// We will use below two global arrays to keep track of the data for the comments graph
let comDateArray = [];
let comRepoArray = [];
let comTotalArray = [];
let reposLeft = -1;

// This special chart is for plotting no of comments done during the various intervals.
// Merging this with the standard chart will make it too messy. Instead, some functions will
// be duplicated. Sad, perhaps, but safer.
// 
function createCommentsChart(dateIndex) {
	console.log("createCommentChart: " + dateIndex + " / " + comDateArray.length);
	const repoList = $("#repolist").val();

	// Are we done?
	if (dateIndex < comDateArray.length) {
		// Are we done with the repos?
		// Let's initiate the calls...
		reposLeft = repoList.length;
		for (let repoIndex = 0; repoIndex < repoList.length; repoIndex++) {
			//  Make the call
			console.log("Getting issues for date: " + comDateArray[dateIndex] + " for repo " + repoList[repoIndex]);
			const getCommentsUrl = yoda.getGithubUrl() + "repos/" + $("#owner").val() + "/" + repoList[repoIndex] + "/issues/comments?since=" + comDateArray[dateIndex];
			yoda.getCount(getCommentsUrl, repoIndex, 1, function(rIndex, noComments) {
				console.log("  ... there are " + noComments + " comments for repo " + repoList[rIndex] + " since " + comDateArray[dateIndex]);
				comRepoArray[rIndex].push(noComments);
				comTotalArray[dateIndex] += noComments; 

				// Adjust previous date with this number....
				if (dateIndex > 0) {
					comRepoArray[rIndex][dateIndex - 1] -= noComments;
					comTotalArray[dateIndex - 1] -= noComments;
				}

				reposLeft--;
				if (reposLeft == 0)
					setTimeout(function() {createCommentsChart(dateIndex + 1)}, 100); // Advance date index
			},
			function(errorText) { 
				yoda.showSnackbarError("Error getting events: " + errorText, 3000);
			});
		}
	} else {
		// All done. Draw the graph
		// Ready, let's push the bars
		let datasetArray = [];
		if ($('#labelsplit').val() == "repo") {
			for (let r = 0; r < repoList.length; r++) {
				datasetArray.push({
					type : 'bar',
					label : repoList[r],
					borderWidth : 2,
					fill : false,
					yAxisID: "yleft",
					data : comRepoArray[r],
					backgroundColor : yoda.barColors[r]
				});
			} 
		} else {
			datasetArray.push({
				type : 'bar',
				label : "Comments",
				borderWidth : 2,
				yAxisID: "yleft",
				fill : false,
				data : comTotalArray,
				backgroundColor : yoda.barColors[0]
			});
		}
		
		// Normal case. Right total line against right axis.
		datasetArray.push({
			type : 'line',
			label : 'Total',
			borderWidth : 2,
			fill : false,
			yAxisID: "yright",
			data : comTotalArray,
			lineTension: 0,
			borderColor: yoda.getColor("lineBackground"),
			order: 1
		});
		
        // We will push data to a
        const chartData = {
			labels : comDateArray,
			datasets : datasetArray
		};
		
		let chartScales = {
			yleft: {
				title: {
					display: true,
					text: "No of comments",
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
		
		// Add second axis.
		if (!$("#stacked").is(":checked") || $("#righttotal").is(":checked")) {
			chartScales["yright"] = {    
				title: {
					display: true,
					text: "Total comments",
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
		let ctx = document.getElementById("canvas").getContext("2d");
		if (window.myMixedChart != null)
			window.myMixedChart.destroy();
		
		let chartTitle = "Github Comments " + $("#owner").val() + "/" + $("#repolist").val();
		if ($("#title").val() != "")
			chartTitle = $("#title").val(); 
		
		window.myMixedChart = new Chart(ctx, {
			type : 'bar',	
			data : chartData,
			options : {
				showDatapoints: true,
				responsive : true,
				title : {
					display : true,
					text : chartTitle,
					font: {
						size: 20                    
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
}

function startCommentsChart() {
	// Check date fields for possible +/- notations.
	$("#startdate").val(yoda.handleDateDelta($("#startdate").val()));
	$("#enddate").val(yoda.handleDateDelta($("#enddate").val()));
	
	let repoList = $("#repolist").val();

	// Prepare the arrays. One for the dates. One for each repo 
	comDateArray = [];
	comRepoArray = [];
	comTotalArray = [];
	
	// Iterate days.
	// We need today startDate and endDate... we do this for each call. A bit wasteful, but who cares
	// Let's set today as 0:0:0 time (so VERY start of the day)
	let today = new Date();
	today.setHours(0);
	today.setMinutes(0);
	today.setSeconds(0);

	let endDateString = $("#enddate").val();
	let endDate;
	if (endDateString == "")
		endDate = new Date(today);
	else
		endDate = new Date(endDateString);
	console.log("End date: " + endDate);
	endDate.setHours(23);
	endDate.setMinutes(59);
	endDate.setSeconds(59);

	const startDateString = $("#startdate").val();
	let startDate;
	if (startDateString == "")
		startDate = yoda.twoMonthsEarlier(interval, today);
	else
		startDate = new Date(startDateString);
	console.log("Start date: " + startDate);

	// Done.. Advance to next date
	const interval = $("#interval").val();
	console.log("Interval: " + interval);
	if (interval == "" || parseInt(interval) == 0) {
		yoda.showSnackbarError("Interval cannot be empty or zero", 3000);
		return;
	}
	
    const startDay = new Date(startDate).getDate();
	comTotalArray = [];
	for (let date = new Date(startDate); date <= endDate; yoda.advanceDate(date, interval, startDay)) {
		comDateArray.push(yoda.formatDate(date));
		comTotalArray.push(0);
	}
	for (let r = 0; r < repoList.length; r++)
		comRepoArray.push(new Array());

	// Now, let's get the data and draw the graph
	createCommentsChart(0, -1);
}

// Central count logic. Separated so as to allow to call multiple times...
function countIssues(issues, date, previousDate, countType, labelSplit, bars) {
	// Prepare data array
	let dataArrayForDay = new Array(bars.length);
	let dataDurationOpenForDay = new Array(bars.length);
	let dataECTDurationForDay = new Array(bars.length);
	for (let l = 0; l < bars.length; l++) {
		dataArrayForDay[l] = 0;
		dataDurationOpenForDay[l] = 0;
		dataECTDurationForDay[l] = 0;
	}
	let otherForDay = 0;
	let totalForDay = 0;
	let otherDurationOpenForDay = 0;
	let otherETCDurationForDay = 0;
	let totalAlways = 0;

	// Ok, now let's count issues
	for (let i = 0; i < issues.length; i++) {
		// We must consider issues which have been opened BEFORE date, but  
		// NOT closed before date
		const submitDateString = yoda.createDate(issues[i]);
		const submitDate = new Date(submitDateString);

		if (submitDate > date)
			continue; // Submitted later - forget it.

		// Closed, and closed before OR DURING date?
		const closedString = yoda.closedDate(issues[i]);
		if (closedString != null) {
			const closedDate = new Date(closedString);

			// Check if open now, all cases.
			if (closedDate > date)
				totalAlways++;

			// Don't want this issue if closed ahead of this
			if ((countType == "noissues" || countType == "durationopen") && closedDate <= date)
				continue;

			// Closed before previous date
			if ((countType == "closed" || countType == "velocity") && closedDate <= previousDate)
				continue;

			// Closed later
			if ((countType == "closed" || countType == "velocity") && closedDate > date)
				continue;

			// If we are counting ECT and required data is not available, disregard the issue 
			if (countType == "ect" && yoda.getMilestoneIssueDuration(issues[i]) == null)
				continue;
		} else {
			if (issues[i].state != "open") {
				console.log("SUPER AHAHHHHHHH");
				console.log(issues[i].url);
			}
			totalAlways++;
			if ((countType == "closed" || countType == "velocity"))
				continue;
		}

		// Ok, it is open, IF we are counting opened, we are only interested if it was opened during this period.
		if (countType == "opened" && submitDate < previousDate)
			continue;  // Earlier period, forget it.

		// Ok, relevant
		let foundLabel = false;
		let labelList = issues[i].labels;

		// Trick: if we have special "repo" text into labelsplit, then we'll create an artificial labellist with just the repo name.
		// This will cause an immediate match.
		if (labelSplit == "repo")
			labelList = [{ name: yoda.getUrlRepo(issues[i].url) }];

		let issueEstimate;
		if (countType == "velocity")
			issueEstimate = yoda.issueEstimate(issues[i]);

		// Log's look at the labels.
		for (let l = 0; l < labelList.length; l++) {
			// Search bars array
			const index = bars.indexOf(labelList[l].name);
			if (index != -1) {
				// Got a match. Make sure we don't continue search
				if (countType == "velocity") {
					dataArrayForDay[index] = dataArrayForDay[index] + issueEstimate;
					totalForDay += issueEstimate;
				} else {
					// All other.. 
					dataArrayForDay[index] = dataArrayForDay[index] + 1;
					totalForDay++;
				}

				l = labelList.length;
				foundLabel = true;

				// Add the total duration, we will divide by # of issues later.
				const duration = yoda.dateDiff(submitDate, date);
				dataDurationOpenForDay[index] += duration;

				if (countType == "ect")
					dataECTDurationForDay[index] += yoda.getMilestoneIssueDuration(issues[i]); // cannot be null here;
			}
		}
		if (foundLabel == false && $("#other").val() != "") {
			if (countType == "velocity") {
				otherForDay += issueEstimate;
				totalForDay += issueEstimate;
			} else {
				otherForDay++;
				totalForDay++;
			}

			// Add the total duration, we will divide by # of issues later.
			const duration = yoda.dateDiff(submitDate, date);
			otherDurationOpenForDay += duration;

			if (countType == "ect")
				otherETCDurationForDay += yoda.getMilestoneIssueDuration(issues[i]); // cannot be null here;
		}
	}

	return [dataArrayForDay, dataDurationOpenForDay, dataECTDurationForDay, otherForDay, totalForDay, otherDurationOpenForDay, otherETCDurationForDay, totalAlways];
}

// ---------------------------------------
// Issues have been retrieved. Time to analyse data and draw the chart.
function createChart() {
	// get reference to the issues (not deep copy, so cheap)
	const issues = yoda.getIssues();
	console.log("Got " + issues.length + " issues");
	
	// Check date fields for possible +/- notations.
	$("#startdate").val(yoda.handleDateDelta($("#startdate").val()));
	$("#enddate").val(yoda.handleDateDelta($("#enddate").val()));
	
	// Let's set today as 0:0:0 time (so VERY start of the day)
	let today = new Date();
	today.setHours(0);
	today.setMinutes(0);
	today.setSeconds(0);
	
	const interval = $("#interval").val();
	console.log("Interval: " + interval);
	if (interval == "" || parseInt(interval) == 0) {
		yoda.showSnackbarError("Interval cannot be empty or zero", 3000);
		return;
	}

	const startDateString = $("#startdate").val();
	let startDate;
	if (startDateString == "")
		startDate = yoda.twoMonthsEarlier(interval, today);
	else
		startDate = new Date(startDateString);
	console.log("Start date: " + startDate);
	
	const endDateString = $("#enddate").val();
	let endDate;
	if (endDateString == "")
		endDate = new Date(today);
	else
		endDate = new Date(endDateString);
	console.log("End date: " + endDate);
	endDate.setHours(23);
	endDate.setMinutes(59);
	endDate.setSeconds(59);

	const labelSplit = $("#labelsplit").val();
	console.log("Label split: " + labelSplit);
	
	const countType = $("#countradio input[type='radio']:checked").val();
	console.log("Count type read: " + countType);

	// Label magic (splitting based on label split filter, if specified)
	// Let's build a map of labels
	// Let's see if this look like a regular expression, or if it is simply a list of labels with , between.
	let [bars, labelSplitUsingRegExp] = yoda.issue_split($("#labelsplit").val(), issues);
	console.log("Bar Labels: " + bars);
	
	// Besides the bars for the data identified, possibly none if no label split, we will maintain
	// 1. A bar chart for others (i.e. issues not having labels matching the ones identified
	// 2. A line for total # issues (only if we have splitting)
	
	// Data arrays for issues.
	// 	Data array (two-dimentional) for issues matching the bar labels
	// 	Other for issues not match
	// 	Total for all issues (matching date interval)'
	//  TotalIssues for all issues (this extra total to be used for opened-total and closed-total options).
	let dateArray = [];
	let dataArray = new Array(bars.length);
	for (let i = 0; i < dataArray.length; i++)
		dataArray[i] = new Array();
	let otherArray = [];
	let totalArray = [];
	let totalAlwaysArray = [];
	let storyPointsPerDayArray = [];
	
	// date loop
	// Start at startDate
	
	// Need to consider previous date, so that we can observe interval. Go back one interval
    let previousDate = new Date(startDate);
    const startDay = previousDate.getDate(); // Hack, need to keep startDay when advancing using month (m) syntax.
    yoda.advanceDate(previousDate, "-" + interval, startDay);
    console.log("Initial previousDate: " + previousDate);
	for (let date = new Date(startDate); date <= endDate; previousDate = new Date(date), yoda.advanceDate(date, interval, startDay)) {
		console.log("Date: " + date + ", previousDate: " + previousDate);
		date.setHours(23);
		date.setMinutes(59);
		date.setSeconds(59);
		
		// Push to date array the labels. For open issues just the date. For others prepend with "<"
		if (countType != "noissues")
			dateArray.push(".. " + yoda.formatDate(date));
		else
			dateArray.push(yoda.formatDate(date));
		
		// CALL TO ACTUALLY COUNT FUNCTION !!!
		let dataArrayForDay, dataDurationOpenForDay, dataECTDurationForDay, otherForDay, totalForDay, otherDurationOpenForDay, otherETCDurationForDay, totalAlways;
		[dataArrayForDay, dataDurationOpenForDay, dataECTDurationForDay, otherForDay, totalForDay, otherDurationOpenForDay, otherETCDurationForDay, totalAlways] = 
			countIssues(issues, date, previousDate, countType == "opened_closed"? "opened": countType, labelSplit, bars);

		// Count again (closed)?
		let _dataArrayForDay, _dataDurationOpenForDay, _dataECTDurationForDay, _otherForDay, _totalForDay, _otherDurationOpenForDay, _otherETCDurationForDay, _totalAlways;
		if (countType == "opened_closed") {  // TBD: may need some ANDs here... like maybe not percentage, not stacked, etc. 
			[_dataArrayForDay, _dataDurationOpenForDay, _dataECTDurationForDay, _otherForDay, _totalForDay, _otherDurationOpenForDay, _otherETCDurationForDay, _totalAlways] = 
				countIssues(issues, date, previousDate, "closed", labelSplit, bars);
		}
				
		// Switch to duration?
		if (countType == "durationopen" || countType == "ect") {
			if (countType == "durationopen") {
				// We now need to move to dataArrayForDay to contain instead of the # of issues the averation duration of the open time.
				for (let i = 0; i < bars.length; i++) {
					var average = dataDurationOpenForDay[i] / dataArrayForDay[i];
					dataArray[i].push(average.toFixed(0));
				}
				otherArray.push((otherDurationOpenForDay / otherForDay).toFixed(0));
			} else { 
				// ect
				for (let i = 0; i < bars.length; i++) {
					const average = dataECTDurationForDay[i] / dataArrayForDay[i];
					dataArray[i].push(average.toFixed(0));
				}
				otherArray.push((otherETCDurationForDay / otherForDay).toFixed(0));
			}
		} else {
			// Normal, i.e. not duration
			// We will push data to the data array
			
			// Are we doing percentages?
			if ($("#percentage").is(":checked")) {
				// Percentage. Let's first calc total.
				let total = otherForDay;
				for (let i = 0; i < bars.length; i++)
					total += dataArrayForDay[i];   
							
				for (let i = 0; i < bars.length; i++)
					dataArray[i].push((100.0 * dataArrayForDay[i] / total).toFixed(1));
				otherArray.push((100.0 * otherForDay / total).toFixed(1));
			} else {
				if (countType == "opened_closed") { 		
					// // Floating bar case
					for (let i = 0; i < bars.length; i++)
						dataArray[i].push([- _dataArrayForDay[i], dataArrayForDay[i]]);
					otherArray.push([- _otherForDay, otherForDay]);
				} else {
					// Normal case.			
					for (let i = 0; i < bars.length; i++)
						dataArray[i].push(dataArrayForDay[i]);
					otherArray.push(otherForDay);
				}
			}
		}
		
//		console.log(dataArrayForDay);
		totalArray.push(totalForDay);
		totalAlwaysArray.push(totalAlways);
		if (countType == "velocity") {
			const durationDays = (date.getTime() - previousDate.getTime()) /  (1000 * 3600 * 24);
			storyPointsPerDayArray.push((totalForDay / durationDays).toFixed(1)); 
		}
	}
	
	// Ready, let's push the bars
	let datasetArray = [];
	for (let b = 0; b < bars.length; b++) {
		// Here, we want to try again with the regular expression to see if we can come up with a better name for the bar into the legend.
		let actualBar = bars[b];
		if (labelSplitUsingRegExp && labelSplit.indexOf('(') != -1) {  // We have a parentesis, that means we have to try to change label name.
			const splitReg = new RegExp(labelSplit);
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
	// TBD: If velocity, play on right axis instead 
	if ($("#righttotal").is(":checked")) {
		if (countType == "velocity") {
			// 
			datasetArray.push({
				type : 'line',
				label : 'Story points per day',
				fill : false,
				yAxisID: "yright",
				data : storyPointsPerDayArray,
				lineTension: 0,
				borderColor: yoda.getColor("lineBackground"),
				order: 1
			});
		} else {
			// Normal case. Right total line against right axis.
			datasetArray.push({
				type : 'line',
				label : 'Total',
				fill : false,
				yAxisID: "yright",
				data : (countType == "closed" || countType == "opened" || countType == "opened_closed")?totalAlwaysArray : totalArray,
				lineTension: 0,
				borderColor: yoda.getColor("lineBackground"),
				order: 1
			});
		}
	}

	// We will push data to a 
	const chartData = {
			labels : dateArray,
			datasets : datasetArray
	};
	
	let leftLabel = [];
	leftLabel["durationopen"] = "Average duration open (days)";
	leftLabel["noissues"] = "No of issues";
	leftLabel["opened"] = "No of issues opened";
	leftLabel["closed"] = "No of issues closed";
	leftLabel["opened_closed"] = "No of issues opened / closed";
	leftLabel["velocity"] = "Story Points";
	leftLabel["ect"] = "ECT - Engineering Cycle Time (days)"

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
				color: yoda.getColor('gridColor'),
				lineWidth: function(context) {
					if (context.tick.value == 0)
						return 3;
					else
						return 1;
				}
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
	rightLabel["opened"] = "No open issues";
	rightLabel["closed"] = "No open issues";
	rightLabel["opened_closed"] = "No open issues";
	
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

	// -----------------------------------------------------------
	// DATA. Draw the chart
	let ctx = document.getElementById("canvas").getContext("2d");
	if (window.myMixedChart != null)
		window.myMixedChart.destroy();
	
	let chartTitle = "Github Issues " + $("#owner").val() + "/" + $("#repolist").val();
	if (countType == "velocity") 
		chartTitle = "Story point velocity for " + $("#owner").val() + "/" + $("#repolist").val();
	if ($("#title").val() != "") {
		chartTitle = $("#title").val(); 
	}
	
	const killBarSpacing = chartData.labels.length > 200 && $("#stacked").is(":checked") && !$("#righttotal").is(":checked");
	window.myMixedChart = new Chart(ctx, {
		type : 'bar',	
		data : chartData,
		options : {
			categoryPercentage: killBarSpacing? 1.0: 0.9,
			barPercentage: killBarSpacing? 1.0: 0.9,
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

// -----------	

function startChart() {
	if ($("#countradio input[type='radio']:checked").val() == "comments") 
		return startCommentsChart();
	
	if ($("#repolist").val() == "") 
		yoda.updateGitHubIssuesOrg($("#owner").val(), $("#labelfilter").val(), "all", createChart, function(errorText) { yoda.showSnackbarError("Error getting issues: " + errorText, 3000);});
	else
		yoda.updateGitHubIssuesRepos($("#owner").val(), $("#repolist").val(), $("#labelfilter").val(), "all", null, createChart, function(errorText) { yoda.showSnackbarError("Error getting issues: " + errorText, 3000);});
}

// --------------

export function init() {
	// Enable yodamenu
	yoda.enableMenu("#issue-statistics-report");

	yoda.getDefaultLocalStorage("#owner", "yoda.owner");
	yoda.getDefaultLocalStorage("#csvdelimiter", "yoda.csvdelimiter");
	yoda.getDefaultLocalStorage("#interval", "yoda.time.interval");
	yoda.getDefaultLocalStorage("#labelsplit", "yoda.time.labelsplit");
	yoda.getDefaultLocalStorage("#other", "yoda.time.other");
	if ($("#other").val() == "blank")
		$("#other").val("");

	yoda.decodeUrlParam("#owner", "owner");
	yoda.decodeUrlParamRadio("count", "count");

	// repo and repoList handled later, both are supported.
	yoda.decodeUrlParam("#csvdelimiter", "csvdelimiter");
	yoda.decodeUrlParamDate("#startdate", "startdate");
	yoda.decodeUrlParamDate("#enddate", "enddate");
	yoda.decodeUrlParam("#interval", "interval");
	yoda.decodeUrlParam("#labelfilter", "labelfilter");
	yoda.decodeUrlParam("#labelsplit", "labelsplit");
	yoda.decodeUrlParam("#other", "other");
	yoda.decodeUrlParam("#title", "title");
	yoda.decodeUrlParamBoolean("#stacked", "stacked");
	yoda.decodeUrlParamBoolean("#righttotal", "righttotal");
	yoda.decodeUrlParamBoolean("#percentage", "percentage");
	yoda.decodeUrlParamBoolean("#history", "history");
	//		yoda.decodeUrlParamBoolean("#velocityperday", "velocityperday");

	yoda.decodeUrlParamRadio("estimate", "estimate");
	yoda.updateEstimateRadio();

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
	$("#countradio").on("change", countChanged);
	$("#estimateradio").on("click", function(event) { yoda.setEstimateInIssues(event.value); });
	$("#canvas").on("click", function(event) { yoda.chartCSVExport($("#csvdelimiter").val(), event); });

	// ChartJS default stuff
	yoda.registerChartJS();

	$(document).ready(function () {
		$('#repolist').select2({
			// minimumInputLength: 2,
			sorter: yoda.select2Sorter,
			matcher: yoda.select2Matcher
		});
		$('#repolist').on('select2:select', yoda.select2SelectEvent('#repolist'));

		// Rather complex updating of the defaults repos. Once complete, check if we should draw.
		yoda.updateReposAndGUI($("#owner").val(), "#repolist", "repolist", "yoda.repolist", function () {
			// Should we draw directly? Only check this after the repo updates complete.
			if (yoda.decodeUrlParamBoolean(null, "draw") == "true") {
				startChart();
			}
		}, null);
	});
}
