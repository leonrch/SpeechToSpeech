# SpeechToSpeech
# Speech to Speech Browser Application

  The application uses IBM's speech recognition, machine translation, and voice synthesis capabilities to instantly translate speech to another language and reads the translation aloud. This is heavily based on the https://github.com/leonrch/SpeechToSpeech sample (the only significant change is the addition of support for German and the switch to using the neural network model based machine translation)

  This code is hosted on two instances of GIT. One is used for public perusal of the code and one is used as part of the deployment toolchain. If you are pushing changes to this project make sure to push it to both GUT repositories. Your environment will be automatically configured to push back changes to the repository that you originally cloned, but use one of the commands below:

  ```sh
  $ git add remote github git@github.com:bodonova/SpeechToGerman.git
  $ git push -u github
  ```

  or

  ```sh
  $ git add remote bluemix git@git.ng.bluemix.net:brian_odonovan/speech-to-speech-app.git
  $ git push -u bluemix
  ```

Give it a try! Click the button below to fork into IBM DevOps Services and deploy your own copy of this application on Bluemix.

[![Deploy to Bluemix](https://bluemix.net/deploy/button.png)](https://bluemix.net/deploy?repository=hhttps://github.com/bodonova/SpeechToGerman)

## Getting Started

1. Create a Bluemix Account

    [Sign up][sign_up] in Bluemix, or use an existing account. Watson Services in Beta are free to use.

2. Download and install the [Cloud-foundry CLI][cloud_foundry] tool

3. Edit the `manifest.yml` file and change the `<application-name>` to something unique.
  ```none
---
declared-services:
  speech-to-text-service-standard:
    label: speech_to_text
    plan: standard
  language-translation-service:
    label: language_translation
    plan: standard
  text-to-speech-service:
    label: text_to_speech
    plan: standard
applications:
- name: <application name>
  command: node app.js
  buildpack: sdk-for-nodejs
  path: .
  memory: 256m
  services:
  - speech-to-text-service-standard
  - language-translation-service
  - text-to-speech-service
  ```
  The name you use will determinate your application url initially, e.g. `<application-name>.mybluemix.net`.

4. Install [Node.js](http://nodejs.org/)

5. Install project dependencies and build browser application:
  ```sh
  $ npm install
  $ npm build
  ```

6. Connect to Bluemix in the command line tool.
  ```sh
  $ cf api https://api.ng.bluemix.net
  $ cf login -u <your user ID>
  ```

7. Create the following three services in Bluemix.
  ```sh
  $ cf create-service speech_to_text standard speech-to-text-service-standard
  $ cf create-service text_to_speech standard text-to-speech-service
  $ cf create-service language_translation standard language-translation-service
  ```

8. Push it live!
  ```sh
  $ cf push
  ```
See the full [Getting Started][getting_started] documentation for more details, including code snippets and references.

## Running locally

  The application uses [Node.js](http://nodejs.org/) and [npm](https://www.npmjs.com/) so you will have to download and install them as part of the steps below.

1. When running on Bluemix, the system looks after connecting the application with the Watson services that it uses. However, when you are running locally, you need to create a `vcap-local.json` file to tell the application running locally on your laptop how to connect to the various  Watson services you need  

  **Note:** While it is possible to run the application locally, this does not mean that the application can run without an internet connection. It is essential for this application to be able to connect to the Watson services running in the cloud.

  If you already have deployed the application to Bluemix, the easiest way to create a `vcap-local.json` file is to simply copy the configuration variables from Bluemix using the commands below.

    ```sh
    $ cf env <application-name>
    ```
    Example output:
    ```sh
	System-Provided:
	{
	 "VCAP_SERVICES": {
	  "language_translation": [
	   {
		"credentials": {
		 "password": "lt-password",
		 "url": "https://gateway.watsonplatform.net/language-translation/api",
		 "username": "lt-username"
		},
		"label": "language_translation",
		"name": "language-translation-service",
		"plan": "standard",
		"provider": null,
		"syslog_drain_url": null,
		"tags": [
		 "watson",
		 "ibm_created",
		 "ibm_dedicated_public",
		 "ibm_deprecated"
		]
	   }
	  ],
	  "speech_to_text": [
	   {
		"credentials": {
		 "password": "stt-password",
		 "url": "https://stream.watsonplatform.net/speech-to-text/api",
		 "username": "stt-username"
		},
		"label": "speech_to_text",
		"name": "speech-to-text-service-standard",
		"plan": "standard",
		"provider": null,
		"syslog_drain_url": null,
		"tags": [
		 "watson",
		 "ibm_created",
		 "ibm_dedicated_public"
		]
	   }
	  ],
	  "text_to_speech": [
	   {
		"credentials": {
		 "password": "tts-password",
		 "url": "https://stream.watsonplatform.net/text-to-speech/api",
		 "username": "tts-username"
		},
		"label": "text_to_speech",
		"name": "text-to-speech-service",
		"plan": "standard",
		"provider": null,
		"syslog_drain_url": null,
		"tags": [
		 "watson",
		 "ibm_created",
		 "ibm_dedicated_public"
		]
	   }
	  ]
	 }
	}
    ```
    You need to copy the entire content of the `VCAP_SERVICES` variable into your `vcap-local.json` file. This hass all of the cnfiguration variables needed by the application

2. Install [Node.js](http://nodejs.org/)

3. To install project dependencies, go to the project folder in a terminal and run:
    ```sh
    $ npm install
    ```

4. Then, build the browser application:

    ```sh
    $ npm build
    ```

5. Start the application:
    ```sh
    $ node app.js
    ```

6. Go to: [http://localhost:3000](http://localhost:3000)

## Troubleshooting

To troubleshoot your Bluemix app the main useful source of information are the logs, to see them, run:

  ```sh
  $ cf logs <application-name> --recent
  ```

## License

  This sample code is licensed under Apache 2.0. Full license text is available in [LICENSE](LICENSE).

## Contributing

  See [CONTRIBUTING](CONTRIBUTING.md).

## Open Source @ IBM
  Find more open source projects on the [IBM Github Page](http://ibm.github.io/)

[cloud_foundry]: https://github.com/cloudfoundry/cli
[getting_started]: http://www.ibm.com/smarterplanet/us/en/ibmwatson/developercloud/doc/getting_started/
[sign_up]: https://apps.admin.ibmcloud.com/manage/trial/bluemix.html?cm_mmc=WatsonDeveloperCloud-_-LandingSiteGetStarted-_-x-_-CreateAnAccountOnBluemixCLI
