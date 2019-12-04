package com.hpe.obiwan.test.test;

import java.util.logging.Level;

import com.hpe.obiwan.test.beans.Issue;
import com.hpe.obiwan.test.environment.Environment;
import com.hpe.obiwan.test.pages.Github;

public class T008FullUrlReferences extends Base {

	private Github githubPage = new Github();

	protected void doTest() {
		
		String github = Environment.getEnvironment().getGithubUrl();

		String repoTwo = Environment.getEnvironment().getGithubRepoTwo();
		
		String signature = getSignature();

		getLogger().log(Level.INFO, "Step 1 - Go to second repository");
		githubPage.goTo(github);
		githubPage.goToRepository(repoTwo);

		getLogger().log(Level.INFO, "Step 2 - Create Issues");
		Issue parentOne = new Issue();
		parentOne.setRepository(repoTwo);
		parentOne.setTitle("ParentOne " + signature);
		githubPage.createIssue(parentOne);
		waitHook();
		Issue parentTwo = new Issue();
		parentTwo.setRepository(repoTwo);
		parentTwo.setTitle("ParentTwo " + signature);
		githubPage.createIssue(parentTwo);
		waitHook();
		Issue childOne = new Issue();
		childOne.setRepository(repoTwo);
		childOne.setTitle("Child One " + signature);
		githubPage.createIssue(childOne);
		waitHook();
		Issue childTwo = new Issue();
		childTwo.setRepository(repoTwo);
		childTwo.setTitle("Child Two " + signature);
		githubPage.createIssue(childTwo);
		waitHook();

		Issue childErrorIssue = new Issue();
		childErrorIssue.setRepository(repoTwo);
		childErrorIssue.setId("#9999");
		childErrorIssue.setError("Unable to get issue details - non-existing issue/access right problem?");
		
		String externalChild = "https://www.google.com";

		getLogger().log(Level.INFO, "Step 3 - Update Parent Issue");
		parentOne.getExternalChildren().add(getUrl(childTwo));
		parentOne.getExternalChildren().add(getUrl(childErrorIssue));
		parentOne.getExternalChildren().add(externalChild);
		githubPage.updateBody(parentOne);
		waitHook();
		parentOne.getChildren().add(childTwo);
		parentOne.getChildren().add(childErrorIssue);
		parentOne.getExternalChildren().remove(0);
		parentOne.getExternalChildren().remove(0);
		githubPage.checkIssue(parentOne);
		
		Issue parentErrorIssue = new Issue();
		parentErrorIssue.setRepository(repoTwo);
		parentErrorIssue.setId("#8888");
		parentErrorIssue.setError("Unable to get issue details - non-existing issue/access right problem?");

		String externalParent = "https://www.cnn.com";

		getLogger().log(Level.INFO, "Step 4 - Update Child Issue");
		childOne.getExternalParents().add(getUrl(parentTwo));
		childOne.getExternalParents().add(getUrl(parentErrorIssue));
		childOne.getExternalParents().add(externalParent);
		githubPage.updateBody(childOne);
		waitHook();
		childOne.getParents().add(parentTwo);
		childOne.getParents().add(parentErrorIssue);
		childOne.getExternalParents().remove(0);
		childOne.getExternalParents().remove(0);
		githubPage.checkIssue(childOne);

	}
	
	private String getUrl(Issue issue) {
		return getUrl(issue.getRepository(), issue.getId().substring(1));
	}

	private String getUrl(String repository, String issue) {
		return String.format("%s%s/issues/%s", Environment.getEnvironment().getGithubUrl(), repository, issue);
	}

}
