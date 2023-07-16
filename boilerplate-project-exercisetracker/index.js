require('dotenv').config()
const express = require('express')
const app = express()
const cors = require('cors')
const mongoose = require('mongoose');

// Mongo Stuff
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });

const userSchema = new mongoose.Schema({
  username: String
});
const exerciseSchema = new mongoose.Schema({
  username: String,
  description: String,
  duration: Number,
  date: Date
});
const logSchema = new mongoose.Schema({
  username: String,
  count: Number,
  log: [exerciseSchema]
});

const User = mongoose.model('User', userSchema);
const Exercise = mongoose.model('Exercise', exerciseSchema);
const Log = mongoose.model('Log', logSchema);



app.use(cors())
app.use(express.urlencoded({ extended: false }));
app.use(express.json())
app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});


// GET user returns [{username, _id}]
app.get('/api/users', (req, res) => {
  User
    .find({}, '_id username')
    .then(users => {
      const userArray = users.map(user => ({
        username: user.username,
        _id: user._id
      }));
      res.send(userArray);
    })
    .catch(err => {
      console.error(err);
      res.status(500).send('Error retrieving users');
    });
});

// POST user returns _id from save for username
app.post('/api/users', (req, res) => {
  const { username } = req.body;
  console.log(`User submitted: ${username}`);

  if (!username) {
    res.status(400).send('Missing username');
    return;
  };

  console.log(`Saving user "${username}"`)
  const newUser = new User({ username });
  newUser.save()
    .then(user => {
      res.json({ username: user.username, _id: user._id });
    })
    .catch(err => {
      console.error(err);
      res.status(500).send('Error saving user');
    });
});

app.get('/api/users/:_id/logs', async (req, res) => {
  const { _id } = req.params;
  const { from, to, limit } = req.query;
  try {
    const user = await User.findOne({ _id });
    if (!user) {
        res.status(404).send("User not found");
        return;
    }
  
    let query = {
        username: user.username
    }
  
    if (from) {
        query.date = { $gte: new Date(from) };
    }
  
    if (to) {
        query.date = { ...query.date, $lte: new Date(to) };
    }
  
    const exercises = await Exercise.find(query)
        .select("description duration date")
        .limit(parseInt(limit))
        .exec();
    
    const count = exercises.length;
    const log = exercises.map(exercise => ({
        description: exercise.description,
        duration: exercise.duration,
        date: exercise.date.toDateString()
    }));
            
    const data = {
      _id: user._id,
      username: user.username,
      count: count,
      log: log
    };
    res.json(data);
    
  } catch (err) {
      console.error(err);
      res.status(500).send("Error getting exercises");
  }
});


app.post('/api/users/:_id/exercises', (req, res) => {
  const { _id } = req.params;
  const { description, duration, date } = req.body;
  console.log(`Desc: ${description}, Dur: ${duration}, Date: ${date}`);
  User.findOne({ _id })
    .then(user => {
      if (!user) {
        res.status(404).send("User not found");
        return;
      }

      const workout = new Exercise({
        username: user.username,
        description,
        duration,
        date: date ? new Date(date) : new Date()
      })

      workout.save()
        .then(data => {
          res.json({
            username: user.username,
            _id: user._id,
            description: data.description,
            duration: data.duration,
            date: data.date.toDateString()
          });
        })
        .catch(err => {
          console.error(err);
          res.status(500).send("Error saving workout");
        });
    })
    .catch(err => {
      console.error(err)
      res.status(500).send("Error finding user");
    });
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
