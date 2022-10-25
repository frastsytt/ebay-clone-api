#Loomade varjupaiga API/Veebileht projekt

### Kuidas projekti jooksutada

1. Kirjuta konsooli "npm install"
2. Kirjuta "node ." esimesse terminali
3. Kirjuta "npx serve" teisse terminali
4. Külasta brauseris kohaliku võrgu IP aadressiga veebilehte.

### Admin kontod
- Admin konto testimiseks: username: "Admin", password: "Password"

### HTTPS tugi
1. Lae alla selline tööriist nagu mkcert https://mkcert.org/
2. Käivita antud käsud admin õigustega terminalis:
    mkcert -install
    mkcert localhost 127.0.0.1 ::1
3. Aseta kaks loodud faili projekti juurkausta, ja kontrolli, et index.js viitab õigetele failidele nendel ridadel.
    const privateKey  = fs.readFileSync(__dirname + '/localhost+2-key.pem', 'utf8');
    const certificate = fs.readFileSync(__dirname + '/localhost+2.pem', 'utf8');
4. Katseta HTTPS toimimist pordil 443.
