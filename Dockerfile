FROM node:16

WORKDIR /usr/src/app

COPY package.json yarn.lock .env ./

RUN yarn install

COPY . .

RUN yarn build

CMD ["node", "dist/main.js"]
