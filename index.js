
import {Browser, Builder} from "selenium-webdriver";
import {By, until} from "selenium-webdriver";
import "dotenv/config";


const homeurl = "https://app.myflexlearning.com/home";
const loginurl = "https://app.myflexlearning.com/login";
let email = process.env.EMAIL;
let password = process.env.PASSWORD;

let driver = await new Builder().forBrowser(Browser.CHROME).build();

async function initialize(driver) {
    await driver.get(homeurl);
    let currentURL = await driver.getCurrentUrl();
    console.log(currentURL);
    if (currentURL == loginurl) {
        console.log("IsLogin");
        await login(driver);
    }
    console.log("Quitting");
    setTimeout(async function (){
        await driver.quit();
    }, 3000);
}

async function googleSignIn(driver) {
    await driver.wait(until.elementLocated(By.name("identifier")));
    let unElement = await driver.findElement(By.name("identifier"));
    await driver.wait(until.elementIsEnabled(unElement));
    await unElement.sendKeys(email);
    console.log("Entered username");

    await driver.findElement(By.id("identifierNext")).click();
    console.log("Clicked next");
    await googlePw(driver);
}

async function googlePw(driver) {
    await driver.wait(until.elementLocated(By.name("Passwd")));
    let pwElement = await driver.findElement(By.name("Passwd"));
    await driver.wait(until.elementIsEnabled(pwElement));
    await pwElement.sendKeys(password);
    console.log("Entered password");

    await driver.findElement(By.id("passwordNext")).click();
    console.log("Clicked Next");
}

async function isWindowOpen(driver) {
    try {
        await driver.getTitle();
        return false;
    } catch (error) {
        return true;
    }
}

async function login(driver) {
    let googleButton = await driver.findElement(By.id("googleButtonDivSmall"));
    console.log("ClickGoogleButton");
    await googleButton.click();
    let windows = await driver.getAllWindowHandles();
    await driver.switchTo().window(windows[1]);
    console.log("Swap window");
    let headingText = await driver.findElement(By.id("headingText")).getText();

    if (headingText.toLowerCase() == "sign in") { 
        //No google accounts signed in
        console.log("No existing google accounts");
        await googleSignIn(driver);
        
    } else {
        //Some google accounts already present
        console.log("Existing google accounts");

        await driver.wait(until.elementLocated(By.css("ul")));
        let matches = await driver.findElements(By.css('*[data-identifier="'+By.escapeCss(email)+'"]'));
        if (matches.length > 0) {
            //School account already signed in (Session may be expired)
            await driver.wait(until.elementIsEnabled(matches[0]));
            await matches[0].click();
            console.log("Clicked account");
            if (isWindowOpen(driver)) {
                let headingText = await driver.findElement(By.id("headingText")).getText();
                if (headingText.toLowerCase() == "sign in") {
                    console.log("Should be an impossible case");
                    await googleSignIn(driver);
                } else if (headingText.toLowerCase().startsWith("hi ")) {
                    console.log("Session expired, reauthenticating");
                    await googlePw(driver);
                }
            }
        } else {
            //School account not present
            await driver.wait(until.elementLocated(By.xpath("//div[contains(., '"+By.escapeCss("Use another account")+"')]")))
            await driver.findElement(By.xpath("//div[contains(., '"+By.escapeCss("Use another account")+"')]")).click();
            console.log("Clicked use another account");

            await googleSignIn(driver);
        }
    }
    await driver.switchTo().window(windows[0]);
    console.log("Swapped back to original window");
    await driver.wait(until.urlIs(homeurl), 2500);
    let currentUrl = await driver.getCurrentUrl();
    if (currentUrl == homeurl) {
        console.log("Logged in successfully");
    } else {
        console.log("Login failed.");
    }
}

initialize(driver)