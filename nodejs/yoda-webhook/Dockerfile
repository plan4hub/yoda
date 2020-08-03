# specify the node base image with your desired version node:<version>
FROM node:lts-slim

# replace this with your application's default port
EXPOSE 8181

RUN mkdir /var/tmp/yoda-webhook/; chmod a+w /var/tmp/yoda-webhook/ 
WORKDIR /usr/app
COPY package.json .
RUN npm install
COPY *.js /usr/app/

CMD ["node", "yoda-webhook.js"]
