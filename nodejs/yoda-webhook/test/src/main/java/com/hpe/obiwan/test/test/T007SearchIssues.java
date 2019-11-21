package com.hpe.obiwan.test.test;

import java.util.logging.Level;

import com.hpe.obiwan.test.beans.Issue;
import com.hpe.obiwan.test.environment.Environment;
import com.hpe.obiwan.test.pages.Github;

public class T007SearchIssues extends Base {

	private Github githubPage = new Github();

	protected void doTest() {
		
		String github = Environment.getEnvironment().getGithubUrl();

		String repoTwo = Environment.getEnvironment().getGithubRepoTwo();
		
		String signature = getSignature();

		getLogger().log(Level.INFO, "Step 1 - Go to first repository");
		githubPage.goTo(github);
		githubPage.goToRepository(repoTwo);

		getLogger().log(Level.INFO, "Step 2 - Create Child Issues");
		Issue childOne = new Issue();
		childOne.setRepository(repoTwo);
		childOne.setTitle("Child One " + signature);
		childOne.setMilestone("Yoda 1.0.0");
		childOne.setEstimated(2);
		childOne.setRemaining(2);
		githubPage.createIssue(childOne);
		waitHook();
		Issue childTwo = new Issue();
		childTwo.setRepository(repoTwo);
		childTwo.setTitle("Child Two " + signature);
		childTwo.setMilestone("Yoda 1.0.0");
		childTwo.setEstimated(1);
		childTwo.setRemaining(1);
		githubPage.createIssue(childTwo);
		waitHook();

		getLogger().log(Level.INFO, "Step 3 - Create parent with search");
		Issue parentOne = new Issue();
		parentOne.setRepository(repoTwo);
		parentOne.setTitle("Parent One " + signature);
		StringBuilder parentOneBody = new StringBuilder();
		parentOneBody.append("> contains\n");
		parentOneBody.append("> issuesearch repo:").append(repoTwo).append(" milestone:\"Yoda 1.0.0\" in:title ").append(signature).append("\n");
		parentOneBody.append("\n");
		parentOneBody.append("This is the issue ").append(parentOne.getTitle()).append(".");
		String idOne = githubPage.createIssue(parentOne.getTitle(), parentOneBody.toString());
		parentOne.setId(idOne);
		waitHook();
		parentOne.getChildren().add(childOne);
		parentOne.getChildren().add(childTwo);
		childOne.getParents().add(parentOne);
		childTwo.getParents().add(parentOne);
		githubPage.checkIssue(childOne);
		githubPage.checkIssue(childTwo);
		githubPage.checkIssue(parentOne);

		getLogger().log(Level.INFO, "Step 3 - Decrease remaining");
		childOne.setRemaining(1);
		githubPage.updateBody(childOne);
		waitHook();
		childTwo.setRemaining(0);
		githubPage.updateBody(childTwo);
		waitHook();
		githubPage.checkIssue(parentOne);

		getLogger().log(Level.INFO, "Step 3 - Close child");
		childOne.setRemaining(1);
		githubPage.closeIssue(childTwo);
		waitHook();
		githubPage.checkIssue(parentOne);

	}

}
