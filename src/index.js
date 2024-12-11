
import {Browser, Builder} from "selenium-webdriver";
import {By, until} from "selenium-webdriver";
import chrome from "selenium-webdriver/chrome.js"
import "dotenv/config";
import fs from "fs";
import {Logger} from "./logger.js";
import JSON5 from "json5";

const logger = new Logger("MyFlexAutomation");

const homeurl = "https://app.myflexlearning.com/home";
const loginurl = "https://app.myflexlearning.com/login";
const calendarurl = "https://app.myflexlearning.com/calendar";

let email = process.env.EMAIL;
let password = process.env.PASSWORD;
let config = null;

if (fs.existsSync("config.json5")) {
    config = await JSON5.parse(fs.readFileSync("config.json5"));
}

async function googleSignIn(driver) { //Navigate the google sign in popup (Username/Email section then Password Section)
    await driver.wait(until.elementLocated(By.name("identifier"))); //Wait until the username box is found
    let unElement = await driver.findElement(By.name("identifier")); //Locate the username box
    await driver.wait(until.elementIsEnabled(unElement)); //Wait until the username box is interactable
    await unElement.clear(); //Clear the username box
    await unElement.sendKeys(email); //Input username into username box
    logger.log("Entered username");

    await driver.findElement(By.id("identifierNext")).click(); //Locate and click the "Next" button
    logger.log("Clicked next");
    await googlePw(driver); //Handle the password section
    return;
}

async function googlePw(driver) { //Navigate the google sign in popup (Password Section Only)
    try {
        await driver.wait(until.elementLocated(By.name("Passwd")), 3000); //Wait until password box is found
    } catch (err) {
        logger.warn("Login WARN: Invalid email. Please update your credentials."); //Update user email if it didnt work
        email = await logger.input("Email: ");
        fs.writeFileSync(".env", `EMAIL="${email}"\nPASSWORD="${password}"`, "utf-8");
        logger.log("Credentials saved to file", true);
        return await googleSignIn(driver); //Retry sign in
    }
    let pwElement = await driver.findElement(By.name("Passwd")); //Locate the password box
    await driver.wait(until.elementIsEnabled(pwElement)); //Wait until the password box is interactable 
    await sleep(400);
    await pwElement.sendKeys(password); //Input password into password box
    logger.log("Entered password"); 

    await driver.findElement(By.id("passwordNext")).click(); //Locate and click the "Next" button
    logger.log("Clicked Next");
    return;
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
    logger.log("ClickGoogleButton");
    await googleButton.click(); //Click the google sign in button
    let windows = await driver.getAllWindowHandles(); //Get a list of open selenium windows from this session
    await driver.switchTo().window(windows[1]); //Swap to the second window (Sign in pop-up)
    logger.log("Swap window");
    let headingText = await driver.findElement(By.id("headingText")).getText(); //Get the pop up heading text

    if (headingText.toLowerCase() == "sign in") { //Check if we are on the sign in screen by comapring heading text
        //If heading text is "Sign in" then
        //No google accounts signed in.
        logger.log("No existing google accounts");
        await googleSignIn(driver); //Complete the sign in popup
        
    } else {
        //If the heading text is not "Sign in" (Likely "Choose an Account") then
        //Some google accounts already present.
        logger.log("Existing google accounts");

        await driver.wait(until.elementLocated(By.css("ul"))); //Find the ordered list of availiable accounts
        let matches = await driver.findElements(By.css('*[data-identifier="'+email+'"]')); //Locate elements associated with the school google account
        if (matches.length > 0) { //Check if elements have been found
            //If some have been found, then
            //School account already signed in (Session may be expired)
            await driver.wait(until.elementIsEnabled(matches[0])); //Wait until account button enabled
            await matches[0].click(); //Click account button
            logger.log("Clicked account");
            if (isWindowOpen(driver)) { //Check if window has been closed (Will be the case if no password entry is needed)
                //If window did not close then
                //Further action required.
                let headingText = await driver.findElement(By.id("headingText")).getText(); //Get heading text
                if (headingText.toLowerCase() == "sign in") { 
                    //If heading text is equal to "Sign in" then
                    //Need to do the full sign in flow just like if there were no google accounts
                    logger.log("Should be an impossible case"); 
                    await googleSignIn(driver); //Handle the sign in
                } else {
                    //If heading text not "Sign in" then
                    //Re-enter password
                    logger.log("Session expired, reauthenticating");
                    await googlePw(driver); //Handle only password section of popup
                }
            }
        } else {
            //School account not present (other accounts are)
            await driver.wait(until.elementLocated(By.xpath("//div[contains(., '"+"Use another account"+"')]"))) //Wait until "Use another account" button located
            await driver.findElement(By.xpath("//div[contains(., '"+"Use another account"+"')]")).click(); //Locate and click "Use another account" button
            logger.log("Clicked use another account");

            await googleSignIn(driver); //Handle sign in
        }
    }

    while (true) {
        await driver.switchTo().window(windows[0]); //Return to original window (app.myflexlearning.com/login)
        logger.log("Swapped back to original window");
        try {
            await driver.wait(until.urlIs(homeurl), 10000); //Wait to be redirected
            break;
        } catch (err) { //Will trigger if wait time > 10s, if password was incorrect
            logger.warn("Login WARN: Invalid password. Please update your credentials"); 
            password = await logger.input("Password: "); //Get user to update password
            fs.writeFileSync(".env", `EMAIL="${email}"\nPASSWORD="${password}"`, "utf-8");
            logger.log("Credentials saved to file", true);
            await driver.switchTo().window(windows[1]); //Return to google sign in window
            await googlePw(driver); //Retry new password
        }
    }

    logger.log("Login successful.");
    return true;
}

async function homepage(driver) { //Get from homepage to calendar page
    logger.log("Navigating homepage");
    await driver.wait(until.elementLocated(By.css('*[routerlink="/calendar"]'))); //Wait until calendar button located
    let calendarButton = await driver.findElement(By.css('*[routerlink="/calendar"]')); //Find calendar button
    await driver.wait(until.elementIsEnabled(calendarButton)); //Wait until calendar button is enabled
    await calendarButton.click(); //Click calendar button
    logger.log("Clicked calendarButton");
    await calendarPage(driver);  //Process calendar page
    return;  
}

function sleep(ms) { //Used to pause execution for a specific amount of time (usually to wait for elements to load)
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function calendarPage(driver) { //Set up week naviagation
    try { //Wait for the loading indicator to not be on the screen
    let st = await driver.wait(until.elementLocated(By.className("loading-indicator")), 2000);
    if (st != "timed-out") { 
        await driver.wait(async () => { //If loading indicator found, wait until it isnt
            let elements = await driver.findElements(By.className("loading-indicator"));
            return elements == 0;
        });
    }
    } catch (err) {} // Will error if loading indicator not found, then proceed with rest of code

    await driver.wait(until.elementLocated(By.xpath("//span[contains(., '"+"Week"+"')]"))); //Wait until week button found
    let weekButton = await driver.findElement(By.xpath("//span[contains(., '"+"Week"+"')]")); //Find week button
    await driver.wait(until.elementIsEnabled(weekButton)); //Wait until week button enabled
    await weekButton.findElement(By.xpath("..")).click(); //Click week button
    logger.log("Clicked WeekButton");
    
    await driver.wait(until.elementLocated(By.className("month-header"))); //Wait until month header found 
    logger.log("MonthHeader: " + await driver.findElement(By.className("month-header")).getText()); //Get month header text (ex. "December 2024")
    while (await week(driver) <= 0 && !((await driver.findElement(By.className("month-header")).getText()).toLowerCase().startsWith("july"))) {
        //Process all the blocks for the week as long as we don't find one that can't be scheduled and we don't get past June.
        await driver.findElement(By.className("fa-arrow-right")).click(); //Click the arrow button to naviagate to the next week
        try { //Wait until loading indicator not found
        let st = await driver.wait(until.elementLocated(By.className("loading-indicator")), 2000);
        if (st != "timed-out") { 
            await driver.wait(async () => {
                let elements = await driver.findElements(By.className("loading-indicator"));
                return elements == 0;
            });
        }
        } catch (err) {}
        await driver.wait(until.elementLocated(By.className("month-header"))); //Wait until month header found
        await sleep(500); //Wait an extra 500 milliseconds for the blocks to reload properly
    }
    return;
}

async function week(driver) { //Process all the blocks for the week
    logger.log("Navigating week")
    
    await driver.wait(until.elementLocated(By.className("month-header"))); //Wait until month header found
    let monthHeader = await driver.findElement(By.className("month-header")).getText(); //Get the month header

    let events = await driver.findElements(By.className("event-details")); //Find each block element
    if (events.length <= 0) { //If there are no blocks, end the function
        logger.log("No blocks this week");
        return -1;
    }
    let result = 0; //Result that will be returned to calendarpage loop, -1 = no blocks, 0 = blocks found, 1 = end of open blocks
    logger.log("Looping blocks");
    let days = []; //What days (of the month) have blocks that need scheduling
    for (let i = 0; i < events.length; i++) { //For every block in the week
        let parentElement = await events[i].findElement(By.xpath("..")); //Find it's parent element
        let id = await parentElement.getAttribute("id"); //Get it's id
        logger.log("Id is: '" + id + "'")
        let idSplit = id.split("-");
        days.push(idSplit[idSplit.length-1]); //Extract the day of the month from its id
        //We can do this since all event element ids end with "-day" where day is the day of the month
    }
    logger.log("Days length: "+ days.length); 
    /*This second for loop is needed because after we successfully schedule a block it will refresh the page which causes
    problems if there is more than one block in the week that needs scheduling. This error happens because all the blocks we initally
    found will be made "stale" (unusable) because the page gets refreshed after signing up for a block. So we have to remember
    Which blocks we have already done by storing some unqiuely identifying information (what day of the month they're on)
    and re-fetching them when we're ready.
    */
    for (let i = 0; i < days.length; i++) { //For every block in the week
        logger.log("DayLoop i="+ i);
        let eventParent = await driver.findElement(By.xpath("//*[substring(@id, string-length(@id) - "+days[i].length+") = '-"+days[i]+"']"));
        //Find the element with the id that ends in the day we're looking to schedule
        let event = await eventParent.findElement(By.className("event-details"));
        //get the child of that element
        let eventNameElement = await event.findElement(By.className("class-title")); //Get the title element
        let eventName = await eventNameElement.getText(); //Get the block title
        logger.log("EventName="+ eventName);
        if (eventName == config.eventTitle) { //Check if the block title matches the unscheduled title set in the config
            let cycleDay = await event.findElement(By.className("cycle-day")).getText(); //Find the day of the cycle the block falls on
            let dr = monthHeader.split(" ");
            dr.splice(1, 0, days[i]);
            let dateString = dr.join(" ");
            console.log("Datestring", dateString);
            //Using month header and day, assemble a string (ex. "December 12 2024") that we can turn into a date object later
            await eventNameElement.click(); //Click on the event to open the scheduling popup
            result = result + await changeClass(driver, cycleDay, dateString); //Attempt to change the class to the desired one and keep a running total of their results
            await driver.wait(async () => { //Wait for the loading indicator to be off the page
                let elements = await driver.findElements(By.className("loading-indicator"));
                return elements == 0;
            });
            await sleep(1500); //Wait an additional 1.5s for the page to reload before scheduling the next block
        }
    }

    return result;
}

async function changeClass(driver, day, date) { //Open the block list
    logger.log("ChangeClass PopUp");
    try { //Try and find the change class button
        await driver.wait(until.elementLocated(By.xpath("//span[contains(., '"+"Change Class"+"')]")), 800); //Wait until change class button found (max .8s )
    } catch (err) { //If change class button not found (This means the block isnt open yet)
        let okElement = await driver.findElement(By.xpath("//span[contains(., '"+"Ok"+"')]")); //find the ok button
        await driver.wait(until.elementIsEnabled(okElement)); //wait for ok button to be enabled
        await okElement.click();//Click the ok button to close the popup and avoid breaking the program
        return 1; //Return 1 to signify that we have found the end of the open blocks and end the function
    }

    let desired = desiredOrder(date, day);
    console.log(date, day, desired);
    if (desired.length < 1) {
        logger.warn("Enrollment WARN: No enrollment instructions found for date= " + date + " on cycleDay= " + day, true)
        let okElement = await driver.findElement(By.xpath("//span[contains(., '"+"Ok"+"')]")) //Find the ok button
        await driver.wait(until.elementIsEnabled(okElement)); //Wait until ok button enabled
        await sleep(600); //Wait 0.6s for an element to stop blocking the ok button
        await okElement.click(); //Click the ok button
        return 0; //Specifies that block was not the end of open blocks
    }
    
    let changeButton = await driver.findElement(By.xpath("//span[contains(., '"+"Change Class"+"')]")); //Find the change class button
    await driver.wait(until.elementIsEnabled(changeButton)); //Wait until change button enabled
    await changeButton.click(); //Click the change class button
    let success = false;
    for (let v = 0; v < desired.length; v++) {
        let r = await blockSignup(driver, desired[v]); //Handle the block list popup
        if (r == 1) { success = true; break; } //If the block was successully booked, end the function
        else if (r == 0) { logger.warn("Enrollment WARN: Block with query= " + desired[v].query + " on date= " + date + " is full")}
    }
    if (!success) { //If none of the blocks were successfully scheduled
        logger.error("Enrollment ERROR: Unable to enroll in any desired block for date= " + date + " on cycleDay= " + day );
        await driver.wait(until.elementLocated(By.className("close-dialog"))); //Wait for find and click the close dialog button
        let closeElement = await driver.findElement(By.className("close-dialog"));
        await driver.wait(until.elementIsEnabled(closeElement));
        await closeElement.click();
        let okElement = await driver.findElement(By.xpath("//span[contains(., '"+"Ok"+"')]")) //Find the ok button
        await driver.wait(until.elementIsEnabled(okElement)); //Wait until ok button enabled
        await sleep(600); //Wait 0.6s for an element to stop blocking the ok button
        await okElement.click(); //Click the ok button
    }
    return 0; //Return 0 signifying the block was not the end of the open blocks
}

async function blockSignup(driver, desired) { //Handle the block list and sign up for the most desirable block
    await driver.wait(until.elementLocated(By.xpath("//span[contains(., '"+"Change Schedule"+"')]"))); //Wait until the change schedule button is found (used to wait for the content to load)
    let searchBox = await driver.findElement(By.name("search")); //Find the search box
    await driver.wait(until.elementIsEnabled(searchBox)); //Wait until the search box is enabled
    await driver.wait(until.elementLocated(By.css("mat-row"))); //Find all the rows in the table of block info
    let stales = (await (await driver.findElement(By.className("table-section"))).findElements(By.css("mat-row"))); //Find all the rows that initially display
    let staleNames = []; 
    await stales.forEach(async element => { //Save the block names from these elements to compare to later
        staleNames.push(await (await element.findElement(By.className("mat-column-name"))).getText());
    })
    await searchBox.clear();
    await searchBox.sendKeys(desired.query); //Enter the query for the most desired block
    await driver.wait(async () => { //Wait until loading indicator not present
        let elements = await driver.findElements(By.className("loading-indicator"));
        return elements == 0;
    });
    logger.log("Stalenames: " + staleNames.sort().join()); //Make a string of all the names of the initally displayed blocks
    await driver.wait(async () => { //Wait until the blocks that are currently being displayed are not the same as the initally displayed blocks
        let stales2 = (await (await driver.findElement(By.className("table-section"))).findElements(By.css("mat-row")));
        let staleNames2 = [];
        await stales2.forEach(async element2 => {
            staleNames2.push(await (await element2.findElement(By.className("mat-column-name"))).getText());
        })
        return !(staleNames.sort().join() == staleNames2.sort().join());
    }, 6000);

    let rows = [];
    let c = -1

    /* The below loop is theoretically unnecessary. All it does is try the same thing a few times, in order to lower the chance
    of it failing. It will add wait time if it fails the first time in an effort to avoid a race condtion problem.
    */
    
    for (let i = 0; i < 3 && c < 20; i++) {
        c++;
        logger.log("BlockCheckLoop i="+ i);
        if (c > 0 && rows.length > 0) { //If it failed at least once
            logger.warn("Navigation WARN: Blocks list recheck triggered");
            logger.log("Waiting for rows to be renewed");
            await driver.wait(async () => { //Wait until the rows from the previous loop have changed
                try {
                    await rows[0].getTagName();
                    return false;
                } catch (err) {
                    return true;
                }
            }, 5000).then(logger.log("Done waiting for rows"));
            await sleep(300); //Wait .3s just in case
        }
        if (c > 1) { //If it failed at least twice, wait and 3 seoncds for things to load
            await sleep(3000);
        }
        let table = await driver.findElement(By.className("table-section")); //Find the table of blocks
        rows = await table.findElements(By.css("mat-row")); //find all the rows of the table (each row corresponds to the information of one block option)
        if (desired.hasOwnProperty("name")) { //If the name property is defined
            let r = await blocksList(driver, rows, "mat-column-name", desired.name); //Attempt to find and select the desired block 
            if (r == -1) i--; //If there was an error, try again
            else if (r == 1) return 1; //A block was successully found (ends the function)
            else if (r == 2) return 0; //The block was found but full
        }
        if (desired.hasOwnProperty("teacher")) { //If the teacher property is defined and no block was found by name or name was not defined
            let r = await blocksList(driver, rows, "mat-column-teacher", desired.teacher); //Attempt to find and select the desired block
            if (r == -1) i--; //If there was an error, try again
            else if (r == 1) return 1; //A block was successfully found
            else if (r == 2) return 0;
        }
        if (desired.hasOwnProperty("room")) { //If the room property is defined and a block still hasn't been found
            let r = await blocksList(driver, rows, "mat-column-room", desired.room); 
            if (r == -1) i--;
            else if (r == 1) return 1;
            else if (r == 2) return 0;
        }
       
    }
    
    //No matching blocks found, Alert user
    let dayProperties = Object.keys(desired);
    let identifiers = ""
    for (let i = 0; i < dayProperties.length; i++) { //For every property
        if (["name", "teacher", "room"].includes(dayProperties[i])) { //If the property is an identifier
            identifiers = identifiers + dayProperties[i] + "=" + desired[dayProperties[i]] + ", " //Add it and its value to the string
        }
    }
    if (identifiers == "") {
        logger.error("Config ERROR: No identifiers found for block with query= " + desired.query);
    }
    identifiers = identifiers.substring(0, identifiers.length-2); //Remove trailing comma
    logger.warn("Enrollment WARN: No block found under query " + desired.query + " with any matches to " + identifiers, true);
    
    return -1; //Specify that no blocks were found
}

async function blocksList(driver, rows, cName, compare) {  //Attempt to select the desired block
    logger.log("Checking block list")
    for (let i = 0; i < rows.length; i++) { //For every row in the table of blocks
        try {
            let blockName = await rows[i].findElement(By.className(cName)).getText(); //Get the desired information of the block (name or teacher or room)
            logger.log("Found: " + blockName + " Searching for: " + compare);
            if (blockName.includes(compare)) { //If the block matches the information specified
                let seatsString = (await rows[i].findElement(By.className("mat-column-seats")).getText()).split("/"); //Get the number of seats availiable and seats taken in the block
                if (Number(seatsString[0]) >= Number(seatsString[1])) { //If the block is full
                    return 2; //Return 2 to specify that a block was found but is full
                } else {
                    await selectRow(driver, rows[i]); //Select the block and book it
                    return 1; //Return 1 to specify that a block was booked successfully
                }
            }
        } catch (err) { //If there is an error
            if (err.name == 'StaleElementReferenceError') { //If the error is due to a rare race condition
                logger.warn("Navigation WARN: Stale element in block list. Retrying...")
                return -1; //Return -1 to specify the rare condition occured and to try an additional time
            } else {
                throw(err); //Otherwise crash the program as normal
            }
        }
    }
    return 0; //Return 0 to specify that no block was found that matched the given info
}

function desiredOrder(dateString, cycleDay) { //Get the most desired blocks in priority order
    let result = []
    if (config.hasOwnProperty("schedule") && Object.keys(config.schedule).length > 0) { //If config has schedule 
        let dt = new Date(dateString);
        let ds = dt.toLocaleDateString("en-CA"); //Get current local date in"yyyy-mm-dd" format 
        if (config.schedule.hasOwnProperty(ds)) { //If blocks are defined for that date
            if (Array.isArray(config.schedule[ds])) { //If there are multiple defined for that date
                result.push(...config.schedule[ds]); //Add them all to the order
            } else if (typeof config.schedule[ds] == "object"){ //If there is only one
                result.push(config.schedule[ds]); //Add it to the order
            } else { //If the block is improperly defined
                logger.error("Config ERROR: Schedule block orders must be either object or array")
            }
        }
    }
    if (config.hasOwnProperty("agenda") && Object.keys(config.agenda).length > 0 && config.agenda.hasOwnProperty(cycleDay)) { //If the agenda is set for this cycle day
        if (Array.isArray(config.agenda[cycleDay])) { //If there are multiple for this cycle day
            result.push(...config.agenda[cycleDay]); //Add them to the order
        } else if (typeof config.agenda[cycleDay] == "object") { //If there is only one
            result.push(config.agenda[cycleDay]); //Add it to the order
        } else { //If the blocks are improperly defined
            logger.error("Config ERROR: Agenda block orders must be either object or array")
        }
    }
    logger.log("Done compiling result")
    return result; //Return the order of blocks to try and book
}

async function selectRow(driver, rowElement) { //Click on and schedule the block
    logger.log("Row selected");
    await rowElement.findElement(By.css("mat-radio-button")).click(); //Click the block selector button
    await driver.findElement(By.xpath("//span[contains(., '"+"Change Schedule"+"')]")).click(); //Click the change schedule button
    await driver.wait(async () => { //Wait until the loading indicator dissapears
        let elements = await driver.findElements(By.className("loading-indicator"));
        return elements == 0;
    });
    let okElement = await driver.findElement(By.xpath("//span[contains(., '"+"Ok"+"')]")) //Find the ok button
    await driver.wait(until.elementIsEnabled(okElement)); //Wait until ok button enabled
    await sleep(600); //Wait 0.6s for an element to stop blocking the ok button
    await okElement.click(); //Click the ok button
    return;
}

async function registerIblocks() { //Main register task
    let driverOptions = new chrome.Options();
    driverOptions.setLoggingPrefs({
        driver: 'OFF',
        client: 'OFF',
        server: 'OFF'
    })
    let driver = await new Builder().forBrowser(Browser.CHROME).setChromeOptions(driverOptions).build();
    await driver.get(homeurl);
    await sleep(100);
    let currentURL = await driver.getCurrentUrl();
    if (currentURL == loginurl) { //Assess whether login is required (it almost always is)
        if (await login(driver) == false) { //Attempt a login
            logger.error("Login ERROR: Login failed. Please ensure your credentials are correct.")
            await driver.quit(); //If login fails, quit 
            process.exit();
        }
    }
    //Should be logged in and on homepage by this point
    await homepage(driver);
    logger.log("Enroll task finished successfully", true);
    await driver.quit();
    setTimeout(async function() {
        registerIblocks();
    }, config.interval);
}

async function main() { //Config parsing and initialization

    logger.log("Welcome to MyFlex Automation!", true);
    if (fs.existsSync("package.json")) {
        let data = await JSON.parse(fs.readFileSync("package.json"));
        logger.log(`Initializing program version ${Object.keys(data).includes("version") ? data.version : "unknown"}...\n`, true);
    } else {
        logger.error("Config ERROR: Missing `package.json` package file!");
    }

    if (!fs.existsSync("config.json5")) {
        logger.error("Config ERROR: Missing `config.json5` config file!");
        process.exit();
    } else if (config == null || !config.hasOwnProperty("interval") || !config.hasOwnProperty("eventTitle")) {
        let missing = "";
        let props = ["interval", "eventTitle", "agenda"];
        for (let i = 0; i < props.length; i++) {
            if (config == null || !config.hasOwnProperty(props[i])) {
                missing = missing + props[i] + ", ";
            }
        }
        missing = missing.substring(0, missing.length-2);
        logger.error("Config ERROR: Missing required configuration properties in `config.json5` " + missing);
        process.exit();
    }
    if (config != null && (!config.hasOwnProperty("agenda") || Object.keys(config.agenda).length < 1 ) && (!config.hasOwnProperty("schedule") || Object.keys(config.schedule).length < 1)) {
        logger.error("Config ERROR: No enrollment instructions have been set in `config.json5`. See `README.md` for setup instructions");
        process.exit();
    }

    if (!fs.existsSync(".env")) { 
        logger.warn("Config WARN: `.env` credentials file not found. Please input your credentials", true);
        email = await logger.input("Email: ");
        password = await logger.input("Password: ");
        fs.writeFileSync(".env", `EMAIL="${email}"\nPASSWORD="${password}"`, "utf-8");
        logger.log("Credentials saved to file", true);
    } else if (password == null || password == "" || email == null || email == "") {
        if ((password == null || password == "") && (email == null || email == "")) {
            logger.warn("Config WARN: Missing credentials. Please input your credentials", true);
            email = await logger.input("Email: ");
            password = await logger.input("Password: ");
            fs.writeFileSync(".env", `EMAIL="${email}"\nPASSWORD="${password}"`, "utf-8");
            logger.log("Credentials saved to file", true);
        } else if (password == null || password == "") {
            logger.warn("Config WARN: Missing password. Please input your password", true);
            password = await logger.input("Password: ");
            fs.writeFileSync(".env", `EMAIL="${email}"\nPASSWORD="${password}"`, "utf-8");
            logger.log("Credentials saved to file", true);
        } else {
            logger.warn("Config WARN: Missing email. Please input your email", true);
            email = await logger.input("Email: ");
            fs.writeFileSync(".env", `EMAIL="${email}"\nPASSWORD="${password}"`, "utf-8");
            logger.log("Credentials saved to file", true);
        }
    }
    while (!(/[-A-Za-z0-9!#$%&'*+/=?^_`{|}~]+(?:\.[-A-Za-z0-9!#$%&'*+/=?^_`{|}~]+)*@(?:[A-Za-z0-9](?:[-A-Za-z0-9]*[A-Za-z0-9])?\.)+[A-Za-z0-9](?:[-A-Za-z0-9]*[A-Za-z0-9])?/i).test(email)) { //Make sure the email is in a valid format (Regex testing)
        logger.warn("Config WARN: Invalid email. Please update your email", true);
        email = await logger.input("Email: ");
        fs.writeFileSync(".env", `EMAIL="${email}"\nPASSWORD="${password}"`, "utf-8");
        logger.log("Credentials saved to file", true);
    }
    while (password == "") {
        logger.warn("Config WARN: Invalid password. Please update your password", true);
        password = await logger.input("Password: ");
        fs.writeFileSync(".env", `EMAIL="${email}"\nPASSWORD="${password}"`, "utf-8");
        logger.log("Credentials saved to file", true);
    }

    try {
        registerIblocks();
    } catch (err) {
        logger.error(err, true);
        console.log("UNCAUGHT ERROR: \x1b[41mPlease report this on the project's GitHub!");
        throw(err);
    }

}

main();