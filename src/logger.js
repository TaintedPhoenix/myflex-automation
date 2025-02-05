
import fs from "fs";
import path from "path";
import readline from "readline";

class Logger {

    /** 
     * Initializes the Logger and creates a log directory if one does not exist.
     * 
     * @param {string} processName The name of the process writing to the log
     * @param {object} config Config options for the logger
     */

    constructor(processName, config={}) {
        this.processName = processName;
        this.logFileEnabled = Object.keys(config).includes("loggingEnabled") ? Boolean(config["loggingEnabled"]) : true
        this.outputEnabled = Object.keys(config).includes("outputEnabled") ? Boolean(config["outputEnabled"]) : true
        if (this.logFileEnabled) {
            let now = new Date();
            let pathString  = now.toISOString().substring(0, 10);
            let i = 1;
            if (!fs.existsSync(path.join("logs"))) {
                fs.mkdirSync(path.join("logs"));
            }
            while (fs.existsSync(path.join("logs", pathString + ".log"))) {
                pathString = pathString.substring(0, 10) + "-" + String(i);
                i++;
            }
            this.logFilePath = path.join("logs", pathString + ".log");
            fs.writeFileSync(path.join("logs", "latest.log"), "");
        } else {
            this.warn("Logger WARN: Log file set to disabled. No log file will be created for this session");
        }
        if (!this.outputEnabled) {
            this.warn("Logger WARN: Output set to disabled. Only critical information will be displayed", true);
        }
    }

    assessLog() {
        let now = new Date();
        let pathString = now.toISOString().substring(0, 10);
        if (pathString != this.logFilePath.substring(5, 15)) {
            let i = 1;
            while (fs.existsSync(path.join("logs", pathString + ".log"))) {
                pathString = pathString.substring(0, 10) + "-" + String(i);
                i++;
            }
            this.logFilePath = path.join("logs", pathString + ".log");
            fs.writeFileSync(path.join("logs", "latest.log"), "");
        }
    }

    writeLog(content) {
        fs.appendFileSync(this.logFilePath, content+"\n", 'utf-8');
        fs.appendFileSync(path.join("logs", "latest.log"), content + "\n", 'utf-8')
    }

    /** 
     * Writes info to stdout and/or log file if they are enabled in the config.
     * 
     * @param {string} info The information to write.
     */

    log(...args) {
        let info  = []
        args.forEach(arg => { if (typeof arg == "string") {info.push(arg)} else {info.push(arg.toString())}});
        info = info.join(" ");
        let now = new Date();
        let content = `[${now.toISOString().substring(11, 19)}] [${this.processName}/Log]: ${info}`
        if (this.logFileEnabled) {
            this.assessLog();
            this.writeLog(content);
        }
        if (this.outputEnabled) {
            console.log(content);
        }
    }

    /** 
     * Writes info to stdout regardless of if it is enabled and the log file if it is enabled in the config.
     * 
     * @param {string} args The information to write.
     */

    forceLog(...args) {
        let info  = []
        args.forEach(arg => { if (typeof arg == "string") {info.push(arg)} else {info.push(arg.toString())}});
        info = info.join(" ");
        let now = new Date();
        let content = `[${now.toISOString().substring(11, 19)}] [${this.processName}/Log]: ${info}`
        if (this.logFileEnabled) {
            this.assessLog();
            this.writeLog(content);
        }
        console.log(content);
    }

    /** 
     * Writes warning info to stdout and/or log file if they are enabled in the config.
     * 
     * @param {string} args The information to write.
     */

    warn(...args) {
        let info  = []
        args.forEach(arg => { if (typeof arg == "string") {info.push(arg)} else {info.push(arg.toString())}});
        info = info.join(" ");
        let now = new Date();
        let content = `[${now.toISOString().substring(11, 19)}] [${this.processName}/Warn]: ${info}`
        if (this.logFileEnabled) {
            this.assessLog();
            this.writeLog(content);
        }
        if (this.outputEnabled) {
            console.log("\x1b[1;49;33m" + content + "\x1b[0m");
        }
    }

    /** 
     * Writes warning info to stdout regardless of if it is enabled and the log file if it is enabled in the config.
     * 
     * @param {string} args The information to write.
     */

    forceWarn(...args) {
        let info  = []
        args.forEach(arg => { if (typeof arg == "string") {info.push(arg)} else {info.push(arg.toString())}});
        info = info.join(" ");
        let now = new Date();
        let content = `[${now.toISOString().substring(11, 19)}] [${this.processName}/Warn]: ${info}`
        if (this.logFileEnabled) {
            this.assessLog();
            this.writeLog(content);
        }
        console.log("\x1b[1;49;33m" + content + "\x1b[0m");
    }

    /** 
     * Writes error info to stderr and log file if it is enabled in the config. 
     * 
     * @param {string} args The information to write.
     */

    error(...args) {
        let info  = []
        args.forEach(arg => { if (typeof arg == "string") {info.push(arg)} else {info.push(arg.toString())}});
        info = info.join(" ");
        let now = new Date();
        let content = `[${now.toISOString().substring(11, 19)}] [${this.processName}/Error]: ${info}`
        if (this.logFileEnabled) {
            this.assessLog();
            this.writeLog(content);
        }
        console.error("\x1b[1;49;31m" + content + "\x1b[0m");
    }

    /** 
     * Writes debug info stdout and/or log file if it is enabled in the config. 
     * 
     * @param {string} args The information to write.
     */

    debug(...args) {
        let info  = []
        args.forEach(arg => { if (typeof arg == "string") {info.push(arg)} else {info.push(arg.toString())}});
        info = info.join(" ");
        let now = new Date();
        let content = `[${now.toISOString().substring(11, 19)}] [${this.processName}/Debug]: ${info}`
        if (this.logFileEnabled) {
            this.assessLog();
            this.writeLog(content);
        }
        if (this.debugEnabled) {
        console.log("\x1b[1;36;40m" + content + "\x1b[0m");
        }
    }

    /** 
     * Writes error info log file if it is enabled in the config but not stderr. 
     * 
     * @param {string} args The information to write.
     */

    silentError(...args) {
        let info  = []
        args.forEach(arg => { if (typeof arg == "string") {info.push(arg)} else {info.push(arg.toString())}});
        info = info.join(" ");
        let now = new Date();
        let content = `[${now.toISOString().substring(11, 19)}] [${this.processName}/Error]: ${info}`
        if (this.logFileEnabled) {
            this.assessLog();
            this.writeLog(content);
        }
    }

    /**
     * Poses a question to the user and waits for an answer.
     * 
     * @param {string} prompt The question to pose to the user
     * @returns {Promise<string>} The answer given by the user
     */

    input(prompt) {
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
        let now = new Date();
        let content = `[${now.toISOString().substring(11, 19)}] [${this.processName}/Input]: ${prompt}`;
        if (this.logFileEnabled) {
            this.assessLog();
            this.writeLog(content);
        }
        
        return new Promise((resolve) => {
            rl.question("\x1b[1;49;32m" + content + "\x1b[0m", (answer) => {
                rl.close();
                resolve(answer);
            });
        });
    }
}

export {Logger}