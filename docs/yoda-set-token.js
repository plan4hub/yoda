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

// Support function for posting
function openWindowWithPost(url, windowoption, name, params)
{
	var form = document.createElement("form");
	form.setAttribute("method", "post");
	form.setAttribute("action", url);
	form.setAttribute("target", name);
	for (var i in params) {
		if (params.hasOwnProperty(i)) {
			var input = document.createElement('input');
			input.type = 'hidden';
			input.name = i;
			input.value = params[i];
			form.appendChild(input);
		}
	}
	document.body.appendChild(form);
	//note I am using a post.htm page since I did not want to make double request to the page 
	//it might have some Page_Load call which might screw things up.
	window.open("post.htm", name, windowoption);
	form.submit();
	document.body.removeChild(form);
}


function requestToken(code, state) {
	// Ok, let's try
	var getTokenUrl = yoda.getGithubUrlHtml() + "login/oauth/access_token";
	var params = { 
			client_id: "Iv1.20c23adef04034c7",
			client_secret: "1b36515c2b09e823110df5ef3ff25c05e103be0a",
			redirect_url: encodeURI(window.location),
			code: code,
			state: state
	};
			
	console.log("Url: " + getTokenUrl);
	console.log("Params:");
	console.log(params);
	
//	openWindowWithPost(getTokenUrl, "", getTokenUrl, params);
	
	// Why not do it directly?
	
}