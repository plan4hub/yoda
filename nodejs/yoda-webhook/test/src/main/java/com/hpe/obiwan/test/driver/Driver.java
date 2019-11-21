package com.hpe.obiwan.test.driver;

import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.openqa.selenium.Dimension;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.chrome.ChromeDriver;
import org.openqa.selenium.chrome.ChromeOptions;
import org.openqa.selenium.remote.DesiredCapabilities;
import org.openqa.selenium.remote.RemoteWebDriver;

import com.hpe.obiwan.test.environment.Environment;

public class Driver {

	private final static String TYPE_CHROME = "chrome";
	private final static String TYPE_CHROME_REMOTE = "chrome-remote";

	private final static String TYPE_DEFAULT = TYPE_CHROME;

	private final static List<String> TYPES = Arrays.asList(new String[] { 
		TYPE_CHROME,
		TYPE_CHROME_REMOTE
	});

	private final static Map<String, WebDriver> DRIVERS = new HashMap<String, WebDriver>();

	private Driver() { }

	public static WebDriver getDriver() {

		String type = Environment.getEnvironment().getDriverType();

		String theType;

		if (TYPES.contains(type)) {
			theType = type;
		} else {
			theType = TYPE_DEFAULT;
		}

		WebDriver driver = DRIVERS.get(theType);

		if (driver == null) {

			if (TYPE_CHROME.equals(theType)) {

				System.setProperty("webdriver.chrome.driver", "drivers/chromedriver.exe");

				Map<String, Object> prefs = new HashMap<String, Object>();
				prefs.put("credentials_enable_service", false);
				prefs.put("profile.password_manager_enabled", false);

				ChromeOptions options = new ChromeOptions();
				options.addArguments("--disable-infobars");
				options.addArguments("--disable-notifications");
				options.addArguments("--disable-web-security");
				options.addArguments("--js-flags=--expose-gc");
				options.setExperimentalOption("prefs", prefs);

				driver = new ChromeDriver(options);

			} else {

				Map<String, Object> prefs = new HashMap<String, Object>();
				prefs.put("credentials_enable_service", false);
				prefs.put("profile.password_manager_enabled", false);

				ChromeOptions options = new ChromeOptions();
				options.addArguments("--disable-notifications");
				options.addArguments("--disable-infobars");
				options.addArguments("--disable-web-security");
				options.addArguments("--js-flags=--expose-gc");
				options.setExperimentalOption("prefs", prefs);

				DesiredCapabilities capabilities = DesiredCapabilities.chrome();
				capabilities.setCapability(ChromeOptions.CAPABILITY, options);

				driver = new RemoteWebDriver(Environment.getEnvironment().getDriverRemoteUrl(), capabilities);

			}

			driver.manage().window().setSize(new Dimension(1366, 768));

			DRIVERS.put(theType, driver);

		}

		return driver;

	}

}
