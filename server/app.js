require("dotenv").config();
require("./config/database").connect();
const bcrypt = require("bcrypt")
const express = require("express");
const path = require("path")
const jsonwebtoken = require("jsonwebtoken")
const auth = require("./middleware/auth");
var favicon = require('serve-favicon')

const app = express();

app.use(express.json());

// importing user context
const User = require("./model/user");

// Have Node serve the files for our built React app
//app.use(express.static(path.resolve(__dirname, '../client/build')));
let x = path.join(__dirname, "../client/build")
app.use(express.static(path.join(__dirname, "../client/build")))

let y = path.join(__dirname, "../client/build/index.html")

app.get(favicon(path.join(__dirname, '../client/public', 'favicon.ico')))

app.get("/table", auth, async (req, res) => {

    var docstore = app.get('docstore')

    // Set variables
    const amount = 3; // Amout of data to put

    console.log("Starting to put data into Docstore DB...");
    console.log('This is middleware', req.originalUrl);

    // Loop for our amount of data to put
    /*for (let i = 0; i < amount; i++) {
        // Pseudo ID from timestamp + index should be enough for testing
        let pseudoId = new Date().getTime();

        let timestamp = new Date().getTime();

        // Random KWh values between 1.000 and 100.000
        let kwhValue = Math.floor(Math.random() * 100000) + 1000;
        await docstore.put({ _id: pseudoId, timestamp: timestamp, energy: kwhValue, pin: true })
    }*/

    var myMfas = await docstore.query((e) => e._id > 5)
    console.log("My Mfas", myMfas)
    res.json(myMfas)
    console.log("sent response")

});

app.get("/trade", auth, async (req, res) => {
    var docstore = app.get('docstore')

    try {
        // Get user input
        const { producer, consumer, energy, booking_id, mfa_id } = req.body;

        // Validate user input
        if (!(producer && consumer && energy && mfa_id)) {
            res.status(400).send("All input is required");
        }
        // check if user already exist
        // Validate if user exist in our database
        const oldMfa = await docstore.query((doc) => doc._id == mfa_id)

        if (oldMfa.length > 0) {
            console.log("Mfa already saved")
            // return ok
            res.status(200).send("OK saved Trade to Blockchain")
        } else {
            //Encrypt meter ids
            encryptedProdMeterId = await bcrypt.hash(producer.meter_id, 10);
            encryptedConsMeterId = await bcrypt.hash(consumer.meter_id, 10);

            // Create user in our database
            await docstore.put({
                "producer": encryptedProdMeterId,
                "consumer": encryptedConsMeterId,
                "date": energy.date, // sanitize: convert email to lowercase
                "energy": energy.energy_kwh,
                "_id": mfa_id
            });

            console.log("Successfully saved: ", mfa_id)
            // return ok
            res.status(200).send("OK saved Trade to Blockchain")
        }
    } catch (err) {
        console.log(err);
    }
})

// Register
app.post("/register", async (req, res) => {

    // Our register logic starts here
    try {

        // Get user input
        const { first_name, last_name, email, password } = req.body;

        // Validate user input
        if (!(email && password && first_name && last_name)) {
            res.status(400).send("All input is required");
        }

        // check if user already exist
        // Validate if user exist in our database
        const oldUser = await User.findOne({ email });

        if (oldUser) {
            return res.status(409).send("User Already Exist. Please Login");
        }

        //Encrypt user password
        encryptedPassword = await bcrypt.hash(password, 10);

        // Create user in our database
        const user = await User.create({
            first_name,
            last_name,
            email: email.toLowerCase(), // sanitize: convert email to lowercase
            password: encryptedPassword,
        });

        // Create token
        const token = jsonwebtoken.sign(
            { user_id: user._id, email },
            process.env.TOKEN_KEY,
            {
                expiresIn: "2h",
            }
        );
        // save user token
        user.token = token;

        // return new user
        res.status(201).json(user);
    } catch (err) {
        console.log(err);
    }
});

// Login
app.post("/login", async (req, res) => {

    // Our login logic starts here
    try {
        // Get user input
        const { email, password } = req.body;

        // Validate user input
        if (!(email && password)) {
            res.status(400).send("All input is required");
        }
        // Validate if user exist in our database
        const user = await User.findOne({ email });

        if (user && (await bcrypt.compare(password, user.password))) {
            // Create token
            const token = jsonwebtoken.sign(
                { user_id: user._id, email },
                process.env.TOKEN_KEY
                /* {
                     expiresIn: "2h",
                 } */
            );

            // save user token
            user.token = token;

            // user
            res.status(200).json(user);
        } else {
            res.status(400).send("Invalid Credentials");
        }
    } catch (err) {
        console.log(err);
    }
});

app.get("*", (req, res) => {
    res.sendFile(
        path.join(__dirname, "../client/build/index.html")
    );

    // Register
    app.post("/register", async (req, res) => {

        // Our register logic starts here
        try {

            // Get user input
            const { first_name, last_name, email, password } = req.body;

            // Validate user input
            if (!(email && password && first_name && last_name)) {
                res.status(400).send("All input is required");
            }

            // check if user already exist
            // Validate if user exist in our database
            const oldUser = await User.findOne({ email });

            if (oldUser) {
                return res.status(409).send("User Already Exist. Please Login");
            }

            //Encrypt user password
            encryptedPassword = await bcrypt.hash(password, 10);

            // Create user in our database
            const user = await User.create({
                first_name,
                last_name,
                email: email.toLowerCase(), // sanitize: convert email to lowercase
                password: encryptedPassword,
            });

            // Create token
            const token = jsonwebtoken.sign(
                { user_id: user._id, email },
                process.env.TOKEN_KEY,
                {
                    expiresIn: "2h",
                }
            );
            // save user token
            user.token = token;

            // return new user
            res.status(201).json(user);
        } catch (err) {
            console.log(err);
        }
    });

})

module.exports = app;