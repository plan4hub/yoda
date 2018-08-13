# Issue Web Exporter

Issue Web Exporter is a nodejs script capable of exporting GitHub issues to static web pages. It is a nodejs variant of the similar Yoda browser-based tool.

The necessary nodejs modules are installed by calling:

	npm install
	
The script is run by executing:

	node yoda-node-export-web.js --owner [owner] --repo [repository] --user [GitHub user name] --token [GitHub password or personal token] 
		  --output-dir [root directory for output] --label-filter [filter] --state [open|closed|all] --image-filter [host name filter] 

Defaults:

	owner: none/required
	repo: none/required
	user: none/required
	token: none/required
	output-dir: owner
	state: open
	image-filter: media.github.hpe.com

Example: 

	node yoda-node-export-web.js --owner hpsd --repo yoda --output-dir yoda-issues --state all --label-filter "T2 - Enhancement" --user jens-markussen --password <token>
