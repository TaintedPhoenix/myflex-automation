
import {Browser, Builder} from "selenium-webdriver";
import {By, until} from "selenium-webdriver";
import "dotenv/config";
import {readFileSync, existsSync} from "fs";


const homeurl = "https://app.myflexlearning.com/home";
const loginurl = "https://app.myflexlearning.com/login";
const calendarurl = "https://app.myflexlearning.com/calendar";

let email = process.env.EMAIL;
let password = process.env.PASSWORD;
let config = null;

if (existsSync("manifest.json")) {
    config = JSON.parse(readFileSync("manifest.json"));
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
    await sleep(400);
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
        let matches = await driver.findElements(By.css('*[data-identifier="'+email+'"]')); //Locate elements associated with the school google account
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
            await driver.wait(until.elementLocated(By.xpath("//div[contains(., '"+"Use another account"+"')]"))) //Wait until "Use another account" button located
            await driver.findElement(By.xpath("//div[contains(., '"+"Use another account"+"')]")).click(); //Locate and click "Use another account" button
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
        return false;
    }
}

async function homepage(driver) {
    console.log("Navigating homepage");
    await driver.wait(until.elementLocated(By.css('*[routerlink="/calendar"]')));
    let calendarButton = await driver.findElement(By.css('*[routerlink="/calendar"]'));
    await driver.wait(until.elementIsEnabled(calendarButton));
    await calendarButton.click();
    console.log("Clicked calendarButton");
    await calendarPage(driver);  
    return;  
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function calendarPage(driver) {
    try {
    let st = await driver.wait(until.elementLocated(By.className("loading-indicator")), 2000);
    if (st != "timed-out") { 
        await driver.wait(async () => {
            let elements = await driver.findElements(By.className("loading-indicator"));
            return elements == 0;
        });
    }
    } catch (err) {}

    await driver.wait(until.elementLocated(By.xpath("//span[contains(., '"+"Week"+"')]")));
    let weekButton = await driver.findElement(By.xpath("//span[contains(., '"+"Week"+"')]"));
    await driver.wait(until.elementIsEnabled(weekButton));
    await weekButton.findElement(By.xpath("..")).click();
    console.log("Clicked WeekButton");
    
    await driver.wait(until.elementLocated(By.className("month-header")));
    console.log(await driver.findElement(By.className("month-header")).getText());
    while (await week(driver) <= 0 && !((await driver.findElement(By.className("month-header")).getText()).toLowerCase().startsWith("july"))) {
        await driver.findElement(By.className("fa-arrow-right")).click();
        try {
        let st = await driver.wait(until.elementLocated(By.className("loading-indicator")), 2000);
        if (st != "timed-out") { 
            await driver.wait(async () => {
                let elements = await driver.findElements(By.className("loading-indicator"));
                return elements == 0;
            });
        }
        } catch (err) {}
        await driver.wait(until.elementLocated(By.className("month-header")));
        await sleep(500);
    }
    return;
}

async function week(driver) {
    console.log("Navigating week")
    
    let events = await driver.findElements(By.className("event-details"));
    if (events.length <= 0) {
        console.log("No blocks this week");
        return -1;
    }
    let result = 0;
    console.log("Looping blocks"); //rebuild this part using the "-day" id's

    for (let v = 0; v < events.length; v++) {
        console.log("Exterior for loop triggered");
        events = await driver.findElements(By.className("event-details"));
        for (let i = 0; i < events.length; i++) {
            let eventName = await events[i].findElement(By.className("class-title")).getText();
            if (eventName == config.eventTitle) {
                let cycleDay = await events[i].findElement(By.className("cycle-day")).getText();
                await events[i].click();
                let cc = await changeClass(driver, cycleDay);
                result = result + cc
                await sleep(2000);
                if (result <= 0) {
                    if (cc > 0) {
                        let okElement = await driver.findElement(By.xpath("//span[contains(., '"+"Ok"+"')]"))
                        await driver.wait(until.elementIsEnabled(okElement));
                        await okElement.click();
                    }
                    console.log("breaking for loop");
                    break;
                }
            }
        }
    }

    return result;
}

async function changeClass(driver, day) {
    console.log("ChangeClass PopUp");
    try {
        await driver.wait(until.elementLocated(By.xpath("//span[contains(., '"+"Change Class"+"')]")), 500);
    } catch (err) {
        return 1;
    }
    
    let changeButton = await driver.findElement(By.xpath("//span[contains(., '"+"Change Class"+"')]"));
    await driver.wait(until.elementIsEnabled(changeButton));
    await changeButton.click();
    await blockSignup(driver, day);
    return 0;
}

async function selectRow(driver, rowElement) {
    console.log("Row selected");
    await rowElement.findElement(By.css("mat-radio-button")).click();
    await driver.findElement(By.xpath("//span[contains(., '"+"Change Schedule"+"')]")).click();
    await driver.wait(async () => {
        let elements = await driver.findElements(By.className("loading-indicator"));
        return elements == 0;
    });
    let okElement = await driver.findElement(By.xpath("//span[contains(., '"+"Ok"+"')]"))
    await driver.wait(until.elementIsEnabled(okElement));
    await sleep(600);
    await okElement.click();
    return;
}

async function blockSignup(driver, day) {
    await driver.wait(until.elementLocated(By.xpath("//span[contains(., '"+"Change Schedule"+"')]")));
    let searchBox = await driver.findElement(By.name("search"));
    await driver.wait(until.elementIsEnabled(searchBox));
    await searchBox.sendKeys(config.agenda[day].query); 
    await sleep(200);
    await driver.wait(async () => {
        let elements = await driver.findElements(By.className("loading-indicator"));
        return elements == 0;
    });
    await sleep(1200);
    for (let i = 0; i < 2; i++) { //Check twice to remove a specific race condition error (reason for the sleep above)
        let table = await driver.findElement(By.className("table-section"));
        let rows = await table.findElements(By.css("mat-row"));
        if (config.agenda[day].hasOwnProperty("name")) {
            console.log("Checking by name")
            for (let i = 0; i < rows.length; i++) {
                let blockName = await rows[i].findElement(By.className("mat-column-name")).getText();
                console.log("Foundname: " + blockName + " Searching for: " + config.agenda[day].name);
                if (blockName.includes(config.agenda[day].name)) {
                    await selectRow(driver, rows[i]);
                    return;
                }
            }
        }
        if (config.agenda[day].hasOwnProperty("teacher")) {
            console.log("Checking by teacher");
            for (let i = 0; i < rows.length; i++) {
                let teacherName = await rows[i].findElement(By.className("mat-column-teacher")).getText();
                console.log("Foundteacher: " + teacherName + " Searching for: " + config.agenda[day].teacher);
                if (teacherName.includes(config.agenda[day].teacher)) {
                    await selectRow(driver, rows[i]);
                    return;
                }
            }
        }
        if (config.agenda[day].hasOwnProperty("room")) {
            console.log("Checking by room");
            for (let i = 0; i < rows.length; i++) {
                let roomName = await rows[i].findElement(By.className("mat-column-room")).getText();
                console.log("Foundroom: " + roomName + " Searching for: " + config.agenda[day].room);
                if (roomName.includes(config.agenda[day].room)) {
                    await selectRow(driver, rows[i]);
                    return;
                }
            }
        }
    }
    //No matching blocks found, Error handling
    let dayProperties = Object.keys(config.agenda[day]);
    if (!dayProperties.includes("name") && !dayProperties.includes("teacher") && !dayProperties.includes("room")) {
        console.error("Config ERROR: No block identifiers (name, teacher, room) found for cycle day " + String(day));
    } else {
        let identifiers = ""
        for (let i = 0; i < dayProperties.length; i++) {
            if (["name", "teacher", "room"].includes(dayProperties[i])) {
                identifiers = identifiers + dayProperties[i] + "=" + config.agenda[day][dayProperties[i]] + ", "
            }
        }
        identifiers = identifiers.substring(0, identifiers.length-2);
        console.error("Block ERROR: No block found for cycle day "+day+" under query " + config.agenda[day].query + " with any matches to " + identifiers);
    }
    await driver.quit();
    process.exit();
}

async function registerIblocks() {
    let driver = await new Builder().forBrowser(Browser.CHROME).build();
    await driver.get(homeurl);
    await sleep(100);
    let currentURL = await driver.getCurrentUrl();
    if (currentURL == loginurl) { //Assess whether login is required (it almost always is)
        if (await login(driver) == false) { //Attempt a login
            console.error("Login ERROR: Login failed. Please ensure your credentials are correct.")
            await driver.quit(); //If login fails, quit 
            process.exit();
        }
    }
    //Should be logged in and on homepage by this point
    await homepage(driver);
    console.log("Task Finished Successfully.");
    await driver.quit();
    setTimeout(async function() {
        registerIblocks();
    }, config.interval)
}

if (!existsSync("manifest.json")) {
    console.error("Config ERROR: Missing `manifest.json` config file!");
    process.exit();
}

if (config == null || !config.hasOwnProperty("interval") || !config.hasOwnProperty("eventTitle") || !config.hasOwnProperty("agenda")) {
    let missing = "";
    let props = ["interval", "eventTitle", "agenda"];
    for (let i = 0; i < props.length; i++) {
        if (config == null || !config.hasOwnProperty(props[i])) {
            missing = missing + props[i] + ", ";
        }
    }
    missing = missing.substring(0, missing.length-2);
    console.error("Config ERROR: Missing required configuration properties in `manifest.json` " + missing);
    process.exit();
}

if (!existsSync(".env")) {
    console.error("Config ERROR: Missing credentials file `.env`");
    process.exit();
}

if (process.env.PASSWORD == null || process.env.PASSWORD == "" || process.env.EMAIL == null || process.env.EMAIL == "") {
    let missing = "";
    if (process.env.PASSWORD == null || process.env.PASSWORD == "") {
        missing = missing + "PASSWORD, ";
    }
    if (process.env.EMAIL == null || process.env.EMAIL == "") {
        missing = missing + "EMAIL, ";
    }
    missing = missing.substring(0, missing.length-2);
    console.error("Config ERROR: Missing credentials in `.env` file: " + missing);
}


if (config != null) {
    registerIblocks();
} else {
    console.error("Config ERROR: Missing `manifest.json` config file!")
}