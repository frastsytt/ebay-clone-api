const express = require('express')
const cors = require('cors')
const app = express()
const server = require('http').createServer(app);
const WebSocket = require('ws');
const port = 8080

app.use(cors())        // Avoid CORS errors in browsers
app.use(express.json()) // Populate req.body
app.use(express.static('public')) // Public dir for images

const wss = new WebSocket.Server({ server:server })

let pets = [

    { id: 1, name: "Nurr", sex: "male", species: "cat", img: "http://localhost:3000/public/img/cat-1.jpg", bookedBy: ""},
    { id: 2, name: "Bella", sex: "female", species: "cat", img: "http://localhost:3000/public/img/cat-2.jpg", bookedBy: ""},
    { id: 3, name: "Bosse", sex: "male", species: "dog", img: "http://localhost:3000/public/img/dog-1.jpg", bookedBy: ""}
]
const users = [
    {id: 1, username: "Admin", password: "Password", isAdmin: true},
    {id: 2, username: "User", password: "Password", isAdmin: false}
]

let sessions = [
    {id: 1, userId: 1}
]

wss.on('connection', function connection(ws) {
    console.log('A new client Connected!');
    //ws.send('Welcome New Client!');
  
    ws.on('message', function incoming(message) {
      console.log('received: %s', message);
  
      wss.clients.forEach(function each(client) {
        if (client !== ws && client.readyState === WebSocket.OPEN) {
          client.send(message);
        }
      });
      
    });
  });

function isValidFutureDate(req) {
    const date = new Date(req.body.day + ' ' + req.body.start);
    if (!date.getDate()) return false;
    return new Date() <= date;
}

function requireAdmin(req, res, next) {
    // Check that the sessionId is present
    if (!req.body.sessionId) {
        return res.status(400).send({error: 'You have to login'})
    }

    // Check that the sessionId is valid
    const sessionUser = sessions.find((session) => session.id === parseInt(req.body.sessionId));
    if (!sessionUser) {
        return res.status(401).send({error: 'Invalid sessionId'})
    }

    // Check that the sessionId in the sessions has user in it
    const user = users.findById(sessionUser.userId);
    if (!user) {
        return res.status(400).send({error: 'SessionId does not have an user associated with it'})
    }

    // Check that the user is an admin
    if (!user.isAdmin) {
        return res.status(400).send({error: 'Insufficient permissions'})
    }
    next()
}

function getTime(req) {
    return pets.findById(req.params.id);
}

Array.prototype.findById = function (value) {
    return this.findBy('id', parseInt(value))
}
Array.prototype.findBy = function (field, value) {
    return this.find(function (x) {
        return x[field] === value;
    })
}


// tagastab konkreetse kasutaja objekti tema hetkese sessioniId järgi.
function getUsernameBySession(session){
    return users.find(user => user.id === (sessions.find(id => id.id === session).userId))
}

app.get('/pets', (req, res) => {
    res.send(pets)
})

app.patch('/pets/edit/:id', requireAdmin, (req, res) => {
    // Check that :id is a valid number
    if ((Number.isInteger(req.params.id) && req.params.id > 0)) {
        return res.status(400).send({error: 'Invalid id'})
    }
    let time = getTime(req);
    // Check that time with given id exists
    if (!time) {
        return res.status(404).send({error: 'Time not found'})
    }

    // Change name, day, start, end and phone for given id if provided
    if (req.body.name) {
        // Check that name is valid
        if (!/^\w{2,}/.test(req.body.name)) {
            return res.status(400).send({error: 'Invalid name'})
        }
        time.bookedBy = req.body.name
    }

    // Check that start is valid
    if (!req.body.start || !/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(req.body.start)) {
        return res.status(400).send({error: 'Invalid start'})
    }
    time.start = req.body.start

    // Check that day is valid
    if (!req.body.day || !isValidFutureDate(req)) {
        return res.status(400).send({error: 'Invalid day'})
    }
    time.day = req.body.day

    // Check that end is valid
    if (!req.body.end || !/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(req.body.end)) {
        return res.status(400).send({error: 'Invalid end'})
    }
    // Check that end is bigger than start
    if (req.body.end < req.body.start) {
        return res.status(400).send({error: 'Invalid end'})
    }
    time.end = req.body.end
    if (req.body.phone) {
        // Check that phone is valid
        if (!req.body.phone || !/^\+?[1-9]\d{6,14}$/.test(req.body.phone)) {
            return res.status(400).send({error: 'Invalid phone'})
        }
        time.phone = req.body.phone
    }
    res.status(200).send(time)
})

app.post('/pets', requireAdmin, (req, res) => {
    // Add name, day, start, end and phone if provided
    let newTime = {id: 0, name: "", sex: "", species: "", img: "", bookedBy: ""}


    newTime.name = req.body.name
    newTime.sex = req.body.day
    newTime.species = req.body.start
    newTime.img = req.body.end

    const ids = pets.map(object => {
        return object.id;
    });
    const maxTimeId = Math.max(...ids);
    newTime['id'] = maxTimeId + 1
    pets.push(newTime)
    res.status(200).send(newTime)
})


app.delete('/pets/:id', requireAdmin, (req, res) => {
    // Check that :id is a valid number
    if ((Number.isInteger(req.params.id) && req.params.id > 0)) {
        return res.status(400).send({error: 'Invalid id'})
    }

    // Check that time with given id exists
    if (!pets.findById(req.params.id)) {
        return res.status(404).send({error: 'Time not found'})
    }
    pets = pets.filter((time) => time.id !== parseInt(req.params.id));
    res.status(200).end()
})

app.get('/pets/available', (req, res) => {
    let petsAvailable = [];
    let i = 0;
    while (i < pets.length) {
        if (!pets[i].bookedBy) {
            petsAvailable.push(pets[i]);
        }
        i++;
    }
    res.send(petsAvailable)
})

app.get('/pets/:id', (req, res) => {
    let time = getTime(req);
    if (!time) {
        return res.status(404).send({error: "Time not found"})
    }
    res.send(time)
})

app.patch('/pets/:id', (req, res) => {
    if (!req.body.id || !req.body.sessionId) {
        return res.status(400).send({error: 'You must log in to reserve a pet!'})
    }
    index = pets.findIndex(obj => obj.id == req.body.id)
    pets[index].bookedBy = getUsernameBySession(parseInt(req.body.sessionId)).username
    console.log(getUsernameBySession(parseInt(req.body.sessionId)))
    console.log(pets[index])
    wss.clients.forEach(client => client.send(JSON.stringify(req.body.id)));
    res.status(200).end()
})
app.post('/users', (req, res) => {
    if (!req.body.username || !req.body.password) {
        return res.status(400).send({error: 'One or all params are missing'})
    }

    let user = users.findBy('username', req.body.username);
    if (user) {
        return res.status(409).send({error: 'Conflict: The user already exists. '})
    }

    users.push({id: users.length + 1, username: req.body.username, password: req.body.password, isAdmin: false})

    user = users.findById(users.length);
    let newSession = {
        id: sessions.length + 1,
        userId: user.id
    }
    sessions.push(newSession)
    res.status(201).send({sessionId: sessions.length})
})
app.post('/sessions', (req, res) => {
    if (!req.body.username || !req.body.password) {
        return res.status(400).send({error: 'One or all params are missing'})
    }
    const user = users.find((user) => user.username === req.body.username && user.password === req.body.password);
    if (!user) {
        return res.status(401).send({error: 'Unauthorized: username or password is incorrect'})
    }
    let newSession = {
        id: sessions.length + 1,
        userId: user.id
    }
    sessions.push(newSession)
    res.status(201).send(
        {sessionId: sessions.length}
    )
})
app.delete('/sessions', (req, res) => {
    sessions = sessions.filter((session) => session.id === req.body.sessionId);
    res.status(200).end()
})

server.listen(8080, () => {
    console.log(`API up at: http://localhost:${port}`)
})