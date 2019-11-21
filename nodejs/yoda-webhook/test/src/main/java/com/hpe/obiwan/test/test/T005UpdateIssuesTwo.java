package com.hpe.obiwan.test.test;

import java.util.logging.Level;

import com.hpe.obiwan.test.beans.Issue;
import com.hpe.obiwan.test.environment.Environment;
import com.hpe.obiwan.test.pages.Github;

public class T005UpdateIssuesTwo extends Base {

	private Github githubPage = new Github();

	protected void doTest() {
		
		String github = Environment.getEnvironment().getGithubUrl();

		String repoOne = Environment.getEnvironment().getGithubRepoOne();
		
		String signature = getSignature();

		getLogger().log(Level.INFO, "Step 1 - Go to first repository");
		githubPage.goTo(github);
		githubPage.goToRepository(repoOne);

		getLogger().log(Level.INFO, "Step 2 - Create Issues");
		Issue parent = new Issue();
		parent.setRepository(repoOne);
		parent.setTitle("Parent " + signature);
		githubPage.createIssue(parent);
		delayBackend(5);
		Issue childOne = new Issue();
		childOne.setRepository(repoOne);
		childOne.setTitle("Child One " + signature);
		childOne.getParents().add(parent);
		childOne.setEstimated(2);
		childOne.setRemaining(2);
		githubPage.createIssue(childOne);
		delayBackend(5);
		parent.getChildren().add(childOne);
		Issue childTwo = new Issue();
		childTwo.setRepository(repoOne);
		childTwo.setTitle("Child Two " + signature);
		childTwo.getParents().add(parent);
		childTwo.setEstimated(1);
		childTwo.setRemaining(1);
		githubPage.createIssue(childTwo);
		delayBackend(5);
		parent.getChildren().add(childTwo);
		githubPage.checkIssue(parent);

		getLogger().log(Level.INFO, "Step 3 - Update Child One");
		childOne.setRemaining(1);
		githubPage.updateBody(childOne);
		delayBackend(5);
		githubPage.checkIssue(parent);

		getLogger().log(Level.INFO, "Step 4 - Update Child Two");
		childTwo.setRemaining(0);
		githubPage.updateBody(childTwo);
		delayBackend(5);
		githubPage.checkIssue(parent);

		getLogger().log(Level.INFO, "Step 5 - Close Child Two");
		githubPage.closeIssue(childTwo);
		delayBackend(5);
		githubPage.checkIssue(parent);

	}
	
}
