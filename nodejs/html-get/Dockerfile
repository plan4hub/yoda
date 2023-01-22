# e.g.  docker build -t html-get .
#
# specify the node base image with your desired version node:<version>
FROM ghcr.io/puppeteer/puppeteer:latest

RUN mkdir /home/pptruser/app
WORKDIR /home/pptruser/app
COPY package.json .
RUN npm install
COPY *.js /home/pptruser/app/
COPY *template*.html /home/pptruser/app/
ENTRYPOINT ["node", "/home/pptruser/app/html-get.js"]
CMD ["--help"]

