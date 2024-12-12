# MyFlex Automation

MyFlex Automation is a configurable Node.js program designed to automate Flex Block enrollment using Selenium's browser automation tools.

## Usage

Prerequisites:

- [Node.js](https://nodejs.org/en/download/prebuilt-installer)
- [Google Chrome](https://www.google.com/chrome/)
- A decent internet connection

### Foreword

Since MyFlex lacks a public API, MyFlex Automation relies on browser automation tools to emulate user actions to schedule Flex Blocks. The nature of this method means storing unencrypted Google Account credentials is unavoidable. For this reason, **it is VERY STRONGLY ADVISED that you deploy this program as a local instance or on a server you have complete control over to avoid sharing unencrypted credentials with others.** This program is designed to run continuously, checking every 24 hours (by default) for new Flex Blocks to have opened for enrollment. My recommendation is to host this software on something like an old laptop you leave on and plugged in.

### Instructions

Ensure you have downloaded the programs listed under Prerequisites. Then:

1. Download the source code archive of the [latest release](https://github.com/TaintedPhoenix/MyFlex-automation/releases/latest).
2. Extract the file to a directory of your choice.
3. Open the `config.json5` file in a text editor.
4. Set up your desired enrollment instructions per the specifications below and save the file.
5. Launch the program by executing `run.bat` on Windows devices and `run.sh` on MacOS/Linux devices.
6. Input your Google Email and Password when prompted (These will be saved locally to the `.env` credentials file for future launches).
7. Ensure that the program is able to log in successfully by watching the output.

## Configuration

The config options (including the enrollment agenda) for the program can be found in `config.json5`. Each parameter is detailed below. The default `config.json5` looks like this:

```json5
{
    "instructions" : { 
        "schedule" : {},
        "cycle" : {},
        "default" : [],
    },
    "eventTitle" : "I Block", 
    "interval" : 86400000, 
    "loggingEnabled" : true,
    "outputEnabled" : true, 
}
```

### Options List

#### instructions

The most important config option is the enrollment instructions. You **must** alter this option for the program to function. It is an object/dictionary of members that describe what blocks the program should enroll in, when, and in what order. An example Flex Block is:

```json5
{
    "query" : "Tadeu",
    "name" : "VGCUSA",
    "teacher" : "Tadeu",
    "room" : "215" 
}
```

The only required Flex Block parameter is `query`, the text to be entered into the search box that will make the desired block appear in the Block List on the MyFlexLearning Website. In this example, the desired block is "VGCUSA", and the query that would be entered into the config is "Tadeu".

!["Tadeu" entered into the MyFlex search box, a block named "VGCUSA" appears in the results](assets/queryExample.png)

At least one of the other three parameters (`name`, `teacher`, `room`) is required. This information is used to select the desired block from the ones remaining after the search query. Their names are self-explanatory, but note that the `name` and `teacher` parameters only check that the Block Name or Teacher **includes** their value, not that it is an exact match. If more than one of these parameters are defined (Which is not necessary), the program will select the first block that matches **at least one** of the conditions, checking for a match to `name` first, then `teacher`, and finally `room`.

The above information describes how to convey *what* blocks you want, but you also need to convey when and in what order you want them. The `instructions` config option has three parameters (only one of which is required, but multiple are allowed): `schedule`, `cycle`, and `default` which each represent a different method of specifying when you want to book certain blocks. Blocks listed in `schedule` will be prioritized first, then blocks in `cycle`, then `default`.

`schedule` is used for specifying blocks to prioritize on a specific date. Each date is a key, with the value being either a single block or an array of blocks (In an array, the elements listed first will take priority over the later elements in the array). In the below example, the program will prioritize searching for the two listed blocks for the date "January 9, 2025". It is perfectly fine to have more than one date for which you want to have a special priority list.

```json5
"schedule" : {
    "2025-01-09" : [
        {
            "query" : "DePesa",
            "name" : "American Literature",
            "teacher" : "DePesa",
            "room" : "230"
        },
        {
            "query" : "Sountsova",
            "name" : "AP Physics C and Science of Resonance",
            "teacher" : "Sountsova",
            "room" : "407"
        }
    ]
}
```

`cycle` is used for specifying blocks to prioritize for a specific cycle day (Ex. day 5 on a 6-day cycle). The cycle day(s) (as a string) are the keys, with the value being either a single block or a list of blocks to search for on that cycle day. In the below example, the program will search for the block "VGCUSA" on cycle day "6", and "Tadeu" on cycle day "3". You do not need to define a block order for every cycle day if you do not want to.

```json5
"cycle" : {
    "3" : {
        "query" : "Tadeu",
        "teacher" : "Tadeu",
        "room" : "215"
    },
    "6" : {
        "query" : "VGCUSA",
        "name" : "VGCUSA",
        "teacher" : "Tadeu",
        "room" : "215"
    }
}
```

Finally, `default` is used to specify blocks to search for on any day regardless of cycle or date. It can be either a single block or a list of blocks. You do not have to define it if you don't want to, as long as either `cycle` or `schedule` is defined. In the below example, the blocks "Barneschi" and "Weissman" will be searched for every day (after every block in `schedule` and `cycle` has not been found).

```json5
"default" : [
    {
        "query" : "Tadeu",
        "teacher" : "Barneschi",
        "room" : "215"
    },
    {
        "query" : "Weissman",
        "teacher" : "Weissman",
        "room" : "824"
    }
]
```

#### eventTitle

`eventTitle` also requires attention for the program to function as intended. This option defines the string the program will search for when checking for unscheduled blocks. It should be set to whatever title your school uses for unscheduled blocks on MyFlex. In this example, the title is "I-block":

![An unscheduled MyFlex Block with the name "I-Block"](assets/eventTitleExample.png)

#### interval

Sets the time (in milliseconds) between checks for newly opened Flex Blocks. The default is 86400000 milliseconds, equivalent to 24 hours. It is advised not to set this option lower than 3600000 milliseconds, equivalent to 1 hour, as such a short interval is almost always unnecessary.

#### loggingEnabled

Sets whether or not to record the program output to a log file. We **strongly** recommend keeping this enabled for the sake of error reporting, especially since the program is under active development. If needed, you can find your log files in the `logs` folder in the program's root directory.

#### outputEnabled

Sets whether or not to display non-critical messages from the program to the console. Non-critical messages are mostly just the program discerning what actions it is taking.

### Full Example

This is how a fully configured `config.json5` file could look:

```json5
{
    "instructions" : { 
        "schedule" : { //User wants to define blocks to search for on a specific date(s)
            "2025-01-09" : [ //Set priority blocks for January 9 2025
                { //Search for this block first
                    "query" : "DePesa", //DePesa should be entered into the search box to make the block show up
                    "name" : "American Literature", //Find a block with a name that matches "American Literature"
                    "teacher" : "DePesa", //If no block with the name was found, search for a block with this teacher
                    "room" : "230" //If no block with the teacher was found, search for a block with this room
                },
                { //If the first block was not found, search for this block next
                    "query" : "Sountsova",
                    "name" : "AP Physics C and Science of Resonance",
                    "teacher" : "Sountsova",
                    "room" : "407"
                }
            ]
        },
        "cycle" : { //User wants to define blocks to search for on a specific cycle day(s)
            "3" : { //Set priority block for cycle day "3"
                "query" : "Tadeu",
                "teacher" : "Tadeu",
                "room" : "215"
            },
            "6" : [ //Set priority blocks for cycle day "6"
                { //Search for this block first
                    "query" : "VGCUSA",
                    "name" : "VGCUSA",
                    "teacher" : "Tadeu",
                    "room" : "215"
                },
                { //Then this block if the first one was not found
                    "query" : "Olaharski",
                    "teacher" : "Olaharski",
                    "room" : "419"
                }
            ]
        },
        "default" : [ //User wants to set blocks to be searched for every day (after searching for blocks listed under schedule or cycle)
            { //Search for this block first
                "query" : "Tadeu",
                "teacher" : "Barneschi",
                "room" : "215"
            },
            { //Then this block if the first block was not found
                "query" : "Weissman",
                "teacher" : "Weissman",
                "room" : "824"
            }
        ]
    },
    "eventTitle" : "I Block", //User's School uses the title "I Block" for unscheduled blocks
    "interval" : 86400000, //Check for newly-opened blocks every 24 hours
    "loggingEnabled" : true, //Write program output to a log file
    "outputEnabled" : true //Display non-critical program messages in the console 
}
```

## Error reporting

As MyFlex Automation is still in active development, it is prone to errors. If you encounter an error, please [open an issue on GitHub](https://github.com/TaintedPhoenix/MyFlex-automation/issues) (After checking that someone else hasn't already reported the same issue) and include a copy of your `config.json5` file and any relevant log files (usually `latest.txt`) which can be found in the `logs` folder, as well as a short description of the problem, and any other relevant information. Your contribution is greatly appreciated!

Additionally, if want to make any additions or changes to the program (especially to this `README.md`) that you believe would be beneficial, feel free to [create a Pull Request](https://github.com/TaintedPhoenix/MyFlex-automation/pulls) and submit your desired changes for review.

Thank you for using my software!

~TaintedPhoenix
