import React, { useContext, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { UserContext } from '../context/UserContext'

const UserAuth = ({ children }) => {
  const { user } = useContext(UserContext)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    const token = localStorage.getItem('token')

    if (!token) {
      navigate('/login')
      return
    }

    if (user) {
      setLoading(false)
    }
  }, [user])   // 👈 IMPORTANT: depend on user

  if (loading) return <div>Loading...</div>

  return <>{children}</>
}

export default UserAuth
