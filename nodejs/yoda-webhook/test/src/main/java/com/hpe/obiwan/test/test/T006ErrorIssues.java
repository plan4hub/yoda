package com.hpe.obiwan.test.test;

import java.util.logging.Level;

import org.testng.Assert;

import com.hpe.obiwan.test.beans.Issue;
import com.hpe.obiwan.test.environment.Environment;
import com.hpe.obiwan.test.pages.Github;

public class T006ErrorIssues extends Base {

	private Github githubPage = new Github();

	protected void doTest() {
		
		String github = Environment.getEnvironment().getGithubUrl();

		String repoOne = Environment.getEnvironment().getGithubRepoOne();
		String repoTwo = Environment.getEnvironment().getGithubRepoTwo();
		
		String signature = getSignature();

		getLogger().log(Level.INFO, "Step 1 - Go to first repository");
		githubPage.goTo(github);
		githubPage.goToRepository(repoOne);

		getLogger().log(Level.INFO, "Step 2 - Create Child Issues");
		Issue childOne = new Issue();
		childOne.setRepository(repoOne);
		childOne.setTitle("Child One " + signature);
		githubPage.createIssue(childOne);
		delayBackend(5);
		Issue childTwo = new Issue();
		childTwo.setRepository(repoOne);
		childTwo.setTitle("Child Two " + signature);
		githubPage.createIssue(childTwo);
		delayBackend(5);

		getLogger().log(Level.INFO, "Step 3 - Create parent with text between children");
		Issue parentOne = new Issue();
		parentOne.setRepository(repoOne);
		parentOne.setTitle("Parent One " + signature);
		StringBuilder parentOneBody = new StringBuilder();
		parentOneBody.append("> contains\n");
		parentOneBody.append("- ").append(childOne.getId()).append("\n");
		parentOneBody.append("Unexpected text\n");
		parentOneBody.append("- ").append(childTwo.getId() + "\n");
		parentOneBody.append("\n");
		parentOneBody.append("This is the issue ").append(parentOne.getTitle()).append(".");
		String idOne = githubPage.createIssue(parentOne.getTitle(), parentOneBody.toString());
		parentOne.setId(idOne);
		delayBackend(5);
		parentOne.getChildren().add(childOne);
		parentOne.getChildren().add(childTwo);
		githubPage.checkIssue(parentOne);

		getLogger().log(Level.INFO, "Step 4 - Create parent with blank line between children");
		Issue parentTwo = new Issue();
		parentTwo.setRepository(repoOne);
		parentTwo.setTitle("Parent Two " + signature);
		StringBuilder parentTwoBody = new StringBuilder();
		parentTwoBody.append("> contains\n");
		parentTwoBody.append("- ").append(childOne.getId()).append("\n");
		parentTwoBody.append("\n");
		parentTwoBody.append("- ").append(childTwo.getId()).append("\n");
		parentTwoBody.append("\n");
		parentTwoBody.append("This is the issue ").append(parentTwo.getTitle()).append(".");
		String idTwo = githubPage.createIssue(parentTwo.getTitle(), parentTwoBody.toString());
		parentTwo.setId(idTwo);
		delayBackend(5);
		parentTwo.getChildren().add(childOne);
		githubPage.checkIssue(parentTwo);

		Issue dummy = new Issue();
		dummy.setRepository(repoTwo);
		dummy.setId("#9999");
		
		String errorNotExists = "**Unable to get issue details - non-existing issue/access right problem?**";

		getLogger().log(Level.INFO, "Step 5 - Create parent with non-existing children");
		Issue parentThree = new Issue();
		parentThree.setRepository(repoOne);
		parentThree.setTitle("Parent Three " + signature);
		parentThree.getChildren().add(dummy);
		githubPage.createIssue(parentThree);
		delayBackend(5);
		String bodyThree = githubPage.getBody(parentThree);
		Assert.assertTrue(bodyThree.indexOf(errorNotExists) != -1, "Expected child line not found");

		getLogger().log(Level.INFO, "Step 6 - Create child with non-existing parent");
		Issue childThree = new Issue();
		childThree.setRepository(repoOne);
		childThree.setTitle("Child Three " + signature);
		childThree.getParents().add(dummy);
		githubPage.createIssue(childThree);
		delayBackend(5);
		String bodyFour = githubPage.getBody(childThree);
		Assert.assertTrue(bodyFour.indexOf(errorNotExists) != -1, "Expected parent line not found");

		getLogger().log(Level.INFO, "Step 7 - Create parent with duplicated child");
		Issue parentFour = new Issue();
		parentFour.setRepository(repoOne);
		parentFour.setTitle("Parent Four " + signature);
		parentFour.getChildren().add(childOne);
		parentFour.getChildren().add(childOne);
		githubPage.createIssue(parentFour);
		delayBackend(5);
		parentFour.getChildren().clear();
		parentFour.getChildren().add(childOne);
		githubPage.checkIssue(parentFour);

		getLogger().log(Level.INFO, "Step 8 - Create child with duplicated parent");
		Issue childFour = new Issue();
		childFour.setRepository(repoOne);
		childFour.setTitle("Child Four " + signature);
		childFour.getParents().add(parentOne);
		childFour.getParents().add(parentOne);
		githubPage.createIssue(childFour);
		delayBackend(5);
		childFour.getParents().clear();
		childFour.getParents().add(parentOne);
		githubPage.checkIssue(childFour);

	}

}
