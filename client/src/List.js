import React from 'react';

const List = (props) => {
    let list = null;
    list = props.children

    function convertTimestamp(timestamp){
        let date = new Date(timestamp);
        return date.toString();
    }

    return (
        <table class="table">
            <thead>
                <tr>
                    <th scope="col">Trade ID</th>
                    <th scope="col">Timestamp</th>
                    <th scope="col">Energy</th>
                    <th scope="col">Pin Status</th>
                </tr>
            </thead>
            <tbody>
                {list.map(item => (
                    <tr>
                        <td>{item._id}</td>
                        <td>{convertTimestamp(item.timestamp)}</td>
                        <td>{item.energy}</td>
                        <td>{item.pin ? "true" : "false"}</td>
                    </tr>
                ))}
            </tbody>
        </table>
    );
};

export default List;