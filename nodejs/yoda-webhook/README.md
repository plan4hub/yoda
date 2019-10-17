docker build -t yoda-webhook .
docker run -it -d -p 3000:3000 --rm --name yoda-webhook-app yoda-webhook

# Follow guide on https://github.com/octokit/webhooks.js to create a smee.io channel
# e.g. https://smee.io/VPLzPA2WsdskT29M
# Enter this URL in the code

docker logs -f yoda-webhook-app

docker exec -it yoda-webhook-app /bin/sh


# https://octokitnet.readthedocs.io/en/latest/issues/