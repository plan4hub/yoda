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


// Helper function to set a given localStorage item
// If value is set to blank, the item is removed. 
function setLocalStorage(item, value) {
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

function updateToken() {
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

function deleteToken() {
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

function setGitHubCom() {
	setLocalStorage('gitHubApiBaseUrl', "https://api.github.com/");
	setLocalStorage('gitHubBaseUrl', "https://www.github.com/");
	$("#githubapibaseurl").val("https://api.github.com/");
	$("#githubbaseurl").val("https://www.github.com/");
}

