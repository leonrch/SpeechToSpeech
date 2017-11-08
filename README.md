
# Speak to Watson Browser Application

The application leverages IBM's speech recognition and voice synthesis capabilities to allow users to use their voice to interact with the IBM Watson Conversation service.

Give it a try! Click the button below to fork into IBM DevOps Services and deploy your own copy of this application on Bluemix.

[![Deploy to Bluemix](https://bluemix.net/deploy/button.png)](https://bluemix.net/deploy?repository=https://github.com/bodonova/SpeakToWatson)

## Getting Started

1. Create a Bluemix Account

  [Sign up](https://apps.admin.ibmcloud.com/manage/trial/bluemix.html?cm_mmc=WatsonDeveloperCloud-_-LandingSiteGetStarted-_-x-_-CreateAnAccountOnBluemixCLI) in Bluemix, or use an existing account. IBM Watson services are free to use once you stick within certain limits.

2. Download and install the [Cloud-foundry CLI](https://github.com/cloudfoundry/cli) tool

3. Edit the `manifest.yml` file and change the `<application-name>` to something unique.
      ```none
    ---
    declared-services:
      speech-to-text-service:
        label: speech_to_text
        plan: standard
      conversation-service:
        label: conversation
        plan: free
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
      - speech-to-text-service
      - conversation-service
      - text-to-speech-service
      ```

  The application name you choose will determinate your application url initially, e.g. `<application-name>.mybluemix.net`. It must be unique to avoid clashing with other applications deployed to Bluemix.

4. Connect to Bluemix in the command line tool.
  ```sh
  $ cf api https://api.ng.bluemix.net
  $ cf login -u <your user ID>
  ```

5. Create the following three services in Bluemix.
  ```sh
  $ cf create-service speech_to_text standard speech-to-text-service
  $ cf create-service text_to_speech standard text-to-speech-service
  $ cf create-service conversation free conversation-service
  ```

6. Import the conversation definition from JSON as described in the <a href="#workspace"> Workspace section of this document</a>

7. Create an environment variable to store the workspace ID for your conversation workspace.

  ```sh
  $ cf set-env <application_name> CONV_WORKSPACE_ID <workspace_id>
  ```

8. If you want to run your application on Bluemix, push it live.

  ```sh
  $ cf push
  ```

  One of the last messages from this command will tell you the URL
  where you can see the application in action e.g. [http://<application_name>.mybluemix.net](http://<application_name>.mybluemix.net)

  If you want to run locally, see the instructions below.

## Running locally

1. In order to run the application locally, you will need to create a file `vcap-local.json` which will contain your configuration. This needs to contain the credentials from your `speech-to-text-service`, `conversation-service` and `text-to-speech-service` services in Bluemix along with conversation workspace ID.

  You can see the values you need for this file using this command:

  ```sh
  $ cf env <application-name>
  ```

  Example output:

  ```
  System-Provided:
  {
   "VCAP_SERVICES": {
    "AvailabilityMonitoring": [
     {
      "credentials": {
       "cred_url": "https://perfbroker.au-syd.bluemix.net",
       "token": " ... "
      },
      "label": "AvailabilityMonitoring",
      "name": "availability-monitoring-auto",
      "plan": "Lite",
      "provider": null,
      "syslog_drain_url": null,
      "tags": [
       "ibm_created",
       "bluemix_extensions",
       "dev_ops",
       "lite"
      ],
      "volume_mounts": []
     }
    ],
    "conversation": [
     {
      "credentials": {
       "password": "conv_password",
       "url": "https://gateway.watsonplatform.net/conversation/api",
       "username": "conv_username"
      },
      "label": "conversation",
      "name": "conversation-service",
      "plan": "free",
      "provider": null,
      "syslog_drain_url": null,
      "tags": [
       "watson",
       "ibm_created",
       "ibm_dedicated_public",
       "lite"
      ],
      "volume_mounts": []
     }
    ],
    "speech_to_text": [
     {
      "credentials": {
       "password": "stt_password",
       "url": "https://stream.watsonplatform.net/speech-to-text/api",
       "username": "stt_username"
      },
      "label": "speech_to_text",
      "name": "speech-to-text-service",
      "plan": "standard",
      "provider": null,
      "syslog_drain_url": null,
      "tags": [
       "watson",
       "ibm_created",
       "ibm_dedicated_public"
      ],
      "volume_mounts": []
     }
    ],
    "text_to_speech": [
     {
      "credentials": {
       "password": "<tts_password>",
       "url": "https://stream.watsonplatform.net/text-to-speech/api",
       "username": "<tts_user>"
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
      ],
      "volume_mounts": []
     }
    ]
   }
  }

  {
   "VCAP_APPLICATION": {
    "application_id": "<application_id>",
    "application_name": "<application_name>",
    "application_uris": [
     "<application_name>-app.au-syd.mybluemix.net"
    ],
    "application_version": "...",
    "cf_api": "https://api.au-syd.bluemix.net",
    "limits": {
     "disk": 1024,
     "fds": 16384,
     "mem": 256
    },
    "name": "<application_name>",
    "space_id": "<space_id>",
    "space_name": "Australia",
    "uris": [
     "<application_name>.au-syd.mybluemix.net"
    ],
    "users": null,
    "version": "..... "
   }
  }

  User-Provided:
  CONV_WORKSPACE_ID: <workspace_id>

  Running Environment Variable Groups:
  BLUEMIX_REGION: ibm:yp:au-syd

  Staging Environment Variable Groups:
  BLUEMIX_REGION: ibm:yp:au-syd
  ```

  You need to copy the contents of the VCAP_SERVICES variable into a new file named vcap-local.json.

  You also need to add a CONV_WORKSPACE_ID variable to this structure, using the ID of the workspace you created in the [workspace section](#workspace). If you haved forgotten it, it should be listed in the output from the _cf env_ command.

  You will end up with a file like:

  ```
  {
  "CONV_WORKSPACE_ID": "<workspace_id>",   
   "VCAP_SERVICES": {
    "AvailabilityMonitoring": [
     {
      "credentials": {
       "cred_url": "https://perfbroker.au-syd.bluemix.net",
       "token": " ... "
      },
      "label": "AvailabilityMonitoring",
      "name": "availability-monitoring-auto",
      "plan": "Lite",
      "provider": null,
      "syslog_drain_url": null,
      "tags": [
       "ibm_created",
       "bluemix_extensions",
       "dev_ops",
       "lite"
      ],
      "volume_mounts": []
     }
    ],
    "conversation": [
     {
      "credentials": {
       "password": "conv_password",
       "url": "https://gateway.watsonplatform.net/conversation/api",
       "username": "conv_username"
      },
      "label": "conversation",
      "name": "conversation-service",
      "plan": "free",
      "provider": null,
      "syslog_drain_url": null,
      "tags": [
       "watson",
       "ibm_created",
       "ibm_dedicated_public",
       "lite"
      ],
      "volume_mounts": []
     }
    ],
    "speech_to_text": [
     {
      "credentials": {
       "password": "stt_password",
       "url": "https://stream.watsonplatform.net/speech-to-text/api",
       "username": "stt_username"
      },
      "label": "speech_to_text",
      "name": "speech-to-text-service",
      "plan": "standard",
      "provider": null,
      "syslog_drain_url": null,
      "tags": [
       "watson",
       "ibm_created",
       "ibm_dedicated_public"
      ],
      "volume_mounts": []
     }
    ],
    "text_to_speech": [
     {
      "credentials": {
       "password": "<tts_password>",
       "url": "https://stream.watsonplatform.net/text-to-speech/api",
       "username": "<tts_user>"
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
      ],
      "volume_mounts": []
     }
    ]
   }
  }
  ```

2. Next, you need to install [Node.js](http://nodejs.org/)

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

6. Go to: [http://localhost:3000](http://localhost:3000) to try out the application.

## Workspace

To use the app you're creating, you need to add a workspace to your Conversation service. A workspace is a container for all the artifacts that define the behavior of your service (ie: intents, entities and chat flows). For this sample app, you can either use a workspace you already have or use the car related workspace from the [Simple Conversation](https://github.com/watson-developer-cloud/conversation-simple) sample.

For more information on workspaces, see the full  [Conversation service  documentation](https://console.bluemix.net/docs/services/conversation/getting-started.html#gettingstarted).

1. Navigate to the Bluemix dashboard, select the Conversation service that you created.

2. Go to the **Manage** menu item and select **Launch Tool**. This opens a new tab in your browser, where you are prompted to login if you have not done so before. Use your Bluemix credentials.

3. If you are deploying through Bluemix, download the [exported JSON file](https://raw.githubusercontent.com/bodonova/SpeakToWatson/master/car_workspace.json) that contains the Workspace contents. If deploying locally,  this was cloned and is in the root folder (car_workspace.json).

4. Select the import icon: ![](readme_images/importGA.PNG). Browse to (or drag and drop) the JSON file. Choose to import **Everything(Intents, Entities, and Dialog)**. Then select **Import** to finish importing the workspace.

5. Refresh your browser. A new workspace tile is created within the tooling. Select the _menu_ button within the workspace tile, then select **View details**:

  ![Workpsace Details](readme_images/details.PNG)

  In the Details UI, copy the 36 character UNID **ID** field. This is the **Workspace ID**.

  ![](readme_images/workspaceid.PNG)

6. Now you need to add this workspace ID to the configuration of your sample application. See instructions below.

# Adding environment variables in Bluemix via the web UI

If you are not comfortable manipulating environment variables using the _cf_ command line tool, you can also manipulate them using the web UI.

1. In Bluemix, open the application from the Dashboard. Select **Environment Variables**.

2. Select **USER-DEFINED**.

3. Select **ADD**.

4. Add a variable with the name **CONV_WORKSPACE_ID**. For the value, paste in the ID of the Workspace you [created earlier](#workspace). Select **SAVE**.

5. Return to the deploy steps that you were following:

## Learn more

See the full [Getting Started](https://console.bluemix.net/docs/services/watson/index.html#about) documentation for more information about IBM Watson services.

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
