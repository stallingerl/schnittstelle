import { s } from "./sharedState.js";
import AES from 'crypto-js/aes.js'

export async function mapping(docstore) {

    let foundMatchingMeterData = []
    let producerMeterIds = []
    let consumerMeterIds = []

    // query meter data of last interval
    let timeNow = new Date().getTime();
    let timeBeforeInterval = timeNow - 3600000

    // query all booking data of last interval 
    let bookingData = await docstore.query((e) => {
        let data = []
        if (!e._id.startsWith("Qm")) {
            for (let i = 0; i < e.energy.length; i++) {
                let date = new Date(e.energy[i].date).getTime()
                //if (date >= timeBeforeInterval && date <= timeNow) {
                data.push(e)
                producerMeterIds.push(AES.decrypt(e.producer, process.env.PASSWORD))
                consumerMeterIds.push(AES.decrypt(e.consumer, process.env.PASSWORD))
                //}
            }
        }
        if (data.length > 0) {
            return true
        } else {
            return false
        }
    })

    // If there is bookingData in last Intervall find any producer and consumer meter data for the last intervall and 15 mins before
    if (bookingData.length > 0) {
        let meterData = []
        await docstore.query((e) => {

            if (e._id.startsWith("Qm")) /*
                && (producerMeterIds.indexOf(e.meter_id) > -1) || (consumerMeterIds.indexOf(e.meter_id) > -1) 
                && e.timestamp >= (timeBeforeInterval - 900000) 
                && e.timestamp <= timeNow)*/ {
                meterData.push(e)
            }
        })

        if (meterData.length > 0 && bookingData.length > 0) {
            foundMatchingMeterData = calculateEnergyDifference(meterData, bookingData)

        }
    } else {
        foundMatchingMeterData = []
    }

    return foundMatchingMeterData;
}


function calculateEnergyDifference(meterData, bookingData) {
    let requestedPTUTimes = []


    // transform dates in bookingData to timeStamps and overwrite
    for (let i = 0; i < bookingData.length; i++) {
        for (let j = 0; j < bookingData[i].energy.length; j++) {
            let timestamp = new Date(bookingData[i].energy[j].date).getTime()
            bookingData[i].energy[j].date = timestamp
            requestedPTUTimes.push({ timestamp })
        }
    }

    // add 15 mins to last PTU to find meter data after last PTU and calculate produced/consumed electricity
    requestedPTUTimes.sort()
    let indexLastItem = requestedPTUTimes.length - 1
    const add15minsToLastPTU = (requestedPTUTimes[indexLastItem] + 900000)
    requestedPTUTimes.push(add15minsToLastPTU)
    requestedPTUTimes.sort()

    // find all meter data for requested times 
    let matchingETUs = []
    let lastQuarterHourProduced
    let lastQuarterHourConsumed
    let totalProduced
    let totalConsumed

    for (let i = 0; i < requestedPTUTimes.length; i++) {
        for (let j = 0; j < meterData.length; j++) {
            if (requestedPTUTimes[i].timestamp == meterData[j].timestamp) {

                // calculate difference for consumed electricity
                if (!lastQuarterHourConsumed) {
                    lastQuarterHourConsumed = meterData[j].total_consumed
                } else {
                    totalConsumed = meterData[j].total_consumed - lastQuarterHourConsumed
                }

                // calculate difference for produced electricity
                if (!lastQuarterHourProduced) {
                    lastQuarterHourProduced = meterData[j].total_produced
                } else {
                    totalProduced = meterData[j].total_produced - lastQuarterHourProduced
                }

                if (totalProduced && totalConsumed) {
                    var date = new Date(new Date(requestedPTUTimes[i].timestamp));
                    date = (date.getFullYear() + "-" + (date.getMonth() + 1) + "-" + date.getDate() + "T" + date.getHours().toString().padStart(2, '0') + ":" + (date.getMinutes()<10?'0':'') + date.getMinutes()  + ":00" );
                    matchingETUs.push({
                        "meter_id": meterData[j].meterId,
                        "etus": [
                            {
                                "date": date,
                                "energy": totalConsumed
                            }
                        ],
                        "timestamp": requestedPTUTimes[i].timestamp
                    })
                }

            }
        }
    }

    let foundMatchingMeterData = []

    for (let i = 0; i < matchingETUs.length; i++) {
        for (let j = 0; j < bookingData.length; j++) {
            if (matchingETUs[i].meter_id == bookingData[j].energy.consumer) {
                foundMatchingMeterData.push(
                    {
                        "booking_id": bookingData[j].booking_id,
                        "mfa_id": bookingData[j]._id,
                        "etus": matchingETUs[i].etus
                    }
                )
            }
        }
    }

    return foundMatchingMeterData
}