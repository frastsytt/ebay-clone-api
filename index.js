const express = require('express')
const cors = require('cors')
const app = express()
const WebSocket = require('ws');
const { syncBuiltinESMExports } = require('module');
const fs = require('fs');
const http = require('http');
const https = require('https');
const privateKey  = fs.readFileSync(__dirname + '/localhost+2-key.pem', 'utf8');
const certificate = fs.readFileSync(__dirname + '/localhost+2.pem', 'utf8');
const { google } = require('googleapis');
const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require('./swagger.json');
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
const credentials = {key: privateKey, cert: certificate, requestCert: false, rejectUnauthorized: false};
const {OAuth2Client} = require('google-auth-library');
const googleOAuth2Client = new OAuth2Client('589975274851-iablj17qj6j9a8a6fqvotgvsd623aodp.apps.googleusercontent.com');
const httpServer = http.createServer(app);
const httpsServer = https.createServer(credentials, app);  
const { parse } = require("csv-parse");
app.use(cors()) // Avoid CORS errors in browsers
app.use(express.json()) // Populate req.body
app.use(express.static('public')) // Public dir for images
const jwt = require('jsonwebtoken');
const wss = new WebSocket.Server({ server: httpsServer })
const dotenv = require('dotenv');
dotenv.config();
const { type } = require('os');

function initLogs() {
    try {
        if (!fs.existsSync('eventlog.log')) {
            logline = `date@@@method@@@protocol@@@url@@@eventdata@@@remoteaddress\r\n`
            fs.appendFile('eventlog.log', logline, function (err) {
                if (err) throw err;
              });
        }
      } catch(err) {
        console.error(err)
    }
}
// initialize log file with a csv header if it does not exist
initLogs()
// logger function to be triggered every time the app receives a request
const logger = function (req, res, next) {
    let eventdata
    if (req.headers['authorization']){
        const authHeader = req.headers['authorization']
        const token = authHeader && authHeader.split(' ')[1]
        if (token == null){ eventdata = "N/A" }
        jwt.verify(token, process.env.TOKEN_SECRET, (err, user) => {
            eventdata = user.username
        })
    }
    logline = `${new Date().toISOString()}@@@${req.method}@@@${req.protocol}@@@${req.url}@@@${eventdata}@@@${req.socket?.remoteAddress}\r\n`
    fs.appendFile('eventlog.log', logline, function (err) {
        if (err) throw err;
      });
    next()
}
// use the logger middleware with app
app.use(logger)
app.get('/', function(req, res){
    res.sendFile(__dirname + '\\index.html')
});

function generateAccessToken(username) {
    // Return a signed JWT token that lasts 30 minutes
    return jwt.sign({username:username}, process.env.TOKEN_SECRET, { expiresIn: '1800s' });
}

function authenticateToken(req, res, next) {
    // Check if supplied token is not expired and generated by our server
    const authHeader = req.headers['authorization']
    const token = authHeader && authHeader.split(' ')[1]
    if (token == null) return res.status(401).send('Cannot authorize')
    jwt.verify(token, process.env.TOKEN_SECRET, (err, user) => {
        if (err) return res.status(403)
        req.user = user
        next()
    })
}

app.post('/createJWT', async (req, res) => {
    // Generate JWT token for specified username
    try {
        let user = users.find(user => user.username === req.body.username && user.password === req.body.password)
        if (!user) {
            res.status(500).send('Wrong username or password')
        }
        res.status(200).send({'JWTTOKEN':generateAccessToken(user.username), isAdmin: user.isAdmin})
    } catch (error) {
        console.error(error);
        res.status(500).send('Something went a-wucky :(')
    }
});

async function loadLogs() {
    let logs = []
    await new Promise((resolve, reject) => {
        fs.createReadStream("./eventlog.log")
            .pipe(parse({columns: true, delimiter: "@@@", from_line: 1}))
            .on("data", (row) => {
                logs.push(row)
            })
            .on("error", function (error) {
                reject(error)
            })
            .on("end", function () {
                resolve()
            });
    })
    return logs
}

async function fetchGoogle(token) {
    const ticket = await googleOAuth2Client.verifyIdToken({
        idToken: token,
        audience: '589975274851-iablj17qj6j9a8a6fqvotgvsd623aodp.apps.googleusercontent.com',
    });
    return ticket.getPayload();
}

app.post('/auth/google/callback', async function(req, res){
    try {
        le_response = await fetchGoogle(req.body.credential)
        console.log(le_response)
        let user = users.find((user) => user.email === le_response.email)
        console.log(user)
        if (!user) {
            user = {id: users.length + 1, email: le_response.email, username: le_response.name, password: "", isAdmin: false}
            users.push(user)
        }
        console.log(generateAccessToken(user.email))
        return res.status(200).send({JWTTOKEN: generateAccessToken(user.email), isAdmin: user.isAdmin})
    }
    catch {
        return res.status(400).send( {error: 'Google authentication unsuccessful'})
    }
})

let pets = [
    { id: 1, name: "Nurr", sex: "male", species: "cat", img: "https://localhost:443/img/cat-1.jpg", bookedBy: "" },
    { id: 2, name: "Bella", sex: "female", species: "cat", img: "https://localhost:443/img/cat-2.jpg", bookedBy: "" },
    { id: 3, name: "Bosse", sex: "male", species: "dog", img: "https://localhost:443/img/dog-1.jpg", bookedBy: "" }
]
const users = [
    { id: 1, email: 'admin.sytt@gmail.com', username: "Admin", password: "Password", isAdmin: true },
    { id: 2, email: 'user.sytt@gmail.com', username: "User", password: "Password", isAdmin: false },
    { id: 3, email: 'roomet.sutt@voco.ee', username: "Roomet", password: "Password", isAdmin: true },
    { id: 4, email: 'marcus.sytt@gmail.com', username: "Marcus", password: "Password", isAdmin: true },
    { id: 5, email: 'mirontsuk.steven@voco.ee', username: "Steven", password: "Password", isAdmin: true }
]

let sessions = [
    { id: 1, userId: 1 }
]

wss.on('connection', function connection(ws) {
    ws.on('message', function incoming(message) {
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
    console.log('Someone succesfully authenticated.')
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

app.post('/reservedpets', authenticateToken, (req, res) => {
    noReserve = pets.filter(reserved => reserved.bookedBy != "");
    res.send(noReserve)
})

app.patch('/pets/edit/:id', authenticateToken, (req, res) => {
    // Check that :id is a valid number
    if ((Number.isInteger(req.params.id) && req.params.id > 0)) {
        return res.status(400).send({ error: 'Invalid id' })
    }
    let petBeingEdited = getTime(req);
    // Check that time with given id exists
    if (!petBeingEdited) {
        return res.status(404).send({ error: 'Something went wrong! Pet not found' })
    }
    petBeingEdited.name = req.body.name
    petBeingEdited.sex = req.body.sex
    petBeingEdited.species = req.body.species
    if (req.body.img == null || !petBeingEdited.img) {
        petBeingEdited.img = `/${req.body.species}default.png`
    }
    else{
        petBeingEdited.img = req.body.img
    }

    petBeingEdited.bookedBy = req.body.bookedBy
    websocketPacket = { action: 'edit', content: petBeingEdited }
    wss.clients.forEach(client => client.send(JSON.stringify(websocketPacket)));
    res.status(200).send(petBeingEdited)
})

app.post('/pets', authenticateToken, (req, res) => {
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


app.delete('/pets/:id', authenticateToken, (req, res) => {
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

app.patch('/reservepet', authenticateToken, (req, res) => {
    if (!req.body.id) {
        return res.status(400).send({ error: 'You must log in to reserve a pet!' })
    }
    index = pets.findIndex(obj => obj.id == req.body.id)
    pets[index].bookedBy = req.user.username
    websocketPacket = { action: 'remove', content: req.body.id }
    wss.clients.forEach(client => client.send(JSON.stringify(websocketPacket)));
    res.status(200).end()
})

app.post('/ ', (req, res) => {
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

app.get('/refreshCredentials', authenticateToken, (req, res) => {
    const user = users.find((user) => user.email === req.user.username);
    console.log(req.user)
    res.status(200).send({username: req.user.username, isAdmin: user.isAdmin})
})

app.post('/register', (req, res) => {
    const user = users.find((user) => user.username === req.body.username);
    if (user) {
        return res.status(400).send({ error: 'A user with that username already exists.'})
    }
    // add +1 to user id and push it
    newUser = { id: users.at(-1).id + 1, email: req.body.email, username: req.body.username, password: req.body.password, isAdmin: false }
    users.push(newUser)
    res.status(200).send({'JWTTOKEN':generateAccessToken(newUser.username), isAdmin: newUser.isAdmin})
})

app.get('/logs', authenticateToken, async (req,res) => {
    var sendLogs = await loadLogs()
    return res.status(200).send(sendLogs)
})

app.delete('/sessions', (req, res) => {
    sessions = sessions.filter((session) => session.id === req.body.sessionId);
    res.status(200).end()
})

httpServer.listen(8080, () => {
    console.log(`HTTP API up at: http://localhost:8080`)
})

httpsServer.listen(443, () => {
    console.log(`HTTPS API up at: https://localhost:443`)
})