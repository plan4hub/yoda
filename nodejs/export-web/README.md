# Export all issues from a given repo

Before use, make sure that you have a valid settings.json file. Copy from settings-template.json and insert personal access token, which you can generate from github.hpe.com/profile/settings.

Remember to adjust settings.json with your personal token (as obtained via github).

nodejs is a prerequesite. Install by:

	(Linux) yum install nodejs 
	(Windows) download from [https://nodejs.org/en/download/]

The necessary nodejs modules are installed by calling:

	npm install
	
The script is run by executing:

	node ExportOrgIssues.js <owner> <state open/closed/all> <outputFile>
	
Example: 

	node ExportOrgIssues.js hpsd open true issues.csv
	
Another script ExportOrgIssuesALM.js creates a report (with hpsd handling) similar to ALM csv report

	node ExportOrgIssuesALM.js <owner> <state open/closed/all> <outputFile>
	
Example: 

	node ExportOrgIssuesALM.js hpsd open issues.csv
	
A more generic script - at repo level - is ExportRepoIssues.js

	node ExportRepoIssues.js cms-delivery emea-infrastructure all issues.csv

Example:

	node ExportRepoIssues.js cms-delivery emea-infrastructure all issues.csv


# Excel Wrappers
	
GetGithubIssuesMulti.xlsm  
Contains a macro which based on a Parameters table calls any set of scripts and concatenates the resulting data to an existing table. In this way Issues from a set of repos can be fetched repeatedly using ExportRepoIssues.js or ExportOrgIssues.js.    



