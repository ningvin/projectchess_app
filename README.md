# Project Chess

## Prequesites

1. Install [Node.js](https://nodejs.org/en/)
2. Install [Apache Cordova](https://cordova.apache.org/#getstarted)
3. Install [Monaca/Onsen UI](https://onsen.io/getting-started/)
4. For android builds/tests: Install the [Android SDK](https://developer.android.com/studio/index.html#downloads)
(Note: Android Studio is not required but may make it easier to set things up)

## Installation

Clone this project

## Build the project

Navigate to the root of your project (should contain the config.xml file) and run the following commands in a command prompt:
1. `cordova prepare` (only on first build)
2. `cordova build [platform]`

## Run the project

Run `monaca preview` to preview the app in a browser. To run it on an emulator use `cordova emulate [platform]`.
In case of android you have to have an instance of a virtual device running in the emulator before you execute this command. (more on that topic [here](https://developer.android.com/studio/run/managing-avds.html))

Example:
1. `%localappdata%\Android\sdk\tools\emulator -avd Nexus_5X_API_25`
2. `cordova emulate android`
