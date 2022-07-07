import axios from 'axios'
import { s } from "./sharedState.js";

export async function getToken() {

    try {
        await axios.post("https://backend.consolinno-test.nemospot.de/sessions/login",
            {
                "email": process.env.ENERGIE_EMAIL,
                "password": process.env.ENERGIE_PASSWORD
            }
        )
            .then(res => {
                if (res.status == 200) {
                    console.log("Successfully logged in")
                    s.token = res.data
                } else {
                    console.log(res.error)
                }
            })

    } catch (error) {
        console.log(error)
    }

}