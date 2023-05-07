const express = require('express');
const axios = require('axios');
const { MongoClient, ServerApiVersion } = require('mongodb');
require('dotenv').config();

const port = process.env.PORT || 9000;
const app = express();

const uri = `mongodb+srv://surajitmaity12345:${process.env.MONGODB_PASSWORD}@cluster0.gia9dyn.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  setInterval(async () => {
    try {
      await client.connect();
      console.log("Connected to MongoDB");
      const dbName = "currency_converter";
      const collectionName = "currency_rate";
      const database = client.db(dbName);
      const collection = database.collection(collectionName);
      
      //get current rate from api
      const response = await axios({
        url: `https://api.api-ninjas.com/v1/convertcurrency?have=USD&want=INR&amount=1`,
        headers: {
          'X-Api-Key': process.env.API_KEY,
        },
      });
      const currentRate = response.data.new_amount;
      
      const currencyRateObj = await collection.findOne({ type: "USD_INR" });
      if (currencyRateObj.rateList.length >= 5) {
        currencyRateObj.rateList.shift();
      }
      currencyRateObj.rateList.push(currentRate);
      await collection.updateOne(
        { type: 'USD_INR' },
        {
          $set: { 'rateList': currencyRateObj.rateList, 'date': new Date() },
          $currentDate: { lastModified: true }
        }
      );
    } finally {
      // Ensures that the client will close when you finish/error
      await client.close();
      console.log("Disconnected");
    }
  }, 1000 * 60 * 60 * 24);
}
run().catch(console.dir);

app.use('/', async (req, res) => {
  try {
    await client.connect();
    console.log("Connected to MongoDB");
    const dbName = "currency_converter";
    const collectionName = "currency_rate";
    const database = client.db(dbName);
    const collection = database.collection(collectionName);
    const currencyRateObj = await collection.findOne({ type: "USD_INR" });
    res.json(currencyRateObj);
  } catch(error) {
    console.log(error);
  } finally {
    await client.close();
    console.log("Disconnected");
  }
});

app.listen(port, () => {
  console.log(`App listening on ${port}`);
});