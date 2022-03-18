const express = require('express');
const cors = require('cors');
const app = express();
const path = require('path');


app.use(cors());        // Avoid CORS errors in browsers
app.use(express.json()) // Populate req.body

app.get('/', function (req, res) {
    res.sendFile(path.join(__dirname, '/index.html'));
});

const pets = [
    { id: 1, name: "Cizzbor", sex: "male", species: "cat" },
    { id: 2, name: "Woowo", sex: "female", species: "dog" },
    { id: 3, name: "Crazlinger", sex: "male", species: "cat" }
]

app.get('/pets', (req, res) => {
    res.send(pets)
})

app.get('/pets/:id', (req, res) => {
    if (typeof pets[req.params.id - 1] === 'undefined') {
        return res.status(404).send({ error: "Pet not found" })
    }
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