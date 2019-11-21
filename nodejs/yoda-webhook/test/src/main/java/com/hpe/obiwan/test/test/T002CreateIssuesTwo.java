package com.hpe.obiwan.test.test;

import java.util.logging.Level;

import com.hpe.obiwan.test.beans.Issue;
import com.hpe.obiwan.test.environment.Environment;
import com.hpe.obiwan.test.pages.Github;

public class T002CreateIssuesTwo extends Base {

	private Github githubPage = new Github();

	protected void doTest() {
		
		String github = Environment.getEnvironment().getGithubUrl();

		String repoOne = Environment.getEnvironment().getGithubRepoOne();
		
		String signature = getSignature();

		getLogger().log(Level.INFO, "Step 1 - Go to first repository");
		githubPage.goTo(github);
		githubPage.goToRepository(repoOne);

		getLogger().log(Level.INFO, "Step 2 - Create Child One");
		Issue childOne = new Issue();
		childOne.setRepository(repoOne);
		childOne.setTitle("Child One " + signature);
		githubPage.createIssue(childOne);
		waitHook();

		getLogger().log(Level.INFO, "Step 3 - Create Child Two");
		Issue childTwo = new Issue();
		childTwo.setRepository(repoOne);
		childTwo.setTitle("Child Two " + signature);
		githubPage.createIssue(childTwo);
		waitHook();
		
		getLogger().log(Level.INFO, "Step 4 - Create Parent One");
		Issue parentOne = new Issue();
		parentOne.setRepository(repoOne);
		parentOne.setTitle("Parent One " + signature);
		parentOne.getChildren().add(childOne);
		parentOne.getChildren().add(childTwo);
		githubPage.createIssue(parentOne);
		waitHook();
		childOne.getParents().add(parentOne);
		childTwo.getParents().add(parentOne);

		getLogger().log(Level.INFO, "Step 5 - Create Parent Two");
		Issue parentTwo = new Issue();
		parentTwo.setRepository(repoOne);
		parentTwo.setTitle("Parent Two " + signature);
		parentTwo.getChildren().add(childTwo);
		githubPage.createIssue(parentTwo);
		waitHook();
		childTwo.getParents().add(parentTwo);

		getLogger().log(Level.INFO, "Step 6 - Check Parent One");
		githubPage.checkIssue(parentOne);
		
		getLogger().log(Level.INFO, "Step 7 - Check Parent Two");
		githubPage.checkIssue(parentTwo);
		
		getLogger().log(Level.INFO, "Step 8 - Check Child One");
		githubPage.checkIssue(childOne);
		
		getLogger().log(Level.INFO, "Step 9 - Check Child Two");
		githubPage.checkIssue(childTwo);
		
	}
	
}
