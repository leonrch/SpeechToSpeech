# SpeechToSpeech
# Speech to Speech Browser Application

  The application uses IBM's speech recognition, machine translation, and voice synthesis capabilities to instantly translate speech to another language and read the translation aloud.
  
Node.js is used to provide the browser client's authentication token.

Give it a try! Click the button below to fork into IBM DevOps Services and deploy your own copy of this application on Bluemix.

[![Deploy to Bluemix](https://bluemix.net/deploy/button.png)](https://bluemix.net/deploy?repository=https://github.com/leonrch/SpeechToSpeech)

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

1. Copy the credentials from your `speech-to-text-service-standard`, `language-translation-service`,
   `text-to-speech-service` services in Bluemix to `app.js`, you can see the credentials using:

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
    You need to copy `lt-username`, `lt-password`, `stt-username`, `stt-password`, `tts-username` and `tts-password`.

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
