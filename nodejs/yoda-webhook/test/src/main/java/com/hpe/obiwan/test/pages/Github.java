package com.hpe.obiwan.test.pages;

import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;

import org.testng.Assert;

import com.hpe.obiwan.test.beans.Issue;

public class Github extends Base {
	
	private final static SimpleDateFormat REMAINING_DATE_FORMAT = new SimpleDateFormat("yyyy-MM-dd");

	public void login(String username, String password) {
		click("//a[text()='Sign in with SAML']");
		write("//input[@id='username']", username);
		write("//input[@id='password']", password, true);
		click("//input[@type='submit']");
	}
	
	public void goTo(String url) {
		go(url);
	}
	
	public void goToRepository(String repository) {
		write("//input[@id='dashboard-repos-filter-left']", repository);
		click("//div[@aria-label='Repositories']//a[@href='/" + repository + "']");
	}
	
	public String createIssue(String title, String body, String label, String milestone) {
		click("//nav[@aria-label='Repository']//span[text()='Issues']");
		click("//div[contains(@class,'repository-content')]//a[contains(text(),'New issue')]");
		if (label != null) {
			click("//div[contains(@class,'sidebar-labels')]//summary");
			write("//input[@id='label-filter-field']", label);
			click("//span[text()='" + label + "']");
			click("//div[contains(@class,'sidebar-labels')]//summary");
		}
		if (milestone != null) {
			click("//div[contains(@class,'sidebar-milestone')]//summary");
			write("//input[@id='context-milestone-filter-field']", milestone);
			click("//span[text()='" + milestone + "']");
		}
		write("//input[@name='issue[title]']", title);
		write("//textarea[@name='issue[body]']", body);
		click("//button[contains(text(),'Submit new issue')]");
		return getText("//span[@class='gh-header-number']");
	}
	
	public String createIssue(String title, String body) {
		return createIssue(title, body, null, null);
	}

	public void createIssue(Issue issue) {
		String id = createIssue(issue.getTitle(), buildBody(issue), issue.getLabel(), issue.getMilestone());
		issue.setId(id);
	}
	
	public void updateBody(Issue issue) {
		searchIssue(issue);
		click("//div[contains(@class,'timeline-comment-actions')]/details[2]");
		click("//button[@aria-label='Edit comment']");
		write("//textarea[@name='issue[body]']", buildBody(issue));
		click("//button[text()='Update comment']");
	}
	
	public void updateLabel(Issue issue, String newLabel) {
		searchIssue(issue);
		click("//div[contains(@class,'sidebar-labels')]//summary");
		if (issue.getLabel() != null) {
			write("//input[@id='label-filter-field']", issue.getLabel());
			click("//span[text()='" + issue.getLabel() + "']");
		}
		if (newLabel != null) {
			write("//input[@id='label-filter-field']", newLabel);
			click("//span[text()='" + newLabel + "']");
		}
		click("//div[contains(@class,'sidebar-labels')]//summary");
		issue.setLabel(newLabel);
	}
	
	public void updateTitle(Issue issue, String newTitle) {
		searchIssue(issue);
		click("//div[contains(@class,'gh-header-show')]//button[contains(text(),'Edit')]");
		write("//input[@name='issue[title]']", newTitle);
		click("//div[contains(@class,'gh-header-edit')]//button[contains(text(),'Save')]");
		issue.setTitle(newTitle);
	}
	
	public void closeIssue(Issue issue) {
		searchIssue(issue);
		click("//button[@name='comment_and_close']");
		issue.setClosed(true);
	}
	
	public void openIssue(Issue issue) {
		searchIssue(issue);
		click("//button[@name='comment_and_open']");		
		issue.setClosed(false);
	}
	
	public String getBody(Issue issue) {
		searchIssue(issue);
		click("//div[contains(@class,'timeline-comment-actions')]/details[2]");
		click("//button[@aria-label='Edit comment']");
		return getText("//textarea[@name='issue[body]']");
	}
	
	public void checkIssue(Issue issue) {
		String comment = getBody(issue);
		Assert.assertTrue(checkParents(issue, comment), "Error in issue parents");
		Assert.assertTrue(checkChildren(issue, comment), "Error in issue children");
	}
	
	private void searchIssue(Issue issue) {
		click("//nav[@aria-label='Repository']//span[text()='Issues']");
		write("//input[@id='js-issues-search']", "in:title " + issue.getTitle());
		sendReturn("//input[@id='js-issues-search']");
		click("//a[text()='" + issue.getTitle() + "']");
	}
	
	private String buildBody(Issue issue) {
		StringBuilder sb = new StringBuilder();
		if (issue.getEstimated() > 0) {
			sb.append("> estimate ").append(issue.getEstimated()).append("\n\n");
			sb.append("> remaining ");
			sb.append(REMAINING_DATE_FORMAT.format(new Date())).append(" ");
			sb.append(issue.getRemaining()).append("\n\n");
		}
		if (issue.getParents().size() > 0) {
			for (Issue parent : issue.getParents()) {
				sb.append("> partof ");
				if (!issue.getRepository().equals(parent.getRepository())) {
					sb.append(parent.getRepository());
				}
				sb.append(parent.getId()).append("\n\n");
			}
		}
		if (issue.getChildren().size() > 0) {
			sb.append("> contains\n");
			for (Issue child : issue.getChildren()) {
				sb.append("- ");
				if (!issue.getRepository().equals(child.getRepository())) {
					sb.append(child.getRepository());
				}
				sb.append(child.getId()).append("\n");
			}
			sb.append("\n");
		}
		sb.append("This is the issue ").append(issue.getTitle()).append(".");
		return sb.toString();
	}

	private boolean checkParents(Issue issue, String comment) {
		String[] lines = comment.split("\n");
		List<Issue> parents = new ArrayList<Issue>();
		for (String line : lines) {
			if (line.startsWith("> partof ")) {
				parents.add(Issue.fromParentInfo(line, issue.getRepository()));
			}
		}
		if (issue.getParents().size() != parents.size()) {
			return false;
		}
		for (Issue expected : issue.getParents()) {
			boolean missing = true;
			for (Issue observed : parents) {
				if (expected.getRepository().equals(observed.getRepository()) && expected.getId().equals(observed.getId())) {
					if (expected.isClosed() != observed.isClosed()) {
						getLogger().severe("Wrong status of issue " + expected.getRepository() + expected.getId());
						return false;
					}
					if (expected.getLabel() == null && observed.getLabel() != null) {
						getLogger().severe("Wrong label of issue " + expected.getRepository() + expected.getId());
						return false;
					}
					if (expected.getLabel() != null && !expected.getLabel().equals(observed.getLabel())) {
						getLogger().severe("Wrong label of issue " + expected.getRepository() + expected.getId());
						return false;
					}
					if (!expected.getTitle().equals(observed.getTitle())) {
						getLogger().severe("Wrong title of issue " + expected.getRepository() + expected.getId());
						return false;
					}
					missing = false;
					break;
				}
			}
			if (missing) {
				getLogger().severe("Missing parent issue " + expected.getRepository() + expected.getId());
				return false;
			}
		}
		return true;
	}
	
	private boolean checkChildren(Issue issue, String comment) {
		String[] lines = comment.split("\n");
		int observedEstimated = 0;
		int observedRemaining = 0;
		int observedClosed = 0;
		int observedOpened = 0;
		List<Issue> children = new ArrayList<Issue>();
		boolean found = false;
		for (String line : lines) {
			if (line.startsWith("> contains")) {
				found = true;
				int indexOne = line.indexOf("(");
				if (indexOne != -1) {
					int indexTwo = line.indexOf(")", indexOne);
					if (indexTwo != -1) {
						String part = line.substring(indexOne + 1, indexTwo);
						String[] pairs = part.split(",");
						for (String pair : pairs) {
							String[] keyValue = pair.split(":");
							if (keyValue.length != 2) {
								continue;
							}
							switch (keyValue[0].trim()) {
							case "total estimate":
								observedEstimated = Integer.parseInt(keyValue[1].trim());
								break;
							case "total remaining":
								observedRemaining = Integer.parseInt(keyValue[1].trim());
								break;
							case "# closed issues":
								observedClosed = Integer.parseInt(keyValue[1].trim());
								break;
							case "# open issues":
								observedOpened = Integer.parseInt(keyValue[1].trim());
								break;
							}
						}
					}
				}
			} else if (found && line.startsWith("- ")) {
				children.add(Issue.fromChildInfo(line, issue.getRepository()));
			} else if (line.length() == 0) {
				found = false;
			}
		}
		if (issue.getChildren().size() != children.size()) {
			return false;
		}
		int expectedEstimated = 0;
		int expectedRemaining = 0;
		int expectedClosed = 0;
		int expectedOpened = 0;
		for (Issue expected : issue.getChildren()) {
			expectedEstimated += expected.getEstimated();
			expectedRemaining += expected.getRemaining();
			if (expected.isClosed()) {
				expectedClosed++;
			} else {
				expectedOpened++;
			}
			boolean missing = true;
			for (Issue observed : children) {
				if (expected.getRepository().equals(observed.getRepository()) && expected.getId().equals(observed.getId())) {
					if (expected.getLabel() == null && observed.getLabel() != null) {
						getLogger().severe("Wrong label of issue " + expected.getRepository() + expected.getId());
						return false;
					}
					if (expected.getLabel() != null && !expected.getLabel().equals(observed.getLabel())) {
						getLogger().severe("Wrong label of issue " + expected.getRepository() + expected.getId());
						return false;
					}
					if (!expected.getTitle().equals(observed.getTitle())) {
						getLogger().severe("Wrong title of issue " + expected.getRepository() + expected.getId());
						return false;
					}
					missing = false;
					break;
				}
			}
			if (missing) {
				getLogger().severe("Missing parent issue " + expected.getRepository() + expected.getId());
				return false;
			}
		}
		if (expectedEstimated != observedEstimated) {
			getLogger().severe("Estimated count mismatch");
			return false;
		}
		if (expectedRemaining != observedRemaining) {
			getLogger().severe("Remaining count mismatch");
			return false;
		}
		if (expectedClosed != observedClosed) {
			getLogger().severe("Closed count mismatch");
			return false;
		}
		if (expectedOpened != observedOpened) {
			getLogger().severe("Opened count mismatch");
			return false;
		}
		return true;
	}
	
}
