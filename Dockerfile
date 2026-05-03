FROM node:20-alpine

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm install --include=dev

COPY . .

EXPOSE 3000
EXPOSE 8080

ENTRYPOINT ["npm", "run"]
CMD ["server"]
