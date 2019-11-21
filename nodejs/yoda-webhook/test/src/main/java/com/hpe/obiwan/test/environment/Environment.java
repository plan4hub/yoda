package com.hpe.obiwan.test.environment;

import java.io.IOException;
import java.io.InputStream;
import java.net.MalformedURLException;
import java.net.URL;
import java.util.HashMap;
import java.util.Map;
import java.util.Properties;
import java.util.logging.Level;
import java.util.logging.LogManager;
import java.util.logging.Logger;

public class Environment {

	private final static String LOGGING_CONFIGURATION_PATH = "/logging.properties";
	private final static String TEST_CONFIGURATION_PATH = "/test.properties";

	private final static String DRIVER_TYPE = "DRIVER_TYPE";
	private final static String DRIVER_REMOTE_URL = "DRIVER_REMOTE_URL";
	private final static String GITHUB_URL = "GITHUB_URL";
	private final static String GITHUB_USERNAME = "GITHUB_USERNAME";
	private final static String GITHUB_PASSWORD = "GITHUB_PASSWORD";
	private final static String GITHUB_REPO_ONE = "GITHUB_REPO_ONE";
	private final static String GITHUB_REPO_TWO = "GITHUB_REPO_TWO";
	
	private final static String DRIVER_TYPE_DEFAULT = "chrome";
	private final static String DRIVER_REMOTE_URL_DEFAULT = "http://pompeiv52.gre.hpecorp.net:4444/wd/hub";
	private final static String GITHUB_URL_DEFAULT = "https://github.hpe.com/";

	private final static Map<String, String> DEFAULTS = new HashMap<String, String>();
	static {
		DEFAULTS.put(DRIVER_TYPE, DRIVER_TYPE_DEFAULT);
		DEFAULTS.put(DRIVER_REMOTE_URL, DRIVER_REMOTE_URL_DEFAULT);
		DEFAULTS.put(GITHUB_URL,GITHUB_URL_DEFAULT);
	}

	private static Environment instance = null;

	public static Environment getEnvironment() {
		if (instance == null) {
			instance = new Environment();
		}
		return instance;
	}

	private Properties properties = new Properties();

	private Logger logger = null;

	private Environment() {

		try (InputStream input = Environment.class.getResourceAsStream(LOGGING_CONFIGURATION_PATH)) {
			LogManager.getLogManager().readConfiguration(input);
		} catch (IOException e) {
			getLogger().warning("Error loading logging configuration");
			getLogger().log(Level.WARNING, "Error loading logging configuration", e);
		}

		try (InputStream input = Environment.class.getResourceAsStream(TEST_CONFIGURATION_PATH)) {
			properties.load(input);
		} catch (IOException e) {
			getLogger().log(Level.WARNING, "Error loading test configuration", e);
		}

	}

	public Logger getLogger() {
		if (logger == null) {
			logger = Logger.getLogger(getClass().getName());
		}
		return logger;
	}
	
	private String getValue(String key) {
		String value = System.getProperty(key, properties.getProperty(key, DEFAULTS.get(key)));
		if (value == null) {
			getLogger().warning(String.format("Property %s not configured", key));
		}
		return value;
	}

	public String getDriverType() {
		return getValue(DRIVER_TYPE);
	}

	public URL getDriverRemoteUrl() {
		try {
			return new URL(getValue(DRIVER_REMOTE_URL));
		} catch (MalformedURLException e) {
			return null;
		}
	}

	public String getGithubUrl() {
		return getValue(GITHUB_URL);
	}

	public String getGithubUsername() {
		return getValue(GITHUB_USERNAME);
	}

	public String getGithubPassword() {
		return getValue(GITHUB_PASSWORD);
	}

	public String getGithubRepoOne() {
		return getValue(GITHUB_REPO_ONE);
	}

	public String getGithubRepoTwo() {
		return getValue(GITHUB_REPO_TWO);
	}

}
