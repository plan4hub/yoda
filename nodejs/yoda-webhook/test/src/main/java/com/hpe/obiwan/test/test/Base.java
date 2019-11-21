package com.hpe.obiwan.test.test;

import java.io.File;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.logging.Level;
import java.util.logging.Logger;

import org.testng.annotations.Test;

import com.hpe.obiwan.test.pages.Github;

public abstract class Base {

	private final static Logger LOGGER = Logger.getLogger(Base.class.getName());

	private final static SimpleDateFormat FORMATTER = new SimpleDateFormat("yyyyMMddHHmmss");

	private final static String EXECUTION_ID = FORMATTER.format(new Date());

	private Github githubPage = new Github();

	private Logger logger = null;

	protected static String getExecutionId() {
		return EXECUTION_ID;
	}

	protected String getTestId() {
		return getClass().getSimpleName().substring(1, 4);
	}

	protected String getSignature() {
		return String.format("%s-%s", getTestId(), getExecutionId());
	}

	protected Logger getLogger() {
		if (logger == null) {
			logger = Logger.getLogger(getClass().getName());
		}
		return logger;
	}

	protected void delayBackend(int seconds) {
		try {
			Thread.sleep(1000L * seconds);
		} catch (InterruptedException e) {
			getLogger().log(Level.WARNING, "Unexpected exception", e);
		}
	}

	protected abstract void doTest();

	@Test
	public void test() {
		try {
			LOGGER.log(Level.INFO, "Starting test " + getClass().getSimpleName());
			doTest();
		} catch (RuntimeException e) {
			LOGGER.log(Level.SEVERE, "Error running test", e);
			File path = new File(System.getProperty("java.io.tmpdir"), getClass().getSimpleName() + ".png");
			githubPage.saveScreenshot(path);
			throw e;
		} finally {
			LOGGER.log(Level.INFO, "Ended test " + getClass().getSimpleName());
		}
	}

}
