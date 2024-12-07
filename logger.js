import fs from "fs";
import path from "path";
import readline from "readline";
import YAML from "js-yaml";

class Logger {

    /** 
     * Initializes the Logger and creates a log directory if one does not exist.
     * 
     * @param {string} processName The name of the process writing to the log
     */

    constructor(processName) {
        this.processName = processName;
        if (fs.existsSync("config.yaml")) {
            let configData;
            try {
                configData = YAML.load((fs.readFileSync("config.yaml", 'utf-8')));
                this.logFileEnabled = Object.keys(configData).includes("loggingEnabled") ? Boolean(configData["loggingEnabled"]) : true
                this.outputEnabled = Object.keys(configData).includes("outputEnabled") ? Boolean(configData["outputEnabled"]) : true
            } catch (err) {}
        }
        if (this.logFileEnabled) {
            let now = new Date();
            let pathString  = now.toISOString().substring(0, 10);
            let i = 1;
            while (fs.existsSync(path.join("logs", pathString + ".txt"))) {
                pathString = pathString.substring(0, 10) + "-" + String(i);
                i++;
            }
            this.logFilePath = path.join("logs", pathString + ".txt");
            if (!fs.existsSync(path.join("logs"))) {
                fs.mkdirSync(path.join("logs"));
            }
            fs.writeFileSync(path.join("logs", "latest.txt"), "");
        } else {
            this.warn("Logger WARN: Log file set to disabled in `config.yaml` no log file will be created for this session", true);
        }
        if (!this.outputEnabled) {
            this.warn("Logger WARN: Output set to disabled in `config.yaml` only critical information will be displayed. Some of Chrome's interal logs may still show", true);
        }
    }

    assessLog() {
        let now = new Date();
        let pathString = now.toISOString().substring(0, 10);
        if (pathString != this.logFilePath.substring(5, 15)) {
            let i = 1;
            while (fs.existsSync(path.join("logs", pathString + ".txt"))) {
                pathString = pathString.substring(0, 10) + "-" + String(i);
                i++;
            }
            this.logFilePath = path.join("logs", pathString + ".txt");
            fs.writeFileSync(path.join("logs", "latest.txt"), "");
        }
    }

    writeLog(content) {
        fs.appendFileSync(this.logFilePath, content+"\n", 'utf-8');
        fs.appendFileSync(path.join("logs", "latest.txt"), content + "\n", 'utf-8')
    }

    /** 
     * Writes info to stdout and/or log file if they are enabled in the config.
     * 
     * @param {string} info The information to write.
     * @param {boolean} ignoreConfig Whether to write to the output even if it is disabled in config.
     */

    log(info, ignoreConfig = false) {
        let now = new Date();
        let content = `[${now.toISOString().substring(11, 19)}] [${this.processName}/Log]: ${info}`
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

    warn(info, ignoreConfig = false) {
        let now = new Date();
        let content = `[${now.toISOString().substring(11, 19)}] [${this.processName}/Warn]: ${info}`
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

    error(info) {
        let now = new Date();
        let content = `[${now.toISOString().substring(11, 19)}] [${this.processName}/Error]: ${info}`
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