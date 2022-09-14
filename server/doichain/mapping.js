import { createRequire } from "module"; // Bring in the ability to create the 'require' method
const require = createRequire(import.meta.url); // construct the require method
const CryptoJS = require("crypto-js");
import AES from 'crypto-js/aes.js'

export async function mapping(docstore) {

    let foundMatchingMeterData = []

    // query meter data of now -30 mins because meterdata is sent every 15 mins + 15 mins buffer to receive and sync meterData in DB
    let timeNow = new Date().getTime()- 1800000
    let timeBeforeInterval = timeNow - 1800000

    console.log("timeNow: ", new Date(timeNow).toLocaleString())
    console.log("timeBeforeIntervall: ", new Date(timeBeforeInterval).toLocaleString())

    /*
    let timeNow = 1660914900000 //new Date().getTime() 
    let timeBeforeInterval = 1660910400000 //timeNow - 3600000
    */

    // find all booking data for last hour 
    let bookingData = []

    await docstore.query((e) => {
        if (!e._id.startsWith("Qm")) {
            let endZeit = new Date(e.energy[e.energy.length - 1].date).getTime()

            // liegt die letzte Energiebuchung innerhalb der vorletzen Stunde
            if (endZeit >= timeBeforeInterval && endZeit <= timeNow) {
                bookingData.push(e)
            }
        }
    })

    console.log("booking data: ", bookingData)

    // find all matching meterData for bookingData
    for (let i = 0; i < bookingData.length; i++) {
        let e = bookingData[i]
        console.log(e)
        console.log("e.consumer ", e.consumer)
        let decryptedHex = CryptoJS.AES.decrypt(e.consumer, "NeverGuessing");
        let consumerMeterId = decryptedHex.toString(CryptoJS.enc.Utf8)
        console.log("consumerMeterId, ", consumerMeterId)

        let etus = []

        let lastETU = e.energy[e.energy.length - 1]

        let bookingTime0 = new Date(e.energy[0].date).getTime()
        let bookingTime1 = new Date(e.energy[e.energy.length - 1].date).getTime()

        console.log("bookingTime0 ", new Date(bookingTime0).toLocaleString())
        console.log("bookingTime1 ", new Date(bookingTime1).toLocaleString())

        if (lastETU.energy_kwh > 0) {
            // check for meter data 15 mins after the last booking data in ETU
            bookingTime1 = new Date(lastETU.date).getTime() + 900000
        } else {
            bookingTime1 = new Date(lastETU.date).getTime()
        }

        bookingTime0 = roundToNearest15Mins(bookingTime0)
        bookingTime1 = roundToNearest15Mins(bookingTime1)

        // Gebuchter Energiebedarf
        let totalBookedEnergy = 0
        for (let i = 0; i < e.energy.length; i++) {
            totalBookedEnergy += e.energy[i].energy_kwh
        }

        // first find meterId for consumer at the beginning of booking data and meter data after 15mins.
        let meterData = []
        let blockChainIPFSProof = []

        // find matching meterData for etus in Booking Data
        await docstore.query((doc) => {
            if (doc.meterId !== undefined) {
                let decryptedHex1 = AES.decrypt(doc.meterId, process.env.PASSWORD).toString();
                let decodedMeterId1 = new Buffer(decryptedHex1, "hex").toString()
                let roundedDocTime = roundToNearest15Mins(doc.timestamp)
                if (decodedMeterId1 == consumerMeterId && roundedDocTime >= bookingTime0 && roundedDocTime <= bookingTime1) {
                    doc.timestamp = new Date(doc.timestamp)
                    doc.meterId = decodedMeterId1
                    meterData.push(doc)
                    if (doc.hash !== undefined && doc.cidList !== undefined) {
                        blockChainIPFSProof.push({
                            "timestamp": doc.timestamp.getTime(),
                            "meterId": doc.meterId,
                            "doichain_hash": doc.hash,
                            "cidList": doc.cidList,
                            "cid": doc._id
                        })
                    }
                }
            }
        })
        console.log("BlockChain Proof: ", JSON.stringify(blockChainIPFSProof))

        console.log("meter data: ", meterData)

        let total_consumed = 0
        // add up consumed meter data
        for (let i = 0; i < meterData.length; i++) {
            total_consumed += meterData[i].total_consumed
        }


        // calculate difference in meter data and compare to booked energy
        let difference = total_consumed
        if (difference > totalBookedEnergy) {
            difference = Math.round(difference)
            var date = new Date(new Date(bookingTime0));
            date = (date.getFullYear() + "-" + ('0' + (date.getMonth() + 1)).slice(-2) + "-" + ('0' + (date.getDate() + 1)).slice(-2)  + "T" + date.getUTCHours().toString().padStart(2, '0') + ":" + (date.getMinutes() < 10 ? '0' : '') + date.getMinutes() + ":00");
            etus.push({
                "date": date,
                "energy": totalBookedEnergy
            })

            var date1 = new Date(new Date(bookingTime0 + 900000))
            date1 = (date1.getFullYear() + "-" + ('0' + (date1.getMonth() + 1)).slice(-2) + "-" + ('0' + (date1.getDate() + 1)).slice(-2)  + "T" + date1.getUTCHours().toString().padStart(2, '0') + ":" + (date1.getMinutes() < 10 ? '0' : '') + date1.getMinutes() + ":00");
            etus.push({
                "date": date1,
                "energy": 0
            })
        }

        if (etus.length > 1) {
            foundMatchingMeterData.push({
                "booking_id": e.booking_id,
                "mfa_id": e._id,
                "etus": etus
            })
        } else {
            console.log("Not consumed enough")
            console.log("required: ", totalBookedEnergy)
            console.log("consumed: ", total_consumed)
        }
    }
    console.log("matching Meter Data: ", foundMatchingMeterData)

    return foundMatchingMeterData
}



function roundToNearest15Mins(originalTime) {

    let date = new Date(originalTime)
    let minutesToRound = 15

    let hours = date.getHours()
    let minutes = date.getMinutes()

    hours = parseInt(hours)
    minutes = parseInt(minutes)

    // convert hours and minutes to time in minutes

    let time = (hours * 60) + minutes;


    let rounded = Math.round(time / minutesToRound) * minutesToRound
    let rHr = '' + Math.floor(rounded / 60)
    let rMin = '' + rounded % 60


    date.setHours(rHr.padStart(2, '0'))
    date.setMinutes(rMin.padStart(2, '0'))
    date.setSeconds(0)
    date.setMilliseconds(0)


    let timestamp = date.getTime()
    return timestamp
}