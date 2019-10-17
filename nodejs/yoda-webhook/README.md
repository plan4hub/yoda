# Yoda webhook

Yoda webhook is a server able to listen for GitHub events in order to run validations, changes, etc. The server is delivered as an example, so you'll need to modify it to performn the tasks you want. Hopefully most of 
this will be self-explanatory.

To install Yoda webhook, simply execute:

`npm install`

Then run the following command in order to understand the options:

`node yoda-webhook.js`

## Running Yoda webhook in docker

A `Dockerfile` is delivered in order to build a docker image. Simply run:

`docker build -t yoda-webhook .`

To run the image, you need to give the start-up arguments in a special environment variable `YODA_WEBHOOK_OPTIONS`. See example:

```
docker run -d -it -p 8181:8181 --rm --name yoda-webhook-app --env YODA_WEBHOOK_OPTIONS="--user jens-markussen -p (personal access token) --loglevel debug" yoda-webhook

```

You may display the logs from the container using:

`docker logs -f yoda-webhook-app`

or open a prompt in the container using:

`docker exec -it yoda-webhook-app /bin/sh`


