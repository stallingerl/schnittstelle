import React from 'react';
import CryptoJS from 'crypto-js'

const List = (props) => {
    let list = null;
    list = props.children

    function convertTimestamp(timestamp) {
        let date = new Date(timestamp);
        return date.toString();
    }

    function decryptItem(prosumer) {
        let decrypted = CryptoJS.AES.decrypt(prosumer, "NeverGuessing")
        decrypted = decrypted.toString(CryptoJS.enc.Utf8)
        return decrypted
    }

    return (
        <table class="table">
            <thead>
                <tr>
                    <th scope="col">Trade ID</th>
                    <th scope="col">Booking ID</th>
                    <th scope="col">Consumer</th>
                    <th scope="col">Producer</th>
                    <th scope="col">Energy</th>
                    <th scope="col">IPFS Path</th>
                    <th scope="col">Doichain Hash</th>
                </tr>
            </thead>
            <tbody>
                {list.map(item => (
                    <tr>
                        <td>{item._id}</td>
                        <td>{item.booking_id}</td>
                        <td>{decryptItem(item.consumer)}</td>
                        <td>{decryptItem(item.producer)}</td>
                        <td>
                            <table class="table">
                                <thead>
                                    <th>Date</th>
                                    <th>kwH</th>
                                </thead>
                                <tbody>
                                    {item.energy.map(entry => (
                                        <tr>

                                            <td>{entry.date}</td>
                                            <td>{entry.energy_kwh}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </td>
                        <td>{item.cid}</td>
                        <td>{item.doi_hash}</td>
                    </tr>
                ))}
            </tbody>
        </table>
    );
};

export default List;
