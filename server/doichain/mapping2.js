import { s } from "./sharedState.js";
import AES from 'crypto-js/aes.js'

export async function mapping(docstore) {

    let foundMatchingMeterData = []

    // query meter data of now -30 mins because meterdata is sent every 15 mins + 15 mins buffer to receive and sync meterData in DB
    let timeNow = new Date().getTime() - 1800000;
    let timeBeforeInterval = timeNow - 3600000

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

    // find all matching meterData for bookingData
    for (let i = 0; i < bookingData.length; i++) {
        let e = bookingData[i]
        let consumerMeterId = (AES.decrypt(e.consumer, process.env.PASSWORD))

        let etus = []
        for (let i = 0; i < e.energy.length; i++) {
            let bookingTime0 = new Date(e.energy[i].date).getTime()
            let bookingTime1 = bookingTime0 + 900000
            bookingObject.push({ [bookingTime0]: e.energy[i].kwh })

            // first find meterId for consumer at the beginning of booking data and meter data after 15mins.
            let meterData0 = await docstore.query((doc) => doc.meter_id == consumerMeterId && doc.timestamp == bookingTime0)
            let meterData1 = await docstore.query((doc) => doc.meter_id == consumerMeterId && doc.timestamp == bookingTime1)

            // calculate difference in meter data and compare to booked energy
            let difference = meterData1.total_consumed - meterData0.total_consumed
            if (difference > e.energy[i].kwh) {
                var date = new Date(new Date(bookingTime0));
                date = (date.getFullYear() + "-" + (date.getMonth() + 1) + "-" + date.getDate() + "T" + date.getHours().toString().padStart(2, '0') + ":" + (date.getMinutes() < 10 ? '0' : '') + date.getMinutes() + ":00");
                etus.push({
                    "date": date,
                    "energy": difference
                })
            }
        }

        if (etus.length > 0) {
            foundMatchingMeterData.push({
                "booking_id": e.booking_id,
                "mfa_id": e._id,
                "etus": etus
            })
        }
    }

    return foundMatchingMeterData
}