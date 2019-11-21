package com.hpe.obiwan.test.test;

import java.util.logging.Level;

import com.hpe.obiwan.test.beans.Issue;
import com.hpe.obiwan.test.environment.Environment;
import com.hpe.obiwan.test.pages.Github;

public class T003CreateIssuesThree extends Base {

	private Github githubPage = new Github();

	protected void doTest() {
		
		String github = Environment.getEnvironment().getGithubUrl();

		String repoOne = Environment.getEnvironment().getGithubRepoOne();
		String repoTwo = Environment.getEnvironment().getGithubRepoTwo();
		
		String signature = getSignature();

		getLogger().log(Level.INFO, "Step 1 - Go to first repository");
		githubPage.goTo(github);
		githubPage.goToRepository(repoOne);

		getLogger().log(Level.INFO, "Step 2 - Create Parent One");
		Issue parentOne = new Issue();
		parentOne.setRepository(repoOne);
		parentOne.setTitle("Parent One " + signature);
		githubPage.createIssue(parentOne);
		delayBackend(5);

		getLogger().log(Level.INFO, "Step 3 - Create Child One");
		Issue childOne = new Issue();
		childOne.setRepository(repoOne);
		childOne.setTitle("Child One " + signature);
		githubPage.createIssue(childOne);
		delayBackend(5);

		getLogger().log(Level.INFO, "Step 4 - Go to second repository");
		githubPage.goTo(github);
		githubPage.goToRepository(repoTwo);

		getLogger().log(Level.INFO, "Step 5 - Create Parent Two");
		Issue parentTwo = new Issue();
		parentTwo.setRepository(repoTwo);
		parentTwo.setTitle("Parent Two " + signature);
		githubPage.createIssue(parentTwo);
		delayBackend(5);

		getLogger().log(Level.INFO, "Step 6 - Create Child Two");
		Issue childTwo = new Issue();
		childTwo.setRepository(repoTwo);
		childTwo.setTitle("Child Two " + signature);
		githubPage.createIssue(childTwo);
		delayBackend(5);
		
		getLogger().log(Level.INFO, "Step 7 - Go to first repository");
		githubPage.goTo(github);
		githubPage.goToRepository(repoOne);

		getLogger().log(Level.INFO, "Step 8 - Update Parent One");
		parentOne.getChildren().add(childOne);
		parentOne.getChildren().add(childTwo);
		githubPage.updateBody(parentOne);
		delayBackend(5);
		childOne.getParents().add(parentOne);
		childTwo.getParents().add(parentOne);

		getLogger().log(Level.INFO, "Step 9 - Go to second repository");
		githubPage.goTo(github);
		githubPage.goToRepository(repoTwo);

		getLogger().log(Level.INFO, "Step 10 - Update Child Two");
		childTwo.getParents().add(parentTwo);
		githubPage.updateBody(childTwo);
		delayBackend(5);
		parentTwo.getChildren().add(childTwo);

		getLogger().log(Level.INFO, "Step 11 - Go to first repository");
		githubPage.goTo(github);
		githubPage.goToRepository(repoOne);

		getLogger().log(Level.INFO, "Step 12 - Check Parent One");
		githubPage.checkIssue(parentOne);
		
		getLogger().log(Level.INFO, "Step 13 - Check Child One");
		githubPage.checkIssue(childOne);
		
		getLogger().log(Level.INFO, "Step 14 - Go to second repository");
		githubPage.goTo(github);
		githubPage.goToRepository(repoTwo);

		getLogger().log(Level.INFO, "Step 15 - Check Parent Two");
		githubPage.checkIssue(parentTwo);
		
		getLogger().log(Level.INFO, "Step 16 - Check Child Two");
		githubPage.checkIssue(childTwo);
		
	}
	
}
