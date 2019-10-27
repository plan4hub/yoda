# Yoda webhook

Yoda webhook is a server able to listen for GitHub events in order to run validations, changes, etc. The server is delivered as an example, so you'll need to modify it to performn the tasks you want. Hopefully most of 
this will be self-explanatory.

To install Yoda webhook, simply execute:

`npm install`

Then run the following command in order to understand the options:

`node yoda-webhook.js`


## Configuration your GitHub webhook

You may lace GitHub webhook either at repository or organisation layer. You find the setup under *Settings/Hooks*. Fill in fields as follows:

Payload URL: `http://(server:port)`
Content Type: `application/json`
Secret: (secret)

Select event(s). Most relevant is `Issues`. 

## Running Yoda webhook in docker

A `Dockerfile` is delivered in order to build a docker image. Simply run:

`docker build -t yoda-webhook .`

or (if npm install hangs and you are in HPE network):

```
docker build -t yoda-webhook --build-arg HTTP_PROXY=http://web-proxy.sdc.hpecorp.net:8080 --build-arg HTTPS_PROXY=http://web-proxy.sdc.hpecorp.net:8080 --build-arg http_proxy=http://web-proxy.sdc.hpecorp.net:8080 --build-arg https_proxy=http://web-proxy.sdc.hpecorp.net:8080 .
```

To run the image, you need to give the start-up arguments in a special environment variable `YODA_WEBHOOK_OPTIONS`. See example:

```
docker run -d -it -p 8181:8181 --rm --name yoda-webhook-app --env YODA_WEBHOOK_OPTIONS="--user jens-markussen -p (personal access token) --loglevel debug" yoda-webhook

```

You may display the logs from the container using:

`docker logs -f yoda-webhook-app`

or open a prompt in the container using:

`docker exec -it yoda-webhook-app /bin/sh`

