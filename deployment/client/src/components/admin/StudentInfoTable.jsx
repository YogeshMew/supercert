import React from 'react'
import { useState, useEffect } from 'react'
import axios from 'axios'
import './style.css'

const StudentInfoTable = ({ searchTerm }) => {
    const [data, setData] = useState([])
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const response = await axios.get('http://localhost:5001/studentInfo');
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
            (item.batch && item.batch.toLowerCase().includes(searchTermLower)) ||
            (item.dept && item.dept.toLowerCase().includes(searchTermLower)) ||
            (item.CID && item.CID.toLowerCase().includes(searchTermLower))
        );
    });

    return (
        <div>
            <h3>Student History</h3>
            {loading ? (
                <div className="loading-indicator">Loading student data...</div>
            ) : filteredData.length === 0 ? (
                <div className="no-data-message">
                    {searchTerm ? "No matching records found" : "No student records available"}
                </div>
            ) : (
                <div className="table-responsive">
                    <table className='table p-4' >
                        <thead>
                            <tr>
                                <th scope="col">Name</th>
                                <th scope="col">Email</th>
                                <th scope="col">Batch</th>
                                <th scope="col">Department</th>
                                <th scope="col">Hash</th>
                                <th scope="col">Timestamp</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredData.map((item) => (
                                <tr key={item._id}>
                                    <td>{item.name}</td>
                                    <td>{item.email}</td>
                                    <td>{item.batch}</td>
                                    <td>{item.dept}</td>
                                    <td>{item.CID}</td>
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

export default StudentInfoTable