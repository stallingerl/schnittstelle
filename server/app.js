import 'dotenv/config'
import { connect } from "./config/database.js"
connect()
import bcrypt from "bcrypt"
import express from "express"
import path from "path"
const __dirname = path.resolve('./');
import jsonwebtoken from "jsonwebtoken"
import auth from "./middleware/auth.js";
import favicon from 'serve-favicon'
import sha256 from 'sha256'
import { s } from "./doichain/sharedState.js"
import { createAndSendTransaction } from "doichainjs-lib"
import AES from 'crypto-js/aes.js'
const password = process.env.PASSWORD


const app = express();

app.use(express.json());

// importing user context
import { User } from "./model/user.js";

app.post("/trade", auth, async (req, res) => {
    var docstore = app.get('docstore')
    var ipfs = app.get('ipfs')

    try {
        // Get user input
        var { producer, consumer, energy, booking_id, mfa_id } = req.body;

        // Validate user input
        if (!(producer && consumer && energy && mfa_id)) {
            res.status(400).send("All input is required");
        }

        producer = AES.encrypt(producer.meter_id, password).toString();
        consumer = AES.encrypt(consumer.meter_id, password).toString();
        // check if user already exist
        // Validate if user exist in our database
        const oldMfa = await docstore.query((doc) => doc._id == mfa_id)

        if (oldMfa.length > 0) {
            console.log("Mfa already saved")
            // return ok
            res.status(200).send(mfa_id)
        } else {

            let stringMfa = JSON.stringify({ producer, consumer, energy, booking_id, mfa_id })
            console.log("string mfa: ", stringMfa)
            // Save Mfa to IPFS
            var cid = await ipfs.add(stringMfa)
            cid = cid.path
            await ipfs.pin.add(cid, true)

            let hash = sha256(stringMfa)

            // Save Mfa and Cid to Doichain
            let nameId = cid
            let nameValue = hash
            let amount
            let decryptedSeedPhrase = s.seed
            let destAddress = "dc1q33rhfm9zyxxa87sc3v5cqmjvzgrknmp48sty7m" //= s.wallet.addresses[0].address

            let our_wallet = s.wallet

            // Check if there are still enough Doi in the wallet for the name tx
            //await checkBalance(global.url);
            const txResponse = await createAndSendTransaction(decryptedSeedPhrase,
                s.password,
                amount,
                destAddress,
                our_wallet,
                nameId,
                nameValue,
                s.addrType)
            console.log("txResponse", txResponse)

            // Create user in our database
            await docstore.put({
                "producer": producer,
                "consumer": consumer,
                "energy": energy,
                "_id": mfa_id,
                "booking_id": booking_id,
                "cid": cid,
                "doi_hash": hash
            });

            console.log("OrbitData: ", {
                "producer": producer,
                "consumer": consumer,
                "energy": energy,
                "_id": mfa_id,
                "booking_id": booking_id,
                "cid": cid,
                "doi_hash": hash
            })

            console.log("Successfully saved: ", mfa_id)
            // return ok
            res.status(200).send(mfa_id)
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
            // Create user in our database
            return res.status(409).send("User Already Exists. Please Login");
        }

        //Encrypt user password
        let encryptedPassword = await bcrypt.hash(password, 10);

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
        res.status(200).send(token);
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
                process.env.TOKEN_KEY,
                {
                    expiresIn: "2h",
                }
            );

            // save user token
            user.token = token

            res.status(200).send(token);
        } else {
            res.status(400).send("Invalid Credentials");
        }
    } catch (err) {
        console.log(err);
    }
});


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


export default app;
