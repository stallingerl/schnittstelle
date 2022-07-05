

export async function mapping(docstore) {

    let foundMatchingMeterData

    // query meter data of last interval
    let timeNow = new Date().getTime();
    let timeBeforeInterval = timeNow - 3600000

    let meterData = await docstore.query((e) => {
        let data = []
        if (e._id.startsWith("Qm"))
        {
            if (e.timestamp >= timeBeforeInterval && e.timestamp <= timeNow)
            {
            data.push(e)
            }
        }

        if (data.length > 0){
            return true
        }else {
            return false
        }
    })

    // query all booking data of last interval 
    let bookingData = await docstore.query((e) => {
        let data = []
        if (!e._id.startsWith("Qm")) {
            for (let i = 0; i < e.energy.length; i++) {
                let date = new Date(e.energy[i].date).getTime()
                if (date >= timeBeforeInterval && date <= timeNow) {
                    data.push(e)
                }
            }
        }
        if (data.length > 0){
            return true
        }else {
            return false
        }
    })

    // check if booking data has matching meter data

    if (meterData.length > 0 && bookingData.length > 0){


    }


    return foundMatchingMeterData;
}