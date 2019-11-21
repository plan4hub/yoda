package com.hpe.obiwan.test.pages;

import java.io.File;
import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.logging.Level;
import java.util.logging.Logger;

import org.apache.commons.io.FileUtils;
import org.openqa.selenium.By;
import org.openqa.selenium.JavascriptExecutor;
import org.openqa.selenium.Keys;
import org.openqa.selenium.OutputType;
import org.openqa.selenium.StaleElementReferenceException;
import org.openqa.selenium.TakesScreenshot;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.WebElement;
import org.openqa.selenium.interactions.Actions;
import org.openqa.selenium.support.ui.ExpectedConditions;
import org.openqa.selenium.support.ui.Select;
import org.openqa.selenium.support.ui.WebDriverWait;

import com.hpe.obiwan.test.driver.Driver;

public abstract class Base {

	private final static int DELAY_SECONDS = 10;

	private WebDriver driver;

	private Logger logger = null;

	protected Base() {
		driver = Driver.getDriver();
	}

	protected Logger getLogger() {
		if (logger == null) {
			logger = Logger.getLogger(getClass().getName());
		}
		return logger;
	}
	
	protected void go(String url) {
		driver.get(url);
	}
	
	private void delay(int seconds) {
		try {
			Thread.sleep(seconds * 1000L);
		} catch (InterruptedException e) {
		}
	}

	private void waitInvisible(By by) {
		WebDriverWait waiter = new WebDriverWait(driver, DELAY_SECONDS);
		waiter.until(ExpectedConditions.invisibilityOfElementLocated(by));
	}

	private void waitInvisible(String xpath) {
		waitInvisible(By.xpath(xpath));
	}

	private void waitVisible(By by) {
		WebDriverWait waiter = new WebDriverWait(driver, DELAY_SECONDS);
		waiter.until(ExpectedConditions.presenceOfElementLocated(by));
	}

	private void waitVisible(String xpath) {
		waitVisible(By.xpath(xpath));
	}

	private void waitClickable(By by) {
		WebDriverWait waiter = new WebDriverWait(driver, DELAY_SECONDS);
		waiter.until(ExpectedConditions.elementToBeClickable(by));
	}

	private void waitClickable(String xpath) {
		waitClickable(By.xpath(xpath));
	}

	private WebElement getElement(By by) {
		waitVisible(by);
		return driver.findElement(by);
	}

	private WebElement getElement(String xpath) {
		return getElement(By.xpath(xpath));
	}

	private WebElement getClickable(By by) {
		waitClickable(by);
		return driver.findElement(by);
	}

	private WebElement getClickable(String xpath) {
		return getClickable(By.xpath(xpath));
	}

	private List<WebElement> getElements(String xpath) {
		By by = By.xpath(xpath);
		waitVisible(by);
		return driver.findElements(by);
	}

	private WebElement getElementOfListByIndex(String xpath, int index) {
		List<WebElement> l = getElements(xpath);
		if (l.isEmpty()) {
			return null;
		} else if (l.size() < (index + 1)) {
			return l.get(l.size() - 1);
		} else {
			return l.get(index);
		}
	}

	protected List<WebElement> getVisibleElements(String xpath) {
		By by = By.xpath(xpath);
		waitVisible(by);
		List<WebElement> elements = driver.findElements(by);
		List<WebElement> result = new ArrayList<WebElement>();
		for (WebElement webElement : elements) {
			if (webElement.isDisplayed()) {
				result.add(webElement);
			}
		}
		return result;
	}

	protected void checkVisible(String xpath) {
		getLogger().log(Level.FINE, "Check visible " + xpath);
		waitVisible(xpath);
	}

	protected void checkInvisible(String xpath) {
		getLogger().log(Level.FINE, "Check invisible " + xpath);
		waitInvisible(xpath);
	}

	protected void checkClickable(String xpath) {
		getLogger().log(Level.FINE, "Checking clickable on " + xpath);
		waitClickable(xpath);
	}

	protected boolean checkPresent(String xpath) {
		getLogger().log(Level.FINE, "Checking present on " + xpath);
		return driver.findElements(By.xpath(xpath)).size() > 0;
	}

	protected boolean isVisible(String xpath) {
		return driver.findElement(By.xpath(xpath)).isDisplayed();
	}

	protected void click(String xpath) {
		getLogger().log(Level.FINE, "Clicking on " + xpath);
		try {
			getClickable(xpath).click();
		} catch (StaleElementReferenceException e) {
			getClickable(xpath).click();
		}
		delay(1);
	}

	protected void doubleClick(String xpath) {
		getLogger().log(Level.FINE, "Double clicking on " + xpath);
		WebElement element = getClickable(xpath);
		Actions action = new Actions(driver);
		action.doubleClick(element).perform();
		delay(1);
	}

	protected void rightClick(String xpath) {
		getLogger().log(Level.FINE, "Right clicking on " + xpath);
		WebElement element = getClickable(xpath);
		Actions action = new Actions(driver);
		action.contextClick(element).perform();
		delay(1);
	}

	protected int getCount(String xpath) {
		getLogger().log(Level.FINE, "Getting count on " + xpath);
		return driver.findElements(By.xpath(xpath)).size();
	}

	protected String getText(String xpath, boolean wait) {
		getLogger().log(Level.FINE, "Getting text of " + xpath);
		By by = By.xpath(xpath);
		WebElement element = null;
		if (wait) {
			element = getElement(by);
		} else {
			element = driver.findElement(by);
		}
		String text = element.getText();
		if (text == null) {
			text = "";
		}
		return text;
	}

	protected void clickElementOfArrayByIndex(String xpath, int index) {
		getElementOfListByIndex(xpath, index).click();
	}

	protected void clickLastElementOfArray(String xpath) {
		List<WebElement> elements;
		elements = getElements(xpath);
		if (!elements.isEmpty()) {
			elements.get(0).click();
		}
		((JavascriptExecutor) driver).executeScript("arguments[0].scrollIntoView()", elements.get(elements.size() - 1));
		elements.get(elements.size() - 1).click();
	}

	protected String getTextFromElements(String xpath, boolean wait) {
		getLogger().log(Level.FINE, "Getting text of " + xpath);
		List<WebElement> elements;
		if (wait) {
			elements = getElements(xpath);
		} else {
			elements = driver.findElements(By.xpath(xpath));
		}
		getLogger().log(Level.FINE, "Size: " + elements.size());
		String text = "";
		for (WebElement element : elements) {
			element.click();
			if (text.length() == 0) {
				text = element.getText();
			} else {
				text += "\n" + element.getText();
			}
		}

		if (text == null) {
			text = "";
		}
		return text;
	}

	protected String getText(String xpath) {
		return getText(xpath, true);
	}

	protected String getTextFromElements(String xpath) {
		return getTextFromElements(xpath, true);
	}

	protected List<String> getTexts(String xpath) {
		getLogger().log(Level.FINE, "Getting texts of " + xpath);
		List<WebElement> elements = getElements(xpath);
		List<String> texts = new ArrayList<String>();
		for (WebElement element : elements) {
			String text = element.getText();
			if (text == null) {
				text = "";
			}
			texts.add(text);
		}
		return texts;
	}

	protected List<String> getTextsOfVisibleElements(String xpath) {
		getLogger().log(Level.FINE, "Getting texts of " + xpath);
		List<WebElement> elements = getVisibleElements(xpath);
		List<String> texts = new ArrayList<String>();
		for (WebElement element : elements) {
			String text = element.getText();
			if (text == null) {
				text = "";
			}
			texts.add(text);
		}
		return texts;
	}

	protected String getValue(String xpath) {
		getLogger().log(Level.FINE, "Getting value of " + xpath);
		WebElement element = getElement(xpath);
		String value = element.getAttribute("value");
		if (value == null) {
			value = "";
		}
		return value;
	}

	protected void write(String xpath, String text, boolean password) {
		if (text == null) {
			text = "";
		}
		if (password) {
			getLogger().log(Level.FINE, "Writing password on " + xpath);
		} else {
			getLogger().log(Level.FINE, "Writing \"" + text + "\" on " + xpath);
		}
		WebElement element = getClickable(xpath);
		element.click();
		element.clear();
		element.sendKeys(text);
		delay(1);
		
	}

	protected void write(String xpath, String text) {
		write(xpath, text, false);
	}

	protected void write(String xpath, int number) {
		write(xpath, String.valueOf(number));
	}

	protected void sendKey(String xpath, Keys key) {
		WebElement element = getClickable(xpath);
		element.click();
		Actions actions = new Actions(driver);
		actions.sendKeys(key).build().perform();
	}

	protected void sendEnter(String xpath) {
		getLogger().log(Level.FINE, "Send ENTER to " + xpath);
		WebElement element = getClickable(xpath);
		element.sendKeys(Keys.ENTER);
		delay(1);
	}

	protected void sendReturn(String xpath) {
		getLogger().log(Level.FINE, "Send RETURN to " + xpath);
		WebElement element = getClickable(xpath);
		element.sendKeys(Keys.RETURN);
		delay(1);
	}

	protected void select(String xpath, String value) {
		if (value == null) {
			value = "";
		}
		getLogger().log(Level.FINE, "Selecting \"" + value + "\" on " + xpath);
		Select select = new Select(getClickable(xpath));
		select.selectByValue("string:" + value);
	}

	protected boolean isEnabled(String xpath) {
		getLogger().log(Level.FINE, "Checking enabled on " + xpath);
		return getElement(xpath).isEnabled();
	}

	protected String getAttribute(String xpath, String attribute, boolean wait) {
		getLogger().log(Level.FINE, "Getting attribute " + attribute + " on " + xpath);
		By by = By.xpath(xpath);
		WebElement element = null;
		if (wait) {
			element = getElement(by);
		} else {
			element = driver.findElement(by);
		}
		return element.getAttribute(attribute);
	}

	protected String getAttribute(String xpath, String attribute) {
		return getAttribute(xpath, attribute, true);
	}

	protected void scrollHorizontally(String xpath, int numberTimes) {
		getLogger().log(Level.FINE, "Scroll Horizontally " + numberTimes + " times " + xpath);
		WebElement element = driver.findElement(By.xpath(xpath));
		Actions actions = new Actions(driver);
		Actions moveToElement = actions.moveToElement(element);
		for (int i = 0; i < numberTimes; i++) {
			moveToElement.sendKeys(Keys.ARROW_RIGHT).build().perform();
			moveToElement.clickAndHold();
		}
		actions.perform();
	}

	protected void moveTo(String xpath) {
		getLogger().log(Level.FINE, "Move to " + xpath);
		WebElement element = driver.findElement(By.xpath(xpath));
		Actions actions = new Actions(driver);
		actions.moveToElement(element).build().perform();
	}

	protected int countElements(String xpath) {
		return getElements(xpath).size();
	}

	protected void ctrlClickIntoOffsetElement(String xpath, int x, int y) {
		getLogger().log(Level.FINE, "Ctrl clicking into element with offset");
		WebElement element = driver.findElement(By.xpath(xpath));
		Actions actions = new Actions(driver);
		actions.keyDown(Keys.LEFT_CONTROL).moveToElement(element, x, y).click().keyUp(Keys.LEFT_CONTROL).build()
				.perform();
	}

	protected void ctrlClickIntoElement(String xpath) {
		getLogger().log(Level.FINE, "Ctrl clicking into element");
		WebElement element = driver.findElement(By.xpath(xpath));
		Actions actions = new Actions(driver);
		actions.keyDown(Keys.LEFT_CONTROL).click(element).keyUp(Keys.LEFT_CONTROL).build().perform();
	}

	protected void scrollAndClick(String xpath) {
		getLogger().log(Level.FINE, "Scrolling and clicking into element");
		((JavascriptExecutor) driver).executeScript("arguments[0].scrollIntoView(true);", getClickable(xpath));
		click(xpath);
	}

	protected void scrollAndDoubleClick(String xpath) {
		getLogger().log(Level.FINE, "Scrolling and clicking into element");
		((JavascriptExecutor) driver).executeScript("arguments[0].scrollIntoView(true);", getClickable(xpath));
		doubleClick(xpath);
	}

	protected int getElementsSize(String xpath) {
		List<WebElement> elements = getElements(xpath);
		return elements.size();
	}

	public void saveScreenshot(File path) {
		try {
			File img = ((TakesScreenshot) driver).getScreenshotAs(OutputType.FILE);
			FileUtils.copyFile(img, path);
		} catch (IOException e) {
			getLogger().log(Level.SEVERE, "Error saving screenshot", e);
		}
	}

}
