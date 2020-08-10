# Yoda webhook

Yoda webhook is a server able to listen for GitHub events in order to run validations, changes, etc. The server is delivered as an example, so you'll need to modify it to performn the tasks you want. Hopefully most of 
this will be self-explanatory.

The default behaviour for the webhook concerns itself with enabling parent/child references. The default GitHub issue reference (`(org)/(repo)#(issue_number)`) does not provide semantics as to what the reference means. The idea is to introduce a few simple keywords that define parent/child relationship. A child issue may refer to it's parent issue by putting somewhere in the body (first comment) the text `> partof (issue reference`. Similarly, a parent may identify childen in a list format (one issue per line). The child block is indicated using the `> contains` keyword. 


## Installation

To install Yoda webhook, simply execute:

`npm install`

Then run the following command in order to understand the options:

`node yoda-webhook.js`


## Configuration your GitHub webhook

You may lace GitHub webhook either at repository or organisation layer. You find the setup under *Settings/Hooks*. Fill in fields as follows:

Payload URL: `http://(server:port)` or `https://(server:port)` 
Content Type: `application/json`
Secret: (secret)

Select event(s). Most relevant is `Issues`.


## HTTPS / Certificates

Yoda webhook support HTTPS. This works by specifying a certificate and associated key using the arguments `--cert-key (key file name)` and `--cert (certificate file name)`.


### Self-signed certificates

The instructions to generate a self-signed certificate for testing can be found on-line easily, but are repeated below:

`openssl genrsa -out cert.key 2048`

Create config file `cert.conf` with the following contents:

``` 
[req]
distinguished_name=req
[SAN]
subjectAltName=DNS:(server domain name, e.g. arsenic.dnk.hp.com)
```

Generate the certificate:

```
openssl req -new -x509 -key cert.key -out cert -days 3650 -subj /CN=(domain) -extensions SAN -config 'cert.conf'
```

Note, that self-signed certificate will require that the webhook (in repo/org or app) disables SSL verication in settings.


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


## Kubenetes Deployment example

Below template for defining a Kubenetes Pod (native or OpenShift) for running Yoda Webhook. In case you do not have an exposed IP, use a service like smee.io (see example):

```
apiVersion: apps/v1
kind: Deployment
metadata:
  name: yoda-webhook
  namespace: yoda-webhook
spec:
  selector:
    matchLabels:
      app: yoda-webhook
  replicas: 3
  template:
    metadata:
      labels:
        app: yoda-webhook
    spec:
      containers:
        - name: yoda-webhook
          image: jensmarkussenhpe/yoda-webhook
          ports:
            - containerPort: 8181
          env:
            - name: YODA_WEBHOOK_OPTIONS
              value: "--user (user) -p (token) --loglevel info --secret (web secret) --baseurl https://api.github.com"
```
 
## Docker compose examples

Standard file (not in app mode, no HTTPS).


```
version: '2'

services:
  yoda-webhook:
    image: jensmarkussenhpe/yoda-webhook
    restart: always
    ports:
      - 8181:8181
    command: [ "node", "yoda-webhook.js", "--user", "(user)", "-p", "(token)", "--secret", "(secret)" ]
```

File with HTTPS / certificates defined. Make sure that `cert` and `cert.key` are copied into the docker volume.

```
version: '2'

services:
  yoda-webhook:
    image: jensmarkussenhpe/yoda-webhook
    restart: always
    ports:
      - 8181:8181
    volumes:
      - yoda-webhook:/var/yoda-webhook
    command: [ "node", "yoda-webhook.js", "--user", "(user)", "-p", "(token)", "--secret", "(secret)", "--cert", "/var/yoda-webhook/cert", "--cert-key", "/var/yoda-webhook/cert.key" ]

volumes:
  yoda-webhook:

```

File with HTTPS / certificates defined running in as GitHub App. Make sure that `yoda.pem`, `cert` and `cert.key` are copied into the docker volume.

```
version: '2'

services:
  yoda-webhook:
    image: jensmarkussenhpe/yoda-webhook
    restart: always
    ports:
      - 8181:8181
    volumes:
      - yoda-webhook:/var/yoda-webhook
    command: [ "node", "yoda-webhook.js", "--app-mode", "--app-appid", "(appid)", "--app-clientid", "(app clientid)", "--app-clientsecret", "(app client secret)", "--app-pemfile", "/var/yoda-webhook/yoda.pem", "--secret", "(secret)", "--cert", "/var/yoda-webhook/cert", "--cert-key", "/var/yoda-webhook/cert.key" ]

volumes:
  yoda-webhook:

```


## Test

A fully automated test for yoda-webhook is available in the `test` directory. See specific instructions for running the tests there.



