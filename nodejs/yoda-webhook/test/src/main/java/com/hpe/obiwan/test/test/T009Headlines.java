package com.hpe.obiwan.test.test;

import java.util.ArrayList;
import java.util.List;
import java.util.logging.Level;

import org.testng.Assert;

import com.hpe.obiwan.test.beans.Headline;
import com.hpe.obiwan.test.beans.Issue;
import com.hpe.obiwan.test.environment.Environment;
import com.hpe.obiwan.test.pages.Github;

public class T009Headlines extends Base {

	private Github githubPage = new Github();

	protected void doTest() {
		
		String github = Environment.getEnvironment().getGithubUrl();

		String repoOne = Environment.getEnvironment().getGithubRepoOne();
		
		String signature = getSignature();
		
		getLogger().log(Level.INFO, "Step 1 - Go to first repository");
		githubPage.goTo(github);
		githubPage.goToRepository(repoOne);

		getLogger().log(Level.INFO, "Step 2 - Create Child Issues");
		Issue childOne = new Issue();
		childOne.setRepository(repoOne);
		childOne.setTitle("Child One " + signature);
		childOne.setMilestone("Milestone One");
		childOne.setLabel("T1 - Defect");
		githubPage.createIssue(childOne);
		waitHook();
		Issue childTwo = new Issue();
		childTwo.setRepository(repoOne);
		childTwo.setTitle("Child Two " + signature);
		childTwo.setMilestone("Milestone One");
		childTwo.setLabel("T2 - Enhancement");
		githubPage.createIssue(childTwo);
		waitHook();
		Issue childThree = new Issue();
		childThree.setRepository(repoOne);
		childThree.setTitle("Child Three " + signature);
		childThree.setMilestone("Milestone Two");
		childThree.setLabel("T1 - Defect");
		githubPage.createIssue(childThree);
		waitHook();
		Issue childFour = new Issue();
		childFour.setRepository(repoOne);
		childFour.setTitle("Child Four " + signature);
		childFour.setLabel("T1 - Defect");
		githubPage.createIssue(childFour);
		waitHook();

		getLogger().log(Level.INFO, "Step 3 - Create parents");
		Issue parentOne = new Issue();
		parentOne.setRepository(repoOne);
		parentOne.setTitle("Parent One " + signature);
		parentOne.setHeadline(new Headline(true, "T1 - Defect"));
		parentOne.getChildren().add(childOne);
		parentOne.getChildren().add(childTwo);
		parentOne.getChildren().add(childThree);
		parentOne.getChildren().add(childFour);
		githubPage.createIssue(parentOne);
		waitHook();
		childOne.getParents().add(parentOne);
		childTwo.getParents().add(parentOne);
		childThree.getParents().add(parentOne);
		childFour.getParents().add(parentOne);
		Issue parentTwo = new Issue();
		parentTwo.setRepository(repoOne);
		parentTwo.setTitle("Parent Two " + signature);
		parentTwo.setHeadline(new Headline(true));
		parentTwo.getChildren().add(childOne);
		parentTwo.getChildren().add(childTwo);
		parentTwo.getChildren().add(childThree);
		parentTwo.getChildren().add(childFour);
		githubPage.createIssue(parentTwo);
		waitHook();
		childOne.getParents().add(parentTwo);
		childTwo.getParents().add(parentTwo);
		childThree.getParents().add(parentTwo);
		childFour.getParents().add(parentTwo);
		Issue parentThree = new Issue();
		parentThree.setRepository(repoOne);
		parentThree.setTitle("Parent Three " + signature);
		parentThree.setHeadline(new Headline(false, "T1 - Defect"));
		parentThree.getChildren().add(childOne);
		parentThree.getChildren().add(childTwo);
		parentThree.getChildren().add(childThree);
		parentThree.getChildren().add(childFour);
		githubPage.createIssue(parentThree);
		waitHook();
		childOne.getParents().add(parentThree);
		childTwo.getParents().add(parentThree);
		childThree.getParents().add(parentThree);
		childFour.getParents().add(parentThree);

		getLogger().log(Level.INFO, "Step 4 - Check issues");
		githubPage.checkIssue(childOne);
		githubPage.checkIssue(childTwo);
		githubPage.checkIssue(childThree);
		githubPage.checkIssue(childFour);
		githubPage.checkIssue(parentOne);
		githubPage.checkIssue(parentTwo);
		githubPage.checkIssue(parentThree);

		getLogger().log(Level.INFO, "Step 5 - Check parents headline");
		Assert.assertTrue(checkHeadline(parentOne), "Error in parent headlines");
		Assert.assertTrue(checkHeadline(parentTwo), "Error in parent headlines");
		Assert.assertTrue(checkHeadline(parentThree), "Error in parent headlines");

		getLogger().log(Level.INFO, "Step 6 - Udpate child label");
		githubPage.updateLabel(childOne, "T2 - Enhancement");
		waitHook();

		getLogger().log(Level.INFO, "Step 7 - Check parents headline");
		Assert.assertTrue(checkHeadline(parentOne), "Error in parent headlines");
		Assert.assertTrue(checkHeadline(parentTwo), "Error in parent headlines");
		Assert.assertTrue(checkHeadline(parentThree), "Error in parent headlines");

		getLogger().log(Level.INFO, "Step 8 - Udpate child milestone");
		githubPage.updateMilestone(childTwo, "Milestone Two");
		waitHook();

		getLogger().log(Level.INFO, "Step 9 - Check parents headline");
		Assert.assertTrue(checkHeadline(parentOne), "Error in parent headlines");
		Assert.assertTrue(checkHeadline(parentTwo), "Error in parent headlines");
		Assert.assertTrue(checkHeadline(parentThree), "Error in parent headlines");

		getLogger().log(Level.INFO, "Step 10 - Delete child milestone");
		githubPage.updateMilestone(childThree, null);
		waitHook();

		getLogger().log(Level.INFO, "Step 11 - Check parents headline");
		Assert.assertTrue(checkHeadline(parentOne), "Error in parent headlines");
		Assert.assertTrue(checkHeadline(parentTwo), "Error in parent headlines");
		Assert.assertTrue(checkHeadline(parentThree), "Error in parent headlines");

		getLogger().log(Level.INFO, "Step 12 - Insert child milestone");
		githubPage.updateMilestone(childFour, "Milestone One");
		waitHook();

		getLogger().log(Level.INFO, "Step 13 - Check parents headline");
		Assert.assertTrue(checkHeadline(parentOne), "Error in parent headlines");
		Assert.assertTrue(checkHeadline(parentTwo), "Error in parent headlines");
		Assert.assertTrue(checkHeadline(parentThree), "Error in parent headlines");

	}
	
	private boolean checkHeadline(Issue parent) {
		
		Headline headline = parent.getHeadline();
		if (headline == null) {
			getLogger().severe("No headline found");
			return false;
		}
		
		String[] lines = githubPage.getBody(parent).split("\n");
		List<Issue> children = new ArrayList<Issue>(parent.getChildren());
		boolean found = false;
		String milestone = "";
		String label = "";
		for (String line : lines) {
			if (line.startsWith("> contains")) {
				found = true;
			} else if (found && line.startsWith(headline.getFormat())) {
				int indexOne = headline.getFormat().length();
				int indexTwo = line.indexOf("[", indexOne);
				if (indexTwo != -1) {
					int indexThree = line.indexOf("]", indexTwo);
					label = line.substring(indexTwo + 1, indexThree).trim();
					milestone = line.substring(indexOne, indexTwo).trim();
				} else {
					label = "";
					milestone = line.substring(indexOne).trim();
				}
			} else if (found && line.startsWith("- ")) {
				int indexOne = line.indexOf("#");
				if (indexOne != -1) {
					int indexTwo = line.indexOf(" ", indexOne);
					if (indexTwo != -1) {
						String childrenId = line.substring(indexOne, indexTwo);
						boolean missing = true;
						for (Issue child : children) {
							if (child.getId().equals(childrenId)) {
								if (headline.isMilestone()) {
									if (child.getMilestone() != null && !child.getMilestone().equals(milestone)) {
										getLogger().severe("Wrong milestone, expected " + child.getMilestone() + ", got " + milestone);
										return false;
									}
									if (child.getMilestone() == null && !"No Milestone".equals(milestone)) {
										getLogger().severe("Wrong milestone, expected No Milestone, got " + milestone);
										return false;
									}
								} else if (milestone.length() > 0) {
									getLogger().severe("Wrong milestone, expected none, got " + milestone);
									return false;
								}
								if (headline.getLabels().size() > 0) {
									if (label.length() > 0 && label.indexOf(child.getLabel()) == -1) {
										getLogger().severe("Wrong label, expected none, got " + label);
										return false;
									}
									if (label.length() == 0 && child.getLabel() != null && headline.getLabels().contains(child.getLabel())) {
										getLogger().severe("Wrong label, expected " + child.getLabel() + ", got none");
										return false;
									}
								} else if (label.length() > 0) {
									getLogger().severe("Wrong label, expected none, got " + label);
									return false;
								}
								children.remove(child);
								missing = false;
								break;
							}
						}
						if (missing) {
							getLogger().severe("Unexpected child " + childrenId + "found");
							return false;
						}
					}
				}
			} else if (line.length() == 0) {
				found = false;
			}
		}
		if (children.size() > 0) {
			getLogger().severe("Missing " + children.size() + " children");
			return false;
		}
		return true;

	}

}
