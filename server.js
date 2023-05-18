const express = require('express');
const axios = require('axios');
const { MongoClient, ServerApiVersion } = require('mongodb');
var cors = require('cors');
require('dotenv').config();

const port = process.env.PORT || 9000;
const app = express();

app.use(cors());

const uri = `mongodb+srv://surajitmaity12345:${process.env.MONGODB_PASSWORD}@cluster0.gia9dyn.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

function getCurrentDate() {
  const currentDate = new Date();
  const date = currentDate.getDate();
  const month = currentDate.getMonth() + 1;
  const year = currentDate.getFullYear();
  return `${date}-${month}-${year}`;
}

app.use('/api', async (req, res) => {
  try {
    await client.connect();
    console.log("Connected to MongoDB");
    const dbName = "currency_converter";
    const collectionName = "currency_rate";
    const database = client.db(dbName);
    const collection = database.collection(collectionName);
    const currencyRateObj = await collection.findOne({ type: `${req.query.fromCurrency}_${req.query.toCurrency}` });
    res.json(currencyRateObj);
  } catch(error) {
    console.log(error);
  } finally {
    await client.close();
    console.log("Disconnected");
  }
});

app.use('/updateDB', async (req, res) => {
  try {
    await client.connect();
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
    currencyRateObj.rateList.push({
      'rate': currentRate,
      'date': getCurrentDate(),
    });
    await collection.updateOne(
      { type: 'USD_INR' },
      {
        $set: { 'rateList': currencyRateObj.rateList },
        $currentDate: { lastModified: true }
      }
      );
      res.send(`DB update successful. Updated on ${new Date()}.`);
  } catch(error) {
    console.log(error);
  } finally {
    // Ensures that the client will close when you finish/error
    await client.close();
  }
});

app.listen(port, () => {
  console.log(`App listening on ${port}`);
});