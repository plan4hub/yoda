# specify the node base image with your desired version node:<version>
# FROM node:10
FROM node:10-alpine

# replace this with your application's default port
EXPOSE 8181

WORKDIR /usr/app
COPY package.json .
RUN npm install
COPY . .

CMD ["node", "yoda-webhook.js"]
