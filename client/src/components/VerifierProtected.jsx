import React from 'react'
import Cookies from 'js-cookie'
import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

const VerifierProtected = ({Component}) => {
    const navigate = useNavigate()

    useEffect(() => {
        // Check for token in cookies
        const token = Cookies.get('token')
        
        // If no token, redirect to login
        if (!token) {
            navigate("/verifier-login")
            return
        }
        
        // Check user role from localStorage
        try {
            const userData = localStorage.getItem('user')
            if (userData) {
                const user = JSON.parse(userData)
                // If user is not a verifier, redirect to appropriate page
                if (user.role !== 'verifier') {
                    if (user.role === 'admin') {
                        navigate("/admin")
                    } else {
                        navigate("/")
                    }
                }
            } else {
                // No user data found, redirect to login
                navigate("/verifier-login")
            }
        } catch (error) {
            console.error('Error checking user role:', error)
            navigate("/verifier-login")
        }
    }, [navigate])
    
    return (
        <div>
            <Component />
        </div>
    )
}

export default VerifierProtected