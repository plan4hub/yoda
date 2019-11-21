package com.hpe.obiwan.test.test;

import java.util.logging.Level;

import com.hpe.obiwan.test.beans.Issue;
import com.hpe.obiwan.test.environment.Environment;
import com.hpe.obiwan.test.pages.Github;

public class T001CreateIssuesOne extends Base {

	private Github githubPage = new Github();

	protected void doTest() {
		
		String github = Environment.getEnvironment().getGithubUrl();

		String repoOne = Environment.getEnvironment().getGithubRepoOne();
		
		String signature = getSignature();

		getLogger().log(Level.INFO, "Step 1 - Go to first repository");
		githubPage.goTo(github);
		githubPage.goToRepository(repoOne);

		getLogger().log(Level.INFO, "Step 2 - Create Parent One");
		Issue parentOne = new Issue();
		parentOne.setRepository(repoOne);
		parentOne.setTitle("Parent One " + signature);
		githubPage.createIssue(parentOne);
		waitHook();

		getLogger().log(Level.INFO, "Step 3 - Create Parent Two");
		Issue parentTwo = new Issue();
		parentTwo.setRepository(repoOne);
		parentTwo.setTitle("Parent Two " + signature);
		githubPage.createIssue(parentTwo);
		waitHook();

		getLogger().log(Level.INFO, "Step 4 - Create Child One");
		Issue childOne = new Issue();
		childOne.setRepository(repoOne);
		childOne.setTitle("Child One " + signature);
		childOne.getParents().add(parentOne);
		githubPage.createIssue(childOne);
		waitHook();
		parentOne.getChildren().add(childOne);

		getLogger().log(Level.INFO, "Step 5 - Create Child Two");
		Issue childTwo = new Issue();
		childTwo.setRepository(repoOne);
		childTwo.setTitle("Child Two " + signature);
		childTwo.getParents().add(parentOne);
		childTwo.getParents().add(parentTwo);
		githubPage.createIssue(childTwo);
		waitHook();
		parentOne.getChildren().add(childTwo);
		parentTwo.getChildren().add(childTwo);
		
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
