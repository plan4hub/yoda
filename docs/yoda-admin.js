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

// Clear any repoList stored im local storage
export function clearRepoListCache() {
	yoda.clearLocalStorageWild("yoda.cache.repolist.");
	yoda.showSnackbarOk("Cached repository lists cleared");
}

// Helper function to set a given localStorage item
// If value is set to blank, the item is removed. 
export function setLocalStorage(item, value) {
	if (value == "") {
		try {
			localStorage.removeItem(item);
			yoda.showSnackbarOk("Succesfully cleared " + item);
		}
		catch (err) {
			yoda.showSnackbarError("Failed to clear " + item);
		}
	} else {
		try {
			localStorage.setItem(item, value);
			yoda.showSnackbarOk("Succesfully updated " + item);
		}
		catch (err) {
			yoda.showSnackbarError("Failed to update " + item);
		}
	}	
}

export function updateToken() {
	if ($("#user").val() != "" && $("#token").val() != "") {
		try {
			localStorage.setItem("gitHubUserId", $("#user").val());
			localStorage.setItem("gitHubAccessToken", $("#token").val());
			yoda.showSnackbarOk("Succesfully updated user and token.");
		}
		catch (err) {
			yoda.showSnackbarError("Failed updated user and token.");
		}
	}
}

export function deleteToken() {
	try {
		localStorage.removeItem("gitHubUserId");
		localStorage.removeItem("gitHubAccessToken");
		yoda.showSnackbarOk("Succesfully deleted user and token.");

		$("#user").val("");
		$("#token").val("");
	}
	catch (err) {
		yoda.showSnackbarError("Failed deleting user and token.");
	}
}

export function setGitHubCom() {
	setLocalStorage('gitHubApiBaseUrl', "https://api.github.com/");
	setLocalStorage('gitHubBaseUrl', "https://www.github.com/");
	$("#githubapibaseurl").val("https://api.github.com/");
	$("#githubbaseurl").val("https://www.github.com/");
}

export function setHPEGitHub() {
	setLocalStorage('gitHubApiBaseUrl', "https://github.hpe.com/api/v3/");
	setLocalStorage('gitHubBaseUrl', "https://github.hpe.com/");
	$("#githubapibaseurl").val("https://github.hpe.com/api/v3/");
	$("#githubbaseurl").val("https://github.hpe.com/");
}

export function init() {
	// Enable yodamenu
	yoda.enableMenu();

	// event listeners
	$("#hamburger").on("click", yoda.menuClick);

	// Read localStorage values.
	try {
		$("#user").val(localStorage.getItem("gitHubUserId"));
		$("#token").val(localStorage.getItem("gitHubAccessToken"));
		$("#owner").val(localStorage.getItem("yoda.owner"));
		$("#repolist").val(localStorage.getItem("yoda.repolist"));
		$("#repolistcache").val(localStorage.getItem("yoda.repolistcache"));
		$("#time_interval").val(localStorage.getItem("yoda.time.interval"));
		$("#time_labelsplit").val(localStorage.getItem("yoda.time.labelsplit"));
		$("#time_other").val(localStorage.getItem("yoda.time.other"));
		$("#burndown_tentative").val(localStorage.getItem("yoda.burndown.tentative"));
		$("#burndown_inprogress").val(localStorage.getItem("yoda.burndown.inprogress"));
		$("#burndown_notcodefreeze").val(localStorage.getItem("yoda.burndown.notcodefreeze"));
		$("#burndown_labelsplit").val(localStorage.getItem("yoda.burndown.labelsplit"));
		$("#burndown_additionaldata").val(localStorage.getItem("yoda.burndown.additionaldata"));
		$("#burndown_rnlabeltypes").val(localStorage.getItem("yoda.burndown.rnlabeltypes"));
		$("#burndown_rnknownlabeltypes").val(localStorage.getItem("yoda.burndown.rnknownlabeltypes"));
		$("#burndown_rnskiplabel").val(localStorage.getItem("yoda.burndown.rnskiplabel"));
		$("#burndown_rnknownlabel").val(localStorage.getItem("yoda.burndown.rnknownlabel"));
		$("#cfd_labelsplit").val(localStorage.getItem("yoda.cfd.interval"));
		$("#kanban_columns").val(localStorage.getItem("yoda.kanban.columns"));
		$("#srcrepo").val(localStorage.getItem("yoda.label.srcrepo"));
		$("#framebackground").val(localStorage.getItem("yoda.global.framebackground"));
		if (yoda.getDefaultLocalStorageValue("yoda.estimate") == null)
			$('input[name=estimate][value=""]').attr('checked', true);
		else
			yoda.decodeParamRadio('estimate', yoda.getDefaultLocalStorageValue("yoda.estimate"));
		
		$("#githubapibaseurl").val(localStorage.getItem("gitHubApiBaseUrl"));
		$("#githubbaseurl").val(localStorage.getItem("gitHubBaseUrl"));
	}
	catch (err) {
		yoda.showSnackbarError("Failed to get localStorage info. Old IE?");
	}
}