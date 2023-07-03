require('dotenv').config();
const express = require('express');
const cors = require('cors');
const app = express();
const bodyParser = require('body-parser');
const dns = require('dns');
const mongoose = require('mongoose');
const url = require('url');

// Mongo Stuff
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
const urlSchema = new mongoose.Schema({ url: String, shortname: String });
const Url = mongoose.model('Url', urlSchema);


// Basic Configuration
const port = process.env.PORT || 3000;
app.use(cors());
app.use(bodyParser.urlencoded({ extended: false }));
app.use('/public', express.static(`${process.cwd()}/public`));
app.get('/', function(req, res) {
  res.sendFile(process.cwd() + '/views/index.html');
});

function generateShortUrl(len = 7) {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  shortUrl = ''
  for (let i = 0; i < len; i++) {
    const rand = Math.floor(Math.random() * characters.length)
    shortUrl += characters.charAt(rand)
  }
  return shortUrl
}

function validateUrl(urlString) {
  console.log(`Validating "${urlString}"`);
  return new Promise(
    (resolve, reject) => {
      const { hostname } = url.parse(urlString);
      console.log(`Testing hostname "${hostname}"`);
      if (!hostname) {
        console.log("Invalid URL")
        reject("Invalid URL");
      } else {
        dns.lookup(hostname, (err, addr, family) => {
          if (err) {
            console.log("DNS lookup error");
            console.log(err);
            console.log(`address: ${addr} family: IPv${family}`);
            reject('Invalid URL');
          } else {
            console.log("DNS found URL");
            resolve();
          }
        })
      }
    })
}

app.post('/api/shorturl', (req, res, next) => {
  const { url } = req.body;

  validateUrl(url)
    .then(() => {
      req.valid_url = url;
      next();
    })
    .catch((err) => {
      res.status(400).json({ error: 'Invalid URL' });
    });
},
  (req, res) => {
    const { valid_url } = req;
    const short_url = generateShortUrl(7);
    const doc = { url: valid_url, shortname: short_url };
    const newUrl = new Url(doc);
    console.log(`Saving document ${doc} as object ${newUrl}`)
    newUrl.save();
    res.json({ original_url: valid_url, short_url: short_url });
  }
);

app.get('/api/shorturl/:shortname', async (req, res) => {
  const shortname = req.params.shortname;
  console.log(`Searching for ${shortname}`);
  const item = await Url.findOne({ shortname: shortname }).exec();
  if (item) {
    console.log(`Redirect found at ${item}`);
    res.redirect(item.url);
  } else {
    return res.status(404).json({ error: 'Name not found' });
  }
})


app.listen(port, function() {
  console.log(`Listening on port ${port}`);
});   
