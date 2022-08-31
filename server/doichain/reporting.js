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

    if (resStatus == 201) {
        console.log("Sent report to EnergieDock")
    } else {
        console.log("couldn't send report to EnergieDock")
    }

}

async function postReport(foundMatchingMeterdata) {
    let resStatus
    const body = JSON.stringify(foundMatchingMeterdata[0])

    try {
        await axios({
            method: 'POST',
            headers: {"Access-Control-Allow-Headers" : "Content-Type,Authorization",
            "Access-Control-Allow-Methods": "GET,PUT,POST,DELETE",
            "Access-Control-Allow-Origin": "*",
            "Content-Type": "application/json",
            "Authorization": "Bearer " + s.token},
            data: body,
            url: "https://backend.consolinno-test.nemospot.de/reports/"
        }).then(res => {
                if (res.status == 201) {
                    console.log("Successfully sent report")
                    resStatus = 201
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
