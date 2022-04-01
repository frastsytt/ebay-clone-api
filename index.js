const express = require('express');
const cors = require('cors');
const app = express();
const path = require('path');
var crypto = require('crypto');
const fs = require('fs');
const cookieparser = require('cookie-parser');


app.use(cors());        // Avoid CORS errors in browsers
app.use(express.json()) // Populate req.body

app.use(express.static('public'))

app.get('/', function (req, res) {

    console.log(req)
    res.sendFile(path.join(__dirname, '/index.html'));
});

var generate_key = function() {
    // 16 bytes is likely to be more than enough,
    // but you may tweak it to your needs
    return crypto.randomBytes(16).toString('base64');
};

const pets = [
    { id: 1, name: "Cizzbor", sex: "male", species: "cat", img: "http://localhost:8080/img/cat-1.jpg"},
    { id: 2, name: "Woowo", sex: "female", species: "dog" , img: "http://localhost:8080/img/dog-1.jpg"},
    { id: 3, name: "Crazlinger", sex: "male", species: "cat", img: "http://localhost:8080/img/cat-2.jpg"},
    { id: 4, name: "Hugh Mungus", sex: "male", species: "dog"}
]

const users = [
    { id: 0, username: "root", password: "admin"}
]

app.get('/login', (req, res) => {
    const result = users.find( ({ username }) => username === req.query.username);
    console.log(result)
    console.log(req.query.password)
    console.log(req.query.username)
    if (!result || !(result.password === req.query.password)) {
        return res.status(401).json({error: 'Invalid username/password'})
    }
    console.log(result.username)
    console.log(result.password)
    var sess_id = generate_key()
    console.log(sess_id)
    let data = ""
    fs.writeFile(`.\\sessions\\${sess_id}`, data, (err) => {
        if (err)
            console.log(err);
    });
    const domain = 'localhost';
    res.cookie('access_token',sess_id, { domain: domain, path: '/', expires: new Date(Date.now() + 9000000), httpOnly: false });
    console.log(req.headers.cookie)
    res.sendFile(path.join(__dirname, '/index.html'));
})

app.get('/pets', (req, res) => {
    pets.forEach(function(pet){
        console.log(pet)
        if (pet.img === undefined || pet.img === '') {
            pets[pet.id - 1].img = `http://localhost:8080/img/${pets[pet.id - 1].species}default.png`
        }
    });
    res.send(pets)
})

app.get('/pets/:id', (req, res) => {
    if (typeof pets[req.params.id - 1] === 'undefined') {
        return res.status(404).send({ error: "Pet not found" })
    }
    if (!req.params.id) {
        return res.status(400).send({ error: 'One or all params are missing' })
    }
    if (pets[req.params.id - 1].img === undefined || pets[req.params.id - 1].img === '') {
        pets[req.params.id - 1].img = `http://localhost:8080/img/${pets[req.params.id - 1].species}default.png`
    }
    console.log(pets[req.params.id - 1])
    res.send(pets[req.params.id - 1])
})

app.post('/pets', (req, res) => {
    if (!req.body.name || !req.body.price) {
        return res.status(400).send({ error: 'One or all params are missing' })
    }
    let newPet = {
        id: pets.length + 1,
        price: req.body.price,
        name: req.body.name
    }
    pets.push(newPet)
    res.status(201).location('localhost:8080/pets/' + (pets.length - 1)).send(
        newPet
    )
})

app.listen(8080, () => {
    console.log(`API up at: http://localhost:8080`)
})