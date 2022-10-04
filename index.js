const express = require('express')
const cors = require('cors')
const app = express()
const server = require('http').createServer(app);
const WebSocket = require('ws');
const port = 8080

app.use(cors())        // Avoid CORS errors in browsers
app.use(express.json()) // Populate req.body
app.use(express.static('public')) // Public dir for images

const wss = new WebSocket.Server({ server: server })

let pets = [

    { id: 1, name: "Nurr", sex: "male", species: "cat", img: "http://localhost:3000/public/img/cat-1.jpg", bookedBy: "" },
    { id: 2, name: "Bella", sex: "female", species: "cat", img: "http://localhost:3000/public/img/cat-2.jpg", bookedBy: "" },
    { id: 3, name: "Bosse", sex: "male", species: "dog", img: "http://localhost:3000/public/img/dog-1.jpg", bookedBy: "" }
]
const users = [
    { id: 1, username: "Admin", password: "Password", isAdmin: true },
    { id: 2, username: "User", password: "Password", isAdmin: false },
    { id: 3, username: "Roomet", password: "Password", isAdmin: true },
    { id: 4, username: "Marcus", password: "Password", isAdmin: true },
    { id: 5, username: "Steven", password: "Password", isAdmin: true }
]

let sessions = [
    { id: 1, userId: 1 }
]

wss.on('connection', function connection(ws) {
    console.log('person connected')
    ws.on('message', function incoming(message) {
        console.log('received: %s', message);

        wss.clients.forEach(function each(client) {
            if (client !== ws && client.readyState === WebSocket.OPEN) {
                client.send(message);
            }
        });

    });
});

function requireAdmin(req, res, next) {
    // Check that the sessionId is present
    if (!req.body.sessionId) {
        return res.status(400).send({ error: 'You have to login' })
    }

    // Check that the sessionId is valid
    const sessionUser = sessions.find((session) => session.id === parseInt(req.body.sessionId));
    if (!sessionUser) {
        return res.status(401).send({ error: 'Invalid sessionId' })
    }

    // Check that the sessionId in the sessions has user in it
    const user = users.findById(sessionUser.userId);
    if (!user) {
        return res.status(400).send({ error: 'SessionId does not have an user associated with it' })
    }

    // Check that the user is an admin
    if (!user.isAdmin) {
        return res.status(400).send({ error: 'Insufficient permissions' })
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
function getUsernameBySession(session) {
    return users.find(user => user.id === (sessions.find(id => id.id === session).userId))
}

app.post('/reservedpets', requireAdmin, (req, res) => {
    noReserve = pets.filter(reserved => reserved.bookedBy != "");
    res.send(noReserve)
})

app.patch('/pets/edit/:id', requireAdmin, (req, res) => {
    // Check that :id is a valid number
    if ((Number.isInteger(req.params.id) && req.params.id > 0)) {
        return res.status(400).send({ error: 'Invalid id' })
    }
    console.log(getTime(req))
    let petBeingEdited = getTime(req);
    // Check that time with given id exists
    if (!petBeingEdited) {
        return res.status(404).send({ error: 'Something went wrong! Pet not found' })
    }
    petBeingEdited.name = req.body.name
    petBeingEdited.sex = req.body.sex
    petBeingEdited.species = req.body.species
    if (req.body.img == null || !petBeingEdited.img) {
        petBeingEdited.img = `http://localhost:3000/public/img/${req.body.species}default.png`
    }
    else{
        petBeingEdited.img = req.body.img
    }

    petBeingEdited.bookedBy = req.body.bookedBy
    websocketPacket = { action: 'edit', content: petBeingEdited }
    console.log(websocketPacket)
    wss.clients.forEach(client => client.send(JSON.stringify(websocketPacket)));
    res.status(200).send(petBeingEdited)
})

app.post('/pets', requireAdmin, (req, res) => {
    // Add name, day, start, end and phone if provided
    let newPet = { id: 0, name: "", sex: "", species: "", img: "", bookedBy: "" }


    newPet.name = req.body.name
    newPet.sex = req.body.sex
    newPet.species = req.body.species
    newPet.img = req.body.img

    const ids = pets.map(object => {
        return object.id;
    });

    const maxTimeId = Math.max(...ids);
    newPet['id'] = maxTimeId + 1
    pets.push(newPet)
    // add a header-esque field to packet that we will send
    websocketPacket = { action: 'add', content: newPet }
    wss.clients.forEach(client => client.send(JSON.stringify(websocketPacket)));
    res.status(200).send(newPet)
})


app.delete('/pets/:id', requireAdmin, (req, res) => {
    // Check that :id is a valid number
    if ((Number.isInteger(req.params.id) && req.params.id > 0)) {
        return res.status(400).send({ error: 'Invalid id' })
    }

    // Check that time with given id exists
    if (!pets.findById(req.params.id)) {
        return res.status(404).send({ error: 'Time not found' })
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
        return res.status(404).send({ error: "Time not found" })
    }
    res.send(time)
})

app.patch('/pets/:id', (req, res) => {
    if (!req.body.id || !req.body.sessionId) {
        return res.status(400).send({ error: 'You must log in to reserve a pet!' })
    }
    index = pets.findIndex(obj => obj.id == req.body.id)
    pets[index].bookedBy = getUsernameBySession(parseInt(req.body.sessionId)).username
    console.log(getUsernameBySession(parseInt(req.body.sessionId)))
    console.log(pets[index])
    websocketPacket = { action: 'remove', content: req.body.id }
    wss.clients.forEach(client => client.send(JSON.stringify(websocketPacket)));
    res.status(200).end()
})
app.post('/users', (req, res) => {
    if (!req.body.username || !req.body.password) {
        return res.status(400).send({ error: 'One or all params are missing' })
    }

    let user = users.findBy('username', req.body.username);
    if (user) {
        return res.status(409).send({ error: 'Conflict: The user already exists. ' })
    }

    users.push({ id: users.length + 1, username: req.body.username, password: req.body.password, isAdmin: false })

    user = users.findById(users.length);
    let newSession = {
        id: sessions.length + 1,
        userId: user.id
    }
    sessions.push(newSession)
    res.status(201).send({ sessionId: sessions.length })
})
app.post('/sessions', (req, res) => {
    if (!req.body.username || !req.body.password) {
        return res.status(400).send({ error: 'One or all params are missing' })
    }
    const user = users.find((user) => user.username === req.body.username && user.password === req.body.password);
    if (!user) {
        return res.status(401).send({ error: 'Unauthorized: username or password is incorrect' })
    }
    let newSession = {
        id: sessions.length + 1,
        userId: user.id
    }
    sessions.push(newSession)
    res.status(201).send(
        {
            sessionId: sessions.length,
            isAdmin: user.isAdmin
        }
    )
})
app.delete('/sessions', (req, res) => {
    sessions = sessions.filter((session) => session.id === req.body.sessionId);
    res.status(200).end()
})

server.listen(8080, () => {
    console.log(`API up at: http://localhost:${port}`)
})