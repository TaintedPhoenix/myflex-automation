import fs from "fs";
import path from "path";
import readline from "readline";

class Logger {
    private processName : string;
    private logFilePath : string;
    private logFileEnabled : boolean = true;
    private outputEnabled : boolean = true;

    /** 
     * Initializes the Logger and creates a log directory if one does not exist.
     * 
     * @param {string} processName The name of the process writing to the log
     */

    public constructor(processName : string) {
        this.processName = processName;
        if (fs.existsSync("config.json")) {
            let configData : Object;
            try {
                configData = JSON.parse((fs.readFileSync("config.json", 'utf-8')));
                this.logFileEnabled = Object.keys(configData).includes("loggingEnabled") ? Boolean(configData["loggingEnabled"]) : true
                this.outputEnabled = Object.keys(configData).includes("outputEnabled") ? Boolean(configData["outputEnabled"]) : true
            } catch (err) {}
        }
        if (this.logFileEnabled) {
            let now : Date = new Date();
            let pathString : string = now.toISOString().substring(0, 10);
            let i : number = 1;
            while (fs.existsSync(path.join(__dirname, "logs", pathString, ".txt"))) {
                pathString = pathString.substring(0, 10) + "-" + String(i);
                i++;
            }
            this.logFilePath = path.join(__dirname, "logs", pathString, ".txt");
            if (!fs.existsSync(path.join(__dirname, "logs"))) {
                fs.mkdirSync(path.join(__dirname, "logs"));
            }
        }
    }

    private assessLog() {
        let now : Date = new Date();
        let pathString : string = now.toISOString().substring(0, 10);
        if (pathString != this.logFilePath.substring(5, 15)) {
            let i = 1;
            while (fs.existsSync(path.join(__dirname, "logs", pathString, ".txt"))) {
                pathString = pathString.substring(0, 10) + "-" + String(i);
                i++;
            }
            this.logFilePath = path.join(__dirname, "logs", pathString, ".txt");
        }
    }

    private writeLog(content : string) {
        fs.appendFileSync(this.logFilePath, content, 'utf-8');
    }

    /** 
     * Writes info to stdout and/or log file if they are enabled in the config.
     * 
     * @param {string} info The information to write.
     * @param {boolean} ignoreConfig Whether to write to the output even if it is disabled in config.
     */

    public log(info : string, ignoreConfig? : boolean) {
        let now : Date = new Date();
        let content : string = `[${now.toISOString().substring(11, 19)}] [${this.processName}/Log]: ${info}`
        if (this.logFileEnabled) {
            this.assessLog();
            this.writeLog(content);
        }
        if (this.outputEnabled || ignoreConfig) {
            console.log(content);
        }
    }

    /** 
     * Writes warning info to stdout and/or log file if they are enabled in the config.
     * 
     * @param {string} info The information to write.
     * @param {boolean} ignoreConfig Whether to write to the output even if it is disabled in config.
     */

    public warn(info : string, ignoreConfig? : boolean) {
        let now : Date = new Date();
        let content : string = `[${now.toISOString().substring(11, 19)}] [${this.processName}/Warn]: ${info}`
        if (this.logFileEnabled) {
            this.assessLog();
            this.writeLog(content);
        }
        if (this.outputEnabled || ignoreConfig) {
            console.log("\x1b[1;49;33m" + content + "\x1b[0m");
        }
    }

    /** 
     * Writes error info to stderr and log file if it is enabled in the config. 
     * 
     * @param {string} info The information to write.
     */

    public error(info : string) {
        let now : Date = new Date();
        let content : string = `[${now.toISOString().substring(11, 19)}] [${this.processName}/Error]: ${info}`
        if (this.logFileEnabled) {
            this.assessLog();
            this.writeLog(content);
        }
        console.error("\x1b[1;49;31m" + content + "\x1b[0m");
    }

    /**
     * Poses a question to the user and waits for an answer.
     * 
     * @param {string} prompt The question to pose to the user
     * @returns {string} The answer given by the user
     */

    public input(prompt : string): string {
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
        let now : Date = new Date();
        let content : string = `[${now.toISOString().substring(11, 19)}] [${this.processName}/Input]: ${prompt}`;
        if (this.logFileEnabled) {
            this.assessLog();
            this.writeLog(content);
        }
        let result : string = ""
        rl.question("\x1b[1;49;32m" + content + "\x1b[0m", (answer : string) => {
            result = answer;
            rl.close();
        })
        return result;
    }
}

export {Logger}