import axios from 'axios'
import { getToken } from './login.js';
import { s } from "./sharedState.js";

export async function sendReport(foundMatchingMeterdata) {

    let resStatus = ""
    if (!s.token) {
        await getToken()
    }


    resStatus = await postReport(foundMatchingMeterdata)

    // If last token was expired, get new one and try again
    if (resStatus == 401) {
        await getToken()
        resStatus = await postReport(foundMatchingMeterdata)
    }

    if (resStatus == 200) {
        console.log("Sent report to EnergieDock")
    } else {
        console.log("couldn't send report to EnergieDock")
    }

}

async function postReport(foundMatchingMeterdata) {
    let resStatus
    const body = {
        "booking_id": "627bcf715cba23888483f879",
        "mfa_id": "627bcf715cba23888483f878",
        "etus": [
            {
                "date": "2022-05-12T00:00:00+00:00",
                "energy": 10
            },
            {
                "date": "2022-05-12T00:15:00+00:00",
                "energy": 10
            }
        ]
    }

    try {
        await axios({
            method: 'POST',
            headers: {"Access-Control-Allow-Headers" : "Content-Type,Authorization",
            "Access-Control-Allow-Methods": "GET,PUT,POST,DELETE",
            "Access-Control-Allow-Origin": "*",
            "Content-Type": "application/json",
            "Authorization": "Bearer " + s.token},
            data: {
                "booking_id": "627bcf715cba23888483f879",
                "mfa_id": "627bcf715cba23888483f878",
                "etus": [
                    {
                        "date": "2022-05-12T00:00:00+00:00",
                        "energy": 10
                    },
                    {
                        "date": "2022-05-12T00:15:00+00:00",
                        "energy": 10
                    }
                ]
            },
            url: "https://backend.consolinno-test.nemospot.de/reports"
        }).then(res => {
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
