
import {Browser, Builder} from "selenium-webdriver";
import {By, until} from "selenium-webdriver";
import "dotenv/config";


const homeurl = "https://app.myflexlearning.com/home";
const loginurl = "https://app.myflexlearning.com/login";
let email = process.env.EMAIL;
let password = process.env.PASSWORD;

let driver = await new Builder().forBrowser(Browser.CHROME).build();

async function main(driver) {
    //Navigate to myflex page
    await driver.get(homeurl);
    let currentURL = await driver.getCurrentUrl();
    if (currentURL == loginurl) { //Assess whether login is required (it almost always is)
        console.log("IsLogin");
        if (await login(driver) == false) { //Attempt a login
            console.log("Login failed. Quitting.")
            await driver.quit(); //If login fails, quit 
            return;
        }
    }




    console.log("End of Program. Quitting in 5 seconds."); //Quit after program ends.
    setTimeout(async function (){
        await driver.quit();
    }, 5000);
}

async function googleSignIn(driver) { //Navigate the google sign in popup (Username/Email section then Password Section)
    await driver.wait(until.elementLocated(By.name("identifier"))); //Wait until the username box is found
    let unElement = await driver.findElement(By.name("identifier")); //Locate the username box
    await driver.wait(until.elementIsEnabled(unElement)); //Wait until the username box is interactable
    await unElement.sendKeys(email); //Input username into username box
    console.log("Entered username");

    await driver.findElement(By.id("identifierNext")).click(); //Locate and click the "Next" button
    console.log("Clicked next");
    await googlePw(driver); //Handle the password section
}

async function googlePw(driver) { //Navigate the google sign in popup (Password Section Only)
    await driver.wait(until.elementLocated(By.name("Passwd"))); //Wait until password box is found
    let pwElement = await driver.findElement(By.name("Passwd")); //Locate the password box
    await driver.wait(until.elementIsEnabled(pwElement)); //Wait until the password box is interactable 
    await pwElement.sendKeys(password); //Input password into password box
    console.log("Entered password"); 

    await driver.findElement(By.id("passwordNext")).click(); //Locate and click the "Next" button
    console.log("Clicked Next");
}

async function isWindowOpen(driver) { //Assess whether the current window has been closed or remains open
    try {
        await driver.getTitle(); //Attempt to get current tab title
        return true;
    } catch (error) { //If there is an error it means the window has been closed
        return false;
    }
}

async function login(driver) {
    let googleButton = await driver.findElement(By.id("googleButtonDivSmall")); //Locate the google sign in button
    console.log("ClickGoogleButton");
    await googleButton.click(); //Click the google sign in button
    let windows = await driver.getAllWindowHandles(); //Get a list of open selenium windows from this session
    await driver.switchTo().window(windows[1]); //Swap to the second window (Sign in pop-up)
    console.log("Swap window");
    let headingText = await driver.findElement(By.id("headingText")).getText(); //Get the pop up heading text

    if (headingText.toLowerCase() == "sign in") { //Check if we are on the sign in screen by comapring heading text
        //If heading text is "Sign in" then
        //No google accounts signed in.
        console.log("No existing google accounts");
        await googleSignIn(driver); //Complete the sign in popup
        
    } else {
        //If the heading text is not "Sign in" (Likely "Choose an Account") then
        //Some google accounts already present.
        console.log("Existing google accounts");

        await driver.wait(until.elementLocated(By.css("ul"))); //Find the ordered list of availiable accounts
        let matches = await driver.findElements(By.css('*[data-identifier="'+By.escapeCss(email)+'"]')); //Locate elements associated with the school google account
        if (matches.length > 0) { //Check if elements have been found
            //If some have been found, then
            //School account already signed in (Session may be expired)
            await driver.wait(until.elementIsEnabled(matches[0])); //Wait until account button enabled
            await matches[0].click(); //Click account button
            console.log("Clicked account");
            if (isWindowOpen(driver)) { //Check if window has been closed (Will be the case if no password entry is needed)
                //If window did not close then
                //Further action required.
                let headingText = await driver.findElement(By.id("headingText")).getText(); //Get heading text
                if (headingText.toLowerCase() == "sign in") { 
                    //If heading text is equal to "Sign in" then
                    //Need to do the full sign in flow just like if there were no google accounts
                    console.log("Should be an impossible case"); 
                    await googleSignIn(driver); //Handle the sign in
                } else {
                    //If heading text not "Sign in" then
                    //Re-enter password
                    console.log("Session expired, reauthenticating");
                    await googlePw(driver); //Handle only password section of popup
                }
            }
        } else {
            //School account not present (other accounts are)
            await driver.wait(until.elementLocated(By.xpath("//div[contains(., '"+By.escapeCss("Use another account")+"')]"))) //Wait until "Use another account" button located
            await driver.findElement(By.xpath("//div[contains(., '"+By.escapeCss("Use another account")+"')]")).click(); //Locate and click "Use another account" button
            console.log("Clicked use another account");

            await googleSignIn(driver); //Handle sign in
        }
    }
    await driver.switchTo().window(windows[0]); //Return to original window (app.myflexlearning.com/login)
    console.log("Swapped back to original window");
    await driver.wait(until.urlIs(homeurl), 10000); //Wait to be redirected
    let currentUrl = await driver.getCurrentUrl(); //Get current tab url
    if (currentUrl == homeurl) { //Check that redirect to home is complete and login is successful.
        console.log("Login successful.");
        return true;
    } else {
        console.log("Login failed.");
        return false;
    }
}

main(driver)