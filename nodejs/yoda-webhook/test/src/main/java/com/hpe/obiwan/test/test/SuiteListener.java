package com.hpe.obiwan.test.test;

import java.util.logging.Level;
import java.util.logging.Logger;

import org.testng.IExecutionListener;

import com.hpe.obiwan.test.driver.Driver;

public class SuiteListener implements IExecutionListener {

	private Logger logger = null;

	protected Logger getLogger() {
		if (logger == null) {
			logger = Logger.getLogger(getClass().getName());
		}
		return logger;
	}

	@Override
	public void onExecutionStart() {
		getLogger().log(Level.INFO, "Open browser");
		Driver.getDriver();
	}

	@Override
	public void onExecutionFinish() {
		getLogger().log(Level.INFO, "Close browser");
		Driver.getDriver().close();
		Driver.getDriver().quit();
	}

}
