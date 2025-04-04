import React from 'react'
import { useState, useEffect } from 'react'
import axios from 'axios'
import './style.css'


const TransactionInfoTable = ({ searchTerm }) => {
    const [data, setData] = useState([])
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const response = await axios.get('http://localhost:5001/transactionInfo');
            setData(response.data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    // Filter data based on search term
    const filteredData = data.filter(item => {
        if (!searchTerm) return true;
        const searchTermLower = searchTerm.toLowerCase();
        return (
            (item.name && item.name.toLowerCase().includes(searchTermLower)) ||
            (item.email && item.email.toLowerCase().includes(searchTermLower)) ||
            (item.emailOfStudent && item.emailOfStudent.toLowerCase().includes(searchTermLower)) ||
            (item.batch && item.batch.toLowerCase().includes(searchTermLower)) ||
            (item.CID && item.CID.toLowerCase().includes(searchTermLower)) ||
            (item.organizationName && item.organizationName.toLowerCase().includes(searchTermLower))
        );
    });

    return (
        <div>
            <h3>Transaction Information</h3>
            {loading ? (
                <div className="loading-indicator">Loading transaction data...</div>
            ) : filteredData.length === 0 ? (
                <div className="no-data-message">
                    {searchTerm ? "No matching records found" : "No transaction records available"}
                </div>
            ) : (
                <div className="table-responsive">
                    <table className='table p-4' >
                        <thead>
                            <tr>
                                <th scope="col">Name</th>
                                <th scope="col">Email</th>
                                <th scope="col">Email of Student</th>
                                <th scope="col">Batch</th>
                                <th scope="col">Hash</th>
                                <th scope="col">Organization Name</th>
                                <th scope="col">Timestamp</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredData.map((item) => (
                                <tr key={item._id}>
                                    <td>{item.name}</td>
                                    <td>{item.email}</td>
                                    <td>{item.emailOfStudent}</td>
                                    <td>{item.batch}</td>
                                    <td>{item.CID}</td>
                                    <td>{item.organizationName}</td>
                                    <td>{item.createdAt}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    )
}

export default TransactionInfoTable