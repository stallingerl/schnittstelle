import axios from 'axios'
import { getToken } from './login.js';
import { s } from "./sharedState.js";

export async function sendReport(foundMatchingMeterdata) {

    let resStatus = ""
    if (!s.token) {
        await getToken()
    }

    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${s.token}`,
    };

    resStatus = await postReport(foundMatchingMeterdata, headers)

    // If last token was expired, get new one and try again
    if (resStatus == 401) {
        await getToken()
        resStatus = await postReport(foundMatchingMeterdata, headers)
    }

    if (resStatus == 200) {
        console.log("Sent report to EnergieDock")
    } else {
        console.log("couldn't send report to EnergieDock")
    }

}

async function postReport(foundMatchingMeterdata, headers) {
    let resStatus
    try {
        await axios.post("https://backend.consolinno-test.nemospot.de/reports",
            {
                "booking_id": "5ce6682e3147b5fa02cf3efd",
                "mfa_id": "5ce6682e3147b5fa02cf3efe",
                "etus": [
                    {
                        "date": "2019-04-03T18:00:00",
                        "energy": 42.7
                    },
                    {
                        "date": "2019-04-03T18:15:00",
                        "energy": 85.7
                    }
                ]
            },
            { headers }
        )
            .then(res => {
                if (res.status == 200) {
                    console.log("Successfully sent report")
                    resStatus = 200
                    return resStatus
                } else {
                    console.log(res.error)
                }
            })

    } catch (error) {
        console.log(error)
        resStatus = error.response.status
        return resStatus
    }
}
