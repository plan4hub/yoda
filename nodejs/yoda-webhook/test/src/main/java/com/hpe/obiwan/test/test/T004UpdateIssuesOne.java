package com.hpe.obiwan.test.test;

import java.util.logging.Level;

import com.hpe.obiwan.test.beans.Issue;
import com.hpe.obiwan.test.environment.Environment;
import com.hpe.obiwan.test.pages.Github;

public class T004UpdateIssuesOne extends Base {

	private Github githubPage = new Github();

	protected void doTest() {
		
		String github = Environment.getEnvironment().getGithubUrl();

		String repoOne = Environment.getEnvironment().getGithubRepoOne();
		
		String signature = getSignature();

		getLogger().log(Level.INFO, "Step 1 - Go to first repository");
		githubPage.goTo(github);
		githubPage.goToRepository(repoOne);

		getLogger().log(Level.INFO, "Step 2 - Create Issues");
		Issue parentOne = new Issue();
		parentOne.setRepository(repoOne);
		parentOne.setTitle("Parent One " + signature);
		githubPage.createIssue(parentOne);
		waitHook();
		Issue parentTwo = new Issue();
		parentTwo.setRepository(repoOne);
		parentTwo.setTitle("Parent Two " + signature);
		githubPage.createIssue(parentTwo);
		waitHook();
		Issue childOne = new Issue();
		childOne.setRepository(repoOne);
		childOne.setTitle("Child One " + signature);
		childOne.getParents().add(parentOne);
		githubPage.createIssue(childOne);
		waitHook();
		parentOne.getChildren().add(childOne);
		Issue childTwo = new Issue();
		childTwo.setRepository(repoOne);
		childTwo.setTitle("Child Two " + signature);
		childTwo.setLabel("T1 - Defect");
		childTwo.getParents().add(parentTwo);
		githubPage.createIssue(childTwo);
		waitHook();
		parentTwo.getChildren().add(childTwo);
		
		getLogger().log(Level.INFO, "Step 3 - Adding a parent reference");
		childOne.getParents().add(parentTwo);
		githubPage.updateBody(childOne);
		waitHook();
		parentTwo.getChildren().add(childOne);
		githubPage.checkIssue(parentTwo);
		githubPage.checkIssue(childOne);
		
		getLogger().log(Level.INFO, "Step 4 - Removing a parent reference");
		childOne.getParents().remove(parentOne);
		githubPage.updateBody(childOne);
		waitHook();
		parentOne.getChildren().remove(childOne);
		githubPage.checkIssue(parentOne);
		githubPage.checkIssue(childOne);
		
		getLogger().log(Level.INFO, "Step 5 - Adding a child reference");
		parentOne.getChildren().add(childOne);
		githubPage.updateBody(parentOne);
		waitHook();
		childOne.getParents().add(parentOne);
		githubPage.checkIssue(parentOne);
		githubPage.checkIssue(childOne);
		
		getLogger().log(Level.INFO, "Step 6 - Changing a child reference");
		parentOne.getChildren().remove(childOne);
		parentOne.getChildren().add(childTwo);
		githubPage.updateBody(parentOne);
		waitHook();
		childOne.getParents().remove(parentOne);
		childTwo.getParents().add(parentOne);
		githubPage.checkIssue(parentOne);
		githubPage.checkIssue(childOne);
		githubPage.checkIssue(childTwo);
		
		getLogger().log(Level.INFO, "Step 7 - Closing a child issue");
		githubPage.closeIssue(childTwo);
		waitHook();
		githubPage.checkIssue(parentTwo);
		githubPage.checkIssue(childTwo);
		
		getLogger().log(Level.INFO, "Step 8 - Opening a child issue");
		githubPage.openIssue(childTwo);
		waitHook();
		githubPage.checkIssue(parentTwo);
		githubPage.checkIssue(childTwo);
		
		getLogger().log(Level.INFO, "Step 9 - Changing a child label");
		githubPage.updateLabel(childTwo, "T2 - Enhancement");
		waitHook();
		githubPage.checkIssue(parentTwo);
		
		getLogger().log(Level.INFO, "Step 10 - Adding a parent label");
		githubPage.updateLabel(parentTwo, "T6 - Epic");
		waitHook();
		githubPage.checkIssue(childOne);
		githubPage.checkIssue(childTwo);
		
		getLogger().log(Level.INFO, "Step 11 - Changing a child title");
		githubPage.updateTitle(childTwo, "Child Two Updated " + signature);
		waitHook();
		githubPage.checkIssue(parentTwo);
		
		getLogger().log(Level.INFO, "Step 12 - Changing a parent title");
		githubPage.updateTitle(parentTwo, "Parent Two Updated " + signature);
		waitHook();
		githubPage.checkIssue(childOne);
		githubPage.checkIssue(childTwo);
		
	}
	
}
