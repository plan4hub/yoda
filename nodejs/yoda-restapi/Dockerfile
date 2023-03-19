# specify the node base image with your desired version node:<version>
FROM node:lts-slim

# replace this with your application's default port
EXPOSE 8183

RUN mkdir /var/tmp/yoda-restapi/; chmod a+w /var/tmp/yoda-restapi/ 
WORKDIR /usr/app
COPY package.json .
RUN npm install
COPY *.js /usr/app/
COPY yoda-restapi-swagger.yaml /usr/app/

CMD ["node", "yoda-restapi.js"]
