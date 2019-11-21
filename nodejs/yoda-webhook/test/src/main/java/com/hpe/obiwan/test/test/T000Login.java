package com.hpe.obiwan.test.test;

import java.util.logging.Level;

import com.hpe.obiwan.test.environment.Environment;
import com.hpe.obiwan.test.pages.Github;

public class T000Login extends Base {

	private Github githubPage = new Github();

	protected void doTest() {
		
		String username = Environment.getEnvironment().getGithubUsername();
		String password = Environment.getEnvironment().getGithubPassword();

		String github = Environment.getEnvironment().getGithubUrl();

		getLogger().log(Level.INFO, "Step 1 - Go to GitHub");
		githubPage.goTo(github);

		getLogger().log(Level.INFO, "Step 2 - Login");
		githubPage.login(username, password);
	}

}
