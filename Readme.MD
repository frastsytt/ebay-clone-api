#Loomade varjupaiga API/Veebileht projekt

### HTTPS tugi
1. Lae alla selline tööriist nagu mkcert https://mkcert.org/ (selle jaoks saab kasutada chocolatey't: chocolatey install mkcert)
2. Käivita antud käsud admin õigustega terminalis:
    mkcert -install,
    mkcert localhost 127.0.0.1 ::1
3. Aseta kaks loodud faili projekti juurkausta, ja kontrolli, et index.js viitab õigetele failidele nendel ridadel.
    const privateKey  = fs.readFileSync(__dirname + '/localhost+2-key.pem', 'utf8');
    const certificate = fs.readFileSync(__dirname + '/localhost+2.pem', 'utf8');
4. Katseta HTTPS toimimist pordil 443.

### .env konfiguratsioonifaili loomine
1. Loo projekti fail nimega ".env"
2. Pane faili sisse rida "TOKEN_SECRET=randomstring"

### Kuidas projekti jooksutada

1. Kirjuta konsooli "npm install"
2. Kirjuta "node ." esimesse terminali. Selle terminaliga serveerime back-endi.
3. Kirjuta "npx serve" teisse terminali. Selle terminalige serveerime front-endi.
4. Külasta ühte aadressi, mis front-endi terminal sulle kuvas.

### Admin kontod
- Admin konto testimiseks: username: "Admin", password: "Password"