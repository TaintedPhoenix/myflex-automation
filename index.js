
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
    console.log("Looping blocks");
    let days = [];
    for (let i = 0; i < events.length; i++) {
        let parentElement = await events[i].findElement(By.xpath(".."));
        let id = await parentElement.getAttribute("id");
        console.log("Id is: '" + id + "'")
        let idSplit = id.split("-");
        days.push(idSplit[idSplit.length-1]);
    }
    console.log("Days length:", days.length);
    for (let i = 0; i < days.length; i++) {
        console.log("i=", i);
        let eventParent = await driver.findElement(By.xpath("//*[substring(@id, string-length(@id) - "+days[i].length+") = '-"+days[i]+"']"));
        let event = await eventParent.findElement(By.className("event-details"));
        let eventNameElement = await event.findElement(By.className("class-title"));
        let eventName = await eventNameElement.getText();
        console.log("EventName=", eventName);
        if (eventName == config.eventTitle) {
            let cycleDay = await event.findElement(By.className("cycle-day")).getText();
            await eventNameElement.click();
            result = result + await changeClass(driver, cycleDay); //May need a sleep here if this breaks
            await driver.wait(async () => {
                let elements = await driver.findElements(By.className("loading-indicator"));
                return elements == 0;
            });
            await sleep(1500);
        }
    }

    return result;
}

async function changeClass(driver, day) {
    console.log("ChangeClass PopUp");
    try {
        await driver.wait(until.elementLocated(By.xpath("//span[contains(., '"+"Change Class"+"')]")), 800);
    } catch (err) {
        let okElement = await driver.findElement(By.xpath("//span[contains(., '"+"Ok"+"')]"));
        await driver.wait(until.elementIsEnabled(okElement));
        await okElement.click();
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

async function blocksList(driver, rows, cName, compare) {
    console.log("Checking block list")
    for (let i = 0; i < rows.length; i++) {
        try {
            let blockName = await rows[i].findElement(By.className(cName)).getText();
            console.log("Found: " + blockName + " Searching for: " + compare);
            if (blockName.includes(compare)) {
                await selectRow(driver, rows[i]);
                return 1;
            }
        } catch (err) {
            if (err.name == 'StaleElementReferenceError') {
                console.log("Navigation WARN: Stale element in block list. Retrying...")
                return -1;
            } else {
                throw(err);
            }
        }
    }
    return 0;
}

async function blockSignup(driver, day) {
    await driver.wait(until.elementLocated(By.xpath("//span[contains(., '"+"Change Schedule"+"')]")));
    let searchBox = await driver.findElement(By.name("search"));
    await driver.wait(until.elementIsEnabled(searchBox));
    await driver.wait(until.elementLocated(By.css("mat-row")));
    let stales = (await (await driver.findElement(By.className("table-section"))).findElements(By.css("mat-row")));
    let staleNames = [];
    await stales.forEach(async element => {
        staleNames.push(await (await element.findElement(By.className("mat-column-name"))).getText());
    })
    await searchBox.sendKeys(config.agenda[day].query);
    await driver.wait(async () => {
        let elements = await driver.findElements(By.className("loading-indicator"));
        return elements == 0;
    });
    console.log(staleNames.sort().join());
    await driver.wait(async () => {
        let stales2 = (await (await driver.findElement(By.className("table-section"))).findElements(By.css("mat-row")));
        let staleNames2 = [];
        await stales2.forEach(async element2 => {
            staleNames2.push(await (await element2.findElement(By.className("mat-column-name"))).getText());
        })
        return !(staleNames.sort().join() == staleNames2.sort().join());
    }, 6000);

    let rows = [];
    let c = -1
    for (let i = 0; i < 3 && c < 20; i++) { //Check twice to remove a specific race condition error (reason for the sleep above)
        c++;
        console.log("BlockCheckLoop i=", i);
        if (c > 0 && rows.length > 0) {
            console.log("Waiting for rows to be renewed")
            await driver.wait(async () => {
                try {
                    await rows[0].getTagName();
                    return false;
                } catch (err) {
                    return true;
                }
            }, 5000).then(console.log("Done waiting for rows"));
            await sleep(300);
        }
        if (c > 1) {
            await sleep(3000);
        }
        let table = await driver.findElement(By.className("table-section"));
        rows = null;
        rows = await table.findElements(By.css("mat-row"));
        if (config.agenda[day].hasOwnProperty("name")) {
            let r = await blocksList(driver, rows, "mat-column-name", config.agenda[day].name);
            if (r == -1) i--;
            else if (r == 1) return;
        }
        if (config.agenda[day].hasOwnProperty("teacher")) {
            let r = await blocksList(driver, rows, "mat-column-teacher", config.agenda[day].teacher);
            if (r == -1) i--;
            else if (r == 1) return;
        }
        if (config.agenda[day].hasOwnProperty("room")) {
            let r = await blocksList(driver, rows, "mat-column-room", config.agenda[day].room);
            if (r == -1) i--;
            else if (r == 1) return;
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