package com.hpe.obiwan.test.beans;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

public class Headline {
	
	private String format; 
	private boolean milestone;
	private List<String> labels;
	
	public Headline() {
		List<String> labels = new ArrayList<String>();
		this.format = "### ";
		this.milestone = true;
		this.labels = Collections.unmodifiableList(labels);
		
	}
	
	public Headline(boolean milestone) {
		List<String> labels = new ArrayList<String>();
		this.format = "### ";
		this.milestone = milestone;
		this.labels = Collections.unmodifiableList(labels);
	}
	
	public Headline(boolean milestone, String label) {
		List<String> labels = new ArrayList<String>();
		labels.add(label);
		this.format = "### ";
		this.milestone = milestone;
		this.labels = Collections.unmodifiableList(labels);
	}
	
	public Headline(boolean milestone, List<String> labels) {
		this.format = "### ";
		this.milestone = milestone;
		this.labels = Collections.unmodifiableList(labels);
	}

	public String getFormat() {
		return format;
	}

	public boolean isMilestone() {
		return milestone;
	}

	public List<String> getLabels() {
		return labels;
	}

}
