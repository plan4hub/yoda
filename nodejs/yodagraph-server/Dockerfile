# e.g.  docker build -t yodagraph-server .
#
# specify the node base image with your desired version node:<version>
FROM ghcr.io/puppeteer/puppeteer:latest

# replace this with your application's default port
EXPOSE 8899

RUN mkdir /var/tmp/yodagraph-server/; chmod a+w /var/tmp/yodagraph-server
RUN mkdir /home/pptruser/app
WORKDIR /home/pptruser/app
COPY package.json .
RUN npm install
COPY yodagraph-server.js /home/pptruser/app

CMD ["node", "/home/pptruser/app/yodagraph-server.js"]
