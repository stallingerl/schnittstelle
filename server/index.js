// server/index.js
const app = require("./app");
const PORT = process.env.PORT || 3001;
const bcrypt = require("bcryptjs")
const IPFS = require('ipfs');
const OrbitDB = require('orbit-db');

const bootstrapers = require('./config/bootstrapers')


async function main() {

  // server listening 
  app.listen(PORT, () => {
    console.log(`Server listening on ${PORT}`);
  });

  var id = {
    "id": "QmWbwLZ2LvQaTQkq7XgByzSW8NY9tQaS3cnJkhHnfoSTEi",
    "privKey": "CAAS4QQwggJdAgEAAoGBAL0RYzn+t3xJphz3dO9psZq7lKH1iMYL9tHifIkeRFFCJTi6I0hFeULMPLT+rMzcbrJN3B6BCU/1Y756ZHlZB0U4q88jQY/y68xMLhZ+XePrqKd0nUGW3+VE1XbRNsAOAb95tsuOS4KAo2+c9Cq0rO+/kJ0DUSn2WMfC79KrHDBlAgMBAAECgYASIbG/ZRMZo0J/8qdPMnaq3SRi59YnEAyqkirZR4LLvCkvqIIrsyXu5wFHZkkSGG2xQdBDSKKo/WKEaN5r2MLekV9A/aYSRKZv03Rso63kPv9SW0Pwa8TJlAWEKV65sVrh2GPVMGZ3m4zPUnqMbbvziEpvgcdb4Iz0+CESOVHSHQJBANwK6NcQeTKIEYJfv0yQaGEgEs135nUUMWnEYid9YsjimUxySyu6NykS6fi6I5pZDmR1+7KGQBF9zhGh7OX+jGsCQQDb9rT5qph0B35D3oxOAhx6N7aj4BVznhwD1ePKEd9IcDKMWVUos5caSWjKpGHsaEav3lB+qYcKlHJ/+e9JC2pvAkEAkf7fDErOzzs+us0CZS9vQfoA37kM/GOAgZeeNGtaDsViRzmSLJoqHSOCf9go5TDvfrJVZNb0TWa2Qja4ssUYrwJAdgB1ufJw8t4KOLKtJjQvvskgq+1M1MefU9ds6jyIQj4ef/h0nO8rQqjbFMr21XJjaXmkSS79CQn2Gv2kBtWe9QJBAIdid+7UDsVOmxzAAXsSKRY1x4yIQ/GLaw0c2Ns2zfJQaBcb6c3QPq+IoI2p58j6nVyMUmGd2VcrUluHNkBW3/k=",
    "pubKey": "CAASogEwgZ8wDQYJKoZIhvcNAQEBBQADgY0AMIGJAoGBAL0RYzn+t3xJphz3dO9psZq7lKH1iMYL9tHifIkeRFFCJTi6I0hFeULMPLT+rMzcbrJN3B6BCU/1Y756ZHlZB0U4q88jQY/y68xMLhZ+XePrqKd0nUGW3+VE1XbRNsAOAb95tsuOS4KAo2+c9Cq0rO+/kJ0DUSn2WMfC79KrHDBlAgMBAAE="
  }

  const ipfs = await IPFS.create({
    repo: './ipfs',
    peerId: id,
    start: true,
    EXPERIMENTAL: {
      pubsub: true,
    },
    config: {
      Bootstrap: bootstrapers
    }
  })

  const peers = await ipfs.swarm.peers()
  console.log(`The node now has ${peers.length} peers.`)

  // Create IPFS instance
  //const ipfs = await IPFS.create();

  // Create OrbitDB instance
  const orbitDb = await OrbitDB.createInstance(ipfs);

  // Create docstore DB
  // const address = '/orbitdb/zdpuArV8iyuGAanQs37r61HnREMExY9KnBmp2ZcxGj5iecsxo/docstoreDB'
  const docstore = await orbitDb.docstore("docstoreDB");
  console.log("Successfully created docstore");

  await docstore.load()

  await docstore.events.on('replicated', () => console.log("Replicated Db"))

  app.set('docstore', docstore)
  app.set('ipfs', ipfs)


}

main()