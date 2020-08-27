package com.hpe.obiwan.test.beans;

import java.util.ArrayList;
import java.util.List;

public class Issue {
	
	private String id; 
	private String repository;
	private String title;
	private String label;
	private String milestone;
	private String error;
	private int estimated;
	private int remaining;
	private boolean closed;
	private List<Issue> parents = new ArrayList<Issue>();
	private List<Issue> children = new ArrayList<Issue>();
	private List<String> externalParents = new ArrayList<String>();
	private List<String> externalChildren = new ArrayList<String>();
	private Headline headline;

	public static Issue fromChildInfo(String info, String repository) {
		Issue issue = new Issue();
		int indexOne;
		int indexTwo;
		int indexThree;
		String part;
		if (info.startsWith("- ")) {
			info = info.substring("- ".length());
		}
		indexOne = info.indexOf("[");
		if (indexOne != -1) {
			indexTwo = info.indexOf("]", indexOne + 1);
			if (indexTwo != -1) {
				part = info.substring(indexOne + 1, indexTwo);
				info = info.substring(indexTwo + 1).trim();
				issue.setClosed("x".equals(part));
			}
		}
		indexOne = info.indexOf("#");
		if (indexOne != -1) {
			indexTwo = info.indexOf(" ", indexOne + 1);
			if (indexTwo != -1) {
				part = info.substring(0, indexTwo);
				info = info.substring(indexTwo + 1);
				if (indexOne > 0) {
					issue.setRepository(part.substring(0, indexOne));
				} else {
					issue.setRepository(repository);
				}
				issue.setId(part.substring(indexOne));
			}
		}
		indexOne = info.indexOf("**");
		if (indexOne != -1) {
			indexTwo = info.lastIndexOf("**");
			if (indexTwo > indexOne) {
				part = info.substring(indexOne + 2, indexTwo);
				info = info.substring(indexTwo + 2);
				issue.setError(part);
			}
		}
		indexOne = info.indexOf("[");
		if (indexOne != -1) {
			indexTwo = info.indexOf("]", indexOne + 1);
			if (indexTwo != -1) {
				part = info.substring(indexOne + 1, indexTwo);
				info = info.substring(indexTwo + 1).trim();
				issue.setLabel(part);
			}
		}
		indexOne = info.indexOf("(");
		if (indexOne != -1) {
			indexTwo = info.indexOf(")", indexOne + 1);
			if (indexTwo != -1) {
				part = info.substring(indexOne + 1, indexTwo);
				info = info.substring(indexTwo + 1).trim();
				indexThree = part.indexOf("/");
				if (indexThree != -1) {
					issue.setEstimated(Integer.parseInt(part.substring(0, indexThree).trim()));
					issue.setRemaining(Integer.parseInt(part.substring(indexThree + 1).trim()));
				}
			}
		}
		indexOne = info.indexOf("*");
		if (indexOne != -1) {
			indexTwo = info.lastIndexOf("*");
			if (indexTwo > indexOne) {
				issue.setTitle(info.substring(indexOne + 1, indexTwo));
			}
		}
		return issue;
	}

	public static Issue fromParentInfo(String info, String repository) {
		Issue issue = new Issue();
		int indexOne;
		int indexTwo;
		String part;
		if (info.startsWith("> partof ")) {
			info = info.substring("> partof ".length());
		}
		indexOne = info.indexOf("#");
		if (indexOne != -1) {
			indexTwo = info.indexOf(" ", indexOne + 1);
			if (indexTwo != -1) {
				part = info.substring(0, indexTwo);
				info = info.substring(indexTwo + 1);
				if (indexOne > 0) {
					issue.setRepository(part.substring(0, indexOne));
				} else {
					issue.setRepository(repository);
				}
				issue.setId(part.substring(indexOne));
			}
		}
		indexOne = info.indexOf("**");
		if (indexOne != -1) {
			indexTwo = info.lastIndexOf("**");
			if (indexTwo > indexOne) {
				part = info.substring(indexOne + 2, indexTwo);
				info = info.substring(indexTwo + 2);
				issue.setError(part);
			}
		}
		indexOne = info.indexOf("[");
		if (indexOne != -1) {
			indexTwo = info.indexOf("]", indexOne + 1);
			if (indexTwo != -1) {
				part = info.substring(indexOne + 1, indexTwo);
				info = info.substring(indexTwo + 1).trim();
				issue.setLabel(part);
			}
		}
		indexOne = info.indexOf("*");
		if (indexOne != -1) {
			indexTwo = info.lastIndexOf("*");
			if (indexTwo > indexOne) {
				issue.setTitle(info.substring(indexOne + 1, indexTwo));
			}
		}
		return issue;
	}

	public String getId() {
		return id;
	}
	public void setId(String id) {
		this.id = id;
	}
	public String getRepository() {
		return repository;
	}
	public void setRepository(String repository) {
		this.repository = repository;
	}
	public String getTitle() {
		return title;
	}
	public void setTitle(String title) {
		this.title = title;
	}
	public String getLabel() {
		return label;
	}
	public void setLabel(String label) {
		this.label = label;
	}
	public String getMilestone() {
		return milestone;
	}
	public void setMilestone(String milestone) {
		this.milestone = milestone;
	}
	public String getError() {
		return error;
	}
	public void setError(String error) {
		this.error = error;
	}
	public int getEstimated() {
		return estimated;
	}
	public void setEstimated(int estimated) {
		this.estimated = estimated;
	}
	public int getRemaining() {
		return remaining;
	}
	public void setRemaining(int remaining) {
		this.remaining = remaining;
	}
	public boolean isClosed() {
		return closed;
	}
	public void setClosed(boolean closed) {
		this.closed = closed;
	}
	public List<Issue> getParents() {
		return parents;
	}
	public List<Issue> getChildren() {
		return children;
	}
	public List<String> getExternalParents() {
		return externalParents;
	}
	public List<String> getExternalChildren() {
		return externalChildren;
	}
	public Headline getHeadline() {
		return headline;
	}
	public void setHeadline(Headline headline) {
		this.headline = headline;
	}

	@Override
	public boolean equals(Object object) {
		if (object instanceof Issue) {
			Issue issue = (Issue) object;
			return issue.getRepository() != null && issue.getRepository().equals(getRepository()) && issue.getId() != null && issue.getId().equals(getId());
		}
		return false;
	}
	
}
