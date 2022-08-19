import AES from 'crypto-js/aes.js'

export async function mapping(docstore) {

    let foundMatchingMeterData = []

    // query meter data of now -30 mins because meterdata is sent every 15 mins + 15 mins buffer to receive and sync meterData in DB
    let timeNow = 1660914900000 //new Date().getTime() 
    let timeBeforeInterval = 1660910400000 //timeNow - 3600000

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
        let decryptedHex = AES.decrypt(e.consumer, "NeverGuessing").toString();
        let consumerMeterId = new Buffer(decryptedHex, "hex").toString()

        let etus = []

        if (e.energy.length == 2) {
   
            let bookingTime0 = new Date(e.energy[0].date).getTime()
            let bookingTime1 = new Date(e.energy[1].date).getTime()

            bookingTime0 = roundToNearest15Mins(bookingTime0)
            bookingTime1 = roundToNearest15Mins(bookingTime1)

            // To Do: Round to nearest full 15 mins 

            // first find meterId for consumer at the beginning of booking data and meter data after 15mins.
            let meterData0
            let meterData1

            // find matching meterData for etus in Booking Data
            await docstore.query((doc) => {
                if (doc.meterId !== undefined) {
                    let hex = AES.decrypt(doc.meterId, "NeverGuessing").toString();
                    let decodedMeterId = new Buffer(decryptedHex, "hex").toString()
                    let roundedDocTime = roundToNearest15Mins(doc.timestamp)
                    if (decodedMeterId == consumerMeterId && roundedDocTime == bookingTime0) {
                        meterData0 = doc
                    }
                    // to do: MeterData1 hat die Uhrzeit 14:15:01 -> eine Sekunde ist in der OrbitDB. Sekunden auf null setzen
                    if (decodedMeterId == consumerMeterId && roundedDocTime == bookingTime1 ) {
                        meterData1 = doc
                    }
                }
            })


            // calculate difference in meter data and compare to booked energy
            let difference = meterData1.total_consumed - meterData0.total_consumed
            if (difference > e.energy[0].energy_kwh) {
                difference = Math.round(difference)
                var date = new Date(new Date(bookingTime0));
                date = (date.getFullYear() + "-" + (date.getMonth() + 1) + "-" + date.getDate() + "T" + date.getHours().toString().padStart(2, '0') + ":" + (date.getMinutes() < 10 ? '0' : '') + date.getMinutes() + ":00");
                etus.push({
                    "date": date,
                    "energy": difference
                })
            }
        } else {
            for (let i = 0; i < e.energy.length; i++) {
                let bookingTime0 = new Date(e.energy[i].date).getTime()
                let bookingTime1 = bookingTime0 + 900000


                // first find meterId for consumer at the beginning of booking data and meter data after 15mins.
                let meterData0 = await docstore.query((doc) => doc.meter_id == consumerMeterId && doc.timestamp == bookingTime0)
                let meterData1 = await docstore.query((doc) => doc.meter_id == consumerMeterId && doc.timestamp == bookingTime1)

                // calculate difference in meter data and compare to booked energy
                let difference = meterData1.total_consumed - meterData0.total_consumed
                if (difference > e.energy[i].kwh) {
                    difference = Math.round(difference)
                    var date = new Date(new Date(bookingTime0));
                    date = (date.getFullYear() + "-" + (date.getMonth() + 1) + "-" + date.getDate() + "T" + date.getHours().toString().padStart(2, '0') + ":" + (date.getMinutes() < 10 ? '0' : '') + date.getMinutes() + ":00");
                    etus.push({
                        "date": date,
                        "energy": difference
                    })
                }
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